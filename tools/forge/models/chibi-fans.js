'use strict';
// CHIBI FANS — the Shadows war-fan pair (class 'shadow': crouch, cross-slash left, cross-slash right, double stab), six SHAPE tiers on
// the chibi rig, forged from 3D volumes (no hand-drawn pixels). One piece, an open fan on the `weapon` bone AND on the `offhand` bone:
// a pivot in the fist, a sector of cloth over ribs that spread out wider every tier:
//   T1 Paperfan   a paper fan on wooden ribs
//   T2 Ironfan    a paper fan on iron ribs, an iron end rib
//   T3 Gilded     gold ribs, a ruby pivot, a gold rim
//   T4 Silkfan    blue silk on silver ribs, a gold rim, a sapphire pivot and a plume
//   T5 Radiant    cloth of light on gold ribs, a crown of rays
//   T6 Mythic     Stormfans: night silk on night-forged ribs, a lightning rim and bolts off the tips, a lightning glow run on each fan
// Family `fans`; ids fans.t1 .. fans.t6.
const { TIERS, metal, METAL, GOLD, WOOD, LEATHER, RUBY, SAPPHIRE, CORE, LIGHTNG, piece, glowOf, holdPose, fine, cp, el } = require('./chibi-wpal.js');

// n capsules from the pivot out to radius r1, spread over `spread` radians around +y
const sector = (B, mat, part, c, n, r0, r1, ra, rb, spread, dz) => Array.from({ length: n }, (_, i) => {
  const a = (n === 1 ? 0 : -spread / 2 + spread * i / (n - 1)), sa = Math.sin(a), ca = Math.cos(a);
  return cp(B, mat, part, [c[0] + r0 * sa, c[1] + r0 * ca, c[2] + (dz || 0)], [c[0] + r1 * sa, c[1] + r1 * ca, c[2] + (dz || 0)], ra, rb);
});

function fan(B, t, L) {
  const M = t === 6, spread = [1.0, 1.1, 1.2, 1.3, 1.4, 1.4][t - 1], C = [0, 1.4, 0], P = [];
  P.push(cp(B, 'grip', 'hilt', [0, -1.6, 0], [0, 1.4, 0], 0.62, 0.62));
  P.push(...sector(B, 'cloth', 'cloth', C, 5, 0.6, L, 0.5, 1.3, spread, 0));                      // the cloth: overlapping wedges make a solid sector
  P.push(...sector(B, 'rib', 'rib', C, 3, 0.4, L + 0.6, 0.45, 0.35, spread, 0.9));                   // the ribs, a hair proud of the cloth
  P.push(cp(B, 'rib', 'rib', [-L * Math.sin(spread / 2), C[1] + L * Math.cos(spread / 2), 0.4], [-L * Math.sin(spread / 2) * 0.35, C[1] + 0.8, 0.4], 0.5, 0.4), cp(B, 'rib', 'rib', [L * Math.sin(spread / 2), C[1] + L * Math.cos(spread / 2), 0.4], [L * Math.sin(spread / 2) * 0.35, C[1] + 0.8, 0.4], 0.5, 0.4));
  P.push(el(B, 'pivot', 'pivot', [0, 1.2, 0.9], [0.75, 0.75, 0.6]));
  if (t >= 3) P.push(...sector(B, 'rim', 'rim', C, 5, L - 0.2, L + 0.9, 0.5, 0.45, spread, 0.3));
  if (t === 4) P.push(cp(B, 'plume', 'plume', [0.2, -1.8, 0], [0.6 * (B === 'weapon' ? 1 : -1), -4.8, 0.3], 0.6, 0.3));
  if (t === 5) P.push(...sector(B, 'ray', 'ray', C, 5, L + 0.8, L + 3.0, 0.6, 0.12, spread + 0.2, 0.3));
  if (M) P.push(...sector(B, 'bolt', 'bolt', C, 4, L + 0.6, L + 3.2, 0.65, 0.12, spread + 0.2, 0.3), cp(B, 'bolt', 'bolt', [0, L + 0.4, 0.3], [0.9, L + 2.2, 0.3], 0.55, 0.2));
  return P;
}

function fans(t) {
  const M = t === 6, L = [5.2, 5.6, 5.9, 6.2, 6.5, 6.8][t - 1], silk = { ramp: ['#14284a', '#244a82', '#3c6cb0', '#7ca4dc'], lift: 1, spec: 0.5 };
  const mats = { cloth: t === 1 || t === 2 ? ['#5a4a42', '#8c7a64', '#b4a284', '#d4c6a2'] : t === 3 ? ['#5a2a30', '#8a3a44', '#b0505a', '#d47a80'] : t === 4 ? silk : t === 5 ? CORE : ['#2a2040', '#3e3060', '#58468a', '#7c68b0'],
    rib: t === 1 ? ['#2a1a10', '#4a3020', '#6a4a30', '#8a6a48'] : t === 2 ? metal(METAL[0]) : t === 3 ? GOLD : t === 4 ? metal(METAL[3]) : t === 5 ? fine(GOLD) : metal(METAL[5]), grip: LEATHER, rim: t === 4 ? GOLD : t === 3 ? GOLD : t === 5 ? fine(CORE) : metal(METAL[4]),
    pivot: t === 3 ? RUBY : t === 4 ? SAPPHIRE : t >= 5 ? GOLD : metal(METAL[1]), ray: fine(CORE), bolt: LIGHTNG, plume: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'], glow: glowOf('lightning') };
  const P = [...fan('weapon', t, L), ...fan('offhand', t, L)], stamps = [];
  if (M) for (const B of ['weapon', 'offhand']) stamps.push({ bone: B, at: [0, 1.4 + L * 0.6, 1.1], n: [0, 0, 1], facing: 0.2, on: 'cloth', px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  return piece('fans', 'weapon', t, { mats, prims: P, stamps }, { class: 'shadow', sockets: { tip: { bone: 'weapon', at: [0, L + 1.4, 0] } },
    pose: holdPose('one', a => { const w = a === 'cast' ? [-0.3, -0.6, 0.75] : a === 'hit' ? [-0.45, -0.5, 0.75] : a === 'dash' ? [-0.3, -0.2, -0.93] : [-0.3, 0.9, 0.05]; return { weapon: { aim: w }, offhand: { aim: [-w[0], w[1], w[2]] } }; }) });
}

const pieces = {};
for (const t of TIERS) { const p = fans(t); pieces[p.id] = p; }
module.exports = { pieces };
