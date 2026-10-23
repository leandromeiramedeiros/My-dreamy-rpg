class_name Arena
extends Node2D
## A level root: the studio's mockup arenas (res://arenas/, built by the arena importer) and the client's zones use it.
## Children: Ground (TileMapLayer, the iso grid every entity uses), Entities (Y-sorted: Hero, enemies, props, columns).
## The hero kit (testing) equips the Hero at start; triggers keep the JS arena cards as data for the Triggers lane.

@export var arena_id: StringName
@export var arena_name: String = ""
@export_multiline var description: String = ""
@export var objective: String = ""
## Zone record id of the tiles (handoff zones.json).
@export var zone: StringName = &"vale"
## Level band (min, max).
@export var level_range: Vector2i = Vector2i(1, 6)

@export_group("Hero kit")
## Equip this kit on the Hero at start (testing arenas).
@export var use_kit: bool = true
@export var kit_hand: ItemData
@export var kit_offhand: ItemData
@export var kit_head: ItemData
@export var kit_chest: ItemData
@export var kit_boots: ItemData
## Tier index of the kit (0 = T1).
@export_range(0, 5, 1) var kit_tier: int = 0
@export var hero_level: int = 1

@export_group("Cards")
## The JS trigger cards (when, actions); the Triggers lane runs them.
@export var triggers: Array[Dictionary] = []
## Objects with no scene yet (gates, levers, keydoors...), as data.
@export var objects: Array[Dictionary] = []

var ground: TileMapLayer
var blockers: TileMapLayer


func _enter_tree() -> void:
	ground = get_node_or_null(^"Ground") as TileMapLayer
	blockers = get_node_or_null(^"Entities/Columns") as TileMapLayer
	if ground:
		Game.set_grid(ground)
	Game.arena = self


func _ready() -> void:
	var hero := find_child("Hero", true, false)
	if hero and use_kit and hero.has_method("equip"):
		for pair: Array in [[&"hand", kit_hand], [&"offhand", kit_offhand], [&"head", kit_head], [&"chest", kit_chest], [&"boots", kit_boots]]:
			if pair[1] != null:
				hero.call("equip", pair[0], pair[1], kit_tier)


func _exit_tree() -> void:
	if Game.arena == self:
		Game.arena = null


## True when map point `m` (tiles) stands on floor and not in a column.
func is_walkable(m: Vector2) -> bool:
	if ground == null:
		return true
	var c := Vector2i(floori(m.x), floori(m.y))
	if ground.get_cell_source_id(c) < 0:
		return false
	return blockers == null or blockers.get_cell_source_id(c) < 0


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(&"pause") and ResourceLoader.exists("res://scenes/ui/arena_list.tscn") and get_tree().current_scene == self:
		get_tree().change_scene_to_file("res://scenes/ui/arena_list.tscn")
