# RESUME — where work stands

Open a new Claude Code chat on this repo. It is the game director (rules: `CLAUDE.md`), and picks up from here.
Plan and lanes: `docs/PRODUCTION.md`. Design: `docs/design/INDEX.md`. Names: `docs/GLOSSARY.md`.

## State (2026-10-22, M4a in progress on branch `claude/m4a`)
- M3 + hot-fix live (PR #9 merged). Ship gate: `node tools/check.js` (`--fast` skips perf + bot). Bot: Turbo + `--seed`,
  `--god` for progression only.
- Done on `claude/m4a`: docs split into `docs/design/` (DESIGN.md deleted), cleanup (tools/qa/old etc. deleted),
  check.js / docs-lint / palette-lint, Wind lane (js/wind.js, wind-check.js), comment sweep.
- **Running lanes** (uncommitted work in the tree belongs to them; commit only their paths with `git commit -- <paths>`):
  - Forge runtime (Opus): head/hair APPROVED by the client (1d). Now js/forge-rt.js + js/forge-bank/* + rim-mask export,
    tools/forge-rt-check.js, one script tag in index.html; owns tools/forge/{forge,build,board}.js. Acceptance: byte-equal
    to offline, first compose ≤ 120 ms at CPU ×4, cached ≤ 0.05 ms, stable sha256. No render.js (Lighting does the swap).
  - Forge gear lines (Sonnet): tools/forge/models/gear/{sword,buckler,staff,grimoire,warden}.js × 6 tiers, tier strips,
    loadout-mix.png.
  - Loadout v3 + The Stopped Hour/Hush + save v5 + balsim parity (Opus): js/data, items, itemdata, input, game, hud, menus,
    touch, settings, screens, tools/play.js, act1-route, validate-ids, balsim, save-migrate, tools/qa. Must add the Gale
    wind emitter (`WIND.cast('gale', …)`) and keep the Wind lane's lines in game.js/data.js. check.js is red mid-work.
- Forge rulings: keep the forge (no hand-tracing); hybrid parts (3D rig + per-direction pixel parts); hero 32 px in 48 px;
  base hero bare (casual clothes only, all gear layered at runtime); approval is by the client's eye (scores are info).

## Next
1. Loadout checkpoint (a) green → commit; then (b) lines/pages/grips/Hush, (c) balsim.
2. Forge runtime green → commit; gear lines adapt to the 1d part format (told).
3. Lighting + status lane (Opus, owns js/render.js, js/elfx.js, js/status.js) after Forge exports rim masks.
4. Loadout UI polish (Sonnet) after the engine lane.
5. After all branches merge: purge tools/qa/old from history (filter-repo + force-push; client-approved).
