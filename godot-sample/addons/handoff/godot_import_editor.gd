@tool
extends EditorScript
## Editor entry for the handoff importer: open this script in the Godot editor, File > Run (Ctrl+Shift+X).
## Same work as `godot --headless --script res://addons/handoff/godot_import.gd` (see that file).
const Importer := preload("godot_import.gd")


func _run() -> void:
	print("godot_import: ", Importer.run_import(Importer.ART, Importer.ZONES, true))
	EditorInterface.get_resource_filesystem().scan()
