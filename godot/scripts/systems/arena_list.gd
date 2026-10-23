extends Control
## The Arena list (testing only): one button per mockup arena in res://arenas/. Esc in an arena comes back here.

const ARENAS := "res://arenas"
const TITLE := "Karea's Dream: arenas (studio testing)"


func _ready() -> void:
	var scroll := ScrollContainer.new()
	scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	scroll.offset_left = 8
	scroll.offset_top = 6
	scroll.offset_right = -8
	scroll.offset_bottom = -6
	add_child(scroll)
	var box := VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(box)
	var title := Label.new()
	title.text = TITLE
	box.add_child(title)
	var first: Button = null
	for id: String in list():
		var b := Button.new()
		var info := read_info(ARENAS.path_join(id + ".tscn"))
		b.text = "%s  -  %s" % [info.get("name", id), info.get("desc", "")]
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.pressed.connect(open.bind(id))
		box.add_child(b)
		if first == null:
			first = b
	if first:
		first.grab_focus.call_deferred()


## Arena ids (scene file names), sorted.
static func list() -> PackedStringArray:
	var out := PackedStringArray()
	var d := DirAccess.open(ARENAS)
	if d:
		for f: String in d.get_files():
			f = f.trim_suffix(".remap")
			if f.ends_with(".tscn"):
				out.append(f.get_basename())
	out.sort()
	return out


## The arena root's exported name and description, read without instancing the scene.
static func read_info(path: String) -> Dictionary:
	var ps := load(path) as PackedScene
	var out := {}
	if ps == null:
		return out
	var st := ps.get_state()
	for i: int in st.get_node_property_count(0):
		match st.get_node_property_name(0, i):
			&"arena_name": out["name"] = st.get_node_property_value(0, i)
			&"description": out["desc"] = st.get_node_property_value(0, i)
	return out


func open(id: String) -> void:
	get_tree().change_scene_to_file(ARENAS.path_join(id + ".tscn"))
