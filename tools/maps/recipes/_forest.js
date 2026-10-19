'use strict';
// Shared Misty Pinewood prop palette. scale = 1 for a 56-tile map; counts are targets (spacing rejects some).
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
module.exports = function forestRules(scale = 1) {
  const n = k => Math.round(k * scale);
  const wall = c => sstep(5.5, 1, Math.max(0, c.dEdge)) ;   // 0 inland .. 1 on the rim
  return [
    // dense tree line hugging the coast and corridors (but never on them)
    { t: 'pine_giant', n: n(16), sp: 3.2, v: 3, flip: true, p: c => 0.10 + 0.9 * wall(c) * sstep(1.2, 3.5, c.dPath) + 0.5 * sstep(0.62, 0.8, c.cl) * sstep(2.5, 5, c.dPath) },
    { t: 'pine', n: n(60), sp: 1.5, v: 4, flip: true, p: c => (0.1 + 0.9 * wall(c) + 1.0 * sstep(0.55, 0.75, c.cl)) * sstep(0.6, 2.4, c.dPath) * (c.dRoom < 0.5 ? 0 : 1) },
    { t: 'pine_young', n: n(34), sp: 0.95, v: 3, flip: true, group: [2, 4], spread: 1.3, p: c => (0.2 + 0.8 * sstep(0.45, 0.7, c.cl2)) * sstep(0.5, 2.5, c.dPath) },
    { t: 'rock', n: n(14), sp: 1.2, v: 3, flip: true, group: [1, 3], spread: 1.1, p: c => 0.25 + 0.75 * c.cliff + 0.3 * wall(c) },
    { t: 'log', n: n(5), sp: 3, v: 0, flip: true, p: c => sstep(1.5, 3, c.dPath) * (c.dRoom < 3 ? 1 : 0.3) },
    { t: 'stump', n: n(7), sp: 2, p: c => 0.3 + 0.7 * sstep(0.5, 0.7, c.cl) },
    { t: 'moss', n: n(8), sp: 2, v: 3, flip: true, p: c => 0.3 + 0.7 * sstep(0.5, 0.7, c.cl2) },
    { t: 'mushroom_red', n: n(18), sp: 0.5, group: [3, 5], spread: 0.9, p: c => sstep(0.5, 0.75, c.cl) * sstep(0.3, 1.5, c.dPath) },
    { t: 'grass', n: n(26), sp: 0.5, v: 2, flip: true, group: [2, 4], spread: 1.2, p: c => 0.2 + 0.8 * sstep(0.45, 0.65, c.cl2) },
  ];
};
