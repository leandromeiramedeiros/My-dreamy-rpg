'use strict';
// CHIBI SUIT THORNWARDEN — medium suit (nature): a leaf hood with branch antlers, a bark-plated jerkin, leaf-wrapped boots.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Sprig     drab green: a leaf hood, a jerkin, a vine strap, wrapped boots
//   T2 Barkbound deeper green + bark: a bark brim, shoulder leaf mantles, belt pouch, a hood tuft
//   T3 Thorned   + thorn spikes on the shoulders, brow antlers, bark toe caps
//   T4 Bloom     bright leaf, a bloom gem on the brow and chest, tall antlers, longer thorns
//   T5 Radiant   dawn-silk with flat leaf-light cores (bloom, shoulder, heel)
//   T6 Mythic    Heart of the Grove: night-green, a crown of branches with floating leaves, one nature glow run
// Families: wardenhood / thornwarden / thornwardenboots; ids <family>.t1 .. .t6.
const { mk, flat, gem, cloth, torso, arms, boots, dome, spike, piece, both } = require('./chibi-suit-lib.js');
const { LEATHER } = require('./chibi-palette.js');

const LEAF = ['#68784a', '#5a8a3c', '#4a9a3a', '#3aaa44', '#e4f8cc', '#1c4a2a'];
const BARK = ['#6a5a42', '#7a5a3a', '#8a5e34', '#7a4a28', '#c8b890', '#3a2a1c'];
const GLOWG = '#7aff5a';
const matsOf = t => ({ leaf: cloth(LEAF[t - 1]), bark: cloth(BARK[t - 1]), leather: LEATHER, thorn: mk('#d8c8a0'), bloom: gem('#f0587a'), core: flat('#f4ffd8'), glow: flat(GLOWG), dark: cloth('#2c3a28') });

