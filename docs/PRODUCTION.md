# Production (director)

Live: https://leandromeiramedeiros.github.io/My-dreamy-rpg/ — deploys from `claude/dreamy-rpg-concept` (default branch).
A milestone ships when its PR merges there.

Design source: `docs/design/INDEX.md` (one lean file per system). M4 vision: `docs/meetings/2026-10-22-studio-experts.md`.
**Godot pivot (2026-10-23):** the studio builds the game minus the world (systems, tables, sprites, audio), tested in
mockup arenas; the client builds every zone in Godot. Deliverable: the `handoff/` package + the JS reference build,
then (M10) the studio ports the game code to GDScript: a playable Godot project in `godot/`, where the client builds his zones.
Plan: `docs/meetings/2026-10-23-godot-handoff.md`. Act I maps tagged `maps-pre-godot`, then removed.

## Ship gate
`node tools/check.js` (`--fast` skips perf + bot): smoke (balsim + save-migrate) · play · validate-ids · forge-rt · perf · the bot.
Until the M4b Arena cut lands: act1-route, maps/engine-check, qa/run-big. After it: `tools/arena-route.js`,
`tools/qa/run-arenas.js kbm|pad|touch`, perf on the `stress` arena. Director reviews shots, merges.
Local box: Windows 11, Node 24, Python 3.13 + PIL, Playwright with its own Chromium (`npm i`). Godot 4.7.2 + export templates (web): `%LOCALAPPDATA%/Programs/Godot/Godot_v4.7.2-stable_win64_console.exe` (headless: `--headless --path godot-sample`). Aseprite 1.3.18 (Steam): `C:/Program Files (x86)/Steam/steamapps/common/Aseprite/Aseprite.exe` (`--batch`, `--script`).
Known flakes: play.js warp-fade, perf under load.

## Status
| Milestone | State |
|---|---|
| M1 foundation, inventory, loot · M2a HUD/input/feel · M2b Act I slice · M3 items v2, hit feel, boss phases, Echo, opening, world art G1–G3, phone perf | **LIVE** |
| M3 hot-fix · M4a foundations on a vertical slice (Vale + Pinewood) | **LIVE** |
| **M4b Arena cut** — wave 1 content (gear, enemy forge, skills, Ruins bestiary), mockup arenas, tile/prop export start, map deletes, docs | **in progress** (branch `claude/m4b`) |
| M5 Systems + Godot import proof + port spike · M6 Bestiary · M7 Bosses · M8 UI, audio, feel · M9 Export and handoff | planned (minutes §6) |
| **M10 Godot port** — the studio rewrites the game code in GDScript; a playable Godot 4.7.2 project (`godot/`), web build | planned (see below) |

