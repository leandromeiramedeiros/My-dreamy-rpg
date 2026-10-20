#!/usr/bin/env node
'use strict';
// tools/maps/build.js -- generate maps from tools/maps/recipes/*.js
//
//   node tools/maps/build.js [ids...]            generate (all recipes or listed ids), write tools/maps/out/maps.json
//   --preview                                    also write PNG overviews to tools/shots/maps/
//   --compat                                     old-engine output: stand-in object kinds + message cards instead of the M2b
//                                                actions (checkpoint/loot/dialogue/quest/openGate). Default is the M2b engine.
//   --kinds=compat / --actions=compat            same, one half at a time
//   --packs=spawn|spawnPack                      how ENCOUNTERS packs are emitted. Default: spawnPack once js/game.js runs that
//                                                trigger action, else the equivalent per-enemy spawn cards (tagged pack: id)
//   --merge[=path/to/world.js]                   inject/replace the generated map ids into a world.js (default js/world.js)
//                                                everything else (tuning, enemies, sprites, other maps) is preserved
//   --out=<file>                                 write the merge result somewhere else instead of in place
//   --warp=door|portal                           M2c: how warp doors are emitted. Default: `warpdoor` objects once js/maps.js + game.js run them,
//                                                else same-map portals (+ a keydoor barrier in front of keyed ones)
//   --gutter=tiles|plain                         void gutters as 'v' / 'k' tiles (default once the engine has isGutter) or plain void
//   --arena=arena|plain                          inline-arena actions (arena / closeGate) once game.js has them, else plain spawn cards
//   --verbose                                    print validation info per map
// Merging also drops the ids a recipe `replaces` (pinewood replaces roothollow + pinewood_boss).
// Reports per map: sections, main-path walk length, legs, point-of-interest / landmark / fight spacing, and minutes per section
// of the required route (hard cap 24 min per map, DESIGN 25.1).
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
  gen.T.mode = opts.actions === 'compat' ? 'compat' : 'future';
  gen.T.packMode = opts.packs || (require('./gamedata.js').engineHasSpawnPack() ? 'spawnPack' : 'spawn');
  const EH = require('./gamedata.js').engineHas();   // M2c engine features, detected from code (comment lines stripped)
  gen.T.warpMode = opts.warp || (EH.warpdoor ? 'door' : 'portal');
  gen.T.gutterTiles = opts.gutter != null ? opts.gutter === 'tiles' : EH.gutter;
  gen.T.arenaMode = opts.arena || (EH.arena ? 'arena' : 'plain');
  loadAll.features = { warp: gen.T.warpMode, gutters: gen.T.gutterTiles ? 'v/k tiles' : 'plain void', arena: gen.T.arenaMode, engine: EH };
  const loaded = files.map(f => [f, require(path.join(RECIPES, f))]);   // load every spec first so portal anchors are registered
  for (const [f, rec] of loaded) {
    for (const r of Array.isArray(rec) ? rec : [rec]) {
      if (ids && ids.length && !ids.includes(r.id)) continue;
      const res = gen.generate(r, { kinds: opts.kinds === 'compat' ? 'compat' : 'future' });
      const g = res.gen;
      const meta = {
        replaces: r.replaces || (rec.replaces) || [],
        rooms: g.rooms.filter(x => x.kind !== 'flat').map(x => ({ id: x.id, label: x.label, x: x.x, y: x.y, r: x.r, kind: x.kind })),
        paths: g.paths.map(p => ({ name: p.name, kind: p.kind, pts: p.samples.map(s => [s.x, s.y]), length: p.samples.length ? p.samples[p.samples.length - 1].s : 0 })),
        notes: g.notes,
        fish: g.objs.filter(o => o.t === 'fishspot' || o.t === 'gate' || o.t === 'hidden' || o.t === 'keydoor' || o.t === 'lever').map(o => ({ t: o.t, x: o.x, y: o.y, hidden: o.hidden })),
      };
      out.push({ id: r.id, map: res.map, report: res.report, meta, gen: g, file: f });
    }
  }
  return out;
}

