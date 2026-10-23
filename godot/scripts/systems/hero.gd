class_name Hero
extends Node2D
## The hero (Karea; code id `player`): 8-direction movement in map space (tiles, the JS units), the dodge, the HAND
## action on M1, the paper-doll look (HeroDoll) and the camera. Numbers come from `data` (res://data/hero/hero.tres) and
## the equipped items. Wave 1: no HP/MP/stamina loop, no OFFHAND / spells / ultimates / actives (the Loadout lane).

## The hero's numbers and look.
@export var data: HeroData

## Map position (tiles); `position` follows it.
var map_pos := Vector2.ZERO
## Aim, a map-space angle (radians).
var facing := 0.0
var dir := "S"
## slot -> {"item": ItemData, "tier": int}
var equipment := {}
var invulnerable := false
## Tests: a fixed screen-space move input (Vector2.ZERO = read the input map).
var debug_move := Vector2.ZERO

var _move := Vector2.ZERO        # this frame's map-space move direction
var _dash := {}                  # {v: map velocity, t: time left}
var _lock := 0.0                 # attack anim lock
var _cd := {}                    # skill id -> seconds left
var _mouse_aim := false

@onready var doll: HeroDoll = $Doll
@onready var camera: Camera2D = $Camera


func _ready() -> void:
	if data == null:
		data = load("res://data/hero/hero.tres") as HeroData
	add_to_group(&"heroes")
	Game.hero = self
	map_pos = Game.to_map(position)
	doll.setup(data.body_sheet, data.hair_sheet)
	camera.zoom = Vector2.ONE * data.camera_zoom
	camera.position_smoothing_enabled = data.camera_smoothing > 0.0
	camera.position_smoothing_speed = data.camera_smoothing
	camera.make_current()
	doll.play(&"idle", dir)


func _exit_tree() -> void:
	if Game.hero == self:
		Game.hero = null


## Equips `item` at tier index `tier` (0 = T1) in `slot` (hand, offhand, head, chest, boots, ring, amulet, belt, pocket).
func equip(slot: StringName, item: ItemData, tier: int = 0) -> void:
	if item == null:
		equipment.erase(slot)
	else:
		equipment[slot] = {"item": item, "tier": tier}
	doll.equip(slot, item, tier)


func item_in(slot: StringName) -> ItemData:
	return (equipment.get(slot, {}) as Dictionary).get("item")


## The tier multiplier of an equipped item's numbers.
func damage_mult(item: ItemData) -> float:
	for slot: StringName in equipment:
		if equipment[slot]["item"] == item and not item.tiers.is_empty():
			var t: ItemTier = item.tiers[clampi(int(equipment[slot]["tier"]), 0, item.tiers.size() - 1)]
			return t.multiplier if t else 1.0
	return 1.0


func body_radius() -> float:
	return data.radius


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		_mouse_aim = true
	elif event is InputEventJoypadMotion and absf((event as InputEventJoypadMotion).axis_value) > 0.4:
		_mouse_aim = false


func _physics_process(delta: float) -> void:
	for k: Variant in _cd.keys():
		_cd[k] -= delta
		if _cd[k] <= 0.0:
			_cd.erase(k)
	_lock = maxf(0.0, _lock - delta)
	var s := debug_move if debug_move != Vector2.ZERO else Input.get_vector(&"move_left", &"move_right", &"move_up", &"move_down")
	_move = Vector2.ZERO
	if not _dash.is_empty():
		_step_dash(delta)
	elif s.length() > 0.05:
		# game.js: screen input (sx, sy) -> map (sx + sy, sy - sx), plus the vertical bonus (screen-up reads slower on 2:1)
		_move = Vector2(s.x + s.y, s.y - s.x).normalized()
		var sp := data.speed * (1.0 + data.vertical_speed_bonus * absf(s.y) / s.length()) * minf(1.0, s.length())
		_walk(_move * sp * delta)
		if _lock <= 0.0:
			_face_screen(s)
	_update_aim(s)
	if debug_move == Vector2.ZERO:
		if Input.is_action_pressed(&"attack"):
			attack()
		if Input.is_action_just_pressed(&"dodge"):
			dodge()
	position = Game.to_screen(map_pos)
	_animate()


