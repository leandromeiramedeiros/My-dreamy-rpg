extends SceneTree
## Handoff importer (Godot 4.7, GDScript): turns the handoff sidecars into Godot resources.
##   * every sheet sidecar with anims + dirs (hero, gear, enemies, bosses) -> one SpriteFrames .tres per image beside the PNG
##     (<sheet>.tres, <sheet>_front.tres, <sheet>_back.tres): animation "<anim>_<dir>" per anim per direction, AtlasTexture
##     frames on the sidecar grid, speed 10 fps with per-frame duration = ms / 100, loop from the sidecar.
##     Use: AnimatedSprite2D, centered = false, offset = -origin; the hero = one AnimatedSprite2D per layer (every _back by
##     zorder[dir], body, every _front by zorder[dir]) all playing the same animation.
##   * every zone of data/zones.json -> art/tiles/<zone>/<zone>_tileset.tres: isometric 32x16, layout DIAMOND_DOWN (map +x =
##     screen down-right, +y = down-left, the JS engine's axes); terrain set 0 in MATCH_CORNERS_AND_SIDES with one terrain per
##     zone terrain; each terrain_<id>.png is an atlas source whose cells get the sidecar's peering bits (bit 1 = this
##     terrain, 0 = the base terrain); water cells animate (4 frames). cliff_<zone>.png and coast.png are plain atlas sources
##     (tall regions, texture_origin from the sidecar) for hand-placed column / skirt / shadow tiles.
##   * with build_scene: scenes/main.tscn, the import proof (a painted ground, a plateau, coast, the layered hero, an Ogre with
##     a normal map under a PointLight2D, a tree).
## Run headless:  godot --headless --path <project> --script res://addons/handoff/godot_import.gd
## or in the editor: res://addons/handoff/godot_import_editor.gd (EditorScript, File > Run).
const ART := "res://art"
const ZONES := "res://data/zones.json"
const NEIGHBOR := {
	"TOP_LEFT_SIDE": TileSet.CELL_NEIGHBOR_TOP_LEFT_SIDE, "BOTTOM_RIGHT_SIDE": TileSet.CELL_NEIGHBOR_BOTTOM_RIGHT_SIDE,
	"TOP_RIGHT_SIDE": TileSet.CELL_NEIGHBOR_TOP_RIGHT_SIDE, "BOTTOM_LEFT_SIDE": TileSet.CELL_NEIGHBOR_BOTTOM_LEFT_SIDE,
	"TOP_CORNER": TileSet.CELL_NEIGHBOR_TOP_CORNER, "RIGHT_CORNER": TileSet.CELL_NEIGHBOR_RIGHT_CORNER,
	"LEFT_CORNER": TileSet.CELL_NEIGHBOR_LEFT_CORNER, "BOTTOM_CORNER": TileSet.CELL_NEIGHBOR_BOTTOM_CORNER,
}


func _initialize() -> void:
	var stats: Dictionary = run_import(ART, ZONES, true)
	print("godot_import: ", stats)
	quit(0 if int(stats.get("errors", 0)) == 0 else 1)


static func run_import(art: String, zones_path: String, build_scene: bool) -> Dictionary:
	var stats := {"sprite_frames": 0, "tilesets": 0, "errors": 0}
	for path: String in _files(art, ".json"):
		var j: Dictionary = _read_json(path)
		if j.has("anims") and j.has("dirs") and j.has("images"):
			var images: Dictionary = j["images"]
			for key: String in ["color", "front", "back"]:
				if images.get(key) == null:
					continue
				var png: String = path.get_base_dir().path_join(String(images[key]))
				var sf: SpriteFrames = sprite_frames(j, png)
				if sf == null or ResourceSaver.save(sf, png.get_basename() + ".tres") != OK:
					stats["errors"] += 1
					push_error("godot_import: cannot build " + png)
				else:
					stats["sprite_frames"] += 1
	var zones: Dictionary = _read_json(zones_path)
	for z: Dictionary in zones.get("zones", []):
		var dir: String = art.path_join("tiles").path_join(String(z["id"]))
		if not DirAccess.dir_exists_absolute(dir):
			continue
		var ts: TileSet = tileset(z, dir)
		if ResourceSaver.save(ts, dir.path_join(String(z["id"]) + "_tileset.tres")) != OK:
			stats["errors"] += 1
		else:
			stats["tilesets"] += 1
	if build_scene:
		stats["scene"] = build_main_scene(art, zones)
	return stats


