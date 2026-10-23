'use strict';
// CHIBI SUIT JUGGERNAUT — heavy (Warrior origin): massive round pauldrons, a boxy plate trunk, a horned half helm, thick sabatons.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Scrap     dull iron: riveted cuirass, round pauldrons, rag cloth, bucket-and-horn-stub helm, plain boots
//   T2 Steel     + steel, studded pauldron rims, vambraces, tassets, cloth sash; horns grow, cheek plates
//   T3 Brass     + brass bands, a brass buckle and boss, a second pauldron lame, horn rings, a brow band
//   T4 Furnace   silver, big pauldron spikes, an amber furnace gem in a brass grille, gem-browed helm, sabaton spikes
//   T5 Radiant   pearl plate, flat ember-light cores (heart, pauldron eyes, horn tips), flame crests
//   T6 Mythic    Forge Deep Cuirass: night-forged steel, molten ember seams, a crown of flame horns, one fire glow run
// Families: juggernauthelm / juggernaut / juggernautboots; ids <family>.t1 .. .t6.
const { SUITS, mk, flat, cloth, torso, arms, boots, dome, spike, piece, both } = require('./chibi-suit-lib.js');
const { GOLD, LEATHER, GLOW, FIREG } = require('./chibi-palette.js');

const IRON = ['#56525e', '#6a6c82', '#7c7c9a', '#9296b6', '#c6c2de', '#3c3856'];
const RAG = ['#6a4a30', '#8a3a24', '#a8302a', '#c0402a', '#e0602c', '#8a2018'];
const matsOf = t => ({ metal: mk(IRON[t - 1], t >= 5 ? '#ffffff' : null), dark: mk('#3a3846'), brass: GOLD, cloth: cloth(RAG[t - 1]), leather: LEATHER, gem: FIREG,
  core: flat('#ffe6b0'), glow: flat(GLOW.fire), horn: t <= 3 ? cloth('#d8c8a8') : mk(IRON[t - 1]) });

