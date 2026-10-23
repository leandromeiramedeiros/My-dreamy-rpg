@tool
extends EditorScript
## Editor entry of the handoff art importer: open this script, File > Run (Ctrl+Shift+X). Rebuilds the SpriteFrames
## (.tres beside every sheet in res://art/) and the zone TileSets from the sidecars. Headless: art_import_cli.gd.
const Importer := preload("godot_import.gd")


func _run() -> void:
	print("godot_import: ", Importer.run_import(Importer.ART, Importer.ZONES, false))
	EditorInterface.get_resource_filesystem().scan()
