'use strict';
// HERO — forge hero v2: a slim 3/4 top-down adventurer (about 6 heads, ~33 px on screen) for layered gear.
// Bare body + hair are layers here; the gear lives in hero-gear.js as pieces on this rig (a helm hides the hair, etc.).
// Style references (client, 2026-10-21): top-down greatsword / bow character sheets, a scarf knight, a spell VFX pack.
// Used for proportions, view and animation vocabulary only.
// Units are pixels, y up, the hero faces +z; the character's RIGHT side is -x (screen-left when facing the camera).
const SIDES = [['R', -1], ['L', 1]];

const bones = [
  { name: 'hips', at: [0, 17, 0] },
  { name: 'spine', parent: 'hips', at: [0, 0, 0] },
  { name: 'chest', parent: 'spine', at: [0, 5, 0] },
  { name: 'head', parent: 'chest', at: [0, 8.4, 0.2] },
  { name: 'cape', parent: 'chest', at: [0, 6.6, -2.7] },
  ...SIDES.flatMap(([s, k]) => [
    { name: 'upper' + s, parent: 'chest', at: [4.8 * k, 6.3, 0] },
    { name: 'fore' + s, parent: 'upper' + s, at: [0, -5.4, 0] },
    { name: 'hand' + s, parent: 'fore' + s, at: [0, -5.0, 0] },
    { name: 'thigh' + s, parent: 'hips', at: [2.2 * k, -0.6, 0] },
    { name: 'shin' + s, parent: 'thigh' + s, at: [0, -7.0, 0] },
    { name: 'foot' + s, parent: 'shin' + s, at: [0, -7.0, 0] },
  ]),
  { name: 'weapon', parent: 'handR', at: [0, -0.9, 0] },    // main-hand grip (sword, staff)
  { name: 'offhand', parent: 'handL', at: [0, -0.9, 0] },   // off-hand grip (bow, shield, tome)
];

const HAIR = { ramp: '#3b2a33', tones: [0.85, 0.35, -0.2] };
const layers = [
  {
    id: 'body', group: 'body',
    mats: { skin: { ramp: ['#9a5a4e', '#c98a6c', '#ecb994', '#f8dcc0'], lift: 1 }, shirt: '#c8bba6', pants: '#3e3a4a', shoes: '#5e3d2a' },
    prims: [
      { bone: 'head', mat: 'skin', part: 'head', shape: 'ell', c: [0, 3.4, 0.2], r: [2.7, 3.3, 2.9] },
      { bone: 'head', mat: 'skin', part: 'head', shape: 'ell', c: [0, 1.9, 0.7], r: [2.1, 1.9, 2.3] },
      { bone: 'chest', mat: 'skin', part: 'torso', shape: 'cap', a: [0, 7.2, 0], b: [0, 9.0, 0.2], ra: 1.3, rb: 1.2 },
      { bone: 'chest', mat: 'shirt', part: 'torso', shape: 'ell', c: [0, 4.3, 0], r: [4.6, 3.7, 2.8] },
      { bone: 'spine', mat: 'shirt', part: 'torso', shape: 'ell', c: [0, 2.3, 0], r: [3.2, 3.2, 2.3] },
      { bone: 'hips', mat: 'pants', part: 'torso', shape: 'ell', c: [0, -0.2, 0], r: [3.6, 2.5, 2.5] },
      ...SIDES.flatMap(([s]) => [
        { bone: 'upper' + s, mat: 'shirt', part: 'arm' + s, shape: 'ell', c: [0, -0.5, 0], r: [1.7, 1.8, 1.7] },
        { bone: 'upper' + s, mat: 'shirt', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -5.2, 0], ra: 1.35, rb: 1.15 },
        { bone: 'fore' + s, mat: 'skin', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -4.8, 0], ra: 1.1, rb: 0.95 },
        { bone: 'hand' + s, mat: 'skin', part: 'arm' + s, shape: 'ell', c: [0, -0.9, 0], r: [1.15, 1.35, 1.05] },
        { bone: 'thigh' + s, mat: 'pants', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -7.0, 0], ra: 1.75, rb: 1.4 },
        { bone: 'shin' + s, mat: 'pants', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -6.6, 0], ra: 1.35, rb: 1.05 },
        { bone: 'foot' + s, mat: 'shoes', part: 'leg' + s, shape: 'ell', c: [0, -1.2, 0.9], r: [1.3, 1.25, 2.2], clip: [0, -1, 0, 2.4] },
      ]),
    ],
    stamps: [
      { bone: 'head', at: [-1.0, 3.5, 2.6], n: [-0.35, 0, 0.94], facing: 0.05, on: 'skin', px: [[0, 0, '#1a1020']] },
      { bone: 'head', at: [1.0, 3.5, 2.6], n: [0.35, 0, 0.94], facing: 0.05, on: 'skin', px: [[0, 0, '#1a1020']] },
    ],
  },
  { id: 'hair', tag: 'hair', group: 'hair', mats: { hair: HAIR }, prims: [
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: [0, 4.3, -0.35], r: [2.95, 3.0, 3.15], clip: [[0, -0.35, 0.94, 1.4], [0, -1, 0, -2.0]] },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: [0, 3.9, -1.6], r: [2.6, 3.0, 2.0], clip: [0, -1, 0, -0.6] },
  ] },
  { id: 'bangs', tag: 'bangs', group: 'hair', mats: { hair: HAIR }, prims: [
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: [-0.8, 5.0, 2.4], r: [1.7, 1.0, 0.9] },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: [1.2, 5.3, 2.2], r: [1.3, 0.8, 0.9] },
  ] },
];

const { anims, sheetAnims } = require('./humanoid-anims.js');

module.exports = {
  name: 'hero',
  frame: [56, 58], origin: [28, 53],
  cam: { elev: 28 },
  light: [-0.55, 0.7, 0.5],
  tones: [0.78, 0.3, -0.25],
  outline: '#0c0714', innerLine: 2.5,
  bones, layers, anims,
  sheetAnims,
  sockets: {
    handR: { bone: 'handR', at: [0, -0.9, 0] }, handL: { bone: 'handL', at: [0, -0.9, 0] },
    head: { bone: 'head', at: [0, 7.2, 0] }, cast: { bone: 'chest', at: [0, 4.6, 8.5] },
  },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
};
