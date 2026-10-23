@tool
class_name BossPhase
extends Resource
## One HP bar of a boss: which moves it uses and how hard it pushes.

## The phase starts when HP falls below this fraction.
@export_range(0.0, 1.0, 0.01) var hp_below: float = 1.0
## Move id -> pick weight.
@export var moves: Dictionary[StringName, float] = {}
@export var wind_mul: float = 1.0
@export var cooldown_mul: float = 1.0
@export var speed_mul: float = 1.0
## Cunning forms per move (move id -> {feint, then, lead, open}).
@export var forms: Dictionary = {}
## Actions when the bar starts (roar, arenaShrink...).
@export var on_enter: Array[Dictionary] = []
