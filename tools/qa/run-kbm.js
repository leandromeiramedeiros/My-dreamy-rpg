#!/usr/bin/env node
'use strict';
// Pass 1: full Act I from the title screen with keyboard + mouse. Usage: node tools/qa/run-kbm.js [vale|pinewood|hollow|court|all]
const fs = require('fs'), path = require('path');
const { launch, Bot, KbmDriver, sleep, QA } = require('./lib');
const STOP_AFTER = process.argv[2] || 'all';

(async () => {
  const { br, page, errors } = await launch();
  const drv = new KbmDriver(page), bot = new Bot(page, drv, 'kbm');
  bot.out.started = new Date().toISOString();
  const has = (s, id) => s.fired.includes(id);
  const mapIs = id => s => s.map === id && s.st === 'play';
  const mark = async (name) => { const s = await bot.snap(); bot.out.marks = bot.out.marks || []; bot.out.marks.push({ at: +bot.el(), name, map: s.map, lvl: s.p && s.p.lvl, hp: s.p && s.p.hp }); bot.log('MARK ' + name, { lvl: s.p && s.p.lvl }); };

  async function equipBest(why) {
    for (let round = 0; round < 8; round++) {
      const s = await bot.snap();
      const bag = await page.evaluate(() => window.__qa.bag());
      const ups = bag.filter(b => b.score > b.eq && b.reqLvl <= s.p.lvl && (b.slot !== 'weapon' || b.fam === b.curFam)).sort((a, b) => (b.score - b.eq) - (a.score - a.eq));
      if (!ups.length) break;
      const u = ups[0];
      await drv.tap('Tab'); await sleep(600);
      if (round === 0) await bot.shot('bag-open-' + why);
      const fl = await page.evaluate(() => window.__qa.focusList());
      const r = fl.find(q => q.id === 'bag:' + u.i);
      let ok = false;
      if (r) {
        await drv.clickDisp(r.x + r.w / 2, r.y + r.h / 2); await sleep(450);
        const after = await bot.snap(); ok = true;
        ok = await page.evaluate(([sl, uid]) => window.__qa.isEq(sl, uid), [u.slot, u.uid]);
      }
      if (!ok) { bot.find('minor', 'Equip by mouse (double-click bag slot) did not equip the upgrade', { item: u, hadRegion: !!r }, await bot.shot('equip-fail')); await page.evaluate(([sl, uid, i]) => { if (!window.__qa.isEq(sl, uid)) window.__qa.equip(i); }, [u.slot, u.uid, u.i]); }
      else bot.log('equipped via mouse', { name: u.name, slot: u.slot, rarity: u.rarity });
      await drv.tap('Tab'); await sleep(400);
      const s2 = await bot.snap(); if (s2.ui.open) { await drv.tap('Escape'); await sleep(300); }
    }
  }
  async function menuTour() {
    const shots = [];
    for (const [k, nm] of [['KeyK', 'character'], ['KeyJ', 'quests'], ['KeyB', 'bestiary'], ['KeyI', 'bag']]) { await drv.tap(k); await sleep(500); shots.push(await bot.shot('menu-' + nm)); }
    await drv.tap('KeyI'); await sleep(300); const s = await bot.snap(); if (s.ui.open) { await drv.tap('Escape'); await sleep(300); }
    await drv.tap('KeyH'); await sleep(400); await bot.shot('menu-help'); await drv.tap('KeyH'); await sleep(300);
    const s2 = await bot.snap(); if (s2.ui.help) await drv.tap('Escape');
  }
  async function loot(ms = 3500) {
    await bot.idle(Math.min(ms, 1500));
    for (let k = 0; k < 14; k++) {
      const s = await bot.snap(); if (!s.p || s.st !== 'play') break;
      const d = s.drops.filter(q => q.t > 0.4 && Math.hypot(q.x - s.p.x, q.y - s.p.y) < 14).sort((a, b) => Math.hypot(a.x - s.p.x, a.y - s.p.y) - Math.hypot(b.x - s.p.x, b.y - s.p.y))[0];
      if (!d) break;
      await bot.goal({ name: 'pick up ' + d.name, x: d.x, y: d.y, r: 0.4, timeout: 9000, noFinding: true });
    }
  }
  async function takePortal(id, toMap, timeout = 90000) {
    let s = await bot.snap(); const pt = s.portals.find(q => q.id === id || q.to === id);
    if (!pt) { bot.find('blocker', `Portal ${id} missing`, {}); return false; }
    if (!pt.open) { bot.find('blocker', `Portal ${id} is not open when the objective says to take it`, { obj: s.obj, fired: s.fired }); }
    await bot.goal({ name: 'portal->' + toMap, x: pt.x, y: pt.y, r: 0.5, until: q => q.map === toMap && q.st === 'play', timeout, softlock: true });
    await sleep(1000);
    return (await bot.snap()).map === toMap;
  }

  try {
    // ============================================================== TITLE -> NEW DREAM
    let s = await bot.snap(); await bot.observe(s);
    await bot.shot('title');
    bot.log('title: clicking NEW DREAM with the mouse');
    await drv.title();
    for (let i = 0; i < 20; i++) { s = await bot.snap(); if (s.st === 'play') break; await sleep(300); }
    if (s.st !== 'play') { await drv.title(); await sleep(1500); s = await bot.snap(); }
    bot.log('after New Dream', { st: s.st, obj: s.obj });
    if (s.st !== 'play') bot.find('blocker', 'Clicking NEW DREAM did not start the game', { st: s.st }, await bot.shot('title-stuck'));
    await bot.observe(s);
    await bot.shot('vale-start');
    await mark('vale-start');

    // ============================================================== 1. THE VALE
    const objSeen = [];
    await bot.idle(2500); await bot.shot('vale-wake');
    // yard dummies: swing, Q, dodge (what yard_teach asks)
    const tD = Date.now(); let dodged = false;
    await bot.goal({ name: 'dummies', dummies: true, timeout: 20000, until: q => { if (Date.now() - tD > 11000) return true; return false; }, engageR: 0 });
    await drv.attack(false);
    await drv.dodge(); await sleep(400); await bot.shot('vale-dummies');
    await bot.goal({ name: 'shrine', x: 8.5, y: 29.2, r: 1.2, interact: 'shrine', ir: 2.2, once: true, timeout: 60000 });
    await bot.goal({ name: 'yard_teach', x: 14.5, y: 33.5, r: 2.5, until: q => has(q, 'yard_teach'), timeout: 60000 });
    await bot.shot('vale-yard-lesson');
    await bot.goal({ name: 'elder plaza', x: 19.5, y: 21, r: 2.5, until: q => has(q, 'elder'), timeout: 120000 });
    await bot.goal({ name: 'read elder stone', x: 19.5, y: 21, r: 1.2, interact: 'tablet', once: true, timeout: 20000 });
    await sleep(1500); await bot.shot('vale-elder');
    // chest north-east (objective)
    await bot.goal({ name: 'tutorial chest', x: 36.5, y: 16.5, r: 1.1, interact: 'chest', once: true, timeout: 150000 });
    await loot(4000); await bot.shot('vale-chest-loot');
    await equipBest('vale');
    await menuTour();
    // fish spot / hint passes; then the lantern (the objective gives no location)
    await bot.goal({ name: 'lantern (far NW)', x: 4.5, y: 4.3, r: 1.8, until: q => has(q, 'lantern_found'), timeout: 200000 });
    await bot.shot('vale-lantern');
    await loot(2500);
    // return the lantern (objective says Elder Stone); the garden ambush may fire on the way
    await bot.goal({ name: 'return lantern', x: 19.5, y: 21, r: 2.5, until: q => has(q, 'lantern_return'), timeout: 200000 });
    await loot(3000); await bot.shot('vale-lantern-return');
    s = await bot.snap();
    bot.log('objective after lantern return', { obj: s.obj, ambushFired: has(s, 'garden_ambush'), done: has(s, 'garden_done') });
    if (!has(s, 'garden_ambush')) await bot.goal({ name: 'garden ambush', x: 17, y: 8.5, r: 2.5, until: q => has(q, 'garden_ambush'), timeout: 120000 });
    await bot.shot('vale-garden-ambush');
    await bot.clear('garden ambush clear', 120000);
    await sleep(2500); await bot.shot('vale-rift-open');
    s = await bot.snap(); bot.log('after ambush', { obj: s.obj, portalOpen: s.portals.find(q => q.id === 'pine').open });
    await loot(2500);
    await equipBest('vale2');
    await mark('vale-done');
    if (STOP_AFTER === 'vale') throw new Error('STOP');
    await takePortal('pine', 'pinewood');

    // ============================================================== 2. PINEWOOD
    await mark('pinewood-enter'); await sleep(1800); await bot.shot('pinewood-arrival');
    await bot.goal({ name: 'pine shrine', x: 8.8, y: 46.8, r: 1.2, interact: 'shrine', once: true, timeout: 60000 });
    await bot.goal({ name: 'follow animals (trail)', x: 8.55, y: 35.74, r: 3, until: q => has(q, 'trail'), timeout: 120000 });
    await bot.shot('pinewood-trail');
    // secret 1: cracked wall hum -> open
    await bot.goal({ name: 'crack hum', x: 14.88, y: 35.75, r: 2.4, until: q => has(q, 'crack_hum'), timeout: 90000 });
    await bot.shot('pinewood-crack-tell');
    await bot.idle(1500);
    await bot.goal({ name: 'crack open', x: 16.09, y: 36.45, r: 1.2, until: q => has(q, 'crack_open'), timeout: 60000 });
    await bot.shot('pinewood-crack-open');
    await bot.goal({ name: 'crack loot', x: 20, y: 40, r: 1.6, until: q => has(q, 'crack_loot'), timeout: 90000 });
    await loot(2500);
    await bot.goal({ name: 'r1 ogres (road east)', x: 38, y: 40, r: 4, until: q => has(q, 'r1'), timeout: 150000 });
    await bot.shot('pinewood-r1');
    await bot.clear('r1 clear', 150000);
    await loot(2500); await equipBest('pine1');
    await mark('pinewood-r1-done');
    s = await bot.snap(); bot.log('objective after r1', { obj: s.obj });
    await bot.goal({ name: 'shrine2', x: 34, y: 23.6, r: 1.2, interact: 'shrine', once: true, timeout: 120000 });
    await bot.goal({ name: 'r2 plaza', x: 20, y: 13, r: 4, until: q => has(q, 'r2'), timeout: 150000 });
    await bot.shot('pinewood-r2');
    await bot.clear('r2 clear', 180000);
    await loot(2500); await equipBest('pine2');
    await mark('pinewood-r2-done');
    await bot.goal({ name: 'r3 grove', x: 46, y: 9, r: 4, until: q => has(q, 'r3'), timeout: 180000 });
    await bot.shot('pinewood-r3');
    await bot.clear('r3 clear', 180000);
    await loot(2500); await bot.shot('pinewood-rift-open'); await equipBest('pine3');
    await mark('pinewood-r3-done');
    s = await bot.snap(); bot.log('objective after r3', { obj: s.obj });
    // objective: "...(key from the elite ogre)": ford is on the way south, then the elite
    await bot.goal({ name: 'ford', x: 49.5, y: 31, r: 4, until: q => has(q, 'ford'), timeout: 150000 });
    await bot.shot('pinewood-ford');
    await bot.clear('ford clear', 150000);
    await loot(2000);
    await bot.goal({ name: 'elite ogre (key)', x: 52, y: 47, r: 3.3, until: q => has(q, 'elite'), timeout: 150000 });
    await bot.shot('pinewood-elite');
    await bot.clear('elite clear', 150000);
    await loot(3000); await bot.shot('pinewood-key');
    s = await bot.snap(); bot.log('after elite', { obj: s.obj, keys: s.keys, quests: s.quests });
    await equipBest('pine4');
    await mark('pinewood-key');
    // detour chest (lantern-lit) beside the road north
    await bot.goal({ name: 'detour chest hint', x: 52.5, y: 22.5, r: 3, until: q => has(q, 'env_hint'), timeout: 90000 });
    const objs = await page.evaluate(() => window.__qa.objects());
    const detour = objs.find(o => o.chest && o.label === 'detour-chest');
    if (detour) await bot.goal({ name: 'detour chest', x: detour.x, y: detour.y, r: 1.1, interact: 'chest', once: true, timeout: 90000 }); else bot.find('minor', 'detour chest not found in objects', {});
    await loot(2500);
    // secret 2: raised bridge + lever (lever is far SW by the tablet; bridge gate far NW)
    const lever = objs.find(o => o.lever);
    if (lever) {
      await bot.goal({ name: 'bridge lever (SW)', x: lever.x, y: lever.y, r: 1.1, interact: 'lever', once: true, timeout: 200000 });
      await sleep(1500); await bot.shot('pinewood-lever');
    } else bot.find('major', 'No lever object found for the bridge', {});
    await bot.goal({ name: 'bridge pip (NW)', x: 11.6, y: 5, r: 2.5, until: q => has(q, 'bridge_pip'), timeout: 200000 });
    await bot.shot('pinewood-bridge');
    await bot.goal({ name: 'gold chest islet', x: 5, y: 4.5, r: 1.4, until: q => has(q, 'bridge_loot'), timeout: 120000 });
    const gold = objs.find(o => o.chest && o.tier === 'gold');
    if (gold) await bot.goal({ name: 'open gold chest', x: gold.x, y: gold.y, r: 1.1, interact: 'chest', once: true, timeout: 60000 });
    await loot(3500); await equipBest('pine5');
    await mark('pinewood-secrets-done');
    if (STOP_AFTER === 'pinewood') throw new Error('STOP');
    await takePortal('down', 'roothollow', 240000);

    // ============================================================== 3. ROOT HOLLOW
    await mark('hollow-enter'); await sleep(1800); await bot.shot('hollow-arrival');
    // key door (use kind keydoor)
    let hobjs = await page.evaluate(() => window.__qa.objects());
    const door = hobjs.find(o => o.use === 'keydoor');
    if (door) { await bot.goal({ name: 'key door', x: door.x, y: door.y + 0.4, r: 1.3, interact: 'keydoor', ir: 2.5, once: true, timeout: 90000 }); await sleep(1500); await bot.shot('hollow-key-door'); } else bot.find('major', 'no keydoor object in Root Hollow', {});
    await bot.goal({ name: 'crack hum (hollow)', x: 8.03, y: 20.49, r: 2.4, until: q => has(q, 'crack_hum'), timeout: 60000 });
    await bot.shot('hollow-crack-tell'); await bot.idle(1200);
    await bot.goal({ name: 'crack open (hollow)', x: 6.89, y: 19.68, r: 1.2, until: q => has(q, 'crack_open'), timeout: 60000 });
    await bot.goal({ name: 'crack loot (hollow)', x: 3.5, y: 16, r: 1.6, until: q => has(q, 'crack_loot'), timeout: 90000 });
    await loot(2500);
    await bot.goal({ name: 'hollow r1 ogres', x: 14, y: 25, r: 3.3, until: q => has(q, 'r1'), timeout: 150000 });
    await bot.shot('hollow-r1');
    await bot.clear('hollow r1 clear', 150000);
    await loot(2500); await equipBest('hollow1');
    s = await bot.snap(); bot.log('objective after hollow r1', { obj: s.obj });
    // go for r2 directly (before resting) to see what the player sees: the trigger waits for the shrine
    await bot.goal({ name: 'hollow gallery approach (no rest)', x: 24, y: 10, r: 3.5, until: q => has(q, 'r2') , timeout: 60000 });
    s = await bot.snap();
    if (!has(s, 'r2')) { bot.find('major', 'Root Hollow gallery does nothing until you rest at the shrine, and no hint says so (objective: "Rest at the shrine, then press on")', { obj: s.obj, pos: [s.p.x, s.p.y] }, await bot.shot('hollow-gallery-wait')); }
    await bot.goal({ name: 'hollow shrine', x: 23.5, y: 22, r: 1.2, interact: 'shrine', once: true, timeout: 120000 });
    await bot.goal({ name: 'hollow gallery', x: 24, y: 10, r: 3.5, until: q => has(q, 'r2'), timeout: 120000 });
    await bot.shot('hollow-gallery');
    await bot.clear('hollow gallery clear', 240000);
    await loot(2500); await equipBest('hollow2');
    await mark('hollow-gallery-done');
    s = await bot.snap(); bot.log('objective after gallery', { obj: s.obj });
    hobjs = await page.evaluate(() => window.__qa.objects());
    const levers = hobjs.filter(o => o.lever);
    bot.log('levers', levers);
    const gate = hobjs.find(o => o.barrier === 'gate' && o.gid === 'gate_r2') || hobjs.find(o => o.barrier === 'gate');
    // the boss trigger needs the player in the den (8,8) which is behind the rooted gate
    await bot.goal({ name: 'gate hint', x: 14.25, y: 7.14, r: 3, until: q => has(q, 'gate_hint'), timeout: 90000 });
    await bot.shot('hollow-gate');
    let pulled = 0;
    for (const lv of levers.sort((a, b) => Math.hypot(a.x - s.p.x, a.y - s.p.y) - Math.hypot(b.x - s.p.x, b.y - s.p.y))) {
      const cur = await bot.snap(); if (cur.fired.includes('boss')) break;
      await bot.goal({ name: 'lever ' + (lv.id || ''), x: lv.x, y: lv.y, r: 1.2, interact: 'lever', ir: 2.2, once: true, timeout: 150000 });
      await sleep(1500); await bot.shot('hollow-lever-' + (lv.id || pulled)); pulled++;
      // is the den reachable now?
      const pth = await page.evaluate(() => window.__qa.path(8, 8)); if (pth && pth.reachedExact) break;
    }
    await mark('hollow-levers');
    await bot.goal({ name: 'mossjaw den', x: 8, y: 8, r: 3.5, until: q => has(q, 'boss'), timeout: 200000, softlock: true });
    await bot.shot('hollow-mossjaw-start');
    await bot.clear('mossjaw fight', 420000);
    await sleep(2500); await bot.shot('hollow-mossjaw-dead'); await loot(3500); await equipBest('mossjaw');
    await mark('mossjaw-done');
    s = await bot.snap(); bot.log('after Mossjaw', { obj: s.obj, exitOpen: s.portals.find(q => q.id === 'exit').open });
    if (STOP_AFTER === 'hollow') throw new Error('STOP');
    await takePortal('exit', 'pinewood_boss', 120000);

    // ============================================================== 4. BRAMBLEHORN
    await mark('court-enter'); await sleep(1800); await bot.shot('court-arrival');
    await bot.goal({ name: 'court shrine', x: 6.3, y: 18.2, r: 1.2, interact: 'shrine', once: true, timeout: 60000 });
    await bot.goal({ name: 'bramblehorn throne', x: 14, y: 8.5, r: 4.8, until: q => has(q, 'boss'), timeout: 150000, softlock: true });
    await bot.shot('court-boss-start');
    await bot.clear('bramblehorn fight', 600000);
    await sleep(2500); await bot.shot('court-victory'); await loot(4000); await equipBest('court');
    s = await bot.snap(); bot.log('after Bramblehorn', { obj: s.obj, portals: s.portals, quests: s.quests });
    await mark('bramblehorn-done');
    if (STOP_AFTER === 'court') throw new Error('STOP');
    await takePortal('home', 'vale', 120000);

    // ============================================================== 5. BACK IN THE VALE
    await mark('vale-return'); await sleep(2500); await bot.shot('vale-return');
    s = await bot.snap(); bot.log('vale return', { obj: s.obj, pos: [s.p.x, s.p.y], quests: s.quests, portals: s.portals });
    await bot.goal({ name: 'elder after boss', x: 19.5, y: 21, r: 2.5, interact: 'tablet', ir: 2.5, once: true, timeout: 120000 });
    await sleep(2500); await bot.shot('vale-elder-after');
    s = await bot.snap(); bot.log('vale final', { obj: s.obj, lvl: s.p.lvl });
  } catch (e) {
    if (e.message !== 'STOP') { bot.log('RUN ERROR ' + e.stack); bot.find('info', 'Bot run error', { err: e.stack }); try { await bot.shot('run-error'); } catch (x) { /* */ } }
  }
  try { await bot.closeMap(Date.now()); } catch (e) { /* */ }
  bot.out.errors = errors; bot.out.finished = new Date().toISOString(); bot.out.totalSec = +bot.el();
  bot.out.seenTalk = bot.seenTalk;
  try { bot.out.finalSnap = await bot.snap(); } catch (e) { /* */ }
  bot.save();
  await drv.reset();
  await br.close();
  console.log('DONE', bot.el(), 's; errors:', errors.length);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
