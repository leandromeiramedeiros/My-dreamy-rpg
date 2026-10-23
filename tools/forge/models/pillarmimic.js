'use strict';
// PILLAR MIMIC (`pillarmimic`, the Ruins: a ruin column that is a mouth) — a forge rig, 8 directions (it has a face): a
// square grey-violet stone column on a plinth under a carved capital, cracked down its front; its upper half is a lid hinged
// at the back that swings open on a red maw ringed with stone teeth, and one amber eye opens on the front when it wakes.
// Frame 56 x 68, origin (28, 58): about 32 px tall (the hero ~31). Every pixel from volumes. Units are pixels, y up, it faces
// +z; its RIGHT side is -x. Anims: sleep 1 (the dormant column: lid shut, no eye; render.js plays it while e.asleep), idle 6
// (the lid breathes ajar), walk 6 (it hops, height baked in), attack 6 (render.js: wind f0-1 = it rears back, the maw gapes;
// bite f2-3 = it lunges and slams shut; rec f4-5), hit 1, death 3 (it topples, the lid falls away). Sockets: head, chest, maw.
const bones = [
  { name: 'base', at: [0, 0, 0] },
  { name: 'lid', parent: 'base', at: [0, 9.0, -3.0] },
];
const awake = an => an !== 'sleep';
const prims = [
  // the lower column: plinth, shaft, the maw floor (seen only when the lid opens), the lower teeth
  { bone: 'base', mat: 'stone', part: 'col', shape: 'box', c: [0, 1.0, 0], h: [4.4, 1.0, 4.4], round: 0.4 },
  { bone: 'base', mat: 'stone', part: 'col', shape: 'box', c: [0, 5.4, 0], h: [3.3, 3.6, 3.3], round: 0.5 },
  { bone: 'base', mat: 'maw', part: 'maw', shape: 'box', c: [0, 8.7, 0], h: [2.7, 0.5, 2.7], round: 0.3 },
  ...[-1.8, 0, 1.8].map(x => ({ bone: 'base', mat: 'tooth', part: 'tooth', shape: 'cap', a: [x, 8.6, 2.6], b: [x, 10.2, 2.4], ra: 0.7, rb: 0.25 })),
  ...[-1, 1].map(k => ({ bone: 'base', mat: 'tooth', part: 'tooth', shape: 'cap', a: [2.6 * k, 8.6, 0.6], b: [2.6 * k, 10.0, 0.4], ra: 0.6, rb: 0.25 })),
  { bone: 'base', mat: 'crack', part: 'col', shape: 'box', c: [-0.8, 5.0, 3.3], h: [0.3, 2.6, 0.15], rot: [0, 0, 0.3], weight: 2 },
  // the lid: the upper shaft, the capital, an amber eye, the upper teeth; hinged at the back (rot x < 0 opens it)
  { bone: 'lid', mat: 'stone', part: 'lid', shape: 'box', c: [0, 4.6, 3.0], h: [3.3, 4.6, 3.3], round: 0.5 },
  { bone: 'lid', mat: 'stone', part: 'lid', shape: 'box', c: [0, 9.8, 3.0], h: [4.4, 1.0, 4.4], round: 0.4 },
  { bone: 'lid', mat: 'moss', part: 'lid', shape: 'ell', c: [-1.4, 11.0, 2.0], r: [2.4, 0.6, 2.0] },
  { bone: 'lid', mat: 'crack', part: 'lid', shape: 'box', c: [0.6, 4.0, 6.3], h: [0.3, 2.8, 0.15], rot: [0, 0, -0.25], weight: 2 },
  { bone: 'lid', mat: 'eye', part: 'eye', shape: 'ell', c: [0, 5.4, 6.3], r: [1.2, 0.9, 0.4], when: awake },
  { bone: 'lid', mat: 'pupil', part: 'eye', shape: 'ell', c: [0, 5.4, 6.6], r: [0.45, 0.8, 0.2], when: awake },
  ...[-1.8, 0, 1.8].map(x => ({ bone: 'lid', mat: 'tooth', part: 'tooth', shape: 'cap', a: [x, 0.3, 5.6], b: [x, -1.2, 5.4], ra: 0.7, rb: 0.25, when: awake })),
];
const layers = [{ id: 'body', group: 'body', prims, stamps: [],
  mats: { stone: { ramp: ['#2a2638', '#46425a', '#686480', '#9490ac'] }, crack: { ramp: ['#1e1d25', '#292532', '#332e3d', '#3c3849'] }, moss: { ramp: ['#1c4a3a', '#2e7650', '#58a45c', '#9ad07a'] },
    maw: { ramp: ['#3c0c1b', '#6a1428', '#9a2a3a', '#c0464e'] }, tooth: { ramp: ['#8a8278', '#bab2a4', '#e2dccc', '#fbf6ea'], lift: 1 },
    eye: { ramp: ['#ffb02a', '#ffb02a', '#ffb02a', '#ffb02a'], flat: 0 }, pupil: { ramp: ['#1a0a06', '#1a0a06', '#1a0a06', '#1a0a06'], flat: 0 } } }];
