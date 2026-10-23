# HUD and UI: "Dream Glass"

Authoritative for every on-screen UI element. Terms: [../GLOSSARY.md](../GLOSSARY.md). Keys and input: [controls.md](controls.md).
Skill bar content: [loadout.md](loadout.md). Status icons: [elements-statuses.md](elements-statuses.md).

## Visual language
* 2x grid rule: every HUD pixel is a 2x2 block. Use even coordinates and sizes on 960x540. No 1 px lines.
* Panel: 9-slice pixel frame (16x16 source, 32 at 2x). Fill `#15102a` at 88% alpha, inner bevel `#4a3d7a`, outline `#8f7bd6` (2 px),
  outer dark edge `#0b0716` (2 px). Primary panels (portrait, dialogue, Tab screen) get a 6 px crescent-moon corner in `#c8b6ff`.
* Palette:

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

Element colours come from `ICONS.elementColor`.
* Font: a bundled bitmap font as a base64 PNG sheet in `js/font.js`. "DreamSmall" 5x7 (numbers, labels), "DreamBody" 7x9.
  Drawn glyph by glyph with `drawImage`: crisp, no font-load race, works from `file://`. Sizes on 960: small 5x7 x2, body 7x9 x2, heading 7x9 x3.
  Every string has a 2 px `#0b0716` drop shadow at +2,+2; headings get a full 2 px outline.
* Animation: bars have a white ghost fill that lags 0.4 s behind damage; heals fill with a bright wipe; HP under 25% pulses the frame red at 2 Hz;
  skill ready = 120 ms white rim flash; level-up = gold ring on the bar; the boss bar shakes 2 px on a phase change; panels open with a 100 ms scale from 0.96.

## Layout at 960x540
* Portrait block (bottom-left): portrait 72x72 at (16,452); level badge 24x24 at (72,500). Bars: HP (100,456) 236x18; MP (100,480) 236x12;
  ST (100,498) 236x8; XP (100,512) 236x4. Numbers only on HP; MP and ST numbers on hover or in the Tab screen. Frame variant per Origin.
* Status row: at (100,428), up to 8 icons 20x20, 4 px gap, debuffs first in a red-tinted frame; stack digit 10 px bottom-right; duration as a darkening sweep.
* Shift chord mark: ▲ (the pixel font has no ⇧; see controls.md glyph ruling). Kbm arrow keys read UP / DN / LF / RT.
* Skill bar (bottom-centre): 4 groups of 3 slots, 44x44, gap 14, from x168 to x792 at y=484: [M1 Q ▲Q] [M2 E ▲E] [R F V] [Z X C].
  Frame colour = the skill's element; the ultimate gets the gold frame. Key tag: a 12x10 dark tag, 10 px text, at the slot's top-left outside the art.
  Cooldown = clockwise radial wipe at 70% dark with seconds centred. Not enough MP = desaturated icon with the tag tinted blue.
  Unavailable (rooted, dashing) = 50% dim. An uncharged ultimate shows its chord tag dim. Pockets show a charge pip row.
* Minimap (top-right): 112x112 at (832,16), rounded-diamond frame, fog of war, hero arrow, enemies as 4 px dots, objective as a pulsing diamond.
* Full map on touch (ruling 2026-10-23, follows controls.md "Map: button under the tracker"): the map button sits in the row under the tracker
  (bag, map, help, fullscreen). The minimap is not a touch target (a mouse click on it still opens the full map), so a stray thumb in the top-right
  corner never opens it. Open, the full map shows a close button (X, at least 44 CSS px) at the top of its panel, left of the mode label;
  on touch, a tap anywhere that is not one of its controls (X, a shrine row) also closes it. M, Esc and pad Back still close it.
* Objective tracker (top-left): no panel. Zone name in gold at (16,16); objective at (16,40) with a diamond bullet; up to 2 quest lines in small dim text.
  Fades to 45% after 6 s and returns to 100% on change. The enemy counter shows only during a wave.
* Boss bar (top-centre): name centred at (480,14) with phase pips; bar 480x14 at (240,34) with ghost lag, segmented per phase;
  stagger bar 480x4 at (240,50), white to orange, "BREAK" flash when full; weakness icons (20 px) at the left end and resist icons at the right, always visible.
* Enemy nameplates (scene, 480 grid): 20x3 bar 2 px above the sprite, shown after damage (always for elites and bosses); 8 px weakness
  and resist icons beside the bar after discovery; 8 px status icons beneath.
* Marks: up to 3 or 4 small diamond pips above the enemy bar, flashing when a finisher consumes them.
* Charge ring: a thin arc around a held skill's icon fills over 1 s for Heavy Strike; at full charge it flashes gold.
* Damage numbers (scene): small font x2; crit x3 gold; WEAK x3 yellow; RESIST x2 grey at 60%; IMMUNE as text. Rise 20 px over 0.7 s; hits on one enemy within 80 ms merge.
* Loot toasts: right edge stacking upward from (944,392): 24 px icon in its rarity frame plus the name in rarity colour; slide in 150 ms, hold 3 s.
  Rare and better also get the in-scene light beam.
* Banners: zone entry is a 960x64 strip at y=112, gold heading, 3 s. Level-up is "LEVEL N" rising over the hero. Short messages are body text at (480,404), never mid-screen.
* Dialogue: panel 720x112 at (120,372); portrait 88x88 at (132,384); name in gold at (236,384); text typed at 40 characters per second in a 560 px column;
  Space, click or tap advances or skips.
