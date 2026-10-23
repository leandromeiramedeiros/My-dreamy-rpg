class_name FxPlayer
extends RefCounted
## Plays FX presets (FxData). Wave 1 runs the tint, shake, hit stop and sound layers; particles, sprite anim, light, trail
## and decal layers are kept as data and run by the Render + feel lane (wave 2).

static var _told := {}


## Plays `fx` on `target` (a body with flash_canvas(), or any Node2D for position-only layers).
static func play(fx: FxData, target: Node2D) -> void:
	if fx == null or target == null:
		return
	for layer: FxLayer in fx.layers:
		if layer == null or not layer.enabled:
			continue
		var d := layer.delay * fx.time_scale
		if d > 0.0:
			target.get_tree().create_timer(d, false).timeout.connect(_play_layer.bind(layer, target, fx.time_scale))
		else:
			_play_layer(layer, target, fx.time_scale)


static func _play_layer(layer: FxLayer, target: Node2D, ts: float) -> void:
	if not is_instance_valid(target):
		return
	var life := layer.life * ts
	if layer is FxTint:
		var t := layer as FxTint
		var c: CanvasItem = target.call("flash_canvas") if target.has_method("flash_canvas") else null
		var m := c.material as ShaderMaterial if c else null
		if m == null:
			return
		m.set_shader_parameter("flash_color", t.color)
		m.set_shader_parameter("flash", t.strength)
		var tw := c.create_tween()
		if t.fade:
			tw.tween_method(func(v: float) -> void: m.set_shader_parameter("flash", v), t.strength, 0.0, maxf(life, 0.01))
		else:
			tw.tween_interval(maxf(life, 0.01))
			tw.tween_callback(func() -> void: m.set_shader_parameter("flash", 0.0))
	elif layer is FxShake:
		var s := layer as FxShake
		Game.shake(s.amplitude, s.frequency, life)
	elif layer is FxHitstop:
		Game.hitstop(life, (layer as FxHitstop).time_scale)
	elif layer is FxSfx:
		Sfx.play((layer as FxSfx).sfx, target)
	else:
		var cls := (layer.get_script() as Script).get_global_name()
		if not _told.has(cls):
			_told[cls] = true
			print_verbose("FxPlayer: %s layers run in wave 2" % cls)
