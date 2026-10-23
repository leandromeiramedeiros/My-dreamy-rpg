'use strict';
// CHIBI SUIT NIGHTSHADE — shadow suit 2 (poison): a flower-brim cowl with a half mask, a vial bandolier, a short mantle, dark boots.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Sprout    drab grey-green: a cowl, a half mask, a strap, plain boots
//   T2 Briar     dusk violet: a petal-less brim, a cowl tail, a bandolier with two vials, shoulder mantle
//   T3 Bloom     + silver caps on the vials, three petals on the cowl, belt buckle, boot clasps
//   T4 Deadly    bright violet, a poison gem on the brow and chest, four vials, thorn mantle, longer petals
//   T5 Radiant   pale moon-silk with flat spore-light cores (brow, vials, heel)
//   T6 Mythic    Queen of Hemlock: ink-violet silk, a crown of floating petals, glowing vials, one poison glow run
// Families: nightshadehelm / nightshade / nightshadeboots; ids <family>.t1 .. .t6.
const { mk, flat, gem, cloth, torso, arms, boots, dome, spike, piece, both } = require('./chibi-suit-lib.js');
const { LEATHER } = require('./chibi-palette.js');

const CLO = ['#585c64', '#54486c', '#503c7c', '#6038a4', '#e0d4f4', '#2c2054'];
const WRP = ['#5a5e48', '#4e4a42', '#4a3e52', '#3a2a66', '#a8a4cc', '#201844'];
const matsOf = t => ({ cloth: cloth(CLO[t - 1]), wrap: cloth(WRP[t - 1]), leather: LEATHER, metal: mk('#9a9ab8'), vial: gem('#5ae03a'), vial2: gem('#b04aff'), core: flat('#f4ffe0'), glow: flat('#b8ff4a') });

const vialAt = i => ({ x: -3.2 + i * 2.4, y: 3.1 - i * 1.65 });   // a spot on the baldric, below the strap

