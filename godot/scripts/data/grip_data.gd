@tool
class_name GripData
extends Resource
## A Grip: a named pairing of two item lines (matched by tags, never by slot). A Codex discovery with a glint and aura.

@export var id: StringName
@export var display_name: String = ""
## The two item line ids that make it (order free).
@export var tags: PackedStringArray = []
@export_multiline var hint: String = ""
## What it does while worn.
@export var effect: Effect
@export var fx: FxSlots
@export var sfx: SfxSlots
