@tool
class_name EnemyData
extends Resource
## An enemy: stats, resists, behaviour parts, loot, look and FX. Drop res://scenes/enemies/enemy.tscn into a map and
## put one of these in its `data` slot. Behaviour = one movement part, 1 to 2 attack parts, 0 to 1 support part.

@export var id: StringName
@export var display_name: String = ""
@export_group("Stats")
## HP at level 1 (scaled by level in play).
@export var hp: float = 100.0
@export_range(0.0, 20.0, 0.05, "suffix:tiles/s") var speed: float = 2.0
## Damage of one hit at level 1.
@export var damage: float = 10.0
## Body radius.
@export_range(0.05, 4.0, 0.01, "suffix:tiles") var radius: float = 0.42
## Body height (where numbers and bars sit).
@export_range(0.1, 12.0, 0.1, "suffix:tiles") var height: float = 3.0
## Its own element (statuses, aura); none = no element.
@export_enum("none", "slash", "pierce", "fire", "frost", "nature", "lightning", "arcane", "holy", "gloom", "wind") var element: String = "none"
## Element of its hits.
@export_enum("slash", "pierce", "fire", "frost", "nature", "lightning", "arcane", "holy", "gloom", "wind") var damage_type: String = "slash"
## Stagger points it takes before a stagger.
@export var stagger: float = 0.0
## Resists per element: positive takes less, negative weak, 1 immune.
@export var resists: Dictionary[StringName, float] = {}
@export var tags: PackedStringArray = []
## XP as a fraction of its level's bar.
@export var xp: float = 0.1
## On = immortal and harmless (training dummy).
@export var dummy: bool = false
@export_group("Behaviour")
@export_enum("none", "chase", "kite", "orbit", "charge", "burrow", "teleport", "stationary", "sleep", "mimic") var movement: String = "chase"
## 1 to 2 of: brute, shoot, sniper, bomber, zone-caster, healer, summon, charge, burrow, teleport.
@export var attacks: PackedStringArray = []
## 0 to 1 of: aura-buffer, shield-front, split, zone-on-death, swarm, healer, summon.
@export var support: StringName = &""
## Numbers per part (part name -> {range, wind, cd, ...}).
@export var part_params: Dictionary = {}
@export_group("Loot")
@export var loot: LootTable
@export_group("Look")
@export var frames: SpriteFrames
## Normal sheet for lighting (optional).
@export var normal_map: Texture2D
@export_range(0.1, 4.0, 0.05) var scale: float = 1.0
## Tint over the sprite (white = none).
@export var tint: Color = Color.WHITE
## Hit particle colour.
@export var blood: Color = Color(0.78, 0.66, 1.0)
## Feet point inside a frame (from the sheet sidecar).
@export var origin: Vector2 = Vector2.ZERO
@export var fx: FxSlots
@export var sfx: SfxSlots
@export_group("Port")
@export_multiline var todo: String = ""
