# Mockup arenas

Terms: [../GLOSSARY.md](../GLOSSARY.md). The studio makes no zones; every system, enemy and boss is tested in a **mockup arena**.
The client's zones: [world-brief.md](world-brief.md). Ship gate: [balance.md](balance.md). Budgets: [lighting-status-fx.md](lighting-status-fx.md).

## What an arena is
* One hand-written file `js/arenas.js` (`ARENAS`): map records of the same shape the engine always loaded, each at most 32x32:
  ASCII tile rows, an object list, a trigger list, and a `theme` (a zone id, for palette and lighting). No generator.
* Reached from the title screen "Arena" list and by `?map=<arena id>`. The same engine runs it: every trigger action and the inline
  arena (`G.arena`: gates, pillars, never-sleep) work unchanged.
* The arena build is the playable reference; GitHub Pages shows the Arena list until handoff and comes down then. The JS build stays in the repo.
* The Arenas lane owns `js/arenas.js`, `tools/arena-route.js` and `tools/qa/run-arenas.js`.

## The arenas
| Arena id | Size | Tests |
|---|---|---|
| `dummies` | 24x16 | Training dummies at 2, 4, 8 tiles with resist tags per archetype; one of each weapon class on a rack (chests) |
| `pack-<zone>` (6) | 32x24 | The zone's encounter grammar: room 1 to 3 packs behind gates, the elite guarding the key |
| `elite` | 24x24 | Eight elite modifiers as an elite pocket each, one gate per pocket |
| `boss-<id>` (12) | per boss | One per boss: the arena shape it needs (pillars, void tiles, lava ring, tide), `arena` + `closeGate` triggers, shrine 20 s away |
| `verbs` | 32x32 | All 15 Receiver objects, Tile patches (ice, grass fire), Dream Oil, Opal, a dawn source shrine |
| `stress` | 32x32 | 24 awake bodies, 40 lights, 6 status bodies, burning ring: the perf gate scene |
| `touch` | 24x16 | Phone controls: wheel, aim modes, pockets, a chest, a dialogue, a shrine |
| `ruins` | 22x22 | The Ruins bestiary test arena; it becomes `pack-ruins` and the id `ruins` stays an alias until that lane merges |

* `<zone>` is one of `vale`, `pinewood`, `ruins`, `grotto`, `caldera`, `spire`.
* `<id>` is the boss's code id (see [../GLOSSARY.md](../GLOSSARY.md) section 14): `mossjaw`, `oathless`, `brinemother`, `slagheart`, `vigils`,
  `bramblehorn`, `boss` (The Gloam Warden), `mirelle`, `kharzul`, `morrow`, `sorrel_echo`, `unwaking_child`.

## Authoring rules
* Tiles are a short ASCII legend (floor, wall, void, water, lava, ice, cliff level 1 to 2). Heights stay at 1 to 2 levels.
* Gates are objects with ids; a `pack` arena closes its gate behind the hero (`closeGate`) and opens it when the pack is dead (`openGate`).
* A boss arena has exactly one entry trigger (`arena`), one shrine 20 s of walking from the door, and the shape the fight needs.
  Death respawns at that shrine and the arena resets.
* Enemy rows come from `ENEMIES`; the arena only places them. No arena defines stats, a move or a drop.
* Every arena has a `theme` so palette and lighting are tested in the look the client will see.
* Keep a record readable in a diff: no row wider than 32 characters, no more than about 40 objects (`stress` excepted).

## What each arena asserts (`tools/arena-route.js`)
The route enters every arena, fires every trigger card, clears every pack, kills every boss with the fairness asserts, and saves
screenshots to `tools/shots/arenas/`.
* `dummies`: damage numbers show WEAK, RESIST and IMMUNE per archetype; every weapon class hits a dummy at 2, 4 and 8 tiles.
* `pack-<zone>`: every pack clears with reference gear for the zone's band; gates open only on the last kill; the elite drops a Rare and the key.
* `elite`: each of the eight modifiers shows its element in numbers and its first telegraph; Twin links at 50%.
* `boss-<id>`: wind-ups of at least 0.55 to 0.6 s (`bossFairness`), no unwarned lethal hit, phases fire at their HP bars, the loot drops,
  the arena resets on death, a screenshot per telegraph.
* `verbs`: each Receiver reacts to its element once and only once; Tile patches expire; a source exists within 20 tiles of every puzzle.
* `stress`: phone p95 at most 20.0 ms, desktop at most 16.7 ms (`tools/perf.js`).
* `touch`: the wheel, aim modes and pockets work; the chest, dialogue and shrine are reachable by thumb.

## The Bot in arenas
`tools/qa/run-arenas.js kbm|pad|touch` fights each `pack-*` and `boss-*` with reference gear per band. `--god` stays blocker-only.
Targets: Bot wins 6 of 6 at reference gear and 3 to 4 of 6 one tier lower ([balance.md](balance.md)).

## Saves
An unknown map id or checkpoint in a save goes to the `dummies` arena start. Fog and trigger state of a missing map are dropped.
`tools/save-migrate.js` carries a Vale and Pinewood save fixture that proves it.
