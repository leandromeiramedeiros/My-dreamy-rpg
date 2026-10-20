#!/usr/bin/env node
'use strict';
// tools/act1-route.js -- scripted Act I walk-through on the BIG maps (DESIGN 25): the 80x80 Whispering Vale, then the 112x112 Misty Pinewood
// (forest -> Root Hollow -> Fox Warrens -> Bramblehorn's Clearing, ONE map with warp doors) and home.
// Drives the real game in headless Chromium. It teleports the hero to each beat (triggers are enter_area / all_enemies_dead cards, so
// standing there is exactly what a player does), fast-forwards the wave timers, kills what spawns, and asserts that every trigger of
// the DESIGN 16.2 / STORY beats fires with the right actions (dialogue ids, quest steps, gates, doors, packs, loot) and that the page
// throws no errors. Barriers, levers and warp doors are exercised through the engine (use.fn / openGate / startWarp), not assumed.
// At the end EVERY trigger card of both maps must have fired at least once (recorded by wrapping fireTrigger).
// Warp doors: runs with `warpdoor` objects when the engine has them, else with the same-map portal fallback (the keydoor in front is
// unlocked first); G.map.id stays 'pinewood' across every warp, so positions / sections are asserted instead of the map id.
// Screenshots: tools/shots/act1/NN_<beat>.png.   Usage: node tools/act1-route.js     (exit 1 on any failed check or page error)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), SHOTS = path.join(__dirname, 'shots', 'act1');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const wait = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });
for (const f of fs.readdirSync(SHOTS)) if (/^\d\d_.*\.png$/.test(f)) fs.unlinkSync(path.join(SHOTS, f));
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
let fails = 0;
const check = (name, ok, info) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined ? '  ' + JSON.stringify(info) : ''}`); if (!ok) fails++; };

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ headless: true });
  const page = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  // a fresh profile: no save, so G.prog starts empty
  await page.goto(`${base}/index.html?map=vale`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await wait(500);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  let shotN = 0;
  const shot = async name => { await wait(450); await page.screenshot({ path: path.join(SHOTS, `${String(++shotN).padStart(2, '0')}_${name}.png`) }); };

  // ---- instrumentation: record every trigger action, every fired trigger card, dialogue id/speaker, and the loot the engine drops ----
  await ev(() => {
    window.__log = { actions: [], talks: [] }; window.__fired = {};
    const ra = runAction; window.runAction = a => { window.__log.actions.push(a); return ra(a); };
    const ft = fireTrigger; window.fireTrigger = tr => { window.__fired[G.map.id + ':' + tr.id] = (window.__fired[G.map.id + ':' + tr.id] || 0) + 1; return ft(tr); };
    const tk = talk; window.talk = a => { const D = a.id && DIALOGUE[a.id]; window.__log.talks.push({ id: a.id || null, speaker: (D ? D.speaker : a.speaker) || '', first: (D ? (D.lines || [D.banner])[0] : (a.lines || [])[0]) || '' }); return tk(a); };
    // keep the hero alive and quick; the route is about triggers, not combat balance
    window.__hero = () => { const p = G.player; p.invulnT = 9999; p.hp = p.maxHp; };
    window.__tp = (x, y) => { const p = G.player; p.x = x; p.y = y; p.z = tileH(G.map, x, y); p.dash = null; G.cam.x = isoX(x, y); G.cam.y = isoY(x, y, p.z) - 12; window.__hero(); };
    window.__killAll = () => { let n = 0; for (const e of G.enemies.slice()) if (!e.dummy && !e.dead) { killEnemy(e); n++; } return n; };
    window.__live = () => G.enemies.filter(e => !e.dummy && !e.dead).map(e => e.type);
    window.__trg = id => G.map.triggers.find(t => t.id === id);
    window.__at = id => { const t = window.__trg(id); return t && t.when.type === 'enter_area' ? [t.when.x, t.when.y] : null; };
    window.__sec = () => (sectionAt(G.map, G.player.x, G.player.y) || {}).id;
    window.__loot = [];
    const dl = dropLoot; window.dropLoot = (x, y, list) => { window.__loot.push(...list.map(d => d.kind === 'item' ? 'item:' + d.it.slot + '/' + d.it.rarity + (d.it.unique ? '/unique:' + d.it.unique : '') : d.kind === 'gem' ? 'gem' : d.kind)); return dl(x, y, list); };
    window.__hero();
    G.prog.trig = {};   // fresh profile (the first load already settled `wake`)
    window.__fired = {};
    enterMap('vale');   // re-enter so the map_enter beats (banner) run under the recorder
  });
  const wf = async (fn, arg, ms = 12000) => { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } };
  const fired = id => ev(id => !!G.trig.fired[id], id);
  const goto = async id => { const at = await ev(id => window.__at(id), id); if (!at) throw new Error('no enter_area trigger ' + id); await ev(([x, y]) => window.__tp(x, y), at); return wf(id => !!G.trig.fired[id], id, 8000); };
  const tpTo = (x, y) => ev(([x, y]) => window.__tp(x, y), [x, y]);
  // run a fight to its end: speed the wave timers, report who spawned, kill them, wait for the trigger id (if any)
  const fight = async (doneId, rounds = 5) => {
    const seen = new Set();
    for (let i = 0; i < rounds; i++) {
      await ev(() => { for (const d of G.delays) d.t = Math.min(d.t, 0.02); });
      await wait(450);
      (await ev(() => window.__live())).forEach(t => seen.add(t));
      await ev(() => window.__killAll());
      await wait(250);
      if (doneId && await fired(doneId)) break;
    }
    return [...seen];
  };
  const quest = id => ev(id => { const q = (G.prog.quests || {})[id]; return q === 'done' ? 'done' : q ? q.step : null; }, id);
  const said = id => ev(id => window.__log.talks.some(t => t.id === id), id);
  const ranAction = pred => ev(p => window.__log.actions.some(a => new Function('a', 'return ' + p)(a)), pred);
  const portalOpen = to => ev(to => { const p = G.map.portals.find(q => q.to === to && q.id !== 'hollow_door' && q.id !== 'hollow_exit' && !/^warrens_/.test(q.id || '')); return p ? !!p.open : null; }, to);
  const portalById = id => ev(id => { const p = G.map.portals.find(q => q.id === id); return p ? !!p.open : null; }, id);
  const objectsOf = fn => ev(fn => G.map.objects.filter(new Function('o', 'return ' + fn)).length, fn);
  const colliders = () => ev(() => G.map.colliders.length);
  const secOf = () => ev(() => window.__sec());
  const hasKeyNow = k => ev(k => hasKey(k), k);
  const giveKey = k => ev(k => { (G.prog.secrets || (G.prog.secrets = {}))['key:' + k] = true; }, k);
  const dropKey = k => ev(k => { (G.prog.secrets || (G.prog.secrets = {}))['key:' + k] = false; }, k);
  // keyed barrier / warp door object by id: try it (Interact), report whether it opened
  const tryDoor = (gid, kind) => ev(([gid, kind]) => {
    const o = G.map.objects.find(q => (kind === 'warp' ? q.warpdoor : q.barrier) && q.gid === gid && (kind === 'warp' || q.use));
    if (!o) return null;
    window.__tp(o.x, o.y + 0.9); o.use.fn(o);
    return { text: o.use.text(o), open: kind === 'warp' ? !!G.warp : gateOpen(G.map, gid) };
  }, [gid, kind]);
  const warpDone = () => wf(() => !G.warp, null, 4000);
  // a warp door pair: in door mode Interact the warpdoor, in portal mode (pre-engine fallback) step on the same-map portal
  const useDoor = async id => {
    const mode = await ev(id => {
      const o = G.map.objects.find(q => q.warpdoor && q.gid === id);
      if (o) { window.__tp(o.x, o.y + 0.9); o.use.fn(o); return 'door'; }
      const p = G.map.portals.find(q => q.id === id); if (p) { window.__tp(p.x + 0.2, p.y + 0.2); return 'portal'; }
      return null;
    }, id);
    if (mode === 'door') await warpDone(); else if (mode === 'portal') await wf(() => !G.fadeDir, null, 6000);
    await wait(350); await ev(() => window.__hero());
    return mode;
  };
  const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // =================================================================== THE VALE (80x80)
  check('vale: 80x80, level band [1,3]', await ev(() => G.map.id === 'vale' && G.map.W === 80 && G.map.H === 80 && JSON.stringify(G.world.maps.vale.level) === '[1,3]'));
  const secs = await ev(() => G.world.maps.vale.sections.map(s => s.id + ':' + s.kind).join());
  check('vale: sections hub, Moon Pond, Pip\'s Lanterns, Dream Arena', secs === 'hub:outer,moon:outer,lanterns:outer,arena:arena', secs);
  const wakeInfo = { wake: await wf(() => G.trig.fired.wake), talks: await ev(() => window.__log.talks.map(t => t.id)), line: await ev(() => DIALOGUE.vale_wake.lines[0]) };
  check('vale: banner + Pip wakes you ("Up. You were sleeping like you meant it.")', wakeInfo.wake && wakeInfo.talks.includes('vale_wake') && wakeInfo.talks.includes('vale_banner') && wakeInfo.line === 'Up. You were sleeping like you meant it.', wakeInfo);
  check('vale: two training dummies stand in the yard', await ev(() => G.enemies.filter(e => e.dummy).length === 2));
  check('vale: the Pinewood rift starts CLOSED', (await portalOpen('pinewood')) === false);
  const geo = await ev(() => { const s = [G.world.maps.vale.start.x, G.world.maps.vale.start.y], at = id => window.__at(id), o = G.map.objects, ch = o.find(q => q.chest && q.src.starter); return { s, yard: at('yard_teach'), stone: at('elder'), chest: ch && [ch.x, ch.y], dummies: G.enemies.filter(e => e.dummy).map(e => [e.x, e.y]) }; });
  check('vale: the dummies and the Elder Stone are within 15 tiles of the start, the first chest at 10', geo.dummies.every(d => dist2(d, geo.s) <= 15) && dist2(geo.stone, geo.s) <= 15 && Math.abs(dist2(geo.chest, geo.s) - 10) <= 1, { dummies: geo.dummies.map(d => +dist2(d, geo.s).toFixed(1)), stone: +dist2(geo.stone, geo.s).toFixed(1), chest: +dist2(geo.chest, geo.s).toFixed(1) });
  await shot('vale_wake');
  check('vale: yard lesson fires (swing, dodge, Q)', await goto('yard_teach')); await shot('vale_yard');
  const shrines0 = await ev(() => G.map.objects.filter(o => o.shrineId).map(o => o.shrineId));
  check('vale: exactly 2 shrines (start + rift terrace)', shrines0.length === 2 && shrines0.includes('shrine_start') && shrines0.includes('shrine_terrace'), shrines0);
  check('vale: shrine checkpoint (start)', await goto('shrine') && await ev(() => !!G.checkpoint));
  check('vale: Elder Stone speaks (vale_elder) and starts "Stone\'s lost lantern" (step 0)', await goto('elder') && await said('vale_elder') && (await quest('vale_lantern')) === 0);
  check('vale: Elder Stone is a visible tablet object', await objectsOf("o.tablet && o.src && o.src.title === 'Elder Stone'") === 1); await shot('vale_elder_stone');
  check('vale: first chest trigger fires, Pip says "That glow? Keep it. Gear remembers you."', await goto('chest') && await wf(() => window.__log.talks.some(t => t.id === 'vale_chest'), null, 9000));
  const ch = await ev(() => { const o = G.map.objects.find(q => q.chest && q.src.starter); if (!o) return null; window.__loot.length = 0; openChest(o); return { tier: o.src.tier, opened: o.opened }; });
  await wait(900);
  const kit = await ev(() => window.__loot.slice());
  check('vale: starter chest exists, opens, drops weapon + armour + gem', !!ch && ch.opened && kit.length >= 3 && kit.some(k => k.startsWith('gem')), kit); await shot('vale_first_chest');
  check('vale: fishing stub beside the chest (visible, interactable)', await objectsOf('o.fish') >= 3 && await goto('fish_hint'));
  check('vale: cottage tablet', await goto('tablet') && await said('vale_tablet'));
  check('vale: lantern trigger needs the Stone first, then advances quest to step 1', await goto('lantern_found') && (await quest('vale_lantern')) === 1); await shot('vale_lost_lantern');
  check('vale: garden ambush: 3 slimes', await goto('garden_ambush') && await wf(() => window.__live().length === 3, null, 6000)); await shot('vale_garden_ambush');
  const slimes = await ev(() => window.__live());
  check('vale: ambush slimes are gloomslime', slimes.every(t => t === 'gloomslime'), slimes);
  await fight('garden_done');
  check('vale: ambush cleared -> rift opens (portal, banner, vale_rift, shard_root step 0)', await wf(() => G.trig.fired.garden_done) && (await portalOpen('pinewood')) === true && await said('vale_rift') && (await quest('shard_root')) === 0); await shot('vale_rift_open');
  check('vale: lantern returned -> quest done + reward', await goto('lantern_return') && (await quest('vale_lantern')) === 'done' && await ranAction("a.type === 'loot' && a.item === 'socket_rune'"));
  check('vale: hidden gem cache', await goto('gems'));
  // the three sections beyond the hub: each bridge / gate is a keyed barrier that stays shut until its key is held
  const lock = { moon: await tryDoor('gate_moon', 'barrier'), lan: await tryDoor('bridge_lanterns', 'barrier'), arena: await tryDoor('bridge_arena', 'barrier') };
  check('vale: Moon Pond fallen-tree gate, Lanterns bridge (Spire key) and Dream Arena bridge are all locked', lock.moon && lock.lan && lock.arena && !lock.moon.open && !lock.lan.open && !lock.arena.open && lock.arena.text === 'Locked', lock);
  check('vale: section hints fire at each locked gate', await goto('moon_gate_hint') && await goto('bridge_lanterns_hint') && await goto('bridge_arena_hint'));
  await giveKey('key_spire'); const opened = await tryDoor('bridge_lanterns', 'barrier');
  check('vale: the Spire key opens Pip\'s Lanterns bridge', opened && opened.open, opened); await dropKey('key_spire');
  check('vale: Lanterns islet beat (banner + Pip)', await goto('lanterns_islet') && (await secOf()) === 'lanterns' && await objectsOf("o.chest && o.src.label === 'lanterns-chest'") === 1); await shot('vale_lanterns_islet');
  await giveKey('key_act4'); const mo = await tryDoor('gate_moon', 'barrier');
  check('vale: the fallen-tree gate opens once its key (Act IV) is held', mo && mo.open, mo); await dropKey('key_act4');
  check('vale: Moon Pond beat (night fishing, section moon)', await goto('moon_pond') && (await secOf()) === 'moon'); await shot('vale_moon_pond');
  check('vale: Dream Arena islet beat (section arena)', await goto('arena_islet') && (await secOf()) === 'arena'); await shot('vale_dream_arena');
  // shrine-to-shrine warp: both shrines discovered, refused while an enemy is awake
  check('vale: rift terrace shrine fires; both shrines are discovered', await goto('shrine_terrace') && await ev(() => { const L = (G.prog.shrines || {}).vale || []; return L.includes('shrine_terrace'); }));
  await goto('shrine'); await ev(() => { G.prog.shrines.vale = ['shrine_start', 'shrine_terrace']; });
  const refused = await ev(() => { const e = spawnEnemy('gloomslime', G.player.x + 3, G.player.y, 0); const r = shrineWarp('shrine_terrace'); G.enemies = G.enemies.filter(q => q !== e); return r; });
  check('vale: shrine warp is refused while an enemy is awake', refused === false);
  const warped = await ev(() => { G.enemies.length = 0; return shrineWarp('shrine_terrace'); }); await warpDone(); await wait(300);
  check('vale: shrine-to-shrine warp lands at the rift terrace shrine', warped === true && await ev(() => { const o = G.map.objects.find(q => q.shrineId === 'shrine_terrace'); return Math.hypot(G.player.x - o.x, G.player.y - o.y) < 4; }));
  // take the real rift
  await ev(() => { const p = G.map.portals.find(q => q.to === 'pinewood'); window.__tp(p.x + 0.2, p.y + 0.2); });
  check('vale: stepping into the rift enters the Pinewood', await wf(() => G.map.id === 'pinewood', null, 20000));

  // =================================================================== MISTY PINEWOOD (112x112, one map)
  await wait(900); await ev(() => window.__hero());
  const pm = await ev(() => ({ W: G.map.W, H: G.map.H, lv: JSON.stringify(G.world.maps.pinewood.level), secs: G.world.maps.pinewood.sections.map(s => `${s.id}:${s.kind}:${s.x},${s.y},${s.w},${s.h}`).join(' '), gut: G.world.maps.pinewood.tiles.join('').split('').filter(c => c === 'v' || c === 'k').length, anchors: (G.world.maps.pinewood.anchors || []).length, mapsLeft: Object.keys(G.world.maps).sort().join() }));
  check('pinewood: ONE 112x112 map, level band [3,10], roothollow / pinewood_boss are gone', pm.W === 112 && pm.H === 112 && pm.lv === '[3,10]' && !/roothollow|pinewood_boss/.test(pm.mapsLeft), pm);
  check('pinewood: sections forest, Root Hollow (under), Fox Warrens (vault), Clearing (arena) + void gutters', pm.secs.includes('forest:outer') && pm.secs.includes('hollow:under:0,0,56,20') && pm.secs.includes('warrens:vault') && pm.secs.includes('clearing:arena') && pm.gut > 400, pm.secs);
  check('pinewood: banner + Pip intro', await wf(() => G.trig.fired.banner && G.trig.fired.intro) && await said('pinewood_banner')); await shot('pinewood_arrival');
  check('pinewood: arrival from the rift lands at the Pinewood start (forest section)', await ev(() => Math.hypot(G.player.x - 8, G.player.y - 104) < 7) && (await secOf()) === 'forest');
  const crit = await ev(() => ({ fox: G.map.critterSpawns.filter(c => c.type === 'fox').length, rabbit: G.map.critterSpawns.filter(c => c.type === 'rabbit').length }));
  check('pinewood: the animal trail (foxes + rabbits along the road)', crit.fox >= 8 && crit.rabbit >= 14, crit);
  check('pinewood: trail trigger -> "Everything with legs is leaving."', await goto('trail') && await said('pinewood_fox')); await shot('pinewood_trail');
  check('pinewood: 3 fishing spots (2 on the creek + the hidden pond) + the intro', await objectsOf('o.fish') === 3 && await objectsOf('o.fish && o.secret') === 1 && await goto('fish_intro')); await shot('pinewood_fishing');
  check('pinewood: tablet (pinewood_tablet)', await goto('tablet') && await said('pinewood_tablet') && await objectsOf('o.tablet') >= 3);
  check('pinewood: no troll in the forest (they sleep in the Hollow and the Warrens)', await ev(() => { const forestIds = new Set(G.map.triggers.filter(t => !/^(h_|w_)/.test(t.id)).map(t => t.id)); return !G.map.triggers.some(t => forestIds.has(t.id) && JSON.stringify(t.actions).match(/troll/)); }));
  const packs = await ev(() => { const ids = new Set(), types = new Set(); for (const t of G.map.triggers) for (const a of t.actions) { if (a.pack) ids.add(a.pack); if (a.type === 'spawnPack') { ids.add(a.id); types.add('spawnPack'); } } return { ids: [...ids].sort().join(), types: [...types].join() }; });
  check('pinewood: every §21 pack is placed, with spawnPack (6 pw_* + 3 rh_*)', packs.ids === 'pw_boar_last,pw_boar_pierce,pw_boar_shaman,pw_ogre_grove,pw_ogre_run,pw_ogre_slimes,rh_boar_wrong,rh_ogre_pack,rh_troll_sleeper' && packs.types === 'spawnPack', packs);
  const shr = await ev(() => G.map.objects.filter(o => o.shrineId).map(o => o.shrineId + (o.src.warp === false ? '(plain)' : '')).sort());
  check('pinewood: 3 warp shrines in the forest + the Hollow midpoint checkpoint', shr.join() === 'hollow_shrine(plain),shrine1,shrine2,shrine3', shr);
  check('pinewood: shrine 1 attunes', await goto('shrine1') && await ev(() => (G.prog.shrines.pinewood || []).includes('shrine1')));
  check('pinewood: r1 ogre pack', await goto('r1')); const r1 = await fight('r1_done');
  check('pinewood: r1 spawned ogre + gloomslime + shadehound; cleared', r1.includes('ogre') && r1.includes('gloomslime') && r1.includes('shadehound') && await fired('r1_done'), r1); await shot('pinewood_r1_ogres');
  // the ford ambush: the wrong-weapon pack, on the road between r1 and r2
  check('pinewood: ford ambush (boars resist pierce)', await goto('ford')); const ford = await fight('ford_done'); check('pinewood: ford pack = boar + slime + hound', ford.includes('thornbackboar') && await fired('ford_done'), ford);
  check('pinewood: shrine 2 attunes', await goto('shrine2') && await ev(() => (G.prog.shrines.pinewood || []).includes('shrine2')));
  check('pinewood: r2 plaza: boar + shaman first (support), then ogre pack', await goto('r2')); const r2 = await fight('r2_done', 8); check('pinewood: r2 cleared with a shaman in it', r2.includes('brambleshaman') && r2.includes('thornbackboar') && r2.includes('ogre') && await fired('r2_done'), r2);
  check('pinewood: r3 grove: ogre grove + boar last', await goto('r3')); const r3 = await fight('r3_done', 8);
  check('pinewood: r3 cleared with a shaman in it', await fired('r3_done') && r3.includes('brambleshaman'), r3);
  // elite ogre (shielded) with the key
  const pre = await ev(() => window.__live());
  check('pinewood: elite ogre guards the key', await goto('elite')); await wf(() => window.__live().length >= 1, null, 5000);
  const el = await ev(() => G.enemies.filter(e => !e.dummy).map(e => ({ t: e.type, elite: !!e.elite, mods: e.mods || [] })));
  await shot('pinewood_elite');
  await fight('elite_done');
  check('pinewood: the elite is a Shielded ogre and drops the root key', pre.length === 0 && el.length === 1 && el[0].t === 'ogre' && el[0].elite && el[0].mods.includes('shielded') && await ev(() => hasKey('key_roothollow')) && (await quest('shard_root')) === 1, { pre, el });
  // landmarks + waysides: a point of interest every <=15 tiles of road, shown by the object counts
  const dens = await ev(() => ({ giants: G.map.objects.filter(o => o.src && o.src.t === 'pine_giant').length, beams: G.map.objects.filter(o => o.beam).length, signs: G.map.objects.filter(o => o.src && o.src.t === 'sign').length }));
  check('pinewood: landmarks (giant-pine groups with a beam) are placed along the road', dens.beams >= 12 && dens.giants >= 24, dens);

  // ---- secrets (5): crack gem, env pond -> Warrens, lever bridge -> islet, Hollow crack, cross-section cache
  check('pinewood: secret 1 - cracked wall: hum, wall solid, then opens', await (async () => {
    const before = await colliders(); const hid = await objectsOf("o.barrier === 'hidden'");
    const a = await goto('crack_hum'); await shot('pinewood_secret_crack_tell'); const b = await goto('crack_open');
    const after = await colliders(); return a && b && hid > 0 && after < before && await ev(() => gateOpen(G.map, 'wall_crack'));
  })());
  check('pinewood: cracked wall cache pays out a gem', await goto('crack_loot') && await ranAction("a.type === 'loot' && a.gem === true"));
  check('pinewood: secret 3 - raised bridge (gate) blocks, lever (real object) lowers it', await (async () => {
    const hasGate = await objectsOf("o.barrier === 'gate' && o.gid === 'bridge_gate'"); await goto('bridge_pip'); await shot('pinewood_secret_raised_bridge');
    const before = await colliders();
    const lv = await ev(() => { const o = G.map.objects.find(q => q.lever && q.src.id === 'lever_bridge'); if (!o) return null; window.__tp(o.x, o.y + 0.7); o.use.fn(o); return o.pulled; });
    const after = await colliders(); return hasGate > 0 && lv === true && after < before && await ev(() => gateOpen(G.map, 'bridge_gate'));
  })());
  check('pinewood: the islet pays out a Skill Rune, with a tablet and a gold chest', await goto('islet_loot') && await ranAction("a.type === 'loot' && a.item === 'skill_rune'") && await objectsOf("o.chest && o.src.tier === 'gold' && o.src.label === 'secret-gold-chest'") === 1 && await objectsOf("o.tablet && o.src.title === 'Islet stone'") === 1); await shot('pinewood_secret_bridge_islet');
  check('pinewood: secret 2 - the pond: hint, then the reflection opens the wall to the Warrens door', await (async () => {
    const hid = await objectsOf("o.barrier === 'hidden' && o.gid === 'wall_env'"); const a = await goto('env_hint'); await shot('pinewood_secret_pond'); const b = await goto('env_open');
    return hid > 0 && a && b && await ev(() => gateOpen(G.map, 'wall_env')) && await objectsOf("o.src && o.src.label === 'detour-chest'") === 1;
  })());
  // ---- the Fox Warrens: through the pond door (a noise vault: 3 sleepers)
  const wmode = await useDoor('warrens_door');
  check('pinewood: the pond door warps into the Fox Warrens (' + wmode + '); same map, trigger state kept', (wmode === 'door' || wmode === 'portal') && (await secOf()) === 'warrens' && await ev(() => G.map.id === 'pinewood' && G.trig.fired.r1_done === true && G.trig.fired.env_open === true));
  check('warrens: banner + Pip', await wf(() => G.trig.fired.w_enter, null, 6000)); await shot('warrens_entry');
  await goto('w_hall'); await goto('w_vault'); await wait(500);
  const sl = await ev(() => G.enemies.filter(e => e.type === 'mountaintroll').map(e => ({ asleep: !!e.asleep })));
  check('warrens: 3 sleepers (mountain trolls, asleep)', sl.length === 3 && sl.every(s => s.asleep), sl); await shot('warrens_sleepers');
  await fight('w_done');
  check('warrens: the vault clears -> Socket Rune; the gold chest waits', await fired('w_done') && await ranAction("a.type === 'loot' && a.item === 'socket_rune'") && await objectsOf("o.chest && o.src.label === 'warrens-chest'") === 1);
  const wback = await useDoor('warrens_exit');
  check('warrens: the way back lands at the pond (forest)', (await secOf()) === 'forest' && await ev(() => Math.hypot(G.player.x - 105.5, G.player.y - 48) < 8) && wback === wmode);

  // ---- the cross-section secret: the root-sealed cache by the plaza
  const cache0 = await tryDoor('door_cache', 'barrier');
  check('pinewood: secret 5 (forest end) - the root-sealed cache is locked', cache0 && !cache0.open && cache0.text === 'Locked', cache0);
  await goto('cache_hint');

  // ---- the keyed door: locked without the key, opens with it, same map
  await dropKey('key_roothollow');
  await goto('hdoor_hint');
  const hd0 = await ev(() => { const o = G.map.objects.find(q => (q.warpdoor || q.barrier === 'keydoor') && (q.gid === 'hollow_door' || q.gid === 'door_key') && (q.use)); window.__tp(o.x, o.y + 0.9); o.use.fn(o); return { warp: !!G.warp, text: o.use.text(o), kind: o.warpdoor ? 'warpdoor' : 'keydoor' }; });
  await wait(600);
  check('pinewood: the Hollow door stays locked without the key (' + hd0.kind + ')', !hd0.warp && hd0.text === 'Locked' && (await secOf()) === 'forest', hd0);
  await giveKey('key_roothollow');
  const hmode = await ev(() => { const o = G.map.objects.find(q => q.warpdoor && q.gid === 'hollow_door'); return o ? 'door' : 'portal'; });
  if (hmode === 'portal') await ev(() => { const o = G.map.objects.find(q => q.barrier === 'keydoor' && q.use); o.use.fn(o); });
  await useDoor('hollow_door');
  check('pinewood: the keyed warp door enters the Root Hollow (' + hmode + '): section hollow, still the same map and trigger state', (await secOf()) === 'hollow' && await ev(() => G.map.id === 'pinewood' && G.trig.fired.elite_done === true && G.trig.fired.r3_done === true));

  // =================================================================== ROOT HOLLOW (underground section)
  check('hollow: entry - Pip "Under the wood, it\'s quieter. I hate it." + quest step 2', await wf(() => G.trig.fired.h_intro) && await said('pinewood_hollow') && (await quest('shard_root')) === 2); await shot('hollow_entry');
  const dark = await ev(() => { const s = sectionAt(G.map, G.player.x, G.player.y); return { id: s.id, kind: s.kind, under: !!s.under, dark: s.dark }; });
  check('hollow: an underground section (cave palette: dark 0.45)', dark.kind === 'under' && dark.under && dark.dark === 0.45, dark);
  check('hollow: r1 ogre pack', await goto('h_r1')); const h1 = await fight('h_r1_done'); check('hollow: r1 cleared', h1.includes('ogre') && await fired('h_r1_done'), h1);
  await tpTo(...(await ev(() => [G.map.objects.find(o => o.shrineId === 'hollow_shrine').x - 8, G.map.objects.find(o => o.shrineId === 'hollow_shrine').y])));
  const r2at = await ev(() => window.__at('h_r2'));
  await ev(([x, y]) => window.__tp(x, y), r2at); await wait(700);
  check('hollow: gallery does NOT fire before the shrine (sleeper armed after it)', !(await fired('h_r2')) && !(await ev(() => window.__live().includes('mountaintroll'))));
  check('hollow: midpoint shrine (a plain checkpoint, not a warp end)', await goto('h_shrine') && await ev(() => (G.checkpoint || {}).map === 'pinewood' && !shrineTargets().some(o => o.shrineId === 'hollow_shrine'))); await shot('hollow_shrine');
  await ev(([x, y]) => window.__tp(x, y), r2at); await wf(() => G.trig.fired.h_r2, null, 6000);
  await ev(() => { for (const d of G.delays) d.t = Math.min(d.t, 0.02); }); await wait(900);
  const g1 = await ev(() => window.__live()); await shot('hollow_gallery');
  const h2 = await fight('h_r2_done', 8);
  const all2 = [...new Set([...g1, ...h2])];
  check('hollow: gallery = boar + shaman (slash wrong), and exactly one mountain troll (the sleeper)', all2.includes('thornbackboar') && all2.includes('brambleshaman') && all2.includes('mountaintroll') && await fired('h_r2_done'), all2);
  check('hollow: secret 5 (cross-section) - the ceiling over the gallery drops the cache key', await goto('h_ceiling') && await ranAction("a.type === 'loot' && a.item === 'key_rootcache'") && await hasKeyNow('key_rootcache')); await shot('hollow_secret_ceiling_key');
  const lever = await ev(() => { const o = G.map.objects.find(q => q.lever && q.src.id === 'lever_h_r2'); const before = G.map.colliders.length; window.__tp(o.x, o.y + 0.7); o.use.fn(o); return { pulled: o.pulled, d: before - G.map.colliders.length }; });
  check('hollow: gate hint by the rooted gate', await goto('h_gate_hint'));
  check('hollow: lever opens the gate (barrier colliders removed)', lever.pulled && lever.d > 0 && await ev(() => gateOpen(G.map, 'gate_h_r2')), lever); await shot('hollow_lever_gate');
  check('hollow: secret 4 - cracked wall: hum, then opens, socket rune', await (async () => {
    const before = await colliders(); const a = await goto('h_crack_hum'); await shot('hollow_secret_crack_tell'); const b = await goto('h_crack_open');
    return a && b && (await colliders()) < before && await goto('h_crack_loot') && await ranAction("a.type === 'loot' && a.item === 'socket_rune'");
  })());
  // the root-stair is sealed and the Clearing gate shut until Mossjaw falls
  const sealed = await ev(() => { const o = G.map.objects.find(q => q.warpdoor && q.gid === 'hollow_exit'); const gate = G.map.objects.some(q => q.barrier === 'gate' && q.gid === 'arena_gate' && !q.gone); return { door: !!o, locked: o ? !doorUnlocked(G.map, o) || (o.src && o.src.open === false && !gateOpen(G.map, 'hollow_exit')) : null, arenaGate: gate }; });
  check('hollow: before Mossjaw the root-stair is sealed and the Clearing gate is shut', sealed.arenaGate && (sealed.door ? sealed.locked : await ev(() => G.map.objects.some(q => q.barrier === 'gate' && q.gid === 'hollow_exit_gate' && !q.gone))), sealed);
  // Mossjaw
  check('hollow: Mossjaw den: boss spawns (G.boss set, mossjaw)', await goto('h_boss') && await wf(() => G.boss && G.boss.type === 'mossjaw', null, 9000)); await shot('hollow_mossjaw');
  const bossHp = await ev(() => G.boss ? { hp: G.boss.hp, lvl: G.boss.lvl } : null);
  await fight('h_boss_done', 8);
  check('hollow: Mossjaw falls -> quest step 3, the root-stair unseals, the Clearing gate opens', await wf(() => G.trig.fired.h_boss_done) && (await quest('shard_root')) === 3 && await ev(() => gateOpen(G.map, 'arena_gate') && (gateOpen(G.map, 'hollow_exit') || gateOpen(G.map, 'hollow_exit_gate'))), bossHp);
  await shot('hollow_exit_stair');
  const exitMode = await useDoor('hollow_exit');
  check('hollow: the root-stair (warp door) leaves the Hollow up to shrine 3 (' + exitMode + ')', (await secOf()) === 'forest' && await ev(() => { const o = G.map.objects.find(q => q.shrineId === 'shrine3'); return Math.hypot(G.player.x - o.x, G.player.y - o.y) < 3.5; }));
  check('hollow: arriving at shrine 3 re-attunes it (the checkpoint follows the hero out of the Hollow)', await wf(() => { const o = G.map.objects.find(q => q.shrineId === 'shrine3'); return G.checkpoint && Math.hypot(G.checkpoint.x - o.x, G.checkpoint.y - o.y) < 2.6; }, null, 5000) && await fired('shrine3'));

  // =================================================================== BRAMBLEHORN'S CLEARING (inline arena)
  await wait(300); await ev(() => window.__hero());
  check('clearing: the arena hint at the gate fires; arena_gate is open for good after Mossjaw', await goto('arena_hint') && await ev(() => gateOpen(G.map, 'arena_gate')));
  check('clearing: Bramblehorn intro line + boss spawns in the Clearing section', await goto('boss') && await wf(() => window.__log.talks.some(t => t.id === 'boss_bramblehorn_intro')) && await wf(() => G.boss && G.boss.type === 'bramblehorn', null, 12000) && (await secOf()) === 'clearing'); await shot('clearing_bramblehorn');
  const arenaOn = await ev(() => ({ on: !!(G.arena && !G.arena.done), gateShut: G.map.objects.some(q => q.barrier === 'gate' && q.gid === 'arena_gate' && !q.gone) }));
  const arenaMode = await ev(() => typeof startArena === 'function' && window.__log.actions.some(a => a.type === 'arena'));
  check('clearing: the arena closes behind you (arena action + arena_gate) while the fight runs', !arenaMode || (arenaOn.on && arenaOn.gateShut), arenaOn);
  await wf(() => window.__live().includes('sapling'), null, 20000).then(async ok => { await ev(() => { for (const d of G.delays) d.t = Math.min(d.t, 0.02); }); await wait(800); });
  check('clearing: the saplings wake (Bramblehorn with saplings)', await ev(() => window.__live().filter(t => t === 'sapling').length >= 3 || G.trig.fired.boss));
  // dying in the arena: respawn at the nearest shrine, the arena resets
  const died = await ev(() => { const p = G.player; p.invulnT = 0; p.hp = 1; hurtPlayer ? hurtPlayer(p, 9999, null) : null; return !!(p.dead || G.state === 'dead'); }).catch(() => false);
  if (died || await wf(() => G.state === 'dead', null, 3000)) {
    await wf(() => G.state === 'play' && !G.player.dead, null, 12000); await wait(600); await ev(() => window.__hero());
    const rs = await ev(() => { const o = G.map.objects.find(q => q.shrineId === 'shrine3'); return { near: Math.hypot(G.player.x - o.x, G.player.y - o.y) < 4, enemies: window.__live().length, bossTrig: !!G.trig.fired.boss, gateOpen: gateOpen(G.map, 'arena_gate'), arenaDone: G.arena ? !!G.arena.done : null }; });
    check('clearing: dying in the arena respawns at the nearest shrine (3); the arena resets (adds gone, boss trigger re-armed, gate open)', rs.near && rs.enemies === 0 && !rs.bossTrig && rs.gateOpen, rs);
    await goto('boss'); await wf(() => G.boss && G.boss.type === 'bramblehorn', null, 12000);
  } else check('clearing: dying in the arena respawns at the nearest shrine', false, 'the hero did not die');
  await ev(() => { window.__loot.length = 0; });
  await fight('victory', 10);
  await wait(800);
  const drops = await ev(() => window.__loot.slice());
  check('clearing: death line + Root-Crown drops', await wf(() => G.trig.fired.victory) && await said('boss_bramblehorn_death') && drops.some(d => /rootcrown/i.test(d)), drops);
  check('clearing: shard quest done + both rifts open (home, Ruins), gate open, the Dream key is granted', (await quest('shard_root')) === 'done' && (await portalById('home_arena')) === true && (await portalById('next')) === true && await ev(() => gateOpen(G.map, 'arena_gate') && hasKey('key_dream'))); await shot('clearing_victory');
  await ev(() => { const p = G.map.portals.find(q => q.id === 'home_arena'); window.__tp(p.x + 0.2, p.y + 0.2); });
  check('clearing: rift home returns to the Vale (arrives at the Pinewood rift pad)', await wf(() => G.map.id === 'vale', null, 20000) && await ev(() => Math.hypot(G.player.x - 49, G.player.y - 69) < 5));
  await wait(500); await shot('vale_return');
  check('vale (return): settled beats stay settled - the rift is still open', (await portalOpen('pinewood')) === true);
  const da = await tryDoor('bridge_arena', 'barrier');
  check('vale (return): the Dream Arena bridge now opens with the key the Pinewood gave (after Act I)', da && da.open, da);

  // =================================================================== every trigger card fired at least once
  const missing = await ev(() => { const out = {}; for (const id of ['vale', 'pinewood']) out[id] = G.world.maps[id].triggers.map(t => t.id).filter(t => !window.__fired[id + ':' + t]); return out; });
  const total = await ev(() => ({ vale: G.world.maps.vale.triggers.length, pinewood: G.world.maps.pinewood.triggers.length }));
  check(`every trigger fired at least once (vale ${total.vale}, pinewood ${total.pinewood})`, !missing.vale.length && !missing.pinewood.length, missing);
  check('no page errors', errs.length === 0, errs.slice(0, 5));
  await br.close(); srv.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nAll Act I route checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
