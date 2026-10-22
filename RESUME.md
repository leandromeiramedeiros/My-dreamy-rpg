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
    - Forge runtime (Opus): body/hair split per weapon class (≤ 64 KB), js/forge-rt.js, js/forge-bank/*, rim masks,
      tools/forge-rt-check.js (+ check.js step), one index.html tag. Owns forge.js, build.js, board.js, png.js.
    - Chibi gear lines (Sonnet): Mythic for the knight kit; new Buckler, Staff, Grimoire (chibi-<line>.js); tiers.js rulings
      (helm/chest/boots ≤ 64 KB, cape ≤ 36, other ≤ 30; L*85 > 15 % hard on T1–T3, warn on T4+).
  - Loadout v3: COMMITTED (c9d6cf8). Running follow-ups: glossary sweep (Haiku, docs/GLOSSARY.md only); UI polish (Sonnet:
    hud, menus, touch, screens, ui, play.js; full item names, keycap labels, touch wheel, de-flake play.js "§28 garden boots").
    Gale wind preset exists in js/wind.js; hook it when the Gale cast lands (M4b skills).
- Forge rulings: chibi rig, fully deterministic volumes (no hand-drawn parts, no tracing); dark outline;
  base hero bare (casual clothes only, all gear layered at runtime); approval is by the client's eye (scores are info).

## Next
2. Review runtime + gear lines; client looks at tier strips; then Lighting lane (render.js swap to forge-rt).
3. Lighting + status lane (Opus, owns js/render.js, js/elfx.js, js/status.js) after Forge exports rim masks.
4. Loadout UI polish (Sonnet) after the engine lane.
5. After all branches merge: purge tools/qa/old from history (filter-repo + force-push; client-approved).
