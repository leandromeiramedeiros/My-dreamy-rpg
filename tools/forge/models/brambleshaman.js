'use strict';
// BRAMBLE SHAMAN (`brambleshaman`, Pinewood: poison zones and heals) — a forge enemy on the shared humanoid rig
// (models/humanoid-anims.js idle / walk / hit), thin, in a long hooded robe, with its own cast, heal channel and death.
// Frame 68 x 72, origin (34, 57): a common caster at the hero's scale (SC 1), 38 px tall with the antlers (hero about 31,
// the Ogre about 45-50). Recognisable from the old sprite: a purple hooded
// robe, a shadowed face with yellow eyes, pale antlers out of the hood, a leafy green mantle, a wooden staff with a green
// crystal; bramble details: a thorned vine belt and a vine band round the hem with leaves.
// Attack = the zone-caster's cast (6 frames; render.js maps the real timing: wind 0.8 s = f0-1, then no action state, so the
// rec 0.6 s plays f2-5): staff lifted in both hands -> raised high -> driven down and forward (the zones land) -> held ->
// recover. Heal (the healer's 4 s link, 1 frame, held): arms up, staff planted. Death: stagger -> kneel -> face down.
// Units are pixels, y up, it faces +z; its RIGHT side is -x. Sockets: chest + head (status layers), handR, tip (the crystal).
const SIDES = [['R', -1], ['L', 1]];
const H = require('./humanoid-anims.js').anims;
const mir = d => [-d[0], d[1], d[2]];
const merge = (...o) => { const out = {}; for (const p of o) for (const k in p) out[k] = Object.assign({}, out[k] || {}, p[k]); return out; };
const arm = (s, up, fore) => ({ ['upper' + s]: { point: up }, ['fore' + s]: { point: fore } });
const arms = (up, fore, upL, foreL) => Object.assign(arm('R', up, fore), arm('L', upL || mir(up), foreL || mir(fore)));
const legs = (tR, sR, fR, tL, sL, fL) => ({ thighR: { rot: [tR, 0, 0] }, shinR: { rot: [sR, 0, 0] }, footR: { rot: [fR, 0, 0] },
  thighL: { rot: [tL, 0, 0] }, shinL: { rot: [sL, 0, 0] }, footL: { rot: [fL, 0, 0] } });
const K = 1.0;
const scaled = (A, hold) => Object.assign({}, A, { pose: f => {
  const P = A.pose(f), out = {};
  for (const b in P) { out[b] = Object.assign({}, P[b]); if (P[b].off) out[b].off = P[b].off.map(v => v * K); }
  return merge(out, hold(f));
} });

const bones = [
  { name: 'hips', at: [0, 12.5, 0] },
  { name: 'spine', parent: 'hips', at: [0, 0, 0] },
  { name: 'chest', parent: 'spine', at: [0, 6.0, 0] },
  { name: 'head', parent: 'chest', at: [0, 6.2, 0.6] },
  ...SIDES.flatMap(([s, k]) => [
    { name: 'upper' + s, parent: 'chest', at: [4.4 * k, 3.6, 0] },
    { name: 'fore' + s, parent: 'upper' + s, at: [0, -4.4, 0] },
    { name: 'hand' + s, parent: 'fore' + s, at: [0, -4.2, 0] },
    { name: 'thigh' + s, parent: 'hips', at: [2.4 * k, -0.6, 0] },
    { name: 'shin' + s, parent: 'thigh' + s, at: [0, -5.6, 0] },
    { name: 'foot' + s, parent: 'shin' + s, at: [0, -5.2, 0] },
  ]),
  { name: 'weapon', parent: 'handR', at: [0, -0.8, 0] },
];

