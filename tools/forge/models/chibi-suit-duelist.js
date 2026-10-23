'use strict';
// CHIBI SUIT DUELIST — medium suit (blade): a plumed wide-brim hat, a short cape-coat with a baldric, cuffed boots.
// Forged from 3D volumes (no hand-drawn pixels), six SHAPE tiers each keeping the one below:
//   T1 Fencer    drab brown-red: a felt hat, a plain coat, a baldric, folded boots
//   T2 Cavalier  crimson coat, a one-shoulder half cape, a hat plume, coat tails, gold-less cuffs
//   T3 Swordsman + gold trim, a second feather, brass buttons, boot clasps, a hat band
//   T4 Duellist  bright crimson, a sapphire hat gem and baldric gem, a three-feather plume, a long cape
//   T5 Radiant   white-silk coat with flat silver-light cores (hat gem, button, heel)
//   T6 Mythic    Last Flourish: night-crimson, a fan of floating feathers, blade-wing cape tips, one slash glow run
// Families: duelisthelm / duelist / duelistboots; ids <family>.t1 .. .t6.
const { mk, flat, gem, cloth, torso, arms, boots, dome, spike, piece, both } = require('./chibi-suit-lib.js');
const { LEATHER, GLOW } = require('./chibi-palette.js');

const COAT = ['#6e5a58', '#8e4a4a', '#a83a44', '#c82e48', '#f6e8ec', '#4a1a2a'];
const CAPE = ['#4e4e62', '#3a4a78', '#3a50a0', '#3a5cc0', '#dce4ff', '#1a1e48'];
const PLM = ['#8a8a98', '#d8d0c0', '#e6dcc8', '#f2e8d4', '#d8e8ff', '#b894ff'];
const matsOf = t => ({ coat: cloth(COAT[t - 1]), cape: cloth(CAPE[t - 1]), plume: cloth(PLM[t - 1]), leather: LEATHER, gold: mk('#e0b840'), gem: gem('#3a8cff'), core: flat('#f4f8ff'), glow: flat(GLOW.slash), dark: cloth('#2c2434') });

function duelisthelm(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...dome('coat', 'hat', { k: 1.05, ky: 1.06 }),
    { bone: 'head', mat: 'coat', part: 'brim', shape: 'ell', c: [0, 9.4, 1.2], r: [8.2, 0.9, 6.8] });
  if (t >= 2) P.push(spike('head', 'plume', 'plume', [-4.6, 10.6, -0.4], [-6.4, 14.4, -5.6], 1.6, 0.5));
  if (t >= 3) P.push({ bone: 'head', mat: 'gold', part: 'band', shape: 'ell', c: [0, 10.2, 0.8], r: [6.0, 0.8, 5.4] },
    spike('head', 'plume', 'plume', [-4.6, 10.6, -0.4], [-8.4, 12.4, -4.2], 1.3, 0.5));
  if (t >= 4) P.push({ bone: 'head', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 9.8, 6.8], r: [1.1, 1.1, 0.7] },
    spike('head', 'plume', 'plume', [-4.6, 10.6, -0.4], [-4.0, 17.0, -4.0], 1.4, 0.5));
  if (t === 5) P.push({ bone: 'head', mat: 'core', part: 'gem', shape: 'ell', c: [0, 9.8, 7.0], r: [1.4, 1.4, 0.6] });
  if (M) {                                                        // Mythic: a fan of feathers and a blade crest
    P.push(...[-1, 0, 1].map(x => spike('head', 'plume', 'fan', [-4.6, 10.8, -0.6], [-6.0 + x * 2.8, 16.8 - Math.abs(x) * 1.2, -5.6], 1.4, 0.4)),
      spike('head', 'gem', 'blade', [0, 11.6, 0.6], [0, 17.2, -0.6], 1.4, 0.3));
    stamps.push({ bone: 'head', at: [0, 9.8, 7.5], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('duelisthelm', 'head', t, { bias: 0.3, mats, prims: P, stamps }, { hides: ['hair', 'bangs', 'hairSide'] });
}

function duelist(t) {
  const M = t === 6, mats = matsOf(t), P = [], stamps = [];
  P.push(...torso('coat', 'coat', { k: 1.02, kz: 1.02 }),
    ...arms({ up: 'coat', fore: 'coat', hand: 'leather' }, { k: 1.08 }),
    { bone: 'hips', mat: 'coat', part: 'tails', shape: 'cap', a: [0, 0.8, 0], b: [0, -2.6, 0], ra: 4.5, rb: 4.9 },
    { bone: 'chest', mat: 'leather', part: 'collar', shape: 'ell', c: [0, 4.2, 0.2], r: [4.6, 1.5, 3.6] },
    { bone: 'spine', mat: 'leather', part: 'belt', shape: 'disc', c: [0, 3.0, 0], r: [5.15, 0.6, 4.15], weight: 2 },
    { bone: 'chest', mat: 'leather', part: 'baldric', shape: 'cap', a: [-4.2, 4.0, 2.7], b: [4.2, -2.4, 3.5], ra: 0.75, rb: 0.75 });
  if (t >= 2) P.push({ bone: 'chest', mat: 'cape', part: 'cape', shape: 'ell', c: [-3.4, 3.6, -0.6], r: [3.4, 3.0, 3.9], clip: [0, -1, 0, 1.2] },
    ...both((s, k) => [{ bone: 'fore' + s, mat: 'leather', part: 'cuff' + s, shape: 'cap', a: [0, -0.1, 0], b: [0, -1.4, 0], ra: 1.78, rb: 1.74 }]));
  if (t >= 3) P.push({ bone: 'hips', mat: 'gold', part: 'trim', shape: 'disc', c: [0, -2.6, 0], r: [4.95, 0.4, 4.5] },
    { bone: 'spine', mat: 'gold', part: 'trim', shape: 'box', c: [0, 3.0, 4.05], h: [0.9, 0.7, 0.3], round: 0.2 },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'gold', part: 'trim', shape: 'ell', c: [0.5 * k, 0.9, 0], r: [3.3, 1.5, 3.2], clip: [0, -1, 0, 0.3] }]),
    ...[1.6, -0.4].map(y => ({ bone: 'chest', mat: 'gold', part: 'trim', shape: 'ell', c: [0, y, 3.9], r: [0.6, 0.55, 0.4] })));
  if (t >= 4) P.push({ bone: 'chest', mat: 'gem', part: 'gem', shape: 'ell', c: [-2.2, 3.5, 3.6], r: [0.8, 0.9, 0.5] },
    { bone: 'chest', mat: 'cape', part: 'cape', shape: 'ell', c: [-3.8, 1.6, -1.4], r: [3.0, 3.2, 3.2], clip: [0, -1, 0, 3.0] });
  if (t === 5) P.push({ bone: 'chest', mat: 'core', part: 'gem', shape: 'ell', c: [0, 1.2, 4.1], r: [0.9, 1.1, 0.5] },
    { bone: 'hips', mat: 'core', part: 'trim', shape: 'disc', c: [0, -2.6, 0], r: [5.0, 0.5, 4.55] },
    ...both((s, k) => [{ bone: 'upper' + s, mat: 'core', part: 'trim', shape: 'ell', c: [0.5 * k, 1.0, 0], r: [3.4, 1.7, 3.3], clip: [0, -1, 0, 0.3] }]));
  if (M) {
    P.push(spike('chest', 'gem', 'blade', [-5.0, 4.0, -3.6], [-9.6, 8.6, -5.0], 1.5, 0.2), spike('chest', 'gem', 'blade', [-5.0, 0.4, -3.6], [-10.4, 3.0, -5.0], 1.4, 0.2),
      spike('chest', 'gem', 'blade', [5.0, 4.0, -3.6], [9.6, 8.6, -5.0], 1.5, 0.2),
      { bone: 'chest', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 1.4, 3.9], r: [1.3, 1.5, 0.6] });
    stamps.push({ bone: 'chest', at: [0, 1.4, 4.4], n: [0, 0, 1], facing: 0.3, px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  }
  return piece('duelist', 'chest', t, { bias: 0.7, mats, prims: P, stamps });
}

