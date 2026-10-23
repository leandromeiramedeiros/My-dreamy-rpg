@tool
class_name HeroData
extends Resource
## The hero's base numbers and feel (Karea). Gear adds to these.

@export var display_name: String = "Karea"
@export_group("Body")
@export var hp: float = 650.0
@export var mp: float = 260.0
@export var stamina: float = 100.0
## Walk speed.
@export_range(0.1, 20.0, 0.05, "suffix:tiles/s") var speed: float = 3.7
## Screen-vertical moves go this much faster (the iso view squashes them; JS 0.3).
@export_range(0.0, 1.0, 0.01) var vertical_speed_bonus: float = 0.3
@export_range(0.05, 2.0, 0.01, "suffix:tiles") var radius: float = 0.4
@export_range(0.5, 6.0, 0.1, "suffix:tiles") var height: float = 2.0
@export_group("Dodge")
## The barefoot dodge (boots replace it with their active).
@export var dodge: SkillData
@export_group("Look")
## The body sheet sidecar (the paper doll's base layer).
@export var body_sheet: JSON
## The hair sheet sidecar (hidden by gear that hides hair).
@export var hair_sheet: JSON
## Seconds of input before the facing follows a new move direction.
@export var turn_delay: float = 0.0
@export_group("Camera")
@export var camera_zoom: float = 1.0
## 0 = locked on the hero.
@export var camera_smoothing: float = 8.0
