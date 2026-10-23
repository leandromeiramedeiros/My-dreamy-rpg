'use strict';
// ===== arenas.js: the mockup arenas (Godot pivot, client ruling 2026-10-23) ===================================================
// The studio builds no more maps. Gameplay and balance are tested only in these tiny hand-written arenas (each at most 32x32).
// Every record is WORLD_DATA-shaped (name, sub, theme, W, H, tiles, heights, start, portals, objects, objective, sigil, triggers,
// level) plus two extra fields buildMapStages ignores: `desc` (one line for the title list) and `loadout` (the reference hero:
// { weapon, level, tier? }; tier = the highest TIER_REQ at or below the level unless set; main.js applies it before enterMap).
//
// This file is the hand-edited source: the tile rows are literal ASCII (. void, g/x floor, c pillar), edit them in place. No generator.
//
// Loading: index.html loads this after world.js. main.js boot() calls mergeArenas(world, PARAMS.get('map')): the arena records are
// added to a shallow copy of the world only when ?map=<arena id> names one, so the real game and the editor never see them.
// ?map=<id> never touches the save (SAVE_ON is off). Title screen: ARENAS opens arenaList() (screens.js drawArenaList).
// Extra trigger actions (installed by mergeArenas, game.js untouched):
//   { type: 'kit', weapon?, tier }            re-kits the hero: reference gear of that weapon line and tier (weapon racks, tier plates)
//   { type: 'status', cycle[], bodies?, dur, every, times, rings[] }   status bodies (the first `bodies` live enemies) for the stress arena (STATUS.ring tiles + applyStatus)
// Boss arenas: boss-<id> for every boss in BOSSES (mossjaw and bramblehorn are written out, the rest are stubs from bossArena()).
// Zones with no enemies yet (grotto, caldera, spire) use placeholder packs of existing enemy types: TODO(M6) marks each.
//
// verbs arena (32x32): elements in the world (js/elements-world.js, docs/design/elements-statuses.md "World verbs"): all 15
// Receiver objects, dry grass for a grass fire, water for ice / vine / raft, a dawn shrine, a free Elder Stone (Dream Oil), the Opal
// as the torch puzzle's reward, and 3 puzzles gated by object_state / element_hit cards (torches -> gate_a, conduits -> gate_b,
// the holy seal -> gate_c). Extra record field: `grass: [[x, y, w, h]]` (dry-grass rects, read by elements-world.js).

const flatHeights = (W, H) => Array.from({ length: H }, () => '0'.repeat(W));
const ARENA_SETS = {   // reference armour per weapon line (head, chest, boots) + the offhand line (null: none)
  sword: { set: ['knighthelm', 'warden', 'knightgreaves'], off: 'buckler' },
  staff: { set: ['arcanecowl', 'dreamweave', 'clothsandals'], off: 'grimoire' },
  bow: { set: ['wardenhood', 'stalker', 'stalkershoes'], off: 'quiver' },
  daggers: { set: ['wardenhood', 'stalker', 'stalkershoes'], off: null },
};

// ----- reference hero ------------------------------------------------------------------------------------------------------
// applyArenaKit(p, ld, over): deterministic gear (makeTestItem: no RNG), full HP/MP. over = { weapon?, tier? } from ?weapon= / ?tier=.
// Trinkets, gems and skill ranks are not part of the reference kit.
function applyArenaKit(p, ld, over) {
  over = over || {};
  const wf = ARENA_SETS[variantId(over.weapon || ld.weapon || 'sword')] ? variantId(over.weapon || ld.weapon || 'sword') : 'sword';
  const L = clamp(ld.level | 0 || 8, 1, MAX_LEVEL);
  const tier = clamp(over.tier != null ? +over.tier : ld.tier != null ? ld.tier : TIER_REQ.filter(r => r <= L).length - 1, 0, 4);
  const rar = L < 10 ? 'uncommon' : L < 17 ? 'rare' : 'epic';
  const base = f => FAMILY_TIERS[f][tier].split(':')[0], S = ARENA_SETS[wf];
  p.level = Math.max(L, TIER_REQ[tier]); p.xp = 0;
  const mk = (f, r) => makeTestItem({ base: base(f), rarity: r, ilvl: p.level, sockets: 0 });
  p.equip.weapon = mk(wf, rar);
  ['head', 'chest', 'boots'].forEach((s, i) => { p.equip[s] = mk(S.set[i], rar); });
  p.equip.offhand = null;
  if (S.off) {
    const off = mk(S.off, rar);
    if (off.pages && typeof PAGES !== 'undefined') Object.keys(PAGES).filter(id => pageFits(id, BASES[off.base].deck)).slice(0, off.pages.length).forEach((id, i) => { off.pages[i] = id; });
    p.equip.offhand = off;
  }
  refillPockets(p);
  recalcStats(p, true);
  return p;
}

// ----- record builders -----------------------------------------------------------------------------------------------------
const fixed = v => +v.toFixed(2);
function arenaBase(s) {
  return Object.assign({ portals: [], heights: flatHeights(s.W, s.H), sigil: null, level: [1, 6] }, s);
}
const spawnA = (e, n, x, y, r, extra) => Object.assign({ type: 'spawn', enemy: e, count: n || 1, x, y, radius: r }, extra || {});
const lampsFor = theme => ({ lamp: theme === 'ruins' ? 'lantern_blue' : 'lantern', acc: theme === 'ruins' ? 'crystal_violet' : theme === 'forest' ? 'mushroom' : 'crystal' });

