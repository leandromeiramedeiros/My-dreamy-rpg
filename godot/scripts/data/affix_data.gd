@tool
class_name AffixData
extends Resource
## An affix: a stat a rolled item can carry, in three named tiers.

## The stat key (power, crit, hp...).
@export var id: StringName
@export_enum("prefix", "suffix") var kind: String = "prefix"
@export var tiers: Array[AffixTier] = []
## Lowest rarity that rolls it (empty = any).
@export var min_rarity: StringName = &""
