'use strict';
// Tiny dependency-free image codecs for the forge tools: PNG encode (RGBA8, filter 0, deterministic) and decode (RGBA8 /
// RGB8, filters 0-4), and an animated GIF encoder (global palette <= 256 colours, LZW, per-frame delays, loop forever).
const zlib = require('zlib');

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
function unpng(buf) {                                             // 8-bit RGBA or RGB, non-interlaced, any filter
  let o = 8, w = 0, h = 0, ct = 6; const idat = [];
  while (o < buf.length) {
    const n = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), data = buf.subarray(o + 8, o + 8 + n);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8 || (ct !== 6 && ct !== 2) || data[12]) throw new Error('unsupported PNG'); }
    else if (type === 'IDAT') idat.push(data);
    o += 12 + n;
  }
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = (line[i] + p) & 255;
    }
    for (let x = 0; x < w; x++) { const s = x * bpp, t = (y * w + x) * 4; d[t] = cur[s]; d[t + 1] = cur[s + 1]; d[t + 2] = cur[s + 2]; d[t + 3] = bpp === 4 ? cur[s + 3] : 255; }
    cur.copy(prev);
  }
  return { w, h, rgba: d };
}

// ---- GIF: frames = [{ rgba, delay (ms) }], all w x h, opaque; colours beyond 256 throw
function gif(w, h, frames) {
  const pal = new Map(), key = (d, i) => (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
  for (const f of frames) for (let i = 0; i < f.rgba.length; i += 4) { const k = key(f.rgba, i); if (!pal.has(k)) pal.set(k, pal.size); }
  if (pal.size > 256) throw new Error(`gif: ${pal.size} colours`);
  let bits = 1; while ((1 << bits) < Math.max(pal.size, 2)) bits++;
  const size = 1 << bits, ct = Buffer.alloc(size * 3);
  for (const [k, i] of pal) { ct[i * 3] = k >> 16; ct[i * 3 + 1] = (k >> 8) & 255; ct[i * 3 + 2] = k & 255; }
  const out = [Buffer.from('GIF89a', 'ascii')], lsd = Buffer.alloc(7);
  lsd.writeUInt16LE(w, 0); lsd.writeUInt16LE(h, 2); lsd[4] = 0x80 | ((bits - 1) << 4) | (bits - 1); out.push(lsd, ct);
  out.push(Buffer.from([0x21, 0xff, 0x0b]), Buffer.from('NETSCAPE2.0', 'ascii'), Buffer.from([3, 1, 0, 0, 0]));
  for (const f of frames) {
    const gce = Buffer.from([0x21, 0xf9, 4, 0, 0, 0, 0, 0]); gce.writeUInt16LE(Math.round(f.delay / 10), 4);
    const id = Buffer.alloc(10); id[0] = 0x2c; id.writeUInt16LE(w, 5); id.writeUInt16LE(h, 7);
    const idx = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) idx[i] = pal.get(key(f.rgba, i * 4));
    out.push(gce, id, lzw(idx, Math.max(bits, 2)));
  }
  out.push(Buffer.from([0x3b]));
  return Buffer.concat(out);
}
function lzw(idx, minSize) {
  const clear = 1 << minSize, eoi = clear + 1, bytes = []; let size = minSize + 1, next = eoi + 1, acc = 0, nb = 0;
  const emit = c => { acc |= c << nb; nb += size; while (nb >= 8) { bytes.push(acc & 255); acc >>>= 8; nb -= 8; } };
  let dict = new Map(); emit(clear);
  let cur = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = cur * 4096 + idx[i], hit = dict.get(k);
    if (hit !== undefined) { cur = hit; continue; }
    emit(cur);
    if (next < 4096) { dict.set(k, next++); if (next > (1 << size) && size < 12) size++; }
    else { emit(clear); dict = new Map(); size = minSize + 1; next = eoi + 1; }
    cur = idx[i];
  }
  emit(cur); emit(eoi); if (nb > 0) bytes.push(acc & 255);
  const blocks = [Buffer.from([minSize])];
  for (let i = 0; i < bytes.length; i += 255) { const b = bytes.slice(i, i + 255); blocks.push(Buffer.from([b.length]), Buffer.from(b)); }
  blocks.push(Buffer.from([0]));
  return Buffer.concat(blocks);
}

module.exports = { png, unpng, gif, crc32 };
