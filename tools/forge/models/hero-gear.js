'use strict';
// HERO GEAR — the live gear of js/data.js as forge pieces on the hero rig (models/hero.js). Palettes follow each item's
// `pal` in data.js; weapon tiers (T1..T5) are palette swaps. A piece's `pose` only moves bones no other layer uses
// (weapon / offhand), so the bare body and every piece bake independently and stack at runtime.
const SIDES = [['R', -1], ['L', 1]];
const GOLD = ['#8a5a10', '#c08a20', '#e8b830', '#fff0a0'];
const STEEL = ['#363d5e', '#5a6590', '#8a96bc', '#d2daf0'];
const LEATHER = ['#3e2618', '#5e3d2a', '#8c5d3f', '#c08a5e'];
const notAttack = fn => (a, f) => a.startsWith('attack') ? {} : fn(a, f);

// ---- head ------------------------------------------------------------------------------------------------------------
const knighthelm = {
  id: 'knighthelm', slot: 'head', hides: ['hair', 'bangs'],
  layers: [{ id: 'knighthelm', bias: 0.3, mats: { steel: ['#424a6e', '#68739c', '#a0abcc', '#e8eefa'], plume: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'] }, prims: [
    { bone: 'head', mat: 'steel', part: 'helm', shape: 'ell', c: [0, 4.0, 0], r: [3.2, 3.6, 3.3], clip: [[0, -0.2, 0.98, 1.9], [0, -1, 0, -1.2]] },
    { bone: 'head', mat: 'steel', part: 'helm', shape: 'cap', a: [0, 5.0, 3.1], b: [0, 2.7, 3.25], ra: 0.45, rb: 0.4 },
    { bone: 'head', mat: 'plume', part: 'plume', shape: 'cap', a: [0, 7.4, 0.8], b: [0, 6.9, -3.2], ra: 0.95, rb: 0.7 },
  ] }],
};
const arcanecowl = {
  id: 'arcanecowl', slot: 'head', hides: ['hair'],
  layers: [{ id: 'arcanecowl', bias: 0.3, mats: { hood: ['#2a1b55', '#3d2878', '#5d3fa8', '#9c7ae0'] }, prims: [
    { bone: 'head', mat: 'hood', part: 'hood', shape: 'ell', c: [0, 4.0, -0.3], r: [3.45, 3.8, 3.6], clip: [[0, -0.25, 0.97, 2.1], [0, -1, 0, -0.4]] },
    { bone: 'head', mat: 'hood', part: 'hood', shape: 'cap', a: [0, 6.9, -2.4], b: [0, 5.2, -5.2], ra: 1.2, rb: 0.45 },
    { bone: 'chest', mat: 'hood', part: 'hood', shape: 'ell', c: [0, 7.4, -0.4], r: [5.0, 1.7, 3.4] },
  ] }],
};
const wardenhood = {
  id: 'wardenhood', slot: 'head', hides: ['hair'],
  layers: [{ id: 'wardenhood', bias: 0.3, mats: { hood: ['#1f3d2e', '#2a5340', '#3f7a58', '#6aa77e'], leaf: ['#2a5340', '#3f7a58', '#6aa77e', '#b8e0a0'] }, prims: [
    { bone: 'head', mat: 'hood', part: 'hood', shape: 'ell', c: [0, 4.0, -0.3], r: [3.4, 3.7, 3.5], clip: [[0, -0.3, 0.95, 2.0], [0, -1, 0, -0.6]] },
    { bone: 'chest', mat: 'hood', part: 'hood', shape: 'ell', c: [0, 7.2, -0.5], r: [5.3, 1.9, 3.6] },
    { bone: 'head', mat: 'leaf', part: 'hood', shape: 'ell', c: [2.3, 6.3, 0.9], r: [0.7, 1.1, 0.6] },
  ] }],
};

