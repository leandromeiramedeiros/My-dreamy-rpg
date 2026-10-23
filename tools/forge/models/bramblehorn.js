'use strict';
// OLD BRAMBLEHORN (`bramblehorn`, the Pinewood guardian: stomp, root-grab, trunk-swipe / backhand, trample, saplings) — a
// forge boss on the humanoid bone names (models/ekit.js): an old tree-troll, a bark trunk on root legs, long root-fingered
// arms, a hollow face with amber eyes under an antler crown of pale branches, moss on the shoulders and a moss beard. About
// 62 px tall with the crown (hero ~31: 2x the height, ~4x the bulk). Frame 112 x 100, origin (56, 86). Every pixel from
// volumes (eyes: surface stamps in the hollow). Units are pixels, y up, it faces +z; its RIGHT side is -x.
// Two rigs (two bank files under the 160 KB cap): `bramblehorn` (idle 4, walk 4, hit, death 3, roar 1) and
// `bramblehorn_moves` (attack 6 = the trunk swipe / backhand / trample: wind f0-1, swing f2-3, open f4-5; stomp 2 = foot
// raised, slam; grab 2 = both fists driven into the ground, roots answering). render.js maps the boss move state.
// Sockets: head, chest (status layers), handR.
const K = require('./ekit.js');
const { merge, arms, legs } = K;
const SIDES = [['R', -1], ['L', 1]];

