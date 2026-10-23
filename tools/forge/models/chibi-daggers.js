'use strict';
// CHIBI DAGGERS — the Shadows pair (class 'shadow': crouch, cross-slash left, cross-slash right, double stab), six SHAPE tiers on the
// chibi rig, forged from 3D volumes (no hand-drawn pixels). One piece, a dagger on the `weapon` bone AND on the `offhand` bone:
//   T1 Knives    two plain iron knives, a bar guard
//   T2 Daggers   steel blades, a wider guard, a pommel knob
//   T3 Gilded    gold guards and pommels, a ruby in each pommel
//   T4 Kris      curved silver blades curling inward, gold wing guards, sapphire pommels, a plume on each
//   T5 Radiant   blades of light, gold wing guards with rays
//   T6 Mythic    Hoarfang: night-forged serrated blades, frost shards off the guard, a frost glow run on each blade
// Family `daggers`; ids daggers.t1 .. daggers.t6.
const { TIERS, metal, METAL, GOLD, LEATHER, RUBY, SAPPHIRE, CORE, FROSTG, piece, glowOf, holdPose, fine, cp, el } = require('./chibi-wpal.js');

function dagger(B, t, len) {
  const M = t === 6, s = B === 'weapon' ? 1 : -1, P = [];                // s: which way the blade curls (inward, toward the body's middle)
  P.push(cp(B, 'grip', 'hilt', [0, -1.4, 0], [0, 1.2, 0], 0.62, 0.62), el(B, 'guard', 'pommel', [0, -1.9, 0], [t === 1 ? 0.8 : 0.95, 0.85, t === 1 ? 0.8 : 0.95]));
  if (t <= 3 || t === 5) P.push(cp(B, 'blade', 'blade', [0, 1.8, 0], [0, len, 0], t === 5 ? 1.0 : 1.1, 0.3));
  if (t === 5) P.push(cp(B, 'core', 'blade', [0, 2.0, 0], [0, len - 0.6, 0], 1.25, 0.4));
  if (t >= 4 && t !== 5) {                                                // a curved blade: two segments bending toward the middle
    const m = len * 0.55;
    P.push(cp(B, 'blade', 'blade', [0, 1.8, 0], [0.6 * s, m, 0], 1.1, 0.95), cp(B, 'blade', 'blade', [0.6 * s, m, 0], [1.9 * s, len, 0], 0.95, 0.28));
  }
  if (t === 1) P.push(cp(B, 'guard', 'guard', [-1.9, 1.7, 0], [1.9, 1.7, 0], 0.5, 0.5));
  if (t === 2) P.push(cp(B, 'guard', 'guard', [-2.4, 1.7, 0], [2.4, 1.7, 0], 0.55, 0.55));
  if (t === 3) P.push(cp(B, 'gold', 'guard', [-2.7, 1.8, 0], [2.7, 1.8, 0], 0.55, 0.5), el(B, 'gem', 'gem', [0, -2.1, 0.5], [0.55, 0.55, 0.5]), cp(B, 'gold', 'band', [0, 0.1, 0], [0, 0.8, 0], 0.8, 0.8));
  if (t === 4) P.push(cp(B, 'gold', 'guard', [-2.9, 1.7, 0], [2.9, 2.0, 0], 0.55, 0.5), el(B, 'gem', 'gem', [0, -2.1, 0.5], [0.6, 0.6, 0.5]), el(B, 'gem', 'gem', [0, 2.3, 0.7], [0.55, 0.65, 0.5]),
    cp(B, 'plume', 'plume', [0.2, -2.2, 0], [0.5 * s, -5.0, 0.3], 0.6, 0.3), cp(B, 'gold', 'band', [0, 0.1, 0], [0, 0.8, 0], 0.8, 0.8));
  if (t === 5) P.push(...[1, -1].flatMap(k => [cp(B, 'wing', 'wing', [0.6 * k, 1.7, 0], [3.0 * k, 2.8, 0], 0.6, 0.3), cp(B, 'wing', 'wing', [3.0 * k, 2.8, 0], [3.6 * k, 4.6, 0], 0.4, 0.12)]), el(B, 'gold', 'hilt', [0, 1.6, 0], [0.9, 0.7, 0.9]));
  if (M) {                                                                 // Hoarfang: a dark curved blade with a serrated back, frost shards at the guard
    const m = len * 0.55;
    P.push(cp(B, 'blade', 'blade', [0, 1.8, 0], [0.6 * s, m, 0], 1.15, 1.0), cp(B, 'blade', 'blade', [0.6 * s, m, 0], [1.9 * s, len, 0], 1.0, 0.28), cp(B, 'guard', 'guard', [-2.3, 1.7, 0], [2.3, 1.7, 0], 0.55, 0.5),
      ...[0.34, 0.5, 0.66].map(f => { const y = len * f + 0.8, x = (y < m ? 0.6 * (y - 1.8) / (m - 1.8) : 0.6 + 1.3 * (y - m) / (len - m)) * s; return cp(B, 'frost', 'tooth', [x - 0.6 * s, y, 0], [x - 1.9 * s, y + 1.1, 0], 0.5, 0.12); }),
      ...[1, -1].map(k => cp(B, 'frost', 'shard', [1.0 * k, 1.9, 0], [3.4 * k, 4.2, 0], 0.75, 0.12)), el(B, 'gem', 'gem', [0, -2.1, 0.5], [0.65, 0.65, 0.55]), cp(B, 'guard', 'band', [0, 0.1, 0], [0, 0.8, 0], 0.8, 0.8));
  }
  return P;
}

function daggers(t) {
  const M = t === 6, len = [8.5, 9.0, 9.5, 10.0, 10.5, 11.0][t - 1];
  const mats = { blade: t === 5 ? fine(CORE) : M ? metal(METAL[5]) : metal(METAL[Math.min(t, 4) - 1]), guard: t === 1 ? metal(METAL[0]) : t === 2 ? metal(METAL[1]) : M ? metal(METAL[4]) : GOLD, grip: LEATHER, gold: GOLD,
    gem: t === 3 ? RUBY : M ? FROSTG : SAPPHIRE, core: fine(CORE), wing: fine(GOLD), frost: FROSTG, plume: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'], glow: glowOf('frost') };
  const P = [...dagger('weapon', t, len), ...dagger('offhand', t, len)], stamps = [];
  if (M) for (const B of ['weapon', 'offhand']) stamps.push({ bone: B, at: [0.3, 5.4, 1.0], n: [0, 0, 1], facing: 0.2, on: 'blade', px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  return piece('daggers', 'weapon', t, { mats, prims: P, stamps }, { class: 'shadow', sockets: { tip: { bone: 'weapon', at: [0, len, 0] } },
    pose: holdPose('one', a => { const w = a === 'cast' ? [-0.3, -0.6, 0.75] : a === 'hit' ? [-0.45, -0.5, 0.75] : a === 'dash' ? [-0.3, -0.2, -0.93] : [-0.4, -0.75, 0.5]; return { weapon: { aim: w }, offhand: { aim: [-w[0], w[1], w[2]] } }; }) });
}

const pieces = {};
for (const t of TIERS) { const p = daggers(t); pieces[p.id] = p; }
module.exports = { pieces };
