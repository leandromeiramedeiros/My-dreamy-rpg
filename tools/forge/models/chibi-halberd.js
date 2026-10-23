'use strict';
// CHIBI HALBERD — the Greatarms polearm (class 'greatarm'), six SHAPE tiers on the chibi rig, forged from 3D volumes (no
// hand-drawn pixels). The longest haft of the lines; a spear point, an axe blade and a back hook that grow every tier:
//   T1 Billhook  a wooden haft, an iron spike, a small blade and a hook
//   T2 Halberd   a steel point, a broad axe blade, a back hook, an iron ferrule
//   T3 Gilded    + gold collar and bands, a ruby under the point
//   T4 Winged    a silver point and blade, wing flanges at the neck, a sapphire, gold tassel-plumes
//   T5 Radiant   blades of light, a crown of gold rays
//   T6 Mythic    Moonrender: a night-forged haft, a crescent moon blade, a moon-violet point and a glow run on the crescent
// Family `halberd`; ids halberd.t1 .. halberd.t6.
const { TIERS, metal, METAL, GOLD, WOOD, LEATHER, RUBY, SAPPHIRE, CORE, MOONG, piece, glowOf, holdPose, fine, cp, el, dc } = require('./chibi-wpal.js');

const TOP = 19.5;                                                // haft top (weapon-local y)
function halberd(t) {
  const M = t === 6, W = 'weapon', NK = TOP - 0.8;                // neck (where blade and point meet)
  const mats = { haft: t >= 4 && !M ? metal(METAL[t - 2]) : M ? metal(METAL[5]) : WOOD, grip: LEATHER, iron: metal(METAL[Math.min(t, 3) - 1]), blade: t === 5 ? fine(CORE) : M ? MOONG : metal(METAL[Math.min(t, 4) - 1]),
    gold: GOLD, gem: t === 3 ? RUBY : M ? MOONG : SAPPHIRE, core: fine(CORE), ray: fine(GOLD), moon: MOONG, glow: glowOf('moon') };
  const P = [cp(W, 'haft', 'haft', [0, -7.0, 0], [0, NK, 0], 0.82, 0.78), cp(W, 'grip', 'grip', [0, -2.4, 0], [0, 1.6, 0], 1.0, 1.0),
    cp(W, 'blade', 'point', [0, NK - 0.5, 0], [0, NK + [5.4, 6.4, 6.4, 7.0, 7.4, 7.2][t - 1], 0], 0.95, 0.12)];
  const side = (big) => [el(W, 'blade', 'blade', [3.4 * big, NK - 1.8, 0], [3.4 * big, 3.6 * big, 0.7]), cp(W, 'blade', 'poll', [0.3, NK - 3.2, 0], [0.3, NK - 0.4, 0], 0.95, 0.95)];
  if (t === 1) P.push(...side(0.85), cp(W, 'iron', 'hook', [-0.4, NK - 1.4, 0], [-2.8, NK - 1.0, 0], 0.7, 0.15));
  if (t === 2) P.push(...side(1.05), cp(W, 'iron', 'hook', [-0.4, NK - 1.4, 0], [-3.2, NK - 0.2, 0], 0.75, 0.15), cp(W, 'iron', 'collar', [0, NK - 3.2, 0], [0, NK - 0.2, 0], 1.0, 1.0), cp(W, 'iron', 'cap', [0, -7.6, 0], [0, -6.4, 0], 1.0, 0.95));
  if (t === 3) P.push(...side(1.1), cp(W, 'gold', 'hook', [-0.4, NK - 1.4, 0], [-3.4, NK - 0.2, 0], 0.8, 0.15), cp(W, 'gold', 'collar', [0, NK - 3.4, 0], [0, NK - 0.1, 0], 1.12, 1.12), el(W, 'gem', 'gem', [0, NK - 1.6, 0.9], [0.8, 0.8, 0.6]),
    dc(W, 'gold', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]), dc(W, 'gold', 'band', [0, -3.4, 0], [1.1, 0.35, 1.1]), cp(W, 'iron', 'cap', [0, -7.6, 0], [0, -6.4, 0], 1.0, 0.95));
  if (t === 4) P.push(...side(1.2), ...[1, -1].map(k => cp(W, 'gold', 'wing', [0.5 * k, NK - 1.0, 0], [(k > 0 ? 3.6 : -3.4), NK + 1.6, 0], 0.75, 0.12)), cp(W, 'gold', 'collar', [0, NK - 3.4, 0], [0, NK - 0.1, 0], 1.15, 1.15),
    el(W, 'gem', 'gem', [0, NK - 1.6, 0.95], [0.9, 0.9, 0.65]), dc(W, 'gold', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]), cp(W, 'gold', 'cap', [0, -7.6, 0], [0, -6.2, 0], 1.0, 0.9),
    cp(W, 'gold', 'tassel', [0.5, NK - 3.6, 0.6], [1.0, NK - 7.0, 0.9], 0.55, 0.3), cp(W, 'gold', 'tassel', [-0.5, NK - 3.6, -0.6], [-1.0, NK - 7.0, -0.9], 0.55, 0.3));
  if (t === 5) P.push(...[1, -1].map(k => el(W, 'core', 'blade', [3.6 * k, NK - 1.6, 0], [3.6, 4.0, 0.7])), cp(W, 'gold', 'collar', [0, NK - 3.4, 0], [0, NK - 0.1, 0], 1.15, 1.15),
    ...[-2, -1, 1, 2].map(k => cp(W, 'ray', 'ray', [0.5 * k, NK + 0.6, 0], [1.4 * k, NK + 3.2 - Math.abs(k) * 0.4, 0], 0.65, 0.12)), dc(W, 'gold', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]), cp(W, 'gold', 'cap', [0, -7.6, 0], [0, -6.2, 0], 1.0, 0.9));
  const stamps = [];
  if (M) {                                                      // Moonrender: a crescent moon blade (a disc with a bite), a violet point
    P.push(el(W, 'moon', 'moon', [3.4, NK - 1.6, 0], [3.8, 4.4, 0.7]), el(W, 'haft', 'bite', [5.4, NK - 1.6, 0], [2.8, 3.0, 1.0]), cp(W, 'haft', 'collar', [0, NK - 3.4, 0], [0, NK - 0.1, 0], 1.12, 1.12),
      cp(W, 'moon', 'hook', [-0.4, NK - 1.4, 0], [-3.2, NK - 0.2, 0], 0.8, 0.15), dc(W, 'moon', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]), cp(W, 'haft', 'cap', [0, -7.6, 0], [0, -6.2, 0], 1.0, 0.9));
    stamps.push({ bone: W, at: [2.6, NK - 1.6, 0.75], n: [0, 0, 1], facing: 0.2, on: 'moon', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [0, 1, 'glow']] });
  }
  return piece('halberd', 'weapon', t, { mats, prims: P, stamps }, { class: 'greatarm', sockets: { tip: { bone: W, at: [0, NK + 5, 0] } }, pose: holdPose('tall') });
}

const pieces = {};
for (const t of TIERS) { const p = halberd(t); pieces[p.id] = p; }
module.exports = { pieces };
