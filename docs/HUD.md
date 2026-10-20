# HUD & UI spec — "Dream Glass" (complete rework)

Authoritative for every on-screen UI element. Written from the senior director's review; DESIGN.md defers to this file
for anything HUD/UI.

## Why the old HUD reads ugly
1. **Scale mismatch.** Scene pixels are 2× (480→960) but HUD lines, borders and text are 1×. It looks like a thin web
   overlay on chunky art.
2. **Font.** Press Start 2P is a wide arcade font loaded from Google Fonts; offline/`file://` it falls back to Courier New.
3. **No hierarchy.** Seven boxes with identical fills and outlines; stamina shouts as loud as health.
4. **Clutter.** Numbers inside bars *and* labels outside; keybinds over icon corners; permanent gear row and help line;
   floating "Enemies left"; an always-on 300×54 objective panel.
5. **Colour.** Fully saturated bars and four different skill-frame colours vanish into the pink-violet world.
6. **Banners** land in the centre of the screen on top of the fight.
7. **Minimap** is the biggest element for the least-used information.
8. **Inventory**: the play HUD bleeds through; 8 px stats; three different frame weights.

## Visual language
* **2× grid rule:** every HUD pixel is a 2×2 block. Either render the HUD to a 480×270 layer and scale ×2, or use only
  even coordinates and sizes on 960×540. No 1 px lines anywhere.
* **Panel:** 9-slice pixel frame (16×16 source → 32 at 2×): fill `#15102a` at 88 % alpha, inner bevel `#4a3d7a`,
  outline `#8f7bd6` (2 px), outer dark edge `#0b0716` (2 px). Primary panels (portrait, dialogue, Tab screen) get a
  6 px crescent-moon corner ornament in `#c8b6ff`; secondary panels use the plain variant.
* **Palette:**
  | Role | Hex |
  |---|---|
  | background | `#15102a` |
  | line / bright line | `#8f7bd6` / `#c8b6ff` |
  | text / dim text | `#f3ecff` / `#9f93c4` |
  | gold (ultimate, legendary, boss name only) | `#ffd35a` |
  | HP / highlight | `#e8476c` / `#ff8fa8` |
  | MP / highlight | `#4f7df0` / `#9ab8ff` |
  | Stamina / highlight | `#e3a93a` / `#ffe08a` |
  | XP | `#b48aff` |
  | danger | `#ff3d6e` |
  | WEAK hit / RESIST hit | `#ffe36a` / `#a7a3b8` |
  Element colours come from the icon sheet's frame colours (`ICONS.elementColor`).
* **Font:** a bundled bitmap font as a base64 PNG sheet in `js/font.js`: "DreamSmall" 5×7 (numbers, labels) and
  "DreamBody" 7×9. Drawn glyph by glyph with `drawImage`: crisp, no font-load race, works from `file://`.
  Sizes on 960: small = 5×7 ×2 (14 px line), body = 7×9 ×2 (18 px line), heading = 7×9 ×3.
  Every string has a 2 px `#0b0716` drop shadow at +2,+2; headings get a full 2 px outline.
* **Animation:** bars have a white "ghost" fill that lags 0.4 s behind damage then drains; heals fill with a bright wipe;
  HP < 25 % pulses the frame red at 2 Hz and tints the portrait vignette; skill ready = 120 ms white rim flash + 1 px icon
  pop; level-up = gold ring on the bar + XP wipe; boss bar shakes 2 px on phase change; panels open/close with a 100 ms
  scale from 0.96.

## Layout at 960×540 (all even numbers)
* **Portrait block (bottom-left):** portrait 72×72 at (16,452) with the ornament frame; level badge diamond 24×24 at
  (72,500). Bars to the right: HP (100,456) 236×18; MP (100,480) 236×12; ST (100,498) 236×8; XP (100,512) 236×4.
  Numbers only on HP (small font, right-aligned inside); MP/ST numbers on hover or in the Tab screen. No name line.
* **Status row:** (100,428), up to 10 icons 20×20, 4 px gap, debuffs first in a red-tinted frame; stacks as a 10 px digit
  bottom-right; duration as a darkening sweep inside the icon.
