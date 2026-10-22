'use strict';
// CHIBI — forge hero in the wanderer's proportions (big head, short body, ~31 px tall) on the shared humanoid rig, so
// models/humanoid-anims.js drives it and models/chibi-gear.js dresses it. Bare body + hair are layers; gear hides hair.
// The base wears nothing equippable (client ruling 2026-10-22): a casual tunic, trousers and shoes, skin and hair. Every
// pixel comes from the volumes below (the eyes are surface stamps, as on the first chibi; its
// 1 px blush was dropped: the cluster pass absorbed it). The cape and the two side
// locks of hair hang on spring chains (forge.js simulate): deterministic secondary motion, fixed lengths.
// Units are pixels, y up, the hero faces +z; the character's RIGHT side is -x (screen-left when facing the camera).
const SIDES = [['R', -1], ['L', 1]];
const CAPE_SEG = 2.9, LOCK_SEG = 2.3;
const { anims, sheetAnims } = require('./humanoid-anims.js');

const bones = [
  { name: 'hips', at: [0, 8, 0] },
  { name: 'spine', parent: 'hips', at: [0, 0, 0] },
  { name: 'chest', parent: 'spine', at: [0, 4.0, 0] },
  { name: 'head', parent: 'chest', at: [0, 5.2, 0] },
  // the cape chain: 4 segments of CAPE_SEG px hung from the back of the collar (a piece draws as many as its length needs)
  { name: 'cape', parent: 'chest', at: [0, 4.0, -3.1] },
  { name: 'cape1', parent: 'cape', at: [0, -CAPE_SEG, 0] },
  { name: 'cape2', parent: 'cape1', at: [0, -CAPE_SEG, 0] },
  { name: 'cape3', parent: 'cape2', at: [0, -CAPE_SEG, 0] },
  // the side locks: 2 segments each, hung at the temples
  ...SIDES.flatMap(([s, k]) => [
    { name: 'lock' + s, parent: 'head', at: [5.7 * k, 7.0, 1.0] },
    { name: 'lock' + s + '1', parent: 'lock' + s, at: [0, -LOCK_SEG, 0] },
  ]),
  ...SIDES.flatMap(([s, k]) => [
    { name: 'upper' + s, parent: 'chest', at: [4.2 * k, 3.3, 0] },
    { name: 'fore' + s, parent: 'upper' + s, at: [0, -2.2, 0] },
    { name: 'hand' + s, parent: 'fore' + s, at: [0, -2.2, 0] },
    { name: 'thigh' + s, parent: 'hips', at: [2.0 * k, 0, 0] },
    { name: 'shin' + s, parent: 'thigh' + s, at: [0, -2.8, 0] },
    { name: 'foot' + s, parent: 'shin' + s, at: [0, -2.6, 0] },
  ]),
  { name: 'weapon', parent: 'handR', at: [0, -0.6, 0] },
  { name: 'offhand', parent: 'handL', at: [0, -0.6, 0] },
];

