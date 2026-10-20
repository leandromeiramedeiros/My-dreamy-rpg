const { launch, KbmDriver, sleep } = require('./lib');
(async () => {
  const { br, page } = await launch({ query: '?map=' + (process.argv[4] || 'vale') });
  const X = +process.argv[2] || 22.99, Y = +process.argv[3] || 16.13;
  const info = await page.evaluate(([X, Y]) => {
    const p = G.player, m = G.map; p.x = X; p.y = Y; p.z = tileH(m, X, Y);
    const hs = []; for (let j = Math.floor(Y) - 2; j <= Math.floor(Y) + 2; j++) { const row = []; for (let i = Math.floor(X) - 3; i <= Math.floor(X) + 3; i++) row.push(`${i},${j}:${(m.type[j] && m.type[j][i]) || '-'}${m.block[j] && m.block[j][i] ? 'B' : ''}h${m.h[j] ? m.h[j][i] : '-'}`); hs.push(row.join('  ')); }
    const cols = m.colliders.filter(c => Math.hypot(c.x - X, c.y - Y) < 3).map(c => ({ x: c.x, y: c.y, r: c.r, z: c.z, barrier: c.barrier, gid: c.gid }));
    return { hs, cols, h: tileH(m, X, Y) };
  }, [X, Y]);
  console.log(info.hs.join('\n')); console.log(JSON.stringify(info.cols), info.h);
  const d = new KbmDriver(page);
  for (const [name, keys] of [['W', ['KeyW']], ['A', ['KeyA']], ['S', ['KeyS']], ['D', ['KeyD']], ['WA', ['KeyW', 'KeyA']], ['SD', ['KeyS', 'KeyD']], ['WD', ['KeyW', 'KeyD']], ['SA', ['KeyS', 'KeyA']]]) {
    await page.evaluate(([X, Y]) => { const p = G.player; p.x = X; p.y = Y; p.z = tileH(G.map, X, Y); }, [X, Y]);
    for (const k of keys) await page.keyboard.down(k); await sleep(600); for (const k of keys) await page.keyboard.up(k);
    const q = await page.evaluate(() => ({ x: +G.player.x.toFixed(2), y: +G.player.y.toFixed(2) }));
    console.log(name, 'moved', (q.x - X).toFixed(2), (q.y - Y).toFixed(2));
  }
  await br.close();
})();
