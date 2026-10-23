extends Node
## Game (autoload): the hero, the running arena or zone, time scale, the iso grid and the world rules
## (res://data/rules/game_rules.tres). Entities think in tiles (map space, the JS units); nodes sit in screen pixels.
## to_screen / to_map convert between them on the 32x16 iso grid (map +x = screen down-right, +y = down-left).

const RULES_PATH := "res://data/rules/game_rules.tres"

var rules: GameRules
var hero: Node2D
var arena: Node
## Screen pixels of one tile step along map +x / +y, and the screen point of map (0, 0) (a tile corner).
var iso_x := Vector2(16, 8)
var iso_y := Vector2(-16, 8)
var iso_origin := Vector2.ZERO
var _hitstop_left := 0.0
var _shake_left := 0.0
var _shake_amp := 0.0
var _shake_freq := 30.0
var _shake_t := 0.0
var _last_usec := 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	rules = load(RULES_PATH) as GameRules if ResourceLoader.exists(RULES_PATH) else null
	if rules == null:
		rules = GameRules.new()
	iso_x = rules.iso_x
	iso_y = rules.iso_y


## Takes the grid from a TileMapLayer (its cell (0, 0) centre and steps), so tiles and entities always agree.
func set_grid(layer: TileMapLayer) -> void:
	var c0 := layer.map_to_local(Vector2i.ZERO)
	iso_x = layer.map_to_local(Vector2i(1, 0)) - c0
	iso_y = layer.map_to_local(Vector2i(0, 1)) - c0
	iso_origin = layer.position + c0 - 0.5 * (iso_x + iso_y)


## Map (tiles, JS units; tile i spans [i, i + 1)) -> screen pixels.
func to_screen(m: Vector2) -> Vector2:
	return iso_origin + m.x * iso_x + m.y * iso_y


## Screen pixels -> map (tiles).
func to_map(s: Vector2) -> Vector2:
	return Transform2D(iso_x, iso_y, Vector2.ZERO).affine_inverse().basis_xform(s - iso_origin)


## A screen direction -> the map direction that looks like it (not normalised).
func screen_dir_to_map(d: Vector2) -> Vector2:
	return Transform2D(iso_x, iso_y, Vector2.ZERO).affine_inverse().basis_xform(d)


## A map direction -> screen direction.
func map_dir_to_screen(d: Vector2) -> Vector2:
	return d.x * iso_x + d.y * iso_y


## Freezes time for `dur` seconds at `scale` (hit stop).
func hitstop(dur: float, scale: float = 0.0) -> void:
	if dur <= 0.0:
		return
	_hitstop_left = maxf(_hitstop_left, dur)
	Engine.time_scale = scale


## Shakes the active camera.
func shake(amp: float, freq: float, dur: float) -> void:
	if amp >= _shake_amp or _shake_left <= 0.0:
		_shake_amp = amp
		_shake_freq = freq
	_shake_left = maxf(_shake_left, dur)


func _process(_delta: float) -> void:
	var now := Time.get_ticks_usec()
	var real := clampf(float(now - _last_usec) / 1000000.0, 0.0, 0.1) if _last_usec > 0 else 0.0
	_last_usec = now
	if _hitstop_left > 0.0:
		_hitstop_left -= real
		if _hitstop_left <= 0.0:
			Engine.time_scale = 1.0
	var cam := get_viewport().get_camera_2d() if get_viewport() else null
	if _shake_left > 0.0:
		_shake_left -= real
		_shake_t += real
		if cam:
			cam.offset = Vector2(sin(_shake_t * _shake_freq * TAU), cos(_shake_t * _shake_freq * TAU * 0.7)) * _shake_amp
		if _shake_left <= 0.0:
			_shake_amp = 0.0
			if cam:
				cam.offset = Vector2.ZERO


## A floating damage number at a screen position, under `parent` (the arena's entity layer).
func pop_number(parent: Node, at: Vector2, value: float, crit: bool = false) -> void:
	if parent == null:
		return
	var pop := DamagePop.new()
	parent.add_child(pop)
	pop.setup(rules, at, value, crit)
