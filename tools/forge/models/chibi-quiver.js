'use strict';
// CHIBI QUIVER — the Shots companion (OFFHAND slot, worn with any hand item: loadout.md), a tube slung diagonally across the back with the
// arrows' fletching standing up past the shoulder, and a strap over the chest. Six SHAPE tiers, forged from 3D volumes (no hand-drawn
// pixels):
//   T1 Hunter      a leather tube, two feathered arrows, a leather strap
//   T2 Banded      + an iron mouth ring, an iron foot cap and a third arrow
//   T3 Gilded      gold mouth ring and bands, a ruby on the tube, red fletching
//   T4 Gemmed      a sapphire in a gold setting, gold-wing fletching, four arrows and a tassel at the foot
//   T5 Radiant     a tube and arrows of light, gold rings
//   T6 Mythic      Greenwood: a bark tube with a thorn crown, nature-tipped arrows, a nature glow run on the heart gem
// Family `quiver`; ids quiver.t1 .. quiver.t6. Back socket on the `spine` bone; no pose (the quiver follows the hips).
const { TIERS, metal, METAL, GOLD, LEATHER, STRAP, WOOD, SAPPHIRE, RUBY, CORE, FEATHER, NATUREG, piece, glowOf, fine, cp, el, dc } = require('./chibi-wpal.js');

const S = 'spine', A0 = [-2.2, 1.2, -4.6], A1 = [3.8, 7.6, -4.8];
const dv = [A1[0] - A0[0], A1[1] - A0[1], A1[2] - A0[2]], LEN = Math.hypot(...dv), D = dv.map(v => v / LEN), NX = [D[1], -D[0], 0];   // axis and an in-plane normal
const at = (f, ox, oz) => [A0[0] + dv[0] * f + NX[0] * (ox || 0), A0[1] + dv[1] * f + NX[1] * (ox || 0), A0[2] + dv[2] * f + (oz || 0)];    // f along the tube, ox across, oz depth
const out = (p, d) => [p[0] + D[0] * d, p[1] + D[1] * d, p[2] + D[2] * d];

function quiver(t) {
  const M = t === 6, R = [1.35, 1.4, 1.45, 1.5, 1.5, 1.5][t - 1];
  const mats = { tube: t === 5 ? CORE : M ? ['#2c2018', '#4a3624', '#6a4e30', '#8a6a42'] : LEATHER, strap: STRAP.ramp, iron: metal(METAL[1]), gold: GOLD,
    shaft: t === 5 ? fine(CORE) : WOOD, fletch: t === 3 ? ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'] : t === 4 ? FEATHER : t === 5 ? fine(GOLD) : M ? NATUREG : FEATHER, head: M ? NATUREG : metal(METAL[1]),
    gem: t === 3 ? RUBY : M ? NATUREG : SAPPHIRE, thorn: M ? NATUREG : GOLD, tassel: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'], glow: glowOf('nature') };
  const P = [cp(S, 'tube', 'tube', at(0), at(1), R * 0.82, R),                                    // the tube, wider at the mouth
    el(S, 'tube', 'foot', at(0), [R * 0.82, R * 0.82, R * 0.82]),
    // the strap: from the tube's mouth over the shoulder and across the chest to the hip
    cp(S, 'strap', 'strap', [-1.8, 8.3, 2.4], [3.2, 1.3, 3.9], 0.5, 0.5), cp(S, 'strap', 'strap', at(0.92, 0, 0), [-3.3, 8.0, -2.0], 0.5, 0.5), cp(S, 'strap', 'strap', [-3.3, 8.0, -2.0], [-1.8, 8.3, 2.4], 0.5, 0.5)];
  const n = [2, 3, 3, 4, 3, 3][t - 1], off = [[0.5, 0], [-0.5, 0.3], [0, -0.4], [0.9, 0.4], [-0.9, -0.2]];
  for (let i = 0; i < n; i++) {                                                                // the arrows: shaft out of the mouth, then the fletching at its end
    const [ox, oz] = off[i], base = at(0.98, ox * 0.9, oz * 0.9), top = out(base, 3.0 + i * 0.6 + (t >= 4 ? 0.4 : 0));
    P.push(cp(S, 'shaft', 'shaft', at(0.7, ox * 0.9, oz * 0.9), top, 0.38, 0.38), cp(S, 'fletch', 'fletch', out(top, -1.8), out(top, 0.9), 0.95, 0.55));
    if (M) P.push(cp(S, 'head', 'head', out(top, 0.6), out(top, 1.9), 0.7, 0.12));
  }
  if (t >= 2) P.push(cp(S, t === 2 ? 'iron' : 'gold', 'ring', at(0.97), at(1.02), R + 0.25, R + 0.25), el(S, t === 2 ? 'iron' : 'gold', 'cap', at(0), [R * 0.9, R * 0.9, R * 0.9]));
  if (t >= 3) P.push(...[0.3, 0.7].map(f => cp(S, 'gold', 'band', at(f), at(f + 0.05), R + 0.15, R + 0.15)));
  if (t >= 3) P.push(el(S, 'gem', 'gem', at(0.5, 0, -(R - 0.1)), [0.85, 0.85, 0.7]));
  if (t === 4) P.push(cp(S, 'tassel', 'tassel', at(0, 0.2, 0.1), [A0[0] - 0.9, A0[1] - 3.6, A0[2] + 0.2], 0.55, 0.3), cp(S, 'tassel', 'tassel', at(0, -0.4, -0.1), [A0[0] - 2.0, A0[1] - 3.2, A0[2] - 0.2], 0.5, 0.3),
    ...[1, -1].map(k => cp(S, 'gold', 'wing', at(0.5, k * 1.4, 0), at(0.5, k * 2.4, 0), 0.5, 0.2)));
  if (t === 5) P.push(...[0.3, 0.7].map(f => cp(S, 'gold', 'band', at(f, 0, 0), at(f + 0.04, 0, 0), R + 0.2, R + 0.2)));
  if (M) P.push(...[0, 1, 2, 3, 4].map(i => { const a = i * 1.257; return cp(S, 'thorn', 'thorn', at(0.96, Math.cos(a) * (R - 0.1), Math.sin(a) * (R - 0.1)), out(at(0.96, Math.cos(a) * (R + 0.7), Math.sin(a) * (R + 0.7)), 1.7), 0.6, 0.12); }),
    cp(S, 'tube', 'band', at(0.3), at(0.34), R + 0.2, R + 0.2));
  const stamps = [];
  if (M) stamps.push({ bone: S, at: at(0.5, 0, -(R + 0.5)), n: [0, 0, -1], facing: 0.2, on: 'gem', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  return piece('quiver', 'offhand', t, { bias: 0.2, mats, prims: P, stamps });
}

const pieces = {};
for (const t of TIERS) { const p = quiver(t); pieces[p.id] = p; }
module.exports = { pieces };