## SpriteFrames for one sheet image: "<anim>_<dir>" animations on the sidecar grid
static func sprite_frames(j: Dictionary, png: String) -> SpriteFrames:
	var tex := load(png) as Texture2D
	if tex == null:
		return null
	var sf := SpriteFrames.new()
	sf.remove_animation(&"default")
	var cw: int = int(j["cell"][0])
	var ch: int = int(j["cell"][1])
	var dirs: Array = j["dirs"]
	var anims: Dictionary = j["anims"]
	for anim_name: String in anims:
		var a: Dictionary = anims[anim_name]
		var ms: Array = a["ms"]
		for r: int in dirs.size():
			var nm := StringName("%s_%s" % [anim_name, dirs[r]])
			sf.add_animation(nm)
			sf.set_animation_loop(nm, bool(a["loop"]))
			sf.set_animation_speed(nm, 10.0)
			for f: int in int(a["count"]):
				var at := AtlasTexture.new()
				at.atlas = tex
				at.region = Rect2((int(a["from"]) + f) * cw, r * ch, cw, ch)
				sf.add_frame(nm, at, float(ms[f]) / 100.0)
	return sf


## the zone's TileSet: one terrain set (match corners and sides), one atlas source per terrain PNG, cliff and coast sources
static func tileset(z: Dictionary, dir: String) -> TileSet:
	var ts := TileSet.new()
	ts.tile_shape = TileSet.TILE_SHAPE_ISOMETRIC
	ts.tile_layout = TileSet.TILE_LAYOUT_DIAMOND_DOWN
	ts.tile_size = Vector2i(32, 16)
	ts.add_terrain_set()
	ts.set_terrain_set_mode(0, TileSet.TERRAIN_MODE_MATCH_CORNERS_AND_SIDES)
	var terrains: Array = z["terrains"]
	var base_idx := 0
	for i: int in terrains.size():
		var t: Dictionary = terrains[i]
		ts.add_terrain(0)
		ts.set_terrain_name(0, i, String(t["id"]))
		ts.set_terrain_color(0, i, Color.from_hsv(float(i) / terrains.size(), 0.55, 0.9))
		if t.get("base", false):
			base_idx = i
	for i: int in terrains.size():
		var t: Dictionary = terrains[i]
		var side: Dictionary = _read_json(dir.path_join(String(t["file"]).get_basename() + ".json"))
		var src := TileSetAtlasSource.new()
		src.resource_name = String(t["id"])
		src.texture = load(dir.path_join(String(t["file"]))) as Texture2D
		src.texture_region_size = Vector2i(32, 16)
		ts.add_source(src)
		var frames: Variant = side.get("frames")
		var dirs: Array = side["directions"]
		for cell: Dictionary in side["cells"]:
			var coords := Vector2i(int(cell["col"]), int(cell["row"]))
			src.create_tile(coords)
			if frames is Dictionary:
				var fr: Dictionary = frames
				src.set_tile_animation_columns(coords, 0)
				src.set_tile_animation_separation(coords, Vector2i(int(fr["column_step"]) - 1, 0))
				src.set_tile_animation_frames_count(coords, int(fr["count"]))
				for k: int in int(fr["count"]):
					src.set_tile_animation_frame_duration(coords, k, float(fr["ms"]) / 1000.0)
			var td: TileData = src.get_tile_data(coords, 0)
			td.terrain_set = 0
			td.terrain = i
			var bits: Array = cell["bits"]
			for d: Dictionary in dirs:
				td.set_terrain_peering_bit(NEIGHBOR[String(d["godot"])], i if int(bits[int(d["bit"])]) == 1 else base_idx)
			if cell.has("variant"):
				td.probability = 1.0 if int(cell["variant"]) == 0 else 0.35
	for key: String in ["cliff", "coast"]:
		var file: String = String(z[key])
		var side: Dictionary = _read_json(dir.path_join(file.get_basename() + ".json"))
		var src := TileSetAtlasSource.new()
		src.resource_name = key
		src.texture = load(dir.path_join(file)) as Texture2D
		src.texture_region_size = Vector2i(int(side["cell"][0]), int(side["cell"][1]))
		ts.add_source(src)
		var origin := Vector2i(int(side["texture_origin"][0]), int(side["texture_origin"][1]))
		for cell: Dictionary in side["cells"]:
			var coords := Vector2i(int(cell["col"]), int(cell["row"]))
			src.create_tile(coords)
			src.get_tile_data(coords, 0).texture_origin = origin
	return ts


