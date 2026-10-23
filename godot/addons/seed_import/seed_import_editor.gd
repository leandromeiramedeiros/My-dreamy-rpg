@tool
extends EditorScript
## Editor entry of the seed importer: open this script, then File > Run (Ctrl+Shift+X). Keeps every existing .tres;
## set FORCE to true to overwrite them from res://data/seed/*.json (your Inspector edits are lost).
const Importer := preload("res://addons/seed_import/seed_import.gd")
const FORCE := false


func _run() -> void:
	print("seed_import: ", Importer.run(FORCE))
	EditorInterface.get_resource_filesystem().scan()
