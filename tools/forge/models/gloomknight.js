'use strict';
// GLOOM KNIGHT (`gloomknight`, the Ruins: an armoured sword-and-board brute) — a forge humanoid at the hero's scale (models/
// ekit.js: humanoid-anims idle / walk / hit), about 36 px tall: dark gloom-steel plate with violet trim, a closed great helm
// with a violet eye slit, a short dark tabard, a kite shield on the left forearm with a violet sigil, a straight sword.
// Frame 68 x 72, origin (34, 57). Every pixel from volumes (the slit: a surface stamp). Units are pixels, y up, it faces +z;
// its RIGHT side is -x. Attack (6 frames, render.js: wind f0-1, strike f2-3, rec f4-5): sword raised over the right shoulder
// behind the shield -> overhead peak -> chop -> low follow-through -> recover. Death 3: stagger -> kneel -> face down.
// make(o) is shared by models/oathless.js (the faceless knight mini-boss). Sockets: head, chest (status), handR, tip.
const K = require('./ekit.js');
const { merge, arms, legs } = K;
const SIDES = [['R', -1], ['L', 1]];

const STEEL = { ramp: ['#1d1d26', '#262636', '#3c3c54', '#5c5c7c', '#9a9ac0'], spec: 0.9 };
const TRIM = { ramp: ['#271341', '#3e1c6c', '#5e30a0', '#8a5ad0'], lift: 1 };
function bodyPrims(o) {
  const S = o.s || 1;   // plate bulk
  return [
    // the great helm: a rounded pot, a flat face plate, a crest ridge; the slit is a stamp (or the Oathless's void)
    { bone: 'head', mat: 'steel', part: 'helm', shape: 'ell', c: [0, 3.0, 0], r: [3.4 * S, 3.8, 3.5] },
    { bone: 'head', mat: 'steel', part: 'helm', shape: 'box', c: [0, 2.4, 2.4], h: [2.8 * S, 2.8, 1.0], round: 0.8 },
    { bone: 'head', mat: 'trim', part: 'helm', shape: 'cap', a: [0, 6.4, 2.0], b: [0, 6.6, -3.0], ra: 0.75, rb: 0.6 },
    // breastplate, pauldrons, a trim belt, the tabard
    { bone: 'chest', mat: 'steel', part: 'torso', shape: 'ell', c: [0, 1.6, 0], r: [4.8 * S, 4.8, 3.6] },
    { bone: 'chest', mat: 'trim', part: 'torso', shape: 'cap', a: [0, 4.0, 3.2], b: [0, -1.4, 3.6], ra: 0.7, rb: 0.6 },
    ...SIDES.map(([, k]) => ({ bone: 'chest', mat: 'steel', part: 'pauldron', shape: 'ell', c: [4.6 * S * k, 3.6, 0], r: [2.6 * S, 2.2, 2.8] })),
    ...SIDES.map(([, k]) => ({ bone: 'chest', mat: 'trim', part: 'pauldron', shape: 'disc', c: [4.6 * S * k, 2.4, 0], r: [2.7 * S, 0.45, 2.9] })),
    { bone: 'hips', mat: 'trim', part: 'belt', shape: 'disc', c: [0, 0.6, 0], r: [4.0 * S, 0.7, 3.2] },
    { bone: 'hips', mat: 'cloth', part: 'tabard', shape: 'box', c: [0, -3.0, 2.8], h: [2.2 * S, 3.2, 0.5], round: 0.4 },
    { bone: 'hips', mat: 'steel', part: 'torso', shape: 'ell', c: [0, -0.6, 0], r: [3.8 * S, 2.8, 3.0] },
    ...SIDES.flatMap(([s]) => [
      { bone: 'upper' + s, mat: 'steel', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -4.4, 0], ra: 1.6 * S, rb: 1.4 * S },
      { bone: 'fore' + s, mat: 'steel', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -3.6, 0], ra: 1.5 * S, rb: 1.7 * S },
      { bone: 'hand' + s, mat: 'steel', part: 'arm' + s, shape: 'ell', c: [0, -0.7, 0], r: [1.3 * S, 1.4, 1.3] },
      { bone: 'thigh' + s, mat: 'steel', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -5.6, 0], ra: 1.8 * S, rb: 1.5 * S },
      { bone: 'shin' + s, mat: 'steel', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -5.2, 0], ra: 1.5 * S, rb: 1.3 * S },
      { bone: 'shin' + s, mat: 'trim', part: 'leg' + s, shape: 'ell', c: [0, 0, 0.6], r: [1.5, 1.0, 1.2] },
      { bone: 'foot' + s, mat: 'steel', part: 'leg' + s, shape: 'ell', c: [0, -0.6, 0.9], r: [1.6, 1.4, 2.4], clip: [0, -1, 0, 1.6] },
    ]),
  ];
}
// the sword (weapon bone, +y from the grip to the point) and the kite shield (strapped to the left forearm, face forward)
const sword = (L = 13, w = 0.7) => [
  { bone: 'weapon', mat: 'blade', part: 'sword', shape: 'box', c: [0, L / 2 + 1.2, 0], h: [w, L / 2, 0.3], round: 0.2 },
  { bone: 'weapon', mat: 'trim', part: 'sword', shape: 'box', c: [0, 1.0, 0], h: [2.2, 0.45, 0.5], round: 0.3 },
  { bone: 'weapon', mat: 'grip', part: 'sword', shape: 'cap', a: [0, 0.6, 0], b: [0, -2.2, 0], ra: 0.5, rb: 0.6 },
];
const shield = (sc = 1) => [
  { bone: 'foreL', mat: 'shield', part: 'shield', shape: 'box', c: [0.8, -2.0, 2.0], h: [3.0 * sc, 4.2 * sc, 0.5], round: 0.5 },
  { bone: 'foreL', mat: 'shield', part: 'shield', shape: 'ell', c: [0.8, -6.0 * sc, 2.0], r: [2.2 * sc, 2.0 * sc, 0.5] },
  { bone: 'foreL', mat: 'trim', part: 'shield', shape: 'ell', c: [0.8, -2.4, 2.6], r: [1.3 * sc, 1.8 * sc, 0.3] },
];
const MATS = { steel: STEEL, trim: TRIM, cloth: { ramp: ['#201c2a', '#2d223f', '#382a51', '#433361'] },
  blade: { ramp: ['#3a3a52', '#6a6a8a', '#a0a0c0', '#d4d4ec', '#ffffff'], spec: 0.9 }, grip: ['#271a20', '#34222a', '#4e3438', '#6a4a48'],
  shield: { ramp: ['#201c27', '#2a2436', '#40384f', '#5c5270', '#9a90b8'], spec: 0.92 } };

