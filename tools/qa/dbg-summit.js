// M3 hot-fix debug: drop the hero on the Hawk's Rest switchback corner and let the bot walk the summit drop.
// node tools/qa/dbg-summit.js [x y]
const { launch, Bot, KbmDriver, sleep } = require('./lib');
(async () => {
  const { br, page } = await launch({ query: '?map=pinewood' });
  const X = +process.argv[2] || 66.97, Y = +process.argv[3] || 37.78;
  await page.evaluate(([X, Y]) => { try { openGate('arena_gate'); openGate('hollow_exit'); } catch (e) {} for (const e of G.enemies || []) e.hp = 0; const p = G.player; p.x = X; p.y = Y; p.z = tileH(G.map, X, Y); }, [X, Y]);
  const bot = new Bot(page, new KbmDriver(page), 'summit');
  const r = await bot.goal({ name: 'summit drop', x: 76.5, y: 39.5, r: 1.2, until: q => q.p.x > 74.5 && q.p.z <= 5 && q.st === 'play', timeout: 60000 });
  const s = await bot.snap(); console.log('RESULT', r, s.p);
  await br.close();
})();
