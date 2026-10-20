# QA play-test report - Act I (Whispering Vale + Misty Pinewood), New Dream -> Bramblehorn

Tester: QA play-tester (bot using only real inputs: keyboard+mouse, gamepad stub, touch via CDP; no teleports in the runs; dbg-*.js scripts do teleport for repro only).
Harness: tools/qa/lib.js, run-big.js (patched in tools/qa only: boss retry loops, r2 retry, PadDriver.title), dbg-*.js. Data: run-kbm.json (= run 4), old/run-kbm-run{1,2,3,4}.json, run-pad.json, run-touch.json. Screenshots: tools/qa/shots/ (latest), old/shots-run{1..4}/ (per-run snapshots; shots/ mixes files of several runs, so cite the old/ copies).
Runs: kbm x4 (run 1 recovered from the cut-off session, 920 s; run 2 1359 s; run 3 aborted at 927 s; run 4 1711 s), pad (vale only, 114 s), touch (vale only, 98 s) + dbg-touch.js (aim/cancel/page toggle).

## Headline
- The "New Dream -> Bramblehorn -> back to the Vale" run was NOT completed. Bramblehorn was never killed: 0 of 19 attempts (runs 1, 2, 4), so the arena portal home_arena never opened. Mossjaw (the gate before it) was only killed in 3 of 35 attempts over six runs (runs 1, 2, 4), and in runs 3, 5, 6 the bot never got past it. Runs 5-6 (with a dodge-on-warn branch) were no better: 0/22. Item 1 is therefore incomplete; it needs a human attempt or a ranged/different build (equipBest never changes weapon family, a human would).
- Opening Pinewood trail has a movement wedge (B1).
- Both bosses' hits are a fixed fraction of a reference HP, not of the hero's HP; a hero with a weak gear roll (780-880 max HP at lvl 6-10) dies to two Mossjaw lunges in under 5 s (M1).
- Keyboard-only and gamepad-only players cannot leave the title with Enter/A (M2).
- Touch: aim drag, drag-back cancel, X cancel and page toggle all work (dbg-touch.js). Gamepad Vale pass clean. Fox Warrens vault works and is quick.

## Ranked findings

### BLOCKER
**B1. Hero wedges (0 movement in all 8 directions) on stair/step tiles on the Pinewood opening trail** (3 live occurrences, 2 spots).
- Repro: New Dream, take the rift to Pinewood, walk the trail to the first shrine (44,86): hero stops at (32.96, 93.97), objective "Follow the animals north along the dirt road." Second spot (14.98, 89.92) on the cliff lip west of the first shrine. `node tools/qa/dbg-stuck.js 32.96 93.97 pinewood` and `... 14.98 89.92 pinewood` print "moved 0.00 0.00" for W/A/S/D and all diagonals. Dodge freed the hero in dbg-stuck2.js (2.5-5 tile dash) but in the live run it did not (needed a tester nudge), so a player with empty stamina/cooldown has no way out except dying/pause menu.
- Shots: old/shots-run4/kbm-022-wedged.png (+ old/wedge2-32.96-93.97.png), old/shots-run2/kbm-036-wedged.png, old/shots-run2/kbm-035-stuck.png.

**B2. (needs human confirmation) Old Bramblehorn was not beaten once by the bot.** Blocker for the bot and for the "back to the Vale" leg; I can't claim a human can't do it.
- Repro: kill Mossjaw, take the root-stair to the Clearing shrine (84,36), walk to (100,31). Lvl 9-11, 913-1205 max HP, 3 potions per life.
- Result: 13 deaths / 13 attempts in run 4 (15-76 s per fight, boss left at 25-87 %, usually 30-50 %), 4/4 in runs 1 and 2 (lvl 11 in run 1). Run 4 damage by move (294 hits, 33,165 total): stomp 9,511 (50 hits, up to 676 = 72 % of max HP), rootGrab 8,958 (78 hits, roots the hero), trunkSwipe 5,326, arenaShrink 3,279, roar 1,814, no-warn 3,279.
- Correction to my earlier draft: these hits are NOT untelegraphed. js/bosses.js resolves each line/circle/cone hit once when s.t > wind and removes the tele that frame, so my observer's `tele` flag (checked after the hit) is meaningless. ~90 % of the damage records carry a boss `warn` from the 3 s before (29.9k of 33.2k); wind-ups are 0.7-0.9 s; roar has wind 0 (no warning, 1,814 dmg). The bot's dodges (reactive avoidTele, plus dodge-on-warn in runs 5-6) were not enough.
- Evidence: old/run-kbm-run4.json deaths[]/damage[]/warns[]. Shots: old/shots-run4/kbm-058-death.png, kbm-060-death.png, kbm-062-death.png, kbm-083-death.png; arena start kbm-057-clearing-boss-start.png.
- Caveat: melee bot, poll tick ~100 ms, no kiting. Suggest a human play-test of this fight before ship; consider whether roar (no warning) should be avoidable.

