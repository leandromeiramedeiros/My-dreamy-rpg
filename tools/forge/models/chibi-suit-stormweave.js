'use strict';
// CHIBI SUIT STORMWEAVE — caster suit 3 (lightning): a swept skullcap with antenna rods, a high stand collar, a robe and shoulder rods.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Squall    drab storm-grey: a skullcap with side flaps, a robe, a stub collar
//   T2 Gale      indigo, a high collar, ochre sash, short head rods and shoulder studs
//   T3 Thunder   + bronze rods with amber tips, collar edging, belt coil
//   T4 Tempest   bright indigo, tall rods, a bolt gem on the collar and cap, forked shoulder rods
//   T5 Radiant   storm-silk with flat spark cores (rod tips, collar, sash)
//   T6 Mythic    Eye of the Tempest: night-indigo, a ring of floating bolts, tall rods, one spark glow run
// Families: stormweavehelm / stormweave / stormweaveboots; ids <family>.t1 .. .t6.
const { mk, flat, gem, cloth, torso, arms, boots, dome, spike, piece, both } = require('./chibi-suit-lib.js');

const CLO = ['#625c78', '#4e4c8c', '#44449c', '#3c48c0', '#dcdcff', '#242252'];
const SASH = ['#8a7a58', '#a08a48', '#b89a38', '#d8b030', '#fff0b0', '#6a5a1a'];
const SPARK = '#ffe84a';
const matsOf = t => ({ cloth: cloth(CLO[t - 1]), sash: cloth(SASH[t - 1]), bronze: mk('#c0904e'), bolt: gem('#f0c820'), core: flat('#fffbd0'), glow: flat(SPARK), dark: cloth('#2c2a48') });

