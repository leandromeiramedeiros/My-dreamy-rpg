'use strict';
// MOUNTAIN TROLL (`mountaintroll`, Pinewood / Root Hollow: the sleeper brute; also the Gnarlroot Brute's art) — a forge enemy
// on the shared humanoid rig (models/humanoid-anims.js idle / walk / hit, offsets x1.6, plus a hunch on every pose), with its
// own two-fisted slam, a curled sleep and a face-down death. Frame 80 x 88, origin (40, 68): the brute mid size, like the
// ogre. Recognisable from the old sprite: hunched, blue-grey stone hide, moss on the back and shoulders, a small head carried
// low and forward with yellow eyes, very long arms with big fists (the slam is its circle attack: no club).
// Attack (6 frames, render.js maps the brute part's real timing: wind 0.9 s = f0-1, strike 0.15 s = f2-3, rec 0.6 s = f4-5):
// both fists rise -> overhead, arched back -> they come down -> fists hit the ground in front -> crouched -> rising.
// Units are pixels, y up, it faces +z; its RIGHT side is -x. Sockets: chest + head (status layers), handR, handL.
const SIDES = [['R', -1], ['L', 1]];
const H = require('./humanoid-anims.js').anims;
const mir = d => [-d[0], d[1], d[2]];
const merge = (...o) => { const out = {}; for (const p of o) for (const k in p) out[k] = Object.assign({}, out[k] || {}, p[k]); return out; };
const arm = (s, up, fore) => ({ ['upper' + s]: { point: up }, ['fore' + s]: { point: fore } });
const arms = (up, fore, upL, foreL) => Object.assign(arm('R', up, fore), arm('L', upL || mir(up), foreL || mir(fore)));
const legs = (tR, sR, fR, tL, sL, fL) => ({ thighR: { rot: [tR, 0, 0] }, shinR: { rot: [sR, 0, 0] }, footR: { rot: [fR, 0, 0] },
  thighL: { rot: [tL, 0, 0] }, shinL: { rot: [sL, 0, 0] }, footL: { rot: [fL, 0, 0] } });
// the hunch: the chest leans forward, the head looks up out of it; bent knees
const HUNCH = 0.45;
const hunch = P => {
  const out = {}; for (const b in P) out[b] = Object.assign({}, P[b]);
  const add = (b, v) => { const r = (out[b] && out[b].rot) || [0, 0, 0]; out[b] = Object.assign({}, out[b] || {}, { rot: [(r[0] || 0) + v, r[1] || 0, r[2] || 0] }); };
  add('chest', HUNCH); add('head', -HUNCH * 0.8);
  return out;
};
const K = 1.6;
const scaled = A => Object.assign({}, A, { pose: f => {
  const P = A.pose(f), out = {};
  for (const b in P) { out[b] = Object.assign({}, P[b]); if (P[b].off) out[b].off = P[b].off.map(v => v * K); }
  return hunch(out);
} });

const bones = [
  { name: 'hips', at: [0, 16, 0] },
  { name: 'spine', parent: 'hips', at: [0, 0, 0] },
  { name: 'chest', parent: 'spine', at: [0, 8.5, 0] },
  { name: 'head', parent: 'chest', at: [0, 6.0, 7.6] },
  ...SIDES.flatMap(([s, k]) => [
    { name: 'upper' + s, parent: 'chest', at: [12.6 * k, 3.6, 1.6] },
    { name: 'fore' + s, parent: 'upper' + s, at: [0, -9.0, 0] },
    { name: 'hand' + s, parent: 'fore' + s, at: [0, -8.6, 0] },
    { name: 'thigh' + s, parent: 'hips', at: [6.0 * k, -1.0, 0] },
    { name: 'shin' + s, parent: 'thigh' + s, at: [0, -6.6, 0] },
    { name: 'foot' + s, parent: 'shin' + s, at: [0, -6.4, 0] },
  ]),
];

