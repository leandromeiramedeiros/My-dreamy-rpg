@tool
class_name ProjectileBlock
extends ActionBlock
## Projectile: fires one or more bolts toward the aim.

## Tiles per second.
@export_range(0.0, 60.0, 0.1, "suffix:tiles/s") var speed: float = 10.0
## Hit radius.
@export_range(0.05, 4.0, 0.01, "suffix:tiles") var radius: float = 0.3
## Seconds before it fades (range = speed x life).
@export_range(0.05, 10.0, 0.01, "suffix:s") var life: float = 1.0
## Bolts per cast.
@export_range(1, 32, 1) var count: int = 1
## Fan between bolts.
@export_range(0.0, 360.0, 0.5, "suffix:deg") var spread: float = 0.0
## Extra bodies it passes through (99 = all).
@export_range(0, 99, 1) var pierce: int = 0
## Homing turn rate (0 = straight).
@export_range(0.0, 30.0, 0.1) var homing: float = 0.0
## On = flies back to the caster after `return_after` seconds (Chakram).
@export var returns: bool = false
@export_range(0.0, 5.0, 0.01, "suffix:s") var return_after: float = 0.4
## Explosion on impact (0 = none).
@export_range(0.0, 8.0, 0.05, "suffix:tiles") var explode_radius: float = 0.0
@export var explode_damage: float = 0.0
## Spawn height above the ground.
@export_range(0.0, 8.0, 0.1, "suffix:tiles") var height: float = 1.5
## Look of the bolt in flight.
@export var frames: SpriteFrames
@export var color: Color = Color.WHITE
