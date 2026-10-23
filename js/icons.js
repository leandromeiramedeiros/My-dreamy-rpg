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
//   Gear icons (the 12 live families x 5 tiers) are DERIVED from the parts kit (js/parts-art.js, the same templates + tier tables
//   hero.js paints): weapons are the held sprite turned 45 degrees, chests / helms the front torso / head, boots one boot at 2x.
//   Pass item.base (a BASES id: 'sunforged', 'knightplate'...), never a variant or suit id. Without parts-art.js loaded the older
//   hand-drawn gear icons below are used. ICONS.kindFor(base) -> { slot, family, tier } | null reports what a base resolves to.
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
  // ---- gear icons derived from the parts kit (M3) --------------------------------------------------------------------
  // family -> [slot, its 5 base ids by tier index] (must match items.js FAMILY_TIERS; tools/hero-preview.html checks it against BASES)
  const GEAR = {
    sword: ['weapon', ['rustyblade', 'dawnblade', 'sunforged', 'auroraedge', 'dawneternal']], staff: ['weapon', ['willowwand', 'starfall', 'cometrod', 'nebulasceptre', 'nighteternal']],
    bow: ['weapon', ['hunterbow', 'moonbow', 'silverwing', 'eclipsebow', 'mooneternal']],
    knighthelm: ['head', ['ironcap', 'knighthelm', 'sunguard', 'auroravisor', 'crownofdawn']], arcanecowl: ['head', ['novicehood', 'arcanecowl', 'starweave', 'astralcirclet', 'crownofstars']],
    wardenhood: ['head', ['rangercap', 'wardenhood', 'mossmantle', 'thornwarden', 'crownofroots']],
    warden: ['chest', ['ironmail', 'knightplate', 'sunplate', 'auroraplate', 'dawnaegis']], dreamweave: ['chest', ['linenrobe', 'dreamrobe', 'starwoven', 'nebularobe', 'dreamshroud']],
    stalker: ['chest', ['jerkin', 'stalkerjacket', 'nightcoat', 'shadowweave', 'eclipsegarb']],
    knightgreaves: ['boots', ['ironboots', 'knightgreaves', 'sungreaves', 'auroragreaves', 'dawnstriders']], clothsandals: ['boots', ['ropesandals', 'clothsandals', 'mistwalkers', 'skystep', 'cloudsteps']],
    stalkershoes: ['boots', ['softshoes', 'stalkershoes', 'quietstep', 'shadowstep', 'eclipsetreads']],
  };
  const GEAR_OF = {}; for (const f in GEAR) GEAR[f][1].forEach((id, t) => { GEAR_OF[id] = { slot: GEAR[f][0], family: f, tier: t }; });
  const LEGACY_KIND = { sword: 'sword', staff: 'staff', bow: 'bow', knighthelm: 'knight', arcanecowl: 'arcane', wardenhood: 'warden', warden: 'plate', dreamweave: 'robe', stalker: 'jacket',
    knightgreaves: 'greaves', clothsandals: 'sandals', stalkershoes: 'shoes' };   // the pre-kit hand-drawn icons (used only without parts-art.js)
  const ORIGIN = { origin_knight: 'physical', origin_mystic: 'arcane', origin_ranger: 'nature', origin_thief: 'frost', origin_warrior: 'fire' };   // starter rings
  function kindFor(base, tier) {                     // a base id (or, for old callers, a family id) -> the kit family it draws
    base = String(base || ''); if (GEAR_OF[base]) return GEAR_OF[base];
    if (GEAR[base]) return { slot: GEAR[base][0], family: base, tier: clamp(tier | 0, 0, 4) };
    return null;
  }
  // nearest-neighbour turn + fit of kit cells into the 24x24 icon: 3x3 sub-samples per pixel, the commonest colour wins (thin blades survive the shrink)
  function turnFit(cells, deg, maxSize, keepScale) {
    const g = new Map(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y, c] of cells) { g.set(x * 512 + y, c); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { const u = (x - cx) * ca - (y - cy) * sa, v = (x - cx) * sa + (y - cy) * ca; bx0 = Math.min(bx0, u); bx1 = Math.max(bx1, u); by0 = Math.min(by0, v); by1 = Math.max(by1, v); }
    const k = Math.min(keepScale || 1, maxSize / (bx1 - bx0), maxSize / (by1 - by0)), mx = (bx0 + bx1) / 2, my = (by0 + by1) / 2, out = [];
    for (let v = 0; v < N; v++) for (let u = 0; u < N; u++) {
      const hit = {}; let n = 0, best = null, bn = 0;
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        const px = (u + (i + 0.5) / 3 - N / 2) / k + mx, py = (v + (j + 0.5) / 3 - N / 2) / k + my;
        const sx = px * ca + py * sa + cx, sy = -px * sa + py * ca + cy, c = g.get(Math.floor(sx) * 512 + Math.floor(sy));
        if (c) { n++; hit[c] = (hit[c] || 0) + 1; if (hit[c] > bn) { bn = hit[c]; best = c; } }
      }
      if (n >= 4) out.push([u, v, best]);
    }
    return out;
  }
  // ---- forge icons: the 21 weapon / shield / companion lines x 6 tiers, drawn by tools/forge/icons.js from the same 3D models as the hero's gear ----
  // FORGE-ICONS:BEGIN (generated by tools/forge/icons.js: do not edit)
  const FORGE_ICONS = {
    'sword.t1': '0c07149494a2676774b07e5644444f5e3a24b09a888a72625e4a40|.67A2.21ABCA.13A2.4ADBCEA.11AC2A.2AD2FCEA.11AC2EA2D2F3A.12AC2E2D2F2A2.14AC2EDF2A.16AG2HF2A.16AG2H2IFA.15AG2H2I2CA.14AG2H2I2C2EA.12AG2H3A2C2EA.11AG2H3A.2AC2A.10AG2H3A.4A2.10AG2I3A.16AG2I2A2.16AG2I2A.17AG2I2A.18AG2IA.20A3.67',
    'sword.t2': '0c071485573a384270626ea0a6b0d4|.66A3.15A2.3AB2CA.13AD2A.AB3CA.13AD3AB4A.15AD3B2A2.16AE2CBA.17AE2DC2A.16AE2D2CDA.15AE2C3D3A.13AE2C3A2D2A.12AE2C2A2.2A2.12AE2DCA.17AE2D2A.17AD4A.17AD3A2.17AD3A.18AD3A.19AD2A.21A2.92',
    'sword.t3': '0c0714d8a030b07e569a64145e3a246878aeb0bfe83a46724e5572|.44A2.21AB2A.19AB3A.14A2.2AC2D2A.13AB2A2C2E2DA.13AB4CE2A2.15ABF3EA.16AG2F3A.16AG2F3BA.15AG2F3B2A.14AG3H2AB2A.13AG2I3A.ABA.12AG2I3A.3A.12AG2I2A2.16AG2I2A.17AG2I2A.17AF3IA.17AF3A2.17AF3A.19AF2A.21A2.68',
    'sword.t4': '0c0714f0c858d8a0309a6414a4b0dc85573a7480b0cfd4ec8b8fb8535478ffffffc4cdee|.66A3.20ABC2A.13A3.3ABCDA.12AE3A.AF2CDA.12AG4AF3A2.14A2H2IF2A.16AH3IJA.16AH3I2JA.15AH2I2J3A.14AH2I2J2K2A.13AH2I2J2AL2A.12AH2I2J2A2L2A.11AH2I3A2.2A2.11AH2I3A.17AHJ3A.17AJ3A2.17AJ3A.18AJ3A.19AJ2A.21A2.68',
    'sword.t5': '0c0714d8a03085573ab4b4d8ecebfa6e6a969a6414bff4ff|.67A3.20AB3A.14A3.2AB3A.13AB3A2C2BA.14AB3D2C2A.16AE2D3A.16AE2D2FA.16AE2D2F2GA.14AE2D2F2G2A.13AE3HF2AG2A.12AE3H2FA.A2.12AE2H3A2.15AE2H3A.16AE2H3A.16AE2H2A2.16AE2H2A.17AE3HA.17AE3A2.18AF2A.21A2.68',
    'sword.t6': '0c0714d8a0309a6414f0c85885573a52508a34305a8480b85a3608|.62A3.19A2B3A4.14AB3C3BDBA.13AB2A4BDBA.12AB4A3E2CA.11ADBC2B2FGE2CA.11ADBA2H2FG2C2A.11ADBAH2F2GAC2A.11ADBH2F2G2AC2A.11ADH2F2G2BC3A.11AH2F2G2AB2CA.11AH2F2G2AB3A.11AH2F3I3C2A.11AH2F3A6.12AHG3A.17AG3A2.17AG3A.18AG3A.18AF2A2.20A2.67',
    'rapier.t1': '0c07149494a244444f676774b07e565e3a24|.67A3.15A2.3AB2CA.13AD2A.A2EC2A.13AD3AE4A.15AD3F2A2.16AB2DFA.18ABD3A.17AD5A.16AC4ADCA.14ACDCA3DCA.13ACDCA.3A2.13ACDCA.18ABDCA.18ABCA2.18ADCA.19ADCA.19ADCA.19AD2A.19ADA2.21A.69',
    'rapier.t2': '0c0714626ea038427085573aa6b0d4|.41A5.17A2B5A.15AB3AC2BA.15AB2A2D2BA.15AB2AD3A.17AB2D2A.17AE2C2A.17AE2BCBA.16AB4ABCA.14AB4A2BCA.13ACB2A2.2A2.13ACBCA.18ACBCA.18ACBCA.18AEBCA.18AEBA2.18AECA.19AECA.19AE2A.19AEA2.21A.69',
    'rapier.t3': '0c0714d8a03085573af0c858b0bfe89a64143a46726878ae|.67A3.16A2.2AB3A.14AB2A2C2B2A.14ABD2C3A2.15AED2BCA.17AE2B2FA.17AE2B2FA.16AGHGF3A.15AGHGA2F2A.14AEHGA.2A2.14AEGA2.18AHGA.19AHGA.18A2HGA.18AGHGA.18AEHA2.18AEHA.19AH2A.20AHA.22A.69',
    'rapier.t4': '0c0714e0475e9a6414d8a030f0c8583a2216cfd4ec5354788b8fb8|.66A2.20A2B2A.16A3C2B2A.15AD3C2B2A.15ADED2F2B2A.14ADED2FAB2A.14AD4CA3.15AG2D2CA.16AG3C3A.15AHIHA2DCA.14AHIHA.ADCA.13AHIHA.3A2.13AHIHA.18AGIHA.18AGIA2.18AGIA.19AGHA.19AG2A.21A2.91',
    'rapier.t5': '0c0714d8a03085573a9a6414f0c858bff4ffffffff|.63A.4A2.16ABA.2AB2A.13A4BA2C2BA.11A2B5DC3A.11AEBA2B5CA.13A2.2AF3BA.17AF4D2A.15AF5D2A.14AF5EDA.14AF4A2EDA.13AF4A.AD2A.12AF4A.2ADA.12AF4A.2ABDA.11AF3A2.3ABA.11AF3A.6A.11AF3A.18AF3A.18AF2A2.18AGFA.21A2.68',
    'rapier.t6': '0c0714ffffff6adcc88480b85e3a242c8a8634305a52508a7fe8d8|.41A.21A2BA3.17ACACAD2A.14A3B2CAD2A.12A2C3BC2E2DA.11ACFAC4GEA2.13A2.A2FG2C2A.16AH3GFA.16ADGHCF3A.14ADIGAC2A2.14AGDIA.ACA.14AGHGA.ABCA.13ADHGA.2ABA.13ADHA2.3ACA.12ADGA.4ACA.12AHGA.6A.12AHGA.19AH2A.19AHA2.19AHA.22A.69',
    'mace.t1': '0c071485573a5e3c22b07e565e3a24b886543a24148a5c34|.67A2.20A2BCA.18AD2BCA.17AD2E2A.17AD2E2A.17AD2E2A.17A2F2EA.17AF4A.17AF3A2.12A6G3A.13AF2H4G2A.13AF4H3CA.13AF5H3CA.13AF4H3C2A.13AF4H3C2A.13AF3H3C3A.13AH6C3A.14AH3C4A.16AC5A.18A5.63',
    'mace.t2': '0c0714626ea0b07e563842705e3a249494a2676774a6b0d41c2140f4f8ff|.44A2.20A2B2A.18AC2D2A.17AC2E2A.17AC2E2A.17AC2E2A.17AF3EA.8A2.7AF4A.8AB2A.5AG3A2.9AB3A3.AG3A.10AH2B5AIG2A.11AH2B3I5A.13AH7DA.14AH2J2D4A.14AH2J2BD3A.14AH3B6A.14AB4DB3A.15AD4B3A.16A3B2D2A.19A2D2A.21A2.60',
    'mace.t3': '0c0714f0c858d8a03085573a5e3a243842706878aeb0bfe81e24403a4672ffffffff98a8|.67A2.21ABCA.19ADBCA.18AD2ECA.17AD3EA.16A2E4A.16AB2E2A2.8A2.7AF3A.9AG2A.5AF3A.10AG3A5F3A.10AH2G3I3F2A2.11AH2G2I2GIF2A.13AH4G2IJA.14AH2K2G2IJA.14AH3G3J2A.14ALG4JG2A.14AL2G2J2G3A.14ALJ4G3A.15A5G2A.21A2.61',
    'mace.t4': '0c0714d8a0309a64145e3a24b07e56b8324ae0475e2a28428b8fb83a4672535478cfd4ecffffff4a8cff|.43A3.20AB2CA.17A2D2BCA.16AE2D2BA.16AE2D3A.16AE2D2A2.16AF2D2A.8A3.7AF2G2A.7AH2IA.5AJ3G2A.7AHI3A5J3A3.8AHI3KH3J2A2.11AHI3KHIHJ2A.13AL4I2HKA.14AL2M2I2HKA.14AL2MI2NK2A.14AI5NI2A.14AI4K2I3A.13AIK5I3A.14A5H4A.19A2H2A.21A2.60',
    'mace.t5': '0c0714d8a0309a64145e3a24f0c8588b8fb8b4b4d85a3608bff4ff|.67A3.20AB2CA.18AD2BCA.17AD3BA.17AD4A.16A2D3A2.16AE2D2A.9A2.7AF2DA.9AG2A.5AF3A.9AHG2A6F3A.10AH2G2I4F2A2.11AH2G2B2GI2FA.13AI3BG2I2A.14AI4G2EIA.14AI5E3A.14AI6EGA.14AI6G3A.13AC2I4G4A.13A6G2B2A.19A4.59',
    'mace.t6': '0c07148480b852508a85573a5e3a24f0c85834305ab4b4d8f0f0304a4a08a8a818faffa0ffffff|.43A2.21ABCA.19ADBCA.18AD2ECA.17AD3EA.16A2E4A.16AF2E2A2.8A2.7ACG2A.9AH2A.5AC2GA.9AIH3A5C3A.10AI2H2I2J3CA2.11AI3HI2HJK2A.13AL2M2H2JKA.14AKM3H2JKA.14AKM3I2J2A.14AI5KH2A.14AI4K2H3A.13AIK5H3A.14A5KH2A.19AJ2HA.20A3.61',
    'axe.t1': '0c0714c8c8d46767748a5c3485573a|.33A3.20AB2CA.17A2C5A.15AC8A.14AC8A.15AC7A.15AC7A.16AC5A.18AC2A2.20AD2A.20AD2A.21AD2A.20AD3A.20ADE2A.20AE2A.20AE3A.20AE2A.21AEDA.20AD3A.20AD2A.21A2.54',
    'axe.t2': '0c0714f4f8ff626ea08a5c3485573a|.33A4.19AB2C2A.16A2C6A.14AC9A.13AC9A.14AC8A.14AC8A.15AC6A.17AC2A3.18AD3A.20AD2A.21AD2A.20AD3A.20ADEA.20AE3A.20AE3A.20AE2A.21AEDA.20AD3A.20ADCA.20AC2A.21A2.30',
    'axe.t3': '0c07146878aed8a0308a5c3485573a|.35A5.18AB5A.15A2B7A.13AB9A.11A2B10A.10AB12A.9AB13A.9AB7CB4A.10AB7CB2A2.12AB6CD2A.14AB4A2D2A.15A4.2AD2A.20AD3A.20AE2A.20AE3A.20AE3A.20AE2A.20AE3A.20AD3A.20ADBA.20AB2A.21A2.28',
    'axe.t4': '0c0714cfd4ec8b8fb8d8a030ffffff1e4ccc6878ae85573a|.34A5.17A2B2C3A.15ADABC5A.12A3D2C7A.10AE2CD2C7A.9AC5D2C6A.9AC6F2C5A.9AC6FDC5A.9AC7D2C3A.11AC6DG2A2.13AC5AG2A.15AC3A.AG2A.15A3.2AG3A.20AH2A.20AH3A.20AH3A.20AH2A.21AHGA.20AG3A.20AGDA.20AD2A.21A2.28',
    'axe.t5': '0c0714bff4ffd8a0308b8fb885573a|.34A5.18AB5A.16ACB6A.12A3C3B6A.10AB2C3B7A.9AB4C3B6A.9AB5C3B5A.9AB6C2B5A.9AB7C2B3A.11AB6CD2A2.13AB5AD2A.15AB3A.AD2A.15A3.2AD3A.20AE2A.20AE3A.20AE3A.20AE2A.21AEDA.20AD3A.20ADCA.20AC2A.21A2.28',
    'axe.t6': '0c071440d878ffffff52508a4cf08a85573a|.33A6.16A2BC4BA.14ACB2C2B4A.12AC3DB7A.10AC3D2B7A.9AC4BD2E3B3A.9AB5D3B5A.9AB6D2B5A.9AB7D2B3A.10AB7D3A2.12AB6AD2A.14AB4A.AD2A.14A4.2AD3A.20ADF2A.19AF3A.20AF3A.19AF4A.19AF3A.20AD3A.20AD2A.20AD2A.21A2.28',
    'hammer.t1': '0c07148a5c343a24145e3c22b8865467677485573a|.33A2.20A2B2A.18AC2B2DA.15A2E3BFD2A.13AFE2B3FD2A.13AFEB5FDA.13AFB6F2A.13AF2B5A2.15AFB3C2A.16AFBA3B2A.16A2.3AB2A.20AB2A.21AB2A.20AB3A.20ABG2A.20AG2A.20AG3A.20AG3A.20AGBA.20AB3A.20AB2A.21A2.29',
    'hammer.t2': '0c0714626ea03842701c2140a6b0d48a5c3485573a|.33A3.19A2B2CA.16A2D2B2C2A.14AB2E2BC3A.13AB8CA.13AB8CA.13AB9A.14AB6A2.16AB3AF2A.16AB2A2F3A.16A2.2AF2A.21AF2A.20AF3A.20AFGA.20AG3A.20AG3A.20AG2A.21AGFA.20AF3A.20AFBA.20AB2A.21A2.29',
    'hammer.t3': '0c07149a64146878aed8a030b0bfe83a24148a5c3485573a|.35A3.19A2B3A.16A2C2B3A.14A2C5B3A.12AC8DB2A.10ADE2C6DB2A.10AD2C8BA.12ADC7A2.13AD2C4F2A.15ADC3AG2A.16A4.AG2A.21AG2A.20AG3A.20AH2A.20AH3A.20AH3A.20AH2A.20AH3A.20AH2A.21AC2A.20AC2A.21A2.28',
    'hammer.t4': '0c07149a64148b8fb8d8a030cfd4ecffffff1e24406878ae85573a|.35A3.17A4B3A.15AC4BDB2A.13A2C5DB2A.12AC8DB2A.10AE2C3FC3D2BA.10AE2C3F2C3DA.12ADC3FC3A2.13AD2C4G2A.15ADC3AH2A.16A4.AH2A.21AH2A.20AH3A.20AI2A.20AI3A.20AI3A.20AI2A.20AI2HA.20AH2A.21AD2A.20AD2A.21A2.28',
    'hammer.t5': '0c0714d8a0309a6414bff4fffff4c02a28428b8fb885573a|.33A5.17A2BC4A.15AB3DB2C2A.12A2EB2D3BC2A.11ABE2D6BC2A.10ABD8B2CA.10ABD9BA.12ABD7A2.13AB2D4F2A.15ABD3AG2A.16A4.AG2A.21AG2A.20AG3A.20AH2A.20AH3A.20AH3A.20AH2A.20AH2GA.20AG2A.21AB2A.20AB2A.21A2.28',
    'hammer.t6': '0c07148480b86878ae3a4672fff0c052508aff5a1eff6a2a221e3885573a|.33A5.17A2B2CD2A.14A2E2B2C2D2A.12AE4B2FCD2A.12AFEB2F4CD2A.10AF3G2HGF2C2DA.10AF4GHGF3CDA.11ACF2GHG2F2A2.12AC2F2G2I2A.15ACF3AIFA.15AC2A2.AF2A.15A2.4AF2A.20AF3A.20AJ2A.20AJ3A.20AJ3A.20AJ2A.20AJ2FA.20AF2A.21AC2A.20AC2A.21A2.28',
    'halberd.t1': '0c071467677444444f8a5c345e3c2285573a5e3a24|.31A6.17AB6A.16AB6CA.15AB2CB3CA.16ABCBC2A.18ADBA2.19ADEA.20ADEA.21ADA.21ADEA.20ADEA.21ADEA.20ADEA.21AEA.21AFGA.20AFGA.21AFGA.20AFGA.20AD2A.21ADEA.20ADEA.21A2.32',
    'halberd.t2': '0c0714626ea03842708a5c345e3c225e3a2485573a|.31A2.A4.16ABCAB4A.15ABCB5CA.14AB2CB4CA.14AB2CB3C2A.15ABCB2C2A.17ADEA3.18ADEA.21ADA.21ADEA.20ADEA.21ADEA.20ADEA.21AEA.21AEFA.20AF2A.21AGFA.20AGFA.20AE2A.21AE2A.20AC2A.21A2.32',
    'halberd.t3': '0c07146878ae3a46728a5c345e3c225e3a2485573a|.35A2.19A3B2A.17AB6A.16AB6CA.15AC2B4CA.15AC2B3C2A.16AC5A.17AD2A3.19ADA.21ADEA.20ADEA.21ADA.21ADEA.21AEA.21AF2A.20AGFA.20AG2FA.20AGFA.20AGFA.21AFCA.20AC2A.21A2.32',
    'halberd.t4': '0c07148b8fb8535478d8a0301e4ccc6878ae3a46725e3a2485573a|.34A4.17A3B4A.15AB8A.14AB8CA.13AD3B5CA.14AE2B5A.16AD2C3A.17AD2A3.19AFA.21AFGA.20AFGA.21AFA.21AFGA.21AGA.21AH2A.20AIHA.20AI2HA.20AIHA.20AG2A.21AG2A.20AG2A.21A2.32',
    'halberd.t5': '0c0714bff4ffd8a0308b8fb853547885573a|.33A.22ABA.2A2.18ABA2B2A.15A3BCB4A.13AB2CBCB5A.11AB4C2B5A.11AB5CB4A.12AB5C2B2A.14AB3A2DA2.16A3.ADEA.20ADEA.21ADA.21ADEA.20ADEA.21AE2A.20AF2A.20AF2A.21AF2A.20AE2A.21AEA.22A.55',
    'halberd.t6': '0c07148a80f052508a4a44b034305ab9a8ff5e3a2485573a|.34A4.17A3B3CA.15AD2B3C3A.15AB4C3A.15ACEF2C2EA.15ACEDFDE2A.16ACD4A.17AC2A3.19ACA.21ACEA.20ACEA.21ACA.21ACEA.21AEA.21AG2A.20AHGA.20AH2GA.20AHGA.20AC2A.21ACEA.20ACEA.21A2.32',
    'bow.t1': '0c0714c4ab805e3c228a5c348c7352b886545c4630b07e5685573a5e3a24|.140A2.20A2BCA.17A2B2DCA.16AB3D2CA.14A2EBAFDCA.13A2E2GAF2DCA.11A2E3AF3D2A.11AB3A2F3D3A.9A2EBA2F5C2A.8A2E2GAF3H2I2C2A.6A2E3F5I4J2A.6ADB2F5D2I3J2A.7AD5C4DIJ2A2.9A13.129',
    'bow.t2': '0c0714a6b0d4c4ab803842708a5c34b886548c7352b07e5685573a5c4630626ea05e3a245e3c22|.139A2.21AB2A.18A2CD2A.17AC3EA.16A2C2FE2A.14A2G2AF2EA.13A2G3AF2E2A.12AC3F5EA.11A2C2AF4E3A.9A2G2A2F2H2I2EA.8A2CGJF4I5A.8AKCF4E2FI2L2A.9AKE2M3A7.11A6.136',
    'bow.t3': '0c0714c4ab803a4672b0bfe88c73529a6414b07e5685573a5c46306878aeffffff5e3a24|.138A3.19A2B3A.17AB3C2A.15A2B2D2CA.14A2E2AD2C2A.12A2E3AD2C2A.12AB3D5CA.11A2B2AD4F2CA.9A2E2A2D2G2HF3A.7A2IEID2J2H5FA.7AB3K2DJ3H2L2A2.8AJ5C2A2F2A2.11A7.2A2.155',
    'bow.t4': '0c0714f0c858c4ab808b8fb88c73525c4630535478cfd4ec9a6414b07e5685573a5e3a24d8a030|.139A2.21AB2A.18A2CDBA.16A2E2D2A.16AFEFGD2A.14A2C2G4A.13A2CEAHG3A.12A2E2AH3IG2A.11AC3AH2J2I3A.9A2C2H2BHK4IA.8A2CEH4BK2L2A2.8AM2D6AK2A2.10AM2A6.A2.13A2.140',
    'bow.t5': '0c0714bff4fff0c858d8a03085573a9a6414fff4c0|.138A4.18A2B2CDA.16AB3A3.15A2B4A.15A2B5A.14A2B6A.14AB2AC2DB2A.12A2B2C4D3A.10A2B3C2E2D2CA.9A2B5CD2E2A2.9AB7D3EA.11AF2A5GA3.12AFA.5A.16A.141',
    'bow.t6': '0c0714d8a030ffffff8c7352c4ab80c88a14fff0a85c4630ffd75a85573a|.138A4.18A2B2C2A.16AD3A3.15A2E2F2A.15A2D2G2FA.14A2EDHG3A.14AD2AG2I3A.12A2E2G3I4A.10A2EDAG2J2I2GA.9A2EDIC2GI2J2A2.9ABEC2I6JA.11AB2A5CA3.12AFA.5A.16A.141',
    'crossbow.t1': '0c0714b886548a5c34f4f8ff5e3c223a24149494a2626ea067677425252f|.140A2.19A3B2A.17ACB2C2A.15A2C5A.14A2C5A2.12A3BDB2ECA.11A3F3BDBE2G2A.7A3B4C2H3EI3A.6AB5FC3E2J2A3.6AB4C2FCE2J2A2.9ABC5FCEA3.11AC2E3A4.15A5.161',
    'crossbow.t2': '0c0714626ea0a6b0d43842709494a244444f25252f1c2140676774|.140A2.19A3B2A.17AB5A.14A3B5A.13A2C2D2B3A.12A2C3E2F2A2.10A3G2B3EF2C2A.7A3E2HGB4HFB3A.6AE5HB4H3A3.6AE4IGB2D2H2A2.9AEI4GD3A3.11AI2F3A4.15A5.161',
    'crossbow.t3': '0c0714b0bfe86878ae5a3608a6b0d43842701c2140626ea03a4672|.139A3.19A2B3A.17AC5A.13A4C5A.13AD2E2FG3A.12A2D2E3FGA2.10A3G2DH2EF2B2A.7A3E2G2C2H3FC3A.6AE5C4IH2FA3.6AE4HGC2I4A2.9AEH4GC2IA3.11AH2F3AC2A.15A5.A2.158',
    'crossbow.t4': '0c07148b8fb8cfd4ecb0bfe86878ae2a28421e2440d8a030535478f0c8583a46729a6414|.138A4.18A2B4A.15A2C2B2A2.15AB5A.14A3B4A2.13A2D3EF2A.12A3GC2BDEHC2A.8A3D2G2CB2DH3CA.7AD4GB3I2H4A.8AD2E2GBI4A4.9AE4J2IA3.13AEK2AL2A.17A3.A2.160',
    'crossbow.t5': '0c0714bff4ff5a3608f0c858d8a030|.140A2.20A2B2A.17A2B3A.16A2B3A2.15A2B4A.14A3B4A2.13A2C2D2B2A.13A2C3BDE2B2A.9A3D2CB4EB2A.9AD5B5A3.10ADE3B4A2.13AE3B3A2.16A6.160',
    'crossbow.t6': '0c07143ec0ffffffffa4ecff1c6ab08480b852508a0c2a5a221e3834305a|.140A2.20A2B2A.17A2C2B2A.15A2BD2E2A.15AB4DA2.13A3B3E2A.13A2F3GH2A2.11A3ID2BFG2B2A.8A3F2I2DB2J2B3A.7AF4IB2E3J2A3.8AF2G2IBD2H2A2.11AG4D3A3.13AGJ2AE2A.17A3.A2.136',
    'chakram.t1': '0c0714b07e5685573a6767745e3a249494a244444fc8c8d4|.43A2.11A6.4ABCA.8A2D6A.2AB2CEA.6AF2D7A2B2C2EA.5AF2D3G3D3B2E3A.5AF2D2G7D2E3A.5AF3DG2A4GD3E2A.6AF2DG2A.4AC2D2A.6AFHD2GA.5ACD3GA.5AFHDGA.7AD3GA.5AFHDGA.7AD3GA.5AFHDGA.7AF2DGA.5AFD2GA.7AFHDGA.5AD3GA.7AFHDGA.5AD3GA.6AF2DG2A.5AD3G2A.4A2F2DGA.7AD3G2A4DF2DG2A.7AD4G2D7GA.9AD10G2A.11AG4D3G3A.13AG8A.15A8.34',
    'chakram.t2': '0c0714626ea0b07e565e3a24a6b0d4384270f4f8ff|.36A2.19A3B2A.3A3.10A2B6A3C2DA.8AE2B6F2C2D2A.7AE2B3F4BF2D3A.6AE3BF6B2FD2A.7AEB2F2A4FB3FA.7AEGB2FA.4AB3FA.7AEGBFA.5AB3FA.6AB2GBFA.6AEB2FA.5ABEB2FA.6AEB2FA.6AEB2FA.6AEB2FA.6AEB2FA.5AEGBFA.7AB3FA.5AEGBFA.7AB3F2A.2A2E2B2FA.8AB3F2A2BE2B3A.9AB4FB7A.11AB8F2A.13AF8A.15A2F4A2.18A4.59',
    'chakram.t3': '0c07146878aeb0bfe83a4672d8a0305e3a24ffffff9a14289a6414|.57A5.17A2B5A2.A3.10AC2B5D2AE2FA.8AC2B2D7E2FA.7AC2B2D6BDE2A.8AC2B2E5B3DA.8ACGBDE3AE3B2DA.8ACGBDEA2.AE2B3DA.6AB3DE2A5EB3DA.6AB3DEA2H3AE2B2DA.6ABCBDEA2H3AEC2BDA.7ACBDE2A4E2C2BDA.7AB2D2E2A2E3B2DA.8AB3DE6B3DA.8AB4D2I2B5A.10AB11A.12AB2DB4D2A.14AD7A.16A2D2A3.19A2.61',
    'chakram.t4': '0c07148b8fb8d8a030cfd4ecf0c85885573a535478b4b4d8ffffff6e6a964a8cff1e4ccc9a6414|.36A2.A.17A3B2ACA.14A2DB5CA5.9ACD2B7E2F2A.8AD2B2G4B2GC2FA.7AD2G3H3G2BGC2A.7ADIBG2H5B4CA.7ADIBGH2J3H2B3GA.7AIBGIJHA3H2JB2GA.6ABIBGIJAK2A2HJB2GA.6ABIBGHJAK2LAJ2B2GA.6AB3GHJAL3J3IBGA.5AC2B2GHJA4J3IBGA.6AB3GH3A2H2JB3GA.7AB3GH6D2BGA.8AB3G2J4D2G3A.9AB3G2B5G2A.11AB8G2A.13AG8A.14ACMG3A3.16A5.59',
    'chakram.t5': '0c0714bff4fff0c8589a6414d8a030|.37A.22ABA.16A.A3B2A2.14ABAB7A3.11AB10C2A.10AB10D2A.9AB12DA.8AB7AB6A.8AB5A4B5A.7AB6AE2AB5A.7AB5A2E2A2B4A.8AB4A2E2AB6A.7AB5A4B5A.8AB5A3B6A.8AB13A.9AB12A.10AB12A.11A3B9A.14AB4A4.16ABA2.21A.61',
    'chakram.t6': '0c0714ffffff52508a34305a8480b89a44ffe4e0ff5a2aa0a652ffd6b0ff|.58A3.20AB2CA2.17ACBC4A.A3.11AC8ACD2A.9AEC2D4C4D2A.8AE2CD2F2D2C3DA.8AGCDCF6C2D2A.8AGCDBH5FHC2DA.7ACGCDBHA3F2HC2DA.6AC4B2A2F2AF2C2DA.6AC2I3HAB2HAF2C2DA.7AC3FHAF2HABFGCDA.7AC3F2HA3JBHGCDA.7AC3DFH2AJ2H2GCDA.7AC3DF7C2D2A.8AC4H5C3DA.9AC12A.11A2CDC5D2A.14AD6A2.16A6.58',
    'staff.t1': '0c07148a5c345e3c225e3a2485573a|.32A2.21AB2A.20ABCA.20AC2A.21ACA.21ABCA.20ABCA.21ABA.21ABCA.20ABCA.21ABCA.20ABCA.21ABA.21ABDA.20AD2A.21AE2A.20AECA.20AC2A.21ABCA.20ABCA.21A2.56',
    'staff.t2': '0c07144a8cff626ea08a5c345e3c225e3a2485573a|.32A2.21ABCA.20ABCA.20AC2A.20ACDA.21ADEA.20ADEA.21ADA.21ADEA.20ADEA.21ADA.21ADEA.21AEA.21AEFA.20AF2A.21AG2A.20AGEA.20AE2A.21ADEA.20ADEA.20AC2A.21A2.32',
    'staff.t3': '0c0714e0384c9a14285e3c228a5c345e3a24d8a030|.31A3.20AB2CA.19AB2CA.19AC3A.20AD2A.21AEDA.20AEDA.21AEA.21AEDA.20AEDA.21AEA.21AEDA.21ADA.21AE2A.20AF2A.21AF2A.20AG2A.20AE2A.21AEDA.20AEDA.20AG2A.21A2.32',
    'staff.t4': '0c0714d8a0301e4ccce0475e8b8fb85354785e3a24|.32A2.21AB2A2.18ABC4A.17AB2C3A.18AB3DA.19ADEDA.19ADE2A.20A2EA.21AEFA.20AEFA.21AEA.21AEFA.21AFA.21AE2A.20AG2A.21AG2A.20AB2A.20AE2A.21AEA.21AEBA.20AB2A.21A2.31',
    'staff.t5': '0c0714bff4ffd8a0306e6a96b4b4d85e3a24|.33A3.19A2B2CA.17ACB3CA.17ACB3CA.18AC4A.19AC2A.21AD2A.21ADA.21AEDA.20AEDA.21AEA.21AEDA.21ADA.21AE2A.20AF2A.21AFA.21AF2A.20AE2A.21AEA.21AECA.20AC2A.21A2.31',
    'staff.t6': '0c0714ffb060ff5a1ea8240c52508a34305a5e3a24d8a030|.32A4.19AB2C2A.17ACB2CDA.17ACBC2DA.18AC3DA.19ACEA.21AEFA.21AFA.21AEFA.20AEFA.21AEA.21AEFA.21AFA.21AE2A.20AG2A.21AGA.21AE2A.20AE2A.21AEA.21AEHA.20AH2A.21A2.31',
    'wand.t1': '0c0714b886548a5c345e3c225e3a2485573a|.55A3.20AB2CA.19AB2CDA.18AC3DA.18AC2D2A.19AD3A.20AD3A.20ACDA.20ACDA.20AC2DA.20ACDA.20AC2DA.20ACDA.20ACDEA.19AF2E2A.19AFE2A.19AF2EA.19AF2E2A.19AFE2A.20A3.55',
    'wand.t2': '0c07144a8cffffffff1e4ccc384270626ea044444f676774a6b0d45e3a2485573a|.31A3.20AB3A.19AC2BDA.18AB3DA.18AB2D2A.19AD2EA.19AF2E2A.19AFEGA.20AHGA.20AHGA.20AH2GA.20AHGA.20AH3A.19AI3JA.19AJ3A.19AK2J2A.19AKJ2A.19AK2JA.19AK2J2A.19AKJ2A.20AE2A.21A2.31',
    'wand.t3': '0c0714ff98a8e0384cffffff9a14289a6414d8a030384270626ea05e3a2485573a|.31A3.20AB2CA.19AD2CEA.18AC2E2A.18ACE2FA.19AG2F2A.18AG3FA.19AG2HA.20AIHA.20AI2HA.20AIHA.20AIH2A.20AH2A.20AH2JA.19AK2JA.19AK2J2A.19AK2JA.19AK2JA.20AKJFA.19AG2FA.20A3.55',
    'wand.t4': '0c0714d8a0304a8cff1e4ccc9a64143a46726878ae5e3a2485573a|.32A2.21AB2A.19ACBC2A.17AC5A.17AC2D2EA.18A2B2E2A.19AB2EA.19AB2FA.20AF2A.21AGFA.20AGFA.20AG3A.20AG2A.20AG2HA.19AI2HA.20AIH2A.19AI2HA.20AIHA.20AB3A.20AB2A.21A2.55',
    'wand.t5': '0c0714bff4ffd8a0309a64145e3a2485573a|.33A.2A.19ABA2BA.17A2B4A2.15AB8A.14A2B6A.14AB9A.14A3BC2DBA.17ABC2D2A.18A2CD2A.20ACDA.20ACDA.21ACDA.20ACDA.20AC3A.20AC2A.20AC2EA.19AF2EA.20AFE2A.19AF2EA.20AFEA.20AC2A.21A2.30',
    'wand.t6': '0c0714f0f4ffc4c8e8c0b0988a7a6ad8e4ff85573a5e3a24|.32A3.19A2BC2A.17ADB3CEA.16ADB3CEA.17ABF3EA.18AD3EA.19AD2E2A.18AD2E2A.19AD2EA.20ADEA.20ADE2A.20ADEA.20ADEA.21AE2A.20AE3A.19AG2HA.19AG2H2A.19AGH2A.19AG2HA.20AGHEA.19AD2EA.20A3.30',
    'orb.t1': '0c07145f86ae9cc2e03a587e8a5c345e3c223a24145e3a2485573a|.34A3.19A2B3A2.16AC2B5A.14AC5B4A.12AC6B4DA.10AC7B3D3A.9AC8B3EDA.9AC7B3DE2A.9AC7B3D2EFA.8AFBC3B5D2EFA.8AFB8D3FA.9AFB7D4FA.9AF2B4D5F2A.10AF2D7F3A.11A2G3D2G2F2A.14A2G3F3HA.16A3F2H2A.18AI3H2A.18AI2H2A.18AI3HA.19AIH2A.20A3.30',
    'orb.t2': '0c07146a7f9c98aac4465a78384270626ea01c21405e3a2485573a|.56A6.17AB6A.15AC4B4A.13AC5B4DA.11AC6B4D2A.10AC7B3D2A.10AC7B3D2A.10AC6B3D2E2A.9ABC4B4D2E2A.9AB8D3EA.10AFB6D4EA.10AFEB3D5G2A.11AE2D6G2A.13A2G8A.15A2GF2G2HA.17A2I2H2A.19AI2H2A.18AI2H2A.19AIH2A.20A3.55',
    'orb.t3': '0c0714e0384cff98a8ffffff4a0614d8a0309a14289a64143a46725a36081e2440f0c8585e3a2485573a|.56A7.16AB7A.14AC5B4A.12AC3D3B4EA.11AC2D4B3E3A.9AECD6B3FEA.9AECD6B3F2A.9AFC2D4B3G2FHA.8AFC3DB5G2FHA.8AFHB7G3IA.9AFHB6G4IA.9AFHIB3G5I2A.10AHI2G6JIA.12A3K3J5A.15A2KJF2L2A.17A2F4A.19AF2M2A.18AN2M2A.19ANM2A.20A3.54',
    'orb.t4': '0c07144a8cffb8dcffffffff0c2470d8a0309a64141e4ccc5354785a360885573a5e3a24b8324a|.33A5.17A2B5A.15AC4B4A.13AC3D2B4EA.12AC2D4B2E3A.10ABCD5B3F2A.10ABCD5B3F2GA.9AFC2D3B3H2FGA.9AFB8H2IA.10AF2B6H3IA.10AF2B5H4IA.11AFH9A.13A2H4J3FA.15A2J2G2F2A.17A2GF3A.19AK2L2A.18AK2L2A.19AKM2A.20AM3A.20A2MA.22A.54',
    'orb.t5': '0c0714bff4ff9a64145a3608d8a03085573a5e3a24|.36A.22ABA.21ABA.15A3.A2B2A2.3A2.8AB3AB6A3B2A.8AB13A.10AB11A.10AB12A.7A3B13A4.3AB20A.3A2B13CB3A.6A2B11CA3.8AB11CA.10AC2B9CA.9AB2C2B7DBA.10A4D2B3D3ABA.13A2BD4EA2.15ABAE4A.17A.AF2G2A.18AF2G2A.19AF2A.21A2.31',
    'orb.t6': '0c07149a44ffd6b0ffffffff5a2aa02a0e5a221e3852508aa652ff34305a5e3a2485573a|.35A2.21AB2A.20AB2A.20AB2A.19A5.18AB5A.16AC3B4A.14AC2D3B3EA.12AC2D4B3E2A.11AC2D4B2F2EA.11ABCD4B4GA.11AB10GA.11AB7EF2GA.11AH2B2I3E3A.13AHE7GA.14A2G7A.16A3G2J2A.19AGJKA.19AL2KA.20ALKA.21A2.56',
    'daggers.t1': '0c071467677485573ab07e5644444f25252f9494a2c8c8d4|.33A2.21AB2A.16A2.2AB2CA.14AB2A.2AC3A3.11AB2A.3AC3B2A.10ADCA.4ACB2EA.10ADCA.4AB3EA.10ADCA.3AB6A.9AB3A.2AB2AB4A.7AE2B2FA.2A2.AB3EA.6AE2BEFA.6AB2EA.7AGBEA.8AB3A.6AG2EA.9AB2A.6AGHEA.10A2.7AGHEA.19AGHEA.20AHEA.20AHEA.20AGEA.20AGBA.20AGBA.21A2.41',
    'daggers.t2': '0c0714626ea085573aa6b0d4b07e563842701c2140f4f8ff|.33A2.21AB2A.16A2.2AB3A.14AB2A.AB2CA4.11AB2A.2A2C3B2A.10ABCA.3AC2DB2A.10AECA.4AD2B2A.10AECA.3ADB4FA.9AECA.3ADB4FA.8AF2BFA.3A4B3A.7AF2BFGA.6AB3A.7ADBFGA.7AB3A.6ADBFA.9AB2A.6ADHFA.10ABA.6ADHFA.11A.8AHFA.20AHFA.20AHBA.20ADBA.20ADBA.20ADBA.21A2.41',
    'daggers.t3': '0c0714f0c858d8a0309a6414fff4c085573ab0bfe86878ae3a46725a3608ffffff|.33A2.21ABCA.16A2.2ABC2A.2A2.10AB2A.AC4A2D2A.9AB2A.2AE2C2D3A.9ABFA.3AC2GHDA.10AF2A.4AG2H2A.10ABCA.4AH5A.8A2BC2A.2AD2H4A.7AD3HIA2.2A4H3A.6AD3HIJDA.5AH3A.6A2GHIJDA.6AH3A.6AG2IA2.8AH2A.6AGKIA.10AH2A.5AGKIA.11A2.6AGKIA.20AKIA.20AKIA.20AGHA.20AGHA.20AGHA.21A2.41',
    'daggers.t4': '0c0714e0475e4a8cffff8a9ad8a030f0c8589a641485573a8b8fb85354785a3608cfd4ecffffff|.32A2.21AB2A.17A.2AB2CA.15ADA.2AC3A.A2.11AD2A.2ACE2AFGA.10AE2A.3AE3FGA.10AEHA.4AEI2A2.10AH2A.4AI5A.9AF2A.3AE2I5A.8AFIJA.3A3I5A.6AG2IJKA.5A2I3JA.5AGLI2KA.7AJ4A.5ALIJA.9A4.6ALIJA.19ALIJA.19ALIJA.19ALIA.20AMIA.20AMJA.20AMJA.21A2.66',
    'daggers.t5': '0c0714f0c858d8a03085573ab07e56bff4ff9a6414fff4c05a3608|.57A2.21AB2A.20AC2DA.2A2.11A2.3A2D2A2C2A.9AEDA.4ADF2GAGA.8AEDA.4AF4A2.9AEDA.4ACF3A.10AEDA.4ACF4A.9ACF2A.2AHA3F3A.7AC2F2A.3ACA.AF2A.8AF3IA.2ACA.2AF2A.7AF3IA.3A.4AF2A.6AF3A.10AF2A.6AF2A.11A2.7AF2A.20AF2A.20AF2A.20AF2A.20AF2A.21A2.65',
    'daggers.t6': '0c0714ecebfab4b4d885573ab07e5652508a1c6ab034305a5fd4ff3ec0ff8480b80c2a5a|.57A2.21AB2A.20AC2DA4.12A2.3A2DC4A.10AEDA.3AC2F3A.10AEDA.4AF4A.10ABCA.3AG2F4A.9ABCA.3AG3F4A.7AB2FHA.3A4I2FHA.6AJ2FH2A.5AI2H3A.5AJKFHLA.6A3H2A.6AKFHLA.9A2.7AKI2A.19AKFHA.19AKFHA.19AKF2A.19AKHA.20AH2A.21A2.90',
    'claws.t1': '0c071485573a8e7c62b07e566a58485e3a24b2a284|.82A2.21AB2A.A3.11A2.3AB3AB2CA.9ADBA.3AB4C3A.8ADBA.4AB2C5A.7ADBA.3ADB2C6A.6ADBA.3ADCBC3AE3A.4AF2BFA.2AC7A3.4AG2EF3A.2AC7A.5AG2EC3A.3AC3AC2EA.4AG2EC3A.4AC2EAE2A.4AG2C4A.5AE2A3.5AG2C4A.6A2.8AGC5A.16AGCGC3A.16AGCGC3A.17A3CA2.21A.90',
    'claws.t2': '0c071485573a626ea0b07e56a6b0d4384270f4f8ff|.83A.2A2.18ABA2C2A.11A2.4AB2C4A.9ADBA.4ABC5A.8ADBA.3AE2C6A2.6ADBA.3AEC7F2A.4AF2BA2.2AC6A2F2A.3AF6A.AC7A3.4AG2FC3A.2A2C6A.6AGFC3A.4AC2A3.7AGC4A.5AF2A.8AGC4A.6A2.9AGC4A.17AC5A.18A2C3A.19ACA2.21A.114',
    'claws.t3': '0c071485573ad8a0306878aeb07e56f0c8583a4672fff4c0ffffffb0bfe8|.82A3.A2.17AB2CAC2A.11A2.3ABC4D2A.9AEBA.3AC4D3A.8AEBA.3AF2D6A2.6AC2A.3AFD7G2A.4AC3A2.2ACD5A2G2A.3AH2D4A.ACD6A3.4AI2GD3A.2A2D5GA.6AIGD3A.4AD2GAG2A.5AID4A.5ADGA3.6AID4A.6A2.9AIDJD2A.17AIDJD2A.18A2JD2A.19AD3A.19ADA2.21A.90',
    'claws.t4': '0c0714e0475e85573ad8a030ff8a9a8b8fb8f0c8585354781e4cccffffffcfd4ec|.57A.22ABA.21AB2A.2A2.12A.4AC2A2D2A.10AEA.3ACD4F2A.9AECA.3AD4F3A.8AC2A.3AGD2F5A2.6AD2A.3AGD2F6HA.5AD2A2.2ADF5A2H2A.4AF2I3A.ADF7A2.5AJF4A.2A2F6HA.5AJF4A.4AF2HAH3A.4AJF4A.5AH3A3.5AJF4A.6A3.8AF5A.17AF5A.17AFKF3A.18AKFJFA.18AKFJA.20A3.65',
    'claws.t5': '0c071485573ad8a030bff4ff9a6414f0c858|.57A2.21AB2A5.16AB2C3DCA.10A2.4AC4D2EA.8AB2A.4ACD6A.7AC2A.3AC2D7A2.5AC2A2.2ACD5AD4A.3ACDE3A.AFD6A2DA.4ACD4A.AC2D6A2.5AD5A.2ACAD3AD2A2.4AD5A.3A.AD3A2D2A.3AD5A.6A2DA.A2.4AD5A.8A.8AD5A.17AD5A.17AD4A.19A2D2A.20ADA.22A.91',
    'claws.t6': '0c071485573ab4b4d852508aecebfa34305aff6a2aa8240ce4e0fffff0c0ff5a1e|.57A2.21AB2A4.17AB2C3DA.11A2.4AC4D2A2.8AB2A.4AC2D5A.7AECA.3AC3D5FA2.5AECA2.2ACD2G2DAF4A.3AE2H3A.ACD6AF3A.3AID2F2A.2A2D5FA3.4AID3FA.4AD2F4A.5AID3FA.5AD3AFA.5AIDG2FA.6A3.A.6AID3FA.17AID3FA.17AD4FA.17AD3J2A.18A2KJA.20AK2A.21A2.90',
    'fans.t1': '0c0714b4a2848c7a64d4c6a26a4a304a3020b07e563842705e3a243a2216|.111A5.17A2B4CA.15AD2B2CBC2A.10A2.2AD2BC5A.8A2B2A.AB2C2EC2A.8AD2B2CA.ABE4A.8AD2B2C2A.ABE4A.7AD2BC3A.2AE2F2A.8ADB2C2EA.2AGEFA.8AD2BCE3A.2AGH2A.8AB2C3EFA.2AGIA.10AC2F4A.2AI2A.11A2F4A.3A2.14AJ2A.20AJ2A.21A2.111',
    'fans.t2': '0c0714b4a284d4c6a28c7a6444444f676774b07e563842705e3a243a2216|.88A2.20A2B2A2.17ACB3D2A.15AC2B2D4A.9A3.2ACD7A.8AB3A.ABDEDFDFA.8ACB3DA2BDEDF3A.7AC2B2D2A.ADF4A.7ACB2D3A.2AF4A.7AC2BD3FA.2AGF2A.7AC2BD4FA.2AGH2A.7AB3D3F2A.2AGIA.9ABD2E4A.2AI2A.10A3E4A.3A2.14AJ2A.20AJ2A.21A2.111',
    'fans.t3': '0c0714d47a80b0505a8a3a44d8a0309a6414b07e565e3a243a2216|.111A5.17A2BC4A.15ABCBC3D2A.14ABCD6A.9A4.AC2D2ED3A.7A2C3DA2CDFDED2A.7AB2C2D2A2CDFE3A.7AB2D5A.AEFE2A.8ABCD3EA.2AE2F2A.7AB2CDFDEA.2AGH2A.7AB2D3F2EA.2AGHA.8AC2D2F4A.2AH2A.9A2D2F3A.4A2.12A3I2A.20AI2A.21A2.111',
    'fans.t4': '0c07147ca4dc244a828b8fb8535478b07e56ff8a9a3a2216b8324a|.88A2.20A2B2A2.17AB6A.15AB3CBC3A.9A4.AB2C2DB3A.8AB4A2BC3DB2A.8AB5A2C2EC2DA.8AB2CBC2A.AE2D3A.7AB3C3A.2AE3DA.8AB2C3DA.2AFE2A.8AB2C4DA.2AF2EA.8AB2C3EDA.2AF2A.9AB2E4A.3AFA.11A3E3A.2AGFA.14AH2A.2AGFA.15AH2A.2A2.16AI2A.21A2.86',
    'fans.t5': '0c0714bff4ffd8a0309a6414b07e563a2216|.113A.21A2BA2.18AB3ABA2.14A2B6ABA.9A4B10A.8AB9CB3A.8AB4A2B6CA.8AB5A2B3CBCA.8AB5DA.ACDC2A.8AB6A.2ACD2A.9AB3DBCA.2AED2A.8AB5C2A.2AE2A.8AB6C2A.3A2.10AB3D3A.17A4F2A.21A2.111',
    'fans.t6': '0c071458468a3e3060f0f030a8a81852508affe6307c68b034305ab07e56|.110A5.18AB4CA2.13A3B5CB2A.9A3D3B2C2BCB2A.8AEB2D3C6BA.7A2E2B2DACFCG2C2A.7AH2C4A2CFCF2CA.7AH2C5A.AFIF2A.8AHC2IC2A.2AI3A.9AB2CICFA.2AJ2IA.8AB2C3F2A.2AJ2A.9AC5F2A.3A2.10AC2I4A.17A4I2A.21A2.136',
    'buckler.t1': '0c0714626ea0384270a6b0d4f4f8ff25252f67677444444f|.34A7.15A2B6CA.13AB8C2A.11AD4B4C4A.9AE2D2C10A.7AE3DC2F6C4A.5AE4BCGFH6C3A.5AE3B2G2H7B2CA.4AD3B2G3H8BCA.4AD3BFG2H9BCA.4ABDBCFGH9DBCA.4ABDBCFH10DBCA.4ABDBCFH10DBCA.4AB2C2FH9B3A.5AB3CFH8B3A.6AB3CFH7B4A.7AB2C2H5D2B3A.9AC4B6C2A.11AC5B2C2A2.13A2C5A2.17A5.59',
    'buckler.t2': '0c07146878ae3a4672b0bfe8ffffff1c2140384270626ea0|.59A5.17A2B4CA.14A2B6C2A.12AB8C3A.10AD4C9A.8AE2D2C2F3GF2C3A.7AE3BCF2G6BCA.6AE3B2H2G7BCA.6ABDB2H6G4BCA.5AB2DBFH5G5BCA.5AB3CFHGH2G6BCA.5AB3CFG2HG6B2CA.5AB3CFG9B2CA.5AB3CFG8C2BA.7AB2CFG7B2CA.8AB2C2G6B3CA.9AC4B7A2.11A2C4B2C2A.15A2C4A2.18A4.59',
    'buckler.t3': '0c0714d8a0309a6414f0c858fff4c03a46721e24406878ae|.58A6.16A2B5CA2.13AB7C3A.11AD4B3C4A.10AE2D2C4FC4A.8ADE2B3GBF2G2C3A.6AD2E2BG3BF5BCA.6ADE3GH3BF5BC2A.5ABDC2GH4F5B2CA.4AB2DCGHFH3F2B3DBCA.4ABDBCGHFH2F3BF2DBA.5ABDBCB3HF6B2CA.5AB3CGF9B2CA.5AB3CGF4CF3B3A.7AB2CGF4CF2B3A.8AB2C2F3BCFB4A.9AC5FBCB2C2A.11AC5B2C2A2.13A2C5A2.17A5.59',
    'buckler.t4': '0c0714d8a030f0c8589a64142a2842fff4c05354784a8cff1e4ccc|.58A7.14A3B5C2A.12AB2C2B4D3A.11AB2C2B2D6A.9AB5D2E3D4A.7AFB4E3DG3D3A.6ABFB3E2B2D3G2BD2A.5ABF2BEB3H2ID2GB2DA.4AB2FDBEB2H2I3DGB2DA.4AB3DEB2H2I4DGCBDA.4AFCBDEBH2I5DGCBDA.3ABFCBE2BH2I5DGBDA.4AB3DE2DHI6C2BDA.5AB2D2ED2I5C2B2A.6AB3DEGD5C2B3A.7AB2D2G6C2B2A.9AD4G3B5A.11AD4B4D2A.12AD8A2.14A8.58',
    'buckler.t5': '0c0714d8a0309a6414fff4c03a34586e6a96bff4fff0c858|.38A2.16A6B2A.14AB8A.14AB7C2A4.9ADB4C7B2A.7AD2B4E4C4BA.6AD3B2E2B2CEFC3A.6AB8C4F2BCA.5AB8G4C2FBCA.5AB4EB2G6CFBCA.5AB3CEB2G6CFBCA.5AB3CEBG6CFHBCA.5AB3CEBG6CFHBCA.5AB3CEC2G5H2CBA.6AB3CEC6H3CA.6AB4CEF2C2F2H2C2A.6AB2AC4F3B2C3A.8A2.AC4B4C2A.13AC8A.14AC2A6.16A2.63',
    'buckler.t6': '0c0714c8d0e83a5a8affffff7aa0d09a641434305ad8a030221e38d8e4ff|.35A2.21ABCA.20ABCA.19A2DCA5.14AE2DCE2C3A.11A2D3E3C4A.10AE2D2C8A.10AE2D2C3FG2C3A2.7AD4H3F3G2EC3A.6AD4H2E2CF2GEC3A.5AD4H2E2C3FGECA2.5A2B2EIH2EC4FGECA.5AB4EIHE2J3CGE2A.6AE4CIHFC4G2E2A.7A2E2CI2F2CF2D3A.10AE2CI2F2G2DC2A.10AEC3E5DCA.11AE2C3E4A2.13A4C3EA.19AC2A.20AC2A.21A2.36',
    'heater.t1': '0c071444444f5e3c223a24148a5c3467677425252f|.61A4.18A2B4A.16AB3C2B2A.14AB2C5BA.13AB2C7A.12AB2C7DA.12ABC8DA.11AB2C8DA.10AB2C6B2CDA.10ABEC5B3D2A.10ABEC4FB2GDA.10AFBC4F2B2GDA.10AFEC4FB2G2A.11ABEC4B2G2A.12ABC7DA.13ABC6D2A.13ABC5D2A.14AB2C2D2A2.16A2G2A2.20A2.63',
    'heater.t2': '0c07144e55723842701c1f30626ea033384f1c2140|.40A2.19A3B2A.16A2B5A.15AB5C2DA.12A2B4E2C2DA.11AB3F2C4G2A.10AF3E2C5GA.11AFC9GA.10AF2C9GA.10AFC9G2A.9ABFC9GA.10ABEC9GA.10AFEC8GA.11AFC9GA.11AFC9A.12AFC8A.13AF2C7A.14AF2C5A.16AF2C3A.17AF3C2A.18AF3A.20A3.37',
    'heater.t3': '0c0714d8a0309a64147e1a305a36084a0e1eb8324af0c858|.40A2.19A3B2A.16A2B5A.15AB3CBD2EA.12A2B3C2D3EA.11AB5CBCF3A.10AC3G3B2C2FA.11ACD4B2C3FA.10AC2D3B2C4FA.10ACD3HBC4EFA.9ABCD3HBC4EA.10ABGD3BC4E2A.10ACGD3BC4FA.11ACD4C5FA.11ACD4C3F2A.12ACD5C2FA.13AC2D4CF2A.14AC2D3CFA.16AC2D2CA.17AC3DCA.18AC3A.20A3.37',
    'heater.t4': '0c0714d8a0301c4c8a10305a9a64141e4ccc2e74c8|.62A4.18A2B4A.15A2B6A.14AB4C2DA.13A2B3C4DA.12AE2BC6DA.12ABEDC6DA.12ABEDC3E2CDA.12AC5F3D2A.11ABGC3BF3DA.12ABGC3BF2D2A.12AEC4EF2DA.12ABEC4EC2DA.12ABEC7A.14AEC7A.14AE2C5A.16AE2C3A.18AEC3A.18AE2CA.20A3.61',
    'heater.t5': '0c0714f0c8589a6414d8a0303a34586e6a96bff4ff|.60A2.2A2.17ABCA2BCA.16ABCAB2CA.15AD2CEFDCA.15AFDCEFDCA.12A3F6DEA.11ADC2F7E2A.10ADC2EF6C2A.10AD2CEF2G2FECA.11AF5G3FEA.11AF6G3E2A.10ABF5G4EA.11ABD2F3G3C2A.11AC3F3G3C2A.11ACE2F6C2A.12AF7A3.12ABFC2EFCA.15ABC3EC2A.15ABCA2C2A.17A2.2A2.61',
    'heater.t6': '0c0714d8a0309a641434305a221e38c88a14ffdc66|.41A.22ABA.20AB2A.19AB4A.15A3BC4A.13A2B4C3A.13AB4D2BC2A.10A3B3D4BCA.10ABC2BD7A.11ABC2ED5EA.11ACBC2ED3FDEA.11AC3ED3F2DEA.12AC2ED2F3DEA.12ACD4FG3A.13ACD4F4A.13ACD7A.14ACD7A.14AC2D5A.16AC2D3A.17AC2D3A.18AC2DA.20A3.38',
    'tower.t1': '0c07148a5c345e3c2244444f3a2414|.39A3.17A4B3A.13A3B6CA.12AB4C6A.11AB2C9A.11AB2C9A.11AB2C8DA.11ABC5D5A.11ABD7C3A.11AD3C8A.11ABC4D2C3A.12ABC3D3EC2A.12ABC3D3EC2A.12ABC4DC4A.11AB2C6D3A.11AB2CD7CA.11AD5C6A.11AB2C9A.11ABC9A.12ABC6A3.14A7.59',
    'tower.t2': '0c0714626ea0384270|.36A6.14A4B6A.12AB9CA.11AB6C5A.11AB2C3BC5A.11AB2C3BC5A.11AB2C3BC4A.12AB2C3BC4A.12AB2C3BC4A.11AB2C9A.11AB2C9A.11AB2C9A.11AB2C9A.11AB2C9A.11AB2C3BC5A.11AB2C3BC5A.11AB2C3BC5A.11AB2C3BC4A.12AB2C4A4.13AB2A4.18A2.64',
    'tower.t3': '0c0714d8a0309a64143a46726878ae|.40A2.18A4B2A.13A4B4C2A.12AB3C4D2A.12AC3D7A.12AE2D3ED4A.12AE2D3ED4A.12AE2D3ED4A.12AE2D3ED4A.12AE2D3B2CD2A.12AE2D2B2C2D2A.12AE2D2BC2D3A.12AED3C2D4A.11AE2D8A.12AE2D3ED4A.12AE2D3ED4A.12AE2D3ED4A.12AE2D3ED4A.12AE2D3C5A.12AC5A5.14A5.61',
    'tower.t4': '0c0714d8a030f0c8589a64145354786878ae8b8fb81e4ccc3a4672|.64A2.20A2B2A.11A2.2A4BCB2A.10ABDA2B5CBA.11ABD6E2CA.13AD2E2FE3A.14AE4FE3A.14AGE3FE3A.14AGE2B3E2A.13AFGE2BH2E2A.13AFGEB2H2E2A.13AFGE2BHE3A.13AFGE3IE3A.13AFGE2FIE3A.13AFGE2FIE3A.13AFGE2FIE3A.13AFE3FE2B2A.13ABE2D5A.14ABD3A4.16A4.62',
    'tower.t5': '0c0714d8a0309a6414f0c8586e6a96b4b4d8bff4ff|.58A8.14A2BCDCD2E2A.12AB3CDCD2E2A.11AB4CE6A.11ABFE9A.11ABFE5BE2A.12ABFE2BE2BE3A.11ABFE2BG3E3A.11ABFE2G5EA.12AFB2G6EA.11ABFE2G6EA.11ABFE2G5E2A.11ABFE2G4E3A.11ABFE2B2E5A.11ABFE2BE6A.11ABFE9A.11ABFE8A.12ABFE8A.12ABFE4A4.14A6.60',
    'tower.t6': '0c07143ec0ffa4ecff1c6ab0ffffffd8a03034305a52508a6878ae221e385fd4ff3a4672|.35A6.16A2BC3DEA.14ABCBCDCDEDA.12ACBCDCDB2EDA.12ACBCD3B2D2A.11AFCB2DG5A.12AFHG3I2G3A.12AFHG3I2G3A.12AFHG3IG4A.12AFHG3BDG3A.12AFHG2B2D2JGA.12AFHG2B2KDJGA.12AFHG2BDKDJGA.12AFG3BDKG2A.13AHG4LG3A.12AFHG4LG3A.12AFHG3ILG3A.12AFHG3ILG3A.12AFHG3ILG3A.12AFHG3IA4.14A6.60',
    'grimoire.t1': '0c071485573aa8703e5e3a24c4b698e4d8b4|.61A4.12A2.4A2B4A2.9AC2A.A2B8A.8AC2A2B9DA.8AC3B8D3A.9ACEF2B4D5A.10AE4BD7A.10AE4BD7A.10AE4BD7A.10AE4BD7A.10AE4BD7A.10AE4BD7A.10AE4BD7A.10AE4BD7A.10AE4BD7A.10AE4BD7A.10AE4BD5A2.12A2E2BD3A2.16A6.81',
    'grimoire.t2': '0c0714626ea03656b0a8703ea6b0d438427022367ac4b698e4d8b46a5a52|.61A3.20AB3A2.10A2.4A2C2B4A.8AD2A.A2C6E2FA.7AD2A2C9GFA.7AD3C8G3FA.8ADHI2C4G5A.10AH4CG7A.10AJB2HCG7A.10AJB2HCG7A.10AH2BHCG7A.10AH4CG7A.10AH4CG7A.10AH4CG7A.10AHB2HCG8A.9AJB2HCG7FA.9AJB2HCG7FA.9AJ2BHCG5A3.11A2H2CG3A2.16A6.58',
    'grimoire.t3': '0c0714626ea0b8324aa8703ea6b0d43842707e1a309a6414c4b698e4d8b46a5a524a0e1ed8a030|.61A3.20AB3A2.10A2.4A2C2B4A.8AD2A.A2C6E2FA.7AD2A2C9GFA.7AD3C8G3HA.8ADIJ2C4G5HA.9AI4CG7HA.9AKB2ICG4HG2HA.9AKB2ICG2H4LHA.9AI2BICG2H4LHA.9AI4CGH5LHA.9AI4CGMH4LHA.9AI4CGMH3LGHA.9AIB2ICG2H3LGHA.9AKB2ICG3L2G2FA.9AKB2ICG7FA.9AK2BICG5A3.11A2I2CG3A2.16A6.58',
    'grimoire.t4': '0c0714626ea0a8703e2e74c84a2c1ad8a03010305a1c4c8a9a64146a5a52c4b6985a36081e4ccc3842707e1a304a0e1eb8324a|.37A3.12A2.6AB3A2.9AC2A.3A2D3B3A.8AC2EA3D7B2A.8ACEF3G2D4HBIA.9AEF5D2H3I2A.10AJF3IH5I2A.10AJB2FIH3IHI2A.10AJB2KH2F2I2LIA.10AK4H2F2ML2IA.10AK4HFIM3LIA.10AK4HFIM2GI2A.10AK4HI4GI2A.10AJB2KH2G2H2N2A.10AJB2KH6NA.11AK4H4OA2.12AF4IHP2OA.14A2F2IA2QOA.16A3.AQOA.20AQOA.21A2.56',
    'grimoire.t5': '0c0714bff4ff626ea04a2c1af0c8582e46b8d8a0301c2a789a6414c4b698161e584a8cff1e4ccca6b0d43842704a0e1e|.37A.21A2BA.19AB4A.18AB4A.18AB4A.17AB6A.16AB6A.13A3B7CA.11AD2EB3FBF2C2A.10ADGE2G2F2H3IA.11AG4IH5IA.12AC2I2H5IA.12AC2JH2I3KIA.12AJ3HI2LMKIA.12AJ3HGILMKIA.12AJ3HGILH2IA.12AN2JH2IH3OA.11AC3JH5O2A.11AG2CJH5A2.13AG3I2P2A.16A2I2A2PA.18A2.2A.33',
    'grimoire.t6': '0c07149a44ff5a2aa02a0e5a4a2c1a5a2e9a3e2272626ea0f0c858d8a0309a6414c4b6985a3608a652ff|.36A2.21AB2A.19ABC2DA.18ABCD2A.18AB2D2A.17ABC3B2A.16ABC2B3A.14A2C4B4A.12AEC3F2B2GHA.12AEI3F3G2HA.12AEJ4G4KA.13AH2J2G4KA.13AH2LFGK3MA.13AL3FJ2C2MA.13AL3FJN3MA.13AL3FK3GMA.13AH2LFG4HA.13AH2LFG4HA.13AJ3FG3A2.15AJ3A2GA.17A3.2A.57',
    'quiver.t1': '0c0714a4b0dcc4cdeeb07e5685573aa8703e7a4a2cd09a5e5e3a24|.27A2.21AB2A.20ACB2A.19ACB2A.19AC2B2A.18AC3BA.11A2.5AC2DE2A.9AFGA.5AD3E2A4.4AF2GA.5AD3E2H4A4F2GA.7AEDE2F4H4FG2A.7AE2DE2A6F2GA.9AEDE3A.3AFGA.11AEDE2IA.2AFGA.11AEDE2IA.3A2.13AE4IA.17AE2DEIA.18AEDE3A.18AEDE2A.18AEDE2IA.18ADE2IA.19AE2IA.20A3.33',
    'quiver.t2': '0c0714a4b0dc626ea0a6b0d4f4f8ff7a4a2cd09a5ea8703e85573ab07e56|.27A3.20AB3A.19AB4A.19AB4A.18AB5A.18AB2C3A.9A.7ABDEC2A.8AFA.7ADEC3A8F2A.7AC4G8HF2A.7AC2I3H8FA.9AI2JI2A6HFA.10AIJI3A.3AHA.12AIJI2A.4A.13AIJI3A.18AI4A.18AI5A.18AI4A.19AI3CA.18AIC3A.19AC3A.20A3.56',
    'quiver.t3': '0c0714ff8a9ae0475ed8a030f0c858fff4c07a4a2cd09a5ea8703e9a641485573ae0384c|.27A3.20AB2CA.19AB2C2A.19ABC3A.18ABC4A.18AC2D3A.9A.7ACEFD2A.8AGA.6AE2FD3A8G2A.7AD4H8IG2A.7AD5JI7GA.9AE2D2JA6IGA.9AD4K2A.3AIA.11AD2K3A.4A.13AL2KD2A.17ALD4JA.17AD4JA.17AD3K2A.18ADK3DA.18AKD3A.19AD3A.20A3.56',
    'quiver.t4': '0c0714a4b0dcc4cdeed8a0309a64147a4a2cd09a5efff4c0a8703e85573ab8dcfff0c858e0475e|.28A3.20AB3A.19AB2CBA.19AC2BA.19AC2B2A.19ACD3A.7A.10AD4EA2.4AFA.9AD4EG2A4F2A.10AD2HDI6F2A.11ADHD2A4IFA.12AD3JDA.AIFA.13AKJ2DA.2A2.14AK2D3A.18AD4A.18AD3J2A.18ADJ2DA.19AL2DA.20AD2A.21AMA.21AM2A.20AM2A.21A2.32',
    'quiver.t5': '0c0714f0c858d8a030fff4c09a6414a8703e7a4a2cd09a5ebff4ff4a8cff|.27A.22ABA2.20ABC2A.19ABCB2A.19AB3CA.18AC5A.18ACB2CA.8A2.8ABD2CEA.6AFGA.7AB3CEHA6F2GA.8AC4H7FGA.9AC5EA4F2GA.10AC4EA.2AF2A.11AC3I2A.3A2.13AJ2IC2A.17AJ2D2CEA.17AB3CEA.18AC3I2A.18AI3CA.19AC3A.19AC3A.20A3.57',
    'quiver.t6': '0c0714ffffff40d878f0c858d8a0307a4a2ca8703ed09a5e6a4e308a6a424cf08a4a3624|.27A2.21AB2A.20AB3A.19AB4A.19AB3CA.18AC2BCA2.18ACD2E2A.7A2.8AD2CE2A.6AF2A.7ACEC2EGA6GF2A.7ACE4G3H4GFA.9AE6A4G2FA.10AE4IA.2AG2A.11AE3I2A.3A2.13AC2IJIA.17AK2J2ILA.17AJ2I2LA.18AI5A.18AI3EA.18AIE3A.19AE3A.20A3.57',
    'warhorn.t1': '0c0714a8703e7a4a2c8e7c626a58483a2e28b2a284|.83A2.21AB2A2.19AB4A.17A3B4A4.11A2B2CAB4DE2A.9AB3C2D6E3A.6A2B2C2F2D5E4A.5AB2C2A2G4DE6A.4AB2C2A2G5D2E4FA.4AB2A2.AG5D3E3FA.5A2.3ADG4D3E3FA.10ADG2D4E4A.12AD6E3A.13AD5E4A.14AE7A.16A2E3A2.19A3.104',
    'warhorn.t2': '0c0714a8703e7a4a2ca6b0d4626ea03842701c2140c8902c4a2e0a8a5a14ecc050f4f8ff|.82A2.21AB2A2.19AB4A.17A3B4A4.11A2B2CAB3DEFGA.9AB3C2H4DEFGFA.6A2B2C2I2H5J2EF2A.4AB2C2A2K4J5EF2A.3AB2C2A2K5J4F3A.4AB2A2.AK5H2F4IA.5A2.3AK5H2I5A.10AD2KH4J4A.12AHL4HJ3A.13AH4J5A.14AJ7A.16A2J3A2.19A3.105',
    'warhorn.t3': '0c0714a8703ed8a0307a4a2c9a1428c8902c4a2e0a8a5a14ecc050f0c8589a64145a3608fff4c0|.82A2.21AB2A2.19AB4A2.16A3B4CA3.11A2B2DAB3CE3A.9AB3D2F4CE2GHA.6A2B2D2G2F4C2EGHA.5AB2D2A2I3JFC2K2GHLA.3AB2D2A2I4J2K3H2GLA.3AB2A2.AI4J2G3H2GLA.4A2.3AI4C3GH2K2LA.9AJ2IF2C4K3A.11AFM3K6A.12AF4HG2K2A.14AH7A.16A2H3A2.19A3.105',
    'warhorn.t4': '0c0714a8703ed8a0307a4a2c1e4ccc8b8fb82a2842535478cfd4ecf0c8589a64145a36088a2238ff8a9ab8324afff4c0e0475e|.82A2.21AB2A2.19AB4A2.16A3B4CA3.11A2B2DAB3CE3A.9AB3D2F4CE2GHA.6A2B2D2G2F4C2EGHA.5AB2D2A2I3JFC2K2GHLA.3AB2D2A2I4J2K3H2GLA.3AB2A2.AI4J3M2H2GLA.4A2.3AI4C2LNOHK2LA.9AJ2IF2CLNOLK2A.10AJ3P2L2Q2LKA.12AF5HQ3A.14AF3H2G2A.16AH5A.18A5.104',
    'warhorn.t5': '0c0714a8703ed8a0307a4a2c1e4ccc5a36089a6414bff4fff0c858fff4c0|.82A2.21AB2A2.19AB4A2.16A3B4CA4.10A2B2DAB3CE2FGA.8AB3D2H4CE2FGA.6A2B2D2H6C2EFG2A.4AB2D2A2H3IHC2G5A.3AB2D2A2H4I2CG6A.3AB2A2.AH4I2C3G4A.4A2.3AH4C4G5A.9AI2H3C4G3A.10AI3J2C2G4A.12AH7G2A.14AH7A.16AH5A.18A5.104',
    'warhorn.t6': '0c0714a8703ed8a0307a4a2c6adcc834305a52508a7fe8d8221e388480b8f0c8589a6414e4e0ff2c8a860e3a3c|.82A2.21AB2A2.19AB4A2.16A3B4CA4.10A2B2DAB3CE2F2A.8AB3D2G4CH3FA.6A2B2D2I2G4C3F3A.4AB2D2A2J3KIC2L2F3A.3AB2D2A2J4KICL3F3A.3AB2A2.AJ4K2G3F3LA.4A2.3AJ4C3GF3L2A.9AJ3G2C4L3A.10AJ3M2GCL4NEA.10AG5I2L2ONENA.10AG3F4A2N2A.12AF5A.2A2.14A5.104',
  };
  // FORGE-ICONS:END
  const FORGE_LINES = { sword: 1, rapier: 1, mace: 1, axe: 1, hammer: 1, halberd: 1, bow: 1, crossbow: 1, chakram: 1, staff: 1, wand: 1, orb: 1, daggers: 1, claws: 1, fans: 1, buckler: 1, heater: 1, tower: 1, grimoire: 1, quiver: 1, warhorn: 1 };
  const memoForge = {};
  function forgeCells(line, tier, rarity) {            // tier 0..4 (+ rarity 'mythic' = the sixth, Mythic piece) -> [[x, y, '#hex']] or null
    const id = line + '.t' + (rarity === 'mythic' && FORGE_ICONS[line + '.t6'] ? 6 : tier + 1), s = FORGE_ICONS[id]; if (!s) return null;
    if (memoForge[id]) return memoForge[id];
    const [pal, rows] = s.split('|'), cols = []; for (let i = 0; i + 6 <= pal.length; i += 6) cols.push('#' + pal.slice(i, i + 6));
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', out = []; let pos = 0;
    for (const m of rows.matchAll(/([A-Za-z.])(\d*)/g)) { const n = m[2] ? +m[2] : 1; if (m[1] !== '.') { const c = cols[L.indexOf(m[1])]; for (let k = 0; k < n; k++) out.push([(pos + k) % N, ((pos + k) / N) | 0, c]); } pos += n; }
    return (memoForge[id] = out);
  }
  function forgeLine(base, kf) {                       // the forge line an item base draws, or null (old callers: a line id, or 'shield' for the renamed heater)
    if (kf && FORGE_LINES[kf.family]) return kf.family;
    const b = typeof BASES !== 'undefined' && BASES[base]; if (b && FORGE_LINES[b.variant]) return b.variant;
    return FORGE_LINES[base] ? base : base === 'shield' ? 'heater' : null;
  }
  const memoKit = {};
  function kitCells(slot, family, tier, demo) {      // -> [[x, y, '#hex']] already placed in the 24x24 icon, or null (no kit / no such family)
    if (typeof PARTS_ART === 'undefined') return null;
    const key = slot + family + tier + (demo ? 'd' : ''); if (key in memoKit) return memoKit[key];
    let res = null;
    if (slot === 'weapon') {
      const w = PARTS_ART.weapon(family, tier, demo, 0, 4);
      if (w) res = turnFit(w.cells, w.aim === 'up' ? 45 : -45, 22.5, 1);
    } else {
      const a = PARTS_ART.armour(slot, family, tier, 'front');
      if (a) {
        const cells = []; for (const L of a.layers) { for (const q of L.cells) cells.push(q); if (L.cellsR) for (const q of L.cellsR) cells.push(q); }
        if (slot === 'boots') { const L = a.layers[a.layers.length - 1]; cells.length = 0; for (const q of L.cells) cells.push([(q[0] - 3) * 2, (q[1] - 23) * 2, q[2]], [(q[0] - 3) * 2 + 1, (q[1] - 23) * 2, q[2]], [(q[0] - 3) * 2, (q[1] - 23) * 2 + 1, q[2]], [(q[0] - 3) * 2 + 1, (q[1] - 23) * 2 + 1, q[2]]);
          res = turnFit(cells, 0, 22.5, 1); }
        else res = turnFit(cells, 0, 22.5, 1);
      }
    }
    return (memoKit[key] = res);
  }

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

  // ---- trinkets (docs/design/items.md): ring / amulet / belt x tiers 1-3, element tint, uniques ----------------
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
      const hadTier = typeof tier === 'number'; tier = clamp(tier | 0, 0, 4); rarity = RC[rarity] ? rarity : 'common'; opts = opts || {};
      const gk = (gems || []).map((g) => (g ? String(g) : '-')).join(',');
      const og = ORIGIN[base] || null, tb = og ? ['ring', 1] : TRK_BASES[base] || (TRK_SLOT[base] ? [base, clamp(tier, 1, 3)] : null), uq = UQ[base] ? base : null;
      const el = EC[opts.element] ? opts.element : og;
      const kf0 = tb || uq ? null : kindFor(base, tier), kf = kf0 && (hadTier ? Object.assign({}, kf0, { tier }) : kf0), fl = tb || uq ? null : forgeLine(base, kf), ft = fl && (hadTier ? tier : kf ? kf.tier : (typeof BASES !== 'undefined' && BASES[base] && BASES[base].tier | 0) || tier), fc = fl && forgeCells(fl, clamp(ft, 0, 4), rarity), kc = !fc && kf && kitCells(kf.slot, kf.family, kf.tier);   // an explicit tier wins over the base's own; forge icons win over the kit
      return memo(`i:${base}:${tier}:${rarity}:${gk}:${el}:${opts.implicit || ''}:${opts.tempered ? 1 : 0}`, () => {
        let o;
        if (tb || uq) o = paint(() => (uq ? UQ[uq]() : TRK[tb[0]](tb[1], el && EC[el])), slotBg());
        else if (fc) o = paint(() => { for (const q of fc) P(q[0], q[1], q[2]); }, slotBg());                  // drawn by the forge
        else if (kc) o = paint(() => { for (const q of kc) P(q[0], q[1], q[2]); }, slotBg());                 // derived from the parts kit
        else { const kind = kf ? LEGACY_KIND[kf.family] : kindOf(base), [tab, name] = KIND[kind]; o = paint(() => tab[name](kf ? kf.tier : tier), slotBg()); }
        (gems || []).slice(0, 3).forEach((g, k) => { const s = g ? String(g).split('_') : null; dotAt(o, k, s && s[0]); });
        drawStaticFrame(o, rarity);
        if (opts.implicit) implicitDot(o, opts.implicit);
        if (opts.tempered) temperEdge(o);
        return bake(o);
      });
    },
    // a framed icon straight from a kit set (any family, incl. PARTS_ART.DEMO ones with demo = true): ICONS.kit('weapon', 'rapier', 3, 'epic', true)
    kit(slot, family, tier, rarity, demo) {
      tier = clamp(tier | 0, 0, 4); rarity = RC[rarity] ? rarity : 'common';
      return memo(`k:${slot}:${family}:${tier}:${rarity}:${demo ? 1 : 0}`, () => {
        const kc = kitCells(slot, family, tier, !!demo); if (!kc) return null;
        const o = paint(() => { for (const q of kc) P(q[0], q[1], q[2]); }, slotBg()); drawStaticFrame(o, rarity); return bake(o);
      });
    },
    trinketIds: Object.keys(TRK_BASES).concat(Object.keys(ORIGIN)), uniqueIds: Object.keys(UQ), kindFor, gearBases: GEAR_OF,
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
