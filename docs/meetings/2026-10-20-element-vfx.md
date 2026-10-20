# VFX meeting: the element particle language, and elemental statuses (My-dreamy-rpg)

Attending: Visual Effects Director (VFX), Game Director (GD), the studio director (client, by relay).
Client request (verbatim): "elements should have particles to represent them, in every place they appear, even on hud.
ember particles, snowflakes, lightning sparkles, arcane beams etc... etc.. add this to our pixel effects."
Client addendum (relayed by the director): how are enemies and the hero shown ablaze, frozen, chilled, shocked, poisoned,
entangled, marked, smitten/blinded, shattered, bleeding, and how does that plug into the elements. Part B below.

Code read: js/game.js (PART pool 87-125, burst, EFFECT_IMPL 258-281, damageEnemy 895-972, hitlag 975, heroStatuses 803,
enemy heartbeat 1270-1306, RING_EL / resonance 176-231), js/render.js (drawParticles 1399-1410, drawProj 1290, drawDrop 833,
drawEcho 942-1024, drawEffect 1311-1370, bloomEmitters 1618-1672, QUALITY_TIERS 1466, drawEnemy 1098-1230), js/hud.js
(elColor 19-24, elChip 69-74, damage numbers 88-112, nameplates 170-186, status row 226-240, skill slots 292 / 684, boss bar
505-521), js/ui.js elCol 75, js/icons.js (EC 46, elementOf 169, GEM 674, item frame dot 659), js/items.js (EL_COL 117,
DMG_ELS 123, GEMS / EL_GEM 187-216, sockets 328-346), js/itemdata.js, js/menus.js (STAT_COL / statCol 320-328, sockets
159 / 426 / 487), js/hero.js (ELC 149, pendant 184), js/data.js (skill elements, BUFFS 234), js/settings.js, js/main.js
(loop 150-215, render 180-195, PART.cap 397), js/parts.js. Docs: DESIGN §15.4, §26.4, §27, §30, §31; HUD.md; CREDITS.md;
docs/meetings/2026-10-20-lumina.md rows 5, 81, 84, D3; the Lumina VFX survey (scratchpad lumina-survey-vfx.md §1, §3).
Shots: tools/shots/m3-echo, m3-feel, perf-parity (bloom strips, before/after pairs), hud/boss-fight.png, and the echo
element sheet (scratchpad echo-els/echo-elements.png).

