#!/usr/bin/env node
'use strict';
// Takes the HUD review screenshots into tools/shots/hud/ (docs/HUD.md): play HUD (normal, low HP + statuses, boss),
// every Tab screen, title, death, pause / settings, the touch v2 wheel, aiming, cancel, page 1-2-3 and left-handed shots (844x390, hasTouch) and gamepad focus on the bag.
// Usage: node tools/shots-hud.js     (exit 1 on any page error)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'shots', 'hud');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const PAD_STUB = () => {
  const mk = id => ({ id, index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) });
  window.__pad = mk('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'); window.__padOn = false;
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__padOn ? window.__pad : null] });
  window.__btn = (i, on) => { const b = window.__pad.buttons[i]; b.pressed = on; b.value = on ? 1 : 0; window.__padOn = true; };
};
let errs = [];
async function open(br, base, q, opts = {}) {
  const ctx = await br.newContext(Object.assign({ viewport: { width: 960, height: 540 } }, opts));
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(`${q}: pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errs.push(`${q}: console: ${m.text()}`); });
  await page.addInitScript(PAD_STUB);
  await page.goto(`${base}/index.html${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await wait(700);
  return { page, ctx };
}
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('shot', name); };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ headless: true });
  const tap = async (page, i, ms = 120) => { await page.evaluate(i => window.__btn(i, true), i); await wait(ms); await page.evaluate(i => window.__btn(i, false), i); await wait(100); };

  // ---- play HUD, normal ----
  let { page, ctx } = await open(br, base, '?scene=play');
  await page.evaluate(() => {
    G.enemies.length = 0; const p = G.player;
    const a = spawnEnemy('slime', p.x + 3, p.y + 1, 0), b = spawnEnemy('hound', p.x + 2, p.y - 3, 0);
    a.hp = a.maxHp * 0.6; b.hp = b.maxHp * 0.85; a.burnT = 3;
    G.seen.slime = { kills: 4, res: { slash: -0.5, pierce: 0.5 } };
    p.mp = p.maxMp * 0.8; p.ult = 60; p.cds.sunslash = 2.4; p.cdm.sunslash = 5;
    UI.toast({ text: 'Lumen Edge', rarity: 'rare', icon: itemIcon(p.equip.weapon) }); UI.toast({ text: 'Ruby', icon: gemIcon('ruby'), col: '#ff4a5a' });
    G.msg = { s: 'Not enough mana', t: 3 };
    text(a.x, a.y, a.z + 3, '312!', '#fff', true); G.texts[G.texts.length - 1].kind = 'crit';
    text(b.x, b.y, b.z + 3, '84', '#ff9a4a', false); text(p.x + 2, p.y, p.z + 3, 'WEAK', '#ffe36a', true); G.texts[G.texts.length - 1].kind = 'weak';
  });
  await wait(220);
  await shot(page, 'play-hud-normal');
  // ---- low HP with statuses ----
  await page.evaluate(() => { const p = G.player; p.hp = p.maxHp * 0.18; addBuff(p, 'bless', 8); addBuff(p, 'surge', 5); p.slowT = 3; p.stMax.slowT = 4; p.rootT = 1.5; p.stMax.rootT = 2; p.potT = G.t + 0.7; p.mp = 5; });
  await wait(450);
  await shot(page, 'play-hud-lowhp');
  // ---- Tab screens ----
  await page.evaluate(() => { G.player.hp = G.player.maxHp; G.player.mp = G.player.maxMp; sampleBag(G.player); G.player.bag[9] = { gem: 'ruby_1', n: 4 }; G.player.bag[10] = { gem: 'topaz_2', n: 1 }; G.seen.slime = { kills: 12, res: { slash: -0.5 } }; G.seen.hound = { kills: 3, res: {} }; G.seen.boss = { kills: 1, res: { holy: -0.5 } }; openInv('inv'); });
  await wait(500);
  await page.mouse.move(400, 130); await page.mouse.move(331, 140);
  await wait(250);
  await shot(page, 'tab-inventory');
  await page.evaluate(() => { G.ui.tab = 'skills'; }); await wait(300); await shot(page, 'tab-character');
  await page.evaluate(() => { G.ui.tab = 'bestiary'; }); await wait(300); await shot(page, 'tab-bestiary');
  await page.evaluate(() => { G.ui.tab = 'quests'; }); await wait(300); await shot(page, 'tab-quests');
  // ---- pause / settings ----
  await page.evaluate(() => { closeInv(); }); await wait(100);
  await page.keyboard.press('Escape'); await wait(400);
  await shot(page, 'pause-settings');
  await page.evaluate(() => { G.ui.scr.set = 120; }); await wait(200); await shot(page, 'pause-settings-scrolled');
  await ctx.close();

  // ---- boss fight ----
  ({ page, ctx } = await open(br, base, '?scene=boss'));
  await wait(2500);
  await page.evaluate(() => { const b = G.boss; if (b) { b.hp = b.maxHp * 0.62; b.stagger = 7; } G.player.hp = G.player.maxHp * 0.7; });
  await wait(1200);
  await shot(page, 'boss-fight');
  await ctx.close();

  // ---- title (fresh, then with a save) ----
  ({ page, ctx } = await open(br, base, ''));
  await shot(page, 'title');
  await page.evaluate(() => { G.save = { player: { level: 14 }, world: { map: G.world.start } }; });
  await wait(300); await shot(page, 'title-with-save');
  await ctx.close();

  // ---- death ----
  ({ page, ctx } = await open(br, base, '?scene=play'));
  await page.evaluate(() => { G.player.invulnT = 0; G.player.xp = 400; hurtPlayer(99999, G.player.x, G.player.y); });
  await wait(2000);
  await shot(page, 'death');
  await ctx.close();

  // ---- gamepad focus on the bag ----
  ({ page, ctx } = await open(br, base, '?scene=play'));
  await page.evaluate(() => { sampleBag(G.player); });
  await tap(page, 8); await wait(200);
  for (const b of [15, 15, 13]) await tap(page, b);
  await wait(300);
  await shot(page, 'gamepad-focus-bag');
  await ctx.close();

  // ---- touch v2: circular wheel, ground aiming (844x390, hasTouch) ----
  ({ page, ctx } = await open(br, base, '?scene=play', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }));
  await page.evaluate(() => {   // synthetic touch pointers in display (960x540) coordinates, scaled to the CSS size of the canvas
    window.__tp = (type, id, x, y) => { const c = document.getElementById('game'), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: id, bubbles: true, clientX: r.left + x * r.width / DW, clientY: r.top + y * r.height / DH })); };
    window.__btnAt = slot => touchButtons().find(b => b.slot === slot);
    __tp('pointerdown', 5, 5, 5); __tp('pointerup', 5, 5, 5);   // a touch flips the HUD to the touch layout
    const p = G.player; G.enemies.length = 0; spawnEnemy('slime', p.x + 2.5, p.y + 1.5, 0); spawnEnemy('hound', p.x + 4, p.y - 1, 0);
    p.mp = p.maxMp * 0.7; p.ult = 62; p.hp = p.maxHp * 0.8; p.cds.sunslash = 3; p.cdm.sunslash = 5; p.potions = 2;
    const o = G.map.objects.find(q => q.chest && !q.opened); if (o) { p.x = o.x + 0.6; p.y = o.y + 0.3; }   // stand at a chest so the Interact slot shows
  });
  await wait(500);
  await shot(page, 'touch-layout-circular');
  // aimed cast: drag the ultimate past its range (clamped), then onto the cancel zone
  await page.evaluate(() => { G.prompt = null; G.player.ult = 100; G.player.cds = {}; const b = __btnAt('r'); __tp('pointerdown', 7, b.x, b.y); __tp('pointermove', 7, b.x - 20, b.y - 12); __tp('pointermove', 7, b.x - 70, b.y - 40); __tp('pointermove', 7, b.x - 150, b.y - 85); });
  await wait(350);
  await shot(page, 'touch-aim-circle-clamped');
  await page.evaluate(() => { __tp('pointermove', 7, 480, 480); __tp('pointermove', 7, 480, 500); });
  await wait(300);
  await shot(page, 'touch-cancel');
  await page.evaluate(() => { __tp('pointerup', 7, 480, 500); });
  await wait(150);
  // page 1 2 3 (the dot shows a ready skill on the hidden Q E R page)
  await page.evaluate(() => { const t = __btnAt('toggle'); __tp('pointerdown', 8, t.x, t.y); __tp('pointerup', 8, t.x, t.y); });
  await wait(400);
  await shot(page, 'touch-page-123');
  await page.evaluate(() => { const t = __btnAt('toggle'); __tp('pointerdown', 8, t.x, t.y); __tp('pointerup', 8, t.x, t.y); setSetting('leftHanded', true); });
  await wait(400);
  await shot(page, 'left-handed');
  await page.evaluate(() => { setSetting('leftHanded', false); });
  await ctx.close();

  await br.close(); srv.close();
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
