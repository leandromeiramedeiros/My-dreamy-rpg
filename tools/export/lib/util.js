'use strict';
// ---------------------------------------------------------------------------
// Core constants, math, noise, and pixel-buffer helpers.
// ---------------------------------------------------------------------------
const RW = 480, RH = 270;      // internal (pixel-art) resolution
const DW = 960, DH = 540;      // display / HUD resolution
const ZS = 6;                  // screen pixels per height unit

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let _rng = mulberry32(20261019);
function seedRng(s) { _rng = mulberry32(s); }
const rand = (a = 0, b = 1) => a + (b - a) * _rng();
const randi = (a, b) => Math.floor(a + (b - a + 1) * _rng());
const pick = arr => arr[Math.floor(_rng() * arr.length)];
// visual-only randomness (does not disturb seeded world generation)
const frand = (a = 0, b = 1) => a + (b - a) * Math.random();

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return { c, x };
}

const _rgbCache = {};
function hexToRgb(h) {
  if (_rgbCache[h]) return _rgbCache[h];
  const s = h.replace('#', '');
  return (_rgbCache[h] = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]);
}
const rgba = (hex, a = 1) => { const c = hexToRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mulRgb = (a, f) => [a[0] * f, a[1] * f, a[2] * f];
const ramp = arr => arr.map(hexToRgb);

// --- hash / value noise -----------------------------------------------------
function hash2(x, y, s = 0) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 982451653;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s = 0, period = 0) {
  let xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  let x1 = xi + 1, y1 = yi + 1;
  if (period) { xi = ((xi % period) + period) % period; yi = ((yi % period) + period) % period; x1 = (xi + 1) % period; y1 = (yi + 1) % period; }
  const a = hash2(xi, yi, s), b = hash2(x1, yi, s), c = hash2(xi, y1, s), d = hash2(x1, y1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 3, s = 0, period = 0) {
  let f = 0, amp = 0.5, fr = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    f += amp * vnoise(x * fr, y * fr, s + i * 17, period ? period * fr : 0);
    n += amp; amp *= 0.5; fr *= 2;
  }
  return f / n;
}

// --- ordered dithering ---------------------------------------------------------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
function rampDither(r, v, x, y) {
  const f = clamp(v, 0, 0.9999) * (r.length - 1);
  const i = Math.floor(f);
  return r[(f - i) > bayer(x, y) ? Math.min(i + 1, r.length - 1) : i];
}

// --- pixel buffer -----------------------------------------------------------
class PixBuf {
  constructor(w, h) { this.w = w; this.h = h; this.img = new ImageData(w, h); this.d = this.img.data; }
  set(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = a;
  }
  a(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y * this.w + x) * 4 + 3]; }
  get(x, y) { const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2]]; }
  // selective outline: transparent pixels next to opaque ones get a darkened neighbour colour
  outline(dark = 0.35, only = null) {
    const w = this.w, h = this.h, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (this.a(x, y)) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of n) {
        if (this.a(x + dx, y + dy) > 0) { add.push([x, y, only || mulRgb(this.get(x + dx, y + dy), dark)]); break; }
      }
    }
    for (const [x, y, c] of add) this.set(x, y, c);
    return this;
  }
  toCanvas() { const { c, x } = makeCanvas(this.w, this.h); x.putImageData(this.img, 0, 0); return c; }
}

function asciiSprite(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const pb = new PixBuf(w, h);
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (ch === '.' || ch === ' ') continue;
      const c = pal[ch];
      if (c) pb.set(x, y, hexToRgb(c));
    }
  });
  return pb.toCanvas();
}

// remove anti-aliasing from vector-drawn sprites
function crisp(canvas, thr = 110) {
  const x = canvas.getContext('2d');
  const im = x.getImageData(0, 0, canvas.width, canvas.height), d = im.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > thr ? 255 : 0;
  x.putImageData(im, 0, 0);
  return canvas;
}
function silhouette(canvas, hex = '#ffffff') {
  const { c, x } = makeCanvas(canvas.width, canvas.height);
  x.drawImage(canvas, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = hex; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function flipH(canvas) {
  const { c, x } = makeCanvas(canvas.width, canvas.height);
  x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(canvas, 0, 0);
  return c;
}

// --- isometric projection (world tiles -> world-screen pixels) -----------
// +x runs down-right, +y runs down-left; screen-up is North, screen-right is East.
const isoX = (x, y) => (x - y) * 16;
const isoY = (x, y, z = 0) => (x + y) * 8 - z * ZS;
const toWorld = (sx, sy) => [(sx / 16 + sy / 8) / 2, (sy / 8 - sx / 16) / 2];
