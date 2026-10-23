#!/usr/bin/env node
'use strict';
// tools/qa/run-arenas.js -- the Bot (real inputs: kbm | pad | touch) fights every pack-* and boss-* mockup arena (js/arenas.js) at its reference
// loadout, one FRESH page per arena. Prints a table: arena, result, game time, deaths, real time. Exit code 1 if any arena is not won.
//   Usage: node tools/qa/run-arenas.js <kbm|pad|touch> [arena-id ...] [--god] [--seed N] [--realtime] [--tries N]
//   --god      the hero takes no damage (?god): blocker hunts only (gates, lever, key, triggers), never balance acceptance
//   --seed N   seeded Math.random (page + bot wiggles), default 1
//   --realtime wall-clock run instead of the default lockstep turbo
//   --tries N  boss/pack retry cap per arena (default 12)
// Win rule: pack-* = the `done` trigger (chamber behind the keydoor) fired; boss-* = the `dead` trigger fired. Target (docs/design/arenas.md): a
// win on every pack/boss arena at reference gear; 3 to 4 of 6 one tier lower. Writes tools/qa/run-arenas-<pass>.json.
const fs = require('fs'), path = require('path');
const { launch, Bot, KbmDriver, PadDriver, TouchDriver, sleep, now, QA } = require('./lib');
const ARGS = process.argv.slice(2);
const flagVal = f => { const i = ARGS.indexOf(f); return i >= 0 && ARGS[i + 1] != null ? ARGS[i + 1] : null; };
const PASS = ['kbm', 'pad', 'touch'].includes(ARGS[0]) ? ARGS[0] : 'kbm';
const TURBO = !ARGS.includes('--realtime'), GOD = ARGS.includes('--god');
const SEED = flagVal('--seed') != null ? (+flagVal('--seed') | 0) : 1;
const TRIES = flagVal('--tries') != null ? +flagVal('--tries') : 12;
const valArgs = new Set(['--seed', '--tries']);
const ONLY = ARGS.slice(1).filter((a, i, arr) => !a.startsWith('-') && !(i > 0 && valArgs.has(arr[i - 1])));
{ let a = (SEED ^ 0x5bd1e995) >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const REAL_CAP = 20 * 60000;   // real-time watchdog per arena (ms)
const CAP_PACK = 900000, CAP_BOSS = 420000;   // game-time caps per arena (ms)

async function runOne(id) {
  const query = '?map=' + id;
  const L = PASS === 'touch' ? await launch({ turbo: TURBO, god: GOD, seed: SEED, query, context: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } })
    : await launch({ turbo: TURBO, god: GOD, seed: SEED, query, pad: PASS === 'pad' });
  const { br, page, errors } = L;
  const wd = setTimeout(() => { console.log(`[watchdog] ${id}: no result after ${REAL_CAP / 60000} real minutes, closing the browser`); br.close().catch(() => {}); }, REAL_CAP);   // a hung CDP call (touch) must not hold the whole run
  const drv = PASS === 'touch' ? new TouchDriver(page) : PASS === 'pad' ? new PadDriver(page) : new KbmDriver(page);
  let mapForced = 0, touchResets = 0;
  if (PASS === 'touch') {
    await drv.init();
    // finding (touch.js): once the full map is open (a stray tap on the minimap) no touch control closes it -- no map / back / pause
    // action reaches it from touch -- so the Bot would wait forever. The harness closes it directly and counts it (printed in the note).
    const tapAt0 = drv.tapAt.bind(drv), lastTaps = [];
    drv.tapAt = async (x, y, ms) => { lastTaps.push([Math.round(x), Math.round(y), +(now() / 1000).toFixed(1)]); if (lastTaps.length > 4) lastTaps.shift(); return tapAt0(x, y, ms); };
    drv.closeMap = async () => { mapForced++; if (mapForced <= 3) bot.log('full map open; closing', { lastTaps }); await page.evaluate(() => closeFullMap()); };
    // the lib TouchDriver leaks touch points (CDP "Exceeded maximum touch points limit of 16"): release everything and carry on
    const send0 = drv.send.bind(drv);
    drv.send = async type => {
      try { return await send0(type); } catch (e) {
        if (!/touch points limit/.test(e.message)) throw e;
        touchResets++; drv.pts.clear(); drv.stick = null; drv.atkOn = false;
        try { await drv.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } catch (e2) { /* ignore */ }
        try { await drv.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); } catch (e2) { /* ignore */ }
      }
    };
  }
  const bot = new Bot(page, drv, `arena-${id}-${PASS}`);
  const has = (s, t) => s.fired.includes(t);
  const objs = () => page.evaluate(() => window.__qa.objects());
  const res = { id, result: 'ERROR', gameSec: 0, deaths: 0, realSec: 0, note: '' };
  const t0 = now(), r0 = Date.now();
  let s = await bot.snap();
  for (let i = 0; i < 20 && s.st !== 'play'; i++) { await sleep(200); s = await bot.snap(); }
  await bot.observe(s);
  const d0 = s.deaths || 0;
  const kind = id.startsWith('pack-') ? 'pack' : id.startsWith('boss-') ? 'boss' : 'other';
  async function loot(ms = 1200) {
    await bot.idle(ms);
    for (let k = 0; k < 10; k++) {
      const q = await bot.snap(); if (!q.p || q.st !== 'play') break;
      const d = q.drops.filter(z => z.t > 0.4 && Math.hypot(z.x - q.p.x, z.y - q.p.y) < 20).sort((a, b) => Math.hypot(a.x - q.p.x, a.y - q.p.y) - Math.hypot(b.x - q.p.x, b.y - q.p.y))[0];
      if (!d) break;
      await bot.goal({ name: 'pick up ' + d.name, x: d.x, y: d.y, r: 0.45, timeout: 9000, noFinding: true });
    }
  }
  // fight in place until every hostile is dead; a death respawns at the shrine and the loop goes on
  const clearAll = (name, timeout) => bot.clear(name, timeout, { engageR: 18, wake: true, noFinding: true });
  const reach = async (name, x, y, r, trig, timeout = 90000) => { await bot.goal({ name, x, y, r, until: q => has(q, trig), timeout, noFinding: true }); return has(await bot.snap(), trig); };
  async function lever() {
    for (let t = 0; t < 4; t++) {
      const o = (await objs()).find(q => q.lever); if (!o) { res.note = 'no lever'; return false; }
      if (o.pulled) return true;
      await bot.goal({ name: 'lever' + (t ? ' again' : ''), x: o.x, y: o.y, r: 1.2, interact: 'lever', ir: 2.4, once: true, timeout: 60000, noFinding: true }); await sleep(900);
    }
    return !!(await objs()).find(q => q.lever && q.pulled);
  }
  try {
    if (kind === 'pack') {
      if (!await lever()) { res.result = 'FAIL'; res.note = res.note || 'lever not pulled'; throw new Error('STOP'); }
      const rooms = [['p1_go', 11.5, 17.8, 'p1_clear'], ['p2_go', 21.5, 17.8, 'p2_clear'], ['p3_go', 28.5, 9.5, 'p3_clear']];
      for (const [go, x, y, done] of rooms) {
        let tries = 0;
        while (!has(await bot.snap(), done)) {
          if (now() - t0 > CAP_PACK) { const q = await bot.snap(); bot.log('stuck diag', { st: q.st, ui: q.ui, atkHeld: await page.evaluate(() => IN.held('attack')), drvAtk: drv.atkOn, pts: drv.pts && drv.pts.size, dev: await page.evaluate(() => IN.device), p: q.p && [q.p.x, q.p.y], hp: q.p && q.p.hp, en: (q.en || []).filter(e => !e.dummy).map(e => [e.type, +e.x.toFixed(1), +e.y.toFixed(1), e.hp, e.asleep ? 'asleep' : '']) }); res.result = 'TIMEOUT'; res.note = 'stuck before ' + done; throw new Error('STOP'); }
          if (++tries > TRIES * 3) { res.result = 'FAIL'; res.note = done + ' not reached after ' + tries + ' tries'; throw new Error('STOP'); }
          if (!has(await bot.snap(), go)) await reach(go, x, y, 1.6, go);
          await clearAll(done, 240000);
          const q = await bot.snap(); for (let k = 0; k < 15 && q.st !== 'play'; k++) { await bot.react(await bot.snap(), {}); await sleep(300); }
        }
        await loot(1500);
      }
      // the key lies where the elite pack died; the keydoor opens with it
      const keyId = await page.evaluate(() => { const d = G.map.objects.find(o => o.barrier === 'keydoor'); return d ? d.doorKey : null; });
      const haveKey = async () => (await bot.snap()).keys.includes('key:' + keyId);
      for (let k = 0; k < 6 && !await haveKey(); k++) {
        // the key drop: any drop on the floor (the elite pack's key is the rare card at the pack's last room)
        await loot(800);
        if (!await haveKey()) { await bot.goal({ name: 'to the key', x: 25, y: 5.5, r: 1.2, timeout: 20000, noFinding: true }); await loot(800); }
      }
      const keyOk = await haveKey();
      const door = (await objs()).find(q => q.barrier && q.use);
      const doorGone = async () => page.evaluate(() => { const d = G.map.objects.filter(o => o.barrier === 'keydoor'); return d.length > 0 && d.every(o => o.gone); });
      for (let t = 0; t < 4 && door && !await doorGone(); t++) { await bot.goal({ name: 'keydoor', x: door.x + 1.0, y: door.y, r: 0.4, interact: true, ir: 3.2, once: true, timeout: 60000, noFinding: true }); await sleep(900); }
      const opened = await doorGone();
      if (!opened) bot.log('keydoor diag ' + JSON.stringify(await page.evaluate(() => ({ hk: hasKey(G.map.objects.find(o => o.barrier === 'keydoor').doorKey), sec: Object.keys(G.prog.secrets), inter: (window.__qa && window.__qa.inter || []).slice(-3), msg: G.msg || null, pr: G.prompt && G.prompt.kind, p: [G.player.x, G.player.y] }))));
      await bot.goal({ name: 'chamber', x: 9.5, y: 5.5, r: 2.4, until: q => has(q, 'done'), timeout: 90000, noFinding: true });
      const fin = await bot.snap();
      if (has(fin, 'done')) res.result = 'WIN'; else { res.result = 'FAIL'; res.note = 'chamber not reached' + (door ? '' : ' (no keydoor)') + (keyOk ? '' : ' (key never picked up)') + (opened ? '' : ' (door closed)'); }
    } else if (kind === 'boss') {
      await bot.goal({ name: 'intro', fightOnly: true, chase: false, until: q => has(q, 'intro'), timeout: 30000, noFinding: true });
      let tries = 1;
      while (!has(await bot.snap(), 'dead')) {
        if (now() - t0 > CAP_BOSS) { res.result = 'TIMEOUT'; res.note = 'boss alive after ' + Math.round((now() - t0) / 1000) + ' s'; throw new Error('STOP'); }
        await clearAll('boss', 180000);
        let q = await bot.snap(); for (let k = 0; k < 25 && q.st !== 'play'; k++) { await bot.react(q, {}); await sleep(300); q = await bot.snap(); }
        if (has(q, 'dead')) break;
        if (tries >= TRIES) { res.result = 'FAIL'; res.note = 'boss not beaten after ' + tries + ' attempts'; throw new Error('STOP'); }
        tries++; bot.log('boss retry #' + (tries - 1), { lvl: q.p && q.p.lvl, deaths: q.deaths });
        // after a respawn the boss may still stand; walk back to the middle of the arena and go again
        for (let k = 0; k < 40 && !q.boss && !q.en.some(e => !e.dummy); k++) { await bot.idle(250); q = await bot.snap(); }   // the intro timer re-arms on the respawn
        if (!q.boss && !q.en.some(e => !e.dummy) && !has(q, 'dead')) { res.result = 'FAIL'; res.note = 'boss did not respawn after a death'; throw new Error('STOP'); }
      }
      res.result = 'WIN'; res.note = tries > 1 ? tries + ' attempts' : '';
      await sleep(1500); await loot(1500);
    } else { res.result = 'SKIP'; }
  } catch (e) {
    if (e.message !== 'STOP') { res.result = 'ERROR'; res.note = e.message; bot.log('RUN ERROR ' + e.stack); }
  }
  const fs0 = await bot.snap().catch(() => null);
  res.deaths = fs0 && fs0.deaths != null ? fs0.deaths - d0 : 0;
  res.gameSec = +((now() - t0) / 1000).toFixed(1); res.realSec = +((Date.now() - r0) / 1000).toFixed(1);
  if (mapForced) res.note += (res.note ? '; ' : '') + 'full map closed by harness x' + mapForced + ' (no touch control closes it)';
  if (touchResets) res.note += (res.note ? '; ' : '') + 'touch points reset x' + touchResets + ' (lib TouchDriver leak)';
  if (errors.length) { res.note += (res.note ? '; ' : '') + errors.length + ' page error(s): ' + errors[0].msg.slice(0, 80); if (res.result === 'WIN') res.result = 'WIN*'; }
  bot.out.result = res; bot.out.errors = errors; bot.out.mode = { turbo: TURBO, god: GOD, seed: SEED };
  try { await bot.closeMap(now()); } catch (e) { /* */ }
  try { bot.save(); } catch (e) { /* */ }
  clearTimeout(wd);
  await drv.reset(); await br.close();
  return res;
}

