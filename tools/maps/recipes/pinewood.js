'use strict';
// pinewood  --  Act I outer map, 56x56.  Rooms: Glade of Arrival (shrine) -> Sunlit Clearing -> Stone Plaza -> Troll Hollow (rift to boss map)
const forestRules = require('./_forest.js');
const BOSS = process.env.PINE_BOSS_ENEMY || 'troll';   // flip to 'bramblehorn' once WORLD_DATA.enemies has it

module.exports = {
  id: 'pinewood',
  opts: { W: 56, H: 56, seed: 4107, name: 'Misty Pinewood', sub: 'The trees are leaning away from something', theme: 'forest', objective: 'Follow the dirt road north. The animals are fleeing.', pad: 3.6, amp: 1.7 },
  layout(g, T) {
    g.room('start', { kind: 'clearing', x: 7, y: 48, r: 4, lvl: 0, label: 'GLADE', clear: true });
    g.room('clearA', { kind: 'clearing', x: 38, y: 40, r: 6.5, lvl: 2, label: 'ROOM1 CLEARING', clear: true });
    g.room('plazaB', { kind: 'plaza', x: 20, y: 13, r: 6.5, lvl: 4, label: 'ROOM2 PLAZA', clear: true, shape: 'square' });
    g.room('hollowC', { kind: 'chamber', x: 46, y: 9, r: 6, lvl: 4, label: 'ROOM3 HOLLOW', clear: true, walled: true });
    g.room('nookTablet', { kind: 'nook', x: 22, y: 51, r: 2.8, lvl: 0, label: 'TABLET', clear: true });
    g.room('denElite', { kind: 'nook', x: 52, y: 47, r: 3.2, lvl: 2, label: 'ELITE', clear: true });
    g.room('isletSecret', { kind: 'islet', x: 5, y: 4.5, r: 2.6, lvl: 4, label: 'SECRET', isolated: true });
    g.room('flatW', { kind: 'flat', x: 23, y: 27, r: 4.5, lvl: 2 });
    g.room('flatE', { kind: 'flat', x: 49.5, y: 31, r: 4, lvl: 2 });

    g.path('main', { kind: 'main', w: 2.6, meander: 4.2, every: 7, pts: ['start', [7, 38], [13, 31], [23, 27, 2, 4.5], [31, 33], 'clearA', [49.5, 31, 2, 4], [44, 21, 4], [34, 23], [27, 19], 'plazaB', [30, 6], [38, 4], 'hollowC'] });
    g.path('tablet', { kind: 'branch', w: 2, meander: 1.5, from: { room: 'clearA' }, pts: [[30, 47, 0], 'nookTablet'] });
    g.path('elite', { kind: 'branch', w: 2, meander: 1.5, from: { room: 'clearA' }, pts: [[47, 45, 2], 'denElite'] });
    g.path('shortcut', { kind: 'loop', w: 2, meander: 2.5, from: { room: 'plazaB' }, pts: [[10, 18, 2], [4, 28, 2], [4, 38, 0], [7, 43, 0]] });
    g.path('secret', { kind: 'secret', w: 2, meander: 1.2, type: 'd', every: 6, from: { near: [14, 9] }, pts: [[9, 6.2, 4]] });
    g.river('creek', { w: 2.6, pts: [[0, 21], [12, 25], [23, 27], [36, 30], [49.5, 31], [55, 33]] });
    g.bridge({ x: 9, y: 4, axis: 'x', len: 3, w: 2, lvl: 4 });
  },
  populate(g, T) {
    const clr = g.roomBy;
    g.setStart(clr.start.x - 0.5, clr.start.y + 0.8);
    // portals: home rift beside the glade, boss rift in the hollow (closed until cleared)
    g.portal(clr.start.x - 3, clr.start.y + 2.6, 'vale', { open: true });
    g.portal(clr.hollowC.x + 1.5, clr.hollowC.y - 0.5, 'pinewood_boss', { open: false, marker: true });
    // landmarks & interactables
    g.marker('shrine', clr.start.x + 1.8, clr.start.y - 1.2, { label: 'checkpoint' });
    g.marker('lantern', clr.start.x + 0.2, clr.start.y - 2.6);
    g.marker('tablet', clr.nookTablet.x, clr.nookTablet.y - 0.8, { label: 'lore', text: 'The Wardens planted the first pines to hold the Gloam back. Now the roots are black.' });
    g.marker('chest', clr.nookTablet.x + 1.3, clr.nookTablet.y + 0.6, { label: 'tablet-chest', tier: 'wood' });
    g.marker('chest_silver', clr.denElite.x, clr.denElite.y - 0.4, { label: 'elite-chest' });
    g.marker('rune_cache', clr.isletSecret.x, clr.isletSecret.y, { label: 'secret socket rune' });
    g.marker('sign', clr.start.x + 3.2, clr.start.y - 3.4, { label: 'sign', text: 'North: Troll Hollow. Mind the creek.' });
    g.marker('sign', 30.5, 33.5, { label: 'sign2', text: 'Danger: ogres in the clearing' });
    for (const [rid, k] of [['clearA', 3], ['plazaB', 4], ['hollowC', 4]]) { const rm = clr[rid]; g.ring(rid, 'lantern', k, 0.92); }
    // standing stones round the plaza, logs and stumps at the clearing rim
    g.ring('plazaB', 'rock_dark', 8, 1.0, { vn: 1 }); g.ring('clearA', 'stump', 5, 0.9); g.ring('clearA', 'log', 3, 0.78, { rot: 0.4 });
    // landmark: the Elder Pine cluster on the highest ledge above the hollow, visible from afar
    for (const [dx, dy] of [[-2, -2], [2.2, -1.4], [0.3, 2.4]]) g.addObj('pine_giant', clr.hollowC.x + dx - 7, clr.hollowC.y + dy + 7, { v: 1, force: true, sp: 2.5 });
    g.scatter(forestRules(1));
    // wildlife in the quiet places
    for (const [x, y] of [[13, 44], [30, 46], [28, 28], [10, 33]]) { const q = g.nearWalkable(x, y, 2); g.addObj('fox', q.x, q.y); }
    for (const [x, y] of [[9, 45], [16, 36], [33, 38], [25, 30], [6, 30], [40, 22]]) { const q = g.nearWalkable(x, y, 2); g.addObj('rabbit', q.x, q.y); }
    for (const rid of ['clearA', 'start']) { const rm = clr[rid]; g.addObj('sunbeam', rm.x + 2.2, rm.y + 1.4, { force: true }); }
    // ---- triggers ----
    const A = clr.clearA, B = clr.plazaB, C = clr.hollowC, E = clr.denElite;
    const tr = g.triggers;
    tr.push(T.mapEnter('intro', 'Pip speaks', [T.dialogue('Pip', ['The animals are running. Something big has woken in the pinewood.'])]));
    tr.push(T.enter('shrine', 'Rift shrine', clr.start.x + 1.8, clr.start.y - 1.2, 2.2, [T.checkpoint('Checkpoint: Glade of Arrival'), T.heal(100)]));
    tr.push(T.enter('tablet', 'Lore tablet', clr.nookTablet.x, clr.nookTablet.y, 2.2, [T.message('Tablet: The Wardens planted the first pines to hold the Gloam back. Now the roots are black.')]));
    tr.push(T.enter('ogres1', 'Ogres in the clearing', A.x, A.y, 5.2, [
      T.banner('Ogres!', 'Lesser brutes guard the sunlit clearing'), T.objective('Defeat the ogres'),
      T.spawn('ogre', 2, A.x + 1, A.y - 3, 2), T.wait(9), T.banner('More ogres!', 'They came running'), T.spawn('ogre', 2, A.x - 2, A.y + 2, 2),
    ]));
    tr.push(T.allDead('ogres1_done', 'Clearing cleared', ['ogres1'], [T.message('Heavy footsteps echo to the north...'), T.heal(25), T.loot('uncommon', 1, A.x, A.y), T.objective('Follow the road north to the stone plaza')]));
    tr.push(T.enter('plaza', 'Ogres at the plaza', B.x, B.y, 5.2, [
      T.banner('The Stone Plaza', 'A troll leads the pack'), T.objective('Defeat the pack'),
      T.spawn('ogre', 3, B.x - 2, B.y + 2, 2.5), T.wait(10), T.spawn('troll', 1, B.x + 2, B.y - 2, 1.5, { elite: true }), T.spawn('ogre', 1, B.x, B.y + 3, 2),
    ], ['ogres1_done']));
    tr.push(T.allDead('plaza_done', 'Plaza cleared', ['plaza'], [T.message('The way to the hollow is clear.'), T.heal(30), T.loot('uncommon', 1, B.x, B.y), T.objective('Enter Troll Hollow (north-east)')]));
    tr.push(T.enter('elite', 'Elite troll in the den', E.x, E.y, 3.4, [T.banner('Mountain Troll', 'It guards a silver chest', true), T.spawn('troll', 1, E.x - 1, E.y, 1.2, { elite: true })], ['ogres1_done']));
    tr.push(T.allDead('elite_done', 'Troll defeated', ['elite'], [T.message('The silver chest is unguarded.'), T.loot('rare', 1, E.x, E.y)]));
    tr.push(T.enter('hollow', 'Troll Hollow', C.x, C.y, 5.5, [
      T.banner('Troll Hollow', 'Old Bramblehorn\'s court', true), T.objective('Break the hollow guard'),
      T.spawn('ogre', 2, C.x - 2, C.y + 2, 2), T.wait(9), T.spawn('troll', 1, C.x, C.y - 2, 1.5), T.spawn('ogre', 2, C.x + 1, C.y + 3, 2),
    ], ['plaza_done']));
    tr.push(T.allDead('hollow_done', 'Hollow cleared', ['hollow'], [T.banner('The rift opens', 'Old Bramblehorn waits beyond'), T.heal(40), T.loot('rare', 1, C.x, C.y), T.openPortal(1), T.objective('Step through the rift to face Old Bramblehorn'), T.sound('portal')]));
    tr.push(T.enter('secret', 'Hidden cache', clr.isletSecret.x, clr.isletSecret.y, 2.4, [T.message('A hidden cache! You found a Socket Rune.'), T.loot('rare', 1, clr.isletSecret.x, clr.isletSecret.y), T.sound('heal')]));
  },
};