const STONE = { ramp: ['#2a2a42', '#46466a', '#6c6c92', '#9898ba'], lift: 1 };
const MOSS = { ramp: ['#1c4a3a', '#2c6c48', '#4a945a', '#86c06c'] };
const layers = [
  {
    id: 'body', group: 'body',
    mats: { stone: STONE, moss: MOSS, nail: { ramp: ['#5a5068', '#847a90', '#b0a8ba', '#d8d2de'], lift: 1 }, shard: { ramp: ['#3a3a5c', '#5e6290', '#8c94c4', '#c4ccec'], lift: 1 } },
    prims: [
      // head: a small brow-heavy head on a wide jaw, two lower fangs; moss on the crown
      { bone: 'head', mat: 'stone', part: 'head', shape: 'ell', c: [0, 2.8, 0.6], r: [5.0, 4.6, 5.0] },
      { bone: 'head', mat: 'stone', part: 'head', shape: 'ell', c: [0, 0.8, 2.2], r: [4.8, 2.8, 4.2] },
      { bone: 'head', mat: 'stone', part: 'head', shape: 'ell', c: [0, 4.4, 3.8], r: [4.4, 1.0, 1.6] },
      { bone: 'head', mat: 'stone', part: 'head', shape: 'ell', c: [0, 2.6, 5.6], r: [1.3, 1.5, 1.2] },
      { bone: 'head', mat: 'moss', part: 'head', shape: 'ell', c: [0.6, 6.4, -0.6], r: [3.6, 1.6, 3.4] },
      ...SIDES.map(([, k]) => ({ bone: 'head', mat: 'nail', part: 'head', shape: 'cap', a: [2.2 * k, -0.6, 5.6], b: [2.5 * k, 1.6, 6.0], ra: 0.9, rb: 0.7 })),
      // the hunched back: a broad slab of chest, a hump, a belly; moss and two stone shards on the back
      { bone: 'chest', mat: 'stone', part: 'torso', shape: 'ell', c: [0, 2.0, 0.4], r: [13.0, 8.0, 8.4] },
      { bone: 'chest', mat: 'stone', part: 'torso', shape: 'ell', c: [0, 5.4, -3.6], r: [9.4, 5.6, 6.0] },
      { bone: 'spine', mat: 'stone', part: 'belly', shape: 'ell', c: [0, 3.6, 0.8], r: [10.0, 7.6, 8.2] },
      { bone: 'chest', mat: 'moss', part: 'torso', shape: 'ell', c: [0, 8.6, -4.6], r: [7.6, 2.6, 5.0] },
      ...SIDES.map(([, k]) => ({ bone: 'chest', mat: 'moss', part: 'torso', shape: 'ell', c: [9.4 * k, 7.0, -0.6], r: [4.4, 2.6, 4.4] })),
      { bone: 'chest', mat: 'shard', part: 'torso', shape: 'cap', a: [-3.0, 8.0, -7.0], b: [-4.2, 12.4, -9.2], ra: 1.7, rb: 0.9 },
      { bone: 'chest', mat: 'shard', part: 'torso', shape: 'cap', a: [3.4, 7.4, -7.6], b: [4.8, 10.8, -10.2], ra: 1.5, rb: 0.8 },
      { bone: 'hips', mat: 'stone', part: 'belly', shape: 'ell', c: [0, -0.6, 0], r: [9.4, 4.0, 7.6] },
      ...SIDES.flatMap(([s, k]) => [
        { bone: 'upper' + s, mat: 'stone', part: 'arm' + s, shape: 'ell', c: [0, -0.4, 0], r: [4.6, 4.6, 4.6] },
        { bone: 'upper' + s, mat: 'moss', part: 'arm' + s, shape: 'ell', c: [0.8 * k, 1.6, -0.4], r: [3.6, 2.0, 3.6] },
        { bone: 'upper' + s, mat: 'stone', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -9.0, 0], ra: 3.6, rb: 2.9 },
        { bone: 'fore' + s, mat: 'stone', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -8.0, 0], ra: 2.9, rb: 3.4 },
        { bone: 'hand' + s, mat: 'stone', part: 'arm' + s, shape: 'ell', c: [0, -1.4, 0.2], r: [3.8, 3.6, 3.8] },
        { bone: 'thigh' + s, mat: 'stone', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -6.6, 0], ra: 4.0, rb: 3.4 },
        { bone: 'shin' + s, mat: 'stone', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -6.0, 0], ra: 3.4, rb: 3.0 },
        { bone: 'foot' + s, mat: 'stone', part: 'leg' + s, shape: 'ell', c: [0, -0.8, 1.6], r: [3.8, 2.4, 4.6], clip: [0, -1, 0, 2.4] },
      ]),
    ],
    stamps: SIDES.map(([, k]) => ({ bone: 'head', at: [1.9 * k, 3.2, 4.6], n: [0.3 * k, 0.1, 0.95], facing: 0.05, on: 'stone', px: [[0, 0, '#ffd23a'], [1 * k, 0, '#ffd23a']] })),
  },
];