// pack arena (32x24): start room -> gate (lever) -> R1 pack 1 -> gate -> R2 pack 2 -> gate -> R3 pack 3 + elite -> key -> keydoor -> chamber
function packArena(s) {
  const key = 'key_pack_' + s.zone, L = lampsFor(s.theme), o = [], t = [];
  const room = (cx, cy, packIdx) => s.packs[packIdx].map(g => spawnA(g.e, g.n, cx, cy, 3.6, g.elite ? { elite: g.elite } : null));
  o.push({ t: 'lever', id: 'lever_a', x: 5.5, y: 16.5, gate: 'gate_a', label: 'lever' });
  o.push({ t: 'gate', id: 'gate_a', x: 8, y: 17.5, ang: 0, len: 3.2 });
  o.push({ t: 'gate', id: 'gate_b', x: 19, y: 17.5, ang: 0, len: 3.2 });
  o.push({ t: 'gate', id: 'gate_c', x: 28.5, y: 12, ang: 1.5708, len: 3.2 });
  o.push({ t: 'keydoor', id: 'door_key', x: 19, y: 5.5, ang: 0, len: 3.2, key, label: 'sealed door' });
  [[1.8, 15.8], [5.6, 20.6], [9.8, 13.8], [16.4, 13.8], [9.8, 21.4], [16.4, 21.4], [20.8, 13.8], [29.4, 13.8], [20.8, 21.4], [29.4, 21.4],
    [20.8, 1.8], [29.4, 1.8], [20.8, 9.4], [29.4, 9.4], [1.8, 1.8], [16.2, 1.8], [1.8, 9.4], [16.2, 9.4]].forEach(([x, y]) => o.push({ t: L.lamp, x, y }));
  [[13.5, 13.6], [25, 13.6], [25, 9.6], [8.5, 5.5]].forEach(([x, y]) => o.push({ t: L.acc, x, y }));
  o.push({ t: 'chest', x: 7.5, y: 2.6, tier: 'wood', label: 'pack-reward-wood' });
  o.push({ t: 'chest', x: 7.5, y: 8.4, tier: 'silver', label: 'pack-reward-silver' });
  o.push({ t: 'shrine', id: 'shrine_' + s.zone, x: 13.5, y: 7.5, name: 'Arena shrine', label: 'checkpoint' });
  t.push({ id: 'in', name: 'Enter', when: { type: 'map_enter' }, actions: [{ type: 'banner', title: s.name, sub: 'Three packs, an elite, a key' }, { type: 'objective', text: 'Pull the lever to open the way' }] });
  t.push({ id: 'p1_go', name: 'Pack 1', when: { type: 'enter_area', x: 11.5, y: 17.8, r: 2.4 }, actions: [{ type: 'banner', title: 'Pack 1 / 3', sub: '' }, { type: 'objective', text: 'Clear pack 1' }].concat(room(14, 17.5, 0)) });
  t.push({ id: 'p1_clear', name: 'Pack 1 cleared', when: { type: 'all_enemies_dead' }, requires: ['p1_go'], actions: [{ type: 'heal', pct: 25 }, { type: 'openGate', id: 'gate_b' }, { type: 'objective', text: 'Go east to pack 2' }, { type: 'message', text: 'The east gate opens' }] });
  t.push({ id: 'p2_go', name: 'Pack 2', when: { type: 'enter_area', x: 21.5, y: 17.8, r: 1.9 }, actions: [{ type: 'banner', title: 'Pack 2 / 3', sub: '' }, { type: 'objective', text: 'Clear pack 2' }].concat(room(25, 17.5, 1)) });
  t.push({ id: 'p2_clear', name: 'Pack 2 cleared', when: { type: 'all_enemies_dead' }, requires: ['p2_go'], actions: [{ type: 'heal', pct: 25 }, { type: 'openGate', id: 'gate_c' }, { type: 'objective', text: 'Go north to the elite' }, { type: 'message', text: 'The north gate opens' }] });
  t.push({ id: 'p3_go', name: 'Pack 3 and the elite', when: { type: 'enter_area', x: 28.5, y: 9.5, r: 2 }, actions: [{ type: 'banner', title: 'The elite guards a key', sub: '' }, { type: 'objective', text: 'Defeat the elite and its pack' }].concat(room(25, 5.5, 2)) });
  t.push({ id: 'p3_clear', name: 'Elite down', when: { type: 'all_enemies_dead' }, requires: ['p3_go'], actions: [{ type: 'heal', pct: 25 }, { type: 'loot', rarity: 'rare', count: 1, item: key, x: 25, y: 5.5 }, { type: 'objective', text: 'Take the key to the sealed door' }, { type: 'message', text: 'The elite drops a key' }] });
  t.push({ id: 'done', name: 'Chamber', when: { type: 'enter_area', x: 9.5, y: 5.5, r: 3 }, actions: [{ type: 'banner', title: 'Pack arena cleared', sub: s.name }, { type: 'objective', text: 'Open the chests' }, { type: 'heal', pct: 100 }] });
  return arenaBase({ name: s.name, sub: 'Arena: pack', theme: s.theme, W: 32, H: 24, tiles: s.tiles, start: { x: 3.5, y: 18.5 }, objects: o, objective: 'Clear three packs, take the key', sigil: { x: 15.5, y: 5.5 },
    triggers: t, level: s.level, desc: s.desc, loadout: s.loadout });
}

