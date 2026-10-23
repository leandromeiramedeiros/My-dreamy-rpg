'use strict';
// CHIBI HAMMER — the Greatarms two-hander that breaks poise (class 'greatarm'), six SHAPE tiers on the chibi rig, forged from 3D
// volumes (no hand-drawn pixels). One long haft, a blocky HEAD that grows every tier:
//   T1 Mallet    a wooden haft and a wooden block head, two iron bands
//   T2 Sledge    an iron block, steel bands, a back peen
//   T3 Gilded    steel block, gold end caps and haft bands, a ruby on the face
//   T4 Warhammer silver block, a gold back spike, a sapphire, gold end caps, a gold crest
//   T5 Radiant   a block of light in a gold frame, a crown of rays
//   T6 Mythic    Forgeheart: a night-forged head split by a magma core, ember crown, a fire glow run on the core
// Family `hammer`; ids hammer.t1 .. hammer.t6.
const { TIERS, metal, METAL, GOLD, WOOD, LEATHER, RUBY, SAPPHIRE, CORE, FIREG, piece, glowOf, holdPose, cp, el, dc, bx } = require('./chibi-wpal.js');

const TOP = 13.5;                                                // haft top (weapon-local y)
function hammer(t) {
  const M = t === 6, W = 'weapon', HY = TOP - 1.2, HX = [4.0, 4.0, 4.2, 4.4, 4.4, 4.4][t - 1], HH = [2.4, 2.6, 2.7, 2.8, 2.8, 2.9][t - 1];
  const mats = { haft: t >= 4 && !M ? metal(METAL[t - 2]) : M ? metal(METAL[5]) : WOOD, grip: LEATHER, iron: metal(METAL[Math.min(t, 3) - 1]), head: t === 1 ? WOOD : t === 5 ? CORE : M ? metal(METAL[5]) : metal(METAL[Math.min(t, 4) - 1]),
    steel: metal(METAL[1]), gold: GOLD, gem: t === 3 ? RUBY : M ? FIREG : SAPPHIRE, core: CORE, magma: FIREG, glow: glowOf('fire') };
  const P = [cp(W, 'haft', 'haft', [0, -6.0, 0], [0, TOP + 0.2, 0], 0.82, 0.78), cp(W, 'grip', 'grip', [0, -2.2, 0], [0, 1.6, 0], 1.0, 1.0),
    bx(W, 'head', 'head', [0, HY, 0], [HX, HH, HH], { round: 0.55 })];
  const bands = (mat, ys) => ys.map(x => bx(W, mat, 'band', [x, HY, 0], [0.45, HH + 0.25, HH + 0.25], { round: 0.25 }));
  if (t === 1) P.push(...bands('iron', [-HX + 0.9, HX - 0.9]));
  if (t === 2) P.push(...bands('steel', [-HX + 0.8, HX - 0.8]), cp(W, 'iron', 'peen', [HX - 0.5, HY, 0], [HX + 2.0, HY, 0], 1.3, 0.35), cp(W, 'iron', 'cap', [0, -6.6, 0], [0, -5.4, 0], 1.0, 0.95));
  if (t === 3) P.push(...[-1, 1].map(k => bx(W, 'gold', 'cap', [k * (HX + 0.15), HY, 0], [0.55, HH + 0.35, HH + 0.35], { round: 0.3 })), el(W, 'gem', 'gem', [0, HY, HH + 0.1], [1.0, 1.0, 0.6]),
    dc(W, 'gold', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]), dc(W, 'gold', 'band', [0, -3.0, 0], [1.1, 0.35, 1.1]), cp(W, 'iron', 'cap', [0, -6.6, 0], [0, -5.4, 0], 1.0, 0.95));
  if (t === 4) P.push(...[-1, 1].map(k => bx(W, 'gold', 'cap', [k * (HX + 0.15), HY, 0], [0.55, HH + 0.35, HH + 0.35], { round: 0.3 })), cp(W, 'gold', 'spike', [-HX, HY, 0], [-HX - 3.2, HY, 0], 1.0, 0.12),
    el(W, 'gem', 'gem', [0, HY, HH + 0.1], [1.2, 1.2, 0.65]), cp(W, 'gold', 'crest', [0, HY + HH - 0.2, 0], [0, HY + HH + 2.2, 0], 0.9, 0.12), dc(W, 'gold', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]), cp(W, 'gold', 'cap', [0, -6.6, 0], [0, -5.2, 0], 1.0, 0.9));
  if (t === 5) P.push(...[-1, 1].map(k => bx(W, 'gold', 'cap', [k * (HX + 0.15), HY, 0], [0.55, HH + 0.35, HH + 0.35], { round: 0.3 })), bx(W, 'gold', 'frame', [0, HY, -HH + 0.2], [HX + 0.3, HH + 0.3, 0.4]),
    ...[-2, -1, 0, 1, 2].map(k => cp(W, 'gold', 'ray', [k * 1.5, HY + HH - 0.3, 0], [k * 2.0, HY + HH + 2.6 - Math.abs(k) * 0.5, 0], 0.7, 0.12)), dc(W, 'gold', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]), cp(W, 'gold', 'cap', [0, -6.6, 0], [0, -5.2, 0], 1.0, 0.9));
  const stamps = [];
  if (M) {                                                      // Forgeheart: a magma core down the face, gold-hot end caps, a crown of embers
    P.push(...[-1, 1].map(k => bx(W, 'iron', 'cap', [k * (HX + 0.15), HY, 0], [0.55, HH + 0.35, HH + 0.35], { round: 0.3 })), bx(W, 'gem', 'core', [0, HY, HH - 0.2], [1.6, HH - 0.5, 0.7], { round: 0.4 }),
      ...[-1.6, 0, 1.6].map((k, i) => cp(W, 'magma', 'ember', [k * 1.2, HY + HH - 0.3, 0], [k * 1.6, HY + HH + (i === 1 ? 3.6 : 2.4), 0], 0.8, 0.12)), cp(W, 'iron', 'cap', [0, -6.6, 0], [0, -5.2, 0], 1.0, 0.9), dc(W, 'magma', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]));
    stamps.push({ bone: W, at: [0, HY, HH + 0.65], n: [0, 0, 1], facing: 0.2, on: 'gem', px: [[0, -1, 'glow'], [0, 0, 'glow'], [0, 1, 'glow']] });
  }
  return piece('hammer', 'weapon', t, { mats, prims: P, stamps }, { class: 'greatarm', sockets: { tip: { bone: W, at: [0, HY, 0] } }, pose: holdPose('shoulder') });
}

const pieces = {};
for (const t of TIERS) { const p = hammer(t); pieces[p.id] = p; }
module.exports = { pieces };