function nightshadehelm(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...dome('cloth', 'cowl', { k: 1.07, ky: 1.04 }),
    { bone: 'head', mat: 'wrap', part: 'mask', shape: 'ell', c: [0, 2.8, 4.4], r: [5.2, 2.0, 2.5] },
    { bone: 'head', mat: 'wrap', part: 'brim', shape: 'ell', c: [0, 9.4, 3.2], r: [5.4, 1.0, 3.4] });
  if (t >= 2) P.push({ bone: 'head', mat: 'cloth', part: 'tail', shape: 'cap', a: [0, 4.0, -5.4], b: [0, 0.6, -7.6 - (t >= 4 ? 1.4 : 0)], ra: 3.0, rb: 0.9 },
    ...both((s, k) => [{ bone: 'head', mat: 'wrap', part: 'cheek' + s, shape: 'ell', c: [6.0 * k, 3.4, 1.0], r: [1.0, 2.6, 3.2] }]));
  if (t >= 3) P.push(...[-1, 0, 1].map(x => spike('head', 'vial', 'petal', [x * 2.6, 10.6, 2.6], [x * 4.6, (t >= 4 ? 15.0 : 13.6) - Math.abs(x) * 1.0, 1.4], 1.7, 0.5)),
    { bone: 'head', mat: 'metal', part: 'ring', shape: 'ell', c: [0, 2.6, 6.9], r: [1.2, 0.8, 0.5] },
    ...both((s, k) => [{ bone: 'head', mat: 'metal', part: 'clasp' + s, shape: 'ell', c: [7.0 * k, 3.6, 2.2], r: [0.9, 1.6, 1.6] }]));
  if (t >= 4) P.push({ bone: 'head', mat: 'vial2', part: 'gem', shape: 'ell', c: [0, 9.4, 6.9], r: [1.1, 1.0, 0.6] });
  if (t === 5) P.push({ bone: 'head', mat: 'core', part: 'gem', shape: 'ell', c: [0, 9.4, 7.1], r: [1.4, 1.3, 0.6] },
    ...both((s, k) => [{ bone: 'head', mat: 'core', part: 'clasp' + s, shape: 'ell', c: [7.1 * k, 3.6, 2.2], r: [0.7, 1.4, 1.4] }]),
    { bone: 'head', mat: 'core', part: 'tip', shape: 'ell', c: [0, 0.2, -8.8], r: [1.3, 1.3, 1.3] });
  if (M) {                                                        // Mythic: a crown of floating petals
    P.push(...[-2, -1, 0, 1, 2].map(x => spike('head', 'vial2', 'crown', [x * 2.2, 12.0, -1.4], [x * 3.4, 16.8 - Math.abs(x) * 1.2, -2.2], 1.3, 0.3)));
    stamps.push({ bone: 'head', at: [0, 9.4, 7.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('nightshadehelm', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function nightshade(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('cloth', 'body', { k: 1.0, kz: 1.0 }),
    ...arms({ up: 'cloth', fore: 'wrap', hand: t === 1 ? 'leather' : 'wrap' }, { k: 1.05 }),
    { bone: 'chest', mat: 'wrap', part: 'collar', shape: 'ell', c: [0, 4.2, 0.2], r: [4.5, 1.6, 3.6] },
    { bone: 'spine', mat: 'leather', part: 'belt', shape: 'disc', c: [0, 3.0, 0], r: [5.1, 0.6, 4.1], weight: 2 },
    { bone: 'chest', mat: 'leather', part: 'strap', shape: 'cap', a: [-4.2, 4.0, 2.6], b: [4.2, -2.4, 3.4], ra: 0.75, rb: 0.75 },
    { bone: 'spine', mat: 'wrap', part: 'sash', shape: 'box', c: [0, -2.0, 3.8], h: [1.5, 2.6, 0.3], round: 0.25 });
  if (t >= 2) {
    P.push(...both((s, k) => [{ bone: 'upper' + s, mat: 'wrap', part: 'mantle' + s, shape: 'ell', c: [0.4 * k, 0.6, 0], r: [3.1, 2.6, 3.0], clip: [0, -1, 0, 0.9] }]));
    const n = t >= 4 ? 4 : t >= 3 ? 3 : 2;
    for (let i = 0; i < n; i++) { const v = vialAt(i); P.push({ bone: 'chest', mat: 'vial', part: 'vial', shape: 'ell', c: [v.x, v.y - 1.2, 3.5], r: [1.1, 1.7, 0.9] }); }
  }
  if (t >= 3) {
    for (let i = 0; i < (t >= 4 ? 4 : 3); i++) { const v = vialAt(i); P.push({ bone: 'chest', mat: 'metal', part: 'cap', shape: 'box', c: [v.x, v.y + 0.35, 3.75], h: [0.65, 0.35, 0.4], round: 0.15 }); }
    P.push({ bone: 'spine', mat: 'metal', part: 'belt', shape: 'box', c: [0, 3.0, 4.0], h: [0.9, 0.7, 0.3], round: 0.2 });
  }
  if (t >= 4) P.push({ bone: 'chest', mat: 'vial', part: 'gem', shape: 'ell', c: [0, 4.6, 3.5], r: [0.8, 0.8, 0.5] },
    ...both((s, k) => [spike('upper' + s, 'cloth', 'thorn' + s, [2.4 * k, 1.8, -0.6], [4.4 * k, 3.8, -1.2], 1.1, 0.35)]));
  if (t === 5) P.push({ bone: 'chest', mat: 'core', part: 'gem', shape: 'ell', c: [0, 4.6, 3.8], r: [1.0, 0.9, 0.5] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'core', part: 'thorn' + s, shape: 'ell', c: [3.3 * k, 0.8, 2.4], r: [1.1, 1.1, 0.8] }]));
  if (M) {
    P.push(...both((s, k) => [spike('upper' + s, 'vial', 'thorn' + s, [2.0 * k, 2.6, -0.6], [3.4 * k, 7.0, -1.4], 1.2, 0.3)]),
      { bone: 'chest', mat: 'vial', part: 'gem', shape: 'ell', c: [0, 1.0, 3.9], r: [1.5, 1.0, 0.6] });
    stamps.push({ bone: 'chest', at: [0, 1.0, 4.5], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('nightshade', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function nightshadeboots(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('wrap', 'boot', { k: 1.05, len: 1.0, top: 0.2 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: 'cloth', part: 'cuff' + s, shape: 'ell', c: [0, -0.2, 0], r: [2.1, 0.7, 2.1] }];
    if (t >= 2) L.push({ bone: 'shin' + s, mat: 'leather', part: 'band' + s, shape: 'disc', c: [0, -1.5, 0.1], r: [2.0, 0.4, 1.95] },
      { bone: 'foot' + s, mat: 'leather', part: 'toe' + s, shape: 'ell', c: [0, -1.6, 3.2], r: [1.4, 0.8, 0.8] });
    if (t >= 3) L.push({ bone: 'shin' + s, mat: 'metal', part: 'clasp' + s, shape: 'ell', c: [0, -0.6, 1.9], r: [0.6, 0.6, 0.4] },
      { bone: 'foot' + s, mat: 'metal', part: 'toe' + s, shape: 'ell', c: [0, -1.1, 3.6], r: [1.0, 0.5, 0.5] });
    if (t >= 4) L.push({ bone: 'shin' + s, mat: 'vial', part: 'gem' + s, shape: 'ell', c: [0, -0.6, 2.2], r: [0.5, 0.5, 0.4] },
      spike('shin' + s, 'cloth', 'tail' + s, [1.6 * k, 0.4, -0.4], [2.8 * k, 2.4, -1.4], 1.1, 0.35));
    if (t === 5) L.push({ bone: 'foot' + s, mat: 'core', part: 'heel' + s, shape: 'ell', c: [0, -0.8, -2.6], r: [0.7, 0.6, 0.5] });
    if (M) L.push(spike('foot' + s, 'vial2', 'tail' + s, [0, -0.6, -2.4], [0, 1.4, -5.0], 1.0, 0.3));
    return L;
  });
  if (M) stamps.push({ bone: 'footR', at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] });
  return piece('nightshadeboots', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [nightshadehelm, nightshade, nightshadeboots]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