function mergeInto(worldFile, maps, outFile, drop = []) {
  const src = fs.readFileSync(worldFile, 'utf8');
  const w = parseWorld(src);
  // sanity: re-emitting the untouched file must be byte-identical to what the editor would write
  const roundtrip = worldSource(w) === src;
  for (const [id, m] of Object.entries(maps)) w.maps[id] = m;   // existing key keeps its position, new ids are appended
  const dropped = drop.filter(id => w.maps[id] && !maps[id]);
  for (const id of dropped) delete w.maps[id];
  fs.writeFileSync(outFile || worldFile, worldSource(w));
  return { roundtrip, ids: Object.keys(maps), dropped, total: Object.keys(w.maps).length };
}

// ---------------------------------------------------------------------------- audits (DESIGN 25.1)
const SPEED = 3.7;
const fmtMin = s => (s / 60).toFixed(1);
function spacing(vals) { const out = []; for (let i = 1; i < vals.length; i++) out.push(vals[i] - vals[i - 1]); return out; }
function audit(r, log) {
  const g = r.gen, warn = [];
  const mains = g.paths.filter(p => p.kind === 'main');
  for (const mp of mains) {
    const L = mp.samples[mp.samples.length - 1].s;
    log(`  ${mp.name}: main path ${L.toFixed(0)} tiles = ${(L / SPEED).toFixed(0)} s walk @${SPEED} t/s`);
    let prev = 0, prevName = 'start'; const legs = [];
    for (const c of mp.ctrl) if (c.room) { legs.push(`${prevName}->${c.room.id} ${(c.s - prev).toFixed(0)}t/${((c.s - prev) / SPEED).toFixed(0)}s`); prev = c.s; prevName = c.room.id; }
    log(`    legs: ${legs.join('; ')}`);
    if (g.pois.length) {
      const sp = [0, ...g.spine(mp.name, null, 9), L], gaps = spacing(sp), mx = Math.max(...gaps), over = gaps.filter(d => d > 15.01).length;
      const lm = [0, ...g.spine(mp.name, ['landmark'], 18), L], lg = spacing(lm), lmx = Math.max(...lg);
      log(`    points of interest: ${sp.length - 2} along it, max gap ${mx.toFixed(1)} tiles (target 12-15), ${over} gap(s) > 15; landmarks ${lm.length - 2}, max gap ${lmx.toFixed(0)} tiles (target ~30)`);
      if (over) warn.push(`${mp.name}: ${over} POI gap(s) > 15 tiles (max ${mx.toFixed(1)})`);
      if (lmx > 36) warn.push(`${mp.name}: landmark gap ${lmx.toFixed(0)} tiles > ~30`);
    }
  }
  const others = g.paths.filter(p => p.kind !== 'main');
  log('  other paths: ' + others.map(p => `${p.name}(${p.kind}) ${p.samples[p.samples.length - 1].s.toFixed(0)}t`).join('; '));
  const tm = g.timing;
  if (tm) {
    const secs = {}; let t = 0, tiles = 0, lastFightEnd = null; const gaps = [];
    for (const st of tm.stops) {
      const ws = st.walk / SPEED; tiles += st.walk;
      const e = secs[st.sec] || (secs[st.sec] = { walk: 0, fight: 0, pause: 0, tiles: 0, fights: 0 });
      e.walk += ws; e.tiles += st.walk; e.fight += st.fight; e.pause += st.pause; if (st.fight) e.fights++;
      t += ws;
      if (st.fight) { if (lastFightEnd != null) gaps.push({ to: st.label, s: t - lastFightEnd }); t += st.fight; lastFightEnd = t; }
      t += st.pause; if (lastFightEnd != null && !st.fight) { /* pauses count toward the gap */ }
    }
    // gap = walking + pauses between the end of one fight and the start of the next (recomputed with pauses)
    const gp = []; let acc = null;
    for (const st of tm.stops) {
      if (acc != null) acc += st.walk / SPEED;
      if (st.fight) { if (acc != null) gp.push({ to: st.label || st.x, s: acc }); acc = 0; acc += st.pause; } else if (acc != null) acc += st.pause;
    }
    let total = 0; const lines = [];
    for (const [k, e] of Object.entries(secs)) { const sec = e.walk + e.fight + e.pause; total += sec; lines.push(`${k} ${fmtMin(sec)} min (${e.tiles} tiles walked = ${fmtMin(e.walk)}, ${e.fights} fight(s) = ${fmtMin(e.fight)}, pauses ${fmtMin(e.pause)})`); }
    const opt = (g.zoneSpec && g.zoneSpec.optional || []).map(o => `${o.sec}(optional) ${fmtMin(o.walk / SPEED + o.fight + o.pause)} min`);
    log(`  timing, required route: ${tiles} tiles walked (${fmtMin(tiles / SPEED)} min) + fights; ${lines.join(' | ')}`);
    if (opt.length) log('  optional: ' + opt.join(', '));
    log(`  TOTAL ${fmtMin(total)} min (hard cap ${tm.cap} min)${total / 60 > tm.cap ? '  OVER THE CAP: cut a room, not a corridor' : '  ok'}`);
    if (gp.length) log('  fight gaps (walk + pauses between fights): ' + gp.map(x => `${x.to} ${x.s.toFixed(0)}s`).join(', ') + '   (target 15-25 s)');
    const bad = gp.filter(x => x.s < 8 || x.s > 32); if (bad.length) warn.push(`fight gap(s) far outside 15-25 s: ${bad.map(x => x.to + ' ' + x.s.toFixed(0) + 's').join(', ')}`);
    if (total / 60 > tm.cap) warn.push(`required route ${fmtMin(total)} min > ${tm.cap} min cap`);
    r.timingTotal = total;
  }
  return warn;
}

