'use strict';
// CHIBI RAPIER — the long thin Blades one-hander (class 'sword', Parry), six SHAPE tiers on the chibi rig, forged from 3D volumes
// (no hand-drawn pixels). A blade longer and finer than the sword's, a guard that grows every tier:
//   T1 Duelling  an iron needle, a plain cross guard and a leather grip
//   T2 Swept     a steel blade, a swept knuckle bow from guard to pommel
//   T3 Cup       a gold cup guard, gold quillons, a ruby pommel
//   T4 Lace      a silver blade, a gold basket hilt, a sapphire, two plumes
//   T5 Radiant   a blade of light with a pair of gold wings for a guard
//   T6 Mythic    Zephyr: a night-forged blade, a wind-feather guard and a teal glow run on the forte
// Family `rapier`; ids rapier.t1 .. rapier.t6.
const { TIERS, metal, METAL, GOLD, LEATHER, RUBY, SAPPHIRE, CORE, FEATHER, WINDG, piece, glowOf, holdPose, fine, cp, el, dc } = require('./chibi-wpal.js');

function rapier(t) {
  const M = t === 6, len = [15.0, 16.0, 16.5, 17.0, 17.5, 18.0][t - 1], W = 'weapon';
  const mats = { blade: fine(metal(METAL[t - 1])), guard: t === 1 ? metal(METAL[0]) : t === 2 ? metal(METAL[1]) : t >= 3 && !M ? GOLD : metal(METAL[5]), grip: LEATHER, gold: GOLD, gem: t === 3 ? RUBY : M ? WINDG : SAPPHIRE,
    core: fine(CORE), wing: fine(M ? WINDG : GOLD), feather: FEATHER, plume: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'], glow: glowOf('wind') };
  const P = [cp(W, 'grip', 'hilt', [0, -1.5, 0], [0, 1.4, 0], 0.62, 0.62), cp(W, 'blade', 'blade', [0, 2.3, 0], [0, len, 0], t === 5 ? 1.05 : 0.95, 0.3)];
  if (t === 5) P.push(cp(W, 'core', 'blade', [0, 2.6, 0], [0, len - 0.6, 0], 1.25, 0.4));
  P.push(el(W, 'guard', 'pommel', [0, -2.1, 0], [0.9, 0.85, 0.9]));
  if (t <= 2) P.push(cp(W, 'guard', 'guard', [-2.6, 1.9, 0], [2.6, 1.9, 0], 0.55, 0.55));
  if (t === 2) P.push(cp(W, 'guard', 'bow', [2.6, 1.9, 0], [2.4, -0.4, 0.2], 0.5, 0.45), cp(W, 'guard', 'bow', [2.4, -0.4, 0.2], [0.6, -2.0, 0], 0.45, 0.45));
  if (t === 3) P.push(el(W, 'guard', 'cup', [0, 1.7, 0], [2.5, 1.1, 2.5]), cp(W, 'guard', 'guard', [-3.4, 2.2, 0], [3.4, 2.2, 0], 0.5, 0.5), el(W, 'gem', 'gem', [0, -2.5, 0], [0.8, 0.8, 0.8]));
  if (t === 4) P.push(el(W, 'guard', 'cup', [0, 1.7, 0], [2.7, 1.3, 2.7]), cp(W, 'guard', 'guard', [-3.6, 2.4, 0], [3.6, 2.4, 0], 0.5, 0.45),
    cp(W, 'guard', 'bow', [3.0, 2.2, 0], [2.4, -0.6, 0.3], 0.5, 0.45), cp(W, 'guard', 'bow', [2.4, -0.6, 0.3], [0.6, -2.0, 0], 0.45, 0.45), el(W, 'gem', 'gem', [0, 2.8, 0.9], [0.8, 0.9, 0.7]), el(W, 'gem', 'gem', [0, -2.6, 0], [0.8, 0.8, 0.8]),
    ...[1, -1].map(k => cp(W, 'plume', 'plume', [1.2 * k, -2.0, 0.2], [2.4 * k, -4.6, 0.5], 0.6, 0.35)));
  if (t === 5) P.push(...[1, -1].flatMap(k => [cp(W, 'wing', 'wing', [0.8 * k, 2.0, 0], [3.2 * k, 3.6, 0], 0.7, 0.5), cp(W, 'wing', 'wing', [3.2 * k, 3.6, 0], [4.4 * k, 6.2, 0], 0.5, 0.12),
    cp(W, 'wing', 'wing', [0.8 * k, 1.6, 0], [3.6 * k, 1.2, 0], 0.6, 0.12)]), el(W, 'gold', 'hilt', [0, 2.0, 0], [1.2, 0.9, 1.2]));
  const stamps = [];
  if (M) {                                                      // Zephyr: wind-feather wings and a ring of teal along the forte
    P.push(...[1, -1].flatMap(k => [cp(W, 'wing', 'wing', [0.8 * k, 2.0, 0], [3.4 * k, 3.4, 0], 0.7, 0.5), cp(W, 'wing', 'wing', [3.4 * k, 3.4, 0], [4.6 * k, 6.4, 0], 0.5, 0.12),
      cp(W, 'wing', 'wing', [0.8 * k, 1.5, 0], [4.0 * k, 0.6, 0], 0.6, 0.12), cp(W, 'wing', 'wing', [0.8 * k, 1.2, 0], [3.2 * k, -1.6, 0], 0.55, 0.12)]),
      el(W, 'guard', 'hilt', [0, 2.0, 0], [1.2, 0.9, 1.2]), el(W, 'gem', 'gem', [0, -2.5, 0], [0.85, 0.85, 0.85]));
    stamps.push({ bone: W, at: [0, 6.0, 0.8], n: [0, 0, 1], facing: 0.2, on: 'blade', px: [[0, -1, 'glow'], [0, 0, 'glow'], [0, 1, 'glow']] });
  }
  return piece('rapier', 'weapon', t, { mats, prims: P, stamps }, { class: 'sword', sockets: { tip: { bone: W, at: [0, len, 0] } }, pose: holdPose('one') });
}

const pieces = {};
for (const t of TIERS) { const p = rapier(t); pieces[p.id] = p; }
module.exports = { pieces };
