@tool
class_name SfxData
extends Resource
## A sound effect: an audio stream and how it plays. The seed brings the JS synth recipe as `recipe` (reference for the
## Audio lane, which renders the OGG files into res://audio/); until then `stream` is empty and nothing plays.

@export var id: StringName
@export var stream: AudioStream
@export_range(-60.0, 12.0, 0.1, "suffix:dB") var volume_db: float = 0.0
@export_range(0.25, 4.0, 0.01) var pitch: float = 1.0
## Random pitch spread (0.08 = +-8 %).
@export_range(0.0, 1.0, 0.01) var pitch_vary: float = 0.0
@export_enum("sfx", "ui", "ambient", "music") var bus: String = "sfx"
## Voice stealing: higher wins (0..3).
@export_range(0, 3, 1) var priority: int = 1
## Caption shown when captions are on.
@export var caption: String = ""
## The JS synth recipe (oscillator layers); reference only.
@export var recipe: Dictionary = {}
