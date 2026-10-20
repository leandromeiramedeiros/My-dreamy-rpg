// QA: is "A/Enter on the default title focus does nothing" gamepad-specific? Test keyboard Enter/Space on the title.
const { launch, KbmDriver, sleep } = require('./lib');
(async () => {
  const { br, page } = await launch(); const d = new KbmDriver(page); await sleep(1500);
  const st = () => page.evaluate(() => G.state);
  console.log('initial', await st());
  for (const k of ['Enter', 'Space', 'Enter']) { await d.tap(k, 90); await sleep(900); console.log('after', k, await st()); }
  await d.tap('ArrowDown', 90); await sleep(300); await d.tap('Enter', 90); await sleep(2500); console.log('after Down+Enter', await st());
  await br.close();
})();
