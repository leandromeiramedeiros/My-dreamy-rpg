'use strict';
// vale -- Whispering Vale hub, 80x80 (docs/design/world-maps.md). The 40x40 hub grown ~1.6x around the cottage, with the start cluster pulled
// together so the beats keep their rhythm: the dummies and the Elder Stone sit within 15 tiles of the start, the first chest at 10.
// HOOK: you wake in a dream above the clouds -- one new noun every ~minute (docs/design/world-maps.md): dummies teach swing, dodge and Q; the Elder
//       Stone gives a riddle and the lost-lantern quest; a chest with a fishing spot beside it; a garden ambush of three slimes (first
//       drop, first kill-heal) whose end opens the Pinewood rift. Level band [1,3].
// SECTIONS (map.sections): hub (outer) -- the whole grid by default; Moon Pond (SE, night fishing + the pearl ritual, behind a fallen-tree
//   gate that opens after Act IV); Pip's Lanterns (NW islet, its bridge opens with the Spire key); Dream Arena (E islet, arena kind, its
//   bridge opens after Act I: the Pinewood victory hands out key_dream, the Vale's keydoor takes it). 2 shrines (start, rift terrace).
// BEATS (ids unchanged): wake (Pip) -> dummies -> yard lesson -> Elder Stone + quest vale_lantern -> first chest + fishing stub -> cottage tablet
//   -> garden ambush -> pine rift opens (shard_root step 0) -> lantern found / returned -> hidden gem cache. Return rift home lands at vale.pine.
// PACING (the required route is ~6 min; every branch <= 12 s of walking): see the timing block build.js prints.
const { registerPortals, placePortals, nearRoomEdge } = require('../stamps.js');
const { buildTiming } = require('../zone.js');
const valeRules = require('./_vale.js');
const { DIALOGUE } = require('../gamedata.js');

const ROOMS = {
  start: { x: 30, y: 56, r: 4.5 }, terrace: { x: 60, y: 22, r: 8.3 }, pine: { x: 49, y: 69, r: 3.6 },
};
const S = {
  id: 'vale',
  rooms: ROOMS,
  portals: {
    ruins: { room: 'terrace', dx: -3.5, dy: -2, to: 'ruins', marker: true },
    grotto: { room: 'terrace', dx: 3.8, dy: -2.6, to: 'grotto', open: false },
    caldera: { room: 'terrace', dx: -2.6, dy: 3.8, to: 'caldera', open: false },
    spire: { room: 'terrace', dx: 3.8, dy: 3.4, to: 'spire', open: false },
    pine: { room: 'pine', dx: 0, dy: 0.3, to: 'pinewood', open: false },   // opens when the garden ambush is cleared
  },
};
registerPortals(S);

