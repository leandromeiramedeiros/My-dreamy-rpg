# Lighting, status FX and particles

Terms: [../GLOSSARY.md](../GLOSSARY.md). Status rules: [elements-statuses.md](elements-statuses.md). Sprites: [visual-bible.md](visual-bible.md).
Wind drives fog and rays: [wind.md](wind.md).

The half-resolution coloured lightmap stays as the light buffer. Everything below is a runtime layer, never baked into sprites.

## Layers
Caps are high / phone / low.

| Layer | Rule |
|---|---|
| Light buffer | `lightPool` 40 / 24 / 16 |
| Dynamic lights | `{sx, sy, r, col, a, flicker, bloom}`. Status lights alpha 0.35 or less: Burning r24 a0.3 flicker, Shocked r16 a0.35 strobe, Smitten r20 a0.2, Frozen r16 a0.2 cool. 15 % of the light cap is held for status lights (6 of 40); over the cap, fireflies cull first, then map lights, then spells and bodies, farthest from the hero first; lights from one body merge |
| Rim light | forge rim mask tinted by the dominant light, light vector quantised to 8. All entities up to 12 / hero, bosses, elites / off |
| Shadows | ellipse offset away from the strongest light (clamp 6 px). Desktop adds a skewed silhouette for hero and bosses |
| Bloom | emitter-only with a `bloom` weight per light (statuses 0.4, gear 0.6, spells 1.0, lanterns 1.0). At most 3% near-white pixels in a 64 px window around any enemy. Full / half / off |
| Status layers | `STATUS_FX[status] = {tint, overlay sheet (char, ice, vine, rent, wet), motif emitter pinned to sockets, light, pose, glyph}`. 12 / 6 / 3 emitting bodies |
| World status | burning grass tiles (4 emitting), ice glints, wet rim: 4 / 2 / 0 |
| HUD status | portrait rim pulse, status row icons with the UIP motif, an element dot on a skill that would react |
| God rays | forest and cave-mouth sections only; wind phase and canopy dapple lights |
| Fog | height-aware (alpha x0.6 on raised tiles), chunk-baked mist pools, a clear zone around the hero, wind-scrolled layers: 3 / 1 / 1 |

* Additive passes never stack more than twice.

## Per-status visuals
Each status has a tint key, a cached overlay, a pose, a decal and an 8x8 over-head glyph with a stack digit.
* Buffeted: tint and a 1 px offset. Lifted: hop x1.5 and 3 curls. Wet: tint, highlight and droplets; the wet tile gets a rim.
* Drift shows the carried element's motif ring. Ice uses the frost ramp with at most one glint light per 4 tiles.
* Holy base is pale white-gold. Wind is a teal curl row.

## Particle language (`ELFX`, `tools/lib/elfx.js`)
One registry: a 4-colour ramp, motif, motion model, rates, light and HUD colour per element.

| Element | Motif |
|---|---|
| fire | rising ember diamonds |
| frost | falling 5 px snowflakes |
| lightning | 2-frame zigzag strobe |
| nature | tumbling leaves |
| arcane | rising bars and orbiting runes |
| holy | slow motes blinking into a cross |
| slash | streaks |
| pierce | darts |
| shatter | bouncing shards |
| wind | curl |

* Models are closed-form, plus `bounce` and `drift`. Grey-level sheets are tinted through one tint cache.
* World particles join `G.parts`. A screen-space `UIP` pool (48 / 24 / 12) serves the HUD.
* Never on: damage numbers, HP bars, tooltips, touch controls, minimap, the bag at rest. Particles never feed bloom.
* Particle hard cap about 600. Setting `particles`: Full / Reduced / Off.

## Performance budgets (ms, phone / desktop)

| Item | Budget |
|---|---|
| Lights | 2.5 / 3.0 |
| Rim | 0.4 / 0.8 |
| Shadows | 0.3 / 0.6 |
| Bloom | 1.2 / 1.6 |
| Status overlays + emitters | 0.5 / 0.8 |
| Fog + rays | 0.8 / 1.4 |
| Particles phase | 0.6 phone |

Frame p95 at most 20.0 ms on phone (the `stress` arena: 24 awake bodies, 40 lights, 6 status bodies, 4 spell lights and a burning grass ring; [arenas.md](arenas.md)) and 16.7 ms on desktop.
Measured by `js-final:tools/perf.js` (`?quality=phone`, CPU throttle).
Forge-enemy fight (`js-final:tools/perf.js --scene=stress`, forge enemies): budgets are steady-state, measured over 60 s. Tinted frames are made the
first time each (frame, direction, status) is seen, so a 20 s window is mostly cold cache (status 0.48–0.55 at x4, 0.44 at 60 s).
