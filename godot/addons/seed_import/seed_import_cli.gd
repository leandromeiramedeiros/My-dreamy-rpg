extends SceneTree
## Headless entry of the seed importer:
##   godot --headless --path godot --script res://addons/seed_import/seed_import_cli.gd [-- --force]
const Importer := preload("res://addons/seed_import/seed_import.gd")


func _initialize() -> void:
	var stats: Dictionary = Importer.run(OS.get_cmdline_user_args().has("--force"))
	print("seed_import: ", JSON.stringify(stats))
	quit(0 if int(stats.get("errors", 0)) == 0 else 1)
