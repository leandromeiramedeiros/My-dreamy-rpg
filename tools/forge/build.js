'use strict';
// Builds a forge model into sprite sheets + review boards; with a gear file it also bakes the layer bank.
//   node tools/forge/build.js wanderer          -> out/wanderer.png (1x sheet: rows = dirs, cols = frames), .board.png, .json
//   node tools/forge/build.js chibi [loadout..] -> models/chibi-gear.js loadouts: out/chibi.<loadout>.png / .board.png / .json,
//                                                 out/chibi-bank/<unit>.<core|atk.class>.png (G-buffer sheets, <= 64 KB
//                                                 each) + out/chibi-bank.js (the dressing room's bank), and for a game rig
//                                                 js/forge-bank/<line>.js (FORGE_BANK.<line>: chibi = body + hair, then one
//                                                 file per gear line) + the engine block of js/forge-rt.js
//                                                 (gear = models/<name>-gear.js + any models/<name>-<line>.js, e.g. hero)
// Prints the render time, each sheet's sha256 (run it twice: identical) and a lint line (colours, lone pixels). With a
// bank it decodes the baked PNGs, stacks every built loadout at runtime (FORGE.compose) and checks each frame equals
// the offline render byte for byte. No dependencies: png.js (a tiny PNG encoder / decoder on zlib).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FORGE = require('./forge.js');

const name = process.argv[2] || 'wanderer';
const model = require(`./models/${name}.js`);
const OUT = path.join(__dirname, 'out'), ROOT = path.join(__dirname, '..', '..');
const GAME_RIGS = ['chibi'];                                     // rigs whose banks ship in js/forge-bank

const { png, pngSmall, unpng } = require('./png.js');

// gear: models/<rig>-gear.js plus every other models/<rig>-<line>.js gear file ({ pieces, loadouts? }), merged
function gearOf(rig) {
  const dir = path.join(__dirname, 'models'), out = { pieces: {}, loadouts: {} }; let any = false;
  for (const f of fs.readdirSync(dir).filter(f => f.startsWith(rig + '-') && f.endsWith('.js')).sort()) {
    const g = require(path.join(dir, f)); if (!g || !g.pieces) continue;
    any = true; Object.assign(out.pieces, g.pieces); Object.assign(out.loadouts, g.loadouts || {});
  }
  return any ? out : null;
}
const gear = gearOf(name);

// js/forge-rt.js runs the <rt> blocks of forge.js (resolve + compose): copied in on every build, between its engine markers
function rtBlocks() {
  return [...fs.readFileSync(path.join(__dirname, 'forge.js'), 'utf8').matchAll(/^ {2}\/\/ <rt>[^\n]*\n([\s\S]*?)^ {2}\/\/ <\/rt>\n/gm)].map(m => m[1]).join('');
}
function syncRuntime() {
  const file = path.join(ROOT, 'js', 'forge-rt.js'); if (!fs.existsSync(file)) return;
  const cur = fs.readFileSync(file, 'utf8'), a = cur.indexOf('  // <engine>'), b = cur.indexOf('  // </engine>');
  if (a < 0 || b < a) throw new Error('js/forge-rt.js: no engine markers');
  const eol = cur.indexOf('\n', a) + 1, next = cur.slice(0, eol) + rtBlocks() + cur.slice(b);
  if (next !== cur) { fs.writeFileSync(file, next); console.log('js/forge-rt.js: engine synced from forge.js'); }
}

