'use strict';
// OGRE (`ogre`, Pinewood: the cone brute) — a forge enemy on the shared humanoid rig (bone names of models/humanoid-anims.js,
// whose idle / walk / hit drive it, offsets scaled x1.7 for the bigger body), with its own club attack and death.
// Frame: 80 x 88, origin (40, 72): the brute MID size (hero 52 x 56, bosses 96 / 128), about 50 px tall on screen. Recognisable
// from the old sprite: olive skin, a small bald head with red eyes and tusks, a brown loincloth, a big wooden club.
// Every pixel comes from the volumes below (eyes are 1 x 2 surface stamps). Units are pixels, y up, it faces +z; its RIGHT
// side is -x. The club hangs from `weapon` (child of handR): its +y runs from the grip to the head.
// Attack (6 frames, render.js maps the brute part's real timing onto them: wind 0.6 s = f0-1, strike 0.15 s = f2-3, rec
// 0.6 s = f4-5): club raised behind the right shoulder -> overhead peak -> chop -> impact low in front -> drag -> lift.
// Death (3 frames, the corpse fling): stagger back -> topple -> on its back. Sockets: chest + head (status layers), handR, tip.
const SIDES = [['R', -1], ['L', 1]];
const H = require('./humanoid-anims.js').anims;
const mir = d => [-d[0], d[1], d[2]];
const merge = (...o) => { const out = {}; for (const p of o) for (const k in p) out[k] = Object.assign({}, out[k] || {}, p[k]); return out; };
const arm = (s, up, fore) => ({ ['upper' + s]: { point: up }, ['fore' + s]: { point: fore } });
const arms = (up, fore, upL, foreL) => Object.assign(arm('R', up, fore), arm('L', upL || mir(up), foreL || mir(fore)));
const legs = (tR, sR, fR, tL, sL, fL) => ({ thighR: { rot: [tR, 0, 0] }, shinR: { rot: [sR, 0, 0] }, footR: { rot: [fR, 0, 0] },
  thighL: { rot: [tL, 0, 0] }, shinL: { rot: [sL, 0, 0] }, footL: { rot: [fL, 0, 0] } });
// a humanoid-anims anim on this body: joint offsets x K, plus the club's hold
const K = 1.7;
const scaled = (A, hold) => Object.assign({}, A, { pose: f => {
  const P = A.pose(f), out = {};
  for (const b in P) { out[b] = Object.assign({}, P[b]); if (P[b].off) out[b].off = P[b].off.map(v => v * K); }
  return merge(out, hold(f));
} });

const bones = [
  { name: 'hips', at: [0, 18, 0] },
  { name: 'spine', parent: 'hips', at: [0, 0, 0] },
  { name: 'chest', parent: 'spine', at: [0, 10, 0] },
  { name: 'head', parent: 'chest', at: [0, 9.0, 5.0] },
  ...SIDES.flatMap(([s, k]) => [
    { name: 'upper' + s, parent: 'chest', at: [12.0 * k, 3.6, 0] },
    { name: 'fore' + s, parent: 'upper' + s, at: [0, -7.0, 0] },
    { name: 'hand' + s, parent: 'fore' + s, at: [0, -6.4, 0] },
    { name: 'thigh' + s, parent: 'hips', at: [5.4 * k, -1.0, 0] },
    { name: 'shin' + s, parent: 'thigh' + s, at: [0, -7.0, 0] },
    { name: 'foot' + s, parent: 'shin' + s, at: [0, -7.0, 0] },
  ]),
  { name: 'weapon', parent: 'handR', at: [0, -1.2, 0] },
];

