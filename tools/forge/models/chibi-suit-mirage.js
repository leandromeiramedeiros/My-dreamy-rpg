'use strict';
// CHIBI SUIT MIRAGE — shadow suit 3 (illusion): a circlet with a hanging face veil, a gauze bodice with floating panels, ribbon slippers.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Haze      drab grey-blue: a plain cap, a short face veil, a bodice, gauze panels, slippers
//   T2 Shimmer   dusk blue + pale gauze: a long veil with side drapes, layered hip panels, wide sleeves
//   T3 Glass     + silver circlet and chain, a hem band, ribbon streamers, slipper clasps
//   T4 Phantom   bright indigo, a brow gem and veil gem, a second panel row, long streamers
//   T5 Radiant   pale silk with flat light cores (brow, hem, heel)
//   T6 Mythic    Last Reflection: night-indigo, a ring of floating mirror shards, one prism glow run
// Families: miragehelm / mirage / mirageboots; ids <family>.t1 .. .t6.
const { mk, flat, gem, cloth, torso, arms, boots, dome, spike, piece, both } = require('./chibi-suit-lib.js');
const { LEATHER, GLOW } = require('./chibi-palette.js');

const CLO = ['#62687c', '#4e60a0', '#4e6cc4', '#5a60e0', '#e0e4ff', '#262660'];
const VEI = ['#80889a', '#98a4c8', '#a4b4e8', '#bcc4ff', '#eceeff', '#4a4a9c'];
const matsOf = t => ({ cloth: cloth(CLO[t - 1]), veil: cloth(VEI[t - 1]), leather: LEATHER, metal: mk('#a8b0d0'), gem: gem('#6af0e0'), core: flat('#f4f8ff'), glow: flat('#9affea') });