## M4a — prove the vision on Vale + Pinewood (~5 weeks, 5 lanes in parallel)
| Lane | Model | Owns | Acceptance |
|---|---|---|---|
| Forge | Opus (rig, pixel pass, runtime) + Sonnet (gear lines) | tools/forge/* (from `origin/claude/sprite-forge`, tools only), js/forge-rt.js, js/forge-bank/*; no render.js | `chibi` rig (fully deterministic, ~31 px in a 48 px frame) approved by the client's eye; Sword, Buckler, Staff, Grimoire × 6 tiers × 8 dirs; Warden suit × 6 tiers; 3 humanoid enemies + 1 beast at 8 dirs; sha256 stable; 0 lone pixels; ≤ 30 KB per piece; composite ≤ 120 ms phone |
| Loadout v3 | Opus (engine) + Sonnet (UI) | js/data.js, items.js, itemdata.js, input.js, hud.js, menus.js, touch.js, game.js cast routing | hand/offhand slot matrix enforced; 12 actives + Shift+Q / Shift+E on kbm, pad, touch (play.js routes); keys **R head · F chest · V boots**; Shift no longer dodges; 12 pages live; save v5 round-trip; The Stopped Hour + Hush with `worldScale` (tests per `docs/design/combat-feel.md`); balsim parity ±15 % (Sword+Buckler, Staff+Grimoire, Sword+Daggers, Bow+Quiver, T1–T3) |
| Lighting + status | Opus | js/render.js (incl. the drawPlayer/drawEnemy swap to forge-rt), js/elfx.js, js/status.js | rim ≤ 0.4 ms, lights ≤ 2.5 ms, status ≤ 0.5 ms phone; p95 ≤ 20.0 ms pine-fight (6 status bodies, 4 spell lights, grass ring); white-out ≤ 3 %; statuses shown on entities, world tiles and HUD |
| Wind | Sonnet | js/wind.js, art.js canopy sheets (5 frames), tools/freeze.js; render.js only via `WIND.sample` | ≤ 0.2 ms; Gale, Tumble, Gravity Well emitters; enemy push per resistance table (elite ×0.5, boss never Lifted) |
| Cleanup + docs + tools | Haiku (deletes, check.js, docs-lint, palette-lint) + Sonnet (design docs) | tools/check.js, docs-lint.js, palette-lint.js, docs/*, the delete list (minutes 5.2) | Design docs are `docs/design/<system>.md` (≤ 150 lines each, current truth only, no "supersedes") + `docs/design/INDEX.md` (≤ 40 lines: file → what it covers); old monolith removed; docs-lint green; `check.js` green; history purge of tools/qa/old (director, after all branches merge); clone ≤ 40 MB |

Order: Cleanup and Forge start first; Loadout starts when the hot-fix frees game.js; Lighting takes render.js after
Forge exports rim masks. Gate: the client approves the forge-vs-reference board and plays the slice on desktop and phone.

## M4b — Arena cut (lanes run in their own git worktrees; the director merges)
| Wave | Lane | Model | Owns | Acceptance |
|---|---|---|---|---|
| 1 ✓ | Raster art embed | Sonnet | js/art-raster.js, tools/raster-embed.js, title + dialogue panel | merged |
| 1 | Gear art A: suits | Sonnet | tools/forge/models/chibi-suit-*.js, suit loadouts in chibi-gear.js, generated suit banks | 12 suits × 3 pieces × 6 tiers; tier strips; lint + sha256 stable |
| 1 | Gear art B: weapons, shields, companions | Sonnet | tools/forge/models/chibi-<line>.js, line list in chibi-gear.js, js/icons.js forge icons | 21 lines × 6 tiers; icons from the forge |
| 1 | Enemy forge | Opus | tools/forge/models/<enemy>.js, ENEMY_RIGS, render.js forge-enemy block | every Act I + Ruins enemy and boss at 8 dirs; enemyart.js unused in play |
| 1 | Skills + data | Opus | js/data.js, items.js, itemdata.js, game.js (casts), input.js, balsim.js | every line and suit live; 21 lines × 3 skills; 14 Grips; names; balsim parity ±15 % |
| 1 | Ruins bestiary | Opus | js/enemydata.js, parts.js, bosses.js | 6 Ruins commons + Oathless + Gloam Warden in a test arena |
| 2 | Docs (pivot rewrite) | Sonnet | docs/design/*, docs/PORTING.md, handoff/README.md, GLOSSARY.md | minutes §7 in full; docs-lint green |
| 2 | Arenas | Sonnet | js/arenas.js, tools/arena-route.js, tools/qa/run-arenas.js, title Arena list, `?map=` | arena table (minutes §2); arena-route green |
| 2 | Export: tiles, props, sheets | Opus | tools/export/*, handoff/, godot_import.gd, godot-sample/ | blob-47 terrain + cliff + water atlases per zone, props/trees, hero + enemy sheets with sidecars; manifest |
| 3 | Elements in the world | Opus | js/elements-world.js, the `verbs` arena | receivers, states, tile patches, Pip's charge, Dream Oil, Opal |
| 3 | Map cut (Haiku) | Haiku | deletes: tools/maps, editor, act1-route, engine-check, run-big; save v6 migration; check.js | check.js green on arenas |
Piece ids: chest = suit id; new heads `<suit>helm`, new boots `<suit>boots`; weapon/shield/companion lines = their variant id.
Gate: check.js green on arenas; 100 % forge sprites; phone p95 ≤ 20 ms on `stress`; Pages shows the Arena list.

## M10 — Godot port (client ruling 2026-10-23; ~5 to 7 weeks, lanes in worktrees)
The studio rewrites the game code in GDScript and hands the client a **playable Godot project** (`godot/`, Godot 4.7.2,
GL Compatibility, web export). Contract: `docs/PORTING.md` (folder tree, autoloads, what ports 1:1, trigger vocabulary).
* **When:** after M9. Systems, tables and art are frozen by then, so nothing is ported twice. The risk is found early by the
  **port spike** in M5: hero movement, one weapon line's hand action and spell (built as action blocks, edited in the Inspector), damage and one status ladder, one enemy
  (Ogre) in `godot-sample/`, matched against golden vectors from the JS build.
* **Data, not code:** every number lives in data; GDScript holds only the maths.
* **Editor-first authoring (client ruling 2026-10-23):** everything is a Godot `Resource` (`.tres`: EnemyData, ItemData,
  SkillData, LootTable, Effect, StatusData, BossMove, SfxData…) edited in the Inspector, and every placeable is a scene the
  client drags into a zone (enemy, chest, shrine, gate, trigger, receiver). Enemy behaviour is picked from part components
  (one movement, 1 to 2 attacks, 0 to 1 support) in dropdowns; loot, effects, audio and resists are slots on the resource.
  A **Data table** editor dock shows each table as a spreadsheet (sort, filter, edit in place). Saving a `.tres` while the
  game runs from the editor hot-reloads it into live bodies. The JSON export is only the one-time seed of the resources.
* **Everything editable, skills included:** items carry look and feel as fields too (shine/glint, particles, VFX, light,
  audio) beside damage, element, affixes, passives (Effect rows) and granted skills. Skills are **not** ported as code:
  each `cast` becomes a SkillData built from **action blocks** (projectile, cone, zone, dash, beam, summon, buff, status
  build, knockback, spawn VFX, play SFX, camera/hit feel…) with timing, numbers, element, VFX, SFX and anim in the
  Inspector. A skill no block set can express gets a small script slot, listed in PORTING.md as an exception.
* **Everything is parametric** (client): no hard-coded number, colour, timing, sound or look in GDScript; every one is a field.
* **Swappable FX:** effects, VFX and particles are a library of **FX presets** (`FxData`: particles, sprite anim, light,
  trail, shader tint, decal, screen shake, hit stop, SFX), each buildable from layers in the Inspector. Any data resource
  (item, skill block, enemy, status, reaction, receiver, shrine, chest…) has FX slots per event (spawn, idle, hit, crit,
  cast, death, pick-up…); drop a preset into a slot or build a new one in place.
* **Arenas only:** the studio rebuilds the mockup arenas as Godot scenes (`godot/arenas/`, the same ids as `js/arenas.js`)
  to test the port. It never makes zones: the client builds them in `godot/zones/`, which no lane touches.
* **After M10** the Godot project is the game: the JS build freezes as the reference, and later gameplay work happens in GDScript.

| Lane | Model | Owns | Acceptance |
|---|---|---|---|
| Core | Opus | autoloads `Data`, `Save` (v6 + migrate), `Game`; project settings; scene tree | loads every `handoff/data` table; save round-trip with JS fixtures |
| Combat | Opus | hero, Loadout v3, casts, `Effects`, `Status` (ladders, 8 reactions), elements in the world, `Wind` | golden vectors from the JS build match (damage, builds, reactions, EFFECTS rows) |
| Bestiary + bosses | Opus | enemy parts state machine, elites, bosses (`BOSS_MOVES` as Resources) | Godot bot clears every `pack-*` and `boss-*` arena per band |
| Render + feel | Opus | layered `AnimatedSprite2D` hero, `Light2D` + normal sheets, rim shader, VFX, hit feel | 8 dirs × every anim; desktop p95 ≤ 16.7 ms on `stress` |
| UI + input | Sonnet | HUD, every menu, touch wheel, pad, rebind | the play.js UI checks ported; kbm, pad and touch route |
| Audio | Sonnet | `Audio` autoload, buses, music director, `handoff/audio/*.ogg` | every SFX and motif fires |
| Arenas + QA | Sonnet | `godot/arenas/*.tscn`, headless GDScript test runner, `check.js` step `godot` | every arena loads; the suite runs headless |

Gate: golden vectors match; balsim parity ±2 % between JS and Godot; the Godot bot wins every arena it wins in JS;
web export runs with 0 errors (no web or phone perf target, client ruling); desktop p95 ≤ 16.7 ms on `stress`; the client plays the arenas in Godot (desktop + phone web) and approves.

## Client rulings (latest first)
* 2026-10-23 — **Everything parametric; FX swappable** (FX presets in slots on any data resource).
* 2026-10-23 — **The client tunes balance.** The studio focuses on assets and logic; balance targets (parity, TTK, fight times, win rates) are report-only, never gates or tuning work. Gates keep correctness: no crash, every arena completable, the Godot port matching the JS maths.
* 2026-10-23 — **Runtime layering:** no `_front`/`_back` split; every gear piece is one colour + one depth sheet, layered per pixel at runtime (JS and Godot). Export v2 lane.
* 2026-10-23 — **The artist paints the world art and skill icons:** `codex-image` makes tiles, props, trees, decals, skill icons and item icons (current ones judged ugly); every prompt anchored on forge references for visual constancy; a sample board first, for the client's eye. Hero, gear, enemies and bosses stay forge-made.
* 2026-10-23 — **Editor-first Godot:** drag-and-drop enemies and every other game object, edit all their properties (HP, resists, loot, effects, audio, behaviour) in the Inspector and a table editor, live while the game runs. Godot stays the engine.
* 2026-10-23 — **No web optimisation for the Godot build**: the web export must run, but there is no web/phone perf target or tuning work.
* 2026-10-23 — **The studio ports the game code to GDScript** (M10): the client gets a playable Godot project and builds his zones in it. Reverses "the client ports the game".
* 2026-10-23 — Every sprite sheet must open and edit cleanly in **Aseprite** (client owns 1.3.18); the studio may use Aseprite's CLI as a tool.
* 2026-10-23 (answers) — Godot **4.7.2**, GDScript, **web builds** wanted. The client will hand-edit **both** sprites/gear and tiles/props (every sheet, incl. `_front`/`_back` gear splits, must be edit-friendly). GitHub Pages **comes down at handoff**. Zone names, hooks and pacing **stay** as his build targets but must be **easy to change**: they live in editable data (`handoff/data/zones.json`), never hard-coded.
* 2026-10-23 (later) — **Godot pivot.** The studio no longer makes maps: the client builds every map himself in Godot. Act I maps are scrapped. The studio makes weapons, systems, gameplay, enemies, bosses, UI, and tests them only in tiny mockup arenas. When the game is finished the client ports it to Godot, so every asset (sprite sheets, map tiles, props) must be human-editable files. Map assets are remade only as reusable Godot tile/prop assets. This reverses the old "Godot port-ready rules" drop. Minutes: `docs/meetings/2026-10-23-godot-handoff.md`.
* 2026-10-23 — Raster art board approved: the artist (`codex-image`) paints art outside the forge only (wordmark, dialogue portraits, key art); see visual-bible.md.
* 2026-10-22 (later) — Hero art pivot: back to the first chibi, fully deterministic forge (volumes only, no hand-drawn parts); SlyNyrd `ref` rig and ref-based gear lines retired; all gear layered at runtime.
* 2026-10-22 — Loadout v3 "Lead/Support" (no hero skills; everything from equipment); shields offhand-only; 2H + worn
  companion; Grimoire/Quiver/Warhorn decks; R head · F chest · V boots; 32 px hero; 8 dirs for every facing creature;
  forge is the only 8-dir sprite source; runtime status/lighting layers; wind field; purge tools/qa/old from history; unique cap 20 (The Stopped Hour); Story difficulty removed (Normal only, plus NG+); bosses keep hit-kill potential (no hit cap, telegraphed only).
* 2026-10-20 — elements (§33): 9 hero elements, Opal, 8 reactions incl. Drift; pixel-FX prototype approved.
* Dropped, never re-offer: jade tint for the nature Echo; real-phone `?perf=1` readings; Godot web/phone performance tuning.
* Reports to the client: substance only, no commit/PR chatter.

## Known misses (not blockers)
* Phone p95 at CPU ×4 on pine-fight ~28 ms (pre-M4a build 25.8 ms): final upscale ~7 ms + HUD ~2.3 ms. Ship gate is p95 ≤ 20 ms at ×1; layer budgets at ×4.
* Radiant Judgement pillar white-out ~59 % for ≤ 0.5 s (signature ultimate, exempt); single-frame impact flashes allowed.
* §29 speck and cluster metrics.
* Bramblehorn fight gap 30 s vs 15–25 s target.
* ELFX phone cost risk (A7 gate).
