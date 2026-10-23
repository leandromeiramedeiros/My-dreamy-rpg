# Visual bible: sprites, forge pipeline, tier and rarity FX

Terms: [../GLOSSARY.md](../GLOSSARY.md). Gear lists: [armour-suits.md](armour-suits.md), [weapons-and-skills.md](weapons-and-skills.md).
Runtime lights and status layers: [lighting-status-fx.md](lighting-status-fx.md).

## Sprite spec
* 3/4 top-down view. Eight true directions, never mirrored. Forge camera elevation 28 degrees.
* **Hero rig: `chibi`** (client ruling 2026-10-22, replaces the SlyNyrd `ref` rig): big head, short body, about 31 px tall inside a 52x56 frame (room for weapon reach). The forge is the only 8-direction sprite source.
* **The base hero wears nothing equippable** (client ruling): casual clothes, hair and skin only. Cape, weapons, shields, armour, belts and every other equippable are separate forge pieces composited at runtime over the base.
* **Forge method: fully deterministic** (client ruling 2026-10-22): every pixel comes from 3D volumes on the rig, through the G-buffer and palette resolve. No hand-drawn pixel parts, no tracing. Hair and cape motion are deterministic springs in the rig.
* Directions: 8 for every creature with a facing (humanoids, beasts, bosses); 1 for amorphous and swarm. Bosses scale 2 to 3 in a 96 or 128 px frame.
* Frames: 8 directions x 43 = 344 per humanoid piece.

| Animation | Frames and timing |
|---|---|
| Idle | 6 frames, 200 / 200 / 400 / 200 / 200 / 400 ms; upper body sinks 0 / 1 / 2 / 2 / 1 / 0 px |
| Walk | 6 frames at 100 ms; head bob -1 / -1 / +2 with a pass frame; no separate run |
| Attack | 6 frames: anticipation, smear, follow-through (+1 px reach, no smear), recover |
| Others | hurt 1, death 3 (+ dissolve), dodge 4, cast 4, block 1, channel 2 (loop), carry 1 |

* Attack timings by class: Blades 400 ms, Shadows 300, Shots 360, Foci 480, Greatarms 620 (250 / 50 / 50 / 50 / 150 / 70).
  The hit lands on the first smear frame. Smears are angular, from the weapon-tip socket path, one flat light tone (#fafaf6) on frames 1–3.
* Hair and cape are lagged springs driven by the chest (deterministic: warmed up over full loops, then sampled by anim and frame). The cape keeps its length; only its swing and billow change.
* Facing: the hero faces the aim direction while attacking, casting, blocking or holding (sticky 0.4 s), otherwise the move direction.
  Legs always play the walk cycle. The hitbox is data, never the sprite.

## Colour and lint
* Dark outer outline (as the first chibi), inner part lines between parts. Light from top-left-front.
* Hue-shifted 4-step ramps (shadow toward violet, light toward warm) plus 1 glint tone on metal and gems.
* Lint (`tools/palette-lint.js`): no lone 1 px cluster, clusters at least 2 px, at most 5 tones per material, at most 24 colours per piece.

## Forge pipeline
`tools/forge/models/chibi.js` (rig, bare base) and `chibi-gear.js` / `chibi-<line>.js` (tiers T1 to T5 plus Mythic)
then `node tools/forge/build.js chibi` (same input gives byte-identical output; only changed files are rewritten)
then `js/forge-bank/chibi.js` (body + hair) and `js/forge-bank/<line>.t<N>.js` (one file per tier, `FORGE_BANK`, lazily inserted `<script>`)
then `js/forge-rt.js` (engine copied from forge.js by build.js): `FORGE.sheet(rig, loadout)` once per loadout change, time-sliced over 3 frames, last 6 loadouts cached; `FORGE.frame` per draw
then render.js `drawPlayer` / `drawEnemy` / `drawNpc`: one `drawImage` per frame.
* Each unit (body, hair, gear piece) ships as a core sheet (every anim except attacks) plus one atk sheet per weapon class;
  only the equipped HAND class's atk sheet is decoded.
* Layering at runtime is a depth resolve of baked pieces (nearest layer wins, inner line between parts on a depth jump).
* Held items keep their own outline (client ruling 2026-10-22, `ownOutline: { weapon, offhand }`): wherever a weapon, shield or companion is in front of another unit, its edge gets the outline colour. Armour, helm and cape do not, so faces stay clean.
* Budgets (CPU ×4 phone proxy): first full-loadout sheet ≤ 120 ms; cached frame ≤ 0.05 ms; bag paper doll one direction ≤ 12 ms.
* Size caps per shipped sheet: helm, chest, boots ≤ 64 KB; cape ≤ 36 KB; other pieces ≤ 30 KB. One line bank file per tier ≤ 160 KB. Starter bundle ≤ 400 KB.
* Sockets exported: handR, handL, head, chest, cast, tip, capeTop, capeHem. Also a 1-bit rim mask with a facing hint (`FORGE.rim`) and a bbox.
* Approval gate: the client's eye on the chibi board and tier strips (quality bar: the first chibi knight's 5 tiers). Checks: sha256 stable, 0 lone pixels, runtime equals offline byte for byte.
* Tools: `build.js`, `forge.js`, `tiers.js` (gear-line checks), `tools/forge-rt-check.js`, `icons.js` (24x24 item icons from the same models at a fixed 3/4 pose),
  `board.js`, `preview.html` (dressing room). The `hero` rig is a regression fixture for one milestone; `ref` is retired.

## Gear scope
12 suits x 3 pieces x 6 tiers; 15 weapon lines + 3 shields + 3 companions = 21 lines x 6 tiers. Icons come from the forge.

## Tier and rarity FX (`FORGE_FX`)
* Tier T1 to T5 changes geometry: each tier keeps the one below and adds plates, trim, gems, crests, wings.
  T5 "made of light" uses flat emissive materials. Mythic adds a unique part and hue-cycling emissive materials.
* Rarity: Common and Uncommon change palette (Uncommon adds a trim glint). Rare adds a rim light in the implicit's element colour.
  Epic lights its emissive materials and adds a light (radius 24, alpha 0.25).
  Legendary pins ELFX emitters to sockets and adds a layered swing sound.
  Mythic adds an aura, a hue cycle and a trail at 500 kills.
* Gems tint the socket pixel; a tempered item gets a bright edge highlight.
* The look escalates grey, ornate, sun- or moon-etched, glowing, made of light.

## Icons
* 24x24 hand-shaded in `ICONS.skill`, `item`, `gem`, `misc` and `frame`. Skill icons have an element-coloured frame.
  Item icons show rarity with a frame border, glow and gem dots.
* Misc icons: potion, Dream Dust, Socket Rune, chest, XP, gold key, shrine, lore tablet.

## Raster art (outside the forge)
* Client ruling 2026-10-23: the artist (`codex-image` skill) paints raster art **outside the forge only**: the title wordmark,
  dialogue portraits, splash and key art. Never the hero, gear, enemies, bosses or item icons (those are forge-only).
* Every raster piece is palette-snapped and shipped at native size (portraits ~44 px, drawn x2 in the 88 px dialogue slot;
  wordmark 240x52), embedded as data-URI PNGs in `js/art-raster.js` (`RASTER`), so `file://` still works. Sources live in the
  git-ignored `tools/out/art/`.

