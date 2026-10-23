@tool
class_name StatusRules
extends Resource
## The ladder rules shared by every element (docs/design/elements-statuses.md "Status ladders" and "Reactions").

@export_group("Build")
## Build per hit = base x w x proc x (1 + status chance + element amp).
@export var build_base: float = 25.0
@export var tier_thresholds: PackedFloat32Array = [50.0, 100.0]
@export var weak_mult: float = 1.5
@export var resist_mult: float = 0.5
@export var boss_mult: float = 0.25
@export var elite_mult: float = 0.5
@export_group("Decay")
## Ladder points lost per second ...
@export var decay_per_second: float = 20.0
## ... after this long without a build.
@export var decay_delay: float = 1.5
@export var ladders_per_body: int = 2
@export var poison_max_stacks: int = 3
@export var mark_max_stacks: int = 5
@export_group("Reactions")
@export var reaction_cooldown: float = 4.0
@export var boss_reaction_cooldown: float = 8.0
@export var via_reaction_lockout: float = 1.0
@export var via_reaction_build_mult: float = 0.5
@export var chain_depth: int = 2
## Reaction damage cap per second, as a multiple of weapon damage.
@export var reaction_damage_cap: float = 3.0
@export_group("Hero")
## Hero DoT: this fraction of max HP per tick.
@export var hero_dot_fraction: float = 0.02
@export var hero_dot_tick: float = 0.5
@export var hero_resist_min: float = -0.5
@export var hero_resist_max: float = 0.6
