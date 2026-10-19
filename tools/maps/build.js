#!/usr/bin/env node
'use strict';
// tools/maps/build.js -- generate maps from tools/maps/recipes/*.js
//
//   node tools/maps/build.js [ids...]            generate (all recipes or listed ids), write tools/maps/out/maps.json
//   --preview                                    also write PNG overviews to tools/shots/maps/
//   --kinds=future                               write real chest/tablet/... object kinds instead of stand-ins
//   --actions=future                             emit planned trigger actions (checkpoint/loot/dialogue/openGate)
//   --merge[=path/to/world.js]                   inject/replace the generated map ids into a world.js (default js/world.js)
//                                                everything else (tuning, enemies, sprites, other maps) is preserved
//   --out=<file>                                 write the merge result somewhere else instead of in place
//   --verbose                                    print validation info per map
const fs = require('fs');
const path = require('path');
const gen = require('./gen.js');

const RECIPES = path.join(__dirname, 'recipes');
const OUT = path.join(__dirname, 'out');
const args = process.argv.slice(2);
const flag = n => { const a = args.find(x => x === '--' + n || x.startsWith('--' + n + '=')); return a ? (a.includes('=') ? a.split('=').slice(1).join('=') : true) : null; };

const worldSource = w => "'use strict';\n// The game world: maps, triggers (logic) and tuning. Edit it visually with editor.html,\n// which can publish straight back to this file on GitHub.\nconst WORLD_DATA = " + JSON.stringify(w, null, 1) + ';\n';   // identical to editor.js worldSource
function parseWorld(src) {
  return new Function(src + ';return WORLD_DATA;')();
}

function loadAll(ids, opts = {}) {
  const files = fs.readdirSync(RECIPES).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort();
  const out = [];
  gen.T.mode = opts.actions === 'future' ? 'future' : 'compat';
  const loaded = files.map(f => [f, require(path.join(RECIPES, f))]);   // load every spec first so portal anchors are registered
  for (const [f, rec] of loaded) {
    for (const r of Array.isArray(rec) ? rec : [rec]) {
      if (ids && ids.length && !ids.includes(r.id)) continue;
      const res = gen.generate(r, { kinds: opts.kinds || 'compat' });
      const g = res.gen;
      const meta = {
        rooms: g.rooms.filter(x => x.kind !== 'flat').map(x => ({ id: x.id, label: x.label, x: x.x, y: x.y, r: x.r, kind: x.kind })),
        paths: g.paths.map(p => ({ name: p.name, kind: p.kind, pts: p.samples.map(s => [s.x, s.y]), length: p.samples.length ? p.samples[p.samples.length - 1].s : 0 })),
        notes: g.notes,
      };
      out.push({ id: r.id, map: res.map, report: res.report, meta, gen: g, file: f });
    }
  }
  return out;
}

function mergeInto(worldFile, maps, outFile) {
  const src = fs.readFileSync(worldFile, 'utf8');
  const w = parseWorld(src);
  // sanity: re-emitting the untouched file must be byte-identical to what the editor would write
  const roundtrip = worldSource(w) === src;
  for (const [id, m] of Object.entries(maps)) w.maps[id] = m;   // existing key keeps its position, new ids are appended
  fs.writeFileSync(outFile || worldFile, worldSource(w));
  return { roundtrip, ids: Object.keys(maps), total: Object.keys(w.maps).length };
}

if (require.main === module) {
  const ids = args.filter(a => !a.startsWith('-'));
  const res = loadAll(ids, { kinds: flag('kinds'), actions: flag('actions') });
  if (!res.length) { console.error('no recipes matched'); process.exit(1); }
  let bad = 0;
  const maps = {};
  for (const r of res) {
    maps[r.id] = r.map;
    const rep = r.report, i = rep.info;
    console.log(`${r.id}: ${i.W}x${i.H} land=${i.land} reach=${i.reachableTiles} levels=[${i.levels}] objects=${i.objects} triggers=${i.triggers} portals=${i.portals} rooms=${i.rooms}`);
    const main = r.meta.paths.find(p => p.kind === 'main');
    if (main) console.log(`  main path ${main.length.toFixed(0)} tiles = ${(main.length / 3.7).toFixed(0)} s walk @3.7 t/s` + r.meta.paths.filter(p => p.kind !== 'main').map(p => `; ${p.name}(${p.kind}) ${p.length.toFixed(0)}t/${(p.length / 3.7).toFixed(0)}s`).join(''));
    if (main) { const g = r.gen, mp = g.pathBy.main; let prev = 0, prevName = 'start'; const legs = []; for (const c of mp.ctrl) if (c.room) { legs.push(`${prevName}->${c.room.id} ${(c.s - prev).toFixed(0)}t/${((c.s - prev) / 3.7).toFixed(0)}s`); prev = c.s; prevName = c.room.id; } console.log('  legs: ' + legs.join('; ')); }
    if (flag('verbose')) console.log('  ', JSON.stringify(i.objectCounts));
    for (const w of rep.warnings) console.log('  WARN', w);
    for (const e of rep.errors) { console.log('  ERROR', e); bad++; }
  }
  // cross-map portal checks: arrival points must be walkable and reachable on the target map (when it is part of this run)
  const byId = Object.fromEntries(res.map(r => [r.id, r]));
  for (const r of res) for (const p of r.map.portals) if (p.arrive && byId[p.to]) {
    const tg = byId[p.to].gen, R = tg.lastReach;
    if (!tg.walkTile(p.arrive.x, p.arrive.y)) { console.log(`  ERROR ${r.id}: portal to ${p.to} arrives at (${p.arrive.x},${p.arrive.y}) which is not walkable`); bad++; }
    else if (!R.has(p.arrive.x, p.arrive.y)) { console.log(`  ERROR ${r.id}: portal to ${p.to} arrival (${p.arrive.x},${p.arrive.y}) is unreachable from ${p.to}'s start`); bad++; }
  }
  fs.mkdirSync(OUT, { recursive: true });
  const outFile = path.join(OUT, 'maps.json');
  // keep previously generated maps that were not regenerated this run
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(outFile, 'utf8')).maps || {}; } catch (e) { /* none */ }
  fs.writeFileSync(outFile, JSON.stringify({ generated: new Date().toISOString(), maps: Object.assign(prev, maps) }, null, 1));
  console.log('wrote', outFile);
  if (flag('preview')) {
    const { render } = require('./preview.js');
    const d = path.join(__dirname, '..', 'shots', 'maps');
    for (const r of res) { render(r.id, r.map, r.meta, d); console.log('preview', path.join(d, r.id + '.png')); }
  }
  const mg = flag('merge');
  if (mg) {
    const target = mg === true ? path.join(__dirname, '..', '..', 'js', 'world.js') : path.resolve(mg);
    const r = mergeInto(target, maps, flag('out') ? path.resolve(flag('out')) : null);
    console.log(`merged ${r.ids.join(', ')} into ${flag('out') || target} (${r.total} maps total; roundtrip-identical=${r.roundtrip})`);
  }
  if (bad) { console.error(`${bad} validation error(s)`); process.exitCode = 2; }
}

module.exports = { loadAll, mergeInto, worldSource, parseWorld };
