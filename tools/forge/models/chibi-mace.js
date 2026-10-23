'use strict';
// CHIBI MACE — the Blades one-hander that breaks guards (class 'sword': it swings the sword's anim), six SHAPE tiers on the chibi
// rig, forged from 3D volumes (no hand-drawn pixels). One haft, the HEAD grows every tier:
//   T1 Club      a wooden haft and a knobbed wooden head with three iron nails
//   T2 Flanged   an iron haft, an iron head ringed by six flanges
//   T3 Gilded    steel flanges, gold collar, gold pommel, a ruby set in the crown
//   T4 Starhead  silver head bristling with twelve spikes, a sapphire crown, a gold ring and two tassels
//   T5 Radiant   a head of light inside a crown of gold rays
//   T6 Mythic    Stormcaller: night-forged haft, a storm-yellow head with five lightning prongs and one glow run on the crown
// Family `mace`; ids mace.t1 .. mace.t6.
const { TIERS, metal, METAL, GOLD, WOOD, LEATHER, RUBY, SAPPHIRE, CORE, LIGHTNG, piece, glowOf, holdPose, bx, cp, el, dc, spokes } = require('./chibi-wpal.js');

const HEAD = 10.6;                                             // head centre (weapon-local y)
function mace(t) {
  const M = t === 6, rH = [3.1, 2.6, 2.7, 2.8, 2.9, 2.8][t - 1];
  const mats = { haft: t === 1 ? WOOD : M ? metal(METAL[5]) : t === 2 ? metal(METAL[0]) : metal(METAL[t - 2]), grip: LEATHER, head: t === 1 ? WOOD : M ? LIGHTNG : t === 5 ? CORE : metal(METAL[Math.min(t, 4) - 1]),
    iron: metal(METAL[1]), flange: t === 2 ? metal(METAL[1]) : t === 3 ? metal(METAL[2]) : t === 4 ? metal(METAL[3]) : metal(METAL[4]), gold: GOLD, gem: t === 3 ? RUBY : M ? LIGHTNG : SAPPHIRE, core: CORE, bolt: LIGHTNG,
    tassel: ['#8a2238', '#b8324a', '#e0475e', '#ff8a9a'], glow: glowOf('lightning') };
  const W = 'weapon', P = [cp(W, 'haft', 'haft', [0, -2.6, 0], [0, HEAD - 1.2, 0], 0.72, 0.68), cp(W, 'grip', 'grip', [0, -1.6, 0], [0, 1.6, 0], 0.95, 0.95)];
  P.push(el(W, 'head', 'head', [0, HEAD, 0], [rH, rH * 1.12, rH]));
  if (t === 1) P.push(...spokes(W, 'iron', 'flange', [0, HEAD, 0], 6, rH * 0.7, rH + 1.9, 1.0, 0.55, 0, 'xz'), dc(W, 'iron', 'ring', [0, HEAD - rH * 0.55, 0], [rH + 0.4, 0.45, rH + 0.4]),
    ...[0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 3 + 0.5; return el(W, 'iron', 'stud', [Math.cos(a) * (rH + 1.5), HEAD, Math.sin(a) * (rH + 1.5)], [0.65, 0.65, 0.65]); }), el(W, 'iron', 'stud', [0, HEAD + rH * 1.12 + 0.3, 0], [0.7, 0.7, 0.7]));
  if (t >= 2) P.push(...spokes(W, 'flange', 'flange', [0, HEAD, 0], 6, rH * 0.6, rH + 2.0, 1.05, 0.6, 0, 'xz'), el(W, 'iron', 'pommel', [0, -2.9, 0], [0.9, 0.8, 0.9]));
  if (t >= 3) P.push(dc(W, 'gold', 'collar', [0, HEAD - rH - 0.1, 0], [1.2, 0.35, 1.2]), el(W, 'gold', 'pommel', [0, -3.1, 0], [1.1, 1.0, 1.1]), dc(W, 'gold', 'band', [0, 3.0, 0], [1.0, 0.3, 1.0]));
  if (t === 3) P.push(el(W, 'gem', 'gem', [0, HEAD + rH + 0.2, 0], [0.95, 0.95, 0.95]), dc(W, 'gold', 'crown', [0, HEAD + rH - 0.5, 0], [1.1, 0.3, 1.1]));
  if (t === 4) P.push(...spokes(W, 'flange', 'spike', [0, HEAD, 0], 8, rH - 0.2, rH + 2.6, 0.75, 0.1, 22.5, 'xz'),
    cp(W, 'flange', 'spike', [0, HEAD + rH - 0.3, 0], [0, HEAD + rH + 1.8, 0], 0.6, 0.1), el(W, 'gem', 'gem', [0, HEAD + 0.1, rH - 0.2], [0.9, 0.9, 0.5]),
    dc(W, 'gold', 'ring', [0, HEAD, 0], [rH + 0.35, 0.3, rH + 0.35]), ...[1, -1].map(k => cp(W, 'tassel', 'tassel', [1.0 * k, 3.4, 0.5], [1.7 * k, 0.4, 0.8], 0.55, 0.35)));
  if (t === 5) P.push(el(W, 'core', 'halo', [0, HEAD, 0], [rH - 0.3, rH, rH - 0.3]), ...spokes(W, 'gold', 'ray', [0, HEAD, 0], 8, rH, rH + 2.8, 0.8, 0.12, 0, 'xz'),
    cp(W, 'gold', 'ray', [0, HEAD + rH - 0.3, 0], [0, HEAD + rH + 2.4, 0], 0.7, 0.12), dc(W, 'gold', 'band', [0, 3.0, 0], [1.0, 0.3, 1.0]));
  const stamps = [];
  if (M) {                                                      // Stormcaller: five lightning prongs fan out of the head, a bolt-yellow crown
    P.push(...[-2, -1, 0, 1, 2].map(k => { const a = k * 0.62, ca = Math.cos(a), sa = Math.sin(a);
        return cp(W, 'bolt', 'prong', [0.7 * sa * 2, HEAD + 0.6 * ca, 0], [(rH + 1.0) * sa * 1.7, HEAD + (rH + 3.0) * ca, 0.3], 0.8, 0.12); }),
      cp(W, 'bolt', 'prong', [0, HEAD, 0.5], [0, HEAD, rH + 2.4], 0.8, 0.12), dc(W, 'haft', 'collar', [0, HEAD - rH + 0.2, 0], [1.2, 0.35, 1.2]),
      el(W, 'haft', 'pommel', [0, -3.0, 0], [1.1, 1.0, 1.1]), dc(W, 'bolt', 'band', [0, 3.0, 0], [1.0, 0.3, 1.0]));
    stamps.push({ bone: W, at: [0, HEAD + 0.2, rH * 1.0 + 0.1], n: [0, 0, 1], facing: 0.2, on: 'head', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  }
  return piece('mace', 'weapon', t, { mats, prims: P, stamps }, { class: 'sword', sockets: { tip: { bone: W, at: [0, HEAD + rH + 1.5, 0] } }, pose: holdPose('one') });
}

const pieces = {};
for (const t of TIERS) { const p = mace(t); pieces[p.id] = p; }
module.exports = { pieces };
