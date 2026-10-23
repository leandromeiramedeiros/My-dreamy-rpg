'use strict';
// CHIBI SUIT SHADE — shadow suit 1 (Rogue origin): a deep hood, a face wrap, crossed chest wraps, a short mantle, wrapped boots.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Rag       drab wraps: plain hood, face wrap, a leather strap, wrapped boots
//   T2 Stitched  dusk cloth + leather: a hood tail, shoulder mantle, belt pouches, wrap bands on the shins
//   T3 Silvered  + silver clasps, hood ring, buckles, knife-sheath, silver toe caps
//   T4 Umbral    violet cloth, an arcane brow gem, a clasp gem, longer tail, mantle spikes
//   T5 Radiant   pale moon-silk with flat light cores (hood tip, clasp, heel)
//   T6 Mythic    Veil of the Last Hour: ink-black silk, a crown of shadow wisps, one arcane glow run
// Families: shadehelm / shade / shadeboots; ids <family>.t1 .. .t6.
const { mk, flat, cloth, torso, arms, boots, dome, spike, piece, both } = require('./chibi-suit-lib.js');
const { LEATHER, GLOW, ARCG } = require('./chibi-palette.js');

const CLO = ['#5a5870', '#52486c', '#4e3e7c', '#5a3a9c', '#d4cef2', '#322a5a'];
const WRP = ['#6a5a48', '#6a4a3a', '#7a5a4a', '#3a2a6a', '#a89ed0', '#241c46'];
const matsOf = t => ({ cloth: cloth(CLO[t - 1]), wrap: cloth(WRP[t - 1]), leather: LEATHER, metal: mk('#9a9ab8'), gem: ARCG, core: flat('#f4ecff'), glow: flat(GLOW.arcane) });

