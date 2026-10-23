# Godot handoff meeting — arenas, human-editable assets, the port plan (My-dreamy-rpg)

Date 2026-10-23. **Design only; no code.** Attending (5 + director): Godot 4 porting lead (GL), technical artist (TA),
systems designer (SD), tools programmer (TP), and the studio director (DIR) relaying the client's ruling (verbatim in
`docs/PRODUCTION.md`, "Client rulings", 2026-10-23 later). One recommendation per question; the rejected alternative in one line.

Grounding: `docs/PRODUCTION.md`, `docs/design/INDEX.md`, `pillars-and-rules.md`, `visual-bible.md`, `world-maps.md`,
`lighting-status-fx.md` (budgets), `hud-ui.md` (first 40 lines), `balance.md`, `enemies-bosses.md`, `elements-statuses.md`
(world verbs), `story.md`, `audio.md`, `RESUME.md`, `docs/GLOSSARY.md` (grep). Code headers: `tools/forge/build.js`,
`forge.js`, `js/forge-rt.js`, `js/forge-bank/` (61 files, 4.6 MB), `js/sprites.js`, `js/art.js`, `tools/freeze.js`,
`tools/maps/gen.js` + `build.js` + `recipes/`, `js/world.js`, `js/maps.js` (TILE_TYPES, ground raster), `js/render.js` (rim),
`js/data.js`, `items.js`, `enemydata.js`, `bosses.js`, `js/game.js` (triggers, inline arena), `tools/check.js`, `play.js`,
`act1-route.js`, `qa/run-big.js`, `balsim.js`, `perf.js`, `maps/engine-check.js`, `tools/raster-embed.js`, `tools/forge/out/*.json`.

## Facts that shaped the answers
F1. **There is no tileset.** `js/maps.js` paints the ground per pixel (noise fields, 47-blob priority lines, 2 px lips, strata,
    coasts) into 512 px chunks. Godot tiles cannot be "exported"; they must be rasterised fresh by pinning the noise and
    sampling canonical neighbour configurations. Trees are procedural too, frozen by `tools/freeze.js` into `js/sprites.js`
    as `[trunk | canopy]` strips; the 5 wind frames are derived at load.
F2. The forge already writes `out/<rig>.png` (rows = 8 dirs, cols = frames in `layout` order) plus `.json` with `frame`,
    `origin`, `dirs`, `layout` and per-dir/frame sockets. The shipped Forge banks are **G-buffers** (coverage, material,
    part, tone, depth), resolved per pixel at runtime (nearest layer wins, inner line on a depth jump). Stage A has
    per-pixel normals (`normalAt`) before quantisation: a normal-map export is a build flag, not a forge change.
F3. Frames: hero `chibi` 52x56 (origin 26,49); Bramble Shaman 68x72; Ogre and Mountain Troll 80x88; Shade Hound 72x60.
    Humanoid piece = 8 x 43 = 344 frames. Units ship as Core sheet + one Atk sheet per weapon class.
