'use strict';
// Builds a forge model into a sprite sheet + a review board.
//   node tools/forge/build.js wanderer          -> tools/forge/out/wanderer.png        (1x sheet: rows = dirs, cols = frames)
//                                                 tools/forge/out/wanderer.board.png  (4x on dark / grass / stone + 1x strip)
//                                                 tools/forge/out/wanderer.json       (layout, sockets per frame, sha256)
// Prints the render time, the sheet's sha256 (run it twice: identical) and a lint line (colours, orphan pixels).
// No dependencies: includes a tiny PNG encoder (zlib).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const FORGE = require('./forge.js');

const name = process.argv[2] || 'wanderer';
const model = require(`./models/${name}.js`);
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

// ------------------------------------------------------------------ build
const t0 = process.hrtime.bigint();
const sh = FORGE.sheet(model);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
const sheetPng = png(sh.w, sh.h, sh.rgba);
const sha = crypto.createHash('sha256').update(sheetPng).digest('hex');

// lint: distinct colours, lone pixels (no 4-neighbour of the same colour, outline excluded)
const cols = new Set(); let orphans = 0;
const key = i => (sh.rgba[i] << 16) | (sh.rgba[i + 1] << 8) | sh.rgba[i + 2];
const outKey = parseInt(model.outline.slice(1), 16);
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

// review board: 4x on three grounds, then the 1x sheet on grass (the in-game size)
const SC = 4, GAP = 4, BGS = [[21, 18, 30], [63, 139, 99], [109, 106, 146]];
const bw = sh.w * SC, bh = (sh.h * SC + GAP) * BGS.length + sh.h * 2 + GAP;
const board = new Uint8ClampedArray(bw * bh * 4);
const fill = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * bw + x) * 4; board[i] = c[0]; board[i + 1] = c[1]; board[i + 2] = c[2]; board[i + 3] = 255; } };
const blit = (x0, y0, s, bg) => {
  for (let y = 0; y < sh.h * s; y++) for (let x = 0; x < sh.w * s; x++) {
    const si = (((y / s) | 0) * sh.w + ((x / s) | 0)) * 4, di = ((y0 + y) * bw + x0 + x) * 4;
    const a = sh.rgba[si + 3] / 255;
    for (let k = 0; k < 3; k++) board[di + k] = sh.rgba[si + k] * a + bg[k] * (1 - a);
    board[di + 3] = 255;
  }
};
fill(0, 0, bw, bh, [12, 10, 18]);
BGS.forEach((bg, r) => { const y = r * (sh.h * SC + GAP); fill(0, y, bw, sh.h * SC, bg); blit(0, y, SC, bg); });
const y1 = BGS.length * (sh.h * SC + GAP); fill(0, y1, bw, sh.h * 2 + GAP, BGS[1]); blit(0, y1, 1, BGS[1]);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, `${name}.png`), sheetPng);
fs.writeFileSync(path.join(OUT, `${name}.board.png`), png(bw, bh, board));
fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify({ name, frame: sh.frame, dirs: model.dirs.map(d => d[0]), layout: sh.layout, sockets: sh.sockets, sha256: sha }, null, 1));
console.log(`${name}: ${sh.rows} dirs x ${sh.cols} frames (${sh.frame.join('x')}) in ${ms.toFixed(0)} ms | ${cols.size} colours, ${orphans} lone pixels | sha256 ${sha.slice(0, 16)}`);
