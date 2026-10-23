'use strict';
// CHIBI CLAWS — the Shadows fist pair (class 'shadow': crouch, cross-slash left, cross-slash right, double stab), six SHAPE tiers on
// the chibi rig, forged from 3D volumes (no hand-drawn pixels). One piece, a claw gauntlet on the `weapon` bone AND on the `offhand`
// bone: a knuckle bar in the fist and three blades that run out past the knuckles:
//   T1 Bonecrawl   three bone talons on a leather knuckle strap
//   T2 Ironhooks   iron talons, a steel knuckle plate
//   T3 Gilded      steel talons, a gold knuckle plate and a ruby
//   T4 Wingtalons  curved silver talons, gold wing plate, a sapphire and a plume at the wrist
//   T5 Radiant     talons of light, gold wings and rays
//   T6 Mythic      Emberclaw: night-forged talons with ember tips, a fire crest over the knuckles, a fire glow run on the middle talon
// Family `claws`; ids claws.t1 .. claws.t6.
const { TIERS, metal, METAL, GOLD, LEATHER, RUBY, SAPPHIRE, CORE, BONE, FIREG, piece, glowOf, holdPose, fine, cp, el, bx } = require('./chibi-wpal.js');

function claw(B, t, len) {
  const M = t === 6, s = B === 'weapon' ? 1 : -1, P = [];
  P.push(cp(B, 'grip', 'hilt', [0, -1.6, 0], [0, 1.2, 0], 0.7, 0.7));                              // the bar the fist closes on
  P.push(bx(B, 'plate', 'plate', [0, 1.8, 0], [t === 1 ? 2.6 : 3.0, 0.75, 0.7], { round: 0.3 }));  // the knuckle plate the talons grow from
  const lens = [len * 0.82, len, len * 0.82];                                                       // outer talons shorter
  const talon = (x, L, i) => {
    const bend = (t >= 4 ? 1.6 : 0.9) * s + x * 0.35;                                                           // the tip curls inward
    return [cp(B, 'blade', 'blade', [x, 2.2, 0], [x + bend * 0.35, 2.2 + L * 0.55, 0], t === 5 ? 0.85 : 0.95, 0.8),
      cp(B, 'blade', 'blade', [x + bend * 0.35, 2.2 + L * 0.55, 0], [x + bend, 2.2 + L, 0], 0.8, 0.22)];
  };
  [-2.0, 0, 2.0].forEach((x, i) => P.push(...talon(x, lens[i], i)));
  if (t === 5) [-2.0, 0, 2.0].forEach((x, i) => P.push(cp(B, 'core', 'blade', [x, 2.4, 0.15], [x + 0.9 * s, 2.0 + lens[i] * 0.9, 0.15], 1.0, 0.3)));
  if (t === 3) P.push(el(B, 'gem', 'gem', [0, 1.8, 0.75], [0.7, 0.55, 0.45]), cp(B, 'gold', 'band', [0, -0.1, 0], [0, 0.7, 0], 0.9, 0.9));
  if (t === 4) P.push(...[1, -1].map(k => cp(B, 'gold', 'wing', [1.3 * k, 1.9, 0], [3.0 * k, 2.8, 0], 0.55, 0.2)), el(B, 'gem', 'gem', [0, 1.8, 0.75], [0.8, 0.6, 0.5]), cp(B, 'gold', 'band', [0, -0.1, 0], [0, 0.7, 0], 0.9, 0.9),
    cp(B, 'plume', 'plume', [0.2, -2.0, 0], [0.6 * s, -4.8, 0.3], 0.6, 0.3));
  if (t === 5) P.push(...[1, -1].flatMap(k => [cp(B, 'wing', 'wing', [1.3 * k, 1.8, 0], [3.2 * k, 3.0, 0], 0.55, 0.3), cp(B, 'wing', 'wing', [3.2 * k, 3.0, 0], [3.8 * k, 4.8, 0], 0.4, 0.12)]), cp(B, 'gold', 'band', [0, -0.1, 0], [0, 0.7, 0], 0.9, 0.9));
  if (M) P.push(...[-2.0, 0, 2.0].map((x, i) => cp(B, 'ember', 'tip', [x + 0.9 * s * (lens[i] / len), 2.2 + lens[i] * 0.78, 0], [x + 1.6 * s * (lens[i] / len), 2.2 + lens[i], 0], 0.7, 0.2)),
    ...[-1, 0, 1].map(k => cp(B, 'ember', 'crest', [k * 1.2, 2.5, 0], [k * 1.5, 4.0 + (k === 0 ? 0.8 : 0), 0.2], 0.55, 0.12)), el(B, 'gem', 'gem', [0, 1.8, 0.75], [0.8, 0.6, 0.5]), cp(B, 'plate', 'band', [0, -0.1, 0], [0, 0.7, 0], 0.9, 0.9));
  return P;
}

function claws(t) {
  const M = t === 6, len = [7.0, 7.6, 8.0, 8.6, 9.0, 9.4][t - 1];
  const mats = { blade: t === 1 ? ['#3a2e28', '#6a5848', '#8e7c62', '#b2a284'] : t === 5 ? fine(CORE) : M ? metal(METAL[5]) : metal(METAL[Math.min(t, 4) - 1]), grip: LEATHER, plate: t === 1 ? LEATHER : t === 2 ? metal(METAL[1]) : t === 3 ? GOLD : t >= 4 && !M ? GOLD : metal(METAL[4]), gold: GOLD,
    gem: t === 3 ? RUBY : M ? FIREG : SAPPHIRE, core: fine(CORE), wing: fine(GOLD), ember: FIREG, plume: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'], glow: glowOf('fire') };
  const P = [...claw('weapon', t, len), ...claw('offhand', t, len)], stamps = [];
  if (M) for (const B of ['weapon', 'offhand']) stamps.push({ bone: B, at: [0.2, 4.6, 1.0], n: [0, 0, 1], facing: 0.2, on: 'blade', px: [[-1, 0, 'glow'], [0, 0, 'glow']] });
  return piece('claws', 'weapon', t, { mats, prims: P, stamps }, { class: 'shadow', sockets: { tip: { bone: 'weapon', at: [0, len + 2, 0] } },
    pose: holdPose('one', a => { const w = a === 'cast' ? [-0.3, -0.6, 0.75] : a === 'hit' ? [-0.45, -0.5, 0.75] : a === 'dash' ? [-0.3, -0.2, -0.93] : [-0.4, -0.75, 0.5]; return { weapon: { aim: w }, offhand: { aim: [-w[0], w[1], w[2]] } }; }) });
}

const pieces = {};
for (const t of TIERS) { const p = claws(t); pieces[p.id] = p; }
module.exports = { pieces };
