// M3 hot-fix debug: with the bridge raised, hold every key combo for 1.5 s from spots on the bank beside the bridge and report
// the furthest north (toward the islet) the hero gets. Nothing may pass the gate row (y < 33.2). node tools/qa/dbg-bridge.js
const { launch, sleep } = require('./lib');
(async () => {
  const { br, page } = await launch({ query: '?map=pinewood' });
  let minY = 99;
  for (const [X, Y] of [[11.6, 34.6], [11.5, 35.5], [10, 34.2], [9.5, 34.5], [10.8, 34], [7.6, 35.6]]) for (const keys of [['KeyW'], ['KeyA'], ['KeyD'], ['KeyW', 'KeyA'], ['KeyW', 'KeyD'], ['KeyA', 'KeyS'], ['KeyS', 'KeyD']]) {
    await page.evaluate(([X, Y]) => { const p = G.player; p.x = X; p.y = Y; p.z = tileH(G.map, X, Y); }, [X, Y]);
    for (const k of keys) await page.keyboard.down(k); await sleep(1500); for (const k of keys) await page.keyboard.up(k);
    const q = await page.evaluate(() => ({ x: G.player.x, y: G.player.y, m: G.map.id })); if (q.m === 'pinewood') minY = Math.min(minY, q.y);
  }
  console.log('min y reached', minY.toFixed(2), minY < 33.2 ? 'LEAK' : 'SEALED'); await br.close();
})();
