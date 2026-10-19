#!/usr/bin/env node
// Smoke test: opens every game/editor page in headless Chromium, pokes some input,
// saves a screenshot and fails on any console error or uncaught page exception.
// Usage: node tools/smoke.js [extra-scene-name ...]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const PAGES = ['index.html', 'index.html?scene=play', 'index.html?scene=arena', 'index.html?scene=boss',
  'index.html?scene=loadout', 'index.html?scene=portal', 'index.html?scene=play&weapon=starfall',
  'index.html?scene=play&weapon=moonbow', 'editor.html',
  ...process.argv.slice(2).map((s) => `index.html?scene=${s}`)];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function serve() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Hold each movement key briefly, click the canvas, then tap the ability/item keys.
async function poke(page) {
  for (const key of ['w', 'a', 's', 'd']) {
    await page.keyboard.down(key);
    await wait(250);
    await page.keyboard.up(key);
  }
  const box = await page.locator('canvas').first().boundingBox().catch(() => null);
  const x = box ? box.x + box.width / 2 : 480;
  const y = box ? box.y + box.height / 2 : 270;
  await page.mouse.click(x, y);
  for (const key of ['q', 'e', '1']) {
    await page.keyboard.press(key);
    await wait(150);
  }
}

async function smokeOne(browser, base, rel) {
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  try {
    await page.goto(`${base}/${rel}`, { waitUntil: 'load', timeout: 15000 });
    await wait(2500);
    await poke(page);
    await wait(1000);
    const name = rel.replace(/\.html/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'index';
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  } catch (err) {
    errors.push(`navigation/test: ${err.message.split('\n')[0]}`);
  } finally {
    await page.close();
  }
  return errors;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  let failed = 0;
  try {
    for (const rel of PAGES) {
      const errors = await smokeOne(browser, base, rel);
      if (errors.length) failed++;
      console.log(`${errors.length ? 'FAIL' : 'PASS'}  ${rel}`);
      for (const e of errors) console.log(`      ${e}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failed ? `\n${failed}/${PAGES.length} pages failed` : `\nAll ${PAGES.length} pages passed`);
  process.exit(failed ? 1 : 0);
})();
