'use strict';
// CHIBI GRIMOIRE — the mage companion (OFFHAND slot, worn with any hand item: loadout.md), a tome hung at the hero's left hip,
// angled out so the cover reads from the front. Six SHAPE tiers, forged from 3D volumes (no hand-drawn pixels):
//   T1 Primer     a leather-bound tome, cream page block, a belt loop
//   T2 Clasped    + two iron clasps on the fore-edge and iron corner caps
//   T3 Sigil      + gold spine bands and a gold sigil disc on the cover
//   T4 Gemmed     a sapphire in a gold setting on the sigil, gold corners, a red ribbon marker
//   T5 Glowing    glowing pages: a fan of three light pages rising out of the book
//   T6 Mythic     The Names on the Pillars: a violet cover, three arcane pages floating over the book, one glow run on the sigil
// Family `grimoire`; ids grimoire.t1 .. grimoire.t6. Hip socket on the `spine` bone; no pose (the book follows the hips).
const { TIERS, metal, METAL, GOLD, LEATHER, STRAP, CLOTH, SAPPHIRE, CORE, GLOW, flatOf, ARCG, rotv, piece, r3 } = require('./chibi-palette.js');

const PAGE = ['#6a5a52', '#988a76', '#c4b698', '#e4d8b4'];                         // cream paper (tone 3 stays under L* 85)
const COVER = [['#3a2216', '#5e3a24', '#85573a', '#b07e56'], ['#141f4e', '#22367a', '#3656b0', '#7896e8'], ['#4a0e1e', '#7e1a30', '#b8324a', '#e86a80'],
  ['#10305a', '#1c4c8a', '#2e74c8', '#78b4f0'], ['#161e58', '#1c2a78', '#2e46b8', '#6a8af0'], ['#2a1650', '#3e2272', '#5a2e9a', '#8a5cd0']];
const TH = -0.8, S = 1.3, B = [8.0, 0.5, 2.6];                                              // the book's tilt about y and its centre (spine-local)
const T = v => { const r = rotv(v.map(x => x * S), [0, TH, 0]); return [r3(B[0] + r[0]), r3(B[1] + r[1]), r3(B[2] + r[2])]; };

function grimoire(t) {
  const M = t === 6;
  const mats = { cover: COVER[t - 1], page: PAGE, iron: metal(METAL[1]), gold: GOLD, strap: STRAP.ramp, gem: M ? ARCG : SAPPHIRE, ribbon: CLOTH[2], light: t === 5 ? CORE : ARCG, arc: ARCG, glow: flatOf(GLOW.arcane) };
  const rot = [0, TH, 0];
  const bx = (c, h, mat, part, round) => ({ bone: 'spine', mat, part, shape: 'box', c: T(c), h: h.map(x => x * S), rot, round: round || 0.2 });
  // book-local frame: +x out of the cover, +y up, +z toward the fore-edge. cover 1.1 thick x 5 tall x 3.8 deep
  const P = [bx([0, 0, 0], [1.1, 2.5, 1.9], 'cover', 'cover', 0.25),
    bx([-0.15, 0, 0.35], [0.95, 2.35, 1.75], 'page', 'pages', 0.12),
    { bone: 'spine', mat: 'strap', part: 'loop', shape: 'cap', a: [4.2, 3.0, 0.4], b: [5.2, 1.6, 0.5], ra: 0.5, rb: 0.5 }];
  const stamps = [];
  if (t >= 2) P.push(...[1.4, -1.2].map(y => bx([0.05, y, 2.1], [0.5, 0.5, 0.3], 'iron', 'clasp', 0.1)),          // fore-edge clasps
    ...[[1, 1], [1, -1]].map(([sx, sy]) => bx([0.0, 2.25 * sy, -1.7], [1.2, 0.35, 0.35], 'iron', 'corner', 0.1)));
  if (t >= 3) P.push(bx([0, 0, -1.85], [1.15, 2.55, 0.35], 'gold', 'bands', 0.12),                                  // gold spine
    { bone: 'spine', mat: 'gold', part: 'sigil', shape: 'ell', c: T([1.25, 0.1, 0.2]), r: [0.35 * S, 1.25 * S, 1.25 * S], rot });
  if (t >= 4) P.push({ bone: 'spine', mat: 'gem', part: 'gem', shape: 'ell', c: T([1.6, 0.1, 0.2]), r: [0.35 * S, 0.65 * S, 0.65 * S], rot },
    bx([0.0, 2.3, 1.7], [1.2, 0.4, 0.4], 'gold', 'corner', 0.1), bx([0.0, -2.3, 1.7], [1.2, 0.4, 0.4], 'gold', 'corner', 0.1),
    { bone: 'spine', mat: 'ribbon', part: 'ribbon', shape: 'cap', a: T([0.2, -2.3, -1.0]), b: T([0.5, -4.6, -0.8]), ra: 0.5 * S, rb: 0.35 * S });
  if (t === 5) P.push(...[-0.55, 0, 0.55].map((a, i) => ({ bone: 'spine', mat: 'light', part: 'glowpage' + i, shape: 'box', c: T([-0.1 + a * 0.2, 3.7 + (i === 1 ? 0.5 : 0), a * 1.5]), h: [0.18 * S, 1.5 * S, 0.95 * S], rot: [0, TH, -a * 0.9], round: 0.1 })));
  if (M) {                                                      // three arcane pages float over the cover; the sigil carries the glow
    P.push(...[-0.62, 0, 0.62].map((a, i) => ({ bone: 'spine', mat: 'arc', part: 'pillar' + i, shape: 'box', c: T([-0.1 + a * 0.2, 4.0 + (i === 1 ? 0.7 : 0), a * 1.6]), h: [0.2 * S, 1.7 * S, 0.95 * S], rot: [0, TH, -a * 0.85], round: 0.1 })));
    stamps.push({ bone: 'spine', at: T([1.7, 0.1, 0.2]), n: [Math.cos(TH), 0, -Math.sin(TH)], facing: 0.2, on: 'gem', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  }
  return piece('grimoire', 'offhand', t, { bias: 0.2, mats, prims: P, stamps });
}

const pieces = {};
for (const t of TIERS) { const p = grimoire(t); pieces[p.id] = p; }
module.exports = { pieces };
