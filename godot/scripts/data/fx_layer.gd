@tool
class_name FxLayer
extends Resource
## One layer of an FX preset (FxData). Add a layer in the preset's list and pick its type: particles, sprite anim,
## light, trail, tint, decal, shake, hit stop or sound. Each layer can start late and has its own life.

## Seconds after the preset starts before this layer plays.
@export_range(0.0, 10.0, 0.01, "or_greater", "suffix:s") var delay: float = 0.0
## How long this layer lasts (0 = its natural length, e.g. one burst of particles).
@export_range(0.0, 30.0, 0.01, "or_greater", "suffix:s") var life: float = 0.0
## Off = kept in the preset but never played (handy while tuning).
@export var enabled: bool = true
