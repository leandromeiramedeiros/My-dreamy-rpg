'use strict';
// MOSSJAW (`mossjaw`, the Root Hollow mini-boss: lunge-bite, root-spit, burrow, howl) — a forge boss beast on the shared
// quadruped rig (models/quadruped-anims.js: attack = the lunge, hit, death; more(): the boss-scale 4-frame idle and trot,
// burrow, howl). A huge moss-grown wolf at x1.9 the 1-unit body (the Shade Hound is x1.25): about 70 px long and 44 px tall
// on screen, ~1.5x the hero's height and 3x its bulk. Frame 108 x 88, origin (54, 70). Recognisable from the old sprite:
// grey-green fur, moss patches and mossy tufts along the spine, a moss beard, bark-brown ears, amber eyes, a long jaw with
// bone teeth. Every pixel from volumes (eyes are 2 px surface stamps). Units are pixels, y up, it faces +z; its RIGHT side is
// -x. Anims (render.js maps the boss move state): idle 4 / walk 4 (the bank cap: 160 KB a file), attack 6 (a move's wind
// f0-1, its strike f2-3, the open window f4-5: lunge, root-spit), burrow 2 (the burrow move's wind; then the dirt mound),
// howl 1 (the summon), hit 1, death 3 (the boss holds f0 under its death bursts). Sockets: head, chest (status), maw.
const Q = require('./quadruped-anims.js');
const SIDES = Q.SIDES;
const SC = 1.9, sv = v => v.map(x => x * SC);

const bones = Q.bones({
  hip: 10.5, len: 15, up: 1.2, wide: 2.8, drop: 1.5,
  neck: [2.4, 4.6], head: [2.8, 2.6], jaw: [-1.6, 1.6],
  front: [5.0, 4.2], back: [4.8, 4.9],
  tail: [2.6, -4.2, 3.0],
});
const FUR = { ramp: ['#18222a', '#2e3e40', '#4a6052', '#6e8a6c'] };
const MOSS = { ramp: ['#1c4a3a', '#2e7650', '#58a45c', '#9ad07a'] };
const tufts = [   // the mossy spine: [bone, root, tip, r]
  ['neck', [0, 2.6, 0.6], [0, 5.6, -1.2], 1.9], ['chest', [0, 4.4, 2.6], [0, 7.4, 0.6], 2.1], ['chest', [0, 4.8, -0.8], [0, 7.6, -3.4], 2.1],
  ['hips', [0, 4.0, 10.4], [0, 6.6, 7.8], 1.9], ['hips', [0, 4.2, 6.8], [0, 6.8, 4.2], 2.0], ['hips', [0, 3.8, 3.0], [0, 6.0, 0.4], 1.8],
];
const prims = [
  // head: a broad skull, a long snout, tall ears (bark), a moss cap; the jaw hangs from 'jaw' with a row of bone teeth
  { bone: 'head', mat: 'fur', part: 'head', shape: 'ell', c: [0, 0.4, 0], r: [3.6, 3.2, 3.5] },
  { bone: 'head', mat: 'fur', part: 'head', shape: 'cap', a: [0, -0.2, 1.4], b: [0, -0.6, 6.2], ra: 2.4, rb: 1.6 },
  { bone: 'head', mat: 'nose', part: 'head', shape: 'ell', c: [0, -0.4, 6.4], r: [0.9, 0.8, 0.6] },
  ...SIDES.map(([, k]) => ({ bone: 'head', mat: 'bark', part: 'ear', shape: 'cap', a: [1.9 * k, 2.4, -0.8], b: [2.8 * k, 6.2, -1.8], ra: 1.5, rb: 0.4 })),
  { bone: 'head', mat: 'moss', part: 'head', shape: 'ell', c: [0, 3.0, -0.6], r: [2.4, 1.2, 2.2] },
  { bone: 'head', mat: 'maw', part: 'head', shape: 'ell', c: [0, -1.5, 3.2], r: [1.3, 0.8, 2.4] },
  { bone: 'jaw', mat: 'fur', part: 'jaw', shape: 'cap', a: [0, 0, 0], b: [0, -0.3, 4.2], ra: 1.6, rb: 1.0 },
  ...SIDES.flatMap(([, k]) => [1.6, 3.0].map(z => ({ bone: 'jaw', mat: 'fang', part: 'jaw', shape: 'cap', a: [0.8 * k, 0.2, z + 0.6], b: [0.8 * k, 1.4, z + 0.6], ra: 0.5, rb: 0.3 }))),
  // the moss beard under the jaw and down the throat
  { bone: 'neck', mat: 'moss', part: 'beard', shape: 'cap', a: [0, -1.2, 2.2], b: [0, -4.2, 1.4], ra: 2.2, rb: 1.0 },
  // body: a deep chest, a lean waist, heavy haunches
  { bone: 'neck', mat: 'fur', part: 'body', shape: 'cap', a: [0, -1.6, -1.6], b: [0, 2.2, 1.8], ra: 3.9, rb: 3.1 },
  { bone: 'chest', mat: 'fur', part: 'body', shape: 'ell', c: [0, -0.2, 0.6], r: [5.2, 5.4, 5.8] },
  { bone: 'hips', mat: 'fur', part: 'body', shape: 'cap', a: [0, 0.4, 1.0], b: [0, 0.4, 12.0], ra: 3.7, rb: 4.7 },
  { bone: 'hips', mat: 'fur', part: 'body', shape: 'ell', c: [0, 0.6, -0.2], r: [4.6, 4.5, 4.6] },
  // moss patches on the back and the shoulder; the mossy spine tufts
  { bone: 'chest', mat: 'moss', part: 'body', shape: 'ell', c: [0, 4.0, 0.2], r: [3.6, 1.6, 4.2] },
  { bone: 'hips', mat: 'moss', part: 'body', shape: 'ell', c: [0, 4.0, 6.6], r: [3.0, 1.4, 4.0] },
  ...tufts.map(([b, a, e, r]) => ({ bone: b, mat: 'moss', part: 'tuft', shape: 'cap', a, b: e, ra: r, rb: 0.4 })),
  // legs
  ...SIDES.flatMap(([s]) => [
    { bone: 'legF' + s, mat: 'fur', part: 'legF' + s, shape: 'cap', a: [0, 1.0, -0.4], b: [0, -5.0, 0], ra: 2.7, rb: 1.7 },
    { bone: 'shinF' + s, mat: 'fur', part: 'legF' + s, shape: 'cap', a: [0, 0, 0], b: [0, -4.2, 0], ra: 1.6, rb: 1.4 },
    { bone: 'pawF' + s, mat: 'fur', part: 'legF' + s, shape: 'ell', c: [0, -0.3, 0.8], r: [1.7, 1.1, 2.1] },
    { bone: 'legB' + s, mat: 'fur', part: 'legB' + s, shape: 'cap', a: [0, 1.0, -0.6], b: [0, -4.8, 0], ra: 3.3, rb: 1.9 },
    { bone: 'shinB' + s, mat: 'fur', part: 'legB' + s, shape: 'cap', a: [0, 0, 0], b: [0, -4.9, 0], ra: 1.7, rb: 1.3 },
    { bone: 'pawB' + s, mat: 'fur', part: 'legB' + s, shape: 'cap', a: [0, 0, 0], b: [0, -1.3, 0.3], ra: 1.3, rb: 1.3 },
    { bone: 'pawB' + s, mat: 'fur', part: 'legB' + s, shape: 'ell', c: [0, -1.5, 1.0], r: [1.7, 1.1, 2.1] },
  ]),
  // tail: bushy, a moss-green tip
  { bone: 'tail1', mat: 'fur', part: 'tail', shape: 'cap', a: [0, 0, 0.6], b: [0, 0, -3.0], ra: 1.8, rb: 2.0 },
  { bone: 'tail2', mat: 'fur', part: 'tail', shape: 'cap', a: [0, 0, 0], b: [0, 0, -3.0], ra: 2.0, rb: 1.6 },
  { bone: 'tail3', mat: 'moss', part: 'tail', shape: 'cap', a: [0, 0, 0.2], b: [0, 0.4, -3.2], ra: 1.6, rb: 0.5 },
];
const layers = [{
  id: 'body', group: 'body', prims,
  mats: { fur: FUR, moss: MOSS, bark: { ramp: ['#2a1a20', '#4a3030', '#6e4c40', '#946e58'] }, nose: { ramp: ['#1e1d21', '#29252d', '#342e39', '#403746'] },
    maw: { ramp: ['#3a0e1c', '#6a1a2c', '#9a3040', '#c45056'] }, fang: { ramp: ['#8a7a80', '#c0b4b0', '#eae2d8', '#ffffff'], lift: 2 } },
  stamps: SIDES.map(([, k]) => ({ bone: 'head', at: [1.7 * k, 1.1, 2.4], n: [0.55 * k, 0.15, 0.82], facing: 0.05, on: 'fur', px: [[0, 0, '#ffc84a'], [k < 0 ? -1 : 1, 0, '#ffc84a']] })),
}];
const scalePrim = p => { const q = Object.assign({}, p); for (const k of ['c', 'r', 'a', 'b']) if (q[k]) q[k] = sv(q[k]); for (const k of ['ra', 'rb']) if (q[k] != null) q[k] *= SC; return q; };
for (const L of layers) { L.prims = L.prims.map(scalePrim); L.stamps = L.stamps.map(t => Object.assign({}, t, { at: sv(t.at) })); }
for (const b of bones) b.at = sv(b.at);
const sock = (bone, at) => ({ bone, at: sv(at) });
const A = Q.anims({ k: SC }), M = Q.more({ k: SC });

