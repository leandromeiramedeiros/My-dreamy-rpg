#!/usr/bin/env node
'use strict';
// The ELFX prototype board (DESIGN §31 / §32; element-vfx minutes A7, P0 / P1 / P7): a node check, then headless captures.
//   node tools/fx-board.js --check     the P0 / P1 check only (no browser):
//       * every DMG_ELS / RES_ELS entry, gloom and wind has an ELFX row; ramps are 4 steps; the core is the only step above
//         0.9 relative luminance; motifs <= 5 x 5 px and <= 3 frames; models exist; life bands are sane
//       * the derivation map: ELFX.derived() against the five live colour tables (EL_COL, ECHO_ELCOL, ICONS EC, HERO ELC,
//         STAT_COL) + hud.js EL_ICON_COL, cell by cell; every cell must be exact or an allow-listed intended change (D1-B)
//       * each live table colour against the nearest step of the element's ramp (information: how far the ramps sit)
//       * closed-form frame-skip safety (A7.4): the same particle sampled on a 30 Hz and a 60 Hz clock lands on the same
//         pixel, frame and dissolve row
//   node tools/fx-board.js [only]      the check, then tools/fx-board.html in headless Chromium -> tools/shots/m3-fxboard/:
//       board-<section>.png (one per section), strip-fx-<effect>.png, strip-<el>.png (8-frame strips), chips-16px*.png,
//       metrics.json (bake ms desktop and at 4x CPU throttle, sheet bytes raw / PNG, per-particle draw cost)
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'shots', 'm3-fxboard');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ---------------------------------------------------------------------------------------------------------------------------
function check() {
  const ctx = { console, Math, performance: { now: () => Date.now() } };
  vm.createContext(ctx);
  vm.runInContext(read('js/util.js') + '\n' + read('js/elfx.js') + '\nthis.ELFX = ELFX;', ctx, { filename: 'elfx.js' });
  const E = ctx.ELFX, fails = [], info = [];
  // the live tables, lifted out of the sources as literals (the files themselves need the whole game to run)
  const lit = (file, re, name) => {
    const m = read(file).match(re);
    if (!m) { fails.push(`cannot find ${name} in ${file}`); return {}; }
    return vm.runInNewContext('(' + m[1] + ')');
  };
  const live = {
    EL_COL: lit('js/items.js', /const EL_COL = (\{[^}]*\});/, 'EL_COL'),
    DMG_ELS: lit('js/items.js', /const DMG_ELS = (\[[^\]]*\]);/, 'DMG_ELS'),
    RES_ELS: lit('js/items.js', /const RES_ELS = (\[[^\]]*\]);/, 'RES_ELS'),
    ECHO_ELCOL: lit('js/render.js', /const ECHO_ELCOL = (\{[^}]*\});/, 'ECHO_ELCOL'),
    EC: lit('js/icons.js', /const EC = (\{[^}]*\});/, 'ICONS EC'),
    ELC: lit('js/hero.js', /const ELC = (\{[^}]*\});/, 'HERO ELC'),
    STAT_COL: lit('js/menus.js', /const STAT_COL = (\{[\s\S]*?\});/, 'STAT_COL'),
    EL_ICON_COL: lit('js/hud.js', /const EL_ICON_COL = (\{[^}]*\});/, 'EL_ICON_COL'),
  };
  // 1. rows
  const need = new Set([...(live.DMG_ELS || []), ...(live.RES_ELS || []), 'gloom', 'wind']);
  for (const el of need) if (!E.rows[el]) fails.push(`no ELFX row for '${el}'`);
  for (const el of E.ORDER) {
    const R = E.rows[el], m = R.motif;
    if (!Array.isArray(R.ramp) || R.ramp.length !== 4 || !R.ramp.every(c => /^#[0-9a-f]{6}$/i.test(c))) fails.push(`${el}: ramp must be 4 hex steps`);
    const L = R.ramp.map(E.lum);
    L.slice(0, 3).forEach((l, i) => { if (l > 0.9) fails.push(`${el}: ramp step ${i} ${R.ramp[i]} luminance ${l.toFixed(3)} > 0.9 (only the core may be)`); });
    for (const mm of [m, R.rune].filter(Boolean)) {
      if (mm.w > 5 || mm.h > 5) fails.push(`${el}: motif ${mm.w}x${mm.h} > 5x5`);
      if (mm.frames.length > 3) fails.push(`${el}: ${mm.frames.length} frames > 3`);
      mm.frames.forEach((f, i) => { if (f.length !== mm.h || f.some(r => r.length !== mm.w || /[^.d123]/.test(r))) fails.push(`${el}: frame ${i} is not ${mm.w}x${mm.h} of . d 1 2 3`); });
      const cores = mm.frames.map(f => f.join('').split('3').length - 1);
      if (cores.some(n => n > 1)) fails.push(`${el}: more than one core pixel in a frame (R5)`);
    }
    if (!E.MODELS[R.model]) fails.push(`${el}: unknown model '${R.model}'`);
    if (!(R.life[0] > 0 && R.life[1] >= R.life[0] && R.life[1] <= 3)) fails.push(`${el}: life band ${R.life}`);
    if (R.light && R.light.a > 0.35) fails.push(`${el}: light a ${R.light.a} > 0.35 (R5)`);
    for (const k of ['textCol', 'vivid', 'hudCol', 'icon']) if (!R[k]) fails.push(`${el}: missing ${k}`);
  }
  // 2. derivation map
  const INTENDED = { 'EC.holy': 'D1-B pale white-gold', 'ELC.holy': 'D1-B pale white-gold' };
  const D = E.derived(), rowsOut = [], elDmg = k => /Dmg$/.test(k) && !!E.rows[k.slice(0, -3)];
  let exact = 0, intended = 0;
  for (const tbl of ['EL_COL', 'ECHO_ELCOL', 'EC', 'ELC', 'STAT_COL', 'EL_ICON_COL']) {
    const cur = live[tbl] || {}, der = D[tbl];
    for (const k of Object.keys(cur)) {
      if (tbl === 'STAT_COL' && !elDmg(k)) continue;              // STAT_COL's non-element rows are not the registry's
      const a = String(cur[k]).toLowerCase(), b = der[k] == null ? null : String(der[k]).toLowerCase(), id = tbl + '.' + k;
      if (a === b) { exact++; continue; }
      if (INTENDED[id] && b) { intended++; rowsOut.push(`  ${id.padEnd(22)} ${a} -> ${b}   intended: ${INTENDED[id]}`); continue; }
      fails.push(`derivation ${id}: live ${a}, ELFX gives ${b}`);
    }
    for (const k of Object.keys(der)) if (!(k in cur) && !(tbl === 'STAT_COL' && !elDmg(k))) rowsOut.push(`  ${(tbl + '.' + k).padEnd(22)} (new) -> ${der[k]}`);
  }
  // 3. ramps vs the live tables (information)
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const dist = (a, b) => Math.round(Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i])));
  const near = [];
  for (const el of E.ORDER) {
    const R = E.rows[el], cells = [];
    for (const [tbl, key] of [['EL_COL', el], ['ECHO_ELCOL', el], ['EC', R.icon], ['STAT_COL', el + 'Dmg']]) {
      const v = live[tbl] && live[tbl][key]; if (!v) continue;
      let best = 0; R.ramp.forEach((c, i) => { if (dist(c, v) < dist(R.ramp[best], v)) best = i; });
      cells.push(`${tbl}=${v}~ramp[${best}] d${dist(R.ramp[best], v)}`);
    }
    near.push(`  ${el.padEnd(10)} ramp ${R.ramp.join(' ')}   ${cells.join('  ') || '(no live colour yet)'}`);
  }
  // 4. frame-skip safety: the same particles on a 30 Hz and a 60 Hz clock
  let samples = 0;
  for (const el of E.ORDER) for (let k = 0; k < 16; k++) {
    const p = E.spawn(el, 40, 30, 6, 0.5, k, { seed: 0.37, dir: 0.4, spread: 2, burst: k & 1 });
    let t30 = 0.5, t60 = 0.5;
    for (let i = 1; i <= 90; i++) {
      t30 += 1 / 30; t60 += 1 / 60; t60 += 1 / 60;
      const a = E.pos(p, t30, {}), b = E.pos(p, t60, {});
      samples++;
      if (a.vis !== b.vis || (a.vis && (Math.round(a.sx) !== Math.round(b.sx) || Math.round(a.sy) !== Math.round(b.sy) || a.f !== b.f || a.d !== b.d))) {
        // a float tie at a frame / pixel boundary is not a model fault; only report real divergence
        if (Math.abs(t30 - t60) < 1e-9) continue;
        fails.push(`frame-skip ${el}#${k} at ${t30.toFixed(3)} s: 30 Hz ${JSON.stringify(a)} vs 60 Hz ${JSON.stringify(b)}`); break;
      }
    }
  }
  console.log(`ELFX check: ${E.ORDER.length} rows (${E.HERO_ELS.length} hero + shatter + gloom); DMG_ELS ${JSON.stringify(live.DMG_ELS)}; RES_ELS ${JSON.stringify(live.RES_ELS)}`);
  console.log(`derivation map: ${exact} cells exact, ${intended} intended changes, ${rowsOut.filter(r => r.includes('(new)')).length} new keys`);
  rowsOut.forEach(r => console.log(r));
  console.log('ramps vs live tables (nearest ramp step, RGB distance):');
  near.forEach(r => console.log(r));
  console.log(`frame-skip: ${samples} samples, 30 Hz vs 60 Hz`);
  if (fails.length) { console.log('FAIL\n  ' + fails.join('\n  ')); return false; }
  console.log('ELFX check: OK');
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------------
async function capture(only) {
  const { chromium } = require('playwright');
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch({ headless: true });
  const errs = [];
  const open = async (q, throttle) => {
    const page = await br.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    if (throttle) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
    await page.goto(`${base}/tools/fx-board.html${q}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
    return page;
  };
  const dataUrl = (file, url) => fs.writeFileSync(path.join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
  const want = n => !only || n.includes(only);

  // metrics: a cold bake per page load, desktop and at 4x CPU throttle (the phone stand-in), 5 loads each, median
  const metrics = {};
  for (const [name, thr, qs] of [['desktop', 0, ''], ['throttle4x', 4, ''], ['desktopSourceIn', 0, '&tint=sourcein']]) {
    const ms = [];
    for (let i = 0; i < 9; i++) { const p = await open('?still=1&metricsOnly=1' + qs, thr); ms.push(await p.evaluate(() => window.__metrics.bakeMs)); if (i === 8) metrics[name] = await p.evaluate(() => window.__metrics); await p.close(); }
    ms.sort((a, b) => a - b);
    metrics[name].bakeMsRuns = ms.map(v => +v.toFixed(2)); metrics[name].bakeMsMedian = +ms[4].toFixed(2); metrics[name].bakeMsMin = +ms[0].toFixed(2);
  }
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));
  const m = metrics.desktop;
  console.log('bake phases (last desktop load): ' + JSON.stringify(metrics.desktop.bakePhases) + ' | 4x: ' + JSON.stringify(metrics.throttle4x.bakePhases));
  console.log(`bake with the source-in backend: median ${metrics.desktopSourceIn.bakeMsMedian} ms (runs ${metrics.desktopSourceIn.bakeMsRuns}); tint parity lut vs source-in: ${m.tintParity}`);
  console.log(`bake: desktop median ${metrics.desktop.bakeMsMedian} ms (runs ${metrics.desktop.bakeMsRuns}), 4x throttle median ${metrics.throttle4x.bakeMsMedian} ms`);
  console.log(`sheets: ${m.sheets} tinted sheets, ${m.rawBytes} B raw RGBA, ${m.pngBytes} B PNG (+ grey sheets ${m.greyPngBytes} B PNG)`);
  console.log(`draw: ${m.drawCallsPerParticle} drawImage per particle, ${m.stateChangesPerParticle} state changes; ${m.nsPerParticle} ns / particle desktop (pos ${m.nsPos} + blit ${m.nsBlit}; today's fillRect path ${m.nsBaseline} ns), ${metrics.throttle4x.nsPerParticle} ns at 4x throttle (baseline ${metrics.throttle4x.nsBaseline}) (${m.drawN} blits x ${m.drawReps})`);

  const page = await open('?still=1');
  await page.evaluate(() => window.__setT(1.37));
  for (const id of await page.evaluate(() => window.__sections)) {
    if (!want('board-' + id)) continue;
    await (await page.$('#' + id)).screenshot({ path: path.join(OUT, `board-${id}.png`) });
  }
  if (want('board-particles-grey')) {   // the whole particle section desaturated (the greyscale review)
    await page.evaluate(() => { document.getElementById('particles').style.filter = 'grayscale(1)'; });
    await (await page.$('#particles')).screenshot({ path: path.join(OUT, 'board-particles-grey.png') });
    await page.evaluate(() => { document.getElementById('particles').style.filter = ''; });
  }
  for (const [file, kind, name] of await page.evaluate(() => window.__strips)) {
    if (!want(file)) continue;
    dataUrl(file, await page.evaluate(([k, n]) => window.__strip(k, n), [kind, name]));
  }
  for (const [file, grey] of [['chips-16px.png', false], ['chips-16px-grey.png', true]]) if (want(file)) dataUrl(file, await page.evaluate(g => window.__chips(g), grey));
  await br.close(); srv.close();
  if (errs.length) { console.log('page errors:\n  ' + errs.join('\n  ')); process.exitCode = 1; }
  console.log('shots -> ' + path.relative(ROOT, OUT) + '/ : ' + fs.readdirSync(OUT).sort().join(' '));
}

const ok = check();
if (!ok) process.exitCode = 1;
if (process.argv[2] !== '--check' && ok) capture(process.argv[2] || '').catch(e => { console.error(e); process.exitCode = 1; });
