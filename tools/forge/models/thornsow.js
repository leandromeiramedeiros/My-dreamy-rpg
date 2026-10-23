'use strict';
// THORNSOW MATRIARCH (`thornsow`, the Bramblehorn elite pockets: burrow + gore + the pack aura) — the Thornback Boar's rig
// (models/thornbackboar.js make()) at matriarch size: SC 1.38 (was 1.4; 1.38 keeps body.atk.any under the 30 KB sheet cap, 29.5 KB), a rust-dark hide, a crown of long thorns over the brow
// and amber eyes, so she reads as the pack's head next to her boars. Frame 84 x 70, origin (42, 55). Same anims and sockets.
module.exports = require('./thornbackboar.js').make({
  name: 'thornsow', SC: 1.38, frame: [84, 70], origin: [42, 55], short: true,
  fur: { ramp: ['#2b1821', '#422430', '#643844', '#8a5458'] },
  thorn: { ramp: ['#1a3a30', '#2c6248', '#4a905a', '#98cc78'] },
  eye: '#ffb02a',
  crown: [-1, 1].flatMap(k => [
    { bone: 'head', mat: 'thorn', part: 'thorn', shape: 'cap', a: [1.2 * k, 2.6, 0.6], b: [2.6 * k, 6.4, -1.4], ra: 1.0, rb: 0.3 },
    { bone: 'head', mat: 'thorn', part: 'thorn', shape: 'cap', a: [0.4 * k, 2.8, -0.6], b: [0.9 * k, 6.0, -3.4], ra: 0.9, rb: 0.3 },
  ]),
});