// ---- chest -----------------------------------------------------------------------------------------------------------
const warden = {
  id: 'warden', slot: 'chest',
  layers: [{ id: 'warden', bias: 0.7, mats: { steel: STEEL, mail: ['#22263c', '#3a4060', '#596388', '#8a96bc'], cloth: ['#1a2a5e', '#263f86', '#3b5bb5', '#7f9cf0'], leather: LEATHER, gold: GOLD }, prims: [
    { bone: 'chest', mat: 'steel', part: 'plate', shape: 'ell', c: [0, 4.3, 0.25], r: [4.9, 3.9, 3.1] },
    { bone: 'spine', mat: 'steel', part: 'plate', shape: 'ell', c: [0, 2.1, 0.1], r: [3.6, 3.0, 2.7] },
    { bone: 'spine', mat: 'leather', part: 'plate', shape: 'box', c: [0, 0.2, 0], h: [3.75, 0.55, 2.75], round: 0.3 },
    { bone: 'spine', mat: 'gold', part: 'plate', shape: 'box', c: [0, 0.2, 2.75], h: [0.7, 0.6, 0.3], round: 0.2 },
    { bone: 'hips', mat: 'cloth', part: 'tabard', shape: 'box', c: [0, -2.6, 2.6], h: [1.8, 3.4, 0.35], round: 0.3 },
    { bone: 'hips', mat: 'cloth', part: 'tabard', shape: 'box', c: [0, -2.6, -2.6], h: [1.8, 3.4, 0.35], round: 0.3 },
    ...SIDES.flatMap(([s]) => [
      { bone: 'upper' + s, mat: 'steel', part: 'pauldron' + s, shape: 'ell', c: [0, -0.3, 0], r: [2.3, 2.0, 2.3], clip: [0, -1, 0, 1.6] },
      { bone: 'upper' + s, mat: 'mail', part: 'arm' + s, shape: 'cap', a: [0, -0.5, 0], b: [0, -5.2, 0], ra: 1.45, rb: 1.3 },
      { bone: 'fore' + s, mat: 'steel', part: 'arm' + s, shape: 'cap', a: [0, -1.2, 0], b: [0, -4.6, 0], ra: 1.3, rb: 1.2 },
    ]),
  ] }],
};
const dreamweave = {
  id: 'dreamweave', slot: 'chest',
  layers: [{ id: 'dreamweave', bias: 0.7, mats: { robe: ['#3a2a78', '#4f3a8f', '#7a5cc4', '#b8a0f0'], dark: ['#160f34', '#1f1846', '#2f2466', '#5a3f9c'], gold: GOLD }, prims: [
    { bone: 'chest', mat: 'robe', part: 'robe', shape: 'ell', c: [0, 4.3, 0.1], r: [4.8, 3.9, 3.0] },
    { bone: 'spine', mat: 'robe', part: 'robe', shape: 'ell', c: [0, 2.2, 0], r: [3.5, 3.2, 2.6] },
    { bone: 'hips', mat: 'robe', part: 'robe', shape: 'cap', a: [0, 0.6, 0], b: [0, -12.6, 0], ra: 4.0, rb: 6.0, clip: [[0, -1, 0, 12.8], [0, 1, 0, 0.6]] },
    { bone: 'hips', mat: 'gold', part: 'robe', shape: 'ell', c: [0, 0.7, 0], r: [4.15, 0.65, 4.1] },
    { bone: 'chest', mat: 'dark', part: 'robe', shape: 'ell', c: [0, 7.5, 0.3], r: [2.7, 1.0, 2.1] },
    ...SIDES.flatMap(([s]) => [
      { bone: 'upper' + s, mat: 'robe', part: 'sleeve' + s, shape: 'cap', a: [0, -0.2, 0], b: [0, -5.2, 0], ra: 1.65, rb: 1.55 },
      { bone: 'fore' + s, mat: 'robe', part: 'sleeve' + s, shape: 'cap', a: [0, 0, 0], b: [0, -3.8, 0], ra: 1.45, rb: 1.8 },
      { bone: 'fore' + s, mat: 'dark', part: 'sleeve' + s, shape: 'ell', c: [0, -4.0, 0], r: [1.85, 0.6, 1.85] },
    ]),
  ] }],
};
const stalker = {
  id: 'stalker', slot: 'chest',
  layers: [{ id: 'stalker', bias: 0.7, mats: { leather: LEATHER, green: ['#13301f', '#1f4a37', '#2f6b4f', '#5fa37e'], belt: ['#1e1522', '#2e2230', '#3e3a4a', '#6a6478'], gold: GOLD }, prims: [
    { bone: 'chest', mat: 'leather', part: 'coat', shape: 'ell', c: [0, 4.3, 0.15], r: [4.8, 3.9, 3.0] },
    { bone: 'spine', mat: 'leather', part: 'coat', shape: 'ell', c: [0, 2.2, 0.05], r: [3.5, 3.2, 2.6] },
    { bone: 'hips', mat: 'leather', part: 'coat', shape: 'cap', a: [0, 0.4, 0], b: [0, -4.4, 0], ra: 4.2, rb: 4.7, clip: [[0, -1, 0, 4.7], [0, 1, 0, 0.4]] },
    { bone: 'hips', mat: 'belt', part: 'coat', shape: 'ell', c: [0, 0.6, 0], r: [4.35, 0.6, 4.3] },
    { bone: 'hips', mat: 'gold', part: 'coat', shape: 'box', c: [0, 0.6, 4.2], h: [0.6, 0.55, 0.3], round: 0.2 },
    { bone: 'chest', mat: 'green', part: 'scarf', shape: 'ell', c: [0, 7.4, 0.2], r: [3.3, 1.35, 2.7] },
    ...SIDES.flatMap(([s]) => [
      { bone: 'upper' + s, mat: 'leather', part: 'arm' + s, shape: 'cap', a: [0, -0.3, 0], b: [0, -5.2, 0], ra: 1.55, rb: 1.3 },
      { bone: 'fore' + s, mat: 'leather', part: 'arm' + s, shape: 'cap', a: [0, -1.0, 0], b: [0, -4.4, 0], ra: 1.25, rb: 1.2 },
    ]),
  ] }],
};

