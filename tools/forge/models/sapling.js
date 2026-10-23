'use strict';
// SAPLING (`sapling`, the Bramblehorn's add: a rooted thorn turret, speed 0) — a forge plant, 1 direction (it has no facing:
// it spits where it aims): a knee-high bark stem on splayed roots, two leaf fans, a thorny seed-pod head with a dark mouth and
// two amber eye-points. Frame 40 x 44, origin (20, 38): about 24 px tall (hero ~31). Anims (1 dir): idle 4 (it sways),
// attack 6 (render.js: wind f0-1 = it rears back, the pod swells; spit f2-3 = it snaps forward; rec f4-5), hit 1, death 3
// (it wilts flat). walk = idle (it never moves; held for the tools that expect one). Sockets: head, chest, mouth.
const bones = [{ name: 'base', at: [0, 0, 0] }, { name: 'stem', parent: 'base', at: [0, 1.0, 0] }, { name: 'pod', parent: 'stem', at: [0, 9.0, 0] }];
const prims = [
  ...[0, 1, 2, 3, 4].map(i => { const a = i * 2 * Math.PI / 5 + 0.3; return { bone: 'base', mat: 'bark', part: 'root', shape: 'cap', a: [0, 1.4, 0], b: [4.2 * Math.sin(a), 0.2, 4.2 * Math.cos(a)], ra: 1.1, rb: 0.4 }; }),
  { bone: 'stem', mat: 'bark', part: 'stem', shape: 'cap', a: [0, 0, 0], b: [0, 9.0, 0], ra: 1.5, rb: 1.1 },
  ...[-1, 1].map(k => ({ bone: 'stem', mat: 'leaf', part: 'leaf', shape: 'ell', c: [3.0 * k, 5.0, 0.2], r: [2.8, 0.6, 1.6], rot: [0, 0, -0.45 * k] })),
  { bone: 'pod', mat: 'pod', part: 'pod', shape: 'ell', c: [0, 2.4, 0], r: [3.4, 3.2, 3.2] },
  { bone: 'pod', mat: 'mouth', part: 'mouth', shape: 'ell', c: [0, 1.6, 2.7], r: [1.6, 1.0, 0.7] },
  ...[[-2.4, 4.6, 0.6], [2.4, 4.6, 0.6], [0, 5.6, -0.8], [-2.8, 2.0, -1.6], [2.8, 2.0, -1.6], [0, 4.4, -2.6]].map(([x, y, z]) => ({ bone: 'pod', mat: 'thorn', part: 'thorn', shape: 'cap', a: [x * 0.8, y * 0.85, z * 0.8], b: [x * 1.35, y * 1.2, z * 1.4], ra: 0.6, rb: 0.15 })),
];
const stamps = [-1, 1].map(k => ({ bone: 'pod', at: [1.2 * k, 3.4, 2.9], n: [0.3 * k, 0.1, 0.95], facing: 0.05, on: 'pod', px: [[0, 0, '#ffc84a']] }));
const layers = [{ id: 'body', group: 'body', prims, stamps,
  mats: { bark: { ramp: ['#2a1a22', '#4c3232', '#70503c', '#987454'] }, leaf: { ramp: ['#1c4a3a', '#2e7650', '#58a45c', '#9ad07a'] },
    pod: { ramp: ['#2a3a1e', '#465e2a', '#6a8a3a', '#98b45a'] }, mouth: { ramp: ['#241c1e', '#352229', '#462832', '#562f3b'] },
    thorn: { ramp: ['#6a4c42', '#a88a72', '#d6c0a0', '#f2e4c8'], lift: 1 } } }];
const P = (sr, pr, s = 1, o = {}) => ({ stem: { rot: [sr, 0, o.sway || 0], scl: o.stem || [1, 1, 1] }, pod: { rot: [pr, 0, 0], scl: [s, s, s] } });
const anims = {
  idle: { frames: 4, ms: [250, 250, 250, 250], pose: f => P(0, 0, 1, { sway: [0, 0.08, 0, -0.08][f] }) },
  attack: { frames: 6, ms: [300, 300, 90, 90, 200, 200], pose: f => [P(-0.2, -0.2, 1.08), P(-0.35, -0.35, 1.15), P(0.35, 0.3, 0.9), P(0.25, 0.2, 0.95), P(0.1, 0.05, 1), P(0, 0, 1)][f] },
  hit: { frames: 1, ms: [200], pose: () => P(-0.3, -0.2, 1, { sway: 0.15 }) },
  death: { frames: 3, ms: [180, 180, 400], pose: f => P([0.4, 0.9, 1.35][f], [0.2, 0.4, 0.5][f], [0.95, 0.85, 0.75][f], { stem: [1, [0.9, 0.75, 0.6][f], 1] }) },
};
anims.walk = anims.idle;

module.exports = require('./ekit.js').scaleModel({
  name: 'sapling',
  frame: [40, 44], origin: [20, 38],
  cam: { elev: 28 }, light: [-0.55, 0.7, 0.5], tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.0, pixel: { normalSteps: 0 },
  flatDepth: true, bones, layers, anims, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death'],
  sockets: { head: { bone: 'pod', at: [0, 6.0, 0] }, chest: { bone: 'stem', at: [0, 5.0, 0] }, mouth: { bone: 'pod', at: [0, 1.6, 3.2] } },
  dirs: [['S', 0]],
}, 1.35);   // modelled at 1 unit = 1 px, built x1.35
