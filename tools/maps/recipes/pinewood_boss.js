'use strict';
// pinewood_boss -- compact Act I boss map (24x24), `boss` stamp.
// HOOK: a root-pillar arena where the rootGrab line is the lesson (dodge i-frames or the Root-Crown). Level band [6,10].
// BEATS: intro line (boss_bramblehorn_intro) at the arena threshold -> fight -> death line (boss_bramblehorn_death) + Root-Crown
//        (boss row `unique`) -> victory heals, quest done, rift home to the Vale opens (and the Ruins rift, closed until M3).
// PACING: 6 s walk from the shrine to the arena, then ~170 s of boss; the ledge chest is a 2 s detour.
const { boss } = require('../stamps.js');
const forestRules = require('./_forest.js');
const BOSS = process.env.PINE_BOSS_ENEMY || 'bramblehorn';   // compat mode maps this to 'troll' (see COMPAT_ENEMY)

module.exports = boss({
  id: 'pinewood_boss', name: 'Bramblehorn\'s Court', sub: 'Where the old troll king holds his root-throne', theme: 'forest', seed: 905,
  objective: 'Climb to the root-throne.', palette: forestRules, level: [6, 10],
  say: { intro: 'boss_bramblehorn_intro', death: 'boss_bramblehorn_death' },
  rooms: {
    start: { kind: 'clearing', x: 4.5, y: 19.5, r: 3.2, lvl: 0 },
    arena: { kind: 'arena', x: 14, y: 8.5, r: 7, lvl: 2, walled: true, pillars: 8, rune: 2.6, wall: 3 },
    nookChest: { kind: 'nook', x: 19.5, y: 20, r: 2.3, lvl: 2 },
  },
  main: ['start', [10, 20.5, 0], [14, 15.5, 2], 'arena'],
  branches: { chest: { from: { near: [14, 16] }, pts: [[18, 18, 2], 'nookChest'] } },
  portals: {
    back: { room: 'start', dx: 0.8, dy: 2.3, to: 'roothollow', arrive: 'roothollow.exit' },
    next: { room: 'arena', dx: -1.5, dy: -3.5, to: 'ruins', open: false, marker: true },
    home: { room: 'arena', dx: 2.5, dy: -3.5, to: 'vale', open: false, arrive: 'vale.pine' },
  },
  landmarks: [[-8.25, 5.4 + 1], [7.9, -7.3 + 1]],
  boss: { title: 'Old Bramblehorn', sub: 'The Troll King - Shard of Root', enemy: BOSS, victory: 'The Shard of Root is relit', quest: 'shard_root' },
  text: { intro: ['Aerin... the ground is shaking. That is the troll king.'], last: 'I only wished to keep the roots from rotting... Morrow is no king. He is a sleeper who will not wake.', after: 'Take the rift to the Gloomspire Ruins, or return home' },
});
