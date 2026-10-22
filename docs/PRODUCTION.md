# Production (director)

Live: https://leandromeiramedeiros.github.io/My-dreamy-rpg/ — deploys from `claude/dreamy-rpg-concept` (default branch).
A milestone ships when its PR merges there.

Design source: `docs/design/INDEX.md` (one lean file per system). M4 vision and rulings: `docs/meetings/2026-10-22-studio-experts.md`.

## Ship gate
`node tools/smoke.js` · `tools/play.js` · `tools/act1-route.js` · `tools/validate-ids.js` · `tools/maps/engine-check.js` ·
`tools/perf.js` · `tools/qa/run-big.js kbm all` (from M4a: one runner, `node tools/check.js`). Director reviews shots, merges.
Local box: Windows 11, Node 24, Python 3.13 + PIL, Playwright with its own Chromium (`npm i`). Known flakes: play.js
warp-fade, perf under load.

## Status
| Milestone | State |
|---|---|
| M1 foundation, inventory, loot · M2a HUD/input/feel · M2b Act I slice · M3 items v2, hit feel, boss phases, Echo, opening, world art G1–G3, phone perf | **LIVE** |
| M3 hot-fix: Act I progression bugs, Turbo bot, seeded runs, Story difficulty removed (balance waits for M4a) | in progress |
| **M4a** foundations on a vertical slice (Vale + Pinewood) | next |
| **M4b** full content rollout + Act II Ruins + elements in the world | planned |
| M5 Act III Grotto · M6 Act IV Caldera · M7 Finale Spire + endings + NG+ · M8 polish, timed runs | planned (re-scoped after M4b) |

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

## M4b — full rollout (~8 weeks)
| Lane | Model | Acceptance |
|---|---|---|
| Gear art A: suits | Sonnet | 12 suits × 3 pieces × 6 tiers, board-approved |
| Gear art B: weapons, shields, companions | Sonnet | 21 lines × 6 tiers; icons from the forge; rarity FX strip per line |
| Enemy forge | Sonnet (commons) + Opus (bosses) | 29 commons + 12 bosses at 8 dirs (amorphous/swarm 1); js/enemyart.js retired |
| Skills content | Opus (new mechanics) + Sonnet (data) + Haiku (names) | 21 lines × 3 skills, ~40 pages/arrows/calls, 14 grips; ≤ 36 new casts; balsim loop green |
| Act II Ruins | Sonnet (level) | Ruins maps, Broken Stair, 3 verb puzzles, elite pockets; bot clean |
| Elements in the world | Opus | receivers, object states, ice/grass tiles, Pip's charge, Dream Oil, Opal, world puzzles |
| Balance + QA | Opus + Haiku | balsim red flags green; `run-big.js` all devices to the end of Act II |
Gate: 100 % forge sprites in play; phone p95 ≤ 20 ms on every zone; docs current; ships to Pages.

## Client rulings (latest first)
* 2026-10-22 (later) — Hero art pivot: back to the first chibi, fully deterministic forge (volumes only, no hand-drawn parts); SlyNyrd `ref` rig and ref-based gear lines retired; all gear layered at runtime.
* 2026-10-22 — Loadout v3 "Lead/Support" (no hero skills; everything from equipment); shields offhand-only; 2H + worn
  companion; Grimoire/Quiver/Warhorn decks; R head · F chest · V boots; 32 px hero; 8 dirs for every facing creature;
  forge is the only 8-dir sprite source; runtime status/lighting layers; wind field; purge tools/qa/old from history; unique cap 20 (The Stopped Hour); Story difficulty removed (Normal only, plus NG+); bosses keep hit-kill potential (no hit cap, telegraphed only).
* 2026-10-20 — elements (§33): 9 hero elements, Opal, 8 reactions incl. Drift; pixel-FX prototype approved.
* Dropped, never re-offer: Godot port-ready rules; jade tint for the nature Echo; real-phone `?perf=1` readings.
* Reports to the client: substance only, no commit/PR chatter.

## Known misses (not blockers)
* Phone p95 at CPU ×4 on pine-fight ~28 ms (pre-M4a build 25.8 ms): final upscale ~7 ms + HUD ~2.3 ms. Ship gate is p95 ≤ 20 ms at ×1; layer budgets at ×4.
* Radiant Judgement pillar white-out ~59 % for ≤ 0.5 s (signature ultimate, exempt); single-frame impact flashes allowed.
* §29 speck and cluster metrics.
* Bramblehorn fight gap 30 s vs 15–25 s target.
* ELFX phone cost risk (A7 gate).
