'use strict';
// CHIBI WPAL — palette + prim helpers for the weapon / shield / companion lines (chibi-<line>.js of Gear art B). No `pieces`
// export: build.js and chibi-gear.js skip this file. The shared ramps stay in chibi-palette.js (owned by the suit lane too);
// the Mythic hues the first lines did not need (nature, lightning, wind, moon) and the few extra material ramps live here.
// Every ramp keeps CIE L* rising and its darkest tone >= 8 L* above the outline #0c0714 (palette-lint).
const P = require('./chibi-palette.js');
const { flatOf, metal, METAL, rotv, r3 } = P;

// Mythic emissive hues, one per line (flat 1 px glow runs) + the matching shaded gem ramps
const WGLOW = { nature: '#4cf08a', lightning: '#ffe630', wind: '#7fe8d8', moon: '#b9a8ff', pale: '#d8e4ff', frost: '#5fd4ff', fire: '#ff6a2a', holy: '#ffdc66', arcane: '#a652ff' };
const NATUREG = { ramp: ['#0a3a20', '#1c8a44', '#40d878', '#b4f8c0', '#ffffff'], lift: 1, spec: 0.9 };
const LIGHTNG = { ramp: ['#4a4a08', '#a8a818', '#f0f030', '#faffa0', '#ffffff'], lift: 1, spec: 0.9 };
const WINDG = { ramp: ['#0e3a3c', '#2c8a86', '#6adcc8', '#c8fff0', '#ffffff'], lift: 1, spec: 0.9 };
const MOONG = { ramp: ['#1c1a5a', '#4a44b0', '#8a80f0', '#d0c8ff', '#ffffff'], lift: 1, spec: 0.9 };
const BONE = ['#4a3e38', '#8a7a6a', '#c0b098', '#e0d4b8'];                    // bone / ivory (claws, horn, fan ribs)
const PAPER = ['#6a5a52', '#988a76', '#c4b698', '#e4d8b4'];                    // cream paper / pages
const BRASS = metal(['#4a2e0a', '#8a5a14', '#c8902c', '#ecc050', '#fff0b0']);   // the warhorn and chakram edge: duller than GOLD
const DARK = ['#241c30', '#2e2640', '#443a5c', '#625680'];                     // black-violet leather / night cloth

// the hold pose of a weapon off its attack: aim for rest / cast / hit / dash (model space, before the facing yaw)
const HOLD = {
  one: [[-0.7, -0.4, 0.6], [-0.3, -0.6, 0.75], [-0.5, -0.4, 0.75], [-0.3, -0.2, -0.93]],      // a 1H blade at the right hip
  tall: [[-0.32, 1, 0.1], [0, 1, 0.5], [0, 1, -0.1], [0, 0.6, -0.8]],                          // a haft held upright (staff, halberd)
  shoulder: [[-0.55, 0.85, -0.2], [-0.2, 0.9, 0.3], [-0.3, 0.8, -0.1], [-0.4, 0.3, -0.9]],     // a great head carried at the shoulder
  fwd: [[-0.1, 0.55, 0.8], [0, 0.6, 0.8], [-0.2, 0.5, 0.8], [0, 0.2, -0.95]],                  // a 2H shooter, level at the chest
  up: [[-0.35, 1, 0.15], [0, 1, 0.4], [-0.3, 0.9, 0.1], [-0.2, 0.5, -0.8]],                     // a focus held up beside the head
};
const holdPose = (kind, extra) => { const [r, c, h, d] = HOLD[kind]; return P.notAttack(a => Object.assign({ weapon: { aim: a === 'cast' ? c : a === 'hit' ? h : a === 'dash' ? d : r } }, extra ? extra(a) : {})); };
const fine = m => Object.assign({}, m, { fine: true });                                          // 1 px strokes: the cleanup and the lint leave them be
const glowOf = k => flatOf(WGLOW[k]);
const bx = (bone, mat, part, c, h, o) => Object.assign({ bone, mat, part, shape: 'box', c, h, round: 0.2 }, o || {});
const cp = (bone, mat, part, a, b, ra, rb, o) => Object.assign({ bone, mat, part, shape: 'cap', a, b, ra, rb: rb == null ? ra : rb }, o || {});
const el = (bone, mat, part, c, r, o) => Object.assign({ bone, mat, part, shape: 'ell', c, r }, o || {});
const dc = (bone, mat, part, c, r, o) => Object.assign({ bone, mat, part, shape: 'disc', c, r }, o || {});
const spokes = (bone, mat, part, c, n, r0, r1, ra, rb, a0, plane) => Array.from({ length: n }, (_, i) => {        // rays in the xy plane (or xz when plane = 'xz')
  const a = (a0 || 0) * Math.PI / 180 + 2 * Math.PI * i / n, ca = Math.cos(a), sa = Math.sin(a);
  return plane === 'xz' ? cp(bone, mat, part, [c[0] + r0 * ca, c[1], c[2] + r0 * sa], [c[0] + r1 * ca, c[1], c[2] + r1 * sa], ra, rb)
    : cp(bone, mat, part, [c[0] + r0 * ca, c[1] + r0 * sa, c[2]], [c[0] + r1 * ca, c[1] + r1 * sa, c[2]], ra, rb);
});

module.exports = Object.assign({}, P, { WGLOW, NATUREG, LIGHTNG, WINDG, MOONG, BONE, PAPER, BRASS, DARK, glowOf, fine, holdPose, HOLD, bx, cp, el, dc, spokes });
