#!/usr/bin/env node
'use strict';
// Forge runtime check (M4a): js/forge-rt.js + js/forge-bank/* in headless Chromium against the offline forge (tools/forge).
//   node tools/forge-rt-check.js            exit 1 on any FAIL
// Checks:
//   engine     js/forge-rt.js's engine block == the <rt> blocks of tools/forge/forge.js (rebuild: node tools/forge/build.js chibi)
//   banks      every bank sheet <= 64 KB of PNG; starter bundle (forge-rt.js + chibi.js) <= 400 KB; the files are exactly
//              chibi.js + one per piece file the rig bank names (no stale file)
//   tier       every piece file (<line>.t<N>.js, one tier: what a drop loads) <= 160 KB
//   equal      runtime sheet == offline FORGE.render byte for byte on every board frame (idle, walk, attack x 8 dirs) of
//              every bank loadout, bare and geared
//   sheet      the first full-loadout sheet (radiant, 8 dirs x every column) at CPU throttle x4: <= 120 ms busy (3 slices)
//   fetch      cached frame fetch (FORGE.frame) <= 0.05 ms per call (x4)
//   doll       the bag paper doll, one direction (FORGE.doll), <= 12 ms (x4)
//   sha256     every loadout sheet hashes the same in two fresh page loads
//   rim/sock   a rim mask and the sockets come back for a frame
//   enemies    the forge enemies (build.js ENEMY_RIGS: js/forge-bank/<rig>.js, gearless): each file <= 160 KB; runtime sheet ==
//              offline FORGE.render byte for byte on every frame of every sheet anim x 8 dirs; head + chest sockets; the sheet's
//              compose cost at CPU throttle x4 (<= 120 ms busy, like the hero's); sha256 stable over two fresh loads
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), FD = path.join(ROOT, 'tools', 'forge');
const FORGE = require(path.join(FD, 'forge.js')), RIG = 'chibi', model = require(path.join(FD, 'models', `${RIG}.js`));
const BANK = require(path.join(ROOT, 'js', 'forge-bank', `${RIG}.js`))[RIG];
const ENEMY_RIGS = require(path.join(FD, 'build.js')).ENEMY_RIGS, EMODEL = {};
for (const rig of ENEMY_RIGS) EMODEL[rig] = require(path.join(FD, 'models', `${rig}.js`));
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const PAGE = '<!doctype html><html><head><meta charset="utf-8"></head><body><script src="js/forge-rt.js"></script></body></html>';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(9)} ${detail}`); };

// ---- offline: the same gear files build.js merges
const pieces = {};
for (const f of fs.readdirSync(path.join(FD, 'models')).filter(f => f.startsWith(RIG + '-') && f.endsWith('.js')).sort()) {
  const g = require(path.join(FD, 'models', f)); if (g && g.pieces) Object.assign(pieces, g.pieces);
}
const LOADOUTS = BANK.loadouts, BOARD = ['idle', 'walk', 'attack'];
const toPieces = lo => LOADOUTS[lo].map(e => typeof e === 'string' ? pieces[e] : { piece: pieces[e.id], tier: e.tier, pal: e.pal });

const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (u === '/forge-rt-check.html') { r.writeHead(200, { 'Content-Type': 'text/html' }).end(PAGE); return; }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});

async function fresh(br) {
  const page = await br.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/forge-rt-check.html`, { waitUntil: 'load' });
  return { page, errs };
}
// every loadout's sheet: sha256 of its RGBA and (optionally) the RGBA itself, base64
const sheetsOf = (page, want) => page.evaluate(async ([rig, los, want]) => {
  const out = {};
  for (const lo in los) {
    const e = FORGE.sheet(rig, los[lo]); await e.promise;
    const d = e.canvas.getContext('2d').getImageData(0, 0, e.canvas.width, e.canvas.height).data;
    const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', d))].map(b => b.toString(16).padStart(2, '0')).join('');
    let b64 = null;
    if (want) { let s = ''; for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000)); b64 = btoa(s); }
    out[lo] = { sha, b64, w: e.canvas.width, h: e.canvas.height, at: e.at, n: e.n, dirs: Object.keys(e.dirIdx), fw: e.w, fh: e.h };
  }
  return out;
}, [RIG, LOADOUTS, want]);
// every forge enemy's gearless sheet, the same way
const enemySheetsOf = (page, want) => page.evaluate(async ([rigs, want]) => {
  const out = {};
  for (const rig of rigs) {
    const e = FORGE.sheet(rig, []); await e.promise;
    const d = e.canvas.getContext('2d').getImageData(0, 0, e.canvas.width, e.canvas.height).data;
    const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', d))].map(b => b.toString(16).padStart(2, '0')).join('');
    let b64 = null;
    if (want) { let s = ''; for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000)); b64 = btoa(s); }
    const S = FORGE.sockets(rig, [], 'idle', 'S', 0) || {};
    out[rig] = { sha, b64, w: e.canvas.width, h: e.canvas.height, at: e.at, n: e.n, dirs: Object.keys(e.dirIdx), fw: e.w, fh: e.h, sockets: Object.keys(S) };
  }
  return out;
}, [ENEMY_RIGS, want]);

