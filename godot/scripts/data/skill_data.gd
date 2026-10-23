@tool
class_name SkillData
extends Resource
## A skill: a list of action blocks with its cost, cooldown, aim and look. Items grant skills (action, spell, ultimate;
## armour pieces one active); pages, arrows and calls are skills too. Edit the blocks to change what it does.

@export var id: StringName
@export var display_name: String = ""
@export_multiline var description: String = ""
@export var icon: Texture2D
## Default element of the blocks ("inherit" = the item's).
@export_enum("inherit", "slash", "pierce", "fire", "frost", "nature", "lightning", "arcane", "holy", "gloom", "wind") var element: String = "inherit"
## What kind of skill this is (decides the key and the resource it costs).
@export_enum("action", "spell", "ultimate", "active", "page", "pocket") var kind: String = "spell"
## Seconds between uses (an action's swing rate).
@export_range(0.0, 120.0, 0.01, "suffix:s") var cooldown: float = 1.0
@export_range(0.0, 500.0, 1.0) var mp_cost: float = 0.0
@export_range(0.0, 200.0, 1.0) var stamina_cost: float = 0.0
## Tags effects and Grips match on (projectile, zone, dash, nova, cone, melee...).
@export var tags: PackedStringArray = []
## Decks a page / arrow / call fits (page = Grimoire, arrow = Quiver, call = Warhorn).
@export var decks: PackedStringArray = []

@export_group("Blocks")
## sequence = all blocks run per use (each after its delay); combo = each use runs the next block (a 3-hit combo).
@export_enum("sequence", "combo") var block_mode: String = "sequence"
## A combo resets to its first block after this pause.
@export_range(0.0, 5.0, 0.05, "suffix:s") var combo_reset: float = 1.0
@export var blocks: Array[ActionBlock] = []

@export_group("Aim")
@export_enum("self", "cone", "line", "proj", "circle", "dash") var aim_shape: String = "self"
@export_range(0.0, 30.0, 0.1, "suffix:tiles") var aim_range: float = 0.0
@export_range(0.0, 20.0, 0.05, "suffix:tiles") var aim_radius: float = 0.0
@export_range(0.0, 360.0, 1.0, "suffix:deg") var aim_arc: float = 0.0
@export_range(0.0, 10.0, 0.05, "suffix:tiles") var aim_width: float = 0.0

@export_group("Feel")
## Stagger points of the skill's heavy hit (0-3).
@export_range(0.0, 10.0, 0.5) var stagger: float = 0.0
## Hitlag weight (basic 1, heavy 1.5, ultimate 2).
@export_range(0.0, 4.0, 0.1) var hit_weight: float = 1.0
@export var color: Color = Color.WHITE
@export var fx: FxSlots
@export var sfx: SfxSlots

@export_group("Port")
## Exception slot: a script for a skill no block set can express (listed in docs/PORTING.md).
@export var script_slot: Script
## What the blocks do not cover yet: the JS cast, kept for the Combat lane.
@export_multiline var todo: String = ""
