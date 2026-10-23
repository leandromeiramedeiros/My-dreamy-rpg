@tool
extends EditorScript
## Editor entry of the arena importer: open this file, File > Run. Rebuilds every res://arenas/<id>.tscn from
## res://data/seed/arenas.json (studio test arenas only; real maps are the client's, res://zones/).

const AI := preload("res://addons/arena_import/arena_import.gd")


func _run() -> void:
	print("arena_import: ", JSON.stringify(AI.run()))
	EditorInterface.get_resource_filesystem().scan()
