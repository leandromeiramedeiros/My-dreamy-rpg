@tool
class_name HeroDoll
extends Node2D
## The hero's look. Wave 1 (temporary): a paper doll of AnimatedSprite2D layers from the forge sheets: every worn
## piece's _back layer by zorder[dir], the body, the hair (unless a piece hides it), every _front layer by zorder[dir],
## all on the body's frame. The attack anim swaps every layer to its <unit>.atk.<pose> sheet (pose = the HAND item's
## attack_pose).
##
## Weapons Out (client ruling 2026-10-23, Terraria + the "Weapons Out" mod, 8 directions): worn pieces are layers on the
## body; the HAND and OFFHAND items are always visible as one held sprite each (ItemData.held_sprite, pivot grip_point),
## parented to the hand socket (handR / handL of the sidecar sockets, per dir, anim and frame), drawn in front of or
## behind the body by the socket's `front` flag and turned per frame (swing / thrust / aim). An item with no held_sprite
## still shows its gear-sheet layers (every item today). Wave 2 swaps the layers for per-pixel layering and draws the
## held sprites. The sidecars carry no per-frame socket angle: the turn comes from carry_pose / carry_angle and the
## swing_style curve below until the forge writes `angle` per socket frame (wave 2, Forge rig lane).

signal finished(anim: StringName)

const DIRS: Array[String] = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
## equip slot -> hand socket of its held sprite
const HELD_SOCKET := {&"hand": "handR", &"offhand": "handL"}
## carry_pose -> held-sprite turn, degrees (0 = the sprite as drawn, blade up)
const CARRY_DEG := {"upright": 0.0, "lowered": 160.0, "shoulder": -55.0, "aim": 90.0, "float": 0.0, "braced": 0.0}
const BODY := "res://art/hero/body"
const HAIR := "res://art/hero/hair"

## The body sheet sidecar (res://art/hero/body.json); the hair sheet (hair.json).
@export var body_sheet: JSON
@export var hair_sheet: JSON

var anim: StringName = &"idle"
var dir := "S"
## The attack sheet pose (from the HAND item).
var pose := "none"
## Worn pieces: slot -> {item, tier, base (sheet path without .json)}
var pieces := {}

var _sheet := ""            # "core" or "atk.<pose>"
var _body: AnimatedSprite2D
var _layers: Array = []     # [{spr, z (Dictionary dir -> int), side ("back"/"front")}]
var _held := {}             # slot -> Node2D socket (child "Item": Sprite2D)
var _json := {}             # path -> parsed sidecar
var _origin := Vector2(26, 49)
var _order_key := ""


func _ready() -> void:
	_rebuild()
	play(anim, dir)


## Uses the given body / hair sidecars (HeroData.body_sheet, hair_sheet).
func setup(body: JSON, hair: JSON) -> void:
	body_sheet = body
	hair_sheet = hair
	_rebuild()


## Wears `item` (tier index, 0 = T1) in `slot` (hand, offhand, head, chest, boots; trinkets have no look). null = take off.
func equip(slot: StringName, item: ItemData, tier: int = 0) -> void:
	if item == null:
		pieces.erase(slot)
	else:
		var base := ""
		if not item.tiers.is_empty():
			var t: ItemTier = item.tiers[clampi(tier, 0, item.tiers.size() - 1)]
			if t and t.sheet:
				base = t.sheet.resource_path.trim_suffix(".json")
		pieces[slot] = {"item": item, "tier": tier, "base": base}
	var hand: Dictionary = pieces.get(&"hand", {})
	pose = (hand["item"] as ItemData).attack_pose if hand else "none"
	_sheet = ""
	_rebuild_held()
	play(anim, dir)


