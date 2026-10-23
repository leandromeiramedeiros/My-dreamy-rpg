@tool
extends RefCounted
## Seed importer: turns res://data/seed/*.json (written by tools/godot/seed.js from the JS reference) into the game's
## resources, res://data/<kind>/<id>.tres. One-time: an existing .tres is kept (the client may have edited it) unless
## `force` is on. Field names in the JSON are the resource's property names; references are ids (skills, effects, loot,
## items, statuses, fx) or res:// paths (sheets, frames); nested rows ({type: "cone", ...}) become sub-resources.
## Run headless:  godot --headless --path godot --script res://addons/seed_import/seed_import_cli.gd [-- --force]
## or in the editor: open seed_import_editor.gd, File > Run.

const SEED := "res://data/seed"
const DATA := "res://data"
## seed file -> [output folder ("" = the file name gives the path), class, single-file name]
const KINDS := [
	["fx", "fx", "FxData", ""], ["sfx", "sfx", "SfxData", ""], ["effects", "effects", "Effect", ""],
	["skills", "skills", "SkillData", ""], ["statuses", "statuses", "StatusData", ""], ["reactions", "reactions", "ReactionData", ""],
	["affixes", "affixes", "AffixData", ""], ["gems", "gems", "GemData", ""], ["items", "items", "ItemData", ""],
	["grips", "grips", "GripData", ""], ["loot", "loot", "LootTable", ""], ["enemies", "enemies", "EnemyData", ""],
	["bosses", "bosses", "BossData", ""], ["hero", "hero", "HeroData", "hero"], ["pairings", "rules", "PairingTable", "pairings"],
	["game_rules", "rules", "GameRules", "game_rules"], ["status_rules", "rules", "StatusRules", "status_rules"],
]
## reference fields given as an id -> the data folder they live in
const REFS := {
	"action": "skills", "spell": "skills", "ultimate": "skills", "active": "skills", "dodge": "skills",
	"loot": "loot", "base_table": "loot", "unique": "items", "effect": "effects", "passives": "effects",
	"hero_variant": "statuses", "default_hit_fx": "fx", "default_death_fx": "fx", "sfx": "sfx",
}
## `type` of a nested row -> class, per base class
const SUBTYPES := {
	"ActionBlock": {"cone": "ConeBlock", "projectile": "ProjectileBlock", "zone": "ZoneBlock", "dash": "DashBlock"},
	"FxLayer": {"particles": "FxParticles", "sprite_anim": "FxSpriteAnim", "light": "FxLight", "trail": "FxTrail", "tint": "FxTint",
		"decal": "FxDecal", "shake": "FxShake", "hitstop": "FxHitstop", "sfx": "FxSfx"},
}

static var _classes := {}
static var _stats := {}
static var _warn := 0
static var _written := {}


static func run(force: bool) -> Dictionary:
	_classes.clear()
	for c: Dictionary in ProjectSettings.get_global_class_list():
		_classes[String(c["class"])] = String(c["path"])
	_stats = {"written": 0, "kept": 0, "errors": 0, "warnings": 0, "per_kind": {}}
	_warn = 0
	_written.clear()
	for k: Array in KINDS:
		_import_kind(k[0], k[1], k[2], k[3], force)
	# second pass for references inside one kind (a status's hero variant, a loot table's base table)
	for k: Array in [["statuses", "statuses", "StatusData", ""], ["loot", "loot", "LootTable", ""]]:
		_import_kind(k[0], k[1], k[2], k[3], force, true)
	_stats["warnings"] = _warn
	return _stats


static func _import_kind(file: String, folder: String, cls: String, single: String, force: bool, relink: bool = false) -> void:
	var path := SEED.path_join(file + ".json")
	if not FileAccess.file_exists(path):
		push_warning("seed_import: no " + path)
		_warn += 1
		return
	var j: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not (j is Dictionary):
		push_error("seed_import: bad JSON " + path)
		_stats["errors"] += 1
		return
	DirAccess.make_dir_recursive_absolute(DATA.path_join(folder))
	var per: Dictionary = _stats["per_kind"]
	if not per.has(folder + "/" + cls):
		per[folder + "/" + cls] = 0
	for row: Dictionary in j["rows"]:
		var id := single if single != "" else String(row.get("id", ""))
		if id == "":
			continue
		var out := DATA.path_join(folder).path_join(id + ".tres")
		var exists := FileAccess.file_exists(out)
		if relink:
			if _written.has(out):
				var r0 := ResourceLoader.load(out, "", ResourceLoader.CACHE_MODE_REPLACE)
				if r0 != null:
					_apply(r0, row)
					ResourceSaver.save(r0, out)
			continue
		if exists and not force:
			_stats["kept"] += 1
			per[folder + "/" + cls] += 1
			continue
		var res := _new(cls)
		if res == null:
			_stats["errors"] += 1
			return
		_apply(res, row)
		res.take_over_path(out)
		if ResourceSaver.save(res, out) != OK:
			push_error("seed_import: cannot save " + out)
			_stats["errors"] += 1
		else:
			_stats["written"] += 1
			_written[out] = true
			per[folder + "/" + cls] += 1