### MAJOR
**M1. Mossjaw lunge = 60 % of a fixed reference HP; a weak-gear hero dies in under 5 s.** moveDmg() = dmgPct (lunge 0.6) x REF_EHP(boss lvl), independent of the hero's HP, and hero max HP at lvl 6 ranged 780-1075 across runs on gear RNG (832-884 at lvl 8-10 in runs 5-6). Run 3 (lvl 8, 889 HP): 7/7 deaths; run 5 (lvl 8-9, 832-858 HP): 9/9; run 6 (lvl 9-10, 858-884 HP): 13/13, 8 of those fights lasted 4.6-4.9 s (two consecutive lunges of 560-677 = dead); 24 of the last 26 killing blows were lunge. Runs 1, 2, 4 (1127 / 1018 / 887 HP) killed it on attempt 3 / 1 / 2. Overall 3 kills in 35 attempts. The warn->hit dodge was in place in runs 5-6 and did not change the outcome. Repro: reach the den (45,10.5) at lvl 7-10 with <900 HP and fight in melee. Evidence: old/run-kbm-run{3,5,6}.json deaths[]/bosses[]; shots old/shots-run3/ (kbm-04x/05x-death.png), old/shots-run1/kbm-046-death.png, kbm-049-death.png.

**M2. Keyboard-only and gamepad-only: Enter/A on the title does nothing.** Focus rests on SLOT 2 (footer says "A interact"); Enter, Space or A leave the state at `title`; only Down then Enter/A starts New Dream (dbg-kbtitle.js and dbg-padtitle.js). Mouse click on New Dream works. Repro: press Enter/A repeatedly on the title. The first pad pass sat 245 s at the title: old/pad-title-fail/pad-002-title-stuck.png, old/pad-title-fail/pad-009-goal-timeout-start_shrine.png, old/pad-title-fail/padtitle-1-afterA.png.

