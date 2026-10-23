# Karea's Dream (Godot 4.7.2)

## Open it
Godot 4.7.2 > Import > pick `godot/project.godot`. The first open imports the art (a minute). Press F5: the game boots to
the **Arena list** (studio test arenas). Pick one; Esc goes back to the list.

Controls: WASD / left stick moves, M1 / RT attacks (the HAND item's action), V / B dodges. Every binding is in
Project Settings > Input Map.

## Where things live
| Folder | What |
|---|---|
| `res://data/` | Every game table as editable resources: `items/`, `skills/`, `effects/`, `enemies/`, `bosses/`, `statuses/`, `reactions/`, `loot/`, `affixes/`, `gems/`, `grips/`, `fx/`, `sfx/`, `hero/hero.tres`, `rules/` (game rules, status rules, pairings) |
| `res://data/seed/` | The seed JSON the `.tres` files were made from (one time; see below). Not read by the game |
| `res://scripts/data/` | The resource classes (`ItemData`, `SkillData`, `ActionBlock`, `EnemyData`, `FxData`...): what fields each table has |
| `res://scripts/systems/` | Hero, hero doll, enemy, combat, FX player, arena, props |
| `res://scenes/` | `hero/hero.tscn`, `enemies/enemy.tscn`, `props/prop.tscn`, `ui/` |
| `res://art/` | The handoff art: sprite sheets (SpriteFrames `.tres` beside each PNG + its JSON sidecar), tiles (`tiles/<zone>/<zone>_tileset.tres`), props |
| `res://arenas/` | The studio's mockup arenas (rebuilt by the arena importer: do not hand-edit) |
| `res://zones/` | **Yours**: every real map. No studio tool writes here |

## Make a map and drop an enemy in
1. New scene, root `Node2D`, attach `res://scripts/systems/arena.gd` (it gives the map its grid and Esc).
2. Add a `TileMapLayer` named `Ground`, set its Tile Set to `res://art/tiles/vale/vale_tileset.tres` and paint with the
   Terrains tab.
3. Add a `Node2D` named `Entities`, turn on Ordering > Y Sort Enabled. Drag `res://scenes/hero/hero.tscn` into it.
4. Drag `res://scenes/enemies/enemy.tscn` into `Entities`, then drag an enemy from `res://data/enemies/` (or a boss from
   `res://data/bosses/`) onto its **Data** field in the Inspector. The look shows at once.
5. Props: drag `res://scenes/props/prop.tscn` in and drop a sidecar from `res://art/props/*.json` on **Sidecar**.
6. Save under `res://zones/<zone>/`.

## Edit an item or a skill
Double-click `res://data/items/sword.tres`: the Inspector shows its groups (Skills, Stats, Look with Held (Weapons Out), FX). Change a
number and save; the game reads it next run. The HAND action is a skill: click **Action** to open
`res://data/skills/sword_action.tres`, then **Blocks**: each block is one step (a Cone, Projectile, Zone or Dash) with
damage, element, status build, knockback, anim name and its own FX / SFX slots. Add a block with the array's "Add
Element" and pick its type. FX slots take an `FxData` from `res://data/fx/` (layers: particles, sprite anim, light,
trail, tint, decal, shake, hit stop, sound); an empty slot uses the default from `rules/game_rules.tres`.

The `todo` field (Port group) says what JS behaviour the resource still lacks (wave 2).

## Rebuild from the JS reference (studio only)
Run from the repo root, in this order; each step is safe to rerun:
1. `node tools/godot/art.js` copies `handoff/art` into `res://art` and builds the SpriteFrames and TileSets.
2. `node tools/godot/seed.js` writes `res://data/seed/*.json` and the `.tres` files. An existing `.tres` is **kept**
   (your edits win); `--force` overwrites.
3. `node tools/godot/arenas.js` rebuilds `res://arenas/*.tscn`.
4. `node tools/godot/check.js` is the gate: import, every `.tres` and arena loads, the dummies hit test, a screenshot in
   `tools/out/godot/dummies.png`.

The same importers run in the editor: open `addons/seed_import/seed_import_editor.gd` or
`addons/arena_import/arena_import_editor.gd` and use File > Run.
