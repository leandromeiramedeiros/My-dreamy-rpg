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
- Usage pace (client, 2026-10-23): **two lanes at a time**. Skills + data and Export run; when one finishes, resume the
  next paused lane (SendMessage, full scope) in this order: Arenas, Enemy forge (re-run play.js + perf, then merge),
  Gear A suits, Gear B follow-ups.
- Merged: Raster embed, Docs pivot rewrite, Gear B (21 lines), Ruins bestiary. Running: wave 1 (Gear A suits, Gear B weapons, Enemy forge, Skills + data, Ruins bestiary),
  wave 2 (Docs pivot rewrite, Arenas, Export tiles/props/sheets).
- Wave 3 after merges: Elements in the world (the `verbs` arena), Map cut (Haiku deletes + save v6 + check.js).

## Next
1. Merge lanes as they report; `node tools/check.js`; wave 3; ship M4b (Pages shows the Arena list).
2. Client's open questions (minutes end): Godot 4.4 + GDScript/web; hand-edit sprites?; keep Pages; zone brief; install Godot.
3. After M4b merges: purge tools/qa/old from history (needs `pip install git-filter-repo`; client-approved).