### MINOR
- m1. Objective text goes stale. After a Mossjaw death the respawned tracker reads "Find the lever that raises the gate" (lever already pulled) instead of "Defeat Mossjaw" (old/run-kbm-run4.json events at 790.2; deaths[].obj says "Defeat Mossjaw" at death time). After a Bramblehorn death it reads "Take the root-stair up to the Clearing shrine, then face Bramblehorn" while the hero is already at the Clearing (events 1453.7). After the Fox Warrens vault is cleared it still reads "Sneak past the sleepers to the vault (or wake them one by one)" (run 5 log `after warrens`).
- m2. Repeated dialogue on each retry: "Misty Pinewood" banner replays after every respawn (5x in run 2) and the boss intro "Little dream. You smell like him." replays on every attempt (4-13x). The forest and Hollow cracks share the line "The wall hums, Aerin...". Evidence: old/run-kbm-run2.json pev (talk), old/shots-run4/kbm-057-clearing-boss-start.png.
- m3. Loot labels pile into unreadable text where drops cluster (boss death, kbm-058-death.png; Mossjaw kbm-048-enemy-stuck.png in old/shots-run1; Loot stacking <0.3 tiles in all 4 kbm runs and pad: old/shots-run1/kbm-020-loot-overlap.png, old/shots-run4/kbm-012-loot-overlap.png, shots/pad-005-loot-overlap.png). Cause (js/items.js spawnDrop + hud.js drawDropNames): random scatter 0.5-1.4 tiles, no label de-overlap.
- m4. Boss HP bar covers the objective tracker ("Defeat Old Bramblel..." clipped, kbm-058-death.png) and the tracker says "Foes left 0" at the moment the boss intro starts (kbm-057-clearing-boss-start.png).
- m5. Loot is easy to abandon: after a shrine warp the run left a rare Chipped Ruby 47 tiles behind (old/shots-run4/kbm-031-old-drop.png, run 1 kbm-026-old-drop). Not invisible (names draw within 5-9 tiles, no expiry, MAX_DROPS=40 evicts commons first then the oldest), but nothing points back to it. The run-1 "old drop" shot was a bot skip, not a game bug.
- m6. Enemy idle: a sapling in the arena stood still 7 s with the hero 5.3 tiles away (old/shots-run4/kbm-078-enemy-stuck.png); run 1 ogre in the Hollow (state chase, 10.3 tiles away) unconfirmed (old/shots-run1/kbm-048-enemy-stuck.png); run 2 shadehound was attack-recovery = false positive.
- m7. Shrine warp from shrine2 moved 0 tiles once in run 1 (Enter pressed on the map); 5 other warps worked (1.6 s, ~35 tiles). Not reproduced.

### POLISH
- p1. Tracker line clipped at the right edge: "The Gnarlroot Ogre (south-east, by the loop road) holds the Hollow key. The road north ..." (old/shots-run1/kbm-020-loot-overlap.png) and overlaps the "Foes left" counter (old/shots-run1/kbm-026-old-drop.png).
- p2. Touch 844x390: zone banner ("Gloom in the garden") draws over the tracker line (shots/touch-007-vale-ambush.png); bag tooltip truncates skill names "Dash Strike / Whirling Bla..." (shots/touch-005-menu-bag-touch.png); the game is letterboxed with ~75 px black bars each side.
- p3. Pad title: "CONTINUE" greyed with no slot used, but the default focus is on an empty slot row (old/pad-title-fail/pad-002-title-stuck.png).

## Required measurements
Table: kbm runs (seconds from New Dream; "x" = never finished). Hero is the same Dawnblade character; level at section end in brackets.

| Section | Run 1 | Run 2 | Run 3 | Run 4 | Note |
|---|---|---|---|---|---|
| Vale (80x80), to rift incl. shrine-warp test | 113 (L1) | 120 (L2) | 125 (L1-2) | 117 (L1) | dummies 11 s, lantern, ambush |
| Pinewood forest, rift -> Hollow door | 302 (L6) | 591 (L6) | 313 (L6) | 565 (L6) | runs 2 and 4 include a 240 s bot stall (r2 goal returned instantly after a shrine warp) + 35 s wedge; clean value about 300-325 s |
| Root Hollow, door -> Mossjaw dead | 205 (L8->9) | 191 (L9) | x (7 deaths) | 157 (L8->9) | incl. deaths |
| Bramblehorn's Clearing, arrival -> boss dead | x (4 deaths, 230 s seen) | x (4 deaths) | not reached | x (13 deaths, 860 s) | |
| Back to the Vale | not reached | not reached | not reached | not reached | portal closed until boss dies |
| Total | 920 (cut) | 1359 | 927 (aborted) | 1711 | |

