'use strict';
// CHIBI BUCKLER — the small round offhand shield (loadout.md: Parry+ / Bash / Aegis), six SHAPE tiers on the chibi rig, built like
// chibi-gear.js: forged from 3D volumes, no hand-drawn pixels. The face looks out to the left-front (palette SHIELD_POSE).
//   T1 Iron      a round iron plate with a raised rim
//   T2 Steel     + a steel boss (domed centre)
//   T3 Emblem    + gold rim, and a gold four-point emblem around the boss
//   T4 Studded   silver face, six gold rim studs, a sapphire boss in a gold setting
//   T5 Radiant   pearl face, eight long gold rays, a sun core boss
//   T6 Mythic    night-forged face and a ring of eight outward blades in slash-silver steel, with one glow run on the boss
// Family `buckler` (js/data.js names the item line the same way); ids buckler.t1 .. buckler.t6.
const { both, TIERS, metal, METAL, GOLD, SAPPHIRE, CORE, GLOW, flatOf, SLASHG, piece, r3, SHIELD_POSE } = require('./chibi-palette.js');

function buckler(t) {
  const M = t === 6, R = [2.9, 3.0, 3.1, 3.2, 3.3, 3.2][t - 1], C = [0, 0.3], k = R / 2.5;
  const mats = { face: metal(METAL[t - 1]), rim: t <= 2 ? metal(METAL[t === 1 ? 0 : 1]) : GOLD, boss: t === 5 ? CORE : t === 4 ? SAPPHIRE : M ? SLASHG : metal(METAL[t - 1]), gold: GOLD, blade: SLASHG, glow: flatOf(GLOW.slash) };
  const P = [{ bone: 'offhand', mat: 'face', part: 'shield', shape: 'ell', c: [C[0], C[1], 0.9], r: [R, R, 0.5] },
    { bone: 'offhand', mat: 'rim', part: 'rim', shape: 'ell', c: [C[0], C[1], 0.72], r: [R + 0.35, R + 0.35, 0.42] }];
  const at = (a, d, z) => [C[0] + d * Math.cos(a), C[1] + d * Math.sin(a), z];
  const stamps = [];
  if (t >= 2) P.push({ bone: 'offhand', mat: 'boss', part: 'boss', shape: 'ell', c: [C[0], C[1], 1.3], r: t >= 4 ? [1.2 * k, 1.2 * k, 0.6] : [1.0 * k, 1.0 * k, 0.55] });
  if (t === 3) P.push(...[0, 90, 180, 270].map(d => { const a = d * Math.PI / 180;       // the emblem: four gold arms around the boss
    return { bone: 'offhand', mat: 'gold', part: 'emblem', shape: 'cap', a: at(a, 0.9 * k, 1.15), b: at(a, 2.1 * k, 1.15), ra: 0.45, rb: 0.3 }; }));
  if (t >= 4) P.push({ bone: 'offhand', mat: 'gold', part: 'emblem', shape: 'ell', c: [C[0], C[1], 1.15], r: [1.6 * k, 1.6 * k, 0.4] });
  if (t === 4) P.push(...[0, 60, 120, 180, 240, 300].map(d => { const a = d * Math.PI / 180;    // rim studs
    return { bone: 'offhand', mat: 'gold', part: 'rim', shape: 'cap', a: at(a, R + 0.1, 0.85), b: at(a, R + 1.3, 0.85), ra: 0.7, rb: 0.12 }; }));
  if (t === 5) P.push(...[0, 45, 90, 135, 180, 225, 270, 315].map(d => { const a = (d + 22.5) * Math.PI / 180;   // long gold rays between the compass points
    return { bone: 'offhand', mat: 'gold', part: 'rim', shape: 'cap', a: at(a, R + 0.1, 0.85), b: at(a, R + 2.2, 0.82), ra: 0.8, rb: 0.12 }; }));
  if (M) {                                                      // a ring of eight outward blades, long on the compass points
    P.push(...[0, 45, 90, 135, 180, 225, 270, 315].map((d, i) => { const a = d * Math.PI / 180, L = i % 2 ? 2.2 : 3.2;
      return { bone: 'offhand', mat: 'blade', part: 'blades', shape: 'cap', a: at(a, R - 0.2, 0.85), b: at(a, R + L, 0.82), ra: 0.9, rb: 0.1 }; }));
    stamps.push({ bone: 'offhand', at: [C[0], C[1], 1.85], n: [0, 0, 1], facing: 0.2, on: 'boss', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  }
  return piece('buckler', 'offhand', t, { mats, prims: P, stamps }, { pose: a => a === 'hit' || a === 'dash' ? SHIELD_POSE(a) : { offhand: { aim: [0.05, 1, 0], roll: [0, 0, 1], off: [2.0, 1.0, 2.6] } } });
}

const pieces = {};
for (const t of TIERS) { const p = buckler(t); pieces[p.id] = p; }
module.exports = { pieces };
