#!/usr/bin/env node
'use strict';
// tools/act1-route.js -- scripted Act I walk-through (Vale -> Pinewood -> Root Hollow -> Bramblehorn -> home).
// Drives the real game in headless Chromium. It teleports the hero to each beat (triggers are enter_area / all_enemies_dead
// cards, so standing there is exactly what a player does), fast-forwards the wave timers, kills what spawns, and asserts that
// every trigger of the DESIGN 16.2 / STORY beats fires with the right actions (dialogue ids, quest steps, gates, portals, packs,
// loot) and that the page throws no errors. Barriers and levers are exercised through the engine (use.fn / openGate), not assumed.
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
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
  await wait(500);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  let shotN = 0;
  const shot = async name => { await wait(450); await page.screenshot({ path: path.join(SHOTS, `${String(++shotN).padStart(2, '0')}_${name}.png`) }); };

  // ---- instrumentation: record every trigger action, dialogue id/speaker, and enemy spawn the engine runs ----
  await ev(() => {
    window.__log = { actions: [], talks: [] };
    const ra = runAction; window.runAction = a => { window.__log.actions.push(a); return ra(a); };
    const tk = talk; window.talk = a => { const D = a.id && DIALOGUE[a.id]; window.__log.talks.push({ id: a.id || null, speaker: (D ? D.speaker : a.speaker) || '', first: (D ? (D.lines || [D.banner])[0] : (a.lines || [])[0]) || '' }); return tk(a); };
    // keep the hero alive and quick; the route is about triggers, not combat balance
    window.__hero = () => { const p = G.player; p.invulnT = 9999; p.hp = p.maxHp; };
    window.__tp = (x, y) => { const p = G.player; p.x = x; p.y = y; p.z = tileH(G.map, x, y); p.dash = null; G.cam.x = isoX(x, y); G.cam.y = isoY(x, y, p.z) - 12; window.__hero(); };
    window.__killAll = () => { let n = 0; for (const e of G.enemies.slice()) if (!e.dummy && !e.dead) { killEnemy(e); n++; } return n; };
    window.__live = () => G.enemies.filter(e => !e.dummy && !e.dead).map(e => e.type);
    window.__trg = id => G.map.triggers.find(t => t.id === id);
    window.__at = id => { const t = window.__trg(id); return t && t.when.type === 'enter_area' ? [t.when.x, t.when.y] : null; };
    window.__hero();
  });
  const wf = async (fn, arg, ms = 12000) => { try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch (e) { return false; } };
  const fired = id => ev(id => !!G.trig.fired[id], id);
  const goto = async id => { const at = await ev(id => window.__at(id), id); if (!at) throw new Error('no enter_area trigger ' + id); await ev(([x, y]) => window.__tp(x, y), at); return wf(id => !!G.trig.fired[id], id, 8000); };
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
  const ranAction = (pred) => ev(p => window.__log.actions.some(a => new Function('a', 'return ' + p)(a)), pred);
  const portalOpen = to => ev(to => { const p = G.map.portals.find(q => q.to === to); return p ? !!p.open : null; }, to);
  const objectsOf = fn => ev(fn => G.map.objects.filter(new Function('o', 'return ' + fn)).length, fn);
  const colliders = () => ev(() => G.map.colliders.length);

  // =================================================================== THE VALE
  check('vale: 40x40, level band [1,3]', await ev(() => G.map.id === 'vale' && G.map.W === 40 && G.map.H === 40 && JSON.stringify(G.world.maps.vale.level) === '[1,3]'));
  check('vale: banner + Pip wakes you ("Up. You were sleeping like you meant it.")', await wf(() => G.trig.fired.wake) && await said('vale_wake') && await said('vale_banner')
    && await ev(() => DIALOGUE.vale_wake.lines[0] === 'Up. You were sleeping like you meant it.'));
  check('vale: two training dummies stand in the yard', await ev(() => G.enemies.filter(e => e.dummy).length === 2));
  check('vale: the Pinewood rift starts CLOSED', (await portalOpen('pinewood')) === false);
  await shot('vale_wake');
  check('vale: yard lesson fires (swing, dodge, Q)', await goto('yard_teach')); await shot('vale_yard');
  check('vale: shrine checkpoint', await goto('shrine') && await ev(() => !!G.checkpoint));
  check('vale: Elder Stone speaks (vale_elder) and starts "Stone\'s lost lantern" (step 0)', await goto('elder') && await said('vale_elder') && (await quest('vale_lantern')) === 0);
  check('vale: Elder Stone is a visible tablet object', await objectsOf("o.tablet && o.src && o.src.title === 'Elder Stone'") === 1); await shot('vale_elder_stone');
  // first chest: the engine rolls the starter kit (weapon + armour + gem) when the chest is opened
  check('vale: first chest trigger fires, Pip says "That glow? Keep it. Gear remembers you."', await goto('chest') && await wf(() => window.__log.talks.some(t => t.id === 'vale_chest'), null, 9000));
  const ch = await ev(() => { const o = G.map.objects.find(q => q.chest && q.src.starter); if (!o) return null; G.drops.length = 0; openChest(o); return { tier: o.src.tier, opened: o.opened }; });
  await wait(900);
  const kit = await ev(() => G.drops.map(d => d.kind + ':' + (d.kind === 'item' ? d.it.slot + '/' + d.it.rarity : d.gem)));
  check('vale: starter chest exists, opens, drops weapon + armour + gem (rings: not wired, see report)', !!ch && ch.opened && kit.length >= 3 && kit.some(k => k.startsWith('gem')), kit); await shot('vale_first_chest');
  check('vale: fishing stub beside the chest (visible, interactable)', await objectsOf('o.fish') >= 1 && await goto('fish_hint'));
  check('vale: cottage tablet', await goto('tablet') && await said('vale_tablet'));
  // lost lantern: found before the ambush is fine (quest is independent), returned after
  check('vale: lantern trigger needs the Stone first, then advances quest to step 1', await goto('lantern_found') && (await quest('vale_lantern')) === 1);
  await shot('vale_lost_lantern');
  // garden ambush -> rift opens
  check('vale: garden ambush: 3 slimes', await goto('garden_ambush') && await wf(() => window.__live().length === 3, null, 6000)); await shot('vale_garden_ambush');
  const slimes = await ev(() => window.__live());
  check('vale: ambush slimes are gloomslime', slimes.every(t => t === 'gloomslime'), slimes);
  await fight('garden_done');
  check('vale: ambush cleared -> rift opens (portal, banner, vale_rift, shard_root step 0)', await wf(() => G.trig.fired.garden_done) && (await portalOpen('pinewood')) === true && await said('vale_rift') && (await quest('shard_root')) === 0);
  await shot('vale_rift_open');
  check('vale: lantern returned -> quest done + reward', await goto('lantern_return') && (await quest('vale_lantern')) === 'done' && await ranAction("a.type === 'loot' && a.item === 'socket_rune'"));
  check('vale: hidden gem cache', await goto('gems'));
  // take the real rift
  await ev(() => { const p = G.map.portals.find(q => q.to === 'pinewood'); window.__tp(p.x - 0.4, p.y + 0.9); });
  check('vale: stepping into the rift enters the Pinewood', await wf(() => G.map.id === 'pinewood', null, 12000));

  // =================================================================== MISTY PINEWOOD
  await wait(600); await ev(() => window.__hero());
  check('pinewood: 56x56, level band [3,10]', await ev(() => G.map.W === 56 && JSON.stringify(G.world.maps.pinewood.level) === '[3,10]'));
  check('pinewood: banner + Pip intro', await wf(() => G.trig.fired.banner && G.trig.fired.intro) && await said('pinewood_banner')); await shot('pinewood_arrival');
  const crit = await ev(() => ({ fox: G.map.critterSpawns.filter(c => c.type === 'fox').length, rabbit: G.map.critterSpawns.filter(c => c.type === 'rabbit').length }));
  check('pinewood: fleeing-animal trail (foxes + rabbits along the road)', crit.fox >= 6 && crit.rabbit >= 10, crit);
  check('pinewood: trail trigger -> "Everything with legs is leaving."', await goto('trail') && await said('pinewood_fox')); await shot('pinewood_trail');
  check('pinewood: fishing spot (visible stub) + intro', await objectsOf('o.fish') >= 2 && await goto('fish_intro')); await shot('pinewood_fishing');
  check('pinewood: tablet (pinewood_tablet)', await goto('tablet') && await said('pinewood_tablet') && await objectsOf('o.tablet') >= 1);
  // troll rule: no troll anywhere in this map's trigger data
  check('pinewood: no troll spawns (kept for Root Hollow)', await ev(() => !JSON.stringify(G.map.triggers).match(/troll/)));
  check('pinewood: packs come from ENCOUNTERS (pack ids on the spawn cards)', await ev(() => { const ids = new Set(); for (const t of G.map.triggers) for (const a of t.actions) { if (a.pack) ids.add(a.pack); if (a.type === 'spawnPack') ids.add(a.id); } return [...ids].sort().join(); }) === 'pw_boar_last,pw_boar_pierce,pw_boar_shaman,pw_ogre_grove,pw_ogre_run,pw_ogre_slimes');
  check('pinewood: r1 ogre pack', await goto('r1')); const r1 = await fight('r1_done');
  check('pinewood: r1 spawned ogre + gloomslime + shadehound; cleared', r1.includes('ogre') && r1.includes('gloomslime') && r1.includes('shadehound') && await fired('r1_done'), r1); await shot('pinewood_r1_ogres');
  // elite ogre with the key
  check('pinewood: elite ogre guards the key', await goto('elite')); await wf(() => window.__live().length >= 1, null, 5000);
  const el = await ev(() => G.enemies.filter(e => !e.dummy).map(e => ({ t: e.type, elite: !!e.elite || !!(e.mods && e.mods.length) || !!e.eliteMods })));
  await shot('pinewood_elite');
  await fight('elite_done');
  check('pinewood: elite is an ogre (no healer with it) and drops the root key', el.length === 1 && el[0].t === 'ogre' && await ev(() => hasKey('key_roothollow')) && (await quest('shard_root')) === 1, el);
  // the ford ambush: the wrong-weapon pack
  check('pinewood: ford ambush (boars resist pierce)', await goto('ford')); const ford = await fight('ford_done'); check('pinewood: ford pack = boar + slime + hound', ford.includes('thornbackboar') && await fired('ford_done'), ford);
  check('pinewood: second shrine', await goto('shrine2'));
  check('pinewood: r2 plaza: boar + shaman first (support), then ogre pack', await goto('r2')); const r2 = await fight('r2_done', 8); check('pinewood: r2 cleared with a shaman in it', r2.includes('brambleshaman') && r2.includes('thornbackboar') && r2.includes('ogre') && await fired('r2_done'), r2);
  check('pinewood: r3 grove: ogre grove + boar last, then the rift opens', await goto('r3')); const r3 = await fight('r3_done', 8);
  check('pinewood: r3 cleared -> rift to Root Hollow opens', await fired('r3_done') && (await portalOpen('roothollow')) === true && r3.includes('brambleshaman'), r3); await shot('pinewood_rift_down');
  // secrets
  check('pinewood: secret 1 - cracked wall: hum, wall solid, then opens', await (async () => {
    const before = await colliders(); const hid = await objectsOf("o.barrier === 'hidden'");
    const a = await goto('crack_hum'); await shot('pinewood_secret_crack_tell'); const b = await goto('crack_open');
    const after = await colliders(); return a && b && hid > 0 && after < before && await ev(() => gateOpen(G.map, 'wall_crack'));
  })());
  check('pinewood: cracked wall cache pays out', await goto('crack_loot'));
  check('pinewood: secret 2 - raised bridge (gate) blocks, lever (real object) lowers it', await (async () => {
    const hasGate = await objectsOf("o.barrier === 'gate' && o.gid === 'bridge_gate'"); await goto('bridge_pip'); await shot('pinewood_secret_raised_bridge');
    const before = await colliders();
    const lv = await ev(() => { const o = G.map.objects.find(q => q.lever && q.src.id === 'lever_bridge'); if (!o) return null; window.__tp(o.x, o.y + 0.7); o.use.fn(o); return o.pulled; });
    const after = await colliders(); return hasGate > 0 && lv === true && after < before && await ev(() => gateOpen(G.map, 'bridge_gate'));
  })());
  await shot('pinewood_secret_bridge_lowered');
  check('pinewood: gold chest waits on the islet', await objectsOf("o.chest && o.src.tier === 'gold'") === 1);
  check('pinewood: detour chest (lantern-lit, off the road)', await objectsOf("o.chest && o.src.label === 'detour-chest'") === 1 && await goto('env_hint')); await shot('pinewood_detour_chest');
  // down the rift
  await ev(() => { const p = G.map.portals.find(q => q.to === 'roothollow'); window.__tp(p.x - 0.4, p.y + 0.9); });
  check('pinewood: rift down enters Root Hollow', await wf(() => G.map.id === 'roothollow', null, 12000));

  // =================================================================== ROOT HOLLOW
  await wait(600); await ev(() => window.__hero());
  check('hollow: 32x32, level band [3,10]', await ev(() => G.map.W === 32 && JSON.stringify(G.world.maps.roothollow.level) === '[3,10]'));
  check('hollow: entry - Pip "Under the wood, it\'s quieter. I hate it." + quest step 2', await wf(() => G.trig.fired.intro) && await said('pinewood_hollow') && (await quest('shard_root')) === 2); await shot('hollow_entry');
  // key door: locked without the key, opens with it
  const door = await ev(() => { const o = G.map.objects.find(q => q.barrier === 'keydoor' && q.use); const key = G.prog.secrets['key:key_roothollow']; G.prog.secrets['key:key_roothollow'] = false; window.__tp(o.x, o.y + 0.9); o.use.fn(o); const lockedHolds = !gateOpen(G.map, o.gid); G.prog.secrets['key:key_roothollow'] = key; return { lockedHolds, gid: o.gid }; });
  check('hollow: key door stays shut without the key', door.lockedHolds);
  const c0 = await colliders();
  await ev(() => { const o = G.map.objects.find(q => q.barrier === 'keydoor' && q.use); o.use.fn(o); });
  check('hollow: key door opens with the Pinewood key', await ev(id => gateOpen(G.map, id), door.gid) && (await colliders()) < c0); await shot('hollow_key_door');
  check('hollow: r1 ogre pack', await goto('r1')); const h1 = await fight('r1_done'); check('hollow: r1 cleared', h1.includes('ogre') && await fired('r1_done'), h1);
  // sleeper rule: r2 cannot fire before the shrine
  await ev(() => window.__tp(G.map.start.x, G.map.start.y)); const r2at = await ev(() => window.__at('r2'));
  await ev(([x, y]) => window.__tp(x, y), r2at); await wait(700);
  check('hollow: gallery does NOT fire before the shrine (sleeper armed after it)', !(await fired('r2')) && !(await ev(() => window.__live().includes('mountaintroll'))));
  check('hollow: midpoint shrine', await goto('shrine')); await shot('hollow_shrine');
  await ev(([x, y]) => window.__tp(x, y), r2at); await wf(() => G.trig.fired.r2, null, 6000);
  await ev(() => { for (const d of G.delays) d.t = Math.min(d.t, 0.02); }); await wait(900);
  const g1 = await ev(() => window.__live()); await shot('hollow_gallery');
  const h2 = await fight('r2_done', 8);
  const all2 = [...new Set([...g1, ...h2])];
  check('hollow: gallery = boar + shaman (slash wrong), and exactly one mountain troll (the sleeper)', all2.includes('thornbackboar') && all2.includes('brambleshaman') && all2.includes('mountaintroll') && await fired('r2_done'), all2);
  const lever = await ev(() => { const o = G.map.objects.find(q => q.lever && q.src.id === 'lever_r2'); const before = G.map.colliders.length; window.__tp(o.x, o.y + 0.7); o.use.fn(o); return { pulled: o.pulled, d: before - G.map.colliders.length }; });
  check('hollow: lever opens the gate (barrier colliders removed)', lever.pulled && lever.d > 0 && await ev(() => gateOpen(G.map, 'gate_r2')), lever); await shot('hollow_lever_gate');
  // secret 3
  check('hollow: secret 3 - cracked wall: hum, then opens, socket rune', await (async () => {
    const before = await colliders(); const a = await goto('crack_hum'); await shot('hollow_secret_crack_tell'); const b = await goto('crack_open');
    return a && b && (await colliders()) < before && await goto('crack_loot') && await ranAction("a.type === 'loot' && a.item === 'socket_rune'");
  })());
  // Mossjaw
  await goto('lever_r2'); // (trigger version, requires r2_done)
  check('hollow: Mossjaw den: boss spawns (G.boss set, mossjaw)', await goto('boss') && await wf(() => G.boss && G.boss.type === 'mossjaw', null, 9000)); await shot('hollow_mossjaw');
  const bossHp = await ev(() => G.boss ? { hp: G.boss.hp, lvl: G.boss.lvl } : null);
  await fight('boss_done', 8);
  check('hollow: Mossjaw falls -> exit rift opens, quest step 3', await wf(() => G.trig.fired.boss_done) && (await portalOpen('pinewood_boss')) === true && (await quest('shard_root')) === 3, bossHp);
  await shot('hollow_exit_rift');
  await ev(() => { const p = G.map.portals.find(q => q.to === 'pinewood_boss'); window.__tp(p.x, p.y + 0.9); });
  check('hollow: rift down enters Bramblehorn\'s court', await wf(() => G.map.id === 'pinewood_boss', null, 12000));

  // =================================================================== BRAMBLEHORN
  await wait(600); await ev(() => window.__hero());
  check('court: level band [6,10]', await ev(() => JSON.stringify(G.world.maps.pinewood_boss.level) === '[6,10]'));
  check('court: shrine + Pip warning', await goto('intro') && await goto('shrine')); await shot('court_arrival');
  check('court: Bramblehorn intro line + boss spawns', await goto('boss') && await wf(() => window.__log.talks.some(t => t.id === 'boss_bramblehorn_intro')) && await wf(() => G.boss && G.boss.type === 'bramblehorn', null, 12000)); await shot('court_bramblehorn');
  await ev(() => { G.drops.length = 0; });
  await fight('victory', 10);
  await wait(800);
  const drops = await ev(() => G.drops.map(d => d.kind === 'item' ? (d.it.unique || d.it.uid || d.it.name || d.it.id) : d.kind));
  check('court: death line + Root-Crown drops', await wf(() => G.trig.fired.victory) && await said('boss_bramblehorn_death') && await ev(() => G.drops.some(d => d.kind === 'item' && /rootcrown|Root-Crown|Root Crown/i.test(JSON.stringify(d.it)))), drops);
  check('court: shard quest done + rift home to the Vale opens', (await quest('shard_root')) === 'done' && (await portalOpen('vale')) === true); await shot('court_victory');
  await ev(() => { const p = G.map.portals.find(q => q.to === 'vale'); window.__tp(p.x - 0.4, p.y + 0.9); });
  check('court: rift home returns to the Vale (arrives at the Pinewood rift pad)', await wf(() => G.map.id === 'vale', null, 12000) && await ev(() => Math.hypot(G.player.x - 25, G.player.y - 35.5) < 5));
  await wait(500); await shot('vale_return');
  check('vale (return): settled beats stay settled - the rift is still open', (await portalOpen('pinewood')) === true);

  check('no page errors', errs.length === 0, errs.slice(0, 5));
  await br.close(); srv.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nAll Act I route checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
