# RESUME — where work stands

Open a new Claude Code chat on this repo. It is the game director (rules: `CLAUDE.md`), and picks up from here.
Plan and lanes: `docs/PRODUCTION.md`. Design: `docs/design/INDEX.md`. Names: `docs/GLOSSARY.md`.

## State (2026-10-22, M4a in progress on branch `claude/m4a`)
- M3 + hot-fix live (PR #9 merged). Ship gate: `node tools/check.js` (`--fast` skips perf + bot). Bot: Turbo + `--seed`,
  `--god` for progression only.
- Done on `claude/m4a`: docs split into `docs/design/` (DESIGN.md deleted), cleanup (tools/qa/old etc. deleted),
  check.js / docs-lint / palette-lint, Wind lane (js/wind.js, wind-check.js), comment sweep.
- **Running lanes** (uncommitted work in the tree belongs to them; commit only their paths with `git commit -- <paths>`):
  - Chibi hero + cape APPROVED by the client (6840147). Running:
    - Forge runtime DONE (30e353b): per-tier banks (≤ 160 KB), chest socket, bakeSplit, no-churn build. Banks
      (js/forge-bank, ~2.9 MB) NOT committed: rebuild (`node tools/forge/build.js chibi`) after the gear lane lands, then commit.
    - Chibi gear lines (Sonnet) pass 3: helm T4/T5 wings must match tools/forge/out/chibi-tiers.png (find the model
      version among 2693eab/7cf2f23/c8bdc14), helm-wings-compare.png → then show the client the tier strips.
    - Lighting + status (Opus): hero swap in render.js to forge-rt (?oldhero fallback), rim, light-aware shadows, bloom
      whitelist (white-out ≤ 3 %), js/status.js (entities/world/HUD). Owns render.js, elfx.js, status.js.
  - Loadout v3: COMMITTED (c9d6cf8). Running follow-ups: glossary sweep (Haiku, docs/GLOSSARY.md only); UI polish (Sonnet:
    hud, menus, touch, screens, ui, play.js; full item names, keycap labels, touch wheel, de-flake play.js "§28 garden boots").
    Gale wind preset exists in js/wind.js; hook it when the Gale cast lands (M4b skills).
- Forge rulings: chibi rig, fully deterministic volumes (no hand-drawn parts, no tracing); dark outline;
  base hero bare (casual clothes only, all gear layered at runtime); approval is by the client's eye (scores are info).

## Next
1. Gear lane done → rebuild + commit banks → client looks at tier strips. Lighting done → full check.js → client plays the slice.
2. After all branches merge: purge tools/qa/old from history (filter-repo + force-push; client-approved).
