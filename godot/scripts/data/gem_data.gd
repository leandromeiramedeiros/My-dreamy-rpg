@tool
class_name GemData
extends Resource
## A gem type with its three grades (Chipped, Clear, Radiant): stats in armour and in a weapon, and the skills it amps.

@export var id: StringName
@export var display_name: String = ""
@export var color: Color = Color.WHITE
@export_enum("none", "fire", "frost", "nature", "lightning", "arcane", "holy", "wind") var element: String = "none"
@export var grade_names: PackedStringArray = ["Chipped", "Clear", "Radiant"]
## Stats socketed in armour, one dictionary per grade.
@export var armour_stats: Array[Dictionary] = []
## Stats socketed in a weapon, one dictionary per grade.
@export var weapon_stats: Array[Dictionary] = []
## What it amplifies (any slot), in words.
@export var amp: String = ""
@export var icon: Texture2D
@export var fx: FxSlots