## Plays `anim` (idle, walk, cast, dash, hit, attack) facing `dir_name` (S, SE, E, NE, N, NW, W, SW).
## restart = start again from frame 0 even when already playing it.
func play(anim_name: StringName, dir_name: String, speed: float = 1.0, restart: bool = false) -> void:
	anim = anim_name
	dir = dir_name if DIRS.has(dir_name) else "S"
	var key := "atk." + pose if anim == &"attack" else "core"
	if key != _sheet:
		_sheet = key
		_rebuild()
	if _body == null or _body.sprite_frames == null:
		return
	var nm := StringName("%s_%s" % [anim, dir])
	if not _body.sprite_frames.has_animation(nm):
		nm = StringName("idle_" + dir)
	if restart or _body.animation != nm or not _body.is_playing():
		_body.play(nm, speed)
		if restart:
			_body.frame = 0
	_sync()


## Seconds `anim` lasts (sum of its frame durations) on the current sheets.
func duration(anim_name: StringName) -> float:
	var j := _sheet_json(BODY, "atk." + pose if anim_name == &"attack" else "core")
	var a: Dictionary = (j.get("anims", {}) as Dictionary).get(String(anim_name), {})
	var t := 0.0
	for ms: Variant in a.get("ms", []):
		t += float(ms) / 1000.0
	return t


## A socket (handR, handL, head, cast, chest) on the current frame, in doll pixels (feet = 0, 0), and its front flag.
func socket(socket_name: String) -> Dictionary:
	var j := _sheet_json(BODY, _sheet)
	var by_dir: Dictionary = (j.get("sockets", {}) as Dictionary).get(dir, {})
	var frames: Array = by_dir.get(String(anim), by_dir.get("idle", []))
	if frames.is_empty() or _body == null:
		return {"pos": Vector2.ZERO, "front": true}
	var s: Dictionary = (frames[clampi(_body.frame, 0, frames.size() - 1)] as Dictionary).get(socket_name, {})
	return {"pos": Vector2(float(s.get("x", _origin.x)), float(s.get("y", _origin.y))) - _origin, "front": bool(s.get("front", true)),
		"angle": s.get("angle")}


## The held-item node of `slot` (hand / offhand): a Node2D on the hand socket; its child "Item" is the held sprite.
func held_node(slot: StringName) -> Node2D:
	return _held.get(slot)


func flash_canvas() -> CanvasItem:
	return self


# ------------------------------------------------------------------ build

func _rebuild() -> void:
	for l: Dictionary in _layers:
		_drop(l["spr"])
	_layers.clear()
	if _body:
		_drop(_body)
		_body = null
	if _sheet == "":
		_sheet = "core"
	var body_base := body_sheet.resource_path.trim_suffix(".json") if body_sheet else BODY
	var bj := _sheet_json(body_base, _sheet)
	if bj.has("origin"):
		_origin = Vector2(float(bj["origin"][0]), float(bj["origin"][1]))
	_body = _sprite(_frames_path(body_base, _sheet, ""), "Body")
	if _body == null:
		return
	_body.frame_changed.connect(_sync)
	_body.animation_finished.connect(func() -> void: finished.emit(anim))
	var hides := []
	for slot: StringName in pieces:
		var base: String = pieces[slot]["base"]
		var item: ItemData = pieces[slot]["item"]
		if base == "" or (HELD_SOCKET.has(slot) and item.held_sprite != null):
			continue   # a held sprite replaces the gear layers of a HAND / OFFHAND item
		var j := _sheet_json(base, _sheet)
		hides.append_array(j.get("hides", []))
		_add_unit(base, j)
	if not hides.has("hair"):
		var hair_base := hair_sheet.resource_path.trim_suffix(".json") if hair_sheet else HAIR
		_add_unit(hair_base, _sheet_json(hair_base, _sheet))
	_order_key = ""
	_rebuild_held()


func _drop(n: Node) -> void:
	if n.get_parent() == self:
		remove_child(n)
	n.queue_free()


func _add_unit(base: String, j: Dictionary) -> void:
	for side: String in ["back", "front"]:
		var spr := _sprite(_frames_path(base, _sheet, "_" + side), base.get_file() + "_" + side)
		if spr:
			_layers.append({"spr": spr, "z": j.get("zorder", {}), "side": side})