function juggernauthelm(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...dome('metal', 'helm', { k: 1.02 }),
    { bone: 'head', mat: t >= 3 ? 'brass' : 'metal', part: 'band', shape: 'disc', c: [0, 7.8, 0], r: [7.1, 0.6, 6.55] },
    { bone: 'head', mat: 'metal', part: 'nasal', shape: 'cap', a: [0, 8.0, 6.15], b: [0, 4.6, 6.2], ra: 0.55, rb: 0.5 });
  if (t >= 2) P.push(...both((s, k) => [{ bone: 'head', mat: 'metal', part: 'cheek', shape: 'ell', c: [5.0 * k, 3.4, 2.9], r: [1.7, 2.8, 1.9], rot: [0, 0, -0.12 * k] }]));
  // the horns: root at the temple, out and up; they grow every tier
  const H = [3.0, 4.2, 5.0, 5.8, 6.4, 6.8][t - 1], W = [2.2, 2.8, 3.2, 3.6, 3.8, 3.8][t - 1];
  both((s, k) => {
    P.push({ bone: 'head', mat: 'horn', part: 'horn' + s, shape: 'cap', a: [5.8 * k, 8.2, -0.2], b: [(5.8 + 2.2 + W * 0.4) * k, 8.8, 0.2], ra: 1.8, rb: 1.5 },
      { bone: 'head', mat: 'horn', part: 'horn' + s, shape: 'cap', a: [(8.0 + W * 0.4) * k, 8.8, 0.2], b: [(9.0 + W * 0.5) * k, 8.8 + H * 0.55, 0.4], ra: 1.5, rb: 1.1 },
      { bone: 'head', mat: 'horn', part: 'horn' + s, shape: 'cap', a: [(9.0 + W * 0.5) * k, 8.8 + H * 0.55, 0.4], b: [(8.7 + W * 0.3) * k, 8.8 + H, 0.7], ra: 1.1, rb: 0.15 });
    if (t >= 3) P.push({ bone: 'head', mat: 'brass', part: 'horn' + s, shape: 'disc', c: [(9.0 + W * 0.5) * k, 8.8 + H * 0.28, 0.35], r: [1.3, 0.4, 1.3], rot: [0, 0, -0.35 * k] });
    return [];
  });
  if (t >= 3) P.push({ bone: 'head', mat: 'brass', part: 'crest', shape: 'ell', c: [0, 12.2, -0.6], r: [0.55, 1.1, 4.6] });
  if (t >= 4) P.push({ bone: 'head', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 8.7, 6.1], r: [1.0, 1.0, 0.55] }, { bone: 'head', mat: 'brass', part: 'trim', shape: 'ell', c: [0, 8.7, 5.9], r: [1.45, 1.4, 0.45] },
    { bone: 'head', mat: 'metal', part: 'mail', shape: 'ell', c: [0, 2.2, -2.6], r: [5.6, 2.8, 4.0], clip: [0, 0.6, 0.8, -1.5] });
  if (t === 5) P.push(...both((s, k) => [{ bone: 'head', mat: 'core', part: 'tip' + s, shape: 'ell', c: [(8.7 + W * 0.3) * k, 8.8 + H + 0.4, 0.7], r: [0.7, 1.3, 0.7] }]),
    ...[-1, 0, 1].map(x => spike('head', 'core', 'flame', [x * 1.8, 12.2, -0.4], [x * 2.4, 12.2 + 3.4 - Math.abs(x), -0.4], 0.85)));
  if (M) {                                                      // Mythic: a crown of three molten flame horns, ember seams on the horns
    P.push(...[-1, 0, 1].map(x => spike('head', 'gem', 'flame', [x * 2.0, 12.0, -0.5], [x * 2.8, 12.0 + 4.6 - Math.abs(x) * 1.2, -0.5], 1.0)),
      ...both((s, k) => [{ bone: 'head', mat: 'gem', part: 'horn' + s, shape: 'cap', a: [(8.9 + W * 0.45) * k, 8.8 + H * 0.4, 0.4], b: [(8.8 + W * 0.35) * k, 8.8 + H * 0.8, 0.6], ra: 0.5, rb: 0.2 }]));
    stamps.push({ bone: 'head', at: [0, 7.9, 6.4], n: [0, 0, 1], facing: 0.3, on: 'metal', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  }
  return piece('juggernauthelm', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function juggernaut(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('metal', 'plate', { k: 1.1, kz: 1.05 }),
    { bone: 'chest', mat: 'metal', part: 'gorget', shape: 'ell', c: [0, 4.3, 0.1], r: [4.2, 1.4, 3.3] },
    { bone: 'spine', mat: t >= 4 ? 'dark' : 'leather', part: 'belt', shape: 'disc', c: [0, 3.1, 0], r: [5.1, 0.65, 4.1], weight: 2 },
    { bone: 'spine', mat: t >= 3 ? 'brass' : 'dark', part: 'belt', shape: 'box', c: [0, 3.1, 4.0], h: [1.0, 0.8, 0.3], round: 0.2 },
    ...arms({ up: t <= 4 ? 'cloth' : 'metal', fore: t === 1 ? 'leather' : t <= 4 ? 'cloth' : 'metal', hand: t === 1 ? 'leather' : 'dark' }, { k: 1.12 }),
    // the pauldrons: a big flat-lipped dome out beyond the arm
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'metal', part: 'pauldron' + s, shape: 'ell', c: [0.6 * k, 0.5, 0], r: [3.7 + (t >= 4 ? 0.2 : 0), 3.1, 3.5], clip: [0, -1, 0, 0.9] },
      { bone: 'upper' + s, mat: t >= 3 ? 'brass' : 'dark', part: 'pauldron' + s, shape: 'disc', c: [0.6 * k, -0.55, 0], r: [3.85, 0.4, 3.65] }]),
    // rivets down the plate and the pauldron crowns
    ...[-2.2, 2.2].map(x => ({ bone: 'chest', mat: 'dark', part: 'plate', shape: 'ell', c: [x, 2.7, 3.8], r: [0.42, 0.42, 0.3] })));
  P.push({ bone: 'spine', mat: 'cloth', part: 'tabard', shape: 'box', c: [0, -2.2, 3.8], h: [1.7, 2.6, 0.3], round: 0.25 });
  if (t >= 2) P.push(...both((s, k) => [
    { bone: 'thigh' + s, mat: 'metal', part: 'tasset' + s, shape: 'ell', c: [0.1 * k, -1.2, 0.5], r: [2.45, 2.3, 2.5], clip: [0, -1, 0, 2.2] },
    { bone: 'fore' + s, mat: 'metal', part: 'arm' + s, shape: 'cap', a: [0, -0.2, 0], b: [0, -1.9, 0], ra: 1.75, rb: 1.7 },
    { bone: 'upper' + s, mat: 'dark', part: 'pauldron' + s, shape: 'ell', c: [0.6 * k, 2.6, 0], r: [0.55, 0.55, 0.55] }]),
    );
  if (t >= 3) P.push(
    { bone: 'chest', mat: 'brass', part: 'trim', shape: 'disc', c: [0, -3.2, 0.3], r: [5.0, 0.5, 3.9] },
    { bone: 'chest', mat: 'brass', part: 'trim', shape: 'disc', c: [0, 3.5, 0.2], r: [4.3, 0.45, 3.45] },
    { bone: 'chest', mat: 'metal', part: 'plate', shape: 'ell', c: [0, 0.8, 3.65], r: [0.55, 3.8, 0.55] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'metal', part: 'lame' + s, shape: 'ell', c: [0.8 * k, 1.3, 0], r: [2.7, 1.5, 2.7], clip: [0, -1, 0, 1.0] },
      { bone: 'upper' + s, mat: 'brass', part: 'trim', shape: 'disc', c: [0.8 * k, 0.6, 0], r: [2.95, 0.38, 2.95] },
      { bone: 'thigh' + s, mat: 'brass', part: 'trim', shape: 'disc', c: [0.1 * k, -2.3, 0.4], r: [2.5, 0.38, 2.5] }]));
  if (t >= 4) P.push(
    { bone: 'chest', mat: 'brass', part: 'trim', shape: 'ell', c: [0, 1.4, 3.7], r: [1.9, 1.7, 0.5] },                    // the furnace grille
    { bone: 'chest', mat: t === 5 ? 'core' : 'gem', part: 'plate', shape: 'ell', c: [0, 1.4, 3.95], r: [1.25, 1.2, 0.6] },
    ...both((s, k) => [spike('upper' + s, 'brass', 'pauldron' + s, [0.8 * k, 3.0, 0], [2.0 * k, 5.8, -0.6], 0.9, 0.15),
      spike('upper' + s, 'brass', 'pauldron' + s, [3.0 * k, 2.4, 0.4], [5.0 * k, 3.8, 0.3], 0.8, 0.15),
      { bone: 'spine', mat: 'brass', part: 'trim', shape: 'box', c: [2.0 * k, -2.6, 4.0], h: [0.3, 2.5, 0.3], round: 0.15 }]));
  if (t >= 5) P.push(...both((s, k) => [{ bone: 'upper' + s, mat: M ? 'gem' : 'core', part: 'pauldron' + s, shape: 'ell', c: [3.4 * k, 0.9, 2.5], r: [0.75, 0.75, 0.5] },
    { bone: 'spine', mat: M ? 'gem' : 'core', part: 'plate', shape: 'ell', c: [2.6 * k, 1.0, 4.0], r: [0.3, 0.9, 0.4] }]),
    { bone: 'spine', mat: M ? 'gem' : 'core', part: 'belt', shape: 'ell', c: [0, 3.1, 4.3], r: [0.5, 0.4, 0.3] });
  if (M) {
    P.push(...both((s, k) => [spike('upper' + s, 'gem', 'pauldron' + s, [1.6 * k, 3.3, -0.4], [3.6 * k, 6.4, -1.0], 0.9, 0.12),
      { bone: 'upper' + s, mat: 'gem', part: 'pauldron' + s, shape: 'ell', c: [3.4 * k, 0.9, 2.5], r: [0.9, 0.9, 0.6] }]),
      ...[[0, 1.0, 3.6], [-1, 0.6, 2.9], [1, 0.6, 2.9]].map(([dx, dy, L]) => { const n = Math.hypot(dx, dy); return spike('chest', 'gem', 'plate', [dx / n * 1.1, 1.4 + dy / n * 1.1, 4.0], [dx / n * L, 1.4 + dy / n * L, 4.6], 0.7, 0.12); }));
    stamps.push({ bone: 'chest', at: [0, 1.4, 4.6], n: [0, 0, 1], facing: 0.3, on: 'gem', px: [[0, 0, 'glow'], [1, 0, 'glow']] });
  }
  return piece('juggernaut', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function juggernautboots(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('metal', 'boot', { k: 1.12, len: 1.08 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: 'dark', part: 'cuff' + s, shape: 'ell', c: [0, -0.4, 0], r: [2.15, 0.6, 2.15] },
      { bone: 'shin' + s, mat: 'metal', part: 'knee' + s, shape: 'ell', c: [0, 0.3, 0.7], r: [1.6, 1.4, 1.4] }];
    if (t === 1) L[0].mat = 'leather', L[1].mat = 'leather';
    if (t >= 2) L.push({ bone: 'foot' + s, mat: 'dark', part: 'toe' + s, shape: 'ell', c: [0, -1.6, 3.3], r: [1.3, 0.9, 0.7] });
    if (t >= 3) L.push({ bone: 'shin' + s, mat: 'brass', part: 'knee' + s, shape: 'disc', c: [0, 0.0, 0.7], r: [1.7, 0.36, 1.5] },
      { bone: 'shin' + s, mat: 'brass', part: 'cuff' + s, shape: 'disc', c: [0, -2.0, 0.1], r: [2.1, 0.38, 2.05] });
    if (t >= 4) L.push(spike('shin' + s, 'brass', 'knee' + s, [0, 0.5, 1.4], [0, 2.9, 3.2], 0.85, 0.12),
      { bone: 'foot' + s, mat: 'gem', part: 'boot' + s, shape: 'ell', c: [0, -0.4, 2.8], r: [0.6, 0.6, 0.5] });
    if (t >= 5) L.push({ bone: 'foot' + s, mat: M ? 'gem' : 'core', part: 'boot' + s, shape: 'ell', c: [1.9 * k, -0.9, 1.0], r: [0.3, 0.5, 0.8] },
      spike('foot' + s, 'brass', 'fin' + s, [1.9 * k, -0.2, -1.0], [3.3 * k, 1.4, -2.6], 0.7, 0.12));
    if (M) L.push(spike('foot' + s, 'gem', 'fin' + s, [0, -0.6, -2.4], [0, 1.6, -5.2], 0.9, 0.12));
    return L;
  });
  if (M) stamps.push(...both((s) => [{ bone: 'foot' + s, at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] }]));
  return piece('juggernautboots', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [juggernauthelm, juggernaut, juggernautboots]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
