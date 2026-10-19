'use strict';
// pinewood_boss -- compact Act I boss map (24x24): glade with shrine -> short winding road -> walled flagstone arena (Old Bramblehorn)
const forestRules = require('./_forest.js');
const BOSS = process.env.PINE_BOSS_ENEMY || 'troll';   // flip to 'bramblehorn' once WORLD_DATA.enemies has it

module.exports = {
  id: 'pinewood_boss',
  opts: { W: 24, H: 24, seed: 905, name: 'Bramblehorn\'s Court', sub: 'Where the old troll king holds his root-throne', theme: 'forest', objective: 'Climb to the root-throne.', pad: 2.6, amp: 0.8 },
  layout(g, T) {
    g.room('start', { kind: 'clearing', x: 4.5, y: 19.5, r: 3.2, lvl: 0, label: 'GLADE', clear: true });
    g.room('arena', { kind: 'arena', x: 14, y: 8.5, r: 7, lvl: 2, label: 'ARENA', clear: true, walled: true, pillars: 8, rune: 2.6, wall: 3 });
    g.room('nookChest', { kind: 'nook', x: 19.5, y: 20, r: 2.3, lvl: 2, label: 'CHEST', clear: true });
    g.path('main', { kind: 'main', w: 2.6, meander: 2.2, every: 6, pts: ['start', [10, 20.5, 0], [14, 15.5, 2], 'arena'] });
    g.path('chest', { kind: 'branch', w: 2, meander: 1.2, from: { near: [14, 16] }, pts: [[18, 18, 2], 'nookChest'] });
  },
  populate(g, T) {
    const R = g.roomBy, A = R.arena, S = R.start;
    g.setStart(S.x - 0.8, S.y + 0.8);
    g.portal(S.x + 0.8, S.y + 2.3, 'pinewood', { open: true });
    g.portal(A.x - 1.5, A.y - 3.5, 'ruins', { open: false, marker: true });
    g.portal(A.x + 2.5, A.y - 3.5, 'vale', { open: false });
    g.marker('shrine', S.x + 1.8, S.y - 1.3, { label: 'checkpoint' });
    g.marker('chest_gold', R.nookChest.x, R.nookChest.y, { label: 'boss-ledge-chest' });
    g.ring('arena', 'brazier', 4, 0.62, { rot: 0.8 });
    g.scatter(forestRules(0.42));
    for (const [dx, dy] of [[-2.5, 1.8], [2.4, -2.2]]) g.addObj('pine_giant', A.x + dx * 3.3, A.y + dy * 3.3 + 1, { force: true, v: 1, sp: 2 });
    const tr = g.triggers;
    tr.push(T.mapEnter('intro', 'Pip warns', [T.dialogue('Pip', ['Aerin... the ground is shaking. That is the troll king.'])]));
    tr.push(T.enter('shrine', 'Rift shrine', S.x + 1.8, S.y - 1.3, 2.2, [T.checkpoint('Checkpoint: Bramblehorn\'s Court'), T.heal(100)]));
    tr.push(T.enter('boss', 'Old Bramblehorn', A.x, A.y, 4.8, [
      T.banner('Old Bramblehorn', 'The Troll King - Shard of Root', true), T.objective('Defeat Old Bramblehorn'), T.shake(6), T.wait(1.5),
      T.spawn(BOSS, 1, A.x, A.y - 1.5, 0.5, { elite: true }),
      T.wait(14), T.banner('He calls his kin!', 'Ogres storm the court'), T.spawn('ogre', 2, A.x - 2, A.y + 3, 2),
      T.wait(14), T.spawn('ogre', 2, A.x + 2, A.y + 3, 2),
    ]));
    tr.push(T.allDead('victory', 'Bramblehorn falls', ['boss'], [
      { type: 'clear_enemies' },
      T.banner('Victory', 'The Shard of Root is relit'), T.dialogue('Old Bramblehorn', ['I only wished... to keep the roots from rotting... Morrow is no king. He is a sleeper who will not wake.']),
      T.heal(100), T.loot('legendary', 1, A.x, A.y), T.openPortal(1), T.openPortal(2), T.objective('Take the rift to the Gloomspire Ruins, or return home'), T.sound('portal'),
    ]));
  },
};
