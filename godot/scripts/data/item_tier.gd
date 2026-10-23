@tool
class_name ItemTier
extends Resource
## One tier of an item line: its base id, name, level requirement and look.

@export var base_id: StringName
@export var display_name: String = ""
@export var required_level: int = 1
## Damage (weapons) or stat multiplier of this tier.
@export var multiplier: float = 1.0
## The gear sheet sidecar for the hero doll (empty = no look yet).
@export var sheet: JSON
@export var icon: Texture2D
