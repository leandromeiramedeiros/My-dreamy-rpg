'use strict';
// CHIBI GEAR — the knight kit for the chibi rig (models/chibi.js), sized to its big head and short limbs: helm + plume,
// plate (gorget, fauld, tabard, pauldrons, vambraces, gauntlets, chest emblem), greaves, an oversized sword, a shield and
// a cape with collar. Palettes follow js/data.js (Knight Helm / Knight Plate / Knight Greaves); the sword's 5 tiers and
// the 'royal' loadout are palette swaps of the same baked layers.
const SIDES = [['R', -1], ['L', 1]];
const GOLD = ['#8a5a10', '#c08a20', '#e8b830', '#fff0a0'];
const STEEL = ['#3a4264', '#5f6a94', '#929ec4', '#dde4f6'];
const DARK = ['#22263c', '#3a4060', '#596388', '#8a96bc'];
const BLUE = ['#1a2a5e', '#263f86', '#3b5bb5', '#7f9cf0'];
const LEATHER = ['#3e2618', '#5e3d2a', '#8c5d3f', '#c08a5e'];
const notAttack = fn => (a, f) => a.startsWith('attack') ? {} : fn(a, f);

const knighthelm = {
  id: 'knighthelm', slot: 'head', hides: ['hair', 'bangs', 'hairSide'],
  layers: [{ id: 'knighthelm', bias: 0.3, mats: { steel: STEEL, gold: GOLD, plume: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'] }, prims: [
    { bone: 'head', mat: 'steel', part: 'helm', shape: 'ell', c: [0, 6.5, -0.2], r: [6.9, 6.4, 6.3], clip: [[0, -0.22, 0.98, 2.4], [0, -1, 0, -1.4]] },
    { bone: 'head', mat: 'gold', part: 'helm', shape: 'ell', c: [0, 7.9, 0], r: [7.0, 0.85, 6.4] },
    { bone: 'head', mat: 'plume', part: 'plume', shape: 'cap', a: [0, 12.4, 0.5], b: [0, 13.4, -3.6], ra: 1.6, rb: 1.1 },
    { bone: 'head', mat: 'plume', part: 'plume', shape: 'cap', a: [0, 13.4, -3.6], b: [0, 11.0, -6.6], ra: 1.1, rb: 0.6 },
  ] }],
};
const warden = {
  id: 'warden', slot: 'chest',
  layers: [{ id: 'warden', bias: 0.7, mats: { steel: STEEL, dark: DARK, cloth: BLUE, gold: GOLD, leather: LEATHER }, prims: [
    { bone: 'chest', mat: 'steel', part: 'plate', shape: 'ell', c: [0, 0.9, 0.35], r: [4.6, 4.9, 3.55], clip: [0, -1, 0, 3.6] },
    { bone: 'chest', mat: 'dark', part: 'plate', shape: 'ell', c: [0, 4.3, 0.1], r: [3.7, 1.3, 3.1] },
    { bone: 'spine', mat: 'steel', part: 'plate', shape: 'ell', c: [0, 1.4, 0], r: [5.05, 2.7, 3.95], clip: [0, -1, 0, 1.5] },
    { bone: 'spine', mat: 'leather', part: 'plate', shape: 'ell', c: [0, 3.1, 0], r: [4.6, 0.65, 3.6] },
    { bone: 'spine', mat: 'gold', part: 'plate', shape: 'box', c: [0, 3.1, 3.55], h: [0.8, 0.7, 0.3], round: 0.2 },
    { bone: 'spine', mat: 'cloth', part: 'tabard', shape: 'box', c: [0, 0.2, 3.95], h: [1.9, 2.3, 0.35], round: 0.3 },
    ...SIDES.flatMap(([s]) => [
      { bone: 'upper' + s, mat: 'steel', part: 'pauldron' + s, shape: 'ell', c: [0, 0.25, 0], r: [2.55, 2.15, 2.55], clip: [0, -1, 0, 1.0] },
      { bone: 'upper' + s, mat: 'gold', part: 'pauldron' + s, shape: 'ell', c: [0, -0.6, 0], r: [2.6, 0.45, 2.6] },
      { bone: 'fore' + s, mat: 'steel', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -1.9, 0], ra: 1.55, rb: 1.5 },
      { bone: 'hand' + s, mat: 'dark', part: 'arm' + s, shape: 'ell', c: [0, -0.6, 0], r: [1.65, 1.6, 1.65] },
    ]),
  ],
  stamps: [{ bone: 'chest', at: [0, 1.4, 3.9], n: [0, 0, 1], facing: 0.3, on: 'steel',
    px: [[0, 0, '#e8b830'], [-1, 0, '#e8b830'], [1, 0, '#e8b830'], [0, -1, '#fff0a0'], [0, 1, '#c08a20']] }] }],
};
const knightgreaves = {
  id: 'knightgreaves', slot: 'boots',
  layers: [{ id: 'knightgreaves', bias: 0.3, mats: { steel: STEEL }, prims: SIDES.flatMap(([s]) => [
    { bone: 'foot' + s, mat: 'steel', part: 'boot' + s, shape: 'ell', c: [0, -1.0, 0.85], r: [2.2, 2.0, 2.9], clip: [0, -1, 0, 2.6] },
    { bone: 'shin' + s, mat: 'steel', part: 'boot' + s, shape: 'cap', a: [0, 0.1, 0.1], b: [0, -2.4, 0.15], ra: 1.8, rb: 1.75 },
    { bone: 'shin' + s, mat: 'steel', part: 'boot' + s, shape: 'ell', c: [0, 0.3, 0.6], r: [1.35, 1.25, 1.25] },
  ]) }],
};
const sword = {
  id: 'sword', slot: 'weapon', class: 'sword',
  layers: [{ id: 'sword', mats: { blade: ['#5d6688', '#98a6bd', '#d8e0f0', '#ffffff'], guard: GOLD, grip: LEATHER }, prims: [
    { bone: 'weapon', mat: 'grip', part: 'hilt', shape: 'cap', a: [0, -1.3, 0], b: [0, 1.3, 0], ra: 0.65, rb: 0.65 },
    { bone: 'weapon', mat: 'guard', part: 'hilt', shape: 'cap', a: [-2.6, 1.75, 0], b: [2.6, 1.75, 0], ra: 0.65, rb: 0.65 },
    { bone: 'weapon', mat: 'guard', part: 'hilt', shape: 'ell', c: [0, -1.9, 0], r: [0.9, 0.9, 0.9] },
    { bone: 'weapon', mat: 'blade', part: 'blade', shape: 'cap', a: [0, 2.2, 0], b: [0, 12.8, 0], ra: 1.0, rb: 0.5 },
  ] }],
  pose: notAttack(a => ({ weapon: { aim: a === 'cast' ? [-0.3, -0.6, 0.75] : a === 'hit' ? [-0.5, -0.4, 0.75] : a === 'dash' ? [-0.3, -0.2, -0.93] : [-0.7, -0.4, 0.6] } })),
  sockets: { tip: { bone: 'weapon', at: [0, 12.8, 0] } },
  // Rusty Blade, Dawnblade, Sunforged Blade, Aurora Edge, Dawn Eternal
  tiers: [{ blade: '#8a7a70', guard: '#7a5a48' }, {}, { blade: ['#8a4a10', '#d08a20', '#f6c850', '#fff4c0'], guard: ['#6a1f2a', '#a8323a', '#e0475e', '#ff9aa0'] },
    { blade: ['#1e5a78', '#3aa0c8', '#7fe0f0', '#e8ffff'], guard: ['#2a1b55', '#3d2878', '#5d3fa8', '#9c7ae0'] }, { blade: ['#a04a90', '#e07ac8', '#ffc8f0', '#ffffff'], guard: ['#8e97b8', '#cfd6ea', '#ffffff', '#ffffff'] }],
};
// shield on the off hand: the face looks out to the left-front, raised square-on to block when hit
const shield = {
  id: 'shield', slot: 'offhand',
  layers: [{ id: 'shield', mats: { face: BLUE, rim: GOLD }, prims: [
    { bone: 'offhand', mat: 'face', part: 'shield', shape: 'ell', c: [0, 0.3, 0.9], r: [3.3, 3.8, 0.55] },
    { bone: 'offhand', mat: 'rim', part: 'shield', shape: 'ell', c: [0, 0.3, 0.7], r: [3.65, 4.15, 0.45] },
    { bone: 'offhand', mat: 'rim', part: 'shield', shape: 'ell', c: [0, 0.4, 1.4], r: [1.1, 1.1, 0.6] },
  ] }],
  pose: a => ({ offhand: a === 'hit' ? { aim: [0, 1, 0.2], roll: [0.25, 0, 0.97] } : a === 'dash' ? { aim: [0.1, 1, -0.2], roll: [0.9, 0, -0.4] } : { aim: [0.15, 1, 0.1], roll: [0.75, 0, 0.66] } }),
};
const cape = {
  id: 'cape', slot: 'back',
  layers: [{ id: 'cape', mats: { cloth: ['#5a1428', '#8a2238', '#b8324a', '#e0607a'] }, prims: [
    { bone: 'chest', mat: 'cloth', part: 'collar', shape: 'ell', c: [0, 4.1, -0.4], r: [4.0, 1.35, 3.4] },
    // a tapered capsule squashed flat by the cape bone: narrow at the shoulders, wide at the hem
    { bone: 'cape', mat: 'cloth', part: 'cape', shape: 'cap', a: [0, -0.3, -0.5], b: [0, -10.2, -1.4], ra: 3.0, rb: 4.6, clip: [[0, 1, 0, 0], [0, -1, 0, 10.5]] },
  ] }],
  pose: () => ({ cape: { scl: [1, 1, 0.26] } }),
};

const ROYAL = ['#7a4a08', '#b88418', '#ecc040', '#fff4b0'], CRIMSON = ['#4a0e1e', '#7e1a30', '#b8324a', '#ff7a90'];
const pieces = { knighthelm, warden, knightgreaves, sword, shield, cape };
const loadouts = {
  bare: [],
  knight: ['knighthelm', 'warden', 'knightgreaves', 'sword', 'shield', 'cape'],
  royal: [{ id: 'knighthelm', pal: { steel: ROYAL, gold: STEEL } }, { id: 'warden', pal: { steel: ROYAL, cloth: CRIMSON, gold: STEEL } }, { id: 'knightgreaves', pal: { steel: ROYAL } },
    { id: 'sword', tier: 4 }, { id: 'shield', pal: { face: CRIMSON } }, { id: 'cape', pal: { cloth: BLUE } }],
};
module.exports = { pieces, loadouts };