// elite arena (24x24): a hub with four pockets north and four south, one elite modifier per pocket, one gate per pocket
function eliteArena(s) {
  const XS = [1, 7, 13, 19], o = [], t = [], pockets = [];
  XS.forEach(x => { pockets.push({ x, top: true }); });
  XS.forEach(x => { pockets.push({ x, top: false }); });
  o.push({ t: 'shrine', id: 'shrine_elite', x: 11.5, y: 12.6, name: 'Arena shrine', label: 'checkpoint' });
  [[2, 10.6], [21, 10.6], [2, 13.4], [21, 13.4], [11.5, 10.5]].forEach(([x, y]) => o.push({ t: 'lantern', x, y }));
  pockets.forEach((pk, i) => {
    const [mod, en] = s.mods[i], cx = pk.x + 2, cy = pk.top ? 5.0 : 19.0, gy = pk.top ? 9.0 : 15.0, sy = pk.top ? 3.4 : 20.6, id = 'p' + i;
    o.push({ t: 'gate', id: 'gate_' + id, x: cx, y: gy, ang: 1.5708, len: 2.4, open: true });
    o.push({ t: i % 2 ? 'crystal' : 'brazier', x: pk.x + 0.7, y: pk.top ? 2.7 : 21.3 });
    o.push({ t: 'sign', x: cx, y: pk.top ? 7.4 : 16.6, label: mod });
    t.push({ id: 'go_' + id, name: mod + ' ' + en, when: { type: 'enter_area', x: cx, y: cy, r: 1.8 },
      actions: [{ type: 'closeGate', id: 'gate_' + id }, { type: 'banner', title: mod.toUpperCase() + ' ELITE', sub: en }, { type: 'objective', text: 'Defeat the ' + mod + ' ' + en }, spawnA(en, 1, cx, sy, 0.8, { elite: mod })] });
    t.push({ id: 'done_' + id, name: mod + ' down', when: { type: 'all_enemies_dead' }, requires: ['go_' + id], actions: [{ type: 'openGate', id: 'gate_' + id }, { type: 'heal', pct: 100 }, { type: 'objective', text: 'Pick the next pocket' }, { type: 'message', text: mod + ' elite down. Gate open' }] });
  });
  t.push({ id: 'in', name: 'Enter', when: { type: 'map_enter' }, actions: [{ type: 'banner', title: 'Elite arena', sub: 'One modifier per pocket' }, { type: 'objective', text: 'Walk into a pocket: its gate closes and the elite wakes' }] });
  return arenaBase({ name: 'Elite pockets', sub: 'Arena: elite modifiers', theme: s.theme, W: 24, H: 24, tiles: s.tiles, start: { x: 11.5, y: 11.0 }, objects: o, objective: 'One elite per pocket', triggers: t, level: s.level, desc: s.desc, loadout: s.loadout });
}

// boss arena (24x24): a round floor, the hero south, the boss spawns north after a banner
function bossArena(s) {
  const o = [], t = [], id = s.boss;
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; o.push({ t: k % 2 ? 'crystal' : 'brazier', x: fixed(12 + Math.cos(a) * 9.4), y: fixed(12 + Math.sin(a) * 9.4) }); }
  o.push({ t: 'shrine', id: 'shrine_' + id, x: 11.5, y: 21.4, name: 'Arena shrine', label: 'checkpoint' });
  t.push({ id: 'intro', name: 'Boss intro', when: { type: 'timer', seconds: 2.5, after: 'map' }, actions: [{ type: 'banner', title: s.title, sub: s.sub, boss: true }, { type: 'objective', text: 'Defeat ' + s.title }, spawnA(id, 1, 11.5, 8.5, 0.5)] });
  t.push({ id: 'dead', name: 'Boss down', when: { type: 'all_enemies_dead' }, requires: ['intro'], actions: [{ type: 'banner', title: 'Victory', sub: s.title + ' falls' }, { type: 'heal', pct: 100 }, { type: 'loot', rarity: 'rare', count: 2, x: 11.5, y: 12 }, { type: 'objective', text: 'Done. Reload for another run' }] });
  return arenaBase({ name: s.title + ' arena', sub: 'Arena: boss', theme: s.theme || 'forest', W: 24, H: 24, tiles: s.tiles, start: { x: 11.5, y: 19.5 }, objects: o, objective: 'Defeat ' + s.title, triggers: t,
    level: s.level, desc: s.desc, loadout: s.loadout, boss: id });
}
// a stub for a boss with no arena written yet: any ENEMY with ai 'boss' that BOSSES knows
function bossStub(id) {
  const nm = (typeof ENEMY !== 'undefined' && ENEMY[id] && ENEMY[id].name) || id, L = 14;
  return bossArena({ boss: id, title: nm, sub: 'Stub arena', theme: 'forest', tiles: ARENAS['boss-mossjaw'].tiles, level: [10, 20], desc: 'Stub boss arena for ' + nm + ' (L14, T2)', loadout: { weapon: 'sword', level: L } });
}
function bossStubIds() {
  if (typeof BOSSES === 'undefined' || typeof ENEMY === 'undefined') return [];
  return Object.keys(BOSSES).filter(k => k !== 'boss' && ENEMY[k] && ENEMY[k].ai === 'boss' && !ARENAS['boss-' + k]);
}

// stress arena (32x32): 24 awake bodies, 40+ lights, status bodies and status tiles. For tools/perf.js --scene=stress (run with ?god).
function stressArena(sp) {
  const o = [], t = [], kinds = ['gloomslime', 'shadehound', 'dreammoth', 'thornbackboar', 'ogre', 'brambleshaman'], Q = [[8.5, 8.5], [23.5, 8.5], [8.5, 23.5], [23.5, 23.5]], acts = [];
  const lights = ['lantern', 'crystal', 'brazier', 'mushroom', 'lantern_blue', 'crystal_violet'];
  let n = 0;
  for (const y of [3.5, 9.5, 15.5, 22, 28.5]) for (const x of [3.5, 9.5, 15.5, 22, 28.5]) o.push({ t: lights[n++ % lights.length], x, y });
  for (const y of [6, 12, 19, 25]) for (const x of [6, 12, 19, 25]) o.push({ t: lights[n++ % lights.length], x: x + 1.5, y: y + 0.5 });
  for (let i = 0; i < 24; i++) { const q = Q[i % 4]; acts.push(spawnA(kinds[i % kinds.length], 1, q[0], q[1], 3, { instant: true })); }
  t.push({ id: 'in', name: 'Swarm', when: { type: 'map_enter' }, actions: [{ type: 'banner', title: 'Stress arena', sub: '24 bodies, 40 lights, status effects' }].concat(acts) });
  t.push({ id: 'status', name: 'Status bodies', when: { type: 'timer', seconds: 1.5, after: 'map' }, actions: [{ type: 'status', cycle: ['burning', 'chilled', 'shocked', 'wet', 'poisoned', 'dread'], bodies: 6, dur: 8, every: 6, times: 40,
    rings: [{ x: 17, y: 17, r: 3.5, kind: 'burning', dur: 8 }] }] });
  return arenaBase({ name: 'Stress arena', sub: 'Arena: perf', theme: 'ruins', W: 32, H: 32, tiles: sp.tiles, start: { x: 17, y: 17 }, objects: o, objective: 'Survive (use ?god)', triggers: t, level: [10, 17],
    desc: '24 awake bodies, 40 lights, status bodies and tiles (perf)', loadout: { weapon: 'sword', level: 14 } });
}

