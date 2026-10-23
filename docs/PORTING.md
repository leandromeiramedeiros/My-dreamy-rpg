# PORTING: the contract for the Godot port

Terms: [GLOSSARY.md](GLOSSARY.md). Status: skeleton (M4b). Sections marked **filled in M5/M9** get their content in those milestones.
Ruling and reasons: [meetings/2026-10-23-godot-handoff.md](meetings/2026-10-23-godot-handoff.md). Package layout: [../handoff/README.md](../handoff/README.md).

The studio ships the game minus the world (systems, tables, sprites, audio) tested in mockup arenas ([design/arenas.md](design/arenas.md)).
The studio ports the game code to GDScript in **M10** ([PRODUCTION.md](PRODUCTION.md)) into a playable project in `godot/`; this file is that port's contract.
The client builds every zone in Godot ([design/world-brief.md](design/world-brief.md)) in `godot/zones/`. The JS build is the reference implementation until M10 ships.

## Engine and settings
* Godot **4.7.2**, **GDScript**. The client wants **web (HTML5) builds**, which rules out C# (no supported web export in Godot 4). Renderer: Compatibility (web and phone).
* **Every tuning number is data, not code**: stats, damage, timings, drop rates, pacing, zone content. Port the maths; the numbers live in
  Godot `Resource`s (`res://data/**/*.tres`) seeded once from the JSON export and then edited in the Inspector and the Data table dock
  (editor-first authoring, [PRODUCTION.md](PRODUCTION.md) M10).
  Zone content lives in `res://data/zones.json` ([design/world-brief.md](design/world-brief.md)).
* The GitHub Pages build comes down at handoff. The JS build stays in the repo as the reference implementation only.
* Viewport 480x270, window stretch mode `canvas_items`, aspect `keep`, nearest-neighbour filtering, integer scale. The HUD is 960x540.
* 60 fps. Particle hard cap about 600. Phone p95 at most 20.0 ms, desktop 16.7 ms ([design/lighting-status-fx.md](design/lighting-status-fx.md)).

## Folder tree
```
res://art/        copied from handoff/art/
res://data/       *.json from handoff/data/
res://audio/      OGG + sfx.json
res://scenes/{hero,enemies,bosses,props,triggers,ui}
res://zones/<zone>/   the client's maps (no studio lane touches them)
res://arenas/     the studio's mockup arenas (same ids as js/arenas.js)
res://scripts/{autoload,systems,ai,boss}
```

## Autoloads
| Name | Job |
|---|---|
| `Data` | Loads the JSON tables |
| `Effects` | The EFFECTS engine: `when`, `ifTags`, `do`, `icd` ([design/loadout.md](design/loadout.md)) |
| `Status` | Ladders, the eight reactions, world flags ([design/elements-statuses.md](design/elements-statuses.md)) |
| `Loadout` | Slot matrix, Grips, pockets |
| `Save` | Slots, `version`, `migrate` |
| `Audio` | Buses, voice pool, music director ([design/audio.md](design/audio.md)) |
| `Wind` | `sample(x, y, t)` returning `{vx, vy, s}` ([design/wind.md](design/wind.md)) |
| `Game` | Hero ref, time scale, arena state |

## Data files and schemas (filled in M5/M9)
`handoff/data/*.json` plus `.csv`, including `zones.json` (hand-edited, see [design/world-brief.md](design/world-brief.md)), exported one way from the JS tables by `tools/export/data.js`: weapons, skill numbers, suits, items,
affixes, gems, uniques, enemies, parts params, bosses, boss moves, statuses, reactions, EFFECTS rows, dialogue, quests, tier names.
Behaviour (`cast`, parts, moves) is not exported; it is documented per row below. One schema block per file lands in M5 and is complete in M9.

## What ports 1:1 (data in, same maths)
Stats and caps, items, affixes, gems, uniques, drops, XP, EFFECTS, statuses and the eight reactions, Loadout v3,
enemy parts as a state machine (one movement, 1 to 2 attack, 0 to 1 support), elite modifiers,
bosses (`BOSS_MOVES` as `Resource`s, phases, fairness), triggers (the same action names as exported properties).

