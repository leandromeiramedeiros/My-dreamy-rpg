'use strict';
// Root-cave / crypt palette: dead roots at the rim, glowing mushrooms and crystals for light, dark rocks, little grass.
// §29 G2: every n x DENSITY (2.5, _density.js); the dead trees keep no random flip (maps.js mirrors trees by the theme's light side)
const { DENSITY, sstep } = require('./_density.js');
module.exports = function caveRules(scale = 1) {
  const n = k => Math.round(k * scale * DENSITY);
  const wall = c => sstep(4.5, 0.8, Math.max(0, c.dEdge));
  return [
    { t: 'tree_dead', n: n(46), sp: 1.5, v: 4, p: c => (0.15 + 1.0 * wall(c) + 0.7 * sstep(0.55, 0.75, c.cl)) * sstep(0.6, 2.4, c.dPath) * (c.dRoom < 0.5 ? 0 : 1) },
    { t: 'rock_dark', n: n(34), sp: 1.0, v: 2, flip: true, group: [1, 3], spread: 1.1, p: c => 0.25 + 0.8 * c.cliff + 0.5 * wall(c) },
    { t: 'mushroom', n: n(26), sp: 0.6, group: [2, 5], spread: 0.9, p: c => 0.2 + 0.8 * sstep(0.45, 0.7, c.cl) },
    { t: 'crystal', n: n(8), sp: 3.2, p: c => 0.2 + 0.8 * wall(c) + 0.5 * c.cliff },
    { t: 'moss', n: n(14), sp: 1.6, v: 3, flip: true, p: c => 0.3 + 0.7 * sstep(0.5, 0.7, c.cl2) },
    { t: 'stump', n: n(8), sp: 1.5, p: c => 0.4 + 0.6 * sstep(0.5, 0.7, c.cl) },
    { t: 'log', n: n(4), sp: 3, flip: true, p: c => sstep(1.5, 3, c.dPath) },
    { t: 'bush', n: n(10), sp: 1, v: 3, p: c => 0.2 + 0.5 * wall(c) },
    { t: 'grass', n: n(10), sp: 0.7, v: 2, flip: true, group: [2, 3], p: c => 0.2 + 0.5 * sstep(0.45, 0.65, c.cl2) },
  ];
};
