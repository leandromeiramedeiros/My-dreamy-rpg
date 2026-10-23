@tool
class_name ItemData
extends Resource
## An item line (a weapon variant, shield, companion, armour piece, trinket or consumable): what it grants and how it
## looks and feels. Tiers and rarity change numbers, sockets and looks; the three skills never change.

@export var id: StringName
@export var display_name: String = ""
@export_multiline var description: String = ""
@export_enum("weapon", "shield", "companion", "armour", "trinket", "consumable") var kind: String = "weapon"
## Equip slot: hand (weapons; 1H also offhand), offhand, head, chest, boots, ring, amulet, belt, pocket.
@export_enum("hand", "offhand", "head", "chest", "boots", "ring", "amulet", "belt", "pocket") var slot: String = "hand"
## Class family (blades, foci, heavy, shields...).
@export var item_class: StringName = &""
## Armour suit this piece counts toward.
@export var suit: StringName = &""
## 1 = one-handed, 2 = two-handed, 0 = worn companion.
@export_range(0, 2, 1) var hands: int = 1
@export_enum("none", "slash", "pierce", "fire", "frost", "nature", "lightning", "arcane", "holy", "gloom", "wind") var element: String = "none"
@export var tiers: Array[ItemTier] = []

@export_group("Skills")
## M1 / M2: the hand action (the combo) or the off-action.
@export var action: SkillData
## Q / E.
@export var spell: SkillData
## Shift+Q / Shift+E.
@export var ultimate: SkillData
## Armour: the piece's active (head R, chest F, boots V).
@export var active: SkillData
## MP the hand action builds per hit.
@export var mp_on_hit: float = 0.0
## Hold M1 (heavy, focus, channel); empty = none.
@export var hold: StringName = &""
## Deck kind of a companion (page, arrow, call).
@export var deck: StringName = &""

@export_group("Stats")
## Base stats (stat key -> value at tier 2).
@export var stats: Dictionary[StringName, float] = {}
## Built-in resists (element -> fraction).
@export var resists: Dictionary[StringName, float] = {}
## Passive effects (EFFECTS rows) while worn.
@export var passives: Array[Effect] = []
## Other line flags from JS (clip, reload, frenzy, riposte...).
@export var flags: Dictionary = {}

@export_group("Look")
@export var icon: Texture2D
@export var color: Color = Color.WHITE
## Shine / glint colour on the icon and the dropped item.
@export var glint: Color = Color(1, 1, 1, 0)
## The pose the hero's attack sheet uses (sword, staff, bow, none).
@export_enum("none", "sword", "staff", "bow") var attack_pose: String = "sword"

@export_subgroup("Held (Weapons Out)")
## The item as one sprite, always visible in the hand (HAND on the right-hand socket, OFFHAND on the left), drawn by
## the hero doll in front of or behind the body per frame and turned by the socket angle. Empty = the gear sheet look.
@export var held_sprite: Texture2D
## The pixel of held_sprite the hand closes on (the pivot of every swing).
@export var grip_point: Vector2 = Vector2.ZERO
## How the held sprite moves in an attack: swing (an arc), thrust (out and back), aim (points at the aim), cast (raised),
## spin, none.
@export_enum("swing", "thrust", "aim", "cast", "spin", "none") var swing_style: String = "swing"
## How it is carried out of an attack: upright (blade up), lowered (tip down), shoulder (on the shoulder), aim (pointed
## forward, bows), float (beside the hand: orbs, grimoires), braced (shield on the arm).
@export_enum("upright", "lowered", "shoulder", "aim", "float", "braced") var carry_pose: String = "upright"
## Extra turn of the carried sprite, degrees.
@export_range(-180.0, 180.0, 1.0, "suffix:deg") var carry_angle: float = 0.0
@export var fx: FxSlots
@export var sfx: SfxSlots
@export_group("Port")
@export_multiline var todo: String = ""
