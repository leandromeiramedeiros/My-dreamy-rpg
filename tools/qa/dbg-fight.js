// Turbo debug: spawn a slime pack next to a fresh hero on the Vale and clear it; compare --turbo vs realtime.
// node tools/qa/dbg-fight.js [--turbo] [type] [n]
const { launch, Bot, KbmDriver, sleep, now } = require('./lib');
(async () => {
  const turbo = process.argv.includes('--turbo'), a = process.argv.filter(x => !x.startsWith('--')).slice(2);
  const type = a[0] || 'gloomslime', n = +(a[1] || 3);
  const { br, page } = await launch({ query: '?map=vale', turbo });
  const bot = new Bot(page, new KbmDriver(page), turbo ? 'turbo' : 'rt'); bot.log = (m, d) => console.log((+bot.el()).toFixed(1), m, d ? JSON.stringify(d).slice(0, 160) : '');
  for (let i = 0; i < 40; i++) { const s = await bot.snap(); if (s.st === 'play') break; await bot.react(s, {}); await sleep(200); }
  await sleep(1500);
  await page.evaluate(([type, n]) => { window.__sw = 0; window.__de = 0; const sw = swingWeapon, de = damageEnemy; window.swingWeapon = function () { window.__sw++; return sw.apply(this, arguments); }; window.damageEnemy = function () { window.__de++; return de.apply(this, arguments); }; const p = G.player; p.x = 36; p.y = 30; p.z = tileH(G.map, p.x, p.y); for (let i = 0; i < n; i++) spawnEnemy(type, p.x + 3 + i * 0.7, p.y - 1 + i * 0.5); window.__dmgOut = 0; }, [type, n]);
  console.log('start', JSON.stringify(await page.evaluate(() => [G.player.x, G.player.y, G.state, G.enemies.length])));
  const r0 = Date.now(), t0 = now();
  const res = await bot.clear('fight', 90000);
  const s = await bot.snap();
  console.log('RESULT', JSON.stringify({ turbo, res, game: ((now() - t0) / 1000).toFixed(1), real: ((Date.now() - r0) / 1000).toFixed(1), hp: s.p.hp, max: s.p.maxHp, deaths: bot.out.deaths.length, left: s.en.filter(e => !e.dummy).length, swings: await page.evaluate(() => window.__sw), hits: await page.evaluate(() => window.__de), pos: [s.p.x, s.p.y] }));
  await br.close();
})();
