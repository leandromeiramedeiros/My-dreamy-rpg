'use strict';
// REF — the M4a hero rig, fitted to the SlyNyrd reference hero (Pixelblog 55 / 56 / 58; client ruling 8). Measured at 1x
// by tools/forge/ref-extract.py (numbers in tools/forge/ref/SPEC.json, git-ignored):
//   S front: 27 px tall (hair spike to sole), 16 px across the pauldrons; head 9 rows, torso 8, legs 9 (= 2.9 heads)
//   no outer outline: navy #1f2357 (the hair / pants dark) carries the edges and the seams between parts
//   15 colours, ramps of 2-4 tones: hair navy / blue / cyan glint, skin rust / tan, armour 4 lavenders, cloth 2 reds ...
// The base is body + hair + casual clothes; the reference's armour, boots, cape, shield and sword are pieces in ref-gear.js.
// Same bone names as models/chibi.js and hero.js, so models/humanoid-anims.js drives it and the gear files fit.
// Units are pixels, y up, the hero faces +z; the character's RIGHT side is -x (screen-left when facing the camera).
// SCALE: the reference is 27 px tall; the client ruled a 32 px body (docs/design/visual-bible.md), so every length here and
// in ref-gear.js is the measured one x 1.19; board.js scales the reference frames by the same factor (nearest neighbour).
const SCALE = 1.19;
const SIDES = [['R', -1], ['L', 1]];
const PARTS = require('./ref-parts.js'), FACE_BIAS = 2;
const H = require('./humanoid-anims.js'), { sheetAnims } = H;
// the sword smear: a screen-space crescent around the sword shoulder at the full reach (forge.js smearPoly)
// and the ref's own sword aims / chest twist per frame on top of the shared chop (fitted to the reference frames)
const ATK = {
  aim: [[-0.3, 0.62, -0.42], [-0.34, 0.2, 1.09], [0.35, -0.48, 0.96], [0.94, -0.41, 0.66], [0.65, -0.72, 0.2], [-0.48, 0.3, 0.75]],
  twist: [-0.33, 0.94, 0.06, 0.16, 0.33, 0.15],
};
// the run: hips drop (px), forward lean (rad) and extra knee bend (rad) on top of the shared walk cycle (fitted)
const WALK = { drop: 0, lean: 0.18, knee: 0.4 };
const run = H.anims.walk;
const chop = H.anims['attack:sword'];
const bend = (q, k) => q && Object.assign({}, q, { rot: [q.rot[0] + k, q.rot[1], q.rot[2]] });
const anims = Object.assign({}, H.anims, { walk: Object.assign({}, run, {
  pose: f => { const P = Object.assign({}, run.pose(f)), h = P.hips || {}, c = P.chest || {}, o = h.off || [0, 0, 0];
    P.hips = Object.assign({}, h, { off: [o[0], o[1] - WALK.drop * SCALE, o[2]] }); P.chest = Object.assign({}, c, { rot: [WALK.lean, (c.rot || [0, 0])[1], 0] });
    for (const sd of ['R', 'L']) { P['thigh' + sd] = bend(P['thigh' + sd], -WALK.knee); P['shin' + sd] = bend(P['shin' + sd], 2 * WALK.knee); P['foot' + sd] = bend(P['foot' + sd], -WALK.knee); }
    return P; } }), 'attack:sword': Object.assign({}, chop, {
  smear: { 1: 0.85, 2: 0.65, 3: 0.2, pivot: 'shoulderR', reach: 0.9, lead: 30, tail: 20 },   // px per frame ~ the reference's (S..SW mean 320 / 135 / 37)
  pose: f => { const P = Object.assign({}, chop.pose(f)), c = P.chest || {};
    P.weapon = Object.assign({}, P.weapon, { aim: ATK.aim[f] }); P.chest = Object.assign({}, c, { rot: [(c.rot || [0])[0], ATK.twist[f], 0] }); return P; } }) });
const s = v => Array.isArray(v) ? v.map(x => x * SCALE) : v * SCALE;

const bones = [
  { name: 'hips', at: s([0, 10.6, 0]) },
  { name: 'spine', parent: 'hips', at: [0, 0, 0] },
  { name: 'chest', parent: 'spine', at: s([0, 2.6, 0]) },
  { name: 'head', parent: 'chest', at: s([0, 5.6, 0.3]) },
  { name: 'cape', parent: 'chest', at: s([0, 4.1, -2.65]) },
  ...SIDES.flatMap(([sd, k]) => [
    { name: 'upper' + sd, parent: 'chest', at: s([5.3 * k, 4.4, 0]) },
    { name: 'fore' + sd, parent: 'upper' + sd, at: s([0, -3.1, 0]) },
    { name: 'hand' + sd, parent: 'fore' + sd, at: s([0, -2.7, 0]) },
    { name: 'thigh' + sd, parent: 'hips', at: s([2.4 * k, -0.4, 0]) },
    { name: 'shin' + sd, parent: 'thigh' + sd, at: s([0.5 * k, -4.0, 0]) },
    { name: 'foot' + sd, parent: 'shin' + sd, at: s([0.6 * k, -4.6, 0]) },
  ]),
  { name: 'weapon', parent: 'handR', at: s([0, -0.5, 0]) },
  { name: 'offhand', parent: 'handL', at: s([0, -0.4, 0]) },
];

