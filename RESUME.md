# RESUME — where work stands

Open a new Claude Code chat on this repo. It is the game director (rules: `CLAUDE.md`), and picks up from here.
Plan and lanes: `docs/PRODUCTION.md`. Design: `docs/design/INDEX.md`. Names: `docs/GLOSSARY.md`.

## State (2026-10-22, M4a in progress on branch `claude/m4a`)
- M3 + hot-fix live (PR #9 merged). Ship gate: `node tools/check.js` (`--fast` skips perf + bot). Bot: Turbo + `--seed`,
  `--god` for progression only.
- Done on `claude/m4a`: docs split into `docs/design/` (DESIGN.md deleted), cleanup (tools/qa/old etc. deleted),
  check.js / docs-lint / palette-lint, Wind lane (js/wind.js, wind-check.js), comment sweep.
- **Running lanes** (uncommitted work in the tree belongs to them; commit only their paths with `git commit -- <paths>`):
  - Forge (Opus), phase 1: hero = `chibi` rig, fully deterministic (client pivot: SlyNyrd `ref` + hybrid parts + ref gear
    lines retired). Cape/hair as deterministic springs, delete ref files, port tiers.js checks, board-chibi.png +
    cape-hair.png → STOP for the client's eye. Then: gear lines on chibi (Sword, Buckler, Staff, Grimoire, Warden × 6),
    then Forge runtime (js/forge-rt.js, banks, rim masks). Half-done ref/gear edits parked in the session scratchpad.
  - Loadout v3: COMMITTED (c9d6cf8). Running follow-ups: glossary sweep (Haiku, docs/GLOSSARY.md only); UI polish (Sonnet:
    hud, menus, touch, screens, ui, play.js; full item names, keycap labels, touch wheel, de-flake play.js "§28 garden boots").
    Gale wind preset exists in js/wind.js; hook it when the Gale cast lands (M4b skills).
- Forge rulings: chibi rig, fully deterministic volumes (no hand-drawn parts, no tracing); dark outline;
  base hero bare (casual clothes only, all gear layered at runtime); approval is by the client's eye (scores are info).

## Next
1. Review glossary sweep + UI polish, commit.
2. Client approves chibi board → gear lines on chibi → Forge runtime.
3. Lighting + status lane (Opus, owns js/render.js, js/elfx.js, js/status.js) after Forge exports rim masks.
4. Loadout UI polish (Sonnet) after the engine lane.
5. After all branches merge: purge tools/qa/old from history (filter-repo + force-push; client-approved).