const P = (lid, o = {}) => ({ base: { off: o.off || [0, 0, 0], rot: o.rot || [0, 0, 0] }, lid: { rot: [-lid, 0, o.tilt || 0], off: o.lidOff || [0, 0, 0] } });
const anims = {
  sleep: { frames: 1, ms: [800], pose: () => P(0) },
  idle: { frames: 6, ms: [200, 200, 400, 200, 200, 400], pose: f => P([0.06, 0.1, 0.16, 0.16, 0.1, 0.06][f]) },
  walk: { frames: 6, ms: [100, 100, 100, 100, 100, 100], pose: f => P([0.1, 0.25, 0.15, 0.1, 0.25, 0.15][f], { off: [0, [0, 2.4, 1.2, 0, 2.4, 1.2][f], 0], rot: [[0, -0.12, 0.05, 0, -0.12, 0.05][f], 0, 0] }) },
  attack: { frames: 6, ms: [275, 275, 100, 100, 200, 200], pose: f => [
    P(0.6, { rot: [-0.12, 0, 0] }), P(1.0, { rot: [-0.2, 0, 0], off: [0, 0, -0.6] }),
    P(0.05, { rot: [0.22, 0, 0], off: [0, 0.6, 3.0] }), P(0, { rot: [0.15, 0, 0], off: [0, 0, 3.4] }),
    P(0.2, { rot: [0.05, 0, 0], off: [0, 0, 1.6] }), P(0.1, { off: [0, 0, 0.4] })][f] },
  hit: { frames: 1, ms: [200], pose: () => P(0.35, { rot: [-0.18, 0, 0.08], off: [0, 0, -0.8] }) },
  death: { frames: 3, ms: [180, 180, 400], pose: f => [P(0.5, { rot: [-0.2, 0, 0.15] }), P(0.9, { rot: [0.5, 0, 0.3], lidOff: [1.5, -1, 2] }), P(1.3, { rot: [1.35, 0, 0.2], off: [0, 0, 1.5], lidOff: [3, -4, 4] })][f] },
};

module.exports = require('./ekit.js').scaleModel({
  name: 'pillarmimic',
  frame: [56, 68], origin: [28, 58],
  cam: { elev: 28 }, light: [-0.55, 0.7, 0.5], tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.0, pixel: { normalSteps: 0 },
  flatDepth: true, bankSheets: { die: ['hit', 'death', 'sleep'] },
  bones, layers, anims, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death', 'sleep'],
  sockets: { head: { bone: 'lid', at: [0, 11.6, 3.0] }, chest: { bone: 'base', at: [0, 6.0, 0] }, maw: { bone: 'base', at: [0, 9.0, 1.0] } },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
}, 1.3);   // modelled at 1 unit = 1 px, built x1.3