const HAIR = { ramp: '#6b4058', tones: [0.9, 0.38, -0.2] };
const layers = [
  {
    id: 'body', group: 'body',
    mats: { skin: { ramp: ['#a85a4e', '#d98c6c', '#f0c4a0', '#fbe3c8'], lift: 1 }, tunic: '#3f6fa8', pants: '#3b3350', shoes: '#7a4f3a' },
    prims: [
      { bone: 'head', mat: 'skin', part: 'head', shape: 'ell', c: [0, 5.8, 0.3], r: [6.2, 5.8, 5.6] },
      { bone: 'chest', mat: 'tunic', part: 'torso', shape: 'ell', c: [0, 0.6, 0], r: [4.2, 4.8, 3.2], clip: [0, -1, 0, 4.6] },
      { bone: 'spine', mat: 'tunic', part: 'torso', shape: 'ell', c: [0, 1.4, 0], r: [4.7, 2.6, 3.6], clip: [0, -1, 0, 1.4] },
      ...SIDES.flatMap(([s]) => [
        { bone: 'upper' + s, mat: 'tunic', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -2.2, 0], ra: 1.45, rb: 1.38 },
        { bone: 'fore' + s, mat: 'tunic', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -1.9, 0], ra: 1.38, rb: 1.3 },
        { bone: 'hand' + s, mat: 'skin', part: 'arm' + s, shape: 'ell', c: [0, -0.6, 0], r: [1.45, 1.45, 1.45] },
        { bone: 'thigh' + s, mat: 'pants', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -2.8, 0], ra: 1.7, rb: 1.6 },
        { bone: 'shin' + s, mat: 'pants', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -2.6, 0], ra: 1.6, rb: 1.5 },
        { bone: 'foot' + s, mat: 'shoes', part: 'foot' + s, shape: 'ell', c: [0, -1.0, 0.7], r: [2.0, 1.9, 2.7], clip: [0, -1, 0, 2.6] },
      ]),
    ],
    stamps: [
      ...SIDES.map(([, k]) => ({ bone: 'head', at: [2.2 * k, 5.6, 4.4], n: [0.3 * k, 0, 0.95], facing: 0.05, on: 'skin', px: [[0, 0, '#1a1020'], [0, 1, '#1a1020']] })),
    ],
  },
  { id: 'hair', tag: 'hair', group: 'hair', mats: { hair: HAIR }, prims: [
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: [0, 6.6, -0.6], r: [6.7, 5.9, 6.1], clip: [[0, -0.3, 0.95, 2.3], [0, -1, 0, -1.2]] },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: [1.6, 12.1, -0.8], r: [1.6, 1.2, 1.4] },
  ] },
  { id: 'bangs', tag: 'bangs', group: 'hair', mats: { hair: HAIR }, prims: [
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: [-2.7, 9.0, 4.2], r: [2.2, 2.0, 1.6] },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: [0.2, 8.7, 4.7], r: [2.3, 2.2, 1.6] },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: [2.9, 9.1, 4.1], r: [2.0, 1.9, 1.6] },
  ] },
  { id: 'locks', tag: 'hairSide', group: 'hair', mats: { hair: HAIR }, prims: SIDES.flatMap(([s]) => [
    { bone: 'lock' + s, mat: 'hair', part: 'hair', shape: 'cap', a: [0, 0, 0], b: [0, -LOCK_SEG, 0], ra: 1.3, rb: 1.05 },
    { bone: 'lock' + s + '1', mat: 'hair', part: 'hair', shape: 'cap', a: [0, 0, 0], b: [0, -LOCK_SEG, 0], ra: 1.05, rb: 0.8 },
  ]) },
];

// ---- secondary motion (forge.js simulate): gains / stiffness tuned so the walk sways the hem 2-3 px with the steps, the
// sword swing throws it against the blade and it settles, and idle breathes it about 1 px; a hair lock moves about half that
const springs = [
  { bones: ['cape', 'cape1', 'cape2', 'cape3'], segs: [CAPE_SEG, CAPE_SEG, CAPE_SEG, CAPE_SEG], rest: [0, -1, -0.1], space: 'model',
    k: 250, damp: { attack: 12, other: 6 }, bend: 0.5, gain: { walk: [5, 1, 1.5], other: [1, 1, 1] },
    counter: { anims: ['attack'], bone: 'weapon', at: [0, 8, 0], gain: 0.5, until: 3 },
    max: { side: 0.18, back: 0.1, fwd: 0.05 }, scl: [1, 1, 0.26] },
  ...SIDES.map(([s, k]) => ({ bones: ['lock' + s, 'lock' + s + '1'], segs: [LOCK_SEG, LOCK_SEG], rest: [-0.4 * k, -4.6, 0.6], space: 'parent',
    k: 400, damp: 10, bend: 0.6, gain: [3, 1, 2], max: { side: 0.2, back: 0.2, fwd: 0.2 } })),
];

module.exports = {
  name: 'chibi',
  frame: [52, 56], origin: [26, 49],
  cam: { elev: 28 },
  light: [-0.55, 0.7, 0.5],
  tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.0,
  pixel: { normalSteps: 0 },   // the cleanup passes only (spurs, orphan tones, clusters >= 2 px by final colour); shading stays smooth
  bones, layers, anims, sheetAnims, springs, CAPE_SEG,
  sockets: {
    handR: { bone: 'handR', at: [0, -0.6, 0] }, handL: { bone: 'handL', at: [0, -0.6, 0] },
    head: { bone: 'head', at: [0, 12.5, 0] }, cast: { bone: 'chest', at: [0, 1.5, 7.5] },
    chest: { bone: 'chest', at: [0, 0.6, 0] },                  // the torso's centre: status icon / aura anchor (Lighting)
  },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
};
