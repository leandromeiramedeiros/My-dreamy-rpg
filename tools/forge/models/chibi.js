'use strict';
// CHIBI — forge hero in the wanderer's proportions (big head, short body, ~31 px tall) on the shared humanoid rig, so
// models/humanoid-anims.js drives it and models/chibi-gear.js dresses it. Bare body + hair are layers; gear hides hair.
// Units are pixels, y up, the hero faces +z; the character's RIGHT side is -x (screen-left when facing the camera).
const SIDES = [['R', -1], ['L', 1]];
const { anims, sheetAnims } = require('./humanoid-anims.js');

const bones = [
  { name: 'hips', at: [0, 8, 0] },
  { name: 'spine', parent: 'hips', at: [0, 0, 0] },
  { name: 'chest', parent: 'spine', at: [0, 4.0, 0] },
  { name: 'head', parent: 'chest', at: [0, 5.2, 0] },
  { name: 'cape', parent: 'chest', at: [0, 4.0, -3.1] },
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
    mats: { skin: { ramp: ['#a85a4e', '#d98c6c', '#f0c4a0', '#fbe3c8'], lift: 1 }, tunic: '#3f6fa8', belt: '#6b4433', buckle: '#e8b830', pants: '#3b3350', boots: '#7a4f3a' },
    prims: [
      { bone: 'head', mat: 'skin', part: 'head', shape: 'ell', c: [0, 5.8, 0.3], r: [6.2, 5.8, 5.6] },
      { bone: 'chest', mat: 'tunic', part: 'torso', shape: 'ell', c: [0, 0.6, 0], r: [4.2, 4.8, 3.2], clip: [0, -1, 0, 4.6] },
      { bone: 'spine', mat: 'tunic', part: 'torso', shape: 'ell', c: [0, 1.4, 0], r: [4.7, 2.6, 3.6], clip: [0, -1, 0, 1.4] },
      { bone: 'spine', mat: 'belt', part: 'torso', shape: 'box', c: [0, 2.9, 0], h: [4.45, 0.7, 3.45], round: 0.6 },
      { bone: 'spine', mat: 'buckle', part: 'torso', shape: 'box', c: [0, 2.9, 3.35], h: [0.9, 0.75, 0.35], round: 0.2 },
      ...SIDES.flatMap(([s]) => [
        { bone: 'upper' + s, mat: 'tunic', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -2.2, 0], ra: 1.45, rb: 1.38 },
        { bone: 'fore' + s, mat: 'tunic', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -1.9, 0], ra: 1.38, rb: 1.3 },
        { bone: 'hand' + s, mat: 'skin', part: 'arm' + s, shape: 'ell', c: [0, -0.6, 0], r: [1.45, 1.45, 1.45] },
        { bone: 'thigh' + s, mat: 'pants', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -2.8, 0], ra: 1.7, rb: 1.6 },
        { bone: 'shin' + s, mat: 'pants', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -2.6, 0], ra: 1.6, rb: 1.5 },
        { bone: 'foot' + s, mat: 'boots', part: 'foot' + s, shape: 'ell', c: [0, -1.0, 0.7], r: [2.0, 1.9, 2.7], clip: [0, -1, 0, 2.6] },
      ]),
    ],
    stamps: [
      ...SIDES.map(([, k]) => ({ bone: 'head', at: [2.2 * k, 5.6, 4.4], n: [0.3 * k, 0, 0.95], facing: 0.05, on: 'skin', px: [[0, 0, '#1a1020'], [0, 1, '#1a1020']] })),
      ...SIDES.map(([, k]) => ({ bone: 'head', at: [3.6 * k, 3.7, 4.6], n: [0.5 * k, -0.2, 0.85], facing: 0.35, on: 'skin', px: [[0, 0, '#f08a8a']] })),
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
  { id: 'locks', tag: 'hairSide', group: 'hair', mats: { hair: HAIR }, prims: SIDES.map(([, k]) => (
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'cap', a: [5.7 * k, 7.0, 1.0], b: [5.3 * k, 2.4, 1.6], ra: 1.3, rb: 0.8 })) },
];

module.exports = {
  name: 'chibi',
  frame: [44, 48], origin: [22, 42],
  cam: { elev: 28 },
  light: [-0.55, 0.7, 0.5],
  tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.5,
  bones, layers, anims, sheetAnims,
  sockets: {
    handR: { bone: 'handR', at: [0, -0.6, 0] }, handL: { bone: 'handL', at: [0, -0.6, 0] },
    head: { bone: 'head', at: [0, 12.5, 0] }, cast: { bone: 'chest', at: [0, 1.5, 7.5] },
  },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
};
