'use strict';
// CHIBI TOWER SHIELD — the wall (loadout.md: 100% front block), a tall slab that covers the hero's left side. OFFHAND slot, same
// pose as the heater; six SHAPE tiers forged from 3D volumes (no hand-drawn pixels):
//   T1 Plank     a wooden wall of planks, two iron straps and a small iron boss
//   T2 Iron      an iron-banded steel slab with a raised centre ridge and rivets
//   T3 Gilded    + a gold frame, a gold boss and a gold cross
//   T4 Lunar     silver face, a sapphire in a gold setting, two gold horns, a gold crest bar
//   T5 Radiant   pearl face with a disc of light and a crown of gold rays
//   T6 Mythic    Winterkeep: night-forged slab, a battlement of five frost spires, a frost heart; one glow run on the heart
// Family `tower`; ids tower.t1 .. tower.t6.
const { TIERS, metal, METAL, GOLD, WOOD, SAPPHIRE, CORE, FROSTG, CROSS, piece, SHIELD_POSE, glowOf, bx, cp, el, spokes } = require('./chibi-wpal.js');

const W = 3.5, HH = 5.9, CY = 1.2;                               // half width, half height, centre y of the slab (offhand-local)
function tower(t) {
  const M = t === 6;
  const mats = { face: [WOOD, metal(METAL[1]), metal(METAL[2]), metal(METAL[3]), metal(METAL[4]), metal(METAL[5])][t - 1], iron: metal(METAL[t === 1 ? 0 : Math.min(t, 3) - 1]),
    gold: GOLD, gem: M ? FROSTG : SAPPHIRE, core: CORE, frost: FROSTG, glow: glowOf('frost') };
  const B = (mat, part, c, h, o) => bx('offhand', mat, part, c, h, o);
  const P = [B('face', 'slab', [0, CY, 0.8], [W, HH, 0.6], { round: 0.45 })], stamps = [];
  if (t === 1) P.push(...[-2.9, 2.2].map(y => B('iron', 'rim', [0, CY + y, 1.15], [W + 0.1, 0.55, 0.3])), el('offhand', 'iron', 'boss', [0, CY - 0.3, 1.5], [1.1, 1.1, 0.6]));
  if (t >= 2 && t <= 4) P.push(B('iron', 'rim', [0, CY, 0.4], [W + 0.45, HH + 0.45, 0.4], { round: 0.5 }),              // the framed slab
    B('iron', 'ridge', [0, CY, 1.3], [0.55, HH - 0.5, 0.35], { round: 0.25 }), ...[-1, 1].flatMap(k => [-4.2, 4.6].map(y => el('offhand', 'iron', 'rivet', [2.4 * k, CY + y * 0.95, 1.5], [0.5, 0.5, 0.4]))));
  if (t === 3) P.push(B('gold', 'rim', [0, CY + HH + 0.35, 1.0], [W + 0.4, 0.5, 0.35]), B('gold', 'rim', [0, CY - HH - 0.2, 1.0], [W + 0.3, 0.45, 0.35]),
    el('offhand', 'gold', 'boss', [0, CY + 0.6, 1.7], [1.5, 1.5, 0.7]));
  if (t === 3) stamps.push({ bone: 'offhand', at: [0, CY + 0.6, 2.35], n: [0, 0, 1], facing: 0.2, on: 'boss', px: CROSS });
  if (t === 4) P.push(B('gold', 'rim', [0, CY + HH + 0.4, 1.1], [W + 0.6, 0.55, 0.4]), B('gold', 'rim', [0, CY - HH - 0.2, 1.1], [W + 0.4, 0.5, 0.4]),
    el('offhand', 'gold', 'boss', [0, CY + 1.0, 1.55], [1.9, 1.9, 0.6]), el('offhand', 'gem', 'gem', [0, CY + 1.0, 2.0], [1.15, 1.3, 0.6]),
    ...[1, -1].flatMap(k => [cp('offhand', 'gold', 'horn', [W * k, CY + HH, 1.2], [(W + 1.6) * k, CY + HH + 2.4, 1.2], 0.8, 0.5), cp('offhand', 'gold', 'horn', [(W + 1.6) * k, CY + HH + 2.4, 1.2], [(W + 0.8) * k, CY + HH + 4.4, 1.2], 0.5, 0.12)]));
  if (t === 5) P.push(B('gold', 'rim', [0, CY, 0.4], [W + 0.4, HH + 0.4, 0.4], { round: 0.5 }), el('offhand', 'core', 'core', [0, CY + 0.6, 1.6], [2.2, 2.2, 0.6]),
    ...spokes('offhand', 'gold', 'ray', [0, CY + 0.6, 1.3], 8, 2.4, 3.9, 0.55, 0.12, 22.5),
    ...[-2, -1, 0, 1, 2].map(k => cp('offhand', 'gold', 'ray', [k * 1.5, CY + HH, 1.0], [k * 1.9, CY + HH + 2.6 - Math.abs(k) * 0.5, 1.0], 0.65, 0.12)));
  if (M) {                                                       // Winterkeep: a battlement of frost spires and a frost heart
    P.push(B('gold', 'rim', [0, CY, 0.4], [W + 0.4, HH + 0.4, 0.4], { round: 0.5 }), B('iron', 'ridge', [0, CY - 0.3, 1.3], [0.5, HH - 0.7, 0.35], { round: 0.25 }),
      el('offhand', 'gem', 'heart', [0, CY + 0.8, 1.8], [1.5, 2.1, 0.85]),
      ...[-2, -1, 0, 1, 2].map(k => cp('offhand', 'frost', 'spire', [k * 1.5, CY + HH, 1.0], [k * 1.55, CY + HH + (k === 0 ? 4.6 : Math.abs(k) === 1 ? 3.6 : 2.6), 1.0], 0.75, 0.1)));
    stamps.push({ bone: 'offhand', at: [0, CY + 0.8, 2.65], n: [0, 0, 1], facing: 0.2, on: 'gem', px: [[0, -1, 'glow'], [0, 0, 'glow'], [0, 1, 'glow']] });
  }
  return piece('tower', 'offhand', t, { mats: Object.assign(mats, { gold: t >= 3 ? GOLD : mats.gold }), prims: P, stamps }, { pose: a => a === 'hit' || a === 'dash' ? SHIELD_POSE(a) : { offhand: { aim: [0.08, 1, 0.05], roll: [0.5, 0, 0.87], off: [1.6, 0.2, 2.2] } } });
}

const pieces = {};
for (const t of TIERS) { const p = tower(t); pieces[p.id] = p; }
module.exports = { pieces };