function make(part) {
  const bones = [
    { name: 'hips', at: [0, 17, 0] },
    { name: 'spine', parent: 'hips', at: [0, 0, 0] },
    { name: 'chest', parent: 'spine', at: [0, 11, 0] },
    { name: 'head', parent: 'chest', at: [0, 9.5, 3.4] },
    ...SIDES.flatMap(([s, k]) => [
      { name: 'upper' + s, parent: 'chest', at: [11.5 * k, 4.0, 0] },
      { name: 'fore' + s, parent: 'upper' + s, at: [0, -8.4, 0] },
      { name: 'hand' + s, parent: 'fore' + s, at: [0, -8.0, 0] },
      { name: 'thigh' + s, parent: 'hips', at: [5.4 * k, -1.0, 0] },
      { name: 'shin' + s, parent: 'thigh' + s, at: [0, -7.6, 0] },
      { name: 'foot' + s, parent: 'shin' + s, at: [0, -7.4, 0] },
    ]),
  ];
  // the antler crown: a branch = [root, tip, r], tines branch off it
  const branch = (k) => [
    [[2.4 * k, 4.8, -0.6], [6.4 * k, 11.0, -1.6], 1.5], [[6.4 * k, 11.0, -1.6], [8.4 * k, 17.0, -2.4], 1.1],
    [[4.6 * k, 8.4, -1.2], [2.8 * k, 13.6, -0.6], 0.9], [[7.4 * k, 14.0, -2.0], [11.2 * k, 16.4, -2.4], 0.8],
    [[6.4 * k, 11.0, -1.6], [10.8 * k, 11.6, -1.8], 0.9],
  ];
  const prims = [
    // head: a bark skull, a heavy brow, a hollow face (dark), root fangs, a moss beard, bark ears, the crown
    { bone: 'head', mat: 'bark', part: 'head', shape: 'ell', c: [0, 2.0, 0], r: [6.0, 5.6, 5.4] },
    { bone: 'head', mat: 'bark', part: 'head', shape: 'ell', c: [0, 4.6, 2.6], r: [5.4, 1.6, 2.4] },
    { bone: 'head', mat: 'hollow', part: 'head', shape: 'ell', c: [0, 1.6, 4.0], r: [3.8, 3.0, 1.8] },
    ...[-1.8, 0, 1.8].map(x => ({ bone: 'head', mat: 'wood', part: 'fang', shape: 'cap', a: [x, -0.6, 4.6], b: [x * 1.1, -3.4, 4.8], ra: 0.75, rb: 0.3 })),
    { bone: 'head', mat: 'moss', part: 'beard', shape: 'cap', a: [0, -1.6, 3.6], b: [0, -7.0, 4.4], ra: 3.0, rb: 1.2 },
    ...SIDES.map(([, k]) => ({ bone: 'head', mat: 'bark', part: 'head', shape: 'cap', a: [5.0 * k, 2.6, -0.4], b: [8.6 * k, 4.6, -1.6], ra: 1.4, rb: 0.5 })),
    ...SIDES.flatMap(([, k]) => branch(k).map(([a, b, r]) => ({ bone: 'head', mat: 'wood', part: 'crown', shape: 'cap', a: [a[0] * 1.3, 2 + (a[1] - 2) * 1.35, a[2]], b: [b[0] * 1.3, 2 + (b[1] - 2) * 1.35, b[2]], ra: r * 1.15, rb: r * 0.7 }))),
    // the trunk: a broad barrel chest, a lower trunk, bark ridges, a knothole, moss on the shoulders
    { bone: 'chest', mat: 'bark', part: 'torso', shape: 'ell', c: [0, 1.8, -0.6], r: [11.5, 8.6, 9.2] },
    { bone: 'spine', mat: 'bark', part: 'torso', shape: 'ell', c: [0, 3.6, 0.4], r: [9.4, 8.2, 8.6] },
    ...[-6, -2, 2, 6].map(x => ({ bone: 'chest', mat: 'ridge', part: 'torso', shape: 'cap', a: [x, 7.2, 6.0 - Math.abs(x) * 0.4], b: [x * 0.9, -4.0, 6.8 - Math.abs(x) * 0.4], ra: 0.9, rb: 0.8, weight: 2 })),
    { bone: 'chest', mat: 'hollow', part: 'torso', shape: 'ell', c: [-4.2, 0.6, 7.0], r: [1.8, 2.4, 1.0] },
    ...SIDES.map(([, k]) => ({ bone: 'chest', mat: 'moss', part: 'torso', shape: 'ell', c: [8.0 * k, 6.6, -0.6], r: [4.8, 2.4, 4.6] })),
    { bone: 'chest', mat: 'moss', part: 'torso', shape: 'ell', c: [0, 8.0, -2.4], r: [6.0, 2.0, 4.0] },
    { bone: 'hips', mat: 'bark', part: 'torso', shape: 'ell', c: [0, 0, 0], r: [8.8, 5.0, 7.6] },
    // arms: long and thick, knotted elbows, root fingers
    ...SIDES.flatMap(([s]) => [
      { bone: 'upper' + s, mat: 'bark', part: 'arm' + s, shape: 'ell', c: [0, -0.6, 0], r: [4.4, 4.2, 4.2] },
      { bone: 'upper' + s, mat: 'bark', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -8.4, 0], ra: 4.1, rb: 3.5 },
      { bone: 'fore' + s, mat: 'bark', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -7.4, 0], ra: 3.5, rb: 3.9 },
      { bone: 'hand' + s, mat: 'bark', part: 'arm' + s, shape: 'ell', c: [0, -1.4, 0.4], r: [3.9, 3.4, 3.6] },
      ...[-1, 0, 1].map(i => ({ bone: 'hand' + s, mat: 'wood', part: 'arm' + s, shape: 'cap', a: [i * 1.6, -3.0, 1.0], b: [i * 2.0, -6.2, 1.6], ra: 1.0, rb: 0.45 })),
      { bone: 'thigh' + s, mat: 'bark', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -7.6, 0], ra: 4.2, rb: 3.6 },
      { bone: 'shin' + s, mat: 'bark', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -7.0, 0], ra: 3.6, rb: 3.2 },
      { bone: 'foot' + s, mat: 'bark', part: 'leg' + s, shape: 'ell', c: [0, -1.2, 1.4], r: [3.8, 2.4, 4.2], clip: [0, -1, 0, 3.0] },
      ...[-1, 0, 1].map(i => ({ bone: 'foot' + s, mat: 'wood', part: 'leg' + s, shape: 'cap', a: [i * 1.8, -2.2, 4.0], b: [i * 2.8, -3.2, 6.8], ra: 1.0, rb: 0.5 })),
    ]),
    // grab: roots erupting from the ground in front (only the grab frames; on the root bone 'hips' world-placed at the feet)
    ...[[-4, 14, 7], [0, 16, 10], [4, 14, 8], [-2, 20, 6], [3, 21, 5]].map(([x, z, h], i) => ({ bone: 'hips', mat: 'wood', part: 'roots', shape: 'cap', a: [x, -17.4, z], b: [x * 1.3, -17.4 + h, z + 1.6], ra: 1.6, rb: 0.5,
      when: (an, f) => an === 'grab' && (f === 1 || i < 3) })),
  ];
  const layers = [{
    id: 'body', group: 'body', prims,
    mats: { bark: { ramp: ['#2a1a22', '#4c3232', '#70503c', '#987454'] }, ridge: { ramp: ['#261a22', '#2e1c22', '#46302c', '#5e4234'] },
      hollow: { ramp: ['#1e1d21', '#28262d', '#342e3d', '#40374b'] }, wood: { ramp: ['#6a4c42', '#a88a72', '#d6c0a0', '#f2e4c8'], lift: 1 },
      moss: { ramp: ['#1c4a3a', '#2e7650', '#58a45c', '#9ad07a'] } },
    stamps: SIDES.map(([, k]) => ({ bone: 'head', at: [1.6 * k, 2.2, 5.6], n: [0.2 * k, 0, 0.98], facing: 0.05, on: 'hollow', px: [[0, 0, '#ffc84a'], [k < 0 ? -1 : 1, 0, '#ffc84a'], [0, 1, '#ff8a2a']] })),
  }];
  // ---- anims ----
  const idle = K.idle4(1.6), walk = K.walk4(1.6), hit = K.hit(1.6);
  const roar = { frames: 1, ms: [800], pose: () => merge(arms([-0.7, 0.4, 0.3], [-0.4, 0.85, 0.2]), legs(-0.1, 0.2, -0.1, 0.25, 0.2, -0.1), { hips: { off: [0, -1, -0.6] }, chest: { rot: [-0.3, 0, 0] }, head: { rot: [-0.4, 0, 0] } }) };
  const death = {
    frames: 3, ms: [180, 180, 400],
    pose: f => [
      merge(arms([-0.5, 0.2, -0.85], [-0.3, 0.6, -0.75]), legs(-0.3, 0.5, -0.1, 0.1, 0.6, -0.3), { hips: { off: [0, -2.0, -1.0] }, chest: { rot: [-0.45, 0.1, 0] }, head: { rot: [-0.35, 0, 0] } }),
      merge(arms([-0.3, -0.85, 0.42], [-0.1, -0.9, 0.4]), legs(-1.3, 2.1, -0.4, -1.3, 2.1, -0.4), { hips: { off: [0, -8.5, -1.4] }, chest: { rot: [0.45, 0, 0] }, head: { rot: [0.35, 0, 0] } }),
      merge(arms([-0.45, -0.3, 0.85], [-0.2, -0.2, 0.96]), legs(-0.3, 0.3, -0.2, -0.25, 0.4, -0.2), { hips: { off: [0, -11.0, -6.0], rot: [1.1, 0, 0] }, chest: { rot: [0.25, 0, 0] }, head: { rot: [0.2, 0, 0] } }),
    ][f],
  };
  // the trunk swipe: the right arm wound back across the body -> sweeps round in front -> follow-through low left -> recover
  const attack = {
    frames: 6, ms: [300, 300, 90, 90, 300, 300],
    pose: f => [
      merge(arms([-0.8, 0.2, -0.55], [-0.6, 0.6, -0.5], [0.4, -0.7, 0.55], [0.3, -0.4, 0.85]), legs(0.15, 0.25, -0.3, -0.2, 0.25, 0), { hips: { off: [0, -1.2, -0.6] }, chest: { rot: [-0.1, -0.6, 0] } }),
      merge(arms([-0.9, 0.35, -0.25], [-0.7, 0.7, -0.1], [0.45, -0.5, 0.75], [0.3, -0.2, 0.93]), legs(0.1, 0.15, -0.2, -0.25, 0.2, 0.1), { hips: { off: [0, -0.4, -1.0] }, chest: { rot: [-0.18, -0.75, 0] } }),
      merge(arms([-0.45, -0.05, 0.89], [-0.1, -0.1, 0.99], [0.5, -0.8, 0.3], [0.35, -0.6, 0.7]), legs(0.35, 0.3, -0.4, -0.5, 0.3, 0.2), { hips: { off: [0, -2.0, 2.0] }, chest: { rot: [0.25, 0.1, 0] } }),
      merge(arms([0.45, -0.3, 0.84], [0.7, -0.4, 0.6], [0.5, -0.85, 0.15], [0.35, -0.75, 0.55]), legs(0.35, 0.3, -0.4, -0.55, 0.3, 0.25), { hips: { off: [0, -2.4, 2.4] }, chest: { rot: [0.35, 0.55, 0] } }),
      merge(arms([0.5, -0.6, 0.62], [0.6, -0.7, 0.4], [0.4, -0.9, 0.15], [0.3, -0.8, 0.5]), legs(0.3, 0.3, -0.35, -0.45, 0.3, 0.2), { hips: { off: [0, -2.2, 2.0] }, chest: { rot: [0.35, 0.6, 0] } }),
      merge(arms([-0.1, -0.95, 0.3], [-0.05, -0.9, 0.45]), legs(0.15, 0.15, -0.2, -0.2, 0.15, 0.1), { hips: { off: [0, -0.8, 0.8] }, chest: { rot: [0.12, 0.2, 0] } }),
    ][f],
  };
  // stomp: the right foot raised high, arms up -> slammed down, the body dropped on it
  const stomp = {
    frames: 2, ms: [500, 400],
    pose: f => [
      merge(arms([-0.75, 0.55, 0.3], [-0.5, 0.85, 0.1]), legs(-1.3, 1.5, -0.2, 0.15, 0.2, -0.1), { hips: { off: [0, 1.2, -0.6] }, chest: { rot: [-0.2, 0, 0] }, head: { rot: [-0.2, 0, 0] } }),
      merge(arms([-0.7, -0.45, 0.55], [-0.4, -0.75, 0.5]), legs(-0.5, 0.4, -0.1, 0.35, 0.6, -0.2), { hips: { off: [0, -2.4, 1.2] }, chest: { rot: [0.35, 0, 0] }, head: { rot: [0.1, 0, 0] } }),
    ][f],
  };
  // root-grab: crouched, both root hands driven into the ground in front; f1 the roots answer (the 'roots' prims)
  const grab = {
    frames: 2, ms: [500, 400],
    pose: f => merge(arms([-0.35, -0.55, 0.76], [-0.15, -0.8, 0.58]), legs(-0.6, 1.0, -0.3, -0.2, 0.9, -0.4),
      { hips: { off: [0, -4.0 - f * 0.6, 1.0] }, chest: { rot: [0.55 + f * 0.05, 0, 0] }, head: { rot: [-0.45, 0, 0] } }),
  };
  const PARTS = {
    base: { idle, walk, hit, death, roar },
    moves: { attack, stomp, grab, idle: { frames: 1, ms: [600], pose: () => idle.pose(0) }, walk: { frames: 1, ms: [600], pose: () => idle.pose(0) } },   // idle / walk 1 = the rest pose (one deduped cell): the moves rig's probe / fallback frame (forge-rt-check reads sockets on idle S 0)
  };
  const m = Object.assign({
    name: part === 'base' ? 'bramblehorn' : 'bramblehorn_' + part,
    frame: [112, 100], origin: [56, 86],
    bankSheets: part === 'base' ? { mv: ['walk'], die: ['hit', 'death', 'roar'] } : {},
    bones, layers, anims: PARTS[part], sheetAnims: Object.keys(PARTS[part]),
    sockets: { head: { bone: 'head', at: [0, 9.0, 0] }, chest: { bone: 'chest', at: [0, 1.5, 0] }, handR: { bone: 'handR', at: [0, -1.5, 0] } },
    dirs: K.DIRS8,
  }, K.BASE);
  return m;
}

module.exports = make('base');
Object.defineProperty(module.exports, 'make', { value: make, enumerable: false });
