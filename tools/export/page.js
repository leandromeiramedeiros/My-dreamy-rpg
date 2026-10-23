'use strict';
// tools/export/page.js -- open the game headless (Playwright Chromium, the repo served on 127.0.0.1) and run a function in the
// page once it is ready (window.__ready). Canvases come back as { w, h, b64 } (raw RGBA via getImageData, so semi-transparent
// pixels are not re-encoded by the browser). Used by props.js (the art.js props, frozen trees, decal sets).
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
// in-page helper: canvas -> { w, h, b64 }
const GRAB = `window.__grab = c => { const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let s = '';
  for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000)); return { w: c.width, h: c.height, b64: btoa(s) }; };`;
async function inGame(query, fn, arg) {
  const { chromium } = require('playwright');
  const srv = http.createServer((q, r) => {
    const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const br = await chromium.launch();
  try {
    const page = await br.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://127.0.0.1:${srv.address().port}/index.html?${query}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await page.evaluate(GRAB);
    const out = await page.evaluate(`(${fn.toString()})(${JSON.stringify(arg || null)})`);
    if (errs.length) throw new Error('page errors: ' + errs.slice(0, 3).join(' | '));
    return out;
  } finally { await br.close(); srv.close(); }
}
const toImg = g => ({ w: g.w, h: g.h, rgba: new Uint8ClampedArray(Buffer.from(g.b64, 'base64')) });
module.exports = { inGame, toImg };
