'use strict';
// vale -- Whispering Vale hub, 40x40: arrival glade + dummy yard, Elder Plaza (Elder Stone), cottage & garden, creek,
// terraced Rift Terrace (NE) with the Ruins rift open and closed rifts for the future zones, Pinewood rift (S),
// hub-arena pad (closed portal), tutorial chest ledge and a hidden gem cache islet.
const { registerPortals, placePortals } = require('../stamps.js');
const valeRules = require('./_vale.js');

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
    pine: { room: 'pine', dx: 0, dy: 0.3, to: 'pinewood' },
    arena: { room: 'arenaPad', dx: 0, dy: 0, to: 'hub_arena', open: false },
  },
};
registerPortals(S);

module.exports = {
  id: 'vale',
  opts: { W: 40, H: 40, seed: 2024, name: 'Whispering Vale', sub: 'A dream drifting above the clouds', theme: 'vale', objective: 'Explore. Rifts hum to the north-east and the south.', pad: 2.7, amp: 1.2 },
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
    g.marker('elder_stone', R.plaza.x, R.plaza.y, { label: 'elder stone' });
    g.ring('plaza', 'crystal', 5, 0.55, { rot: 0.3 }); g.ring('plaza', 'lantern', 6, 0.95);
    g.marker('shrine', R.start.x + 2, R.start.y - 1.8, { label: 'checkpoint' });
    g.marker('sign', R.start.x + 2.8, R.start.y + 1, { label: 'sign', text: 'Training yard east. Elder Stone north-east.' });
    g.marker('chest', R.nookChest.x, R.nookChest.y, { label: 'tutorial-chest', tier: 'wood' });
    g.marker('gem_cache', R.gemNook.x, R.gemNook.y, { label: 'secret gem cache' });
    { const a = g.waterEdge(C0.x + 0.5, C0.y + 3, 6), b = g.waterEdge(27.5, 25, 6); g.marker('fishspot', a.x, a.y, { pool: 'vale_a' }); g.marker('fishspot', b.x, b.y, { pool: 'vale_b' }); }
    g.marker('tablet', R.cottage.x + 3.2, R.cottage.y + 2.4, { label: 'lore', text: 'Aerin\'s lantern burns low. Wake the Shards and the Vale will bloom again.' });
    g.ring('yard', 'lantern', 3, 0.9); g.ring('cottage', 'lantern', 3, 0.95); g.ring('riftTerrace', 'lantern_blue', 5, 0.95); g.ring('pine', 'lantern', 3, 0.9); g.ring('arenaPad', 'lantern_blue', 3, 0.85);
    g.scatter(valeRules(0.95));
    const tr = g.triggers, Y = R.yard, P = R.plaza, C = R.nookChest;
    tr.push(T.mapEnter('dummies', 'Training dummies', [T.spawn('dummy', 1, Y.x - 0.8, Y.y - 0.6, null, { instant: true }), T.spawn('dummy', 1, Y.x + 0.8, Y.y + 0.8, null, { instant: true })]));
    tr.push(T.mapEnter('intro', 'Pip wakes Aerin', [T.dialogue('Pip', ['You are awake! I am Pip, your lantern spirit.', 'Hit a training dummy with your blade to warm up.'])]));
    tr.push(T.enter('shrine', 'Rift shrine', R.start.x + 2, R.start.y - 1.8, 2.2, [T.checkpoint('Checkpoint: Whispering Vale'), T.heal(100)]));
    tr.push(T.enter('chest', 'Tutorial chest', C.x, C.y, 2.4, [T.loot('uncommon', 1, C.x, C.y, { gem: true }), T.dialogue('Pip', ['A weapon and a gem! Press I to open your bag and equip them.'])]));
    tr.push(T.enter('elder', 'The Elder Stone', P.x, P.y, 3, [T.dialogue('Elder Stone', ['Dreamwarden... the Gloam seeps from the Unwaking King.', 'Relight the four Dawn Shards. The rift south leads to the Misty Pinewood.']), T.quest('shard_root', 'The Shard of Root', 'Enter the Misty Pinewood and defeat Old Bramblehorn.')]));
    tr.push(T.enter('gems', 'Hidden gem cache', R.gemNook.x, R.gemNook.y, 2.2, [T.message('A hidden gem cache!'), T.loot('uncommon', 1, R.gemNook.x, R.gemNook.y, { gem: true })]));
  },
};