## index of a terrain id in the zone's list
static func terrain_index(z: Dictionary, id: String) -> int:
	var terrains: Array = z["terrains"]
	for i: int in terrains.size():
		if String(terrains[i]["id"]) == id:
			return i
	return -1


## the atlas coords of the first cell of a sidecar matching every key of `want`
static func find_cell(side: Dictionary, want: Dictionary) -> Vector2i:
	for cell: Dictionary in side["cells"]:
		var ok := true
		for k: String in want:
			if not cell.has(k) or cell[k] != want[k]:
				ok = false
				break
		if ok:
			return Vector2i(int(cell["col"]), int(cell["row"]))
	return Vector2i(-1, -1)


## the import proof: one zone's ground painted with terrains, a plateau, the island edge, the layered hero, an Ogre with a
## normal map under a PointLight2D, a tree; saved as scenes/main.tscn
static func build_main_scene(art: String, zones: Dictionary) -> String:
	var list: Array = zones.get("zones", [])
	if list.is_empty():
		return "no zones"
	var z: Dictionary = list[0]
	var dir: String = art.path_join("tiles").path_join(String(z["id"]))
	var ts := load(dir.path_join(String(z["id"]) + "_tileset.tres")) as TileSet
	var root := Node2D.new()
	root.name = "Main"
	var mod := CanvasModulate.new()
	mod.name = "Ambient"
	mod.color = Color(0.82, 0.78, 0.95)
	_add(root, root, mod)
	# ground: grass, a path and a pond painted through the terrain set (Godot picks the blob-47 cells)
	var ground := TileMapLayer.new()
	ground.name = "Ground"
	ground.tile_set = ts
	_add(root, root, ground)
	var all_cells: Array[Vector2i] = []
	for y: int in 14:
		for x: int in 14:
			all_cells.append(Vector2i(x, y))
	ground.set_cells_terrain_connect(all_cells, 0, terrain_index(z, "grass"))
	var path_cells: Array[Vector2i] = []
	for y: int in range(2, 12):
		path_cells.append(Vector2i(6, y))
		path_cells.append(Vector2i(7, y))
	ground.set_cells_terrain_connect(path_cells, 0, terrain_index(z, "path"))
	var pond: Array[Vector2i] = [Vector2i(10, 3), Vector2i(11, 3), Vector2i(10, 4), Vector2i(11, 4), Vector2i(12, 4), Vector2i(11, 5)]
	ground.set_cells_terrain_connect(pond, 0, terrain_index(z, "water"))
	# coast skirts under the SW (y = 13) and SE (x = 13) front edges; cliff source = 1 + terrains, coast = 2 + terrains
	var n_terr: int = (z["terrains"] as Array).size()
	var cliff_src: int = n_terr
	var coast_src: int = n_terr + 1
	var coast_side: Dictionary = _read_json(dir.path_join(String(z["coast"]).get_basename() + ".json"))
	var coast := TileMapLayer.new()
	coast.name = "Coast"
	coast.tile_set = ts
	_add(root, root, coast)
	for i: int in 14:
		_put(coast, Vector2i(i, 13), coast_src, find_cell(coast_side, {"kind": "skirt", "edge_sw": true, "edge_se": i == 13, "length": 0.6, "variant": i % 4}))
		if i < 13:
			_put(coast, Vector2i(13, i), coast_src, find_cell(coast_side, {"kind": "skirt", "edge_sw": false, "edge_se": true, "length": 0.6, "variant": i % 4}))
	# a 3 x 3 grass plateau of 1 level at (2..4, 2..4): foot shadows on the ground in front of it, the columns on a
	# Y-sorted layer inside Entities (so actors sort against them)
	var cliff_side: Dictionary = _read_json(dir.path_join(String(z["cliff"]).get_basename() + ".json"))
	var high := func(c: Vector2i) -> bool: return c.x >= 2 and c.x <= 4 and c.y >= 2 and c.y <= 4
	var shadows := TileMapLayer.new()
	shadows.name = "FootShadows"
	shadows.tile_set = ts
	_add(root, root, shadows)
	for y: int in range(2, 6):
		for x: int in range(2, 6):
			var c := Vector2i(x, y)
			if high.call(c):
				continue
			_put(shadows, c, cliff_src, find_cell(cliff_side, {"kind": "shadow", "ao_nw": high.call(c + Vector2i(-1, 0)), "ao_ne": high.call(c + Vector2i(0, -1)), "ao_n": high.call(c + Vector2i(-1, -1)), "wedge_dh": 1}))
	var ents := Node2D.new()
	ents.name = "Entities"
	ents.y_sort_enabled = true
	_add(root, root, ents)
	var cols := TileMapLayer.new()
	cols.name = "Columns"
	cols.tile_set = ts
	cols.y_sort_enabled = true
	_add(root, ents, cols)
	for y: int in range(2, 5):
		for x: int in range(2, 5):
			_put(cols, Vector2i(x, y), cliff_src, find_cell(cliff_side, {"kind": "column", "top": "grass", "h": 1, "face_sw": y == 4, "face_se": x == 4, "rim_nw": x == 2, "rim_ne": y == 2}))
	var hero := _hero(art, ["cape.t3", "warden.t3", "knightgreaves.t3", "knighthelm.t3", "sword.t3", "shield.t3"], "S")
	hero.position = ground.map_to_local(Vector2i(8, 8))
	_add(root, ents, hero)
	var ogre := _normal_sprite(art.path_join("enemies/ogre"))
	ogre.name = "Ogre"
	ogre.position = ground.map_to_local(Vector2i(11, 8))
	_add(root, ents, ogre)
	var light := PointLight2D.new()
	light.name = "OgreLight"
	light.texture = _radial(256)
	light.color = Color(1.0, 0.8, 0.55)
	light.energy = 1.4
	light.height = 24.0
	light.position = ogre.position + Vector2(-30, -40)
	_add(root, root, light)
	var tree := _tree(art.path_join("props/tree_round_00"))
	tree.position = ground.map_to_local(Vector2i(4, 9))
	_add(root, ents, tree)
	var cam := Camera2D.new()
	cam.name = "Camera"
	cam.position = ground.map_to_local(Vector2i(6, 6))
	cam.zoom = Vector2(2, 2)
	_add(root, root, cam)
	var scene := PackedScene.new()
	if scene.pack(root) != OK:
		return "pack failed"
	var err := ResourceSaver.save(scene, "res://scenes/main.tscn")
	root.free()
	return "res://scenes/main.tscn" if err == OK else "save failed"


