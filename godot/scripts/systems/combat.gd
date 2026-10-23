class_name Combat
extends RefCounted
## Runs skills: a SkillData's action blocks on a caster (map space, tiles). Wave 1 runs Cone blocks (melee arcs and
## lines, the hand action of every melee line), burst Zone blocks and Dash blocks; Projectile blocks and lasting zones
## are the Combat lane's (wave 2). The maths follow game.js hitCone / hitLine / hitArea.

static var _told := {}


## Uses `skill` from `caster` (needs map_pos, and start_dash() for dash blocks) toward map angle `aim`, target `at`.
## Returns the number of bodies hit by the blocks that ran now.
static func use_skill(caster: Node2D, skill: SkillData, aim: float, at: Vector2, item: ItemData = null) -> int:
	if skill == null or skill.blocks.is_empty():
		return 0
	var blocks: Array[ActionBlock] = []
	if skill.block_mode == "combo":
		var key := "combo_" + String(skill.id)
		var now := Time.get_ticks_msec() / 1000.0
		var last: Vector2 = caster.get_meta(key, Vector2(-1, -1000))   # x = index, y = time
		var i := int(last.x) + 1
		if now - last.y > skill.combo_reset or i >= skill.blocks.size():
			i = 0
		caster.set_meta(key, Vector2(i, now))
		blocks.append(skill.blocks[i])
	else:
		blocks = skill.blocks
	var n := 0
	for b: ActionBlock in blocks:
		if b == null:
			continue
		if b.delay > 0.0:
			caster.get_tree().create_timer(b.delay, false).timeout.connect(func() -> void: if is_instance_valid(caster): run_block(caster, b, skill, item, aim, at))
		else:
			n += run_block(caster, b, skill, item, aim, at)
	return n


static func run_block(caster: Node2D, b: ActionBlock, skill: SkillData, item: ItemData, aim: float, at: Vector2) -> int:
	var origin: Vector2 = caster.get("map_pos")
	FxPlayer.play(b.fx.get_fx(&"cast") if b.fx else null, caster)
	if b.sfx:
		Sfx.play(b.sfx.get_sfx(&"cast"), caster)
	if b is ConeBlock:
		var c := b as ConeBlock
		if c.width > 0.0:
			return _hit_line(caster, b, skill, item, origin, aim, c.reach, c.width)
		return _hit_cone(caster, b, skill, item, origin, aim, deg_to_rad(c.arc), c.reach)
	if b is ZoneBlock and (b as ZoneBlock).life <= 0.0:
		var z := b as ZoneBlock
		var p := origin
		if z.at == "target":
			p = at if origin.distance_to(at) <= z.cast_range else origin + (at - origin).normalized() * z.cast_range
		return _hit_area(caster, b, skill, item, p, z.radius)
	if b is DashBlock:
		var d := b as DashBlock
		if caster.has_method("start_dash"):
			caster.call("start_dash", d, aim)
		return 0
	var cls := (b.get_script() as Script).get_global_name()
	if not _told.has(cls):
		_told[cls] = true
		print("Combat: %s blocks run in wave 2 (skill %s)" % [cls, skill.id])
	return 0


static func element_of(b: ActionBlock, skill: SkillData, item: ItemData) -> String:
	if b.element != "inherit":
		return b.element
	if skill and skill.element != "inherit":
		return skill.element
	return item.element if item else "slash"


static func _targets(caster: Node2D) -> Array[Node]:
	var group := &"enemies" if not caster.is_in_group(&"enemies") else &"heroes"
	return caster.get_tree().get_nodes_in_group(group)


static func _hit(caster: Node2D, e: Node, b: ActionBlock, skill: SkillData, item: ItemData, from: Vector2) -> bool:
	if not e.has_method("take_hit"):
		return false
	var mult: float = caster.call("damage_mult", item) if caster.has_method("damage_mult") else 1.0
	return e.call("take_hit", {"damage": b.damage * mult, "element": element_of(b, skill, item), "from": from, "source": caster,
		"knockback": b.knockback, "stagger": b.stagger, "stun": b.stun, "weight": b.hit_weight, "block": b, "skill": skill, "params": b.hit_params})


## game.js hitCone: in reach (+ body radius) and inside the arc (widened by the body's angular size)
static func _hit_cone(caster: Node2D, b: ActionBlock, skill: SkillData, item: ItemData, o: Vector2, aim: float, arc: float, r: float) -> int:
	var n := 0
	for e: Node in _targets(caster):
		var ep: Vector2 = e.get("map_pos")
		var er: float = e.call("body_radius")
		var d := o.distance_to(ep)
		if d > r + er:
			continue
		if d > er and absf(angle_difference(aim, (ep - o).angle())) > arc * 0.5 + atan2(er, d):
			continue
		if _hit(caster, e, b, skill, item, o):
			n += 1
	return n


## game.js hitLine: distance to the segment under half-width + body radius
static func _hit_line(caster: Node2D, b: ActionBlock, skill: SkillData, item: ItemData, o: Vector2, aim: float, length: float, w: float) -> int:
	var n := 0
	var end := o + Vector2.from_angle(aim) * length
	for e: Node in _targets(caster):
		var ep: Vector2 = e.get("map_pos")
		if Geometry2D.get_closest_point_to_segment(ep, o, end).distance_to(ep) < w + float(e.call("body_radius")):
			if _hit(caster, e, b, skill, item, o):
				n += 1
	return n


## game.js hitArea
static func _hit_area(caster: Node2D, b: ActionBlock, skill: SkillData, item: ItemData, p: Vector2, r: float) -> int:
	var n := 0
	for e: Node in _targets(caster):
		var ep: Vector2 = e.get("map_pos")
		if p.distance_to(ep) < r + float(e.call("body_radius")):
			if _hit(caster, e, b, skill, item, p):
				n += 1
	return n
