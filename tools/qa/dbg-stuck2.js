const { launch, KbmDriver, sleep } = require('./lib');
(async () => {
  const { br, page } = await launch({ query: '?map=' + (process.argv[4] || 'vale') });
  const X = +process.argv[2], Y = +process.argv[3];
  for (const dir of [['KeyA'], ['KeyW'], ['KeyS'], ['KeyD']]) {
    await page.evaluate(([X, Y]) => { const p = G.player; p.x = X; p.y = Y; p.z = tileH(G.map, X, Y); p.st = 100; p.cds = {}; }, [X, Y]);
    for (const k of dir) await page.keyboard.down(k); await sleep(200);
    await page.keyboard.down('ShiftLeft'); await sleep(60); await page.keyboard.up('ShiftLeft'); await sleep(700);
    for (const k of dir) await page.keyboard.up(k);
    const q = await page.evaluate(() => ({ x: +G.player.x.toFixed(2), y: +G.player.y.toFixed(2) }));
    console.log(dir.join('+'), 'dodge moved', (q.x - X).toFixed(2), (q.y - Y).toFixed(2));
  }
  // after dodge: can walk?
  await page.keyboard.down('KeyA'); await sleep(500); await page.keyboard.up('KeyA');
  console.log(await page.evaluate(() => ({ x: +G.player.x.toFixed(2), y: +G.player.y.toFixed(2) })));
  await br.close();
})();
