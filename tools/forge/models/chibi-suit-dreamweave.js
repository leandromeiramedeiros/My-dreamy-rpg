'use strict';
// CHIBI SUIT DREAMWEAVE — caster suit 1 (dream): a floppy nightcap with a tassel and moon brooch, a star-sprinkled robe and shawl, cloth sandals.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Nap       drab grey-violet: a plain cap, a robe, a rope belt, wrapped sandals
//   T2 Drowse    deeper violet: a drooping cap tip, a shawl over the shoulders, wide sleeves, a sash
//   T3 Lullaby   + a silver pom and moon brooch, hem band, ribbon trails, sandal clasps
//   T4 Reverie   bright violet, a dream gem on the brooch and chest, floating stars, long ribbons
//   T5 Radiant   star-silk with flat starlight cores (brooch, pom, shawl studs, heel)
//   T6 Mythic    Weaver of the Last Dream: night-violet silk, a crown of floating stars and moons, one arcane glow run
// Families: dreamweavehelm / dreamweave / clothsandals; ids <family>.t1 .. .t6.
const { mk, flat, gem, cloth, torso, arms, boots, dome, spike, piece, both } = require('./chibi-suit-lib.js');
const { GLOW } = require('./chibi-palette.js');

const DRM = ['#5e5a7a', '#4e46a0', '#4a3cc0', '#5a38d8', '#e8e0ff', '#22185c'];
const SHL = ['#587078', '#3a7a90', '#3a98b0', '#4ac0d8', '#dcf4ff', '#1a4660'];
const matsOf = t => ({ cloth: cloth(DRM[t - 1]), shawl: cloth(SHL[t - 1]), metal: mk('#b8b8dc'), gem: gem('#b070ff'), core: flat('#f8f0ff'), glow: flat(GLOW.arcane), dark: cloth('#241a48') });

