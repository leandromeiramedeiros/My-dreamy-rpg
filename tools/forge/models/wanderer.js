'use strict';
// WANDERER — a forge test model: a chibi traveller (scarf, satchel, bedroll) in the 24x34 hero frame.
// Not the hero redesign (that waits for the client's concept approval); it proves the pipeline on a hero-sized figure.
// Units are pixels, y up, the model faces +z (towards the camera at yaw 0), the feet centre sits on the origin.
const S = 1;   // global scale knob
const v = (x, y, z) => [x * S, y * S, z * S];

const model = {
  name: 'wanderer',
  frame: [24, 34], origin: [12, 32],
  cam: { elev: 28 },
  light: [-0.55, 0.7, 0.5],
  tones: [0.8, 0.3, -0.3],
  outline: '#0c0714', innerLine: 2.5,
  mats: {
    skin: { ramp: ['#a85a4e', '#d98c6c', '#f0c4a0', '#fbe3c8'], lift: 1 }, hair: { ramp: '#6b4058', tones: [0.9, 0.38, -0.2] }, tunic: '#3f6fa8', scarf: '#d9534f', belt: '#6b4433',
    pants: '#3b3350', boots: '#7a4f3a', pack: '#8a5a3c', roll: '#e6dcc0', buckle: { ramp: '#e8b830' },
  },
  bones: [
    { name: 'hips', at: v(0, 8, 0) },
    { name: 'torso', parent: 'hips', at: v(0, 0, 0) },
    { name: 'head', parent: 'torso', at: v(0, 9.2, 0) },
    { name: 'tail', parent: 'torso', at: v(1.2, 8.6, -2.6) },
    { name: 'armL', parent: 'torso', at: v(-4.2, 7.3, 0) },
    { name: 'armR', parent: 'torso', at: v(4.2, 7.3, 0) },
    { name: 'legL', parent: 'hips', at: v(-2.0, 0, 0) },
    { name: 'legR', parent: 'hips', at: v(2.0, 0, 0) },
  ],
  prims: [
    // legs + boots (flat soles)
    { bone: 'legL', mat: 'pants', shape: 'cap', a: v(0, 0, 0), b: v(0, -5.2, 0), ra: 1.7, rb: 1.5 },
    { bone: 'legR', mat: 'pants', shape: 'cap', a: v(0, 0, 0), b: v(0, -5.2, 0), ra: 1.7, rb: 1.5 },
    { bone: 'legL', mat: 'boots', part: 'bootL', shape: 'ell', c: v(0, -6.4, 0.7), r: v(2.0, 1.9, 2.7), clip: [0, -1, 0, 8.0] },
    { bone: 'legR', mat: 'boots', part: 'bootR', shape: 'ell', c: v(0, -6.4, 0.7), r: v(2.0, 1.9, 2.7), clip: [0, -1, 0, 8.0] },
    // body: tunic, flared hem, belt + buckle
    { bone: 'torso', mat: 'tunic', shape: 'ell', c: v(0, 4.6, 0), r: v(4.2, 4.8, 3.2), clip: [0, -1, 0, 0.6] },
    { bone: 'torso', mat: 'tunic', shape: 'ell', c: v(0, 1.4, 0), r: v(4.7, 2.6, 3.6), clip: [0, -1, 0, 1.4] },
    { bone: 'torso', mat: 'belt', part: 'torso', shape: 'box', c: v(0, 2.9, 0), h: v(4.45, 0.7, 3.45), round: 0.6 },
    { bone: 'torso', mat: 'buckle', part: 'torso', shape: 'box', c: v(0, 2.9, 3.35), h: v(0.9, 0.75, 0.35), round: 0.2 },
    // satchel + bedroll on the back
    { bone: 'torso', mat: 'pack', part: 'pack', shape: 'box', c: v(0, 5.0, -3.7), h: v(3.0, 3.1, 1.5), round: 1.0 },
    { bone: 'torso', mat: 'roll', part: 'pack', shape: 'cap', a: v(-3.4, 8.3, -3.4), b: v(3.4, 8.3, -3.4), ra: 1.35, rb: 1.35 },
    // scarf ring + trailing tail
    { bone: 'torso', mat: 'scarf', part: 'scarf', shape: 'ell', c: v(0, 8.3, 0.1), r: v(3.6, 1.3, 3.0) },
    { bone: 'tail', mat: 'scarf', part: 'tail', shape: 'cap', a: v(0, 0, 0), b: v(0.8, -4.2, -1.4), ra: 1.15, rb: 0.85 },
    // arms: sleeve + hand
    { bone: 'armL', mat: 'tunic', shape: 'cap', a: v(0, 0, 0), b: v(0, -4.0, 0), ra: 1.45, rb: 1.3 },
    { bone: 'armR', mat: 'tunic', shape: 'cap', a: v(0, 0, 0), b: v(0, -4.0, 0), ra: 1.45, rb: 1.3 },
    { bone: 'armL', mat: 'skin', shape: 'ell', c: v(0, -5.0, 0), r: v(1.45, 1.45, 1.45) },
    { bone: 'armR', mat: 'skin', shape: 'ell', c: v(0, -5.0, 0), r: v(1.45, 1.45, 1.45) },
    // head; hair = a cap cut away over the face (brow line + a cheek cut so side views keep the face), bangs, side locks
    { bone: 'head', mat: 'skin', shape: 'ell', c: v(0, 5.8, 0.3), r: v(6.2, 5.8, 5.6) },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: v(0, 6.6, -0.6), r: v(6.7, 5.9, 6.1), clip: [[0, -0.3, 0.95, 2.3], [0, -1, 0, -1.2]] },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: v(-2.7, 9.0, 4.2), r: v(2.2, 2.0, 1.6) },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: v(0.2, 8.7, 4.7), r: v(2.3, 2.2, 1.6) },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: v(2.9, 9.1, 4.1), r: v(2.0, 1.9, 1.6) },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'cap', a: v(-5.7, 7.0, 1.0), b: v(-5.3, 2.4, 1.6), ra: 1.3, rb: 0.8 },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'cap', a: v(5.7, 7.0, 1.0), b: v(5.3, 2.4, 1.6), ra: 1.3, rb: 0.8 },
    { bone: 'head', mat: 'hair', part: 'hair', shape: 'ell', c: v(1.6, 12.1, -0.8), r: v(1.6, 1.2, 1.4) },
  ],
  stamps: [
    { bone: 'head', at: v(-2.2, 5.6, 4.4), n: [-0.3, 0, 0.95], facing: 0.05, on: 'skin', px: [[0, 0, '#1a1020'], [0, 1, '#1a1020']] },
    { bone: 'head', at: v(2.2, 5.6, 4.4), n: [0.3, 0, 0.95], facing: 0.05, on: 'skin', px: [[0, 0, '#1a1020'], [0, 1, '#1a1020']] },
    { bone: 'head', at: v(-3.6, 3.7, 4.6), n: [-0.5, -0.2, 0.85], facing: 0.35, on: 'skin', px: [[0, 0, '#f08a8a']] },
    { bone: 'head', at: v(3.6, 3.7, 4.6), n: [0.5, -0.2, 0.85], facing: 0.35, on: 'skin', px: [[0, 0, '#f08a8a']] },
  ],
  sockets: {
    handL: { bone: 'armL', at: v(0, -5.0, 0) },
    handR: { bone: 'armR', at: v(0, -5.0, 0) },
    headTop: { bone: 'head', at: v(0, 12.5, 0) },
  },
  dirs: [['S', 0], ['SE', 45], ['E', 90], ['NE', 135], ['N', 180], ['NW', 225], ['W', 270], ['SW', 315]],
  anims: {
    idle: {
      frames: 2,
      pose: f => ({
        torso: { off: [0, -f, 0] },
        armL: { rot: [0, 0, -0.32 - 0.04 * f] }, armR: { rot: [0, 0, 0.32 + 0.04 * f] },
        tail: { rot: [0.25 + 0.1 * f, 0, 0.15] },
      }),
    },
    walk: {
      frames: 4,
      // contact, passing, contact, passing: hips drop 1px on contact, the passing leg lifts 1px
      pose: f => {
        const sw = [0.55, 0, -0.55, 0][f];
        return {
          hips: { off: [0, [-1, 0, -1, 0][f], 0] },
          legL: { rot: [-sw, 0, 0], off: [0, f === 3 ? 1 : 0, 0] },
          legR: { rot: [sw, 0, 0], off: [0, f === 1 ? 1 : 0, 0] },
          armL: { rot: [sw * 0.9, 0, -0.3] }, armR: { rot: [-sw * 0.9, 0, 0.3] },
          head: { off: [0, [0, -0, 0, -0][f], 0] },
          tail: { rot: [0.5 + [0.1, 0.3, 0.1, 0.3][f], 0, [0.2, 0.05, -0.1, 0.05][f]] },
        };
      },
    },
  },
};
module.exports = model;
