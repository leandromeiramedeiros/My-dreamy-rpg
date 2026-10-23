# My Dreamy RPG

A high-fantasy, dreamy pixel-art action RPG, built from a hand-drawn concept sketch (an isometric floating island with a
HUD of a portrait, three bars and gear icons, plus a diamond compass). Studio plan: [docs/PRODUCTION.md](docs/PRODUCTION.md).
Terms: [docs/GLOSSARY.md](docs/GLOSSARY.md). Design: [docs/design/INDEX.md](docs/design/INDEX.md).

## Status: ported to Godot

The browser build is retired (client ruling 2026-10-23, the Godot pivot). The game is a **Godot 4.7.2 / GDScript** project in
[`godot/`](godot/); the port contract is [docs/PORTING.md](docs/PORTING.md). The studio makes no zone maps (the client builds
them in Godot); it tests systems, enemies and bosses in mockup arenas.

The last web build is preserved, not deleted:

| Where | What |
|---|---|
| git tag `js-final` | the full JavaScript game (`index.html`, `js/`, the old tools) as of the last web build |
| `.claude/worktrees/js-reference` | a checkout of that tag, used as the reference for ports and by `tools/export/props.js` |

Read old code with `git show js-final:js/data.js`, or open the reference checkout. Doc mentions of `js-final:js/<file>` mean that.

## Layout

| Folder | Contents |
|---|---|
| `godot/` | the Godot project (the game) |
| `godot-sample/` | the M5 port spike |
| `handoff/` | everything delivered to the Godot port: `art/` (PNG sheets, JSON sidecars, `.gpl` palettes, `manifest.json`), `data/` |
| `tools/` | the asset tools below |
| `docs/` | plan, design, glossary, porting contract; `docs/meetings/` is an archive |

## Asset tools (Node 20+, no build step)

Every asset ships human-editable (PNG + JSON sidecar, [docs/design/asset-pipeline.md](docs/design/asset-pipeline.md)).

| Command | Does |
|---|---|
| `node tools/forge/build.js chibi` (or `enemies`, or a rig name) | builds a forge rig: sheets, review boards and the layer bank under `tools/forge/out/` and `tools/forge/runtime/forge-bank/` |
| `node tools/forge/board.js`, `tiers.js` | review boards and gear-line checks. `tools/forge/preview.html` is the dressing room |
| `node tools/export/all.js [--only tiles,props,art,palettes] [--force] [--dry] [--check]` | the art export into `handoff/art/` under the manifest rule (a hand-edited file is skipped; `--check` fails when anything would change) |
| `node tools/export/godot.js` | stages `handoff/` into the Godot project |
| `node tools/export/aseprite.js` | the Aseprite round trip (`tools/export/aseprite/*.lua`) |
| `node tools/forge-rt-check.js` | the forge runtime (`tools/forge/runtime/forge-rt.js`) against the offline forge, in headless Chromium |
| `node tools/docs-lint.js` | dead links and doc rules under `docs/` |
| `node tools/palette-lint.js [--strict]` | colour-ramp rules for forge materials and ELFX rows |
| `node tools/check.js [--fast] [--only a,b]` | the ship gate: docs-lint, forge-rt, export determinism, and `tools/godot/check.js` when present |

Needs Playwright (`npm i`; the studio box uses its own Chromium, never `playwright install`) for `forge-rt-check` and for the
`props` part of the export. `props` renders the old web game, so it runs against the reference checkout (set
`JS_REFERENCE=<dir>` to point elsewhere) and is skipped when no checkout exists.

Tools that read old web code keep a copy under `tools/`: the ground grammar (`tools/export/lib/util.js`, `maps.js`), the HUD
palette (`tools/export/lib/ui.js`) and the element colour rows (`tools/lib/elfx.js`).