* **Skill bar (bottom-centre):** 10 slots 44×44 at y=484 in groups [LMB Q E R] (x 232…428), gap 14, [F C SHF]
  (442…574), gap 14, [1 2 3] (588…720); potion 44×44 at (740,484) with 3 charge pips beneath. Frame colour = the
  skill's element; the ultimate gets the gold frame. Keybind = a 12×10 dark tag with 10 px text at the slot's top-left,
  outside the icon art. Cooldown = clockwise radial wipe at 70 % dark + remaining seconds centred; not enough MP = icon
  desaturated + key tag tinted MP blue; unavailable (rooted, dashing) = 50 % dim.
* **Minimap (top-right):** 112×112 at (832,16), rounded-diamond frame, fog-of-war, hero arrow, enemies as 4 px dots,
  objective as a pulsing diamond, a single "N" tick.
* **Objective / quest tracker (top-left):** no panel. Zone name in gold body text at (16,16); objective at (16,40) with
  a ◆ bullet; up to 2 quest lines in small dim text below. Fades to 45 % after 6 s, back to 100 % when it changes.
  The enemy counter appears under the objective only during a wave.
* **Boss bar (top-centre):** name (small heading) centred at (480,14) with phase pips ◆◆◇; bar 480×14 at (240,34) with
  ghost lag; stagger bar 480×4 at (240,50), white→orange, "BREAK" flash when full; weakness icons (20 px) at the left
  end, resist icons at the right end, always visible.
* **Enemy nameplates (scene, 480 grid):** 20×3 bar 2 px above the sprite, shown only after damage or always for
  elites/bosses; elite name above in small text; after discovery, 8 px weakness/resist icons beside the bar; status
  icons 8 px in a row beneath.
* **Marks (daggers):** up to 3–4 small diamond pips in the dagger family's colour above the enemy's bar, filling left
  to right; they flash when a finisher consumes them.
* **Charged swing (two-handers):** a thin arc around the held skill's icon fills over 1 s; at full charge it flashes gold
  and the hero glows; releasing early shows the partial value.
* **Origin:** the portrait frame variant per origin (Knight, Mystic, Ranger, Thief, Warrior).
* **Damage numbers (scene):** small font ×2; crit ×3 gold; WEAK ×3 yellow; RESIST ×2 grey at 60 %; IMMUNE as text.
  Rise 20 px over 0.7 s with a 2-frame pop; hits on the same enemy within 80 ms merge.
* **Loot toasts:** right edge, stacking upward from (944,392): 24 px icon in its rarity frame + name in rarity colour,
  slide in 150 ms, hold 3 s. Rare+ also get the in-scene light beam.
* **Banners:** zone entry = 960×64 letterbox strip at y=112, gold heading + body subtitle, 3 s. Level-up = "LEVEL 15"
  heading rising over the hero + the bar ring. Short "say" messages = body text at (480,404) above the skill bar,
  never mid-screen.
* **Dialogue:** panel 720×112 at (120,372); portrait 88×88 at (132,384); name in gold at (236,384); text typed at 40
  characters/s in a 560 px column; blinking ▼ bottom-right; Space/click/tap advances or skips.
* **Help line:** removed. A single 24 px "?" button at (928,480) opens help.

## Screens
All Tab screens: 920×500 panel at (20,20), scene behind dimmed to 35 %, play HUD hidden.
```
+---------------------------------------------- 920 --------------------------------+
| [INVENTORY I] [CHARACTER K] [BESTIARY B] [QUESTS J]            ◆140 Dust  [X Esc] |  48
+-------------- 220 --------+--------- 340 ---------+----------- 340 ---------------+
| Weapon  [48]   helm [48]  |  BAG 20/30   [sort]   | ITEM NAME (rarity colour)     |
|        paper-doll 3×      |  6 × 5 slots 48 px,   | tier/req  ◆◆◇ sockets         |
|        (72×102) with FX   |  gap 6 → 318 × 264    | base stats                    |
| chest  [48]    boots [48] |                       | affixes (green/red vs equipped)|
| ─────────────             |                       | skill list with 24 px icons    |
| Lv 14  1434/3586 XP ▬▬▬   |  [SALVAGE] [COMBINE]  | set bonus 2/3                 |
| Atk 177  HP 1813  Def 70% |                       | ───── compare ─────            |
| Crit 11% ... (2 cols)     |  hint line            | [EQUIP] [SALVAGE]             |
| Resist: icons + numbers   |                       |                                |
+---------------------------+-----------------------+--------------------------------+
```
* **Character:** left = the 10 skill slots (44 px) with the two options per weapon slot; centre = modifier-choice cards
  by level (L5/10/15/20/25/30); right = tooltip.
