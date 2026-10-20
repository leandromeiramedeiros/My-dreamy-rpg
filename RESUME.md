# RESUME — how to pick up this project

> Paused 2026-10-20 at the client's request. Development resumes Friday.

## 1. How to resume (client)
Open a new Claude Code session on this repo (the default branch `claude/dreamy-rpg-concept`; M3 is merged there) and say:

> **"Resume from RESUME.md. You are the game director."**

That is all. The session reads this file, takes the director role and restarts the team below. You do not need to explain the agents, the rules or the process.

## 2. The director's role (Claude, main session)
- I am the **game director**. I don't write game code. I steer, write briefs, review results (suites, screenshots, numbers), commit, and ship a playable build every milestone.
- **I deploy employees (sub-agents) for all the work.** On resume I restart the lanes in §5 without being asked.
- **Reporting to the client:** substance only, with no commit/PR/merge chatter. A stop-hook nag about uncommitted files gets a silent WIP commit.
- **Expert consults:** big design questions go to a **Fable** "renowned expert" (game director, VFX director, level designer, story director, and so on). The minutes go to `docs/meetings/`, the decisions to `docs/DESIGN.md`, and then I brief the client with choices.

## 3. The team (employees), and what each model is for
| Model | Used for | Typical work |
|---|---|---|
| **Opus** | Heavy implementation lanes: engine, combat, bosses, render/perf, world art, opening, balance | hit feel §27, boss phases §26, Echo §30, world art G1/G2 §29, perf §26.4, opening §28, elite pockets |
| **Sonnet** | Medium, well-specified lanes: data tables, UI polish, test additions, ports from specs | items/UI fixes, port jobs |
| **Haiku** | Mechanical work: renames, migrations, lint-like sweeps, screenshot runs | ID renames, fixtures |
| **Fable** | Expert consults and meetings (design only, no code) | Lumina ruling, element VFX, elements meeting, world art, opening |

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
- `docs/CREDITS.md` credits Lumina.
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
3. **Three Fable expert meetings, in parallel** (minutes go to `docs/meetings/`):
   - **a. Environmental and gameplay systems designer: wind as a force.** Ambient wind pushes and pulls trees and small objects, and wind spells (Gale, §33) push and pull them harder. Build on the canopy gust sway, `tilePatch` and the §33 Wind/Drift rules.
   - **b. Lighting director: a cohesive lighting pass.** Cover:
     - dynamic lights, shadows and rim light;
     - bloom and additive light that don't wash the image out;
     - whether today's godrays and volumetrics stay, get better or go;
     - lit statuses on hero and enemies: a burning enemy blooms and emits light, frozen/shocked/etc. likewise;
     - the Hollow's black darkness band that shows from the Hawk's Rest summit.
     Start from the QUALITY tiers, emitter-only bloom, `lightPool`, the fog clear zone, ELFX and the §32 particle language.
   - **c. Senior artist: hero redesign.** The client said the current hero is "too ugly". **The client must re-attach the two reference images on Friday**: the chibi 3-view trio with goggles, and the 4-direction isometric red adventurer. The session that received them is gone. Use them as style references only and don't copy them. Deliver a concept sheet for client approval before any sprite work.
4. **Documentation meeting** (Fable expert game director). How to tidy the docs and organise the project. It must also fold meetings a–c into spells and the whole game, so spells cast light and wind, statuses glow, and so on. Then apply its ruling.
5. **Brief the client** with the decisions and choices, then plan M4a/M4b (`docs/PRODUCTION.md`).

**Dropped by the client (don't offer again):** Godot "port-ready rules", the jade tint for the nature Echo, and real-phone `?perf=1` readings.

**Known misses (not blockers):**
- §29 speck and cluster metrics;
- the Bramblehorn fight gap is 30 s against a 15–25 s target;
- the ELFX phone cost risk.
