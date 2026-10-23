'use strict';
// CHIBI WAND — the Foci one-hander (class 'focus': lift, thrust, hold the spell), six SHAPE tiers on the chibi rig, forged from 3D
// volumes (no hand-drawn pixels). A short rod and a head that grows every tier:
//   T1 Twig      a wooden rod with a bud
//   T2 Sprig     a steel-capped rod with a small sapphire
//   T3 Gilded    gold collar and bands, a ruby tip
//   T4 Starwand  a silver rod, a sapphire star with four gold spikes and a tassel
//   T5 Radiant   a rod of light under a star of gold rays
//   T6 Mythic    Wraithbone: a bone rod with prongs cradling a pale glow gem
// Family `wand`; ids wand.t1 .. wand.t6.
const { TIERS, metal, METAL, GOLD, WOOD, LEATHER, RUBY, SAPPHIRE, CORE, BONE, piece, glowOf, holdPose, fine, cp, el, dc, spokes } = require('./chibi-wpal.js');

function wand(t) {
  const M = t === 6, W = 'weapon', TOP = [10.0, 10.5, 11.0, 11.5, 12.0, 12.0][t - 1], HY = TOP + 1.2;
  const mats = { rod: t === 1 ? WOOD : M ? BONE : t === 5 ? GOLD : t === 2 ? metal(METAL[0]) : metal(METAL[Math.min(t, 4) - 2]), grip: LEATHER, iron: metal(METAL[1]), gold: GOLD,
    gem: t === 3 ? RUBY : M ? { ramp: ['#3a3a5a', '#7a7aa8', '#c4c8e8', '#f0f4ff'], lift: 1, spec: 0.9 } : SAPPHIRE, core: CORE, ray: fine(t === 5 ? CORE : GOLD), bud: t === 1 ? WOOD : metal(METAL[1]),
    tassel: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'], glow: glowOf('pale') };
  const P = [cp(W, 'rod', 'rod', [0, -2.6, 0], [0, TOP, 0], 0.8, 0.62), cp(W, 'grip', 'grip', [0, -1.8, 0], [0, 1.6, 0], 0.98, 0.98)];
  if (t === 1) P.push(el(W, 'bud', 'bud', [0, HY - 0.2, 0], [1.5, 2.0, 1.5]));
  if (t === 2) P.push(cp(W, 'iron', 'cap', [0, TOP - 1.4, 0], [0, TOP + 0.2, 0], 1.15, 1.0), el(W, 'gem', 'gem', [0, HY, 0], [1.4, 1.8, 1.4]), dc(W, 'iron', 'band', [0, 3.0, 0], [1.0, 0.3, 1.0]), el(W, 'iron', 'pommel', [0, -3.0, 0], [0.85, 0.8, 0.85]));
  if (t === 3) P.push(cp(W, 'gold', 'collar', [0, TOP - 1.6, 0], [0, TOP + 0.3, 0], 1.3, 1.1), el(W, 'gem', 'gem', [0, HY + 0.1, 0], [1.3, 1.7, 1.3]), dc(W, 'gold', 'band', [0, 3.0, 0], [1.0, 0.3, 1.0]), dc(W, 'gold', 'band', [0, -1.0, 0], [1.0, 0.3, 1.0]), el(W, 'gold', 'pommel', [0, -3.0, 0], [1.0, 0.9, 1.0]));
  if (t === 4) P.push(cp(W, 'gold', 'collar', [0, TOP - 1.6, 0], [0, TOP + 0.3, 0], 1.3, 1.1), el(W, 'gem', 'gem', [0, HY + 0.4, 0], [1.5, 1.5, 1.2]), ...spokes(W, 'gold', 'spike', [0, HY + 0.4, 0], 4, 1.4, 3.6, 0.7, 0.12, 0),
    dc(W, 'gold', 'band', [0, 3.0, 0], [1.0, 0.3, 1.0]), el(W, 'gold', 'pommel', [0, -3.0, 0], [1.0, 0.9, 1.0]), cp(W, 'tassel', 'tassel', [0.3, -3.2, 0.2], [0.8, -6.4, 0.5], 0.5, 0.3), cp(W, 'tassel', 'tassel', [-0.3, -3.2, -0.2], [-0.8, -6.0, -0.4], 0.5, 0.3));
  if (t === 5) P.push(cp(W, 'gold', 'collar', [0, TOP - 1.6, 0], [0, TOP + 0.3, 0], 1.3, 1.1), el(W, 'core', 'star', [0, HY + 0.5, 0], [1.7, 1.7, 1.2]), ...spokes(W, 'ray', 'ray', [0, HY + 0.5, 0], 8, 1.6, 4.2, 0.7, 0.12, 0),
    dc(W, 'gold', 'band', [0, 3.0, 0], [1.0, 0.3, 1.0]), el(W, 'gold', 'pommel', [0, -3.0, 0], [1.0, 0.9, 1.0]));
  const stamps = [];
  if (M) {                                                      // Wraithbone: three bone prongs cradle a pale gem, a bone ring below
    P.push(cp(W, 'rod', 'collar', [0, TOP - 1.6, 0], [0, TOP + 0.3, 0], 1.3, 1.1), el(W, 'gem', 'gem', [0, HY + 0.7, 0], [1.6, 1.8, 1.4]),
      ...[-1, 0, 1].map(k => cp(W, 'rod', 'prong', [k * 0.6, TOP, 0.2], [k * 2.2, TOP + 4.2, k === 0 ? -1.2 : 0.2], 0.8, 0.12)), dc(W, 'rod', 'band', [0, 3.0, 0], [1.0, 0.3, 1.0]), el(W, 'rod', 'pommel', [0, -3.0, 0], [1.0, 0.9, 1.0]));
    stamps.push({ bone: W, at: [0, HY + 0.7, 1.35], n: [0, 0, 1], facing: 0.2, on: 'gem', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  }
  return piece('wand', 'weapon', t, { mats, prims: P, stamps }, { class: 'focus', sockets: { tip: { bone: W, at: [0, HY + 3.4, 0] } }, pose: holdPose('up') });
}

const pieces = {};
for (const t of TIERS) { const p = wand(t); pieces[p.id] = p; }
module.exports = { pieces };
