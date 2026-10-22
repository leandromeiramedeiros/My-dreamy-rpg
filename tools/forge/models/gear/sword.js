'use strict';
// SWORD LINE — sword.t1 .. sword.t5 + sword.t6 (Mythic) for the ref rig, one baked piece per shape tier. Every tier keeps
// the one below it and adds: T1 Rusty Blade (plain rust blade, bar guard), T2 Dawnblade (steel, fuller, longer),
// T3 Sunforged (gold curved quillons, sun etch, gem pommel), T4 Aurora Edge (winged guard, emissive edge, gem),
// T5 Dawn Eternal (blade of light, halo wings, light pommel), T6 Mythic Morrowbane (T5 + a twin shard crown and
// hue-cycling emissive edges). Hybrid: blade and quillons are volumes posed by the rig; the guard face and the pommel gem
// are pixel parts per facing (front() makes the 8 grids). Sockets: tip / weaponTip (blade point), gem (pommel).
const C = require('./common.js');
const { PAL, EMIT, metal, gemOf, flat, piece, sockets, notAttack, front, lintGrid } = C;

const SWORD = { rest: [-0.3, 0.85, 0.42], walk: [0, 0.85, 0.7] };   // held low in front on the run (same as ref-gear)
const BLADE = [PAL.rust, PAL.steel, PAL.polish, PAL.silver, PAL.pearl];
const LEN = [8.4, 9.0, 9.4, 9.8, 10.4, 10.4];

