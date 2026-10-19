'use strict';
// vale -- Whispering Vale hub, 38x38: arrival glade + dummy yard, Elder Stone plaza, cottage & garden, creek, terraced rift to the Ruins (NE),
// rift to the Pinewood (S), a tutorial chest nook and a hidden gem cache.
const valeRules = require('./_vale.js');

module.exports = {
  id: 'vale',
  opts: { W: 38, H: 38, seed: 2024, name: 'Whispering Vale', sub: 'A dream drifting above the clouds', theme: 'vale', objective: 'Explore. Rifts hum to the north-east and the south.', pad: 2.7, amp: 1.2 },
  patch: { f: 0.62, d: -1 },
  layout(g, T) {
    g.room('start', { kind: 'hub', x: 6.5, y: 29, r: 4, lvl: 0, label: 'ARRIVAL', clear: true });
    g.room('yard', { kind: 'clearing', x: 14, y: 31.5, r: 3.8, lvl: 0, label: 'DUMMY YARD', clear: true });
    g.room('plaza', { kind: 'plaza', x: 18.5, y: 19, r: 5, lvl: 0, label: 'ELDER PLAZA', clear: true });
    g.room('cottage', { kind: 'clearing', x: 8, y: 9, r: 5, lvl: 0, label: 'COTTAGE', clear: true, floor: 'f', floorIn: 2.5 });
    g.room('garden', { kind: 'clearing', x: 16, y: 8, r: 3.4, lvl: 0, label: 'GARDEN', clear: true, floor: 'f', floorIn: 0.5 });
    g.room('ruinsRift', { kind: 'plaza', x: 30.5, y: 7, r: 3.6, lvl: 4, label: 'RUINS RIFT', clear: true });
    g.room('pineRift', { kind: 'plaza', x: 24, y: 32.5, r: 3.2, lvl: 0, label: 'PINE RIFT', clear: true });
    g.room('nookChest', { kind: 'nook', x: 31.5, y: 24.5, r: 2.4, lvl: 2, label: 'CHEST', clear: true });
    g.room('isletGem', { kind: 'islet', x: 3, y: 18, r: 2.2, lvl: 0, label: 'SECRET', isolated: true });
    g.path('main', { kind: 'main', w: 2.6, meander: 2, every: 7, type: 'p', pts: ['start', 'yard', [20, 28], 'plaza'] });
    g.path('pine', { kind: 'branch', w: 2.6, meander: 1.6, type: 'p', from: { room: 'yard' }, pts: [[20, 33], 'pineRift'] });
    g.path('ruins', { kind: 'main2', w: 2.6, meander: 2.2, every: 7, type: 'p', from: { room: 'plaza' }, pts: [[25, 14, 2], [27, 10, 4], 'ruinsRift'] });
    g.path('cottage', { kind: 'branch', w: 2.2, meander: 1.6, type: 'p', from: { room: 'plaza' }, pts: [[13, 13], 'garden', [12, 9], 'cottage'] });
    g.path('chest', { kind: 'branch', w: 2, meander: 1.2, type: 'p', from: { near: [26, 22] }, pts: [[29, 23, 2], 'nookChest'] });
    g.path('secret', { kind: 'secret', w: 2, meander: 1, type: 'p', every: 5, from: { room: 'cottage' }, pts: [[4.2, 14.2, 0]] });
    g.river('creek', { w: 2.4, meander: 1.6, pts: [[36, 12], [31, 16], [28, 22], [30, 28], [29, 37]] });
    g.bridge({ x: 3, y: 15, axis: 'y', len: 2, w: 2, lvl: 0 });
  },
  populate(g, T) {
    const R = g.roomBy;
    g.setStart(R.start.x - 1.2, R.start.y + 1.2);
    g.house(R.cottage.x - 2, R.cottage.y - 3);
    g.portal(R.ruinsRift.x, R.ruinsRift.y - 0.3, 'ruins', { open: true, marker: true });
    g.portal(R.pineRift.x, R.pineRift.y + 0.3, 'pinewood', { open: true, marker: false });
    g.marker('elder_stone', R.plaza.x, R.plaza.y, { label: 'elder stone' });
    g.ring('plaza', 'crystal', 5, 0.55, { rot: 0.3 }); g.ring('plaza', 'lantern', 6, 0.95);
    g.marker('shrine', R.start.x + 2, R.start.y - 1.8, { label: 'checkpoint' });
    g.marker('sign', R.start.x + 2.8, R.start.y + 1, { label: 'sign', text: 'Training yard east. Elder Stone north-east.' });
    g.marker('chest', R.nookChest.x, R.nookChest.y, { label: 'tutorial-chest', tier: 'wood' });
    g.marker('gem_cache', R.isletGem.x, R.isletGem.y, { label: 'secret gem cache' });
    g.marker('tablet', R.cottage.x + 3.2, R.cottage.y + 2.4, { label: 'lore', text: 'Aerin\'s lantern burns low. Wake the Shards and the Vale will bloom again.' });
    g.ring('yard', 'lantern', 3, 0.9); g.ring('cottage', 'lantern', 3, 0.95); g.ring('ruinsRift', 'lantern_blue', 4, 0.9); g.ring('pineRift', 'lantern', 3, 0.9);
    g.scatter(valeRules(0.85));
    const tr = g.triggers, Y = R.yard, P = R.plaza, C = R.nookChest;
    tr.push(T.mapEnter('dummies', 'Training dummies', [T.spawn('dummy', 1, Y.x - 0.8, Y.y - 0.6, null, { instant: true }), T.spawn('dummy', 1, Y.x + 0.8, Y.y + 0.8, null, { instant: true })]));
    tr.push(T.mapEnter('intro', 'Pip wakes Aerin', [T.dialogue('Pip', ['You are awake! I am Pip, your lantern spirit.', 'Hit a training dummy with your blade to warm up.'])]));
    tr.push(T.enter('shrine', 'Rift shrine', R.start.x + 2, R.start.y - 1.8, 2.2, [T.checkpoint('Checkpoint: Whispering Vale'), T.heal(100)]));
    tr.push(T.enter('chest', 'Tutorial chest', C.x, C.y, 2.4, [T.loot('uncommon', 1, C.x, C.y), T.dialogue('Pip', ['A weapon! Press I to open your bag and equip it.'])]));
    tr.push(T.enter('elder', 'The Elder Stone', P.x, P.y, 3, [T.dialogue('Elder Stone', ['Dreamwarden... the Gloam seeps from the Unwaking King.', 'Relight the four Dawn Shards. The rift south leads to the Misty Pinewood.'])]));
    tr.push(T.enter('gems', 'Hidden gem cache', R.isletGem.x, R.isletGem.y, 2.2, [T.message('A hidden gem cache!'), T.loot('uncommon', 1, R.isletGem.x, R.isletGem.y)]));
  },
};