## Facts from the code that shaped every answer
F1. **Five element colour tables disagree.** `EL_COL` (items.js:117: fire #ff9a4a, frost #9fe8ff, holy #fff2b0…),
    `ECHO_ELCOL` (render.js:942: saturated, holy deliberately pale white-gold "so it never reads as lightning yellow"),
    `ICONS` `EC` (icons.js:46: holy #ffd75a gold, uses `physical` for slash/pierce), `HERO.ELEMENT_COLORS` `ELC`
    (hero.js:149, a copy of EC), `STAT_COL` (menus.js:324, a copy of EL_COL), plus per-skill `color` in data.js and `BUFFS`
    colours. hud.js `EL_ICON_COL` maps slash/pierce → `physical` for the icon table. Holy is gold in the icons and pale in
    the Echo: the registry must pick one (decision D1).
F2. **Particles never enter the bloom today.** `bloomEmitters` (render.js:1633-1652) draws only `drawEffect` cores into VB
    at `BLOOM_VFX` 0.45 ("no particles or randomness") and the pushed lights at `BLOOM_CORE` 0.22 × radius, `BLOOM_LIGHT`
    0.75. So the only way a particle can white out a target is through a light it pushes (drawProj, drawDrop, lightning
    points each push one). `drawEffect` runs twice a frame (scene and VB), so anything spawned from it would double.
F3. **Several spawns run per draw frame, not per step:** `drawProj` (`Math.random() < 0.7`, render.js:1306), `drawDrop`
    (853), `drawSunbeam` (865), `drawEcho` motes (1020), hero buff motes (1090-1092), enemy auras (1157, 1270, 1279),
    the blossom / falls / chimney ambience (115-121). They call `addPart` from render.js. On a 120 Hz display they emit
    twice as much; under phone frame-skip they emit half. The `updateParts` integration is Euler (game.js:105-115).
F4. **The pool is already tiered.** `addPart(o, amb)`: ambient motes are refused at 75 % of `PART.cap` and when
    `Math.random() > PART.budget` (0.35..1 on frame EMA, main.js:208); a full pool evicts the oldest ambient mote for a
    combat particle; `burst` scales n by the budget. Cap 600 desktop, 300 phone (main.js:397). Draw = one `fillRect` per
    particle with `rgbaQ` and a composite switch per glow change (render.js:1399-1408). Each particle is a plain object
    with `col`, `size` 1-2, `glow`, `petal`, `mist`.
F5. **The HUD is drawn at 2× on `dctx` after the scene blit** (render(), main.js:180-195; damage numbers use `vx * 2`,
    HUD.md "2× grid rule"); its backing store runs at the governor's DPR rung on phone (main.js:7-14). There is no screen-
    space particle pool. UI particles therefore are 2×2 blocks (1 scene pixel) and live in the `drawHUD` pass.
F6. **There is no reduced-motion setting.** settings.js has `flashReduce` → `flashCap()` 0.5 (bloom and light flash) and
    `flashReduceOn()` (hit flash 0.1 s, no white BREAK frame). Nothing consults `prefers-reduced-motion`.
F7. **Perf headroom is nil.** The brief's latest real-device reading is ~20.3 ms phone p95 against the 20 ms budget
    (feel-ui F11 said ~25 ms; PRODUCTION.md:183 says 53-66 ms under 4× throttle). The perf harness is tools/perf.js behind
    `?perf=1`, tiers pinned with `?quality=phone|low|high`. Any per-frame addition must be paid for in the same change.
F8. **`DMG_ELS` is wider than the game.** `shatter` has no colour, skill or projectile: only `shatterDmg` (itemdata.js:212)
    and the `rx_shatter` sound. It is the §15.4 Shatter reaction (M4). `gloom` is an enemy-only element (slimes, hounds,
    gloom projectiles) outside DMG_ELS, with `EL_COL.gloom` #c070ff. `EL_GEM` covers five elements (ruby fire, sapphire
    frost, emerald nature, topaz lightning, amethyst arcane); holy, slash and pierce have no gem. Diamond is the resist gem.
F9. **§27 fixes particle counts.** Hit burst `min(12, 5 + 8r)`, halved for the Echo, at most 24 per cast; colours today are
    `['#ffffff', e.blood]` (game.js:966). Burn tick: 2 particles at 50 % (1303). Kill 24, boss kill 120. DoT ticks never
    hitlag. This meeting changes the colours and shapes of those bursts, never their counts.
F10. **Statuses today are five timers, not a system.** `e.burnT/burnTick/burnCast` (14 dmg per 0.5 s, set by Firebolt /
    Meteor `burn:` and the `fireBurn` ring proc), `e.slowT` (speed ×0.55, from `o.slow`, ×2 s), `e.stunT` (from `o.stun`,
    tumble 0.3 s, boss ×0.25), `e.frozen` (a flag set by `frostPower` or `o.freeze`; it only suppresses the stun stars,
    render.js:1171), and `e.stagger` with boss BREAK at `STAGGER_CAP` (game.js:915-919). The hero has `slowT`, `rootT`,
    `dreadT`, `hurtT` and `buffs`. `naturePower`, `lightningPower`, `arcanePower` are marked `partial` ("no hero poison /
    Shock / Marks yet"). `statusChance` is summed but unread (items.js:254: "not rolled until M4"). `p.resonance` is
    computed and unread by art. Reactions (§15.4, seven rows) are M4 and have sfx ids already (sfxdata.js:118, 341).
F11. **Status reads today:** nameplate pips 12×12 filled squares for burn / slow / stun (hud.js:183-184), three orbiting
    yellow stun stars (render.js:1171, 1229), the hero status row of 20 px slots with a sweep (226-240), boss weak /
    resist chips (520-521). No tint, no overlay, no pose change, no stack count on enemies.
F12. **Tint and silhouette caches exist:** `silOf(img, col)` (render.js:33) per (sprite, colour); `echoTint` per (frame,
    colour) with a rim; `lightSized` per (colour, diameter). The grey-level-then-tint path of §31 is the same shape of
    cache. `silOf` is what the hit flash and the hurt flicker already use, so a status tint is one more key in it.

---

# Part A. The element particle language

## A1. Design rules
R1. **Shape and motion first, colour second.** Every motif must survive the greyscale test (a desaturated 16 px chip strip)
    and the 1× test (one scene pixel = one particle pixel). Nothing relies on hue alone; colourblind players and the
    violet ground wash out hue anyway.
R2. **One particle = one cached blit.** No path drawing per particle, no gradients, no rotation. Frames are baked once
    per element at load, grey level and tinted through the same tint cache as the §31 atlas.
R3. **Closed-form motion** (Lumina `Particles.js`): position is a function of (seed, age). Any frame rate and frame-skip
    gives the same picture; no per-particle velocity state is needed for idle emitters.
R4. **Idle whispers, events shout.** Each surface has an ambient tier (tiny, slow, rate-limited) and an event tier (a burst
    with a cap). Ambient uses `amb:true` and is the first thing shed; events use `amb:false` and obey §27 counts.
R5. **Never over the bloom threshold.** Element sheets top out one ramp step below white except a single 1-px core pixel;
    particles never enter VB; an element emitter pushes at most one light, at `a ≤ 0.35`.
R6. **Never on the words.** No particles over damage numbers, nameplate bars, the boss HP fill, tooltip text, touch
    controls, or the mini-map. Particles sit on frames, rims and icons, and fade when text overlaps.

## A2. The motif table (one row per element in `DMG_ELS`, plus gloom)
Palette = the registry ramp, dark → mid → light → core (4 steps; core is the one pixel allowed near white). Motion is the
closed form in A3. Life and rates are the world values at 1×; HUD values are in A4. "16 px read" is what the chip shows.

| Element | Motif (pixels) | Frames | Palette (dark, mid, light, core) | Motion | Life | Idle rate | Burst | 16 px read / greyscale cue |
|---|---|---|---|---|---|---|---|---|
| **slash** | streak: 1×3 then 1×5 then 1×3 horizontal-diagonal line, trailing 1 px darker | 3 | #8a94b0 #c8d0e8 #e7eeff #ffffff | `dash`: fast straight along the hit normal, decelerating (k 9), no gravity | 0.18-0.28 s | none (slash has no idle) | 5+8r | two crossing streaks; cue = thin lines, fastest motif |
| **pierce** | dart: 1×3 line with a 1 px head pixel one step lighter | 2 | #6a7490 #aab4cc #e7eeff #ffffff | `dash` along the projectile heading only (never radial), k 6, life ends at spawn height | 0.2-0.3 s | 1 per 0.12 s behind an arrow (trail) | 4 on hit (+2 per extra pierce) | one dart aligned with the arrow; cue = single straight line with a head |
| **fire** | ember: 3×3 diamond (centre + 4 arms), 2nd frame 2×2 core, 3rd frame 1 px | 3 | #ff4a3a #ff8a4a #ffd27a #fff0c0 | `rise`: vz 0.6-1.4 tiles/s, 3-sine wobble ±0.15, flicker (alpha toggles 1/0.6 at 10 Hz), gravity -0.2 (floats up) | 0.5-0.9 s | 3/s per burning body, 2/s per fire projectile tail | 6-18 | 2 embers rising with a flicker; cue = rising, shrinking, flickering |
| **frost** | snowflake: 5 px cross (centre + 4 arms) with 1 px diagonal tips on frame 2 (a 6-point star) | 2 (cross / star, swaps at 4 Hz) | #2aa8ff #5fd4ff #9fe8ff #e8fbff | `fall`: vz −0.4-0.8 tiles/s, sway x = 0.25 sin(2.1 age + seed), no gravity | 0.9-1.6 s | 2/s per chilled body | 5-14 | one 5-px cross drifting down; cue = falling, swaying, cross shape |
| **nature** | leaf: 2×3 tilted card, frame 2 is the 3×2 flipped card (tumble), 1 px darker stem pixel | 2 (flip at 3 Hz) | #1f4e4c #3f8b63 #94cf7f #d2f0a6 (PAL_LEAF) | `fall` with wider sway (0.5) and a slow spin (frame flip), gravity 0.3, settles on the ground 0.3 s then fades | 1.2-2 s | 1.5/s per poisoned / entangled body | 5-12 | a leaf card tumbling; cue = flips, falls slowest |
| **lightning** | spark: 2-frame zigzag, 3×3 "Z" (frame A) and its mirror (frame B), swapping every 2 frames; 1 px white at one end | 2 (jitter) | #c8a000 #ffe630 #fff07a #ffffff | `jitter`: position re-hashed ±1 px every 2 frames, no travel, vz 0; short life | 0.12-0.25 s | 1 per 0.08 s per shocked body (staccato, not steady) | 4-10, plus 1 `line` pt per chain jump | a zigzag that flickers in place; cue = angular, stays put, strobe life |
| **arcane** | rune / beam: a 1×4 vertical bar rising with a 1 px cap, frame 2 is 1×3 (dissolving); runes = 3×3 "T"/"+" glyph pair on skill casts | 2 (bar) + 2 (glyph) | #5a2aa0 #9a44ff #d6b0ff #ffffff | `orbit`: angle = seed + 1.8·age around the owner at r 0.35-0.6 tiles, vz 0.5 steady rise, no gravity | 0.8-1.4 s | 2/s per marked body; the Echo 1.5/s | 6-12 | a short vertical bar circling; cue = vertical, orbits, never falls |
| **holy** | mote with glint: 1 px mote; mid-life it grows a 5 px cross (4 arms, 1 frame) then returns to 1 px | 3 (1 px, cross, 1 px) | #c08a30 #ffd75a #fff2c4 #ffffff | `rise` slow (vz 0.3), **no wobble, no flicker**, glint phase hashed per particle so glints are sparse and never simultaneous | 1.2-2 s | 1/s per smitten body, 2/s under Bless | 5-10 | a calm mote that blinks once into a cross; cue = slow, straight, one glint (lightning is angular, fast, strobes) |
| **shatter** | shard: 2×2 block with 1 px dark edge, frame 2 is a 1×2 chip | 2 | #1a3a5a #5fd4ff #bfe8ff #ffffff | `burst`: radial, speed 4-7, gravity 9, ground bounce 0.3 (the existing `burst` integrator) | 0.4-0.7 s | none (reaction only) | 14-24 on a Shatter | a scatter of square chips falling fast; cue = blocky, ballistic, bounces |
| gloom (enemy-side, not in DMG_ELS) | smudge: 2×2 dark block with a 1 px pink core on frame 2 | 2 | #2a1c38 #5f4690 #ff7ae0 #ffd0ff | `rise` very slow (vz 0.25), wobble 0.1, fades from the top | 1-1.6 s | 1.5/s per gloom enemy (render.js:1157 already) | 6 on a gloom hit on the hero | a dark smudge with a pink point; cue = dark on light, the only "shadow" motif |

The pair the client worries about, lightning vs holy, is separated three ways: **shape** (zigzag vs point-then-cross),
**motion** (jitter in place at 2-frame strobe vs slow straight rise), **lifetime** (≤ 0.25 s vs ≥ 1.2 s). In greyscale the
spark reads as a flicker and the mote as a calm point. Holy's base colour is left to D1; the motif stands either way.

Pixel grids (1 = light, 2 = mid, 3 = core, . = empty):
```
fire A   fire B  fire C | frost A  frost B | light. A  light. B | holy B  | nature A  nature B | shatter A | arcane bar
 .2.      ..      .     |  ..1..    1.1.1  |  3 1 .    . 1 3    |  ..1..  |   1 2       1 1 2  |   2 2 1   |   3
 212      23      3     |  ..1..    .111.  |  . 2 .    . 2 .    |  ..1..  |   2 2       2 2 1  |   2 1 1   |   1
 .2.               .    |  11311    11311  |  . 1 2    2 1 .    |  11311  |   1 2              |   1 1 .   |   2
                        |  ..1..    .111.  |                    |  ..1..  |                    |           |   2
                        |  ..1..    1.1.1  |                    |  ..1..  |                    |
```

## A3. Motion models (closed form; Lumina `Particles.js` lift, re-implemented in JS)
Each particle stores `x0,y0,z0, seed, born, model, sheet, frame0, life`. Position at age `a = t − born`:
* `rise`: `z = z0 + vz·a`, `x = x0 + w·(sin(2.3a+s) + 0.5 sin(5.1a+1.7s))`, alpha = flicker ? (sin(63a+s) > −0.2 ? 1 : 0.6) : 1.
* `fall`: `z = z0 − vz·a`, `x = x0 + sway·sin(2.1a+s)`; stops at `tileH` (the petal rule, game.js:110).
* `jitter`: `x = x0 + h(s, ⌊a·30⌋)` with `h` ∈ {−1, 0, 1} px, `frame = ⌊a·30⌋ & 1`.
* `orbit`: `x = ox + r cos(s + 1.8a)`, `y = oy + r sin(s + 1.8a)`, `z = z0 + 0.5a`; `ox,oy` read from the owner each frame
  (the only model with an owner reference; owner dead → falls back to `rise`).
* `dash`: `p = p0 + v0·E(a)`, `E = (1 − e^(−k·a))/k` (Lumina `emit`, exponential drag, no gravity).
* `burst`: the existing Euler `burst()` (gravity, bounce). Kept as is for the §27 hit bursts and shards.
Frame index = `⌊a / life · frames⌋` unless the model says otherwise; the dithered fade of §31 (4×4 Bayer, 4 masks) applies
to the last 25 % of life on the `high` tier, plain alpha steps 1 / 0.6 / 0.3 on phone and low.

## A4. The surface inventory (every place an element appears), with tiers, counts and the "not here" list
"Idle" = ambient tier (`amb:true`, shed first). "Event" = burst tier (`amb:false`). Counts are desktop / phone.

### World
| Surface | Code anchor | Idle | Event | Must not |
|---|---|---|---|---|
| Hit burst (every hit) | game.js:966 `burst(…['#ffffff', e.blood])` | – | §27 count `5+8r`, split: 60 % element motif (sheet), 40 % white/blood squares; Echo half | never changes the count; DoT ticks: no burst beyond the 2-particle tick (1303) |
| Skill cast | data.js `cast()` → `fx()` / `burst()` at the caster | – | 6 / 4 rune motifs for arcane, embers for fire…, at the cast point, life 0.4 s | not during hitlag (effects already run on the combat clock) |
| Projectile tail | render.js:1306 (per-draw spawn, F3) | moved to `updateProjs` (game.js:1040+): 1 per 0.1 s desktop / 0.16 s phone, model `dash` backwards | explode: 18 → 12 element + 6 white (1079) | the `kind:'arrow'` keeps the sprite trail only; `wave` none |
| DoT on a body (Burn, Poison, Bleed) | game.js:1303 burn tick burst | 3/s fire, 1.5/s nature, 1/s slash, from `updateEnemies` with a per-enemy accumulator; **cap 12 / 6 emitting bodies** (nearest) | tick: 2 (unchanged) | bodies beyond the cap get the tint only (Part B) |
| The Echo spirit (§30) | render.js:1020 motes, 1080 `fx.kind` | 1.5/s orbit motif of `E.el`, radius 0.5, 2 alive at most | materialise / dissolve: 8 / 4 | half of hero rates (§30 "half particles") |
| Hero element imbue (weapon with an element-damage implicit / affix, amulet or ring tint) | hero.js:156, 184; items.js `imbueItem` 613; `RING_EL` game.js:176 | **only while attacking**: 2 motifs per swing on the weapon tip, model `dash` along the swing; idle = none (the weapon rim is the idle read) | – | never on the walk cycle (the hero is the focus; clutter) |
| Resonance aura (two rings of one element, `p.resonance`) | game.js:230 "drives the aura colour (art lane)" | 1/s orbit motif at the hero's feet, 1 alive | on recalc (equip): 6 | off on `low`; replaces nothing, it is the only ambient on the hero |
| Element enemies (`e.el`) | render.js:1157 (slime smudge), 1270, 1279 auras | gloom slime: 1.5/s smudge (exists); others: none idle (their attacks carry the element) | their projectiles / zones: as projectiles above | never idle motifs on nature / none enemies (boars, trolls): a herd of leaves is noise |
| Enemy resists / weakness | hud.js chips (below) | – | WEAK reveal (first `discoverRes`): 6 motifs of the weak element rising off the chip | – |
| Gem sockets / drops | render.js:853 drop motes (per-draw, F3) | gem drop: 1/s of its element motif above the gem (`gemParse(d.gem).def` → element via `EL_GEM` inverse); item drops keep the rarity mote | land: 4 | Common items: none (already) |
| Element zones (Snare, Arrow Rain, Frost Nova ring) | game.js zones `z.tick` 1088 | 2/s inside the zone radius, random point, the zone's element | tick: none | zones are telegraphs; the motif stays under 20 % of the zone's fill alpha |

### HUD (screen space, the UI pool; phone = half counts; sizes are 2× HUD pixels = 1 scene pixel)
| Surface | Code anchor | Idle | Event | Must not |
|---|---|---|---|---|
| Skill slots, element rim | hud.js:292, 684; touch 48 px buttons | **none**: 10 slots × motifs is the clutter case; the rim colour is the idle read | **ready flash** (HUD.md: 120 ms white rim): 4 element motifs leave the rim upward, life 0.4 s; **cast**: 3 from the slot centre | never over the keybind tag or the cooldown number; never on cooldown slots |
| Hero status row | hud.js:226-240 | 1 motif per 1.2 s on a debuff slot of an element (Burn, Chill, Shock, Poison), 1 alive per slot | applied: 4; expired: none | the sweep and the stack digit stay clear (motif spawns from the top edge) |
| Damage numbers | hud.js:88-112, `dmgText` | **none** (text is sacred) | WEAK (`kind:'weak'`): 3 motifs of the element at the number's spawn point, behind the text, life 0.3 s | never on normal / resist / crit numbers (crit is gold text already) |
| "WEAK: X" / RESIST chips on nameplates | hud.js:175-178 `elChip` 16 px | none | discovery: 6 (world row above), then still | nameplates in a crowd: chips only, no motifs ever |
| Boss bar: weak / resist chips | hud.js:520-521 (24 px) | 1 motif per 2 s per weak chip, 1 alive | phase change: chips re-reveal with 6 each | nothing over the HP fill or the phase pips |
| Boss bar: elemental boss (`e.el` ≠ none) | hud.js:505 | none | BREAK (§27 8-step): 12 motifs of the boss's element off the bar ends | – |
| Resonance (character sheet and a portrait pip) | menus.js:624 drawCharacterTab; hud.js portrait 190 | character sheet: 1 orbit motif per 1.5 s around the ring pair; portrait: **none** (a 4 px element pip instead) | equip: 6 on the sheet | the portrait bars |

### Menus (the UI pool, menu pass; all idle counts "1 alive")
| Surface | Code anchor | Idle | Event | Must not |
|---|---|---|---|---|
| Item icons with an element (implicit dot, trinket tint) | icons.js:659 dot, 808 `item(... opts.element)` | **hovered / selected only**: 1 motif per 1 s off the implicit dot | pick up into the bag: 4 | the 6×5 bag grid at rest: nothing (30 icons × motifs is a snow globe) |
| Tooltip | menus.js:316-500 | 1 motif per 1.5 s off the element word in the header line (`s.element`), 1 alive | none | the text columns, the delta arrows, socket rows |
| Gem icons (bag, socket rows, gem pick) | icons.js:835 `gem`, menus.js:159, 487 | Radiant gems only: 1 per 1.2 s; Chipped / Clear: none | socketing: 6 of the gem's element from the socket | – |
| Character stat rows (`fireDmg`… and `res*`) | menus.js:328 `statCol` | none (the coloured value is the read) | a stat changed by equip: 3 on that row's value, life 0.3 s | – |
| Skill list / loadout icons | menus.js:619, 654 | none | selecting a skill: 3 off the frame | – |
| Bestiary "best reaction" line (§15.4, M4) | items.js seen.reactions | 1 per 2 s of the reaction's element | – | – |

## A5. Architecture
1. **One registry, `ELFX` (new classic-script file `js/elfx.js`, loaded after util.js and before icons.js).** One row per
   element: `{ id, ramp:[4], motif:{ w, h, frames, pixels }, model, vz, wobble, flicker, life:[min,max], idle:{rate,alive},
   burst:{n, spd}, light:{r, a} | null, hudCol, textCol }`. Every existing table becomes a derivation: `EL_COL` = `ELFX[el].textCol`,
   `ECHO_ELCOL` = `ramp[1]`, `ICONS.EC` / `HERO.ELC` = `ramp[2]`, `STAT_COL[elDmg]` = `textCol`, `hud.js EL_ICON_COL` goes
   away (the registry carries `icon:'physical'` for slash and pierce). The §31 atlas `EFFECTS` table reads the same
   `ramp` for its tint, so a fire slash and a fire ember agree to the pixel. The registry is data; the bakers below are the
   only code that reads `motif.pixels`.
2. **Pre-baked sheets, grey level, tinted through one cache.** At boot `ELFX.bake()` paints each motif's frames once at
   1× into a grey-level canvas (levels 0.35 / 0.65 / 0.9 / 1.0 = dark / mid / light / core, binary alpha, like Lumina's
   `FxSprites.createFxAtlas`). `ELFX.sheet(el, scale)` returns the tinted sheet for (element, 1× or 2×) through a
   `source-in` ramp fill per level (the §31 tint cache; shared with the atlas so one function serves both). Three sizes
   exist: 1× (world), 2× (HUD at 2× pixels), and the 4 Bayer dissolve variants on the `high` tier only. Memory ≈ 10
   elements × 3 frames × 7 px × 3 sizes < 40 KB. The sheets are also frozen to PNG by the sprites.js freeze tool
   (`tools/`) so the editor and the icon preview share them; the runtime still bakes if the PNG is missing (no build step).
3. **World particles join the existing pool.** `addPart` grows two optional fields: `spr` (a sheet) and `m` (model id);
   `updateParts` skips Euler for `m` particles and evaluates the closed form in `drawParticles`, which does
   `drawImage(sheet, fx*W, 0, W, H, x, y, W, H)` for `spr` particles and the old `fillRect` otherwise. The composite
   switch stays batched by `glow`. **All per-draw spawns (F3) move into update** (`updateProjs`, `updateEnemies`,
   `updateLoot`, `updateEcho`, `updateAmbient`) with a per-emitter accumulator `acc += dt·rate; while (acc ≥ 1)`. That is
   the offset that pays for this feature on phone: the same particles, spawned once per step instead of once per draw.
4. **A separate UI particle pool, `UIP`.** Screen space, `Float32Array`-backed ring of 48 (desktop) / 24 (phone) slots,
   `{x, y, born, el, model, life}`; drawn at the end of `drawHUD` and of the menu pass with the 2× sheets; cleared on
   screen change. It never touches `G.parts`, so a loud fight cannot starve the HUD and a busy bag cannot starve the fight.
   Spawn calls: `UIP.emit(el, x, y, n, model)`. HUD emitters are gated by `hudShown` (§28 fade-in) so the bare opening
   shows none.
5. **LOD per `QUALITY` tier** (render.js:1466):

   | | high | phone | low |
   |---|---|---|---|
   | sheet scale / dissolve | 1× + Bayer dissolve | 1×, alpha steps | 1×, 2 frames max |
   | world idle rate | ×1 | ×0.5 | ×0 (events only) |
   | emitting bodies (DoT / status) | 12 | 6 | 3 |
   | element light per emitter | yes (a ≤ 0.35) | projectiles only | none |
   | UIP slots | 48 | 24 | 12 |
   | HUD idle | on | status row + boss chips only | off |
   | menu idle | on | hovered only | off |
6. **Budgets.** Counts: inside the existing caps, no raise. Sub-allocation of `PART.cap` 300 (phone) / 600 (desktop):
   combat bursts reserve 120 / 240 (the eviction rule already gives them priority), element idle 90 / 180, scenery
   ambience 90 / 180 (today's motes). Time: the `parts` perf phase (tools/perf.js, `?perf=1`) ≤ 0.6 ms phone and ≤ 0.9 ms
   desktop at the cap, i.e. net ≤ +0.3 ms on phone after the per-draw spawn offset in (3); UIP ≤ 0.15 ms. The acceptance
   gate is the phone p95 reading, not the phase number: ≤ 20.0 ms on pine-fight with 6 emitting bodies.
7. **Bloom.** Particles stay out of VB (F2). A sheet's light step is ≤ 0.9 luminance and the core pixel is one pixel, so
   even the additive `lighter` pass cannot build a white block. Lights: only projectiles and the Echo push a light, at
   `a ≤ 0.35`; idle emitters push none. The m3-feel / perf-parity bloom strips are re-shot (A7) and the fight band is
   measured for near-white pixels.
8. **Settings.** New `particles` choice in `SETTINGS_SCHEMA` display group: Full / Reduced / Off, default from
   `matchMedia('(prefers-reduced-motion: reduce)')` → Reduced. **Reduced**: world idle ×0, UIP off, bursts ×0.5 with a
   floor of 3 (the §27 hit signal survives), no jitter model (lightning sparks become 1-frame motes with the zigzag
   shape, no strobe), no flicker. **Off**: no element motifs anywhere; bursts fall back to today's white/blood squares at
   §27 counts. `flashReduce` on: lights from emitters ×0.5 (through `flashCap`), lightning strobe off, holy glint kept.

## A6. Fit with the §31 pixel FX atlas prototype
The §31 prototype is three effects: slash, fire burst, frost hit. Recommendation: **make it "3 effects + the element
particle set for the same three elements (slash, fire, frost) + the lightning / holy chip pair".** Reasons: the atlas and
the particles must share one tint path and one ramp (A5.1), so the prototype proves the registry; fire and frost are the
two elements with live statuses (Burn, Chill / Frozen) and skills (Firebolt, Meteor, Frost Shard, Frost Nova), so the
strip shows a real cast → hit → DoT chain; slash is the basic attack of the opening. The brief's "fire / frost / lightning"
leaves the holy pair untested, and lightning has no live skill except Chain; so lightning joins only as a static chip
pair with holy (16 px and 1×, greyscale) on the same approval board, not as a world effect. Client decision D2.

### Staging and estimates (agent-days; files touched)
| Step | Work | Files | Days |
|---|---|---|---|
| P0 | `js/elfx.js` registry (10 rows, ramps, motif pixels), derive the five colour tables, hud `EL_ICON_COL` → registry `icon`; a `tools/validate` check that every `DMG_ELS` entry and `gloom` has a row | elfx.js (new), items.js 117, render.js 942, icons.js 46, hero.js 149, menus.js 324, hud.js 19, index.html / editor.html script tags | 0.5 |
| P1 | Bakers: grey sheets, tint cache (shared with the §31 atlas), 1× / 2× / dissolve; PNG freeze in the sprites tool; closed-form models; `addPart` `spr`/`m`; `drawParticles` sprite path | elfx.js, game.js 87-125, render.js 1399, tools (freeze) | 1.5 |
| P2 | Per-draw spawn migration (F3) with accumulators; phone before / after perf pair | render.js 115-121, 744, 766, 853, 865, 907, 1020, 1080-1092, 1157, 1270-1306 → game.js update fns | 1.0 |
| P3 | World surfaces: hit burst colour split, cast bursts, projectile tails, DoT emitters with the body cap, Echo orbit, hero imbue on swing, resonance aura, gem drops, zones | game.js 615-617, 966, 1079, 1303, 1040-1090; data.js casts; render.js drawEcho | 1.5 |
| P4 | `UIP` pool + HUD surfaces (ready flash, cast, status row, WEAK number, boss chips, BREAK) | hud.js 226-240, 292, 684, 88-112, 505-521; ui.js helper | 1.0 |
| P5 | Menu surfaces (hover icon, tooltip header, radiant gems, socketing, stat change) | menus.js 159, 316-500, 624; icons.js 659 | 0.5 |
| P6 | LOD table, `particles` setting + reduced-motion default, `flashReduce` hooks, bloom strips, perf gate | render.js 1466, settings.js, main.js 397 | 0.5 |
| P7 | The §31 prototype board: 3 atlas effects + slash / fire / frost sets + the lightning-holy chip pair; shots in A7 | tools/shots/m4-elfx | 1.0 |
| | **Total** | | **7.5** |
P0-P2 are engine (Opus-level: they touch the pool and the render loop); P3-P5 are data-and-surfaces work (Sonnet-level
with the registry in place); P6-P7 are perf and presentation. P0-P2 and P7 are the approval gate; P3-P5 may run after it
in M5 with the atlas swap. Nothing here needs the §27 or §28 lanes to change.

## A7. Acceptance bar
Measurable checks (all scripted where a number is named):
1. **Phone p95 ≤ 20.0 ms** on `pine-fight` (tools/perf.js, `?perf=1&quality=phone`, 20 s, 6 burning bodies, Firebolt
   spam) and **no regression on `vale-start`**; the `parts` phase ≤ 0.6 ms at the cap. Desktop `high` ≤ 0.9 ms.
2. **Caps hold:** the perf overlay's `parts` readout never exceeds `PART.cap`; UIP never exceeds its slot count; emitting
   bodies ≤ the tier's number (assert behind `?perf=1`).
3. **No white-out:** in a 64×64 px window around the target on the bloom strips, pixels with min(r,g,b) ≥ 250 are ≤ 3 %
   on any frame (a script over the PNGs, same as perf-parity compare).
4. **Frame-skip safety:** the closed-form models give identical positions at 30 and 60 Hz for the same seed and age
   (unit test on `ELFX.pos`).
5. **Greyscale distinctness:** the 16 px chip strip desaturated; each motif differs from every other in at least two of
   {shape, motion, lifetime}; the lightning / holy pair differs in all three (a reviewer check, recorded in the minutes).
6. **Text clear:** no particle pixel is drawn inside any damage-number, nameplate-bar or tooltip-text rect (assert in
   the UIP draw: it rejects a spawn whose rect intersects the last frame's text rects).
7. **Settings:** Off → 0 motifs on every surface; Reduced → world idle 0 and hit bursts ≥ 3; `flashReduce` → no strobe.
Screenshot set, `tools/shots/m4-elfx/` (same conventions as m3-feel / perf-parity):
`strip-<el>.png` (8 frames at 1× on the violet ground, all 10 rows), `chips-16px.png` and `chips-16px-grey.png`,
`chips-1x.png`, `hud-idle.png`, `hud-ready-cast.png`, `hud-status-row.png`, `bossbar-chips.png`, `bag-hover.png`,
`tooltip.png`, `gem-socket.png`, `bloom-strip-fire.png` / `-frost.png` / `-slash.png` (replacing the perf-parity ones),
`pine-fight.before/after/compare.png` and `vale-start.*` with the p95 numbers in the caption, `phone-portrait.png`.
What the client is shown: one board with (a) the three §31 atlas effects, (b) the slash / fire / frost particle strips
beside them in the same ramps, (c) the lightning-holy chip pair at 16 px, colour and greyscale, and (d) the before /
after perf pair with the two p95 numbers. Approval = D1-D4 answered on that board.

## A8. Lumina: what to copy or adapt (credit lines for docs/CREDITS.md, in its one-line format)
Survey §0 caveat stands: the Lumina repo still says "A license has not been selected yet"; CREDITS.md records that the
client accepted the risk. These lines are proposed; CREDITS.md is edited by the implementer, not by these minutes.
* Adapted from Lumina by stubborn-hug (gitlab.com/stubborn-hug/lumina): src/engine/fx/Particles.js (`PARTICLE_PRESETS`,
  `DEFAULTS`, the closed-form `drift` / `emit` / `fall` motion, `BurstPool`, "life ends at spawn height") → js/elfx.js
  `ELFX.MODELS` / `ELFX.pos`; units converted (1 unit = 16 px), GLSL re-written as JS, the 512-slot ring became the UIP ring.
* Adapted from Lumina by stubborn-hug (gitlab.com/stubborn-hug/lumina): src/engine/pixel/FxSprites.js (`createFxAtlas`
  grey-level painting with binary alpha, `framePen`, `stamp`, `packFrames`, the 4×4 Bayer dissolve masks) → js/elfx.js
  `ELFX.bake` / `ELFX.sheet` (shared with the §31 atlas tint cache).
* Adapted from Lumina by stubborn-hug (gitlab.com/stubborn-hug/lumina): src/game/combat/CombatFx.js `EFFECTS` data table
  (frame, mode, lift, colour, duration, scale, "back" offset) and its COMBAT-15/16 lesson (celebration bursts sit at the
  bloom threshold, big white frames cut ~40 %) → js/elfx.js registry row shape and rule R5.
* Idea only, no code: Lumina docs fx.md §3-4 (`nightVisibility`, twinkle / blink / pulse per preset) → the holy glint
  phase and the fire flicker toggle.
Not taken: `FxQuads.js` (instanced mesh), the GLSL motion, the 2 600-drop rain, `hdr` multipliers (we have no HDR).

## A9. Extensibility: adding an element (the template the elements meeting can use)
The elements meeting may add Wind and other classics. Everything above is data-driven so a new element is **one registry
row, one status row set, and zero new draw code**. The checklist, in order:
1. **Registry row** in `js/elfx.js` (the only place colours live):
   ```js
   wind: { ramp: ['#4a7a80', '#7fc8c0', '#c8f0e8', '#ffffff'], textCol: '#c8f0e8', icon: 'wind', gem: null,
           motif: { w: 5, h: 3, frames: 2, pixels: ['..12.', '.12..', '12...',   '12...', '.12..', '..12.'] },   // a curl
           model: 'dash', k: 4, vz: 0.2, wobble: 0.4, flicker: false, life: [0.4, 0.8],
           idle: { rate: 2, alive: 2 }, burst: { n: 8, spd: 4 }, light: null }
   ```
   Rules the row must pass (the `tools/validate` check from P0 enforces the mechanical ones): a 4-step ramp with the
   core the only step above 0.9 luminance; a motif ≤ 5×5 px with ≤ 3 frames; a model from A3 (a new model is a 5-line
   closed form in `ELFX.MODELS`, never per-particle state); a life band; and the **greyscale pair test** against every
   existing row: differs in two of {shape, motion, lifetime} from each, three from its nearest neighbour (for Wind the
   neighbour is frost: both drift; Wind is a horizontal curl that dashes, frost a cross that falls).
2. **Derived tables fill themselves:** `EL_COL`, `ECHO_ELCOL`, `ICONS.EC`, `HERO.ELC`, `STAT_COL` read the registry
   (A5.1), so item text, Echo tint, skill frames, hero trinkets and stat rows colour correctly at once. Add the id to
   `DMG_ELS` (items.js:123) and the `PCT_STATS` / `STAT_NAME` loops generate `windDmg` and its resist. If the element has a
   gem, add it to `GEMS` / `EL_GEM` and the `GEM` shape in icons.js:674; if not, set `gem: null` and the socket rows skip it.
3. **Skill and projectile hookup:** a skill's `element: 'wind'` in data.js and a projectile `kind` (or `el`) are all the
   world surfaces need; A4's emitters key on the element, not the skill.
4. **Status rows** (Part B) in `js/status.js`: a `LADDER.wind = [...]` with rows whose `visual` block names only registry
   motifs and the generic overlay bakers (`tint`, `char`, `ice`, `vine`, `rent`, or a new baker, which is one cached
   silhouette operation). The over-head glyph is one 8×8 entry in the icons.js glyph set.
5. **Chip and strip:** re-run `chips-16px.png` / `chips-16px-grey.png` and add `strip-wind.png`; the pair test is recorded
   in the minutes of the meeting that adds the element.
Worked Wind proposal (for the elements meeting; VFX view only): motif = a 5×3 curl that dashes sideways along the hit
normal with wobble, life 0.4-0.8 s; palette = a cool teal-white so it sits between frost (blue) and nature (green) by
hue but reads by motion (horizontal, fast, curling) against both (frost falls, nature tumbles); no light; its status
read would be a **Buffeted** tint plus a 1 px sideways draw offset (the mirror of Shocked's jitter, but steady), and
Wind never needs a tier-2 overlay (no freeze-like pose), so it costs no new baker. World and puzzle uses the meeting may
want (gusts moving leaves, wind lanes) are already the §29 G2 "travelling gusts" and the A3 `dash` model with a world
wind vector; a wind lane is a zone emitter (A4 "element zones") with the curl motif at 4/s.

---

# Part B. Elemental statuses: the ladder, the body read, the data

**Scope note (director, after this meeting):** a long elements design meeting (client, expert game director, a team of
experts) follows and will own the status *mechanics*: each element's gameplay role, the ladders, thresholds, durations,
combos, possibly new elements (Wind and other classics), and elements in puzzles and the world. **B2 and B3 are the VFX
director's proposal, for the elements meeting to rule on.** They exist so the visual language (B4) and the data shape (B5)
are designed against a concrete ladder; the elements meeting may change any number or row. B1, B4, B5 and the visual
template in A9 stand on their own and are built to take new elements and new statuses without redesign.

## B1. What exists today (F10, F11)
Burn (timer + 0.5 s tick of 14, refresh = max), Slow (×0.55 speed, timer), Stun (timer, boss ×0.25, tumble 0.3 s),
Frozen (a flag riding on Stun), boss Stagger / BREAK; hero Slowed, Rooted, Dread, hurt flicker, buffs. Procs: `fireBurn`
(burnChance), `frostPower` (freezeChance); `naturePower` / `lightningPower` / `arcanePower` are stubs waiting for Poison /
Shock / Marks. `statusChance` is summed, unused. Seven reactions are specified in §15.4 with their sfx and a bestiary
"best reaction" line, all M4. Resonance (+25 % reaction bonus per matched ring pair) is computed and waits for reactions.
So the ladder below is the M4 reaction system's missing half: the statuses the reactions consume.

## B2. Build-up rules (one mechanism for every element) — VFX director's proposal, for the elements meeting to rule on
* Every elemental hit (not DoT ticks, not Echo hits beyond half) adds **build** to the target in that element:
  `build = 25 · w · (1 + statusChance) · (gem grade bonus: +5 % per grade of that element's gem, i.e. elementAmp ×1)`,
  `w` = the §27 skill weight (basic 1, heavy 1.5, ultimate 2). A weak target (`res < 0`) takes build ×1.5, a resisting one
  ×0.5, an immune one 0. **Bosses take build ×0.25** (the existing stun rule), elites ×0.5.
* **Tiers at 50 / 100 / 150 build.** Reaching a tier applies that status at its duration; build keeps climbing to the
  next tier while hits land. Build decays 20 / s after 1.5 s without a hit of that element. A tier's status, once applied,
  runs its own timer; it does not need the build to stay up.
* **One ladder per element, at most two ladders live per enemy** (the oldest is dropped) for readability. The hero takes
  at most two statuses as well.
* **Consumption:** a reaction consumes the ladder (build → 0, status cleared) and grants **immunity to that element's
  tier-2 status for 4 s (bosses 8 s)**, so Frozen / Blinded / Entangled cannot chain-lock.
* **Stacking:** only Poison (×3 ticks) and Marks (×`markCap`, 5) stack; everything else refreshes.
* Statuses never hitlag (§27: DoT ticks never freeze); the applying hit does.

## B3. The ladder per element — VFX director's proposal, for the elements meeting to rule on

| Element | Tier 1 (50) | Tier 2 (100) | Tier 3 (150) | Reaction it feeds (§15.4) | Boss |
|---|---|---|---|---|---|
| fire | **Scorched** 4 s: +10 % fire damage taken | **Burning** 3 s: 14 per 0.5 s (today's values; `e.burnT`) | **Ablaze** 4 s: tick ×2, and on expiry 1 ember burst that applies Scorched within 1 tile | Detonate (stagger ≥ 3 on Burning), Wildfire (fire on Poisoned spreads Burn), Purify (holy consumes) | Ablaze allowed (×0.25 build means 4× the hits); tick ×0.5 on bosses |
| frost | **Chilled** 3 s: speed ×0.55 (today's Slow), attack wind-up ×1.2 | **Frozen** 1 s (boss 0.25 s): no action, no animation, `e.frozen` | – (Shatter is the consume) | Shatter (slash / stagger hit on Frozen or 3× Chill: 150 % AoE), Conduct (lightning on Chilled jumps Shock) | Frozen 0.25 s, then Chilled; never Frozen twice inside 8 s |
| lightning | **Static** 3 s: the next lightning hit crits for +50 % of its build (a tell, no damage) | **Shocked** 2.5 s: +20 % damage taken from all elements; Shocked bodies within 2 tiles arc to each other for 10 % weapon damage every 0.5 s (the "chain") | – | Conduct (jump), Overload (arcane on Shocked: +40 %, −1 s cooldown) | Shocked +10 %; arcs from a boss hit minions, never the reverse |
| nature | **Poisoned** 5 s: 8 per 0.5 s, stacks ×3 (each stack adds a tick) | **Entangled** 1.2 s (boss 0.3 s): rooted, can still attack | – | Wildfire (fire consumes Poison), Purify | roots never on bosses: Entangled becomes Chilled-equivalent 1 s (speed ×0.55) |
| arcane | **Marked** stacks to `markCap` (5), 6 s: +4 % damage taken per mark | **Unravelled** (all 5 marks or tier 2 build): consumes the marks for 30 % weapon damage each, 1 s speed ×0.5 | – | Overload (arcane on Shocked) | marks ×0.25 build: a boss reaches 5 marks only on a focused build, which is the point |
| holy | **Smitten** 4 s: +50 % holy damage taken if gloom-aligned (`e.el === 'gloom'` or the gloom tag), +15 % otherwise | **Blinded** 1.5 s (boss 0.4 s): loses its target, wanders; once per 10 s per enemy | – | Purify (holy on Burn / Poison heals 5 %) | Blinded 0.4 s = a BREAK-like opening, counts against the 8 s immunity |
| slash | **Bleeding** 4 s: 6 per 0.5 s, ticks ×2 while the body moves (a reason to let it chase) | **Rent** 4 s: −15 % defence | – | Shatter (slash on Frozen); Rupture is pierce | Rent −8 % on bosses |
| pierce | **Pierced** 3 s: +10 % crit chance against it | **Pinned** 0.6 s (boss 0): stun + stagger +1 | – | Rupture (pierce on a full stagger bar: guaranteed crit, consumes the break) | no Pinned; Pierced only |
| shatter | not a status: the Shatter reaction's burst and its `shatterDmg` scaling | | | | |
| gloom (enemy → hero) | **Dread** (exists, `p.dreadT`): −20 % MP regen; **Gloomed** 3 s: vision vignette +20 % | | | Purify clears | – |

Cross-element combos beyond the seven reactions, kept as **status interactions** (no name pop, no sfx of their own, so
§15.4's "seven, no more" holds):
* Frozen + fire = **Thaw**: Frozen ends at once, the fire hit deals +25 %, a 1-tile steam decal for 1 s that hides the
  thawed body's telegraphs (a player-side cost: you lose the read). Not a reaction; client decision D5 if the client wants
  it named "Steam".
* Burning + frost = **Quench**: Burn ends, Chilled applies at tier 1. No damage.
* Shocked + nature = nothing (fair: nature is the control line, lightning the damage line; no triple-dip).
* Frozen + shatter = the Shatter reaction (exists).
* Holy on anything gloom-aligned keeps the §15.4 +50 %.
Fairness guards: two live ladders per enemy; tier-2 immunity 4 / 8 s; roots and blinds never on bosses beyond 0.3-0.4 s;
Ablaze and Unravelled cannot be applied by an Echo hit (its build is ×0.5 and it never reaches tier 3); DoT damage per
second per body is capped at 300 % weapon damage (§4.6's reaction cap, reused).

## B4. The visual read on the body (per status; uses the A2 motifs)
Layer order on an enemy: base sprite → status tint (a `silOf` key, alpha-blended) → overlay frame (cached per sprite
size) → attached particles → stun stars / status icon above. All cached blits; no per-frame painting.

| Status | Tint / overlay | Particles (A2 motif) | Pose / animation | Ground decal | Over-head icon (8×8 glyph, 2× on HUD) |
|---|---|---|---|---|---|
| Scorched | tint fire dark 25 % on the lower half (a `silOf` with a vertical clip) | none | – | – | none (tier 1 is read from the tint only) |
| Burning | tint fire mid 35 %, alternating with 20 % at 4 Hz (a two-key flicker) | ember 3/s rising from the torso | – | – | flame glyph, timer sweep |
| Ablaze | Burning + a 1-frame **char overlay**: the sprite's outline pixels darkened to #140f17 and 2 px of flame outline above the head (cached per sprite) | ember 6/s, 1 core pixel each | – | 1-tile scorched ring, 4 s (a cached dark ellipse, alpha 0.25) | flame glyph with "!" |
| Chilled | tint frost light 30 % | snowflake 2/s falling off the head | animation rate ×0.55 (already: `edt` is scaled) | frost footprints: the last 3 positions get a 3×2 pale mark for 1.5 s | snowflake glyph |
| Frozen | **ice-crust overlay**: the sprite's silhouette expanded 1 px, filled frost light at 60 % with a 1 px core rim at the top-left, cached per sprite; the body itself at 70 % | none while Frozen; 8 shards on thaw | **no animation** (freeze `e.anim`), hop offset 0, the body is drawn from the frame it was on | a 5×3 ice plate under the feet | cube glyph, timer sweep; the sweep is the only motion |
| Static | tint lightning light 20 % for 2 frames every 0.5 s | 1 spark per 0.5 s | – | – | none |
| Shocked | tint lightning mid 30 %, **2-frame jitter**: the sprite draws at ±1 px x on alternating frames (a draw offset, never `e.x`) | sparks 1 per 0.08 s; chain arcs = the existing `lightning` effect type with 2 points, 0.1 s | the jitter is the pose | – | bolt glyph |
| Poisoned | tint nature mid 30 %; stacks darken toward nature dark (1: 30 %, 2: 40 %, 3: 50 %) | leaf 1.5/s falling, 1 px darker | – | – | drop glyph with the stack digit |
| Entangled | tint nature dark 30 % + a **vine overlay**: two 1 px diagonal lines across the lower half, cached per sprite | leaf 3/s | **no walk cycle**, attack frames allowed | a 7×4 root tangle under the feet (cached, from PAL_BARK) | root glyph |
| Marked | no tint; **1 to 5 rune pixels** orbiting at head height (the arcane orbit motif, 1 alive per mark) | the marks are the particles | – | – | none: the orbiting marks are the count |
| Unravelled | tint arcane light 40 % for 0.2 s then nothing | 10-rune burst | 0.2 s squash (the existing `e.squash`) | – | none |
| Smitten | tint holy light 20 % | mote 1/s | – | – | sun glyph |
| Blinded | tint holy core 40 % on the head only (a clip at 40 % height) | 3 motes orbiting the head (the stun-star slot, holy colour) | the enemy wanders: `chase` toward a random point 3 tiles off (there is no `wander` state today; no new state needed) | – | eye-slash glyph |
| Bleeding | tint slash dark 20 % + 2 px of blood colour (`e.blood`) at the hit side | 1 blood square per tick, falling | – | 1 px blood dots on the last 2 positions, 2 s (reuses the corpse-mote colour) | drop glyph |
| Rent | a 1 px gap in the outline at the hit side (overlay: 2 px of the outline erased, cached) | none | – | – | cracked-shield glyph |
| Pierced / Pinned | an arrow sprite stuck in the body (ART.weapons.arrow, drawn at the hit angle, 3 s) | none | Pinned: no animation 0.6 s | – | none |
| Dread / Gloomed (hero) | the hero's `hurtT` flicker colour becomes gloom pink; vignette +20 % | gloom smudge 1.5/s | – | – | hero status row slot |

Readability with many enemies on screen (desktop up to ~20, phone fewer):
* **Tint is always drawn** (it is one cached blit, the same cost as the hit flash).
* **Particles only from the nearest `emitting bodies` cap** (A5.5: 12 / 6 / 3).
* **Over-head icons:** desktop: bodies within 6 tiles of the hero, at most 8, debuff-first; phone: elites, bosses and the
  last-hit enemy (`G.lastHit`) only. Icons replace the nameplate pips (hud.js:183) and never draw over a nameplate bar:
  they sit above the bar, 10 px per icon, at most 3 per body, the timer as a 1 px sweep ring (the `UI.sweep` helper).
* **Boss bar:** a status row under the weak / resist chips: up to 4 glyphs at 16 px with the stack digit and the sweep.
* The hero: the existing status row (hud.js:226) gains the element glyph set and the stack digit; no change of layout.

## B5. Implementation: the `STATUS` table, hooks, cost, caps, LOD
* **`STATUS` table in `js/status.js`** (classic script, after elfx.js). One row per status:
  `{ id, el, tier, dur, bossDur, stack:1|3|5, dot:{dmg, tick}|null, speed, root, stun, dmgTaken, defMul, immuneAfter,
  visual:{ tint:[rampIdx, alpha, clip], overlay:'char'|'ice'|'vine'|'rent'|null, parts:{motif, rate}, pose:'none'|'jitter'|
  'freeze'|null, decal:id|null, icon:glyph }, reactions:[ids] }`. The ladder is `LADDER[el] = [tier1Id, tier2Id, tier3Id]`.
  The visual block only names registry motifs and overlay bakers; no colours live in status.js.
* **Enemy state:** `e.status = { fire:{build, t, tier, stacks, immuneT}, … }` (at most two keys live), plus `e.frozen`,
  `e.jitter` draw offsets. `e.burnT` / `slowT` / `stunT` stay as the effect timers that the rest of the code reads; the
  table *drives* them (Burning writes `burnT`, Chilled writes `slowT`, Frozen writes `stunT` + `frozen`), so hud.js, parts.js
  and bosses.js keep working unchanged during the migration.
* **Hooks:**
  1. `damageEnemy` (game.js:895): after `res` and `eff` are known and before the §27 hitlag call, `addBuild(e, el, w, c)`.
     It owns the ladder, the tier-up, the immunity and the `statusApplied` EFFECTS hook (`when:'statusApplied'`, listed in
     §4.6 but unused today). Reactions (M4) check the table rows' `reactions` in the same place, right after build, and
     consume through `clearLadder(e, el)`.
  2. The 1 Hz heartbeat (game.js:1270-1272) and the per-frame enemy loop (1301-1306): one `tickStatus(e, dt)` replaces the
     burn / slow / stun lines: decay, DoT ticks (never hitlag), expiry, and the particle accumulator (B4 rates, under the
     body cap).
  3. `hurtPlayer` (game.js:873): the same `addBuild` for the hero's two statuses; `heroStatuses` reads them.
  4. hitlag: statuses never freeze; the applying hit already did. Frozen on apply: a 2-step target-only freeze (inside the
     §27 budget) sells the stop.
  5. `drawEnemy` (render.js:1098): one `statusLook(e)` returning `{tint, overlay, pose, decal}` read once per draw; the
     decal goes into the decal pass (287) so it sorts under bodies.
  6. hud.js nameplate (183) → `drawStatusIcons(e)`; boss bar (521) → the status row; the hero row reads the same glyphs.
* **Render cost per status-bearing enemy:** tint = 1 cached blit (`silOf` key `(sprite, colour, alphaBucket)`; alpha
  bucketed to 0.1 so the cache stays ≤ 10 keys per sprite per colour); overlay = 1 blit (cached per sprite per status:
  ice, char, vine, rent; ≤ 4 × sprite count, baked lazily); particles per A5; decal = 1 blit; icon = 1-3 blits on the HUD
  canvas. Worst case ≈ 5 blits a body, ~0.02 ms on phone; 20 bodies 0.4 ms, which is why the particle and icon caps exist.
* **Caps:** two ladders per body; emitting bodies 12 / 6 / 3; icons 8 bodies / 3 each (phone: elites + boss + last hit);
  decals 16 alive (a ring); chain arcs 6 per 0.5 s; DoT damage per second per body ≤ 300 % weapon damage.
* **LOD:** `high`: everything; `phone`: no Bayer dissolve, no decals except the ice plate and the root tangle (they carry
  gameplay), icons on elites / boss / last hit; `low`: tint + overlay + icons on the boss only, no status particles, the
  jitter pose kept (it costs nothing and is the Shocked read).
* **Settings:** `particles` Reduced: status particles ×0, overlays kept; `flashReduce`: the Burning tint flicker becomes a
  steady 30 %, the Shocked jitter stays (it is 1 px). Both keep the icons, which are the accessible read.

## B6. Staging relative to the particle work (agent-days; files)
The ladder needs the registry (P0) for its colours and the sheets (P1) for its particles, and it *is* the M4 reaction
system's first half, so it follows P0-P2 and runs beside P3-P5 inside the M4 combat lane (DESIGN §31 M4 list). **S1 and
S4 start only after the elements meeting rules on B2 / B3**; S2, S3 and S5's visual parts can start on the draft, since
B4 / B5 do not change with the numbers. The estimates assume the ruling keeps roughly this shape (2-3 tiers, ≤ 10
elements); each added element is about +0.5 d (one registry row, one ladder, one glyph, one strip).

| Step | Work | Files | Days |
|---|---|---|---|
| S1 | `js/status.js` table, `addBuild` / `tickStatus` / `clearLadder`, the fire and frost ladders driving `burnT` / `slowT` / `stunT` / `frozen`; `statusChance` read; bestiary `reactions` wiring | status.js (new), game.js 895-972, 1270-1306, 873; items.js 254 (statusChance rolls on) | 2.0 |
| S2 | Body visuals: tint keys in `silOf`, the four overlay bakers, poses (freeze, jitter), decals in the decal pass | render.js 33, 1098-1230, 287 | 1.5 |
| S3 | HUD reads: over-head glyphs with the caps, boss-bar status row, hero status row glyphs, the 10 glyphs in icons.js | hud.js 170-186, 226-240, 505-521; icons.js (glyph set) | 1.0 |
| S4 | The other six ladders (lightning chain arcs, poison stacks, marks, holy blind wander, bleed, pierce) and the Thaw / Quench interactions; `naturePower` / `lightningPower` / `arcanePower` procs un-stubbed | status.js, game.js 258-281, data.js skills | 1.5 |
| S5 | Boss scaling, immunity, caps, and the balsim pass (Bramblehorn-class fights stay in their length band, §30's gate reused); reduced / flashReduce paths; shots | tools/balsim, settings.js | 1.0 |
| | **Total** | | **7.0** |
Order: P0 → P1 → P2 → (P7 approval) → S1 → S2 → S3 → P3-P5 → S4 → S5 → P6. The M4 reactions (§15.4) slot in after S1,
since they consume ladders that S1 creates. Total for both parts: 14.5 agent-days, of which 3 (P0-P2) are the engine gate.

Status acceptance (added to A7): `strip-status-<el>.png` (apply → tier 2 → expiry, 8 frames), `crowd-8.png` (8 enemies,
4 statuses, desktop: every icon legible and no icon on a bar), `phone-crowd.png` (the same scene at phone tier: tints
only plus the boss and last-hit icons), `bossbar-status.png`, `frozen-thaw.png` (ice crust → shards). Checks: no body
ever shows more than two ladders; Frozen never re-applies inside its immunity; the p95 gate of A7.1 re-run with 6
status-bearing bodies in view.

---

## Decisions for the client
| # | Decision | Options | VFX recommendation |
|---|---|---|---|
| D1 | Holy's base colour (F1) | A: gold #ffd75a (icons today) — warm, reads "holy" but sits next to lightning yellow; B: pale white-gold #fff2c4 (the Echo today) — separates from lightning by hue too, cooler | **B**, with gold only as the glint core; the motif table separates the pair by shape and motion either way |
| D2 | The §31 prototype scope | A: 3 atlas effects only; B: 3 effects + slash / fire / frost particle sets + the lightning-holy chip pair (A6); C: B with lightning as a world effect too (+0.5 d) | **B** |
| D3 | The `particles` setting | A: Full / Reduced / Off with a reduced-motion default; B: fold into `flashReduce` | **A** (reduced motion and flash sensitivity are different needs) |
| D4 | HUD idle particles | A: none at idle anywhere on the HUD, events only; B: the A4 idle set (status row, boss weak chips, resonance sheet) | **B on desktop, A on phone** (the LOD table already says so); the client asked for "even on hud", B honours it without a snow globe |
| D5 | Thaw / Quench | A: silent status interactions (B3); B: named reactions "Steam" and "Quench" (breaks §15.4 "seven, no more", +2 sfx) | **A** |
| D6 | Status ladder depth | A: three tiers for fire only, two elsewhere (B3); B: three tiers everywhere (+1 d, more icons) | **A** |
| D7 | Where the status work lands | A: inside the M4 combat lane beside the reactions (B6); B: after M5 with the atlas swap | **A**: the reactions have nothing to consume without it |
| D8 | Status mechanics ownership | The elements meeting rules on B2 / B3 (ladders, thresholds, combos, new elements such as Wind); this meeting's proposal is its starting draft | Keep B4 / B5 / A9 as the fixed visual and data contract so the meeting's ruling drops into `status.js` rows without redesign |

Hand-off to the elements meeting: B2 and B3 as the draft ladder; A9 as the template for any element it adds; the A2
greyscale pair test as the bar any new motif must pass; D1, D5 and D6 as the questions it should answer in passing.