* Help: a 24 px "?" button at (928,480).

## Screens
All Tab screens: a 920x500 panel at (20,20), the scene dimmed to 35%, the play HUD hidden. Header tabs: Bag, Character, Bestiary, Quests; Dust count and close at the right.
* Bag (Tab): left 220 px column is the paper doll (3x, 72x102, with FX) with slots HAND, OFFHAND, head, chest, boots and the trinkets
  (ring1 (24,88), ring2 (176,88), amulet (100,64), belt or satchel (100,300)), then level, XP and stats with a resist icon row.
  Centre: the 30-slot bag (6x5, 48 px slots, gap 6) with sort, a Pages tab, Salvage and Combine. Right: the item tooltip (at most 12 lines)
  with compare deltas (green better, red worse), tier, requirement, sockets, affixes, and [EQUIP] [SALVAGE].
* Character (K): stats, resists and the skill list per slot (24 px icons), with a tooltip pane.
* Bestiary (B): zone-grouped list with "?" silhouettes for unseen; centre a 4x idle sprite with name, archetype, kills and milestone pips;
  right lore, weak and resist row, drops. A Combo Codex tab and a Fishing Log tab sit beside it.
* Quests (J): active and done list; details and reward icons.
* Title: pixel-lettered logo at (480,160); CONTINUE, NEW DREAM, SETTINGS stacked at y 320 / 356 / 392 with a diamond cursor. Slot picker for the 3 saves.
* Death: scene dimmed 70%, "You fell" heading, XP loss line, one button "Wake at shrine" 160x40 at (400,300).
* Pause and settings (Esc): 400x300 centred: audio sliders ([audio.md](audio.md)), screen shake, damage numbers, particles, hitlag, touch layout left or right,
  rebind screen, "Return to hub".

## Readability rules
* At most 3 text sizes on screen; nothing below 10 px; one gold accent at a time. Nothing permanent in the centre third; idle info fades.
* No nameplate line, gear row, help line, compass letters, "Enemies left" outside waves, or labels outside bars.

## Touch wheel
Safe area 24 px. Left half is a floating joystick (base 112, knob 48, 8 px dead zone, 56 px max throw; last direction kept 0.4 s).
Right cluster around C = (860,436); mirror about x=480 for left-handed.
* Attack: a 96 px circle at C (M1). Its rim is the hand ultimate charge ring (gold sweep, pulsing at 100%).
* Second button: a 72 px circle beside the attack button (M2) with its own charge ring for the offhand ultimate.
* Inner arc: Q and E (spells). Shift+Q and Shift+E fire by tapping the matching charge ring when full.
* Outer arc: R, V, F and the pockets Z, X, C, with a page toggle (40 px) that swaps the outer arc between the active keys and the pockets.
  A dot on the toggle shows a ready hidden skill. Interact is a 56 px button that appears when a prompt is near.
* Ring visuals: radial cooldown wipe, MP-short desaturation with a blue rim, Heavy Strike charge ring (white to gold over 1 s with a haptic click),
  frame = 2 px dark outline + 2 px element rim + `#15102a` at 80%. Helper `UI.ring(ctx, x, y, r, frac, col)`.
* Dodge by double-tap is a setting.

## Aiming
Every skill has `aim:{shape: cone | circle | line | proj | self | dash, range, r, arc, len, w}`.
* Tap quick-casts with the 20 degree assist and a 1-frame flash of the shape. Drag past 12 px is an aimed cast: indicators show while dragging
  and the skill casts on release. Releasing over its button or on the 64 px cancel mark at (480,500) cancels at no cost.
* Drag distance 12 to 96 px maps onto 0 to 100% range with ease-out; projectiles and lines snap 10 degrees; circles and cones never snap.
* Ground indicators draw in the decal pass (`kind:'aim'`) under the sprites: a dashed iso range ellipse (element colour 55%); a cone wedge (25% fill);
  a circle reticle clamped to the range circle; a line or dash rectangle with an arrowhead (a dash also shows a hero ghost); a projectile line with
  chevrons every 12 px; a breathing self ring. The reticle ring redraws after sprites at 35%.
* Anti-confusion rule (`AIM_STYLE` and `TELE_STYLE` in render.js): player indicators are thin, dashed, low alpha, cool; enemy telegraphs are thick,
  solid, hot, high alpha with a filling countdown. If an enemy telegraph overlaps the reticle, the player fill drops to 10%.
* Desktop and pad setting "Ground indicators": off, on hold (default), always. On a pad they show while the right stick is deflected.
* Haptics (a setting): 8 ms on drag start, 15 ms on cast, 25 ms on cancel and on full charge, 40 ms on dodge.
* Performance: cache range ellipses per (range, element); cache shape sprites per equipped skill; rotate cones instead of rebuilding; one indicator at a time.

## Implementation
* `js/ui.js` (before hud.js in both html files): bitmap font `UI.text`, theme table, `UI.frame` (9-slice), `UI.bar`, `UI.sweep`, `UI.toast`,
  `UI.tooltip`, `UI.button`, `UI.ring`. hud.js keeps layout only.
* Cache static pieces (frames, minimap base, bestiary portraits) in offscreen canvases rebuilt on change. `imageSmoothingEnabled = false`; integer draw targets.
* Menu interaction logic is separate from drawing: a table of hit regions plus a focus model shared by mouse, touch and gamepad ([controls.md](controls.md)).
