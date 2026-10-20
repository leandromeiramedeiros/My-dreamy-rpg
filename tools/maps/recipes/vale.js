'use strict';
// HOOK: you wake in a dream above the clouds -- one new noun every ~minute (DESIGN 16.2): dummies teach swing, dodge and Q;
//       the Elder Stone gives a riddle and the lost-lantern quest; a chest with a fishing spot beside it; a garden ambush of three
//       slimes (first drop, first kill-heal) whose end opens the Pinewood rift. Level band [1,3].
// PACING (main path ~27 tiles = 7 s; every branch <= 7 s):  0:10 wake + Pip  0:40 yard dummies  1:30 Elder Stone riddle + quest
//   2:00 NE chest + fishing stub  3:00 cottage tablet  3:30 garden ambush  4:30 rift opens (banner, Pip)  5:00 lantern found
//   (optional, the NW nook)  5:30 lantern returned, reward.  The rift stays shut until the ambush is cleared.
// vale -- Whispering Vale hub, 40x40: arrival glade + dummy yard, Elder Plaza (Elder Stone), cottage & garden, creek,
// terraced Rift Terrace (NE) with the Ruins rift open and closed rifts for the future zones, Pinewood rift (S),
// hub-arena pad (closed portal), tutorial chest ledge and a hidden gem cache islet.
const { registerPortals, placePortals } = require('../stamps.js');
const valeRules = require('./_vale.js');
const { DIALOGUE } = require('../gamedata.js');

const S = {
  id: 'vale',
  rooms: {
    start: { x: 6.5, y: 31, r: 4 }, riftTerrace: { x: 33, y: 8, r: 5.2 }, pine: { x: 25, y: 35.5, r: 3.2 }, arenaPad: { x: 34.5, y: 35.5, r: 3 },
  },
  portals: {
    ruins: { room: 'riftTerrace', dx: -2.2, dy: -1.2, to: 'ruins', marker: true },
    grotto: { room: 'riftTerrace', dx: 2.4, dy: -1.6, to: 'grotto', open: false },
    caldera: { room: 'riftTerrace', dx: -1.6, dy: 2.4, to: 'caldera', open: false },
    spire: { room: 'riftTerrace', dx: 2.4, dy: 2.2, to: 'spire', open: false },
    pine: { room: 'pine', dx: 0, dy: 0.3, to: 'pinewood', open: false },   // opens when the garden ambush is cleared
    arena: { room: 'arenaPad', dx: 0, dy: 0, to: 'hub_arena', open: false },
  },
};
registerPortals(S);