## What does not port 1:1
| JS | Godot |
|---|---|
| Lightmap | `CanvasModulate` + `Light2D` + normal sheets |
| Chunk ground raster | `TileMapLayer` |
| Forge runtime (compositor) | Layered `AnimatedSprite2D` |
| Runtime synth | Rendered OGG |
| Scene 480x270 scaled x2 | Viewport stretch `canvas_items`, nearest |

## Per-system specs (filled in M5/M9)
For each system: how it works in JS, with file and function names; every `cast`, part and boss move as a one-line spec table
(row id, trigger, numbers' source, effect). The first rows land with the M5 import proof; the table is complete in M9.

## Placement via exported scenes
The client paints `TileMapLayer`s with the terrain sets and instances these scenes. Exported properties carry the data:
| Scene | Exported properties |
|---|---|
| `enemy.tscn` | `enemy_id` (from `enemies.json`) |
| `trigger.tscn` | `when`, `actions[]` using the vocabulary below |
| `shrine`, `chest`, `gate`, `keydoor`, `lever`, `warp` | `id`, kind or tier, target |
| `receiver` | `object_id` ([design/elements-statuses.md](design/elements-statuses.md)) |
| `arena.tscn` | The gates and entry trigger of an inline arena |
Y-sort is on for the entity layer.

## Trigger vocabulary
Actions fire from a trigger area or an object. Names are the JS action names.
| Action | Effect |
|---|---|
| `spawn` | Place enemies (id, count, pattern) |
| `dialogue` | Play a line or sequence from the dialogue table; once-keys avoid repeats |
| `openGate` / `closeGate` | Open or close a gate by id; `openGate` on an arena gate ends the fight |
| `warp` | Fade 0.4 s and move to `{map, x, y}` or `{x, y}`; trigger state is kept |
| `quest` | Advance a quest step |
| `checkpoint` | Set the respawn point |
| `loot` | Grant a drop or a table roll |
| `arena` | Start an inline arena (gates, pillars, enemies never sleep) |
| `setState` | Set an object's state (world verbs) |

## Layer order
Ground, cliff, decor, then the entity layer (Y-sorted: hero, enemies, props, NPCs), then canopy above the entity layer with a fade
near the hero. Within the hero, draw the body, then every `_back` sheet, then every `_front` sheet, ordered by the sidecar `zorder[dir]`
([design/asset-pipeline.md](design/asset-pipeline.md)). All layers share one frame index and one direction from the hero script.

## Rim shader
The Rim mask of the JS build is replaced by a canvas-item shader on the normal sheet: sample the `_n` normal, take the part facing away from
the dominant light, and add the light colour at low alpha along that edge. No normal sheet means no rim; colour edits never break it.

## Terrain import
`tools/export/godot_import.gd` (a 60-line editor script, planned for M5, written for Godot 4.7.2) reads each sidecar. Sprites become a `SpriteFrames` `.tres`; a
`blob47` sidecar becomes a TileSet terrain set in "Match Corners and Sides" mode with the 47 peering bits filled from the template layout.
`TileMapLayer` nodes: ground, cliff, decor, canopy.

## Save format
Key `dreamy.save.v1` for slot 1 (slots 2 and 3 use `.s2` and `.s3`), always in try/catch, with an internal `version` and `migrate(save)`
([design/progression-economy-saves.md](design/progression-economy-saves.md)). The JSON fields are listed in M9. A save holds the map id,
checkpoint and per-map fog; an unknown map id or checkpoint resolves to a safe start.

## Known misses (filled in M9)
Pixel interleave between two gear pieces; hand-edited normals (a hand-edited colour PNG keeps its old normal sheet until re-exported); anything the client's maps need that the arenas never exercised.

## Placement briefs
One brief per zone: [design/world-brief.md](design/world-brief.md). Complete in M9.
