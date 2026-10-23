@tool
class_name ReactionData
extends Resource
## One of the eight reactions: an element (or a stagger) meeting a status.

@export var id: StringName
@export var display_name: String = ""
## Elements of the hit that trigger it.
@export var trigger_elements: PackedStringArray = []
## Statuses the target must carry (any of them).
@export var on_statuses: PackedStringArray = []
## Stagger points the hit needs (0 = none); -1 = a full stagger bar.
@export var needs_stagger: float = 0.0
## Damage type of the reaction's hit (empty = none).
@export var damage_type: StringName = &""
## What it does, in words, until the Status lane runs it.
@export_multiline var effect_text: String = ""
## Numbers (radius, spread, mult...).
@export var params: Dictionary = {}
@export var fx: FxSlots
@export var sfx: SfxSlots
@export_multiline var todo: String = ""
