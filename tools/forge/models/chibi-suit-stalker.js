'use strict';
// CHIBI SUIT STALKER — medium suit (hunt): a wolf-pelt hood with ears, a leather vest with a fur mantle and quiver strap, fur-cuffed boots.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Tracker   drab green-grey: a plain hood, a vest, a strap, wrapped boots
//   T2 Hunter    forest green + pelt: wolf ears, a fur mantle, a quiver strap with arrows, fur cuffs
//   T3 Packlord  + bone fangs on the brow, buckles, a bigger mantle, boot clasps
//   T4 Alpha     bright pelt, amber eyes on the brow and chest, tall ears, longer fangs
//   T5 Radiant   moon-pelt with flat light cores (eyes, fangs, mantle, heel)
//   T6 Mythic    Moonhowl: night-green and silver fur, spectral flame ears, a fanged crest, one amber glow run
// Families: stalkerhelm / stalker / stalkershoes; ids <family>.t1 .. .t6.
const { mk, flat, gem, cloth, torso, arms, boots, dome, spike, piece, both } = require('./chibi-suit-lib.js');
const { LEATHER } = require('./chibi-palette.js');

const GRN = ['#586648', '#3a6a48', '#2f7a50', '#2a8a58', '#d8f0dc', '#16382a'];
const PLT = ['#706c64', '#7e786a', '#8e8672', '#a0987e', '#e8e4dc', '#4a4a56'];
const matsOf = t => ({ green: cloth(GRN[t - 1]), pelt: cloth(PLT[t - 1]), leather: LEATHER, bone: mk('#e0d4b0'), eye: gem('#ffb830'), core: flat('#fff6d8'), glow: flat('#ffc24a'), dark: cloth('#2a2a30') });