// ---- boots -----------------------------------------------------------------------------------------------------------
const boot = (id, mats, prims) => ({ id, slot: 'boots', layers: [{ id, bias: 0.3, mats, prims: SIDES.flatMap(([s]) => prims(s)) }] });
const knightgreaves = boot('knightgreaves', { steel: ['#3e4668', '#646e98', '#959fc4', '#dce2f4'] }, s => [
  { bone: 'foot' + s, mat: 'steel', part: 'boot' + s, shape: 'ell', c: [0, -1.1, 1.0], r: [1.5, 1.35, 2.4], clip: [0, -1, 0, 2.4] },
  { bone: 'shin' + s, mat: 'steel', part: 'boot' + s, shape: 'cap', a: [0, -1.4, 0.25], b: [0, -6.6, 0.25], ra: 1.55, rb: 1.4 },
  { bone: 'shin' + s, mat: 'steel', part: 'boot' + s, shape: 'ell', c: [0, 0.1, 0.55], r: [1.25, 1.15, 1.2] },
]);
const clothsandals = boot('clothsandals', { wrap: ['#a88a6a', '#c9a77f', '#e7c9a0', '#f6e6c8'] }, s => [
  { bone: 'foot' + s, mat: 'wrap', part: 'boot' + s, shape: 'ell', c: [0, -1.2, 0.9], r: [1.38, 1.3, 2.3], clip: [0, -1, 0, 2.4] },
  { bone: 'shin' + s, mat: 'wrap', part: 'boot' + s, shape: 'cap', a: [0, -4.8, 0], b: [0, -6.8, 0], ra: 1.3, rb: 1.25 },
]);
const stalkershoes = boot('stalkershoes', { leather: ['#3a2218', '#523222', '#6b4430', '#9a6a4c'] }, s => [
  { bone: 'foot' + s, mat: 'leather', part: 'boot' + s, shape: 'ell', c: [0, -1.1, 1.0], r: [1.45, 1.3, 2.35], clip: [0, -1, 0, 2.4] },
  { bone: 'shin' + s, mat: 'leather', part: 'boot' + s, shape: 'cap', a: [0, -3.0, 0], b: [0, -6.8, 0], ra: 1.5, rb: 1.4 },
]);