const SKIN = { ramp: ['#3a4024', '#5c6634', '#86904a', '#b6bc6e'], lift: 1 };
const LEATHER = ['#3a2216', '#5e3a24', '#85573a', '#b07e56'], WOOD = ['#36220f', '#5a3a1e', '#86592e', '#b48650'];
const layers = [
  {
    id: 'body', group: 'body',
    mats: { skin: SKIN, cloth: LEATHER, belt: { ramp: ['#2e1c14', '#4a2e1e', '#6a4630', '#8e6646'] }, tusk: { ramp: ['#7a6c56', '#a6987c', '#d6caac', '#f2ead4'], lift: 1 },
      club: WOOD, iron: { ramp: ['#2a2a34', '#4a4a58', '#74748a', '#a4a4b8', '#d8d8e4'], spec: 0.96 } },
    prims: [
      // head: a bald dome on a heavy underbite jaw, a brow ridge over red eyes, ears, two tusks up from the jaw (part 'head')
      { bone: 'head', mat: 'skin', part: 'head', shape: 'ell', c: [0, 5.0, 0], r: [6.0, 5.6, 5.6] },
      { bone: 'head', mat: 'skin', part: 'head', shape: 'ell', c: [0, 2.0, 2.0], r: [5.4, 3.6, 4.8] },
      { bone: 'head', mat: 'skin', part: 'head', shape: 'ell', c: [0, 7.0, 4.2], r: [4.6, 1.0, 1.6] },
      ...SIDES.map(([, k]) => ({ bone: 'head', mat: 'skin', part: 'head', shape: 'ell', c: [6.0 * k, 4.6, -0.2], r: [1.4, 2.3, 1.5] })),
      ...SIDES.map(([, k]) => ({ bone: 'head', mat: 'tusk', part: 'tusk', shape: 'cap', a: [2.5 * k, 0.4, 6.0], b: [2.9 * k, 3.0, 6.6], ra: 1.0, rb: 0.75 })),
      // torso: broad shoulders over a big belly
      { bone: 'chest', mat: 'skin', part: 'torso', shape: 'ell', c: [0, 1.4, -1.0], r: [12.4, 7.2, 6.8] },
      { bone: 'spine', mat: 'skin', part: 'belly', shape: 'ell', c: [0, 4.0, 1.4], r: [10.2, 8.0, 9.0] },
      { bone: 'hips', mat: 'belt', part: 'belt', shape: 'disc', c: [0, 1.2, 0.6], r: [9.6, 1.1, 8.6] },
      { bone: 'hips', mat: 'cloth', part: 'cloth', shape: 'ell', c: [0, -1.0, 0.2], r: [9.0, 3.6, 7.8] },
      { bone: 'hips', mat: 'cloth', part: 'cloth', shape: 'box', c: [0, -4.6, 6.4], h: [4.0, 4.2, 1.0], round: 0.8 },
      { bone: 'hips', mat: 'cloth', part: 'cloth', shape: 'box', c: [0, -4.4, -5.8], h: [4.6, 4.0, 1.0], round: 0.8 },
      ...SIDES.flatMap(([s]) => [
        { bone: 'upper' + s, mat: 'skin', part: 'arm' + s, shape: 'ell', c: [0, -0.6, 0], r: [4.0, 4.0, 4.0] },
        { bone: 'upper' + s, mat: 'skin', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -7.0, 0], ra: 3.4, rb: 2.9 },
        { bone: 'fore' + s, mat: 'skin', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -6.0, 0], ra: 2.9, rb: 3.2 },
        { bone: 'hand' + s, mat: 'skin', part: 'arm' + s, shape: 'ell', c: [0, -1.0, 0], r: [3.0, 3.2, 3.0] },
        { bone: 'thigh' + s, mat: 'skin', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -7.0, 0], ra: 3.8, rb: 3.2 },
        { bone: 'shin' + s, mat: 'skin', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -6.6, 0], ra: 3.2, rb: 2.8 },
        { bone: 'foot' + s, mat: 'skin', part: 'leg' + s, shape: 'ell', c: [0, -1.2, 1.4], r: [3.4, 2.4, 4.2], clip: [0, -1, 0, 3.0] },
      ]),
      // the club: a tapered log, a knot and two iron studs at the heavy end (part 'club': its own outline against the body)
      { bone: 'weapon', mat: 'club', part: 'club', shape: 'cap', a: [0, -2.4, 0], b: [0, 15.0, 0], ra: 1.5, rb: 3.4 },
      { bone: 'weapon', mat: 'club', part: 'club', shape: 'ell', c: [0, 15.2, 0], r: [3.4, 2.4, 3.4] },
      { bone: 'weapon', mat: 'club', part: 'club', shape: 'ell', c: [1.6, 8.4, 0.6], r: [1.4, 1.6, 1.4] },
      { bone: 'weapon', mat: 'iron', part: 'club', shape: 'ell', c: [-2.4, 12.6, 1.4], r: [1.1, 1.1, 1.1] },
      { bone: 'weapon', mat: 'iron', part: 'club', shape: 'ell', c: [1.2, 13.8, -2.6], r: [1.1, 1.1, 1.1] },
    ],
    stamps: [...SIDES.map(([, k]) => ({ bone: 'head', at: [2.2 * k, 5.4, 5.1], n: [0.35 * k, 0.1, 0.93], facing: 0.05, on: 'skin', px: [[0, 0, '#ff4a30'], [0, 1, '#ff4a30']] })),
      { bone: 'head', at: [0, 1.0, 6.7], n: [0, -0.1, 1], facing: 0.1, on: 'skin', px: [[-1, 0, '#2a1418'], [0, 0, '#2a1418'], [1, 0, '#2a1418']] }],
  },
];

