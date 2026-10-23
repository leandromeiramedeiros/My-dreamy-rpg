# Handoff package

What the studio delivers to the client for the Godot port. Contract: [../docs/PORTING.md](../docs/PORTING.md).
Asset formats: [../docs/design/asset-pipeline.md](../docs/design/asset-pipeline.md). Placement briefs: [../docs/design/world-brief.md](../docs/design/world-brief.md).

Rows marked **planned** do not exist yet; the Export lane creates them. `handoff/art/` is the exporter's output: never edit it in place
during the studio's milestones (a file whose hash differs from `art/manifest.json` is skipped on rerun; `--force` overwrites).
After handoff, edit freely: the client edits sprites, gear, tiles and props by hand (how-to: [asset-pipeline.md](../docs/design/asset-pipeline.md)). Target: Godot 4.7.2, GDScript, web builds.
GitHub Pages comes down at handoff; the JS build stays in the repo as the reference only.

| Path | Contents | Status |
|---|---|---|
| `art/hero/` | `body.png` + sidecar | planned (M5) |
| `art/gear/` | `<piece>.t<N>_front.png` and `_back.png` + sidecars: 36 armour pieces and 21 held lines x 6 tiers | planned (M5 partial, M9 full) |
| `art/enemies/`, `art/bosses/` | One sheet per rig + sidecar | planned (M5 partial, M6 and M7 full) |
| `art/props/` | Props, tree trunks and canopies, decal atlas + sidecars | planned (M9) |
| `art/tiles/<zone>/` | Blob-47 terrain, cliff, coast and water atlases per zone (+ underground) | planned (M9) |
| `art/ui/` | Icon atlas, 9-slice, BMFont fonts | planned (M8 and M9) |
| `art/vfx/` | Grey element sheets + `elfx.json` | planned (M9) |
| `art/raster/` | Wordmark, portraits, key art | planned (M9) |
| `art/palettes/` | `.gpl` per zone, per material, `ui.gpl` | planned (M9) |
| `art/manifest.json` | sha256 per exported file | planned (M5) |
| `data/` | JSON + CSV export of every table | planned (M5, v2 in M9) |
| `data/zones.json` | One object per zone: name, sections, hooks, pacing, encounter slots, secrets, set pieces, signature moment. Hand-edited; the source of the world brief | planned (M9) |
| `audio/` | Rendered OGG + `sfx.json` | planned (M8) |
| `godot-sample/` | Minimal Godot project: one layered hero, one enemy, one terrain set, one Light2D (the import proof) | planned (M5) |

Also in the package, outside this folder:
* `tools/export/godot_import.gd`: the sidecar to `SpriteFrames` and TileSet importer (planned, M5).
* `docs/PORTING.md` and `docs/design/world-brief.md`.
* The JS build as the playable reference (mockup arenas only, see [../docs/design/arenas.md](../docs/design/arenas.md)).
* The forge (`tools/forge/`): a tool the client may rerun, piece by piece.
