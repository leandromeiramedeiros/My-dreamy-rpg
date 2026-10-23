'use strict';
// CHIBI BOW — the Shots two-hander (class 'bow': held in the off hand, the draw hand pulls the string), six SHAPE tiers on the chibi rig,
// forged from 3D volumes (no hand-drawn pixels). The limbs sweep toward the archer (-z), the string runs tip to tip; the limbs grow every tier:
//   T1 Short     a wooden limb pair, a leather grip, a plain string
//   T2 Long      a longer stave, steel tip caps
//   T3 Gilded    steel limbs, gold tip caps and riser band, a ruby on the riser
//   T4 Recurve   silver limbs recurved into gold wing tips, a sapphire riser
//   T5 Radiant   limbs of light, a gold riser, a string of light
//   T6 Mythic    Dawnstring: night-forged riser, dawn-gold limbs fanned with sun rays and a glow run on the limb
// Family `bow`; ids bow.t1 .. bow.t6. The offhand bone's +y runs tip to tip.
const { TIERS, metal, METAL, GOLD, WOOD, LEATHER, RUBY, SAPPHIRE, CORE, HOLYG, piece, glowOf, notAttack, fine, cp, el, dc } = require('./chibi-wpal.js');

function bow(t) {
  const M = t === 6, O = 'offhand', hl = [8.6, 9.6, 10.0, 10.5, 10.8, 11.0][t - 1], bz = -2.8;
  const mats = { limb: t === 1 ? WOOD : t === 5 ? CORE : M ? HOLYG : t === 2 ? WOOD : metal(METAL[Math.min(t, 4) - 1]), riser: M ? metal(METAL[5]) : t === 5 ? GOLD : t >= 3 ? metal(METAL[Math.min(t, 4) - 1]) : WOOD,
    grip: LEATHER, gold: GOLD, iron: metal(METAL[1]), gem: t === 3 ? RUBY : M ? HOLYG : SAPPHIRE, ray: fine(M ? HOLYG : GOLD),
    str: fine(t === 5 ? CORE : { ramp: ['#3a2c1c', '#5c4630', '#8c7352', '#c4ab80'] }), glow: glowOf('holy') };
  const P = [];
  for (const s of [1, -1]) P.push(cp(O, 'limb', 'limb', [0, s * 1.6, 0], [0, s * hl * 0.55, bz * 0.35], 1.15, 0.95), cp(O, 'limb', 'limb', [0, s * hl * 0.55, bz * 0.35], [0, s * hl, bz], 0.95, 0.5),
    cp(O, 'str', 'string', [0, s * hl, bz], [0, s * 0.4, bz], 0.4, 0.4));
  P.push(cp(O, 'riser', 'riser', [0, -2.2, 0], [0, 2.2, 0], 1.5, 1.5), cp(O, 'grip', 'grip', [0, -1.5, 0.2], [0, 1.5, 0.2], 1.65, 1.65));
  if (t >= 2) for (const s of [1, -1]) P.push(el(O, t === 2 ? 'iron' : 'gold', 'cap', [0, s * hl, bz], [0.8, 0.9, 0.8]));
  if (t === 3) P.push(dc(O, 'gold', 'band', [0, 2.6, 0.2], [1.7, 0.4, 1.7]), dc(O, 'gold', 'band', [0, -2.6, 0.2], [1.7, 0.4, 1.7]), el(O, 'gem', 'gem', [0, 0, 1.3], [0.85, 0.85, 0.6]));
  if (t === 4) for (const s of [1, -1]) P.push(cp(O, 'gold', 'wing', [0, s * hl, bz], [0, s * (hl + 2.6), bz + 1.6], 0.7, 0.12), cp(O, 'gold', 'wing', [0, s * hl * 0.6, bz * 0.4], [0.9, s * (hl * 0.8), bz * 0.5], 0.5, 0.12), dc(O, 'gold', 'band', [0, s * 2.7, 0.2], [1.7, 0.4, 1.7]));
  if (t === 4) P.push(el(O, 'gem', 'gem', [0, 0, 1.4], [0.95, 0.95, 0.65]));
  if (t === 5) for (const s of [1, -1]) P.push(cp(O, 'ray', 'wing', [0, s * hl, bz], [0, s * (hl + 3.0), bz + 1.8], 0.7, 0.12), cp(O, 'gold', 'cap', [0, s * 1.6, 0], [0, s * 2.8, 0.1], 1.7, 1.7), cp(O, 'ray', 'ray', [0.2, s * 2.4, 0.4], [3.0, s * 4.6, 0.6], 0.6, 0.12), cp(O, 'ray', 'ray', [-0.2, s * 2.4, 0.4], [-3.0, s * 4.6, 0.6], 0.6, 0.12));
  const stamps = [];
  if (M) {                                                      // Dawnstring: sun rays fan off the riser, gold wing tips
    for (const s of [1, -1]) P.push(cp(O, 'ray', 'wing', [0, s * hl, bz], [0, s * (hl + 3.0), bz + 1.8], 0.7, 0.12), cp(O, 'gem', 'cap', [0, s * 1.6, 0], [0, s * 2.8, 0.1], 1.7, 1.7),
      cp(O, 'ray', 'ray', [0.3, s * 2.4, 0.4], [3.4, s * 5.0, 0.6], 0.6, 0.12), cp(O, 'ray', 'ray', [-0.3, s * 2.4, 0.4], [-3.4, s * 5.0, 0.6], 0.6, 0.12));
    P.push(el(O, 'gem', 'gem', [0, 0, 1.4], [1.0, 1.0, 0.7]), el(O, 'gold', 'cap', [0, hl, bz], [0.8, 0.9, 0.8]), el(O, 'gold', 'cap', [0, -hl, bz], [0.8, 0.9, 0.8]));
    stamps.push({ bone: O, at: [0, hl * 0.55, bz * 0.35 + 0.9], n: [0, 0, 1], facing: 0.2, on: 'limb', px: [[0, -1, 'glow'], [0, 0, 'glow'], [0, 1, 'glow']] });
  }
  const hold = { rest: [0.75, 0.62, 0.25], cast: [-0.1, 0.9, 0.4], hit: [-0.1, 0.95, 0.3], dash: [0.1, 0.8, -0.6] };
  return piece('bow', 'weapon', t, { mats, prims: P, stamps }, { class: 'bow', sockets: { tip: { bone: O, at: [0, hl + 2, bz] } },
    pose: notAttack(a => ({ offhand: { aim: a === 'cast' ? hold.cast : a === 'hit' ? hold.hit : a === 'dash' ? hold.dash : hold.rest, roll: a === 'cast' || a === 'hit' || a === 'dash' ? [0, 0, 1] : [0.6, -0.8, 0] } })) });
}

const pieces = {};
for (const t of TIERS) { const p = bow(t); pieces[p.id] = p; }
module.exports = { pieces };
