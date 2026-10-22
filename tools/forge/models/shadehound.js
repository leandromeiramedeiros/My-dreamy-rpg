'use strict';
// SHADE HOUND (`shadehound`, Pinewood: the line lunge) — the first forge beast, on the shared quadruped rig and anim set of
// models/quadruped-anims.js (idle, walk = the run, attack = the lunge, hit, death). Frame 72 x 60, origin (36, 47): a stocky
// wolf about 44 px long and 26 px tall on screen (hero 52 x 56), modelled at 1 unit = 1 px and scaled x SC. Recognisable from the old sprite: a black-violet shadow dog,
// a violet spiked mane, glowing pink eyes, a wispy violet tail tip; the maw shows pink when the jaw opens.
// Every pixel comes from the volumes below (eyes are 2 px surface stamps). Units are pixels, y up, it faces +z; its RIGHT side
// is -x. Attack (6 frames, render.js maps the charge part's real timing: wind 0.6 s = f0-1, lunge 0.5 s = f2-3, rec 0.5 s =
// f4-5). Death (3 frames, the corpse fling): recoil -> buckle -> on its side. Sockets: chest + head (status layers), maw.
const Q = require('./quadruped-anims.js');
const SIDES = Q.SIDES;
// built at 1 px = 1 unit, then everything x SC (bones, volumes, stamps, sockets, the anims' offsets)
const SC = 1.25;
const sv = v => v.map(x => x * SC);

const bones = Q.bones({
  hip: 10, len: 15, up: 1, wide: 2.6, drop: 1.5,
  neck: [2.6, 5.0], head: [3.2, 2.4], jaw: [-1.5, 1.4],
  front: [5.0, 4.0], back: [4.8, 4.8],
  tail: [2.4, -4.2, 3.0],
});

