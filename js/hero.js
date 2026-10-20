'use strict';
// ---------------------------------------------------------------------------
// HERO — layered paper-doll hero (24x32 px frames), data-driven gear families x 5 tiers.
// Self-contained: needs only util.js (makeCanvas, hexToRgb, clamp, frand). Exposes one global: HERO.
//   HERO.build(look) -> { front:[idle0,idle1,walk0..3], back:[...], weapon, weaponGrip, weaponTip,
//                         hand:{front:[{x,y}..],back:[..]}, anchors:{head,chest,boots,weapon}, ... }
//   look = { head:{family,tier,gems}, chest:{..}, boots:{..}, weapon:{..}, hair?, skin? }  (any slot may be null)
//   trinkets (DESIGN 19.4): look.belt={family?,tier 1-3,color?,rarity?,tempered?}, look.amulet={tier,element?|color?,rarity?,tempered?},
//     look.ring={tier,element?,rarity?,tempered?} (object or array; Epic+ rings glint 1px on the attack frame), any gear piece may carry tempered:true
//     (bright edge). Belt/amulet are slots for HERO.slotSprite(b,'belt'|'amulet'|'ring',view,fi); HERO.drawTrinketGlow(ctx,b,view,fi,x,y,t)
//     draws their rarityFx rim (call it AFTER drawHero: the rim lies on the torso). HERO.BELT_COLORS / ELEMENT_COLORS list the palettes.
//   HERO.rarityFx, HERO.rarityColor(r,t), HERO.drawGlow(ctx,sprite,x,y,rarity,t),
//   HERO.emit/stepParticles/drawParticles, HERO.drawHero(...), HERO.slotSprite(built,slot,view,frame)
// Painting model: each layer paints 1-px rects through a painter `g` (shape / shaded-box helpers). Tiers are
// additive detail passes (t>=1 trim, t>=2 gold, t>=3 big silhouette pieces, t>=4 ornate) over a palette ramp.
// ---------------------------------------------------------------------------
const HERO = (function () {
  const FW = 24, FH = 34, TOP = 2;   // 2px headroom: layers paint in 24x32 design space, shifted down TOP
  const REST = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.15];   // default weapon tilt per frame (outward, keeps face clear)
  // ---- colour helpers ------------------------------------------------------
  const toHex = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const dk = (c, f) => toHex(hexToRgb(c).map(v => v * f));
  const lt = (c, t) => toHex(hexToRgb(c).map(v => v + (255 - v) * t));
  const RP = c => ({ h: lt(c, 0.4), m: c, l: dk(c, 0.7), d: dk(c, 0.45) });   // 3-tone ramp + deep shade
  const GOLD = RP('#e8b830'), WHITE = RP('#e8eef8');
  const GEMC = { ruby: '#e02848', sapphire: '#3a78f0', emerald: '#30c860', topaz: '#f0b020', amethyst: '#a050e0', diamond: '#d8f4ff' };
  const mapT = arr => arr.map(RP);

  // ---- painter -------------------------------------------------------------
  function mkG(ctx, back, W) {
    const g = { ctx, back, oy: 0, gl: null }, M1 = (W || 24) - 1;
    g.p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y + g.oy, 1, 1); };
    g.r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y + g.oy, w, h); };
    g.sp = (x, y, c) => { g.p(x, y, c); g.p(M1 - x, y, c); };
    g.s = (x, y, w, h, c) => { g.r(x, y, w, h, c); g.r(M1 + 1 - x - w, y, w, h, c); };
    g.b = (x, y, w, h, R) => {          // shaded box, light from top-left
      g.r(x, y, w, h, R.m);
      if (w > 1) { g.r(x, y, 1, h, R.h); g.r(x + w - 1, y + 1, 1, h - 1, R.l); }
      g.r(x, y, w, 1, R.h);
      if (h > 2) g.r(x + (w > 1 ? 1 : 0), y + h - 1, w - (w > 1 ? 1 : 0), 1, R.l);
    };
    g.sb = (x, y, w, h, R) => { g.b(x, y, w, h, R); g.b(M1 + 1 - x - w, y, w, h, R); };
    g.shape = (y0, sp, R, mir) => {     // row spans [a,b]; edges auto-lit
      const inR = (i, x) => i >= 0 && i < sp.length && x >= sp[i][0] && x <= sp[i][1];
      for (let i = 0; i < sp.length; i++) for (let x = sp[i][0]; x <= sp[i][1]; x++) {
        const c = (!inR(i - 1, x) || !inR(i, x - 1)) ? R.h : (!inR(i + 1, x) || !inR(i, x + 1)) ? R.l : R.m;
        g.p(x, y0 + i, c);
      }
      if (mir) g.shape(y0, sp.map(s => [M1 - s[1], M1 - s[0]]), R, false);
    };
    g.mir = flag => {                   // painter that mirrors x when flag (left/right limbs)
      if (!flag) return g;
      const m = Object.create(g);
      m.p = (x, y, c) => g.p(23 - x, y, c);
      m.r = (x, y, w, h, c) => g.r(24 - x - w, y, w, h, c);
      m.b = (x, y, w, h, R) => g.b(24 - x - w, y, w, h, R);
      return m;
    };
    g.gem = (x, y, name) => {           // 2x1 socket inset; name null => empty socket
      if (name === null) { g.p(x, y, '#241c34'); g.p(x + 1, y, '#3c3052'); return; }
      const R = RP(GEMC[name] || '#ffffff');
      g.p(x, y, R.h); g.p(x + 1, y, R.m);
    };
    g.gems = anchors => {
      const list = g.gl; if (!list) return;
      for (let i = 0; i < anchors.length && i < list.length; i++) if (list[i] !== undefined) g.gem(anchors[i][0], anchors[i][1], list[i]);
    };
    return g;
  }

  // ---- animation frames: idle0 idle1 walk0..3 -------------------------------
  const FR = [
    { bob: 0, la: 0, ra: 0, lay: 0, ray: 0, sw: 0 }, { bob: 1, la: 0, ra: 0, lay: 0, ray: 0, sw: 0 },
    { bob: 1, la: 1, ra: 0, lay: 1, ray: -1, sw: -1 }, { bob: 0, la: 2, ra: 0, lay: 1, ray: -1, sw: 0 },
    { bob: 1, la: 0, ra: 1, lay: -1, ray: 1, sw: 1 }, { bob: 0, la: 0, ra: 2, lay: -1, ray: 1, sw: 0 },
    { bob: 1, la: 0, ra: 0, lay: 1, ray: -4, sw: 0 }];   // 6 = attack: right arm thrust up/out

  // ---- BODY (skin / underclothes / hair / face) ----------------------------
  function body(g, P, back, o) {
    const S = RP(o.skin || '#ecb890'), HR = RP(o.hair || '#7a4a2c'), TU = RP('#58689a'), PA = RP('#4a4258');
    for (let s = 0; s < 2; s++) { g.oy = -(s ? P.ra : P.la); g.mir(s).b(9, 24, 3, 6, PA); }   // legs
    g.oy = P.bob;
    g.b(8, 15, 8, 8, TU); g.r(8, 22, 8, 1, '#4a3022'); g.s(11, 22, 1, 1, '#c8a040');
    for (let s = 0; s < 2; s++) {                       // arms + hands
      g.oy = P.bob + (s ? P.ray : P.lay);
      const M = g.mir(s); M.b(6, 15, 2, 8, TU); M.b(6, 23, 2, 2, S);
    }
    g.oy = P.bob;
    g.r(10, 14, 4, 1, S.l);
    if (back) {                                         // back of head: all hair
      g.shape(4, [[9, 14], [8, 15], [7, 16], [7, 16], [7, 16], [7, 16], [7, 16], [7, 16], [8, 15]], HR);
      g.r(10, 13, 4, 1, S.l); g.r(11, 6, 1, 6, HR.l); g.r(12, 8, 1, 4, HR.d);
      return;
    }
    g.b(8, 7, 8, 6, S); g.r(9, 13, 6, 1, S.l);          // face + chin
    g.shape(4, [[9, 14], [8, 15], [7, 16], [7, 16]], HR);   // hair cap
    g.b(7, 8, 1, 4, HR); g.b(16, 8, 1, 4, HR);          // side locks
    g.r(8, 7, 8, 2, HR.m); g.r(11, 8, 2, 1, S.m); g.p(10, 8, HR.l); g.p(14, 8, HR.l); g.p(8, 8, HR.h);   // fringe
    g.r(9, 9, 2, 1, HR.l); g.r(13, 9, 2, 1, HR.l);      // brows
    g.p(9, 10, '#f4f8ff'); g.p(10, 10, '#2a2050'); g.p(13, 10, '#2a2050'); g.p(14, 10, '#f4f8ff');   // eyes
    g.p(12, 11, S.l); g.p(9, 11, '#f09a8a'); g.p(14, 11, '#f09a8a');   // nose shade, blush
    g.p(11, 12, '#a65a4a'); g.p(12, 12, '#b86a58');     // mouth
  }

  // ---- armour: painted from the parts kit (js/parts-art.js). PARTS_ART.armour(slot, family, tier, view) -> { layers, sockets }; each layer is a cell
  // list moved by an animation offset: attach 'bob' | 'arm' (a left / right pair: bob + lay / ray) | 'leg' (pair: -la / -ra) | 'none'; `sway` y0 shifts
  // the cells below it by the skirt sway. Rarity / tempered / gems are applied by the callers (withTemper, g.gems).
  const M_STEEL = mapT(['#7d8494', '#98a6bd', '#b4c4dc', '#c9d6ec', '#dfe8f8']);   // kept for the cape trim colours below
  const FUR = [{ h: '#f4f0e6', m: '#e4e0d4', l: '#bdb8a8' }][0];
  function paintKit(g, P, kit) {
    for (const L of kit.layers) {
      const n = L.pair ? 2 : 1;
      for (let s = 0; s < n; s++) {
        g.oy = L.attach === 'bob' ? P.bob : L.attach === 'arm' ? P.bob + (s ? P.ray : P.lay) : L.attach === 'leg' ? -(s ? P.ra : P.la) : 0;
        const cells = s ? L.cellsR : L.cells, sw = L.sway;
        for (let i = 0; i < cells.length; i++) { const q = cells[i]; g.p(sw != null && q[1] >= sw ? q[0] + P.sw : q[0], q[1], q[2]); }
      }
    }
    g.oy = P.bob; g.gems(kit.sockets);
  }

  // ---- CAPE ----------------------------------------------------------------
  function cape(g, P, back, chest) {
    const kc = chest && PARTS_ART.KITS.chest[chest.family], base = (kc && kc.cape) || '#b02a42', T = chest ? chest.tier : 0;
    const C = RP(dk(base, 0.8 + T * 0.06)), sw = P.sw, len = T >= 1 ? 12 : 10;
    g.oy = P.bob;
    if (back) {
      const rows = [];
      for (let i = 0; i < len - 1; i++) rows.push(i === 0 ? [8, 15] : i < 8 ? [7, 16] : [6 + sw, 17 + sw]);
      g.shape(16, rows, C);
      for (let x = 6 + sw; x <= 17 + sw; x += 2) g.p(x, 15 + len, C.l);      // zig-zag hem
      g.r(11, 17, 1, len - 2, C.l); g.r(12, 17, 1, len - 3, C.d); g.r(9, 17, 1, len - 4, C.h);
      if (T >= 2) { g.r(6 + sw, 14 + len, 12, 1, GOLD.m); g.s(7, 16, 1, 8, GOLD.m); }
      if (T >= 3) { g.r(10, 16, 4, 1, GOLD.m); g.p(9, 16, GOLD.h); g.p(14, 16, GOLD.h); g.p(11, 22, GOLD.m); g.p(13, 24, GOLD.m); }
      if (T >= 4) { g.r(11, 19, 2, 1, GOLD.h); g.r(11, 21, 2, 1, GOLD.h); g.r(10, 20, 4, 1, GOLD.h); g.p(11, 18, GOLD.h); g.p(11, 22, GOLD.h); }
    } else {
      const strip = [[5, 5], [5, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4, 5], [4 + sw, 6], [4 + sw, 7], [5 + sw, 8], [5 + sw, 9]];
      g.shape(16, strip.slice(0, len - 1), C, true);
      if (T >= 2) g.s(4, 18, 1, 5, GOLD.m);
      if (len > 10) { g.oy = 0; g.r(8, 26, 8, 1, C.d); }
    }
  }

  // ---- WEAPONS: separate held sprites painted from the parts kit (js/parts-art.js: template + tier table + stamps) -------------
  // PARTS_ART.weapon(family, tier, demo) -> { w, h, cells:[[x,y,'#hex']], grip, tip, sockets, aim, light }; the grip is the hand anchor.
  const WW = 16;
  // ---- trinket overlays (DESIGN 19.4) + tempered edge ------------------------------------
  const ELC = { fire: '#ff8a3a', frost: '#5fd4ff', nature: '#5fd65f', lightning: '#ffe14a', arcane: '#b07cff', physical: '#aab4cc', holy: '#ffd75a' };
  const BELTC = { rope_sash: '#b8935a', mistwoven_belt: '#7fa8c8', moonlit_girdle: '#b8b4ee', cindersash: '#d8601c', quietgirdle: '#4a4a88', tidewovenclasp: '#2aa0a8', hollowbell: '#d8b040' };
  const BELT_TIER = ['#8a5a30', '#5c78a8', '#b8b4ee'];
  const trinket = (p, kind) => {
    if (!p) return null;
    const t = clamp(p.tier | 0 || 1, 1, 3), o = { tier: t, rarity: p.rarity || 'common', tempered: !!p.tempered };
    if (kind === 'belt') o.color = p.color || BELTC[p.family] || BELT_TIER[t - 1];
    else o.color = p.color || ELC[p.element] || (kind === 'amulet' ? '#e8c860' : '#c8d0e8');
    return o;
  };
  const edgeLight = (cv, f) => {     // lighten top/left silhouette edges of a layer canvas (tempered highlight)
    const cx = cv.getContext('2d'), w = cv.width, h = cv.height, id = cx.getImageData(0, 0, w, h), d = id.data, src = new Uint8ClampedArray(d);
    const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (!src[i + 3] || (a(x, y - 1) && a(x - 1, y))) continue;
      d[i] += (255 - d[i]) * f; d[i + 1] += (252 - d[i + 1]) * f; d[i + 2] += (214 - d[i + 2]) * f;
    }
    cx.putImageData(id, 0, 0);
  };
  const withTemper = (x, g0, on, back, fn) => {      // run fn(g); when on, via a scratch layer whose edge is lit
    if (!on) return fn(g0);
    const t = makeCanvas(FW, FH), tg = mkG(t.x, back); t.x.translate(0, TOP); tg.gl = g0.gl; fn(tg);
    edgeLight(t.c, 0.6); x.drawImage(t.c, 0, -TOP);
  };
  function drawBelt(g, P, back, B) {
    const R = RP(B.color), y = 21 + (B.tier >= 2 ? 0 : 1), h = B.tier >= 2 ? 2 : 1;
    g.oy = P.bob; g.r(8, y, 8, h, R.m); g.r(8, y, 8, 1, R.h); g.p(8, y + h - 1, R.l); g.p(15, y + h - 1, R.l);
    if (B.tier >= 3) { g.sp(9, y + h - 1, R.d); g.sp(10, y, WHITE.h); }
    if (!back) { const bk = B.tier >= 3 ? WHITE : GOLD; g.sp(11, y, bk.h); if (h > 1) g.sp(11, y + 1, bk.m); }
    else if (B.tier === 1) { g.p(12, y + 1, R.d); g.p(13, y + 2, R.m); }     // sash knot tail
  }
  function drawAmulet(g, P, back, A) {
    if (back) return;
    const R = RP(A.color); g.oy = P.bob;
    g.p(11, 15, GOLD.l); g.p(12, 15, GOLD.l);          // chain
    g.p(11, 16, R.h); g.p(12, 16, R.m);                 // 2 px pendant, element colour
  }
  function drawRingGlint(g, P, R) {                    // attack frame only, on the thrusting hand
    g.oy = P.bob + P.ray; g.p(17, 23, '#ffffff'); g.p(17, 22, mixRgbHex(R.color));
  }
  const mixRgbHex = c => lt(c, 0.5);
  const RANKS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  // ---- render pipeline -----------------------------------------------------
  function outline(cv) {
    const cx = cv.getContext('2d'), w = cv.width, h = cv.height, id = cx.getImageData(0, 0, w, h), d = id.data, o = new Uint8ClampedArray(d);
    const N = [[0, -1], [-1, 0], [1, 0], [0, 1]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (d[i + 3]) continue;
      for (const [dx, dy] of N) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4; if (!d[j + 3]) continue;
        o[i] = d[j] * 0.22 + 14; o[i + 1] = d[j + 1] * 0.22 + 10; o[i + 2] = d[j + 2] * 0.25 + 26; o[i + 3] = 255; break;
      }
    }
    cx.putImageData(new ImageData(o, w, h), 0, 0);
  }
  const piece = p => (p && p.family ? { family: p.family, tier: clamp(p.tier | 0, 0, 4), gems: p.gems || null, tempered: !!p.tempered, rarity: p.rarity || 'common', demo: !!p.demo } : null);
  function renderFrame(L, back, fi, only) {
    const { c, x } = makeCanvas(FW, FH), g = mkG(x, back), P = FR[fi];
    x.translate(0, TOP);
    const run = slot => {
      const p = L[slot]; if (!p || (only && only !== slot)) return;
      const kit = PARTS_ART.armour(slot, p.family, p.tier, back ? 'back' : 'front'); if (!kit) return;
      g.gl = p.gems; g.oy = 0; withTemper(x, g, p.tempered, back, tg => paintKit(tg, P, kit));
    };
    const doCape = () => { if (!only || only === 'cape') { g.gl = null; cape(g, P, back, L.chest); } };
    const tri = (slot, f) => { const p = L[slot]; if (!p || (only && only !== slot)) return; g.gl = null; withTemper(x, g, p.tempered, back, tg => f(tg, p)); };
    if (!only || only === 'body') {
      if (!back) doCape();
      g.gl = null; body(g, P, back, L);
      if (!L.boots) for (let s = 0; s < 2; s++) { g.oy = -(s ? P.ra : P.la); g.mir(s).b(8, 29, 4, 2, RP(L.skin || '#ecb890')); }
    } else if (!back) doCape();
    run('boots'); run('chest');
    if (back && (!only || only === 'cape')) doCape();
    tri('belt', (tg, p) => drawBelt(tg, P, back, p)); tri('amulet', (tg, p) => drawAmulet(tg, P, back, p));
    run('head');
    if (fi === 6 && L.ring && (!only || only === 'ring')) {
      const hit = L.ring.filter(r => RANKS.indexOf(r.rarity) >= 3);
      if (hit.length) { const r = hit[0]; g.gl = null; withTemper(x, g, r.tempered, back, tg => drawRingGlint(tg, P, r)); }
    }
    if (!only) outline(c);
    return c;
  }
  function renderWeapon(w) {
    const kit = PARTS_ART.weapon(w.family, w.tier, w.demo);
    if (!kit) return { c: makeCanvas(WW, 20).c, grip: [8, 10], tip: [8, 0], aim: 'up', light: null };
    const { c, x } = makeCanvas(kit.w, kit.h), g = mkG(x, false, kit.w);
    for (const q of kit.cells) { x.fillStyle = q[2]; x.fillRect(q[0], q[1], 1, 1); }
    g.gl = w.gems; g.gems(kit.sockets);
    if (w.tempered) edgeLight(c, 0.6);
    outline(c);
    return { c, grip: kit.grip, tip: kit.tip, aim: kit.aim, light: kit.light };
  }

  const cache = new Map();
  function build(look) {
    look = look || {};
    const L = { head: piece(look.head), chest: piece(look.chest), boots: piece(look.boots), weapon: piece(look.weapon), hair: look.hair, skin: look.skin,
      belt: trinket(look.belt, 'belt'), amulet: trinket(look.amulet, 'amulet'),
      ring: look.ring ? [].concat(look.ring).map(r => trinket(r, 'ring')) : null };
    const key = JSON.stringify(L);
    if (cache.has(key)) return cache.get(key);
    const b = { key, look: L, w: FW, h: FH, front: [], back: [], hand: { front: [], back: [] }, _slots: {} };
    for (let i = 0; i < FR.length; i++) {
      b.front.push(renderFrame(L, false, i)); b.back.push(renderFrame(L, true, i));
      const hp = { x: 17, y: 24 + TOP + FR[i].bob + FR[i].ray };
      b.hand.front.push(hp); b.hand.back.push(hp);
    }
    if (L.weapon) {
      const w = renderWeapon(L.weapon);
      b.weapon = w.c; b.weaponGrip = { x: w.grip[0], y: w.grip[1] }; b.weaponTip = { x: w.tip[0], y: w.tip[1] };
      b.weaponAim = w.aim; b.weaponLight = w.light;
    } else { b.weapon = null; b.weaponAim = 'up'; b.weaponLight = null; b.weaponGrip = { x: 0, y: 0 }; b.weaponTip = { x: 0, y: 0 }; }
    const h0 = b.hand.front[0];
    b.anchors = {
      head: { x: 12, y: 9 + TOP }, chest: { x: 12, y: 19 + TOP }, boots: { x: 12, y: 28 + TOP },
      weapon: b.weapon ? { x: h0.x - b.weaponGrip.x + b.weaponTip.x, y: h0.y - b.weaponGrip.y + b.weaponTip.y } : { x: h0.x, y: h0.y }
    };
    cache.set(key, b);
    if (cache.size > 96) cache.delete(cache.keys().next().value);
    return b;
  }
  // one slot's pixels alone (no outline) — feed to drawGlow for per-piece rarity rims
  function slotSprite(b, slot, view, fi) {
    if (slot === 'weapon') return b.weapon;
    const k = slot + view + fi; if (b._slots[k]) return b._slots[k];
    return (b._slots[k] = renderFrame(b.look, view === 'back', fi, slot));
  }
  // draw a built hero frame (+held weapon). opt: {flip, angle (weapon rad), noWeapon}
  function drawHero(ctx, b, view, fi, x, y, opt) {
    opt = opt || {};
    ctx.save(); ctx.translate(x, y);
    if (opt.flip) { ctx.translate(FW, 0); ctx.scale(-1, 1); }
    const wp = () => {
      if (!b.weapon || opt.noWeapon) return;
      const h = b.hand[view][fi];
      const ang = opt.angle != null ? opt.angle : REST[fi] || 0;
      ctx.save(); ctx.translate(h.x, h.y); if (ang) ctx.rotate(ang);
      ctx.drawImage(b.weapon, -b.weaponGrip.x, -b.weaponGrip.y); ctx.restore();
    };
    if (view === 'back') wp();
    ctx.drawImage((view === 'back' ? b.back : b.front)[fi], 0, 0);
    if (view !== 'back') wp();
    ctx.restore();
  }

  // ---- RARITY FX (DESIGN 4.2) ----------------------------------------------
  const rarityFx = {
    common:    { color: '#d8d8d8', alpha: 0,    pulse: 0,   rate: 0,  kind: 'none',    light: 0,  rim: 0, aura: false },
    uncommon:  { color: '#6ee36e', alpha: 0.38, pulse: 0,   rate: 0,  kind: 'none',    light: 14, rim: 1, aura: false },
    rare:      { color: '#5aa8ff', alpha: 0.55, pulse: 1.4, rate: 5,  kind: 'sparkle', light: 26, rim: 1, aura: false },
    epic:      { color: '#c070ff', alpha: 0.66, pulse: 2.4, rate: 12, kind: 'mote',    light: 40, rim: 2, aura: false },
    legendary: { color: '#ffb030', alpha: 0.8,  pulse: 3.2, rate: 18, kind: 'ember',   light: 60, rim: 2, aura: false },
    mythic:    { color: '#ff5ac8', alpha: 0.92, pulse: 3.8, rate: 30, kind: 'star',    light: 84, rim: 3, aura: true, cycle: ['#ff5ac8', '#a060ff', '#40e8ff'] }
  };
  function rarityColor(r, t) {
    const f = rarityFx[r] || rarityFx.common; if (!f.cycle) return f.color;
    const n = f.cycle.length, u = ((t || 0) * 0.45) % n, i = Math.floor(u), k = u - i;
    const a = hexToRgb(f.cycle[i]), b = hexToRgb(f.cycle[(i + 1) % n]);
    return toHex(mixRgb(a, b, k));
  }
  const masks = new WeakMap();
  let scratch = null;
  function maskFor(sp, k) {              // ring of pixels within k px outside the sprite silhouette, padded by PAD
    let m = masks.get(sp); if (!m) masks.set(sp, m = {});
    if (m[k]) return m[k];
    const PAD = 4, { c, x } = makeCanvas(sp.width + PAD * 2, sp.height + PAD * 2);
    for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) if (dx * dx + dy * dy <= k * k + 1) x.drawImage(sp, PAD + dx, PAD + dy);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-out'; x.drawImage(sp, PAD, PAD);
    return (m[k] = c);
  }
  // Silhouette rim glow (additive). sprite = canvas; x,y = its top-left in ctx units. Returns nothing.
  function drawGlow(ctx, sp, x, y, rarity, t) {
    const f = rarityFx[rarity]; if (!f || !f.alpha || !sp) return;
    const PAD = 4, W = sp.width + PAD * 2, H = sp.height + PAD * 2;
    const col = rarityColor(rarity, t), p = f.pulse ? 0.74 + 0.26 * Math.sin(t * f.pulse) : 1, a = f.alpha * p;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (f.aura) {
      const cx = x + sp.width / 2, cy = y + sp.height / 2, R = Math.max(sp.width, sp.height) * (0.85 + 0.08 * Math.sin(t * 2));
      const gr = ctx.createRadialGradient(cx, cy, 2, cx, cy, R);
      gr.addColorStop(0, rgba(col, 0.28 * p)); gr.addColorStop(0.6, rgba(col, 0.1 * p)); gr.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gr; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.globalCompositeOperation = 'source-over';           // starry halo: twinkling pinpoints orbiting the hero
      for (let i = 0; i < 12; i++) {
        const an = i * 2.399 + t * (0.25 + (i % 3) * 0.08), rr = R * (0.55 + 0.4 * ((i * 37) % 10) / 10), tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7);
        const sx = Math.round(cx + Math.cos(an) * rr * 0.9), sy = Math.round(cy + Math.sin(an) * rr * 1.05);
        ctx.globalAlpha = 0.35 + 0.65 * tw; ctx.fillStyle = rarityColor(rarity, t + i * 0.7);
        if (tw > 0.6) { ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3); }
        ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
    }
    if (!scratch) scratch = makeCanvas(W, H);
    if (scratch.c.width !== W || scratch.c.height !== H) { scratch.c.width = W; scratch.c.height = H; scratch.x.imageSmoothingEnabled = false; }
    const sx = scratch.x;
    sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, W, H);
    sx.globalCompositeOperation = 'lighter';
    for (let k = f.rim; k >= 1; k--) { sx.globalAlpha = k === 1 ? 0.95 : 0.4; sx.drawImage(maskFor(sp, k), 0, 0); }
    sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-in'; sx.fillStyle = col; sx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(1, a); ctx.drawImage(scratch.c, x - PAD, y - PAD);
    ctx.restore();
  }

  // rarityFx rim for the trinket overlays (belt, amulet, and the ring glint on the attack frame); skips common
  function drawTrinketGlow(ctx, b, view, fi, x, y, t) {
    for (const [slot, p] of [['belt', b.look.belt], ['amulet', b.look.amulet], ['ring', b.look.ring && b.look.ring[0]]]) {
      if (!p || (slot === 'ring' && fi !== 6)) continue;
      const r = slot === 'ring' ? b.look.ring.reduce((m, q) => (RANKS.indexOf(q.rarity) > RANKS.indexOf(m) ? q.rarity : m), 'common') : p.rarity;
      drawGlow(ctx, slotSprite(b, slot, view, fi), x, y, r, t);
    }
  }

  // ---- cached rim layers (perf): the in-game path. Per (view, frame) the rim rings of every glowing piece are composited ONCE into
  // one white canvas per rarity; per draw it is only tinted (cached per colour) and blitted with a pulsing alpha. Nothing here
  // runs getImageData / mask building in the frame loop. Gear (head/chest/boots) glows on the OUTER silhouette only; belt, amulet and
  // the ring glint (attack frame) glow on the torso, as DESIGN 19.4 asks; the weapon has its own ring (b.weaponRim).
  const PAD = 4;
  function ringCanvas(sp, rim, cut) {
    const { c, x } = makeCanvas(sp.width + PAD * 2, sp.height + PAD * 2);
    x.globalCompositeOperation = 'lighter';
    for (let k = rim; k >= 1; k--) { x.globalAlpha = k === 1 ? 0.95 : 0.4; x.drawImage(maskFor(sp, k), 0, 0); }
    if (cut) { x.globalCompositeOperation = 'destination-out'; x.globalAlpha = 1; x.drawImage(cut, PAD, PAD); }
    return c;
  }
  const glows = r => { const f = rarityFx[r]; return !!(f && f.alpha); };
  function rimsOf(b, view, fi) {
    const key = view + fi, M = b._rims || (b._rims = {});
    if (M[key]) return M[key];
    const L = b.look, groups = {}, whole = (view === 'back' ? b.back : b.front)[fi];
    const add = (slot, r, outer) => {
      if (!glows(r)) return;
      const ring = ringCanvas(slotSprite(b, slot, view, fi), rarityFx[r].rim, outer ? whole : null), g = groups[r] || (groups[r] = makeCanvas(ring.width, ring.height));
      g.x.globalCompositeOperation = 'lighter'; g.x.drawImage(ring, 0, 0);
    };
    for (const s of ['head', 'chest', 'boots']) if (L[s]) add(s, L[s].rarity, true);
    if (L.belt) add('belt', L.belt.rarity, false);
    if (L.amulet) add('amulet', L.amulet.rarity, false);
    if (fi === 6 && L.ring) { const r = L.ring.reduce((m, q) => (RANKS.indexOf(q.rarity) > RANKS.indexOf(m) ? q.rarity : m), 'common'); add('ring', r, false); }
    return (M[key] = Object.keys(groups).map(r => ({ rarity: r, c: groups[r].c, tint: {} })));
  }
  function weaponRimOf(b) {
    if (b._wrim !== undefined) return b._wrim;
    const r = b.look.weapon && b.look.weapon.rarity;
    return (b._wrim = b.weapon && glows(r) ? { rarity: r, c: ringCanvas(b.weapon, rarityFx[r].rim, null), tint: {} } : null);
  }
  // blit one rim layer (from rimsOf / weaponRimOf); x,y = top-left of the sprite it hugs, in ctx units. Colour tints are cached
  // (mythic cycles through quantised hues).
  function drawRim(ctx, layer, x, y, t) {
    const f = layer && rarityFx[layer.rarity]; if (!f) return;
    let col = f.color, ck = 'c';
    if (f.cycle) { const q = Math.round((t * 0.45 % f.cycle.length) * 5); ck = q; col = rarityColor(layer.rarity, q / 5 / 0.45); }
    let tc = layer.tint[ck];
    if (!tc) { tc = layer.tint[ck] = makeCanvas(layer.c.width, layer.c.height); tc.x.drawImage(layer.c, 0, 0); tc.x.globalCompositeOperation = 'source-in'; tc.x.fillStyle = col; tc.x.fillRect(0, 0, tc.c.width, tc.c.height); }
    const a = f.alpha * (f.pulse ? 0.74 + 0.26 * Math.sin(t * f.pulse) : 1), sv = ctx.globalAlpha, sc = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = sv * Math.min(1, a); ctx.drawImage(tc.c, x - PAD, y - PAD);
    ctx.globalAlpha = sv; ctx.globalCompositeOperation = sc;
  }
  // build every rim layer a build can ask for (both views, 7 frames, the weapon): call once after build(), off the frame loop
  function prewarm(b) {
    if (b._warm) return; b._warm = true;
    for (const v of ['front', 'back']) for (let i = 0; i < FR.length; i++) rimsOf(b, v, i);
    weaponRimOf(b);
  }
  // mythic aura (radial haze + orbiting stars) around a w x h box at x,y; a handful of fillRects, mythic only
  function drawAura(ctx, x, y, w, h, rarity, t) {
    const f = rarityFx[rarity]; if (!f || !f.aura) return;
    const col = rarityColor(rarity, t), p = 0.74 + 0.26 * Math.sin(t * f.pulse), cx = x + w / 2, cy = y + h / 2, R = Math.max(w, h) * (0.85 + 0.08 * Math.sin(t * 2));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(cx, cy, 2, cx, cy, R);
    gr.addColorStop(0, rgba(col, 0.28 * p)); gr.addColorStop(0.6, rgba(col, 0.1 * p)); gr.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gr; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 8; i++) {
      const an = i * 2.399 + t * (0.25 + (i % 3) * 0.08), rr = R * (0.55 + 0.4 * ((i * 37) % 10) / 10), tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7);
      const sx = Math.round(cx + Math.cos(an) * rr * 0.9), sy = Math.round(cy + Math.sin(an) * rr * 1.05);
      ctx.globalAlpha = 0.35 + 0.65 * tw; ctx.fillStyle = rarityColor(rarity, t + i * 0.7);
      if (tw > 0.6) { ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3); }
      ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.restore();
  }

  // ---- particles (pure; caller owns the array; box = emitter rectangle in ctx units) ----
  function emit(arr, rarity, bx, by, bw, bh, dt, cap) {
    const f = rarityFx[rarity]; if (!f || !f.rate) return;
    arr.acc = (arr.acc || 0) + f.rate * dt;
    while (arr.acc >= 1) {
      arr.acc -= 1; if (arr.length >= (cap || 160)) continue;
      const p = { x: bx + frand(0, bw), y: by + frand(0, bh), vx: 0, vy: 0, age: 0, life: 0.8, kind: f.kind, ph: frand(0, 6.28), col: rarityColor(rarity, frand(0, 9)) };
      if (f.kind === 'sparkle') { p.life = frand(0.5, 1.0); }
      else if (f.kind === 'mote') { p.vx = frand(-6, 6); p.vy = frand(2, 9); p.life = frand(0.9, 1.6); }
      else if (f.kind === 'ember') { p.vx = frand(-6, 6); p.vy = -frand(10, 26); p.life = frand(0.8, 1.5); p.col = pick(['#ffd070', '#ffa020', '#ff6a18']); }
      else if (f.kind === 'star') { p.vx = frand(-4, 4); p.vy = -frand(7, 17); p.life = frand(1.1, 2.0); }
      arr.push(p);
    }
  }
  function stepParticles(arr, dt) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i]; p.age += dt;
      if (p.age >= p.life) { arr.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'ember' || p.kind === 'star') p.vx += Math.sin(p.age * 8 + p.ph) * 12 * dt;
    }
  }
  // 1-3 px, saturated body + white core, source-over so they stay readable on bright grass
  function drawParticles(ctx, arr) {
    ctx.save();
    for (const p of arr) {
      const u = p.age / p.life, fade = u > 0.65 ? (1 - u) / 0.35 : 1;
      const x = Math.round(p.x), y = Math.round(p.y);
      let a = fade;
      if (p.kind === 'sparkle') a = Math.sin(Math.PI * u);
      if (p.kind === 'star') a = fade * (0.55 + 0.45 * Math.sin(p.age * 16 + p.ph));
      ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = p.col;
      if (p.kind === 'sparkle' || p.kind === 'star') {
        ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
        if (p.kind === 'star' && a > 0.7) { ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y - 2, 1, 1); ctx.fillRect(x, y + 2, 1, 1); }
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1, 1);
      } else if (p.kind === 'mote') {
        ctx.fillRect(x, y, 2, 2); ctx.globalAlpha *= 0.5; ctx.fillRect(x, y - 2, 1, 2); ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1, 1);
      } else {
        ctx.fillRect(x, y, 1, 2); ctx.fillStyle = '#fff4c0'; ctx.fillRect(x, y, 1, 1); ctx.globalAlpha *= 0.5; ctx.fillStyle = p.col; ctx.fillRect(x, y + 2, 1, 1);
      }
    }
    ctx.restore();
  }

  return {
    FW, FH, TOP, FRAMES: FR.length, ATTACK: 6, REST_ANGLE: REST, build, drawHero, slotSprite, rarityFx, rarityColor, drawGlow, emit, stepParticles, drawParticles, drawTrinketGlow, rimsOf, weaponRimOf, drawRim, drawAura, prewarm, BELT_COLORS: BELTC, ELEMENT_COLORS: ELC,
    FAMILIES: { head: PARTS_ART.families('head'), chest: PARTS_ART.families('chest'), boots: PARTS_ART.families('boots'), weapon: PARTS_ART.families('weapon') },
    GEMS: Object.keys(GEMC), RARITIES: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
    gemColor: n => GEMC[n]
  };
})();
