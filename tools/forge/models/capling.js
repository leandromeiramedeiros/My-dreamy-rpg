'use strict';
// CAPLING — a forge test model: a hopping mushroom critter (24x26 frame). Written to time how fast a new creature is.
const model = {
  name: 'capling',
  frame: [24, 26], origin: [12, 25],
  cam: { elev: 30 },
  light: [-0.55, 0.7, 0.5],
  tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.5,
  mats: {
    stem: { ramp: '#e9dcc4', lift: 1 }, cap: { ramp: '#c8475a', tones: [0.85, 0.35, -0.2] }, gill: '#c9a98c',
    spot: { ramp: ['#c9b8c8', '#e6dcd8', '#f6eee0', '#ffffff'], lift: 2 }, feet: '#7a4f3a',
  },
  bones: [
    { name: 'body', at: [0, 1.0, 0] },
    { name: 'cap', parent: 'body', at: [0, 8.4, 0] },
    { name: 'footL', parent: 'body', at: [-2.0, -0.4, 0.6] },
    { name: 'footR', parent: 'body', at: [2.0, -0.4, 0.6] },
  ],
  prims: [
    { bone: 'body', mat: 'stem', shape: 'ell', c: [0, 4.4, 0], r: [3.7, 5.0, 3.4], clip: [0, -1, 0, -0.2] },
    { bone: 'footL', mat: 'feet', shape: 'ell', c: [0, 0, 0.4], r: [1.5, 1.1, 1.9], clip: [0, -1, 0, 0.6] },
    { bone: 'footR', mat: 'feet', shape: 'ell', c: [0, 0, 0.4], r: [1.5, 1.1, 1.9], clip: [0, -1, 0, 0.6] },
    { bone: 'cap', mat: 'gill', part: 'cap', shape: 'ell', c: [0, 0.4, 0], r: [5.8, 1.1, 5.0] },
    { bone: 'cap', mat: 'cap', part: 'cap', shape: 'ell', c: [0, 1.4, 0], r: [6.4, 4.2, 5.6], clip: [0, -1, 0, 0.2] },
    // spots: little domes sitting on the cap surface (same part: no inner line)
    ...[[-2.8, 2.4], [2.6, 1.6], [0.2, -1.4], [-4.2, -2.2], [4.0, -2.6]].map(([x, z]) => {
      const k = 1 - (x / 6.4) ** 2 - (z / 5.6) ** 2, y = 1.4 + 4.2 * Math.sqrt(Math.max(k, 0));
      return { bone: 'cap', mat: 'spot', part: 'cap', shape: 'ell', c: [x, y - 0.3, z], r: [1.1, 0.7, 1.1] };
    }),
  ],
  stamps: [
    { bone: 'body', at: [-1.3, 3.9, 3.0], n: [-0.3, 0, 0.95], facing: 0.05, on: 'stem', px: [[0, 0, '#1a1020'], [0, 1, '#1a1020']] },
    { bone: 'body', at: [1.3, 3.9, 3.0], n: [0.3, 0, 0.95], facing: 0.05, on: 'stem', px: [[0, 0, '#1a1020'], [0, 1, '#1a1020']] },
    { bone: 'body', at: [-2.4, 2.9, 2.5], n: [-0.6, 0, 0.8], facing: 0.4, on: 'stem', px: [[0, 0, '#f08a8a']] },
    { bone: 'body', at: [2.4, 2.9, 2.5], n: [0.6, 0, 0.8], facing: 0.4, on: 'stem', px: [[0, 0, '#f08a8a']] },
  ],
  sockets: { top: { bone: 'cap', at: [0, 5.6, 0] } },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
  anims: {
    idle: { frames: 2, pose: f => ({ body: { scl: [1 + 0.05 * f, 1 - 0.06 * f, 1 + 0.05 * f] }, cap: { off: [0, -0.4 * f, 0] } }) },
    // hop: crouch (squash) -> launch (stretch) -> airborne -> land (squash)
    walk: {
      frames: 4,
      pose: f => ({
        body: { off: [0, [0, 2, 4, 0][f], 0], scl: [[1.14, 0.84, 1.14], [0.9, 1.14, 0.9], [1, 1.02, 1], [1.18, 0.8, 1.18]][f] },
        cap: { rot: [[0.12, 0, 0], [-0.1, 0, 0], [0, 0, 0], [0.18, 0, 0]][f] },
        footL: { off: [0, [0, -0.4, 0.8, 0][f], 0] }, footR: { off: [0, [0, -0.4, 0.8, 0][f], 0] },
      }),
    },
  },
};
module.exports = model;
