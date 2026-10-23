extends SceneTree
## Headless entry of the handoff art importer (no sample scene):
##   godot --headless --path godot --script res://addons/handoff/art_import_cli.gd
const Importer := preload("res://addons/handoff/godot_import.gd")


func _initialize() -> void:
	var stats: Dictionary = Importer.run_import(Importer.ART, Importer.ZONES, false)
	print("godot_import: ", stats)
	quit(0 if int(stats.get("errors", 0)) == 0 else 1)
