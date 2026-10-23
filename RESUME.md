# RESUME — where work stands

Open a new Claude Code chat on this repo. It is the game director (rules: `CLAUDE.md`), and picks up from here.
Plan and lanes: `docs/PRODUCTION.md`. Design: `docs/design/INDEX.md`. Names: `docs/GLOSSARY.md`.

## State (2026-10-22, M4a in progress on branch `claude/m4a`)
- M3 + hot-fix live (PR #9 merged). Ship gate: `node tools/check.js` (`--fast` skips perf + bot). Bot: Turbo + `--seed`,
  `--god` for progression only.
- Done on `claude/m4a`: docs split into `docs/design/` (DESIGN.md deleted), cleanup (tools/qa/old etc. deleted),
  check.js / docs-lint / palette-lint, Wind lane (js/wind.js, wind-check.js), comment sweep.
- M4a lanes all DONE and committed: chibi forge hero (93a9e8c), lighting + status (c889851), enemy forge (43df58a) +
  follow-ups (66092c0: pre-warm, silhouette shadows, hound darker, shaman 38-40 px, status tint atlas). Full check.js 8/8.
  Forge-fight status budget is steady-state over 60 s (0.44 ms; 20 s window is cold cache), see lighting-status-fx.md.
  Loadout v3 (c9d6cf8). Gale wind preset exists in js/wind.js; hook it when the Gale cast lands (M4b skills).
- Art test (client, concept only, git-ignored): the artist (codex-image skill) recreated SlyNyrd design #4; refs in
  tools/forge/ref/, output in tools/forge/out/concept/. Client kept the forge chibi. A layered test (casual base + armour /
  shield / weapon layers, idle sheet + GIFs) is running in tools/forge/out/concept/layers/.
- Forge rulings: chibi rig, fully deterministic volumes (no hand-drawn parts, no tracing); dark outline;
  base hero bare (casual clothes only, all gear layered at runtime); held items keep their own outline (client pick B);
  approval is by the client's eye (scores are info).

- M4a merged (PR #10) and live. codex-image is the studio's raster artist, for art outside the forge only (never hero,
  gear, enemies, item icons). First board (git-ignored, tools/out/art/board.png): title wordmark + dialogue portraits
  for Pip, Elder Stone, Fox kit, palette-snapped to native size (portraits ~44 px shown x2 in the 88 px slot). Awaiting
  the client's eye; on approval: ruling into visual-bible.md, a Sonnet lane embeds them as data-URI PNGs (file://).

## M4b Arena cut (2026-10-23, branch `claude/m4b`)
- **Godot pivot** (client): studio makes no maps; arenas only; human-editable assets; client ports to Godot.
  Minutes: docs/meetings/2026-10-23-godot-handoff.md. Plan M4b → M9 in PRODUCTION.md. Act I maps tagged `maps-pre-godot`.
- Lane worktrees start at origin's default branch: every brief begins with `git merge --ff-only claude/m4b`.
  Director commits each worktree on its branch and merges into claude/m4b; after Gear A + B merge, rerun
  `node tools/forge/build.js chibi` (js/forge-bank/chibi.js is a generated manifest both touch).
- Usage window reset (2026-10-23 ~10:40): full speed. Running: Map cut, Elements, Export v2 (runtime layering: colour +
  depth sheet per piece, Godot layering shader), Raster world-art board (codex-image: Vale terrains, 4 props, 12 skill +
  8 item icons, forge-anchored prompts; client approves by eye before rollout), Balance + QA.
- M10 Godot port planned (studio ports to GDScript, `godot/`); no Godot web/phone perf work (client).
- (old) Usage pace (client, 2026-10-23): **two lanes at a time**. Map cut and Elements (the `verbs` arena; also fixes Glide's
  frost trail) run; next: Balance + QA (touch bot, gloomknight, polish backlog). Elements must `git merge claude/m4b`
  after Map cut merges (both touch arenas.js / game.js in different places).
- Skill visuals merged: decoys, chakram disc, cracks, frost trail, consecrate, Fortress dome, held poses, 79 skill icons,
  Codex Grips (inside BESTIARY; undiscovered Grips show ???). Stress p95 18.2 ms. Balance + QA backlog: action bar
  (hud.js:265) and toast (game.js:501) still use old `skillIcon()`; switch to `uiSkillIcon()`.
- Wave 1 complete. Gear A merged: 11 suits x 3 x 6 (per-piece lazy .atk banks; forge-rt-check all PASS). Polish backlog:
  Frostweave robe reads as a blob (no legs/silhouette).
- Enemy forge merged: 20 rigs at 8 dirs incl. 4 bosses (base + moves rigs); perf p95 18.0 ms. enemyart.js still used by
  ?oldenemy, a pre-load death pop, editor + fx-board. Open: ruins-bestiary-check gloomknight 25 s vs 20 s target.
- Skills + data merged: all 15 weapons, 6 offhands, 12 suits (36 pieces), 14 grips live; balsim green (under-trials 96).
  Queued after: Skill visuals lane (render.js): decoy, chakram disc, cracks, frost trail, Fortress dome, consecrate circle,
  new poses, new skill icons, Codex grip tab.
- Export merged: handoff/ (tiles vale/pinewood/ruins, props, sheets, palettes, zones.json, manifest), Aseprite round trip
  411 sheets identical, godot-sample/ (Godot 4.7.2: import, run, web export 0 errors). Rebuild: tools/export/all.js, godot.js.
- Arenas merged: 14 hand-edited arenas; arena-route 14/14; run-arenas kbm 10/10, pad 10/10; stress p95 17.9 ms.
  QA backlog (Balance + QA lane): touch bot partial (TouchDriver leaks touch points, hangs on pack-spire/bramblehorn;
  full map opens on a top-right tap and has no touch close, hud.js:433); gloomknight 25 s vs 20 s.
- Gear B done + merged (follow-ups too). Polish backlog: bow still faint facing E/NE at T1–T4.
- Merged: Raster embed, Docs pivot rewrite, Gear B (21 lines + follow-ups), Ruins bestiary. Running: wave 1 (Gear A suits, Gear B weapons, Enemy forge, Skills + data, Ruins bestiary),
  wave 2 (Docs pivot rewrite, Arenas, Export tiles/props/sheets).
- Wave 3 after merges: Elements in the world (the `verbs` arena), Map cut (Haiku deletes + save v6 + check.js).

## Next
00. **2026-10-23: Godot now.** Web build retired (tag `js-final`, reference checkout `.claude/worktrees/js-reference`).
    Running: Godot core lane, web-build delete lane, Booklet. Parked: `wip/export-v2-depth`, `wip/qa-forge-fixes`,
    raster board files in `.claude/worktrees/agent-a33649a46d6b8a5c5/tools/out/art/world-board/`.
0. Client ruling 2026-10-23: **M10 Godot port** — the studio ports the code to GDScript (`godot/`, playable project, web);
   M5 gains a port spike (hero, one line, one ladder, Ogre vs golden vectors). Plan: PRODUCTION.md "M10".
1. Merge lanes as they report; `node tools/check.js`; wave 3; ship M4b (Pages shows the Arena list).
2. Client's open questions (minutes end): Godot 4.4 + GDScript/web; hand-edit sprites?; keep Pages; zone brief; install Godot.
3. After M4b merges: purge tools/qa/old from history (needs `pip install git-filter-repo`; client-approved).
