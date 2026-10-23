@tool
class_name StatusData
extends Resource
## A status: a rung of an element's ladder (tier 1 at 50, tier 2 at 100) and how it looks on a body.

@export var id: StringName
@export var display_name: String = ""
@export_enum("slash", "pierce", "fire", "frost", "nature", "lightning", "arcane", "holy", "gloom", "wind", "water") var element: String = "fire"
## 1 = first rung, 2 = second rung (wins the tint over tier 1).
@export_range(1, 2, 1) var tier: int = 1
## Seconds it lasts (0 = while the ladder holds it).
@export_range(0.0, 60.0, 0.05, "suffix:s") var duration: float = 0.0
## Duration on a boss (-1 = same as above; 0 = never).
@export var boss_duration: float = -1.0
@export_range(1, 10, 1) var max_stacks: int = 1
## What the hero gets instead (tier 2 is never hard CC on the hero; e.g. Frozen -> Numb).
@export var hero_variant: StatusData
## Elements that react with this status.
@export var reacts_with: PackedStringArray = []
## Rule text (until the Status lane runs it).
@export_multiline var rule: String = ""

@export_group("Look")
@export var tint: Color = Color.WHITE
@export_range(0.0, 1.0, 0.01) var tint_alpha: float = 0.2
## Overlay sheet name (char, ice, vine, rent, wet; empty = none).
@export var overlay: StringName = &""
@export_range(0.0, 1.0, 0.01) var overlay_alpha: float = 0.0
## Motif particles per second.
@export_range(0.0, 30.0, 0.5) var motif_rate: float = 1.0
@export_enum("chest", "head") var socket: String = "chest"
@export_enum("none", "still", "shove", "hop") var pose: String = "none"
@export var light_color: Color = Color(0, 0, 0, 0)
@export_range(0.0, 128.0, 1.0, "suffix:px") var light_radius: float = 0.0
@export_range(0.0, 1.0, 0.01) var light_alpha: float = 0.0
@export_enum("none", "flicker", "strobe", "cool") var light_mode: String = "none"
@export var icon: Texture2D
@export var fx: FxSlots
@export var sfx: SfxSlots
