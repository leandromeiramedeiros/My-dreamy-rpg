@tool
class_name FxSpriteAnim
extends FxLayer
## Sprite animation: plays one animation of a SpriteFrames where the effect happens.

@export var frames: SpriteFrames
@export var animation: StringName = &"default"
@export_range(0.05, 10.0, 0.05) var speed_scale: float = 1.0
@export var offset: Vector2 = Vector2.ZERO
@export var modulate: Color = Color.WHITE
## On = rotate to the hit or cast direction.
@export var face_direction: bool = false
@export var additive: bool = false