// A boss is two rigs (two bank files, each <= 160 KB and composed on its own): mossjaw (idle, walk, hit, death, howl) and
// mossjaw_moves (attack, burrow; models/mossjaw_moves.js); render.js FEN.split draws a move anim from the second sheet.
const PARTS = {
  base: { anims: { idle: M.idle4, walk: M.walk4, hit: A.hit, death: A.death, howl: M.howl }, sheets: { mv: ['walk'], die: ['hit', 'death', 'howl'] } },
  moves: { anims: { burrow: M.burrow, attack: A.attack, idle: { frames: 1, ms: [600], pose: () => M.idle4.pose(0) }, walk: { frames: 1, ms: [600], pose: () => M.idle4.pose(0) } }, sheets: {} },   // idle / walk 1 = the rest pose (one deduped cell): the moves rig's probe / fallback frame (forge-rt-check reads sockets on idle S 0)
};
function make(part) {
  const P = PARTS[part];
  return {
    name: part === 'base' ? 'mossjaw' : 'mossjaw_' + part,
    frame: [108, 88], origin: [54, 70],
    cam: { elev: 28 }, light: [-0.55, 0.7, 0.5], tones: [0.8, 0.3, -0.3],
    outline: '#0c0714', innerLine: 2.0, pixel: { normalSteps: 0 },
    flatDepth: true, bankSheets: P.sheets,
    bones, layers, anims: P.anims, sheetAnims: Object.keys(P.anims),
    sockets: { head: sock('head', [0, 4.2, 0]), chest: sock('chest', [0, 1.0, 0]), maw: sock('jaw', [0, 0, 3.4]) },
    dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
  };
}
module.exports = make('base');
Object.defineProperty(module.exports, 'make', { value: make, enumerable: false });