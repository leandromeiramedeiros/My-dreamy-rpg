@tool
extends RefCounted
## Arena importer: res://data/seed/arenas.json (written by tools/godot/arenas.js from the JS mockup arenas) -> one scene
## per arena, res://arenas/<id>.tscn: an Arena root, Ground (a TileMapLayer painted through the zone's terrain set: each
## tile character is a terrain `ch` of handoff zones.json, `c` is a pillar), Entities (Y-sorted: the pillar columns, the
## Hero at the start, the enemies of the instant map_enter spawns, the props that have handoff art). Everything else
## (gates, levers, trigger cards, timed spawns) stays on the Arena as data for the Triggers lane.
## Arenas are the studio's tests; real maps are the client's (res://zones/). Rebuilding overwrites res://arenas/.

const SEED := "res://data/seed/arenas.json"
const ZONES := "res://data/zones.json"
const OUT := "res://arenas"
const THEME_ZONE := {"vale": "vale", "forest": "pinewood", "pinewood": "pinewood", "ruins": "ruins"}
const HERO := "res://scenes/hero/hero.tscn"
const ENEMY := "res://scenes/enemies/enemy.tscn"
const PROP := "res://scenes/props/prop.tscn"
const GI := preload("res://addons/handoff/godot_import.gd")

static var _warn := 0


static func run(only: PackedStringArray = PackedStringArray()) -> Dictionary:
	_warn = 0
	var stats := {"arenas": 0, "errors": 0, "enemies": 0, "props": 0, "objects": 0, "ids": []}
	var j: Variant = JSON.parse_string(FileAccess.get_file_as_string(SEED)) if FileAccess.file_exists(SEED) else null
	if not (j is Dictionary):
		push_error("arena_import: no " + SEED + " (run node tools/godot/arenas.js)")
		stats["errors"] += 1
		return stats
	var zones := {}
	var zj: Variant = JSON.parse_string(FileAccess.get_file_as_string(ZONES))
	for z: Dictionary in (zj as Dictionary).get("zones", []):
		zones[String(z["id"])] = z
	DirAccess.make_dir_recursive_absolute(OUT)
	for rec: Dictionary in j["rows"]:
		var id := String(rec["id"])
		if not only.is_empty() and not only.has(id):
			continue
		var root := build(rec, zones, stats)
		if root == null:
			stats["errors"] += 1
			continue
		var ps := PackedScene.new()
		var err := ps.pack(root)
		root.free()
		if err != OK or ResourceSaver.save(ps, OUT.path_join(id + ".tscn")) != OK:
			push_error("arena_import: cannot save " + id)
			stats["errors"] += 1
			continue
		stats["arenas"] += 1
		(stats["ids"] as Array).append(id)
	stats["warnings"] = _warn
	return stats


