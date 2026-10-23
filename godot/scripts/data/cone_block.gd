@tool
class_name ConeBlock
extends ActionBlock
## Cone: a melee arc in front of the caster (a sword swing). With a width above 0 it is a line instead (a thrust).

## Reach from the caster.
@export_range(0.1, 20.0, 0.05, "suffix:tiles") var reach: float = 1.5
## Opening of the arc.
@export_range(1.0, 360.0, 1.0, "suffix:deg") var arc: float = 103.0
## Above 0 = a straight line of this half-width instead of an arc.
@export_range(0.0, 4.0, 0.01, "suffix:tiles") var width: float = 0.0
## Swing direction for the slash look (1 or -1).
@export var swing_dir: int = 1
