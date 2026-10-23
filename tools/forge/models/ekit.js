'use strict';
// EKIT — shared helpers for the forge ENEMY humanoids (M4b: bramblehorn, gloomknight, gravechanter, voidarcher, oathless,
// gloamwarden). Not a rig. Bone names are the humanoid ones of models/humanoid-anims.js (hips > spine > chest > head |
// upperR/L > foreR/L > handR/L > weapon / offhand; hips > thighR/L > shinR/L > footR/L); the RIGHT side is -x.
//   arms(up, fore, upL?, foreL?)  limb directions (point: a bone's -y), the left mirrored when not given
//   legs(tR, sR, fR, tL, sL, fL)  thigh / shin / foot turns (x; negative = forward)
//   merge(...poses)               shallow merge per bone
//   scaleModel(model, SC)         every length x SC (bones, volumes, stamps, sockets) in place
//   offs(anim, k)                 an anim whose joint offsets are x k
//   idle4(k, hold?)  4 frames, breathing (the upper body sinks 0, 1, 1, 0 px x k)
//   walk4(k, hold?)  4 frames: contact R -> pass -> contact L -> pass (the boss-scale and heavy walk; 150 ms)
//   walk6(k, hold?)  humanoid-anims walk (6 frames) with offsets x k
//   hit(k, hold?)    1 frame, humanoid-anims hit
// hold(anim, f) -> extra bones (a held weapon's aim) merged into every frame.
const H = require('./humanoid-anims.js').anims;
const mir = d => [-d[0], d[1], d[2]];
const merge = (...o) => { const out = {}; for (const p of o) for (const k in p) out[k] = Object.assign({}, out[k] || {}, p[k]); return out; };
const arm = (s, up, fore) => ({ ['upper' + s]: { point: up }, ['fore' + s]: { point: fore } });
const arms = (up, fore, upL, foreL) => Object.assign(arm('R', up, fore), arm('L', upL || mir(up), foreL || mir(fore)));
const legs = (tR, sR, fR, tL, sL, fL) => ({ thighR: { rot: [tR, 0, 0] }, shinR: { rot: [sR, 0, 0] }, footR: { rot: [fR, 0, 0] },
  thighL: { rot: [tL, 0, 0] }, shinL: { rot: [sL, 0, 0] }, footL: { rot: [fL, 0, 0] } });
const REST = [[-0.17, -1, 0.04], [-0.07, -1, 0.24]];
const kOff = (P, k) => { const out = {}; for (const b in P) { out[b] = Object.assign({}, P[b]); if (P[b].off) out[b].off = P[b].off.map(v => v * k); } return out; };
const offs = (A, k) => Object.assign({}, A, { pose: f => kOff(A.pose(f), k) });
const withHold = (name, A, hold) => hold ? Object.assign({}, A, { pose: f => merge(A.pose(f), hold(name, f) || {}) }) : A;
const idle4 = (k = 1, hold) => withHold('idle', { frames: 4, ms: [300, 300, 300, 300], pose: f => { const d = [0, 1, 1, 0][f];
  return kOff(merge(arms([-0.17, -1, 0.04 + 0.04 * d], [-0.07, -1, 0.24 + 0.05 * d]), legs(0.12, 0.1, -0.1, -0.18, 0.12, 0.02), { chest: { off: [0, -0.9 * d, 0] }, head: { rot: [0.04 * d, 0, 0] } }), k); } }, hold);
const walk4 = (k = 1, hold) => withHold('walk', { frames: 4, ms: [150, 150, 150, 150], pose: f => {
  const fw = [-0.55, 0.25, 0.25], bk = [0.45, 0.35, 0.1], pl = [-0.15, 0.95, 0.1], ps = [0.05, 0.12, -0.05];
  const L = [legs(...fw, ...bk), legs(...ps, ...pl), legs(...bk, ...fw), legs(...pl, ...ps)][f];
  const sw = [1, 0, -1, 0][f], A = arms([-0.15, -1, -0.35 * sw], [-0.05, -0.85, -0.3 * sw + 0.2], [0.15, -1, 0.35 * sw], [0.05, -0.85, 0.3 * sw + 0.2]);
  return kOff(merge(L, A, { hips: { off: [0, [0, 1, 0, 1][f], 0] }, chest: { rot: [0.1, -0.1 * sw, 0] } }), k); } }, hold);
const walk6 = (k = 1, hold) => withHold('walk', offs(H.walk, k), hold);
const hit = (k = 1, hold) => withHold('hit', offs(H.hit, k), hold);
const idle6 = (k = 1, hold) => withHold('idle', offs(H.idle, k), hold);
function scaleModel(m, SC) {
  const sv = v => v.map(x => x * SC);
  for (const b of m.bones) b.at = sv(b.at);
  for (const L of m.layers) {
    L.prims = L.prims.map(p => { const q = Object.assign({}, p); for (const k of ['c', 'r', 'a', 'b', 'h']) if (q[k]) q[k] = sv(q[k]); for (const k of ['ra', 'rb', 'round']) if (q[k] != null) q[k] *= SC;
      if (q.clip) q.clip = Array.isArray(q.clip[0]) ? q.clip.map(c => [c[0], c[1], c[2], c[3] * SC]) : [q.clip[0], q.clip[1], q.clip[2], q.clip[3] * SC]; return q; });
    L.stamps = (L.stamps || []).map(t => Object.assign({}, t, { at: sv(t.at) }));
  }
  for (const k in m.sockets || {}) m.sockets[k] = Object.assign({}, m.sockets[k], { at: sv(m.sockets[k].at) });
  return m;
}
const DIRS8 = [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]];
const BASE = { cam: { elev: 28 }, light: [-0.55, 0.7, 0.5], tones: [0.8, 0.3, -0.3], outline: '#0c0714', innerLine: 2.0, pixel: { normalSteps: 0 }, flatDepth: true };
module.exports = { mir, merge, arm, arms, legs, REST, offs, kOff, withHold, idle4, idle6, walk4, walk6, hit, scaleModel, DIRS8, BASE };