// ---- palette: the reference's exact colours (ramps are [shadow, low, mid, high]; repeats = fewer tones) -----------------
const NAVY = '#1f2357', BLUE = '#104097', CYAN = '#217aa6';
const MATS = {   // the base wears casual clothes only (client ruling): cream shirt, blue trousers, brown shoes; all gear is in ref-gear.js
  skin: { ramp: ['#a64e21', '#a64e21', '#ba8a38', '#ba8a38'], tones: [0.95, 0.35, -0.1], lift: 1 },
  shirt: { ramp: ['#cc7c52', '#cc7c52', '#e5e0ac', '#e5e0ac'], tones: [0.95, 0.3, -2] },
  pants: { ramp: [NAVY, BLUE, BLUE, BLUE], tones: [0.95, 0.5, -0.15] },
  shoes: { ramp: ['#592104', '#592104', '#a64e21', '#a64e21'], tones: [0.95, 0.15, -0.5] },
};
const HAIR = { ramp: [NAVY, NAVY, BLUE, CYAN], tones: [1.03, 1.01, -2] }   // fitted: the reference hair reads as one navy mass at 32 px;
const P = (bone, mat, part, shape, o) => Object.assign({ bone, mat, part, shape }, o);

const layers = [
  {
    id: 'body', group: 'body', mats: MATS,
    prims: [
      P('chest', 'shirt', 'torso', 'ell', { c: s([0, 2.2, 0.2]), r: s([3.4, 3.1, 2.6]) }),
      P('hips', 'pants', 'torso', 'ell', { c: s([0, -0.3, 0]), r: s([3.1, 1.9, 2.3]) }),
      ...SIDES.flatMap(([sd, k]) => [
        P('upper' + sd, 'shirt', 'arm' + sd, 'cap', { a: [0, 0, 0], b: s([0, -3.1, 0]), ra: s(1.2), rb: s(1.1) }),
        P('fore' + sd, 'skin', 'arm' + sd, 'cap', { a: [0, 0, 0], b: s([0, -2.0, 0]), ra: s(0.95), rb: s(0.9) }),
        P('thigh' + sd, 'pants', 'leg' + sd, 'cap', { a: [0, 0, 0], b: s([0.5 * k, -4.0, 0]), ra: s(1.45), rb: s(1.3) }),
        P('shin' + sd, 'pants', 'leg' + sd, 'cap', { a: [0, 0, 0], b: s([0.5 * k, -3.6, 0]), ra: s(1.25), rb: s(1.15) }),
        P('shin' + sd, 'shoes', 'leg' + sd, 'cap', { a: s([0.5 * k, -3.6, 0]), b: s([0.6 * k, -4.6, 0]), ra: s(1.15), rb: s(1.15) }),
        P('foot' + sd, 'shoes', 'foot' + sd, 'ell', { c: s([0, -0.3, 0.4]), r: s([1.3, 1.3, 1.7]), clip: [0, -1, 0, s(1.2)] }),
      ]),
    ],
    // the face: a hand-authored pixel part per facing (models/ref-parts.js), pinned at the chin, a little in front of the
    // neck so the collar of a breastplate does not cut it
    // hands and the shirt's front are pixel parts too (the legs stay volumes: they swing through every walk frame)
    sprites: [
      { bone: 'chest', at: s([0, 2.2, 2.9]), part: 'torso', key: { d: ['shirt', 0], a: ['shirt', 0], A: ['shirt', 2], L: ['shirt', 3], N: ['pants', 0] }, dirs: PARTS.SHIRT },
      { bone: 'head', at: s([0, 1.0, 2.5]), part: 'head', bias: FACE_BIAS, key: { o: ['skin', 2], s: ['skin', 0], e: NAVY }, dirs: PARTS.HEAD },
      ...SIDES.map(([sd]) => ({ bone: 'hand' + sd, at: s([0, -0.7, 0]), part: 'arm' + sd, key: { o: ['skin', 2], s: ['skin', 0] }, dirs: PARTS.HAND })),
    ],
  },
  // hair: the same drawing's navy / blue / cyan characters, drawn over the face (a helm hides the whole layer)
  { id: 'hair', tag: 'hair', group: 'hair', mats: { hair: HAIR }, prims: [],
    sprites: [{ bone: 'head', at: s([0, 1.0, 2.5]), part: 'hair', bias: FACE_BIAS, key: { N: ['hair', 0], b: ['hair', 2], c: ['hair', 3] }, dirs: PARTS.HEAD }] },
];

module.exports = {
  name: 'ref', SCALE, ATK, WALK,
  frame: [48, 48], origin: [24, 40],
  cam: { elev: 28 },
  light: [-0.55, 0.7, 0.45],
  tones: [0.8, 0.3, -0.3],
  outline: null, innerLine: 1.6, innerColor: NAVY,
  pixel: { normalSteps: 8, minCluster: 2 },
  bones, layers, anims, sheetAnims,
  sockets: {
    handR: { bone: 'handR', at: s([0, -0.5, 0]) }, shoulderR: { bone: 'upperR', at: [0, 0, 0] }, handL: { bone: 'handL', at: s([0, -0.5, 0]) },
    head: { bone: 'head', at: s([0, 9.5, 0]) }, chest: { bone: 'chest', at: s([0, 2.4, 2.6]) }, cast: { bone: 'chest', at: s([0, 1.5, 7.5]) },
  },
  // yaw per direction fitted to the reference (its S / N are turned a little, as a hand-drawn front view often is)
  dirs: [['S', 10], ['SE', 55], ['E', 90], ['NE', 135], ['N', 185], ['NW', 235], ['W', 265], ['SW', 320]],
};
