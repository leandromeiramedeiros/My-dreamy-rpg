@tool
class_name FxHitstop
extends FxLayer
## Hit stop: freezes time for a moment on impact. `life` = the freeze (off when hitlag is off in the settings).

## Time scale during the freeze (0 = full stop).
@export_range(0.0, 1.0, 0.01) var time_scale: float = 0.0