F4. `WORLD_DATA` (`js/world.js`, 369 KB) holds `maps` (vale 80x80, pinewood 112x112, a 22x22 `ruins` stub that is the
    Ruins bestiary lane's test arena), plus `tuning` (empty), `enemies` and `sprites` (non-map data). The engine's inline
    arena (`G.arena`: gates, pillars, never-sleep) and the trigger vocabulary (`spawn`, `dialogue`, `openGate`, `warp`,
    `quest`, `checkpoint`, `loot`, `arena`, `setState`) run on any map record.
F5. `SKILLS` rows carry `cast(p, a)` functions; `BOSS_MOVES` and parts are code. Numbers and code share one table, so a
    two-way JSON source of truth would cost a milestone. One-way JS → JSON export is cheap.
F6. `file://` taints a canvas fed by an `<img>` PNG, so every pixel-read asset ships as a data-URI inside a classic script.
    `tools/raster-embed.js` already does PNG-on-disk → generated JS; that is the pattern for every human-editable asset.
F7. Four ship-gate steps assume Act I maps: `act1-route`, `engine-check` (vale, pinewood), `run-big` (the Bot), and the
    `perf.js` scenes (`pine-fight`, `pine-forge-fight`). `play.js` uses a synthetic 112x112 zone (`tools/lib/synthmap.js`).
F8. Audio has no files: everything is synthesised at runtime (`audio.md`). Godot needs rendered OGG or a GDScript synth.
F9. Dead under the pivot: `tools/maps/*`, `editor.html` + `js/editor.js`, the pre-forge art path (`js/hero.js`,
    `parts-art.js`, `enemyart.js`), the world-art acceptance shots, and the pillars rule "world.js is editor-owned".
F10. Godot 4 TileSet terrain mode "Match Corners and Sides" is the 47-blob. `TileMapLayer` (4.3+) gives one node per
    layer and Y-sort. As of Godot 4.4, C# has no supported web export; GDScript does.
F12. `js/icons.js` derives gear icons from `js/parts-art.js`; `play.js` still runs an `?oldenemy` check against
    `enemyart.js`. Saves carry map ids, checkpoints and per-map fog for Vale and Pinewood; `smoke` runs `save-migrate`.
F11. Wave-1 lanes (suits, weapons, enemy forge, skills, Ruins bestiary, raster embed) touch no map file. They continue as briefed.

---

## 1. Scope after the pivot
**Decision.** The studio builds *the game minus the world*: every system, every content table, every sprite and sound,
tested in mockup arenas; the client builds every zone in Godot. "Finished" = the **handoff package** `handoff/` at the repo
root: `art/` (sheets + JSON sidecars + palettes), `tiles/` (terrain and cliff atlases per zone), `data/` (JSON + CSV
exports of every table), `audio/` (rendered OGG + SFX recipes), `docs/PORTING.md`, the briefs (world-brief, 7.), and the
JS build as the playable reference implementation.
Why: the client's ruling draws the line at placement; everything that is a rule, a number or a pixel is ours.
Rejected: a half-port to Godot by the studio (two engines to keep in parity doubles every lane).
* Story beats, quests, triggers, NPCs, shrines, secrets: **the data and the systems stay ours, the placement is his.**
  Dialogue lines (`dialogue.js`), quest steps, trigger action vocabulary, Pip's lines and boss scripts are tables we ship;
  where they fire in a zone is a per-zone **placement brief** (`docs/design/world-brief.md`, 7.): per zone the enemies,
  elite pockets, boss, shrine count, chest tiers, 3 verb puzzles, 5 secrets, set pieces and the signature moment, as a
  checklist with the pacing numbers from today's `world-maps.md`. No coordinates, no tiles.
* Act I maps are scrapped: Whispering Vale and Misty Pinewood leave `js/world.js` after the arena cut lands (2.).
  Tag the last commit that holds them `maps-pre-godot` so nothing is lost.
Actions: DIR rewrites PRODUCTION.md status + lanes (6.), ships the briefs lane (7.).

## 2. Mockup arenas
**Decision.** One hand-written file `js/arenas.js` (`ARENAS`, WORLD_DATA-shaped map records, each at most 32x32, ASCII
tile rows + an object and trigger list, theme per zone for palette), loaded as maps by the same engine. No generator.
Reached from a title-screen "Arena" list and `?map=<arena id>`. Owner: a Sonnet lane ("Arenas"), since the cancelled
wave-2 lanes owned `world.js` and `maps.js`.

| Arena id | Size | Tests |
|---|---|---|
| `dummies` | 24x16 | Training dummies at 2, 4, 8 tiles with resist tags per archetype; one of each weapon class on a rack (chests) |
| `pack-<zone>` (6) | 32x24 | The zone's encounter grammar: room 1 to 3 packs behind gates, the elite guarding the key |
| `elite` | 24x24 | Eight elite modifiers as an elite pocket each, one gate per pocket |
| `boss-<id>` (12) | per boss | One per boss: the arena shape it needs (pillars, void tiles, lava ring, tide), `arena` + `closeGate` triggers, shrine 20 s away |
| `verbs` | 32x32 | All 15 Receiver objects, Tile patches (ice, grass fire), Dream Oil, Opal, a dawn source shrine |
| `stress` | 32x32 | 24 awake bodies, 40 lights, 6 status bodies, burning ring: the perf gate scene |
| `touch` | 24x16 | Phone controls: wheel, aim modes, pockets, a chest, a dialogue, a shrine |
| `ruins` (existing) | 22x22 | Becomes `pack-ruins`; the id `ruins` stays as an alias until the Ruins bestiary lane merges |

Why: tiny, readable in a diff, authored by hand in minutes, and every existing trigger and the inline arena run unchanged (F4).
Rejected: keeping the generator for arenas (87 KB of code to make 24 tile rows).
* Ship gate: `act1-route.js` → `tools/arena-route.js` (enters every arena, fires every trigger card, clears every pack, kills
  every boss with the fairness asserts, screenshots `tools/shots/arenas/`). `run-big.js` → `tools/qa/run-arenas.js kbm|pad|touch`
  (the Bot fights each `pack-*` and `boss-*` with reference gear per band; `--god` stays blocker-only). `engine-check.js`
  deleted (chunk LRU and section tours are map facts). `perf.js` scenes retarget to `stress`. `play.js` keeps `synthMap`
  until the tile export (3.) has consumed `maps.js`'s ground code, then the big-map checks go. `smoke`, `validate-ids`,
  `forge-rt`, balsim unchanged.
* `tools/maps/` (gen, build, recipes, stamps, zone, art-audit, shots) deleted with the maps. `editor.html` + `js/editor.js`
  deleted. `js/maps.js` **stays** until the tile exporter is done: it is the tile source (F1), not map cruft; afterwards it
  shrinks to what arenas need (tile parse, heights, cliffs for 1 to 2 levels, water).
* Perf budgets stay (phone p95 at most 20 ms) measured on `stress`.
* Saves (F12): save v6 migration rule: an unknown map id or checkpoint → the `dummies` arena start; fog and trigger state
  of a missing map dropped; a Vale/Pinewood save fixture in `tools/save-migrate.js` proves it. The delete is not free.
Actions: Arenas lane (Sonnet) writes `js/arenas.js`, `arena-route.js`, `run-arenas.js`, the title list; Haiku deletes
(maps, editor, tests) after it lands; DIR updates `check.js` steps and `balance.md` ship gate.

## 3. Human-editable asset format
**Decision.** **PNG sheets + one JSON sidecar per sheet + `.gpl` palettes**, laid out so Aseprite, Godot and a human agree
without a tool. Flat colour is the truth; lighting data is an optional second sheet. The exporter is `tools/export/art.js`
(TP), driven by the forge and the frozen art, writing `handoff/art/`.

| Rule | Value |
|---|---|
| Grid | Fixed cell per sheet (`frame` from the model: 52x56 hero, 68x72 / 80x88 enemies, 96 or 128 bosses). Rows = 8 directions in the forge order S, SE, E, NE, N, NW, W, SW (one row for amorphous). Columns = frames, anim after anim in the fixed order idle, walk, cast, dash, hit, death, block, channel, carry. One sheet per Core and one per Atk class (`<unit>.atk.<class>.png`), as the banks split today |
| Pivot | `origin` from the model: the pixel under the feet centre, the same for every cell of a unit. Godot `offset = -origin` |
| Sidecar `<sheet>.json` | `{ cell:[w,h], origin:[x,y], dirs:[..], anims:{ name:{ from, count, ms:[..], loop } }, sockets:{ dir:{ anim:[ { name:{x,y,front} } ] } }, layer, zorder:{ dir: int }, palette }`. Sockets: handR, handL, head, chest, cast, tip, capeTop, capeHem |
| Hero paper doll | One sheet per unit (body, hair, 36 armour pieces x 6 tiers, 21 held lines x 6 tiers): `hero/body.png`, `gear/<piece>.t<N>.png`. Each gear piece exports as **two sheets, `_front` and `_back`**, split against the body's depth per pixel by the forge; inner lines and the held item's own outline are baked into the piece's pixels. The runtime depth resolve becomes: body, then every `_back` under it, every `_front` over it, ordered by `zorder[dir]` |
| Enemies, bosses | One sheet per rig (`enemies/<id>.png`, `bosses/<id>.png`), one layer, same sidecar |
| World tiles | Per zone: `tiles/<zone>/terrain_<name>.png` = the 47-blob template (standard 12x4 blob layout, documented in the sidecar as `blob47`) + 4 plain variants; `cliff_<zone>.png` = strata faces 1 to 3 levels, corners, lip, wedge shadows; `coast.png` skirt bands; `water.png` 4 frames. 16 px cells. Rasterised by pinning the noise to a fixed seed and sampling each neighbour configuration (F1) |
| Props, trees | `props/<id>.png` + sidecar `{ origin, collider r, canopy:{ box, fade } }`. Trees as two PNGs (`_trunk`, `_canopy`), one frame each; wind becomes a canopy shader in Godot (`wind.md` curve as uniforms). The 16 decal kinds per zone as one decal atlas |
| Icons, UI, raster | `ui/icons.png` 24x24 atlas + `icons.json` (id → cell); `ui/panel9.png` 16x16 9-slice; `ui/font_small.png` + `.fnt` (BMFont), `font_body` likewise; raster art at native size from `tools/out/art/` |
| VFX | `vfx/<element>_<motif>.png` grey sheets (4 levels, column = frame) + `elfx.json` (ramps, motion model, rates, light) |
| Lighting data | Optional `<sheet>_n.png` normal sheet from the forge's stage-A normals (F2), for Godot `CanvasTexture.normal_texture` + `Light2D`; the Rim mask is replaced by a 2-line rim shader on the normal. A hand-edited colour PNG with a stale normal degrades gracefully |
| Palettes | `palettes/<zone>.gpl`, `palettes/material_<name>.gpl` (metal T1 to T6, gold, leather, cloth, gems), `ui.gpl` from hud-ui.md |
| Naming, tree | snake_case ids = the game ids (`validate-ids` checks them). `handoff/art/{hero,gear,enemies,bosses,props,tiles/<zone>,ui,vfx,raster,palettes}` |

Why: a PNG grid with a JSON grid description is what Aseprite "Import Sprite Sheet", Godot's SpriteFrames and a human all
read; the forge's existing `.png/.json` is 80 % of it (F2). Rejected: exporting the G-buffers (nobody can hand-edit a depth
channel and Godot 2D has no shared depth test); `.aseprite` files as the truth (binary, needs a licence to regenerate).
* Godot mapping: `SpriteFrames` `.tres` generated by a 60-line `tools/export/godot_import.gd` from the sidecar (one
  `AnimatedSprite2D` per layer, all driven by one frame index and direction from the hero script); `TileSet` with one
  terrain set per terrain in "Match Corners and Sides" mode and the 47 peering bits filled by the importer from the blob
  layout; `TileMapLayer` per ground, cliff, decor, canopy (Y-sort on); props as `Sprite2D` scenes with `offset = -origin`.
