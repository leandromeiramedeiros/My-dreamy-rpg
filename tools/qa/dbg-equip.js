const { launch, KbmDriver, sleep } = require('./lib');
(async () => {
  const { br, page } = await launch({ query: '?map=vale' });
  const d = new KbmDriver(page);
  await page.evaluate(() => { const p = G.player; p.bag[0] = makeItem('willowwand', 'rare', 3); });
  const eq = () => page.evaluate(() => ({ w: itemName(G.player.equip.weapon), c: itemName(G.player.equip.chest), bag0: G.player.bag[0] && itemName(G.player.bag[0]), sel: !!G.ui.sel }));
  await d.tap('Tab'); await sleep(600);
  const fl = await page.evaluate(() => window.__qa.focusList());
  const r = fl.find(q => q.id === 'bag:0'); console.log(r, await eq());
  await d.clickDisp(r.x + r.w / 2, r.y + r.h / 2); await sleep(500); console.log('after click1', await eq());
  await page.screenshot({ path: 'shots/dbg-equip1.png' });
  await d.clickDisp(r.x + r.w / 2, r.y + r.h / 2); await sleep(500); console.log('after click2', await eq());
  // equip button
  const fl2 = await page.evaluate(() => window.__qa.focusList()); console.log(fl2.filter(q => !/^bag|^eq/.test(q.id)).map(q => q.id));
  await br.close();
})();