function miragehelm(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...dome('cloth', 'cap', { k: 1.05, ky: 1.02 }),
    { bone: 'head', mat: 'veil', part: 'veil', shape: 'ell', c: [0, 2.4, 4.5], r: [5.2, 2.2, 2.6] },
    { bone: 'head', mat: 'veil', part: 'brim', shape: 'ell', c: [0, 9.3, 3.2], r: [5.4, 0.9, 3.4] });
  if (t >= 2) P.push({ bone: 'head', mat: 'veil', part: 'veil', shape: 'cap', a: [0, 0.6, 4.8], b: [0, -3.4, 3.8], ra: 3.6, rb: 2.2 },
    ...both((s, k) => [{ bone: 'head', mat: 'veil', part: 'drape' + s, shape: 'cap', a: [6.2 * k, 5.0, 0.6], b: [6.8 * k, -1.8, 0.4], ra: 1.2, rb: 1.5 }]));
  if (t >= 3) P.push({ bone: 'head', mat: 'metal', part: 'circlet', shape: 'ell', c: [0, 9.4, 6.0], r: [3.4, 0.7, 0.7] },
    ...both((s, k) => [{ bone: 'head', mat: 'metal', part: 'drape' + s, shape: 'ell', c: [7.0 * k, 3.6, 2.2], r: [0.9, 1.6, 1.6] }]),
    spike('head', 'cloth', 'ribbon', [0, 4.0, -5.4], [0, -2.4, -8.6], 1.6, 0.5));
  if (t >= 4) P.push({ bone: 'head', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 10.0, 6.7], r: [1.1, 1.2, 0.7] },
    { bone: 'head', mat: 'gem', part: 'gem', shape: 'ell', c: [0, -0.4, 6.0], r: [0.9, 1.1, 0.7] });
  if (t === 5) P.push({ bone: 'head', mat: 'core', part: 'gem', shape: 'ell', c: [0, 10.0, 6.9], r: [1.4, 1.4, 0.6] },
    ...both((s, k) => [{ bone: 'head', mat: 'core', part: 'drape' + s, shape: 'ell', c: [7.1 * k, 3.6, 2.2], r: [0.7, 1.4, 1.4] }]));
  if (M) {                                                        // Mythic: a ring of floating mirror shards behind the head
    P.push(...[-2, -1, 0, 1, 2].map(x => spike('head', 'gem', 'shard', [x * 2.4, 12.0, -1.6], [x * 3.8, 16.6 - Math.abs(x) * 1.2, -2.4], 1.4, 0.2)));
    stamps.push({ bone: 'head', at: [0, 10.0, 7.3], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('miragehelm', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function mirage(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('cloth', 'bodice', { k: 1.0, kz: 1.0 }),
    ...arms({ up: 'cloth', fore: t >= 2 ? 'veil' : 'cloth', hand: 'leather' }, { k: t >= 2 ? 1.22 : 1.08 }),
    { bone: 'chest', mat: 'veil', part: 'collar', shape: 'ell', c: [0, 4.2, 0.2], r: [4.5, 1.5, 3.6] },
    { bone: 'spine', mat: 'leather', part: 'belt', shape: 'disc', c: [0, 3.0, 0], r: [5.1, 0.55, 4.1], weight: 2 },
    // the gauze panels: front and back hang from the hips
    { bone: 'hips', mat: 'veil', part: 'panel', shape: 'box', c: [0, -2.8, 3.9], h: [2.6, 3.0, 0.4], round: 0.35 },
    { bone: 'hips', mat: 'veil', part: 'panel', shape: 'box', c: [0, -2.8, -3.9], h: [3.4, 3.0, 0.4], round: 0.35 });
  if (t >= 2) P.push(...both((s, k) => [{ bone: 'hips', mat: 'cloth', part: 'skirt' + s, shape: 'box', c: [4.6 * k, -2.6, 0.4], h: [0.4, 3.2, 3.0], round: 0.35 },
    { bone: 'hips', mat: 'cloth', part: 'skirt' + s, shape: 'cap', a: [3.0 * k, -0.6, 2.4], b: [3.4 * k, -4.8, 3.0], ra: 1.4, rb: 1.6 }]));
  if (t >= 3) P.push({ bone: 'hips', mat: 'metal', part: 'hem', shape: 'disc', c: [0, -0.9, 0], r: [4.95, 0.4, 4.5] },
    { bone: 'spine', mat: 'metal', part: 'belt', shape: 'box', c: [0, 3.0, 4.05], h: [0.9, 0.7, 0.3], round: 0.2 },
    ...both((s, k) => [spike('chest', 'cloth', 'ribbon' + s, [2.6 * k, 2.0, -3.4], [4.6 * k, -3.0, -5.6], 1.5, 0.4)]));
  if (t >= 4) P.push({ bone: 'chest', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 3.6, 3.6], r: [0.8, 1.0, 0.5] },
    { bone: 'hips', mat: 'veil', part: 'panel', shape: 'box', c: [0, -4.6, 4.0], h: [3.0, 1.4, 0.4], round: 0.35 },
    ...both((s, k) => [spike('upper' + s, 'veil', 'wing' + s, [2.0 * k, 1.0, -0.8], [4.6 * k, -1.8, -1.6], 1.4, 0.4)]));
  if (t === 5) P.push({ bone: 'chest', mat: 'core', part: 'gem', shape: 'ell', c: [0, 1.4, 3.9], r: [1.0, 1.5, 0.5] },
    { bone: 'hips', mat: 'core', part: 'hem', shape: 'disc', c: [0, -0.9, 0], r: [5.0, 0.5, 4.55] });
  if (M) {
    P.push(...both((s, k) => [spike('chest', 'gem', 'shard', [3.6 * k, 4.4, -3.4], [7.8 * k, 8.8, -4.6], 1.4, 0.2), spike('chest', 'gem', 'shard', [3.4 * k, 1.2, -3.4], [8.2 * k, 3.0, -4.6], 1.2, 0.2)]),
      { bone: 'chest', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 1.6, 3.9], r: [1.3, 1.5, 0.6] });
    stamps.push({ bone: 'chest', at: [0, 1.6, 4.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('mirage', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function mirageboots(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('cloth', 'boot', { k: 1.0, len: 1.05, top: 0.2 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: 'veil', part: 'cuff' + s, shape: 'ell', c: [0, -0.1, 0], r: t >= 2 ? [2.5, 1.0, 2.5] : [2.2, 0.7, 2.2] }];
    if (t >= 2) L.push({ bone: 'shin' + s, mat: 'veil', part: 'band' + s, shape: 'disc', c: [0, -1.5, 0.1], r: [2.0, 0.4, 1.95] });
    if (t >= 3) L.push({ bone: 'foot' + s, mat: 'metal', part: 'toe' + s, shape: 'ell', c: [0, -1.4, 3.4], r: [1.2, 0.7, 0.7] },
      { bone: 'shin' + s, mat: 'metal', part: 'clasp' + s, shape: 'ell', c: [0, -1.5, 1.8], r: [0.7, 0.5, 0.4] });
    if (t >= 4) L.push({ bone: 'shin' + s, mat: 'gem', part: 'gem' + s, shape: 'ell', c: [0, -0.6, 2.3], r: [0.6, 0.6, 0.5] },
      spike('shin' + s, 'veil', 'ribbon' + s, [1.9 * k, 0.4, -0.2], [3.4 * k, 3.0, -1.2], 1.2, 0.4));
    if (t === 5) L.push({ bone: 'foot' + s, mat: 'core', part: 'heel' + s, shape: 'ell', c: [0, -0.9, -2.6], r: [1.0, 0.8, 0.7] });
    if (M) L.push(spike('foot' + s, 'gem', 'ribbon' + s, [0, -0.6, -2.4], [0, 1.6, -5.2], 1.0, 0.2));
    return L;
  });
  if (M) stamps.push({ bone: 'footR', at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] });
  return piece('mirageboots', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [miragehelm, mirage, mirageboots]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