- Deaths: run 1: 4 (Mossjaw 2 at (48.9,6.1),(48.5,7.3); Bramblehorn 2 at (97.2,30.5),(99.3,29.5)); run 2: 4 (Bramblehorn all); run 3: 7 (all Mossjaw, den (41-52, 5-15)); run 4: 14 (Mossjaw 1 at (shot kbm-053-death.png), Bramblehorn 13 around (98-102, 28-31)). Zero deaths in Vale and the Pinewood forest/Hollow outside the boss rooms.
- Potions: 16 / 14 / 5 / 39 drunk (every one at a boss fight; 3 per life, refilled at checkpoint).
- Level at Mossjaw: 7-9 (typically 8). At Bramblehorn: 9-11 (run 1 11, run 2 9-10, run 4 9-10).
- Boss fights: Mossjaw 10-66 s per attempt; kills in 61 s (run 1, 3rd attempt), 43 s (run 2), 43 s (run 4, 2nd attempt). Bramblehorn 15-109 s per attempt, never killed (run 4: 15.6-75.7 s, mean ~57 s).
- FPS (headless Chromium, software render, 960x540): Vale kbm avg 57.4 (17.4 ms), p95 16.8 ms (60 fps), worst frame 267 ms; Pinewood kbm avg 56.0 (17.9 ms), p95 33.3 ms (30 fps), worst frame 950 ms (map section loads/warps); pad vale avg 56.5, p95 33.3 ms; touch vale avg 57.4, p95 16.8 ms. No page errors in any run (errors: 0).
- Dead walking > 60 s: none from walking. All ">60 s dead time" findings were bot idling (r2 stall x4, pad stuck at title 4x). Longest unbroken real walking leg: shrine -> r3 grove ~16-30 s.
- Got lost? Not measurable with this bot: it path-finds on the real map and knows the objective coordinates. The objective lines (e.g. "Follow the road north. The root door of the Hollow waits north of it") steered correctly; the one text/behaviour gap is m1 (stale objective after death). Hidden-passage tells (crack hum -> "A hidden passage!", cache hint, bridge lever, env hint, hollow crack) all fired and all secrets (2 cracks, cache door, bridge islet chest, gold chest, detour chest, gem cache, mini-boss chest) were opened by the bot, so none is unfindable *given the hints*; human discoverability of the lever-bridge was not tested.
- Shrine warp useful? Works and is fast (map M, 1.6 s, ~35 tiles) but in this route it only sent the hero backwards (terrace -> start shrine, shrine2 -> shrine1) because it only lists visited shrines; the real value is after death/retry and for backtracking. Respawn at the Clearing shrine + potion refill makes retries fast (good).

## Pad / touch short passes
- Pad (run-pad.json): after the title fix: aim by right stick, Y/X skills, bag via Back, LB/RB page tabs (3 tab shots), close with B, map via D-pad Up, shrine warp: all worked; only finding = loot overlap. Shots shots/pad-007-menu-bag-pad.png (bag), pad-008/009/010 tabs.
- Touch 844x390 (dbg-touch.js, dbg-touch.out.json): drag from Q = aim (clamped at 142 px), dragging back onto the button cancels (cd 0, mp unchanged), release outside = cast (cd 2.62, mp 260->243), X cancel at bottom centre works (shots/touch-aim-x.png), page toggle swaps Q/E/R for 1/2/3 (shots/touch-page2.png) and 6 rapid toggles end in a consistent state, bag opens and closes by touch.

## 3 best moments
1. Hidden passage in Pinewood: the wall hum tell, then "A hidden passage!" (old/shots-run4/kbm-020-pinewood-crack-open.png).
2. Touch aim wheel: drag, clamp ring, big X to cancel for free - worked first try (shots/touch-aim-x.png).
3. Old Bramblehorn intro: "The Troll King - Shard of Root", "Discovered: Bramblehorn's Clearing" and the voice line (old/shots-run4/kbm-057-clearing-boss-start.png).

## 3 worst moments
1. Hero frozen on the trail stairs with no feedback (B1, old/shots-run4/kbm-022-wedged.png).
2. 13 straight Bramblehorn deaths, 0 kills in 19 attempts, with loot labels piled over the corpse (B2, old/shots-run4/kbm-058-death.png).
3. Mossjaw: two lunges of ~650 end a ~860-HP hero in 4.6 s, 13 times in a row (M1, old/shots-run3/ and old/shots-run6/ death shots).

