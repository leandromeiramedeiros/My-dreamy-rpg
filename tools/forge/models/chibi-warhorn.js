'use strict';
// CHIBI WARHORN — the Greatarms companion (OFFHAND slot, worn with any hand item: loadout.md), a curved horn hung at the hero's left hip on a
// strap, the bell swung out to the side so it reads from the front and the back. Six SHAPE tiers, forged from 3D volumes (no hand-drawn pixels):
//   T1 Bonehorn    a plain bone horn on a leather strap
//   T2 Brasshorn   a brass horn, an iron strap ring
//   T3 Gilded      gold bands on the horn and a ruby boss on the strap
//   T4 Silverhorn  a silver horn, gold bands and bell rim, a sapphire boss, a tassel cord
//   T5 Radiant     a horn of light between gold bands and a gold bell rim
//   T6 Mythic      Galehorn: a night-silver horn, three wind arcs rolling out of the bell, a wind glow run on the strap boss
// Family `warhorn`; ids warhorn.t1 .. warhorn.t6. Hip socket on the `spine` bone; no pose (the horn follows the hips).
const { TIERS, metal, METAL, GOLD, STRAP, BONE, BRASS, DARK, RUBY, SAPPHIRE, CORE, WINDG, piece, glowOf, fine, cp, el } = require('./chibi-wpal.js');

const S = 'spine';
// the horn's spine: mouthpiece at the front of the hip, arcing out and down to the bell (x out, y up, z front)
const PT = [[3.6, 2.2, 4.0], [5.8, 1.6, 4.5], [7.6, 0.2, 3.8], [8.6, -1.8, 2.2], [8.6, -3.3, 0.3]];
const RW = t => [0.5, 0.9, 1.4, 2.0, 2.7].map((r, i) => i === 4 && t >= 4 ? r + 0.1 : r);

function warhorn(t) {
  const M = t === 6, R = RW(t);
  const mats = { horn: t === 1 ? ['#3a2e28', '#6a5848', '#8e7c62', '#b2a284'] : t === 2 ? BRASS : t === 3 ? BRASS : t === 4 ? metal(METAL[3]) : t === 5 ? CORE : metal(METAL[5]), strap: STRAP.ramp, gold: GOLD, iron: metal(METAL[1]), inside: ['#2a2238', '#3a3050', '#4e4268', '#6a5e8a'],
    boss: t === 3 ? RUBY : M ? WINDG : SAPPHIRE, gale: fine(WINDG), tassel: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'], glow: glowOf('wind') };
  const P = [];
  for (let i = 0; i < 4; i++) P.push(cp(S, 'horn', 'horn', PT[i], PT[i + 1], R[i], R[i + 1]));
  P.push(el(S, 'inside', 'inside', [PT[4][0], PT[4][1] - 0.5, PT[4][2] - 0.3], [R[4] * 0.8, 0.5, R[4] * 0.8]));              // the dark mouth of the bell
  // the strap: a loop from the belt over the horn's belly, and a short cord to the belt at the front
  P.push(cp(S, 'strap', 'strap', [4.4, 3.2, 3.6], [6.0, 1.9, 4.6], 0.45, 0.45), cp(S, 'strap', 'strap', [7.4, 1.3, 2.6], [5.6, 3.1, 1.0], 0.45, 0.45),
    cp(S, 'strap', 'strap', [3.0, 3.2, 3.4], [-3.0, 3.0, 3.9], 0.5, 0.5));
  if (t === 2) P.push(el(S, 'iron', 'ring', [6.0, 2.0, 4.8], [0.9, 0.9, 0.55]), el(S, 'iron', 'rim', PT[4], [R[4] + 0.2, 0.65, R[4] + 0.2]), el(S, 'iron', 'band', PT[2], [R[2] + 0.3, R[2] + 0.3, R[2] + 0.3]));
  if (t >= 3) P.push(el(S, 'gold', 'band', PT[1], [R[1] + 0.35, R[1] + 0.35, R[1] + 0.35]), el(S, 'gold', 'band', PT[3], [R[3] + 0.35, R[3] + 0.35, R[3] + 0.35]), el(S, 'boss', 'boss', [6.1, 2.1, 5.2], [0.9, 0.9, 0.55]));
  if (t === 3) P.push(el(S, 'gold', 'rim', PT[4], [R[4] + 0.2, 0.7, R[4] + 0.2]));
  if (t === 4) P.push(el(S, 'gold', 'rim', PT[4], [R[4] + 0.25, 0.75, R[4] + 0.25]), cp(S, 'tassel', 'tassel', [6.6, 0.9, 4.4], [6.3, -2.4, 4.6], 0.5, 0.3), cp(S, 'tassel', 'tassel', [6.6, 0.9, 4.4], [5.4, -2.0, 4.8], 0.45, 0.25));
  if (t === 5) P.push(el(S, 'gold', 'rim', PT[4], [R[4] + 0.25, 0.75, R[4] + 0.25]), el(S, 'gold', 'band', PT[2], [R[2] + 0.35, R[2] + 0.35, R[2] + 0.35]));
  if (M) P.push(el(S, 'horn', 'rim', PT[4], [R[4] + 0.25, 0.75, R[4] + 0.25]), el(S, 'horn', 'band', PT[2], [R[2] + 0.35, R[2] + 0.35, R[2] + 0.35]),         // three wind arcs roll out of the bell
    ...[0, 1, 2].map(i => cp(S, 'gale', 'gale', [PT[4][0] + 1.6 + i * 1.5, PT[4][1] - 1.2 - i * 1.1, PT[4][2] + 1.2 - i * 0.6], [PT[4][0] + 2.8 + i * 1.5, PT[4][1] - 2.2 - i * 1.1, PT[4][2] - 0.4 - i * 0.6], 0.7, 0.2)));
  const stamps = [];
  if (M) stamps.push({ bone: S, at: [6.1, 2.1, 5.55], n: [0, 0, 1], facing: 0.2, on: 'boss', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  return piece('warhorn', 'offhand', t, { bias: 0.2, mats, prims: P, stamps });
}

const pieces = {};
for (const t of TIERS) { const p = warhorn(t); pieces[p.id] = p; }
module.exports = { pieces };
