# Production log (director)

Live game: https://leandromeiramedeiros.github.io/My-dreamy-rpg/ — deploys from branch `claude/dreamy-rpg-concept`
(the repo's default branch) via `.github/workflows/pages.yml`. **A milestone ships when its PR merges there.**

## Authoritative docs
* `docs/DESIGN.md` — design bible. Later sections supersede earlier ones where marked:
  §5b damage types/resistances · §10 milestone plan · §11 2-hour structure, bestiary, status icons, new systems ·
  §12 completionist scope (4.5–5 h, 27 maps) · §13 fishing · §14 controls pointer · §15 skill system ·
  §16 polish, Dust economy, save schema, tech roadmap · §17 Thief/Warrior + Origins · §18 combo layer · §19 equipment v2 + trinkets · **§20 balance framework + scope budget (play-time target, 17 maps, 10 systems, CI red flags)**.
* `docs/STORY.md` — story, twist, endings, beat sheet with final lines, 13 bosses, BOSS_MOVES library.
* `docs/HUD.md` — "Dream Glass" UI spec (complete rework). `docs/CONTROLS.md` — input layer, gamepad, touch, a11y.
* `docs/AUDIO.md` — music/sound design (all synthesized; no audio files — director decision).

## Ship gate
`node tools/smoke.js` (+ scene names) green → scripted play test → director review (screenshots) → PR → merge.

## Status
| Milestone | State |
|---|---|
| M1 Foundation + inventory & loot | **LIVE** (PR #1 merged, deploy green) |
| M2a HUD rework, input/gamepad, combat feel, settings, perf items | in progress — branch `claude/m2a-hud-controls`, draft PR #2 |
| M2b Act I slice (Pinewood 56 + Root Hollow + Bramblehorn, Vale 40, boss system, dialogue, quests, audio engine, music, 3 save slots, first 10 minutes) | next |
| M3 Hero (`js/hero.js`) + icons (`js/icons.js`) wired in, enemies rescaled, **items v2 + trinkets core (DESIGN §19)** | planned |
| M4 Act II Ruins + statuses/reactions + bestiary + combo layer + Thief/Origins | planned |
| M5 Act III Grotto + Warrior + aspects | planned |
| M6 Act IV Caldera + arena | planned |
| M7 Finale Spire + Morrow + endings + NG+ | planned |
| M8 Polish, timed 2 h / 100 % runs | planned |

## M2a work items
* Opus: `js/ui.js` (2× grid, 9-slice, bitmap text, bars, sweep, toast, tooltip, focus), `js/input.js` (actions,
  Interact = Space, dodge Shift/RMB, Gamepad API, touch, IN.glyph prompts, bindings in save), combat feel (8 MP/hit,
  ultimate charge bar, dodge-cancel, skill ranks 1–5 + SKILL_MODS hook, single mutable cast ctx for the M4 combo bus),
  SETTINGS data incl. Story/Normal difficulty, perf (cached light sprites, fixed step, particle cap, mobile), save
  aligned to DESIGN §16.5 (v3). **Done, verified (smoke + play.js green, 60 fps).** Sonnet B now rebuilding hud.js/screens.
* Done & committed: `js/font.js` + `tools/ui/` (bitmap fonts + UI atlas, approved), `js/dialogue.js` (DIALOGUE 38,
  BESTIARY_LORE 19, QUESTS 7, approved).
* Composer (Sonnet): `js/music.js` + `tools/music-preview.html` (lullaby motifs, title/vale/pinewood/roothollow/
  boss_bramblehorn stems/fishing/death/victory/stingers). **Not yet reported.**
* After Opus reports: spawn Sonnet B to rebuild hud.js + all Tab screens + settings screen on ui.js per HUD.md;
  then review screenshots, merge PR #2.

## Ready assets waiting for later milestones
* `tools/maps/` generator: stamps outer/dungeon/boss; recipes vale (40), pinewood (56, 3 secrets, fishspots),
  roothollow (32, Mossjaw), pinewood_boss (24). Build: `node tools/maps/build.js --preview`; merge with `--merge`
  then re-run `tools/m1-world.js`. Engine still needs: gate/hidden/keydoor/lever/fishspot objects, `arrive` portals
  (form `arrive:{x,y}` + `id`), future trigger actions (checkpoint, loot extras, dialogue, openGate, quest, elite).
* `js/hero.js` (layered 24×34 hero, rarityFx), `js/icons.js` (24×24 icons, ICONS API) — not wired in yet.

## Director decisions log (non-obvious)
* Interact on Space; dodge on Shift/RMB. Origins named Knight/Mystic/Ranger/**Thief/Warrior**.
* Thornmail restored (Pacifist build); Stormcall cut; new-cast cap 22.
* Audio: no sample files; hard timbres rendered at boot via OfflineAudioContext.
* M2 split into M2a (UI/controls/feel on existing maps) and M2b (Act I content).
* Main quest `shard_root` reward is the Shard; Root Hollow mini-boss is Mossjaw.
* Equipment v2 (§19): trinkets are passive "rules" (gear = skills). No base variants or sets; tier implicits carry variety.
  Items v2 core is pulled forward from M4 into M3. Pip's Lantern amulet is the Pip quest reward. Save becomes v4.
* **Play-time target changed with the client (§20.1):** dense ~95–110 min main path, ~3–3.5 h for 100 %, plus replay.
  Maps capped at 17 (was 27). Dungeons: Root Hollow + Forge Deep mandatory; Crypt/Drowned Vault/gauntlet become
  optional vaults. Cut Starlit Shoals, Gloaming floor 2, rune-words, attune, separate Dream Tomes.
* Balance is enforced by `tools/balsim.js` + CI red flags (§20.7), built in M2b; no milestone ships with the sim red.
* The expert has a standing role: flag balance and bloat issues in every consult.