const ROBE = ['#2e1e44', '#4c3068', '#6c4692', '#9068b6'];
const LEAF = ['#1e4c3a', '#2e7848', '#4ea458', '#92cc76'];
const ring = (n, f) => Array.from({ length: n }, (_, i) => f(2 * Math.PI * i / n, i));
const layers = [
  {
    id: 'body', group: 'body',
    mats: { robe: ROBE, face: { ramp: ['#2a2036', '#342840', '#3e304c', '#4a3a58'] }, antler: { ramp: ['#6e6456', '#9a8e7a', '#c8bea6', '#eee6d0'], lift: 1 },
      leaf: LEAF, vine: ['#2a3420', '#3e4c2a', '#5a6a3c', '#7c8a52'], bark: ['#2e2c26', '#46422e', '#625c40', '#827a56'], wood: ['#36220f', '#5a3a1e', '#86592e', '#b48650'],
      gem: { ramp: ['#2a7a3a', '#4ec05a', '#9af07a', '#e2ffc4'], lift: 1, spec: 0.9 } },
    prims: [
      // head: a shadowed face inside a hood (cut open at the front), antlers out of the hood (one part: no seams inside it)
      { bone: 'head', mat: 'face', part: 'face', shape: 'ell', c: [0, 2.9, 1.0], r: [3.0, 3.2, 3.0] },
      { bone: 'head', mat: 'robe', part: 'robe', shape: 'ell', c: [0, 3.4, -0.5], r: [4.3, 4.7, 4.4], clip: [0, 0, 1, 1.5] },
      { bone: 'head', mat: 'robe', part: 'robe', shape: 'cap', a: [0, 6.0, -2.0], b: [0, 7.6, -4.6], ra: 2.0, rb: 0.9 },
      ...SIDES.flatMap(([, k]) => [
        { bone: 'head', mat: 'antler', part: 'antler', shape: 'cap', a: [2.2 * k, 6.2, -0.6], b: [4.6 * k, 9.6, -1.0], ra: 0.95, rb: 0.8 },
        { bone: 'head', mat: 'antler', part: 'antler', shape: 'cap', a: [4.6 * k, 9.6, -1.0], b: [5.4 * k, 13.4, -1.4], ra: 0.8, rb: 0.65 },
        { bone: 'head', mat: 'antler', part: 'antler', shape: 'cap', a: [3.6 * k, 8.2, -0.8], b: [2.8 * k, 11.2, -0.2], ra: 0.75, rb: 0.6 },
        { bone: 'head', mat: 'antler', part: 'antler', shape: 'cap', a: [4.9 * k, 11.0, -1.1], b: [7.0 * k, 12.4, -1.4], ra: 0.75, rb: 0.6 },
      ]),
      // robe: chest, then a bell from the waist to the ground; a leafy mantle on the shoulders, a thorned vine belt and hem band
      { bone: 'chest', mat: 'robe', part: 'robe', shape: 'ell', c: [0, 1.6, 0], r: [4.6, 5.0, 3.6] },
      { bone: 'hips', mat: 'robe', part: 'robe', shape: 'cap', a: [0, 2.0, -0.2], b: [0, -9.6, -0.4], ra: 4.0, rb: 6.6, clip: [0, -1, 0, 12.2] },
      ...ring(7, (a, i) => ({ bone: 'chest', mat: 'leaf', part: 'robe', shape: 'ell', c: [4.3 * Math.cos(a), 3.4 + (i % 2) * 0.5, 3.4 * Math.sin(a)], r: [2.3, 1.2, 1.7], rot: [0.3 * Math.sin(a), -a, 0.35 * Math.cos(a)] })),
      { bone: 'hips', mat: 'vine', part: 'robe', shape: 'disc', c: [0, 0.8, -0.1], r: [5.3, 0.7, 4.5] },
      { bone: 'hips', mat: 'vine', part: 'robe', shape: 'disc', c: [0, -9.6, -0.4], r: [6.9, 0.7, 6.9] },
      ...ring(5, a => ({ bone: 'hips', mat: 'vine', part: 'robe', shape: 'cap', a: [5.0 * Math.cos(a), 0.8, 4.3 * Math.sin(a)], b: [6.4 * Math.cos(a), 1.6, 5.6 * Math.sin(a)], ra: 0.75, rb: 0.5 })),
      ...ring(4, a => ({ bone: 'hips', mat: 'leaf', part: 'robe', shape: 'ell', c: [6.9 * Math.cos(a + 0.6), -9.2, -0.4 + 6.9 * Math.sin(a + 0.6)], r: [1.6, 1.0, 1.3], rot: [0, -a, 0.4] })),
      ...SIDES.flatMap(([s]) => [
        { bone: 'upper' + s, mat: 'robe', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -4.4, 0], ra: 1.6, rb: 1.5 },
        { bone: 'fore' + s, mat: 'robe', part: 'arm' + s, shape: 'cap', a: [0, 0, 0], b: [0, -3.4, 0], ra: 1.5, rb: 2.0 },
        { bone: 'hand' + s, mat: 'bark', part: 'arm' + s, shape: 'ell', c: [0, -0.8, 0], r: [1.3, 1.4, 1.3] },
        { bone: 'thigh' + s, mat: 'robe', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -5.6, 0], ra: 1.5, rb: 1.3 },
        { bone: 'shin' + s, mat: 'bark', part: 'leg' + s, shape: 'cap', a: [0, 0, 0], b: [0, -5.2, 0], ra: 1.2, rb: 1.1 },
        { bone: 'foot' + s, mat: 'bark', part: 'leg' + s, shape: 'ell', c: [0, -0.6, 0.8], r: [1.5, 1.4, 2.2], clip: [0, -1, 0, 1.6] },
      ]),
      // the staff: a gnarled shaft, a forked head cradling a green crystal (own part: a line against the robe)
      { bone: 'weapon', mat: 'wood', part: 'staff', shape: 'cap', a: [0, -12.0, 0], b: [0, 14.0, 0], ra: 0.85, rb: 0.95 },
      { bone: 'weapon', mat: 'wood', part: 'staff', shape: 'ell', c: [0, 14.2, 0], r: [1.4, 1.1, 1.4] },
      ...SIDES.map(([, k]) => ({ bone: 'weapon', mat: 'wood', part: 'staff', shape: 'cap', a: [0.5 * k, 14.4, 0], b: [1.9 * k, 17.6, 0.2], ra: 0.85, rb: 0.6 })),
      { bone: 'weapon', mat: 'gem', part: 'gem', shape: 'ell', c: [0, 16.6, 0], r: [1.5, 1.9, 1.5] },
    ],
    stamps: SIDES.map(([, k]) => ({ bone: 'head', at: [1.25 * k, 3.1, 3.8], n: [0.3 * k, 0, 0.95], facing: 0.05, on: 'face', px: [[0, 0, '#ffd84a'], [0, 1, '#ffd84a']] })),
  },
];

