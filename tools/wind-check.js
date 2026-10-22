#!/usr/bin/env node
'use strict';
// M4a Wind lane checks (js/wind.js, docs/design/wind.md): drives the real game in headless Chromium.
//  - emitter shapes (vector / radial / pull / blast / zone) push or pull the right way
//  - an elite moves 0.5x a common enemy; a boss is never Lifted and only shoves inside an open >= 1 s move
//  - the hero is not pushed by ambient; emitters push it 0.5x, never during a dodge or from its own cast
//  - the 5 canopy frames (-2..+2) are all selected across wind strengths
//  - a real updateEnemies pass moves an enemy off a blast; WIND.sample cost <= 0.2 ms a frame (60 trees + 40 enemies + 4 emitters)
//  - no page errors; saves tools/out/wind/trees-strip.png (a blast whip across the canopy frames)
// Usage: node tools/wind-check.js     (exit 1 on any failed check or page error)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out', 'wind');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
let fails = 0;
function check(name, ok, info) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info !== undefined ? '  ' + JSON.stringify(info) : ''}`); if (!ok) fails++; }

// everything below runs page-side in ONE synchronous evaluate per group, so the game loop never interleaves
const PAGE = () => {
  const R = {};
  const hero = G.player, m = G.map, home = { x: hero.x, y: hero.y, dash: hero.dash, z: hero.z };
  // ---- an open patch: flat walkable tiles and no collider within 3.8 tiles ----
  const cols = m.colliders || [];
  const open = (cx, cy) => {
    const h0 = tileH(m, cx, cy);
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const tx = Math.floor(cx) + x, ty = Math.floor(cy) + y; if (tx < 0 || ty < 0 || tx >= m.W || ty >= m.H || m.block[ty][tx] || !walkable(m, tx + 0.5, ty + 0.5, h0) || tileH(m, tx + 0.5, ty + 0.5) !== h0) return false; }
    for (const c of cols) if (Math.abs(c.x - cx) < 3.8 + (c.r || 0) && Math.abs(c.y - cy) < 3.8 + (c.r || 0)) return false;
    return true;
  };
  let sx = -1, sy = -1, bd = 1e9;
  for (let y = 6; y < m.H - 6; y += 2) for (let x = 6; x < m.W - 6; x += 2) { const d = Math.hypot(x - hero.x, y - hero.y); if (d < bd && open(x + 0.5, y + 0.5)) { bd = d; sx = x + 0.5; sy = y + 0.5; } }
  R.spot = [sx, sy];
  if (sx < 0) return R;
  const adv = dt => { G.t += dt; WIND.now(); };
  const mk = (x, y, o) => Object.assign({ x, y, r: 0.4, z: 0, hp: 10, tags: [], res: {} }, o || {});
  const place = () => { hero.x = sx + 3; hero.y = sy + 3; hero.dash = 0; hero.z = 0; };
  // run an emitter and return each body's displacement; bodies is [[body, sdt-less offsets]...]
  const run = (em, bodies, steps, dt, pre) => {
    WIND.reset(); place(); adv(0.016); const e = WIND.emit(em);
    if (pre) adv(pre);
    const p0 = bodies.map(b => [b.x, b.y]);
    for (let i = 0; i < steps; i++) { adv(dt); for (const b of bodies) WIND.push(b, dt); }
    return bodies.map((b, i) => [b.x - p0[i][0], b.y - p0[i][1]]);
  };
  // ---- shapes ----
  const sh = {};
  let d;
  d = run({ kind: 'vector', x: sx, y: sy, dir: 0, r: 5, arc: 0.6, force: 5, life: 2 }, [mk(sx + 1.5, sy), mk(sx + 1.5, sy + 3)], 3, 0.05); sh.vector = [d[0][0] > 0.05 && Math.abs(d[0][1]) < 0.01, d[1][0] === 0 && d[1][1] === 0, d[0]];   // along dir; outside the cone untouched
  d = run({ kind: 'vector', x: sx, y: sy, dir: Math.PI / 2, r: 5, arc: 0.6, force: 5, life: 2 }, [mk(sx, sy + 1.5)], 3, 0.05); sh.vectorY = [d[0][1] > 0.05 && Math.abs(d[0][0]) < 0.01, d[0]];
  d = run({ kind: 'radial', x: sx, y: sy, r: 4, force: 5, life: 2 }, [mk(sx + 1.5, sy), mk(sx - 1.5, sy), mk(sx, sy + 1.5), mk(sx, sy - 1.5)], 3, 0.05); sh.radial = [d[0][0] > 0.05 && d[1][0] < -0.05 && d[2][1] > 0.05 && d[3][1] < -0.05, d];
  d = run({ kind: 'pull', x: sx, y: sy, r: 4, force: 5, life: 2.6 }, [mk(sx + 2, sy), mk(sx - 2, sy), mk(sx, sy + 2), mk(sx, sy - 2)], 3, 0.05, 0.3); sh.pull = [d[0][0] < -0.05 && d[1][0] > 0.05 && d[2][1] < -0.05 && d[3][1] > 0.05, d];
  d = run({ kind: 'blast', x: sx, y: sy, r: 4, force: 14, life: 0.15, falloff: 0.8 }, [mk(sx + 1.6, sy), mk(sx - 1.6, sy), mk(sx, sy + 1.6), mk(sx, sy - 1.6)], 1, 0.06, 0); sh.blast = [d[0][0] > 0.05 && d[1][0] < -0.05 && d[2][1] > 0.05 && d[3][1] < -0.05, d];
  d = run({ kind: 'zone', x: sx, y: sy, r: 4, force: 5, life: 3 }, [mk(sx + 1.5, sy), mk(sx - 1.5, sy)], 3, 0.05, 0.4); sh.zone = [d[0][1] > 0.05 && Math.abs(d[0][1]) > Math.abs(d[0][0]) * 3 && d[1][1] < -0.05, d];   // a tangent swirl
  R.shapes = sh;
  // ---- family mass: elite 0.5x, armoured 0.3x, ethereal 1.5x, res.wind ----
  const em = { kind: 'vector', x: sx, y: sy, dir: 0, r: 5, arc: 0.6, force: 5, life: 2 };
  d = run(em, [mk(sx + 1.5, sy), mk(sx + 1.5, sy, { elite: true }), mk(sx + 1.5, sy, { tags: ['armoured'] }), mk(sx + 1.5, sy, { tags: ['ethereal'] }), mk(sx + 1.5, sy, { res: { wind: 0.5 } })], 2, 0.05);
  R.mass = { common: d[0][0], elite: d[1][0], armoured: d[2][0], ethereal: d[3][0], resist: d[4][0] };
  // ---- bosses ----
  const boss = () => mk(sx + 1.5, sy, { boss: true, bk: { mv: null } });
  R.lift = { boss: WIND.canLift(boss()), amorphous: WIND.canLift(mk(0, 0, { tags: ['amorphous'] })), armoured: WIND.canLift(mk(0, 0, { tags: ['armoured'] })), common: WIND.canLift(mk(0, 0)), elite: WIND.canLift(mk(0, 0, { elite: true })), liftBoss: WIND.liftDur(boss()), liftCommon: WIND.liftDur(mk(0, 0)), liftElite: WIND.liftDur(mk(0, 0, { elite: true })) };
  let b = boss(); d = run(em, [b], 6, 0.05); R.bossIdle = Math.hypot(d[0][0], d[0][1]);                                          // no move: never pushed
  b = boss(); b.bk.mv = { open: 0.5, t: 2, wind: 0.5 }; d = run(em, [b], 6, 0.05); R.bossShort = Math.hypot(d[0][0], d[0][1]);   // open < 1 s: never pushed
  b = boss(); b.bk.mv = { open: 1.2, t: 2, wind: 0.5 }; d = run(em, [b], 12, 0.05); R.bossOpen = Math.hypot(d[0][0], d[0][1]);   // open >= 1 s: <= 0.5 tile in total
  // ---- hero ----
  const hrun = (em, setup) => {
    WIND.reset(); place(); hero.x = sx + 1.5; hero.y = sy; if (setup) setup(); adv(0.016);
    if (em) WIND.emit(em);
    const x0 = hero.x, y0 = hero.y, e = mk(sx + 1.5, sy + 0.0001);
    for (let i = 0; i < 4; i++) { adv(0.05); WIND.push(e, 0.05); }
    return [hero.x - x0, hero.y - y0, e.x - sx - 1.5];
  };
  const hv = { kind: 'vector', x: sx, y: sy, dir: 0, r: 5, arc: 0.6, force: 5, life: 2 };
  const hA = hrun(null), hE = hrun(hv), hD = hrun(hv, () => { hero.dash = 0.2; }), hB = hrun(Object.assign({ by: 1 }, hv));
  R.hero = { ambient: Math.hypot(hA[0], hA[1]), emitter: hE[0], enemy: hE[2], ratio: hE[2] ? hE[0] / hE[2] : 0, dodge: Math.hypot(hD[0], hD[1]), own: Math.hypot(hB[0], hB[1]) };
  // ---- 5 canopy frames across strengths ----
  const tx = sx + 1, ty = sy, seen = {};
  WIND.reset(); adv(0.016);
  for (const dir of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) for (let f = 0; f <= 14; f += 1) {
    WIND.reset(); adv(0.016); WIND.emit({ kind: 'vector', x: sx - 0.5, y: sy, dir, r: 6, arc: Math.PI, force: f, life: 1, falloff: 0.4 });
    for (let ph = 0; ph < 6; ph++) seen[WIND.frame(tx, ty, ph, WIND.time)] = 1;
  }
  WIND.reset(); adv(0.016); WIND.blast(sx - 1, sy, 4, 14); const t0 = WIND.time;
  for (let a = 0; a < 1.5; a += 0.02) seen[WIND.frame(tx, ty, 0, t0 + a)] = 1;
  R.frames = Object.keys(seen).map(Number).sort((a, b) => a - b);
  R.canopyW = Object.keys(ART.trees).filter(k => k !== 'dead' && ART.trees[k][0]).map(k => [k, ART.trees[k][0].canopyW && ART.trees[k][0].canopyW.length]);
  // ---- a real updateEnemies pass ----
  WIND.reset(); place(); adv(0.016);
  const types = Object.keys(ENEMY).filter(k => ENEMY[k].ai !== 'dummy' && ENEMY[k].ai !== 'boss');
  const ne = G.enemies.length; const saved = G.enemies.slice();
  const en = spawnEnemy(types[0], sx + 1.5, sy, 0);
  if (en) { en.x = sx + 1.5; en.y = sy; en.hp = en.maxHp = 1e6; }
  WIND.blast(sx, sy, 4, 14); const ex0 = en ? en.x : 0;
  for (let i = 0; i < 4; i++) { adv(1 / 60); updateEnemies(1 / 60); }
  R.real = { type: types[0], dx: en ? en.x - ex0 : null };
  G.enemies.length = 0; for (const e of saved) G.enemies.push(e);
  // ---- cost: 4 live emitters; 60 trees + 40 enemies ----
  WIND.reset(); adv(0.016);
  for (const k of ['vector', 'radial', 'pull', 'zone']) WIND.emit({ kind: k, x: sx + (k.length), y: sy, dir: 0.7, r: 6, force: 4, life: 1e4, arc: 1 });
  const T = [], N = [];
  for (let i = 0; i < 60; i++) T.push([sx - 6 + (i % 12), sy - 6 + (i / 12 | 0) * 2, i * 0.37]);
  for (let i = 0; i < 40; i++) N.push([sx - 5 + (i % 10) * 1.1, sy - 4 + (i / 10 | 0) * 2.3]);
  const frame = k => { const t = WIND.time + k * 0.0003; let s = 0; for (let i = 0; i < 60; i++) s += WIND.frame(T[i][0], T[i][1], T[i][2], t); for (let i = 0; i < 40; i++) s += WIND.sample(N[i][0], N[i][1], t).vx; return s; };
  const sampleOnly = k => { const t = WIND.time + k * 0.0003; let s = 0; for (let i = 0; i < 100; i++) s += WIND.sample(N[i % 40][0], N[i % 40][1], t).vx; return s; };
  let sink = 0; for (let k = 0; k < 300; k++) sink += frame(k) + sampleOnly(k);   // warm up the JIT
  const bench = fn => { const out = []; for (let r = 0; r < 7; r++) { const a = performance.now(); for (let k = 0; k < 400; k++) sink += fn(k); out.push((performance.now() - a) / 400); } out.sort((x, y) => x - y); return out[3]; };
  R.cost = { frameMs: bench(frame), sampleMs: bench(sampleOnly), sink: sink > 1e99 };
  // ---- the trees strip: a blast whip across the frames (canvas -> dataURL) ----
  WIND.reset(); adv(0.016);
  const img = (ART.trees.round || ART.trees[Object.keys(ART.trees)[0]])[0];
  WIND.blast(sx - 1.2, sy, 4, 14); const w0 = WIND.time;
  const times = [-0.05, 0.0, 0.06, 0.12, 0.2, 0.3, 0.42, 0.56, 0.72, 0.9], Z = 4;
  const cw = img.width * Z + 8, c = document.createElement('canvas'); c.width = cw * times.length; c.height = img.height * Z + 24;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#26364a'; g.fillRect(0, 0, c.width, c.height); g.font = '11px monospace'; g.fillStyle = '#fff';
  const strip = [];
  times.forEach((a, i) => {
    const fr = WIND.frame(sx + 1, sy, 0, w0 + a + 0.0001 + 1 / 12 * 0); strip.push(fr);
    const im = img.swayW[fr + 2] || treeFrame(img, fr, 1);
    g.drawImage(im, 0, 0, im.width, im.height, i * cw + 4, 20, im.width * Z, im.height * Z);
    g.fillText(`t=${a.toFixed(2)} f=${fr >= 0 ? '+' : ''}${fr}`, i * cw + 4, 13);
  });
  R.strip = { frames: strip, png: c.toDataURL('image/png') };
  // ---- restore ----
  WIND.reset(); hero.x = home.x; hero.y = home.y; hero.dash = home.dash; hero.z = home.z;
  return R;
};

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ headless: true });
  const page = await br.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`${base}/index.html?map=vale`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await page.waitForTimeout(500);
  const R = await page.evaluate(PAGE);
  check('open patch found for the test bodies', R.spot[0] > 0, R.spot);
  if (R.spot[0] > 0) {
    const S = R.shapes;
    check('vector: pushes along dir, nothing outside the cone', S.vector[0] && S.vector[1], S.vector[2]);
    check('vector: dir +y pushes +y', S.vectorY[0], S.vectorY[1]);
    check('radial: pushes out from the centre', S.radial[0], S.radial[1]);
    check('pull: draws bodies in', S.pull[0], S.pull[1]);
    check('blast: ring front pushes out', S.blast[0], S.blast[1]);
    check('zone: swirls tangentially', S.zone[0], S.zone[1]);
    const M = R.mass, ratio = M.elite / M.common;
    check('an elite moves 0.5x a common enemy', M.common > 0.05 && Math.abs(ratio - 0.5) < 0.02, M);
    check('family mass: armoured 0.3x, ethereal 1.5x, res.wind 0.5 -> 0.5x', Math.abs(M.armoured / M.common - 0.3) < 0.02 && Math.abs(M.ethereal / M.common - 1.5) < 0.03 && Math.abs(M.resist / M.common - 0.5) < 0.02, M);
    const L = R.lift;
    check('a boss is never Lifted (nor amorphous / armoured)', !L.boss && !L.amorphous && !L.armoured && L.liftBoss === 0, L);
    check('Lifted duration: common 0.8 s, elite 0.4 s', L.common && L.liftCommon === 0.8 && L.liftElite === 0.4, L);
    check('a boss is not pushed outside an open >= 1 s move', R.bossIdle < 1e-9 && R.bossShort < 1e-9, [R.bossIdle, R.bossShort]);
    check('a boss shoves <= 0.5 tile inside an open >= 1 s move', R.bossOpen > 0.3 && R.bossOpen <= 0.5001, R.bossOpen);
    const H = R.hero;
    check('the hero is not pushed by ambient', H.ambient === 0, H.ambient);
    check('an emitter pushes the hero ~0.5x an enemy', H.emitter > 0 && Math.abs(H.ratio - 0.5) < 0.15, H);
    check('no hero push during a dodge or from its own cast', H.dodge === 0 && H.own === 0, H);
    check('all 5 canopy frames (-2..+2) are selected across wind strengths', [-2, -1, 0, 1, 2].every(f => R.frames.includes(f)), R.frames);
    check('every tree species carries 5 canopy frames', R.canopyW.length > 0 && R.canopyW.every(x => x[1] === 5), R.canopyW);
    check('a blast through updateEnemies moves a real enemy outward', R.real.dx > 0.1, R.real);
    check('WIND.sample cost <= 0.2 ms a frame (60 trees + 40 enemies + 4 emitters)', R.cost.frameMs <= 0.2, { frameMs: +R.cost.frameMs.toFixed(4), sample100Ms: +R.cost.sampleMs.toFixed(4) });
    check('the blast whip reaches the far canopy frames', R.strip.frames.some(f => Math.abs(f) === 2), R.strip.frames);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'trees-strip.png'), Buffer.from(R.strip.png.split(',')[1], 'base64'));
    console.log('strip: ' + path.join('tools', 'out', 'wind', 'trees-strip.png'));
  }
  // a few real seconds of play: the wind hooks run in the loop with no errors
  await page.mouse.move(600, 260); await page.mouse.down(); await page.keyboard.down('d'); await page.waitForTimeout(2500); await page.keyboard.up('d'); await page.mouse.up();
  check('no page errors', errs.length === 0, errs.slice(0, 3));
  await br.close(); srv.close();
  console.log(fails ? `${fails} FAILED` : 'all wind checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
