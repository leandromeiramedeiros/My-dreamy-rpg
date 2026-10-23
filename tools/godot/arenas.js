#!/usr/bin/env node
'use strict';
// tools/godot/arenas.js -- the studio's mockup arenas (js/arenas.js of the JS reference) -> godot/data/seed/arenas.json,
// then the arena importer (godot/addons/arena_import) builds res://arenas/<id>.tscn.
//   node tools/godot/arenas.js [--ref=<js-final checkout>] [--no-godot] [--only=dummies,elite]
// Each row: the arena record (name, theme, W, H, tiles, start, objects, triggers, objective, level, desc) plus `kit` (the
// reference hero of applyArenaKit: hand / offhand / head / chest / boots item ids, tier index, level) and `spawns` (the
// instant map_enter spawns, placed in the scene; every other spawn stays in its trigger card). Arenas are tests only:
// the client makes the real maps (res://zones/).
const fs = require('fs'), path = require('path');
const { load } = require('./jsctx');
const { runGodot } = require('./godot');

const OUT = path.resolve(__dirname, '../../godot/data/seed/arenas.json');
const { ev } = load();
const plain = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'function' ? undefined : v)));

const ids = ev('arenaIds()');
const rows = [];
for (const id of ids) {
  const r = ev(`arenaRecord(${JSON.stringify(id)})`);
  if (!r) continue;
  const ld = r.loadout || {};
  const kit = ev(`(() => { const ld = ${JSON.stringify(ld)};
    const wf = ARENA_SETS[variantId(ld.weapon || 'sword')] ? variantId(ld.weapon || 'sword') : 'sword';
    const L = clamp(ld.level | 0 || 8, 1, MAX_LEVEL);
    const tier = clamp(ld.tier != null ? ld.tier : TIER_REQ.filter(q => q <= L).length - 1, 0, 4);
    const S = ARENA_SETS[wf];
    return { hand: wf, offhand: S.off, head: S.set[0], chest: S.set[1], boots: S.set[2], tier, level: Math.max(L, TIER_REQ[tier]) }; })()`);
  const spawns = [];
  for (const t of r.triggers || []) {
    if (!t.when || t.when.type !== 'map_enter') continue;
    for (const a of t.actions || []) if (a.type === 'spawn' && a.instant) spawns.push(plain(a));
  }
  rows.push(Object.assign({ id }, plain({
    name: r.name, sub: r.sub, desc: r.desc || '', theme: r.theme || 'vale', W: r.W, H: r.H, tiles: r.tiles, heights: r.heights,
    start: r.start, objects: r.objects || [], triggers: r.triggers || [], objective: r.objective || '', level: r.level || [1, 6],
    boss: r.boss || null, grass: r.grass || null,
  }), { kit, spawns }));
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ about: 'Mockup arenas from js/arenas.js (tag js-final), written by tools/godot/arenas.js. Studio tests only.', rows }, null, 1));
console.log(`arenas JSON -> godot/data/seed/arenas.json: ${rows.length} arenas (${rows.map(r => r.id).join(', ')}); ${rows.reduce((n, r) => n + r.spawns.reduce((m, s) => m + (s.count || 1), 0), 0)} placed enemies`);

if (!process.argv.includes('--no-godot')) {
  const only = process.argv.find(a => a.startsWith('--only='));
  const imp = runGodot('arena-import0', ['--import']);
  const r = runGodot('arena-import', ['res://addons/arena_import/arena_import_run.tscn'].concat(only ? ['--', only] : []));
  const line = r.out.split(/\r?\n/).find(l => l.startsWith('arena_import: '));
  if (line) console.log('   ' + line.slice(0, 400));
  const re = runGodot('arena-import1', ['--import']);
  process.exitCode = imp.ok && r.ok && re.ok ? 0 : 1;
}
