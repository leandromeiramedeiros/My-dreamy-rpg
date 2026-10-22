# Wind

Terms: [../GLOSSARY.md](../GLOSSARY.md). Code: `js/wind.js`. Statuses (Buffeted, Lifted, Drift): [elements-statuses.md](elements-statuses.md).
Visual layers that scroll with wind: [lighting-status-fx.md](lighting-status-fx.md). Hush slows the wind field: [combat-feel.md](combat-feel.md).

## Field
`WIND.sample(x, y, t)` returns `{vx, vy, s}`: ambient plus at most 4 pooled emitters (the oldest is dropped). The magnitude `|W|` is capped at 3 tiles per second for props.
* Ambient: a per-section base vector of 0.2 to 0.8, a travelling gust front (about 25-tile period, ~1.7 tiles per second),
  and a two-frequency sway.

## Emitter kinds
| Kind | Used by |
|---|---|
| vector (cone, line) | Gale, Bow Tumble gust, Storm Sweep, Fans Veil Dance, the fog-bank verb |
| radial | Orb Tempest, blast landings |
| pull | Gravity Well (vortex), Singularity |
| blast (ring, 0.15 s impulse) | wind-tag ultimates, Lifted landings |
| zone (slow tangent swirl) | windmill vents, Drifting Isles |

## Receivers
* Trees: 5 canopy frames, -2 to +2 px on the top 60%. The near band (up to 60 trees) samples the field; the far band uses the ambient.
  A blast gives a 2-frame whip plus a decaying closed-form swing. Per-tree spring state is not used.
* Grass, bushes, banners, lanterns: 2 to 3 frame flips. Lanterns swing; banners stream.
* Decals shed `drift` particles when `s` > 0.6. Projectiles drift by `force x 0.3`.
* Enemies: push = W x (1 - resist) x mass factor.
  * Mass factors: beast 1.0; armoured 0.3 (Buffeted only); amorphous 0.5 (never Lifted); ethereal and flying 1.5.
  * Elites x0.5. Bosses x0, with a 0.5-tile shove only in moves marked `open >= 1 s`.
* Hero: pushed by emitters only, x0.5. A dodge ignores it.
* Fog banks are blown by emitters; god rays and fog scroll with the ambient.

## Budget
`WIND.sample` costs 0.2 ms or less for 60 trees + 40 enemies + 4 emitters.