static func build(rec: Dictionary, zones: Dictionary, stats: Dictionary) -> Node2D:
	var zone_id: String = THEME_ZONE.get(String(rec.get("theme", "vale")), "vale")
	var z: Dictionary = zones.get(zone_id, zones.get("vale", {}))
	var dir := "res://art/tiles".path_join(zone_id)
	var ts := load(dir.path_join(zone_id + "_tileset.tres")) as TileSet
	if ts == null:
		push_error("arena_import: no tileset for " + zone_id)
		return null
	var root := Node2D.new()
	root.name = String(rec["id"]).to_pascal_case()
	root.set_script(load("res://scripts/systems/arena.gd"))
	root.set("arena_id", StringName(String(rec["id"])))
	root.set("arena_name", String(rec.get("name", rec["id"])))
	root.set("description", String(rec.get("desc", "")))
	root.set("objective", String(rec.get("objective", "")))
	root.set("zone", StringName(zone_id))
	var lv: Array = rec.get("level", [1, 6])
	root.set("level_range", Vector2i(int(lv[0]), int(lv[1])))
	# hero kit
	var kit: Dictionary = rec.get("kit", {})
	for slot: String in ["hand", "offhand", "head", "chest", "boots"]:
		var p := "res://data/items/%s.tres" % String(kit.get(slot, ""))
		if kit.get(slot) != null and ResourceLoader.exists(p):
			root.set("kit_" + slot, load(p))
	root.set("kit_tier", int(kit.get("tier", 0)))
	root.set("hero_level", int(kit.get("level", 1)))
	# ground
	var ground := TileMapLayer.new()
	ground.name = "Ground"
	ground.tile_set = ts
	_add(root, root, ground)
	var rows: Array = rec["tiles"]
	var by_ch := {}
	var base := 0
	var terrains: Array = z["terrains"]
	for i: int in terrains.size():
		by_ch[String(terrains[i].get("ch", ""))] = i
		if terrains[i].get("base", false):
			base = i
	var groups := {}
	var pillars := {}
	for y: int in rows.size():
		var row := String(rows[y])
		for x: int in row.length():
			var ch := row[x]
			if ch == ".":
				continue
			var t: int = by_ch.get(ch, base)
			if ch == "c":
				pillars[Vector2i(x, y)] = true
				t = base
			if not groups.has(t):
				var cells: Array[Vector2i] = []
				groups[t] = cells
			(groups[t] as Array[Vector2i]).append(Vector2i(x, y))
	var all: Array[Vector2i] = []
	for t: int in groups:
		all.append_array(groups[t])
	ground.set_cells_terrain_connect(all, 0, base)
	for t: int in groups:
		if t != base:
			ground.set_cells_terrain_connect(groups[t], 0, t)
	# entities
	var ents := Node2D.new()
	ents.name = "Entities"
	ents.y_sort_enabled = true
	_add(root, root, ents)
	var cols := TileMapLayer.new()
	cols.name = "Columns"
	cols.tile_set = ts
	cols.y_sort_enabled = true
	_add(root, ents, cols)
	if not pillars.is_empty():
		var cliff_side: Dictionary = GI._read_json(dir.path_join(String(z["cliff"]).get_basename() + ".json"))
		var cliff_src: int = terrains.size()
		var top := String(terrains[base]["id"])
		for c: Vector2i in pillars:
			var want := {"kind": "column", "top": top, "h": 1, "face_sw": not pillars.has(c + Vector2i(0, 1)), "face_se": not pillars.has(c + Vector2i(1, 0)),
				"rim_nw": not pillars.has(c + Vector2i(-1, 0)), "rim_ne": not pillars.has(c + Vector2i(0, -1))}
			var at := GI.find_cell(cliff_side, want)
			if at.x < 0:
				want.erase("top")
				at = GI.find_cell(cliff_side, want)
			if at.x < 0:
				at = GI.find_cell(cliff_side, {"kind": "column"})
			if at.x >= 0:
				cols.set_cell(c, cliff_src, at)
			else:
				_warn += 1
	# hero
	var st: Dictionary = rec.get("start", {"x": 2, "y": 2})
	var hero := (load(HERO) as PackedScene).instantiate(PackedScene.GEN_EDIT_STATE_INSTANCE) as Node2D
	hero.name = "Hero"
	hero.position = to_screen(ground, Vector2(float(st["x"]), float(st["y"])))
	_add(root, ents, hero)
	# enemies: the instant map_enter spawns
	var n := 0
	for sp: Dictionary in rec.get("spawns", []):
		var eid := String(sp["enemy"])
		var data_path := "res://data/enemies/%s.tres" % eid
		if not ResourceLoader.exists(data_path):
			data_path = "res://data/bosses/%s.tres" % eid
		if not ResourceLoader.exists(data_path):
			push_warning("arena_import: %s: no enemy %s" % [rec["id"], eid])
			_warn += 1
			continue
		var count := int(sp.get("count", 1))
		for k: int in count:
			var p := Vector2(float(sp["x"]), float(sp["y"]))
			if count > 1:
				p += Vector2.from_angle(TAU * k / count) * float(sp.get("radius", 0.6))
			var e := (load(ENEMY) as PackedScene).instantiate(PackedScene.GEN_EDIT_STATE_INSTANCE) as Node2D
			n += 1
			e.name = "%s_%d" % [eid.to_pascal_case(), n]
			e.set("data", load(data_path))
			if sp.get("elite"):
				e.set("elite", StringName(String(sp["elite"])))
			e.position = to_screen(ground, p)
			_add(root, ents, e)
	stats["enemies"] += n
	# props with handoff art; the rest stays as data
	var objects: Array[Dictionary] = []
	var np := 0
	for o: Dictionary in rec.get("objects", []):
		var side := _prop_sidecar(String(o.get("t", "")), zone_id)
		if side == "":
			objects.append(o)
			continue
		var pr := (load(PROP) as PackedScene).instantiate(PackedScene.GEN_EDIT_STATE_INSTANCE) as Node2D
		np += 1
		pr.name = "%s_%d" % [String(o["t"]).to_pascal_case(), np]
		pr.set("sidecar", load(side))
		pr.set("object_data", o)
		pr.position = to_screen(ground, Vector2(float(o.get("x", 0)), float(o.get("y", 0))))
		_add(root, ents, pr)
	stats["props"] += np
	stats["objects"] += objects.size()
	root.set("objects", objects)
	var trig: Array[Dictionary] = []
	for t: Variant in rec.get("triggers", []):
		if t is Dictionary:
			trig.append(t)
	root.set("triggers", trig)
	return root


## map point (tiles, cell i covers [i, i + 1)) -> the layer's local pixels
static func to_screen(layer: TileMapLayer, m: Vector2) -> Vector2:
	var c0 := layer.map_to_local(Vector2i.ZERO)
	var ix := layer.map_to_local(Vector2i(1, 0)) - c0
	var iy := layer.map_to_local(Vector2i(0, 1)) - c0
	return c0 + (m.x - 0.5) * ix + (m.y - 0.5) * iy


static func _prop_sidecar(t: String, zone_id: String) -> String:
	var alias := {"lantern": "lantern_blue" if zone_id == "ruins" else "lantern", "torch": "brazier", "seal": "tablet", "glyph": "tablet"}
	var id: String = alias.get(t, t)
	var p := "res://art/props/%s.json" % id
	return p if id != "" and FileAccess.file_exists(p) else ""


static func _add(owner: Node, parent: Node, child: Node) -> void:
	parent.add_child(child)
	child.owner = owner
