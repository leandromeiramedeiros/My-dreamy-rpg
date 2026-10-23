@tool
class_name Prop
extends Node2D
## A placeable prop: drop res://scenes/props/prop.tscn into a map and put a prop sidecar (res://art/props/*.json) in
## `sidecar`. Trees draw trunk + canopy. `object_data` keeps the arena object's fields (gate ids, chest tier, labels)
## for the lanes that give props behaviour (wave 2: chest, shrine, gate, lever, warp scenes).

@export var sidecar: JSON:
	set(v):
		sidecar = v
		if is_inside_tree():
			_build()
@export var object_data: Dictionary = {}


func _ready() -> void:
	_build()


func _build() -> void:
	for c: Node in get_children(true):
		if c.has_meta(&"prop_look"):
			c.queue_free()
	if sidecar == null or not (sidecar.data is Dictionary):
		return
	var j: Dictionary = sidecar.data
	var dir := sidecar.resource_path.get_base_dir()
	var origin := Vector2(float(j["origin"][0]), float(j["origin"][1])) if j.has("origin") else Vector2.ZERO
	var files: Array = []
	if j.get("layers") is Dictionary:
		files = [j["layers"].get("trunk"), j["layers"].get("canopy")]
	elif j.has("image"):
		files = [j["image"]]
	for f: Variant in files:
		if f == null:
			continue
		var tex := load(dir.path_join(String(f))) as Texture2D
		if tex == null:
			continue
		var s := Sprite2D.new()
		s.texture = tex
		s.centered = false
		s.offset = -origin
		s.region_enabled = j.get("frames") is Dictionary
		if s.region_enabled:
			s.region_rect = Rect2(0, 0, float(j["size"][0]), float(j["size"][1]))
		s.set_meta(&"prop_look", true)
		add_child(s, false, Node.INTERNAL_MODE_FRONT)