## the layered hero: every _back by zorder[dir], the body, every _front by zorder[dir]; hair unless a piece hides it
static func _hero(art: String, pieces: Array, dir: String) -> Node2D:
	var hero := Node2D.new()
	hero.name = "Hero"
	var body: Dictionary = _read_json(art.path_join("hero/body.json"))
	var hides_hair := false
	var units: Array = [{"json": art.path_join("hero/hair.json"), "z": 0}]
	for p: String in pieces:
		var j: Dictionary = _read_json(art.path_join("gear/" + p + ".json"))
		if (j.get("hides", []) as Array).has("hair"):
			hides_hair = true
		units.append({"json": art.path_join("gear/" + p + ".json"), "z": int(j["zorder"][dir])})
	if hides_hair:
		units.remove_at(0)
	else:
		units[0]["z"] = int(_read_json(units[0]["json"])["zorder"][dir])
	units.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return int(a["z"]) < int(b["z"]))
	var origin := Vector2(float(body["origin"][0]), float(body["origin"][1]))
	var anim := StringName("walk_" + dir)
	var order: Array = []
	for u: Dictionary in units:
		order.append([u["json"], "back"])
	order.append([art.path_join("hero/body.json"), "color"])
	for u: Dictionary in units:
		order.append([u["json"], "front"])
	for e: Array in order:
		var j: Dictionary = _read_json(String(e[0]))
		var img: Variant = (j["images"] as Dictionary).get(String(e[1]))
		if img == null:
			continue
		var spr := AnimatedSprite2D.new()
		spr.name = String(img).get_basename().replace(".", "_")
		spr.sprite_frames = load(String(e[0]).get_base_dir().path_join(String(img).get_basename() + ".tres")) as SpriteFrames
		spr.centered = false
		spr.offset = -origin
		spr.animation = anim
		spr.autoplay = String(anim)
		hero.add_child(spr)
	return hero


