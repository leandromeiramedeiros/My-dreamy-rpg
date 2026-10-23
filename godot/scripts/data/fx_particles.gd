@tool
class_name FxParticles
extends FxLayer
## Particles: a burst of pixels. Use the simple numbers, or drop a full ParticleProcessMaterial.

## Optional full Godot particle material; when set, the simple numbers below are ignored.
@export var material: ParticleProcessMaterial
## Optional texture per particle (empty = one pixel).
@export var texture: Texture2D
## Particles per burst.
@export_range(0, 600, 1) var amount: int = 12
## Speed range, pixels per second (min, max).
@export var speed: Vector2 = Vector2(20, 60)
## Spread in degrees (360 = every direction).
@export_range(0.0, 360.0, 1.0, "suffix:deg") var spread: float = 360.0
## Gravity, pixels per second squared (positive falls).
@export var gravity: float = 40.0
## Colour over life (left = birth).
@export var colors: Gradient
## Life of one particle.
@export_range(0.05, 10.0, 0.01, "suffix:s") var particle_life: float = 0.4
## On = additive blend (glow).
@export var additive: bool = false
