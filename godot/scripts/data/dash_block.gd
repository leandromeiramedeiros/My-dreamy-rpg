@tool
class_name DashBlock
extends ActionBlock
## Dash: moves the caster fast (a dodge, a charge, a leap). Optional hit on bodies it passes.

@export_enum("aim", "move", "back", "side") var direction: String = "aim"
@export_range(0.0, 20.0, 0.05, "suffix:tiles") var distance: float = 2.4
@export_range(0.01, 3.0, 0.01, "suffix:s") var duration: float = 0.25
## Invulnerable time.
@export_range(0.0, 3.0, 0.01, "suffix:s") var iframes: float = 0.25
## On = a teleport instead of a slide.
@export var blink: bool = false
## On = the roll animation.
@export var roll: bool = false
## Hit radius on bodies passed (0 = no hit; the hit numbers are in the Hit group).
@export_range(0.0, 4.0, 0.05, "suffix:tiles") var hit_radius: float = 0.0
## On = carries the first body hit.
@export var carry: bool = false