## Limits / honesty notes
- One character, bot skill ceiling; boss results are evidence of a spike, not proof for humans.
- FPS is headless software rendering, not real hardware.
- Pad and touch passes covered the Vale only (plus the dbg scripts), not Pinewood. Runs 5-6 were aborted by me at 959 s / ~960 s once Mossjaw retries were exhausted (the later sections therefore have run 4 as their latest data).
- harness artifacts NOT in the ranked list: the 'Portal home_arena not open' blocker (boss alive), 'Goal timed out: door hollow_exit' (boss alive), r2-stall dead-time findings, and the false 'killed:true' on the first run-4 Bramblehorn BOSS END.
- js/ was only read (items.js, hud.js); nothing outside tools/qa was written.

---
# Appendix: incremental working log (written during the session)
NOTE: entries below are chronological and some are superseded by the ranked list above (the '17 %/83 % telegraphed' numbers and 'M2 pad-only' are wrong/outdated; run 6 = dodge-on-warn v2, 14 deaths, 13 Mossjaw attempts, 0 kills, old/run-kbm-run6.json).

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

## Run 2 additions (kbm, 1359 s, bot never killed Bramblehorn in 4 attempts -> retry loop added to run-big.js, run 3 started)
- Run 2 data: old/run-kbm-run2.json, shots: old/shots-run2/.
- Mossjaw killed first try in run 2 (lvl 7->9, 43 s, 0 deaths) vs. 2 deaths in run 1 (lvl 8-9) => variance is high, 3 potions are usually all spent.
- Bramblehorn: 4 deaths in 4 attempts at lvl 9-10 (93-107 s each), always with the boss at 31-43 % HP, i.e. phase 2. Damage taken by source: rootGrab 3254+ (32 hits, root + damage), stomp 1991 (7 hits, ~280 each), roar 892, rootWall 556, trunkSwipe 546+428. Sapling adds add ~1500.

### BLOCKER-2 Hero wedges (zero movement in all 8 directions) on stair/step tiles on the opening trail of Pinewood (2 spots, 3 live occurrences)
- Repro (found by walking): Pinewood, walk west along the cliff from the first shrine toward the cache door -> hero stops at (14.98, 89.92). W/A/S/D and diagonals all give 0 movement (tools/qa/dbg-stuck.js 14.98 89.92 pinewood reproduces: all 8 directions 0.00). Dodge (Shift) does free the hero (dbg-stuck2.js: dashes 2.5-5 tiles) but the bot reported dodge did not free it in the live run (stamina empty?), so a player with no stamina must wait or die. No visual cue why.
- Shot: old/shots-run2/kbm-036-wedged.png, old/shots-run2/kbm-035-stuck.png

### MINOR-2 Repeated dialogue on every boss retry
- Run 2: after each Bramblehorn death the "Misty Pinewood" zone banner replays on respawn (5 times in one run) and the boss intro "Little dream. You smell like him." plays again on every attempt (4x). The same crack line "The wall hums, Aerin. Something is hidden behind it." is used by both the forest crack and the Hollow crack (2x, probably intended but reads as repeated).
- Repro: die to Bramblehorn, respawn, walk back in. Evidence: old/run-kbm-run2.json (pev, talk entries boss_bramblehorn_intro, pinewood_banner). Shot: old/shots-run2/ (see kbm-052-*, kbm-0xx boss-start shots).

### Code-read notes (js/ is read-only for me)
- js/items.js: ground drops never expire; `MAX_DROPS = 40` evicts the first *common* drop, else drops[0] (oldest, can be an epic). Pickup radius 0.65 tile, names only drawn within 5 tiles (9 for rare+), so an "old drop" is simply off-screen loot, not invisible: the old-drop shot (kbm-026) was the bot leaving a Leather Jerkin 47 tiles behind, not a game bug. Loot overlap is real: spawnDrop scatters r=0.5-1.4 tiles and drawDropNames has no de-overlap, so label text stacks (shots kbm-020, kbm-048).
- Enemy "not moving" detections: run 2 shadehound was in state 'rec' (attack recovery) = false positive. Run 1 ogre (state 'chase', 10.3 tiles away at 41.9,13.85, Hollow) is unconfirmed.