// ------------------------------------------------------------------ one sheet + its review board
function lint(sh) {                                              // distinct colours, lone pixels (outline excluded)
  const cols = new Set(); let orphans = 0;
  const key = i => (sh.rgba[i] << 16) | (sh.rgba[i + 1] << 8) | sh.rgba[i + 2];
  const outKey = model.outline ? parseInt(model.outline.slice(1), 16) : -1;
  for (let y = 0; y < sh.h; y++) for (let x = 0; x < sh.w; x++) {
    const i = (y * sh.w + x) * 4; if (sh.rgba[i + 3] < 255) continue;
    const k = key(i); cols.add(k); if (k === outKey) continue;
    let same = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= sh.w || yy >= sh.h) continue;
      const j = (yy * sh.w + xx) * 4; if (sh.rgba[j + 3] === 255 && key(j) === k) { same = true; break; }
    }
    if (!same) orphans++;
  }
  return { colours: cols.size, orphans };
}
function board(sh) {                                             // the sheet on dark / grass / stone, then 1x on grass
  const SC = sh.w > 600 ? 2 : 4, GAP = 4, BGS = [[21, 18, 30], [63, 139, 99], [109, 106, 146]];
  const bw = sh.w * SC, bh = (sh.h * SC + GAP) * BGS.length + sh.h + GAP;
  const out = new Uint8ClampedArray(bw * bh * 4);
  const fill = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * bw + x) * 4; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255; } };
  const blit = (x0, y0, s, bg) => {
    for (let y = 0; y < sh.h * s; y++) for (let x = 0; x < sh.w * s; x++) {
      const si = (((y / s) | 0) * sh.w + ((x / s) | 0)) * 4, di = ((y0 + y) * bw + x0 + x) * 4, a = sh.rgba[si + 3] / 255;
      for (let k = 0; k < 3; k++) out[di + k] = sh.rgba[si + k] * a + bg[k] * (1 - a);
      out[di + 3] = 255;
    }
  };
  fill(0, 0, bw, bh, [12, 10, 18]);
  BGS.forEach((bg, r) => { const y = r * (sh.h * SC + GAP); fill(0, y, bw, sh.h * SC, bg); blit(0, y, SC, bg); });
  const y1 = BGS.length * (sh.h * SC + GAP); fill(0, y1, bw, sh.h + GAP, BGS[1]); blit(0, y1, 1, BGS[1]);
  return png(bw, bh, out);
}
function tones(pieces) {                                         // the most tones any material can show (ramp + glint)
  const ramps = [];
  const add = mats => { for (const k in mats || {}) { const m = mats[k], r = typeof m === 'string' ? FORGE.ramp(m) : Array.isArray(m) ? m : typeof m.ramp === 'string' ? FORGE.ramp(m.ramp) : m.ramp; ramps.push(new Set(m.flat != null ? [r[m.flat]] : r).size); } };
  for (const L of model.layers || [model]) add(L.mats);
  for (const p of pieces || []) for (const L of (p.piece || p).layers) add(L.mats);
  return Math.max(...ramps);
}
function buildSheet(tag, pieces) {
  const t0 = process.hrtime.bigint(), sh = FORGE.sheet(model, { pieces }), ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const sheetPng = png(sh.w, sh.h, sh.rgba), sha = crypto.createHash('sha256').update(sheetPng).digest('hex'), L = lint(sh);
  fs.writeFileSync(path.join(OUT, `${tag}.png`), sheetPng);
  fs.writeFileSync(path.join(OUT, `${tag}.board.png`), board(sh));
  fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify({ name: tag, frame: sh.frame, dirs: model.dirs.map(d => d[0]), layout: sh.layout, pieces: (pieces || []).map(p => p.piece ? Object.assign({ id: p.piece.id }, p.tier != null ? { tier: p.tier } : {}, p.pal ? { pal: p.pal } : {}) : p.id), sockets: sh.sockets, sha256: sha }) + '\n');
  console.log(`${tag}: ${sh.rows} dirs x ${sh.cols} frames (${sh.frame.join('x')}) in ${ms.toFixed(0)} ms | ${L.colours} colours, ${L.orphans} lone pixels, <= ${tones(pieces)} tones per material | sha256 ${sha.slice(0, 16)}`);
  return sh;
}

