// M3 hot-fix debug: Bramblehorn arena with its rifts open; walk the bot from several spots to the boss chest and check it never warps.
// node tools/qa/dbg-chest.js
const { launch, Bot, KbmDriver } = require('./lib');
(async () => {
  const { br, page } = await launch({ query: '?map=pinewood' });
  const bot = new Bot(page, new KbmDriver(page), 'chest');
  let bad = 0;
  for (const [X, Y] of [[100, 31], [97, 29], [101, 28.5], [99, 33]]) {
    await page.evaluate(([X, Y]) => { if (G.map.id !== 'pinewood') return; try { openGate('arena_gate'); } catch (e) {} for (const pt of G.map.portals) pt.open = true; for (const e of G.enemies || []) e.hp = 0; const p = G.player; p.x = X; p.y = Y; p.z = tileH(G.map, X, Y); }, [X, Y]);
    await page.evaluate(() => { window.__tr = []; if (!window.__trOn) { window.__trOn = 1; const f = () => { if (G.map && G.player) { window.__tr.push([G.map.id, +G.player.x.toFixed(2), +G.player.y.toFixed(2), G.player.dash ? 'D' : '', +(G.player.vx || 0).toFixed(1), +(G.player.vy || 0).toFixed(1)]); if (window.__tr.length > 300) window.__tr.shift(); } requestAnimationFrame(f); }; requestAnimationFrame(f); const tr = window.transition; window.transition = function () { window.__warp = { tr: window.__tr.slice(-60), stack: new Error().stack }; return tr.apply(this, arguments); }; } });
    const r = await bot.goal({ name: 'boss chest from ' + X + ',' + Y, x: 104.68, y: 26.33, r: 1.1, timeout: 30000, noFinding: true });
    const s = await bot.snap(); console.log('RESULT', X, Y, r, s.map, s.p.x.toFixed(2), s.p.y.toFixed(2)); if (s.map !== 'pinewood') { bad++; console.log(JSON.stringify(await page.evaluate(() => window.__warp))); break; }
  }
  console.log(bad ? 'WARPED' : 'ALL OK'); await br.close();
})();
