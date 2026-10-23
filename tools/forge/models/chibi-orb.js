'use strict';
// CHIBI ORB — the Foci one-hander held in the palm (class 'focus': lift, thrust, hold the spell), six SHAPE tiers on the chibi rig,
// forged from 3D volumes (no hand-drawn pixels). A sphere in a claw cup; the cage and the sphere grow every tier:
//   T1 Glass     a clear glass sphere in three wooden claws
//   T2 Caged     a steel cup and claws, a cloudy sphere
//   T3 Gilded    a gold cup and claws, a ruby heart in the sphere
//   T4 Starorb   a silver cup, a sapphire sphere, gold wing claws and a tassel
//   T5 Radiant   a sphere of light with a crown of gold rays
//   T6 Mythic    Eventide: a night-forged cup, an arcane sphere with three orbiting shards and a glow run on the sphere
// Family `orb`; ids orb.t1 .. orb.t6.
const { TIERS, metal, METAL, GOLD, WOOD, LEATHER, RUBY, SAPPHIRE, CORE, ARCG, piece, glowOf, holdPose, fine, cp, el, dc, spokes } = require('./chibi-wpal.js');

function orb(t) {
  const M = t === 6, W = 'weapon', r = [3.3, 3.4, 3.5, 3.7, 3.8, 3.8][t - 1], CY = 5.4 + (r - 3.0);
  const glass = { ramp: ['#22324a', '#3a587e', '#5f86ae', '#9cc2e0'], lift: 1, spec: 0.9 };
  const mats = { cup: t === 1 ? WOOD : M ? metal(METAL[5]) : t === 5 ? GOLD : metal(METAL[Math.min(t, 4) - 1]), grip: LEATHER, gold: GOLD,
    sphere: t === 1 ? glass : t === 2 ? { ramp: ['#2a3550', '#465a78', '#6a7f9c', '#98aac4'], lift: 1, spec: 0.9 } : t === 3 ? RUBY : t === 4 ? SAPPHIRE : t === 5 ? CORE : ARCG,
    ray: fine(t === 5 ? CORE : GOLD), shard: ARCG, tassel: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'], glow: glowOf('arcane') };
  const P = [cp(W, 'grip', 'grip', [0, -1.6, 0], [0, 1.2, 0], 0.98, 0.98), cp(W, 'cup', 'stem', [0, 1.0, 0], [0, 2.4, 0], 1.0, 1.4), el(W, 'sphere', 'sphere', [0, CY, 0], [r, r, r]),
    ...[0, 1, 2].map(i => { const a = i * 2.094 + 0.5; return cp(W, 'cup', 'claw', [Math.cos(a) * 1.3, 2.2, Math.sin(a) * 1.3], [Math.cos(a) * (r + 0.5), CY - 0.2, Math.sin(a) * (r + 0.5)], 0.7, 0.42); })];
  if (t === 1) P.push(...[0, 1, 2].map(i => { const a = i * 2.094 + 0.5; return cp(W, 'cup', 'claw', [Math.cos(a) * (r + 0.5), CY - 0.2, Math.sin(a) * (r + 0.5)], [Math.cos(a) * (r - 0.4), CY + r * 0.5, Math.sin(a) * (r - 0.4)], 0.42, 0.2); }));
  if (t >= 2) P.push(dc(W, 'cup', 'band', [0, 2.3, 0], [1.9, 0.4, 1.9]), el(W, 'cup', 'pommel', [0, -2.1, 0], [0.9, 0.85, 0.9]));
  if (t >= 3 && t <= 4) P.push(...[0, 1, 2].map(i => { const a = i * 2.094 + 0.5; return cp(W, t === 3 ? 'gold' : 'gold', 'claw', [Math.cos(a) * (r + 0.5), CY - 0.2, Math.sin(a) * (r + 0.5)], [Math.cos(a) * (r - 0.2), CY + r * 0.6, Math.sin(a) * (r - 0.2)], 0.5, 0.2); }), dc(W, 'gold', 'band', [0, 2.3, 0], [2.0, 0.4, 2.0]), dc(W, 'gold', 'band', [0, 0.2, 0], [1.2, 0.3, 1.2]));
  if (t === 4) P.push(...[1, -1].map(k => cp(W, 'gold', 'wing', [1.3 * k, 2.4, 0], [3.8 * k, 4.8, 0], 0.7, 0.12)), cp(W, 'tassel', 'tassel', [0.3, -2.4, 0.2], [0.8, -5.6, 0.5], 0.5, 0.3), cp(W, 'tassel', 'tassel', [-0.3, -2.4, -0.2], [-0.8, -5.2, -0.4], 0.5, 0.3));
  if (t === 5) P.push(...spokes(W, 'ray', 'ray', [0, CY, 0], 8, r + 0.2, r + 2.6, 0.75, 0.12, 22.5), dc(W, 'gold', 'band', [0, 0.2, 0], [1.2, 0.3, 1.2]));
  const stamps = [];
  if (M) {                                                      // Eventide: three shards orbit the sphere
    P.push(...[0, 1, 2].map(i => { const a = i * 2.094 + 0.9; return cp(W, 'shard', 'shard', [Math.cos(a) * (r + 1.0), CY + 1.0 + i * 0.9, Math.sin(a) * (r + 1.0)], [Math.cos(a) * (r + 2.2), CY + 2.2 + i * 0.9, Math.sin(a) * (r + 2.2)], 0.8, 0.12); }), dc(W, 'cup', 'band', [0, 0.2, 0], [1.2, 0.3, 1.2]));
    stamps.push({ bone: W, at: [0, CY, r + 0.1], n: [0, 0, 1], facing: 0.2, on: 'sphere', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  }
  return piece('orb', 'weapon', t, { mats, prims: P, stamps }, { class: 'focus', sockets: { tip: { bone: W, at: [0, CY + r + 1, 0] } }, pose: holdPose('up') });
}

const pieces = {};
for (const t of TIERS) { const p = orb(t); pieces[p.id] = p; }
module.exports = { pieces };