* Fidelity loss, named: pixel interleave between two gear pieces (cape vs shield) is gone; front/back against the body stays.
* Audio (F8): `tools/export/audio.js` renders every motif, zone loop and SFX recipe through `OfflineAudioContext` to
  `handoff/audio/*.ogg` + `sfx.json` (recipe, bus, pan rule). Rejected: porting the synth to GDScript (weeks, client-side).
Actions: TP lane (Opus) `tools/export/art.js`, `audio.js`, `godot_import.gd`; Forge lane adds `--split-body` and
`--normals` flags to `build.js`; docs lane writes `docs/design/asset-pipeline.md` (7.).

## 4. The JS game during the remaining milestones
**Decision.** The JS build **is** the reference implementation and the test bed to the end: arenas only, live on Pages
(title → Arena list), no act flow. Data tables stay in JS as the source; `tools/export/data.js` emits
`handoff/data/*.json` + `.csv` one way (weapons, skills numbers, suits, items, affixes, gems, uniques, enemies, parts
params, bosses, boss moves, statuses, reactions, EFFECTS rows, dialogue, quests, tier names) and `validate-ids` checks the
export round-trips every id. Behaviour (`cast`, parts, moves) is documented per row in PORTING.md, not exported.
Why: F5. Rejected: JSON as the source now (two-way with functions in the rows costs a milestone and buys nothing before the port).
* **Forge stays the generator; `handoff/art/` is the export, never edited in place during the studio's milestones.** The
  exporter writes `handoff/art/manifest.json` (sha256 per file). On a rerun a file whose hash differs from the manifest was
  hand-edited: it is skipped and listed; `--force` overwrites. After handoff the client edits PNGs and the forge is a tool
  in the package he may rerun, piece by piece.
