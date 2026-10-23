# Asset pipeline: human-editable art, audio and data

Terms: [../GLOSSARY.md](../GLOSSARY.md). The forge: [visual-bible.md](visual-bible.md). Delivery contract: [../PORTING.md](../PORTING.md).
Package layout: [../../handoff/README.md](../../handoff/README.md). Lighting data: [lighting-status-fx.md](lighting-status-fx.md).

## Rule
The client hand-edits **both** sprites and gear **and** tiles and props, so every sheet, including the gear `_front`/`_back` splits, stays edit-friendly. Every asset ships as **PNG sheets + one JSON sidecar per sheet + `.gpl` palettes**, laid out so Aseprite, Godot and a human agree
without a tool. Flat colour is the truth; lighting data is an optional second sheet. The exporter `tools/export/art.js` reads the
forge and the frozen art and writes `handoff/art/`.

## Sheet layout
| Rule | Value |
|---|---|
| Grid | One fixed cell per sheet (`frame` from the model: 52x56 hero, 68x72 or 80x88 enemies, 96 or 128 bosses) |
| Rows | The 8 directions in forge order S, SE, E, NE, N, NW, W, SW (one row for amorphous) |
| Columns | Frames, anim after anim, in the fixed order idle, walk, cast, dash, hit, death, block, channel, carry |
| Split | One sheet per Core and one per Atk class (`<unit>.atk.<class>.png`), as the forge banks split today |
| Pivot | `origin` from the model: the pixel under the feet centre, the same in every cell of a unit. Godot `offset = -origin` |

## Sidecar `<sheet>.json`
```
{ cell:[w,h], origin:[x,y], dirs:[..],
  anims:{ name:{ from, count, ms:[..], loop } },
  sockets:{ dir:{ anim:[ { name:{x,y,front} } ] } },
  layer, zorder:{ dir:int }, palette }
```
* Sockets: handR, handL, head, chest, cast, tip, capeTop, capeHem. `front` says whether the socket draws over the body.
* `blob47` sidecars (tiles) add the template description (below). A sidecar never holds numbers that belong to game data.

## Units and the depth split
**Client ruling 2026-10-23: the `_front`/`_back` split is retired.** Every gear piece ships as **one colour sheet plus one depth
sheet**, and the renderer layers every equipped piece at runtime, per pixel (nearest wins), in the JS build (forge-rt already does)
and in Godot (a layering shader). The Export v2 lane rewrites this section and the hand-edit steps below; until then they describe the old split.

* Hero: `hero/body.png` (body and hair) plus `gear/<piece>.t<N>.png` for 36 armour pieces x 6 tiers and 21 held lines x 6 tiers.
* **Depth split:** each gear piece exports as two sheets, `<piece>_front` and `<piece>_back`, split against the body's depth per pixel
  by the forge (`--split-body`). Inner lines and the held item's own outline are baked into the piece's pixels.
* Runtime order: the body, then every `_back` under it, every `_front` over it, ordered by `zorder[dir]`.
* Fidelity loss, named: pixel interleave between two gear pieces (cape against shield) is gone; front/back against the body stays.
* Enemies and bosses: one sheet per rig (`enemies/<id>.png`, `bosses/<id>.png`), one layer, the same sidecar.

## Editing a gear piece by hand
1. Open `gear/<piece>.t<N>_front.png` and `_back.png` in Aseprite or any pixel editor; the grid is in the sidecar (`cell`, `dirs`, `anims`). Load `hero/body.png` as a reference layer.
2. Keep both sheets the same size, the same grid and the same pivot (`origin`). Never move pixels across cells.
3. A pixel belongs to `_front` (draws over the body) or `_back` (under it), never both at the same position. Moving a part across the body
   means erasing it from one sheet and painting it in the other, in the same cell.
4. Keep the piece's inner lines and the held item's outline in the pixels; they are baked in. Stay inside the sidecar palette (`palettes/`).
5. Save in place. The manifest hash now differs, so the exporter skips the file and lists it on any rerun; `--force` would overwrite it.
Tiles and props: edit the PNG in place the same way; keep the cell size, and for `blob47` keep the template layout.

