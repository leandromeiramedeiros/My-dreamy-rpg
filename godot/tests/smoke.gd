extends Node
## The headless gate (tools/godot/check.js): loads every .tres under res://data (counted per class), loads and instances
## every arena, runs `dummies` for 120 physics frames (the hero walks, the dummies stand), then lands the hero's M1 (the
## HAND item's first action block) on a dummy and checks the damage and the number pop. Prints "smoke: {json}" and quits
## 0 / 1. With `-- --shot=<png>` (a windowed run) it saves the viewport after the hit.

var fails: Array[String] = []
var report := {}


func _ready() -> void:
	var shot := ""
	for a: String in OS.get_cmdline_user_args():
		if a.begins_with("--shot="):
			shot = a.trim_prefix("--shot=")
	if shot == "":
		_load_all_tres()
		await _load_all_arenas()
	await _dummies(shot)
	report["fails"] = fails
	print("smoke: ", JSON.stringify(report))
	get_tree().quit(0 if fails.is_empty() else 1)


func _load_all_tres() -> void:
	var per := {}
	var total := 0
	for p: String in _files("res://data", ".tres"):
		var r := ResourceLoader.load(p)
		if r == null:
			fails.append("cannot load " + p)
			continue
		var scr := r.get_script() as Script
		var cls := String(scr.get_global_name()) if scr else r.get_class()
		per[cls] = int(per.get(cls, 0)) + 1
		total += 1
	report["tres"] = total
	report["tres_per_class"] = per


func _load_all_arenas() -> void:
	var ids := PackedStringArray()
	for p: String in _files("res://arenas", ".tscn"):
		var ps := load(p) as PackedScene
		if ps == null:
			fails.append("cannot load " + p)
			continue
		var inst := ps.instantiate()
		if inst == null or not (inst is Arena):
			fails.append("not an Arena: " + p)
			continue
		add_child(inst)
		await get_tree().physics_frame
		inst.queue_free()
		await get_tree().process_frame
		ids.append(p.get_file().get_basename())
	report["arenas"] = ids
	if not ids.has("dummies"):
		fails.append("no dummies arena")


func _dummies(shot: String) -> void:
	var ps := load("res://arenas/dummies.tscn") as PackedScene
	if ps == null:
		fails.append("no res://arenas/dummies.tscn")
		return
	var arena := ps.instantiate() as Arena
	add_child(arena)
	await get_tree().process_frame
	var hero := arena.find_child("Hero", true, false) as Hero
	var dummies := get_tree().get_nodes_in_group(&"enemies")
	report["dummies"] = dummies.size()
	if hero == null or dummies.is_empty():
		fails.append("dummies: hero %s, %d dummies" % [hero != null, dummies.size()])
		return
	var start := hero.map_pos
	var dpos := {}
	for d: Node in dummies:
		dpos[d] = d.get("map_pos")
	hero.debug_move = Vector2(1, 0)   # screen right
	for i: int in 120:
		if i == 60:
			hero.debug_move = Vector2(0, 1)
		await get_tree().physics_frame
	hero.debug_move = Vector2.ZERO
	report["hero_walked"] = snappedf(start.distance_to(hero.map_pos), 0.01)
	if start.distance_to(hero.map_pos) < 1.0:
		fails.append("hero did not walk (%.2f tiles)" % start.distance_to(hero.map_pos))
	for d: Node in dummies:
		if not is_instance_valid(d) or (d.get("map_pos") as Vector2).distance_to(dpos[d]) > 0.001:
			fails.append("a dummy moved or died")
			break
	# the dodge (HeroData.dodge or the boots' dash): moves the hero and stays on the floor
	var before := hero.map_pos
	var dodged := hero.dodge()
	for i: int in 20:
		await get_tree().physics_frame
	report["dodge_tiles"] = snappedf(before.distance_to(hero.map_pos), 0.01)
	if not dodged or before.distance_to(hero.map_pos) < 1.0:
		fails.append("dodge did not move the hero (%s, %.2f tiles)" % [dodged, before.distance_to(hero.map_pos)])
	if not arena.is_walkable(hero.map_pos):
		fails.append("dodge left the floor")
	# M1 on the nearest dummy
	var target: Enemy = null
	for d: Node in dummies:
		if target == null or (d.get("map_pos") as Vector2).distance_to(hero.map_pos) < target.map_pos.distance_to(hero.map_pos):
			target = d as Enemy
	hero.map_pos = target.map_pos + Vector2(-1.0, 0.0)
	await get_tree().physics_frame
	var item := hero.item_in(&"hand")
	report["hand"] = String(item.id) if item else ""
	report["first_block_damage"] = item.action.blocks[0].damage if item and item.action and not item.action.blocks.is_empty() else 0.0
	var fired := hero.attack_toward(target.map_pos)
	await get_tree().physics_frame
	report["hit_damage"] = snappedf(target.damage_taken, 0.1)
	var pops := 0
	for c: Node in target.get_parent().get_children():
		if c is DamagePop:
			pops += 1
	report["pops"] = pops
	if not fired or target.damage_taken <= 0.0:
		fails.append("M1 did not damage the dummy (fired %s, %.1f)" % [fired, target.damage_taken])
	if pops == 0:
		fails.append("no damage number pop")
	if target.dead or not is_instance_valid(target):
		fails.append("the dummy died")
	if shot != "":
		for i: int in 8:
			await get_tree().process_frame
		var img := get_viewport().get_texture().get_image()
		DirAccess.make_dir_recursive_absolute(shot.get_base_dir())
		if img == null or img.save_png(shot) != OK:
			fails.append("cannot save " + shot)
		else:
			report["shot"] = shot


static func _files(dir: String, ext: String) -> Array[String]:
	var out: Array[String] = []
	var d := DirAccess.open(dir)
	if d == null:
		return out
	for f: String in d.get_files():
		f = f.trim_suffix(".remap")
		if f.ends_with(ext):
			out.append(dir.path_join(f))
	for sub: String in d.get_directories():
		if sub != "seed":
			out.append_array(_files(dir.path_join(sub), ext))
	return out
