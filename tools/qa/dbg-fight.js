// Turbo debug: spawn a pack next to a fresh hero and clear it with the bot; compare --turbo vs realtime.
// node tools/qa/dbg-fight.js [--turbo] [--elite=<mod>] [--map=<id>] [type] [n]
// A Ruins row (wisp, gloomknight, gravechanter, pillarmimic, shadelingswarm, voidarcher) or a boss (oathless, gloamwarden, ...)
// defaults to the demo `ruins` map (band L10-17) and a clean field (js/bosses.js debugFight: story triggers marked fired); a
// boss spawns alone (n = 1) inside an inline arena. Everything else keeps the old Vale setup.
const { launch, Bot, KbmDriver, sleep, now } = require('./lib');
const RUINS = ['wisp', 'gloomknight', 'gravechanter', 'pillarmimic', 'shadelingswarm', 'voidarcher'];
(async () => {
  const turbo = process.argv.includes('--turbo'), a = process.argv.filter(x => !x.startsWith('--')).slice(2);
  const opt = k => { const o = process.argv.find(x => x.startsWith('--' + k + '=')); return o ? o.split('=')[1] : null; };
  const type = a[0] || 'gloomslime', n = +(a[1] || 3), elite = opt('elite');
  const boss = ['oathless', 'gloamwarden', 'mossjaw', 'bramblehorn', 'boss'].includes(type);
  const map = opt('map') || (RUINS.includes(type) || ['oathless', 'gloamwarden', 'boss'].includes(type) ? 'ruins' : 'vale');
  const { br, page } = await launch({ query: '?map=' + map, turbo });
  const bot = new Bot(page, new KbmDriver(page), turbo ? 'turbo' : 'rt'); bot.log = (m, d) => console.log((+bot.el()).toFixed(1), m, d ? JSON.stringify(d).slice(0, 160) : '');
  for (let i = 0; i < 40; i++) { const s = await bot.snap(); if (s.st === 'play') break; await bot.react(s, {}); await sleep(200); }
  await sleep(1500);
  await page.evaluate(([type, n, map, boss, elite]) => {
    window.__sw = 0; window.__de = 0; const sw = swingWeapon, de = damageEnemy; window.swingWeapon = function () { window.__sw++; return sw.apply(this, arguments); }; window.damageEnemy = function () { window.__de++; return de.apply(this, arguments); };
    const p = G.player;
    if (map === 'vale' && !boss) { p.x = 36; p.y = 30; p.z = tileH(G.map, p.x, p.y); for (let i = 0; i < n; i++) spawnEnemy(type, p.x + 3 + i * 0.7, p.y - 1 + i * 0.5, 0.9, elite ? { elite } : {}); }
    else {
      if (map === 'ruins') p.level = Math.max(p.level, 13);   // the band's middle: commons spawn at the hero's level
      const e = debugFight(type, { d: 4, elite });
      if (!boss) for (let i = 1; i < n; i++) spawnEnemy(type, e.x + i * 0.8, e.y + (i % 2 ? 1 : -1), 0.9, elite ? { elite } : {});
    }
    window.__dmgOut = 0;
  }, [type, n, map, boss, elite]);
  console.log('start', JSON.stringify(await page.evaluate(() => [G.map.id, G.player.x, G.player.y, G.state, G.enemies.length, G.enemies.map(e => e.type + '@L' + e.lvl).slice(0, 6).join(' ')])));
  const r0 = Date.now(), t0 = now();
  const res = await bot.clear('fight', boss ? 400000 : 90000);
  const s = await bot.snap();
  console.log('RESULT', JSON.stringify({ turbo, res, game: ((now() - t0) / 1000).toFixed(1), real: ((Date.now() - r0) / 1000).toFixed(1), hp: s.p.hp, max: s.p.maxHp, deaths: bot.out.deaths.length, left: s.en.filter(e => !e.dummy).length, swings: await page.evaluate(() => window.__sw), hits: await page.evaluate(() => window.__de), pos: [s.p.x, s.p.y] }));
  await br.close();
})();
