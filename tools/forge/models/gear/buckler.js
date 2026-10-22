'use strict';
// BUCKLER LINE — buckler.t1 .. buckler.t5 + buckler.t6 (Mythic) for the ref rig (offhand bone, the ref shield's pose). Smaller
// than the ref's round shield; each tier keeps the one below and adds:
//   T1 wood face, iron rim, iron boss   T2 steel face, riveted-look rim, steel boss   T3 gold rim, steel face, gold sun cross
//   T4 sapphire boss, feathered wings off the rim   T5 a disc of light: flat emissive face, ray crown   T6 Mythic: T5 + a floating
//   halo ring of shards in hue-cycling emissive.
// Hybrid: the volumes (back, rim, face, boss, wings, rays) give the silhouette and the depth; the face is a pixel part per
// facing, drawn by round() (S SE SW: the face, E W: edge-on, N NE NW: the strapped back; same split as the ref shield).
// Sockets: gem (the boss), offhandTip (rim top, a runtime flare point).
const C = require('./common.js');
const { PAL, EMIT, metal, gemOf, flat, piece, sockets, lintGrid, SCALE } = C;

const POSE = { rest: { aim: [-0.19, 1, 0], roll: [0.55, 0, 0.83] }, walk: { aim: [-0.07, 1, 0.05], roll: [0.6, 0, 0.8] } };
const N = [6, 6, 8, 8, 10, 10];                                      // face diameter in px per tier
// one drawing of a disc: paint({ dx, dy, d, r, lit }) -> char; '.' outside
function round(n, paint) {
  const c = (n - 1) / 2, rows = [];
  for (let y = 0; y < n; y++) { let s = ''; for (let x = 0; x < n; x++) { const dx = x - c, dy = y - c, d = Math.hypot(dx, dy); s += d > n / 2 - 0.05 ? '.' : paint({ dx, dy, d, r: n / 2, lit: dx + dy < -0.4, x, y, n }); } rows.push(s); }
  return rows;
}
// chars: R rim light, r rim, F face light, f face, d face dark, B boss light, b boss, G gem, S emblem light, s emblem, E emit, K back, k back strap
function facePaint(t) {
  return ({ dx, dy, d, r, lit }) => {
    if (d >= r - 1.05) return t === 5 || t === 6 ? 'E' : lit ? 'R' : 'r';
    const bossR = t === 1 ? 1.2 : t === 2 ? 1.3 : 1.6;
    if (d <= bossR) return t >= 4 ? 'G' : lit ? 'B' : 'b';
    if (t >= 3 && t <= 4 && (Math.abs(dx) <= 0.6 || Math.abs(dy) <= 0.6)) return lit ? 'S' : 's';       // the sun cross
    if (t >= 5) return lit ? 'F' : 'f';
    return d >= r - 2.05 && dx + dy > 0.6 ? 'd' : lit ? 'F' : 'f';
  };
}
const backPaint = ({ dy, d, r, lit }) => d >= r - 1.05 ? (lit ? 'R' : 'r') : Math.abs(dy) <= 0.6 ? 'k' : lit ? 'K' : 'K';
const edge = n => Array.from({ length: n }, (_, i) => i < n / 2 ? 'Rr' : 'rr');
function tier(t) {
  const n = N[t - 1], rr = n / 2 / SCALE, hi = t >= 5;
  const FACE = t === 1 ? { ramp: PAL.wood } : t === 2 ? metal(PAL.steel) : t <= 4 ? metal(PAL.polish) : flat(EMIT.sun, 2);
  const mats = {
    back: { ramp: t === 1 ? PAL.darkwood : PAL.leather }, rim: t === 1 ? metal(PAL.iron) : t === 2 ? metal(PAL.steel) : t <= 4 ? metal(PAL.gold) : metal(PAL.pearl),
    face: FACE, boss: t === 1 ? metal(PAL.iron) : t === 2 ? metal(PAL.steel) : metal(PAL.gold), gem: gemOf(PAL.sapphire), emit: flat(EMIT.sun, 2), emitDawn: flat(EMIT.dawn, 2),
    wing: metal(PAL.silver), sun: metal(PAL.gold), hueA: flat('#ff8a5a', 2), hueB: flat('#8ad0ff', 2), hueC: flat('#b8ff8a', 2),
  };
  const P = [
    { bone: 'offhand', mat: 'back', part: 'shield', shape: 'ell', c: [0, 0.2, 0.35], r: [rr - 0.1, rr - 0.1, 0.45] },
    { bone: 'offhand', mat: 'rim', part: 'shield', shape: 'ell', c: [0, 0.2, 0.7], r: [rr + 0.15, rr + 0.15, 0.35] },
    { bone: 'offhand', mat: 'face', part: 'shield', shape: 'ell', c: [0, 0.1, 1.0], r: [rr - 0.55, rr - 0.55, 0.45] },
    { bone: 'offhand', mat: t >= 4 ? 'gem' : 'boss', part: 'shield', shape: 'ell', c: [0, 0.1, 1.45], r: [0.85, 0.85, 0.4] },
  ];
  if (t >= 4) for (const k of [-1, 1]) {                                // feathered wings off the rim: three overlapping feathers a side
    for (let i = 0; i < (hi ? 2 : 3); i++) {
      const a = [k * (rr - 0.2), 0.8 - i * 0.9, 0.1], b = [k * (rr + 2.9 - i * 0.5), 2.0 - i * 1.3, -0.1];
      if (hi) P.push({ bone: 'offhand', mat: 'emitDawn', part: 'wing', shape: 'line', a, b, tone: 0, conn4: true });
      else P.push({ bone: 'offhand', mat: 'wing', part: 'wing', shape: 'cap', a, b, ra: 0.55, rb: 0.25 });
    }
  }
  if (t === 5) for (let i = 0; i < 4; i++) {                             // ray crown: 1 px emissive lines radiating from the rim
    const a = i * Math.PI / 2 + Math.PI / 4, s = Math.sin(a), c = Math.cos(a);
    P.push({ bone: 'offhand', mat: 'emit', part: 'ray', shape: 'line', a: [c * (rr + 0.5), 0.1 + s * (rr + 0.5), 0.6], b: [c * (rr + 2.2), 0.1 + s * (rr + 2.2), 0.6], tone: 0, conn4: true });
  }
  const FKEY = { R: ['rim', 3], r: ['rim', 1], F: ['face', 3], f: ['face', 2], d: ['face', 0], B: ['boss', 3], b: ['boss', 2], G: ['gem', 3], S: ['sun', 3], s: ['sun', 2], E: ['emit', 0] };
  const BKEY = { R: ['rim', 3], r: ['rim', 1], K: ['back', 2], k: ['back', 0] };
  const face = facePaint(t), ground = C.heal(round(n, face)), back = C.heal(round(n, backPaint)), ed = edge(n);
  const cell = [n >> 1, n >> 1];
  const FACE_D = { S: { at: cell, rows: ground }, SE: { at: cell, rows: ground }, SW: { at: cell, rows: ground }, E: { at: [1, n >> 1], rows: ed }, W: { at: [0, n >> 1], rows: ed }, NE: null, N: null, NW: null };
  const BACK_D = { S: null, SE: null, SW: null, E: null, W: null, NE: { at: cell, rows: back }, N: { at: cell, rows: back }, NW: { at: cell, rows: back } };
  const sprites = [
    { bone: 'offhand', at: [0, 0.1, 2.0], part: 'shield', key: FKEY, dirs: lintGrid(`buckler.t${t}.face`, FACE_D) },
    { bone: 'offhand', at: [0, 0.2, -0.3], part: 'shield', key: BKEY, dirs: lintGrid(`buckler.t${t}.back`, BACK_D) },
  ];
  if (t === 6) {                                                       // the Mythic halo: a hue ring of arcs behind the shield (a sprite: cheap and clean)
    const m = 16, ring = round(m, ({ dx, dy, d, r }) => d >= r - 1.6 ? 'ABC'[Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 6) % 3] : '.');
    const H = C.heal(ring), HKEY = { A: ['hueA', 0], B: ['hueB', 0], C: ['hueC', 0] }, hc = [m >> 1, m >> 1];
    sprites.push({ bone: 'offhand', at: [0, 0.1, -0.6], part: 'halo', key: HKEY, dirs: lintGrid('buckler.t6.halo', { S: { at: hc, rows: H }, SE: { at: hc, rows: H }, SW: { at: hc, rows: H }, NE: { at: hc, rows: H }, N: { at: hc, rows: H }, NW: { at: hc, rows: H }, E: null, W: null }) });
  }
  return piece('buckler', 'offhand', t, { mats, prims: P, sprites }, {
    sockets: sockets({ gem: { bone: 'offhand', at: [0, 0.1, 1.9] }, offhandTip: { bone: 'offhand', at: [0, rr + 0.4, 1.0] } }),
    pose: a => ({ offhand: a === 'walk' ? POSE.walk : POSE.rest }),
  });
}
const pieces = {}; for (let t = 1; t <= 6; t++) pieces[`buckler.t${t}`] = tier(t);
module.exports = { line: 'buckler', pieces, tiers: [1, 2, 3, 4, 5, 6].map(t => [`buckler.t${t}`]), POSE };
