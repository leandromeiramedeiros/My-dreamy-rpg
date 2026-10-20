#!/usr/bin/env node
'use strict';
// M3 UI lane screenshots -> tools/shots/m3-ui/: the inventory with all 8 slots filled via makeTestItem, a Rare weapon tooltip with compare
// deltas, a Legendary trinket tooltip and the touch-collapsed tooltip, at desktop 1920x1080 and phone 390x844 (plus 844x390 landscape).
// icons.js is injected only if index.html does not load it yet (the art lane wires it). Usage: node tools/shots-m3-ui.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'shots', 'm3-ui');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const errs = [];
// 8 equipped test items + a Rare sword (better than the equipped one) and a spare ring in the bag
function setup() {
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
  [sword, makeTestItem({ slot: 'chest', variant: 'dreamweave', tier: 2, rarity: 'epic', ilvl: 18 }), makeTestItem({ slot: 'ring', rarity: 'legendary', tier: 2, ilvl: 30 }), window.__legend,
    makeTestItem({ unique: 'rootcrown' }), makeTestItem({ slot: 'weapon', variant: 'bow', tier: 0, rarity: 'common' }), makeTestItem({ slot: 'boots', variant: 'stalkershoes', tier: 1, rarity: 'uncommon' })].forEach(e => bagAdd(p, e));
  bagAdd(p, { gem: 'ruby_1', n: 3 }); bagAdd(p, { gem: 'sapphire_2' });
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
  await page.evaluate(setup);
  await page.evaluate(t => { if (t) { IN.setDevice('touch'); } openInv('inv'); }, touch);
  const shot = async n => { await wait(350); await page.screenshot({ path: path.join(OUT, `${name}-${n}.png`) }); console.log('shot', `${name}-${n}`); };
  // 1. inventory, all 8 slots filled, nothing selected
  await page.evaluate(() => { G.ui.sel = null; });
  await shot('inventory');
  // 2. Rare weapon in the bag vs the equipped Rare sword: compare deltas
  await page.evaluate(() => { G.ui.sel = window.__sword; });
  await shot('tooltip-rare-weapon');
  // 3. Legendary trinket
  await page.evaluate(() => { G.ui.sel = window.__legend; });
  await shot('tooltip-legendary-trinket');
  // 4. both rings full + a bag ring: pick mode
  await page.evaluate(() => { const r = G.player.bag.find(e => e && e.slot === 'ring'); startRingPick(G.player, r); });
  await shot('ring-pick');
  await ctx.close();
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ headless: true });
  await run(br, base, 'desktop-1920x1080', { width: 1920, height: 1080 }, {}, false);
  await run(br, base, 'phone-390x844', { width: 390, height: 844 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, true);
  await run(br, base, 'phone-landscape-844x390', { width: 844, height: 390 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, true);
  // the touch-collapsed tooltip on a desktop-sized canvas, for a readable close-up of the collapsed layout
  await run(br, base, 'touch-collapsed-1920x1080', { width: 1920, height: 1080 }, { hasTouch: true }, true);
  await br.close(); srv.close();
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
