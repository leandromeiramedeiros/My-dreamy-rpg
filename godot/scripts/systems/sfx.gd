class_name Sfx
extends RefCounted
## Plays a SfxData at a body (a one-shot AudioStreamPlayer2D). No stream = silent (the Audio lane renders the OGGs).


static func play(s: SfxData, at: Node2D) -> void:
	if s == null or s.stream == null or at == null or not at.is_inside_tree():
		return
	var p := AudioStreamPlayer2D.new()
	p.stream = s.stream
	p.volume_db = s.volume_db
	p.pitch_scale = s.pitch * (1.0 + randf_range(-s.pitch_vary, s.pitch_vary))
	p.bus = &"Master" if AudioServer.get_bus_index(s.bus) < 0 else StringName(s.bus)
	at.add_child(p)
	p.finished.connect(p.queue_free)
	p.play()