function tier(t) {
  const L = LEN[t - 1], MT = t === 1 ? { ramp: PAL.rust, lift: 1 } : Object.assign(metal(BLADE[Math.min(t, 5) - 1]), { lift: 2 });
  const mats = { blade: t === 5 || t === 6 ? flat(EMIT.sun, 2) : MT, grip: { ramp: PAL.leather }, guard: t === 1 ? metal(PAL.iron) : t === 2 ? metal(PAL.steel) : metal(PAL.gold),
    gold: metal(PAL.gold), edge: { ramp: PAL.steel, spec: 0.9, keep: true } };
  const P = [];
  // grip + pommel
  P.push({ bone: 'weapon', mat: 'grip', part: 'hilt', shape: 'cap', a: [0, -1.0, 0], b: [0, 1.0, 0], ra: 0.58, rb: 0.58 });
  P.push({ bone: 'weapon', mat: t >= 3 ? 'gold' : 'guard', part: 'pommel', shape: 'ell', c: [0, -1.45, 0], r: [0.85, 0.7, 0.85] });
  // blade: a tapered capsule; the tip tapers to a point
  P.push({ bone: 'weapon', mat: 'blade', part: 'blade', shape: 'cap', a: [0, 1.5, 0], b: [0, t >= 5 ? L - 0.3 : L - 0.4, 0], ra: t >= 5 ? 0.95 : 0.5 + 0.04 * t, rb: t >= 5 ? 0.55 : 0.2 });
  if (t < 5) P.push({ bone: 'weapon', mat: 'blade', part: 'blade', shape: 'cap', a: [0, L - 0.6, 0], b: [0, L, 0], ra: 0.2, rb: 0.05 });
  // the blade's bright core: a 1 px screen-space line survives every cleanup and foreshortening (the cap alone is eaten)
  if (t < 5) { P.push({ bone: 'weapon', mat: 'blade', part: 'blade', shape: 'line', a: [0, 1.5, 0.3], b: [0, L, 0.3], tone: t === 1 ? 2 : 3, conn4: true });
    if (t >= 3) P.push({ bone: 'weapon', mat: 'blade', part: 'blade', shape: 'line', a: [0.55, 1.6, 0.1], b: [0.15, L - 0.8, 0.1], tone: 1, conn4: true }); }
  // guard bar (volume; the pixel face below sits over it)
  const gw = [1.5, 1.7, 1.9, 2.3, 2.6, 2.6][t - 1];
  P.push({ bone: 'weapon', mat: 'guard', part: 'guard', shape: 'box', c: [0, 1.25, 0], h: [gw, 0.3, 0.45], round: 0.2 });
  if (t >= 2) P.push({ bone: 'weapon', mat: t === 5 || t === 6 ? 'blade' : 'edge', part: 'fuller', shape: 'line', a: [0, 2.2, 0.4], b: [0, L - 2.0, 0.4], tone: t >= 5 ? 0 : 1, conn4: true });
  if (t >= 3) {            // curved quillons: tips sweep up, a gold collar, a sun etch
    for (const k of [-1, 1]) P.push({ bone: 'weapon', mat: 'gold', part: 'guard', shape: 'cap', a: [1.4 * k, 1.25, 0], b: [(gw + 0.5) * k, 1.95, 0], ra: 0.32, rb: 0.2 });
    P.push({ bone: 'weapon', mat: 'gold', part: 'guard', shape: 'cap', a: [0, 1.4, 0], b: [0, 2.0, 0], ra: 0.75, rb: 0.65 });
  }
  if (t >= 4) {            // wings: a second feather of the guard, swept up, and a gem on the guard
    for (const k of [-1, 1]) P.push({ bone: 'weapon', mat: 'gold', part: 'guard', shape: 'cap', a: [1.2 * k, 1.1, -0.1], b: [(gw + 0.2) * k, 0.4, -0.1], ra: 0.3, rb: 0.18 });
  }
  if (t === 6) {           // the Mythic crown: two spectral shards beside the blade, a hue-cycling spine
    for (const k of [-1, 1]) {
      P.push({ bone: 'weapon', mat: 'hueA', part: 'shard', shape: 'line', a: [1.9 * k, 3.4, 0], b: [2.4 * k, 7.6, 0], tone: 0, conn4: true });
      P.push({ bone: 'weapon', mat: 'hueB', part: 'shard', shape: 'line', a: [2.8 * k, 4.4, 0.1], b: [3.2 * k, 6.4, 0.1], tone: 0, conn4: true });
    }
    P.push({ bone: 'weapon', mat: 'hueA', part: 'spine', shape: 'line', a: [0, 1.8, 0.45], b: [0, L - 1.2, 0.45], tone: 0, conn4: true });
    mats.hueA = flat('#ff8a5a', 2); mats.hueB = flat('#8ad0ff', 2);
  }
  mats.gem = gemOf(t === 3 ? PAL.sapphire : t === 4 ? PAL.ruby : PAL.sapphire);
  mats.emitSun = flat(EMIT.sun, 2); mats.emitAur = flat(EMIT.aurora, 2);
  // pixel faces: guard (crossbar with the gem / trim) and pommel stone, per facing
  const G = { 1: ['LLLLL', 'aaaaa'], 2: ['LLLLLLL', 'aaAAAaa'], 3: ['dd.....dd', 'LLAAGGAAL', 'aaaAAAaaa'], 4: ['dd.....dd', 'LLAAGGAAL', 'aaAAGGAAa', '..aAAAAa.'], 5: ['LL.....LL', 'LLLLGGLLL', '.LLLLLLL.'], 6: ['LL.....LL', 'LLLLGGLLL', '.LLLLLLL.'] }[t];
  const gkey = t <= 2 ? { a: ['guard', 0], A: ['guard', 2], L: ['guard', 3] } : t <= 4 ? { d: ['gold', 0], a: ['gold', 1], A: ['gold', 2], L: ['gold', 3], G: ['gem', 3] } : { L: ['emitSun', 0], G: ['gem', 3] };
  const sprites = [{ bone: 'weapon', at: [0, 1.25, 0], part: 'guard', bias: 0.9, key: gkey, dirs: lintGrid(`sword.t${t}.guard`, front(G, { minW: 2 })) }];
  return piece('sword', 'weapon', t, { mats, prims: P, sprites }, {
    class: 'sword', smear: '#fafaf6',
    sockets: sockets({ tip: { bone: 'weapon', at: [0, L, 0] }, weaponTip: { bone: 'weapon', at: [0, L, 0] }, gem: { bone: 'weapon', at: [0, 1.25, 0.6] } }),
    pose: notAttack(a => ({ weapon: { aim: a === 'walk' ? SWORD.walk : SWORD.rest } })),
  });
}
const pieces = {}; for (let t = 1; t <= 6; t++) pieces[`sword.t${t}`] = tier(t);
module.exports = { line: 'sword', pieces, tiers: [1, 2, 3, 4, 5, 6].map(t => [`sword.t${t}`]), SWORD };
