'use strict';
// tools/export/png8.js -- lean, deterministic PNG writer for the handoff package (no dependencies, no colour-profile / gamma
// chunks, so Aseprite, Godot and a browser read the same colours). A sheet with <= 256 distinct RGBA colours is written as an
// INDEXED PNG (PLTE + tRNS, index 0 = fully transparent, the rest in first-seen scan order); otherwise RGBA8. Fully transparent
// pixels are normalised to (0, 0, 0, 0) first. Also: Img (an RGBA buffer with blit) and readPng (decode, via the forge's png.js).
const zlib = require('zlib'), fs = require('fs'), path = require('path');
const { unpng } = require('../forge/png.js');

const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function encode(w, h, rgba) {
  const d = Buffer.from(rgba.buffer, rgba.byteOffset, w * h * 4);
  const pal = new Map([[0, 0]]), idx = new Uint8Array(w * h); let indexed = true;
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3], key = a === 0 ? 0 : ((d[i * 4] << 24) | (d[i * 4 + 1] << 16) | (d[i * 4 + 2] << 8) | a) >>> 0 || 1;
    let k = pal.get(key);
    if (k === undefined) { if (pal.size >= 256) { indexed = false; break; } k = pal.size; pal.set(key, k); }
    idx[i] = k;
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8;
  if (indexed) {
    ihdr[9] = 3;
    const keys = [...pal.keys()], plte = Buffer.alloc(keys.length * 3), trns = Buffer.alloc(keys.length);
    keys.forEach((key, k) => { plte[k * 3] = key >>> 24; plte[k * 3 + 1] = (key >>> 16) & 255; plte[k * 3 + 2] = (key >>> 8) & 255; trns[k] = key & 255; });
    if (keys[0] === 0) trns[0] = 0;
    let last = trns.length; while (last > 0 && trns[last - 1] === 255) last--;   // trailing opaque entries may be left out
    const raw = Buffer.alloc((w + 1) * h);
    for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; Buffer.from(idx.buffer, y * w, w).copy(raw, y * (w + 1) + 1); }
    return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('PLTE', plte), ...(last ? [chunk('tRNS', trns.subarray(0, last))] : []), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  }
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) { const s = (y * w + x) * 4, o = y * (w * 4 + 1) + 1 + x * 4; if (d[s + 3]) { raw[o] = d[s]; raw[o + 1] = d[s + 1]; raw[o + 2] = d[s + 2]; raw[o + 3] = d[s + 3]; } }
  }
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// decode any PNG the tools write (RGBA8 / RGB8 via png.js; indexed 8-bit with PLTE / tRNS here)
function readPng(buf) {
  if (typeof buf === 'string') buf = fs.readFileSync(buf);
  let p = 8, w = 0, h = 0, ct = 0, bd = 8, plte = null, trns = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    else if (type === 'PLTE') plte = data; else if (type === 'tRNS') trns = data; else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  if (ct !== 3) { const r = unpng(buf); return { w: r.w, h: r.h, rgba: r.rgba }; }
  if (bd !== 8) throw new Error('readPng: indexed bit depth ' + bd + ' unsupported');
  const raw = zlib.inflateSync(Buffer.concat(idat)), out = new Uint8ClampedArray(w * h * 4), line = new Uint8Array(w), prev = new Uint8Array(w);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (w + 1)], s = raw.subarray(y * (w + 1) + 1, (y + 1) * (w + 1));
    for (let x = 0; x < w; x++) {
      const a = x ? line[x - 1] : 0, b = prev[x], c = x ? prev[x - 1] : 0; let v = s[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[x] = v & 255;
    }
    for (let x = 0; x < w; x++) { const k = line[x], o = (y * w + x) * 4; out[o] = plte[k * 3]; out[o + 1] = plte[k * 3 + 1]; out[o + 2] = plte[k * 3 + 2]; out[o + 3] = trns && k < trns.length ? trns[k] : 255; }
    prev.set(line);
  }
  return { w, h, rgba: out };
}
class Img {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c, a = 255) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 4; this.d[i] = Math.round(c[0]); this.d[i + 1] = Math.round(c[1]); this.d[i + 2] = Math.round(c[2]); this.d[i + 3] = a; }
  get(x, y) { const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; }
  // copy src (an Img or { w, h, d|rgba }) to (x0, y0); over = alpha-composite instead of replace
  blit(src, x0, y0, over = false, sx = 0, sy = 0, sw = src.w, sh = src.h) {
    const s = src.d || src.rgba;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const X = x0 + x, Y = y0 + y; if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
      const si = ((sy + y) * src.w + sx + x) * 4, di = (Y * this.w + X) * 4, a = s[si + 3];
      if (!over) { for (let k = 0; k < 4; k++) this.d[di + k] = s[si + k]; continue; }
      if (!a) continue;
      const ea = this.d[di + 3] / 255, na = a / 255, oa = na + ea * (1 - na);
      for (let k = 0; k < 3; k++) this.d[di + k] = Math.round((s[si + k] * na + this.d[di + k] * ea * (1 - na)) / oa);
      this.d[di + 3] = Math.round(oa * 255);
    }
    return this;
  }
  png() { return encode(this.w, this.h, this.d); }
  save(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, this.png()); return file; }
  static from(p) { const r = typeof p === 'string' || Buffer.isBuffer(p) ? readPng(p) : p, im = new Img(r.w, r.h); im.d.set(r.rgba || r.d); return im; }
}
module.exports = { encode, readPng, Img };
