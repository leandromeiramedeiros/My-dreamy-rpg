'use strict';
// REF — the M4a hero rig, fitted to the SlyNyrd reference hero (Pixelblog 55 / 56 / 58; client ruling 8). Measured at 1x
// by tools/forge/ref-extract.py (numbers in tools/forge/ref/SPEC.json, git-ignored):
//   S front: 27 px tall (hair spike to sole), 16 px across the pauldrons; head 9 rows, torso 8, legs 9 (= 2.9 heads)
//   no outer outline: navy #1f2357 (the hair / pants dark) carries the edges and the seams between parts
//   15 colours, ramps of 2-4 tones: hair navy / blue / cyan glint, skin rust / tan, armour 4 lavenders, cloth 2 reds ...
// Same bone names as models/chibi.js and hero.js, so models/humanoid-anims.js drives it and the gear files fit.
// Units are pixels, y up, the hero faces +z; the character's RIGHT side is -x (screen-left when facing the camera).
// SCALE: the reference is 27 px tall; ruling 2 asked 32 px (from the blog's "26x32", which is not the figure size).
// Every length below is multiplied by SCALE, so 32 px is SCALE = 1.19 (the board compares at 1.0).
const SCALE = 1.0;
const SIDES = [['R', -1], ['L', 1]];
const { anims, sheetAnims } = require('./humanoid-anims.js');
const s = v => Array.isArray(v) ? v.map(x => x * SCALE) : v * SCALE;

const bones = [
  { name: 'hips', at: s([0, 10.6, 0]) },
  { name: 'spine', parent: 'hips', at: [0, 0, 0] },
  { name: 'chest', parent: 'spine', at: s([0, 2.6, 0]) },
  { name: 'head', parent: 'chest', at: s([0, 5.6, 0.3]) },
  { name: 'cape', parent: 'chest', at: s([0, 4.6, -2.4]) },
  ...SIDES.flatMap(([sd, k]) => [
    { name: 'upper' + sd, parent: 'chest', at: s([5.3 * k, 4.4, 0]) },
    { name: 'fore' + sd, parent: 'upper' + sd, at: s([0, -3.1, 0]) },
    { name: 'hand' + sd, parent: 'fore' + sd, at: s([0, -2.7, 0]) },
    { name: 'thigh' + sd, parent: 'hips', at: s([2.4 * k, -0.4, 0]) },
    { name: 'shin' + sd, parent: 'thigh' + sd, at: s([0.5 * k, -4.0, 0]) },
    { name: 'foot' + sd, parent: 'shin' + sd, at: s([0.6 * k, -4.6, 0]) },
  ]),
  { name: 'weapon', parent: 'handR', at: s([0, -0.5, 0]) },
  { name: 'offhand', parent: 'handL', at: s([0, -0.4, 0]) },
];

// ---- palette: the reference's exact colours (ramps are [shadow, low, mid, high]; repeats = fewer tones) -----------------
const NAVY = '#1f2357', BLUE = '#104097', CYAN = '#217aa6';
const MATS = {
  skin: { ramp: ['#a64e21', '#a64e21', '#ba8a38', '#ba8a38'], tones: [0.95, 0.35, -0.1], lift: 1 },
  armour: { ramp: ['#433a60', '#644f77', '#907ca1', '#b5a0ba'], tones: [0.7, 0.2, -0.35] },
  sleeve: { ramp: [NAVY, BLUE, BLUE, BLUE], tones: [0.95, 0.5, -0.2] },
  belt: { ramp: [NAVY, NAVY, NAVY, NAVY] },
  pants: { ramp: [NAVY, BLUE, BLUE, BLUE], tones: [0.95, 0.5, -0.15] },
  knee: { ramp: [NAVY, NAVY, NAVY, NAVY] },
  boots: { ramp: ['#592104', '#592104', '#a64e21', '#a64e21'], tones: [0.95, 0.15, -0.5] },
};
const HAIR = { ramp: [NAVY, NAVY, BLUE, CYAN], tones: [0.98, 0.86, -2] };
const P = (bone, mat, part, shape, o) => Object.assign({ bone, mat, part, shape }, o);

