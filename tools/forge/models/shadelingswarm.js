'use strict';
// SHADELING SWARM (`shadelingswarm`, the Ruins: a swarm; each member draws this) — a forge swarm critter, 1 direction (the
// bible: swarm creatures have no facing): a knee-high shadow imp, a black-violet teardrop body, two little horns, stubby
// clawed arms, a wisp of a tail and big pink eyes. Frame 32 x 32, origin (16, 27): about 14 px tall (hero ~31).
// Anims (1 dir): idle 6 (bobbing), walk 6 (a scuttling hop, height baked in), attack 6 (render.js: wind f0-1 = crouched, claws
// up; strike f2-3 = it springs forward, claws out; rec f4-5), hit 1, death 3 (it dissolves flat). Sockets: head, chest.
const bones = [{ name: 'base', at: [0, 0, 0] }, { name: 'body', parent: 'base', at: [0, 0, 0] },
  { name: 'armR', parent: 'body', at: [-3.0, 5.4, 0.8] }, { name: 'armL', parent: 'body', at: [3.0, 5.4, 0.8] }];
const prims = [
  { bone: 'body', mat: 'shade', part: 'body', shape: 'ell', c: [0, 4.0, 0], r: [4.2, 4.2, 3.8], clip: [0, -1, 0, 0] },
  { bone: 'body', mat: 'shade', part: 'body', shape: 'ell', c: [0, 8.6, 0.4], r: [3.6, 3.2, 3.2] },
  ...[-1, 1].map(k => ({ bone: 'body', mat: 'horn', part: 'body', shape: 'cap', a: [1.8 * k, 10.6, -0.2], b: [3.0 * k, 13.6, -1.2], ra: 0.9, rb: 0.3 })),
  { bone: 'body', mat: 'shade', part: 'tail', shape: 'cap', a: [0, 2.4, -3.0], b: [1.4, 5.4, -6.4], ra: 1.4, rb: 0.4 },
  ...[['R', -1], ['L', 1]].flatMap(([s, k]) => [
    { bone: 'arm' + s, mat: 'shade', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0.8 * k, -2.6, 1.2], ra: 1.0, rb: 0.8 },
    { bone: 'arm' + s, mat: 'horn', part: 'arm' + s, shape: 'cap', a: [0.8 * k, -2.6, 1.2], b: [1.2 * k, -3.6, 2.2], ra: 0.5, rb: 0.3 },
  ]),
];
const stamps = [-1, 1].map(k => ({ bone: 'body', at: [1.4 * k, 8.8, 3.4], n: [0.3 * k, 0, 0.95], facing: 0.05, on: 'shade', px: [[0, 0, '#ff6ab4'], [0, 1, '#ff6ab4'], [k < 0 ? -1 : 1, 0, '#ffb4dc']] }));
const layers = [{ id: 'body', group: 'body', prims, stamps,
  mats: { shade: { ramp: ['#1f1c28', '#2d223b', '#3a2850', '#472e65'] }, horn: { ramp: ['#3a2a4a', '#5e4a72', '#8a74a0', '#b8a4cc'], lift: 1 } } }];
const sq = k => [1 + k, 1 - k, 1 + k];
const P = (s, oy = 0, oz = 0, arm = 0) => ({ body: { scl: s, off: [0, oy, oz] }, armR: { rot: [-arm, 0, -0.3 * Math.abs(arm)] }, armL: { rot: [-arm, 0, 0.3 * Math.abs(arm)] } });
const anims = {
  idle: { frames: 6, ms: [150, 150, 150, 150, 150, 150], pose: f => P(sq([0, 0.03, 0.06, 0.06, 0.03, 0][f]), [0, 0.3, 0.6, 0.6, 0.3, 0][f], 0, 0.1) },
  walk: { frames: 6, ms: [80, 80, 80, 80, 80, 80], pose: f => [P(sq(0.12)), P(sq(-0.1), 1.6, 0, 0.3), P(sq(-0.04), 2.6, 0, 0.4), P(sq(0.12)), P(sq(-0.1), 1.6, 0, 0.3), P(sq(-0.04), 2.6, 0, 0.4)][f] },
  attack: { frames: 6, ms: [250, 250, 100, 100, 200, 200], pose: f => [P(sq(0.15), 0, -0.6, 1.4), P(sq(0.22), 0, -1.0, 2.0), P(sq(-0.18), 2.4, 3.0, -1.2), P(sq(-0.1), 1.2, 3.6, -1.4), P(sq(0.08), 0, 1.6, 0.2), P(sq(0.02), 0, 0.4, 0)][f] },
  hit: { frames: 1, ms: [200], pose: () => P(sq(0.2), 0, -1.2, 1.0) },
  death: { frames: 3, ms: [180, 180, 400], pose: f => P([[1.3, 0.7, 1.3], [1.6, 0.4, 1.6], [1.9, 0.18, 1.9]][f], 0, 0, 0.6) },
};

module.exports = {
  name: 'shadelingswarm',
  frame: [32, 32], origin: [16, 27],
  cam: { elev: 28 }, light: [-0.55, 0.7, 0.5], tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.0, pixel: { normalSteps: 0 },
  flatDepth: true, bones, layers, anims, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death'],
  sockets: { head: { bone: 'body', at: [0, 12.0, 0] }, chest: { bone: 'body', at: [0, 5.0, 0] } },
  dirs: [['S', 0]],
};
