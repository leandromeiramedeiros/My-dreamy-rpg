'use strict';
// VOID ARCHER (`voidarcher`, the Ruins: the ranged sniper) — a forge humanoid at the hero's scale (models/ekit.js:
// humanoid-anims idle / walk / hit), about 34 px tall: a lean figure in a deep-blue hooded cloak and dark leathers, a
// faceless void under the hood with two violet eye-points, a quiver on the back, a tall violet-glowing bow in the left hand.
// Frame 68 x 72, origin (34, 57). Every pixel from volumes (the bowstring: a 1 px line prim; eyes: stamps). Units are pixels,
// y up, it faces +z; its RIGHT side is -x. Attack (6 frames, the humanoid bow shot reshaped to the enemy contract; render.js:
// wind f0-1 = raise + nock, draw; action f2-3 = full draw, release; rec f4-5). Death 3. Sockets: head, chest, handL, tip.
const K = require('./ekit.js');
const { merge, arms, legs } = K;
const G = require('./gloomknight.js').kit;
const SIDES = [['R', -1], ['L', 1]];

const bones = [...G.bones(), { name: 'offhand', parent: 'handL', at: [0, -0.6, 0] }];
const LIMB = 11.5;
const prims = [
  // hood (open at the front onto a void), a cloak to the knees, leather torso and limbs, a quiver
  { bone: 'head', mat: 'void', part: 'face', shape: 'ell', c: [0, 2.8, 1.0], r: [2.8, 3.0, 2.8] },
  { bone: 'head', mat: 'cloak', part: 'cloak', shape: 'ell', c: [0, 3.4, -0.5], r: [4.0, 4.4, 4.0], clip: [0, 0, 1, 1.8] },
  { bone: 'head', mat: 'cloak', part: 'cloak', shape: 'cap', a: [0, 6.0, -1.6], b: [0, 7.4, -3.8], ra: 1.8, rb: 0.7 },
  { bone: 'chest', mat: 'leather', part: 'torso', shape: 'ell', c: [0, 1.6, 0], r: [3.8, 4.6, 2.9] },
  { bone: 'chest', mat: 'cloak', part: 'cloak', shape: 'ell', c: [0, 3.6, -0.6], r: [4.8, 2.0, 3.6] },
  { bone: 'chest', mat: 'cloak', part: 'cloak', shape: 'box', c: [0, -3.4, -2.8], h: [4.0, 6.6, 0.6], round: 0.5, rot: [0.12, 0, 0] },
  { bone: 'chest', mat: 'wood', part: 'quiver', shape: 'cap', a: [2.0, 4.8, -3.2], b: [-1.6, -2.4, -3.0], ra: 1.1, rb: 1.0 },
  ...[0, 1, 2].map(i => ({ bone: 'chest', mat: 'fletch', part: 'quiver', shape: 'cap', a: [2.0 - i * 0.6, 5.2, -3.2], b: [2.6 - i * 0.6, 7.0, -3.4], ra: 0.4, rb: 0.5 })),
  { bone: 'hips', mat: 'trim', part: 'belt', shape: 'disc', c: [0, 0.6, 0], r: [3.4, 0.6, 2.6] },
  { bone: 'hips', mat: 'leather', part: 'torso', shape: 'ell', c: [0, -0.6, 0], r: [3.2, 2.6, 2.6] },
  ...SIDES.flatMap(([s]) => [
    { bone: 'upper' + s, mat: 'leather', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -4.4, 0], ra: 1.3, rb: 1.1 },
    { bone: 'fore' + s, mat: 'cloak', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -3.6, 0], ra: 1.2, rb: 1.3 },
    { bone: 'hand' + s, mat: 'void', part: 'arm' + s, shape: 'ell', c: [0, -0.6, 0], r: [1.0, 1.1, 1.0] },
    { bone: 'thigh' + s, mat: 'leather', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -5.6, 0], ra: 1.5, rb: 1.2 },
    { bone: 'shin' + s, mat: 'cloak', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -5.2, 0], ra: 1.3, rb: 1.1 },
    { bone: 'foot' + s, mat: 'void', part: 'leg' + s, shape: 'ell', c: [0, -0.6, 0.8], r: [1.3, 1.3, 2.0], clip: [0, -1, 0, 1.6] },
  ]),
  // the bow: the grip on 'offhand' (+y up the bow), two limbs curving back (-z) to the tips, the string a 1 px line
  { bone: 'offhand', mat: 'bowwood', part: 'bow', shape: 'cap', a: [0, -1.2, 0], b: [0, 1.2, 0], ra: 0.75, rb: 0.75 },
  ...[1, -1].flatMap(d => [
    { bone: 'offhand', mat: 'bow', part: 'bow', shape: 'cap', a: [0, 1.2 * d, 0], b: [0, 6.4 * d, -1.6], ra: 0.75, rb: 0.5 },
    { bone: 'offhand', mat: 'bow', part: 'bow', shape: 'cap', a: [0, 6.4 * d, -1.6], b: [0, LIMB * d, -1.2], ra: 0.6, rb: 0.35 },
  ]),
  { bone: 'offhand', mat: 'string', part: 'string', shape: 'cap', a: [0, LIMB, -1.2], b: [0, -LIMB, -1.2], ra: 0.3, rb: 0.3 },
];
const layers = [{
  id: 'body', group: 'body', prims,
  mats: { cloak: ['#171d30', '#18223e', '#26365c', '#384c7e'], leather: ['#201c26', '#241e2c', '#36303e', '#4a4254'], void: { ramp: ['#1e1e21', '#27272e', '#30303d', '#39394d'] },
    trim: { ramp: ['#271341', '#3e1c6c', '#5e30a0', '#8a5ad0'], lift: 1 }, wood: ['#251b1f', '#34242a', '#4e383a', '#6a5048'], fletch: { ramp: ['#4a2a6a', '#7a4aa8', '#a876d8', '#d4b0ff'], lift: 1 },
    bowwood: ['#251b1f', '#34242a', '#4e383a', '#6a5048'], bow: { ramp: ['#4a1a7a', '#7a3ab8', '#a868e8', '#dcb0ff'], lift: 2 }, string: { ramp: ['#c8b0ff', '#c8b0ff', '#c8b0ff', '#c8b0ff'], flat: 0, fine: true } },   // fine: a 1 px string (lint skips its cut-off dots)
  stamps: SIDES.map(([, k]) => ({ bone: 'head', at: [1.0 * k, 2.8, 3.7], n: [0.3 * k, 0, 0.95], facing: 0.05, on: 'void', px: [[0, 0, '#d890ff'], [k < 0 ? -1 : 1, 0, '#d890ff']] })),
}];
// the bow held at rest: lowered in the left hand, upright
const hold = (a, f) => ({ offhand: { aim: a === 'hit' ? [0.4, 0.8, -0.4] : [0.15, 0.95, 0.25], roll: [0, 0, 1] } });
const B = (u, f, uL, fL, ch, oh, h = {}) => merge(arms(u, f, uL, fL), legs(0.2, 0.1, -0.2, -0.25, 0.1, 0.1), { chest: { rot: [0, ch, 0] }, offhand: { aim: oh, roll: [0, 0, 1] } }, h);
const attack = {
  frames: 6, ms: [250, 250, 200, 80, 150, 150],
  pose: f => [
    B([-0.3, -0.1, 0.95], [0.45, 0.1, 0.89], [0.15, 0.08, 0.99], [0.08, 0.06, 1], -0.5, [0, 1, 0.05]),
    B([-0.85, 0.15, -0.5], [0.6, 0.25, 0.76], [0.15, 0.08, 0.99], [0.08, 0.06, 1], -0.55, [0, 1, 0.05]),
    B([-0.9, 0.15, -0.45], [0.65, 0.25, 0.72], [0.15, 0.1, 0.99], [0.08, 0.08, 1], -0.6, [0, 1, 0.05], { head: { rot: [0.05, 0, 0] } }),
    B([-0.85, 0.3, -0.45], [-0.55, 0.45, -0.7], [0.15, 0.1, 0.99], [0.08, 0.1, 1], -0.5, [0, 1, 0.1]),
    B([-0.6, -0.4, -0.7], [-0.3, -0.5, -0.8], [0.2, -0.1, 0.97], [0.1, 0, 0.99], -0.35, [0.1, 0.98, 0.15]),
    B([-0.2, -0.9, 0.3], [-0.1, -0.7, 0.7], [0.2, -0.4, 0.9], [0.1, -0.3, 0.95], -0.2, [0.2, 0.95, 0.25]),
  ][f],
};
const offs = h => Object.assign({}, G.death, { pose: f => merge(G.death.pose(f), { offhand: { aim: [0.5, 0.2 - f * 0.4, 0.8], roll: [0, 0, 1] }, weapon: {} }) });

module.exports = Object.assign({
  name: 'voidarcher',
  frame: [68, 72], origin: [34, 57],
  bankSheets: { mv: ['walk'], die: ['hit', 'death'] },
  bones, layers,
  anims: { idle: K.idle6(1, hold), walk: K.walk6(1, hold), attack, hit: K.hit(1, hold), death: offs() },
  sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death'],
  sockets: { head: { bone: 'head', at: [0, 7.0, 0] }, chest: { bone: 'chest', at: [0, 1.4, 0] }, handL: { bone: 'handL', at: [0, -0.6, 0] }, tip: { bone: 'offhand', at: [0, 0, 1.0] } },
  dirs: K.DIRS8,
}, K.BASE);