function stalkerhelm(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...dome('green', 'hood', { k: 1.07, ky: 1.04 }),
    { bone: 'head', mat: t >= 2 ? 'pelt' : 'leather', part: 'brim', shape: 'ell', c: [0, 9.4, 3.4], r: [5.5, 1.0, 3.4] },
    ...both((s, k) => [{ bone: 'head', mat: 'green', part: 'flap' + s, shape: 'ell', c: [6.3 * k, 3.4, 0.6], r: [1.2, 3.0, 3.1] }]));
  if (t >= 2) P.push(...both((s, k) => [spike('head', 'pelt', 'ear' + s, [4.0 * k, 11.0, 0.2], [5.6 * k, 15.0 + (t >= 4 ? 2 : 0), -0.8], 2.2, 0.4)]),
    { bone: 'head', mat: 'pelt', part: 'ruff', shape: 'cap', a: [0, 4.5, -5.4], b: [0, 1.0, -7.6], ra: 3.0, rb: 1.0 });
  if (t >= 3) P.push(...both((s, k) => [spike('head', 'bone', 'fang' + s, [2.2 * k, 9.4, 6.0], [2.6 * k, 7.0 - (t >= 4 ? 0.8 : 0), 6.8], 0.9, 0.3)]),
    { bone: 'head', mat: 'leather', part: 'band', shape: 'ell', c: [0, 9.4, 6.0], r: [3.4, 0.7, 0.7] });
  if (t >= 4) P.push({ bone: 'head', mat: 'eye', part: 'gem', shape: 'ell', c: [0, 10.0, 6.8], r: [1.1, 1.0, 0.6] });
  if (t === 5) P.push({ bone: 'head', mat: 'core', part: 'gem', shape: 'ell', c: [0, 10.0, 7.0], r: [1.4, 1.3, 0.6] },
    ...both((s, k) => [{ bone: 'head', mat: 'core', part: 'ear' + s, shape: 'ell', c: [5.6 * k, 17.2, -0.8], r: [0.9, 1.2, 0.9] }]));
  if (M) {                                                        // Mythic: spectral flame ears and a fanged crest
    P.push(...both((s, k) => [spike('head', 'eye', 'flame' + s, [5.0 * k, 12.4, -1.4], [7.0 * k, 18.6, -2.6], 1.6, 0.2)]),
      spike('head', 'eye', 'crest', [0, 11.6, -0.4], [0, 17.0, -1.4], 1.4, 0.2));
    stamps.push({ bone: 'head', at: [0, 10.0, 7.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('stalkerhelm', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function stalker(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('green', 'vest', { k: 1.0, kz: 1.0 }),
    ...arms({ up: 'green', fore: 'leather', hand: t >= 2 ? 'leather' : 'leather' }, { k: 1.08 }),
    { bone: 'chest', mat: 'leather', part: 'collar', shape: 'ell', c: [0, 4.2, 0.2], r: [4.5, 1.5, 3.6] },
    { bone: 'spine', mat: 'leather', part: 'belt', shape: 'disc', c: [0, 3.0, 0], r: [5.1, 0.6, 4.1], weight: 2 },
    { bone: 'chest', mat: 'leather', part: 'strap', shape: 'cap', a: [-4.2, 4.0, 2.6], b: [4.2, -2.4, 3.4], ra: 0.75, rb: 0.75 },
    { bone: 'spine', mat: 'leather', part: 'sash', shape: 'box', c: [0, -2.0, 3.8], h: [1.5, 2.6, 0.3], round: 0.25 });
  if (t >= 2) P.push(...both((s, k) => [{ bone: 'upper' + s, mat: 'pelt', part: 'mantle' + s, shape: 'ell', c: [0.5 * k, 0.8, 0], r: [3.3, 2.8, 3.1], clip: [0, -1, 0, 1.0] }]),
    spike('chest', 'bone', 'arrow', [-3.0, 3.8, -3.2], [-4.4, 9.0, -3.8], 0.9, 0.3), spike('chest', 'bone', 'arrow', [-2.2, 3.8, -3.2], [-2.6, 9.4, -3.8], 0.9, 0.3));
  if (t >= 3) P.push(...both((s, k) => [{ bone: 'upper' + s, mat: 'pelt', part: 'mantle' + s, shape: 'ell', c: [0.8 * k, 0.1, 0.2], r: [3.5, 2.2, 3.3], clip: [0, -1, 0, -0.2] }]),
    { bone: 'spine', mat: 'bone', part: 'buckle', shape: 'box', c: [0, 3.0, 4.0], h: [0.9, 0.7, 0.3], round: 0.2 },
    ...both((s, k) => [spike('upper' + s, 'bone', 'fang' + s, [1.8 * k, 1.8, 0.2], [3.2 * k, 4.8, 0.0], 1.1, 0.3)]));
  if (t >= 4) P.push({ bone: 'chest', mat: 'eye', part: 'gem', shape: 'ell', c: [0, 3.6, 3.6], r: [0.8, 1.0, 0.5] },
    ...both((s, k) => [spike('upper' + s, 'bone', 'fang' + s, [3.2 * k, 1.8, 0.4], [5.4 * k, 4.6, 0.2], 1.2, 0.3)]));
  if (t === 5) P.push({ bone: 'chest', mat: 'core', part: 'gem', shape: 'ell', c: [0, 1.4, 3.9], r: [1.0, 1.5, 0.5] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'core', part: 'fang' + s, shape: 'ell', c: [3.4 * k, 1.0, 2.4], r: [1.0, 1.0, 0.8] }]));
  if (M) {
    P.push(...both((s, k) => [spike('chest', 'eye', 'flame' + s, [3.6 * k, 4.2, -3.4], [7.8 * k, 8.8, -4.6], 1.4, 0.2), spike('chest', 'eye', 'flame' + s, [3.4 * k, 1.2, -3.4], [8.2 * k, 3.2, -4.6], 1.2, 0.2)]),
      { bone: 'chest', mat: 'eye', part: 'gem', shape: 'ell', c: [0, 1.6, 3.9], r: [1.3, 1.5, 0.6] });
    stamps.push({ bone: 'chest', at: [0, 1.6, 4.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('stalker', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function stalkershoes(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('leather', 'boot', { k: 1.04, len: 1.0, top: 0.2 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: t >= 2 ? 'pelt' : 'dark', part: 'cuff' + s, shape: 'ell', c: [0, -0.1, 0], r: t >= 2 ? [2.6, 1.2, 2.6] : [2.2, 0.7, 2.2] }];
    if (t >= 2) L.push({ bone: 'shin' + s, mat: 'green', part: 'band' + s, shape: 'disc', c: [0, -1.5, 0.1], r: [2.0, 0.4, 1.95] });
    if (t >= 3) L.push({ bone: 'foot' + s, mat: 'bone', part: 'toe' + s, shape: 'ell', c: [0, -1.4, 3.4], r: [1.2, 0.7, 0.7] },
      { bone: 'shin' + s, mat: 'bone', part: 'clasp' + s, shape: 'ell', c: [0, -1.5, 1.8], r: [0.7, 0.5, 0.4] });
    if (t >= 4) L.push({ bone: 'shin' + s, mat: 'eye', part: 'gem' + s, shape: 'ell', c: [0, -0.2, 2.5], r: [0.6, 0.6, 0.5] },
      spike('shin' + s, 'bone', 'fang' + s, [1.9 * k, 0.4, -0.2], [3.2 * k, 3.0, -0.8], 1.1, 0.3));
    if (t === 5) L.push({ bone: 'foot' + s, mat: 'core', part: 'heel' + s, shape: 'ell', c: [0, -0.9, -2.6], r: [1.0, 0.8, 0.7] });
    if (M) L.push(spike('foot' + s, 'eye', 'flame' + s, [0, -0.6, -2.4], [0, 1.6, -5.2], 1.0, 0.2));
    return L;
  });
  if (M) stamps.push({ bone: 'footR', at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] });
  return piece('stalkershoes', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [stalkerhelm, stalker, stalkershoes]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