(async () => {
  // engine sync
  const rt = fs.readFileSync(path.join(ROOT, 'js', 'forge-rt.js'), 'utf8').replace(/\r\n/g, '\n');
  const want = [...fs.readFileSync(path.join(FD, 'forge.js'), 'utf8').replace(/\r\n/g, '\n').matchAll(/^ {2}\/\/ <rt>[^\n]*\n([\s\S]*?)^ {2}\/\/ <\/rt>\n/gm)].map(m => m[1]).join('');
  const a = rt.indexOf('  // <engine>'), b = rt.indexOf('  // </engine>'), have = a >= 0 && b > a ? rt.slice(rt.indexOf('\n', a) + 1, b) : '';
  check('engine', have === want && want.length > 0, have === want ? `${want.split('\n').length - 1} lines in sync with tools/forge/forge.js` : 'out of sync: node tools/forge/build.js chibi');
  // bank sizes
  const files = fs.readdirSync(path.join(ROOT, 'js', 'forge-bank')).filter(f => f.endsWith('.js'));
  let worst = { key: '', kb: 0 }, top = { f: '', kb: 0 }, n = 0;
  for (const f of files) {
    const B = require(path.join(ROOT, 'js', 'forge-bank', f)), L = B[f.slice(0, -3)];
    for (const k in L.sheets) { n++; const kb = Buffer.from(L.sheets[k].png, 'base64').length / 1024; if (kb > worst.kb) worst = { key: k, kb }; }
    const fkb = fs.statSync(path.join(ROOT, 'js', 'forge-bank', f)).size / 1024; if (f !== `${RIG}.js` && !ENEMY_RIGS.includes(f.slice(0, -3)) && fkb > top.kb) top = { f, kb: fkb };
  }
  const starter = (fs.statSync(path.join(ROOT, 'js', 'forge-rt.js')).size + fs.statSync(path.join(ROOT, 'js', 'forge-bank', `${RIG}.js`)).size) / 1024;
  const named = new Set([RIG, ...ENEMY_RIGS, ...Object.values(BANK.lines)].map(l => l + '.js')), stale = files.filter(f => !named.has(f)), missing = [...named].filter(f => !files.includes(f));
  check('banks', worst.kb <= 64 && starter <= 400 && !stale.length && !missing.length,
    `${files.length} files, ${n} sheets, largest sheet ${worst.key} ${worst.kb.toFixed(1)} KB (<= 64) | starter bundle ${starter.toFixed(0)} KB (<= 400)` +
    (stale.length ? ` | stale: ${stale.join(' ')}` : ' | no stale file') + (missing.length ? ` | missing: ${missing.join(' ')}` : ''));
  const over = files.filter(f => f !== `${RIG}.js` && !ENEMY_RIGS.includes(f.slice(0, -3)) && fs.statSync(path.join(ROOT, 'js', 'forge-bank', f)).size > 160 * 1024);
  check('tier', top.kb <= 160, `largest piece file ${top.f} ${top.kb.toFixed(1)} KB (<= 160)${over.length ? ` | over: ${over.join(' ')}` : ''}`);
  const tags = (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<script src="js\/forge-rt\.js"><\/script>/g) || []).length;
  check('tag', tags === 1, `index.html loads js/forge-rt.js ${tags}x`);

  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const br = await chromium.launch({ headless: true });
  try {
    // ---- page 1: timings at CPU throttle x4, then every loadout's sheet
    const { page, errs } = await fresh(br), cdp = await page.context().newCDPSession(page);
    const full = Object.keys(LOADOUTS).pop(), doll = Object.keys(LOADOUTS).find(k => k !== full && LOADOUTS[k].length) || full;
    const dec = await page.evaluate(async ([rig, lf, ld]) => {
      const t0 = performance.now(); await FORGE.ready(rig); const t1 = performance.now(); await FORGE.ready(rig, lf); await FORGE.ready(rig, ld);
      return { base: t1 - t0, gear: performance.now() - t1 };
    }, [RIG, LOADOUTS[full], LOADOUTS[doll]]);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t = await page.evaluate(async ([rig, lf, ld]) => {
      const e = FORGE.sheet(rig, lf); await e.promise;
      const N = 20000, dirs = Object.keys(e.dirIdx); let hit = 0;
      const t0 = performance.now();
      for (let i = 0; i < N; i++) { const fr = FORGE.frame(rig, lf, i & 1 ? 'walk' : 'idle', dirs[i & 7], i % 6); if (fr) hit++; }
      const fetch = (performance.now() - t0) / N;
      const d = FORGE.doll(rig, ld, 'S');
      return { ms: e.ms, wall: e.wall, slices: e.slices, frames: e.cols * e.rows, fetch, hit, N, doll: d.ms, dollCols: d.layout.length };
    }, [RIG, LOADOUTS[full], LOADOUTS[doll]]);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(`      decode    base ${dec.base.toFixed(0)} ms, ${full} + ${doll} gear ${dec.gear.toFixed(0)} ms (x1, before the timings)`);
    check('sheet', t.ms <= 120, `${full}: ${t.frames} frames in ${t.ms.toFixed(1)} ms busy over ${t.slices.length} slices (${t.slices.map(v => v.toFixed(0)).join(" + ")}; ${t.wall.toFixed(0)} ms wall) at x4 (<= 120)`);
    check('fetch', t.fetch <= 0.05 && t.hit === t.N, `${(t.fetch * 1000).toFixed(2)} us per FORGE.frame at x4 (<= 50 us), ${t.hit}/${t.N} hits`);
    check('doll', t.doll <= 12, `${doll}: one direction, ${t.dollCols} frames in ${t.doll.toFixed(2)} ms at x4 (<= 12)`);
    // the forge enemies: decode (x1), then each sheet's compose at x4
    await page.evaluate(async rigs => { for (const r of rigs) await FORGE.ready(r, []); }, ENEMY_RIGS);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const et = await page.evaluate(async rigs => { const o = {}; for (const r of rigs) { const e = FORGE.sheet(r, []); await e.promise; o[r] = { ms: e.ms, slices: e.slices, frames: e.cols * e.rows }; } return o; }, ENEMY_RIGS);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const s1 = await sheetsOf(page, true), e1 = await enemySheetsOf(page, true);
    // rim + sockets of one frame
    const rs = await page.evaluate(([rig, lf]) => {
      const r = FORGE.rim(rig, lf, 'idle', 'S', 0), s = FORGE.sockets(rig, lf, 'attack', 'E', 2), m = r.mask.reduce((p, q) => p + q, 0);
      const faces = new Set(); r.face.forEach((f, i) => { if (r.mask[i]) faces.add(f); });
      return { edge: m, faces: faces.size, w: r.w, sockets: Object.keys(s) };
    }, [RIG, LOADOUTS[full]]);
    check('rim/sock', rs.edge > 0 && rs.faces >= 6 && ['handR', 'handL', 'head', 'cast', 'chest'].every(k => rs.sockets.includes(k)), `${full} idle S: ${rs.edge} edge px, ${rs.faces} facings | sockets: ${rs.sockets.join(' ')}`);
    // ---- equality: the board frames of every loadout vs the offline render
    let frames = 0, bad = 0; const badAt = [];
    for (const lo in LOADOUTS) {
      const S = s1[lo], px = Buffer.from(S.b64, 'base64'), off = FORGE.sheet(model, { pieces: toPieces(lo), anims: BOARD }), [fw, fh] = off.frame;
      off.layout.forEach(([an, f], c) => model.dirs.forEach(([dn], r) => {
        const rr = S.dirs.indexOf(dn), cc = S.at[an] + f; frames++;
        for (let y = 0; y < fh; y++) {
          const A = px.subarray(((rr * fh + y) * S.w + cc * fw) * 4, ((rr * fh + y) * S.w + cc * fw + fw) * 4);
          const B = Buffer.from(off.rgba.buffer, ((r * fh + y) * off.w + c * fw) * 4, fw * 4);
          if (Buffer.compare(A, B)) { bad++; if (badAt.length < 5) badAt.push(`${lo} ${dn} ${an}${f}`); break; }
        }
      }));
    }
    check('equal', !bad, `${frames - bad}/${frames} board frames identical (${Object.keys(LOADOUTS).join(', ')} x idle/walk/attack x 8 dirs)${bad ? ' | first: ' + badAt.join(', ') : ''}`);
    // ---- equality: every frame of every forge enemy vs the offline render
    let ef = 0, eb = 0; const ebAt = [], efile = {};
    for (const rig of ENEMY_RIGS) {
      const M = EMODEL[rig], S = e1[rig], px = Buffer.from(S.b64, 'base64'), off = FORGE.sheet(M, { pieces: [], anims: M.sheetAnims }), [fw, fh] = off.frame;
      off.layout.forEach(([an, f], c) => M.dirs.forEach(([dn], r) => {
        const rr = S.dirs.indexOf(dn), cc = S.at[an] + f; ef++;
        for (let y = 0; y < fh; y++) {
          const A = px.subarray(((rr * fh + y) * S.w + cc * fw) * 4, ((rr * fh + y) * S.w + cc * fw + fw) * 4);
          const B = Buffer.from(off.rgba.buffer, ((r * fh + y) * off.w + c * fw) * 4, fw * 4);
          if (Buffer.compare(A, B)) { eb++; if (ebAt.length < 5) ebAt.push(`${rig} ${dn} ${an}${f}`); break; }
        }
      }));
      efile[rig] = fs.existsSync(path.join(ROOT, 'js', 'forge-bank', rig + '.js')) ? fs.statSync(path.join(ROOT, 'js', 'forge-bank', rig + '.js')).size / 1024 : Infinity;
    }
    const eSock = ENEMY_RIGS.every(r => ['head', 'chest'].every(k => e1[r].sockets.includes(k))), eSlow = ENEMY_RIGS.filter(r => et[r].ms > 120), eBig = ENEMY_RIGS.filter(r => efile[r] > 160);
    for (const r of ENEMY_RIGS) console.log(`      ${r.padEnd(14)} ${e1[r].fw}x${e1[r].fh} | file ${efile[r].toFixed(1)} KB | compose at x4: ${et[r].frames} frames in ${et[r].ms.toFixed(1)} ms busy (${et[r].slices.map(v => v.toFixed(0)).join(' + ')}) | sockets ${e1[r].sockets.join(' ')}`);
    check('enemies', !eb && eSock && !eSlow.length && !eBig.length, `${ENEMY_RIGS.length} rigs: ${ef - eb}/${ef} frames identical (every sheet anim x 8 dirs)${eb ? ' | first: ' + ebAt.join(', ') : ''} | head + chest sockets ${eSock ? 'all' : 'MISSING'}` +
      ` | compose x4 max ${Math.max(...ENEMY_RIGS.map(r => et[r].ms)).toFixed(1)} ms (<= 120)${eSlow.length ? ' slow: ' + eSlow.join(' ') : ''} | files <= 160 KB${eBig.length ? ' over: ' + eBig.join(' ') : ''}`);
    // ---- page 2: a fresh load builds every sheet again
    const p2 = await fresh(br), s2 = await sheetsOf(p2.page, false), e2 = await enemySheetsOf(p2.page, false);
    for (const r of ENEMY_RIGS) { s1['enemy:' + r] = e1[r]; s2['enemy:' + r] = e2[r]; }
    const diff = Object.keys(s1).filter(lo => s1[lo].sha !== s2[lo].sha);
    check('sha256', !diff.length, `${Object.keys(s1).length} sheets, two fresh builds: ${diff.length ? 'differ: ' + diff.join(', ') : 'identical'} (${full} ${s1[full].sha.slice(0, 16)})`);
    const allErr = errs.concat(p2.errs);
    check('errors', !allErr.length, allErr.length ? allErr.slice(0, 3).join(' | ') : 'no page errors');
  } finally { await br.close(); srv.close(); }
  const fail = results.filter(r => !r.ok).length;
  console.log(fail ? `forge-rt-check: ${fail} FAIL` : 'forge-rt-check: all PASS');
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; srv.close(); });
