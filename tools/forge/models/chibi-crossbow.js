'use strict';
// CHIBI CROSSBOW — the Shots two-hander (class 'crossbow': shouldered, level shot), six SHAPE tiers on the chibi rig, forged from 3D
// volumes (no hand-drawn pixels). A stock along the aim, a prod across it, a bolt on the rail; the prod grows every tier:
//   T1 Hunting   a wooden stock and prod, a rope string, an iron stirrup
//   T2 Steel     an iron prod with steel bands, an iron bolt
//   T3 Gilded    steel prod, gold rail and inlay, a ruby over the lock
//   T4 Winged    a silver prod swept into gold wing tips, a sapphire, a gold scope ring
//   T5 Radiant   a prod of light on a gold stock, a bolt of light
//   T6 Mythic    Rimebolt: a night-forged stock, a frost-crystal prod, an ice bolt and a glow run on the rail
// Family `crossbow`; ids crossbow.t1 .. crossbow.t6. The weapon bone's +y is the shot.
const { TIERS, metal, METAL, GOLD, WOOD, LEATHER, RUBY, SAPPHIRE, CORE, FROSTG, piece, glowOf, holdPose, fine, cp, el, dc, bx } = require('./chibi-wpal.js');

function crossbow(t) {
  const M = t === 6, W = 'weapon', w = [5.2, 5.6, 6.0, 6.4, 6.6, 6.6][t - 1], YP = 8.0;
  const mats = { stock: t === 1 ? WOOD : M ? metal(METAL[5]) : t === 5 ? GOLD : t === 2 ? metal(METAL[0]) : metal(METAL[Math.min(t, 4) - 2]), prod: t === 1 ? WOOD : t === 5 ? fine(CORE) : M ? FROSTG : metal(METAL[Math.min(t, 4) - 1]),
    iron: metal(METAL[1]), gold: GOLD, grip: LEATHER, gem: t === 3 ? RUBY : M ? FROSTG : SAPPHIRE, bolt: t === 5 ? fine(CORE) : M ? FROSTG : metal(METAL[Math.min(t, 4) - 1]),
    str: fine({ ramp: ['#3a2c1c', '#5c4630', '#8c7352', '#c4ab80'] }), tipg: fine(t === 5 ? CORE : GOLD), glow: glowOf('frost') };
  const P = [cp(W, 'stock', 'stock', [0, -4.0, 0], [0, YP + 1.6, 0], 1.15, 0.95), cp(W, 'grip', 'grip', [0, -2.4, 0], [0, 1.4, 0], 1.0, 1.0),
    cp(W, 'prod', 'prod', [0, YP, 0], [w * 0.62, YP + 0.2, 0], 0.95, 0.8), cp(W, 'prod', 'prod', [0, YP, 0], [-w * 0.62, YP + 0.2, 0], 0.95, 0.8),
    cp(W, 'prod', 'prod', [w * 0.62, YP + 0.2, 0], [w, YP + 1.7, 0], 0.8, 0.45), cp(W, 'prod', 'prod', [-w * 0.62, YP + 0.2, 0], [-w, YP + 1.7, 0], 0.8, 0.45),
    cp(W, 'str', 'string', [w, YP + 1.7, 0], [0, YP - 3.2, 0.2], 0.4, 0.4), cp(W, 'str', 'string', [-w, YP + 1.7, 0], [0, YP - 3.2, 0.2], 0.4, 0.4),
    cp(W, 'bolt', 'bolt', [0, YP - 3.2, 1.1], [0, YP + 4.2, 1.1], 0.5, 0.3), cp(W, 'bolt', 'bolt', [0, YP + 4.0, 1.1], [0, YP + 5.6, 1.1], 0.55, 0.1)];
  if (t === 1) P.push(cp(W, 'iron', 'stirrup', [-1.4, YP + 1.0, 0], [1.4, YP + 1.0, 0], 0.55, 0.55), dc(W, 'iron', 'ring', [0, YP + 1.2, 0], [1.3, 0.35, 1.3]));
  if (t === 2) P.push(cp(W, 'iron', 'band', [-0.3, YP - 1.0, 0], [0.3, YP + 1.0, 0], 1.3, 1.3), cp(W, 'iron', 'stirrup', [-1.6, YP + 1.1, 0], [1.6, YP + 1.1, 0], 0.6, 0.6), dc(W, 'iron', 'band', [0, 3.0, 0], [1.2, 0.35, 1.2]));
  if (t === 3) P.push(cp(W, 'gold', 'rail', [0, 0.5, 0.9], [0, YP + 1.2, 0.9], 0.6, 0.6), dc(W, 'gold', 'band', [0, YP - 1.0, 0], [1.5, 0.4, 1.5]), dc(W, 'gold', 'band', [0, 3.0, 0], [1.2, 0.35, 1.2]), el(W, 'gem', 'gem', [0, 1.4, 1.2], [0.85, 0.85, 0.6]), cp(W, 'iron', 'stirrup', [-1.6, YP + 1.1, 0], [1.6, YP + 1.1, 0], 0.6, 0.6));
  if (t === 4) P.push(cp(W, 'gold', 'rail', [0, 0.5, 0.9], [0, YP + 1.4, 0.9], 0.6, 0.6), ...[1, -1].map(k => cp(W, 'gold', 'wing', [w * k, YP + 1.7, 0], [(w + 1.2) * k, YP + 4.4, 0], 0.6, 0.12)), dc(W, 'gold', 'band', [0, YP - 1.0, 0], [1.6, 0.4, 1.6]),
    el(W, 'gem', 'gem', [0, 1.4, 1.2], [0.95, 0.95, 0.65]), dc(W, 'gold', 'ring', [0, YP + 2.6, 1.0], [1.0, 0.4, 1.0]), dc(W, 'gold', 'band', [0, 3.0, 0], [1.2, 0.35, 1.2]));
  if (t === 5) P.push(cp(W, 'gold', 'rail', [0, 0.5, 0.9], [0, YP + 1.4, 0.9], 0.6, 0.6), ...[1, -1].map(k => cp(W, 'tipg', 'wing', [w * k, YP + 1.7, 0], [(w + 1.4) * k, YP + 4.8, 0], 0.7, 0.12)), dc(W, 'gold', 'band', [0, YP - 1.0, 0], [1.6, 0.4, 1.6]), dc(W, 'gold', 'band', [0, 3.0, 0], [1.2, 0.35, 1.2]));
  const stamps = [];
  if (M) {                                                      // Rimebolt: crystal prod tips, a frost rail
    P.push(...[1, -1].flatMap(k => [cp(W, 'gem', 'shard', [w * k, YP + 1.7, 0], [(w + 0.8) * k, YP + 5.0, 0], 0.7, 0.12), cp(W, 'gem', 'shard', [(w - 1.6) * k, YP + 1.0, 0], [(w - 1.8) * k, YP + 3.4, 0], 0.55, 0.12)]),
      cp(W, 'stock', 'rail', [0, 0.5, 0.9], [0, YP + 1.4, 0.9], 0.6, 0.6), dc(W, 'gem', 'band', [0, YP - 1.0, 0], [1.6, 0.4, 1.6]), dc(W, 'gem', 'band', [0, 3.0, 0], [1.2, 0.35, 1.2]));
    stamps.push({ bone: W, at: [0, YP - 1.2, 1.1], n: [0, 0, 1], facing: 0.2, on: 'bolt', px: [[0, -1, 'glow'], [0, 0, 'glow'], [0, 1, 'glow']] });
  }
  return piece('crossbow', 'weapon', t, { mats, prims: P, stamps }, { class: 'crossbow', sockets: { tip: { bone: W, at: [0, YP + 5.8, 1.1] } }, pose: holdPose('fwd') });
}

const pieces = {};
for (const t of TIERS) { const p = crossbow(t); pieces[p.id] = p; }
module.exports = { pieces };
