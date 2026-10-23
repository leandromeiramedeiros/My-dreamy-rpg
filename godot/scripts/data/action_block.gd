@tool
class_name ActionBlock
extends Resource
## One step of a skill (a SkillData is a list of these). Pick a block type: Projectile, Cone, Zone or Dash (more types
## come with the Combat lane). Every block carries its hit numbers, element, status build, FX and audio slots and the
## animation the caster plays.

## Optional label shown in the skill's block list.
@export var label: String = ""
## Seconds after the skill starts (or after the previous block in a sequence) before this block runs.
@export_range(0.0, 10.0, 0.01, "or_greater", "suffix:s") var delay: float = 0.0
## Animation the caster plays ("attack", "cast", "dash"; empty = none).
@export var anim: StringName = &"attack"

@export_group("Hit")
## Damage per hit before stats and tier (the JS raw number).
@export var damage: float = 0.0
## Element of the hit; "inherit" = the skill's, then the item's element.
@export_enum("inherit", "slash", "pierce", "fire", "frost", "nature", "lightning", "arcane", "holy", "gloom", "wind", "shatter") var element: String = "inherit"
## Status build weight w of the hit (ladder build = base x w x proc; 0 = no build).
@export_range(0.0, 5.0, 0.05) var status_build: float = 1.0
## Proc coefficient for item effects (basic 1.0, projectile 0.6, zone tick 0.3).
@export_range(0.0, 2.0, 0.05) var proc: float = 1.0
## Stagger points the hit adds.
@export_range(0.0, 10.0, 0.5) var stagger: float = 0.0
## Knockback in tiles.
@export_range(0.0, 10.0, 0.05, "suffix:tiles") var knockback: float = 0.0
## Stun in seconds.
@export_range(0.0, 10.0, 0.05, "suffix:s") var stun: float = 0.0
## Hitlag weight (basic 1, heavy 1.5, ultimate 2).
@export_range(0.0, 4.0, 0.1) var hit_weight: float = 1.0
## Other JS hit options carried over as data (burn, slow, root, jolt...); the Combat lane turns them into blocks.
@export var hit_params: Dictionary = {}

@export_group("Feel")
@export var fx: FxSlots
@export var sfx: SfxSlots
