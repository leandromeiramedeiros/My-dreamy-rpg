'use strict';
// THORNBACK BOAR (`thornbackboar`, Pinewood: the burrow + gore brute) — a forge beast on the shared quadruped rig and anims of
// models/quadruped-anims.js (idle, walk = the trot, attack = the gore lunge, hit, death, plus burrow / erupt from more()).
// Frame 72 x 60, origin (36, 47): a squat, heavy pig about 38 px long and 24 px tall on screen (hero 52 x 56, the Shade Hound
// 44 x 26). Recognisable from the old sprite: dark plum-brown bristles, a ridge of dark-green bramble thorns down the spine
// (light-green tips), a pale snout disc, curved bone tusks, small red eyes, short legs.
// Every pixel comes from the volumes below (eyes are 2 px surface stamps). Units are pixels, y up, it faces +z; its RIGHT side
// is -x. Attack (6 frames: wind f0-1, gore f2-3, rec f4-5 over the real timing, render.js). Burrow (2, the dig wind), erupt (2,
// the rec after it surfaces). Death (3). Sockets: chest + head (status layers), maw.
// make(o) builds the rig; o: { name, SC, frame, origin, fur, thorn, eye, crown, short } (models/thornsow.js: the Matriarch).
const Q = require('./quadruped-anims.js');
const SIDES = Q.SIDES;

