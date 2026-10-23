extends Node
## Data (autoload): finds the seeded resources by kind and id, e.g. Data.enemy(&"ogre") loads res://data/enemies/ogre.tres.
## Kinds are the folders of res://data/: enemies, bosses, items, skills, effects, statuses, reactions, loot, grips,
## affixes, gems, sfx, fx, rules, hero. Saving a .tres in the editor is picked up on the next load.

const ROOT := "res://data"


## The resource `<kind>/<id>.tres`, or null.
func get_res(kind: String, id: String) -> Resource:
	var p := ROOT.path_join(kind).path_join(id + ".tres")
	if not ResourceLoader.exists(p):
		return null
	return load(p)


## Every id of a kind (file names without .tres).
func ids(kind: String) -> PackedStringArray:
	var out := PackedStringArray()
	var d := DirAccess.open(ROOT.path_join(kind))
	if d == null:
		return out
	for f: String in d.get_files():
		f = f.trim_suffix(".remap")
		if f.ends_with(".tres"):
			out.append(f.get_basename())
	return out


func enemy(id: StringName) -> EnemyData:
	var r := get_res("enemies", id)
	if r == null:
		r = get_res("bosses", id)
	return r as EnemyData


func item(id: StringName) -> ItemData:
	return get_res("items", id) as ItemData


func skill(id: StringName) -> SkillData:
	return get_res("skills", id) as SkillData


func rule(id: StringName) -> Resource:
	return get_res("rules", id)