module.exports = {
  id: 'vale',
  opts: { W: 40, H: 40, seed: 2024, name: 'Whispering Vale', sub: 'A dream drifting above the clouds', theme: 'vale', objective: 'Wake up. Training dummies wait in the yard.', pad: 2.7, amp: 1.2, level: [1, 3] },
  patch: { f: 0.62, d: -1 },
  layout(g, T) {
    g.room('start', { kind: 'hub', x: 6.5, y: 31, r: 4, lvl: 0, label: 'ARRIVAL', clear: true });
    g.room('yard', { kind: 'clearing', x: 14.5, y: 33.5, r: 3.8, lvl: 0, label: 'DUMMY YARD', clear: true });
    g.room('plaza', { kind: 'plaza', x: 19.5, y: 21, r: 5, lvl: 0, label: 'ELDER PLAZA', clear: true });
    g.room('cottage', { kind: 'clearing', x: 8.5, y: 9.5, r: 5, lvl: 0, label: 'COTTAGE', clear: true, floor: 'f', floorIn: 2.5 });
    g.room('garden', { kind: 'clearing', x: 17, y: 8.5, r: 3.4, lvl: 0, label: 'GARDEN', clear: true, floor: 'f', floorIn: 0.5 });
    g.room('riftTerrace', { kind: 'plaza', x: 33, y: 8, r: 5.2, lvl: 4, label: 'RIFT TERRACE', clear: true });
    g.room('pine', { kind: 'plaza', x: 25, y: 35.5, r: 3.2, lvl: 0, label: 'PINE RIFT', clear: true });
    g.room('arenaPad', { kind: 'plaza', x: 34.5, y: 35.5, r: 3, lvl: 0, label: 'HUB ARENA', clear: true });
    g.room('nookChest', { kind: 'nook', x: 36.5, y: 16.5, r: 2.2, lvl: 0, label: 'CHEST', clear: true });
    g.room('gemNook', { kind: 'nook', x: 3.2, y: 3.4, r: 2.1, lvl: 0, label: 'SECRET', clear: true });
    g.pond('pond', { x: 33.2, y: 24.8, r: 5.6, lvl: 0 });
    g.path('main', { kind: 'main', w: 2.4, meander: 2, every: 7, type: 'p', pts: ['start', 'yard', [21, 29.5], 'plaza'] });
    g.path('pine', { kind: 'branch', w: 2.4, meander: 1.6, type: 'p', from: { room: 'yard' }, pts: [[20.5, 35], 'pine'] });
    g.path('ruins', { kind: 'main2', w: 2.4, meander: 2.2, every: 7, type: 'p', from: { room: 'plaza' }, pts: [[25.5, 15, 2], [28, 11, 4], 'riftTerrace'] });
    g.path('cottage', { kind: 'branch', w: 2, meander: 1.6, type: 'p', from: { room: 'plaza' }, pts: [[13.5, 14], 'garden', [12, 9.5], 'cottage'] });
    g.path('arena', { kind: 'branch', w: 2.2, meander: 1.4, type: 'p', from: { room: 'pine' }, pts: [[29.5, 37], 'arenaPad'] });
    g.path('chest', { kind: 'branch', w: 1.8, meander: 1.2, type: 'p', from: { near: [26.5, 15] }, pts: [[31.5, 15.5, 0], 'nookChest'] });
    g.path('secret', { kind: 'secret', w: 1.8, meander: 1, type: 'p', every: 5, from: { room: 'cottage' }, pts: [[4.8, 6.4, 0], 'gemNook'] });
  },
  populate(g, T) {
    const R = g.roomBy, C0 = R.nookChest;
    g.setStart(R.start.x - 1.2, R.start.y + 1.2);
    g.house(R.cottage.x - 2, R.cottage.y - 3);
    placePortals(g, S);
    g.marker('elder_stone', R.plaza.x, R.plaza.y, { label: 'elder stone', text: DIALOGUE.vale_elder.lines.join(' ') + ' Past the cottage, where the path ends, a light waits.' });
    g.ring('plaza', 'crystal', 5, 0.55, { rot: 0.3 }); g.ring('plaza', 'lantern', 6, 0.95);
    g.marker('shrine', R.start.x + 2, R.start.y - 1.8, { label: 'checkpoint' });
    g.marker('sign', R.start.x + 2.8, R.start.y + 1, { label: 'sign', text: 'Training yard east. Elder Stone north-east.' });
    g.marker('chest', R.nookChest.x, R.nookChest.y, { label: 'tutorial-chest', tier: 'wood', starter: true });   // starter: true -> items.js starterLoot() (weapon, armour, gem)
    g.marker('gem_cache', R.gemNook.x, R.gemNook.y, { label: 'secret gem cache' });
    const fa = g.waterEdge(C0.x + 0.5, C0.y + 3, 6), fb = g.waterEdge(27.5, 25, 6);
    g.marker('fishspot', fa.x, fa.y, { pool: 'vale_a' }); g.marker('fishspot', fb.x, fb.y, { pool: 'vale_b' });
    g.marker('tablet', R.cottage.x + 3.2, R.cottage.y + 2.4, { label: 'lore', title: 'Tablet', text: DIALOGUE.vale_tablet.lines.join(' ') });
    const LAN = g.nearWalkable(R.gemNook.x + 1.3, R.gemNook.y + 0.9, 0.6);
    g.marker('lantern_blue', LAN.x, LAN.y, { label: 'lost-lantern' });                                 // the Stone's lost lantern (quest vale_lantern)
    g.ring('yard', 'lantern', 3, 0.9); g.ring('cottage', 'lantern', 3, 0.95); g.ring('riftTerrace', 'lantern_blue', 5, 0.95); g.ring('pine', 'lantern', 3, 0.9); g.ring('arenaPad', 'lantern_blue', 3, 0.85);
    g.scatter(valeRules(0.95));
    const tr = g.triggers, Y = R.yard, P = R.plaza, C = R.nookChest, GD = R.garden, S0 = R.start;
    const pineIdx = g.portalIdx.pine;
    // -- 0:00 banner every entry; the dummies stand again each visit; one-shot beats use enter_area (map_enter re-fires)
    tr.push(T.mapEnter('banner', 'Zone banner', [T.say('vale_banner')]));
    tr.push(T.mapEnter('dummies', 'Training dummies', [T.spawn('dummy', 1, Y.x - 0.8, Y.y - 0.6, null, { instant: true }), T.spawn('dummy', 1, Y.x + 0.8, Y.y + 0.8, null, { instant: true })]));
    tr.push(T.enter('wake', 'Pip wakes Aerin', S0.x, S0.y, 7, [T.say('vale_wake'), T.dialogue('Pip', ['Training dummies are east. Hit one.']), T.objective('Hit the training dummies in the yard.')]));
    tr.push(T.enter('shrine', 'Rift shrine', S0.x + 2, S0.y - 1.8, 2.2, [T.checkpoint('Checkpoint: Whispering Vale'), T.heal(100)]));
    tr.push(T.enter('yard_teach', 'Dummy yard lesson', Y.x, Y.y, 3.6, [T.dialogue('Pip', ['Swing. Then dodge. Then try your Q skill.', 'The dummy never hits back. Lucky thing.']), T.objective('Follow the path north to the Elder Plaza.')]));
    // -- 1:30 Elder Stone: riddle + the lost-lantern quest
    tr.push(T.enter('elder', 'The Elder Stone', P.x, P.y, 3, [T.say('vale_elder'), T.dialogue('Elder Stone', ['The Stone lost a light. Past the cottage, a path ends.']), T.step('vale_lantern', 0), T.objective('Open the chest north-east. Then find the Stone\'s lantern.')]));
    // -- 2:00 first chest (the engine rolls the starter kit on Interact) + fishing stub beside it
    tr.push(T.enter('chest', 'Tutorial chest', C.x, C.y, 2.6, [T.dialogue('Pip', ['A chest! Interact to open it.']), T.wait(4), T.say('vale_chest'), T.dialogue('Pip', ['Open your bag and equip it.'])]));
    tr.push(T.enter('fish_hint', 'Fishing spot', fa.x, fa.y, 3.4, [T.dialogue('Pip', ['Ripples. Fishing waits in the Pinewood.'])]));
    tr.push(T.enter('gems', 'Hidden gem cache', R.gemNook.x, R.gemNook.y, 2.2, [T.message('A hidden gem cache!'), T.loot('uncommon', 1, R.gemNook.x, R.gemNook.y, { gem: true })]));
    // -- 3:00 tablet (the cottage), 3:30 garden ambush (3 slimes): first drop, first kill-heal -> 4:30 the Pinewood rift opens
    tr.push(T.enter('tablet', 'Cottage tablet', R.cottage.x + 3.2, R.cottage.y + 2.4, 2.4, [T.say('vale_tablet')]));
    tr.push(T.enter('garden_ambush', 'Gloom in the garden', GD.x, GD.y, 3.2, [
      T.banner('Gloom in the garden', 'Slimes ooze out of the flowers'), T.spawn('gloomslime', 1, GD.x - 1.6, GD.y - 0.6, 1.2), T.spawn('gloomslime', 1, GD.x + 1.8, GD.y + 0.4, 1.2), T.spawn('gloomslime', 1, GD.x, GD.y + 1.8, 1.2),
    ], ['elder']));
    tr.push(T.allDead('garden_done', 'Garden cleared', ['garden_ambush'], [
      T.message('The garden is quiet. Something hums in the south.'), T.heal(40), T.loot('uncommon', 1, GD.x, GD.y),
      T.openPortal(pineIdx), T.sound('portal'), T.banner('The Pinewood rift opens', 'South of the yard'), T.say('vale_rift'),
      T.step('shard_root', 0), T.objective('Take the rift south into the Misty Pinewood.'),
    ]));
    // -- 5:00 side quest: the Stone's lost lantern (vale_lantern) -> reward at the Stone
    tr.push(T.enter('lantern_found', 'The lost lantern', LAN.x, LAN.y, 2.2, [T.message('The Stone\'s lantern, still warm.'), T.step('vale_lantern', 1), T.objective('Return the lantern to the Elder Stone.')], ['elder']));
    tr.push(T.enter('lantern_return', 'Lantern returned', P.x, P.y, 3, [
      T.dialogue('Elder Stone', ['The Stone is lit. The Stone remembers kindness.']), T.done('vale_lantern'),
      T.loot('rare', 1, P.x, P.y, { gem: true, item: 'socket_rune' }), T.message('Reward: a gem and a Socket Rune.'),
    ], ['lantern_found']));
  },
};
