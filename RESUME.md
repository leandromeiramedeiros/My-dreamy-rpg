# RESUME — how to pick up this project

> DRAFT (2026-10-20). The final version is written at the M3 close-out, after the docs/organisation meeting.

## 1. How to resume (client)
Open a new Claude Code session on this repo (branch `claude/m3-items`, or the default branch once M3 is merged) and say:

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

## 5. State at pause, and the lanes to restart
(Filled in at the M3 close-out: each lane, its model, its brief, its files and its status.)