if (require.main === module) {
  const ids = args.filter(a => !a.startsWith('-'));
  const cp = flag('compat') ? 'compat' : null;
  const res = loadAll(ids, { kinds: cp || flag('kinds'), actions: cp || flag('actions'), packs: flag('packs'), warp: flag('warp'), gutter: flag('gutter'), arena: flag('arena') });
  if (!res.length) { console.error('no recipes matched'); process.exit(1); }
  const F = loadAll.features; console.log(`engine features: warp=${F.warp} gutters=${F.gutters} arena=${F.arena}  (detected: ${JSON.stringify(F.engine)})`);
  let bad = 0;
  const maps = {}, drop = [];
  for (const r of res) {
    maps[r.id] = r.map; for (const d of r.meta.replaces) drop.push(d);
    const rep = r.report, i = rep.info;
    console.log(`${r.id}: ${i.W}x${i.H} land=${i.land} reach=${i.reachableTiles} levels=[${i.levels}] objects=${i.objects} triggers=${i.triggers} portals=${i.portals} rooms=${i.rooms}`);
    for (const sc of r.map.sections || []) console.log(`  section ${sc.id} (${sc.kind}): x ${sc.x}..${sc.x + sc.w}, y ${sc.y}..${sc.y + sc.h}${sc.dark != null ? ', dark ' + sc.dark : ''}`);
    const aw = audit(r, console.log);
    if (flag('verbose')) console.log('  ', JSON.stringify(i.objectCounts));
    for (const w of rep.warnings) console.log('  WARN', w);
    for (const w of aw) console.log('  WARN', w);
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
  for (const d of drop) delete prev[d];
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
    const r = mergeInto(target, maps, flag('out') ? path.resolve(flag('out')) : null, drop);
    console.log(`merged ${r.ids.join(', ')} into ${flag('out') || target} (${r.total} maps total; dropped ${r.dropped.join(', ') || 'none'}; roundtrip-identical=${r.roundtrip})`);
  }
  if (bad) { console.error(`${bad} validation error(s)`); process.exitCode = 2; }
}

module.exports = { loadAll, mergeInto, worldSource, parseWorld, audit };
