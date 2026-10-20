# Credits

Code and techniques adapted from other projects. One line per lift.

## Lumina (gitlab.com/stubborn-hug/lumina)

Lumina has no licence file yet; the client accepted the risk and authorised the lifts (docs/meetings/2026-10-20-lumina.md §0.4, §5).
The lines below were re-written for Canvas 2D rather than pasted.

* Adapted from Lumina by stubborn-hug (gitlab.com/stubborn-hug/lumina): src/game/ResolutionGovernor.js → js/main.js `GOV` / `governorStep` / `governorSettle`. The rules are kept: median of 5 samples, step down after 4 slow medians and up after 20 fast ones, a 3 s cooldown. The changes are DPR rungs of 0.125 from 0.5 to 1.0, CPU frame time as the timing source, and the 'low' quality tier below the lowest rung.
* Adapted from Lumina by stubborn-hug (gitlab.com/stubborn-hug/lumina): src/engine/lighting/LightPool.js → js/render.js `lightPool` / `lightCost`. The rules are kept: −2 cost for lights already lit, a re-rank every 0.2 s, and a 0.35 s fade when a light changes owner, inside fixed slots. The screen-space ranking and the per-frame light tracking are ours.
* Adapted from Lumina by stubborn-hug (gitlab.com/stubborn-hug/lumina): the emitter-only bloom (Lumina's emitter / FX glow, e.g. src/engine/fx/FxQuads.js, src/engine/world/props/Flame.js; their COMBAT-15/16 rule that VFX colours sit at the bloom threshold) → js/render.js `bloomEmitters` / `applyBloom`.
* Adapted from Lumina by stubborn-hug (gitlab.com/stubborn-hug/lumina): the fog clear zone around the player (a `destination-out` radial hole, cf. src/engine/lighting/Sky.js) → js/render.js `drawFogClear`.
