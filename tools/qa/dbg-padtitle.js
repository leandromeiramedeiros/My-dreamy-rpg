// QA: what does a gamepad-only player need to do on the title screen? (A on the default focus, then D-pad)
const { launch, PadDriver, sleep } = require('./lib');
(async () => {
  const { br, page } = await launch({ pad: true });
  const d = new PadDriver(page);
  const st = async tag => { const s = await page.evaluate(() => ({ st: G.state, foc: (window.UI && UI.focus && UI.focus.cur && UI.focus.cur()) || null, title: G.title && JSON.stringify(G.title).slice(0, 200) })); console.log(tag, JSON.stringify(s)); };
  await sleep(1500); await st('initial');
  await d.tap(0); await sleep(800); await st('after A#1'); await page.screenshot({ path: __dirname + '/shots/padtitle-1-afterA.png' });
  await d.tap(0); await sleep(800); await st('after A#2');
  await d.tap(13); await sleep(400); await st('after dpad-down'); await page.screenshot({ path: __dirname + '/shots/padtitle-2-down.png' });
  await d.tap(0); await sleep(2500); await st('after A on next'); await page.screenshot({ path: __dirname + '/shots/padtitle-3-final.png' });
  await br.close();
})();
