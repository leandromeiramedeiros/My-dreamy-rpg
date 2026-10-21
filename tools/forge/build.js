'use strict';
// Builds a forge model into sprite sheets + review boards; with a gear file it also bakes the layer bank.
//   node tools/forge/build.js wanderer          -> out/wanderer.png (1x sheet: rows = dirs, cols = frames), .board.png, .json
//   node tools/forge/build.js chibi [loadout..] -> models/chibi-gear.js loadouts: out/chibi.<loadout>.png / .board.png / .json,
//                                                 out/chibi-bank/<piece>.png (G-buffer sheets) + out/chibi-bank.js (browser)
//                                                 (any model with a models/<name>-gear.js works the same way, e.g. hero)
// Prints the render time, each sheet's sha256 (run it twice: identical) and a lint line (colours, lone pixels). With a
// bank it decodes the baked PNGs, stacks every built loadout at runtime (FORGE.compose) and checks each frame equals
// the offline render byte for byte. No dependencies: a tiny PNG encoder / decoder (zlib).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const FORGE = require('./forge.js');

const name = process.argv[2] || 'wanderer';
const model = require(`./models/${name}.js`);
const gearFile = path.join(__dirname, 'models', `${name}-gear.js`);
const gear = fs.existsSync(gearFile) ? require(gearFile) : null;
const OUT = path.join(__dirname, 'out');

// ------------------------------------------------------------------ PNG
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, d) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(d.buffer, d.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function unpng(buf) {                                           // decodes this encoder's output (RGBA8, filter 0)
  let o = 8, w = 0, h = 0; const idat = [];
  while (o < buf.length) {
    const n = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), data = buf.subarray(o + 8, o + 8 + n);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } else if (type === 'IDAT') idat.push(data);
    o += 12 + n;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) { if (raw[y * (w * 4 + 1)] !== 0) throw new Error('unsupported PNG filter'); d.set(raw.subarray(y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1)), y * w * 4); }
  return { w, h, rgba: d };
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
function buildSheet(tag, pieces) {
  const t0 = process.hrtime.bigint(), sh = FORGE.sheet(model, { pieces }), ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const sheetPng = png(sh.w, sh.h, sh.rgba), sha = crypto.createHash('sha256').update(sheetPng).digest('hex'), L = lint(sh);
  fs.writeFileSync(path.join(OUT, `${tag}.png`), sheetPng);
  fs.writeFileSync(path.join(OUT, `${tag}.board.png`), board(sh));
  fs.writeFileSync(path.join(OUT, `${tag}.json`), JSON.stringify({ name: tag, frame: sh.frame, dirs: model.dirs.map(d => d[0]), layout: sh.layout, pieces: (pieces || []).map(p => p.piece ? Object.assign({ id: p.piece.id }, p.tier != null ? { tier: p.tier } : {}, p.pal ? { pal: p.pal } : {}) : p.id), sockets: sh.sockets, sha256: sha }) + '\n');
  console.log(`${tag}: ${sh.rows} dirs x ${sh.cols} frames (${sh.frame.join('x')}) in ${ms.toFixed(0)} ms | ${L.colours} colours, ${L.orphans} lone pixels | sha256 ${sha.slice(0, 16)}`);
  return sh;
}

fs.mkdirSync(OUT, { recursive: true });
if (!gear) {
  buildSheet(name, []);
} else {
  const want = process.argv.slice(3), los = Object.keys(gear.loadouts).filter(k => !want.length || want.includes(k)), built = {};
  // a loadout entry is a piece id or { id, tier, pal } (a palette swap of the same baked layers)
  const toPieces = lo => gear.loadouts[lo].map(e => typeof e === 'string' ? gear.pieces[e] : { piece: gear.pieces[e.id], tier: e.tier, pal: e.pal });
  for (const lo of los) built[lo] = buildSheet(`${name}.${lo}`, toPieces(lo));
  // bank: the bare body + every piece as encoded G-buffer sheets
  const t0 = process.hrtime.bigint(), dir = path.join(OUT, `${name}-bank`), js = { model: FORGE.bankInfo(model), loadouts: gear.loadouts, sheets: {} }, bank = { model: js.model, sheets: {} };
  fs.mkdirSync(dir, { recursive: true });
  let bytes = 0;
  for (const id of ['body', ...Object.keys(gear.pieces)]) {
    const b = FORGE.bake(model, id === 'body' ? {} : { piece: gear.pieces[id] }), buf = png(b.w, b.h, b.rgba);
    fs.writeFileSync(path.join(dir, `${id}.png`), buf); bytes += buf.length;
    js.sheets[id] = { src: 'data:image/png;base64,' + buf.toString('base64'), meta: b.meta };
    const back = unpng(buf); bank.sheets[id] = { w: back.w, rgba: back.rgba, meta: b.meta };
  }
  fs.writeFileSync(path.join(OUT, `${name}-bank.js`), `'use strict';\n// Generated by tools/forge/build.js ${name}: baked G-buffer sheets for FORGE.compose (see forge.js).\nconst FORGE_BANK = ${JSON.stringify(js)};\nif (typeof module !== 'undefined') module.exports = FORGE_BANK;\n`);
  const bakeMs = Number(process.hrtime.bigint() - t0) / 1e6;
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
  console.log(`bank: body + ${Object.keys(gear.pieces).length} pieces baked in ${bakeMs.toFixed(0)} ms, ${(bytes / 1024).toFixed(0)} KB of PNG | runtime stack check: ${frames - bad}/${frames} frames identical (${(cms / frames).toFixed(2)} ms per frame)`);
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
