@tool
class_name FxSlots
extends Resource
## FX slots: one FX preset per event. Items, skill blocks, enemies, statuses, reactions and props carry one of these;
## an empty slot plays nothing. Drop a preset from res://data/fx/ into a slot, or build a new one in place.

@export var spawn: FxData
@export var idle: FxData
@export var cast: FxData
@export var hit: FxData
## Empty = the hit preset.
@export var crit: FxData
@export var death: FxData
@export var pick_up: FxData
## Any other event by name ("block", "reflect", "land"...).
@export var extra: Dictionary[StringName, FxData] = {}


## The preset for an event, or null.
func get_fx(event: StringName) -> FxData:
	match event:
		&"spawn": return spawn
		&"idle": return idle
		&"cast": return cast
		&"hit": return hit
		&"crit": return crit if crit != null else hit
		&"death": return death
		&"pick_up": return pick_up
	return extra.get(event)
