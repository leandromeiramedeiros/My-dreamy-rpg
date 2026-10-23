@tool
class_name LootTable
extends Resource
## A loot table: what a body, chest or boss leaves behind. A pool (e.g. common_vale) points at a class table and tweaks it.

@export var id: StringName
## The table this one extends (empty = stand-alone).
@export var base_table: LootTable
## Rarity weights: common, uncommon, rare, epic, legendary, mythic.
@export var rarity_weights: PackedFloat32Array = [62.0, 29.0, 7.5, 1.5, 0.0, 0.0]
## Per level, weight index i is multiplied by (1 + level x shift)^i.
@export var level_shift: float = 0.04
## Item rolls that always drop.
@export_range(0, 10, 1) var item_rolls: int = 0
## Chance of one more item.
@export_range(0.0, 1.0, 0.01) var item_chance: float = 0.0
## Rarity class the extra item rolls with (empty = this table's weights).
@export var extra_item_weights: PackedFloat32Array = []
@export_range(0.0, 1.0, 0.01) var gem_chance: float = 0.0
## Gems that always drop, and their level bonus.
@export_range(0, 10, 1) var gem_rolls: int = 0
@export var gem_level_bonus: PackedInt32Array = []
@export_range(0.0, 1.0, 0.01) var potion_chance: float = 0.0
@export_range(0.0, 1.0, 0.01) var page_chance: float = 0.0
## A named unique for a boss's first kill.
@export var unique: ItemData
## Base ids this pool never drops (re-rolled).
@export var exclude_bases: PackedStringArray = []
