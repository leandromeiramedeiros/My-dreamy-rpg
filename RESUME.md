# RESUME — where work stands

Open a new Claude Code chat on this repo. It is the game director (rules: `CLAUDE.md`), and picks up from here.
Plan and lanes: `docs/PRODUCTION.md`. Design: `docs/design/INDEX.md`. Names: `docs/GLOSSARY.md`.

## State (2026-10-22, M4a in progress on branch `claude/m4a`)
- M3 + hot-fix live (PR #9 merged). Ship gate: `node tools/check.js` (`--fast` skips perf + bot). Bot: Turbo + `--seed`,
  `--god` for progression only.
- Done on `claude/m4a`: docs split into `docs/design/` (DESIGN.md deleted), cleanup (tools/qa/old etc. deleted),
  check.js / docs-lint / palette-lint, Wind lane (js/wind.js, wind-check.js), comment sweep.
- **Running lanes** (uncommitted work in the tree belongs to them; commit only their paths with `git commit -- <paths>`):
  - Forge (Opus): head/face less blobby + hair as secondary motion (trail/lift variants), piece size caps (64 KB body/armour,
    30 KB other). Owns tools/forge/forge.js, build.js, board.js, ref*.js, humanoid-anims.js. Delivers
    tools/forge/out/board-ref.png + head-hair-zoom.png → show the client.
  - Forge gear lines (Sonnet): tools/forge/models/gear/{sword,buckler,staff,grimoire,warden}.js × 6 tiers, tier strips,
    loadout-mix.png.
  - Loadout v3 + The Stopped Hour/Hush + save v5 + balsim parity (Opus): js/data, items, itemdata, input, game, hud, menus,
    touch, settings, screens, tools/play.js, act1-route, validate-ids, balsim, save-migrate, tools/qa. Must add the Gale
    wind emitter (`WIND.cast('gale', …)`) and keep the Wind lane's lines in game.js/data.js. check.js is red mid-work.
- Forge rulings: keep the forge (no hand-tracing); hybrid parts (3D rig + per-direction pixel parts); hero 32 px in 48 px;
  base hero bare (casual clothes only, all gear layered at runtime); approval is by the client's eye (scores are info).

## Next
1. Loadout checkpoint (a) green → commit; then (b) lines/pages/grips/Hush, (c) balsim.
2. Client approves head/hair → gear lines continue; then Forge runtime (js/forge-rt.js, banks) and hero swap in render.
3. Lighting + status lane (Opus, owns js/render.js, js/elfx.js, js/status.js) after Forge exports rim masks.
4. Loadout UI polish (Sonnet) after the engine lane.
5. After all branches merge: purge tools/qa/old from history (filter-repo + force-push; client-approved).