function duelistboots(t) {
  const M = t === 6, mats = matsOf(t), stamps = [];
  const P = both((s, k) => {
    const L = [...boots('leather', 'boot', { k: 1.04, len: 1.0, top: 0.4 }).filter(p => p.bone.endsWith(s)),
      { bone: 'shin' + s, mat: t >= 2 ? 'coat' : 'leather', part: 'cuff' + s, shape: 'ell', c: [0, 0.0, 0], r: t >= 2 ? [2.7, 1.3, 2.7] : [2.4, 0.9, 2.4] }];
    if (t >= 3) L.push({ bone: 'foot' + s, mat: 'gold', part: 'toe' + s, shape: 'ell', c: [0, -1.4, 3.4], r: [1.2, 0.7, 0.7] },
      { bone: 'shin' + s, mat: 'gold', part: 'clasp' + s, shape: 'ell', c: [0, -1.5, 1.8], r: [0.7, 0.5, 0.4] });
    if (t >= 4) L.push({ bone: 'shin' + s, mat: 'gem', part: 'gem' + s, shape: 'ell', c: [0, 0.2, 2.5], r: [0.6, 0.6, 0.5] },
      spike('shin' + s, 'plume', 'tail' + s, [1.9 * k, 0.4, -0.2], [3.4 * k, 3.0, -1.0], 1.2, 0.4));
    if (t === 5) L.push({ bone: 'foot' + s, mat: 'core', part: 'heel' + s, shape: 'ell', c: [0, -0.9, -2.6], r: [1.0, 0.8, 0.7] });
    if (M) L.push(spike('foot' + s, 'gem', 'tail' + s, [0, -0.6, -2.4], [0, 1.6, -5.2], 1.0, 0.2));
    return L;
  });
  if (M) stamps.push({ bone: 'footR', at: [0, 0, 3], n: [0, 0, 1], facing: 0.2, px: [[0, 0, 'glow'], [1, 0, 'glow']] });
  return piece('duelistboots', 'boots', t, { bias: 0.3, mats, prims: P, stamps });
}

const pieces = {};
for (const t of [1, 2, 3, 4, 5, 6]) for (const fn of [duelisthelm, duelist, duelistboots]) { const p = fn(t); pieces[p.id] = p; }
module.exports = { pieces };
