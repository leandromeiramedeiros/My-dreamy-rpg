@tool
class_name FxDecal
extends FxLayer
## Decal: a ground mark (scorch, frost, crack) that fades over `life`.

@export var texture: Texture2D
@export var modulate: Color = Color.WHITE
@export var scale: Vector2 = Vector2.ONE
@export var random_rotation: bool = false
