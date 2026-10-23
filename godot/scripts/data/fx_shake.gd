@tool
class_name FxShake
extends FxLayer
## Screen shake (scaled by the screen-shake setting). `life` = how long.

## Peak offset.
@export_range(0.0, 32.0, 0.1, "suffix:px") var amplitude: float = 2.0
## Shakes per second.
@export_range(1.0, 60.0, 0.5) var frequency: float = 30.0
