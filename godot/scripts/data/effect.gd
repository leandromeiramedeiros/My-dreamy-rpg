@tool
class_name Effect
extends Resource
## An EFFECTS row: when something happens (when_event), if the tags match (if_tags), do something (do_action), at most
## once per icd seconds. Items, trinkets, suits, classes and Grips carry these as passives. An effect never names a skill.

@export var id: StringName
@export var display_name: String = ""
## Tooltip line.
@export_multiline var hint: String = ""
## Where the row comes from.
@export_enum("item", "trinket", "affix", "unique", "suit", "class", "grip", "elite") var source: String = "item"
## The event that fires it (JS `when`); passive = always on (stats only).
@export_enum("passive", "cast", "hit", "kill", "dodge", "statusApplied", "reaction", "ultimate", "potion", "parry") var when_event: String = "passive"
## Skill tags that must match (empty = any).
@export var if_tags: PackedStringArray = []
## A state that must hold (e.g. "below_half_hp"); empty = none.
@export var if_state: StringName = &""
## What it does (JS `do`), by name; the Effects lane implements each name.
@export var do_action: StringName = &""
## Numbers for do_action.
@export var do_params: Dictionary = {}
## Stat keys it adds while live (stat -> value key or number).
@export var stats: Dictionary = {}
## Internal cooldown between fires.
@export_range(0.0, 60.0, 0.05, "suffix:s") var icd: float = 0.5
@export var tags: PackedStringArray = []
## On = shown and saved, no behaviour yet.
@export var data_only: bool = false
@export var fx: FxSlots
@export var sfx: SfxSlots
@export_multiline var todo: String = ""
