'use strict';
// CHIBI AXE — the Greatarms two-hander (class 'greatarm': the overhead heave), six SHAPE tiers on the chibi rig, forged from 3D
// volumes (no hand-drawn pixels). One long haft, the HEAD grows every tier:
//   T1 Hatchet   a wooden haft, a single iron wedge blade
//   T2 Broad     a steel broad blade and a back spike on an iron-capped haft
//   T3 Bearded   a double-bit steel head, gold collar and haft bands, a ruby on the poll
//   T4 Crescent  silver crescent blades both sides, a sapphire, a gold spike crest, a tassel
//   T5 Radiant   two crescents of light, a crown of gold rays
//   T6 Mythic    Rootbreaker: a night-forged haft wound with living roots, a heartwood blade, a green glow run on the bit
// Family `axe`; ids axe.t1 .. axe.t6.
const { TIERS, metal, METAL, GOLD, WOOD, LEATHER, RUBY, SAPPHIRE, CORE, NATUREG, piece, glowOf, holdPose, cp, el, dc, bx } = require('./chibi-wpal.js');

const TOP = 14.0;                                                // haft top (weapon-local y)
function axe(t) {
  const M = t === 6, W = 'weapon', HY = TOP - 3.2;                // blade centre height
  const mats = { haft: t >= 4 && !M ? metal(METAL[t - 2]) : M ? metal(METAL[5]) : WOOD, grip: LEATHER, iron: metal(METAL[Math.min(t, 3) - 1]), blade: t === 5 ? CORE : M ? NATUREG : metal(METAL[Math.min(t, 4) - 1]),
    gold: GOLD, gem: t === 3 ? RUBY : M ? NATUREG : SAPPHIRE, core: CORE, root: NATUREG, glow: glowOf('nature') };
  const P = [cp(W, 'haft', 'haft', [0, -6.0, 0], [0, TOP, 0], 0.82, 0.78), cp(W, 'grip', 'grip', [0, -2.2, 0], [0, 1.6, 0], 1.0, 1.0)];
  const wedge = (k, big) => [el(W, 'blade', 'blade', [3.1 * k * big, HY, 0], [3.1 * big, 3.5 * big, 0.62]), cp(W, 'blade', 'blade', [0.4 * k, HY + 2.3 * big, 0], [0.4 * k, HY - 2.3 * big, 0], 1.0, 1.0)];
  if (t === 1) P.push(...wedge(1, 1), cp(W, 'iron', 'collar', [0, HY - 1.8, 0], [0, HY + 1.8, 0], 0.95, 0.95));
  if (t === 2) P.push(...wedge(1, 1.1), cp(W, 'iron', 'spike', [-0.4, HY + 0.2, 0], [-3.2, HY + 0.6, 0], 0.75, 0.15), cp(W, 'iron', 'collar', [0, HY - 2.2, 0], [0, HY + 2.2, 0], 1.0, 1.0),
    cp(W, 'iron', 'cap', [0, -6.6, 0], [0, -5.4, 0], 1.0, 0.95), cp(W, 'iron', 'tip', [0, TOP + 0.2, 0], [0, TOP + 2.2, 0], 0.7, 0.12));
  if (t === 3) P.push(...wedge(1, 1.2), ...wedge(-1, 1.05), cp(W, 'gold', 'collar', [0, HY - 2.4, 0], [0, HY + 2.4, 0], 1.12, 1.12), dc(W, 'gold', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]), dc(W, 'gold', 'band', [0, -3.0, 0], [1.1, 0.35, 1.1]),
    el(W, 'gem', 'gem', [0, HY, 0.9], [0.8, 0.8, 0.6]), cp(W, 'iron', 'tip', [0, TOP + 0.2, 0], [0, TOP + 2.4, 0], 0.7, 0.12), cp(W, 'iron', 'cap', [0, -6.6, 0], [0, -5.4, 0], 1.0, 0.95));
  if (t === 4) P.push(...[1, -1].map(k => el(W, 'blade', 'blade', [3.4 * k, HY, 0], [3.4, 4.4, 0.62])), cp(W, 'blade', 'poll', [0.0, HY - 2.3, 0], [0.0, HY + 2.3, 0], 1.0, 1.0),
    cp(W, 'gold', 'collar', [0, HY - 2.6, 0], [0, HY + 2.6, 0], 1.15, 1.15), el(W, 'gem', 'gem', [0, HY, 1.0], [0.95, 0.95, 0.65]), cp(W, 'gold', 'spike', [0, TOP + 0.3, 0], [0, TOP + 3.4, 0], 0.8, 0.12),
    dc(W, 'gold', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]), cp(W, 'gold', 'cap', [0, -6.6, 0], [0, -5.2, 0], 1.0, 0.9));
  if (t === 5) P.push(...[1, -1].map(k => el(W, 'core', 'blade', [3.4 * k, HY, 0], [3.4, 4.4, 0.6])), cp(W, 'gold', 'collar', [0, HY - 2.6, 0], [0, HY + 2.6, 0], 1.15, 1.15),
    ...[-2, -1, 0, 1, 2].map(k => cp(W, 'gold', 'ray', [0.5 * k, HY + 2.4, 0], [1.5 * k, HY + 4.6 - Math.abs(k) * 0.5, 0], 0.65, 0.12)), dc(W, 'gold', 'band', [0, 3.0, 0], [1.1, 0.35, 1.1]), cp(W, 'gold', 'cap', [0, -6.6, 0], [0, -5.2, 0], 1.0, 0.9));
  const stamps = [];
  if (M) {                                                      // Rootbreaker: heartwood blades, roots winding the haft, a thorn crest
    P.push(...[1, -1].map(k => el(W, 'blade', 'blade', [3.5 * k, HY, 0], [3.5, 4.5, 0.62])), cp(W, 'haft', 'collar', [0, HY - 2.7, 0], [0, HY + 2.7, 0], 1.15, 1.15),
      ...[0, 1, 2, 3].map(i => cp(W, 'root', 'root', [0.9 * (i % 2 ? 1 : -1), 3.6 - i * 2.4, 0.2], [-0.9 * (i % 2 ? 1 : -1), 2.2 - i * 2.4, 0.2], 0.55, 0.5)), cp(W, 'root', 'thorn', [0, TOP + 0.3, 0], [0, TOP + 3.4, 0], 0.8, 0.12),
      cp(W, 'root', 'thorn', [0.4, TOP - 0.5, 0], [2.3, TOP + 2.0, 0], 0.6, 0.12), cp(W, 'root', 'thorn', [-0.4, TOP - 0.5, 0], [-2.3, TOP + 2.0, 0], 0.6, 0.12), cp(W, 'haft', 'cap', [0, -6.6, 0], [0, -5.2, 0], 1.0, 0.9));
    stamps.push({ bone: W, at: [3.0, HY, 0.65], n: [0, 0, 1], facing: 0.2, on: 'blade', px: [[-1, 0, 'glow'], [0, 0, 'glow'], [1, 0, 'glow']] });
  }
  return piece('axe', 'weapon', t, { mats, prims: P, stamps }, { class: 'greatarm', sockets: { tip: { bone: W, at: [0, HY, 0] } }, pose: holdPose('shoulder') });
}

const pieces = {};
for (const t of TIERS) { const p = axe(t); pieces[p.id] = p; }
module.exports = { pieces };