(async () => {
  // the arena list comes from the game itself
  const { chromium } = require('playwright');
  const b0 = await chromium.launch({ headless: true }); const p0 = await b0.newPage();
  await p0.goto('file://' + path.join(__dirname, '..', '..', 'index.html') + '?map=dummies', { waitUntil: 'load' });
  await p0.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  let ids = await p0.evaluate(() => arenaIds()); await b0.close();
  ids = ids.filter(i => /^(pack|boss)-/.test(i));
  if (ONLY.length) ids = ids.filter(i => ONLY.includes(i));
  console.log(`run-arenas: pass=${PASS} seed=${SEED} turbo=${TURBO} god=${GOD} arenas=${ids.length}`);
  const rows = [];
  for (const id of ids) {
    let r; try { r = await runOne(id); } catch (e) { r = { id, result: 'ERROR', gameSec: 0, deaths: 0, realSec: 0, note: e.message }; }
    rows.push(r); console.log(`>> ${id}: ${r.result} ${r.gameSec}s deaths ${r.deaths}${r.note ? ' (' + r.note + ')' : ''}`);
  }
  const pad = (v, n) => String(v).padEnd(n);
  console.log('\n' + pad('arena', 18) + pad('result', 9) + pad('game s', 9) + pad('deaths', 8) + pad('real s', 8) + 'note');
  for (const r of rows) console.log(pad(r.id, 18) + pad(r.result, 9) + pad(r.gameSec, 9) + pad(r.deaths, 8) + pad(r.realSec, 8) + (r.note || ''));
  const wins = rows.filter(r => r.result.startsWith('WIN')).length;
  console.log(`\n${wins} of ${rows.length} won (${PASS}, seed ${SEED}${GOD ? ', god' : ''})`);
  try { fs.writeFileSync(path.join(QA, `run-arenas-${PASS}.json`), JSON.stringify({ pass: PASS, seed: SEED, god: GOD, rows }, null, 1)); } catch (e) { /* */ }
  process.exit(wins === rows.length ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