function shadehelm(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...dome('cloth', 'hood', { k: 1.07, ky: 1.04 }),
    { bone: 'head', mat: 'wrap', part: 'face', shape: 'ell', c: [0, 2.6, 4.3], r: [5.3, 2.3, 2.6] },                       // the face wrap, under the eyes
    { bone: 'head', mat: 'wrap', part: 'brim', shape: 'ell', c: [0, 9.4, 3.2], r: [5.4, 1.0, 3.4] },                       // the hood lip over the brow
    { bone: 'head', mat: 'cloth', part: 'hood', shape: 'cap', a: [0, 4.0, -5.4], b: [0, 0.6, -7.6 - (t >= 4 ? 1.4 : 0)], ra: 3.0, rb: 0.9 });
  if (t >= 2) P.push(...both((s, k) => [{ bone: 'head', mat: 'wrap', part: 'cheek', shape: 'ell', c: [6.0 * k, 3.4, 1.0], r: [1.0, 2.6, 3.2] }]),
    { bone: 'head', mat: 'leather', part: 'knot', shape: 'ell', c: [0, 3.6, -5.6], r: [1.8, 1.0, 1.2] });
  if (t >= 3) P.push({ bone: 'head', mat: 'metal', part: 'ring', shape: 'ell', c: [0, 9.4, 6.4], r: [1.7, 1.1, 0.8] },
    { bone: 'head', mat: 'metal', part: 'ring', shape: 'ell', c: [0, 2.4, 6.9], r: [1.2, 0.8, 0.5] },
    ...both((s, k) => [{ bone: 'head', mat: 'metal', part: 'ring', shape: 'ell', c: [7.0 * k, 3.6, 2.2], r: [0.9, 1.6, 1.6] }]));
  if (t >= 4) P.push({ bone: 'head', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 9.4, 6.9], r: [1.1, 1.0, 0.6] });
  if (t === 5) P.push({ bone: 'head', mat: 'core', part: 'tip', shape: 'ell', c: [0, 0.2, -8.8], r: [1.3, 1.3, 1.3] },
    { bone: 'head', mat: 'core', part: 'ring', shape: 'ell', c: [0, 2.4, 7.1], r: [1.0, 0.7, 0.4] },
    ...both((s, k) => [{ bone: 'head', mat: 'core', part: 'ring', shape: 'ell', c: [7.1 * k, 3.6, 2.2], r: [0.7, 1.4, 1.4] }]));
  if (M) {                                                       // Mythic: three shadow wisps off the hood crown, one on the tail
    P.push(...[-1, 0, 1].map(x => spike('head', 'gem', 'wisp', [x * 3.0, 11.4, -1.6], [x * 4.4, 15.0 - Math.abs(x) * 1.2, -2.4], 1.1, 0.12)),
      spike('head', 'gem', 'wisp', [0, 0.6, -7.6], [0, -1.8, -10.2], 0.9, 0.12));
    stamps.push({ bone: 'head', at: [0, 9.4, 7.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('shadehelm', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function shade(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('cloth', 'body', { k: 1.0, kz: 1.0 }),
    ...arms({ up: 'cloth', fore: 'wrap', hand: t === 1 ? 'leather' : 'wrap' }, { k: 1.05 }),
    { bone: 'chest', mat: 'wrap', part: 'collar', shape: 'ell', c: [0, 4.2, 0.2], r: [4.4, 1.5, 3.5] },
    { bone: 'spine', mat: 'leather', part: 'belt', shape: 'disc', c: [0, 3.0, 0], r: [5.1, 0.6, 4.1], weight: 2 },
    // the chest wrap: a diagonal strap across the front
    { bone: 'chest', mat: 'leather', part: 'strap', shape: 'cap', a: [-4.2, 4.0, 2.6], b: [4.2, -2.4, 3.4], ra: 0.75, rb: 0.75 },
    { bone: 'spine', mat: 'wrap', part: 'sash', shape: 'box', c: [0, -2.0, 3.8], h: [1.5, 2.6, 0.3], round: 0.25 });
  if (t >= 2) P.push(...both((s, k) => [{ bone: 'upper' + s, mat: 'wrap', part: 'mantle' + s, shape: 'ell', c: [0.4 * k, 0.6, 0], r: [3.1, 2.6, 3.0], clip: [0, -1, 0, 0.9] },
    { bone: 'fore' + s, mat: 'leather', part: 'arm' + s, shape: 'cap', a: [0, -0.1, 0], b: [0, -1.4, 0], ra: 1.7, rb: 1.65 }]),
    { bone: 'spine', mat: 'leather', part: 'pouch', shape: 'box', c: [-3.6, 2.4, 3.9], h: [1.0, 0.9, 0.5], round: 0.3 });
  if (t >= 3) P.push({ bone: 'spine', mat: 'metal', part: 'belt', shape: 'box', c: [0, 3.0, 4.0], h: [0.9, 0.7, 0.3], round: 0.2 },
    { bone: 'chest', mat: 'metal', part: 'clasp', shape: 'ell', c: [0, 4.6, 3.3], r: [0.9, 0.7, 0.5] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'metal', part: 'mantle' + s, shape: 'ell', c: [2.8 * k, 1.2, 1.6], r: [0.55, 0.55, 0.5] }]));
  if (t >= 4) P.push({ bone: 'chest', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 4.6, 3.7], r: [0.8, 0.8, 0.5] },
    ...both((s, k) => [spike('upper' + s, 'cloth', 'mantle' + s, [2.4 * k, 1.8, -0.6], [4.2 * k, 3.6, -1.2], 0.9, 0.15)]));
  if (t === 5) P.push({ bone: 'chest', mat: 'core', part: 'clasp', shape: 'ell', c: [0, 1.6, 3.9], r: [0.8, 0.9, 0.4] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'core', part: 'mantle' + s, shape: 'ell', c: [3.3 * k, 0.8, 2.4], r: [0.7, 0.7, 0.5] }]));
  if (M) {
    P.push(...both((s, k) => [spike('upper' + s, 'gem', 'mantle' + s, [2.0 * k, 2.6, -0.6], [3.4 * k, 6.6, -1.4], 1.0, 0.12)]),
      { bone: 'chest', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 1.4, 3.8], r: [1.5, 1.0, 0.6] });
    stamps.push({ bone: 'chest', at: [0, 1.4, 4.4], n: [0, 0, 1], facing: 0.3, on: 'gem', px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('shade', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function shadeboots(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('wrap', 'boot', { k: 1.05, len: 1.0, top: 0.2 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: 'cloth', part: 'cuff' + s, shape: 'ell', c: [0, -0.2, 0], r: [2.1, 0.7, 2.1] }];
    if (t >= 2) L.push({ bone: 'shin' + s, mat: 'leather', part: 'band' + s, shape: 'disc', c: [0, -1.5, 0.1], r: [2.0, 0.4, 1.95] },
      { bone: 'foot' + s, mat: 'leather', part: 'toe' + s, shape: 'ell', c: [0, -1.6, 3.2], r: [1.4, 0.8, 0.8] });
    if (t >= 3) L.push({ bone: 'shin' + s, mat: 'metal', part: 'clasp' + s, shape: 'ell', c: [0, -0.6, 1.9], r: [0.6, 0.6, 0.4] },
      { bone: 'foot' + s, mat: 'metal', part: 'toe' + s, shape: 'ell', c: [0, -1.1, 3.6], r: [1.0, 0.5, 0.5] });
    if (t >= 4) L.push({ bone: 'shin' + s, mat: 'gem', part: 'gem' + s, shape: 'ell', c: [0, -0.6, 2.2], r: [0.5, 0.5, 0.4] },
      spike('shin' + s, 'cloth', 'tail' + s, [1.6 * k, 0.4, -0.4], [2.8 * k, 2.4, -1.4], 0.8, 0.12));
    if (t === 5) L.push({ bone: 'foot' + s, mat: 'core', part: 'heel' + s, shape: 'ell', c: [0, -0.8, -2.6], r: [0.7, 0.6, 0.5] });
    if (M) L.push(spike('foot' + s, 'gem', 'tail' + s, [0, -0.6, -2.4], [0, 1.4, -5.0], 0.8, 0.12));
    return L;
  });
  if (M) stamps.push(...both(s => [{ bone: 'foot' + s, at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] }]));
  return piece('shadeboots', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [shadehelm, shade, shadeboots]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
