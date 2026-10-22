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
    - Forge DONE: chibi hero, runtime, banks committed (93a9e8c), held-item outlines (client pick B), original helm wings.
    - Lighting + status DONE (c889851). Full check.js 8/8 green (director run).
    - Enemy forge COMMITTED (43df58a): Bramble Shaman, Ogre, Mountain Troll, Shade Hound (quadruped rig), drawEnemy swap.
      Running follow-ups (Opus, enemy lane): zone pre-warm hook (game.js/world.js, minimal), enemy shadow silhouettes,
      shaman ~39 px tall, Shade Hound reads too pale in-game, perf scene `--scene=pine-forge-fight`, full check.js.
    - status.js tint-cache perf (Opus, lighting lane, status.js only): status ≤ 0.5 ms at ×4 with 6 forge enemies
      (now 0.66–1.1).
  - Loadout v3: COMMITTED (c9d6cf8). Running follow-ups: glossary sweep (Haiku, docs/GLOSSARY.md only); UI polish (Sonnet:
    hud, menus, touch, screens, ui, play.js; full item names, keycap labels, touch wheel, de-flake play.js "§28 garden boots").
    Gale wind preset exists in js/wind.js; hook it when the Gale cast lands (M4b skills).
- Forge rulings: chibi rig, fully deterministic volumes (no hand-drawn parts, no tracing); dark outline;
  base hero bare (casual clothes only, all gear layered at runtime); approval is by the client's eye (scores are info).

## Next
1. Both follow-ups green → commit → full check.js → client plays the M4a slice. OPEN QUESTION to the client: play locally now
   (local server, phone over Wi-Fi) or after fixes on the live site (merge M4a PR to claude/dreamy-rpg-concept).
2. After all branches merge: purge tools/qa/old from history (filter-repo + force-push; client-approved).