// ---- weapons ---------------------------------------------------------------------------------------------------------
const sword = {
  id: 'sword', slot: 'weapon', class: 'sword',
  layers: [{ id: 'sword', mats: { blade: ['#5d6688', '#98a6bd', '#d8e0f0', '#ffffff'], guard: GOLD, grip: LEATHER }, prims: [
    { bone: 'weapon', mat: 'grip', part: 'hilt', shape: 'cap', a: [0, -1.3, 0], b: [0, 1.3, 0], ra: 0.55, rb: 0.55 },
    { bone: 'weapon', mat: 'guard', part: 'hilt', shape: 'cap', a: [-2.0, 1.75, 0], b: [2.0, 1.75, 0], ra: 0.5, rb: 0.5 },
    { bone: 'weapon', mat: 'guard', part: 'hilt', shape: 'ell', c: [0, -1.8, 0], r: [0.75, 0.75, 0.75] },
    { bone: 'weapon', mat: 'blade', part: 'blade', shape: 'cap', a: [0, 2.2, 0], b: [0, 15.0, 0], ra: 0.75, rb: 0.35 },
  ] }],
  pose: notAttack(a => ({ weapon: { aim: a === 'cast' ? [-0.2, -0.95, 0.25] : a === 'hit' ? [-0.45, -0.6, 0.66] : a === 'dash' ? [-0.25, -0.2, -0.95] : [-0.4, -0.85, 0.35] } })),
  sockets: { tip: { bone: 'weapon', at: [0, 15.0, 0] } },
  // Rusty Blade, Dawnblade, Sunforged Blade, Aurora Edge, Dawn Eternal
  tiers: [{ blade: '#8a7a70', guard: '#7a5a48' }, {}, { blade: ['#8a4a10', '#d08a20', '#f6c850', '#fff4c0'], guard: ['#6a1f2a', '#a8323a', '#e0475e', '#ff9aa0'] },
    { blade: ['#1e5a78', '#3aa0c8', '#7fe0f0', '#e8ffff'], guard: ['#2a1b55', '#3d2878', '#5d3fa8', '#9c7ae0'] }, { blade: ['#a04a90', '#e07ac8', '#ffc8f0', '#ffffff'], guard: ['#8e97b8', '#cfd6ea', '#ffffff', '#ffffff'] }],
};
const staff = {
  id: 'staff', slot: 'weapon', class: 'staff',
  layers: [{ id: 'staff', mats: { wood: ['#3e2618', '#5e3d2a', '#7a5238', '#a8784e'], gold: GOLD, crystal: { ramp: ['#5a2a9a', '#8a4ad8', '#b88af0', '#f4e8ff'], lift: 1 } }, prims: [
    { bone: 'weapon', mat: 'wood', part: 'staff', shape: 'cap', a: [0, -11, 0], b: [0, 12.6, 0], ra: 0.6, rb: 0.6 },
    { bone: 'weapon', mat: 'gold', part: 'staff', shape: 'ell', c: [0, 12.8, 0], r: [1.0, 0.6, 1.0] },
    { bone: 'weapon', mat: 'gold', part: 'staff', shape: 'cap', a: [-1.1, 12.9, 0], b: [-1.0, 16.4, 0], ra: 0.45, rb: 0.35 },
    { bone: 'weapon', mat: 'gold', part: 'staff', shape: 'cap', a: [1.1, 12.9, 0], b: [1.0, 16.4, 0], ra: 0.45, rb: 0.35 },
    { bone: 'weapon', mat: 'crystal', part: 'gem', shape: 'ell', c: [0, 15.0, 0], r: [1.25, 1.9, 1.25] },
    { bone: 'weapon', mat: 'gold', part: 'staff', shape: 'ell', c: [0, -11.2, 0], r: [0.75, 0.6, 0.75] },
  ] }],
  pose: notAttack(a => ({ weapon: { aim: a === 'cast' ? [0.05, 1, 0.3] : a === 'hit' ? [-0.3, 0.9, -0.3] : a === 'dash' ? [-0.2, 0.3, -0.95] : [0.04, 1, 0.12] } })),
  sockets: { tip: { bone: 'weapon', at: [0, 15.0, 0] } },
  // Willow Wand, Starfall Staff, Comet Rod, Nebula Sceptre, Night Eternal
  tiers: [{ crystal: ['#2a6a3a', '#4aa05a', '#8ad07a', '#e0ffd0'], gold: '#8a6a40' }, {}, { crystal: ['#8a2a10', '#d8602a', '#ffa040', '#fff0c0'] },
    { crystal: ['#1a3a8a', '#3a78f0', '#8ac0ff', '#f0f8ff'], wood: ['#1e1632', '#2e2248', '#463468', '#6a5490'] }, { crystal: ['#1a0a20', '#6a2a6a', '#e05ad0', '#ffd0f8'], gold: ['#4a4f6e', '#8e97b8', '#cfd6ea', '#ffffff'] }],
};
const drawing = (a, f) => a === 'attack:bow' && f < 2;
const bow = {
  id: 'bow', slot: 'weapon', class: 'bow',
  layers: [
    { id: 'bow', mats: { wood: ['#4a3a18', '#7a6028', '#b89040', '#f0d070'], grip: LEATHER, string: { ramp: ['#e8e0d0', '#e8e0d0', '#e8e0d0', '#e8e0d0'], flat: 2 }, arrow: { ramp: ['#d8d0c0', '#d8d0c0', '#d8d0c0', '#d8d0c0'], flat: 2 } }, prims: [
      { bone: 'offhand', mat: 'grip', part: 'bow', shape: 'cap', a: [0, -1.1, 0.2], b: [0, 1.1, 0.2], ra: 0.75, rb: 0.75 },
      ...[1, -1].flatMap(k => [
        { bone: 'offhand', mat: 'wood', part: 'bow', shape: 'cap', a: [0, 0.9 * k, 0.2], b: [0, 5.8 * k, 1.1], ra: 0.6, rb: 0.55 },
        { bone: 'offhand', mat: 'wood', part: 'bow', shape: 'cap', a: [0, 5.8 * k, 1.1], b: [0, 10.4 * k, -0.2], ra: 0.55, rb: 0.4 },
      ]),
      { bone: 'offhand', mat: 'string', part: 'string', shape: 'line', a: [0, 10.3, -0.35], b: [0, -10.3, -0.35], when: (a, f) => !drawing(a, f) },
      { bone: 'offhand', mat: 'string', part: 'string', shape: 'line', a: [0, 10.3, -0.35], bB: 'handR', b: [0, -0.6, 0], when: drawing },
      { bone: 'offhand', mat: 'string', part: 'string', shape: 'line', a: [0, -10.3, -0.35], bB: 'handR', b: [0, -0.6, 0], when: drawing },
      { bone: 'handR', mat: 'arrow', part: 'arrow', shape: 'line', a: [0, -0.6, 0], bB: 'offhand', b: [0, 0.3, 4.5], when: drawing },
    ] },
    { id: 'quiver', mats: { leather: LEATHER, feather: ['#a8323a', '#c84050', '#e8e0d0', '#ffffff'] }, prims: [
      { bone: 'chest', mat: 'leather', part: 'quiver', shape: 'cap', a: [2.2, 8.2, -3.3], b: [-1.6, 1.2, -3.4], ra: 1.15, rb: 1.0 },
      { bone: 'chest', mat: 'feather', part: 'quiver', shape: 'ell', c: [2.5, 9.2, -3.3], r: [1.0, 1.1, 0.8] },
    ] },
  ],
  pose: notAttack(a => ({ offhand: { aim: a === 'cast' ? [0.25, 0.9, 0.35] : a === 'hit' ? [0.4, 0.85, -0.3] : a === 'dash' ? [0.3, 0.3, -0.9] : [0.5, 0.8, 0.3], roll: [0, 0, 1] } })),
  sockets: { tip: { bone: 'offhand', at: [0, 0.3, 4.5] } },
  // Hunter's Bow, Moonbow, Silverwing, Eclipse Longbow, Moon Eternal
  tiers: [{ wood: ['#3e2618', '#5e3d2a', '#8c5d3f', '#c08a5e'] }, {}, { wood: ['#6d779e', '#a9b4d4', '#e6ecfa', '#ffffff'] },
    { wood: ['#1e1632', '#3d2878', '#5d3fa8', '#9c7ae0'] }, { wood: ['#5a6a9a', '#9ab0e0', '#d8e8ff', '#ffffff'], string: ['#bfe8ff', '#bfe8ff', '#bfe8ff', '#bfe8ff'] }],
};