fs.mkdirSync(OUT, { recursive: true });
syncRuntime();
if (!gear) {
  buildSheet(name, []);
} else {
  const want = process.argv.slice(3), los = Object.keys(gear.loadouts).filter(k => !want.length || want.includes(k)), built = {};
  // a loadout entry is a piece id or { id, tier, pal } (a palette swap of the same baked layers)
  const toPieces = lo => gear.loadouts[lo].map(e => typeof e === 'string' ? gear.pieces[e] : { piece: gear.pieces[e.id], tier: e.tier, pal: e.pal });
  for (const lo of los) built[lo] = buildSheet(`${name}.${lo}`, toPieces(lo));
  // bank: every unit (the rig's base groups: body, hair; every piece) split by anim (FORGE.bankSplit: <unit>.core +
  // <unit>.atk.<class>), each an encoded G-buffer sheet; empty sheets (a sword's staff attack) are left out
  const t0 = process.hrtime.bigint(), dir = path.join(OUT, `${name}-bank`), info = FORGE.bankInfo(model), split = FORGE.bankSplit(model);
  const js = { model: info, loadouts: gear.loadouts, sheets: {} }, bank = { model: info, sheets: {} }, lines = {}, lineOf = {}, sizes = [];
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const units = [...info.base.map(id => ({ id, line: name, opt: { group: id } })),
    ...Object.keys(gear.pieces).map(id => ({ id, line: gear.pieces[id].family || id.split('.')[0], opt: { piece: gear.pieces[id] } }))];
  for (const u of units) {
    if (u.line !== name) lineOf[u.id] = u.line;
    for (const [suf, anims] of split) {
      const b = FORGE.bake(model, Object.assign({ anims }, u.opt)); if (b.empty) continue;
      const key = `${u.id}.${suf}`, buf = pngSmall(b.w, b.h, b.rgba);
      fs.writeFileSync(path.join(dir, `${key}.png`), buf); sizes.push({ key, line: u.line, bytes: buf.length });
      js.sheets[key] = { src: 'data:image/png;base64,' + buf.toString('base64'), meta: b.meta };
      (lines[u.line] = lines[u.line] || {})[key] = { png: buf.toString('base64'), meta: b.meta };
      const back = unpng(buf); bank.sheets[key] = { w: back.w, rgba: back.rgba, meta: b.meta };
    }
  }
  fs.writeFileSync(path.join(OUT, `${name}-bank.js`), `'use strict';\n// Generated by tools/forge/build.js ${name}: baked G-buffer sheets for FORGE.compose (see forge.js).\nconst FORGE_BANK = ${JSON.stringify(js)};\nif (typeof module !== 'undefined') module.exports = FORGE_BANK;\n`);
  const bakeMs = Number(process.hrtime.bigint() - t0) / 1e6, big = sizes.filter(s => s.bytes > 64 * 1024);
  const top = sizes.reduce((p, s) => s.bytes > p.bytes ? s : p);
  console.log(`bank: ${units.length} units -> ${sizes.length} sheets baked in ${bakeMs.toFixed(0)} ms, ${(sizes.reduce((p, s) => p + s.bytes, 0) / 1024).toFixed(0)} KB of PNG | largest ${top.key} ${(top.bytes / 1024).toFixed(1)} KB | over 64 KB: ${big.length ? big.map(s => s.key).join(', ') : 'none'}`);
  if (big.length) process.exitCode = 1;
  fs.writeFileSync(path.join(dir, 'sizes.json'), JSON.stringify(sizes, null, 1) + '\n');
  // the game's banks: js/forge-bank/<line>.js, classic scripts (FORGE_BANK.<line>) that forge-rt.js inserts on demand;
  // the rig's own line (body, hair) carries the rig info and which line holds each piece
  if (GAME_RIGS.includes(name)) {
    const bdir = path.join(ROOT, 'js', 'forge-bank'); fs.mkdirSync(bdir, { recursive: true });
    for (const f of fs.readdirSync(bdir)) if (f.endsWith('.js')) fs.rmSync(path.join(bdir, f));
    const kb = {};
    for (const line of Object.keys(lines).sort()) {
      const body = Object.assign({ rig: name }, line === name ? { model: info, lines: lineOf, loadouts: gear.loadouts } : {}, { sheets: lines[line] });
      const txt = `'use strict';\n// Generated by tools/forge/build.js ${name} (do not edit): the ${line} line's baked G-buffer sheets for js/forge-rt.js.\n` +
        `var FORGE_BANK = typeof FORGE_BANK !== 'undefined' ? FORGE_BANK : {};\nFORGE_BANK[${JSON.stringify(line)}] = ${JSON.stringify(body)};\n` +
        `if (typeof module !== 'undefined') module.exports = FORGE_BANK;\n`;
      fs.writeFileSync(path.join(bdir, `${line}.js`), txt); kb[line] = txt.length;
    }
    const rtf = path.join(ROOT, 'js', 'forge-rt.js'), rt = fs.existsSync(rtf) ? fs.statSync(rtf).size : 0;
    console.log(`js/forge-bank: ${Object.entries(kb).map(([l, n]) => `${l} ${(n / 1024).toFixed(0)} KB`).join(', ')} | starter bundle (forge-rt.js + ${name}.js): ${((rt + kb[name]) / 1024).toFixed(0)} KB`);
  }
  // runtime stacking == offline render, every frame of every built loadout
  const t1 = process.hrtime.bigint(); let frames = 0, bad = 0;
  for (const lo of los) {
    const sh = built[lo], [fw, fh] = sh.frame;
    model.dirs.forEach(([dn], r) => sh.layout.forEach(([a, f], c) => {
      const out = FORGE.compose(bank, { dir: dn, anim: a, frame: f, pieces: gear.loadouts[lo] });
      for (let y = 0; y < fh; y++) {
        const off = ((r * fh + y) * sh.w + c * fw) * 4;
        if (Buffer.compare(Buffer.from(out.rgba.buffer, y * fw * 4, fw * 4), Buffer.from(sh.rgba.buffer, off, fw * 4))) { bad++; break; }
      }
      frames++;
    }));
  }
  const cms = Number(process.hrtime.bigint() - t1) / 1e6;
  console.log(`runtime stack check: ${frames - bad}/${frames} frames identical (${(cms / frames).toFixed(3)} ms per frame)`);
  if (bad) process.exitCode = 1;
  // a self-contained dressing room (tools/forge/preview.html with forge.js + this bank inlined; no page skeleton, so it
  // can be published as an artifact as is)
  const page = fs.readFileSync(path.join(__dirname, 'preview.html'), 'utf8')
    .replace(/<!doctype html>\s*<html[^>]*><head><meta charset="utf-8"><meta name="viewport"[^>]*>\s*/, '')
    .replace('</head><body>', '').replace(/<\/body><\/html>\s*$/, '')
    .replace('<script src="forge.js"></script>', () => `<script>\n${fs.readFileSync(path.join(__dirname, 'forge.js'), 'utf8')}</script>`)
    .replace(/<script src="out\/[a-z]+-bank\.js"><\/script>/, () => `<script>\n${fs.readFileSync(path.join(OUT, `${name}-bank.js`), 'utf8')}</script>`);
  fs.writeFileSync(path.join(OUT, `${name}-preview.html`), page);
}
