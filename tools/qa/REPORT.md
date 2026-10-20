# QA play-test report - Act I (vale + pinewood), DRAFT (written incrementally)

Status log (newest last):
- [recovered] Run 1 (kbm, cut off by container restart at ~920 s): data preserved in old/run-kbm-run1.json, shots in old/shots-run1/.
- [running] Run 2 (kbm) started via `node tools/qa/run-big.js kbm`; outputs run-kbm.json + shots/ (run-1 copies kept in old/).

## Findings so far (from run 1; run 2 will confirm/refine)

### MAJOR-1 (needs confirmation) Bramblehorn / Mossjaw spike for a bot-level player
- Run 1: Mossjaw killed on 3rd attempt (2 deaths, lvl 8 -> 9, 3 potions per attempt all burned). Bramblehorn: 2 deaths at lvl 11 in 109 s and 100 s, boss at ~33-36 % HP both times, all 3 potions spent each time.
- Deaths at Mossjaw: adds (3 shadehounds + 3 ogres from "howl" summon) plus lunge 364 dmg on a 1127 max-HP hero (one lunge = 32 % HP).
- Repro: New Dream -> follow route in tools/act1-route.js without teleport -> Hollow den -> fight Mossjaw at lvl 8.
- Shots: old/shots-run1/kbm-046-death.png, kbm-049-death.png, kbm-053-death.png, kbm-056-death.png

### MINOR-1 Loot labels overlap into unreadable text
- After Mossjaw: "Knight Greaves / Charred Sapphire / Clear Sapphire / Knight Helm / Starfall Staff" labels drawn over each other. Repro: kill Mossjaw with 5+ drops on the same tile cluster.
- Shot: old/shots-run1/kbm-048-enemy-stuck.png (see also kbm-020-loot-overlap.png: Linen Robe + Rusty Blade stacked, <0.3 tiles apart).

### POLISH-1 Objective tracker text is clipped / overlaps
- kbm-020: "The Gnarlroot Ogre (south-east, by the loop road) holds the Hollow key. The road north ..." runs off the right edge of the screen at 960x540.
- kbm-026: tracker lines "Enter the Warden's Grove (east). The root door waits north of the road" overlap the "Foes left 1" counter and the zone line (faded/garbled).
- Shots: old/shots-run1/kbm-020-loot-overlap.png, kbm-026-old-drop.png
