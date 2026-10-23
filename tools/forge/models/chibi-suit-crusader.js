'use strict';
// CHIBI SUIT CRUSADER — heavy suit 2 (holy): a closed great helm with a cross band, a long tabard over plate, mail sleeves, sabatons.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Pilgrim   grey iron: a plain great helm with a visor slit, linen tabard, small pauldrons, plain boots
//   T2 Footman   steel + cream tabard, a helm crest ridge, a belt, tassets, cross band on the helm
//   T3 Knight    + gold trim, a gold cross on the tabard, plume, pauldron rims, gold sabaton caps
//   T4 Templar   bright steel, a holy gem at the brow, a gorget, tall plume, pauldron crests, spurs
//   T5 Radiant   white-gold plate, flat light cores (cross, helm sunburst, pauldron eyes, heels)
//   T6 Mythic    Dawnguard Aureole: black-gold plate, a floating halo ring, wing fins, one holy glow run
// Families: crusaderhelm / crusader / crusaderboots; ids <family>.t1 .. .t6.
const { mk, flat, cloth, torso, arms, boots, spike, piece, both } = require('./chibi-suit-lib.js');
const { GOLD, GLOW, HOLYG } = require('./chibi-palette.js');

const STEEL = ['#6a6a7c', '#7c829c', '#9298b4', '#aeb6d6', '#e4e6f4', '#403c58'];
const TAB = ['#8e8268', '#b4a888', '#cabe9e', '#ddd2b6', '#fffaf0', '#a8922c'];
const matsOf = t => ({ metal: mk(STEEL[t - 1], t >= 5 ? '#ffffff' : null), dark: mk('#26243a'), gold: GOLD, cloth: cloth(TAB[t - 1]), gem: HOLYG, core: flat('#fff4c8'), glow: flat(GLOW.holy) });