// touch arena (24x16): the Interact button on a phone: chest, dialogue, shrine, lever + gate, warp door, two dummies
function touchArena(sp) {
  const o = [
    { t: 'chest', x: 10.5, y: 3.5, tier: 'wood', label: 'touch-chest' }, { t: 'chest', x: 20.5, y: 12.5, tier: 'silver', label: 'touch-chest-silver' },
    { t: 'tablet', x: 6.5, y: 3.5, title: 'Touch test', label: 'tablet', text: 'Tap Interact next to a chest, a tablet, a shrine, a lever or a door.' },
    { t: 'shrine', id: 'shrine_touch', x: 20.5, y: 3.5, name: 'Arena shrine', label: 'checkpoint' },
    { t: 'lever', id: 'lever_touch', x: 12.5, y: 12.5, gate: 'gate_touch', label: 'lever' }, { t: 'gate', id: 'gate_touch', x: 17.5, y: 12.5, ang: 0, len: 3.2 },
    { t: 'warpdoor', id: 'warp_touch', x: 3.5, y: 12.6, to: { x: 20.5, y: 5.8 }, label: 'Warp test' },
    { t: 'lantern', x: 2, y: 2 }, { t: 'lantern', x: 22, y: 2 }, { t: 'lantern', x: 2, y: 14 }, { t: 'lantern', x: 22, y: 14 }, { t: 'sign', x: 5.5, y: 6.2, label: 'sign' },
  ];
  const t = [
    { id: 'in', name: 'Enter', when: { type: 'map_enter' }, actions: [{ type: 'banner', title: 'Touch arena', sub: 'Chest, dialogue, shrine, lever, warp' }, { type: 'objective', text: 'Try every Interact' }, spawnA('dummy', 1, 18, 8, 0, { instant: true }), spawnA('dummy', 1, 20, 10, 0, { instant: true })] },
    { id: 'talk', name: 'Pip speaks', when: { type: 'enter_area', x: 6.5, y: 6.5, r: 1.8 }, actions: [{ type: 'dialogue', speaker: 'Pip', lines: ['This is the touch arena.', 'Tap the interact button next to anything that glows.'] }] },
  ];
  return arenaBase({ name: 'Touch arena', sub: 'Arena: touch', theme: 'vale', W: 24, H: 16, tiles: sp.tiles, start: { x: 3.5, y: 8 }, objects: o, objective: 'Try every Interact', triggers: t, level: [1, 6],
    desc: 'Chest, dialogue, shrine, lever, warp door, two dummies (touch UI)', loadout: { weapon: 'sword', level: 4 } });
}

// dummies arena (24x16): immortal dummies, weapon racks (re-kit by weapon line), tier plates (re-kit by tier), a shrine, a chest
function dummiesArena(sp) {
  const o = [], t = [], acts = [];
  const racks = [['sword', 4], ['staff', 8], ['bow', 12], ['daggers', 16]];
  racks.forEach(([w, x]) => {
    o.push({ t: 'sign', x, y: 2.4, label: w + ' rack' }); o.push({ t: 'brazier', x: x - 1.1, y: 2.4 });
    t.push({ id: 'rack_' + w, name: w + ' rack', when: { type: 'enter_area', x, y: 3.1, r: 0.9 }, once: false, cooldown: 1.5, actions: [{ type: 'kit', weapon: w }, { type: 'message', text: 'Reference ' + w + ' kit' }] });
  });
  for (let i = 0; i < 5; i++) {
    const x = 4 + i * 3.2;
    o.push({ t: 'mushroom', x, y: 13.3 }); o.push({ t: 'sign', x, y: 14.2, label: 'T' + (i + 1) });
    t.push({ id: 'tier_' + (i + 1), name: 'Tier ' + (i + 1) + ' plate', when: { type: 'enter_area', x, y: 12.6, r: 0.9 }, once: false, cooldown: 1.5, actions: [{ type: 'kit', tier: i }, { type: 'message', text: 'Tier ' + (i + 1) + ' kit (current weapon line)' }] });
  }
  o.push({ t: 'shrine', id: 'shrine_dummies', x: 2.5, y: 8, name: 'Arena shrine', label: 'checkpoint' });
  o.push({ t: 'chest', x: 21, y: 2.6, tier: 'wood', label: 'dummies-chest' });
  [[2, 2], [22, 2], [2, 14], [22, 14]].forEach(([x, y]) => o.push({ t: 'lantern', x, y }));
  [[12, 5], [16, 5], [20, 5], [12, 8], [16, 8], [20, 8], [12, 11], [16, 11], [20, 11]].forEach(([x, y]) => acts.push(spawnA('dummy', 1, x, y, 0, { instant: true })));
  // TODO: resist-tagged dummies (a fire-resistant, a frost-resistant) once the Skills lane exposes a dummy `res` override
  t.push({ id: 'in', name: 'Enter', when: { type: 'map_enter' }, actions: [{ type: 'banner', title: 'Dummies', sub: 'Racks pick the weapon line, plates the tier' }, { type: 'objective', text: 'Hit the dummies; step on a rack or a plate to re-kit' }].concat(acts) });
  return arenaBase({ name: 'Dummies', sub: 'Arena: training', theme: 'vale', W: 24, H: 16, tiles: sp.tiles, start: { x: 4, y: 8 }, objects: o, objective: 'Hit things', triggers: t, level: [6, 12],
    desc: 'Nine dummies, weapon racks (sword, staff, bow, daggers), tier plates T1-T5', loadout: { weapon: 'sword', tier: 1, level: 8 } });
}

