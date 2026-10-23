# Production (director)

Live: https://leandromeiramedeiros.github.io/My-dreamy-rpg/ — deploys from `claude/dreamy-rpg-concept` (default branch).
A milestone ships when its PR merges there.

Design source: `docs/design/INDEX.md` (one lean file per system). M4 vision: `docs/meetings/2026-10-22-studio-experts.md`.
**Godot pivot (2026-10-23):** the studio builds the game minus the world (systems, tables, sprites, audio), tested in
mockup arenas; the client builds every zone in Godot. Deliverable: the `handoff/` package + the JS reference build.
Plan: `docs/meetings/2026-10-23-godot-handoff.md`. Act I maps tagged `maps-pre-godot`, then removed.

## Ship gate
`node tools/check.js` (`--fast` skips perf + bot): smoke (balsim + save-migrate) · play · validate-ids · forge-rt · perf · the bot.
Until the M4b Arena cut lands: act1-route, maps/engine-check, qa/run-big. After it: `tools/arena-route.js`,
`tools/qa/run-arenas.js kbm|pad|touch`, perf on the `stress` arena. Director reviews shots, merges.
Local box: Windows 11, Node 24, Python 3.13 + PIL, Playwright with its own Chromium (`npm i`). Godot not installed yet.
Known flakes: play.js warp-fade, perf under load.

## Status
| Milestone | State |
|---|---|
| M1 foundation, inventory, loot · M2a HUD/input/feel · M2b Act I slice · M3 items v2, hit feel, boss phases, Echo, opening, world art G1–G3, phone perf | **LIVE** |
| M3 hot-fix · M4a foundations on a vertical slice (Vale + Pinewood) | **LIVE** |
| **M4b Arena cut** — wave 1 content (gear, enemy forge, skills, Ruins bestiary), mockup arenas, tile/prop export start, map deletes, docs | **in progress** (branch `claude/m4b`) |
| M5 Systems + Godot import proof · M6 Bestiary · M7 Bosses · M8 UI, audio, feel · M9 Export and handoff | planned (minutes §6) |

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

## Client rulings (latest first)
* 2026-10-23 (answers) — Godot **4.7.2**, GDScript, **web builds** wanted. The client will hand-edit **both** sprites/gear and tiles/props (every sheet, incl. `_front`/`_back` gear splits, must be edit-friendly). GitHub Pages **comes down at handoff**. Zone names, hooks and pacing **stay** as his build targets but must be **easy to change**: they live in editable data (`handoff/data/zones.json`), never hard-coded.
* 2026-10-23 (later) — **Godot pivot.** The studio no longer makes maps: the client builds every map himself in Godot. Act I maps are scrapped. The studio makes weapons, systems, gameplay, enemies, bosses, UI, and tests them only in tiny mockup arenas. When the game is finished the client ports it to Godot, so every asset (sprite sheets, map tiles, props) must be human-editable files. Map assets are remade only as reusable Godot tile/prop assets. This reverses the old "Godot port-ready rules" drop. Minutes: `docs/meetings/2026-10-23-godot-handoff.md`.
* 2026-10-23 — Raster art board approved: the artist (`codex-image`) paints art outside the forge only (wordmark, dialogue portraits, key art); see visual-bible.md.
* 2026-10-22 (later) — Hero art pivot: back to the first chibi, fully deterministic forge (volumes only, no hand-drawn parts); SlyNyrd `ref` rig and ref-based gear lines retired; all gear layered at runtime.
* 2026-10-22 — Loadout v3 "Lead/Support" (no hero skills; everything from equipment); shields offhand-only; 2H + worn
  companion; Grimoire/Quiver/Warhorn decks; R head · F chest · V boots; 32 px hero; 8 dirs for every facing creature;
  forge is the only 8-dir sprite source; runtime status/lighting layers; wind field; purge tools/qa/old from history; unique cap 20 (The Stopped Hour); Story difficulty removed (Normal only, plus NG+); bosses keep hit-kill potential (no hit cap, telegraphed only).
* 2026-10-20 — elements (§33): 9 hero elements, Opal, 8 reactions incl. Drift; pixel-FX prototype approved.
* Dropped, never re-offer: jade tint for the nature Echo; real-phone `?perf=1` readings.
* Reports to the client: substance only, no commit/PR chatter.

## Known misses (not blockers)
* Phone p95 at CPU ×4 on pine-fight ~28 ms (pre-M4a build 25.8 ms): final upscale ~7 ms + HUD ~2.3 ms. Ship gate is p95 ≤ 20 ms at ×1; layer budgets at ×4.
* Radiant Judgement pillar white-out ~59 % for ≤ 0.5 s (signature ultimate, exempt); single-frame impact flashes allowed.
* §29 speck and cluster metrics.
* Bramblehorn fight gap 30 s vs 15–25 s target.
* ELFX phone cost risk (A7 gate).
