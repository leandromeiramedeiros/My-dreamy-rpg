@tool
class_name BossData
extends EnemyData
## A boss: an enemy with moves and phases (one HP bar per phase). Drop it into enemy.tscn like any enemy.

@export_group("Boss")
@export_enum("mini", "guardian") var kind: String = "mini"
@export var level: int = 1
## The zone it lives in (data only).
@export var zone: StringName = &""
## Target fight length, seconds (min, max); report-only.
@export var length_target: Vector2 = Vector2(60, 90)
## Stagger bar size.
@export var stagger_max: float = 4.0
## On = one HP bar per phase.
@export var bars: bool = true
## Invulnerable beat between bars.
@export var transition: float = 1.5
@export var moves: Array[BossMove] = []
@export var phases: Array[BossPhase] = []
