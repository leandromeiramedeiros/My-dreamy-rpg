#!/usr/bin/env node
'use strict';
// R3 UI fixes screenshots -> tools/shots/m3-ui-fixes/<item>-<viewport>-<before|after>.png  (docs/meetings/2026-10-20-feel-ui.md R3)
// Usage: node tools/shots-m3-ui-fixes.js before|after     Viewports: desktop 1920x1080, phone landscape 844x390, portrait 390x844 (rotate card).
if (process.platform !== 'win32') process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'shots', 'm3-ui-fixes');
const STAGE = process.argv[2] === 'before' ? 'before' : 'after';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const errs = [];
function gear() {
  const p = G.player; p.level = 28;
  p.equip.weapon = makeTestItem({ slot: 'weapon', variant: 'sword', tier: 1, rarity: 'rare', ilvl: 12, sockets: ['ruby_2', null], hist: { found: 'pinewood', kills: 212, bossKills: 1 } });
  p.equip.head = makeTestItem({ slot: 'head', variant: 'knighthelm', tier: 1, rarity: 'uncommon' });
  p.equip.chest = makeTestItem({ slot: 'chest', variant: 'warden', tier: 2, rarity: 'epic', ilvl: 16, sockets: ['diamond_2', null], tempered: true });
  p.equip.boots = makeTestItem({ slot: 'boots', variant: 'knightgreaves', tier: 1, rarity: 'rare' });
  p.equip.ring1 = makeTestItem({ slot: 'ring', rarity: 'rare', boon: 'fireBurn' });
  p.equip.ring2 = makeTestItem({ slot: 'ring', tier: 1, rarity: 'epic', ilvl: 18, boon: 'frostPower' });
  p.equip.amulet = makeTestItem({ slot: 'amulet', rarity: 'rare' });
  p.equip.belt = makeTestItem({ slot: 'belt', rarity: 'uncommon' });
  p.bag = Array(BAG_SIZE).fill(null);
  const sword = makeTestItem({ slot: 'weapon', variant: 'sword', tier: 2, rarity: 'rare', ilvl: 18, sockets: ['topaz_1'], hist: { found: 'pinewood', kills: 0, bossKills: 0 } });
  window.__sword = sword; window.__legend = makeTestItem({ unique: 'pipslantern', hist: { found: 'spire', kills: 0, bossKills: 0 } });
  [sword, window.__legend, makeTestItem({ slot: 'ring', rarity: 'legendary', tier: 2, ilvl: 30 }), makeTestItem({ slot: 'chest', variant: 'dreamweave', tier: 2, rarity: 'epic', ilvl: 18 })].forEach(e => bagAdd(p, e));
  bagAdd(p, { gem: 'ruby_1', n: 3 });
  recalcStats(p, true);
}
async function run(br, base, name, vp, opts, touch) {
  const ctx = await br.newContext(Object.assign({ viewport: vp }, opts));
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(`${name}: pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errs.push(`${name}: console: ${m.text()}`); });
  await page.goto(`${base}/index.html?scene=play`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  if (!(await page.evaluate(() => typeof ICONS !== 'undefined'))) await page.addScriptTag({ path: path.join(ROOT, 'js', 'icons.js') });
  await wait(500);
  const ev = (f, a) => page.evaluate(f, a);
  const shot = async n => { await wait(450); await page.screenshot({ path: path.join(OUT, `${n}-${name}-${STAGE}.png`) }); console.log('shot', `${n}-${name}-${STAGE}`); };
  await ev(gear);
  await ev(t => { if (t) IN.setDevice('touch'); }, touch);
  const closeAll = () => ev(() => { G.ui.open = false; G.ui.help = false; G.ui.pause = false; G.ui.sel = null; G.banner = null; G.pendingSpawns = 0; G.objective = ''; });
  // 1 help overlay
  await ev(() => { G.ui.help = true; }); await shot('1-help'); await closeAll();
  // 3 objective tracker: long objective + two quests; banner; wave
  await ev(() => {
    G.prog.quests = { vale_lantern: { step: 0 } }; G.player.hp = G.player.maxHp;
    G.objective = G._objAuto = ''; G.objective = 'Open the chest west of the glade. Then find the Stone\'s lantern and bring it back to the Elder Stone.';
    G.banner = { s: 'Gloom in the garden', sub: 'Slimes ooze out of the flowers', t: 30, max: 30 }; HUD.trk.t0 = G.t;
  });
  await shot('3-tracker-banner');
  await ev(() => { G.banner = null; G.pendingSpawns = 0; G.arena = { id: 'old', map: G.map.id, done: true, gates: [] }; if (!G.enemies.some(e => !e.dummy && !e.dead)) spawnAt('slime', G.player.x + 3, G.player.y + 1); });
  await shot('3-tracker-no-wave');
  await ev(() => { G.arena = null; G.pendingSpawns = 1; });
  await shot('3-tracker-wave'); await closeAll();
  // 4 tooltips (selected bag items): rare compare, legendary found in spire
  await ev(() => { openInv('inv'); G.ui.sel = window.__sword; }); await shot('4-tooltip-compare');
  await ev(() => { G.ui.sel = window.__legend; }); await shot('4-tooltip-legendary');
  // 6 inventory idle, hover on an equipped slot
  await ev(() => { G.ui.sel = null; }); await shot('6-inventory-idle');
  if (!touch) { await page.mouse.move(vp.width * (24 + 28 + 24) / 960 + 0, vp.height * (152 + 20 + 24) / 540); await wait(100); await page.mouse.move(vp.width * 100 / 960, vp.height * 200 / 540); await shot('6-inventory-hover-equipped'); await page.mouse.move(vp.width - 2, 2); }
  await closeAll();
  // 5 quests at level 1 (nothing started) and with one started
  await ev(() => { G.player.level = 1; G.prog.quests = {}; openInv('quests'); }); await shot('5-quests-level1');
  await ev(() => { G.prog.quests = { vale_lantern: { step: 0 } }; G.ui.qSel = null; }); await shot('5-quests-started');
  await closeAll();
  // 8 juice: low HP pulse + level-up ring + ghost bar
  await ev(() => { G.player.hp = G.player.maxHp * 0.2; HUD.lvl.n = G.player.level; G.player.level += 1; });
  await shot('8-hud-lowhp-levelup');
  await ctx.close();
  // 8 title with a saved slot (a page without ?scene so SAVE_ON is true), then the "?" help opened from it
  const c2 = await br.newContext(Object.assign({ viewport: vp }, opts)), pg = await c2.newPage();
  pg.on('pageerror', e => errs.push(`${name}: pageerror: ${e.message}`));
  await pg.goto(`${base}/index.html`, { waitUntil: 'load' });
  await pg.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await wait(400);
  await pg.evaluate(() => { newGame(); G.player.level = 7; saveGame(); G.state = 'title'; G.save = readSave(); G.ui.slotInfo = null; G.ui.settings = false; G.ui.help = false; });
  const tshot = async n => { await wait(450); await pg.screenshot({ path: path.join(OUT, `${n}-${name}-${STAGE}.png`) }); console.log('shot', `${n}-${name}-${STAGE}`); };
  await tshot('8-title');
  await pg.evaluate(() => { G.ui.help = true; }); await tshot('8-title-help');
  await c2.close();
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ headless: true });
  await run(br, base, 'desktop-1920x1080', { width: 1920, height: 1080 }, {}, false);
  await run(br, base, 'phone-844x390', { width: 844, height: 390 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, true);
  // portrait rotate card: title and play
  {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push('portrait: pageerror: ' + e.message));
    await page.goto(`${base}/index.html?scene=play`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    await wait(500);
    await page.evaluate(() => { G.state = 'title'; });
    await wait(500); await page.screenshot({ path: path.join(OUT, `2-portrait-title-390x844-${STAGE}.png`) }); console.log('shot 2-portrait-title');
    await page.evaluate(() => { G.state = 'play'; IN.setDevice('touch'); });
    await wait(500); await page.screenshot({ path: path.join(OUT, `2-portrait-play-390x844-${STAGE}.png`) }); console.log('shot 2-portrait-play');
    await ctx.close();
  }
  await br.close(); srv.close();
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
