#!/usr/bin/env node
'use strict';
// tools/maps/shots-big.js -- the Act I big-map screenshots (DESIGN 25): the Vale overview + its sections, the Pinewood landmarks, the Hollow,
// the Warrens, the Clearing, and the engine's full-map screen (fog revealed, shrines discovered) for both maps. Writes tools/shots/act1-big/.
// Also copies the generator's top-down PNGs (tools/shots/maps/<id>.png, from `node tools/maps/build.js --preview`) as gen_<id>_topdown.png.
// Usage: node tools/maps/shots-big.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(__dirname, '..', 'shots', 'act1-big');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
const wait = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  for (const mapId of ['vale', 'pinewood']) {
    const page = await br.newPage({ viewport: { width: 960, height: 540 } });
    const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.goto(`${base}/index.html?map=${mapId}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await wait(600);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const at = async (name, x, y, ms = 2200) => {
      await ev(([x, y]) => { const p = G.player; p.x = x; p.y = y; p.z = tileH(G.map, x, y); p.dash = null; G.cam.x = isoX(x, y); G.cam.y = isoY(x, y, p.z) - 12; p.invulnT = 9999; G.enemies.length = 0; G.banner = null; G.msg = null; }, [x, y]);
      await wait(ms); await page.screenshot({ path: path.join(OUT, name + '.png') });
    };
    const pt = id => ev(id => { const t = G.map.triggers.find(q => q.id === id); return t && t.when.type === 'enter_area' ? [t.when.x, t.when.y] : null; }, id);
    const fullMap = async name => {
      await ev(() => {
        const m = G.map; if (!m.mini) miniBuild(m);
        m.mini.vis.fill(1); const rx = m.mini.rev.getContext('2d'); rx.fillStyle = '#fff'; rx.fillRect(0, 0, m.mini.N, m.mini.N);
        (G.prog.sections || (G.prog.sections = {}))[m.id] = m.sections.map(s => s.id);
        (G.prog.shrines || (G.prog.shrines = {}))[m.id] = m.objects.filter(o => o.shrineId).map(o => o.shrineId);
        HUD.fogTile = ''; G.state = 'play'; G.ui.open = false; G.ui.pause = false; openFullMap();
      });
      await wait(900); await page.screenshot({ path: path.join(OUT, name + '.png') });
      await ev(() => closeFullMap());
    };
    if (mapId === 'vale') {
      const [sx, sy] = await ev(() => [G.map.start.x, G.map.start.y]);
      await at('vale_01_arrival', sx, sy);
      await at('vale_02_dummy_yard', ...(await pt('yard_teach')));
      await at('vale_03_elder_stone', ...(await pt('elder')));
      await at('vale_04_first_chest', ...(await pt('chest')));
      await at('vale_05_garden', ...(await pt('garden_ambush')));
      await at('vale_06_cottage_tablet', ...(await pt('tablet')));
      const rt = await ev(() => { const o = G.map.objects.find(q => q.shrineId === 'shrine_terrace'); return [o.x + 3, o.y + 1.5]; });
      await at('vale_07_rift_terrace', ...rt);
      await at('vale_08_pips_lanterns_islet', ...(await pt('lanterns_islet')));
      await at('vale_09_dream_arena_islet', ...(await pt('arena_islet')));
      await at('vale_10_moon_pond', ...(await pt('moon_pond')));
      await fullMap('vale_00_overview_fullmap');
    } else {
      // the landmark rhythm: giant-pine groups with a sunbeam, spread along the road (sorted by distance from the start)
      const lm = await ev(() => { const gs = G.map.objects.filter(o => o.src && o.src.t === 'pine_giant'); return G.map.objects.filter(o => o.beam && gs.filter(g => Math.hypot(g.x - o.x, g.y - o.y) < 4).length >= 2).map(o => [o.x, o.y]).sort((a, b) => Math.hypot(a[0] - 8, a[1] - 104) - Math.hypot(b[0] - 8, b[1] - 104)); });
      const pick = [0, Math.floor(lm.length / 3), Math.floor(lm.length * 2 / 3), lm.length - 1].filter((v, i, a) => lm[v] && a.indexOf(v) === i);
      let k = 0; for (const i of pick) await at(`pinewood_landmark_${++k}`, lm[i][0] + 3, lm[i][1] + 2);
      console.log('landmarks found:', lm.length);
      await at('pinewood_creek_and_ford', ...(await pt('ford')));
      await at('pinewood_shrine_1', ...(await pt('shrine1')));
      await at('pinewood_plaza_r2', ...(await pt('r2')));
      await at('pinewood_hollow_door', ...(await pt('hdoor_hint')));
      await at('hollow_1_arrival', ...(await pt('h_intro')));
      await at('hollow_2_shrine', ...(await pt('h_shrine')));
      await at('hollow_3_gallery', ...(await pt('h_r2')));
      await at('hollow_4_mossjaw_den', ...(await pt('h_boss')));
      await at('warrens_1_door', ...(await pt('w_enter')));
      await at('warrens_2_hall', ...(await pt('w_hall')));
      await at('warrens_3_vault', ...(await pt('w_vault')));
      await at('clearing_1_gate', ...(await pt('arena_hint')));
      await at('clearing_2_arena', ...(await pt('boss')));
      await at('gutter_hollow_edge', 28, 17);
      await fullMap('pinewood_00_fullmap');
      await ev(() => { const o = G.map.objects.find(q => q.shrineId === 'shrine3'); G.player.x = o.x + 1; G.player.y = o.y + 1; });
      await ev(() => { G.state = 'play'; G.ui.map = null; });
    }
    if (errs.length) { console.log(`ERROR ${mapId}: ${errs.slice(0, 3).join(' | ')}`); bad++; }
    await page.close();
  }
  await br.close(); srv.close();
  for (const id of ['vale', 'pinewood']) { const f = path.join(__dirname, '..', 'shots', 'maps', id + '.png'); if (fs.existsSync(f)) fs.copyFileSync(f, path.join(OUT, `gen_${id}_topdown.png`)); }
  console.log(fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length + ' screenshots in ' + path.relative(process.cwd(), OUT));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