* The JS game keeps reading banks from generated `js/*-bank.js` (F6); `tools/raster-embed.js` grows into the embed step
  for every PNG-on-disk asset (tiles, props, UI) so the JS build and Godot read the same files.
* Determinism stays the gate for the forge (sha256 stable, 0 lone pixels); the Dressing room stays.
Actions: TP lane `tools/export/data.js`, manifest; Haiku folds `freeze.js` and `raster-embed.js` into `tools/export/embed.js`.

## 5. Godot port plan (the client's, after the handoff)
**Decision.** Godot **4.4 or later**, **GDScript** (web export, matches the JS style, the client edits as a human);
`docs/PORTING.md` is the contract. Rejected: C# (no supported web export in Godot 4, F10; a .NET toolchain for one person).
* Folder: `res://art/...` (copied from `handoff/art/`), `res://data/*.json`, `res://audio/`, `res://scenes/{hero,enemies,
  bosses,props,triggers,ui}`, `res://zones/<zone>/` (his maps), `res://scripts/{autoload,systems,ai,boss}`.
* Autoloads: `Data` (loads the JSON), `Effects` (EFFECTS engine: when/ifTags/do/icd), `Status` (ladders, reactions, world
  flags), `Loadout` (slot matrix, Grips), `Save` (slots, `version`, `migrate`), `Audio` (buses, voice pool, music director),
  `Wind` (`sample(x, y, t)`), `Game` (hero ref, time scale, arena state).