## Run 3 additions (kbm, aborted at ~900 s by me)
- Run data: old/run-kbm-run3.json, shots old/shots-run3/. Same character, different RNG gear: hero max HP at lvl 6 was 1075 / 940 / 780 across runs 1/2/3 (gear drops are random), and that decides the Mossjaw fight.
### MAJOR-3 Mossjaw "lunge" one-shots a full-HP hero (difficulty spike)
- Run 3: lvl 8, max HP 889: 7 deaths in 7 attempts, each fight 10-36 s. Killing blows in the damage log: lunge 889, 856, 889, 843, 562; circle 585-598; lunge 476. A single lunge removes 100 % of max HP (even when `tele` was true = hero was inside the telegraph). In runs 1-2 (HP 1127 / 1018) the same boss was beatable (2 deaths / 0 deaths).
- Repro: New Dream, play as per run-big.js, arrive at the Mossjaw den (45,10.5) at lvl 7-8 with ~800 HP, stand near the boss. Evidence: old/run-kbm-run3.json deaths[], bosses[]. Shots: old/shots-run3/ (death shots kbm-04x/05x-death.png).
- Consequence: after the 7th death the bot never returned (see below): the retry loop was missing, so the bot wandered in the Hollow ("No walkable path to goal clearing shrine3" because the exit door is only usable after the boss).

### BLOCKER-2 addendum (run 4)
- Second spot: (32.96, 93.97), walking to the first shrine on the starting trail, objective "Follow the animals north along the dirt road." Hero stops on the stair-step stone tiles ('sh' tiles at 31-33,94-95, heights 0/1/2 next to a 2-high bank); dbg-stuck.js 32.96 93.97 pinewood: W/A/S/D and all diagonals 0.00. The live bot reported "Dodge does not free it" and was only freed by the tester nudge. Both spots are next to 'sh' (stair) tiles where heights step by 2.
- Shot: old/wedge2-32.96-93.97.png (copied from the run-4 capture); repro script: node tools/qa/dbg-stuck.js 32.96 93.97 pinewood
- Because the wedge is on the intended first path of the Pinewood, I rate it a blocker for players without stamina/dodge; dodge freed the hero in dbg-stuck2.js for spot 1 but not in the live run.

## Run 4 (kbm, final full run with retry loops; 1711 s; data old/run-kbm-run4.json = also run-kbm.json, shots old/shots-run4/)
- The bot reached Bramblehorn at lvl 9 and died 13 times in 13 attempts (lvl 9-10, 940 max HP, 3 potions per life, boss left at 25-87 % HP, best 87 %/78 % early-attempts, typical 30-50 %). Total run deaths: 14 (1 Mossjaw, 13 Bramblehorn). The "back to the Vale" leg could NOT be completed: portal `home_arena` stays closed until Bramblehorn dies (kbm-077-portal-closed.png, that blocker finding is expected, not a bug).
### MAJOR-4 Bramblehorn is not beatable by the bot (difficulty spike / telegraph reliability)
- 294 hits from bramblehorn + saplings over the run, 33,165 damage; only 17 % of it landed while the hero stood in a visible telegraph (observer flag `tele`), 83 % landed outside any telegraph: stomp 9,511 (50 hits, 8,575 untelegraphed, individual hits up to 676 = 72 % of 940 max HP), rootGrab 8,958 (78 hits, roots the hero), trunkSwipe 5,326, no-warn/other 3,279, arenaShrink 3,279, roar 1,814 (roar has wind-up 0 and open 0.6, i.e. effectively no warning).
- Hero HP 940 at lvl 10; boss lvl 8, 39,248 HP. A fight lasts 55-75 s and costs all 3 potions; damage taken (37,311 over the run) is ~40x the hero max HP.
- Repro: walk to Clearing shrine (84,36), then to the arena (100,31), fight with the dawnblade at lvl 9-10 taking the opening route. Evidence: old/run-kbm-run4.json deaths[] / damage[] / warns[]; shots old/shots-run4/kbm-058-death.png, kbm-060-death.png, kbm-062-death.png, kbm-083-death.png.
- Caveat: melee bot at ~1.7 tiles never kites; a skilled human may do better, but 13 failures with a dodge-on-telegraph bot is a strong signal.
### Other run-4 findings
- MINOR: "Enemy sapling not moving for 7 s while hero is 5.3 tiles away" (Bramblehorn arena) - adds that stand idle (probably their spawn/idle state); shot old/shots-run4/kbm-078-enemy-stuck.png.
- BOT-ARTIFACT (not game bugs): r2 stall (kbm-036-goal-timeout-r2_clear.png, hero waited 240 s at shrine1 after shrine warp because the "r2 plaza" goal returned instantly) - shows a *player* risk too: after a shrine warp the objective text says "Follow the road north" (roads north at shrine1 are the way to the Hollow) while the next fight (r2 plaza) lies west; four "dead time >60 s" findings kbm-031..035.

