'use strict';
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
module.exports = function valeRules(scale = 1) {
  const n = k => Math.round(k * scale);
  const wall = c => sstep(5, 1, Math.max(0, c.dEdge));
  return [
    { t: 'tree_poplar', n: n(26), sp: 1.5, v: 3, flip: true, p: c => (0.12 + 0.9 * wall(c) + 0.7 * sstep(0.55, 0.75, c.cl)) * sstep(0.6, 2.5, c.dPath) * (c.dRoom < 0.4 ? 0 : 1) },
    { t: 'tree_teal', n: n(22), sp: 1.6, v: 3, flip: true, p: c => (0.1 + 0.8 * wall(c) + 0.8 * sstep(0.5, 0.7, c.cl2)) * sstep(0.6, 2.5, c.dPath) * (c.dRoom < 0.4 ? 0 : 1) },
    { t: 'tree_round', n: n(12), sp: 2.2, v: 3, flip: true, p: c => (0.2 + 0.6 * wall(c)) * sstep(1, 3, c.dPath) },
    { t: 'tree_blossom', n: n(8), sp: 2.6, v: 4, flip: true, p: c => 0.3 + 0.7 * sstep(0.5, 0.8, c.cl) },
    { t: 'bush', n: n(18), sp: 0.9, v: 3, flip: true, group: [1, 3], spread: 1, p: c => 0.2 + 0.7 * wall(c) },
    { t: 'rock', n: n(7), sp: 1.5, v: 3, flip: true, p: c => 0.2 + 0.8 * c.cliff },
    { t: 'mushroom', n: n(14), sp: 0.6, group: [2, 4], spread: 0.8, p: c => sstep(0.5, 0.75, c.cl) },
    { t: 'grass', n: n(46), sp: 0.5, v: 2, flip: true, group: [2, 5], spread: 1.3, p: c => 0.2 + 0.8 * sstep(0.4, 0.6, c.cl2) },
    { t: 'crystal', n: n(4), sp: 3, p: c => 0.2 + 0.8 * c.cliff, types: 'gfd' },
  ];
};