static func _new(cls: String) -> Resource:
	if not _classes.has(cls):
		push_error("seed_import: unknown class " + cls + " (run godot --import first)")
		return null
	return (load(_classes[cls]) as Script).new()


## copies a JSON row onto a resource, property by property (unknown keys are ignored)
static func _apply(res: Object, row: Dictionary) -> void:
	var props := {}
	for p: Dictionary in res.get_property_list():
		if p["usage"] & PROPERTY_USAGE_STORAGE:
			props[String(p["name"])] = p
	for key: String in row:
		if key == "type" or not props.has(key):
			continue
		var v: Variant = row[key]
		var p: Dictionary = props[key]
		var cur: Variant = res.get(key)
		match int(p["type"]):
			TYPE_COLOR:
				if v is String and String(v) != "":
					res.set(key, Color.html(String(v)))
			TYPE_VECTOR2:
				if v is Array and (v as Array).size() >= 2:
					res.set(key, Vector2(float(v[0]), float(v[1])))
			TYPE_PACKED_STRING_ARRAY:
				res.set(key, PackedStringArray(_strings(v)))
			TYPE_PACKED_FLOAT32_ARRAY:
				res.set(key, PackedFloat32Array(v if v is Array else []))
			TYPE_PACKED_INT32_ARRAY:
				res.set(key, PackedInt32Array(v if v is Array else []))
			TYPE_STRING_NAME:
				res.set(key, StringName(str(v)))
			TYPE_STRING:
				res.set(key, str(v))
			TYPE_INT:
				res.set(key, int(v))
			TYPE_FLOAT:
				res.set(key, float(v))
			TYPE_BOOL:
				res.set(key, bool(v))
			TYPE_DICTIONARY:
				if v is Dictionary:
					var d: Dictionary = cur
					if d.is_typed():
						d.clear()
						for kk: Variant in v:
							d[_as_type(kk, d.get_typed_key_builtin())] = _as_type(v[kk], d.get_typed_value_builtin(), key)
					else:
						res.set(key, v)
			TYPE_ARRAY:
				if v is Array:
					_apply_array(res, key, cur as Array, v as Array)
			TYPE_OBJECT:
				res.set(key, _object(key, v, String(p.get("hint_string", ""))))


static func _apply_array(res: Object, key: String, cur: Array, v: Array) -> void:
	if not cur.is_typed():
		cur.assign(v)
		return
	if cur.get_typed_builtin() == TYPE_DICTIONARY:
		var rows: Array = []
		for e: Variant in v:
			rows.append(e if e is Dictionary else {"action": e})   # a bare name in a JS list of actions
		cur.assign(rows)
		return
	if cur.get_typed_builtin() != TYPE_OBJECT:
		cur.assign(v)
		return
	var base := String(cur.get_typed_class_name())
	var scr: Script = cur.get_typed_script()
	if scr != null and scr.get_global_name() != &"":
		base = String(scr.get_global_name())
	var list: Array = []
	for e: Variant in v:
		var o: Variant = _object(key, e, base)
		if o != null:
			list.append(o)
	cur.assign(list)


## a resource from an id, a res:// path or a nested row
static func _object(key: String, v: Variant, cls: String) -> Resource:
	if v == null:
		return null
	if v is String:
		var s := String(v)
		if s == "":
			return null
		if s.begins_with("res://"):
			if ResourceLoader.exists(s):
				return load(s)
			_warn += 1
			push_warning("seed_import: %s -> missing %s" % [key, s])
			return null
		if REFS.has(key):
			var p := DATA.path_join(REFS[key]).path_join(s + ".tres")
			if ResourceLoader.exists(p):
				return load(p)
			return null
		return null
	if v is Dictionary:
		var c := cls
		var row: Dictionary = v
		if SUBTYPES.has(cls) and row.has("type"):
			c = String((SUBTYPES[cls] as Dictionary).get(String(row["type"]), cls))
		var r := _new(c)
		if r != null:
			_apply(r, row)
		return r
	return null


static func _as_type(v: Variant, t: int, _key: String = "") -> Variant:
	match t:
		TYPE_STRING_NAME: return StringName(str(v))
		TYPE_STRING: return str(v)
		TYPE_FLOAT: return float(v)
		TYPE_INT: return int(v)
	return v


static func _strings(v: Variant) -> Array:
	var out: Array = []
	if v is Array:
		for e: Variant in v:
			out.append(str(e))
	elif v is String and String(v) != "":
		out.append(v)
	return out