## Uses the HAND item's action (M1) toward the current aim. Returns true when it fired.
func attack() -> bool:
	var item := item_in(&"hand")
	if item == null or item.action == null or not _dash.is_empty() or _cd.has(item.action.id):
		return false
	var at := _aim_point()
	Combat.use_skill(self, item.action, facing, at, item)
	_cd[item.action.id] = maxf(item.action.cooldown, 0.1)
	_face_screen(Game.map_dir_to_screen(Vector2.from_angle(facing)))
	doll.play(&"attack", dir, 1.0, true)
	_lock = doll.duration(&"attack")
	return true


## Tests and AI: aim at map point `m` and attack.
func attack_toward(m: Vector2) -> bool:
	facing = (m - map_pos).angle()
	_mouse_aim = false
	return attack()


## The dodge (V): the boots' active when it is a dash, else HeroData.dodge.
func dodge() -> bool:
	var sk: SkillData = data.dodge
	var boots := item_in(&"boots")
	if boots and boots.active and not boots.active.blocks.is_empty() and boots.active.blocks[0] is DashBlock:
		sk = boots.active
	if sk == null or not _dash.is_empty() or _cd.has(sk.id):
		return false
	Combat.use_skill(self, sk, facing, _aim_point())
	_cd[sk.id] = maxf(sk.cooldown, 0.1)
	return true


## Called by Combat for a Dash block.
func start_dash(b: DashBlock, aim: float) -> void:
	var a := aim
	match b.direction:
		"move": a = _move.angle() if _move != Vector2.ZERO else facing
		"back": a = aim + PI
		"side": a = aim + PI * 0.5
	var v := Vector2.from_angle(a)
	if b.blink:
		var to := map_pos + v * b.distance
		if _walkable(to):
			map_pos = to
		return
	_dash = {"v": v * b.distance / maxf(b.duration, 0.01), "t": b.duration}
	if b.iframes > 0.0:
		invulnerable = true
		get_tree().create_timer(b.iframes, false).timeout.connect(func() -> void: invulnerable = false)
	_face_screen(Game.map_dir_to_screen(v))
	doll.play(&"dash", dir, 1.0, true)


func _step_dash(delta: float) -> void:
	_walk(_dash["v"] * delta)
	_dash["t"] -= delta
	if _dash["t"] <= 0.0:
		_dash.clear()


## Moves by `d` (map), sliding along walls axis by axis.
func _walk(d: Vector2) -> void:
	var r := data.radius * 0.5
	var nx := map_pos + Vector2(d.x, 0)
	if _walkable(nx + Vector2(signf(d.x) * r, 0)):
		map_pos = nx
	var ny := map_pos + Vector2(0, d.y)
	if _walkable(ny + Vector2(0, signf(d.y) * r)):
		map_pos = ny


func _walkable(m: Vector2) -> bool:
	return Game.arena == null or not Game.arena.has_method("is_walkable") or Game.arena.call("is_walkable", m)


func _update_aim(s: Vector2) -> void:
	var stick := Input.get_vector(&"aim_left", &"aim_right", &"aim_up", &"aim_down")
	if stick.length() > 0.3:
		facing = Game.screen_dir_to_map(stick).angle()
		_mouse_aim = false
	elif _mouse_aim and is_inside_tree():
		var m := Game.to_map(get_global_mouse_position())
		if m.distance_to(map_pos) > 0.05:
			facing = (m - map_pos).angle()
	elif _move != Vector2.ZERO:
		facing = _move.angle()


func _aim_point() -> Vector2:
	if _mouse_aim and is_inside_tree():
		return Game.to_map(get_global_mouse_position())
	return map_pos + Vector2.from_angle(facing) * 2.0


## Facing dir from a screen-space vector: S = down, then clockwise to SE, E ... SW.
func _face_screen(v: Vector2) -> void:
	if v.length() > 0.001:
		dir = HeroDoll.DIRS[posmod(roundi((90.0 - rad_to_deg(v.angle())) / 45.0), 8)]


func _animate() -> void:
	if not _dash.is_empty() or _lock > 0.0:
		return
	doll.play(&"walk" if _move != Vector2.ZERO else &"idle", dir)
