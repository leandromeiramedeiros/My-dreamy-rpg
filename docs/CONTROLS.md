# Controls spec — touch, keyboard + mouse, gamepad

## Input abstraction (`js/input.js`, Opus, M2 with the HUD rework)
* The game reads **actions, never keys**: `move` (vec2), `aim` (vec2 + mode `cursor|stick|auto`), `attack` (held),
  `skillQ/E/R/F/C`, `dodge`, `s1/s2/s3`, `potion`, `interact`, `inventory`, `quests`, `bestiary`, `map`, `pause`,
  `menuUp/Down/Left/Right/accept/back/tabPrev/tabNext`.
* Every device writes into one `IN.actions` table with `pressed / held / released` per frame.
* `IN.device` = the last device that produced input (`kbm | pad | touch`). HUD, tutorial and dialogue call
  `IN.glyph('dodge')`, so prompts switch automatically (key cap, Xbox or PlayStation glyph, nothing on touch).
* Bindings are stored in the save (`bindings`) with defaults per device.

## Default bindings
**Keyboard + mouse** (director decision: Interact on Space, so it never conflicts with the E skill)
| Action | Binding |
|---|---|
| Move | WASD / arrows |
| Aim | mouse cursor |
| Attack | LMB (hold) |
| Dodge (boots skill) | Shift or RMB |
| Weapon skills | Q · E · R |
| Chest / helmet | F · C |
| Character skills | 1 · 2 · 3 |
| Potion | 4 |
| Interact / talk / fish | Space |
| Inventory · Quests · Bestiary · Map | Tab or I · J · B · M |
| Pause / settings | Esc |

**Gamepad** (Xbox / PlayStation)
| Action | Button |
|---|---|
| Move / aim | left stick / right stick (twin-stick) |
| Attack | RT / R2 (hold) |
| Dodge | LT / L2 |
| Q · E | RB / R1 · LB / L1 |
| F · C | X / □ · Y / △ |
| R (ultimate) | right-stick click |
| Interact / fish | A / ✕ |
| Potion | B / ○ |
| Character skills 1 · 2 · 3 | D-pad left · up · right |
| Map | D-pad down |
| Pause · Inventory | Start / Options · Back / Share |
* Deadzones: radial 0.22 (move), 0.28 (aim), rescaled so full tilt = 1. "Sticky aim": the last aim direction holds for
  0.4 s after releasing the stick.

**Touch**
* Floating joystick anywhere on the left 45 % of the screen; attack button hold; tap a skill = auto-target, drag a
  skill = aim (kept from today).
* Double-tap attack = dodge toward the movement direction.
* A context **Interact** button appears where the potion sits while a prompt is near (the potion moves up a row).
* Long-press the skill bar opens the bag.

## Aiming and aim assist
* Mouse = exact cursor. Stick = direction; ground-targeted skills land at `min(range, stick magnitude × range)` with a
  ground reticle.
* **Aim assist on stick and touch only, never mouse:** a 20° cone snaps to the nearest living enemy in range, weighted by
  distance and "last hit"; projectiles get 6° magnetism; melee cones widen 15 % on pad/touch.
* Touch auto-target keeps today's chain (dragged skill > dragged attack > nearest enemy > movement direction) but
  prefers elites/bosses in range and the enemy you hit last.

## Menus on pad and touch: focus model
* Every screen registers focusable rectangles (`UI.focus.register(rect, id)`); directional navigation is computed by
  nearest rect in that direction, never hand-wired. Focus ring = 2 px bright line.
* A / tap = select · X / long-press = secondary (salvage, socket) · Y = compare toggle · LB/RB = tabs · B = back.
* Tooltips show for the focused item after 150 ms (pad) or on long-press (touch).
* Drag exists only for the mouse; everything else is select-then-select (pick the gem, then pick the socket).
* Dialogue advances with any accept action. Menus never need diagonal input.

## Rebinding (Pause → Controls)
* List of actions with the current glyph per device; select → "press a key/button" → a conflict shows the other action
  and offers a swap; reset to defaults.
* Left-handed touch mirror; stick deadzone slider; aim-assist strength off / low / high.

## Accessibility
* Attack hold vs toggle (toggle = auto-attack the nearest target in range); double-tap dodge on/off.
* Screen shake 0–100 %, hitstop on/off, flash reduction (bloom and light flashes capped).
* Text size S / M / L (14 / 18 / 22 px body); damage-number size.
* **Colourblind-safe rarity:** rarity shapes on frame corners (common ◇, uncommon ○, rare △, epic ☆, legendary ✦,
  mythic ✦✦) in addition to colour; element icons always next to element colours.
* "Hold to confirm" for salvage.

## Touch ergonomics
* Safe-area insets from `env(safe-area-inset-*)` read once into `G.safe`; nothing within 24 px of an edge.
* Right cluster centred 92 px from the corner (thumb arc); buttons ≥ 44 CSS px with 12 px gaps.
* Joystick max radius 56 px with an 8 px deadzone. `navigator.vibrate(10)` on hit/dodge where supported.
* Portrait orientation shows a "rotate to landscape" prompt.

## Testing (Haiku)
1. A synthetic gamepad (`navigator.getGamepads` stub) that walks, aims, casts and navigates the inventory grid.
2. Two-pointer touch emulation (move + aim-drag) on a 844×390 landscape phone viewport.
3. Device switching mid-run: assert the prompt glyphs change on the skill bar and in dialogue.
4. A rebinding round-trip through the save.
5. Manual: one playthrough per device per milestone against this checklist.

## Sequence
`input.js` + glyph table + focus model (Opus, M2, with `ui.js`) → gamepad polish, touch relayout, rebinding screen
(Sonnet UI, M3–M4) → accessibility options (Sonnet, M6).
