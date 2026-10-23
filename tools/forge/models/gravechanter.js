'use strict';
// GRAVE CHANTER (`gravechanter`, the Ruins: the robed caster) — a forge humanoid at the hero's scale on the Bramble Shaman's
// bones and anims (models/brambleshaman.js: idle / walk / hit from humanoid-anims, its 6-frame cast, heal channel and death),
// about 36 px tall: a hooded grey burial robe with a ragged hem, a bone-white skull mask with ghost-green eyes, a rope belt,
// and a tall bell-staff (a bronze bell under a ghost-green flame). Frame 68 x 72, origin (34, 57). Every pixel from volumes
// (eyes: surface stamps). Units are pixels, y up, it faces +z; its RIGHT side is -x. Attack = the cast (render.js: wind
// f0-1, release f2-3, rec f4-5); heal 1 (a support channel, held); death 3. Sockets: head, chest (status), handR, tip.
const SH = require('./brambleshaman.js');
const SIDES = [['R', -1], ['L', 1]];
const ROBE = ['#1f1d27', '#2e2c3a', '#46445a', '#64627e'];
const prims = [
  // the skull mask inside the hood
  { bone: 'head', mat: 'bone', part: 'face', shape: 'ell', c: [0, 2.8, 1.2], r: [2.7, 3.0, 2.8] },
  { bone: 'head', mat: 'hollow', part: 'face', shape: 'ell', c: [0, 1.0, 3.2], r: [1.4, 0.8, 0.8] },
  { bone: 'head', mat: 'robe', part: 'robe', shape: 'ell', c: [0, 3.4, -0.5], r: [4.3, 4.8, 4.4], clip: [0, 0, 1, 1.6] },
  { bone: 'head', mat: 'robe', part: 'robe', shape: 'cap', a: [0, 6.0, -2.0], b: [0, 5.0, -5.6], ra: 2.2, rb: 0.8 },
  // the robe: chest, a bell to the ground, a ragged hem of torn strips, a rope belt, a hood cowl on the shoulders
  { bone: 'chest', mat: 'robe', part: 'robe', shape: 'ell', c: [0, 1.6, 0], r: [4.6, 5.0, 3.6] },
  { bone: 'chest', mat: 'robe', part: 'robe', shape: 'disc', c: [0, 4.4, -0.2], r: [5.2, 1.0, 4.2] },
  { bone: 'hips', mat: 'robe', part: 'robe', shape: 'cap', a: [0, 2.0, -0.2], b: [0, -9.6, -0.4], ra: 4.0, rb: 6.4, clip: [0, -1, 0, 11.4] },
  ...Array.from({ length: 7 }, (_, i) => { const a = 2 * Math.PI * i / 7 + 0.2; return { bone: 'hips', mat: 'robe', part: 'robe', shape: 'box', c: [6.2 * Math.sin(a), -10.6 - (i % 2) * 0.6, -0.4 + 6.2 * Math.cos(a)], h: [1.2, 1.4, 0.5], round: 0.3, rot: [0, a, 0] }; }),
  { bone: 'hips', mat: 'rope', part: 'robe', shape: 'disc', c: [0, 0.8, -0.1], r: [5.2, 0.6, 4.4] },
  { bone: 'hips', mat: 'rope', part: 'robe', shape: 'cap', a: [1.4, 0.4, 4.2], b: [1.8, -3.6, 4.8], ra: 0.5, rb: 0.4 },
  ...SIDES.flatMap(([s]) => [
    { bone: 'upper' + s, mat: 'robe', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -4.4, 0], ra: 1.6, rb: 1.5 },
    { bone: 'fore' + s, mat: 'robe', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -3.4, 0], ra: 1.6, rb: 2.2 },
    { bone: 'hand' + s, mat: 'bone', part: 'arm' + s, shape: 'ell', c: [0, -0.8, 0], r: [1.1, 1.3, 1.1] },
    { bone: 'thigh' + s, mat: 'robe', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -5.6, 0], ra: 1.5, rb: 1.3 },
    { bone: 'shin' + s, mat: 'robe', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -5.2, 0], ra: 1.2, rb: 1.1 },
    { bone: 'foot' + s, mat: 'hollow', part: 'leg' + s, shape: 'ell', c: [0, -0.6, 0.8], r: [1.4, 1.4, 2.0], clip: [0, -1, 0, 1.6] },
  ]),
  // the bell-staff: a dark shaft, a crook, a bronze bell hanging under it, a ghost-flame on top
  { bone: 'weapon', mat: 'wood', part: 'staff', shape: 'cap', a: [0, -12.0, 0], b: [0, 14.0, 0], ra: 0.8, rb: 0.9 },
  { bone: 'weapon', mat: 'wood', part: 'staff', shape: 'cap', a: [0, 14.0, 0], b: [0, 15.6, 2.4], ra: 0.9, rb: 0.7 },
  { bone: 'weapon', mat: 'bronze', part: 'bell', shape: 'cap', a: [0, 14.8, 2.6], b: [0, 12.2, 2.8], ra: 0.7, rb: 1.7 },
  { bone: 'weapon', mat: 'flame', part: 'flame', shape: 'cap', a: [0, 15.4, 0], b: [0, 18.6, -0.2], ra: 1.4, rb: 0.4 },
];
const layers = [{
  id: 'body', group: 'body', prims,
  mats: { robe: ROBE, bone: { ramp: ['#8a8070', '#bdb4a0', '#e2dac6', '#f8f2e2'], lift: 1 }, hollow: { ramp: ['#1e1d21', '#28252e', '#322e3b', '#3c3847'] },
    rope: ['#3a2e22', '#5a4a34', '#7c6848', '#9e8a62'], wood: ['#251b1f', '#34242a', '#4e383a', '#6a5048'],
    bronze: { ramp: ['#4a2e14', '#7a5224', '#b07e3a', '#e0b060', '#fff0c0'], spec: 0.9 }, flame: { ramp: ['#3ab07a', '#6ef0a0', '#b4ffd0', '#eafff4'], lift: 2 } },
  stamps: SIDES.map(([, k]) => ({ bone: 'head', at: [1.1 * k, 3.0, 3.8], n: [0.3 * k, 0, 0.95], facing: 0.05, on: 'bone', px: [[0, 0, '#5affa0'], [0, 1, '#2a8a5a']] })),
}];

module.exports = {
  name: 'gravechanter',
  frame: [68, 72], origin: [34, 57],
  cam: SH.cam, light: SH.light, tones: SH.tones, outline: SH.outline, innerLine: SH.innerLine, pixel: SH.pixel,
  flatDepth: true, bankSheets: { mv: ['walk'], die: ['hit', 'death', 'heal'] },
  bones: SH.bones.map(b => Object.assign({}, b)), layers, anims: SH.anims, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death', 'heal'],
  sockets: { handR: { bone: 'handR', at: [0, -0.8, 0] }, tip: { bone: 'weapon', at: [0, 16.6, 0] }, head: { bone: 'head', at: [0, 8.0, 0] }, chest: { bone: 'chest', at: [0, 1.4, 0] } },
  dirs: SH.dirs,
};
