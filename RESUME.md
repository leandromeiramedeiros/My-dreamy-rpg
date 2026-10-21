# RESUME — how to pick up this project

> Paused 2026-10-20 at the client's request. Development resumes Friday.

## 1. How to resume (client)
Open a new Claude Code session on this repo (the default branch `claude/dreamy-rpg-concept`; M3 is merged there) and say:

> **"Resume from RESUME.md. You are the game director."**

That is all. The session reads this file, takes the director role and restarts the team below. You do not need to explain the agents, the rules or the process.

## 2. The director's role (Claude, main session)
- I am the **game director**. I am a **Fable medium effort agent**. I don't write game code. I steer, write briefs, review results (suites, screenshots, numbers), commit, and ship a playable build every milestone.
- **I deploy employees (sub-agents) for all the work.** On resume I restart the lanes in §5 without being asked.
- **Reporting to the client:** substance only, with no commit/PR/merge chatter. A stop-hook nag about uncommitted files gets a silent WIP commit.
- **Expert consults:** big design questions go to a **Fable** "renowned expert" (game director, VFX director, level designer, story director, and so on). The minutes go to `docs/meetings/`, the decisions to `docs/DESIGN.md`, and then I brief the client with choices.

## 3. The team (employees), and what each model is for
| Model | Used for | Typical work |
|---|---|---|
| **Opus at high effort** | Heavy implementation lanes: engine, combat, bosses, render/perf, world art, opening, balance | hit feel §27, boss phases §26, Echo §30, world art G1/G2 §29, perf §26.4, opening §28, elite pockets |
| **Sonnet at high effort** | Medium, well-specified lanes: data tables, UI polish, test additions, ports from specs | items/UI fixes, port jobs |
| **Haiku at high effort** | Mechanical work: renames, migrations, lint-like sweeps, screenshot runs | ID renames, fixtures |
| **Fable at medium effort** | Expert consults and meetings (design only, no code) | Lumina ruling, element VFX, elements meeting, world art, opening |

On resume I deploy these models myself. The client never has to ask for agents, name models or explain the workflow. Heavy lanes go to Opus, the medium ones to Sonnet, mechanical sweeps to Haiku, and every design question or meeting to a Fable expert. Several lanes run in parallel whenever their files don't overlap.

**Rules every brief must state:**
- Never `git commit`, `git stash`, `reset` or `checkout`; the director commits.
- Each agent edits only its own files. The brief lists them and names the files other lanes own.
- Run test suites one at a time.
- Chromium is at `/opt/pw-browsers`; never run `playwright install`.
- Report with numbers and screenshot paths.

**The tests the director checks after each report:**
- `node tools/smoke.js` (runs balsim and save-migrate)
- `tools/play.js`
- `tools/act1-route.js`
- `tools/validate-ids.js`
- `tools/maps/engine-check.js`
- `tools/perf.js`
- `tools/qa/run-big.js` (the bot)

Two checks are known to flake: the play.js warp-fade check, and the perf check when the machine is loaded.

## 4. Where things are
- `docs/DESIGN.md` is the source of truth (§24–§31 are the recent work).
- `docs/PRODUCTION.md` holds the milestones and the status snapshot.
- `docs/meetings/` holds the expert minutes.
- Build: plain JS, no build step; open `index.html`. Pages deploys from the default branch.

