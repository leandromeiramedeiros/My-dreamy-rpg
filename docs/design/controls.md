# Controls: touch, keyboard and mouse, gamepad

Terms: [../GLOSSARY.md](../GLOSSARY.md). Skill bar and slots: [loadout.md](loadout.md). On-screen layout: [hud-ui.md](hud-ui.md).

## Input abstraction (`js/input.js`)
* The game reads actions, never keys. There is one action per active: hand and offhand action, spell and ultimate; head, chest and boots (dodge);
  pockets 1 to 3. Plus move, aim (mode cursor, stick or auto), interact, the screen toggles (bag, character, quests, bestiary, map, pause) and menu navigation.
* Every device writes into one `IN.actions` table with `pressed / held / released` per frame.
* `IN.device` is the last device that produced input (`kbm | pad | touch`). HUD, tutorial and dialogue ask the input layer for the active device's glyph,
  so prompts switch automatically (key cap, Xbox or PlayStation glyph, nothing on touch).
* Bindings are stored in the save (`bindings`) with defaults per device. Bindings are modifier-aware (`'Shift+KeyQ'`):
  Shift alone does nothing. The ultimate chord fires on key-down of Q (or E) while Shift is held, so Q-then-Shift never fires an ultimate.
* The rebind screen shows chords and refuses a chord whose base key is bound in the same context.

## Default bindings
Movement stays on WASD. Interact is Space, so it never conflicts with a skill key.

| Action | Keyboard and mouse | Gamepad (Xbox / PlayStation) | Touch |
|---|---|---|---|
| Move | WASD / arrows | left stick | floating joystick, left half |
| Aim | mouse cursor | right stick | drag a button; auto-target |
| Hand action (M1) | Mouse 1 (hold) | RT / R2 | attack button (96 px) |
| Offhand action (M2) | Mouse 2 (hold) | LT / L2 | second button (72 px) beside it |
| Hand spell | Q | RB / R1 | inner arc Q |
| Offhand spell | E | LB / L1 | inner arc E |
| Hand ultimate | Shift+Q | R3 (right-stick click) | the attack button's charge ring, tapped when full |
| Offhand ultimate | Shift+E | L3 | the second button's charge ring |
| Head | R | Y / triangle | outer arc |
| Chest | F | X / square | outer arc |
| Boots (dodge, i-frames) | V | B / circle | double-tap move (a setting) or outer arc |
| Pockets 1 / 2 / 3 | Z / X / C | D-pad left / up / right | outer arc, page 2 |
| Interact, talk, fish | Space | A / cross | context button |
| Bag, character, quests, bestiary | Tab or I, K, J, B | Back / Share | buttons under the tracker |
| Map | M | D-pad down | button under the tracker |
| Pause and settings | Esc | Start / Options | button under the tracker |

* Deadzones: radial 0.22 (move), 0.28 (aim), rescaled so full tilt = 1. Sticky aim: the last aim direction holds for 0.4 s after releasing the stick.
* Touch: floating joystick anywhere on the left 45% of the screen. Tap a skill = auto-target; drag a skill = aimed cast
  ([hud-ui.md](hud-ui.md) has the touch wheel and aiming). A context Interact button appears while a prompt is near.
  Long-press the skill bar opens the bag.
* An ultimate that is not charged shows its chord tag dim; the charge ring on the attack buttons carries it on touch.

## Aiming and aim assist
* Mouse is the exact cursor. Stick is a direction; ground-targeted skills land at `min(range, stick magnitude x range)` with a ground reticle.
* Aim assist is on stick and touch only, never mouse: a 20 degree cone snaps to the nearest living enemy in range, weighted by distance and last hit;
  projectiles get 6 degrees of magnetism; melee cones widen 15% on pad and touch.
* Touch auto-target order: dragged skill, dragged attack, nearest enemy, movement direction. It prefers elites and bosses in range and the enemy hit last.

## Menus on pad and touch: focus model
* Every screen registers focusable rectangles (`UI.focus.register(rect, id)`). Directional navigation picks the nearest rect in that direction;
  nothing is hand-wired. Focus ring = 2 px bright line.
* A or tap = select. X or long-press = secondary (salvage, socket). Y = compare toggle. LB and RB = tabs. B = back.
* Tooltips show for the focused item after 150 ms (pad) or on long-press (touch).
* Drag exists only for the mouse; everything else is select-then-select (pick the gem, then the socket).
* Dialogue advances with any accept action. Menus never need diagonal input.

## Rebinding (Pause, Controls)
* A list of actions with the current glyph per device. Select, then press a key or button. A conflict names the other action and offers a swap. Reset to defaults.
* Left-handed touch mirror; stick deadzone slider; aim-assist strength off, low or high.

## Accessibility
* Attack hold or toggle (toggle = auto-attack the nearest target in range). Double-tap dodge on or off.
* Screen shake 0 to 100%, hitlag on or off, flash reduction (bloom and light flashes capped).
* Text size S, M, L (14, 18, 22 px body). Damage-number size.
* Colourblind-safe rarity: shapes on frame corners in addition to colour (common ◇, uncommon ○, rare △, epic ☆, legendary ✦, mythic ✦✦).
  Element icons always sit next to element colours.
* Hold to confirm for salvage.

## Touch ergonomics
* Safe-area insets from `env(safe-area-inset-*)` are read once into `G.safe`; nothing sits within 24 px of an edge.
* The right cluster is centred 92 px from the corner (thumb arc); buttons are at least 44 CSS px with 12 px gaps.
* Joystick max radius 56 px with an 8 px deadzone. `navigator.vibrate(10)` on hit and dodge where supported.
* Portrait orientation shows a "rotate to landscape" prompt.

## Tests
1. A synthetic gamepad (`navigator.getGamepads` stub) that walks, aims, casts and navigates the inventory grid.
2. Two-pointer touch emulation (move plus aim-drag) on an 844x390 landscape phone viewport.
3. Device switching mid-run: prompt glyphs change on the skill bar and in dialogue.
4. A rebinding round-trip through the save.
5. `tools/validate-ids.js` checks hotkey conflicts; `tools/play.js` routes all three devices.
