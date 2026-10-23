# Asset pipeline

## Aseprite
Every handoff sheet (`handoff/art/**.png` + its `.json` sidecar) opens in Aseprite 1.3 for hand edits.
- **Open a sheet:** `node tools/export/aseprite.js to-ase handoff/art/hero/body.json` writes `tools/out/aseprite/body.aseprite`.
  Character sheets get one frame per cell, a tag per anim and direction (`walk_S`, `idle_NE`...), frame durations from the
  sidecar `ms`, the pivot as slice `origin`, and the palette from the sidecar's `.gpl`. Tile, prop and decal atlases are a single
  frame with Aseprite's grid set to the cell size (View > Show Grid).
- **Gear:** `to-ase handoff/art/gear/cape.t3.json` gives three layers on the body's grid and origin: `cape.t3_back` (drawn behind
  the hero), `body` (locked, reference only, never written back) and `cape.t3_front`. Paint each half on its own layer and keep
  the piece's pixels inside the cell.
- **Save back:** `node tools/export/aseprite.js from-ase tools/out/aseprite/cape.t3.aseprite` rewrites the same grid PNGs in
  place (same cell size, rows S, SE, E, NE, N, NW, W, SW; the sidecar is not touched). Do not add, remove or reorder frames.
- **Plain import also works:** File > Import Sprite Sheet, Type "By Rows", cell = the sidecar's `aseprite.cell`.
- **Your edits are kept:** the exporter (`node tools/export/all.js`) skips any file whose hash differs from
  `handoff/art/manifest.json` and lists it as hand-edited; `--force` overwrites.
- **Godot:** it reimports a changed PNG on focus, and the SpriteFrames and TileSet only point at the PNG, so nothing needs
  rebuilding. Rerun the importer only after a sidecar change (`node tools/export/godot.js` for the sample).
- **Proof:** `node tools/export/aseprite.js roundtrip-check --all` exports every sheet to `.aseprite` and back and checks the PNGs
  are byte-identical (411 sheets, 741 PNGs).
