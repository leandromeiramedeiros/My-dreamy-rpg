@tool
class_name FxTint
extends FxLayer
## Tint: flashes the target body a colour (the white hit flash, a status tint). `life` = how long.

@export var color: Color = Color(1, 1, 1, 1)
## 0..1: how far the body goes toward the colour.
@export_range(0.0, 1.0, 0.01) var strength: float = 0.8
## On = fades back over `life`; off = holds, then snaps back.
@export var fade: bool = true
