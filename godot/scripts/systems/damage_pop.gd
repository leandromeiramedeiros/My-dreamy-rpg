class_name DamagePop
extends Label
## A floating damage number (look and timing from GameRules "Damage numbers"). Made by Game.pop_number.

var _t := 0.0
var _life := 0.9
var _rise := 14.0
var _start := Vector2.ZERO


func setup(rules: GameRules, at: Vector2, value: float, crit: bool) -> void:
	text = str(roundi(value))
	_life = rules.number_life
	_rise = rules.number_rise
	add_theme_font_size_override("font_size", rules.number_font_size)
	add_theme_color_override("font_color", rules.number_crit_color if crit else rules.number_color)
	add_theme_color_override("font_outline_color", rules.number_outline_color)
	add_theme_constant_override("outline_size", rules.number_outline)
	horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	size = Vector2(48, rules.number_font_size + 4)
	_start = at - Vector2(size.x * 0.5, size.y)
	position = _start
	z_index = 100


func _process(delta: float) -> void:
	_t += delta
	var k := clampf(_t / _life, 0.0, 1.0)
	position = _start - Vector2(0, _rise * (1.0 - pow(1.0 - k, 2.0)))
	modulate.a = 1.0 - k * k * k
	if _t >= _life:
		queue_free()
