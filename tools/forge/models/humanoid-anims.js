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

const anims = {
  idle: { frames: 2, pose: f => merge(arms(...REST), { chest: { off: [0, -f, 0] }, cape: { rot: [0.06 + 0.04 * f, 0, 0] } }) },
  // contact (right foot ahead), passing, contact (left foot ahead), passing; hips drop 1 px on contact
  walk: {
    frames: 4,
    pose: f => {
      const L = [legs(-0.45, 0.15, 0.3, 0.4, 0.35, -0.25), legs(0.05, 0.05, -0.1, -0.25, 0.75, -0.2),
        legs(0.4, 0.35, -0.25, -0.45, 0.15, 0.3), legs(-0.25, 0.75, -0.2, 0.05, 0.05, -0.1)][f];
      const back = [[-0.12, -1, -0.38], [-0.05, -1, -0.1]], fwd = [[-0.12, -1, 0.42], [-0.05, -0.85, 0.55]];
      const A = [arms(back[0], back[1], mir(fwd[0]), mir(fwd[1])), arms(...REST), arms(fwd[0], fwd[1], mir(back[0]), mir(back[1])), arms(...REST)][f];
      return merge(L, A, { hips: { off: [0, [-1, 0, -1, 0][f], 0] }, chest: { rot: [0, [-0.1, 0, 0.1, 0][f], 0] }, cape: { rot: [[0.3, 0.38, 0.3, 0.38][f], 0, 0] } });
    },
  },
  // sword: raise over the right shoulder -> mid swing -> impact (blade forward-left) -> follow through
  'attack:sword': {
    frames: 4,
    pose: f => [
      merge(arms([-0.55, 0.75, -0.35], [-0.1, 0.95, -0.3], [0.3, -0.75, 0.6], [0.2, -0.5, 0.85]), legs(0.25, 0.2, -0.3, -0.3, 0.1, 0.15),
        { chest: { rot: [0, -0.45, 0] }, weapon: { aim: [0.15, 0.6, -0.78] }, cape: { rot: [0.2, 0, 0] } }),
      merge(arms([-0.6, 0.2, 0.75], [-0.35, 0.1, 0.93], [0.35, -0.7, 0.6], [0.25, -0.45, 0.85]), legs(0.3, 0.2, -0.35, -0.4, 0.15, 0.2),
        { chest: { rot: [0, -0.1, 0] }, weapon: { aim: [-0.55, 0.15, 0.82] }, cape: { rot: [0.35, 0, 0] } }),
      merge(arms([0.1, -0.2, 0.98], [0.45, -0.25, 0.86], [0.45, -0.75, -0.3], [0.3, -0.85, -0.1]), legs(0.35, 0.25, -0.4, -0.5, 0.25, 0.25),
        { hips: { off: [0, -1, 0] }, chest: { rot: [0, 0.45, 0] }, weapon: { aim: [0.75, -0.35, 0.56] }, cape: { rot: [0.5, 0, 0] } }),
      merge(arms([0.35, -0.6, 0.7], [0.5, -0.75, 0.43], [0.35, -0.85, -0.2], [0.2, -0.9, 0.1]), legs(0.3, 0.2, -0.35, -0.4, 0.2, 0.2),
        { chest: { rot: [0, 0.55, 0] }, weapon: { aim: [0.55, -0.75, 0.35] }, cape: { rot: [0.3, 0, 0] } }),
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