const FUR = { ramp: ['#120c1c', '#191226', '#221832', '#2f2244'] };   // a shade: near-black violet, no lift; in Pinewood's light the old #4b3a6c top read lavender (tools/shots/m4a/hound-day-before.png)
const layers = [
  {
    id: 'body', group: 'body',
    mats: { fur: FUR, mane: { ramp: ['#1e1034', '#2c174c', '#40226a', '#5a308c'] },
      wisp: { ramp: ['#341a52', '#542a80', '#7c44b0', '#a86ad8'], lift: 1 },
      maw: { ramp: ['#4a0c2a', '#8c1c48', '#d0407a', '#ff86b4'], lift: 1 }, fang: { ramp: ['#8a8098', '#b8b0c4', '#e4def0', '#ffffff'], lift: 2 } },
    prims: [
      // head: a narrow skull, a long snout, tall pointed ears; the jaw hangs from 'jaw' (part 'jaw': it parts from the snout)
      { bone: 'head', mat: 'fur', part: 'head', shape: 'ell', c: [0, 0.4, 0], r: [3.4, 3.0, 3.3] },
      { bone: 'head', mat: 'fur', part: 'head', shape: 'cap', a: [0, -0.1, 1.4], b: [0, -0.5, 5.8], ra: 2.2, rb: 1.4 },
      ...SIDES.map(([, k]) => ({ bone: 'head', mat: 'fur', part: 'head', shape: 'cap', a: [1.8 * k, 2.2, -0.8], b: [2.6 * k, 5.8, -1.6], ra: 1.4, rb: 0.4 })),
      { bone: 'head', mat: 'maw', part: 'head', shape: 'ell', c: [0, -1.3, 3.0], r: [1.1, 0.7, 2.2] },
      { bone: 'jaw', mat: 'fur', part: 'jaw', shape: 'cap', a: [0, 0, 0], b: [0, -0.3, 3.8], ra: 1.4, rb: 0.9 },
      ...SIDES.map(([, k]) => ({ bone: 'jaw', mat: 'fang', part: 'jaw', shape: 'cap', a: [0.7 * k, 0.2, 3.4], b: [0.7 * k, 1.3, 3.4], ra: 0.45, rb: 0.3 })),
      // body: a deep chest, a tucked waist, lean haunches; the neck is a thick cap
      { bone: 'neck', mat: 'fur', part: 'body', shape: 'cap', a: [0, -1.6, -1.6], b: [0, 2.2, 1.8], ra: 3.6, rb: 2.8 },
      { bone: 'chest', mat: 'fur', part: 'body', shape: 'ell', c: [0, -0.2, 0.6], r: [4.8, 5.0, 5.4] },
      { bone: 'hips', mat: 'fur', part: 'body', shape: 'cap', a: [0, 0.4, 1.0], b: [0, 0.4, 12.0], ra: 3.5, rb: 4.4 },
      { bone: 'hips', mat: 'fur', part: 'body', shape: 'ell', c: [0, 0.6, -0.2], r: [4.3, 4.2, 4.3] },
      // the mane: a ridge of violet spikes from the nape down the back
      ...[[0, 'neck', [0, 1.8, 0.4], [0, 5.0, -1.4]], [1, 'chest', [0, 3.6, 2.6], [0, 6.8, 0.2]], [2, 'chest', [0, 3.8, -0.6], [0, 6.6, -3.6]],
        [3, 'hips', [0, 3.6, 10.0], [0, 6.0, 7.0]], [4, 'hips', [0, 3.4, 6.4], [0, 5.4, 3.6]], [5, 'hips', [0, 3.0, 2.6], [0, 4.6, -0.4]]]
        .map(([, b, a, e]) => ({ bone: b, mat: 'mane', part: 'mane', shape: 'cap', a, b: e, ra: 1.8, rb: 0.35 })),
      // legs: front upper / forearm / paw; hind thigh / hock / foot (hind legs rest digitigrade)
      ...SIDES.flatMap(([s]) => [
        { bone: 'legF' + s, mat: 'fur', part: 'legF' + s, shape: 'cap', a: [0, 1.0, -0.4], b: [0, -5.0, 0], ra: 2.5, rb: 1.6 },
        { bone: 'shinF' + s, mat: 'fur', part: 'legF' + s, shape: 'cap', a: [0, 0, 0], b: [0, -4.0, 0], ra: 1.5, rb: 1.3 },
        { bone: 'pawF' + s, mat: 'fur', part: 'legF' + s, shape: 'ell', c: [0, -0.3, 0.7], r: [1.5, 1.0, 1.9] },
        { bone: 'legB' + s, mat: 'fur', part: 'legB' + s, shape: 'cap', a: [0, 1.0, -0.6], b: [0, -4.8, 0], ra: 3.1, rb: 1.8 },
        { bone: 'shinB' + s, mat: 'fur', part: 'legB' + s, shape: 'cap', a: [0, 0, 0], b: [0, -4.8, 0], ra: 1.6, rb: 1.2 },
        { bone: 'pawB' + s, mat: 'fur', part: 'legB' + s, shape: 'cap', a: [0, 0, 0], b: [0, -1.3, 0.3], ra: 1.2, rb: 1.2 },
        { bone: 'pawB' + s, mat: 'fur', part: 'legB' + s, shape: 'ell', c: [0, -1.5, 0.9], r: [1.5, 1.0, 1.9] },
      ]),
      // tail: a bushy dark root, the tip a violet wisp
      { bone: 'tail1', mat: 'fur', part: 'tail', shape: 'cap', a: [0, 0, 0.6], b: [0, 0, -3.0], ra: 1.6, rb: 1.8 },
      { bone: 'tail2', mat: 'fur', part: 'tail', shape: 'cap', a: [0, 0, 0], b: [0, 0, -3.0], ra: 1.8, rb: 1.5 },
      { bone: 'tail3', mat: 'wisp', part: 'tail', shape: 'cap', a: [0, 0, 0.2], b: [0, 0.4, -3.4], ra: 1.5, rb: 0.4 },
    ],
    stamps: SIDES.map(([, k]) => ({ bone: 'head', at: [1.5 * k, 1.0, 2.3], n: [0.55 * k, 0.15, 0.82], facing: 0.05, on: 'fur', px: [[0, 0, '#ff5aa8'], [k < 0 ? -1 : 1, 0, '#ff5aa8']] })),
  },
];

// x SC: every length in the volumes, stamps, bones and sockets
const scalePrim = p => { const o = Object.assign({}, p); for (const k of ['c', 'r', 'a', 'b']) if (o[k]) o[k] = sv(o[k]); for (const k of ['ra', 'rb']) if (o[k] != null) o[k] *= SC; return o; };
for (const L of layers) { L.prims = L.prims.map(scalePrim); L.stamps = L.stamps.map(t => Object.assign({}, t, { at: sv(t.at) })); }
for (const b of bones) b.at = sv(b.at);
const sock = (bone, at) => ({ bone, at: sv(at) });

module.exports = {
  name: 'shadehound',
  frame: [72, 60], origin: [36, 47],
  cam: { elev: 28 },
  light: [-0.55, 0.7, 0.5],
  tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.0,
  pixel: { normalSteps: 0 },
  flatDepth: true, bankSheets: { die: ['hit', 'death'] },
  bones, layers, anims: Q.anims({ k: SC }), sheetAnims: Q.sheetAnims,
  sockets: {
    head: sock('head', [0, 4.0, 0]), chest: sock('chest', [0, 1.0, 0]), maw: sock('jaw', [0, 0, 3.0]),
  },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
};
