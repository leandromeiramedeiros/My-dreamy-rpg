'use strict';
// HUMANOID ANIMS — the shared animation set for every forge humanoid rig (models/hero.js, models/chibi.js). Poses are
// directions and joint turns, not lengths, so one table drives any body that uses these bone names:
//   hips > spine > chest > head | cape | upperR/L > foreR/L > handR/L > weapon/offhand;  hips > thighR/L > shinR/L > footR/L
// The character's RIGHT side is -x (screen-left when facing the camera), as in the rigs.
const mir = d => [-d[0], d[1], d[2]];

// ---- poses ---------------------------------------------------------------------------------------------------------
// arms by direction (model space, the L side mirrored): upper = shoulder -> elbow, fore = elbow -> wrist
const arm = (s, up, fore) => ({ ['upper' + s]: { point: up }, ['fore' + s]: { point: fore } });
const arms = (up, fore, upL, foreL) => Object.assign(arm('R', up, fore), arm('L', upL || mir(up), foreL || mir(fore)));
const REST = [[-0.17, -1, 0.04], [-0.07, -1, 0.24]];
const legs = (tR, sR, fR, tL, sL, fL) => ({ thighR: { rot: [tR, 0, 0] }, shinR: { rot: [sR, 0, 0] }, footR: { rot: [fR, 0, 0] },
  thighL: { rot: [tL, 0, 0] }, shinL: { rot: [sL, 0, 0] }, footL: { rot: [fL, 0, 0] } });
const merge = (...o) => { const out = {}; for (const p of o) for (const k in p) out[k] = Object.assign({}, out[k] || {}, p[k]); return out; };

