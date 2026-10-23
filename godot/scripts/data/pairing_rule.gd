@tool
class_name PairingRule
extends Resource
## One row of the Pairings table: these OFFHAND lines fit beside these HAND lines.

@export var offhand: PackedStringArray = []
@export var hand: PackedStringArray = []
@export var note: String = ""