// ---- anims ------------------------------------------------------------------------------------------------------------
const attack = {
  frames: 6, ms: [450, 450, 75, 75, 300, 300],
  pose: f => hunch([
    // 0 wind: both fists swing up past the face, the troll rears back
    merge(arms([-0.3, 0.45, 0.84], [-0.1, 0.95, 0.3]), legs(0.2, 0.3, -0.3, -0.1, 0.3, -0.1),
      { hips: { off: [0, -1.0, -0.8] }, chest: { rot: [-0.45, 0, 0] }, head: { rot: [-0.1, 0, 0] } }),
    // 1 wind peak: fists together high overhead, back arched
    merge(arms([-0.25, 0.95, -0.2], [0.25, 0.95, 0.2]), legs(0.1, 0.15, -0.2, -0.1, 0.15, -0.05),
      { hips: { off: [0, 0.8, -1.4] }, chest: { rot: [-0.75, 0, 0] }, head: { rot: [0.1, 0, 0] } }),
    // 2 strike: the fists come down in front, the body folds
    merge(arms([-0.2, 0.3, 0.93], [0.2, -0.2, 0.96]), legs(0.4, 0.5, -0.5, 0.2, 0.5, -0.4),
      { hips: { off: [0, -3.0, 1.6] }, chest: { rot: [0.25, 0, 0] } }),
    // 3 impact: the fists hit the ground in front, deep crouch
    merge(arms([-0.15, -0.55, 0.82], [0.1, -0.85, 0.5]), legs(0.7, 0.9, -0.6, 0.5, 0.9, -0.5),
      { hips: { off: [0, -5.6, 2.4] }, chest: { rot: [0.55, 0, 0] }, head: { rot: [-0.3, 0, 0] } }),
    // 4 recover: still down, the fists push off the ground
    merge(arms([-0.2, -0.7, 0.68], [0.0, -0.95, 0.3]), legs(0.6, 0.8, -0.5, 0.45, 0.8, -0.45),
      { hips: { off: [0, -4.6, 1.8] }, chest: { rot: [0.45, 0, 0] }, head: { rot: [-0.2, 0, 0] } }),
    // 5 recover end: rising back into the hunch
    merge(arms([-0.2, -0.95, 0.25], [-0.05, -0.95, 0.3]), legs(0.25, 0.35, -0.3, 0.15, 0.35, -0.25),
      { hips: { off: [0, -1.8, 0.8] }, chest: { rot: [0.15, 0, 0] } }),
  ][f]),
};
// sleep (the sleeper part, e.asleep): sat down, curled over its knees, arms round them; it breathes
const sleep = {
  frames: 2, ms: [700, 700],
  pose: f => hunch(merge(arms([-0.45, -0.55, 0.7], [0.5, -0.3, 0.81]), legs(-1.35, 2.0, -0.6, -1.35, 2.0, -0.6),
    { hips: { off: [0, -9.4, -2.0] }, chest: { rot: [0.5, 0, 0], off: [0, -0.6 * f, 0] }, head: { rot: [0.5, 0, 0] } })),
};
// death: staggers, drops to its knees, falls on its face
const death = {
  frames: 3, ms: [180, 180, 400],
  pose: f => hunch([
    merge(arms([-0.5, -0.55, -0.67], [-0.35, -0.4, -0.85]), legs(0.3, 0.5, -0.3, -0.1, 0.6, -0.2),
      { hips: { off: [0, -2.4, -1.0] }, chest: { rot: [-0.5, 0.15, 0] }, head: { rot: [-0.3, 0, 0] } }),
    merge(arms([-0.35, -0.75, 0.56], [-0.15, -0.9, 0.4]), legs(-1.1, 1.9, -0.4, -1.1, 1.9, -0.4),
      { hips: { off: [0, -6.0, -1.0] }, chest: { rot: [0.4, 0, 0] }, head: { rot: [0.2, 0, 0] } }),
    merge(arms([-0.45, -0.3, 0.84], [-0.2, -0.2, 0.96]), legs(-0.4, 0.4, -0.3, -0.35, 0.5, -0.3),
      { hips: { off: [0, -11.0, -6.0], rot: [1.25, 0, 0] }, chest: { rot: [0.0, 0, 0] }, head: { rot: [0.3, 0, 0] } }),
  ][f]),
};
const anims = { idle: scaled(H.idle), walk: scaled(H.walk), attack, hit: scaled(H.hit), sleep, death };

module.exports = {
  name: 'mountaintroll',
  frame: [80, 88], origin: [40, 68],
  cam: { elev: 28 },
  light: [-0.55, 0.7, 0.5],
  tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.0,
  pixel: { normalSteps: 0 },
  flatDepth: true, bankSheets: { die: ['hit', 'death'] },     // one layer: a part map for depth (forge.js flatDq); hit + death in their own sheet
  bones, layers, anims, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death', 'sleep'],
  sockets: {
    handR: { bone: 'handR', at: [0, -1.4, 0] }, handL: { bone: 'handL', at: [0, -1.4, 0] },
    head: { bone: 'head', at: [0, 8.0, 0] }, chest: { bone: 'chest', at: [0, 2.0, 0] },
  },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
};
