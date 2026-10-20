#!/usr/bin/env node
'use strict';
// M3 art lane screenshots -> tools/shots/m3-art/
//   hero-t1-game.png / hero-t5-game.png      the layered hero in the real game with T1 (grey, common) and T5 (light, legendary) gear;
//                                            + belt / amulet / rings; zoom crops (x4) of idle, walk, attack, back, mirrored
//   enemies-hero-bosses.png                  hero next to a slime, the Mountain Troll, Mossjaw and Old Bramblehorn
//   enemies-all.png                          the whole Act I cast beside the hero
//   hero-preview-grid.png                    tools/hero-preview.html (every variant x tier, every suit x tier, the rapier demo)
// Usage: node tools/shots-m3-art.js [only]      (only = a substring of a shot name)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'shots', 'm3-art');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const wait = ms => new Promise(r => setTimeout(r, ms));
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const only = process.argv[2] || '';

// the two outfits: all gear slots + belt / amulet / rings (makeTestItem is deterministic: items.js)
const KITS = {
  t1: { weapon: ['weapon', 'sword', 0, 'common'], head: ['head', 'knighthelm', 0, 'common'], chest: ['chest', 'warden', 0, 'common'], boots: ['boots', 'knightgreaves', 0, 'common'],
    belt: ['belt', null, 0, 'uncommon'], amulet: ['amulet', null, 0, 'uncommon'] },
  t5: { weapon: ['weapon', 'sword', 4, 'legendary', true], head: ['head', 'knighthelm', 4, 'epic'], chest: ['chest', 'warden', 4, 'legendary'], boots: ['boots', 'knightgreaves', 4, 'rare'],
    belt: ['belt', null, 2, 'epic'], amulet: ['amulet', null, 2, 'legendary'], ring1: ['ring', null, 2, 'epic'], ring2: ['ring', null, 2, 'epic'] },
};
const GEMS = { t1: [], t5: ['ruby_3', 'topaz_3', 'emerald_3'] };
const EQUIP = (kit, sockets) => `(() => { const K = ${JSON.stringify(kit)}, p = G.player;
  for (const k in K) { const [slot, variant, tier, rarity, temp] = K[k]; const o = { slot, tier, rarity, sockets: ${JSON.stringify(sockets)} }; if (variant) o.variant = variant; if (temp) o.tempered = true;
    p.equip[k] = makeTestItem(o); }
  recalcStats(p, true); G.enemies.length = 0; G.banner = null; G.mouse.x = 345; G.mouse.y = 175; return Object.keys(p.equip).filter(k => p.equip[k]); })()`;
// freeze the world (hitstop) in a pose: idle | walk | attack | back | left
const POSE = pose => `(() => { const p = G.player; p.swing = null; p.castT = 0; p.moving = false; p.back = false;
  const ps = [isoX(p.x, p.y) - camX + RW / 2, isoY(p.x, p.y, p.z) - camY + RH / 2];
  if ('${pose}' === 'walk') { p.moving = true; p.walkT = 0.25; }
  if ('${pose}' === 'attack') { G.mouse.x = ps[0] + 60; G.mouse.y = ps[1] - 4; p.swing = { t: 0.08, dur: 0.4, arc: 2.4, dir: 1 }; }
  if ('${pose}' === 'back') { G.mouse.x = ps[0] + 20; G.mouse.y = ps[1] - 70; p.back = true; }
  if ('${pose}' === 'left') { G.mouse.x = ps[0] - 60; G.mouse.y = ps[1] + 10; }
  if ('${pose}' === 'idle') { G.mouse.x = ps[0] + 60; G.mouse.y = ps[1] + 10; }
  G.hitstopT = 3; return '${pose}'; })()`;
// enemies at scene-pixel offsets from the hero: [type, sx, sy, face]
const LINEUP = list => `(() => { const p = G.player; G.enemies.length = 0; const out = [];
  for (const [t, sx, sy, face] of ${JSON.stringify(list)}) { const x = p.x + sx / 32 + sy / 16, y = p.y + sy / 16 - sx / 32, e = spawnEnemy(t, x, y, 0); if (!e) { out.push('?' + t); continue; }
    e.z = tileH(G.map, x, y); e.stunT = 9999; e.spawnT = 0; e.face = face || 1; e.under = false; e.asleep = false; out.push(t); }
  G.banner = null; G.boss = null; G.hitstopT = 3; return out; })()`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ headless: true });
  const errs = [];
  async function game(dsf, fn) {
    const page = await br.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: dsf });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(`${base}/index.html?scene=play`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    await wait(600);
    try { await fn(page); } finally { await page.close(); }
  }
  const want = n => !only || n.includes(only);
  const HERO = { x: 380, y: 190, width: 200, height: 130 };       // the hero is at the centre of the 960x540 view
  for (const name of ['t1', 't5']) {
    if (!want('hero-' + name)) continue;
    await game(1, async page => {
      console.log(name, await page.evaluate(EQUIP(KITS[name], name === 't1' ? GEMS.t1 : GEMS.t5)));
      await page.evaluate(POSE('idle')); await wait(300);
      await page.screenshot({ path: path.join(OUT, `hero-${name}-game.png`) });
    });
    // zoomed poses (x4 device scale = crisp pixels), one file per pose
    await game(4, async page => {
      await page.evaluate(EQUIP(KITS[name], name === 't1' ? GEMS.t1 : GEMS.t5));
      for (const pose of ['idle', 'walk', 'attack', 'back', 'left']) {
        await page.evaluate(POSE(pose)); await wait(350);
        await page.screenshot({ path: path.join(OUT, `hero-${name}-${pose}.png`), clip: HERO });
      }
    });
  }
  if (want('enemies-hero-bosses')) await game(2, async page => {
    await page.evaluate(EQUIP(KITS.t5, GEMS.t5));
    console.log(await page.evaluate(LINEUP([['mossjaw', -168, 14, 1], ['gloomslime', 14, 34, 1], ['mountaintroll', 62, 14, -1], ['bramblehorn', 166, 22, -1]])));
    await page.evaluate(POSE('idle')); await wait(500);
    await page.screenshot({ path: path.join(OUT, 'enemies-hero-bosses.png'), clip: { x: 0, y: 60, width: 960, height: 420 } });
  });
  if (want('enemies-all')) await game(2, async page => {
    await page.evaluate(EQUIP(KITS.t5, GEMS.t5));
    console.log(await page.evaluate(LINEUP([['gloomslime_small', -34, 30, 1], ['gloomslime', -70, 34, 1], ['shadehound', -112, 36, 1], ['brambleshaman', -158, 34, 1],
      ['dreammoth', -200, 30, 1], ['thornbackboar', 52, 38, -1], ['ogre', 100, 34, -1], ['mountaintroll', 156, 38, -1], ['mossjaw', -150, -26, 1], ['bramblehorn', 156, -14, -1]])));
    await page.evaluate(POSE('idle')); await wait(500);
    await page.screenshot({ path: path.join(OUT, 'enemies-all.png'), clip: { x: 0, y: 40, width: 960, height: 440 } });
  });
  if (want('hero-preview-grid')) {
    const page = await br.newPage({ viewport: { width: 1300, height: 900 } });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(`${base}/tools/hero-preview.html`, { waitUntil: 'load' }); await wait(1500);
    await page.screenshot({ path: path.join(OUT, 'hero-preview-grid.png'), fullPage: true });
    await page.close();
  }
  await br.close(); srv.close();
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'ok: ' + OUT);
  process.exit(errs.length ? 1 : 0);
})();