* **Bestiary:** left = list grouped by zone with "?" silhouettes for unseen; centre = enemy sprite at 4× idle on a dark
  vignette with name, archetype, kills and milestone pips; right = lore line, weak/resist row ("?" until discovered),
  drops.
* **Quests:** left = active/done list; right = details + reward icons.
* **Title:** logo pixel-lettered as a sprite at (480,160); CONTINUE / NEW DREAM / SETTINGS stacked at y 320/356/392
  with a ◆ cursor; controls hint in small text at y 500.
* **Death:** scene dimmed 70 %, "You fell…" heading at y 200, XP loss in small text, one button "Wake at shrine"
  160×40 at (400,300).
* **Pause / settings (Esc):** 400×300 centred: music and sfx sliders (5-step pixel sliders), screen shake on/off,
  damage numbers on/off, touch layout left/right, "Return to hub".

## Touch
* Safe area 24 px on every edge. Minimap and tracker as on desktop. Left half = floating joystick (kept).
* Right cluster: attack 88 px at (848,428); potion 48 at (848,352); skills as 48 px square icon buttons in a two-row
  arc: [Q E R] at radius 112 and [F C SHF 1 2 3] at radius 176 from the attack centre; keybind tags hidden;
  drag-to-aim kept.
* Top-left under the tracker: three 40×40 icon buttons (bag, help, fullscreen). Status row moves under the minimap.

## Readability rules
* At most 3 text sizes on screen; nothing displayed below 10 px; one gold accent at a time.
* Nothing permanently in the centre third of the screen. Idle info (tracker, MP/ST numbers) fades.
* Removed: the nameplate, gear row, help line, N/S/E/W letters, "Enemies left" outside waves, labels outside bars.

## Implementation
* New `js/ui.js` (before hud.js in both html files): bitmap font `UI.text(ctx,s,x,y,size,col,align)`, theme table,
  `UI.frame(ctx,x,y,w,h,kind)` 9-slice from an offscreen sheet, `UI.bar`, `UI.sweep`, `UI.toast`, `UI.tooltip`,
  `UI.button`. hud.js keeps layout only.
* Cache static pieces (frames, minimap base, bestiary portraits) in offscreen canvases rebuilt on change; draw dynamic
  parts per frame. `imageSmoothingEnabled = false` everywhere; integer drawImage targets.
* Inventory/menu **interaction logic is separate from drawing**: a table of hit regions + a focus model shared by mouse,
  touch and gamepad (see the controls section of DESIGN.md).

## Touch v2: circular wheel + Albion-style ground aiming (expert spec; director-approved; supersedes "Touch" above)

### Layout (960×540, 24 px safe area, C = attack centre (860,436); angles from +x, y up; mirror x about 480 for left-handed)
* **Attack:** a Ø 96 circle at C. Its rim doubles as the **ultimate charge ring** (gold sweep, pulsing at 100 %). Hold to
  attack. Double-tap to dodge, which is a setting.
* **Inner arc, r 124, Ø 60:** Q at 200°, E at 235°, R at 270° (the ultimate is farthest away, so it is hard to
  fat-finger).
* **Outer arc, r 196, Ø 52:** F at 190°, C at 215°, **Dodge** at 240°, and the **Potion** at 265° with 3 pips on its rim.
  Nothing goes above y 240.
* **Page toggle** (Ø 40 at 160° on the outer arc, "◐"): swaps the inner arc between [Q E R] and [1 2 3] with a 120 ms
  rotation. Hidden skills keep ticking, and a dot appears on the toggle when one is ready.
  * There is **no radial sub-menu**. The setting "Show all 9" (tablets ≥ 1024 px) puts 1/2/3 on the outer arc instead.
  * Director ruling: **no rim double-tap shortcut**, because it would clash with double-tap dodge.
* **Interact:** Ø 56 at 150° on the inner arc, shown only when a prompt is near.
* **Ring visuals:**
  * Cooldown is a clockwise radial wipe at 70 % dark, with the seconds left at the centre and a 2 px flash on ready.
  * MP-short means a desaturated icon with a blue rim.
  * The two-hander **charge ring** sits inside the rim and goes white → gold over 1 s, with a haptic click when full.
  * Frame: 2 px dark outline + a 2 px rim in the element colour + `#15102a` fill at 80 %.
  * The shared helper is `UI.ring(ctx,x,y,r,frac,col)` in ui.js; desktop slots use it too.
