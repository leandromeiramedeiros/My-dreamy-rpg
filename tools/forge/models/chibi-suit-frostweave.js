'use strict';
// CHIBI SUIT FROSTWEAVE — caster suit 2 (frost): a deep cowl, a long robe, wide sleeves and an ice-crystal mantle.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Wool      grey-blue wool: plain cowl, robe, rope belt, soft boots
//   T2 Fleece    deeper blue, a fur collar and cuffs, a cowl point, belt tassel
//   T3 Rimed     + silver trim, ice shards on the shoulders, a rime circlet, silver clasp
//   T4 Glacial   a crystal mantle (tall ice spikes), a frost gem on the circlet and chest, boot tips
//   T5 Radiant   snow-silk with flat ice-light cores (circlet, mantle eyes, heels)
//   T6 Mythic    Hoarfrost Regalia: night-blue silk, a ring of floating ice shards, one frost glow run
// Families: arcanecowl / frostweave / frostweaveboots; ids <family>.t1 .. .t6.
const { mk, flat, cloth, torso, arms, boots, dome, spike, piece, both } = require('./chibi-suit-lib.js');
const { GLOW, FROSTG } = require('./chibi-palette.js');

const CLO = ['#5a6a88', '#4a72a8', '#4a84c4', '#3a96d8', '#e0f2ff', '#1e3c6e'];
const FUR = ['#a0a8b8', '#98a8c0', '#9cb0cc', '#bcd2e8', '#d4e4f4', '#6a82a8'];
const matsOf = t => ({ cloth: cloth(CLO[t - 1]), fur: cloth(FUR[t - 1]), metal: mk('#a8b8d4'), ice: FROSTG, core: flat('#e8fcff'), glow: flat(GLOW.frost), dark: cloth('#2a3454') });