## 5. State at pause (2026-10-20), and what happens on Friday
**Shipped: M3 is merged into the default branch (PR #4) and live on Pages:**
- all of M3: items, hit feel, boss phases, Echo, the opening, elite pockets, phone perf, world art G1–G3 (G3: Hawk's Rest, the Dreamer's Cairn, ladders, drop-downs, vantage reveal, occlusion cutaway);
- the pixel-FX prototype (`js/elfx.js`, `tools/fx-board.js`), approved by the client and not yet wired into the game.

**The one open M3 item is a QA blocker.**
- In the full bot run (`node tools/qa/run-big.js kbm all`), Act I was clean up to Mossjaw (level 10, 0 deaths).
- After that, the Hollow root-stair landed the hero on the new Hawk's Rest summit and the run stalled. The objective stayed on "Climb the root-stair to the Clearing", and the shrine 3, Bramblehorn and return goals timed out.
- Partial fix shipped with M3. Root cause: the bot's pathing didn't know about one-way drop-downs, and it walked to the old shrine 3 spot. In-game, the objective text after the root-stair was stale.
- Changes:
  - `tools/qa/lib.js`: the bot paths through drop landings.
  - `run-big.js`: reads the shrine 3 position from objectives.
  - Pinewood recipe and zone.js: a new summit objective, "Drop from Hawk's Rest onto the Clearing road", and the giant pine moved off the path.
- smoke, play.js and act1-route pass on the shipped build.
- **Not yet re-verified with the full bot.** A re-run stalled earlier, at Pinewood r2 ("Find the root door of the Hollow", after a shrine warp). Investigate that first.

**Friday order (do these in sequence):**
1. **M3 hot-fix lane (Opus), on a new branch from the default branch.** Acceptance:
   - `run-big.js kbm all` reaches the end of Act I with no blockers;
   - smoke, play.js and act1-route pass.
   Then merge the fix.
2. (M3 is already shipped.)
3. **The Game Studio Experts meeting, they are in the same room, they share a fable model at high effort** (minutes go to `docs/meetings/`):
creative-director, technical-director,  game-designer, lead-programmer, art-director, ,gameplay-programmer, engine-programmer, tools-programmer, ui-programmer, systems-designer, level-designer, technical-artist, ux-designer, go in this meeting:

THE CLIENT WILL PROVIDE A LOCAL COMPUTER FOR EVERYTHING, SO NO NEED TO PLAN AROUND CLOUD SESSIONS.

Part 1 - 
The reference: hero and equipment styles are on reference website (https://www.slynyrd.com/blog/2025/10/2/pixelblog-58-top-down-character-animation-part-3 https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation https://www.slynyrd.com/blog/2025/3/24/pixelblog-55-top-down-character-animation). 

Do your research to achieve this EXACT style on the character visuals and animations.

The system: Every sprite that has 8 directions will be done via a deterministic local tool, this include but not limit to the Hero and its equipment, enemies and its equipment when applicable, NPCs. The resulting combination of Hero and Equipment will be layered at runtime resulting in an cohesive visual that encompass every piece of equipment showing (weapon, armor, ring, amulet, cape, belt, satchel, etc). Players will mix and match equipment and it needs to be rewarding visually. Every sprite will need to be redone to achieve this vision.

Part 2 - 
Lighting should be dynamic to accomodate the new elemental system, period. Dynamic lights, shadows and rimlights, combined with pixel effects and subtle particles that obey physics will add to immersion. Bloom and additive lighting must be carefully studied to not wash the image. Godrays, fog, mist should all be revised too to improve the visuals. We created a system to have ailments/statuses/elements show on the enemies, the hero and the world, this system shouldn't be drawn fixed on the spritesheet but rather applied on runtime, with the respective lighting and particles, even the UI/HUD shows these effects. Example: A burning enemy should have the pixel effects and particles layered on top of him, emiting a soft ember glow that lights the ground and entities around him. This needs to be planned with everything that is on the scope on mind.

Part 3 - 
Wind is a natural force of the world, so the trees push and pull naturally on the maps. Spells that have wind element should generate aditional wind force (vector, radial, push or pull, blast, etc) to the trees and small objects, and of course apply the appropriate ammount of push and pull force to move enemies (note that elites and bosses have statuses resistance 

to this).

Part 4 -
No more hero skills. Everything comes from equipment. Weapons, armors, trinkets, MUST HAVE UNIQUE AND CAREFULLY CRAFTED visuals, getting fancier as the power progress.
For example, T4 rapier much fancier than T1 rapier. So each variant and each tier must have uniquely crafted visuals, for weaponry and armory. Inside each variant and class, from tier to tier the visuals are consistant, but they get more intricate. For example, higher rarities should have glowy bits, light streaks, fancy pixel particles, add lights, add sounds, etc.

HOTKEYS:
HAND ACTION  = MOUSE 1
OFFHAND ACTION = MOUSE 2
HAND SPELL = Q
OFFHAND SPELL E
HAND ULTIMATE = SHIFT+Q
OFFHAND ULTIMATE = SHIFT+E
ARMOR/HEAD/BOOTS = R/D/F
BELT OR SATCHEL = Z/X/C
(can consumable items inside to fast use)

Hand + Offhand system:
YOU CHOOSE WHAT CAN BE EQUIPABLE IN WHICH SLOT, NEEDS TO BE DISCUSSED. EACH WEAPON VARIANT HAS 3 SKILLS. THEY INCREASE IN POWER WITH TIER AND RARITY. BUT CORE IS THE SAME.
THEY HAVE FIXED HAND/OFFHAND ACTION, SPELL AND ULTIMATE. SO WHERE YOU PUT THEM IN YOUR CHARACTER MAKES ALL THE DIFFERENCE AND MAKES FOR GREAT FUN. NEEDS TO ADD SHIELD TO THE EQUATION. SKILL EXPRESSION COMES FROM THE COMBINATIONS OF EVERY PIECE OF EQUIPMENT AND THE ADDITIONAL PASSIVES, INTERACTIONS AND NEW SKILLS UNLOCKED. THIS NEEDS TO BE THOUGHT, SPEND YOUR TIME HERE DISCUSSING IDEAS AND HAVE THE BEST ONE IMPLEMENTED.

PART 5 - 
Think about deterministic tools to help cut costs and accelerate the development.
Minimize the documentation, rework the plan so its only new references and drop old ideas, tidy up the project files footprint, remove old and unnecessary code/imagery etc. Best practices on game design.

4. **Brief the client** with the decisions and choices, then plan M4a/M4b (`docs/PRODUCTION.md`).

**Dropped by the client (don't offer again):** Godot "port-ready rules", the jade tint for the nature Echo, and real-phone `?perf=1` readings.

**Known misses (not blockers):**
- §29 speck and cluster metrics;
- the Bramblehorn fight gap is 30 s against a 15–25 s target;
- the ELFX phone cost risk.