// ---- anims ------------------------------------------------------------------------------------------------------------
const HANG = [-0.28, -1, 0.32];                                   // the club hangs from the right fist, head near the ground
const hold = a => f => ({ weapon: { aim: a === 'hit' ? [-0.5, -0.6, -0.6] : a === 'walk' ? [-0.3, -1, [0.45, 0.3, 0.1, 0.1, 0.3, 0.45][f]] : HANG } });
const attack = {
  frames: 6, ms: [300, 300, 75, 75, 300, 300],
  pose: f => [
    // 0 wind: the club swings up behind the right shoulder, the body twists back and sinks
    merge(arms([-0.55, 0.5, -0.65], [-0.3, 0.9, -0.3], [0.5, -0.6, 0.6], [0.3, -0.3, 0.9]), legs(0.15, 0.25, -0.3, -0.2, 0.25, 0.0),
      { hips: { off: [0, -1.2, -0.6] }, chest: { rot: [-0.18, -0.5, 0] }, weapon: { aim: [-0.5, 0.55, -0.68] } }),
    // 1 wind peak: overhead, rising on the toes, the left arm thrown forward
    merge(arms([-0.35, 0.92, -0.2], [-0.1, 0.95, -0.3], [0.45, -0.1, 0.9], [0.25, 0.1, 0.96]), legs(0.1, 0.1, -0.15, -0.25, 0.15, 0.1),
      { hips: { off: [0, 0.6, -1.0] }, chest: { rot: [-0.3, -0.35, 0] }, head: { rot: [-0.15, 0, 0] }, weapon: { aim: [-0.2, 0.55, -0.81] } }),
    // 2 strike: the chop comes over, club high in front
    merge(arms([-0.15, 0.35, 0.92], [0.05, 0.3, 0.95], [0.4, -0.7, 0.55], [0.3, -0.45, 0.85]), legs(0.35, 0.3, -0.4, -0.5, 0.3, 0.2),
      { hips: { off: [0, -2.4, 2.2] }, chest: { rot: [0.3, 0.2, 0] }, weapon: { aim: [0.4, 0.4, 0.82] } }),
    // 3 impact: club head on the ground in front, the body lunged over it
    merge(arms([-0.05, -0.45, 0.89], [0.15, -0.6, 0.78], [0.4, -0.85, 0.35], [0.3, -0.7, 0.6]), legs(0.45, 0.4, -0.5, -0.6, 0.35, 0.25),
      { hips: { off: [0, -3.6, 3.0] }, chest: { rot: [0.5, 0.25, 0] }, head: { rot: [-0.25, 0, 0] }, weapon: { aim: [0.45, -0.5, 0.74] } }),
    // 4 recover: the club drags, the ogre heaves up
    merge(arms([-0.2, -0.7, 0.68], [-0.1, -0.8, 0.55], [0.35, -0.9, 0.2], [0.25, -0.8, 0.45]), legs(0.35, 0.3, -0.4, -0.45, 0.3, 0.2),
      { hips: { off: [0, -2.6, 2.0] }, chest: { rot: [0.38, 0.3, 0] }, weapon: { aim: [0.3, -0.75, 0.59] } }),
    // 5 recover end: upright again, the club swung back to its hang
    merge(arms([-0.2, -0.95, 0.25], [-0.1, -0.85, 0.5], [0.2, -0.95, 0.1], [0.12, -0.9, 0.35]), legs(0.15, 0.15, -0.2, -0.2, 0.15, 0.1),
      { hips: { off: [0, -0.8, 0.8] }, chest: { rot: [0.12, 0.08, 0] }, weapon: { aim: [-0.3, -0.95, 0.15] } }),
  ][f],
};
// death: knocked back, topples, lies on its back (the corpse fades over it); the arms fall back along the body
const death = {
  frames: 3, ms: [180, 180, 400],
  pose: f => [
    merge(arms([-0.45, 0.2, -0.87], [-0.3, 0.5, -0.81]), legs(-0.3, 0.5, -0.1, 0.1, 0.6, -0.3),
      { hips: { off: [0, -2.4, -1.0] }, chest: { rot: [-0.45, 0.1, 0] }, head: { rot: [-0.35, 0, 0] }, weapon: { aim: [-0.3, 0.6, -0.74] } }),
    merge(arms([-0.45, 0.45, -0.77], [-0.2, 0.9, -0.39]), legs(-0.2, 1.0, -0.2, 0.2, 1.1, -0.2),
      { hips: { off: [0, -8.0, 1.0], rot: [-0.7, 0, 0] }, chest: { rot: [-0.3, 0, 0] }, head: { rot: [-0.2, 0, 0] }, weapon: { aim: [-0.3, -0.75, -0.59] } }),
    merge(arms([-0.7, -0.35, -0.62], [-0.6, -0.3, -0.74]), legs(-0.1, 0.5, -0.4, 0.15, 0.6, -0.4),
      { hips: { off: [0, -12.0, 6.0], rot: [-1.35, 0, 0] }, chest: { rot: [-0.15, 0, 0] }, head: { rot: [0.2, 0, 0] }, weapon: { aim: [0.3, -0.35, 0.89] } }),
  ][f],
};
const anims = {
  idle: scaled(H.idle, hold('idle')),
  walk: scaled(H.walk, hold('walk')),
  attack,
  hit: scaled(H.hit, hold('hit')),
  death,
};

module.exports = {
  name: 'ogre',
  frame: [80, 88], origin: [40, 72],
  cam: { elev: 28 },
  light: [-0.55, 0.7, 0.5],
  tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.0,
  pixel: { normalSteps: 0 },
  flatDepth: true, bankSheets: { die: ['hit', 'death'] },     // one layer: a part map for depth (forge.js flatDq); hit + death in their own sheet
  bones, layers, anims, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death'],
  sockets: {
    handR: { bone: 'handR', at: [0, -1.0, 0] }, tip: { bone: 'weapon', at: [0, 16.0, 0] },
    head: { bone: 'head', at: [0, 11.0, 0] }, chest: { bone: 'chest', at: [0, 1.0, 0] },
  },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
};
