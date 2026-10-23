'use strict';
// DREAM MOTH (`dreammoth`, the Vale: an orbiting swarm of 4 that shoots motes) — a tiny forge flyer, 8 directions (it has a
// facing). Frame 32 x 28, origin (16, 24): the body floats 4 px over the origin (render.js adds the hover bob), a ~16 px
// wingspan (hero ~31 px tall). Recognisable from the old sprite: pale lavender wings with pink eye-spots, a soft pale furry
// body, feathered antennae, pink eyes. Wings are flat volumes on four hinge bones (upper / lower, R / L) that flap by turning
// about the body's long axis.
// Anims: idle 6 + walk 6 (flapping; walk is faster and leans forward), attack 6 (render.js: wind f0-1 = it rears back,
// wings high; the shot f2-3 = darting forward, wings swept; rec f4-5), hit 1 (wings clapped shut, knocked askew), death 3
// (folds and tumbles down). Units are pixels, y up, it faces +z; its RIGHT side is -x. Sockets: head, chest.
const SIDES = [['R', -1], ['L', 1]];
const bones = [
  { name: 'thorax', at: [0, 4.2, 0] },
  { name: 'head', parent: 'thorax', at: [0, 0.3, 1.5] },
  { name: 'abdomen', parent: 'thorax', at: [0, -0.2, -1.0] },
  ...SIDES.flatMap(([s, k]) => [
    { name: 'wingU' + s, parent: 'thorax', at: [0.7 * k, 0.5, 0.3] },
    { name: 'wingL' + s, parent: 'thorax', at: [0.6 * k, 0.0, -0.5] },
  ]),
];
const WING = { ramp: ['#4e3e9c', '#8676dc', '#b8acf8', '#e6e0ff'], lift: 1 };
const prims = [
  { bone: 'thorax', mat: 'fur', part: 'body', shape: 'ell', c: [0, 0, 0], r: [1.7, 1.7, 1.9] },
  { bone: 'head', mat: 'fur', part: 'body', shape: 'ell', c: [0, 0, 0.2], r: [1.1, 1.0, 1.0] },
  { bone: 'abdomen', mat: 'fur', part: 'body', shape: 'cap', a: [0, 0, 0], b: [0, -0.6, -3.0], ra: 1.2, rb: 0.6 },
  ...SIDES.flatMap(([s, k]) => [
    { bone: 'head', mat: 'ant', part: 'ant' + s, shape: 'cap', a: [0.4 * k, 0.6, 0.6], b: [1.8 * k, 3.0, 1.6], ra: 0.35, rb: 0.5 },
    { bone: 'wingU' + s, mat: 'wing', part: 'wing' + s, shape: 'ell', c: [4.0 * k, 0.2, 0.6], r: [4.3, 0.4, 3.0], rot: [0, 0.35 * k, 0] },
    { bone: 'wingU' + s, mat: 'spot', part: 'wing' + s, shape: 'ell', c: [5.0 * k, 0.5, 0.9], r: [1.3, 0.3, 1.2] },
    { bone: 'wingL' + s, mat: 'wing', part: 'wing' + s, shape: 'ell', c: [2.8 * k, 0.0, -1.6], r: [2.9, 0.4, 2.3], rot: [0, -0.5 * k, 0] },
  ]),
];
const stamps = SIDES.map(([, k]) => ({ bone: 'head', at: [0.6 * k, 0.2, 1.0], n: [0.5 * k, 0, 0.85], facing: 0.05, on: 'fur', px: [[0, 0, '#ff6ac8']] }));
const layers = [{ id: 'body', group: 'body', prims, stamps,
  mats: { fur: { ramp: ['#5e4e6e', '#9a8aa8', '#cabed6', '#f0e8f6'], lift: 1 }, wing: WING, spot: { ramp: ['#c04a9a', '#ff6ac8', '#ff9ade', '#ffd0f0'], lift: 1 }, ant: { ramp: ['#7a6a9a', '#b8a8e0', '#e0d8ff', '#ffffff'], lift: 1 } } }];

// a pose: wing flap angle (+ = up), wing sweep (+ = back), the thorax's lift / pitch / roll / offsets
const pose = (flap, sweep = 0, o = {}) => {
  const P = { thorax: { off: o.off || [0, 0, 0], rot: [o.pitch || 0, 0, o.roll || 0] } };
  for (const [s, k] of SIDES) {
    P['wingU' + s] = { rot: [0, -sweep * k, flap * k] };
    P['wingL' + s] = { rot: [0, -sweep * 0.8 * k, (flap * 0.8 - 0.1) * k] };
  }
  return P;
};
const FLAP = [1.25, 0.95, 0.6, 0.3, 0.6, 0.95];   // raised in a V: flat wings seen from the 28 deg camera are only a sliver
const anims = {
  idle: { frames: 6, ms: [100, 100, 100, 100, 100, 100], pose: f => pose(FLAP[f], 0, { off: [0, [0, 0.5, 1, 1, 0.5, 0][f], 0] }) },
  walk: { frames: 6, ms: [80, 80, 80, 80, 80, 80], pose: f => pose(FLAP[(f * 2) % 6] * 1.1, 0.15, { pitch: 0.3, off: [0, [0, 1, 0, 1, 0, 1][f] * 0.6, 0] }) },
  attack: {
    frames: 6, ms: [300, 300, 120, 120, 200, 200],
    pose: f => [
      pose(1.1, -0.2, { pitch: -0.45, off: [0, 1.2, -1.2] }), pose(1.25, -0.3, { pitch: -0.6, off: [0, 2.0, -2.0] }),
      pose(-0.3, 0.6, { pitch: 0.5, off: [0, 0, 2.2] }), pose(-0.5, 0.7, { pitch: 0.55, off: [0, -0.4, 2.6] }),
      pose(0.5, 0.2, { pitch: 0.2, off: [0, 0.4, 1.0] }), pose(0.8, 0, { off: [0, 0.2, 0] }),
    ][f],
  },
  hit: { frames: 1, ms: [200], pose: () => pose(1.5, 0.3, { pitch: -0.4, roll: 0.5, off: [0, 0.6, -1.4] }) },
  death: {
    frames: 3, ms: [180, 180, 400],
    pose: f => [pose(1.45, 0.4, { roll: 0.7, pitch: -0.3, off: [0, -0.6, -1] }), pose(1.4, 0.5, { roll: 1.4, off: [0, -2.4, -1] }), pose(0.2, 0.2, { roll: 1.57, off: [0, -3.4, -1] })][f],
  },
};

module.exports = {
  name: 'dreammoth',
  frame: [36, 30], origin: [18, 26],
  cam: { elev: 28 }, light: [-0.55, 0.7, 0.5], tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.0, pixel: { normalSteps: 0 },
  flatDepth: true, bones, layers, anims, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death'],
  sockets: { head: { bone: 'head', at: [0, 2.6, 0] }, chest: { bone: 'thorax', at: [0, 0, 0] } },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
};
