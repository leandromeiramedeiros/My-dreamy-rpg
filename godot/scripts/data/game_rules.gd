@tool
class_name GameRules
extends Resource
## World-wide numbers: the iso grid, damage numbers, feel defaults.

@export_group("World")
## Screen pixels of one tile step along map +x and +y (the 32x16 iso grid).
@export var iso_x: Vector2 = Vector2(16, 8)
@export var iso_y: Vector2 = Vector2(-16, 8)
## Screen pixels of one tile of height.
@export var height_px: float = 8.0
@export_group("Damage numbers")
@export var number_font_size: int = 8
@export var number_color: Color = Color(1, 1, 1)
@export var number_crit_color: Color = Color(1, 0.85, 0.3)
@export var number_outline_color: Color = Color(0.1, 0.06, 0.14)
@export var number_outline: int = 2
## Pixels the number rises over its life.
@export var number_rise: float = 14.0
@export_range(0.1, 5.0, 0.05, "suffix:s") var number_life: float = 0.9
@export_group("Feel")
## Plays on every body that takes a hit when its own hit slot is empty.
@export var default_hit_fx: FxData
## Plays when a body dies when its own death slot is empty.
@export var default_death_fx: FxData