* Ports 1:1 (data in, same maths): stats and caps, items, affixes, gems, uniques, drops, XP, EFFECTS, statuses and the eight
  reactions, Loadout v3, enemy parts as a state machine (one movement, 1 to 2 attack, 0 to 1 support), elite modifiers,
  bosses (`BOSS_MOVES` as `Resource`s, phases, fairness), triggers (same action names as exported properties).
* Not 1:1: the lightmap → `CanvasModulate` + `Light2D` + normal sheets; chunk raster → `TileMapLayer`; Forge runtime →
  layered `AnimatedSprite2D` (3.); synth → OGG; the Scene 480x270 x2 → viewport stretch `canvas_items`, nearest.
* Map placement: he paints `TileMapLayer`s with the terrain sets; instances `enemy.tscn` (exported `enemy_id` from
  `enemies.json`), `trigger.tscn` (exported `when`, `actions[]` using the vocabulary), `shrine`, `chest`, `gate`, `keydoor`,
  `lever`, `receiver` (exported `object_id`), `warp` scenes; Y-sort on the entity layer; arena = `arena.tscn` with gates.
* PORTING.md contents: engine version and settings, folder tree, autoload list, the data files and their schemas, the
  layer-order rule, the depth split, the rim shader, the terrain-set import, per-system "how it works in JS, file and
  function names", every `cast` / part / move in a one-line spec table, the trigger vocabulary, save format, the placement
  briefs, known misses.
