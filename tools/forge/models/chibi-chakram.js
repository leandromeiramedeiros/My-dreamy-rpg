'use strict';
// CHIBI CHAKRAM — the Shots one-hander that is thrown (class 'throw': wind back, whip, release), six SHAPE tiers on the chibi rig, forged
// from 3D volumes (no hand-drawn pixels). A bladed ring held by a short grip bar; the ring grows blades and rims every tier:
//   T1 Hoop      a plain iron ring on a leather grip bar
//   T2 Toothed   a steel ring with four outward teeth
//   T3 Gilded    steel ring with a gold inner band and a ruby hub
//   T4 Twinring  a silver double ring with six gold-tipped blades and a sapphire hub
//   T5 Radiant   a ring of light with a gold hub and a crown of rays
//   T6 Mythic    Voidring: a night-forged ring, an arcane inner ring, three orbiting shards and a glow run on the rim
// Family `chakram`; ids chakram.t1 .. chakram.t6.
const { TIERS, metal, METAL, GOLD, LEATHER, RUBY, SAPPHIRE, CORE, ARCG, piece, glowOf, holdPose, fine, ring, cp, el, spokes } = require('./chibi-wpal.js');

function chakram(t) {
  const M = t === 6, W = 'weapon', R = [3.9, 4.2, 4.4, 4.6, 4.8, 4.8][t - 1], CY = 5.6, C = [0, CY, 0];
  const mats = { ring: t === 5 ? CORE : M ? metal(METAL[5]) : metal(METAL[Math.min(t, 4) - 1]), inner: t === 5 ? fine(CORE) : M ? ARCG : metal(METAL[Math.min(t, 4)]), grip: LEATHER, gold: GOLD, tip: fine(t === 5 ? CORE : GOLD),
    gem: t === 3 ? RUBY : M ? ARCG : SAPPHIRE, shard: ARCG, glow: glowOf('arcane') };
  const P = [cp(W, 'grip', 'grip', [0, -1.4, 0], [0, CY - R + 0.4, 0], 0.85, 0.85), ...ring(W, 'ring', 'ring', C, R, 20, t === 1 ? 0.95 : 1.1)];
  if (t >= 2) P.push(...spokes(W, 'ring', 'tooth', C, 4, R, R + (t === 2 ? 1.8 : 2.4), 0.9, 0.12, 45));
  if (t === 3) P.push(...ring(W, 'gold', 'inner', C, R - 1.7, 14, 0.5), el(W, 'gem', 'gem', [0, CY, 0.2], [0.95, 0.95, 0.7]), cp(W, 'gold', 'band', [0, -0.4, 0], [0, 0.6, 0], 1.05, 1.05));
  if (t === 4) P.push(...ring(W, 'inner', 'inner', C, R - 1.8, 14, 0.7), ...spokes(W, 'tip', 'blade', C, 6, R, R + 1.8, 0.8, 0.12, 0), el(W, 'gem', 'gem', [0, CY, 0.2], [1.0, 1.0, 0.75]), cp(W, 'gold', 'band', [0, -0.4, 0], [0, 0.6, 0], 1.05, 1.05));
  if (t === 5) P.push(...ring(W, 'inner', 'inner', C, R - 1.7, 14, 0.6), ...spokes(W, 'tip', 'ray', C, 8, R, R + 2.4, 0.8, 0.12, 0), el(W, 'gold', 'hub', [0, CY, 0.2], [1.1, 1.1, 0.8]), cp(W, 'gold', 'band', [0, -0.4, 0], [0, 0.6, 0], 1.05, 1.05));
  const stamps = [];
  if (M) {                                                      // Voidring: an arcane inner ring and three orbiting shards, a glow run on the rim
    P.push(...ring(W, 'inner', 'inner', C, R - 1.8, 14, 0.8), ...spokes(W, 'shard', 'shard', C, 3, R, R + 2.6, 0.9, 0.12, 90), el(W, 'gem', 'gem', [0, CY, 0.2], [1.1, 1.1, 0.8]), cp(W, 'ring', 'band', [0, -0.4, 0], [0, 0.6, 0], 1.05, 1.05));
    stamps.push({ bone: W, at: [R * 0.7, CY + R * 0.7, 0.9], n: [0, 0, 1], facing: 0.2, on: 'ring', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  }
  return piece('chakram', 'weapon', t, { mats, prims: P, stamps }, { class: 'throw', sockets: { tip: { bone: W, at: [0, CY + R + 1, 0] } }, pose: holdPose('one') });
}

const pieces = {};
for (const t of TIERS) { const p = chakram(t); pieces[p.id] = p; }
module.exports = { pieces };