// ----- the arena table ------------------------------------------------------------------------------------------------------
const ARENAS = {
  dummies: dummiesArena({
    tiles: [
      '........................',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '........................',
    ],
  }),
  'pack-vale': packArena({ zone: 'vale', name: 'Vale pack arena', theme: 'vale', level: [1, 6], desc: 'Vale: slimes, hounds, a shielded ogre elite (L4)', loadout: { weapon: 'sword', level: 4 },
    packs: [[{ e: 'gloomslime', n: 4 }], [{ e: 'shadehound', n: 3 }, { e: 'gloomslime', n: 2 }], [{ e: 'ogre', n: 1, elite: 'shielded' }, { e: 'shadehound', n: 2 }]],
    tiles: [
      '................................',
      '.ggggggggggggggggg..ggggggggggg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '.gggcgggggcggggggg..ggcgggggcgg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '.gggcgggggcggggggg..ggcgggggcgg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '...........................ggg..',
      '...........................ggg..',
      '.........ggggggggg..ggggggggggg.',
      '.........ggggggggg..ggggggggggg.',
      '.gggggg..ggcgggcgg..ggcgggggcgg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggg..ggggggggg..ggggggggggg.',
      '.gggggg..ggcgggcgg..ggcgggggcgg.',
      '.gggggg..ggggggggg..ggggggggggg.',
      '.........ggggggggg..ggggggggggg.',
      '................................',
    ],
  }),
  'pack-pinewood': packArena({ zone: 'pinewood', name: 'Pinewood pack arena', theme: 'forest', level: [6, 12], desc: 'Pinewood: boars, ogre, shaman, a burning gnarlbrute elite (L8)', loadout: { weapon: 'sword', level: 8 },
    packs: [[{ e: 'thornbackboar', n: 2 }, { e: 'gloomslime', n: 1 }], [{ e: 'ogre', n: 1 }, { e: 'brambleshaman', n: 1 }, { e: 'shadehound', n: 2 }], [{ e: 'gnarlbrute', n: 1, elite: 'burning' }, { e: 'brambleshaman', n: 2 }]],
    tiles: [
      '................................',
      '.ggggggggggggggggg..ggggggggggg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '.gggcgggggcggggggg..ggcgggggcgg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '.gggcgggggcggggggg..ggcgggggcgg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '...........................ggg..',
      '...........................ggg..',
      '.........ggggggggg..ggggggggggg.',
      '.........ggggggggg..ggggggggggg.',
      '.gggggg..ggcgggcgg..ggcgggggcgg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggg..ggggggggg..ggggggggggg.',
      '.gggggg..ggcgggcgg..ggcgggggcgg.',
      '.gggggg..ggggggggg..ggggggggggg.',
      '.........ggggggggg..ggggggggggg.',
      '................................',
    ],
  }),
  'pack-ruins': packArena({ zone: 'ruins', name: 'Ruins pack arena', theme: 'ruins', level: [10, 17], desc: 'Ruins commons: wisps, knights, archers, a chanter, a swarm, a gloomed knight elite with a mimic (L14)', loadout: { weapon: 'sword', level: 14 },
    packs: [[{ e: 'wisp', n: 3 }, { e: 'gloomknight', n: 1 }], [{ e: 'voidarcher', n: 2 }, { e: 'shadelingswarm', n: 1 }, { e: 'gravechanter', n: 1 }], [{ e: 'gloomknight', n: 1, elite: 'gloomed' }, { e: 'pillarmimic', n: 1 }, { e: 'wisp', n: 2 }]],
    tiles: [
      '................................',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxcxxxxxcxxxxxxx..xxcxxxxxcxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxcxxxxxcxxxxxxx..xxcxxxxxcxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '...........................xxx..',
      '...........................xxx..',
      '.........xxxxxxxxx..xxxxxxxxxxx.',
      '.........xxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxx..xxcxxxcxx..xxcxxxxxcxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxx..xxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxx..xxcxxxcxx..xxcxxxxxcxx.',
      '.xxxxxx..xxxxxxxxx..xxxxxxxxxxx.',
      '.........xxxxxxxxx..xxxxxxxxxxx.',
      '................................',
    ],
  }),
  // TODO(M6): grotto, caldera and spire have no enemies of their own yet; the packs below are placeholders of existing types
  'pack-grotto': packArena({ zone: 'grotto', name: 'Grotto pack arena', theme: 'forest', level: [14, 20], desc: 'Grotto (placeholder packs): slimes, hounds, a frozen thornsow elite (L16)', loadout: { weapon: 'sword', level: 16 },
    packs: [[{ e: 'gloomslime', n: 5 }], [{ e: 'shadehound', n: 4 }], [{ e: 'thornsow', n: 1, elite: 'frozen' }, { e: 'gloomslime', n: 2 }]],
    tiles: [
      '................................',
      '.ggggggggggggggggg..ggggggggggg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '.gggcgggggcggggggg..ggcgggggcgg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '.gggcgggggcggggggg..ggcgggggcgg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '.ggggggggggggggggg..ggggggggggg.',
      '...........................ggg..',
      '...........................ggg..',
      '.........ggggggggg..ggggggggggg.',
      '.........ggggggggg..ggggggggggg.',
      '.gggggg..ggcgggcgg..ggcgggggcgg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggg..ggggggggg..ggggggggggg.',
      '.gggggg..ggcgggcgg..ggcgggggcgg.',
      '.gggggg..ggggggggg..ggggggggggg.',
      '.........ggggggggg..ggggggggggg.',
      '................................',
    ],
  }),
  'pack-caldera': packArena({ zone: 'caldera', name: 'Caldera pack arena', theme: 'ruins', level: [20, 28], desc: 'Caldera (placeholder packs): hounds, moths, ogres, a burning troll elite (L24)', loadout: { weapon: 'sword', level: 24 },
    packs: [[{ e: 'shadehound', n: 3 }, { e: 'dreammoth', n: 2 }], [{ e: 'ogre', n: 2 }], [{ e: 'mountaintroll', n: 1, elite: 'burning' }, { e: 'shadehound', n: 1 }]],
    tiles: [
      '................................',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxcxxxxxcxxxxxxx..xxcxxxxxcxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxcxxxxxcxxxxxxx..xxcxxxxxcxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '...........................xxx..',
      '...........................xxx..',
      '.........xxxxxxxxx..xxxxxxxxxxx.',
      '.........xxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxx..xxcxxxcxx..xxcxxxxxcxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxx..xxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxx..xxcxxxcxx..xxcxxxxxcxx.',
      '.xxxxxx..xxxxxxxxx..xxxxxxxxxxx.',
      '.........xxxxxxxxx..xxxxxxxxxxx.',
      '................................',
    ],
  }),
  'pack-spire': packArena({ zone: 'spire', name: 'Spire pack arena', theme: 'ruins', level: [28, 36], desc: 'Spire (placeholder packs): moths, shamans, hounds, a storm gnarlbrute elite (L30)', loadout: { weapon: 'sword', level: 30 },
    packs: [[{ e: 'dreammoth', n: 4 }], [{ e: 'brambleshaman', n: 2 }, { e: 'shadehound', n: 2 }], [{ e: 'gnarlbrute', n: 1, elite: 'storm' }, { e: 'dreammoth', n: 2 }]],
    tiles: [
      '................................',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxcxxxxxcxxxxxxx..xxcxxxxxcxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxcxxxxxcxxxxxxx..xxcxxxxxcxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxx..xxxxxxxxxxx.',
      '...........................xxx..',
      '...........................xxx..',
      '.........xxxxxxxxx..xxxxxxxxxxx.',
      '.........xxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxx..xxcxxxcxx..xxcxxxxxcxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxx..xxxxxxxxx..xxxxxxxxxxx.',
      '.xxxxxx..xxcxxxcxx..xxcxxxxxcxx.',
      '.xxxxxx..xxxxxxxxx..xxxxxxxxxxx.',
      '.........xxxxxxxxx..xxxxxxxxxxx.',
      '................................',
    ],
  }),
  elite: eliteArena({ theme: 'vale', level: [8, 16], desc: 'Eight pockets, one elite modifier each, one gate per pocket (L12)', loadout: { weapon: 'sword', level: 12 },
    mods: [['shielded', 'ogre'], ['storm', 'shadehound'], ['burning', 'thornbackboar'], ['frozen', 'gloomslime'], ['gloomed', 'dreammoth'], ['twin', 'shadehound'], ['vampiric', 'ogre'], ['summoner', 'brambleshaman']],
    tiles: [
      '........................',
      '........................',
      '.gggg..gggg..gggg..gggg.',
      '.gggg..gggg..gggg..gggg.',
      '.gggg..gggg..gggg..gggg.',
      '.gggg..gggg..gggg..gggg.',
      '.gggg..gggg..gggg..gggg.',
      '.gggg..gggg..gggg..gggg.',
      '..gg....gg....gg....gg..',
      '..gg....gg....gg....gg..',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '..gg....gg....gg....gg..',
      '..gg....gg....gg....gg..',
      '.gggg..gggg..gggg..gggg.',
      '.gggg..gggg..gggg..gggg.',
      '.gggg..gggg..gggg..gggg.',
      '.gggg..gggg..gggg..gggg.',
      '.gggg..gggg..gggg..gggg.',
      '.gggg..gggg..gggg..gggg.',
      '........................',
      '........................',
    ],
  }),
  'boss-mossjaw': bossArena({ boss: 'mossjaw', title: 'Mossjaw', sub: 'The moss hound', level: [4, 8], desc: 'Mossjaw alone on a round floor (L5)', loadout: { weapon: 'sword', level: 5 },
    tiles: [
      '........................',
      '...........gg...........',
      '.......gggggggggg.......',
      '......gggggggggggg......',
      '.....ggggcggggcgggg.....',
      '....gggggggggggggggg....',
      '...gggggggggggggggggg...',
      '..gggggggggggggggggggg..',
      '..gggggggggggggggggggg..',
      '..ggcggggggggggggggcgg..',
      '..gggggggggggggggggggg..',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '..gggggggggggggggggggg..',
      '..ggcggggggggggggggcgg..',
      '..gggggggggggggggggggg..',
      '..gggggggggggggggggggg..',
      '...gggggggggggggggggg...',
      '....gggggggggggggggg....',
      '.....ggggcggggcgggg.....',
      '......gggggggggggg......',
      '.......gggggggggg.......',
      '...........gg...........',
      '........................',
    ],
  }),
  'boss-bramblehorn': bossArena({ boss: 'bramblehorn', title: 'Bramblehorn', sub: 'The thorn stag', level: [6, 12], desc: 'Bramblehorn alone on a round floor (L8)', loadout: { weapon: 'sword', level: 8 },
    tiles: [
      '........................',
      '...........gg...........',
      '.......gggggggggg.......',
      '......gggggggggggg......',
      '.....ggggcggggcgggg.....',
      '....gggggggggggggggg....',
      '...gggggggggggggggggg...',
      '..gggggggggggggggggggg..',
      '..gggggggggggggggggggg..',
      '..ggcggggggggggggggcgg..',
      '..gggggggggggggggggggg..',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '..gggggggggggggggggggg..',
      '..ggcggggggggggggggcgg..',
      '..gggggggggggggggggggg..',
      '..gggggggggggggggggggg..',
      '...gggggggggggggggggg...',
      '....gggggggggggggggg....',
      '.....ggggcggggcgggg.....',
      '......gggggggggggg......',
      '.......gggggggggg.......',
      '...........gg...........',
      '........................',
    ],
  }),
  'boss-oathless': bossArena({ boss: 'oathless', title: 'The Oathless', sub: 'The oath without a reason', theme: 'ruins', level: [8, 16], desc: 'The Oathless alone on a ruined round floor (L12)', loadout: { weapon: 'sword', level: 12 },
    tiles: [
      '........................',
      '...........xx...........',
      '.......xxxxxxxxxx.......',
      '......xxxxxxxxxxxx......',
      '.....xxxxcxxxxcxxxx.....',
      '....xxxxxxxxxxxxxxxx....',
      '...xxxxxxxxxxxxxxxxxx...',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '..xxcxxxxxxxxxxxxxxcxx..',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '.xxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxx.',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '..xxcxxxxxxxxxxxxxxcxx..',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '...xxxxxxxxxxxxxxxxxx...',
      '....xxxxxxxxxxxxxxxx....',
      '.....xxxxcxxxxcxxxx.....',
      '......xxxxxxxxxxxx......',
      '.......xxxxxxxxxx.......',
      '...........xx...........',
      '........................',
    ],
  }),
  'boss-gloamwarden': bossArena({ boss: 'gloamwarden', title: 'The Gloam Warden', sub: 'The lantern keeper', theme: 'ruins', level: [10, 18], desc: 'The Gloam Warden alone on a ruined round floor (L14)', loadout: { weapon: 'sword', level: 14 },
    tiles: [
      '........................',
      '...........xx...........',
      '.......xxxxxxxxxx.......',
      '......xxxxxxxxxxxx......',
      '.....xxxxcxxxxcxxxx.....',
      '....xxxxxxxxxxxxxxxx....',
      '...xxxxxxxxxxxxxxxxxx...',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '..xxcxxxxxxxxxxxxxxcxx..',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '.xxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxx.',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '..xxcxxxxxxxxxxxxxxcxx..',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '..xxxxxxxxxxxxxxxxxxxx..',
      '...xxxxxxxxxxxxxxxxxx...',
      '....xxxxxxxxxxxxxxxx....',
      '.....xxxxcxxxxcxxxx.....',
      '......xxxxxxxxxxxx......',
      '.......xxxxxxxxxx.......',
      '...........xx...........',
      '........................',
    ],
  }),
  stress: stressArena({
    tiles: [
      '................................',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxcxxxxxcxxxxxxcxxxxxcxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxcxxxxxcxxxxxxcxxxxxcxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxcxxxxxcxxxxxxcxxxxxcxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxcxxxxxcxxxxxxcxxxxxcxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '................................',
    ],
  }),
  touch: touchArena({
    tiles: [
      '........................',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggcggggggcggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '.gggggggggggggggggggggg.',
      '........................',
    ],
  }),
  // elements in the world: the record is written out (no builder) so every Receiver row reads as data
  verbs: arenaBase({ name: 'Elements in the world', sub: 'Arena: world verbs', theme: 'vale', W: 32, H: 32, start: { x: 15.5, y: 29 }, level: [6, 12],
    desc: 'All 15 Receivers, grass fire, ice, Pip\'s charge, Dream Oil, the Opal, 3 element puzzles (L8)', loadout: { weapon: 'sword', level: 8 },
    objective: 'Light the torches, wake the conduits, break the seal', grass: [[2, 23, 7, 6]],
    objects: [
      // north (behind gate_c): frost then a blade, wind, arcane
      { t: 'crystal_wall', id: 'crystal_n', x: 8.5, y: 4.5 }, { t: 'glyph', id: 'glyph_n', x: 16, y: 4 }, { t: 'fogbank', id: 'fog_n', x: 24.5, y: 4.5 },
      { t: 'chest', x: 16, y: 2, tier: 'gold', label: 'verbs-seal-chest' }, { t: 'lantern', x: 3, y: 2 }, { t: 'lantern', x: 29, y: 2 },
      // puzzle 3: the holy seal before gate_c (source: the dawn shrine, 17 tiles south)
      { t: 'seal', id: 'seal_c', x: 16, y: 10.4 }, { t: 'gate', id: 'gate_c', x: 16, y: 9.5, ang: 1.5708, len: 4.2 },
      // puzzle 1: two torches at the west door (source: the lit brazier); puzzle 2: two conduits at the east door (source: the storm crystal)
      { t: 'torch', id: 'torch_a', x: 11.6, y: 12.2 }, { t: 'torch', id: 'torch_b', x: 11.6, y: 16.8 }, { t: 'gate', id: 'gate_a', x: 10.5, y: 14.5, ang: 0, len: 3.2 },
      { t: 'brazier', id: 'brazier_src', state: 'lit', x: 14.5, y: 14.5 }, { t: 'brazier', id: 'brazier_b', state: 'unlit', x: 17.5, y: 11.5 },
      { t: 'conduit', id: 'conduit_a', x: 19.6, y: 12.2 }, { t: 'conduit', id: 'conduit_b', x: 19.6, y: 16.8 }, { t: 'gate', id: 'gate_b', x: 21.5, y: 14.5, ang: 0, len: 3.2 },
      { t: 'storm_crystal', id: 'storm_m', x: 17.5, y: 17.6 },
      { t: 'chest', x: 5, y: 12, tier: 'silver', label: 'verbs-torch-chest' }, { t: 'lantern', x: 2, y: 11 },
      { t: 'chest', x: 26, y: 14.5, tier: 'silver', label: 'verbs-conduit-chest' }, { t: 'lantern', x: 29, y: 11 },
      // the channel: a raft (wind drifts it to `to`: a 2x2 crossing), a seed (nature grows a vine over `bridge`), ice from any frost
      { t: 'raft', id: 'raft_w', x: 4.5, y: 20.6, to: { x: 8, y: 21 } }, { t: 'seed', id: 'seed_s', x: 12.5, y: 22.4, bridge: [12, 20, 1, 2] },
      // south: the dry-grass field with a bramble, the dawn shrine, the free Elder Stone, frost and wind receivers, the ice wall
      { t: 'bramble', id: 'bramble_s', x: 5.5, y: 25.5 },
      { t: 'shrine', id: 'shrine_verbs', dawn: true, x: 13.5, y: 27.2, name: 'Dawn shrine', label: 'checkpoint' },
      { t: 'elderstone', id: 'stone_verbs', x: 18.5, y: 27.2, price: 0 },
      { t: 'rime_crystal', id: 'rime_s', x: 21.5, y: 24.5 }, { t: 'vent', id: 'vent_s', x: 24.5, y: 27.5 }, { t: 'windmill', id: 'mill_s', x: 27.5, y: 24 },
      { t: 'icewall', id: 'icewall_s', x: 28.5, y: 28.4 }, { t: 'lantern', x: 2, y: 30 }, { t: 'lantern', x: 30, y: 30 },
    ],
    triggers: [
      { id: 'in', name: 'Enter', when: { type: 'map_enter' }, actions: [{ type: 'banner', title: 'Elements in the world', sub: 'Pip carries a charge; the Elder Stone gives oil' }, { type: 'objective', text: 'Light both torches by the west door' }] },
      { id: 'p1_torches', name: 'Both torches lit', when: { type: 'object_state', ids: ['torch_a', 'torch_b'], state: 'lit' },
        actions: [{ type: 'openGate', id: 'gate_a' }, { type: 'message', text: 'The west gate opens' }, { type: 'loot', item: 'opal_3', count: 1, x: 5, y: 14.5 }, { type: 'objective', text: 'Wake both conduits by the east door' }] },
      { id: 'p2_conduits', name: 'Both conduits live', when: { type: 'object_state', ids: ['conduit_a', 'conduit_b'], state: 'live' },
        actions: [{ type: 'openGate', id: 'gate_b' }, { type: 'message', text: 'The east gate opens' }, { type: 'objective', text: 'Break the seal on the north gate with holy light' }] },
      { id: 'p3_seal', name: 'Holy on the seal', when: { type: 'element_hit', id: 'seal_c', el: 'holy' },
        actions: [{ type: 'openGate', id: 'gate_c' }, { type: 'message', text: 'The seal breaks; the north gate opens' }, { type: 'objective', text: 'Frost the crystal wall, then cut it' }] },
    ],
    tiles: [
      '................................',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
      '..............xxxx..............',
      '.ggggggggg.gggggggggg.ggggggggg.',
      '.ggggggggg.gggggggggg.ggggggggg.',
      '.ggggggggg.gggggggggg.ggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.ggggggggg.gggggggggg.ggggggggg.',
      '.ggggggggg.gggggggggg.ggggggggg.',
      '.ggggggggg.gggggggggg.ggggggggg.',
      '.ggggggggg.gggggggggg.ggggggggg.',
      '.wwwwwwwwwwwwwwbbwwwwwwwwwwwwww.',
      '.wwwwwwwwwwwwwwbbwwwwwwwwwwwwww.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '.gggggggggggggggggggggggggggggg.',
      '................................',
    ],
  }),
};