function dreamweavehelm(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...dome('cloth', 'cap', { k: 1.07, ky: 1.04 }),
    { bone: 'head', mat: t >= 2 ? 'shawl' : 'dark', part: 'brim', shape: 'ell', c: [0, 9.4, 3.4], r: [5.5, 1.0, 3.4] });
  if (t >= 2) P.push({ bone: 'head', mat: 'cloth', part: 'tip', shape: 'cap', a: [0, 11.0, -1.2], b: [0, 12.6, -7.6], ra: 3.2, rb: 1.4 });
  if (t >= 3) P.push({ bone: 'head', mat: 'metal', part: 'pom', shape: 'ell', c: [0, 12.4, -8.8], r: [1.7, 1.7, 1.7] },
    { bone: 'head', mat: 'metal', part: 'moon', shape: 'ell', c: [0, 9.6, 6.4], r: [2.0, 1.3, 0.7] });
  if (t >= 4) P.push({ bone: 'head', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 9.8, 6.9], r: [1.1, 1.0, 0.6] },
    ...both((s, k) => [{ bone: 'head', mat: 'gem', part: 'star' + s, shape: 'ell', c: [7.4 * k, 12.0, 0.6], r: [1.0, 1.0, 0.8] }]));
  if (t === 5) P.push({ bone: 'head', mat: 'core', part: 'gem', shape: 'ell', c: [0, 9.8, 7.1], r: [1.3, 1.3, 0.6] },
    { bone: 'head', mat: 'core', part: 'pom', shape: 'ell', c: [0, 12.4, -9.0], r: [1.9, 1.9, 1.9] });
  if (M) {                                                        // Mythic: a crown of floating star spikes
    P.push(...[-2, -1, 0, 1, 2].map(x => spike('head', 'gem', 'crown', [x * 2.4, 12.0, -1.2], [x * 3.6, 16.8 - Math.abs(x) * 1.2, -2.0], 1.3, 0.2)));
    stamps.push({ bone: 'head', at: [0, 9.8, 7.5], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('dreamweavehelm', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function dreamweave(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('cloth', 'robe', { k: 1.02, kz: 1.02 }),
    ...arms({ up: 'cloth', fore: t >= 2 ? 'shawl' : 'cloth', hand: t >= 2 ? 'shawl' : 'dark' }, { k: 1.15 }),
    { bone: 'hips', mat: 'cloth', part: 'skirt', shape: 'cap', a: [0, 0.8, 0], b: [0, -3.4, 0], ra: 4.5, rb: 5.1 },
    { bone: 'chest', mat: 'dark', part: 'collar', shape: 'ell', c: [0, 4.2, 0.2], r: [4.4, 1.5, 3.5] },
    { bone: 'spine', mat: 'dark', part: 'belt', shape: 'disc', c: [0, 3.0, 0], r: [5.1, 0.55, 4.1], weight: 2 });
  if (t >= 2) P.push(...both((s, k) => [{ bone: 'upper' + s, mat: 'shawl', part: 'shawl' + s, shape: 'ell', c: [0.4 * k, 0.7, 0], r: [3.2, 2.6, 3.1], clip: [0, -1, 0, 0.9] }]),
    { bone: 'spine', mat: 'shawl', part: 'sash', shape: 'box', c: [0, -2.0, 3.9], h: [1.2, 2.6, 0.3], round: 0.25 });
  if (t >= 3) P.push({ bone: 'spine', mat: 'metal', part: 'belt', shape: 'box', c: [0, 3.0, 4.05], h: [0.9, 0.7, 0.3], round: 0.2 },
    { bone: 'hips', mat: 'metal', part: 'belt', shape: 'disc', c: [0, -3.2, 0], r: [5.15, 0.4, 4.7] },
    ...both((s, k) => [spike('chest', 'shawl', 'ribbon' + s, [2.8 * k, 2.4, -3.4], [4.8 * k, -3.0, -5.8], 1.5, 0.4)]));
  if (t >= 4) P.push({ bone: 'chest', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 3.6, 3.6], r: [0.8, 1.0, 0.5] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'gem', part: 'shawl' + s, shape: 'ell', c: [3.4 * k, 1.0, 2.4], r: [0.9, 0.9, 0.7] },
      spike('upper' + s, 'shawl', 'wing' + s, [3.0 * k, 1.8, -0.4], [5.6 * k, 3.8, -0.8], 1.3, 0.4)]));
  if (t === 5) P.push({ bone: 'chest', mat: 'core', part: 'gem', shape: 'ell', c: [0, 1.4, 3.9], r: [1.0, 1.5, 0.5] },
    { bone: 'hips', mat: 'core', part: 'belt', shape: 'disc', c: [0, -3.2, 0], r: [5.2, 0.5, 4.75] });
  if (M) {
    P.push(...both((s, k) => [spike('chest', 'gem', 'wisp', [3.6 * k, 4.2, -3.4], [7.8 * k, 8.8, -4.6], 1.4, 0.2), spike('chest', 'gem', 'wisp', [3.4 * k, 1.2, -3.4], [8.2 * k, 3.2, -4.6], 1.2, 0.2)]),
      { bone: 'chest', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 1.6, 3.9], r: [1.3, 1.5, 0.6] });
    stamps.push({ bone: 'chest', at: [0, 1.6, 4.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('dreamweave', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function clothsandals(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('cloth', 'boot', { k: 1.0, len: 1.0, top: 0.2 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: t >= 2 ? 'shawl' : 'dark', part: 'cuff' + s, shape: 'ell', c: [0, -0.1, 0], r: t >= 2 ? [2.5, 1.0, 2.5] : [2.2, 0.7, 2.2] }];
    if (t >= 2) L.push({ bone: 'foot' + s, mat: 'shawl', part: 'toe' + s, shape: 'ell', c: [0, -1.5, 3.3], r: [1.3, 0.7, 0.8] });
    if (t >= 3) L.push({ bone: 'shin' + s, mat: 'metal', part: 'cuff' + s, shape: 'disc', c: [0, -1.4, 0.1], r: [2.1, 0.5, 2.05] },
      { bone: 'foot' + s, mat: 'metal', part: 'tip' + s, shape: 'ell', c: [0, -1.1, 3.7], r: [1.5, 0.8, 0.8] },
      { bone: 'shin' + s, mat: 'metal', part: 'tip' + s, shape: 'ell', c: [0, -1.5, 1.8], r: [0.7, 0.5, 0.4] });
    if (t >= 4) L.push({ bone: 'shin' + s, mat: 'gem', part: 'tip' + s, shape: 'ell', c: [0, -0.6, 2.3], r: [0.6, 0.6, 0.5] },
      spike('shin' + s, 'shawl', 'wing' + s, [1.9 * k, 0.4, -0.2], [3.6 * k, 3.0, -1.2], 1.2, 0.4));
    if (t === 5) L.push({ bone: 'foot' + s, mat: 'core', part: 'toe' + s, shape: 'ell', c: [0, -0.9, -2.6], r: [1.0, 0.8, 0.7] });
    if (M) L.push(spike('foot' + s, 'gem', 'wing' + s, [0, -0.6, -2.4], [0, 1.6, -5.2], 1.0, 0.2));
    return L;
  });
  if (M) stamps.push({ bone: 'footR', at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] });
  return piece('clothsandals', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [dreamweavehelm, dreamweave, clothsandals]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