function arcanecowl(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...dome('cloth', 'cowl', { k: 1.08, ky: 1.04 }),
    { bone: 'head', mat: 'fur', part: 'brim', shape: 'ell', c: [0, 9.6, 3.4], r: [5.4, 0.9, 3.4] },
    { bone: 'head', mat: 'cloth', part: 'tail', shape: 'cap', a: [0, 4.5, -5.4], b: [0, 1.0, -7.4], ra: 3.0, rb: 1.0 });
  if (t >= 2) P.push(spike('head', 'cloth', 'point', [0, 12.0, -1.2], [0, 16.0 + (t >= 4 ? 1.0 : 0), -3.6], 2.0, 0.2),
    ...both((s, k) => [{ bone: 'head', mat: 'fur', part: 'cheek' + s, shape: 'ell', c: [6.2 * k, 3.4, 1.2], r: [1.1, 2.6, 3.0] }]));
  if (t >= 3) P.push({ bone: 'head', mat: 'metal', part: 'circlet', shape: 'ell', c: [0, 9.4, 6.0], r: [3.4, 0.7, 0.7] },
    ...both((s, k) => [spike('head', 'ice', 'shard' + s, [3.4 * k, 9.5, 5.4], [4.8 * k, 12.2, 5.0], 0.9, 0.12)]));
  if (t >= 4) P.push({ bone: 'head', mat: 'ice', part: 'gem', shape: 'ell', c: [0, 10.2, 6.6], r: [1.0, 1.2, 0.6] },
    spike('head', 'ice', 'shard', [0, 10.8, 6.0], [0, 14.6, 5.6], 1.0, 0.12));
  if (t === 5) P.push({ bone: 'head', mat: 'core', part: 'gem', shape: 'ell', c: [0, 10.2, 6.8], r: [1.4, 1.4, 0.6] },
    ...both((s, k) => [{ bone: 'head', mat: 'core', part: 'shard' + s, shape: 'ell', c: [4.8 * k, 12.4, 4.8], r: [0.7, 1.1, 0.7] }]));
  if (M) {                                                        // Mythic: a crown of five floating ice shards behind the head
    P.push(...[-2, -1, 0, 1, 2].map(x => spike('head', 'ice', 'crown', [x * 2.2, 12.2, -1.4], [x * 3.6, 16.6 - Math.abs(x) * 1.0, -2.2], 1.1, 0.12)));
    stamps.push({ bone: 'head', at: [0, 10.2, 7.2], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('arcanecowl', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function frostweave(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('cloth', 'robe', { k: 1.02, kz: 1.02 }),
    ...arms({ up: 'cloth', fore: t >= 2 ? 'fur' : 'cloth', hand: t >= 2 ? 'fur' : 'dark' }, { k: 1.15 }),
    { bone: 'hips', mat: 'cloth', part: 'skirt', shape: 'cap', a: [0, 0.8, 0], b: [0, -3.2, 0], ra: 4.5, rb: 5.0 },                  // the robe skirt
    { bone: 'chest', mat: 'fur', part: 'collar', shape: 'ell', c: [0, 4.2, 0.2], r: [4.5, 1.5, 3.6] },
    { bone: 'spine', mat: 'dark', part: 'belt', shape: 'disc', c: [0, 3.0, 0], r: [5.1, 0.55, 4.1], weight: 2 });
  if (t >= 2) P.push({ bone: 'spine', mat: 'fur', part: 'tassel', shape: 'box', c: [2.2, -1.6, 4.0], h: [0.55, 2.6, 0.3], round: 0.2 },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'fur', part: 'mantle' + s, shape: 'ell', c: [0.4 * k, 0.7, 0], r: [3.0, 2.4, 2.9], clip: [0, -1, 0, 0.9] }]));
  if (t >= 3) P.push({ bone: 'spine', mat: 'metal', part: 'clasp', shape: 'ell', c: [0, 3.0, 4.1], r: [0.9, 0.8, 0.4] },
    { bone: 'hips', mat: 'metal', part: 'hem', shape: 'disc', c: [0, -3.0, 0], r: [5.05, 0.4, 4.6] },
    ...both((s, k) => [spike('upper' + s, 'ice', 'mantle' + s, [1.6 * k, 2.2, -0.2], [2.8 * k, 5.0, -0.6], 1.0, 0.14)]));
  if (t >= 4) P.push({ bone: 'chest', mat: 'ice', part: 'gem', shape: 'ell', c: [0, 3.4, 3.6], r: [0.8, 1.0, 0.5] },
    ...both((s, k) => [spike('upper' + s, 'ice', 'mantle' + s, [3.2 * k, 1.8, 0.2], [5.4 * k, 4.4, -0.2], 1.0, 0.14),
      spike('upper' + s, 'ice', 'mantle' + s, [0.4 * k, 2.6, -1.4], [1.0 * k, 6.8, -2.0], 1.1, 0.14)]));
  if (t === 5) P.push({ bone: 'chest', mat: 'core', part: 'gem', shape: 'ell', c: [0, 1.4, 3.9], r: [1.0, 1.5, 0.5] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'core', part: 'mantle' + s, shape: 'ell', c: [3.4 * k, 1.0, 2.2], r: [0.7, 0.7, 0.5] }]));
  if (M) {
    P.push(...both((s, k) => [spike('chest', 'ice', 'shard', [3.6 * k, 4.0, -3.4], [7.8 * k, 8.6, -4.6], 1.3, 0.12), spike('chest', 'ice', 'shard', [3.4 * k, 1.4, -3.4], [8.4 * k, 3.4, -4.4], 1.2, 0.12)]),
      { bone: 'chest', mat: 'ice', part: 'gem', shape: 'ell', c: [0, 1.6, 3.9], r: [1.3, 1.5, 0.6] });
    stamps.push({ bone: 'chest', at: [0, 1.6, 4.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('frostweave', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function frostweaveboots(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('cloth', 'boot', { k: 1.0, len: 1.0, top: 0.2 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: t >= 2 ? 'fur' : 'dark', part: 'cuff' + s, shape: 'ell', c: [0, -0.1, 0], r: t >= 2 ? [2.6, 1.2, 2.6] : [2.2, 0.7, 2.2] }];
    if (t >= 3) L.push({ bone: 'foot' + s, mat: 'metal', part: 'toe' + s, shape: 'ell', c: [0, -1.4, 3.4], r: [1.2, 0.7, 0.7] },
      { bone: 'shin' + s, mat: 'metal', part: 'clasp' + s, shape: 'ell', c: [0, -1.5, 1.8], r: [0.7, 0.5, 0.4] });
    if (t >= 4) L.push(spike('foot' + s, 'ice', 'tip' + s, [0, -0.6, 3.6], [0, 0.4, 5.6], 0.9, 0.12),
      spike('shin' + s, 'ice', 'tip' + s, [1.8 * k, 0.6, -0.2], [2.8 * k, 2.6, -0.8], 0.8, 0.12));
    if (t === 5) L.push({ bone: 'foot' + s, mat: 'core', part: 'tip' + s, shape: 'ell', c: [0, -0.9, -2.6], r: [1.0, 0.8, 0.7] });
    if (M) L.push(spike('foot' + s, 'ice', 'tip' + s, [0, -0.6, -2.4], [0, 1.6, -5.2], 0.9, 0.12));
    return L;
  });
  if (M) stamps.push({ bone: 'footR', at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] });
  return piece('frostweaveboots', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [arcanecowl, frostweave, frostweaveboots]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