// ---- anims ------------------------------------------------------------------------------------------------------------
const STAND = [-0.12, 1, 0.12];                                    // the staff stands upright at its right side, foot on the ground
const hold = a => f => ({ weapon: { aim: a === 'hit' ? [-0.2, 1, -0.4] : a === 'walk' ? [-0.12, 1, [0.3, 0.2, 0.05, 0.05, 0.2, 0.3][f]] : STAND } });
const attack = {
  frames: 6, ms: [400, 400, 150, 150, 150, 150],
  pose: f => [
    // 0 wind: both hands lift the staff before the chest
    merge(arms([-0.35, -0.3, 0.89], [0.2, 0.85, 0.5], [0.4, -0.35, 0.85], [-0.2, 0.75, 0.6]), legs(0.1, 0.15, -0.2, -0.1, 0.15, 0),
      { chest: { rot: [-0.1, -0.15, 0] }, weapon: { aim: [0.1, 1, 0.15] } }),
    // 1 wind peak: raised high, the crystal over the hood
    merge(arms([-0.45, 0.85, 0.25], [-0.1, 0.95, 0.1], [0.4, 0.8, 0.45], [0.1, 0.95, 0.2]), legs(0.05, 0.1, -0.1, -0.1, 0.1, 0),
      { hips: { off: [0, 0.8, 0] }, chest: { rot: [-0.22, 0, 0] }, head: { rot: [-0.25, 0, 0] }, weapon: { aim: [0.05, 1, -0.05] } }),
    // 2 cast: driven down and forward, the crystal points at the target
    merge(arms([-0.3, 0.05, 0.95], [-0.05, -0.1, 1], [0.35, 0.0, 0.94], [0.1, -0.05, 1]), legs(0.3, 0.25, -0.35, -0.35, 0.25, 0.15),
      { hips: { off: [0, -1.2, 0.8] }, chest: { rot: [0.25, 0, 0] }, weapon: { aim: [0, 0.3, 0.95] } }),
    // 3 hold
    merge(arms([-0.3, 0.0, 0.95], [-0.05, -0.15, 0.99], [0.35, -0.05, 0.94], [0.1, -0.1, 0.99]), legs(0.3, 0.25, -0.35, -0.35, 0.25, 0.15),
      { hips: { off: [0, -1.2, 0.8] }, chest: { rot: [0.22, 0, 0] }, weapon: { aim: [0, 0.38, 0.92] } }),
    // 4 recover: the staff comes back up
    merge(arms([-0.25, -0.55, 0.8], [-0.1, 0.5, 0.86], [0.3, -0.7, 0.65], [0.1, -0.5, 0.86]), legs(0.15, 0.15, -0.2, -0.15, 0.15, 0.05),
      { hips: { off: [0, -0.5, 0.3] }, chest: { rot: [0.1, 0, 0] }, weapon: { aim: [-0.05, 1, 0.45] } }),
    // 5 recover end
    merge(arms([-0.17, -1, 0.1], [-0.07, -1, 0.3]), { weapon: { aim: STAND } }),
  ][f],
};
// heal (the healer's long link, held): both arms up and out, the staff planted in the right hand
const heal = {
  frames: 1, ms: [800],
  pose: () => merge(arms([-0.55, 0.3, 0.78], [-0.2, 0.9, 0.38], [0.6, 0.6, 0.53], [0.25, 0.95, 0.2]), legs(0.05, 0.1, -0.1, -0.05, 0.1, 0),
    { chest: { rot: [-0.15, 0, 0] }, head: { rot: [-0.2, 0, 0] }, weapon: { aim: [-0.25, 1, 0.3] } }),
};
// death: staggers back, sinks to its knees, falls on its face (the staff drops)
const death = {
  frames: 3, ms: [180, 180, 400],
  pose: f => [
    merge(arms([-0.5, -0.4, -0.76], [-0.3, -0.2, -0.93]), legs(-0.2, 0.4, -0.1, 0.1, 0.5, -0.3),
      { hips: { off: [0, -1.2, -0.6] }, chest: { rot: [-0.35, 0.1, 0] }, head: { rot: [-0.3, 0, 0] }, weapon: { aim: [-0.4, 0.8, -0.45] } }),
    merge(arms([-0.3, -0.85, 0.42], [-0.1, -0.9, 0.4]), legs(-1.2, 2.0, -0.4, -1.2, 2.0, -0.4),
      { hips: { off: [0, -6.0, -1.2] }, chest: { rot: [0.45, 0, 0] }, head: { rot: [0.3, 0, 0] }, weapon: { aim: [-0.7, 0.2, 0.68] } }),
    merge(arms([-0.4, -0.3, 0.87], [-0.2, -0.2, 0.96]), legs(-0.3, 0.3, -0.2, -0.25, 0.4, -0.2),
      { hips: { off: [0, -8.0, -5.0], rot: [1.05, 0, 0] }, chest: { rot: [0.3, 0, 0] }, head: { rot: [0.2, 0, 0] }, weapon: { aim: [-0.7, -0.3, -0.65] } }),
  ][f],
};
// ---- the whole body x SC (the volumes above are written at the hero's scale; SC 1 = as written, the director's 38-40 px) ----------------------------------------------
const SC = 1.0, sv = v => v.map(x => x * SC);
for (const b of bones) b.at = sv(b.at);
for (const L of layers) {
  for (const p of L.prims) {
    for (const k of ['c', 'r', 'a', 'b', 'h']) if (p[k]) p[k] = sv(p[k]);
    for (const k of ['ra', 'rb', 'round']) if (p[k] != null) p[k] *= SC;
    if (p.clip) p.clip = Array.isArray(p.clip[0]) ? p.clip.map(c => [c[0], c[1], c[2], c[3] * SC]) : [p.clip[0], p.clip[1], p.clip[2], p.clip[3] * SC];
  }
  for (const st of L.stamps || []) st.at = sv(st.at);
}
const offs = A => Object.assign({}, A, { pose: f => { const P = A.pose(f), out = {}; for (const b in P) { out[b] = Object.assign({}, P[b]); if (P[b].off) out[b].off = sv(P[b].off); } return out; } });
const anims = { idle: scaled(H.idle, hold('idle')), walk: scaled(H.walk, hold('walk')), attack: offs(attack), hit: scaled(H.hit, hold('hit')), heal: offs(heal), death: offs(death) };
const sockets = {
  handR: { bone: 'handR', at: [0, -0.8, 0] }, tip: { bone: 'weapon', at: [0, 16.6, 0] },
  head: { bone: 'head', at: [0, 9.0, 0] }, chest: { bone: 'chest', at: [0, 1.4, 0] },
};
for (const k in sockets) sockets[k].at = sv(sockets[k].at);

module.exports = {
  name: 'brambleshaman',
  frame: [68, 72], origin: [34, 57],
  cam: { elev: 28 },
  light: [-0.55, 0.7, 0.5],
  tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.0,
  pixel: { normalSteps: 0 },
  flatDepth: true, bankSheets: { die: ['hit', 'death', 'heal'] },   // one layer: a part map for depth (forge.js flatDq); hit, death, heal in their own sheet
  bones, layers, anims, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death', 'heal'],
  sockets,
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
};