// ----- loading hooks ---------------------------------------------------------------------------------------------------------
const arenaRecord = id => ARENAS[id] || (id && id.indexOf('boss-') === 0 && bossStubIds().indexOf(id.slice(5)) >= 0 ? (ARENAS[id] = bossStub(id.slice(5))) : null);
function arenaIds() { return Object.keys(ARENAS).concat(bossStubIds().map(k => 'boss-' + k)); }
function arenaList() { return arenaIds().map(id => { const r = arenaRecord(id); return { id, name: r.name, desc: r.desc || '', loadout: r.loadout }; }); }
// title screen: reload as ?map=<id> (SAVE_ON is then off, boot applies the arena's loadout and starts play)
function openArenaMap(id) { try { location.href = location.pathname + '?map=' + encodeURIComponent(id); } catch (e) { location.search = '?map=' + id; } }
// boot hook: world -> a shallow copy that also holds the wanted arena (WORLD_DATA itself is never touched)
function mergeArenas(W, want) {
  installArenaActions();
  const r = arenaRecord(want); if (!r) return W;
  const maps = Object.assign({}, W.maps); maps[want] = r;
  return Object.assign({}, W, { maps });
}
let ARENA_ACTIONS_ON = false;
function installArenaActions() {
  if (ARENA_ACTIONS_ON || typeof window === 'undefined' || typeof window.runAction !== 'function') return;
  ARENA_ACTIONS_ON = true;
  const base = window.runAction;
  window.runAction = function (a) {
    if (a && a.type === 'kit') { arenaKitAction(a); return; }
    if (a && a.type === 'status') { arenaStatusAction(a); return; }
    return base.apply(this, arguments);
  };
}
function arenaKitAction(a) {
  const p = G.player, cur = p.equip.weapon ? familyOf(p.equip.weapon.base) : 'sword';
  const tier = a.tier != null ? a.tier : TIER_REQ.filter(r => r <= p.level).length - 1;
  applyArenaKit(p, { weapon: a.weapon || cur, level: p.level, tier: clamp(tier, 0, 4) }, null);
  p.hp = p.maxHp; if (typeof sfx === 'function') sfx('pickup');
}
function arenaStatusAction(a) {
  const m = G.map, cyc = a.cycle || ['burning'], run = n => {
    if (G.map !== m) return;
    let i = 0; for (const e of G.enemies) { if (e.dead || e.dummy) continue; if (a.bodies && i >= a.bodies) break; applyStatus(e, cyc[i++ % cyc.length], a.dur || 8); }
    for (const r of a.rings || []) STATUS.ring(r.x, r.y, r.r, r.kind, r.dur || 8);
    if (n + 1 < (a.times || 1)) delay(a.every || 6, () => run(n + 1));
  };
  run(0);
}
