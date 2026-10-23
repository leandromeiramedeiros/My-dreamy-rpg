@tool
class_name Enemy
extends Node2D
## A placeable enemy: drop res://scenes/enemies/enemy.tscn into a zone or arena and put an EnemyData in `data`.
## Everything it is (HP, resists, behaviour parts, loot, look, FX) comes from the data; the Bestiary lane adds the part
## runtime (wave 2). Wave 1: it stands, takes hits, shows damage numbers, flashes, dies (a training dummy never dies).

signal hurt(amount: float, element: String)
signal died

## What this enemy is (res://data/enemies/*.tres or res://data/bosses/*.tres).
@export var data: EnemyData:
	set(v):
		data = v
		if is_inside_tree():
			_build_look()
## Level (HP scales with it in play).
@export_range(1, 40, 1) var level: int = 1
## Elite modifier id (empty = a normal body).
@export var elite: StringName = &""

var map_pos := Vector2.ZERO
var hp := 1.0
var max_hp := 1.0
var dead := false
var damage_taken := 0.0
var _sprite: AnimatedSprite2D


func _ready() -> void:
	_build_look()
	if Engine.is_editor_hint():
		return
	add_to_group(&"enemies")
	map_pos = Game.to_map(position)
	max_hp = data.hp if data else 1.0
	hp = max_hp
	if data and data.fx:
		FxPlayer.play(data.fx.get_fx(&"spawn"), self)


func _build_look() -> void:
	if _sprite:
		_sprite.queue_free()
		_sprite = null
	if data == null or data.frames == null:
		return
	_sprite = AnimatedSprite2D.new()
	_sprite.name = "Look"
	_sprite.sprite_frames = data.frames
	_sprite.centered = false
	_sprite.offset = -data.origin
	_sprite.scale = Vector2.ONE * data.scale
	_sprite.self_modulate = data.tint
	var mat := ShaderMaterial.new()
	mat.shader = preload("res://scripts/systems/flash.gdshader")
	_sprite.material = mat
	add_child(_sprite, false, Node.INTERNAL_MODE_FRONT)
	var anim := &"idle_S"
	if data.frames.has_animation(anim):
		_sprite.play(anim)


func flash_canvas() -> CanvasItem:
	return _sprite


func body_radius() -> float:
	return data.radius if data else 0.4


## The screen point above the head (numbers, bars).
func head_point() -> Vector2:
	var h := (data.height if data else 2.0) * Game.rules.height_px * (data.scale if data else 1.0)
	return position - Vector2(0, h)


## A hit from Combat: {damage, element, from, source, knockback, stagger, stun, ...}. Returns true when it landed.
func take_hit(hit: Dictionary) -> bool:
	if dead or data == null:
		return false
	var el := StringName(String(hit.get("element", "slash")))
	var res: float = data.resists.get(el, 0.0)
	var dmg: float = maxf(0.0, float(hit.get("damage", 0.0)) * (1.0 - res))
	damage_taken += dmg
	if not data.dummy:
		hp -= dmg
	Game.pop_number(get_parent(), head_point(), dmg, bool(hit.get("crit", false)))
	var fx: FxData = data.fx.get_fx(&"hit") if data.fx else null
	FxPlayer.play(fx if fx else Game.rules.default_hit_fx, self)
	if data.sfx:
		Sfx.play(data.sfx.get_sfx(&"hit"), self)
	if _sprite and data.frames.has_animation(&"hit_S"):
		_sprite.play(&"hit_S")
		_sprite.animation_finished.connect(func() -> void: if _sprite and not dead: _sprite.play(&"idle_S"), CONNECT_ONE_SHOT)
	hurt.emit(dmg, String(el))
	if hp <= 0.0 and not data.dummy:
		_die()
	return true


func _die() -> void:
	dead = true
	remove_from_group(&"enemies")
	var fx: FxData = data.fx.get_fx(&"death") if data.fx else null
	FxPlayer.play(fx if fx else Game.rules.default_death_fx, self)
	died.emit()
	if _sprite and data.frames.has_animation(&"death_S"):
		_sprite.play(&"death_S")
		await _sprite.animation_finished
	queue_free()