function make(o = {}) {
  const SC = o.SC || 1.25, sv = v => v.map(x => x * SC);
  const bones = Q.bones({
    hip: 8, len: 13, up: 0.6, wide: 2.9, drop: 1.0,
    neck: [1.4, 3.4], head: [0.2, 3.0], jaw: [-1.8, 1.4],
    front: [3.6, 3.2], back: [3.6, 3.6],
    tail: [2.4, -4.4, 1.6],
  });
  const FUR = o.fur || { ramp: ['#25192b', '#3c2838', '#5a3c48', '#7c5660'] };
  const THORN = o.thorn || { ramp: ['#13302e', '#1f4e44', '#2f7454', '#6cb070'] };
  const mats = { fur: FUR, snout: { ramp: ['#5a3c48', '#8a6068', '#b08480', '#d0a898'] }, thorn: THORN,
    tusk: { ramp: ['#7a6a70', '#b8a8ac', '#e6dad6', '#ffffff'], lift: 1 }, hoof: { ramp: ['#211c23', '#2d242f', '#372d3b', '#423646'] } };
  const spikes = [   // the bramble ridge: [bone, root, tip, radius]
    ['neck', [0, 2.6, 0.0], [0, 5.4, -1.6], 1.5], ['chest', [0, 4.4, 1.6], [0, 7.6, -0.6], 1.7], ['chest', [0, 4.6, -1.6], [0, 7.8, -4.0], 1.7],
    ['hips', [0, 4.6, 9.6], [0, 7.4, 7.4], 1.6], ['hips', [0, 4.6, 6.4], [0, 7.6, 4.0], 1.7], ['hips', [0, 4.2, 3.0], [0, 6.8, 0.4], 1.6],
    ['hips', [0, 3.4, -0.2], [0, 5.4, -2.6], 1.3],
    ...SIDES.flatMap(([, k]) => [['chest', [2.6 * k, 3.4, 0.2], [4.4 * k, 6.0, -1.6], 1.2], ['hips', [2.6 * k, 3.2, 5.0], [4.4 * k, 5.6, 3.0], 1.2]]),
  ];
  const prims = [
    // head: a wedge skull, a long snout with a pale disc, ears laid back; the jaw carries the tusks (part 'jaw')
    { bone: 'head', mat: 'fur', part: 'head', shape: 'ell', c: [0, 0.4, 0.2], r: [3.3, 3.1, 3.4] },
    { bone: 'head', mat: 'fur', part: 'head', shape: 'cap', a: [0, -0.2, 1.6], b: [0, -1.0, 5.0], ra: 2.5, rb: 2.0 },
    { bone: 'head', mat: 'snout', part: 'head', shape: 'ell', c: [0, -1.0, 5.4], r: [1.8, 1.6, 0.9] },
    ...SIDES.map(([, k]) => ({ bone: 'head', mat: 'fur', part: 'head', shape: 'cap', a: [2.0 * k, 2.4, -1.0], b: [3.4 * k, 3.8, -3.0], ra: 1.2, rb: 0.45 })),
    { bone: 'jaw', mat: 'fur', part: 'jaw', shape: 'cap', a: [0, 0, 0], b: [0, -0.2, 3.2], ra: 1.6, rb: 1.3 },
    ...SIDES.flatMap(([, k]) => [
      { bone: 'jaw', mat: 'tusk', part: 'tusk', shape: 'cap', a: [1.5 * k, 0.4, 2.8], b: [2.6 * k, 2.2, 3.9], ra: 0.95, rb: 0.75 },
      { bone: 'jaw', mat: 'tusk', part: 'tusk', shape: 'cap', a: [2.6 * k, 2.2, 3.9], b: [2.3 * k, 4.0, 2.9], ra: 0.75, rb: 0.4 },
    ]),
    // body: a heavy shoulder hump, a barrel, a short neck
    { bone: 'neck', mat: 'fur', part: 'body', shape: 'cap', a: [0, -1.4, -1.6], b: [0, 0.8, 1.4], ra: 4.0, rb: 3.4 },
    { bone: 'chest', mat: 'fur', part: 'body', shape: 'ell', c: [0, 0.8, 0.2], r: [5.0, 5.4, 5.0] },
    { bone: 'hips', mat: 'fur', part: 'body', shape: 'cap', a: [0, 0.6, 1.6], b: [0, 0.8, 11.0], ra: 4.4, rb: 4.8 },
    { bone: 'hips', mat: 'fur', part: 'body', shape: 'ell', c: [0, 0.6, 0.2], r: [4.4, 4.6, 4.2] },
    // the bramble ridge (own part: a line against the bristles)
    ...spikes.map(([b, a, e, r]) => ({ bone: b, mat: 'thorn', part: 'thorn', shape: 'cap', a, b: a.map((v, i) => v + (e[i] - a[i]) * 1.45), ra: r * 0.9, rb: 0.3 })),
    // legs: short and stout, dark hooves
    ...SIDES.flatMap(([s]) => [
      { bone: 'legF' + s, mat: 'fur', part: 'legF' + s, shape: 'cap', a: [0, 1.2, -0.2], b: [0, -3.6, 0], ra: 2.6, rb: 1.8 },
      { bone: 'shinF' + s, mat: 'fur', part: 'legF' + s, shape: 'cap', a: [0, 0, 0], b: [0, -3.0, 0], ra: 1.6, rb: 1.4 },
      { bone: 'pawF' + s, mat: 'hoof', part: 'legF' + s, shape: 'ell', c: [0, -0.4, 0.5], r: [1.5, 1.1, 1.7] },
      { bone: 'legB' + s, mat: 'fur', part: 'legB' + s, shape: 'cap', a: [0, 1.2, -0.6], b: [0, -3.6, 0], ra: 3.2, rb: 2.0 },
      { bone: 'shinB' + s, mat: 'fur', part: 'legB' + s, shape: 'cap', a: [0, 0, 0], b: [0, -3.6, 0], ra: 1.7, rb: 1.4 },
      { bone: 'pawB' + s, mat: 'hoof', part: 'legB' + s, shape: 'ell', c: [0, -1.0, 0.6], r: [1.5, 1.1, 1.7] },
    ]),
    // tail: a short whip with a thorn tuft
    { bone: 'tail1', mat: 'fur', part: 'tail', shape: 'cap', a: [0, 0, 0.4], b: [0, 0, -1.6], ra: 0.9, rb: 0.7 },
    { bone: 'tail2', mat: 'fur', part: 'tail', shape: 'cap', a: [0, 0, 0], b: [0, 0, -1.6], ra: 0.7, rb: 0.6 },
    { bone: 'tail3', mat: 'thorn', part: 'tail', shape: 'ell', c: [0, 0, -0.6], r: [1.1, 1.1, 1.3] },
    ...(o.crown || []),
  ];
  const eye = o.eye || '#ff4a5a';
  const layers = [{
    id: 'body', group: 'body', mats: Object.assign(mats, o.mats || {}), prims,
    stamps: SIDES.map(([, k]) => ({ bone: 'head', at: [1.9 * k, 1.2, 2.2], n: [0.6 * k, 0.2, 0.78], facing: 0.05, on: 'fur', px: [[0, 0, eye], [k < 0 ? -1 : 1, 0, eye]] })),
  }];
  const scalePrim = p => { const q = Object.assign({}, p); for (const k of ['c', 'r', 'a', 'b']) if (q[k]) q[k] = sv(q[k]); for (const k of ['ra', 'rb']) if (q[k] != null) q[k] *= SC; return q; };
  for (const L of layers) { L.prims = L.prims.map(scalePrim); L.stamps = L.stamps.map(t => Object.assign({}, t, { at: sv(t.at) })); }
  for (const b of bones) b.at = sv(b.at);
  const sock = (bone, at) => ({ bone, at: sv(at) });
  const M = Q.more({ k: SC, stride: 0.85 }), A = Object.assign(Q.anims({ k: SC, stride: 0.85 }), { burrow: M.burrow, erupt: M.erupt }, o.short ? { idle: M.idle4, walk: M.walk4 } : {});   // short: 4-frame idle / walk (a bigger body under the bank cap)
  return {
    name: o.name || 'thornbackboar',
    frame: o.frame || [72, 60], origin: o.origin || [36, 47],
    cam: { elev: 28 },
    light: [-0.55, 0.7, 0.5],
    tones: [0.8, 0.3, -0.3],
    outline: '#0c0714', innerLine: 2.0,
    pixel: { normalSteps: 0 },
    flatDepth: true, bankSheets: { mv: ['walk'], die: ['hit', 'death'], dig: ['burrow', 'erupt'] },
    bones, layers, anims: A, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death', 'burrow', 'erupt'],
    sockets: { head: sock('head', [0, 4.0, 0]), chest: sock('chest', [0, 1.4, 0]), maw: sock('jaw', [0, 0, 3.0]) },
    dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
  };
}

module.exports = make();
Object.defineProperty(module.exports, 'make', { value: make, enumerable: false });
