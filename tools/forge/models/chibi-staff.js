'use strict';
// CHIBI STAFF — the two-hander (class 'staff': attack:staff raises, thrusts and holds with both hands), six SHAPE tiers on the
// chibi rig. Same shaft, the HEAD ornament grows every tier (forged from 3D volumes, no hand-drawn pixels):
//   T1 Branch    a plain wooden shaft with a knotted, forked top
//   T2 Claw      iron three-prong claw holding a small crystal, an iron ferrule
//   T3 Gold      gold ferrule and grip bands, a gold cradle around a ruby
//   T4 Horned    two curved gold horns around a sapphire, a pointed cap and a pair of tassel ribbons
//   T5 Radiant   a large orb of light in a crown of six gold rays
//   T6 Mythic    Emberfall: night-forged shaft, an ember orb in a ring of seven flame tongues, three falling embers; fire hue,
//                one glow run on the orb
// Family `staff`; ids staff.t1 .. staff.t6.
const { both, TIERS, metal, METAL, GOLD, WOOD, LEATHER, RUBY, SAPPHIRE, CORE, GLOW, flatOf, FIREG, piece, notAttack } = require('./chibi-palette.js');

function staff(t) {
  const M = t === 6, TOP = 16.0;                                // shaft top (weapon-local y); the head sits above it
  const mats = { shaft: M ? metal(METAL[5]) : t >= 4 ? metal(METAL[t - 1]) : WOOD, grip: LEATHER, iron: M ? metal(METAL[5]) : metal(METAL[Math.min(t, 4) - 1]), gold: GOLD,
    gem: t === 3 ? RUBY : t === 5 ? CORE : M ? FIREG : SAPPHIRE, ember: FIREG, glow: flatOf(GLOW.fire), plume: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'] };
  const P = [{ bone: 'weapon', mat: 'shaft', part: 'shaft', shape: 'cap', a: [0, -9.0, 0], b: [0, TOP, 0], ra: 0.8, rb: 0.78 },
    { bone: 'weapon', mat: 'grip', part: 'grip', shape: 'cap', a: [0, -1.8, 0], b: [0, 1.4, 0], ra: 0.95, rb: 0.95 }];
  const at = (a, d, y, z) => [d * Math.cos(a), y, d * Math.sin(a) + (z || 0)];
  if (t === 1) P.push({ bone: 'weapon', mat: 'shaft', part: 'head', shape: 'ell', c: [0, TOP + 0.9, 0], r: [1.5, 1.5, 1.5] },
    { bone: 'weapon', mat: 'shaft', part: 'head', shape: 'cap', a: [0.3, TOP + 0.6, 0], b: [1.8, TOP + 3.2, 0], ra: 0.85, rb: 0.3 },
    { bone: 'weapon', mat: 'shaft', part: 'head', shape: 'cap', a: [-0.3, TOP + 0.6, 0], b: [-1.5, TOP + 2.4, 0], ra: 0.8, rb: 0.3 });
  if (t >= 2) {                                                 // the iron ferrule at the foot
    P.push({ bone: 'weapon', mat: t >= 3 ? 'gold' : 'iron', part: 'foot', shape: 'cap', a: [0, -9.4, 0], b: [0, -7.6, 0], ra: 1.05, rb: 1.0 });
  }
  if (t === 2) {                                                // a three-prong iron claw round a small crystal
    P.push({ bone: 'weapon', mat: 'gem', part: 'gem', shape: 'ell', c: [0, TOP + 2.4, 0], r: [1.2, 1.4, 1.2] },
      { bone: 'weapon', mat: 'iron', part: 'head', shape: 'ell', c: [0, TOP + 0.4, 0], r: [1.3, 0.8, 1.3] },
      ...[-1, 0, 1].map(k => ({ bone: 'weapon', mat: 'iron', part: 'head', shape: 'cap', a: [0.7 * k, TOP + 0.5, 0], b: [1.7 * k, TOP + 3.9 - Math.abs(k) * 0.6, 0], ra: 0.6, rb: 0.2 })));
  }
  if (t >= 3) P.push({ bone: 'weapon', mat: 'gold', part: 'bands', shape: 'disc', c: [0, 1.7, 0], r: [1.15, 0.4, 1.15] },
    { bone: 'weapon', mat: 'gold', part: 'bands', shape: 'disc', c: [0, -2.1, 0], r: [1.15, 0.4, 1.15] });
  if (t === 3) P.push({ bone: 'weapon', mat: 'gem', part: 'gem', shape: 'ell', c: [0, TOP + 2.6, 0], r: [1.5, 1.7, 1.5] },
    { bone: 'weapon', mat: 'gold', part: 'head', shape: 'ell', c: [0, TOP + 0.6, 0], r: [1.5, 0.9, 1.5] },
    ...[-1, 1].map(k => ({ bone: 'weapon', mat: 'gold', part: 'head', shape: 'cap', a: [1.0 * k, TOP + 0.6, 0], b: [2.0 * k, TOP + 3.4, 0], ra: 0.65, rb: 0.2 })));
  if (t === 4) {                                                // gold horns curving up round the sapphire, a pointed cap
    P.push({ bone: 'weapon', mat: 'gem', part: 'gem', shape: 'ell', c: [0, TOP + 2.8, 0], r: [1.6, 1.8, 1.6] },
      { bone: 'weapon', mat: 'gold', part: 'head', shape: 'ell', c: [0, TOP + 0.6, 0], r: [1.6, 0.9, 1.6] },
      { bone: 'weapon', mat: 'gold', part: 'head', shape: 'cap', a: [0, TOP + 4.4, 0], b: [0, TOP + 6.3, 0], ra: 0.75, rb: 0.12 },
      ...both((s, k) => [{ bone: 'weapon', mat: 'gold', part: 'head', shape: 'cap', a: [1.0 * k, TOP + 0.6, 0], b: [2.6 * k, TOP + 2.6, 0], ra: 0.8, rb: 0.6 },
        { bone: 'weapon', mat: 'gold', part: 'head', shape: 'cap', a: [2.6 * k, TOP + 2.6, 0], b: [2.5 * k, TOP + 5.2, 0], ra: 0.6, rb: 0.12 },
        { bone: 'weapon', mat: 'plume', part: 'tassel', shape: 'cap', a: [1.0 * k, TOP - 0.6, 0.4], b: [1.8 * k, TOP - 3.4, 0.6], ra: 0.6, rb: 0.35 }]));
  }
  if (t === 5) {                                                // a large orb of light in a crown of six gold rays
    P.push({ bone: 'weapon', mat: 'gem', part: 'gem', shape: 'ell', c: [0, TOP + 3.4, 0], r: [2.2, 2.2, 2.2] },
      { bone: 'weapon', mat: 'gold', part: 'head', shape: 'ell', c: [0, TOP + 0.6, 0], r: [1.9, 1.0, 1.9] },
      ...[0, 1, 2, 3, 4, 5].map(i => { const a = (i * 60 + 90) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
        return { bone: 'weapon', mat: 'gold', part: 'head', shape: 'cap', a: [1.4 * ca, TOP + 0.8, 1.4 * sa], b: [3.5 * ca, TOP + 3.6 + (i % 2 ? 0.8 : 1.8), 3.5 * sa], ra: 0.7, rb: 0.12 }; }));
  }
  if (M) {                                                      // Emberfall: an ember orb, seven flame tongues, three falling embers
    P.push({ bone: 'weapon', mat: 'gem', part: 'gem', shape: 'ell', c: [0, TOP + 3.4, 0], r: [2.0, 2.0, 2.0] },
      { bone: 'weapon', mat: 'iron', part: 'head', shape: 'ell', c: [0, TOP + 0.6, 0], r: [1.7, 0.9, 1.7] },
      { bone: 'weapon', mat: 'glow', part: 'gem', shape: 'ell', c: [0, TOP + 3.4, 1.9], r: [0.8, 0.6, 0.4] },
      ...[0, 1, 2, 3, 4, 5, 6].map(i => { const a = (i * 360 / 7 + 90) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
        return { bone: 'weapon', mat: 'ember', part: 'flame', shape: 'cap', a: [1.5 * ca, TOP + 1.0, 1.5 * sa], b: [3.1 * ca, TOP + 4.6 + (i % 2 ? 1.2 : 2.6), 3.1 * sa], ra: 0.75, rb: 0.12 }; }),
      ...[[2.8, 8.4, 0.5], [-3.0, 6.2, 0.2], [2.0, 4.4, 0.8]].map(([x, y, z], i) => ({ bone: 'weapon', mat: 'ember', part: 'drop' + i, shape: 'ell', c: [x * 0.8, TOP + y * 0.6 - 1.0, z], r: [0.9, 1.2, 0.8] })));
  }
  return piece('staff', 'weapon', t, { mats, prims: P }, {
    class: 'staff', sockets: { tip: { bone: 'weapon', at: [0, TOP + (t === 1 ? 3 : t === 2 ? 4 : 6), 0] } },
    pose: notAttack(a => ({ weapon: { aim: a === 'cast' ? [0, 1, 0.5] : a === 'hit' ? [0, 1, -0.1] : a === 'dash' ? [0, 0.6, -0.8] : [-0.32, 1, 0.1] } })),
  });
}

const pieces = {};
for (const t of TIERS) { const p = staff(t); pieces[p.id] = p; }
module.exports = { pieces };
