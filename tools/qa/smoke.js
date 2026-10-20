const { launch, KbmDriver, Bot, sleep } = require('./lib');
(async () => {
  const { br, page, errors, url } = await launch();
  console.log(url, 'loaded');
  const s0 = await page.evaluate(() => window.__qa.snap());
  console.log(JSON.stringify(s0).slice(0, 300));
  await page.screenshot({ path: __dirname + '/shots/smoke-title.png' });
  const d = new KbmDriver(page); await d.title();
  await sleep(1500);
  const s = await page.evaluate(() => window.__qa.snap());
  console.log(JSON.stringify(s).slice(0, 1800));
  console.log('objs', JSON.stringify(await page.evaluate(() => window.__qa.objects())).slice(0, 1500));
  await page.screenshot({ path: __dirname + '/shots/smoke-vale.png' });
  console.log('errors', errors);
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