## World tiles
Per zone, 32x16 isometric diamond cells (Godot TileSet shape Isometric), rasterised by pinning the noise to a fixed seed and sampling each neighbour configuration.
* `tiles/<zone>/terrain_<name>.png`: the **blob-47 template** (standard 12x4 blob layout, recorded in the sidecar as `blob47`) plus 4 plain variants.
* `tiles/<zone>/cliff_<zone>.png`: strata faces for 1 to 3 levels, corners, lip, wedge shadows.
* `tiles/<zone>/coast.png`: skirt bands (cells padded to an even height so the Godot texture origin is whole). `tiles/<zone>/water.png`: 4 frames.
* Zone records (name, theme, palette, terrains, cliff/coast/water files) live in the editable `handoff/data/zones.json`.
* Known gap: the engine's multi-tile grass patches are not tiles; paint them in Godot as a decal or second terrain layer.
* `node tools/export/all.js` rebuilds `handoff/`; `node tools/export/godot.js` refills `godot-sample/` and runs the Godot checks (do not hand-edit `godot-sample/`).
* Godot reads the template with a TileSet terrain set in "Match Corners and Sides" mode ([../PORTING.md](../PORTING.md), terrain import).

## Props and trees
* `props/<id>.png` plus sidecar `{ origin, collider r, canopy:{ box, fade } }`.
* Trees are two PNGs (`<id>_trunk`, `<id>_canopy`), one frame each; wind becomes a canopy shader fed the [wind.md](wind.md) curve as uniforms.
* The 16 ground-decal kinds per zone are one decal atlas.

## Icons, UI, fonts, raster
* `ui/icons.png`: 24x24 atlas plus `icons.json` (id to cell). `ui/panel9.png`: 16x16 9-slice.
* `ui/font_small.png` plus `.fnt` (BMFont); `font_body` likewise.
* Raster art ([visual-bible.md](visual-bible.md)) ships at native size from `tools/out/art/`.

## VFX and lighting data
* `vfx/<element>_<motif>.png`: grey sheets (4 levels, one column per frame) plus `elfx.json` (ramps, motion model, rates, light).
* Normal sheets: an optional `<sheet>_n.png` from the forge's stage-A normals (`--normals`), for `CanvasTexture.normal_texture` and `Light2D`.
  The Rim mask is replaced by a two-line rim shader on the normal. A hand-edited colour PNG with a stale normal degrades gracefully.

## Palettes
`palettes/<zone>.gpl`; `palettes/material_<name>.gpl` (metal T1 to T6, gold, leather, cloth, gems); `palettes/ui.gpl` from [hud-ui.md](hud-ui.md).

## Audio and data
* `tools/export/audio.js` renders every motif, zone loop and SFX recipe through `OfflineAudioContext` to `handoff/audio/*.ogg`
  plus `sfx.json` (recipe, bus, pan rule). Source: [audio.md](audio.md).
* `tools/export/data.js` emits `handoff/data/*.json` and `.csv` one way from the JS tables. The JS stays the source of truth;
  `js-final:tools/validate-ids.js` checked the export round-trips every id (web build, retired).

## Naming and tree
snake_case ids equal the game ids (`validate-ids` checks them).
`handoff/art/{hero,gear,enemies,bosses,props,tiles/<zone>,ui,vfx,raster,palettes}`.

## Export manifest rule
* The forge stays the generator. `handoff/art/` is the export and is **never edited in place during the studio's milestones**.
* The exporter writes `handoff/art/manifest.json` (sha256 per file). On a rerun, a file whose hash differs from the manifest was
  hand-edited: it is skipped and listed; `--force` overwrites.
* After handoff the client edits PNGs freely (the manifest protects hand edits); the forge is a tool in the package he may rerun, piece by piece.

## Embed step
Retired with the web build: the data-URI embed step (`js-final:tools/freeze.js`, `js-final:tools/raster-embed.js`, generated `js-final:js/art-raster.js`). Godot reads the PNG files in `handoff/art/` directly.

## Determinism
The forge gate stays: sha256 stable, 0 lone pixels, runtime equals offline byte for byte. The Dressing room stays.

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