* **Joystick:** unchanged (Ø 112 base, Ø 48 knob, 8 px dead zone, 56 px max throw). The last direction is kept for 0.4 s
  after release.

### Aiming (every skill has `aim:{shape:'cone'|'circle'|'line'|'proj'|'self'|'dash', range, r, arc, len, w}`)
* **Tap = quick-cast.** It auto-targets using the CONTROLS chain with a 20° assist. There is no indicator, only a
  1-frame flash of the shape at the target.
* **Drag past 12 px = aimed cast.** The indicators show while you drag and the skill casts on release.
  * Releasing over the button cancels, as does releasing on the Ø 64 ✕ at (480,500). The ✕ fades in after a 40 px
    drag. A cancelled cast costs nothing and starts no cooldown.
* **Drag distance → range:** 12–96 px maps onto 0–100 % of range with an ease-out, so 40 px covers 60 %. Beyond that the
  range is clamped.
  * The direction is the drag vector from the button.
  * While dragging, projectiles and lines get a 10° snap; circles and cones never snap.
  * The dragged button lifts 4 px and its rim brightens.
* **Ground indicators** are drawn on the 480×270 scene in the decal pass (`kind:'aim'`), under the sprites:
  * **Range circle:** an iso ellipse, 1 px dashed (4/3), with the dashes moving 1 px every 100 ms. Element colour at
    55 %, with a soft glow. Not shown for self skills.
  * **Cone:** a wedge at 25 % fill with a 1 px edge.
  * **Circle:** a reticle (22 % disc, 1 px ring, 4 ticks) that is **clamped to the range circle**. Its centre dot turns
    white while it is clamped.
  * **Line / dash:** a w×len rectangle at 25 % fill with an arrowhead. A dash also shows a ghost of the hero at the
    landing point.
  * **Projectile:** a line with a chevron every 12 px, plus parallel lines showing the projectile's radius. Curved
    projectiles show their curve.
  * **Self:** a breathing ring at r.
  * The reticle ring is drawn again *after* the sprites at 35 %, so it shows on top of a boss.
* **Anti-confusion rule** (two style tables in render.js, `AIM_STYLE` and `TELE_STYLE`):
  * **Player** indicators are thin, dashed, low-alpha and cool-toned. Their fill never animates; only the dashes move.
  * **Enemy** telegraphs are thick, solid, hot and high-alpha, with a filling countdown.
  * If an enemy telegraph overlaps the reticle, the player's fill drops to 10 %.
* **Desktop and pad:** the setting "Ground indicators: off / on hold (default) / always". On a pad they show whenever
  the right stick is deflected.
* **Haptics** (a setting): 8 ms on drag start, 15 ms on cast, 25 ms on cancel and on a full charge, 40 ms on dodge.
* **Performance:**
  * Cache range ellipses per (range, element), about 15 of them.
  * Cache shape sprites per equipped skill (≤ 12).
  * Rotate the cone rather than rebuilding it.
  * Only one indicator is active at a time.
* **Balance:**
  * Tap keeps the 20° assist, so touch-only quick-cast play stays viable and the game can be cleared one-thumbed.
  * Reaction skills on page 2 cost one extra tap; check their cooldowns.

### Build split
* **Sonnet:** touch.js (layout, page toggle, cancel, mapping, haptics, charge ring), hud.js and the settings entries.
* **Haiku:** the `aim` blocks in data.js, plus a validate-ids check that every skill has one.
* **Opus:** render.js `AIM_STYLE`/`TELE_STYLE`, `drawAimIndicator(aim, from, to)`, `UI.ring`, and the hold-to-aim hook
  in input.js.
* **Tests:** play.js touch routes:
  * a tap-cast lands on the enemy
  * a drag past range clamps
  * releasing on the cancel zone costs nothing
  * page toggle → cast 1/2/3
  * the left-handed hit-test
  * two pointers at once
* **Screenshots:** touch-layout-circular, touch-aim-cone, touch-aim-circle-clamped, touch-aim-line, touch-cancel,
  touch-page-123, touch-vs-boss-telegraph, aim-on-hold.