function stormweavehelm(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...dome('cloth', 'cap', { k: 1.05, ky: 1.0 }),
    { bone: 'head', mat: 'sash', part: 'brim', shape: 'ell', c: [0, 9.2, 3.6], r: [5.6, 0.9, 3.4] },
    ...both((s, k) => [{ bone: 'head', mat: 'cloth', part: 'flap', shape: 'ell', c: [6.4 * k, 3.4, 0.4], r: [1.3, 3.0, 3.2] }]));
  if (t >= 2) P.push(...both((s, k) => [spike('head', t >= 3 ? 'bronze' : 'dark', 'rod' + s, [4.4 * k, 11.0, -0.4], [5.4 * k, 14.4 + (t >= 4 ? 2 : 0), -0.6], 1.0, 0.55)]));
  if (t >= 3) P.push(...both((s, k) => [{ bone: 'head', mat: 'bolt', part: 'rod' + s, shape: 'ell', c: [5.4 * k, 14.9 + (t >= 4 ? 2 : 0), -0.6], r: [0.9, 0.9, 0.9] }]),
    { bone: 'head', mat: 'bronze', part: 'trim', shape: 'ell', c: [0, 9.4, 6.4], r: [2.8, 0.6, 0.6] });
  if (t >= 4) P.push({ bone: 'head', mat: 'bolt', part: 'gem', shape: 'ell', c: [0, 10.0, 6.5], r: [0.9, 1.1, 0.6] },
    spike('head', 'bolt', 'bolt', [0, 11.4, 0.4], [0, 15.4, -0.2], 1.3, 0.35));
  if (t === 5) P.push({ bone: 'head', mat: 'core', part: 'gem', shape: 'ell', c: [0, 10.0, 6.7], r: [1.3, 1.4, 0.6] },
    ...both((s, k) => [{ bone: 'head', mat: 'core', part: 'rod' + s, shape: 'ell', c: [5.4 * k, 17.0, -0.6], r: [0.9, 1.2, 0.9] }]));
  if (M) {                                                        // Mythic: a ring of four bolts floating around the rods
    P.push(...[[-2.4, 17.2], [2.4, 17.2], [-4.6, 13.6], [4.6, 13.6]].map(([x, y]) => spike('head', 'bolt', 'bolt', [x, y - 1.8, -3.0], [x * 1.1, y + 1.6, -3.4], 1.5, 0.35)));
    stamps.push({ bone: 'head', at: [0, 10.0, 7.0], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('stormweavehelm', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function stormweave(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('cloth', 'robe', { k: 1.0, kz: 1.0 }),
    ...arms({ up: 'cloth', fore: 'cloth', hand: t >= 2 ? 'sash' : 'dark' }, { k: 1.12 }),
    { bone: 'hips', mat: 'cloth', part: 'skirt', shape: 'cap', a: [0, 0.8, 0], b: [0, -3.2, 0], ra: 4.4, rb: 4.9 },
    { bone: 'spine', mat: 'sash', part: 'sash', shape: 'disc', c: [0, 3.0, 0], r: [5.1, 0.7, 4.1], weight: 2 },
    // the high stand collar: two tall fins up beside the neck
    ...both((s, k) => [{ bone: 'chest', mat: 'cloth', part: 'collar' + s, shape: 'ell', c: [4.0 * k, 5.2 + (t >= 2 ? 1.0 : 0), 0.4], r: [1.0, 2.0 + (t >= 2 ? 1.2 : 0), 2.8], rot: [0, 0, -0.15 * k] }]));
  if (t >= 2) P.push({ bone: 'spine', mat: 'sash', part: 'sash', shape: 'box', c: [0, -2.0, 3.9], h: [1.1, 2.6, 0.3], round: 0.25 },
    ...both((s, k) => [spike('upper' + s, 'dark', 'rod' + s, [1.4 * k, 1.8, -0.6], [2.2 * k, 5.0, -1.0], 1.1, 0.5)]));
  if (t >= 3) P.push({ bone: 'spine', mat: 'bronze', part: 'coil', shape: 'box', c: [0, 3.0, 4.05], h: [0.9, 0.7, 0.3], round: 0.2 },
    { bone: 'hips', mat: 'bronze', part: 'hem', shape: 'disc', c: [0, -3.0, 0], r: [4.95, 0.5, 4.5] },
    { bone: 'chest', mat: 'bronze', part: 'coil', shape: 'disc', c: [0, 3.9, 0.2], r: [4.4, 0.5, 3.5] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'bronze', part: 'rod' + s, shape: 'ell', c: [2.8 * k, 1.0, 1.7], r: [0.9, 0.9, 0.7] }]),
    ...both((s, k) => [{ bone: 'chest', mat: 'bronze', part: 'collar' + s, shape: 'ell', c: [4.5 * k, 7.0, 0.4], r: [0.45, 1.2, 2.5] }]));
  if (t >= 4) P.push({ bone: 'chest', mat: 'bolt', part: 'gem', shape: 'ell', c: [0, 3.6, 3.6], r: [0.8, 1.0, 0.5] },
    ...both((s, k) => [spike('upper' + s, 'bolt', 'rod' + s, [2.8 * k, 1.8, 0.4], [4.8 * k, 4.4, 0.4], 1.2, 0.4)]));
  if (t === 5) P.push({ bone: 'chest', mat: 'core', part: 'gem', shape: 'ell', c: [0, 1.4, 3.9], r: [0.9, 1.5, 0.5] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'core', part: 'rod' + s, shape: 'ell', c: [2.4 * k, 5.6, -1.0], r: [0.8, 1.0, 0.7] }]));
  if (M) {
    P.push(...both((s, k) => [spike('chest', 'bolt', 'bolt', [3.4 * k, 4.4, -3.2], [7.6 * k, 8.6, -4.4], 1.2, 0.12), spike('chest', 'bolt', 'bolt', [3.2 * k, 1.0, -3.2], [8.0 * k, 3.0, -4.4], 1.1, 0.12)]),
      { bone: 'chest', mat: 'bolt', part: 'gem', shape: 'ell', c: [0, 1.6, 3.9], r: [1.3, 1.5, 0.6] });
    stamps.push({ bone: 'chest', at: [0, 1.6, 4.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('stormweave', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function stormweaveboots(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('cloth', 'boot', { k: 1.0, len: 1.0, top: 0.2 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: t >= 2 ? 'sash' : 'dark', part: 'cuff' + s, shape: 'ell', c: [0, -0.1, 0], r: t >= 2 ? [2.5, 1.0, 2.5] : [2.2, 0.7, 2.2] }];
    if (t >= 3) L.push({ bone: 'foot' + s, mat: 'bronze', part: 'toe' + s, shape: 'ell', c: [0, -1.4, 3.4], r: [1.2, 0.7, 0.7] },
      { bone: 'shin' + s, mat: 'bronze', part: 'clasp' + s, shape: 'ell', c: [0, -1.5, 1.8], r: [0.7, 0.5, 0.4] });
    if (t >= 4) L.push(spike('shin' + s, 'bolt', 'bolt' + s, [1.9 * k, 0.4, -0.2], [3.2 * k, 3.0, -0.8], 0.8, 0.12),
      { bone: 'foot' + s, mat: 'bolt', part: 'bolt' + s, shape: 'ell', c: [0, -0.4, 3.4], r: [0.7, 0.6, 0.5] });
    if (t === 5) L.push({ bone: 'foot' + s, mat: 'core', part: 'heel' + s, shape: 'ell', c: [0, -0.9, -2.6], r: [1.0, 0.8, 0.7] });
    if (M) L.push(spike('foot' + s, 'bolt', 'bolt' + s, [0, -0.6, -2.4], [0, 1.6, -5.2], 0.9, 0.12));
    return L;
  });
  if (M) stamps.push({ bone: 'footR', at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] });
  return piece('stormweaveboots', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [stormweavehelm, stormweave, stormweaveboots]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
