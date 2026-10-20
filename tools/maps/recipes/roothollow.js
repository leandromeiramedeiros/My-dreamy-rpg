'use strict';
// roothollow -- Act I dungeon (32x32) under the Pinewood, built with the `dungeon` stamp.
const { dungeon } = require('../stamps.js');
const caveRules = require('./_cave.js');

module.exports = dungeon({
  id: 'roothollow', name: 'Root Hollow', sub: 'Where the old roots drink the dark', theme: 'forest', seed: 3311, pad: 3, amp: 2.0,
  objective: 'Open the root door and descend.', palette: caveRules, density: 1.1, key: 'key_roothollow', pathType: 'p',
  patch: { f: 2, d: 0.62 },
  rooms: {
    start: { kind: 'clearing', x: 4.5, y: 27, r: 3, lvl: 0 },
    r1: { kind: 'chamber', x: 14, y: 25, r: 4.8, lvl: 0, walled: true },
    shrine: { kind: 'nook', x: 23.5, y: 22, r: 2, lvl: 2 },
    r2: { kind: 'chamber', x: 24, y: 10, r: 5, lvl: 4, walled: true },
    arena: { kind: 'arena', x: 8, y: 8, r: 5.5, lvl: 2, walled: true, pillars: 6, rune: 2, wall: 2.6 },
    lever: { kind: 'nook', x: 28.5, y: 17, r: 1.9, lvl: 3 },
    crack: { kind: 'nook', x: 3.5, y: 16, r: 2, lvl: 0 },
  },
  main: ['start', 'r1', 'shrine', [27, 16, 3], 'r2', [16, 12, 3], 'arena'],
  branches: {
    lever: { from: { near: [27, 16] }, pts: [[28, 16.5, 3], 'lever'] },
    crack: { from: { near: [10, 22] }, pts: [[6, 19, 0], 'crack'] },
    shortcut: { kind: 'loop', w: 1.8, from: { room: 'arena' }, pts: [[9, 15, 2], [15, 17.5, 2], [20, 20, 2], 'shrine'] },
  },
  portals: {
    up: { room: 'start', dx: -1.2, dy: 2, to: 'pinewood', arrive: 'pinewood.down' },
    exit: { room: 'arena', dx: 0, dy: -3, to: 'pinewood_boss', open: false, marker: true },
  },
  startOff: [1.2, -0.2],
  text: {
    intro: ['Roots everywhere... they are moving. Stay close to me.'], locked: 'A door of knotted roots. It needs the Root Hollow key.',
    shrineName: 'Root Hollow midpoint', tablet: 'The first Warden sealed Mossjaw here to keep the Gloam from the pines.',
    bossLast: 'The roots remember the first Warden... he did not wake, and neither shall I.',
  },
  enemies: {
    r1: { name: 'First cavern', banner: ['Root Cavern', 'Thorn-touched brutes in numbers'], gap: 8, waves: [[['ogre', 3]], [['ogre', 3]]], clear: 'The roots go still.' },
    r2: { name: 'Gate gallery', banner: ['The Gallery', 'Fight to the lever'], gap: 9, waves: [[['troll', 1]], [['ogre', 2], ['shaman', 1]]], clear: 'Silence. A lever waits nearby.' },
    arena: { name: 'Mossjaw\'s den', title: 'Mossjaw', sub: 'Moss-gorged root troll - mini-boss', enemy: 'mossjaw', add: 'ogre' },
  },
});
