'use strict';
// WISP (`wisp`, the Ruins: an ethereal kiting shooter) — a forge amorphous flyer, 1 direction: a cyan ghost-flame orb with
// a pale core, two dark eye-points and a flickering flame tail, three motes circling it. Frame 32 x 40, origin (16, 34): the
// orb floats 12 px over the origin (render.js adds the hover bob and the cyan light). ~10 px across (hero ~31 px tall).
// Anims (1 dir): idle 6 (the orb pulses, the tail sways), walk 6 (the same, the tail streaming), attack 6 (render.js: wind
// f0-1 = it swells and brightens; the shot f2-3 = it flares and recoils; rec f4-5), hit 1 (squashed), death 3 (it gutters
// out into its motes). Sockets: head, chest.
const bones = [
  { name: 'base', at: [0, 0, 0] },
  { name: 'orb', parent: 'base', at: [0, 12, 0] },
  { name: 'tail1', parent: 'orb', at: [0, -2.2, -0.4] },
  { name: 'tail2', parent: 'tail1', at: [0, -3.0, 0] },
];
const prims = [
  { bone: 'orb', mat: 'glow', part: 'orb', shape: 'ell', c: [0, 0.6, 0], r: [4.0, 4.2, 4.0] },
  { bone: 'orb', mat: 'glow', part: 'orb', shape: 'cap', a: [0, 3.4, -0.4], b: [0.8, 7.0, -1.2], ra: 2.2, rb: 0.4 },
  { bone: 'orb', mat: 'core', part: 'orb', shape: 'ell', c: [-0.6, 1.4, 2.4], r: [1.8, 1.8, 1.4] },
  { bone: 'tail1', mat: 'glow', part: 'orb', shape: 'cap', a: [0, 0, 0], b: [0, -3.0, 0], ra: 2.8, rb: 1.8 },
  { bone: 'tail2', mat: 'deep', part: 'orb', shape: 'cap', a: [0, 0, 0], b: [0.4, -3.6, -0.6], ra: 1.8, rb: 0.4 },
  // motes (dropped as it dies; scattered in its death)
  ...[0, 1, 2].map(i => { const a = i * 2.1 + 0.4; return { bone: 'base', mat: 'core', part: 'mote', shape: 'ell', c: [7 * Math.cos(a), 9 + 3 * Math.sin(a * 1.7), 5 * Math.sin(a)], r: [0.9, 0.9, 0.9], when: (an) => an !== 'death' }; }),
  ...[0, 1, 2, 3].map(i => { const a = i * 1.6 + 0.2; return { bone: 'base', mat: 'glow', part: 'mote', shape: 'ell', c: [6 * Math.cos(a), 3 + i * 1.6, 4 * Math.sin(a)], r: [1.0, 1.0, 1.0], when: (an, f) => an === 'death' && f > 0 }; }),
];
const stamps = [-1, 1].map(k => ({ bone: 'orb', at: [1.3 * k, 0.8, 3.9], n: [0.25 * k, 0, 0.97], facing: 0.05, on: 'glow', px: [[0, 0, '#10182a'], [0, 1, '#10182a']] }));
const layers = [{ id: 'body', group: 'body', prims, stamps,
  mats: { glow: { ramp: ['#2a86c0', '#4ec0ec', '#8ae4ff', '#d4f8ff'], lift: 1 }, core: { ramp: ['#bff4ff', '#e6fcff', '#f6ffff', '#ffffff'], lift: 2 }, deep: { ramp: ['#1e5a9a', '#2e86c4', '#4ec0ec', '#8ae4ff'], lift: 1 } } }];
const P = (s, sway, o = {}) => ({ orb: { scl: [s, s, s], off: o.off || [0, 0, 0] }, tail1: { rot: [0.25 + (o.stream || 0), 0, sway] }, tail2: { rot: [0.2 + (o.stream || 0) * 0.6, 0, sway * 1.3] } });
const anims = {
  idle: { frames: 6, ms: [120, 120, 120, 120, 120, 120], pose: f => P([1, 1.04, 1.07, 1.04, 1, 0.97][f], [0, 0.2, 0.3, 0.1, -0.2, -0.25][f], { off: [0, [0, 0.4, 0.8, 0.8, 0.4, 0][f], 0] }) },
  walk: { frames: 6, ms: [100, 100, 100, 100, 100, 100], pose: f => P([1, 1.04, 1.07, 1.04, 1, 0.97][f], [0.1, 0.3, 0.1, -0.1, -0.3, -0.1][f], { stream: 0.45 }) },
  attack: { frames: 6, ms: [300, 300, 100, 100, 200, 200], pose: f => [P(1.12, 0.1, { off: [0, 0.6, -0.6] }), P(1.22, -0.1, { off: [0, 1.0, -1.0] }), P(0.86, 0, { off: [0, 0, 1.6], stream: 0.6 }), P(0.9, 0.1, { off: [0, 0, 1.0], stream: 0.4 }), P(0.98, 0, {}), P(1, -0.1, {})][f] },
  hit: { frames: 1, ms: [200], pose: () => ({ orb: { scl: [1.25, 0.8, 1.25], off: [0, -0.6, -1.2] }, tail1: { rot: [0.6, 0, 0.3] } }) },
  death: { frames: 3, ms: [180, 180, 400], pose: f => P([0.8, 0.5, 0.25][f], 0.3 * f, { off: [0, -2 * f, 0], stream: 0.3 }) },
};

module.exports = {
  name: 'wisp',
  frame: [32, 40], origin: [16, 34],
  cam: { elev: 28 }, light: [-0.55, 0.7, 0.5], tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.0, pixel: { normalSteps: 0 },
  flatDepth: true, bones, layers, anims, sheetAnims: ['idle', 'walk', 'attack', 'hit', 'death'],
  sockets: { head: { bone: 'orb', at: [0, 5.0, 0] }, chest: { bone: 'orb', at: [0, 0.6, 0] } },
  dirs: [['S', 0]],
};