## Gamepad pass
### MAJOR-5 (gamepad-only) "A" on the title screen does not start the game
- Repro: launch with a controller, press A repeatedly on the title: focus rests on "SLOT 2", nothing happens (state stays `title` after 2 presses; shots/padtitle-1-afterA.png). Only D-pad Down then A starts "New Dream" (dbg-padtitle.js). The footer hint reads "A interact" and nothing points at New Dream, so a pad-only player can sit at the title. The first full pad pass sat on the title for 245 s (pad-002-title-stuck.png, pad-009-goal-timeout-start_shrine.png) before I diagnosed this.
- Keyboard/mouse is unaffected. Harness fix: PadDriver.title() now does A, Down, A.

## Advisor-review follow-ups (run 5 in progress)
- M2 is NOT pad-specific: dbg-kbtitle.js shows keyboard Enter / Space on the default title focus also leave the state at `title` (3 presses); only ArrowDown + Enter starts the game. Mouse click on New Dream works. So keyboard-only and gamepad-only players both stall at the title; M2 re-titled accordingly in the ranked list.
- tools/act1-route.js reads as a god-mode (invulnerable, teleporting) trigger checker, not a balance reference, so it cannot say what level/gear a real player has at the bosses. It does show one section my bot skipped in runs 1-4: the Fox Warrens vault (pond door `warrens_door`, 3 sleeping mountain trolls, Socket Rune, `warrens-chest`). Run 5 adds it to run-big.js.
- "83 % untelegraphed" in B2 was wrong framing: `tele` only flags standing inside a drawn telegraph shape at hit time. By the damage log's own `warn` field (a boss warning issued in the 3 s before the hit) ~90 % of Bramblehorn damage (29.9k of 33.2k) followed a warning; the bot simply did not dodge on G.lastWarn (warnJustNow was recorded but never used). Run 5 adds dodge-on-warn in lib.js react().

### Run 5 (dodge-on-warn v1 + Fox Warrens; aborted at 959 s by me; old/run-kbm-run5.json, old/shots-run5/)
- Fox Warrens pass worked with real input: pond door (`warrens_door`) -> hall (80,10) -> vault (99,9.5) -> 3 trolls woken and killed in 15 s at lvl 6 -> `warrens-chest` -> `warrens_exit` back to the forest. Total detour 48 s (431.6 -> 479.8). No findings. After the vault clears, the tracker still reads "Sneak past the sleepers to the vault (or wake them one by one)" (log line `after warrens`) = stale objective text, minor (m8).
- Mossjaw: 9 deaths in 9 attempts at lvl 8-9 with max HP 832-858 (weak gear roll again); killing hits are 2-3 consecutive lunges of 560-677. Source read (js/bosses.js moveDmg): boss damage = dmgPct (0.6 for lunge) x REF_EHP(boss level), i.e. a fixed number independent of the hero's actual HP, so a hero who rolled poor gear (780-860 HP at lvl 6-9 vs 1075-1127 on a good roll) dies to two lunges.
- Observer correction: bosses.js resolves a line/circle/cone hit once at s.t > wind and removes the tele in that frame, so my `tele`=false at damage-log time is expected; the "17 %/83 % telegraphed" stat in B2 is invalid. What is true: every boss hit has a warning (~90 % of Bramblehorn damage records carry a `warn` from the previous 3 s), the hit only lands if the hero is inside the shape at that instant (line aim is fixed at warn start), and the bot's dodges were not enough.
