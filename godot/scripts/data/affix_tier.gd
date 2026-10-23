@tool
class_name AffixTier
extends Resource
## One named tier of an affix and its roll range.

@export var display_name: String = ""
## Roll range (min, max).
@export var roll: Vector2 = Vector2.ZERO
## Item level the tier unlocks at.
@export var item_level: int = 1