// ---- back ------------------------------------------------------------------------------------------------------------
const cape = {
  id: 'cape', slot: 'back',
  layers: [{ id: 'cape', mats: { cloth: ['#5a1428', '#8a2238', '#b8324a', '#e0607a'] }, prims: [
    // a tapered capsule squashed flat by the cape bone: narrow at the shoulders, wide at the hem, rounded so it shades
    { bone: 'cape', mat: 'cloth', part: 'cape', shape: 'cap', a: [0, -0.4, -0.8], b: [0, -11.2, -1.6], ra: 3.3, rb: 4.7, clip: [[0, 1, 0, 0], [0, -1, 0, 11.6]] },
  ] }],
  pose: () => ({ cape: { scl: [1, 1, 0.24] } }),
};

const pieces = { knighthelm, arcanecowl, wardenhood, warden, dreamweave, stalker, knightgreaves, clothsandals, stalkershoes, sword, staff, bow, cape };
const loadouts = {
  bare: [],
  knight: ['knighthelm', 'warden', 'knightgreaves', 'sword', 'cape'],
  arcanist: ['arcanecowl', 'dreamweave', 'clothsandals', 'staff'],
  ranger: ['wardenhood', 'stalker', 'stalkershoes', 'bow'],
};
module.exports = { pieces, loadouts };
