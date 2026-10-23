@tool
class_name FxTrail
extends FxLayer
## Trail: a fading ribbon behind a moving body (dash, projectile).

@export var color: Color = Color(1, 1, 1, 0.6)
@export_range(1.0, 32.0, 1.0, "suffix:px") var width: float = 3.0
## Past points the ribbon keeps.
@export_range(2, 64, 1) var length: int = 10
@export var gradient: Gradient