module.exports = {
  id: 'vale',
  opts: { W: 80, H: 80, seed: 2024, name: 'Whispering Vale', sub: 'A dream drifting above the clouds', theme: 'vale', objective: 'Hit the training dummies', pad: 3.6, amp: 1.2, level: [1, 3] },
  patch: { f: 0.62, d: -1 },
  layout(g, T) {
    g.section('hub', { name: 'Whispering Vale', kind: 'outer', bounds: [0, 0, 80, 80] });
    g.section('moon', { name: 'Moon Pond', kind: 'outer', bounds: [54, 58, 80, 80], ambient: '#9fb4ff', dark: 0.25 });
    g.section('lanterns', { name: 'Pip\'s Lanterns', kind: 'outer', bounds: [6, 0, 22, 12], ambient: '#ffe2b0', dark: 0.15 });
    g.section('arena', { name: 'Dream Arena', kind: 'arena', bounds: [66, 34, 80, 48] });
    g.room('start', { kind: 'hub', x: 30, y: 56, r: 4.5, lvl: 0, label: 'ARRIVAL', clear: true });
    g.room('yard', { kind: 'clearing', x: 39, y: 64, r: 4.2, lvl: 0, label: 'DUMMY YARD', clear: true });
    g.room('plaza', { kind: 'plaza', x: 39, y: 47.5, r: 5.5, lvl: 0, label: 'ELDER PLAZA', clear: true });
    g.room('cottage', { kind: 'clearing', x: 22, y: 26, r: 7.5, lvl: 0, label: 'COTTAGE', clear: true, floor: 'f', floorIn: 3 });
    g.room('garden', { kind: 'clearing', x: 36, y: 23, r: 5, lvl: 0, label: 'GARDEN', clear: true, floor: 'f', floorIn: 0.5 });
    g.room('terrace', { kind: 'plaza', x: 60, y: 22, r: 8.3, lvl: 4, label: 'RIFT TERRACE', clear: true });
    g.room('pine', { kind: 'plaza', x: 49, y: 69, r: 3.6, lvl: 0, label: 'PINE RIFT', clear: true });
    g.room('nookChest', { kind: 'nook', x: 21, y: 51, r: 2.2, lvl: 0, label: 'CHEST', clear: true });
    g.room('gemNook', { kind: 'nook', x: 6, y: 21, r: 2.1, lvl: 0, label: 'SECRET', clear: true });
    g.room('ledge', { kind: 'nook', x: 57, y: 36, r: 2.3, lvl: 2, label: 'LEDGE', clear: true });
    g.room('moon', { kind: 'clearing', x: 66, y: 68, r: 5.5, lvl: 0, label: 'MOON POND', clear: true });
    g.room('lanterns', { kind: 'islet', x: 13, y: 6, r: 3.6, lvl: 0, label: 'LANTERNS', isolated: true, shape: 'round' });
    g.room('dreamArena', { kind: 'arena', x: 74, y: 41, r: 5.6, lvl: 0, label: 'DREAM ARENA', isolated: true, rune: 2.4 });
    g.pond('pondW', { x: 15, y: 55.5, r: 3.2, lvl: 0 });
    g.pond('pondE', { x: 58, y: 51, r: 5.4, lvl: 0 });
    g.pond('moonpond', { x: 70, y: 71, r: 3.4, lvl: 0 });
    g.path('main', { kind: 'main', w: 2.4, meander: 2.4, every: 7, type: 'p', pts: ['start', 'yard', [49, 56], 'plaza'] });
    g.path('pine', { kind: 'main', w: 2.4, meander: 1.8, every: 7, type: 'p', from: { room: 'yard' }, pts: [[44, 67], 'pine'] });
    g.path('ruins', { kind: 'main', w: 2.4, meander: 2.2, every: 7, type: 'p', from: { room: 'plaza' }, pts: [[49, 41, 0], [53, 33, 2], [56, 27, 4], 'terrace'] });
    g.path('cottage', { kind: 'main', w: 2.2, meander: 2, every: 7, type: 'p', from: { room: 'plaza' }, pts: [[39, 35], 'garden', [29, 24], 'cottage'] });
    g.path('arenaBridge', { kind: 'branch', w: 2.2, meander: 1.4, every: 7, type: 'p', from: { room: 'plaza' }, pts: [[50, 44, 0], [58, 43.5, 0], [62.8, 40.8, 0]] });
    g.path('lanternsBridge', { kind: 'branch', w: 2.2, meander: 1.4, every: 7, type: 'p', from: { path: 'cottage', room: 'cottage' }, pts: [[18, 19, 0], [13.2, 14.6, 0]] });
    g.path('moonPath', { kind: 'branch', w: 2.2, meander: 1.2, every: 7, type: 'p', from: { path: 'pine', room: 'pine' }, pts: [[57, 69.5, 0], 'moon'] });
    g.path('chest', { kind: 'branch', w: 1.8, meander: 1.2, type: 'p', from: { room: 'start' }, pts: [[25, 52.5, 0], 'nookChest'] });
    g.path('ledge', { kind: 'branch', w: 1.8, meander: 1.2, type: 'p', from: { path: 'ruins', near: [52, 36] }, pts: [[55, 36.5, 2], 'ledge'] });
    g.path('secret', { kind: 'secret', w: 1.8, meander: 1, type: 'p', every: 5, from: { path: 'cottage', room: 'cottage' }, pts: [[11, 23, 0], 'gemNook'] });
    g.bridge({ x: 12, y: 9, axis: 'y', len: 5, w: 2, lvl: 0 });   // Pip's Lanterns (NW)
    g.bridge({ x: 64, y: 40, axis: 'x', len: 5, w: 2, lvl: 0 });   // Dream Arena (E)
    // §29 G3 THE DREAMER'S CAIRN (world-art minutes §3.2): the rift terrace (4) is the first of three leaning plateaus 4 / 9 / 14 (84 px),
    // the 9 a promontory over the garden, the 14 the Stone's Crown. 4 -> 9: a two-leg switchback on the 9's east face (seen from the
    // terrace); 9 -> 14: a root ladder on the Crown's south face; 9 -> 0: a drop-down into the garden (the shortcut home).
    // Signature moment: the first look over the cloud sea from the Crown (camera: the Crown, facing south).
    g.stack('cairn', { levels: [4, 9, 14], r: [7.2, 5, 2.8], centres: [[55.6, 15], [49.5, 16.5], [47, 18]], over: [1, 2], rough: 0.16, bare: [2], sparse: { 1: 0.22 }, floor: [null, null, 'x'] });   // the Crown: old flagstones
    // level rhythm (minutes §3.1.1): two soft knolls of layered chalk (walls at step 3) between the bed and the Stone, and by the Moon Pond
    g.stack('knollPlaza', { land: true, levels: [3], r: [2.4], centres: [[33.4, 51.2]], rough: 0.22, sparse: { 0: 0.4 } });
    g.stack('knollMoon', { land: true, levels: [3], r: [2.0], centres: [[63.6, 60.2]], rough: 0.22, sparse: { 0: 0.4 } });
    g.lobe(47.2, 24, 3.8, 0); g.room('cairnLawn', { kind: 'flat', x: 48.6, y: 23.4, r: 2.9, lvl: 0, side: true });   // the garden's east lawn: the drop's landing
    g.switchback('cairnUp', { w: 2, pts: [[57.4, 21.6, 4], [56.6, 17.4, 5.2, 0.3], [56.4, 13.4, 6.6, 0.6], [55, 12.4, 6.6, 0.4], [54.1, 14.2, 7, 0.3], [54, 18.4, 9, 0.5], [52.4, 18.6, 9]] });
  },
  populate(g, T) {
    const R = g.roomBy, C0 = R.nookChest, tr = g.triggers;
    g.setStart(R.start.x - 1.2, R.start.y + 1.2);
    g.house(R.cottage.x - 2, R.cottage.y - 3);
    placePortals(g, S);
    // ---- beats, objects
    g.marker('elder_stone', R.plaza.x, R.plaza.y, { label: 'elder stone', text: 'Past the cottage, where the path ends, a light waits.' }); g.poi('elder', R.plaza.x, R.plaza.y);
    g.ring('plaza', 'crystal', 5, 0.55, { rot: 0.3 }); g.ring('plaza', 'lantern', 6, 0.95);
    const shrA = { x: R.start.x + 2, y: R.start.y - 1.8 }, shrB = { x: R.terrace.x - 6, y: R.terrace.y + 4.6 };
    g.marker('shrine', shrA.x, shrA.y, { id: 'shrine_start', name: 'The Dreamer\'s bed', label: 'checkpoint', warp: true }); g.poi('shrine', shrA.x, shrA.y);
    const sb = g.nearWalkable(shrB.x, shrB.y, 1.5); g.marker('shrine', sb.x, sb.y, { id: 'shrine_terrace', name: 'Rift terrace', label: 'checkpoint', warp: true }); g.poi('shrine', sb.x, sb.y);
    g.marker('chest', C0.x, C0.y, { label: 'tutorial-chest', tier: 'wood', starter: true, loot: 'ring' }); g.poi('chest', C0.x, C0.y);   // starter: true -> items.js starterLoot() (weapon, armour, gem); loot: 'ring' -> the Origin ring (§28)
    g.marker('gem_cache', R.gemNook.x, R.gemNook.y, { label: 'secret gem cache' }); g.poi('secret', R.gemNook.x, R.gemNook.y);
    g.marker('chest_silver', R.ledge.x, R.ledge.y, { label: 'ledge-chest' }); g.poi('chest', R.ledge.x, R.ledge.y);
    const fa = g.waterEdge(C0.x - 1, C0.y + 3.5, 7), fb = g.waterEdge(R.plaza.x + 13, R.plaza.y + 2, 9), fm = g.waterEdge(70, 69, 6);
    g.marker('fishspot', fa.x, fa.y, { pool: 'vale_a' }); g.marker('fishspot', fb.x, fb.y, { pool: 'vale_b' }); g.marker('fishspot', fm.x, fm.y, { pool: 'vale_moon' });
    g.poi('fish', fa.x, fa.y); g.poi('fish', fb.x, fb.y); g.poi('fish', fm.x, fm.y);
    const tabP = { x: R.cottage.x + 3.2, y: R.cottage.y + 2.4 };
    g.marker('tablet', tabP.x, tabP.y, { label: 'lore', title: 'Tablet', text: DIALOGUE.vale_tablet.lines.join(' ') }); g.poi('tablet', tabP.x, tabP.y);
    const LAN = g.nearWalkable(R.gemNook.x + 1.3, R.gemNook.y + 0.9, 0.6);
    g.marker('lantern_blue', LAN.x, LAN.y, { label: 'lost-lantern' });                                 // the Stone's lost lantern (quest vale_lantern)
    g.ring('yard', 'lantern', 3, 0.9); g.ring('cottage', 'lantern', 4, 0.95); g.ring('terrace', 'lantern_blue', 6, 0.95); g.ring('pine', 'lantern', 3, 0.9);
    for (const k of ['start', 'yard', 'plaza', 'cottage', 'garden', 'terrace', 'pine']) g.poi('room', R[k].x, R[k].y);
    // ---- §29 G3 the Dreamer's Cairn: root ladder 9 -> 14, the Crown (vantage + the light set where the dream could see itself), the drop home
    {
      const CR = g.stacks[0].rings[2];
      g.climb('cairn_roots', { x: 50.2, y: 18.5, to: { x: 49.2, y: 18.5 } });
      g.drop('cairn_drop', { rect: [47, 21, 52, 23] });
      g.addObj('brazier', CR.x - 0.6, CR.y - 0.9, { force: true, sp: 1 }); g.addObj('crystal_violet', CR.x + 0.9, CR.y - 0.5, { force: true, sp: 0.6 }); g.addObj('crystal', CR.x - 1.3, CR.y + 0.4, { force: true, sp: 0.6 });
      g.marker('tablet', CR.x + 0.4, CR.y + 0.9, { label: 'lore', title: 'The Stone\'s Crown', text: 'The first light was set here, where the dream could see itself.' }); g.poi('landmark', CR.x, CR.y);
      tr.push(T.enter('crown', 'The Stone\'s Crown', CR.x, CR.y, 1.9, [T.vantage('crown', 40, { title: 'The Stone\'s Crown', sub: 'Three rifts, two islets, and the cloud sea' }), T.wait(3.7), T.dialogue('Pip', ['So that is the whole dream. It looked bigger from the bed.'])]));
      tr.push(T.enter('cairn_ledge', 'The garden ledge', 49.6, 20.4, 1.6, [T.dialogue('Pip', ['Straight down is the garden. A short way home, if you trust your knees.'])]));
    }
    // ---- sections: Pip's Lanterns islet (NW), Dream Arena islet (E), Moon Pond (SE)
    {
      const L = R.lanterns, A = R.dreamArena, M = R.moon;
      for (const [dx, dy] of [[-1.6, 0.4], [1.7, -0.2], [0.1, -1.7]]) g.addObj('lantern_blue', L.x + dx, L.y + dy, { force: true, sp: 1 });
      g.marker('chest_silver', L.x + 0.2, L.y + 1.2, { label: 'lanterns-chest' }); g.poi('islet', L.x, L.y);
      g.ring('dreamArena', 'brazier', 4, 0.8, { rot: 0.5 }); g.ring('dreamArena', 'lantern_blue', 4, 0.55, { rot: 1.1 }); g.poi('islet', A.x, A.y);
      g.marker('tablet', A.x - 2, A.y + 2.6, { label: 'lore', title: 'Dream Arena', text: 'Pip keeps the score. Later, when the nights are longer.' });
      // bridges: keyed barriers on the approach side (the far end from the islet)
      const gateAt = (bi, islet) => { const b = g.bridges[bi], e0 = b.axis === 'x' ? [[b.x + 0.4, b.y + b.w / 2], [b.x + b.len - 0.4, b.y + b.w / 2]] : [[b.x + b.w / 2, b.y + 0.4], [b.x + b.w / 2, b.y + b.len - 0.4]]; e0.sort((p, q) => Math.hypot(q[0] - islet.x, q[1] - islet.y) - Math.hypot(p[0] - islet.x, p[1] - islet.y)); return { x: e0[0][0], y: e0[0][1], ang: b.axis === 'x' ? 0 : 1.57, len: b.w }; };
      const gl = gateAt(0, L), ga = gateAt(1, A);
      g.addObj('keydoor', gl.x, gl.y, { id: 'bridge_lanterns', key: 'key_spire', ang: gl.ang, len: gl.len, force: true, sp: 0.1 }); g.poi('bridge', gl.x, gl.y);
      g.addObj('keydoor', ga.x, ga.y, { id: 'bridge_arena', key: 'key_dream', ang: ga.ang, len: ga.len, force: true, sp: 0.1 }); g.poi('bridge', ga.x, ga.y);
      tr.push(T.enter('bridge_lanterns_hint', 'Pip\'s Lanterns bridge', gl.x, gl.y, 3.4, [T.dialogue('Pip', ['Those are my lanterns. The bridge wants a Spire key.'])]));
      tr.push(T.enter('bridge_arena_hint', 'Dream Arena bridge', ga.x, ga.y, 3.4, [T.message('The Dream Arena bridge is sealed. Finish the Pinewood first.')]));
      tr.push(T.enter('lanterns_islet', 'Pip\'s Lanterns', L.x, L.y, 3, [T.banner('Pip\'s Lanterns', 'Three lights wait for the Spire'), T.dialogue('Pip', ['Still unlit. I was saving them for a bad night.'])]));
      tr.push(T.enter('arena_islet', 'Dream Arena', A.x, A.y, 4, [T.banner('Dream Arena', 'A ring of dream-glass, waiting for you')]));
      // the Moon Pond: a fallen-tree gate on the road east of the Pinewood rift; opens after Act IV (key_act4 until the quest-state hook exists)
      const mg = nearRoomEdge(g, 'moonPath', 'moon', -1, 2.2);
      g.addObj('keydoor', mg.x, mg.y, { id: 'gate_moon', key: 'key_act4', ang: Math.round(mg.ang * 100) / 100, len: 2.2, force: true, sp: 0.1 }); g.poi('gate', mg.x, mg.y);
      for (const [dx, dy] of [[-3.2, -2.4], [3.4, -2.2], [-0.2, -3.6]]) g.addObj('lantern_blue', M.x + dx, M.y + dy, { force: true, sp: 1 });
      g.addObj('brazier', M.x + 0.4, M.y - 1.2, { force: true, sp: 2 }); g.marker('tablet', M.x - 2.6, M.y + 1.6, { label: 'lore', title: 'Moon Pond', text: 'Pearls rise when the moon is full. Bring a lantern and patience.' }); g.poi('pond', M.x, M.y);
      tr.push(T.enter('moon_gate_hint', 'The fallen tree', mg.x, mg.y, 3.4, [T.message('A fallen tree blocks the road. It will not move until the fourth Shard is lit.')]));
      tr.push(T.enter('moon_pond', 'Moon Pond', M.x, M.y, 4.5, [T.banner('Moon Pond', 'Night fishing and the pearl ritual'), T.dialogue('Pip', ['Quiet water. Even I whisper here.'])]));
    }
    g.scatter(valeRules(2.4).map(r => Object.assign({}, r, { p: c => ((g.secAt(c.x, c.y) || {}).id === 'moon' ? r.p(c) * 0.5 : r.p(c)) })));
    // density: a point of interest every <= 13.5 tiles along every walking path, a landmark rhythm of ~30 tiles
    for (const nm of ['main', 'pine', 'ruins', 'cottage']) g.fillWaysides(nm, { max: 13.5, set: 'forest' });
    g.landmark(R.terrace.x + 5, R.terrace.y + 6.5); g.fillLandmarks('main', { every: 30, set: 'forest' }); g.fillLandmarks('cottage', { every: 30, set: 'forest' }); g.fillLandmarks('ruins', { every: 30, set: 'forest' });
    // ---- triggers
    const Y = R.yard, P = R.plaza, C = R.nookChest, GD = R.garden, S0 = R.start, pineIdx = g.portalIdx.pine;
    tr.push(T.mapEnter('banner', 'Zone banner', [T.say('vale_banner')]));
    tr.push(T.mapEnter('dummies', 'Training dummies', [T.spawn('dummy', 1, Y.x - 0.8, Y.y - 0.6, null, { instant: true }), T.spawn('dummy', 1, Y.x + 0.8, Y.y + 0.8, null, { instant: true })]));
    // §28 the opening: the hero wakes bare; the HUD shows one noun at a time; the first kit lies in the world (sword in the grass, cap on the bed)
    const SW = { x: Y.x - 1.5, y: Y.y - 4 }, CAP = { x: R.cottage.x - 0.8, y: R.cottage.y - 0.6 };
    tr.push(T.enter('wake', 'Pip wakes Aerin', S0.x, S0.y, 7, [T.wait(3), T.noun('move'), T.say('vale_wake'), T.dialogue('Pip', ['Training dummies are south-east. Hit one.']), T.objective('Hit the training dummies', SW.x, SW.y)]));
    // opening: true -> a bare-start beat only (game.js updateTriggers skips it for a save from before §28)
    tr.push({ id: 'days', name: 'Pip: three days', opening: true, when: { type: 'timer', after: 'wake', seconds: 20 }, requires: ['wake'], actions: [T.dialogue('Pip', ['Three days. You\'ve been asleep three days.']), T.noun('vale')] });
    tr.push(T.mapEnter('sword', 'The sword in the grass', [T.gear('rustyblade', SW.x, SW.y)]));
    tr.push(T.mapEnter('cottage_cap', 'The cap on the child\'s bed', [T.gear('ironcap', CAP.x, CAP.y)]));
    const rep = t => { t.once = false; return t; };
    tr.push(rep(T.enter('shrine', 'Dreamer\'s bed', shrA.x, shrA.y, 2.2, [T.checkpoint('Checkpoint: Whispering Vale'), T.heal(100)])));
    tr.push(rep(T.enter('shrine_terrace', 'Rift terrace shrine', sb.x, sb.y, 2.2, [T.checkpoint('Checkpoint: Rift terrace'), T.heal(100)])));
    tr.push(T.enter('yard_teach', 'Dummy yard lesson', Y.x, Y.y, 3.6, [T.noun('dodge'), T.dialogue('Pip', ['Swing. Then dodge. Then try your Q skill.', 'The dummy never hits back. Lucky thing.']), T.objective('Open the chest west of the bed', C.x, C.y)]));
    tr.push(T.enter('elder', 'The Elder Stone', P.x, P.y, 3, [T.say('vale_elder'), T.dialogue('Elder Stone', ['The Stone lost a light. Past the cottage, a path ends.']), T.step('vale_lantern', 0), T.objective('Find the lost lantern past the cottage', R.cottage.x, R.cottage.y)]));
    tr.push(T.enter('chest', 'Tutorial chest', C.x, C.y, 2.6, [T.dialogue('Pip', ['A chest! Interact to open it.']), T.wait(4), T.say('vale_chest'), T.dialogue('Pip', ['Open your bag and equip it.']), T.objective('Follow the path to the Elder Stone', P.x, P.y)]));
    tr.push(T.enter('fish_hint', 'Fishing spot', fa.x, fa.y, 3.4, [T.message('Ripples in the water. Interact to cast.')]));
    tr.push(T.enter('gems', 'Hidden gem cache', R.gemNook.x, R.gemNook.y, 2.2, [T.message('A hidden gem cache!'), T.loot('uncommon', 1, R.gemNook.x, R.gemNook.y, { gem: true })]));
    tr.push(T.enter('tablet', 'Cottage tablet', tabP.x, tabP.y, 2.4, [T.say('vale_tablet')]));
    tr.push(T.enter('garden_ambush', 'Gloom in the garden', GD.x, GD.y, 3.6, [
      T.noun('potion'), T.banner('Gloom in the garden', 'Slimes ooze out of the flowers'), T.spawn('gloomslime', 1, GD.x - 1.6, GD.y - 0.6, 1.2), T.spawn('gloomslime', 1, GD.x + 1.8, GD.y + 0.4, 1.2), T.spawn('gloomslime', 1, GD.x, GD.y + 1.8, 1.2),
    ], ['elder']));
    tr.push(T.allDead('garden_done', 'Garden cleared', ['garden_ambush'], [
      T.message('The garden is quiet. Something hums in the south.'), T.heal(40), { type: 'loot', item: 'ironboots', rarity: 'common', x: GD.x, y: GD.y },   // §28 the Iron Boots (items.js lootAction: put on if the slot is empty)
      T.openPortal(pineIdx), T.sound('portal'), T.banner('The Pinewood rift opens', 'South of the yard'), T.say('vale_rift'),
      T.step('shard_root', 0), T.objective('Take the rift to the Pinewood'),
    ]));
    tr.push(T.enter('lantern_found', 'The lost lantern', LAN.x, LAN.y, 2.2, [T.message('The Stone\'s lantern, still warm.'), T.step('vale_lantern', 1), T.objective('Return the lantern to the Stone')], ['elder']));
    tr.push(T.enter('lantern_return', 'Lantern returned', P.x, P.y, 3, [
      T.dialogue('Elder Stone', ['The Stone is lit. The Stone remembers kindness.']), T.done('vale_lantern'),
      T.loot('rare', 1, P.x, P.y, { gem: true, item: 'socket_rune' }), T.message('Reward: a gem and a Socket Rune.'),
    ], ['lantern_found']));
    // ---- timing: the required route (walk 3.7 t/s; pauses in seconds), estimates between stops that share no path
    g.timing = buildTiming([
      { sec: 'hub', at: 'start', pause: 10, label: 'wake' },
      { sec: 'hub', at: 'nookChest', pause: 18, label: 'first chest' },
      { sec: 'hub', at: 'yard', pause: 45, label: 'dummies' },
      { sec: 'hub', at: 'plaza', pause: 25, label: 'Elder Stone' },
      { sec: 'hub', at: 'garden', on: 'cottage', fight: 55, pause: 8, label: 'garden ambush' },
      { sec: 'hub', at: 'gemNook', pause: 15, wind: 1.3, label: 'lantern' },
      { sec: 'hub', at: 'plaza', pause: 12, wind: 1.3, label: 'lantern back' },
      { sec: 'hub', at: 'pine', pause: 8, wind: 1.3, label: 'pine rift' },
    ], g, 24, {});
  },
};