Actions: docs lane writes PORTING.md skeleton in M5, filled per milestone; TP lane ships `godot_import.gd` and a minimal
`godot-sample/` project (one layered hero, one enemy, one terrain set, one Light2D) in M5 as the import proof.

## 6. Milestone re-plan (M4b to M9; each 3 to 5 weeks, lanes in worktrees)
| Milestone | Contents | Gate |
|---|---|---|
| **M4b Arena cut** (now) | Wave 1 unchanged (F11). Wave 2 becomes: Arenas lane (`js/arenas.js`, `arena-route`, `run-arenas`, title list); Elements-in-the-world lane retargets to the `verbs` arena (receivers, states, patches: no map hooks). Wave 3: maps, editor, `tools/maps`, old art path, map tests deleted; `check.js` re-pointed; docs 7. | `check.js` green on arenas; 100 % forge sprites; phone p95 at most 20 ms on `stress`; Pages shows the Arena list |
| **M5 Systems and the import proof** | Every line's 3 skills, 12 suits' actives, 14 Grips, pages/arrows/calls, pockets, EFFECTS complete; save v6; `tools/export/data.js`; `tools/export/art.js` v1 (hero body + one suit + one line, enemies) + `godot_import.gd` + `godot-sample/` running | balsim parity ±15 % every pair; the sample project shows a layered hero walking in 8 dirs and an Ogre; PORTING.md skeleton |
| **M6 Bestiary** | 29 commons + elites for all 5 zones in the forge (8 dirs); `pack-<zone>` arenas filled; archetype resists; bestiary screen; hunt milestones | `run-arenas` clears every pack per band; TTK red flags green; every enemy adds a verb |
| **M7 Bosses** | 12 bosses with phases, cunning forms, fairness; 12 `boss-*` arenas; Morrow P1 to P3 + Dawn Burst; NG+ rules; boss loot | Bot wins 6 of 6 at reference gear, 3 to 4 of 6 one tier lower; mini 60 to 90 s, guardian 150 to 240 s |
| **M8 UI, audio, feel** | Every screen (bag, character, codex, bestiary, quests, map stub, pause), touch wheel, rebind; all zone palettes and motifs, every SFX recipe; `export/audio.js`; hit feel pass; `touch` arena | play.js UI checks; audio-check; `handoff/audio/` complete; phone p95 on `touch` |
| **M9 Export and handoff** | Tile and cliff atlases for 5 zones + underground, coasts, water, props, trees, decals, UI, VFX, fonts, palettes; manifest; data export v2; PORTING.md complete; world-brief per zone; final balance pass; Pages reference build | Every `handoff/` file opens in the sample project; `validate-ids` round-trip; docs-lint green; the client imports one zone's tiles himself |

