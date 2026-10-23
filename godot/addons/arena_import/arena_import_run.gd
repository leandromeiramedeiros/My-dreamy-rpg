extends Node
## Headless entry of the arena importer, run as a scene so the autoloads and global classes are up:
##   godot --headless --path godot res://addons/arena_import/arena_import_run.tscn [-- --only=dummies,elite]

const AI := preload("res://addons/arena_import/arena_import.gd")


func _ready() -> void:
	var only := PackedStringArray()
	for a: String in OS.get_cmdline_user_args():
		if a.begins_with("--only="):
			only = a.trim_prefix("--only=").split(",")
	var stats: Dictionary = AI.run(only)
	print("arena_import: ", JSON.stringify(stats))
	get_tree().quit(0 if int(stats.get("errors", 0)) == 0 else 1)