func _rebuild_held() -> void:
	for slot: StringName in HELD_SOCKET:
		var n: Node2D = _held.get(slot)
		var item: ItemData = (pieces.get(slot, {}) as Dictionary).get("item")
		if item == null:
			if n:
				n.queue_free()
				_held.erase(slot)
			continue
		if n == null:
			n = Node2D.new()
			n.name = "Held_" + String(slot)
			var s := Sprite2D.new()
			s.name = "Item"
			s.centered = false
			n.add_child(s)
			add_child(n, false, Node.INTERNAL_MODE_DISABLED)
			_held[slot] = n
		var spr := n.get_node(^"Item") as Sprite2D
		spr.texture = item.held_sprite
		spr.offset = -item.grip_point
		n.visible = item.held_sprite != null
	_order_key = ""


func _sprite(path: String, nm: String) -> AnimatedSprite2D:
	if not ResourceLoader.exists(path):
		return null
	var s := AnimatedSprite2D.new()
	s.name = nm.validate_node_name()
	s.sprite_frames = load(path) as SpriteFrames
	s.centered = false
	s.offset = -_origin
	add_child(s)
	return s


## base "res://art/gear/sword.t1", sheet "core" | "atk.sword", side "" | "_front" | "_back" -> the SpriteFrames path
static func _frames_path(base: String, sheet: String, side: String) -> String:
	return (base if sheet == "core" else base + "." + sheet) + side + ".tres"


func _sheet_json(base: String, sheet: String) -> Dictionary:
	var p := (base if sheet == "core" or sheet == "" else base + "." + sheet) + ".json"
	if not _json.has(p):
		var v: Variant = JSON.parse_string(FileAccess.get_file_as_string(p)) if FileAccess.file_exists(p) else null
		_json[p] = v if v is Dictionary else {}
	return _json[p]


# ------------------------------------------------------------------ per frame

func _sync() -> void:
	if _body == null:
		return
	var nm := _body.animation
	var f := _body.frame
	for l: Dictionary in _layers:
		var spr: AnimatedSprite2D = l["spr"]
		if spr.sprite_frames.has_animation(nm):
			spr.visible = true
			spr.animation = nm
			spr.frame = mini(f, spr.sprite_frames.get_frame_count(nm) - 1)
		else:
			spr.visible = false
	var fronts := {}
	for slot: StringName in _held:
		var n: Node2D = _held[slot]
		var item: ItemData = pieces[slot]["item"]
		var s := socket(HELD_SOCKET[slot])
		n.position = s["pos"]
		n.rotation = deg_to_rad(_held_turn(item, s))
		fronts[slot] = s["front"]
	_order(fronts)


## The held sprite's turn this frame (degrees). TODO(wave 2): the socket's own per-frame angle from the forge.
func _held_turn(item: ItemData, s: Dictionary) -> float:
	if s.get("angle") != null:
		return float(s["angle"])
	var mirror := -1.0 if dir in ["W", "SW", "NW"] else 1.0
	var a: float = CARRY_DEG.get(item.carry_pose, 0.0) + item.carry_angle
	if anim == &"attack" and _body and _body.sprite_frames:
		var n := maxi(1, _body.sprite_frames.get_frame_count(_body.animation) - 1)
		var k := float(_body.frame) / n
		match item.swing_style:
			"swing": a = lerpf(-70.0, 110.0, k)
			"aim": a = 90.0
			"cast": a = -20.0 * sin(k * PI)
			"spin": a = 360.0 * k
	return a * mirror


## Child order this frame: backs by zorder, held items behind, body, fronts by zorder, held items in front.
func _order(fronts: Dictionary) -> void:
	var list: Array = []
	for l: Dictionary in _layers:
		var z := int((l["z"] as Dictionary).get(dir, 0))
		list.append([z + (0 if l["side"] == "back" else 2000), l["spr"]])
	list.append([1000, _body])
	for slot: StringName in _held:
		list.append([999 if not fronts.get(slot, true) else 5000, _held[slot]])
	list.sort_custom(func(a: Array, b: Array) -> bool: return a[0] < b[0])
	var key := ""
	for e: Array in list:
		key += str((e[1] as Node).get_instance_id()) + ","
	if key == _order_key:
		return
	_order_key = key
	for i: int in list.size():
		move_child(list[i][1], i)