Why: systems first (they are wave 1's natural end), the import proof early because nothing has ever been imported into
Godot, tiles last because they are new work that depends on `maps.js` surviving until then. Rejected: keeping Act-driven
M5 to M8 names (Grotto, Caldera, Spire, Isles) — they describe maps we no longer make.

## 7. Docs
**Decision.**
* `docs/design/world-maps.md` → **deleted**; replaced by `docs/design/world-brief.md` (per zone: section hooks, pacing
  numbers, encounter grammar slots, secrets, set pieces, signature moment, opening timeline from story: a brief for the
  client, at most 150 lines) and `docs/design/arenas.md` (the table in 2., authoring rules, what each arena asserts).
* New: `docs/design/asset-pipeline.md` (3.: grid, sidecar schema, naming, tree, palettes, manifest rule, embed step),
  `docs/PORTING.md` (5.; not under `design/`, so not bound to 150 lines), `handoff/README.md` (what is where).
* Rewritten: `pillars-and-rules.md` (drop "world.js is editor-owned" and the generator rule; add "assets are PNG + JSON on
  disk, embedded by `tools/export/embed.js`"; add "the handoff package is the deliverable"), `balance.md` ship gate,
  `visual-bible.md` (forge pipeline gains the export stage; tiles section moves from world-maps), `lighting-status-fx.md`
  (perf scene = `stress`), `enemies-bosses.md` (zones column stays as the client's brief; arena per boss), `story.md` (beats
  keep their zone headings; a line that placement is the client's), `INDEX.md` (lanes: Arenas, Export, Briefs replace Level,
  Elements world), `PRODUCTION.md` (6.), `RESUME.md`.
* Glossary: add **Mockup arena** (`js/arenas.js`; Not: test map, arena map), **Handoff package** (`handoff/`),
  **Sidecar** (`<sheet>.json`), **Terrain set** (Godot 47-blob import), **Blob-47 template**, **Depth split** (`_front`/`_back`),
  **Export manifest**, **Placement brief**, **Godot pivot** (ruling 2026-10-23). Retire: Big map (→ Zone, client-owned),
  Dreamy Editor, Set piece statuses `later` → `client`, Level lane, Slice (vertical). Zone and section names stay canonical
  as the client's build targets. "Dropped: Godot port-ready rules" is reversed; CLAUDE.md still lists it (director's edit).
Actions: docs lane (Sonnet) in M4b wave 3; docs-lint green; planned files are named in code spans until they exist.

---

## Director's action list
1. PRODUCTION.md: status table and lane tables per 6.; cancel wave 2 map lanes; add Arenas, Export, Docs lanes; ship gate line.
2. CLAUDE.md: remove "Godot port-ready rules" from the dropped list; ship gate names `arena-route`, `run-arenas`; drop `maps/engine-check.js`.
3. Brief the Arenas lane (Sonnet): `js/arenas.js` per the table in 2., `tools/arena-route.js`, `tools/qa/run-arenas.js`, title Arena list, `?map=<arena>`; owns `js/world.js` only to remove maps.
4. Brief the Elements lane to the `verbs` arena (no `maps.js` hooks beyond tile patches).
5. Tag `maps-pre-godot` before the delete; then brief Haiku: delete `tools/maps/`, `editor.html`, `js/editor.js`, `act1-route.js`, `maps/engine-check.js`, `run-big.js` and its JSON, world-art shots; `check.js` steps. `js/hero.js`, `parts-art.js`, `enemyart.js` go only after Gear B's forge icons and the Enemy forge lane (`enemyart.js` unused in play) have merged and `play.js`'s `?oldenemy` check is removed (F12). `tools/lib/synthmap.js` after M9.
6. Brief the Export lane (Opus, TP): `tools/export/{art,data,audio,embed}.js`, `godot_import.gd`, `godot-sample/`, manifest rule; Forge lane flags `--split-body`, `--normals`.
7. Brief the Docs lane (Sonnet): 7. in full; glossary rows; `docs/PORTING.md` skeleton; `handoff/README.md`.
8. Update `balance.md`, `lighting-status-fx.md` perf scene, `visual-bible.md` export stage after the lanes report.
9. RESUME.md: the pivot, M4b Arena cut, the next three steps.
10. Put the client's open questions below to him with the M4b report.

## Open questions for the client
1. Godot version and language: we plan 4.4+ and GDScript. Do you want a web (HTML5) build? (C# would rule that out.)
2. Will you hand-edit sprites and gear pieces, or only tiles and props? (Decides how far the per-piece `_front`/`_back` split must stay edit-friendly.)
3. Keep the JS arena build live on GitHub Pages as the reference, or take the site down at handoff?
4. Do the zone names, section hooks and pacing numbers in today's `world-maps.md` stay your build targets (kept as the world brief), or do you want a free hand?
5. Will you install Godot 4.4 now, so you can open the M5 import proof (`godot-sample/`) and give it your eye before the tile work starts?
