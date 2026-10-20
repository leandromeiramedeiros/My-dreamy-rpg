// QA: short touch pass (844x390, hasTouch): aim drag, cancel (back onto button / X), page toggle, hold-to-attack.
const { launch, TouchDriver, sleep, SHOTS } = require('./lib');
(async () => {
  const L = await launch({ context: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } });
  const { br, page } = L; const d = new TouchDriver(page); await d.init();
  const out = [];
  const log = (k, v) => { out.push([k, v]); console.log(k, JSON.stringify(v)); };
  const ev = f => page.evaluate(f);
  await d.title(); await sleep(2500);
  for (let i = 0; i < 10 && (await ev(() => G.state)) !== 'play'; i++) { await d.title(); await sleep(900); }
  log('state', await ev(() => G.state)); await sleep(1500);
  const cd = async sl => ev(() => { const s = window.__qa.snap(); return { cd: s.sk && s.sk.q && s.sk.q.cd, mp: s.p.mp, page: s.tpage }; });
  const bq = await d.btn('q'); log('btn q', bq);
  log('before', await cd());
  // 1) aim drag: out ~120 px up-left, read aim state while held
  await d.down(5, bq.x, bq.y); await sleep(120); await d.mv(5, bq.x - 60, bq.y - 70); await sleep(120); await d.mv(5, bq.x - 90, bq.y - 110); await sleep(150);
  log('aim while dragging', await ev(() => typeof TOUCH_AIM !== 'undefined' && TOUCH_AIM ? { skill: TOUCH_AIM.skill, cancel: TOUCH_AIM.cancel, clamped: TOUCH_AIM.clamped, d: Math.round(TOUCH_AIM.d) } : null));
  await page.screenshot({ path: SHOTS + '/touch-aim-drag.png' });
  // 2) drag back onto the button = cancel
  await d.mv(5, bq.x, bq.y); await sleep(150);
  log('aim after returning onto button', await ev(() => typeof TOUCH_AIM !== 'undefined' && TOUCH_AIM ? { cancel: TOUCH_AIM.cancel } : null));
  await d.up(5); await sleep(400); log('after cancel-release (cd/mp should be unchanged)', await cd());
  // 3) cast: drag out and release
  await d.down(6, bq.x, bq.y); await sleep(120); await d.mv(6, bq.x - 60, bq.y - 70); await sleep(120); await d.mv(6, bq.x - 90, bq.y - 110); await sleep(150); await d.up(6); await sleep(400);
  log('after cast-release (cd should be > 0)', await cd());
  // 4) X cancel (far from button)
  await sleep(2500);
  const ax = await ev(() => typeof AIM_X !== 'undefined' ? AIM_X : null); log('AIM_X', ax);
  await d.down(7, bq.x, bq.y); await sleep(120); await d.mv(7, bq.x - 80, bq.y - 90); await sleep(120);
  if (ax) { await d.mv(7, ax.x, ax.y); await sleep(200); log('aim at X', await ev(() => TOUCH_AIM && { cancel: TOUCH_AIM.cancel })); await page.screenshot({ path: SHOTS + '/touch-aim-x.png' }); }
  await d.up(7); await sleep(400); log('after X-release', await cd());
  // 5) page toggle
  const t0 = await ev(() => TOUCH.page); const slots0 = await ev(() => window.__qa.touchBtns().map(b => b.slot));
  await d.tapBtn('toggle'); await sleep(500); const t1 = await ev(() => TOUCH.page); const slots1 = await ev(() => window.__qa.touchBtns().map(b => b.slot));
  await page.screenshot({ path: SHOTS + '/touch-page2.png' });
  log('page toggle', { before: t0, after: t1, slots0, slots1 });
  const b1 = await d.btn('1'); log('btn 1 (page 2)', b1);
  if (b1) { const h0 = await ev(() => Math.round(G.player.hp)); await d.tapBtn('1'); await sleep(500); log('tapped skill 1 (cd/hp)', await ev(() => ({ s1: window.__qa.snap().sk['1'], hp: Math.round(G.player.hp) }))); }
  await d.tapBtn('toggle'); await sleep(500); log('page back', await ev(() => TOUCH.page));
  // 6) toggle spam: 6 quick taps
  for (let i = 0; i < 6; i++) { await d.tapBtn('toggle'); await sleep(60); } await sleep(600); log('after 6 quick toggles', await ev(() => TOUCH.page));
  // 7) menu open/close by touch
  await d.openBag(); await sleep(600); log('bag open', await ev(() => !!G.ui.open)); await page.screenshot({ path: SHOTS + '/touch-bag.png' });
  await d.closeMenu(); await sleep(500); log('bag closed by close-button', !(await ev(() => !!G.ui.open)));
  require('fs').writeFileSync(__dirname + '/dbg-touch.out.json', JSON.stringify(out, null, 1));
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