const layers = [
  {
    id: 'body', group: 'body', mats: MATS,
    prims: [
      P('head', 'skin', 'head', 'ell', { c: s([0, 3.3, 0.9]), r: s([3.0, 3.0, 2.9]) }),
      P('chest', 'armour', 'torso', 'ell', { c: s([0, 2.4, 0.2]), r: s([3.9, 3.2, 3.0]) }),
      P('spine', 'belt', 'torso', 'box', { c: s([0, 0.9, 0]), h: s([3.4, 0.75, 2.4]), round: 0.5 }),
      P('hips', 'pants', 'torso', 'ell', { c: s([0, -0.5, 0]), r: s([3.4, 1.7, 2.3]) }),
      ...SIDES.flatMap(([sd, k]) => [
        P('upper' + sd, 'armour', 'pauldron' + sd, 'ell', { c: s([0.3 * k, -0.2, 0]), r: s([2.3, 2.0, 2.3]) }),
        P('upper' + sd, 'sleeve', 'arm' + sd, 'cap', { a: [0, 0, 0], b: s([0, -3.1, 0]), ra: s(1.2), rb: s(1.15) }),
        P('fore' + sd, 'armour', 'arm' + sd, 'cap', { a: [0, 0, 0], b: s([0, -2.0, 0]), ra: s(1.25), rb: s(1.15) }),
        P('hand' + sd, 'skin', 'arm' + sd, 'ell', { c: s([0, -0.7, 0]), r: s([1.15, 1.25, 1.15]) }),
        P('thigh' + sd, 'pants', 'leg' + sd, 'cap', { a: [0, 0, 0], b: s([0.5 * k, -4.0, 0]), ra: s(1.55), rb: s(1.35) }),
        P('shin' + sd, 'knee', 'leg' + sd, 'cap', { a: [0, 0, 0], b: s([0.3 * k, -1.6, 0]), ra: s(1.38), rb: s(1.3) }),
        P('shin' + sd, 'boots', 'leg' + sd, 'cap', { a: s([0.3 * k, -1.6, 0]), b: s([0.6 * k, -4.6, 0]), ra: s(1.3), rb: s(1.25) }),
        P('foot' + sd, 'boots', 'foot' + sd, 'ell', { c: s([0, -0.3, 0.4]), r: s([1.3, 1.3, 1.7]), clip: [0, -1, 0, s(1.2)] }),
      ]),
    ],
    stamps: [   // the visible eye (the hair covers the other in S), 1 x 2 navy
      { bone: 'head', at: s([1.2, 3.8, 3.2]), n: [0.3, 0, 0.95], facing: 0.1, on: 'skin', px: [[0, 0, NAVY], [0, 1, NAVY]] },
      { bone: 'head', at: s([-1.2, 3.8, 3.2]), n: [-0.3, 0, 0.95], facing: 0.1, on: 'skin', px: [[0, 0, NAVY], [0, 1, NAVY]] },
    ],
  },
  { id: 'hair', tag: 'hair', group: 'hair', mats: { hair: HAIR }, prims: [
    // crown (cut level at the eyes, so the face shows on the front and the sides) + the back of the head down to the nape
    P('head', 'hair', 'hair', 'ell', { c: s([0, 4.9, -0.2]), r: s([3.5, 2.7, 3.6]), clip: [0, -1, 0, s(-3.9)] }),
    P('head', 'hair', 'hair', 'ell', { c: s([0, 3.7, -1.1]), r: s([3.4, 3.0, 2.8]), clip: [0, 0, 1, s(0.2)] }),
    // spikes: tapered capsules (ra -> ~0) fanning out of the crown; the big one leans to the character's left (screen-right in S)
    P('head', 'hair', 'hair', 'cap', { a: s([0.7, 6.4, 0]), b: s([2.0, 10.6, -0.6]), ra: s(1.8), rb: s(0.2) }),
    P('head', 'hair', 'hair', 'cap', { a: s([-1.4, 6.3, 0.3]), b: s([-3.6, 8.8, 0.4]), ra: s(1.5), rb: s(0.2) }),
    P('head', 'hair', 'hair', 'cap', { a: s([-2.6, 5.2, 0.4]), b: s([-7.0, 5.4, 0.6]), ra: s(1.3), rb: s(0.2) }),
    P('head', 'hair', 'hair', 'cap', { a: s([2.6, 5.2, 0.2]), b: s([6.6, 5.6, 0.2]), ra: s(1.3), rb: s(0.2) }),
    P('head', 'hair', 'hair', 'cap', { a: s([0, 5.2, -2.2]), b: s([0.4, 5.0, -6.4]), ra: s(1.6), rb: s(0.2) }),
    P('head', 'hair', 'hair', 'cap', { a: s([-2.0, 4.4, -1.8]), b: s([-4.6, 2.8, -4.8]), ra: s(1.3), rb: s(0.2) }),
    P('head', 'hair', 'hair', 'cap', { a: s([2.0, 4.4, -1.8]), b: s([4.6, 2.8, -4.8]), ra: s(1.3), rb: s(0.2) }),
    // bangs: a swoop from the character's right across the forehead, one lock down over the right eye
    P('head', 'hair', 'hair', 'ell', { c: s([-0.9, 5.1, 2.6]), r: s([2.5, 1.0, 1.1]), rot: [0, 0, -0.3] }),
    P('head', 'hair', 'hair', 'cap', { a: s([-2.0, 5.2, 2.7]), b: s([-0.5, 2.5, 3.5]), ra: s(1.1), rb: s(0.4) }),
  ] },
];

module.exports = {
  name: 'ref',
  frame: [48, 48], origin: [24, 40],
  cam: { elev: 30 },
  light: [-0.55, 0.7, 0.5],
  tones: [0.8, 0.3, -0.3],
  outline: null, innerLine: 1.6, innerColor: NAVY,
  pixel: { normalSteps: 8, minCluster: 2 },
  bones, layers, anims, sheetAnims,
  sockets: {
    handR: { bone: 'handR', at: s([0, -0.5, 0]) }, handL: { bone: 'handL', at: s([0, -0.5, 0]) },
    head: { bone: 'head', at: s([0, 9.5, 0]) }, chest: { bone: 'chest', at: s([0, 2.4, 2.6]) }, cast: { bone: 'chest', at: s([0, 1.5, 7.5]) },
  },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
};
