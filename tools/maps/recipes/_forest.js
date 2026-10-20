'use strict';
// Shared Misty Pinewood prop palette. scale = 1 for a 56-tile map; counts are targets (spacing rejects some).
// §29 G2 density (world-art minutes §2.3): every n x DENSITY (2.5); pine sp 1.5 -> 1.0, young 0.95 -> 0.6; trees clump in groups
// [2, 5] spread 1.6; one open glade per 15 x 15 (glade()); oak + birch join the pines (>= 3 species a frame); variants span every
// sheet (art.js: 6 tall / 6 young / 3 giant pines, 12 broadleaf sheets) and gen.js scatter keeps equal (type, variant) 3 tiles apart.
// Trees are lit-side sheets: no `flip` (maps.js mirrors them only for a left-lit theme). Flat clutter is mostly baked ground decals
// now (js/maps.js decals), so the sprite clutter here only scales where it stands up (grass, toadstools, rocks, logs, stumps, moss).
const { DENSITY, sstep, glade } = require('./_density.js');
module.exports = function forestRules(scale = 1) {
  const n = k => Math.round(k * scale * DENSITY);
  const wall = c => sstep(5.5, 1, Math.max(0, c.dEdge));   // 0 inland .. 1 on the rim
  return [
    // collider clutter first: at x2.5 tree density the trees would otherwise take every spot
    { t: 'rock', n: n(14), sp: 1.2, v: 3, flip: true, group: [1, 3], spread: 1.1, p: c => 0.25 + 0.75 * c.cliff + 0.3 * wall(c) },
    { t: 'log', n: n(5), sp: 3, v: 0, flip: true, p: c => sstep(1.5, 3, c.dPath) * (c.dRoom < 3 ? 1 : 0.3) },
    { t: 'stump', n: n(7), sp: 2, p: c => 0.3 + 0.7 * sstep(0.5, 0.7, c.cl) },
    { t: 'moss', n: n(8), sp: 2, v: 3, flip: true, p: c => 0.3 + 0.7 * sstep(0.5, 0.7, c.cl2) },
    // dense tree line hugging the coast and corridors (but never on them)
    { t: 'pine_giant', n: n(16), sp: 3.2, v: 3, p: c => (0.10 + 0.9 * wall(c) * sstep(1.2, 3.5, c.dPath) + 0.5 * sstep(0.62, 0.8, c.cl) * sstep(2.5, 5, c.dPath)) * glade(c) },
    { t: 'pine', n: n(60), sp: 1.0, v: 6, group: [2, 5], spread: 1.6, p: c => (0.1 + 0.9 * wall(c) + 1.0 * sstep(0.55, 0.75, c.cl)) * sstep(0.6, 2.4, c.dPath) * (c.dRoom < 0.5 ? 0 : 1) * glade(c) },
    { t: 'pine_young', n: n(34), sp: 0.6, v: 6, group: [2, 5], spread: 1.6, p: c => (0.2 + 0.8 * sstep(0.45, 0.7, c.cl2)) * sstep(0.5, 2.5, c.dPath) * glade(c) },
    // the broadleaves: oaks round the room rims and glades (amber under the dusk sun), birches in groves on the moister ground
    { t: 'tree_oak', n: n(9), sp: 1.8, v: 12, group: [1, 3], spread: 1.6, p: c => (0.25 + 0.75 * sstep(4, 1, c.dRoom)) * sstep(1, 3, c.dPath) * glade(c) },
    { t: 'tree_birch', n: n(12), sp: 1.0, v: 12, group: [2, 5], spread: 1.6, p: c => (0.15 + 0.85 * sstep(0.5, 0.72, c.cl2)) * sstep(0.8, 2.6, c.dPath) * glade(c) },
    { t: 'mushroom_red', n: n(18), sp: 0.5, group: [3, 5], spread: 0.9, p: c => sstep(0.5, 0.75, c.cl) * sstep(0.3, 1.5, c.dPath) },
    { t: 'grass', n: n(26), sp: 0.5, v: 2, flip: true, group: [2, 4], spread: 1.2, p: c => 0.2 + 0.8 * sstep(0.45, 0.65, c.cl2) },
  ];
};
