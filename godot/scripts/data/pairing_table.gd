@tool
class_name PairingTable
extends Resource
## Slot matrix pairings (docs/design/loadout.md "Pairings", client ruling 2026-10-23): an OFFHAND must fit its HAND's
## fantasy. An offhand that does not pair is refused at equip. Empty offhand is always allowed.

@export var rules: Array[PairingRule] = []


## True when `offhand_id` may sit beside `hand_id` (empty offhand or hand = true).
func fits(offhand_id: StringName, hand_id: StringName) -> bool:
	if offhand_id == &"" or hand_id == &"":
		return true
	var listed := false
	for r: PairingRule in rules:
		if r.offhand.has(String(offhand_id)):
			listed = true
			if r.hand.has(String(hand_id)):
				return true
	return not listed