function wardenhood(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...dome('leaf', 'hood', { k: 1.07, ky: 1.04 }),
    { bone: 'head', mat: t >= 2 ? 'bark' : 'leather', part: 'brim', shape: 'ell', c: [0, 9.4, 3.4], r: [5.5, 1.0, 3.4] },
    ...both((s, k) => [{ bone: 'head', mat: 'leaf', part: 'flap', shape: 'ell', c: [6.3 * k, 3.4, 0.6], r: [1.2, 3.0, 3.1] }]));
  if (t >= 2) P.push({ bone: 'head', mat: 'leaf', part: 'tuft', shape: 'cap', a: [0, 4.5, -5.4], b: [0, 0.8, -7.8], ra: 3.0, rb: 1.0 });
  if (t >= 3) P.push(...both((s, k) => [spike('head', 'bark', 'antler', [3.2 * k, 11.0, 0.6], [5.6 * k, 15.0 + (t >= 4 ? 2 : 0), -0.4], 1.3, 0.5),
    spike('head', 'thorn', 'thorn', [4.6 * k, 13.4, 0.1], [7.6 * k, 15.4 + (t >= 4 ? 2 : 0), -0.4], 1.1, 0.4)]),
    { bone: 'head', mat: 'thorn', part: 'trim', shape: 'ell', c: [0, 9.4, 6.4], r: [2.8, 0.6, 0.6] });
  if (t >= 4) P.push({ bone: 'head', mat: 'bloom', part: 'gem', shape: 'ell', c: [0, 10.0, 6.6], r: [1.1, 1.1, 0.7] });
  if (t === 5) P.push({ bone: 'head', mat: 'core', part: 'gem', shape: 'ell', c: [0, 10.0, 6.9], r: [1.4, 1.4, 0.6] },
    ...both((s, k) => [{ bone: 'head', mat: 'core', part: 'antler', shape: 'ell', c: [5.6 * k, 17.4, -0.4], r: [0.9, 1.2, 0.9] }]));
  if (M) {                                                        // Mythic: a crown of three branches and floating leaves
    P.push(...[-1, 0, 1].map(x => spike('head', 'bark', 'branch', [x * 2.8, 11.6, -1.2], [x * 4.4, 17.0 - Math.abs(x) * 1.4, -2.0], 1.3, 0.4)),
      ...[[-5.4, 15.4], [5.4, 15.4], [0, 19.4]].map(([x, y]) => ({ bone: 'head', mat: 'leaf', part: 'leaf', shape: 'ell', c: [x, y, -2.4], r: [1.2, 1.7, 0.7] })));
    stamps.push({ bone: 'head', at: [0, 10.0, 7.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('wardenhood', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function thornwarden(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('leaf', 'jerkin', { k: 1.0, kz: 1.0 }),
    ...arms({ up: 'leaf', fore: 'bark', hand: t >= 2 ? 'leather' : 'dark' }, { k: 1.08 }),
    { bone: 'chest', mat: 'bark', part: 'collar', shape: 'ell', c: [0, 4.2, 0.2], r: [4.5, 1.5, 3.6] },
    { bone: 'spine', mat: 'leather', part: 'belt', shape: 'disc', c: [0, 3.0, 0], r: [5.1, 0.6, 4.1], weight: 2 },
    { bone: 'chest', mat: 'bark', part: 'belt', shape: 'cap', a: [-4.2, 4.0, 2.6], b: [4.2, -2.4, 3.4], ra: 0.75, rb: 0.75 },
    { bone: 'spine', mat: 'bark', part: 'collar', shape: 'box', c: [0, -2.0, 3.8], h: [1.5, 2.6, 0.3], round: 0.25 });
  if (t >= 2) P.push(...both((s, k) => [{ bone: 'upper' + s, mat: 'leaf', part: 'mantle' + s, shape: 'ell', c: [0.4 * k, 0.7, 0], r: [3.1, 2.6, 3.0], clip: [0, -1, 0, 0.9] }]),
    { bone: 'spine', mat: 'bark', part: 'pouch', shape: 'box', c: [-3.6, 2.4, 3.9], h: [1.0, 0.9, 0.5], round: 0.3 });
  if (t >= 3) P.push(...both((s, k) => [{ bone: 'upper' + s, mat: 'bark', part: 'mantle' + s, shape: 'ell', c: [0.6 * k, 1.0, 0], r: [3.4, 2.0, 3.3], clip: [0, -1, 0, 0.3] },
    spike('upper' + s, 'thorn', 'thorn' + s, [1.6 * k, 2.2, -0.2], [3.0 * k, 5.2, -0.6], 1.1, 0.4)]),
    { bone: 'spine', mat: 'thorn', part: 'belt', shape: 'box', c: [0, 3.0, 4.0], h: [0.9, 0.7, 0.3], round: 0.2 });
  if (t >= 4) P.push({ bone: 'chest', mat: 'bloom', part: 'gem', shape: 'ell', c: [0, 3.6, 3.6], r: [0.9, 1.0, 0.5] },
    ...both((s, k) => [spike('upper' + s, 'thorn', 'thorn' + s, [3.2 * k, 1.8, 0.2], [5.4 * k, 4.6, -0.2], 1.2, 0.4)]));
  if (t === 5) P.push({ bone: 'chest', mat: 'core', part: 'gem', shape: 'ell', c: [0, 1.4, 3.9], r: [1.0, 1.5, 0.5] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'core', part: 'thorn' + s, shape: 'ell', c: [3.4 * k, 1.0, 2.2], r: [0.8, 0.8, 0.5] }]));
  if (M) {
    P.push(...both((s, k) => [spike('chest', 'bark', 'branch', [3.6 * k, 4.2, -3.2], [7.8 * k, 8.8, -4.4], 1.4, 0.4), spike('chest', 'bark', 'branch', [3.4 * k, 1.2, -3.2], [8.2 * k, 3.2, -4.4], 1.2, 0.4),
      { bone: 'chest', mat: 'leaf', part: 'leaf', shape: 'ell', c: [8.4 * k, 9.4, -4.4], r: [1.2, 1.6, 0.7] }]),
      { bone: 'chest', mat: 'bloom', part: 'gem', shape: 'ell', c: [0, 1.6, 3.9], r: [1.3, 1.5, 0.6] });
    stamps.push({ bone: 'chest', at: [0, 1.6, 4.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('thornwarden', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function thornwardenboots(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('leaf', 'boot', { k: 1.04, len: 1.0, top: 0.2 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: t >= 2 ? 'bark' : 'leather', part: 'cuff' + s, shape: 'ell', c: [0, -0.1, 0], r: t >= 2 ? [2.5, 1.1, 2.5] : [2.2, 0.7, 2.2] }];
    if (t >= 2) L.push({ bone: 'shin' + s, mat: 'leather', part: 'band' + s, shape: 'disc', c: [0, -1.5, 0.1], r: [2.0, 0.4, 1.95] });
    if (t >= 3) L.push({ bone: 'foot' + s, mat: 'bark', part: 'toe' + s, shape: 'ell', c: [0, -1.4, 3.3], r: [1.3, 0.8, 0.8] },
      { bone: 'shin' + s, mat: 'thorn', part: 'clasp' + s, shape: 'ell', c: [0, -1.5, 1.8], r: [0.7, 0.5, 0.4] });
    if (t >= 4) L.push(spike('shin' + s, 'thorn', 'thorn' + s, [1.9 * k, 0.4, -0.2], [3.2 * k, 3.0, -0.8], 1.1, 0.4),
      { bone: 'foot' + s, mat: 'bloom', part: 'bloom' + s, shape: 'ell', c: [0, -0.4, 3.4], r: [0.7, 0.6, 0.5] });
    if (t === 5) L.push({ bone: 'foot' + s, mat: 'core', part: 'heel' + s, shape: 'ell', c: [0, -0.9, -2.6], r: [1.0, 0.8, 0.7] });
    if (M) L.push(spike('foot' + s, 'bark', 'root' + s, [0, -0.6, -2.4], [0, 1.6, -5.2], 1.0, 0.4));
    return L;
  });
  if (M) stamps.push({ bone: 'footR', at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] });
  return piece('thornwardenboots', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [wardenhood, thornwarden, thornwardenboots]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
