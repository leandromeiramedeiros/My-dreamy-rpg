# Production log (director)

Live game: https://leandromeiramedeiros.github.io/My-dreamy-rpg/ — deploys from branch `claude/dreamy-rpg-concept`
(the repo's default branch) via `.github/workflows/pages.yml`. **A milestone ships when its PR merges there.**

## Authoritative docs
* `docs/DESIGN.md` — design bible. Later sections supersede earlier ones where marked:
  §5b damage types/resistances · §10 milestone plan · §11 2-hour structure, bestiary, status icons, new systems ·
  §12 completionist scope (4.5–5 h, 27 maps) · §13 fishing · §14 controls pointer · §15 skill system ·
  §16 polish, Dust economy, save schema, tech roadmap · §17 Thief/Warrior + Origins · §18 combo layer · §19 equipment v2 + trinkets · **§22 27 maps + studio staffing** · **§21 enemy roster (28 commons, behaviour parts)** · **§20 balance framework + scope budget (play-time target, 17 maps, 10 systems, CI red flags)**.
* `docs/STORY.md` — story, twist, endings, beat sheet with final lines, 13 bosses, BOSS_MOVES library.
* `docs/HUD.md` — "Dream Glass" UI spec (complete rework). `docs/CONTROLS.md` — input layer, gamepad, touch, a11y.
* `docs/AUDIO.md` — music/sound design (all synthesized; no audio files — director decision).

## Ship gate
`node tools/smoke.js` (+ scene names) green → scripted play test → director review (screenshots) → PR → merge.

## Status
| Milestone | State |
|---|---|
| M1 Foundation + inventory & loot | **LIVE** (PR #1 merged, deploy green) |
| M2a HUD rework, input/gamepad, combat feel, settings, perf items | **LIVE** (PR #2) |
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
  ~~Maps capped at 17~~ → client chose **27 maps with a hook each (§22)**. Dungeons: Root Hollow + Forge Deep mandatory; Crypt/Drowned Vault/gauntlet become
  optional vaults. Cut Starlit Shoals, Gloaming floor 2, rune-words, attune, separate Dream Tomes.
* Balance is enforced by `tools/balsim.js` + CI red flags (§20.7), built in M2b; no milestone ships with the sim red.
* The expert has a standing role: flag balance and bloat issues in every consult.
* Enemies (§21): 28 commons, each with a distinct verb; behaviour-part runtime pulled into **M2b**; Oathless and
  Brinemother survive as cheap vault bosses; Twin Vigils = linked Vigil Knights.
* §22: 16 main-path maps (~110 min) + 11 optional (100 % ≈ 4–4.5 h). Moonmaw stays in Starlit Shoals (story).
  Max 4 agents at once; QA tester and level designer roles hired from M2a ship / M2b.


## Balance backlog (from tools/balance/sheets.js, first run) — fix in M2b with balsim
* Common enemies die too fast: wisp TTK 0.74–1.3 s, slime ~1.05 s (target 2.5–5 s). Raise wisp/slime HP or flatten enemyHp curve per §20.3.
* Gloam Warden length 79–92 s (target guardian 150–240 s).
* Dust income ~2,820 per main path vs 900–1,200 target → lower `salvageValue` ~2.4×.
* Gems overpriced: Chipped Ruby 12.6 pp vs 4, Clear 28.7 vs 8 → cut gem resist/hp values.
* Code still gives bosses 2 levels (§20.3: 1, mini 0.5) and 0.8× XP at +3 levels (§20.3: 10 %).
* Hero DPS curve: 1.57× target at L1, 0.80× at L40 → flatter early, steeper tier steps.
* Check: `ogre`/`troll` spawn ids vs ENEMY table (validate-ids).

## Polish backlog (from M2a review)
* Touch: zone banner overlaps the bag/help/fullscreen buttons — move buttons under the tracker or banner lower.
* Tooltip "vs equipped:" line is empty when nothing to compare — hide it.
* Bag/gear still use the old 16 px icons until M3 wires `js/icons.js`.
* Boss bar shows 2 phase pips (engine has one phase flag) until the boss system lands in M2b.

## Status snapshot (M2b in progress)
* Done on branch `claude/m2b-act1`: enemy behaviour parts (js/parts.js), boss move library + Mossjaw/Bramblehorn/Warden
  port (js/bosses.js), map objects + trigger actions, tools/balsim.js, 3 save slots, Pinewood enemy data + art
  (js/enemydata.js, js/enemyart.js), Touch v2 circular wheel + skill `aim` blocks.
* In progress: art wiring + ground aim indicators + balance parity (Opus); Act I maps, first 10 minutes, lantern quest,
  3 secrets (Sonnet level designer).
* Next: audio engine + Act I music/SFX; QA play-test; ship M2b.
* Weapon variants (§23) + armour suits (§24) adopted; client chose full scope with a later finale (§24.1).
  staff/spellbook/orb) with unique skills, statuses and per-tier looks.
* Client preference: status reports without commit/PR chatter.
* §23 weapon variants adopted: 5 classes × 3 variants; parts kit + refactor + save migration in M3; variants roll out M4–M7.


## §24 suit tier names (T1 → T5 · Mythic, names pending a naming pass)
* Warden: Iron Mail · Knight Plate · Sunforged Plate · Aurora Plate · Aegis of Dawn · Mythic (lantern at the heart)
* Crusader: Acolyte Mail · Dawn Vestment Plate · Sun Crusader · Aurora Templar · Oath Eternal
* Juggernaut: Scrap Plate · Bulwark Plate · Sunforged Bastion · Aurora Colossus · Mountain Eternal
* Dreamweave: Linen Robe · Dreamweave Robe · Starwoven Robe · Nebula Vestments · Eternal Dreamshroud · The Lullaby Shroud
* Frostweave: Woollen Robe · Frostweave · Glacier Vestment · Aurora Rime · Winter Eternal
* Stormweave: Grey Robe · Stormweave · Thunder Vestment · Aurora Tempest · Storm Eternal
* Stalker: Leather Jerkin · Stalker Jacket · Nightstalker Coat · Shadowweave Jacket · Eclipse Garb
* Thornwarden: Ranger Garb · Thornwarden · Mossmantle Coat · Aurora Thorn · Root Eternal · Bramblehorn's Hide
* Duelist: Swordsman's Coat · Duelist Jacket · Silver Fencer · Aurora Brocade · Blade Eternal · Aerin's Coat
* Shade: Scout Leathers · Shade Leathers · Nightshade Harness · Eclipse Shade · Shadow Eternal
* Nightshade: Tanner's Leathers · Nightshade · Hemlock Harness · Aurora Venom · Blight Eternal · Mossjaw's Skin
* Mirage: Trickster Leathers · Mirage · Glass Harness · Aurora Mirage · Mirror Eternal · The Unmade's Skin
* Visual rule: each tier = class palette ramp + trim, crest/pauldron, hem/glow part swaps; T5 = made of light.

## §25 Pinewood 112×112 zone recipe (expert draft for the level designer)
Sections:
* **forest:** outer stamp at bounds [0,20,112,112].
* **hollow:** dungeon stamp at bounds [0,0,56,20], cave patch {f:2,d:0.62}, ambient 0.45.
  * Entered by warpdoor `hollow_door` at (44,36), which needs `key_roothollow`.
  * Left by warpdoor `hollow_exit` from the den to forest shrine3.
* **warrens:** vault at [60,0,112,20], entered from the env secret at (100,46). Noise sleepers ×3; the gold chest holds a
  socket rune.
* **clearing:** boss at [88,20,112,44]. Arena at (100,30), r 9, 4 pillars, closed by `arena_gate`. Bramblehorn with
  saplings.

Forest rooms:
| Room | Position | Details |
|---|---|---|
| start | (8,104) | |
| r1 | (40,92) | clearing, lvl 2 |
| r2 | (26,58) | plaza, lvl 4 |
| r3 | (70,52) | walled chamber |
| elite | (96,84) | nook |
| tablet | (30,108) | |
| fish | (52,70), (84,62) | two spots |
| crack | (22,78) | |
| env | (100,46) | |
| islet | (10,30) | isolated |
| shrines | (44,86), (66,60), (84,36) | |

Forest routes:
* Main path: start → (16,98) → (28,94) → r1 → (52,84) → (60,72) → (48,64) → r2 → (36,48) → (52,46) → r3 → (84,44)
  → shrine3 → (96,34) → arena gate.
* Shortcut loops: r2 → (14,66) → (10,84) → (12,96); and r3 → (76,70) → (60,80) → shrine1.
* Creek from (0,60) to (112,56); landmark at (60,70).

Hollow rooms: start (6,14) · r1 chamber (16,12) · shrine (26,8) · r2 chamber (36,12) · lever (44,6) · den arena (50,12)
with 6 pillars · crack (30,16).

Packs:
* r1: hound + slime + shaman
* r2: an ogre pair + shaman + slimes
* r3: boar + hounds + shaman
* elite: a Shielded ogre
* hollow: as in the current recipe
* warrens: sleepers only

Secrets (5):
* forest crack → a gem
* env (pond) → the Warrens door
* lever bridge to the islet → a tablet + a Skill Rune
* hollow crack → a Socket Rune
* cross-section: the hollow ceiling under r2 drops a chest key
