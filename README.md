# My Dreamy RPG — concept build

A high-fantasy, dreamy pixel-art action RPG that runs in the browser, built from the hand-drawn concept sketch:
an isometric floating island (house, forests, a cliff with a waterfall feeding a river) with a HUD of a portrait,
three bars and gear icons in the bottom-left, plus a diamond compass/minimap in the bottom-right with a "!" pointing NE.

## Play

**Play online:** https://leandromeiramedeiros.github.io/My-dreamy-rpg/

Open `index.html` in a browser (Chrome, Edge, Firefox or Safari). Nothing to build or install.
Opening the file directly works. You can also serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Editor

Open **`editor.html`** (online: https://leandromeiramedeiros.github.io/My-dreamy-rpg/editor.html) to edit the game.

* **Map tab.** Paint tiles, raise and lower the ground, place props, set the start flag and add portals.
  * Tile types: grass, flowers, path, water, bridge, stairs, flagstones, runes, moss, pillars and void.
  * Props: trees, giant pines, bushes, moss, logs, stumps, rocks, lanterns, crystals, mushrooms,
    toadstools, sunbeams, signs, braziers, shrines, the cottage, and the foxes and rabbits.
  * Portals link maps together and can begin closed.
  * **+ New map** makes a new island with either theme. **Map settings** renames, resizes or deletes a map.
* **Logic tab.** Each map has a list of trigger cards in the form *WHEN … (ONLY AFTER …) THEN …*.
  * WHEN can be: the map starts, a timer, the player enters an area, no enemies are left, enough enemies
    defeated, or boss or player HP dropping below a percentage.
  * THEN can: spawn enemies or the boss, show a banner or message, set the objective, heal, open or close
    portals, defeat all enemies, shake the screen, play a sound, send the player to another map, or wait.
  * The existing waves and boss fight are built this way, so you can edit them.
* **Enemies tab.** Every enemy is editable: name, behaviour, HP, speed, damage, range, cooldown, wind-up,
  size and hit area. The behaviours are: hops and splats, keeps distance and shoots, telegraphs a lunge,
  or winds up a heavy smash in a cone or circle.
  * **✎ Edit pixels** opens a simple pixel editor with pen, eraser, fill, picker, mirror, palette, resize,
    flip and undo. It also works on the built-in monsters.
  * **+ New enemy** copies one into a new creature you can repaint and spawn from the Logic tab.
  * Animals (fox and rabbit) are repainted the same way.
* **Tuning tab.** Change the numbers for the player and every skill.
* **▶ Play-test** opens the game on your draft in a new tab. Drafts autosave in your browser.
  **Export** and **Import** download or load the whole world as `world.json`.
* **⬆ Publish** commits `js/world.js` to this repository through the GitHub API, and GitHub Pages then updates
  the live game within about a minute. The first time, open **GitHub settings** and paste a fine-grained token
  that has access to this repository with *Contents: Read and write*. The token is kept only in your browser.

Shortcuts: V select · B tiles · H height · O props · E erase · S start · P portal · G grid · Ctrl+Z / Ctrl+Y ·
Delete · right-drag or Space+drag to pan · mouse wheel to zoom.

## Controls

**Touch (phones / tablets, best in landscape):** put your left thumb down anywhere on the left side
for a floating joystick. Hold the big button on the right to attack. Tap a skill to cast it at the
nearest enemy, or drag from the skill to aim and release to cast. GEAR opens the loadout, HELP shows
the controls, FULL goes fullscreen.

**Keyboard and mouse:**

| Input | Action |
|---|---|
| WASD / arrows | Move |
| Mouse | Aim |
| Left click (hold) | Weapon basic attack |
| Q · E · R | Weapon skills (R is the ultimate) |
| F | Chest armour skill |
| C | Helmet skill |
| Shift / Space | Boots skill (uses stamina) |
| 1 · 2 · 3 | Character skills (your choice) |
| Tab / I | Loadout screen |
| H | Help · M toggles sound |

## Concept

* **Map 1: Whispering Vale.** A peaceful floating island with no enemies. You can explore it and try your skills on the training
  dummies. A rift glows on the plateau to the **north-east**, marked with a "!" on the compass.
* **Misty Pinewood.** A second rift in the Vale, south of the start, leads to a dawn pine forest with
  giant pines, thick mist, sunbeams, toadstools and moss. Foxes and rabbits wander it and bolt when you
  get close. Lesser **ogres** guard the sunlit clearing, and two giant **mountain trolls** wait in the
  raised den to the north.
* **Map 2: Gloomspire Ruins.** Stepping into the rift starts three waves of monsters (gloom slimes, ranged wisps and lunging
  shade hounds), followed by the boss, **the Gloam Warden**. The Warden telegraphs a cleave, a slam, projectile volleys and a
  charge. It enrages at 50% HP, calls adds and starts a void rain. Once it falls, a rift home opens.
* **Albion-style skills: you are what you wear.**
  * The weapon gives the basic attack plus Q/E/R. Each slot has options you pick between.
    The weapons are the Dawnblade sword, the Starfall Staff and the Moonbow.
  * The chest gives F, the helmet gives C and the boots give Shift. There are three armour sets.
  * **Character skills (1/2/3) are chosen freely** from six: Second Wind, Arcane Orbit, Chain Lightning, Dreamveil,
    Blessing of Dawn and Shooting Star.

## Tech

Plain HTML5 Canvas 2D with no runtime dependencies, written as classic scripts so it also runs from `file://`.

* **Sprites** (the hero with three helmet shapes and a four-frame walk, weapons, monsters, the boss, trees,
  bushes, rocks, crystals, lanterns, props and the cottage) are PNG images bundled in `js/sprites.js` as data URIs,
  so the game still runs from `file://`.
* The hero is drawn in Knight colours. At load time the game swaps those colours for whatever helmet, chest and
  boots you wear.
* The ground, cliffs, the island underside, skies, mountains, clouds and skill icons are still **generated
  procedurally** (world-continuous noise with ordered Bayer dithering). If `js/sprites.js` is missing, the older
  procedural sprites are used instead.
* The scene renders at **480×270** and is scaled up 2× with nearest-neighbour filtering. The HUD is drawn crisply at 960×540.
* Post-processing:
  * **Fake lights:** a half-resolution lightmap of radial lights is multiplied over an ambient tint, then additive halos
    are drawn on top.
  * **Bloom:** a bright-pass made by cubing the colours through self-multiplication, at ¼ and ⅛ resolution, added back
    with `lighter`.
  * **Fog and mist:** tileable noise layers drifting with parallax, waterfall spray and chimney smoke.
  * God rays, a colour grade and a vignette.

| File | Contents |
|---|---|
| `js/util.js` | Noise, dithering, pixel buffers, iso projection |
| `js/art.js` | Procedural sprites |
| `js/maps.js` | Map building, ground rasteriser, cliffs and underside |
| `js/data.js` | Gear roster and skills |
| `js/game.js` | Player, combat, enemies, boss, waves, audio |
| `js/render.js` | Scene and post-processing |
| `js/hud.js` | HUD, loadout screen and minimap |
| `js/touch.js` | Touch joystick, skill wheel and drag-to-aim |
| `js/sprites.js` | Sprite images |
| `js/world.js` | **The world data:** maps, triggers and tuning, written by the editor |
| `editor.html`, `js/editor.js` | The map and logic editor |
| `js/main.js` | Main loop, input and transitions |

Showcase URL parameters: `?scene=play`, `?scene=arena`, `?scene=boss`, `?scene=loadout`, `?scene=portal`, `&weapon=starfall|moonbow`.
