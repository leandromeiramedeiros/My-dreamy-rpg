@tool
class_name FxData
extends Resource
## FX preset: a reusable effect built from layers (particles, sprite anim, light, trail, tint, decal, shake, hit stop,
## sound). Keep presets in res://data/fx/ and drop them into any FX slot, or build one in place.

@export var id: StringName
@export var display_name: String = ""
## Played together; each layer has its own delay. "+ Add Element", then pick the layer type.
@export var layers: Array[FxLayer] = []
## Multiplies every layer's delay and life (a quick global retime).
@export_range(0.1, 10.0, 0.05) var time_scale: float = 1.0
