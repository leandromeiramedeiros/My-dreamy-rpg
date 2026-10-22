# World and maps

Terms: [../GLOSSARY.md](../GLOSSARY.md). Enemy grammar: [enemies-bosses.md](enemies-bosses.md). World verbs: [elements-statuses.md](elements-statuses.md).
Perf and light budgets: [lighting-status-fx.md](lighting-status-fx.md).

## Maps
Eight big maps joined by 3-tile void gutters and warp doors (0.4 s fade, no load, trigger state kept).
Underground is a palette and lighting look. Guardian arenas are inline walled rooms with gates.

| Map | Size | Sections |
|---|---|---|
| Whispering Vale | 80x80 | hub; Moon Pond (night fishing, pearl ritual, opens after Act IV); Pip's Lanterns islet (opened by the Spire key); Dream Arena islet |
| Misty Pinewood | 112x112 | forest; Root Hollow (underground SW: key door, lever, boars, sleeper, Mossjaw); Fox Warrens (vault, noise); Bramblehorn's Clearing (inline arena NE) |
| Gloomspire Ruins | 112x112 | plaza; Warden Crypt (darkness); Warden's Hall (arena); Oath Reliquary (vault, mimics, Oathless) |
| Sunken Grotto | 112x112 | caves (tide); Drowned Vault (airlocks, Brinemother); Mirelle's Basin (arena); Glowfin Shallows (vault); Starlit Shoals (north coast, no combat, Moonmaw) |
| Emberfall Caldera | 112x112 | rim (lava platforms); Forge Deep (wind); The Anvil (arena); Slag Chambers (vault, Slagheart) |
| The Sleepless Spire | 96x128 | ascent (5 ledges, Twin Vigils); Sleepless Court (void rhythm); Vigil Walk (optional vault) |
| Morrow's Throne | 28x28 | the finale map |
| The Drifting Isles | 96x96 | isles (rift-hop, Sorrel's Echo); The Gloaming Below (post-game underground, the Unwaking Child) |

## Section hooks
Darkness (Crypt); tide tiles on a timer (Grotto); airlock gates; lava platforms; wind vents; ledges (a fall returns you to the last ledge);
void-tile rhythm; noise and sneak (Warrens); the Dream Arena as a balance test bed (5 tiers); Pip's Lanterns (three lanterns, three
memories, powers the true ending).
Map recipes use mechanic modules: `darkness`, `tide:{period}`, `airlock:[gates]`, `wind:[zones]`, `platforms:[timed]`, `noise:{sleepers}`.

## Pacing per big map
* A point of interest every 12 to 15 tiles, a landmark about every 30. 15 to 25 s between fights; 8 to 9 fights per map.
* 3 shrines with shrine-to-shrine warp (only when no enemy is awake). 2 shortcut loops. Return rifts at shrines.
* 5 secrets per map (one per section plus one crossing). 3 verb puzzles per big map.
* Main path about 130 min, 100% about 4.5 h. A map over 24 min loses a room, not a corridor. Dungeons stay at 2 rooms.
* Boss deaths respawn at the nearest shrine.

## Encounter grammar per zone
* Outer map: room 1 teaches the zone's new enemy; room 2 mixes it with an archetype that resists the likely weapon;
  room 3 adds a caster or summoner; the elite guards the dungeon key.
* Dungeon: room 1 shows the elite modifier's element in numbers; room 2 is a lever or gate fight;
  the mini-boss is built from 3 `BOSS_MOVES` plus the zone's resist identity (60 to 90 s).

## Secrets and layout
* Secrets are signposted, environmental or logic. Rewards escalate: gem, Socket Rune, gold chest with a guaranteed Rare or better. Never a Legendary.
  Each is a trigger area plus `openGate` or `loot`.
* Layout: a winding main path with 3 to 5 height levels; landmarks visible from afar; 150 to 200 objects on a 56-tile map.
  Chests (wood, silver, gold), shrines, lore tablets, levers, gates, key doors, fake walls. Portals carry `to:{map, x, y}`.
* Generator: stamps `outer`, `dungeon`, `boss` and `zone`; auto void gutters; `warpdoor` objects; the `warp` trigger action.
  Trigger actions: `spawn`, `loot`, `openGate`, `checkpoint`, `dialogue`, `quest`, `setState`.

## Hub and Act I
* The Vale hub grows with visible rifts that open as Shards relight. The Elder Stone is the hub NPC.
* Vale (80x80): dummies and the Stone within 15 tiles of the start, the first chest at 10 tiles, 2 shrines.
* Pinewood (112x112): 3 shrines, a creek, 2 shortcut loops, an elite, a tablet.

## Opening timeline
The hero starts bare in a nightshirt. The Origin ring is found, never pre-equipped. The only new line: Pip's "Three days. You've been asleep three days."
Pip is a light parented to the hero that drifts toward each objective.
* 0:45 the sword. About 2:00 the first chest: Common Iron Mail, the Origin ring, a Chipped gem. 2:20 a fished gem into the mail's socket.
* 3:50 Iron Cap on a child's bed. 4:50 boots from the slime ambush.
* About 7:00 the first Uncommon. About 9:00 the elite's Rare weapon and key. 10:00 the Hollow door shows "Recommended ilvl".

## Tech
* Chunked ground raster: 512 px chunks rendered lazily, at most 24 resident with LRU (phone 256 px, 12 resident);
  only the start chunk is rendered behind the fade. Eight full rasters are never resident at once.
* Spatial grid of 8x8-tile buckets. Enemies sleep beyond 18 tiles (1 Hz heartbeat); at most 24 awake (16 on phone);
  off-screen projectiles and zones beyond 20 tiles are culled. Visible lights at most 40; phone p95 at most 20 ms.
* Minimap: a local 24-tile window on the HUD plus a full-map screen (M, D-pad down) with fog of war saved per map.

## World art acceptance (6 fixed camera shots per PR)
Silhouette test at 120x68; at least 5 value bands; under 50 specks per frame; at least 10 trees and 20 clutter items per frame;
no edge without thickness and at least 3 strata per cliff; at least 3 height levels in 4 of 6 shots; trees show three leaf masses and a rim light;
phone p95 at most 20 ms.
* Ground without speckle: 4 variants per tile, 47-blob transitions, lip highlights.
* Cliffs: 3-band strata, base occlusion, overhang lip, baked wedge shadows.
* Coasts: raised north and west band, 3-band skirt (lobes, roots, alpha fade), island shadow on a 2-layer cloud sea.
* Hue-shifted 7-step ramps. Trees: a canopy layer over the hero with fade, density x2.5, 16 ground-decal kinds per zone.
* Each section names one signature moment. Landmark briefs and anti-samey rules are audited by `build.js`.
* Art is procedural in code, frozen to sprite sheets (`tools/freeze*.js`); props of 24 px or less are hand-written ASCII.
  Renders live in `docs/meetings/world-art/*.png`.

## Tall set pieces
Generator pieces: `stack`, `switchback`, root ladder, drop-down ledge.
* Vale Dreamer's Cairn (h14), Pinewood Hawk's Rest (h16), Ruins Broken Stair (h20), Grotto inverted Tide Well,
  Caldera Rim Walk (h24), Spire 6 ledges to h30.
* A vantage reveal cinematic (fog fill plus full-map blit). Occlusion fixes ship with them.
