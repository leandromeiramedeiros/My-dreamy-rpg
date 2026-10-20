'use strict';
// ---------------------------------------------------------------------------
// icons.js - hand-shaded 24x24 pixel-art icons (skills, items, gems, misc).
// Everything is plotted pixel by pixel into a colour grid (no antialiasing),
// auto-outlined with a 1px dark line, then baked to a cached offscreen canvas.
// Only `ICONS` is exposed.  Self-contained: no dependency on other game files.
//   ICONS.skill(id)                      -> framed skill icon (element-coloured bevel frame)
//   ICONS.item(base, tier, rarity, gems) -> slot icon: art + static rarity frame + gem dots
//      trinkets: ICONS.item('dreamsilver_band'|'ring'+tier 1..3|unique id, tier, rarity, gems, {element, implicit, tempered})
//   ICONS.trinketIds / ICONS.uniqueIds    -> base ids (9) / unique ids (11) with art
//   ICONS.gem(type, grade)               -> gem (grade 0..4: chipped..radiant)
//   ICONS.misc(name)                     -> potion dust rune chest xp key choice shrine tablet gold
//   ICONS.glyph(glyph, color)            -> OLD glyph names -> new art (drop-in for icon())
//   ICONS.frame(ctx, x, y, size, rarity, t) -> animated rarity frame + glow, draw over a slot
//   ICONS.elementOf[skillId]             -> 'fire'|'frost'|'nature'|'lightning'|'arcane'|'physical'|'holy'
// Every returned canvas is cached - treat as read-only (drawImage it, never draw on it).
// ---------------------------------------------------------------------------
const ICONS = (() => {
  const N = 24, DK = '#140d1f';
  const cache = {};
  let L = null, LB = null, LT = null;         // current / body / top (un-outlined) layers

  // ---- colour helpers ------------------------------------------------------
  const hx = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const rp = (b) => [mix(b, '#1a1030', 0.62), mix(b, '#1a1030', 0.3), b, mix(b, '#fff6dc', 0.5)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const tn = (rm, t) => rm[clamp(Math.floor(t * rm.length), 0, rm.length - 1)];
  const R = {
    st: ['#2f3552', '#6a7494', '#a9b4d0', '#f2f6ff'], gd: ['#6e3c0c', '#c07c18', '#f4be3c', '#fff2a0'],
    wd: ['#2e1a0e', '#5e3a1e', '#946236', '#c89258'], fr: ['#7a1414', '#d8401a', '#ff9428', '#ffe870'],
    ic: ['#1c3f80', '#3a86d4', '#7adcff', '#f0ffff'], gr: ['#16502c', '#2f9a44', '#74dc68', '#d4ffa8'],
    lt: ['#9a6a08', '#e8b014', '#ffe23c', '#ffffe0'], ar: ['#34207a', '#7448c8', '#b48cff', '#f2e4ff'],
    rd: ['#5a0e28', '#b01e44', '#f04a64', '#ffa8b4'], bl: ['#14307a', '#2c68d0', '#62b0ff', '#d6f0ff'],
    mn: ['#4a5090', '#8c98d8', '#d0dcff', '#ffffff'], sk: ['#a8603c', '#d89060', '#f0b88a', '#ffe0c0'],
    sn: ['#2a2a3a', '#4a4a5e', '#74748c', '#a8a8c0'], wh: ['#8c98b8', '#c0cae0', '#e8eefc', '#ffffff'],
    dk: ['#0c0a18', '#1c1630', '#2c2448', '#443a6a'], pk: ['#8a2a5a', '#d84a8a', '#ff8cb8', '#ffe0ee'],
    lf: ['#1a4a2a', '#2e8a3e', '#5cc860', '#b0f088'], br: ['#3a2010', '#6a4024', '#a06a3a', '#d09a60'],
  };
  const RC = { common: '#d8d8d8', uncommon: '#6ee36e', rare: '#5aa8ff', epic: '#c070ff', legendary: '#ffb030', mythic: '#ff4f7a' };
  const EC = { fire: '#ff8a3a', frost: '#5fd4ff', nature: '#5fd65f', lightning: '#ffe14a', arcane: '#b07cff', physical: '#aab4cc', holy: '#ffd75a' };

  // ---- pixel plotting primitives (coordinates = pixel centres) ---------------
  const mk = () => new Array(N * N).fill(null);
  const P = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && y >= 0 && x < N && y < N) L[y * N + x] = c; };
  const top = (f) => { const s = L; L = LT; f(); L = s; };
  const cut = (cx, cy, r) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) L[y * N + x] = null; };
  function line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) { P(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  function ell(cx, cy, rx, ry, rm, nohi) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x - cx) / (rx + 0.4), dy = (y - cy) / (ry + 0.4), d = dx * dx + dy * dy;
      if (d > 1) continue;
      let t = 0.58 - (dx + dy) * 0.36 - d * 0.14;
      if (!nohi && (dx + 0.45) ** 2 + (dy + 0.45) ** 2 < 0.06) t = 1;
      P(x, y, tn(rm, t));
    }
  }
  const disc = (cx, cy, r, rm, nohi) => ell(cx, cy, r, r, rm, nohi);
  // tapered, light-shaded bar from (x0,y0) to (x1,y1)
  function bar(x0, y0, x1, y1, w0, w1, rm) {
    if (w1 == null) w1 = w0;
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    let nx = -uy, ny = ux; if (-0.7 * nx - 0.7 * ny < 0) { nx = -nx; ny = -ny; }
    const pad = Math.max(w0, w1) / 2 + 1;
    for (let y = Math.floor(Math.min(y0, y1) - pad); y <= Math.ceil(Math.max(y0, y1) + pad); y++) for (let x = Math.floor(Math.min(x0, x1) - pad); x <= Math.ceil(Math.max(x0, x1) + pad); x++) {
      const rx = x - x0, ry = y - y0, s = rx * ux + ry * uy;
      if (s < -0.5 || s > len + 0.5) continue;
      const h = (w0 + (w1 - w0) * clamp(s / len, 0, 1)) / 2 - 0.01, d = rx * nx + ry * ny;
      if (Math.abs(d) > h) continue;
      P(x, y, tn(rm, 0.5 + 0.5 * d / Math.max(h, 0.8)));
    }
  }
  // arc/ring: centre, radius, thickness, degrees (0=right, -90=up), optional crescent taper
  function arc(cx, cy, r, w, a0, a1, rm, taper) {
    const span = a1 - a0;
    for (let y = Math.floor(cy - r - w); y <= Math.ceil(cy + r + w); y++) for (let x = Math.floor(cx - r - w); x <= Math.ceil(cx + r + w); x++) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 0.01;
      let a = Math.atan2(dy, dx) * 180 / Math.PI - a0; a = ((a % 360) + 360) % 360;
      if (a > span) continue;
      const u = a / span, hw = w / 2 * (taper ? 0.2 + 0.8 * Math.pow(Math.sin(Math.PI * u), 0.6) : 1) - 0.01;
      const s = (d - r); if (Math.abs(s) > hw) continue;
      const nl = -(dx + dy) * 0.7 / d;
      P(x, y, tn(rm, 0.5 + 0.5 * clamp(s / Math.max(hw, 0.8) * Math.sign(nl || 1) * Math.min(1, Math.abs(nl) * 1.7 + 0.3), -1, 1)));
    }
  }
  // scanline polygon, shaded by a top-left light gradient; mir mirrors a half outline (first/last point on x=11.5)
  function poly(pts, rm, mir, flat) {
    if (mir) pts = pts.concat(pts.slice().reverse().map((p) => [23 - p[0], p[1]]));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const bw = x1 - x0 || 1, bh = y1 - y0 || 1, n = pts.length;
    for (let y = Math.ceil(y0); y <= Math.floor(y1 + 0.5); y++) {
      const xs = [], sy = y - 0.01;
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; if ((a[1] <= sy) !== (b[1] <= sy)) xs.push(a[0] + (sy - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.01); x <= Math.floor(xs[k + 1] + 0.01); x++)
        P(x, y, flat != null ? (typeof rm === 'string' ? rm : tn(rm, flat)) : tn(rm, 0.97 - ((x - x0) / bw + (y - y0) / bh) * 0.5 * 0.94));
    }
  }
  const shard = (x0, y0, x1, y1, w, rm) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2, mx = x0 + dx * 0.35, my = y0 + dy * 0.35;
    poly([[x0, y0], [mx + nx, my + ny], [x1, y1], [mx - nx, my - ny]], rm); };
  const starPts = (cx, cy, ro, ri, n, rot) => { const o = []; for (let i = 0; i < n * 2; i++) { const a = (rot == null ? -Math.PI / 2 : rot) + i * Math.PI / n, r = i % 2 ? ri : ro; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
  const spk = (x, y, r, c1, c2) => top(() => { P(x, y, c1); for (let k = 1; k <= r; k++) { P(x + k, y, c2); P(x - k, y, c2); P(x, y + k, c2); P(x, y - k, c2); } });
  const dots = (arr, c) => { for (const p of arr) P(p[0], p[1], c); };
  function swd(x0, y0, x1, y1, w, rmB, rmG) {                 // small shaded sword used by several skills
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, gx = x0 + dx * 0.3, gy = y0 + dy * 0.3, gl = w * 0.7 + 1.5;
    bar(gx, gy, x1, y1, w, 1, rmB || R.st); bar(x0, y0, gx, gy, 2, 2, R.wd);
    bar(gx - nx * gl, gy - ny * gl, gx + nx * gl, gy + ny * gl, 2, 2, rmG || R.gd); disc(x0, y0, 1.1, rmG || R.gd, true);
  }
  const arrowHead = (x, y, ang, s, rm) => { const c = Math.cos(ang), n = Math.sin(ang); poly([[x + c * s, y + n * s], [x - c * s * 0.6 - n * s * 0.9, y - n * s * 0.6 + c * s * 0.9], [x - c * s * 0.6 + n * s * 0.9, y - n * s * 0.6 - c * s * 0.9]], rm); };
  function bolt(a, b, amp, segs, rmB, core) {                 // jagged lightning between two points
    const pts = [a]; for (let i = 1; i < segs; i++) { const t = i / segs, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; const o = (i % 2 ? 1 : -1) * amp; pts.push([a[0] + dx * t - dy / l * o, a[1] + dy * t + dx / l * o]); } pts.push(b);
    for (let i = 0; i < pts.length - 1; i++) bar(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2, 2, rmB);
    top(() => { for (let i = 0; i < pts.length - 1; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], core); });
  }

  // ---- compositing -----------------------------------------------------------
  function paint(fn, bg, noOutline) {
    LB = mk(); LT = mk(); L = LB; fn(); L = null;
    const o = bg ? bg.slice() : mk();
    if (!noOutline) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x; if (LB[i]) continue;
      if ((x > 0 && LB[i - 1]) || (x < N - 1 && LB[i + 1]) || (y > 0 && LB[i - N]) || (y < N - 1 && LB[i + N])) o[i] = DK;
    }
    for (let i = 0; i < N * N; i++) { if (LB[i]) o[i] = LB[i]; if (LT[i]) o[i] = LT[i]; }
    return o;
  }
  const rgbc = {};
  function bake(arr) {
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'), im = x.createImageData(N, N);
    for (let i = 0; i < N * N; i++) { const s = arr[i]; if (!s) continue; const v = rgbc[s] || (rgbc[s] = hx(s)); im.data[i * 4] = v[0]; im.data[i * 4 + 1] = v[1]; im.data[i * 4 + 2] = v[2]; im.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); return c;
  }
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const corner = (x, y) => (x === 0 || x === N - 1) && (y === 0 || y === N - 1);
  // element-coloured bevelled frame (skills): ring 0 dark, ring 1 bevel; ring 2 inner shadow is in the bg
  function skBg(ec) {
    const o = mk(), r = [mix(ec, '#0c0716', 0.9), mix(ec, '#0c0716', 0.8), mix(ec, '#0c0716', 0.66), mix(ec, '#0c0716', 0.5)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - 11.5, y - 11.5 + 1) / 15, v = (1 - d) * 3.2 + 0.4, b = (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      let c = r[clamp(Math.floor(v + b - 0.5), 0, 3)];
      if (x === 2 || y === 2) c = mix(c, '#05020a', 0.45); else if (x === N - 3 || y === N - 3) c = mix(c, ec, 0.12);
      o[y * N + x] = c;
    }
    return o;
  }
  function skFrame(o, ec) {
    const hi = mix(ec, '#ffffff', 0.6), lo = mix(ec, '#0c0716', 0.42);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const e0 = x === 0 || y === 0 || x === N - 1 || y === N - 1, e1 = x === 1 || y === 1 || x === N - 2 || y === N - 2;
      if (e0) o[y * N + x] = corner(x, y) ? null : DK;
      else if (e1) o[y * N + x] = (x === 1 && y === N - 2) || (y === 1 && x === N - 2) ? ec : (x === 1 || y === 1) ? hi : lo;
    }
    o[1 * N + 1] = '#ffffff';
  }

  // ---- element table ---------------------------------------------------------
  const elementOf = {
    sunslash: 'holy', heroic: 'physical', dashstrike: 'physical', whirl: 'physical', judgement: 'holy', dawnwave: 'holy',
    firebolt: 'fire', frostshard: 'frost', barrage: 'arcane', gravity: 'arcane', meteor: 'fire', starstorm: 'arcane',
    multishot: 'physical', piercing: 'physical', tumble: 'physical', snare: 'nature', arrowrain: 'physical', moonbeam: 'arcane',
    bulwark: 'physical', manasurge: 'arcane', shadowveil: 'nature', warcry: 'physical', frostnova: 'frost', mend: 'nature',
    charge: 'physical', blink: 'arcane', sprint: 'physical', secondwind: 'nature', orbit: 'arcane', chain: 'lightning',
    dreamveil: 'arcane', bless: 'holy', shootingstar: 'holy',
  };

  // ---- skill art ---------------------------------------------------------------
  const SK = {
    sunslash() {
      arc(11, 18, 11, 6, -165, -15, R.gd, true); arc(11, 18, 8, 2, -150, -35, R.lt, true);
      swd(4, 20, 14, 10, 3.5); spk(18, 6, 2, '#ffffff', R.lt[2]); spk(5, 8, 1, '#ffffff', R.lt[2]);
    },
    heroic() {
      swd(4, 3, 14, 13, 3.5);
      poly(starPts(16.5, 16.5, 6, 3, 8, 0.2), R.fr); disc(16.5, 16.5, 2.2, R.lt, true);
      top(() => { dots([[16, 16], [17, 16], [16, 17]], '#ffffff'); dots([[5, 18], [8, 19], [3, 15]], R.lt[3]); });
    },
    dashstrike() {
      for (const [y, l] of [[7, 7], [17, 8], [12, 4]]) bar(l, y, l + 5, y, 1, 1, R.wh);
      bar(8, 8, 16, 8, 1, 1, R.wh); swd(5, 12, 21, 12, 4);
      top(() => { for (let x = 12; x < 20; x++) P(x, 11, R.st[3]); });
    },
    whirl() {
      arc(11.5, 11.5, 8.5, 5, -110, 190, R.st, true); arc(11.5, 11.5, 8.5, 1.6, -95, 170, R.wh, true);
      arc(11.5, 11.5, 4.2, 3, 70, 290, R.st, true); arc(11.5, 11.5, 4.2, 1, 80, 270, R.wh, true);
      top(() => dots([[20, 15], [19, 18], [3, 6]], R.wh[3])); spk(11, 11, 0, '#fff', '#fff'); spk(19, 4, 1, '#fff', R.wh[1]);
    },
    judgement() {
      top(() => { line(6, 2, 3, 12, R.lt[1]); line(17, 2, 20, 12, R.lt[1]); line(8, 1, 5, 9, R.lt[2]); line(15, 1, 18, 9, R.lt[2]); });
      ell(11.5, 20.5, 9, 2.4, R.gd, true); ell(11.5, 20.5, 5, 1.2, R.lt, true);
      swd(11.5, 1.5, 11.5, 20, 5, ['#b8944c', '#f0dc98', '#fff8d0', '#ffffff'], R.gd);
      top(() => { bar(11, 9, 11, 19, 1, 1, ['#fff', '#fff', '#fff', '#fff']); dots([[4, 8], [19, 10], [3, 15], [20, 16]], R.lt[3]); });
      spk(5, 4, 2, '#fff', R.lt[2]); spk(18, 5, 1, '#fff', R.lt[2]);
    },
    dawnwave() {
      arc(5, 12, 13, 6, -50, 50, R.gd, true); arc(5, 12, 13, 2, -42, 42, R.wh, true);
      arc(0, 12, 12, 2, -45, 45, R.gd, true); top(() => { dots([[16, 3], [18, 20], [3, 3], [2, 20]], R.lt[2]); });
    },
    firebolt() {
      poly([[12, 5], [19, 12], [5, 20], [2, 21], [4, 15], [7, 9]], R.fr); poly([[11, 8], [16, 13], [5, 18], [7, 12]], R.lt);
      disc(15.5, 8.5, 4.6, R.fr); disc(15, 8, 2.4, R.lt, true); spk(18, 4, 1, '#fff', R.lt[3]); top(() => dots([[7, 10], [4, 12], [9, 19]], R.lt[2]));
    },
    frostshard() {
      shard(6, 20, 20, 5, 6, R.ic); shard(5, 18, 12, 3, 5, R.ic); shard(7, 21, 21, 15, 5, R.ic);
      top(() => { line(7, 19, 18, 7, R.ic[3]); line(6, 17, 11, 5, R.ic[3]); }); spk(19, 4, 1, '#fff', R.ic[2]);
    },
    barrage() {
      for (const [x, y, r] of [[18, 5, 2.2], [19, 11, 2.6], [17, 18, 2.2], [12, 9, 2.4], [12, 16, 2.4]]) { bar(x - 8, y - 1, x - r, y - 0.5, 1, 1, R.ar); disc(x, y, r, R.ar); }
      top(() => dots([[20, 11], [13, 8]], '#fff'));
    },
    gravity() {
      ell(11.5, 12, 9.5, 8, R.ar); ell(11.5, 12, 7.5, 6, R.dk, true); ell(11.5, 12, 4, 3, ['#05020a', '#05020a', '#05020a', '#05020a'], true);
      top(() => { for (let k = 0; k < 26; k++) { const a = k * 0.38, r = 9 - k * 0.27; P(11.5 + Math.cos(a) * r, 12 + Math.sin(a) * r * 0.8, k < 14 ? R.ar[3] : R.ar[2]); const a2 = a + Math.PI, r2 = r; P(11.5 + Math.cos(a2) * r2, 12 + Math.sin(a2) * r2 * 0.8, R.ar[2]); } P(11, 12, '#fff'); });
    },
    meteor() {
      poly([[14, 8], [20, 14], [7, 14], [2, 6], [1, 2], [8, 3]], R.fr); poly([[13, 10], [18, 14], [8, 13], [4, 8]], R.lt);
      disc(15, 15, 5.2, R.br); top(() => { dots([[13, 14], [16, 17], [17, 13]], R.br[0]); dots([[12, 12], [13, 12]], R.fr[3]); }); spk(6, 15, 1, R.lt[3], R.fr[2]); spk(19, 5, 1, '#fff', R.lt[2]);
    },
    starstorm() {
      for (const [x, y, s] of [[15, 8, 5], [6, 15, 4], [18, 18, 3]]) { bar(x - s * 2.2, y - s * 2.2, x - 1, y - 1, 1, 2, R.bl); poly(starPts(x, y, s, s * 0.42, 5), R.mn); }
      top(() => dots([[15, 8], [6, 15], [18, 18]], '#fff')); spk(20, 3, 1, '#fff', R.mn[2]); spk(3, 8, 1, '#fff', R.mn[2]);
    },
    multishot() {
      for (const [x0, y0, x1, y1] of [[3, 21, 17, 4], [3, 21, 21, 11], [3, 21, 8, 2]]) {
        bar(x0, y0, x1, y1, 2, 2, R.br); const a = Math.atan2(y1 - y0, x1 - x0); arrowHead(x1, y1, a, 3.2, R.st); line(x0, y0, x0 + 1, y0 - 1, R.wh[2]);
      }
    },
    piercing() {
      arc(8, 12, 7, 2, -75, 75, R.ic, true); arc(14, 12, 6, 2, -80, 80, R.ic, true);
      bar(3, 12, 17, 12, 2, 2, R.wd); poly([[22, 12], [16, 7.5], [17, 12], [16, 16.5]], R.st); poly([[2, 9], [6, 12], [2, 15], [3, 12]], R.rd);
      top(() => { line(17, 12, 21, 12, '#fff'); P(4, 12, R.rd[3]); });
    },
    tumble() {
      arc(11.5, 11.5, 8, 3, 20, 330, R.bl, true); arrowHead(18.5, 6.5, 0.25, 3.5, R.bl);
      disc(11.5, 12, 4, R.ic); disc(9.5, 9.5, 2.1, R.sk); top(() => dots([[2, 18], [4, 20], [20, 19], [6, 21], [19, 21]], R.wh[1]));
    },
    snare() {
      ell(11.5, 17.5, 9.5, 3.4, R.sn); ell(11.5, 17, 5, 2, R.gr, true);
      poly([[2, 17], [3, 5], [5.5, 11], [7, 4], [9, 11], [11, 7], [11, 17]], R.st); poly([[21, 17], [20, 5], [17.5, 11], [16, 4], [14, 11], [12, 7], [12, 17]], R.st);
      top(() => { dots([[3, 6], [7, 5], [16, 5], [20, 6]], '#ffffff'); dots([[10, 16], [11, 16], [12, 16], [13, 16]], R.gr[3]); line(2, 12, 2, 12, R.st[3]); });
    },
    arrowrain() {
      for (const [x, y] of [[5, 7], [10, 12], [15, 6], [19, 13], [8, 17]]) { bar(x, y - 5, x, y + 2, 1, 1, R.wd); arrowHead(x, y + 4, Math.PI / 2, 2.4, R.st); line(x, y - 5, x - 1, y - 6, R.wh[2]); line(x, y - 5, x + 1, y - 6, R.wh[2]); }
      disc(7, 3, 2.6, R.wh); disc(12, 2.5, 3, R.wh); disc(17, 3.5, 2.5, R.wh);
    },
    moonbeam() {
      poly([[10, 6], [14, 9], [21, 21], [15, 21]], R.mn); top(() => { line(12, 8, 18, 20, '#fff'); dots([[19, 21], [16, 21], [20, 20]], R.mn[2]); });
      disc(8, 8, 6.4, R.mn); cut(11, 6.5, 5.4); spk(17, 6, 1, '#fff', R.mn[1]); spk(4, 18, 1, '#fff', R.mn[1]);
    },
    bulwark() {
      poly([[11.5, 2], [4, 4], [4, 12], [8, 18], [11.5, 21]], R.st, true);
      poly([[11.5, 5], [6.5, 6], [6.5, 12], [9, 16], [11.5, 18]], R.bl, true);
      bar(11.5, 5, 11.5, 17, 2, 2, R.gd); bar(7, 9, 16, 9, 2, 2, R.gd); disc(11.5, 9, 1.4, R.lt, true);
    },
    manasurge() {
      poly([[11.5, 2], [9, 7], [6, 12], [6, 16], [9, 20], [11.5, 21]], R.bl, true); poly([[11.5, 6], [9, 11], [8.5, 16], [10, 18], [11, 18]], R.ic);
      top(() => { dots([[9, 12], [9, 13], [10, 10]], '#fff'); for (const x of [3, 20]) { P(x, 13, R.ar[3]); P(x - 1, 14, R.ar[3]); P(x + 1, 14, R.ar[3]); P(x, 14, R.ar[3]); P(x, 15, R.ar[3]); } });
      spk(18, 5, 2, '#fff', R.ar[2]); spk(4, 6, 1, '#fff', R.ar[2]);
    },
    shadowveil() {
      poly([[11.5, 2], [7.5, 4], [5, 10], [3, 20], [8, 21], [11.5, 19]], R.gr, true); poly([[11.5, 5], [8.5, 7], [8, 12], [11.5, 14]], R.dk, true);
      ell(11.5, 10, 3.4, 3.8, ['#05020a', '#05020a', '#05020a', '#05020a'], true);
      top(() => { dots([[9, 10], [14, 10]], '#d8ff60'); dots([[3, 17], [20, 16], [5, 21], [18, 21]], R.gr[2]); });
    },
    warcry() {
      bar(4, 19, 13, 10, 3, 9, R.gd); ell(14, 9, 3.2, 4.6, R.gd); ell(14.5, 9, 1.8, 3.4, R.dk, true); disc(3.5, 19.5, 1.4, R.wd);
      arc(14.5, 9, 6, 2, -60, 55, R.fr, true); arc(14.5, 9, 9.5, 2, -50, 45, R.lt, true);
    },
    frostnova() {
      for (const a of [0, 60, 120]) { const r = a * Math.PI / 180, c = Math.cos(r) * 8.5, s = Math.sin(r) * 8.5; bar(11.5 - c, 11.5 - s, 11.5 + c, 11.5 + s, 2, 2, R.ic); }
      for (const a of [0, 60, 120, 180, 240, 300]) { const r = a * Math.PI / 180; const px = 11.5 + Math.cos(r) * 5.5, py = 11.5 + Math.sin(r) * 5.5; for (const o of [-0.8, 0.8]) line(px, py, px + Math.cos(r + o) * 3, py + Math.sin(r + o) * 3, R.ic[2]); }
      disc(11.5, 11.5, 2.6, R.ic); top(() => P(11, 11, '#fff'));
    },
    mend() {
      poly([[8, 3], [15, 3], [15, 8.5], [20, 8.5], [20, 15], [15, 15], [15, 20], [8, 20], [8, 15], [3, 15], [3, 8.5], [8, 8.5]], R.gr);
      poly([[9.5, 5], [13.5, 5], [13.5, 10], [18, 10], [18, 13.5], [13.5, 13.5], [13.5, 18], [9.5, 18], [9.5, 13.5], [5, 13.5], [5, 10], [9.5, 10]], R.lf, false, 0.7);
      spk(18, 4, 1, '#fff', R.gr[3]); spk(4, 19, 1, '#fff', R.gr[3]);
    },
    charge() {
      for (const y of [7, 12, 17]) bar(1 + (y === 12 ? 0 : 3), y, 8, y, 1, 1, R.wh);
      for (const dx of [0, 6]) { poly([[4 + dx, 4], [10 + dx, 12], [4 + dx, 20], [8 + dx, 20], [14 + dx, 12], [8 + dx, 4]], R.gd); }
      top(() => dots([[2, 20], [4, 21], [7, 21]], R.st[2]));
    },
    blink() {
      for (const x of [5, 18]) { ell(x, 12, 2.6, 7, R.ar); ell(x, 12, 1.2, 5, R.dk, true); }
      top(() => { for (let k = 0; k < 4; k++) P(8.5 + k * 2, 12 + (k % 2 ? 1 : -1), R.ar[3]); }); spk(19, 5, 2, '#fff', R.ar[2]); spk(5, 18, 1, '#fff', R.ar[2]);
    },
    sprint() {
      poly([[8, 7], [14, 7], [14, 14], [20, 16], [20, 20], [7, 20], [7, 14]], R.br); bar(7, 19, 20, 19, 2, 2, R.dk); bar(8, 8, 14, 8, 2, 2, R.wh);
      poly([[8, 12], [1, 6], [3, 4], [10, 10]], R.wh); poly([[8, 14], [2, 11], [3, 8], [9, 12]], R.wh, false, 0.8);
      for (const y of [13, 17]) bar(0, y + 2, 4, y + 2, 1, 1, R.wh);
    },
    secondwind() {
      disc(8, 9, 4.2, R.rd); disc(15, 9, 4.2, R.rd); poly([[3.5, 11], [19.5, 11], [11.5, 20]], R.rd);
      top(() => { dots([[6, 7], [7, 6], [5, 8]], R.rd[3]); });
      arc(18, 17, 4, 1, 100, 340, R.gr, false); arc(5, 18, 3, 1, 200, 500, R.gr, false); spk(19, 3, 1, '#fff', R.gr[2]);
    },
    orbit() {
      top(() => { for (let a = 0; a < 6.3; a += 0.05) P(11.5 + Math.cos(a) * 9.5, 12 + Math.sin(a) * 4.5, R.ar[2]); });
      disc(11.5, 12, 3, R.ar);
      disc(3.5, 12, 1.9, R.mn); disc(17.5, 8.5, 1.9, R.mn); disc(17.5, 15.5, 1.9, R.mn);
      top(() => { for (let a = 0; a < 6.3; a += 0.05) { const x = 11.5 + Math.cos(a) * 9.5, y = 12 + Math.sin(a) * 4.5; if (Math.sin(a) > 0) P(x, y, R.ar[3]); } });
    },
    chain() {
      const A = [4, 17], B = [11, 6], C = [20, 13];
      bolt(A, B, 2.2, 4, R.lt, '#fff'); bolt(B, C, 2.2, 4, R.lt, '#fff');
      for (const p of [A, B, C]) disc(p[0], p[1], 2.6, R.bl); top(() => { for (const p of [A, B, C]) P(p[0], p[1], '#fff'); });
    },
    dreamveil() {
      disc(7, 14, 4, R.pk); disc(12, 12, 5, R.pk); disc(17, 14, 4, R.pk); poly([[5, 17], [19, 17], [19, 19], [5, 19]], R.pk);
      disc(9, 6.5, 4.6, R.lt); cut(11.5, 5.5, 3.8);
      top(() => { for (const [x, y] of [[16, 5], [19, 8]]) { line(x, y, x + 2, y, '#fff'); line(x + 2, y, x, y + 2, '#fff'); line(x, y + 2, x + 2, y + 2, '#fff'); } });
      spk(3, 4, 1, '#fff', R.lt[2]); spk(20, 20, 1, '#fff', R.pk[3]);
    },
    bless() {
      for (let a = -170; a <= -10; a += 20) { const r = a * Math.PI / 180; bar(11.5 + Math.cos(r) * 8, 16 + Math.sin(r) * 8, 11.5 + Math.cos(r) * 11.5, 16 + Math.sin(r) * 11.5, 2, 1, R.lt); }
      disc(11.5, 16, 6.3, R.lt); for (let y = 17; y < N; y++) for (let x = 0; x < N; x++) LB[y * N + x] = null;
      bar(2, 17, 21, 17, 2, 2, R.gd); bar(5, 20, 18, 20, 1, 1, R.gd); top(() => dots([[10, 13], [9, 14]], '#fff')); spk(11, 2, 1, '#fff', R.lt[2]);
    },
    shootingstar() {
      bar(1, 1, 12, 12, 1, 6, R.lt); bar(1, 6, 9, 12, 1, 3, R.fr); bar(6, 1, 12, 9, 1, 3, R.fr);
      poly(starPts(15, 15, 7, 3.2, 5, -Math.PI / 2 + 0.1), R.lt); top(() => { dots([[14, 12], [13, 13]], '#fff'); dots([[3, 14], [14, 3]], R.lt[3]); });
    },
  };

  // ---- items ---------------------------------------------------------------------
  const MET = [['#2a1c18', '#5a3c2c', '#8a6048', '#b08a6a'], ['#2c3048', '#5a6078', '#8c94ac', '#c4cadc'], R.st, ['#1c3a78', '#3c78c8', '#78c0ff', '#e8faff'], ['#6a78a8', '#b0c0e8', '#e8f2ff', '#ffffff']];
  const trim = (t, rm) => (t >= 2 ? R.gd : rm);
  const FAM = {
    sword(t) {
      const M = MET[t], tips = [[16, 8], [18, 5.5], [20, 3.5], [21, 2], [21, 2]][t], w = [2.6, 3, 3.5, 4, 4.5][t];
      bar(9, 14, tips[0], tips[1], w, 1, M);
      if (t >= 2) top(() => line(10, 13, tips[0] - 2, tips[1] + 2, mix(M[0], M[1], 0.5)));
      if (t >= 3) top(() => { line(9, 15, tips[0] - 1, tips[1] + 2, t === 3 ? '#8ae8ff' : R.lt[2]); });
      if (t === 0) { for (const [x, y] of [[12, 12], [14, 9]]) LB[y * N + x] = null; }
      bar(5, 20, 8, 17, 2, 2, t ? R.br : R.wd); if (t >= 2) top(() => { P(6, 19, R.br[1]); P(7, 18, R.br[1]); });
      const gl = [2, 2.5, 3, 3.5, 4][t]; bar(8 - gl * 0.7, 15 - gl * 0.7 - 0.5, 8 + gl * 0.7 + 0.5, 15 + gl * 0.7, t >= 3 ? 3 : 2, t >= 3 ? 3 : 2, trim(t, t ? R.st : R.wd));
      disc(4, 20.5, 1.7, t >= 2 ? R.gd : R.st);
      if (t === 4) { disc(8, 15, 1.1, R.rd); disc(4, 20.5, 0.8, R.rd, true); top(() => { P(7, 14, '#fff'); }); spk(19, 4, 2, '#fff', R.lt[2]); spk(6, 7, 1, '#fff', R.lt[2]); }
      if (t === 3) spk(19, 5, 1, '#fff', '#8ae8ff');
    },
    staff(t) {
      const wd = t >= 3 ? R.br : R.wd; bar(4, 21, 15, 10, 2, 2.5, wd);
      if (t >= 3) { bar(7, 18, 8, 17, 3, 3, R.gd); bar(11, 14, 12, 13, 3, 3, R.gd); }
      const cy = R.ic;
      if (t === 0) { bar(15, 10, 18, 6, 1, 1, R.wd); bar(15, 10, 20, 9, 1, 1, R.wd); disc(18, 7, 1.6, R.sn); }
      if (t === 1) { bar(15, 10, 17, 7, 2, 1, R.wd); bar(15, 10, 19, 10, 2, 1, R.wd); shard(16, 10, 18.5, 3.5, 4, cy); }
      if (t === 2) { bar(14, 11, 16, 5, 1, 1, R.gd); bar(14, 11, 21, 9, 1, 1, R.gd); disc(17.5, 7.5, 3, cy); disc(17, 7, 1.2, R.ic, true); }
      if (t === 3) { arc(17.5, 7.5, 5, 2, 90, 360, R.st, false); disc(17.5, 7.5, 3, cy); spk(19, 4, 1, '#fff', R.ic[2]); }
      if (t === 4) { arc(17, 7, 5.5, 2, 70, 380, R.gd, false); poly(starPts(17, 7, 7, 2.6, 4, -Math.PI / 4), R.lt); disc(17, 7, 3.6, R.ic); disc(17, 7, 1.5, ['#fff', '#fff', '#fff', '#fff'], true); disc(6, 19, 1, R.rd, true); spk(20, 3, 2, '#fff', R.ic[2]); spk(11, 6, 1, '#fff', R.ic[2]); }
    },
    bow(t) {
      const M = [R.wd, R.br, R.lf, ['#2c3a78', '#4a6ab8', '#8ab4f0', '#e0f0ff'], R.gd][t], w = [2, 2.4, 3, 3, 3.6][t];
      arc(3, 12, 14, w, -42, 42, M, true);
      if (t >= 2) { disc(13.5, 3.5, 1.2, t === 2 ? R.wh : R.gd, true); disc(13.5, 20.5, 1.2, t === 2 ? R.wh : R.gd, true); }
      if (t >= 1) bar(15.5, 10, 16.5, 14, 2, 2, t >= 4 ? R.rd : R.dk);
      top(() => { const sc = t === 4 ? R.lt[3] : R.wh[2]; line(13.5, 3.5, 6, 12, sc); line(6, 12, 13.5, 20.5, sc); });
      bar(5, 12, 20, 12, 1, 1, R.br); arrowHead(21, 12, 0, t >= 3 ? 3 : 2.4, t >= 3 ? R.ic : R.st); line(5, 11, 7, 11, t ? R.rd[2] : R.wh[1]); line(5, 13, 7, 13, t ? R.rd[2] : R.wh[1]);
      if (t === 4) { spk(19, 4, 2, '#fff', R.lt[2]); disc(16, 12, 0.9, R.ic, true); }
    },
  };
  const HM = {
    knight(t) {
      const M = MET[t];
      if (t === 0) {                          // dented iron cap
        const I = ['#262a3c', '#4a5068', '#747c94', '#a0a8bc'];
        poly([[11.5, 5], [8, 6], [6, 9.5], [5.5, 14], [11.5, 14]], I, true); bar(4, 14.5, 19, 14.5, 2, 2, I); bar(11.5, 14, 11.5, 18, 2, 2, I);
        top(() => { dots([[8, 8], [9, 9], [8, 9], [14, 12], [15, 13]], '#1c1f2e'); dots([[10, 7], [11, 7]], '#c0c8d8'); dots([[7, 12], [16, 11]], '#8a5a3a'); dots([[6, 14], [17, 14]], '#c0c8d8'); });
        return;
      }
      poly([[11.5, 3], [7.5, 4.5], [5, 9], [5, 17], [6, 20], [11.5, 20]], M, true);
      poly([[11.5, 12], [6.5, 12], [6.5, 15], [11.5, 15]], R.dk, true); bar(11.5, 15, 11.5, 20, 1, 1, R.dk);
      if (t >= 1) bar(5.5, 8.5, 17.5, 8.5, 2, 2, trim(t, MET[t]));
      if (t === 0) { top(() => { dots([[8, 6], [7, 7]], MET[0][0]); dots([[15, 17], [16, 16]], R.br[1]); }); }
      if (t >= 2) { poly([[11.5, 2], [10, 1], [10.5, 5]], R.rd, true); bar(11.5, 3, 11.5, 8, 2, 2, R.rd); }
      if (t >= 3) { poly([[4.5, 12], [1, 6], [4, 8], [5, 9]], R.gd); poly([[19.5, 12], [23, 6], [20, 8], [19, 9]], R.gd); }
      if (t === 4) { disc(11.5, 6, 1.5, R.rd); bar(5.5, 20, 17.5, 20, 1, 1, R.gd); spk(18, 3, 1, '#fff', R.lt[2]); }
    },
    arcane(t) {
      const m = t >= 3 ? R.ar : rp(['#4a3a78', '#5d3fa8', '#5d3fa8', '#7a52c8', '#7a52c8'][t]);
      poly([[11.5, 2], [9, 6], [6.5, 10], [5, 17], [7, 21], [11.5, 21]], m, true);
      ell(11.5, 15, 3.8, 4.6, R.dk, true); top(() => { if (t >= 1) { dots([[9, 14], [14, 14]], '#7aeaff'); } });
      if (t >= 2) { bar(7, 20.5, 16, 20.5, 1, 1, R.gd); bar(6, 11, 7, 17, 1, 1, R.gd); bar(17, 11, 16, 17, 1, 1, R.gd); }
      if (t >= 3) disc(11.5, 1.5, 1.6, R.ic);
      if (t === 4) { disc(11.5, 8, 1.4, R.ic, true); arc(11.5, 8, 4.5, 1, 190, 350, R.gd, false); spk(5, 5, 1, '#fff', R.ar[2]); spk(18, 7, 1, '#fff', R.ar[2]); }
    },
    warden(t) {
      const m = rp(['#4a6a50', '#3f7a58', '#3f7a58', '#2f8a5a', '#2f8a5a'][t]);
      poly([[11.5, 3], [7.5, 4.5], [5, 9], [4.5, 17], [6, 21], [11.5, 21]], m, true);
      ell(11.5, 14.5, 3.8, 4.8, R.dk, true); top(() => { dots([[9, 13], [14, 13]], '#ffe066'); });
      if (t >= 1) { poly([[11.5, 3], [8, 0.5], [9.5, 5]], R.lf, true); }
      if (t >= 2) { bar(7, 20.5, 16, 20.5, 1, 1, R.lf); poly([[5.5, 7], [2, 3], [3.5, 9]], R.lf); poly([[17.5, 7], [21, 3], [19.5, 9]], R.lf); }
      if (t >= 3) { bar(7, 5, 3, 1, 1, 1, R.br); bar(16, 5, 20, 1, 1, 1, R.br); bar(5, 3, 3, 4, 1, 1, R.br); bar(18, 3, 20, 4, 1, 1, R.br); }
      if (t === 4) { disc(11.5, 6, 1.5, R.rd); arc(11.5, 14.5, 7.5, 1, 190, 350, R.gd, false); spk(4, 6, 1, '#fff', R.lt[2]); }
    },
  };
  const CH = {
    plate(t) {
      const M = MET[t];
      disc(5, 7, 3.4, M); disc(18, 7, 3.4, M); poly([[11.5, 4], [7.5, 4.5], [5.5, 8], [6, 20], [11.5, 20]], M, true);
      poly([[11.5, 8], [9, 8], [9, 20], [11.5, 20]], R.bl, true); bar(6, 16, 17, 16, 2, 2, R.dk);
      top(() => { if (t >= 1) { dots([[10, 7], [13, 7]], M[3]); } P(11, 16, R.gd[2]); P(12, 16, R.gd[2]); });
      if (t === 0) top(() => dots([[7, 10], [16, 12], [8, 14]], R.br[1]));
      if (t >= 2) { bar(6, 20, 17, 20, 1, 1, R.gd); arc(5, 7, 3.4, 1, 180, 360, R.gd, false); arc(18, 7, 3.4, 1, 180, 360, R.gd, false); }
      if (t >= 3) { bar(11.5, 8, 11.5, 15, 2, 2, R.gd); }
      if (t === 4) { poly([[11.5, 9], [9.5, 11.5], [11.5, 14.5], [13.5, 11.5]], R.rd); spk(4, 3, 1, '#fff', R.lt[2]); spk(19, 3, 1, '#fff', R.lt[2]); }
    },
    robe(t) {
      const m = t >= 3 ? R.ar : rp(['#5a4a8a', '#6a4cb0', '#7a5cc4', '#7a5cc4', '#8a60e0'][t]), hw = [5, 5.5, 6.5, 7.5, 8.5][t];
      poly([[11.5, 4], [8, 4.5], [5.5, 7], [11.5 - hw, 21], [11.5, 21]], m, true); poly([[11.5, 6], [8, 6], [11.5, 11]], R.dk, true);
      if (t >= 1) { bar(5, 7, 4, 15, 3, 3, m); bar(18, 7, 19, 15, 3, 3, m); poly([[11.5, 3], [8, 3.5], [6.5, 6], [11.5, 8]], R.pk, true, 0.5); }
      bar(6, 14, 17, 14, 2, 2, t >= 2 ? R.gd : t ? R.pk : R.br);
      if (t >= 2) { bar(11.5 - hw, 20.5, 11.5 + hw, 20.5, 1, 1, R.gd); bar(11.5, 6, 11.5, 14, 1, 1, R.gd); disc(11.5, 14, 1.3, R.lt, true); }
      if (t >= 3) { poly([[11.5, 3], [6.5, 3.5], [2.5, 8], [4, 11], [11.5, 10]], R.mn, true, 0.35); bar(3, 10.5, 20, 10.5, 1, 1, R.gd); top(() => dots([[8, 17], [15, 18], [11, 16], [6, 19], [17, 20]], R.mn[3])); }
      if (t === 4) { disc(11.5, 11, 1.7, R.ic); disc(3, 9, 1, R.ic, true); disc(20, 9, 1, R.ic, true); bar(4, 15, 4, 15, 1, 1, R.gd); spk(3, 3, 1, '#fff', R.ar[2]); spk(20, 4, 1, '#fff', R.ar[2]); spk(11, 22, 0, '#fff', R.ar[3]); }
    },
    jacket(t) {
      const m = rp(['#6a4a34', '#8c5d3f', '#8c5d3f', '#9a6a46', '#9a6a46'][t]);
      poly([[11.5, 5], [8, 4.5], [5.5, 6], [5, 19], [11.5, 19]], m, true); poly([[11.5, 5], [8, 4.5], [11.5, 11]], R.dk, true);
      if (t >= 1) { bar(5, 7, 3.5, 15, 3, 3, m); bar(18, 7, 19.5, 15, 3, 3, m); poly([[11.5, 4], [8, 3.5], [9, 7], [11.5, 9]], R.lf, true, 0.6); }
      bar(6, 15, 17, 15, 2, 2, R.dk);
      if (t === 0) { top(() => { dots([[7, 11], [16, 12], [8, 17]], R.br[0]); }); for (const x of [6, 8, 10, 13, 15, 17]) LB[19 * N + x] = null; }
      if (t >= 2) { disc(11.5, 15, 1.6, R.lt, true); bar(5.5, 19, 17.5, 19, 1, 1, R.gd); bar(3.5, 15, 3.5, 15, 1, 1, R.gd); }
      if (t >= 3) { disc(5, 6.5, 2.8, R.br); disc(18, 6.5, 2.8, R.br); poly([[8, 19], [15, 19], [14, 22], [9, 22]], m, false, 0.4); top(() => dots([[4, 6], [17, 6]], R.gd[2])); }
      if (t === 4) { disc(11.5, 11, 1.5, R.lf, true); bar(8, 11, 8, 14, 1, 1, R.gd); bar(15, 11, 15, 14, 1, 1, R.gd); bar(9, 21.5, 14, 21.5, 1, 1, R.gd); spk(3, 3, 1, '#fff', R.lt[2]); spk(20, 3, 1, '#fff', R.lt[2]); }
    },
  };
  const BT = {
    greaves(t) {
      const M = MET[t]; poly([[7, 3], [14, 3], [14, 13], [17, 14], [21, 17], [21, 20], [6, 20], [6, 13]], M);
      bar(6, 19, 21, 19, 2, 2, R.dk); bar(7, 4, 14, 4, 2, 2, trim(t, M)); bar(7, 9, 14, 9, 1, 1, R.dk); bar(7, 12, 14, 12, 1, 1, R.dk);
      poly([[16, 14], [21, 17], [21, 19], [16, 19]], M, false, 0.85);
      if (t >= 2) { bar(15, 14, 21, 17, 1, 1, R.gd); disc(10, 7, 1.4, R.gd); }
      if (t >= 3) poly([[6, 5], [2, 3], [3, 8], [6, 9]], R.wh);
      if (t === 4) { disc(10, 7, 1.2, R.rd, true); spk(19, 8, 1, '#fff', R.lt[2]); }
    },
    sandals(t) {
      const wing = t >= 3;
      bar(6, 19, 21, 19, 3, 3, R.br); bar(6, 20, 20, 20, 1, 1, R.dk); poly([[16, 15], [21, 18], [21, 19], [8, 18]], R.wh, false, 0.8);
      bar(8, 18, 12, 8, 2, 2, R.wh); bar(15, 18, 10, 8, 2, 2, R.wh); bar(7, 8, 14, 8, 2, 2, t >= 2 ? R.gd : R.pk);
      bar(8, 14, 15, 15, 1, 1, R.pk); bar(7, 17, 7, 19, 2, 2, R.br);
      if (wing) { poly([[7, 8], [1, 3], [4, 5], [2, 9], [6, 11]], R.wh); poly([[6, 10], [2, 12], [6, 14]], R.wh, false, 0.7); }
      if (t === 4) { disc(10.5, 8, 1.3, R.ic, true); poly([[3, 21.5], [6, 20.5], [9, 21.5]], R.wh); spk(19, 8, 1, '#fff', R.ic[2]); }
    },
    shoes(t) {
      const m = rp(['#5a3c2c', '#7a5038', '#7a5038', '#6a4430', '#6a4430'][t]);
      poly([[7, 8], [14, 8], [14, 13], [17, 14], [21, 17], [21, 20], [6, 20], [6, 13]], m); bar(6, 19, 21, 19, 2, 2, R.dk);
      bar(7, 9, 14, 9, 2, 2, t >= 2 ? R.wh : R.br); if (t >= 2) top(() => dots([[7, 8], [9, 8], [11, 8], [13, 8]], R.wh[3]));
      for (const [x, y] of [[9, 11], [11, 12], [13, 13]]) top(() => { P(x, y, R.br[3]); P(x - 1, y + 1, R.br[3]); });
      if (t >= 1) bar(8, 15, 15, 15, 1, 1, R.gd);
      if (t >= 3) { poly([[6, 9], [2, 5], [3, 11]], R.lf); }
      if (t === 4) { disc(10, 16, 1.1, R.lf, true); bar(6, 20, 21, 20, 1, 1, R.gd); spk(18, 11, 1, '#fff', R.lt[2]); }
    },
  };
  const KIND = { sword: [FAM, 'sword'], staff: [FAM, 'staff'], bow: [FAM, 'bow'],
    knight: [HM, 'knight'], arcane: [HM, 'arcane'], warden: [HM, 'warden'], plate: [CH, 'plate'], robe: [CH, 'robe'], jacket: [CH, 'jacket'],
    greaves: [BT, 'greaves'], sandals: [BT, 'sandals'], shoes: [BT, 'shoes'] };
  const BASE = { dawnblade: 'sword', starfall: 'staff', moonbow: 'bow', knighthelm: 'knight', arcanecowl: 'arcane', wardenhood: 'warden',
    knightplate: 'plate', dreamrobe: 'robe', stalkerjacket: 'jacket', knightgreaves: 'greaves', clothsandals: 'sandals', stalkershoes: 'shoes',
    helm: 'knight', chest: 'plate', boots: 'greaves' };
  function kindOf(b) {
    b = String(b || 'sword').toLowerCase(); if (BASE[b]) return BASE[b]; if (KIND[b]) return b;
    const m = [['sword', 'sword'], ['blade', 'sword'], ['staff', 'staff'], ['wand', 'staff'], ['bow', 'bow'], ['cowl', 'arcane'], ['hood', 'warden'], ['helm', 'knight'], ['plate', 'plate'], ['robe', 'robe'], ['jacket', 'jacket'], ['greave', 'greaves'], ['sandal', 'sandals'], ['shoe', 'shoes'], ['boot', 'greaves'], ['chest', 'plate']];
    for (const [k, v] of m) if (b.includes(k)) return v;
    return 'sword';
  }

  // ---- trinkets (DESIGN 19.4/19.5): ring / amulet / belt x tiers 1-3, element tint, uniques ----------------
  const RCUT = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < N && y < N) L[y * N + x] = null; };
  const TMET = { ring: [['#2a2824', '#5a5648', '#8c866e', '#b8b296'], ['#3a4a68', '#7a90b8', '#bcd0f0', '#f0f8ff'], ['#3a2a78', '#7a68d0', '#b8a8ff', '#f4ecff']],
    amulet: [R.gd, ['#5a6a88', '#9ab0d0', '#d4e4fa', '#ffffff'], ['#6a4a98', '#b890e8', '#e8d0ff', '#ffffff']],
    belt: [['#4a2e14', '#7a5028', '#b0804a', '#dcb078'], ['#2c3a5a', '#52688e', '#8aa4cc', '#c8dcf4'], ['#4a4488', '#8480d0', '#bcb8f4', '#f0eeff']] };
  const DEFSTONE = [null, R.bl, R.ar];
  const tint = (M, ec) => (ec ? M.map((c) => mix(c, ec, 0.16)) : M);
  const TRK = {
    ring(t, ec) {
      const M = tint(TMET.ring[t - 1], ec), S = ec ? rp(ec) : DEFSTONE[t - 1];
      arc(11.5, 14.5, 6.4, 3.2, 0, 360, M);
      if (t === 1) { if (S) disc(11.5, 7.4, 1.5, S); else top(() => P(11, 8, M[3])); return; }
      if (t === 2) { bar(9, 7.5, 10, 9.5, 2, 2, M); bar(14, 7.5, 13, 9.5, 2, 2, M); disc(11.5, 6.3, 2.5, S); top(() => P(10, 5, '#fff')); return; }
      bar(8.5, 9, 7.5, 7, 2, 2, M); bar(14.5, 9, 15.5, 7, 2, 2, M);
      poly([[11.5, 1.8], [15.5, 6], [11.5, 10.2], [7.5, 6]], S); top(() => { P(10, 4, '#fff'); P(11, 5, S[3]); }); spk(18, 4, 1, '#fff', S[3]); spk(5, 18, 1, '#fff', M[3]);
    },
    amulet(t, ec) {
      const M = TMET.amulet[t - 1], S = ec ? rp(ec) : [R.lt, R.bl, R.ar][t - 1], CH = R.gd;
      bar(4, 1.5, 10.5, 9, 1, 1, CH); bar(19, 1.5, 12.5, 9, 1, 1, CH);
      if (t === 1) {       // lantern charm
        disc(11.5, 9.6, 1.6, M, true); cut(11.5, 9.6, 0.7); poly([[9, 11.5], [14, 11.5], [13, 13], [10, 13]], M);
        poly([[8.5, 13], [14.5, 13], [15, 19.5], [8, 19.5]], S); top(() => { P(9, 14, '#fff'); P(9, 15, S[3]); line(11, 18, 12, 15, '#fff'); });
        bar(7.5, 20, 15.5, 20, 2, 2, M); bar(8, 13, 8, 19, 1, 1, M); bar(15, 13, 15, 19, 1, 1, M);
      } else if (t === 2) {  // dreamglass drop
        disc(11.5, 9.6, 1.6, M, true); cut(11.5, 9.6, 0.7);
        poly([[11.5, 11], [16.5, 16.5], [15.5, 20], [11.5, 22], [7.5, 20], [6.5, 16.5]], M);
        poly([[11.5, 12.5], [15, 16.5], [14, 19.3], [11.5, 20.5], [9, 19.3], [8, 16.5]], S); top(() => { P(10, 15, '#fff'); P(10, 16, '#fff'); P(11, 14, S[3]); P(13, 18, S[3]); });
      } else {               // starhollow
        poly(starPts(11.5, 16, 7, 3.4, 5), M); disc(11.5, 16.2, 2.6, S); top(() => { P(10, 15, '#fff'); P(11, 14, S[3]); });
        disc(11.5, 9, 1.3, M, true); cut(11.5, 9, 0.6); spk(19, 8, 1, '#fff', S[3]); spk(4, 20, 1, '#fff', S[3]);
      }
    },
    belt(t) {
      const M = TMET.belt[t - 1];
      if (t === 1) {   // rope sash: twisted band, knot, tassels
        bar(1, 12.5, 22.5, 12.5, 5, 5, M); top(() => { for (let x = 2; x < 22; x += 3) { P(x, 11, M[3]); P(x + 1, 12, M[3]); P(x + 2, 13, M[0]); P(x + 1, 14, M[0]); } });
        bar(10.5, 14, 8.5, 21, 2, 2, M); bar(13, 14, 15, 21, 2, 2, M); bar(8, 20.5, 9.5, 21.5, 2, 2, R.gd); bar(14.5, 20.5, 16, 21.5, 2, 2, R.gd);
        disc(11.5, 12.5, 3.2, M); top(() => { P(10, 11, M[3]); P(11, 12, M[0]); P(12, 13, M[0]); });
      } else if (t === 2) {  // mistwoven: woven cloth + silver buckle
        poly([[1, 10], [22, 10], [22, 15.5], [1, 15.5]], M, false); top(() => { for (let x = 2; x < 22; x++) for (let y = 11; y < 15; y++) if ((x + y) % 3 === 0) P(x, y, M[3]); line(1, 10, 22, 10, M[3]); line(1, 15, 22, 15, M[0]); });
        poly([[7.5, 7.5], [15.5, 7.5], [15.5, 18], [7.5, 18]], TMET.amulet[1]); RCUT(9, 9, 14, 16); top(() => { RCUT(9, 9, 14, 16); bar(9, 12.5, 14, 12.5, 2, 2, ['#9ab0d0', '#9ab0d0', '#d4e4fa', '#ffffff']); P(8, 8, '#fff'); });
        dots([[3, 6], [19, 6], [5, 19], [17, 20]], R.ic[3]);
      } else {                // moonlit girdle: ornate band, moon buckle, stars
        poly([[1, 9.5], [22, 9.5], [22, 16], [1, 16]], M, false); top(() => { line(1, 10, 22, 10, R.gd[2]); line(1, 15, 22, 15, R.gd[1]); for (const x of [3, 6, 17, 20]) { P(x, 12, '#fff'); P(x - 1, 13, M[3]); P(x + 1, 11, M[3]); } });
        disc(11.5, 12.8, 6, R.gd); disc(11.5, 12.8, 4.6, R.dk, true);
        disc(10.8, 12.8, 3.5, R.mn, true); top(() => { disc(12.6, 11.9, 3, R.dk, true); P(10, 11, '#fff'); }); spk(16, 5, 1, '#fff', R.mn[2]); spk(5, 19, 1, '#fff', R.mn[2]);
      }
    },
  };
  // uniques: one hand-drawn icon each (6 trinket + 5 world)
  const ASH = ['#2c2826', '#5a524c', '#8c8078', '#c0b4a8'], TEAL = ['#123a3c', '#2a7a78', '#5cc0b4', '#c8fff0'], CHAR = ['#16121a', '#2e2830', '#4a424e', '#6e6474'];
  const UQ = {
    pipslantern() {
      arc(11.5, 6, 3.6, 1.8, 180, 360, R.gd); bar(7, 8, 16, 8, 3, 3, R.gd); poly([[8, 9.5], [15, 9.5], [16.5, 19], [6.5, 19]], R.lt);
      bar(6, 19.5, 17, 19.5, 3, 3, R.gd); bar(8, 9.5, 7, 19, 1, 1, R.gd); bar(15, 9.5, 16, 19, 1, 1, R.gd);
      poly([[11.5, 11], [13.4, 14.5], [13, 17.5], [11.5, 18.5], [10, 17.5], [9.6, 14.5]], R.fr); top(() => { P(11, 15, '#fff'); P(11, 16, R.lt[3]); P(12, 16, R.lt[3]); });
      spk(3, 11, 1, '#fff', R.lt[2]); spk(20, 12, 1, '#fff', R.lt[2]); spk(19, 4, 0, '#fff', '#fff');
    },
    drownedcompass() {
      arc(11.5, 6, 3, 1.6, 180, 360, TEAL); disc(11.5, 13.5, 8.6, TEAL); disc(11.5, 13.5, 6.4, R.bl, true); disc(11.5, 13.5, 5.2, R.dk, true);
      poly([[11.5, 8.5], [13, 13.5], [11.5, 14.5], [10, 13.5]], R.rd); poly([[11.5, 18.5], [13, 13.5], [11.5, 12.5], [10, 13.5]], R.wh);
      top(() => { dots([[11, 8], [11, 19], [6, 13], [17, 13]], TEAL[3]); dots([[4, 18], [3, 20], [19, 20], [20, 18]], R.lf[2]); P(11, 13, '#fff'); P(18, 22, R.ic[2]); P(5, 22, R.ic[2]); });
    },
    ashensignet() {
      arc(11.5, 15.5, 6, 3, 0, 360, ASH); poly([[6.5, 1.8], [16.5, 1.8], [17, 10], [6, 10]], ASH); poly([[8, 3.2], [15, 3.2], [15, 8.5], [8, 8.5]], R.fr);
      top(() => { line(9, 7, 11, 4, R.lt[3]); line(12, 4, 14, 7, R.lt[3]); line(9, 4, 14, 7, R.lt[1]); dots([[8, 3]], '#fff'); dots([[4, 21], [19, 22], [20, 18], [3, 14]], ASH[3]); });
      spk(19, 4, 1, '#fff', R.fr[2]);
    },
    kindredband() {
      arc(8, 13.5, 5.2, 2.8, 0, 360, R.gd); arc(15.5, 13.5, 5.2, 2.8, 0, 360, R.wh);
      top(() => arc(8, 13.5, 5.2, 2.8, -50, 100, R.gd)); poly([[8, 2.5], [10.5, 5.5], [8, 8], [5.5, 5.5]], R.rd); poly([[15.5, 2.5], [18, 5.5], [15.5, 8], [13, 5.5]], R.bl);
      top(() => { P(7, 4, '#fff'); P(14, 4, '#fff'); }); spk(11.5, 21, 1, '#fff', R.lt[2]);
    },
    cindersash() {
      poly([[1, 9.5], [22, 9.5], [22, 15.5], [1, 15.5]], CHAR); top(() => { line(3, 14, 6, 11, R.fr[2]); line(6, 11, 8, 13, R.fr[1]); line(15, 11, 18, 14, R.fr[2]); line(18, 14, 20, 11, R.fr[1]); line(1, 10, 22, 10, CHAR[3]); });
      bar(10.5, 15, 9, 21, 2, 2, CHAR); bar(13, 15, 14.5, 21, 2, 2, CHAR);
      disc(11.5, 12.5, 5, R.gd); disc(11.5, 12.5, 3.6, R.fr, true); top(() => { P(10, 11, '#fff'); P(11, 12, R.lt[3]); });
      spk(6, 5, 1, R.lt[3], R.fr[2]); spk(17, 4, 1, R.lt[3], R.fr[2]); spk(12, 2, 0, '#fff', '#fff'); spk(21, 19, 0, R.fr[2], R.fr[2]);
    },
    quietgirdle() {
      poly([[1, 9.5], [22, 9.5], [22, 15.5], [1, 15.5]], R.ar, false, 0.3); top(() => { line(1, 10, 22, 10, R.ar[3]); line(1, 15, 22, 15, R.dk[0]); for (const x of [3, 6, 17, 20]) P(x, 12, '#fff'); });
      disc(11.5, 12.8, 6, R.gd); disc(11.5, 12.8, 4.6, R.dk, true);
      top(() => { arc(11.5, 11.2, 3.3, 1.4, 20, 140, R.mn); P(8, 14, R.mn[2]); P(15, 14, R.mn[2]); P(10, 15, R.mn[1]); P(13, 15, R.mn[1]); });
      spk(18, 4, 1, '#fff', R.ar[2]); spk(5, 4, 0, '#fff', '#fff'); dots([[12, 19], [15, 21], [8, 20]], R.ar[3]);
    },
    cometband() {
      arc(10, 15, 5.8, 3, 0, 360, R.st); bar(22, 1, 14, 7.5, 1, 4, R.ic);  bar(21, 4, 14.5, 8, 1, 2, R.wh);
      disc(13.5, 7.3, 2.8, R.ic); top(() => { P(12, 6, '#fff'); P(13, 7, R.ic[3]); P(19, 8, R.ic[3]); P(17, 11, R.ic[2]); });
      bar(8.5, 9.5, 9, 10.5, 2, 2, R.st); spk(3, 4, 1, '#fff', R.ic[2]);
    },
    tidewovenclasp() {
      poly([[1, 10], [22, 10], [22, 15.5], [1, 15.5]], TEAL); top(() => { for (let x = 1; x < 22; x++) { P(x, 12 + Math.round(Math.sin(x * 0.9) * 1.2), TEAL[3]); P(x, 13 + Math.round(Math.sin(x * 0.9) * 1.2), TEAL[0]); } line(1, 10, 22, 10, TEAL[3]); });
      poly([[11.5, 5], [16, 7], [18, 12], [16, 18], [11.5, 20], [7, 18], [5, 12], [7, 7]], R.gd);
      top(() => { for (const [x, y] of [[11.5, 6.5], [8.5, 8], [14.5, 8], [7, 11.5], [16, 11.5]]) line(11.5, 18.5, x, y, R.lt[3]); line(8, 17, 15, 17, R.gd[0]); });
      disc(11.5, 18.5, 1.2, R.ic, true); dots([[3, 5], [20, 18], [4, 20]], R.ic[2]);
    },
    afterimagependant() {
      bar(4, 1.5, 10.5, 9, 1, 1, R.gd); bar(19, 1.5, 12.5, 9, 1, 1, R.gd);
      const gh = (dx, a) => { const g = ['#3a2a70', '#5a44a0', '#7a64c8', '#9a88e8'].map((c) => mix(c, '#171024', a)); poly([[11.5 + dx, 11], [16 + dx, 16], [11.5 + dx, 22], [7 + dx, 16]], g); };
      gh(-4, 0.55); gh(4, 0.55); gh(-2, 0.25); gh(2, 0.25);
      poly([[11.5, 10.5], [16.5, 16], [11.5, 22.5], [6.5, 16]], R.gd); poly([[11.5, 12.5], [14.8, 16], [11.5, 20.5], [8.2, 16]], R.ar);
      top(() => { P(10, 15, '#fff'); P(10, 16, R.ar[3]); P(12, 18, R.ar[3]); });
    },
    summonersthread() {
      arc(11.5, 15.5, 5.6, 1.8, 0, 360, R.pk); arc(11.5, 15.5, 5.6, 0.9, 200, 330, R.wh);
      poly([[11.5, 9], [7, 4], [5, 7], [8, 9.5]], R.pk); poly([[11.5, 9], [16, 4], [18, 7], [15, 9.5]], R.pk); disc(11.5, 9.2, 1.4, R.pk);
      bar(10.5, 10, 8, 14, 1, 1, R.pk); bar(12.5, 10, 15, 13, 1, 1, R.pk);
      disc(11.5, 16, 2.6, R.ic, true); top(() => { P(10, 15, R.dk[0]); P(13, 15, R.dk[0]); P(11, 17, R.dk[0]); P(12, 17, R.dk[0]); }); spk(19, 20, 1, '#fff', R.pk[2]); spk(3, 20, 0, '#fff', '#fff');
    },
    hollowbell() {
      poly([[1, 3.5], [22, 3.5], [22, 7.5], [1, 7.5]], R.sn, false, 0.4); top(() => { line(1, 4, 22, 4, R.sn[3]); line(1, 7, 22, 7, R.sn[0]); });
      const bell = (dx, M) => poly([[9.5 + dx, 8], [13.5 + dx, 8], [14.5 + dx, 12], [17 + dx, 18], [6 + dx, 18], [8.5 + dx, 12]], M);
      bell(-5, ['#3a3a52', '#4e4e6c', '#62628a', '#7878a0']); bell(5, ['#3a3a52', '#4e4e6c', '#62628a', '#7878a0']);
      bell(0, R.gd); ell(11.5, 18, 5.6, 1.5, R.dk, true); disc(11.5, 20.2, 1.7, R.gd);
      top(() => { P(9, 11, R.lt[3]); P(9, 13, R.lt[3]); P(8, 15, R.lt[3]); line(11, 8, 11, 8, '#fff'); });
    },
  };
  const TRK_BASES = { tarnished_band: ['ring', 1], dreamsilver_band: ['ring', 2], starmetal_band: ['ring', 3], lantern_charm: ['amulet', 1], dreamglass_pendant: ['amulet', 2],
    starhollow_amulet: ['amulet', 3], rope_sash: ['belt', 1], mistwoven_belt: ['belt', 2], moonlit_girdle: ['belt', 3] };
  const TRK_SLOT = { ring: 1, amulet: 1, belt: 1 };
  // implicit-element dot on the frame (top-left, 4x4) and the tempered bright edge (top/left of the rarity ring + sparkle)
  function implicitDot(o, el) {
    const c = EC[el]; if (!c) return;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const edge = x === 0 || y === 0 || x === 3 || y === 3; if (edge && (x === 0 || x === 3) && (y === 0 || y === 3)) continue;
      o[(2 + y) * N + 2 + x] = edge ? DK : x === 1 && y === 1 ? mix(c, '#fff', 0.75) : x === 2 && y === 2 ? mix(c, DK, 0.35) : c;
    }
  }
  function temperEdge(o) {
    const hi = '#fff6d0';
    for (let i = 1; i < N - 1; i++) { o[1 * N + i] = hi; o[i * N + 1] = hi; o[(N - 2) * N + i] = mix(o[(N - 2) * N + i], hi, 0.45); o[i * N + N - 2] = mix(o[i * N + N - 2], hi, 0.45); }
    o[1 * N + 2] = '#ffffff'; o[2 * N + 1] = '#ffffff'; o[1 * N + 1] = '#ffffff';
  }

  // ---- gems ------------------------------------------------------------------------
  const GEM = {
    ruby: { c: '#e0284a', p: [[-0.5, -1], [0.5, -1], [1, -0.5], [1, 0.5], [0.5, 1], [-0.5, 1], [-1, 0.5], [-1, -0.5]] },
    sapphire: { c: '#2f6bff', p: [[-0.55, -1], [0.55, -1], [0.85, -0.7], [0.85, 0.7], [0.55, 1], [-0.55, 1], [-0.85, 0.7], [-0.85, -0.7]] },
    emerald: { c: '#22c45a', p: [[0, -1], [0.9, -0.5], [0.9, 0.5], [0, 1], [-0.9, 0.5], [-0.9, -0.5]] },
    topaz: { c: '#ffbe1f', p: [[0, -1], [0.7, -0.45], [0.85, 0.2], [0.5, 0.85], [-0.5, 0.85], [-0.85, 0.2], [-0.7, -0.45]] },
    amethyst: { c: '#a050ff', p: [[0, -1], [0.78, -0.1], [0, 1], [-0.78, -0.1]] },
    diamond: { c: '#bfe8ff', p: [[-0.55, -0.7], [0.55, -0.7], [1, -0.15], [0, 1], [-1, -0.15]] },
  };
  const GR = [5.2, 6.4, 7.4, 8.4, 8.8];
  function drawGem(type, g) {
    const d = GEM[type] || GEM.ruby, cx = 11.5, cy = 11.5, r = GR[g];
    const base = [mix(d.c, '#8c8c9c', 0.4), mix(d.c, '#8c8c9c', 0.15), d.c, mix(d.c, '#ffffff', 0.04), mix(d.c, '#ffffff', 0.08)][g];
    const rm = g === 4 ? [mix(base, '#10081c', 0.5), mix(base, '#10081c', 0.2), base, mix(base, '#ffffff', 0.3)] : [mix(base, '#10081c', 0.62), mix(base, '#10081c', 0.32), base, mix(base, '#ffffff', 0.45)];
    let V = d.p.map((p) => [cx + p[0] * r * (type === 'amethyst' ? 0.9 : 1), cy + p[1] * r]);
    if (g === 0) V = V.map((p, i) => [p[0] + ((i * 7) % 3 - 1) * 0.8, p[1] + ((i * 5) % 3 - 1) * 0.8]);
    if (g >= 3) { const W = []; for (let i = 0; i < V.length; i++) { const a = V[i], b = V[(i + 1) % V.length]; W.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); } V = W; }
    const ts = [0, 0.38, 0.5, 0.52, 0.55][g], tc = [cx, cy - r * 0.12];
    poly(V, rm, false, 0.5);
    const T = ts ? V.map((p) => [tc[0] + (p[0] - cx) * ts, tc[1] + (p[1] - cy) * ts]) : null;
    for (let i = 0; i < V.length; i++) {
      const a = V[i], b = V[(i + 1) % V.length], mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy, l = Math.hypot(mx, my) || 1;
      let t = 0.5 - (mx + my) / l * 0.38 + (i % 2 ? 0.1 : -0.06);
      if (g === 0 && i % 3 === 0) t -= 0.25;
      const t1 = T ? T[i] : tc, t2 = T ? T[(i + 1) % V.length] : tc;
      poly(T ? [a, b, t2, t1] : [a, b, tc], rm, false, clamp(t, 0, 0.99));
    }
    if (T) poly(T, rm, false, g === 1 ? 0.7 : g === 4 ? 0.7 : 0.82);
    top(() => {
      if (T) { P(T[0][0] + 1, T[0][1] + 2, '#fff'); if (g >= 2) P(tc[0] - r * 0.12, tc[1] - r * 0.12, '#fff'); } else P(cx - 1, cy - 1, rm[3]);
      if (g === 4) { for (let i = 0; i < V.length; i += 2) { P(V[i][0], V[i][1], '#fff'); } }
    });
    if (g === 4) top(() => { const hc = mix(d.c, '#ffffff', 0.25); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (LB[y * N + x] || (x + y) & 1) continue; let md = 99; for (const q of V) md = Math.min(md, Math.hypot(q[0] - x, q[1] - y)); const dc = Math.hypot(x - cx, y - cy); if (dc > r * 0.98 && dc < r + 2.4 && md < 3) P(x, y, hc); } });
    if (g === 4) { spk(cx + r - 1, cy - r, 2, '#fff', mix(d.c, '#ffffff', 0.6)); spk(cx - r + 1, cy + r - 2, 1, '#fff', mix(d.c, '#ffffff', 0.6)); }
    if (g === 3) spk(cx + r - 1, cy - r + 1, 1, '#fff', mix(d.c, '#ffffff', 0.6));
  }

  // ---- misc ----------------------------------------------------------------------------
  const GLASS = ['#7a8cb0', '#b6c6e0', '#dce8f8', '#ffffff'];
  const MISC = {
    potion() {
      bar(11.5, 5, 11.5, 11, 4, 4, GLASS); disc(11.5, 15.5, 6.3, R.rd); bar(8, 11, 15, 11, 2, 2, GLASS);
      poly([[9, 2], [14, 2], [13.5, 5], [9.5, 5]], R.wd); top(() => { dots([[8, 14], [8, 15], [9, 13]], '#ffffff'); dots([[13, 16], [14, 18], [11, 18]], R.rd[3]); });
    },
    dust() {
      ell(11.5, 16, 7, 5.6, R.ar); poly([[8, 9], [15, 9], [17, 12], [6, 12]], R.ar); bar(7.5, 10.5, 15.5, 10.5, 2, 2, R.gd);
      top(() => { dots([[9, 15], [8, 16]], R.ar[3]); }); spk(11, 4, 2, '#fff', R.pk[2]); spk(5, 6, 1, '#fff', R.ar[3]); spk(18, 7, 1, '#fff', R.pk[2]); spk(19, 18, 1, '#fff', R.pk[2]);
    },
    rune() {
      poly([[11.5, 2], [7.5, 3.5], [5, 7], [5, 17], [7.5, 21], [11.5, 21]], R.sn, true);
      top(() => { const c = R.ic[2]; line(10, 6, 10, 18, c); line(10, 6, 15, 10, c); line(15, 10, 10, 13, c); line(10, 13, 15, 18, c); line(9, 6, 9, 18, R.ic[1]); });
      top(() => dots([[7, 6], [16, 6], [7, 18], [16, 18]], R.sn[3]));
    },
    chest() {
      poly([[3, 10], [20, 10], [20, 20], [3, 20]], R.wd); poly([[3, 10], [4.5, 5], [19, 5], [20.5, 10]], R.br); ell(11.5, 7, 8.5, 3.5, R.br);
      bar(3, 10, 20, 10, 2, 2, R.gd); bar(6, 5, 6, 20, 2, 2, R.gd); bar(17, 5, 17, 20, 2, 2, R.gd); poly([[10, 10], [13, 10], [13, 14], [10, 14]], R.lt); top(() => { P(11, 12, R.dk[0]); P(12, 11, R.lt[3]); });
    },
    xp() {
      disc(11.5, 11.5, 9, R.bl); disc(11.5, 11.5, 6.8, R.ic, true); poly(starPts(11.5, 12, 6, 2.6, 5), R.lt); top(() => { dots([[8, 6], [7, 7]], '#fff'); });
      spk(19, 4, 1, '#fff', R.ic[2]); spk(4, 18, 1, '#fff', R.ic[2]);
    },
    key() {
      disc(8, 8, 5, R.gd); cut(8, 8, 1.7); bar(11, 11, 19, 19, 2.5, 2.5, R.gd); poly([[15, 17], [18, 14], [20, 16], [17, 19]], R.gd); poly([[17.5, 19.5], [19.5, 17.5], [21, 19], [19, 21]], R.gd);
      top(() => dots([[5, 5], [6, 4]], '#fff'));
    },
    choice() {
      bar(11.5, 21, 11.5, 12, 3, 3, R.gd); bar(11.5, 12, 5.5, 6, 3, 3, R.gd); bar(11.5, 12, 17.5, 6, 3, 3, R.gd);
      arrowHead(4, 4.5, -2.36, 3.6, R.lt); arrowHead(19, 4.5, -0.78, 3.6, R.ar); disc(11.5, 12, 2.4, R.ar);
      top(() => P(11, 11, '#fff')); spk(20, 14, 1, '#fff', R.ar[2]); spk(3, 15, 1, '#fff', R.lt[2]);
    },
    shrine() {
      poly([[3, 21], [4, 17], [19, 17], [20, 21]], R.sn); poly([[6, 17], [7, 14], [16, 14], [17, 17]], R.sn, false, 0.6);
      poly([[9, 14], [10, 8], [13, 8], [14, 14]], R.sn); bar(11.5, 9, 11.5, 13, 1, 1, R.ic);
      poly([[11.5, 1.5], [14, 5], [11.5, 8.5], [9, 5]], R.ic); top(() => { dots([[11, 3], [11, 4]], '#fff'); dots([[7, 11], [16, 11]], R.ic[2]); });
      spk(5, 5, 1, '#fff', R.ic[2]); spk(18, 4, 1, '#fff', R.ic[2]);
    },
    tablet() {
      const S2 = rp('#a89878'); poly([[11.5, 2], [7, 3], [5, 6], [5, 20], [11.5, 21]], S2, true);
      top(() => { poly([[11.5, 5], [10, 6.5], [11.5, 8], [13, 6.5]], R.lt); for (const y of [11, 13, 15, 17]) { line(8, y, 15, y, S2[0]); P(8, y + 1, S2[3]); } line(8, 11, 11, 11, R.gd[1]); });
      dots([[6, 19], [7, 20], [16, 19]], R.lf[1]);
    },
    gold() {
      disc(11.5, 11.5, 8.3, R.gd); disc(11.5, 11.5, 6, R.lt, true); bar(11.5, 7, 11.5, 16, 2, 2, R.gd); bar(8, 11.5, 15, 11.5, 2, 2, R.gd); spk(18, 5, 1, '#fff', R.lt[2]);
    },
  };

  // ---- rarity frame (shared by static canvas and animated draw) -----------------------
  function perim(n) {          // cells of the ring inset by 1 (rarity colour ring), clockwise
    const o = []; for (let i = 1; i <= n - 2; i++) o.push([i, 1]); for (let j = 2; j <= n - 3; j++) o.push([n - 2, j]);
    for (let i = n - 2; i >= 1; i--) o.push([i, n - 2]); for (let j = n - 3; j >= 2; j--) o.push([1, j]); return o;
  }
  const hsl = (h, s, l) => { h = ((h % 360) + 360) % 360; const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return toHex([f(0) * 255, f(8) * 255, f(4) * 255]); };
  function rarityStyle(rarity, t) {
    const base = RC[rarity] || RC.common;
    const col = (i) => {
      if (rarity === 'legendary') { const v = Math.pow(Math.max(0, Math.sin(t * 3 - i * 0.28)), 6); return mix(base, '#fff6c8', v * 0.95); }
      if (rarity === 'mythic') return hsl(330 + Math.sin(t * 1.2 + i * 0.12) * 50 + t * 25, 1, 0.64);
      if (rarity === 'epic') return mix(base, '#ffffff', 0.12 + 0.12 * Math.sin(t * 3 + i * 0.1));
      return base;
    };
    const glowA = { common: 0.06, uncommon: 0.16, rare: 0.26, epic: 0.3 + 0.12 * Math.sin(t * 3), legendary: 0.36 + 0.1 * Math.sin(t * 4), mythic: 0.4 + 0.12 * Math.sin(t * 5) }[rarity] || 0.06;
    const gcol = rarity === 'mythic' ? hsl(330 + t * 40, 1, 0.6) : base;
    return { col, glowA, gcol };
  }
  function drawStaticFrame(o, rarity) {
    const st = rarityStyle(rarity, 0);
    for (let k = 0; k < 3; k++) { const a = st.glowA * (1 - k * 0.32) * 1.3; for (let i = 2 + k; i < N - 2 - k; i++) for (const [x, y] of [[i, 2 + k], [i, N - 3 - k], [2 + k, i], [N - 3 - k, i]]) if (o[y * N + x]) o[y * N + x] = mix(o[y * N + x], st.gcol, a); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if ((x === 0 || y === 0 || x === N - 1 || y === N - 1)) o[y * N + x] = corner(x, y) ? null : DK; }
    perim(N).forEach(([x, y], i) => { o[y * N + x] = st.col(i); });
  }
  function slotBg() {
    const o = mk(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.hypot(x - 11.5, y - 11) / 16, v = clamp(1 - d, 0, 1), b = (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16; o[y * N + x] = ['#171024', '#1f162f', '#2a1f40'][clamp(Math.floor(v * 2.6 + b - 0.4), 0, 2)]; } return o;
  }
  const dotAt = (o, k, type) => {   // small socket dot, bottom-right, k-th from the right
    const x0 = 18 - k * 4, y0 = 18, c = type ? (GEM[type] || GEM.ruby).c : null;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const edge = x === 0 || y === 0 || x === 3 || y === 3, i = (y0 + y) * N + x0 + x; if (x0 + x < 2 || x0 + x > 21) continue;
      if (edge && ((x === 0 || x === 3) && (y === 0 || y === 3))) continue;
      o[i] = edge ? (c ? DK : '#4a4060') : c ? (x === 1 && y === 1 ? mix(c, '#fff', 0.7) : (x === 2 && y === 2 ? mix(c, DK, 0.35) : c)) : '#0c0814';
    }
  };

  // ---- public API ------------------------------------------------------------------------
  const memo = (k, f) => cache[k] || (cache[k] = f());
  const API = {
    elementOf, elementColor: EC, rarityColor: RC, size: N,
    skillIds: Object.keys(SK),
    skill(id) {
      return memo('s:' + id, () => {
        const el = elementOf[id] || 'arcane', ec = EC[el], bg = skBg(ec);
        const o = paint(SK[id] || (() => { poly(starPts(11.5, 11.5, 8, 3.4, 5), R.ar); }), bg); skFrame(o, ec); return bake(o);
      });
    },
    // opts (all items, optional): { element: ring/amulet tint, implicit: element of the item's implicit -> dot on the frame, tempered: bright frame edge }
    // trinkets: base = TRINKET_BASES id | TRINKET_UNIQUES / WORLD_UNIQUES id | 'ring'|'amulet'|'belt' (+ tier 1..3)
    item(base, tier, rarity, gems, opts) {
      tier = clamp(tier | 0, 0, 4); rarity = RC[rarity] ? rarity : 'common'; opts = opts || {};
      const gk = (gems || []).map((g) => (g ? String(g) : '-')).join(',');
      const tb = TRK_BASES[base] || (TRK_SLOT[base] ? [base, clamp(tier, 1, 3)] : null), uq = UQ[base] ? base : null, el = EC[opts.element] ? opts.element : null;
      return memo(`i:${base}:${tier}:${rarity}:${gk}:${el}:${opts.implicit || ''}:${opts.tempered ? 1 : 0}`, () => {
        let o;
        if (tb || uq) o = paint(() => (uq ? UQ[uq]() : TRK[tb[0]](tb[1], el && EC[el])), slotBg());
        else { const kind = kindOf(base), [tab, name] = KIND[kind]; o = paint(() => tab[name](tier), slotBg()); }
        (gems || []).slice(0, 3).forEach((g, k) => { const s = g ? String(g).split('_') : null; dotAt(o, k, s && s[0]); });
        drawStaticFrame(o, rarity);
        if (opts.implicit) implicitDot(o, opts.implicit);
        if (opts.tempered) temperEdge(o);
        return bake(o);
      });
    },
    trinketIds: Object.keys(TRK_BASES), uniqueIds: Object.keys(UQ),
    gem(type, grade) {
      if (typeof type === 'string' && type.includes('_')) { const q = type.split('_'); type = q[0]; if (grade == null) grade = +q[1]; }
      grade = clamp(grade | 0, 0, 2); type = GEM[type] ? type : 'ruby';        // 3 grades: chipped, clear, radiant
      return memo(`g:${type}:${grade}`, () => bake(paint(() => drawGem(type, [0, 2, 4][grade]))));
    },
    misc(name) { if (name === 'talent') name = 'choice'; return memo('m:' + name, () => bake(paint(MISC[name] || MISC.xp))); },
    // old 16px glyph names -> new art. `color` (optional) disambiguates heart / helm / chest / boots variants.
    glyph(glyph, color) {
      const c = String(color || '').toLowerCase();
      const G = { arc: 'sunslash', strike: 'heroic', dash: 'dashstrike', spin: 'whirl', beam: 'judgement', wave: 'dawnwave', fire: 'firebolt', frost: 'frostshard',
        orbs: 'barrage', well: 'gravity', stars: 'starstorm', arrows: 'multishot', pierce: 'piercing', roll: 'tumble', trap: 'snare', rain: 'arrowrain',
        shield: 'bulwark', surge: 'manasurge', cloak: 'shadowveil', shout: 'warcry', nova: 'frostnova', heart: c === '#ff8fb0' ? 'secondwind' : 'mend',
        veil: 'dreamveil', star: 'shootingstar' };
      if (SK[glyph]) return API.skill(glyph);
      if (G[glyph]) return API.skill(G[glyph]);
      const V = { helm: { '#9c7ae0': 'arcane', '#6aa77e': 'warden' }, chest: { '#9c7ae0': 'robe', '#c08a5e': 'jacket' }, boots: { '#e7c9a0': 'sandals', '#7a5038': 'shoes' } };
      if (glyph === 'sword' || glyph === 'staff' || glyph === 'bow') return API.item(glyph, 2, 'common');
      if (V[glyph]) return API.item(V[glyph][c] || glyph, 2, 'common');
      if (MISC[glyph]) return API.misc(glyph);
      return API.misc('xp');
    },
    // animated rarity slot frame + inner glow; size in screen px (any size, crisp cells of round(size/24) px)
    frame(ctx, x, y, size, rarity, t) {
      t = t || 0; rarity = RC[rarity] ? rarity : 'common';
      const p = Math.max(1, Math.round(size / N)), n = Math.floor(size / p), st = rarityStyle(rarity, t), sv = ctx.globalAlpha;
      const cell = (i, j, c, a) => { ctx.globalAlpha = sv * (a == null ? 1 : a); ctx.fillStyle = c; ctx.fillRect(x + i * p, y + j * p, p, p); };
      for (let k = 0; k < 3; k++) { const a = st.glowA * (1 - k * 0.32); for (let i = 2 + k; i < n - 2 - k; i++) { cell(i, 2 + k, st.gcol, a); cell(i, n - 3 - k, st.gcol, a); cell(2 + k, i, st.gcol, a); cell(n - 3 - k, i, st.gcol, a); } }
      for (let i = 1; i < n - 1; i++) { cell(i, 0, DK); cell(i, n - 1, DK); cell(0, i, DK); cell(n - 1, i, DK); }
      perim(n).forEach(([i, j], k) => cell(i, j, st.col(k * N / n | 0)));
      const tw = (cx, cy, ph) => { const v = Math.max(0, Math.sin(t * 4 + ph)); if (v < 0.55) return; const a = (v - 0.55) / 0.45; cell(cx, cy, '#ffffff', a); cell(cx - 1, cy, '#ffffff', a * 0.5); cell(cx + 1, cy, '#ffffff', a * 0.5); cell(cx, cy - 1, '#ffffff', a * 0.5); cell(cx, cy + 1, '#ffffff', a * 0.5); };
      if (rarity === 'rare') { if ((t % 2.6) < 0.5) tw(n - 3, 2, 0); }
      if (rarity === 'epic') tw(2, n - 3, 1);
      if (rarity === 'legendary' || rarity === 'mythic') { tw(n - 3, 2, 0); tw(2, n - 3, 2.1); if (rarity === 'mythic') { tw(2, 2, 4.2); tw(n - 3, n - 3, 1.3); } }
      ctx.globalAlpha = sv;
    },
  };
  return API;
})();