function crusaderhelm(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push({ bone: 'head', mat: 'metal', part: 'helm', shape: 'ell', c: [0, 6.5, -0.3], r: [7.0, 6.8, 6.7], clip: [0, -1, 0, 0.0] },       // the whole head, face closed
    { bone: 'head', mat: 'dark', part: 'visor', shape: 'ell', c: [0, 6.0, 5.9], r: [4.9, 1.1, 1.1] },                       // the eye slit
    { bone: 'head', mat: 'metal', part: 'neck', shape: 'ell', c: [0, 0.6, -0.2], r: [5.4, 1.5, 5.2] });
  if (t >= 2) P.push({ bone: 'head', mat: 'metal', part: 'crest', shape: 'ell', c: [0, 2.8, 6.2], r: [2.6, 2.2, 1.0] },
    { bone: 'head', mat: t >= 3 ? 'gold' : 'metal', part: 'band', shape: 'box', c: [0, 6.0, 6.7], h: [0.55, 4.6, 0.4], round: 0.2 },
    { bone: 'head', mat: 'metal', part: 'crest', shape: 'ell', c: [0, 12.6, -0.8], r: [0.6, 1.0, 5.2] });
  if (t >= 3) P.push({ bone: 'head', mat: 'gold', part: 'trim', shape: 'disc', c: [0, 9.6, -0.2], r: [7.05, 0.5, 6.7] },
    spike('head', 'cloth', 'plume', [0, 13.0, -2.6], [0, 16.0, -7.2], 1.4, 0.2));
  if (t >= 4) P.push({ bone: 'head', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 10.4, 6.0], r: [1.0, 1.0, 0.6] },
    { bone: 'head', mat: 'gold', part: 'trim', shape: 'ell', c: [0, 6.2, 6.6], r: [4.8, 0.45, 0.4] },
    { bone: 'head', mat: 'gold', part: 'trim', shape: 'disc', c: [0, 3.2, -0.2], r: [6.6, 0.45, 6.2] });
  if (t === 5) P.push({ bone: 'head', mat: 'core', part: 'gem', shape: 'ell', c: [0, 10.4, 6.2], r: [1.5, 1.5, 0.6] },
    ...both((s, k) => [{ bone: 'head', mat: 'core', part: 'trim', shape: 'ell', c: [6.8 * k, 6.6, 1.0], r: [0.7, 1.8, 1.6] }]),
    { bone: 'head', mat: 'core', part: 'plume', shape: 'ell', c: [0, 15.0, -5.6], r: [0.9, 1.6, 1.2] });
  if (M) {                                                        // Mythic: the floating halo, gold ring above the crest
    P.push({ bone: 'head', mat: 'gold', part: 'halo', shape: 'disc', c: [0, 16.4, -0.4], r: [6.4, 0.55, 6.0] },
      { bone: 'head', mat: 'gem', part: 'halo', shape: 'disc', c: [0, 16.4, -0.4], r: [4.6, 0.6, 4.2] });
    stamps.push({ bone: 'head', at: [0, 10.4, 6.6], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('crusaderhelm', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function crusader(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('metal', 'plate', { k: 1.06, kz: 1.04 }),
    ...arms({ up: t >= 3 ? 'metal' : 'cloth', fore: 'metal', hand: 'dark' }, { k: 1.08 }),
    { bone: 'chest', mat: 'metal', part: 'gorget', shape: 'ell', c: [0, 4.3, 0.1], r: [4.2, 1.4, 3.3] },
    { bone: 'spine', mat: 'dark', part: 'belt', shape: 'disc', c: [0, 3.1, 0], r: [5.0, 0.6, 4.0], weight: 2 },
    // the tabard: a long cloth panel hanging down the front, over the belt
    { bone: 'chest', mat: 'cloth', part: 'tabard', shape: 'box', c: [0, -0.6, 3.75], h: [3.0, 5.3, 0.3], round: 0.3 },
    { bone: 'spine', mat: 'cloth', part: 'tabard', shape: 'box', c: [0, -2.4, 3.8], h: [2.8, 2.6, 0.3], round: 0.3 },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'metal', part: 'pauldron' + s, shape: 'ell', c: [0.5 * k, 0.5, 0], r: [3.0, 2.5, 2.9], clip: [0, -1, 0, 0.9] }]));
  if (t >= 2) P.push(...both((s, k) => [{ bone: 'thigh' + s, mat: 'metal', part: 'tasset' + s, shape: 'ell', c: [0.1 * k, -1.2, 0.5], r: [2.3, 2.1, 2.4], clip: [0, -1, 0, 2.0] }]));
  if (t >= 3) P.push({ bone: 'chest', mat: 'gold', part: 'cross', shape: 'box', c: [0, 1.8, 4.05], h: [0.55, 2.3, 0.25], round: 0.1 },
    { bone: 'chest', mat: 'gold', part: 'cross', shape: 'box', c: [0, 2.6, 4.05], h: [1.6, 0.55, 0.25], round: 0.1 },
    { bone: 'spine', mat: 'gold', part: 'trim', shape: 'box', c: [0, 3.1, 4.05], h: [0.9, 0.7, 0.3], round: 0.2 },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'gold', part: 'trim', shape: 'disc', c: [0.5 * k, -0.3, 0], r: [3.1, 0.38, 3.0] }]));
  if (t >= 4) P.push({ bone: 'chest', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 3.6, 3.6], r: [0.8, 0.8, 0.5] },
    ...both((s, k) => [spike('upper' + s, 'gold', 'trim', [2.4 * k, 2.4, 0.2], [4.0 * k, 4.6, 0.0], 0.8, 0.15),
      { bone: 'chest', mat: 'gold', part: 'trim', shape: 'disc', c: [0, -2.9, 0.3], r: [4.9, 0.45, 3.8] }]));
  if (t === 5) P.push({ bone: 'chest', mat: 'core', part: 'cross', shape: 'box', c: [0, 1.8, 4.3], h: [0.7, 2.5, 0.25], round: 0.1 },
    { bone: 'chest', mat: 'core', part: 'cross', shape: 'box', c: [0, 2.6, 4.3], h: [1.8, 0.7, 0.25], round: 0.1 },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'core', part: 'trim', shape: 'ell', c: [3.0 * k, 0.9, 2.3], r: [0.8, 0.8, 0.5] }]));
  if (M) {
    P.push(...both((s, k) => [spike('chest', 'gem', 'wing', [2.4 * k, 3.4, -3.2], [6.0 * k, 7.2, -4.8], 1.2, 0.12), spike('chest', 'gem', 'wing', [2.6 * k, 1.8, -3.2], [7.0 * k, 3.8, -4.8], 1.1, 0.12)]),
      { bone: 'chest', mat: 'gem', part: 'cross', shape: 'ell', c: [0, 2.2, 4.2], r: [1.2, 1.2, 0.5] });
    stamps.push({ bone: 'chest', at: [0, 2.2, 4.7], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('crusader', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function crusaderboots(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('metal', 'boot', { k: 1.1, len: 1.08 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: 'dark', part: 'cuff' + s, shape: 'ell', c: [0, -0.4, 0], r: [2.1, 0.6, 2.1] },
      { bone: 'shin' + s, mat: 'metal', part: 'knee' + s, shape: 'ell', c: [0, 0.3, 0.7], r: [1.5, 1.3, 1.3] }];
    if (t >= 2) L.push({ bone: 'foot' + s, mat: 'dark', part: 'toe' + s, shape: 'ell', c: [0, -1.6, 3.3], r: [1.3, 0.9, 0.7] });
    if (t >= 3) L.push({ bone: 'shin' + s, mat: 'gold', part: 'knee' + s, shape: 'disc', c: [0, 0.0, 0.7], r: [1.65, 0.36, 1.45] },
      { bone: 'shin' + s, mat: 'gold', part: 'cuff' + s, shape: 'disc', c: [0, -2.0, 0.1], r: [2.1, 0.38, 2.05] });
    if (t >= 4) L.push({ bone: 'foot' + s, mat: 'gem', part: 'boot' + s, shape: 'ell', c: [0, -0.4, 2.8], r: [0.6, 0.6, 0.5] },
      spike('foot' + s, 'gold', 'fin' + s, [0, -0.6, -2.4], [0, 0.4, -4.4], 0.7, 0.12));
    if (t === 5) L.push({ bone: 'foot' + s, mat: 'core', part: 'boot' + s, shape: 'ell', c: [1.9 * k, -0.9, 1.0], r: [0.35, 0.55, 0.9] },
      { bone: 'foot' + s, mat: 'core', part: 'fin' + s, shape: 'ell', c: [0, -0.6, -2.7], r: [1.0, 0.8, 0.7] });
    if (M) L.push(spike('foot' + s, 'gem', 'fin' + s, [1.2 * k, 0.0, -2.2], [3.4 * k, 2.6, -4.2], 0.9, 0.12));
    return L;
  });
  if (M) stamps.push(...both(s => [{ bone: 'foot' + s, at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] }]));
  return piece('crusaderboots', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [crusaderhelm, crusader, crusaderboots]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
