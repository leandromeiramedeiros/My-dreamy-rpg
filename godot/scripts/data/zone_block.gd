@tool
class_name ZoneBlock
extends ActionBlock
## Zone: an area at the caster or at the aim. Life 0 = one burst (a nova); above 0 = a lasting zone that ticks.

@export_enum("self", "target") var at: String = "self"
## Max cast distance when `at` is target.
@export_range(0.0, 30.0, 0.1, "suffix:tiles") var cast_range: float = 6.0
@export_range(0.1, 20.0, 0.05, "suffix:tiles") var radius: float = 2.0
## 0 = one burst; otherwise the zone lasts this long.
@export_range(0.0, 60.0, 0.05, "suffix:s") var life: float = 0.0
## Seconds between damage ticks of a lasting zone.
@export_range(0.05, 10.0, 0.01, "suffix:s") var tick: float = 0.5
## Pull toward the centre (tiles/s; negative pushes).
@export var pull: float = 0.0
## On = the zone follows the caster.
@export var follow: bool = false
@export var color: Color = Color.WHITE
