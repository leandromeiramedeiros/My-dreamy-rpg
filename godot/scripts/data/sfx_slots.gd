@tool
class_name SfxSlots
extends Resource
## Audio slots: one sound per event, beside the FX slots on every data resource. Empty = silent.

@export var spawn: SfxData
@export var idle: SfxData
@export var cast: SfxData
@export var hit: SfxData
## Empty = the hit sound.
@export var crit: SfxData
@export var death: SfxData
@export var pick_up: SfxData
@export var extra: Dictionary[StringName, SfxData] = {}


func get_sfx(event: StringName) -> SfxData:
	match event:
		&"spawn": return spawn
		&"idle": return idle
		&"cast": return cast
		&"hit": return hit
		&"crit": return crit if crit != null else hit
		&"death": return death
		&"pick_up": return pick_up
	return extra.get(event)