const HOLD = [-0.35, -0.55, 0.76];   // the sword held low, point down and forward, at rest
const hold = (a, f) => ({ weapon: { aim: a === 'walk' ? [-0.3, -0.45, 0.84] : a === 'hit' ? [-0.3, 0.6, -0.7] : HOLD } });
const attack = {
  frames: 6, ms: [250, 250, 75, 75, 250, 250],
  pose: f => [
    merge(arms([-0.55, 0.5, -0.65], [-0.3, 0.9, -0.3], [0.35, -0.3, 0.88], [0.15, 0.2, 0.97]), legs(0.15, 0.25, -0.3, -0.2, 0.25, 0.0),
      { hips: { off: [0, -0.6, -0.3] }, chest: { rot: [-0.15, -0.45, 0] }, weapon: { aim: [-0.5, 0.6, -0.62] } }),
    merge(arms([-0.35, 0.92, -0.2], [-0.1, 0.95, -0.3], [0.35, -0.2, 0.9], [0.15, 0.25, 0.95]), legs(0.1, 0.1, -0.15, -0.25, 0.15, 0.1),
      { hips: { off: [0, 0.3, -0.5] }, chest: { rot: [-0.25, -0.3, 0] }, head: { rot: [-0.1, 0, 0] }, weapon: { aim: [-0.15, 0.6, -0.78] } }),
    merge(arms([-0.15, 0.35, 0.92], [0.05, 0.3, 0.95], [0.4, -0.6, 0.65], [0.25, -0.3, 0.92]), legs(0.35, 0.3, -0.4, -0.5, 0.3, 0.2),
      { hips: { off: [0, -1.4, 1.3] }, chest: { rot: [0.3, 0.2, 0] }, weapon: { aim: [0.3, 0.45, 0.84] } }),
    merge(arms([-0.05, -0.45, 0.89], [0.15, -0.6, 0.78], [0.4, -0.8, 0.4], [0.3, -0.6, 0.7]), legs(0.45, 0.4, -0.5, -0.6, 0.35, 0.25),
      { hips: { off: [0, -2.0, 1.8] }, chest: { rot: [0.45, 0.25, 0] }, weapon: { aim: [0.45, -0.5, 0.74] } }),
    merge(arms([-0.2, -0.7, 0.68], [-0.1, -0.8, 0.55], [0.35, -0.6, 0.7], [0.2, -0.2, 0.95]), legs(0.35, 0.3, -0.4, -0.45, 0.3, 0.2),
      { hips: { off: [0, -1.5, 1.2] }, chest: { rot: [0.35, 0.3, 0] }, weapon: { aim: [0.3, -0.75, 0.59] } }),
    merge(arms([-0.2, -0.95, 0.25], [-0.1, -0.5, 0.85], [0.25, -0.7, 0.65], [0.15, -0.1, 0.98]), legs(0.15, 0.15, -0.2, -0.2, 0.15, 0.1),
      { hips: { off: [0, -0.5, 0.5] }, chest: { rot: [0.12, 0.08, 0] }, weapon: { aim: HOLD } }),
  ][f],
};
const death = {
  frames: 3, ms: [180, 180, 400],
  pose: f => [
    merge(arms([-0.5, -0.4, -0.76], [-0.3, -0.2, -0.93]), legs(-0.2, 0.4, -0.1, 0.1, 0.5, -0.3),
      { hips: { off: [0, -1.2, -0.6] }, chest: { rot: [-0.35, 0.1, 0] }, head: { rot: [-0.3, 0, 0] }, weapon: { aim: [-0.4, 0.8, -0.45] } }),
    merge(arms([-0.3, -0.85, 0.42], [-0.1, -0.9, 0.4]), legs(-1.2, 2.0, -0.4, -1.2, 2.0, -0.4),
      { hips: { off: [0, -6.0, -1.2] }, chest: { rot: [0.45, 0, 0] }, head: { rot: [0.3, 0, 0] }, weapon: { aim: [-0.5, -0.6, 0.6] } }),
    merge(arms([-0.4, -0.3, 0.87], [-0.2, -0.2, 0.96]), legs(-0.3, 0.3, -0.2, -0.25, 0.4, -0.2),
      { hips: { off: [0, -8.0, -5.0], rot: [1.05, 0, 0] }, chest: { rot: [0.3, 0, 0] }, head: { rot: [0.2, 0, 0] }, weapon: { aim: [-0.75, -0.2, -0.63] } }),
  ][f],
};
// a humanoid bone set at the hero's scale (as models/brambleshaman.js)
const bones = () => [
  { name: 'hips', at: [0, 12.5, 0] },
  { name: 'spine', parent: 'hips', at: [0, 0, 0] },
  { name: 'chest', parent: 'spine', at: [0, 6.0, 0] },
  { name: 'head', parent: 'chest', at: [0, 6.2, 0.4] },
  ...SIDES.flatMap(([s, k]) => [
    { name: 'upper' + s, parent: 'chest', at: [4.8 * k, 3.6, 0] },
    { name: 'fore' + s, parent: 'upper' + s, at: [0, -4.4, 0] },
    { name: 'hand' + s, parent: 'fore' + s, at: [0, -4.0, 0] },
    { name: 'thigh' + s, parent: 'hips', at: [2.4 * k, -0.6, 0] },
    { name: 'shin' + s, parent: 'thigh' + s, at: [0, -5.6, 0] },
    { name: 'foot' + s, parent: 'shin' + s, at: [0, -5.2, 0] },
  ]),
  { name: 'weapon', parent: 'handR', at: [0, -0.8, 0] },
];

const model = Object.assign({
  name: 'gloomknight',
  frame: [68, 72], origin: [34, 57],
  bankSheets: { mv: ['walk'], die: ['hit', 'death'] },
  bones: bones(),
  layers: [{ id: 'body', group: 'body', mats: MATS, prims: [...bodyPrims({}), ...sword(), ...shield()],
    stamps: [{ bone: 'head', at: [0, 3.0, 3.5], n: [0, 0, 1], facing: 0.1, on: 'steel', px: [[-1, 0, '#d48aff'], [0, 0, '#d48aff'], [1, 0, '#d48aff']] }] }],
  anims: { idle: K.idle6(1, hold), walk: K.walk6(1, hold), attack, hit: K.hit(1, hold), death },
  sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death'],
  sockets: { head: { bone: 'head', at: [0, 7.4, 0] }, chest: { bone: 'chest', at: [0, 1.4, 0] }, handR: { bone: 'handR', at: [0, -0.8, 0] }, tip: { bone: 'weapon', at: [0, 14, 0] } },
  dirs: K.DIRS8,
}, K.BASE);

module.exports = model;
Object.defineProperty(module.exports, 'kit', { value: { bodyPrims, sword, shield, MATS, attack, death, bones, hold, SIDES }, enumerable: false });
