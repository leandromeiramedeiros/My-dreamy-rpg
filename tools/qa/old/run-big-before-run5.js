#!/usr/bin/env node
'use strict';
// Act I on the BIG maps, played from the title screen with real inputs. Usage: node tools/qa/run-big.js <kbm|pad|touch> [stopAfter] [--lite]
//   --lite = main path only (skip secrets / side vaults). Writes tools/qa/run-<pass>.json incrementally.
const { launch, Bot, KbmDriver, PadDriver, TouchDriver, sleep } = require('./lib');
const PASS = process.argv[2] || 'kbm', STOP = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'all', LITE = process.argv.includes('--lite');

(async () => {
  const L = PASS === 'touch' ? await launch({ context: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } }) : await launch({ pad: PASS === 'pad' });
  const { br, page, errors } = L;
  const drv = PASS === 'touch' ? new TouchDriver(page) : PASS === 'pad' ? new PadDriver(page) : new KbmDriver(page);
  if (PASS === 'touch') await drv.init();
  const bot = new Bot(page, drv, PASS);
  bot.out.started = new Date().toISOString(); bot.out.lite = LITE;
  const has = (s, id) => s.fired.includes(id);
  const mark = async name => { const s = await bot.snap(); (bot.out.marks = bot.out.marks || []).push({ at: +bot.el(), name, map: s.map, sec: s.sec, lvl: s.p && s.p.lvl, hp: s.p && s.p.maxHp, deaths: s.deaths }); bot.log('MARK ' + name, { lvl: s.p && s.p.lvl, deaths: s.deaths }); };
  const objs = () => page.evaluate(() => window.__qa.objects());
  const near = (list, f) => list.find(f);
  async function loot(ms = 3000) {
    await bot.idle(Math.min(ms, 1500));
    for (let k = 0; k < 14; k++) {
      const s = await bot.snap(); if (!s.p || s.st !== 'play') break;
      const d = s.drops.filter(q => q.t > 0.4 && Math.hypot(q.x - s.p.x, q.y - s.p.y) < 16).sort((a, b) => Math.hypot(a.x - s.p.x, a.y - s.p.y) - Math.hypot(b.x - s.p.x, b.y - s.p.y))[0];
      if (!d) break;
      await bot.goal({ name: 'pick up ' + d.name, x: d.x, y: d.y, r: 0.4, timeout: 9000, noFinding: true });
    }
  }
  async function openBag() { if (PASS === 'touch') await drv.openBag(); else if (PASS === 'pad') await drv.tap(8); else await drv.tap('Tab'); await sleep(600); }
  async function closeBag() { if (PASS === 'kbm') await drv.tap('Tab'); else await drv.closeMenu(); await sleep(450); const s = await bot.snap(); if (s.ui.open) { await drv.closeMenu(); await sleep(300); } }
  async function equipBest(why) {
    for (let round = 0; round < 8; round++) {
      const s = await bot.snap(); const bag = await page.evaluate(() => window.__qa.bag());
      const ups = bag.filter(b => b.score > b.eq && b.reqLvl <= s.p.lvl && (b.slot !== 'weapon' || b.fam === b.curFam)).sort((a, b) => (b.score - b.eq) - (a.score - a.eq));
      if (!ups.length) break;
      const u = ups[0]; await openBag(); if (round === 0) await bot.shot('bag-' + why);
      const fl = await page.evaluate(() => window.__qa.focusList()); const r = fl.find(q => q.id === 'bag:' + u.i); let ok = false;
      if (r) {
        const c = [r.x + r.w / 2, r.y + r.h / 2];
        if (PASS === 'kbm') await drv.clickDisp(...c);
        else if (PASS === 'touch') { await drv.clickDisp(...c); await sleep(350); await drv.clickDisp(...c); }
        else { await page.evaluate(id => UI.focus.set(id, true), 'bag:' + u.i); await sleep(150); await drv.tap(0); await sleep(300); await drv.tap(0); }
        await sleep(450); ok = await page.evaluate(([sl, uid]) => window.__qa.isEq(sl, uid), [u.slot, u.uid]);
      }
      if (!ok) { bot.find('minor', `Equip by ${PASS} input did not equip the upgrade`, { item: u, hadRegion: !!r }, await bot.shot('equip-fail')); await page.evaluate(([sl, uid, i]) => { if (!window.__qa.isEq(sl, uid)) window.__qa.equip(i); }, [u.slot, u.uid, u.i]); }
      await closeBag();
    }
  }
  async function menuTour() {
    if (PASS === 'kbm') { for (const [k, nm] of [['KeyK', 'character'], ['KeyJ', 'quests'], ['KeyB', 'bestiary'], ['KeyI', 'bag']]) { await drv.tap(k); await sleep(500); await bot.shot('menu-' + nm); } await closeBag(); await drv.tap('KeyH'); await sleep(400); await bot.shot('menu-help'); await drv.tap('KeyH'); await sleep(300); }
    else { await openBag(); await bot.shot('menu-bag-' + PASS); if (PASS === 'pad') for (let i = 0; i < 3; i++) { await drv.tap(5); await sleep(450); await bot.shot('menu-pad-tab' + i); } await closeBag(); const q = await bot.snap(); if (q.ui.open) bot.find('major', PASS + ': bag could not be closed with the standard back/close input', {}, await bot.shot('bag-stuck')); }
  }
  async function portal(id, toMap) {
    const s = await bot.snap(); const pt = s.portals.find(q => q.id === id);
    if (!pt) { bot.find('blocker', `Portal ${id} missing`, {}); return false; }
    if (!pt.open) bot.find('blocker', `Portal ${id} not open when the objective says to take it`, { obj: s.obj }, await bot.shot('portal-closed'));
    await bot.goal({ name: 'portal ' + id, x: pt.x, y: pt.y, r: 0.5, until: q => q.map === toMap && q.st === 'play' && !q.warp, timeout: 200000, softlock: true });
    await sleep(1200);
  }
  // walk to a warp door and Interact until the section changes (a locked keyed door needs the key; first press unlocks then warps)
  async function door(gid, toSec, label) {
    const o = (await objs()).find(q => q.warp && q.gid === gid);
    if (!o) { bot.find('blocker', `Warp door ${gid} not found`, {}); return false; }
    const t0 = Date.now();
    await bot.goal({ name: 'door ' + gid, x: o.x, y: o.y + 0.5, r: 1.0, until: q => q.sec === toSec && !q.warp, interact: 'warpdoor', ir: 2.2, timeout: 150000, softlock: true, noPress: false });
    await sleep(900); await bot.shot('door-' + gid + '-arrived');
    return true;
  }
  const lever = async (id, name) => { const o = (await objs()).find(q => q.lever && q.id === id) || (await objs()).find(q => q.lever); if (o) { await bot.goal({ name, x: o.x, y: o.y, r: 1.2, interact: 'lever', ir: 2.2, once: true, timeout: 200000 }); await sleep(1400); await bot.shot('lever-' + id); } else bot.find('major', 'lever ' + id + ' missing', {}); };
  async function shrine(x, y, name) { await bot.goal({ name, x, y, r: 1.2, interact: 'shrine', ir: 2.4, once: true, timeout: 220000 }); }
  async function chest(label, name) { const o = (await objs()).find(q => q.chest && q.label === label); if (!o) { bot.find('minor', 'chest ' + label + ' not found/already open', {}); return; } await bot.goal({ name, x: o.x, y: o.y, r: 1.1, interact: 'chest', once: true, timeout: 200000 }); await loot(2500); }
  async function warpTest(fromName, toId) {
    await sleep(400); await drv.openMap(); await sleep(700); await bot.shot('fullmap-' + fromName);
    const s0 = await bot.snap(); const t0 = Date.now();
    const info = await page.evaluate(() => ({ mode: G.ui.map && G.ui.map.mode, targets: shrineTargets().map(o => o.shrineId) }));
    bot.log('full map', info);
    if (info.mode === 'shrine' && info.targets.length) {
      const idx = Math.max(0, info.targets.indexOf(toId));
      if (PASS === 'kbm') { for (let i = 0; i < idx; i++) { await drv.tap('ArrowDown'); await sleep(120); } await drv.tap('Enter'); }
      else if (PASS === 'pad') { for (let i = 0; i < idx; i++) { await drv.tap(13); await sleep(120); } await drv.tap(0); }
      await sleep(1500); const s1 = await bot.snap();
      const moved = Math.hypot(s1.p.x - s0.p.x, s1.p.y - s0.p.y);
      bot.out.warps = (bot.out.warps || []); bot.out.warps.push({ from: fromName, to: toId, moved: +moved.toFixed(1), sec: s1.sec, ms: Date.now() - t0 });
      bot.log('shrine warp', { moved: +moved.toFixed(1), at: [s1.p.x, s1.p.y] });
    } else { bot.find('minor', 'Full map opened at ' + fromName + ' offered no shrine warp', info, await bot.shot('warp-none')); await drv.closeMap(); }
  }
  async function bossFight(name, timeout) {
    await bot.clear(name, timeout, { engageR: 18 });
    await sleep(2500); await bot.shot(name + '-end');
  }

  try {
    // ============================ TITLE
    let s = await bot.snap(); await bot.observe(s); await bot.shot('title');
    bot.log('title: New Dream via ' + PASS);
    await drv.title(); for (let i = 0; i < 20; i++) { s = await bot.snap(); if (s.st === 'play') break; await sleep(300); }
    if (s.st !== 'play') { await drv.title(); await sleep(1500); s = await bot.snap(); }
    if (s.st !== 'play') bot.find('blocker', 'New Dream did not start the game (' + PASS + ')', {}, await bot.shot('title-stuck'));
    await bot.observe(s); await mark('vale-start'); await bot.idle(2500); await bot.shot('vale-wake');

    // ============================ 1. VALE (80x80)
    const tD = Date.now();
    await bot.goal({ name: 'dummies', dummies: true, timeout: 22000, until: () => Date.now() - tD > 11000, engageR: 0 });
    await drv.attack(false); await drv.dodge(); await sleep(500); await bot.shot('vale-dummies');
    await shrine(32, 54.2, 'start shrine');
    await bot.goal({ name: 'yard_teach', x: 39, y: 64, r: 2.5, until: q => has(q, 'yard_teach'), timeout: 90000 });
    await bot.goal({ name: 'elder plaza', x: 39, y: 47.5, r: 2.5, until: q => has(q, 'elder'), timeout: 150000 });
    await bot.goal({ name: 'read elder stone', x: 39, y: 47.5, r: 1.2, interact: 'tablet', once: true, timeout: 25000 }); await sleep(1200); await bot.shot('vale-elder');
    await chest('tutorial-chest', 'tutorial chest (west of glade)'); await equipBest('vale'); await menuTour();
    const g0 = Date.now();
    await bot.goal({ name: 'lantern (far NW)', x: 7.3, y: 21.9, r: 1.8, until: q => has(q, 'lantern_found'), timeout: 300000 }); await bot.shot('vale-lantern'); await loot(2000);
    if (!LITE) { await bot.goal({ name: 'gem cache', x: 6, y: 21, r: 1.8, until: q => has(q, 'gems'), timeout: 60000, noFinding: true }); await loot(2000); }
    await bot.goal({ name: 'return lantern', x: 39, y: 47.5, r: 2.5, until: q => has(q, 'lantern_return'), timeout: 300000 }); await loot(2500);
    s = await bot.snap(); bot.log('objective after lantern return', { obj: s.obj, ambush: has(s, 'garden_ambush') });
    await bot.goal({ name: 'garden ambush', x: 36, y: 23, r: 3, until: q => has(q, 'garden_ambush'), timeout: 300000 }); await bot.shot('vale-ambush');
    await bot.clear('garden clear', 150000); await sleep(2500); await bot.shot('vale-rift-open'); await loot(2500); await equipBest('vale2');
    s = await bot.snap(); bot.log('after ambush', { obj: s.obj, pine: s.portals.find(q => q.id === 'pine').open });
    await mark('vale-done');
    if (PASS !== 'touch') {   // shrine warp test: terrace shrine -> start shrine (the rift is in the south)
      await shrine(54, 26.6, 'terrace shrine'); await warpTest('terrace', 'shrine_start'); await bot.shot('after-warp-vale');
    }
    if (STOP === 'vale') throw new Error('STOP');
    await portal('pine', 'pinewood');

    // ============================ 2. PINEWOOD (112x112)
    await mark('pinewood-enter'); await sleep(1800); await bot.shot('pinewood-arrival');
    await bot.goal({ name: 'trail', x: 17.96, y: 98.59, r: 3, until: q => has(q, 'trail'), timeout: 120000 }); await bot.shot('pinewood-trail');
    if (!LITE) {
      await bot.goal({ name: 'crack hum', x: 16.11, y: 78, r: 2.4, until: q => has(q, 'crack_hum'), timeout: 200000 }); await bot.shot('pinewood-crack-tell'); await bot.idle(1200);
      await bot.goal({ name: 'crack open', x: 17.51, y: 78, r: 1.2, until: q => has(q, 'crack_open'), timeout: 60000 }); await bot.shot('pinewood-crack-open');
      await bot.goal({ name: 'crack loot', x: 22, y: 78, r: 1.6, until: q => has(q, 'crack_loot'), timeout: 90000 }); await loot(2000);
    }
    await shrine(44, 86, 'shrine1');
    await bot.goal({ name: 'r1 ogres', x: 40, y: 92, r: 4, until: q => has(q, 'r1'), timeout: 200000 }); await bot.shot('pinewood-r1');
    await bot.clear('r1 clear', 180000); await loot(2500); await equipBest('pine1'); await mark('pinewood-r1-done');
    s = await bot.snap(); bot.log('objective after r1', { obj: s.obj });
    // objective text: the elite ogre is south-east by the loop road
    await bot.goal({ name: 'elite ogre (key)', x: 96, y: 84, r: 3.4, until: q => has(q, 'elite'), timeout: 300000 }); await bot.shot('pinewood-elite');
    await bot.clear('elite clear', 180000); await loot(3000);
    s = await bot.snap(); bot.log('after elite', { obj: s.obj, keys: s.keys });
    await chest('elite-chest', 'elite chest'); await equipBest('pine2'); await mark('pinewood-key');
    await bot.goal({ name: 'ford', x: 54.96, y: 73.7, r: 4, until: q => has(q, 'ford'), timeout: 300000 }); await bot.shot('pinewood-ford');
    await bot.clear('ford clear', 180000); await loot(2000);
    await shrine(66, 60, 'shrine2');
    if (PASS !== 'touch') { await warpTest('shrine2', 'shrine1'); await bot.shot('after-warp-pine'); }
    for (let t = 0; t < 3 && !has(await bot.snap(), 'r2'); t++) await bot.goal({ name: 'r2 plaza', x: 26, y: 58, r: 5, until: q => has(q, 'r2') && q.sec === 'forest', timeout: 300000 }); await bot.shot('pinewood-r2');   // retry: after a shrine warp the first call returned instantly (run 2)
    await bot.clear('r2 clear', 240000); await loot(2500); await equipBest('pine3'); await mark('pinewood-r2-done');
    if (!LITE) {
      await bot.goal({ name: 'cache hint', x: 14.99, y: 55.35, r: 3, until: q => has(q, 'cache_hint'), timeout: 120000 }); await bot.shot('pinewood-cache-door');
      const dc = (await objs()).find(q => q.gid === 'door_cache');
      if (dc) { await bot.goal({ name: 'cache door', x: dc.x, y: dc.y, r: 1.4, interact: true, ir: 2.2, once: true, timeout: 90000 }); await sleep(1500); }
      await bot.goal({ name: 'cache loot', x: 12, y: 54, r: 2.2, until: q => has(q, 'cache_loot'), timeout: 90000 }); await loot(2000);
      await lever('lever_bridge', 'bridge lever'); await bot.goal({ name: 'bridge pip', x: 10, y: 36.6, r: 3, until: q => has(q, 'bridge_pip'), timeout: 250000 }); await bot.shot('pinewood-bridge');
      await bot.goal({ name: 'islet loot', x: 10, y: 29, r: 2.2, until: q => has(q, 'islet_loot'), timeout: 120000 }); await chest('secret-gold-chest', 'gold chest'); await equipBest('pine-secret');
    }
    await bot.goal({ name: 'r3 grove', x: 70, y: 52, r: 4.5, until: q => has(q, 'r3'), timeout: 300000 }); await bot.shot('pinewood-r3');
    await bot.clear('r3 clear', 240000); await loot(2500); await equipBest('pine4'); await mark('pinewood-r3-done');
    if (!LITE) {
      await bot.goal({ name: 'env hint', x: 100, y: 46, r: 4, until: q => has(q, 'env_hint'), timeout: 250000 }); await bot.goal({ name: 'env open', x: 100.5, y: 47.5, r: 2.4, until: q => has(q, 'env_open'), timeout: 60000 }); await bot.shot('pinewood-env');
      await chest('detour-chest', 'detour chest');
    }
    if (STOP === 'pinewood') throw new Error('STOP');
    await bot.goal({ name: 'hollow door hint', x: 44, y: 39.29, r: 3.2, until: q => has(q, 'hdoor_hint'), timeout: 300000, noFinding: true }); await bot.shot('pinewood-hollow-door');
    s = await bot.snap(); bot.log('before hollow door', { obj: s.obj, keys: s.keys });
    await mark('pre-hollow');
    await door('hollow_door', 'hollow');

    // ============================ 3. ROOT HOLLOW
    await mark('hollow-enter'); await bot.shot('hollow-arrival');
    if (!LITE) {
      await bot.goal({ name: 'hollow crack hum', x: 20.55, y: 12.05, r: 2.4, until: q => has(q, 'h_crack_hum'), timeout: 120000 }); await bot.shot('hollow-crack-tell'); await bot.idle(1200);
      await bot.goal({ name: 'hollow crack open', x: 21.38, y: 13.18, r: 1.2, until: q => has(q, 'h_crack_open'), timeout: 60000 });
      await bot.goal({ name: 'hollow crack loot', x: 24, y: 15.5, r: 1.6, until: q => has(q, 'h_crack_loot'), timeout: 90000 }); await loot(2000);
    }
    await bot.goal({ name: 'hollow r1', x: 15, y: 12, r: 2.8, until: q => has(q, 'h_r1'), timeout: 200000 }); await bot.shot('hollow-r1');
    await bot.clear('hollow r1 clear', 180000); await loot(2500); await equipBest('hollow1');
    s = await bot.snap(); bot.log('objective after hollow r1', { obj: s.obj });
    await bot.goal({ name: 'gallery approach (no rest)', x: 32.5, y: 11, r: 2.8, until: q => has(q, 'h_r2'), timeout: 45000, noFinding: true });
    s = await bot.snap(); if (!has(s, 'h_r2')) bot.find('major', 'Hollow gallery does nothing until the shrine is rested at; only a tracker line says so', { obj: s.obj }, await bot.shot('hollow-gallery-wait'));
    await shrine(23.5, 6, 'hollow shrine');
    await bot.goal({ name: 'hollow gallery', x: 32.5, y: 11, r: 2.8, until: q => has(q, 'h_r2'), timeout: 150000 }); await bot.shot('hollow-gallery');
    await bot.clear('hollow gallery clear', 300000); await loot(2500); await equipBest('hollow2'); await mark('gallery-done');
    s = await bot.snap(); bot.log('objective after gallery', { obj: s.obj });
    await bot.goal({ name: 'gate hint', x: 40.54, y: 9.04, r: 3, until: q => has(q, 'h_gate_hint'), timeout: 120000, noFinding: true }); await bot.shot('hollow-gate');
    await lever('lever_h_r2', 'gate lever'); await mark('hollow-lever');
    await bot.goal({ name: 'ceiling tell', x: 31.5, y: 8.64, r: 2.4, until: q => has(q, 'h_ceiling'), timeout: 100000, noFinding: true }); await loot(2500);
    await bot.goal({ name: 'mossjaw den', x: 45, y: 10.5, r: 3.3, until: q => has(q, 'h_boss'), timeout: 250000, softlock: true }); await bot.shot('hollow-mossjaw-start');
    await bossFight('mossjaw', 480000);
    for (let t = 0; t < 10; t++) {   // QA retry loop (run 3: 7 straight deaths on a weak-gear hero); done when the objective leaves 'Defeat Mossjaw'
      s = await bot.snap(); if (s.obj && !/Mossjaw/.test(s.obj) && !s.boss) break;
      bot.log('Mossjaw retry #' + (t + 1), { lvl: s.p.lvl, deaths: s.deaths, obj: s.obj });
      await bot.goal({ name: 'mossjaw retry', x: 45, y: 10.5, r: 3.3, until: q => !!q.boss, timeout: 200000, noFinding: true });
      await bossFight('mossjaw', 480000);
    }
    await loot(3500); await equipBest('mossjaw'); await mark('mossjaw-done');
    s = await bot.snap(); bot.log('after Mossjaw', { obj: s.obj, sec: s.sec });
    await chest('mini-boss-chest', 'mini-boss chest');
    // root-stair exit door up to the Clearing shrine
    await door('hollow_exit', 'clearing' === 'x' ? '' : 'forest');

    // ============================ 4. BRAMBLEHORN'S CLEARING
    await mark('clearing-arrive'); await bot.shot('clearing-arrival');
    await shrine(84, 36, 'clearing shrine3');
    if (!LITE) { await bot.goal({ name: 'arena hint', x: 95.06, y: 37.51, r: 3.4, until: q => has(q, 'arena_hint'), timeout: 60000, noFinding: true }); }
    await bot.goal({ name: 'bramblehorn', x: 100, y: 31, r: 6.5, until: q => has(q, 'boss'), timeout: 300000, softlock: true }); await bot.shot('clearing-boss-start');
    await bossFight('bramblehorn', 600000);
    for (let t = 0; t < 8; t++) {   // QA retry loop: a real player would retry after dying; stop once the arena portal opens (= boss dead)
      s = await bot.snap(); if (s.portals.find(q => q.id === 'home_arena' && q.open)) break;
      bot.log('Bramblehorn retry #' + (t + 1), { lvl: s.p.lvl, deaths: s.deaths });
      await bot.goal({ name: 'bramblehorn retry', x: 100, y: 31, r: 6.5, until: q => !!q.boss, timeout: 200000, noFinding: true });
      await bossFight('bramblehorn', 600000);
    }
    await loot(4000); await equipBest('clearing');
    s = await bot.snap(); bot.log('after Bramblehorn', { obj: s.obj, portals: s.portals.map(q => [q.id, q.open]) }); await mark('bramblehorn-done');
    await chest('boss-chest', 'boss chest');
    if (STOP === 'court') throw new Error('STOP');
    await portal('home_arena', 'vale');

    // ============================ 5. VALE AGAIN
    await mark('vale-return'); await sleep(2500); await bot.shot('vale-return');
    s = await bot.snap(); bot.log('vale return', { obj: s.obj, pos: [s.p.x, s.p.y], quests: s.quests });
    await bot.goal({ name: 'elder after boss', x: 39, y: 47.5, r: 2.5, interact: 'tablet', ir: 2.5, once: true, timeout: 200000 }); await sleep(2500); await bot.shot('vale-elder-after');
    s = await bot.snap(); bot.log('vale final', { obj: s.obj, lvl: s.p.lvl });
  } catch (e) {
    if (e.message !== 'STOP') { bot.log('RUN ERROR ' + e.stack); bot.find('info', 'Bot run error', { err: e.stack }); try { await bot.shot('run-error'); } catch (x) { /* */ } }
  }
  try { await bot.closeMap(Date.now()); } catch (e) { /* */ }
  bot.out.errors = errors; bot.out.finished = new Date().toISOString(); bot.out.totalSec = +bot.el(); bot.out.seenTalk = bot.seenTalk;
  try { bot.out.finalSnap = await bot.snap(); } catch (e) { /* */ }
  bot.save(); await drv.reset(); await br.close();
  console.log('DONE', bot.el(), 's; errors:', errors.length);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