## an enemy frame (idle, S) as a Sprite2D whose texture is a CanvasTexture (colour + normal sheet), lit by Light2D
static func _normal_sprite(base: String) -> Sprite2D:
	var j: Dictionary = _read_json(base + ".json")
	var ct := CanvasTexture.new()
	ct.diffuse_texture = load(base + ".png") as Texture2D
	ct.normal_texture = load(base + "_n.png") as Texture2D
	var s := Sprite2D.new()
	s.texture = ct
	s.centered = false
	s.region_enabled = true
	s.region_rect = Rect2(0, 0, float(j["cell"][0]), float(j["cell"][1]))
	s.offset = -Vector2(float(j["origin"][0]), float(j["origin"][1]))
	return s


## a tree: trunk + canopy Sprite2Ds sharing the origin
static func _tree(base: String) -> Node2D:
	var j: Dictionary = _read_json(base + ".json")
	var t := Node2D.new()
	t.name = String(j["id"])
	for layer: String in ["trunk", "canopy"]:
		var s := Sprite2D.new()
		s.name = layer.capitalize()
		s.texture = load(base.get_base_dir().path_join(String(j["layers"][layer]))) as Texture2D
		s.centered = false
		s.offset = -Vector2(float(j["origin"][0]), float(j["origin"][1]))
		t.add_child(s)
	return t


static func _radial(size: int) -> GradientTexture2D:
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	tex.width = size
	tex.height = size
	return tex


## set a cell when the sidecar has a matching tile (find_cell returns (-1, -1) when none matches)
static func _put(layer: TileMapLayer, c: Vector2i, src: int, coords: Vector2i) -> void:
	if coords.x >= 0:
		layer.set_cell(c, src, coords)
	else:
		push_warning("godot_import: no %s tile for %s" % [layer.name, c])


static func _add(owner: Node, parent: Node, child: Node) -> void:
	parent.add_child(child)
	child.owner = owner
	for c: Node in child.get_children():
		c.owner = owner


static func _read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var v: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	return v if v is Dictionary else {}


static func _files(dir: String, ext: String) -> Array[String]:
	var out: Array[String] = []
	var d := DirAccess.open(dir)
	if d == null:
		return out
	for f: String in d.get_files():
		if f.ends_with(ext):
			out.append(dir.path_join(f))
	for sub: String in d.get_directories():
		out.append_array(_files(dir.path_join(sub), ext))
	return out
