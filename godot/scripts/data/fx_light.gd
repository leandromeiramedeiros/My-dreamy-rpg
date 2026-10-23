@tool
class_name FxLight
extends FxLayer
## Light: a short PointLight2D flash or glow.

@export var color: Color = Color(1, 0.85, 0.6)
@export_range(0.0, 16.0, 0.05) var energy: float = 1.0
@export_range(1.0, 512.0, 1.0, "suffix:px") var radius: float = 32.0
@export_enum("steady", "flicker", "strobe", "fade") var mode: String = "fade"
## Optional light texture (empty = a soft round light).
@export var texture: Texture2D