// Timing (ms per frame) follows the SlyNyrd reference (tools/forge/ref/SPEC.json): forge ignores `ms`; board.js, the GIF
// and the game read it. `smear` = the frames that draw a weapon smear and its band width (fraction of the blade).
const anims = {
  // idle: 6 frames, uneven holds; the upper body sinks 0, 1, 2, 2, 1, 0 px (breathe) and the cape trails it
  idle: {
    frames: 6, ms: [200, 200, 400, 200, 200, 400],
    pose: f => { const d = [0, 0.5, 1, 1, 0.5, 0][f];
      return merge(arms([-0.17, -1, 0.04 + 0.03 * d], [-0.07, -1, 0.24 + 0.04 * d]), legs(0.12, 0.1, -0.1, -0.18, 0.12, 0.02), { chest: { off: [0, -1.2 * d, 0] }, cape: { rot: [0.06 + 0.04 * d, 0, 0] } }); },
  },
  // walk (= the reference run): 6 frames @ 100 ms. Head bob per stride -1, -1, +2 px (rise, rise, drop on contact):
  //   0 airborne (right knee up, left foot kicked back; hips +2 so the contact foot meets the ground)   1 contact right
  //   (lowest, -2)   2 push (-1)   3-5 the same, left
  walk: {
    frames: 6, ms: [100, 100, 100, 100, 100, 100],
    pose: f => {
      const side = f < 3 ? 0 : 1, p = f % 3;
      const fwd = [[-0.95, 1.1, 0.2], [-0.55, 0.25, 0.25], [0.05, 0.2, -0.1]][p], back = [[0.55, 1.25, 0.1], [0.5, 0.7, 0.2], [-0.25, 1.35, 0.1]][p];
      const L = side ? legs(...back, ...fwd) : legs(...fwd, ...back);
      const aB = [[-0.15, -1, -0.5], [-0.05, -0.8, -0.6]], aF = [[-0.15, -1, 0.5], [-0.05, -0.55, 0.85]];
      const sw = [1, 0.8, 0.2][p], mixA = (x, y) => x.map((v, i) => v * sw + y[i] * (1 - sw));
      const A = side ? arms(mixA(aF[0], REST[0]), mixA(aF[1], REST[1]), mir(mixA(aB[0], REST[0])), mir(mixA(aB[1], REST[1])))
        : arms(mixA(aB[0], REST[0]), mixA(aB[1], REST[1]), mir(mixA(aF[0], REST[0])), mir(mixA(aF[1], REST[1])));
      return merge(L, A, { hips: { off: [0, [2, 0, 1][p], 0] }, chest: { rot: [0.18, [-0.12, -0.08, 0][p] * (side ? -1 : 1), 0] },
        cape: { rot: [[1.6, 1.45, 1.55][p], 0, 0] } });
    },
  },
  // sword: anticipation (sword up behind the right shoulder) -> 3 smear frames (a diagonal overhead chop: frame 1 is already
  // low in front, so its smear covers the whole sweep over the right shoulder; 2 and 3 trail to the left hip; the body
  // lunges forward and down) -> follow-through (+1 px reach, no
  // smear) -> recover. 100 / 50 / 50 / 50 / 100 / 50 = 400 ms
  'attack:sword': {
    frames: 6, ms: [100, 50, 50, 50, 100, 50], smear: { 1: 0.75, 2: 0.5, 3: 0.12 },
    pose: f => [
      merge(arms([-0.6, 0.6, -0.5], [-0.35, 0.9, -0.25], [0.3, -0.85, 0.35], [0.2, -0.6, 0.75]), legs(0.1, 0.15, -0.15, -0.15, 0.15, 0.05),
        { hips: { off: [0, 0.4, -0.4] }, chest: { rot: [-0.15, -0.45, 0] }, weapon: { aim: [-0.65, 0.62, -0.42] }, cape: { rot: [0.15, 0, 0] } }),
      merge(arms([-0.25, 0.3, 0.92], [-0.1, 0.25, 0.96], [0.35, -0.75, 0.55], [0.25, -0.45, 0.85]), legs(0.3, 0.25, -0.35, -0.5, 0.3, 0.2),
        { hips: { off: [0, -1.8, 1.6] }, chest: { rot: [0.3, 0.1, 0] }, weapon: { aim: [-0.1, 0.2, 0.97] }, cape: { rot: [1.4, 0, 0] } }),
      merge(arms([0.1, -0.4, 0.91], [0.3, -0.5, 0.81], [0.4, -0.8, 0.45], [0.3, -0.6, 0.75]), legs(0.3, 0.25, -0.35, -0.55, 0.3, 0.25),
        { hips: { off: [0, -2.0, 2.0] }, chest: { rot: [0.35, 0.3, 0] }, weapon: { aim: [0.35, -0.6, 0.72] }, cape: { rot: [1.2, 0, 0] } }),
      merge(arms([0.2, -0.55, 0.81], [0.4, -0.6, 0.7], [0.4, -0.85, 0.3], [0.3, -0.7, 0.6]), legs(0.3, 0.25, -0.35, -0.55, 0.3, 0.25),
        { hips: { off: [0, -2.0, 2.0] }, chest: { rot: [0.35, 0.4, 0] }, weapon: { aim: [0.7, -0.65, 0.3] }, cape: { rot: [0.9, 0, 0] } }),
      merge(arms([0.25, -0.6, 0.76], [0.45, -0.6, 0.66], [0.4, -0.85, 0.3], [0.3, -0.7, 0.6]), legs(0.3, 0.25, -0.35, -0.55, 0.3, 0.25),
        { hips: { off: [0, -2.0, 2.0] }, chest: { rot: [0.35, 0.45, 0] }, weapon: { aim: [0.65, -0.72, 0.2] }, cape: { rot: [0.6, 0, 0] } }),
      merge(arms([-0.2, -0.85, 0.45], [-0.15, -0.6, 0.8], [0.25, -0.9, 0.2], [0.15, -0.8, 0.5]), legs(0.15, 0.2, -0.2, -0.3, 0.2, 0.1),
        { hips: { off: [0, -0.7, 1.0] }, chest: { rot: [0.25, 0.15, 0] }, weapon: { aim: [-0.6, 0.3, 0.75] }, cape: { rot: [0.35, 0, 0] } }),
    ][f],
  },
  // staff: raise -> thrust (tip forward) -> hold -> recover
  'attack:staff': {
    frames: 4,
    pose: f => [
      merge(arms([-0.4, 0.55, 0.73], [-0.1, 0.95, 0.3], [0.35, 0.3, 0.88], [0.15, 0.6, 0.78]), legs(0.1, 0.1, -0.2, -0.1, 0.1, 0),
        { chest: { rot: [-0.12, -0.2, 0] }, weapon: { aim: [0, 1, -0.15] } }),
      merge(arms([-0.25, 0.25, 0.94], [-0.05, 0.3, 0.95], [0.3, 0.05, 0.95], [0.15, 0.2, 0.97]), legs(0.25, 0.2, -0.3, -0.35, 0.2, 0.15),
        { hips: { off: [0, -1, 0] }, chest: { rot: [0.15, 0.1, 0] }, weapon: { aim: [0, 0.55, 0.84] }, cape: { rot: [0.35, 0, 0] } }),
      merge(arms([-0.25, 0.2, 0.95], [-0.05, 0.25, 0.97], [0.3, 0.0, 0.95], [0.15, 0.15, 0.98]), legs(0.25, 0.2, -0.3, -0.35, 0.2, 0.15),
        { hips: { off: [0, -1, 0] }, chest: { rot: [0.1, 0.05, 0] }, weapon: { aim: [0, 0.65, 0.76] }, cape: { rot: [0.25, 0, 0] } }),
      merge(arms([-0.25, -0.6, 0.76], [-0.1, -0.1, 1], [0.15, -0.95, 0.25], [0.05, -0.9, 0.4]), legs(0.1, 0.1, -0.15, -0.15, 0.1, 0.05),
        { weapon: { aim: [0, 0.95, 0.3] } }),
    ][f],
  },
  // bow: raise + nock -> full draw -> release (hand flicks back) -> lower
  'attack:bow': {
    frames: 4,
    pose: f => [
      merge(arms([-0.3, -0.1, 0.95], [0.45, 0.1, 0.89], [0.15, 0.08, 0.99], [0.08, 0.06, 1]), legs(0.2, 0.1, -0.2, -0.25, 0.1, 0.1),
        { chest: { rot: [0, -0.5, 0] }, offhand: { aim: [0, 1, 0.05], roll: [0, 0, 1] } }),
      merge(arms([-0.85, 0.15, -0.5], [0.6, 0.25, 0.76], [0.15, 0.08, 0.99], [0.08, 0.06, 1]), legs(0.2, 0.1, -0.2, -0.25, 0.1, 0.1),
        { chest: { rot: [0, -0.55, 0] }, offhand: { aim: [0, 1, 0.05], roll: [0, 0, 1] } }),
      merge(arms([-0.85, 0.3, -0.45], [-0.55, 0.45, -0.7], [0.15, 0.1, 0.99], [0.08, 0.1, 1]), legs(0.2, 0.1, -0.2, -0.25, 0.1, 0.1),
        { chest: { rot: [0, -0.5, 0] }, offhand: { aim: [0, 1, 0.1], roll: [0, 0, 1] } }),
      merge(arms([-0.2, -0.9, 0.3], [-0.1, -0.7, 0.7], [0.2, -0.4, 0.9], [0.1, -0.3, 0.95]), legs(0.1, 0.05, -0.1, -0.1, 0.05, 0.05),
        { chest: { rot: [0, -0.2, 0] }, offhand: { aim: [0.2, 0.95, 0.25], roll: [0, 0, 1] } }),
    ][f],
  },
  // greatarm (axe, hammer, halberd; two hands together on the haft): heave up and back (250 ms) -> three smear frames, the haft
  // swept from overhead to a low blow in front -> held at the impact (150) -> recover. 250 / 50 / 50 / 50 / 150 / 70 = 620 ms
  'attack:greatarm': {
    frames: 6, ms: [250, 50, 50, 50, 150, 70], smear: { 1: 0.7, 2: 0.5, 3: 0.2 },
    pose: f => [
      merge(arms([0.3, 0.9, -0.15], [0.8, 0.7, -0.1], [-0.3, 0.9, -0.15], [-0.8, 0.7, -0.1]), legs(0.2, 0.2, -0.2, -0.3, 0.2, 0.1),
        { hips: { off: [0, 0.4, -0.8] }, chest: { rot: [-0.3, 0, 0] }, weapon: { aim: [0, 1, -0.5] }, cape: { rot: [0.15, 0, 0] } }),
      merge(arms([0.3, 0.55, 0.6], [0.9, 0.2, 0.4], [-0.3, 0.55, 0.6], [-0.9, 0.2, 0.4]), legs(0.3, 0.25, -0.35, -0.5, 0.3, 0.2),
        { hips: { off: [0, -1.2, 1.0] }, chest: { rot: [0.15, 0, 0] }, weapon: { aim: [0, 0.75, 0.65] }, cape: { rot: [1.2, 0, 0] } }),
      merge(arms([0.3, 0.05, 0.95], [0.7, -0.1, 0.7], [-0.3, 0.05, 0.95], [-0.7, -0.1, 0.7]), legs(0.3, 0.25, -0.35, -0.55, 0.3, 0.25),
        { hips: { off: [0, -2.0, 2.0] }, chest: { rot: [0.3, 0, 0] }, weapon: { aim: [0, 0.0, 1] }, cape: { rot: [1.4, 0, 0] } }),
      merge(arms([0.3, -0.4, 0.9], [0.6, -0.5, 0.65], [-0.3, -0.4, 0.9], [-0.6, -0.5, 0.65]), legs(0.3, 0.25, -0.35, -0.55, 0.3, 0.25),
        { hips: { off: [0, -2.2, 2.2] }, chest: { rot: [0.4, 0, 0] }, weapon: { aim: [0, -0.8, 0.6] }, cape: { rot: [1.0, 0, 0] } }),
      merge(arms([0.3, -0.45, 0.85], [0.6, -0.55, 0.6], [-0.3, -0.45, 0.85], [-0.6, -0.55, 0.6]), legs(0.3, 0.25, -0.35, -0.55, 0.3, 0.25),
        { hips: { off: [0, -2.2, 2.2] }, chest: { rot: [0.42, 0, 0] }, weapon: { aim: [0, -0.9, 0.45] }, cape: { rot: [0.6, 0, 0] } }),
      merge(arms([0.25, 0.1, 0.9], [0.6, -0.1, 0.6], [-0.25, 0.1, 0.9], [-0.6, -0.1, 0.6]), legs(0.15, 0.2, -0.2, -0.3, 0.2, 0.1),
        { hips: { off: [0, -0.8, 0.8] }, chest: { rot: [0.2, 0, 0] }, weapon: { aim: [0, 0.4, 0.9] }, cape: { rot: [0.3, 0, 0] } }),
    ][f],
  },
  // crossbow (two hands, shouldered): raise and level -> shot (the stock kicks back) -> hold -> lower. 100 / 60 / 140 / 60 = 360 ms
  'attack:crossbow': {
    frames: 4, ms: [100, 60, 140, 60],
    pose: f => [
      merge(arms([0.15, 0.2, 0.95], [0.75, 0.2, 0.6], [-0.15, 0.2, 0.95], [-0.6, 0.15, 0.75]), legs(0.2, 0.1, -0.2, -0.25, 0.1, 0.1),
        { chest: { rot: [0, -0.15, 0] }, weapon: { aim: [0.05, 0.3, 0.95] } }),
      merge(arms([0.15, 0.1, 0.98], [0.75, 0.1, 0.65], [-0.15, 0.1, 0.98], [-0.6, 0.08, 0.8]), legs(0.2, 0.1, -0.2, -0.25, 0.1, 0.1),
        { hips: { off: [0, 0, -0.6] }, chest: { rot: [0.04, -0.15, 0] }, weapon: { aim: [0.05, 0.12, 1] } }),
      merge(arms([0.15, 0.1, 0.98], [0.75, 0.1, 0.65], [-0.15, 0.1, 0.98], [-0.6, 0.08, 0.8]), legs(0.2, 0.1, -0.2, -0.25, 0.1, 0.1),
        { chest: { rot: [0, -0.15, 0] }, weapon: { aim: [0.05, 0.1, 1] } }),
      merge(arms([0.1, -0.5, 0.85], [0.6, -0.4, 0.7], [-0.1, -0.5, 0.85], [-0.5, -0.4, 0.75]), legs(0.1, 0.05, -0.1, -0.1, 0.05, 0.05),
        { chest: { rot: [0, -0.05, 0] }, weapon: { aim: [0.05, 0.7, 0.7] } }),
    ][f],
  },
  // throw (chakram, one hand): wind back -> whip forward and let go -> follow through -> recover. 100 / 60 / 120 / 80 = 360 ms
  'attack:throw': {
    frames: 4, ms: [100, 60, 120, 80],
    pose: f => [
      merge(arms([-0.7, 0.3, -0.55], [-0.5, 0.6, -0.6], [0.3, -0.85, 0.35], [0.2, -0.6, 0.75]), legs(0.15, 0.15, -0.15, -0.2, 0.15, 0.05),
        { chest: { rot: [-0.1, -0.5, 0] }, weapon: { aim: [-0.2, 0.3, -0.9] }, cape: { rot: [0.15, 0, 0] } }),
      merge(arms([-0.45, 0.2, 0.87], [-0.1, 0.1, 0.99], [0.35, -0.75, 0.55], [0.25, -0.45, 0.85]), legs(0.3, 0.25, -0.35, -0.5, 0.3, 0.2),
        { hips: { off: [0, -1.4, 1.2] }, chest: { rot: [0.2, 0.2, 0] }, weapon: { aim: [0, 0.4, 0.9] }, cape: { rot: [1.2, 0, 0] } }),
      merge(arms([-0.35, 0.15, 0.92], [-0.05, 0.1, 1], [0.4, -0.8, 0.45], [0.3, -0.6, 0.75]), legs(0.3, 0.25, -0.35, -0.55, 0.3, 0.25),
        { hips: { off: [0, -1.6, 1.6] }, chest: { rot: [0.25, 0.25, 0] }, weapon: { aim: [0, 0.6, 0.8] }, cape: { rot: [0.8, 0, 0] } }),
      merge(arms([-0.25, -0.7, 0.67], [-0.1, -0.6, 0.8], [0.25, -0.9, 0.2], [0.15, -0.8, 0.5]), legs(0.12, 0.15, -0.15, -0.2, 0.15, 0.05),
        { hips: { off: [0, -0.6, 0.8] }, chest: { rot: [0.12, 0.1, 0] }, weapon: { aim: [0, 0.8, 0.5] }, cape: { rot: [0.3, 0, 0] } }),
    ][f],
  },
  // focus (wand, orb; one hand): lift -> thrust the focus forward -> hold the spell -> lower. 140 / 100 / 160 / 80 = 480 ms
  'attack:focus': {
    frames: 4, ms: [140, 100, 160, 80],
    pose: f => [
      merge(arms([-0.5, 0.55, 0.65], [-0.1, 0.95, 0.3], [0.3, -0.85, 0.35], [0.2, -0.6, 0.75]), legs(0.1, 0.1, -0.2, -0.1, 0.1, 0),
        { chest: { rot: [-0.1, -0.25, 0] }, weapon: { aim: [-0.1, 1, -0.1] }, cape: { rot: [0.15, 0, 0] } }),
      merge(arms([-0.3, 0.2, 0.93], [-0.05, 0.2, 0.98], [0.3, -0.8, 0.5], [0.2, -0.55, 0.8]), legs(0.25, 0.2, -0.3, -0.35, 0.2, 0.15),
        { hips: { off: [0, -1, 0.6] }, chest: { rot: [0.15, 0.1, 0] }, weapon: { aim: [0, 0.45, 0.9] }, cape: { rot: [0.5, 0, 0] } }),
      merge(arms([-0.3, 0.25, 0.92], [-0.05, 0.3, 0.95], [0.3, -0.8, 0.5], [0.2, -0.55, 0.8]), legs(0.25, 0.2, -0.3, -0.35, 0.2, 0.15),
        { hips: { off: [0, -1, 0.6] }, chest: { rot: [0.1, 0.05, 0] }, weapon: { aim: [0, 0.6, 0.8] }, cape: { rot: [0.3, 0, 0] } }),
      merge(arms([-0.25, -0.6, 0.76], [-0.1, -0.1, 1], [0.15, -0.95, 0.25], [0.05, -0.9, 0.4]), legs(0.1, 0.1, -0.15, -0.15, 0.1, 0.05),
        { weapon: { aim: [-0.1, 0.95, 0.3] } }),
    ][f],
  },
  // shadow (daggers, claws, fans; one blade in each hand): crouch, cross-slash right, cross-slash left, double stab, recover.
  // 60 ms a frame = 300 ms (the game chains the 4 hits at a 0.28 s rate)
  'attack:shadow': {
    frames: 5, ms: [60, 60, 60, 60, 60], smear: { 1: 0.6, 2: 0.6 },
    pose: f => [
      merge(arms([-0.5, 0.3, -0.6], [-0.2, 0.5, -0.8], [0.5, 0.3, -0.6], [0.2, 0.5, -0.8]), legs(0.3, 0.25, -0.3, -0.35, 0.25, 0.15),
        { hips: { off: [0, -1.5, -0.4] }, chest: { rot: [0.2, 0, 0] }, weapon: { aim: [-0.3, 0.7, -0.7] }, offhand: { aim: [0.3, 0.7, -0.7] }, cape: { rot: [0.4, 0, 0] } }),
      merge(arms([0.2, -0.2, 0.95], [0.6, -0.2, 0.75], [0.4, -0.8, 0.4], [0.3, -0.5, 0.8]), legs(0.3, 0.25, -0.35, -0.5, 0.3, 0.2),
        { hips: { off: [0, -2, 1.4] }, chest: { rot: [0.3, 0.45, 0] }, weapon: { aim: [0.6, -0.4, 0.7] }, offhand: { aim: [0.3, 0.8, 0.5] }, cape: { rot: [1.2, 0, 0] } }),
      merge(arms([-0.4, -0.8, 0.4], [-0.3, -0.5, 0.8], [-0.2, -0.2, 0.95], [-0.6, -0.2, 0.75]), legs(0.3, 0.25, -0.35, -0.5, 0.3, 0.2),
        { hips: { off: [0, -2, 1.4] }, chest: { rot: [0.3, -0.45, 0] }, weapon: { aim: [-0.3, 0.8, 0.5] }, offhand: { aim: [-0.6, -0.4, 0.7] }, cape: { rot: [1.0, 0, 0] } }),
      merge(arms([-0.2, -0.1, 0.97], [0.05, -0.1, 1], [0.2, -0.1, 0.97], [-0.05, -0.1, 1]), legs(0.3, 0.25, -0.35, -0.5, 0.3, 0.2),
        { hips: { off: [0, -2, 2] }, chest: { rot: [0.35, 0, 0] }, weapon: { aim: [0, 0.1, 1] }, offhand: { aim: [0, 0.1, 1] }, cape: { rot: [0.7, 0, 0] } }),
      merge(arms([-0.2, -0.85, 0.45], [-0.15, -0.6, 0.8], [0.2, -0.85, 0.45], [0.15, -0.6, 0.8]), legs(0.15, 0.2, -0.2, -0.3, 0.2, 0.1),
        { hips: { off: [0, -0.8, 1] }, chest: { rot: [0.2, 0, 0] }, weapon: { aim: [-0.2, 0.5, 0.8] }, offhand: { aim: [0.2, 0.5, 0.8] }, cape: { rot: [0.35, 0, 0] } }),
    ][f],
  },
  'attack:none': {
    frames: 4,
    pose: f => [
      merge(arms([-0.45, 0.2, -0.85], [0.1, 0.5, 0.85]), { chest: { rot: [0, -0.35, 0] } }),
      merge(arms([-0.2, 0.05, 0.98], [-0.05, 0.05, 1], [0.3, -0.8, -0.3], [0.2, -0.6, 0.4]), { chest: { rot: [0, 0.3, 0] }, hips: { off: [0, -1, 0] } }),
      merge(arms([-0.2, 0.05, 0.98], [-0.05, 0.05, 1], [0.3, -0.8, -0.3], [0.2, -0.6, 0.4]), { chest: { rot: [0, 0.35, 0] } }),
      merge(arms(...REST), { chest: { rot: [0, 0.1, 0] } }),
    ][f],
  },
  // two-hand spell: gather at the chest -> raise -> release forward -> recover (socket 'cast' = where the spell spawns)
  cast: {
    frames: 4,
    pose: f => [
      merge(arms([-0.45, -0.5, 0.74], [0.75, 0.15, 0.65]), legs(0.1, 0.25, -0.3, 0.1, 0.25, -0.3), { hips: { off: [0, -1, 0] }, chest: { rot: [0.06, 0, 0] } }),
      merge(arms([-0.5, 0.65, 0.57], [-0.2, 0.95, 0.25]), { chest: { rot: [-0.15, 0, 0] }, head: { rot: [-0.12, 0, 0] }, cape: { rot: [0.15, 0, 0] } }),
      merge(arms([-0.2, 0.1, 0.97], [-0.05, 0.1, 1]), legs(0.25, 0.2, -0.3, -0.35, 0.2, 0.15), { hips: { off: [0, -1, 0] }, chest: { rot: [0.2, 0, 0] }, cape: { rot: [0.4, 0, 0] } }),
      merge(arms([-0.25, -0.6, 0.76], [-0.1, -0.3, 0.95]), { chest: { rot: [0.05, 0, 0] } }),
    ][f],
  },
  // dash (boots skill): low lean, legs stretched, arms swept back
  dash: {
    frames: 2,
    pose: f => merge(arms([-0.25, -0.6, -0.75], [-0.1, -0.3, -0.95]),
      f ? legs(0.6, 0.5, -0.3, -0.8, 1.0, 0) : legs(-0.9, 1.0, 0, 0.7, 0.4, -0.2),
      { hips: { off: [0, -2, 0] }, chest: { rot: [0.5, 0, 0] }, head: { rot: [-0.3, 0, 0] }, cape: { rot: [0.95 + 0.1 * f, 0, 0] } }),
  },
  hit: {
    frames: 1,
    pose: () => merge(arms([-0.6, -0.6, -0.5], [-0.4, -0.3, -0.85]), legs(-0.15, 0.2, -0.05, 0.1, 0.15, -0.25),
      { chest: { rot: [-0.3, 0.1, 0] }, head: { rot: [-0.25, 0, 0] }, cape: { rot: [-0.05, 0, 0] } }),
  },
};

module.exports = { anims, sheetAnims: ['idle', 'walk', 'attack', 'cast', 'dash', 'hit'] };
