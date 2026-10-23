@tool
class_name BossMove
extends Resource
## One boss move: a type (cone, circle, line, charge, volley, rain...) with its telegraph and numbers.

@export var id: StringName
@export_enum("cone", "circle", "line", "charge", "volley", "rain", "ring", "beam", "pull", "summon", "zone", "arenaShrink", "blink", "vanish", "roar", "shield", "gloam", "sequence", "random") var type: String = "cone"
## Telegraph time before it lands.
@export_range(0.0, 5.0, 0.01, "suffix:s") var wind: float = 0.6
## Recovery window after it lands (the punish window).
@export_range(0.0, 5.0, 0.01, "suffix:s") var open: float = 1.0
## Pause before the next move.
@export_range(0.0, 10.0, 0.05, "suffix:s") var cooldown: float = 1.0
## big = a heavy telegraphed hit, chip = a small one (damage from the reference hero's eHP).
@export_enum("big", "chip", "none") var hit: String = "chip"
## Fraction of the reference eHP (0 = the hit class default).
@export var damage_pct: float = 0.0
## Flat damage (overrides damage_pct when above 0).
@export var damage: float = 0.0
@export_enum("slash", "pierce", "fire", "frost", "nature", "lightning", "arcane", "holy", "gloom", "wind") var element: String = "slash"
@export var stagger: float = 0.0
@export_enum("near", "far", "any") var range_band: String = "any"
## Shape and other numbers (r, arc, len, w, speed, count, at...).
@export var params: Dictionary = {}
@export var fx: FxSlots
@export var sfx: SfxSlots
@export_multiline var todo: String = ""
