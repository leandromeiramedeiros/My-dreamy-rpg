'use strict';
// GLOOM SLIME (`gloomslime`, Pinewood: the hopping splat brute that splits) — a forge amorphous body: 1 direction (the
// bible: amorphous and swarm creatures have no facing), every pixel from volumes on a two-bone rig (base > body; the body
// squashes and stretches with `scl`, so a hop and a splat are pure poses). Frame 48 x 40, origin (24, 34): a dome about 20 px
// wide and 15 px tall (hero 52 x 56, ~31 px). Recognisable from the old sprite: a violet gloom blob, a paler crown, two pale
// eyes and a dark mouth, drips round the foot.
// Anims (1 dir): idle 6 (breathing squash), walk 6 (the hop: squash -> stretch -> air -> fall -> land -> settle, the hop
// height baked in), attack 6 (render.js: wind f0-1 = it rears up, the splat f2-3 = flattened with a ring of droplets, rec
// f4-5), hit 1, death 3 (it melts flat). Sockets: head, chest (status layers).
// make(o): o = { name, SC, frame, origin } (models/gloomslime_small.js: the split child at x0.7).
function make(o = {}) {
  const SC = o.SC || 1, sv = v => v.map(x => x * SC);
  const bones = [{ name: 'base', at: [0, 0, 0] }, { name: 'body', parent: 'base', at: [0, 0, 0] }];
  const GOO = { ramp: ['#201546', '#30226c', '#4c3ca4', '#7262d2'] };
  const prims = [
    { bone: 'body', mat: 'goo', part: 'body', shape: 'ell', c: [0, 4.6, 0], r: [9.8, 7.2, 8.6], clip: [0, -1, 0, 0] },
    { bone: 'body', mat: 'goo', part: 'body', shape: 'ell', c: [0, 9.6, -0.4], r: [6.6, 5.0, 6.0] },
    { bone: 'body', mat: 'crown', part: 'body', shape: 'ell', c: [-1.4, 11.6, 1.2], r: [2.6, 1.3, 2.2], rot: [0.3, 0, 0.25] },
    // drips and lumps round the foot
    ...[[0.4, 1.7], [1.6, 1.4], [2.7, 1.6], [3.9, 1.3], [5.0, 1.5]].map(([a, r]) => ({ bone: 'body', mat: 'goo', part: 'body', shape: 'ell', c: [9.0 * Math.cos(a), 0.9, 8.0 * Math.sin(a)], r: [r, 1.0, r], clip: [0, -1, 0, 0] })),
    // the splat: droplets flung out on the slam frames (attack f2-3)
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4 + 0.3; return { bone: 'base', mat: 'goo', part: 'drop', shape: 'ell', c: [14 * Math.cos(a), 1.2 + (i % 2) * 1.6, 12 * Math.sin(a)], r: [1.4, 1.2, 1.4],
      when: (an, f) => an === 'attack' && (f === 2 || f === 3) }; }),
  ];
  const stamps = [
    ...[-1, 1].map(k => ({ bone: 'body', at: [2.6 * k, 7.6, 6.5], n: [0.3 * k, 0.2, 0.93], facing: 0.05, on: 'goo', px: [[0, 0, '#f2eeff'], [0, 1, '#f2eeff'], [k < 0 ? 1 : -1, 0, '#f2eeff'], [k < 0 ? 1 : -1, 1, '#ff7ae0']] })),
    { bone: 'body', at: [0, 4.4, 7.6], n: [0, -0.1, 1], facing: 0.05, on: 'goo', px: [[-1, 0, '#140a26'], [0, 0, '#140a26'], [1, 0, '#140a26']] },
  ];
  const layers = [{ id: 'body', group: 'body', mats: { goo: GOO, crown: { ramp: ['#5a4ab8', '#8a7ce6', '#b4a8fa', '#e2dcff'], lift: 2 } }, prims, stamps }];
  const scalePrim = p => { const q = Object.assign({}, p); for (const k of ['c', 'r', 'a', 'b']) if (q[k]) q[k] = sv(q[k]); for (const k of ['ra', 'rb']) if (q[k] != null) q[k] *= SC; return q; };
  for (const L of layers) { L.prims = L.prims.map(scalePrim); L.stamps = L.stamps.map(t => Object.assign({}, t, { at: sv(t.at) })); }
  const P = (s, oy = 0, ox = 0) => ({ body: { scl: s, off: sv([ox, oy, 0]) } });
  const sq = k => [1 + k, 1 - k, 1 + k];
  const anims = {
    idle: { frames: 6, ms: [200, 200, 400, 200, 200, 400], pose: f => P(sq([0, 0.04, 0.08, 0.08, 0.04, 0][f])) },
    walk: { frames: 6, ms: [100, 100, 100, 100, 100, 100], pose: f => [P(sq(0.16)), P(sq(-0.18), 2.0), P(sq(-0.06), 5.0), P(sq(0.02), 3.4), P(sq(0.22)), P(sq(0.06))][f] },
    attack: { frames: 6, ms: [275, 275, 100, 100, 200, 200], pose: f => [P(sq(-0.15), 0.6), P(sq(-0.25), 1.6), P(sq(0.42)), P(sq(0.34)), P(sq(0.1)), P(sq(0.03))][f] },
    hit: { frames: 1, ms: [200], pose: () => P(sq(0.22), 0, 0) },
    death: { frames: 3, ms: [180, 180, 400], pose: f => P([[1.25, 0.7, 1.25], [1.5, 0.42, 1.5], [1.75, 0.22, 1.75]][f]) },
  };
  return {
    name: o.name || 'gloomslime',
    frame: o.frame || [48, 40], origin: o.origin || [24, 34],
    cam: { elev: 28 }, light: [-0.55, 0.7, 0.5], tones: [0.8, 0.3, -0.3],
    outline: '#0c0714', innerLine: 2.0, pixel: { normalSteps: 0 },
    flatDepth: true, bones, layers, anims, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death'],
    sockets: { head: { bone: 'body', at: sv([0, 13.0, 0]) }, chest: { bone: 'body', at: sv([0, 6.0, 0]) } },
    dirs: [['S', 0]],
  };
}

module.exports = make();
Object.defineProperty(module.exports, 'make', { value: make, enumerable: false });
