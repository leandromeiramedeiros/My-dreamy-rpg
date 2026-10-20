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

  // ---- shared tables -------------------------------------------------------
  const CAPEC = { knightplate: '#b02a42', dreamrobe: '#5648c0', stalkerjacket: '#4a7a3c' };
  const M_STEEL = mapT(['#7d8494', '#98a6bd', '#b4c4dc', '#c9d6ec', '#dfe8f8']);
  const FUR = [{ h: '#f4f0e6', m: '#e4e0d4', l: '#bdb8a8' }][0];

  // ---- BOOTS (every tier changes the silhouette: shaft height, flared cops/cuffs, fins, wings) ----
  const BOOTS = {
    knightgreaves: {
      anc: [[8, 29], [14, 29], [9, 26]],
      draw(g, P, back, T) {
        const R = M_STEEL[T], top = [28, 27, 26, 26, 26][T];
        for (let s = 0; s < 2; s++) {
          g.oy = -(s ? P.ra : P.la); const M = g.mir(s);
          if (T >= 4) {                                              // feathered wings
            M.r(5, 25, 3, 1, WHITE.h); M.r(4, 26, 4, 1, WHITE.m); M.r(3, 27, 5, 1, WHITE.h); M.r(4, 28, 4, 1, GOLD.m); M.r(5, 29, 2, 1, GOLD.h);
          }
          M.b(9, top, 3, 29 - top, R); M.b(8, 29, 4, 2, R); M.p(7, 30, R.l);
          M.r(9, 28, 3, 1, R.l);
          if (T === 2) { M.b(8, 25, 4, 3, R); M.r(8, 27, 4, 1, GOLD.m); M.p(7, 29, R.m); M.p(7, 30, GOLD.m); }
          if (T >= 3) { M.b(7, 24, 5, 3, R); M.r(7, 26, 5, 1, GOLD.m); M.p(6, 25, GOLD.h); M.p(6, 24, GOLD.m); M.p(7, 29, GOLD.m); M.p(7, 30, GOLD.h); M.r(8, 29, 4, 1, GOLD.m); }
          if (T >= 4) { M.r(9, 24, 3, 1, GOLD.h); M.p(8, 23, GOLD.m); }
        }
      }
    },
    clothsandals: {
      anc: [[8, 29], [14, 29], [9, 27]],
      draw(g, P, back, T) {
        const C = mapT(['#b8a078', '#c8a868', '#5a84c0', '#7a5cc8', '#e8e0f8'])[T], tie = mapT(['#8a7050', '#a07848', '#d8c070', '#e8b830', '#ffe27a'])[T];
        const top = [28, 27, 26, 25, 25][T];
        for (let s = 0; s < 2; s++) {
          g.oy = -(s ? P.ra : P.la); const M = g.mir(s);
          if (T >= 3) { M.r(5, 25, 3, 1, C.h); M.r(4, 26, 4, 1, C.m); M.r(3, 27, 5, 1, C.h); M.r(4, 28, 4, 1, C.l); if (T >= 4) { M.r(2, 26, 2, 1, GOLD.h); M.r(3, 28, 2, 1, GOLD.m); } }
          M.b(8, 29, 4, 2, tie); M.r(8, 30, 4, 1, tie.d);
          M.b(9, top, 3, 29 - top, C);
          for (let y = top; y < 29; y += 2) { M.p(9, y, C.l); M.p(11, y + 1 > 28 ? 28 : y + 1, C.l); }
          if (T >= 1) M.r(9, top, 3, 1, tie.m);
          if (T >= 2) { M.r(7, 27, 2, 1, tie.m); M.p(7, 28, tie.l); M.p(6, 28, tie.m); M.r(9, 28, 3, 1, GOLD.m); }
          if (T >= 4) { M.r(9, 25, 3, 1, GOLD.m); }
        }
      }
    },
    stalkershoes: {
      anc: [[8, 29], [14, 29], [9, 26]],
      draw(g, P, back, T) {
        const L = mapT(['#8a6840', '#745638', '#5e5a34', '#3e5a3a', '#2c3430'])[T], top = [28, 27, 27, 27, 27][T];
        for (let s = 0; s < 2; s++) {
          g.oy = -(s ? P.ra : P.la); const M = g.mir(s);
          M.b(9, top, 3, 29 - top, L); M.b(8, 29, 4, 2, L); M.r(8, 30, 4, 1, L.d);
          if (T >= 1) { M.p(10, 28, '#d8c8a0'); M.p(9, 27, '#d8c8a0'); M.p(11, 27, '#d8c8a0'); M.p(9, 29, '#b0b0b8'); }
          if (T >= 2) { M.b(8, 25, 4, 2, L); M.r(8, 26, 4, 1, L.l); M.p(8, 29, GOLD.m); M.p(10, 25, GOLD.m); }
          if (T >= 3) { M.r(7, 24, 5, 2, FUR.m); M.p(7, 26, FUR.l); M.p(6, 25, FUR.m); M.p(8, 23, FUR.m); M.p(10, 23, FUR.l); M.r(7, 24, 5, 1, FUR.h); }
          if (T >= 4) { M.r(7, 29, 1, 2, GOLD.m); M.p(6, 30, GOLD.h); M.p(6, 27, GOLD.m); M.p(5, 26, GOLD.h); M.p(6, 28, GOLD.l); M.p(11, 29, GOLD.m); }
        }
      }
    }
  };

  // ---- CHEST ---------------------------------------------------------------
  const CHEST = {
    knightplate: {
      anc: [[11, 17], [5, 15], [17, 15]],
      draw(g, P, back, T) {
        const R = M_STEEL[T], tab = RP(CAPEC.knightplate);
        g.oy = P.bob;
        if (back) { g.b(8, 15, 8, 8, R); g.r(11, 16, 1, 6, R.h); g.r(12, 16, 1, 6, R.l); }
        else {
          g.b(8, 15, 8, 6, R); g.r(11, 16, 1, 5, R.h); g.r(12, 16, 1, 5, R.l);
          g.r(9, 15, 6, 1, R.l); g.p(10, 18, R.l); g.p(13, 18, R.l);
          g.b(8, 21, 8, 3, R); g.r(8, 22, 8, 1, R.l);                           // fauld
          if (T >= 1) { g.r(10, 23, 4, 3, tab.m); g.r(10, 23, 1, 3, tab.h); g.r(13, 23, 1, 3, tab.l); g.p(11, 25, tab.l); }
          if (T >= 2) { g.r(8, 20, 8, 1, GOLD.m); g.r(10, 15, 4, 1, GOLD.m); g.s(11, 21, 1, 2, GOLD.m); }
          if (T >= 3) { g.r(8, 15, 1, 5, GOLD.l); g.r(15, 15, 1, 5, GOLD.l); g.s(9, 18, 2, 1, GOLD.h); }
          if (T >= 4) { g.r(11, 24, 2, 1, GOLD.m); g.p(11, 25, GOLD.h); g.r(9, 23, 6, 1, GOLD.m); g.s(10, 16, 1, 1, GOLD.h); }
        }
        for (let s = 0; s < 2; s++) {                                           // vambrace + gauntlet
          g.oy = P.bob + (s ? P.ray : P.lay); const M = g.mir(s);
          if (T >= 1) { M.b(6, 18, 2, 4, R); if (T >= 2) M.r(6, 18, 2, 1, GOLD.m); }
          if (T >= 2) M.b(6, 23, 2, 2, R);
        }
        g.oy = P.bob;
        const w = [3, 3, 4, 4, 5][T], h = [2, 3, 3, 4, 4][T], y = T >= 3 ? 13 : 14, x = 8 - w;   // pauldrons
        g.sb(x, y, w, h, R);
        if (T >= 1) g.s(x, y + h - 1, w, 1, R.l);
        if (T >= 2) g.s(x, y + h - 1, w, 1, GOLD.m);
        if (T >= 3) { g.s(x, y - 1, 1, 1, R.h); g.s(x + 1, y + h, w - 1, 1, R.l); g.s(x + 1, y + 1, 1, 1, GOLD.m); }
        if (T >= 4) { g.s(x + 1, y - 3, 1, 2, GOLD.m); g.s(x, y - 4, 1, 1, GOLD.h); g.s(x + 2, y - 2, 1, 1, GOLD.h); }
        if (!back) g.gems(this.anc);
      }
    },
    dreamrobe: {
      anc: [[11, 16], [11, 20], [11, 26]],
      draw(g, P, back, T) {
        const R = mapT(['#8a86b8', '#7664c4', '#5c46b8', '#46369c', '#30287c'])[T];
        const SA = mapT(['#a88a5a', '#d05078', '#d8a838', '#e8c850', '#ffe27a'])[T], sw = P.sw;
        g.oy = P.bob;
        g.b(8, 15, 8, 8, R);
        g.oy = 0;                                                                // skirt (sways)
        g.shape(23, [[8, 15], [7, 16], [7, 16], [6, 17], [6 + sw, 17 + sw], [6 + sw, 17 + sw]], R);
        g.r(11, 24, 1, 5, R.l); if (!back) g.r(12, 24, 1, 4, R.h);
        g.oy = P.bob;
        if (!back) { g.r(10, 15, 4, 1, '#ecb890'); g.r(11, 16, 2, 1, '#c88a68'); g.s(9, 15, 1, 1, R.h); }
        g.r(8, 20, 8, 2, SA.m); g.r(8, 20, 8, 1, SA.h); g.r(8, 21, 8, 1, SA.l);   // sash
        if (!back) { g.r(11, 20, 2, 2, SA.h); g.r(13, 22, 2, 5, SA.m); g.r(14, 22, 1, 5, SA.l); g.p(13, 27, SA.h); }
        else { g.r(10, 22, 2, 5, SA.m); g.r(11, 22, 1, 5, SA.l); }
        for (let s = 0; s < 2; s++) {                                            // bell sleeves
          g.oy = P.bob + (s ? P.ray : P.lay); const M = g.mir(s);
          M.b(5, 19, 3, 4, R); M.r(5, 22, 3, 1, T >= 1 ? SA.m : R.l);
          if (T >= 2) M.r(5, 19, 3, 1, GOLD.m);
        }
        g.oy = P.bob;
        if (T >= 1) g.s(8, 16, 1, 4, R.h);
        if (T >= 2) g.r(8, 15, 8, 1, GOLD.m);
        if (T >= 3) { g.shape(14, [[6, 10], [5, 9], [5, 8]], RP(T === 3 ? '#6a5ad0' : '#4a3cb0'), true); g.s(5, 16, 3, 1, GOLD.m); }
        g.oy = 0;
        if (T >= 2) { g.r(6 + sw, 28, 12, 1, GOLD.m); }
        if (T >= 3) { g.p(9, 26, GOLD.h); g.p(14, 25, GOLD.h); g.p(8, 24, GOLD.m); }
        if (T >= 4) { g.p(10, 24, GOLD.h); g.p(15, 27, GOLD.h); g.p(12, 26, '#ffffff'); g.r(11, 15, 2, 1, GOLD.h); }
        g.oy = P.bob;
        if (!back) g.gems(this.anc);
      }
    },
    stalkerjacket: {
      anc: [[11, 18], [9, 16], [13, 20]],
      draw(g, P, back, T) {
        const R = mapT(['#8c6a44', '#76593a', '#5e6b3c', '#3f5a3a', '#2c3430'])[T], ST = RP('#3a2818');
        g.oy = P.bob;
        g.b(8, 15, 8, 7, R);
        g.s(8, 21, 4, 3, R.m); g.s(8, 23, 4, 1, R.l); g.p(11, 23, R.d);       // coat flaps
        if (!back) {
          g.r(11, 16, 2, 6, '#58689a'); g.r(11, 16, 1, 6, '#7080b0');           // open front
          for (let i = 0; i < 6; i++) { g.p(9 + i, 16 + i, ST.m); if (i < 5) g.p(9 + i, 17 + i, ST.l); }   // bandolier
          g.b(13, 19, 2, 3, ST); g.p(13, 19, '#b8a070');                        // pouch
          g.s(9, 14, 3, 2, R.l); g.s(8, 14, 3, 1, R.h);                         // high collar
          g.r(8, 21, 8, 1, ST.m); g.s(11, 21, 1, 1, T >= 2 ? GOLD.m : '#b0b0b8');
        } else {
          g.r(11, 16, 1, 6, R.l); g.r(8, 21, 8, 1, ST.m); g.s(8, 14, 3, 2, R.l);
          for (let i = 0; i < 6; i++) g.p(14 - i, 16 + i, ST.m);
        }
        for (let s = 0; s < 2; s++) {
          g.oy = P.bob + (s ? P.ray : P.lay); const M = g.mir(s);
          if (T >= 1) { M.b(6, 19, 2, 3, { h: R.m, m: R.l, l: R.d }); M.p(6, 19, '#c8b890'); }
          if (T >= 3) M.b(6, 22, 2, 1, FUR);
        }
        g.oy = P.bob;
        g.sb(5, T >= 2 ? 14 : 15, 3, T >= 2 ? 3 : 2, R); g.s(6, 15, 1, 1, '#d8d4c8');   // pads + rivets
        if (T >= 2) { g.s(5, 16, 3, 1, R.l); g.s(5, 14, 1, 1, GOLD.m); }
        if (T >= 3) { g.r(8, 14, 8, 1, FUR.m); g.s(8, 13, 3, 1, FUR.l); g.s(9, 15, 1, 1, FUR.m); g.s(5, 13, 3, 1, FUR.m); }
        if (T >= 4) { g.s(9, 17, 1, 1, GOLD.m); g.s(9, 19, 1, 1, GOLD.m); g.s(5, 12, 1, 1, '#e86a4a'); g.s(4, 11, 1, 1, '#c8482a'); g.p(5, 10, '#ffd8a0'); }
        if (!back) g.gems(this.anc);
      }
    }
  };

  // ---- CAPE ----------------------------------------------------------------
  function cape(g, P, back, chest) {
    const base = CAPEC[chest && chest.family] || '#b02a42', T = chest ? chest.tier : 0;
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

  // ---- HELMETS -------------------------------------------------------------
  const HEAD = {
    knighthelm: {
      anc: [[11, 5], [8, 6], [14, 6]],
      draw(g, P, back, T) {
        const R = M_STEEL[T], PL = RP(['#c8283c', '#c8283c', '#d02e48', '#e03050', '#f03a58'][T]);
        g.oy = P.bob;
        if (T >= 4) { g.s(5, 6, 2, 1, WHITE.h); g.s(4, 5, 2, 1, WHITE.m); g.s(5, 7, 2, 1, GOLD.m); g.s(4, 8, 2, 1, WHITE.m); g.s(3, 6, 1, 2, GOLD.h); }   // wings
        g.shape(3, [[9, 14], [8, 15], [7, 16], [7, 16], [7, 16], [7, 16], [7, 16], [7, 16], [7, 16], [8, 15], [8, 15], [9, 14]], R);
        if (T === 0) g.r(11, 2, 2, 1, R.m);
        if (T === 1) { g.r(11, 1, 2, 2, PL.m); g.p(11, 1, PL.h); g.p(12, 2, PL.l); }
        if (T === 2) { g.shape(0, [[11, 13], [10, 13], [10, 12], [10, 12]], PL); g.p(14, 1, PL.l); g.p(14, 2, PL.d); }
        if (T === 3) { g.shape(0, [[10, 14], [9, 14], [9, 13], [10, 12], [10, 12]], PL); g.p(15, 1, PL.m); g.p(16, 2, PL.l); g.p(16, 3, PL.l); g.p(17, 4, PL.d); }
        if (T === 4) { g.shape(0, [[9, 14], [8, 15], [8, 15], [9, 14], [10, 13], [10, 12]], PL); g.p(16, 3, PL.m); g.p(17, 4, PL.l); g.p(17, 5, PL.d); g.p(6, 3, PL.m); g.p(5, 4, PL.l); g.p(5, 5, PL.d); }
        if (back) {
          g.r(11, 3, 1, 10, R.h); g.r(12, 3, 1, 9, R.l); g.r(7, 8, 10, 1, R.l);
          if (T >= 2) g.r(7, 9, 10, 1, GOLD.m);
        } else {
          g.r(8, 7, 8, 1, R.l); g.r(8, 8, 8, 1, '#0c0a16'); g.r(8, 9, 8, 1, R.l);   // brow + visor slit
          g.p(9, 8, '#9ae8ff'); g.p(10, 8, '#d8f8ff'); g.p(13, 8, '#d8f8ff'); g.p(14, 8, '#9ae8ff');   // glowing eyes
          g.r(11, 3, 1, 9, R.h); g.r(12, 3, 1, 9, R.l); g.r(11, 8, 2, 1, '#0c0a16');
          g.s(9, 11, 2, 1, R.d); g.s(9, 12, 1, 1, R.d);                           // vents
          if (T >= 1) g.r(8, 13, 8, 1, R.l);
          if (T >= 2) { g.r(8, 7, 8, 1, GOLD.m); g.r(8, 9, 8, 1, GOLD.l); }
          if (T >= 3) { g.r(11, 3, 2, 5, GOLD.m); g.r(11, 3, 1, 5, GOLD.h); }
          if (T >= 4) { g.r(8, 5, 8, 1, GOLD.m); g.sp(8, 12, GOLD.m); g.r(11, 9, 2, 4, GOLD.m); }
        }
        if (!back) g.gems(this.anc.map(a => [a[0], a[1]]));
      }
    },
    arcanecowl: {
      anc: [[11, 6], [8, 6], [14, 6]],
      draw(g, P, back, T) {
        const R = mapT(['#4a5aa8', '#4a46b8', '#5a3ec0', '#6a2ec8', '#3a1e98'])[T];
        g.oy = P.bob;
        g.shape(0, [[15, 17], [14, 16], [13, 16], [12, 15], [11, 15], [10, 15], [9, 15], [8, 16], [7, 16], [7, 16], [7, 16]], R);   // pointed tip
        if (T >= 4) { g.p(18, 0, GOLD.h); g.p(18, 1, GOLD.m); g.p(19, 0, '#ffffff'); }
        if (back) { g.shape(11, [[7, 16], [7, 16], [8, 15], [8, 15]], R); g.r(11, 3, 1, 11, R.l); g.r(12, 5, 1, 8, R.d); }
        else {
          g.shape(11, [[7, 8], [7, 8], [7, 8], [7, 8]], R); g.shape(11, [[15, 16], [15, 16], [15, 16], [15, 16]], R);
          g.r(9, 8, 6, 1, R.d); g.r(9, 9, 6, 1, R.l); g.r(8, 9, 1, 5, R.l);
          g.shape(14, [[7, 10], [8, 11]], R); g.shape(14, [[13, 16], [12, 15]], R);   // cowl on shoulders
          if (T >= 2) { g.r(9, 8, 6, 1, GOLD.l); g.s(7, 9, 1, 5, GOLD.m); }
          g.p(12, 5, T >= 3 ? '#ffffff' : GOLD.h);                                  // star emblem
          if (T >= 1) { g.p(11, 5, GOLD.m); g.p(12, 4, GOLD.m); g.p(12, 6, GOLD.m); g.p(13, 5, GOLD.m); }
          if (T >= 3) { g.sp(9, 3, GOLD.m); g.p(14, 8, '#ffffff'); g.p(10, 4, '#ffffff'); g.p(8, 9, GOLD.h); }
          if (T >= 4) { g.p(12, 5, '#ff9ae8'); g.p(11, 4, GOLD.h); g.p(13, 4, GOLD.h); g.p(11, 6, GOLD.h); g.p(13, 6, GOLD.h); g.p(14, 3, '#ffffff'); g.sp(8, 13, GOLD.h); }
        }
        g.p(10, 3, R.h); g.p(11, 2, R.h);
        g.r(7, 7, 10, 1, T >= 2 ? GOLD.m : R.l);
        if (!back) g.gems(this.anc);
      }
    },
    wardenhood: {
      anc: [[11, 6], [8, 6], [14, 6]],
      draw(g, P, back, T) {
        const R = mapT(['#5a7a3e', '#4a8a40', '#3a9a50', '#2f8a64', '#237a6c'])[T], LF = RP(['#78a840', '#68c048', '#58d060', '#60e088', '#ffd860'][T]);
        const leaf = (x, y, c) => { g.p(x, y, c.m); g.p(x + 1, y, c.h); g.p(x, y + 1, c.l); g.p(x + 1, y + 1, c.m); };
        g.oy = P.bob;
        g.shape(3, [[9, 14], [8, 15], [7, 16], [7, 16], [7, 16], [7, 16]], R);
        if (back) { g.shape(9, [[7, 16], [7, 16], [7, 16], [8, 15], [8, 15]], R); g.r(11, 4, 1, 9, R.l); g.r(12, 6, 1, 7, R.d); }
        else {
          g.shape(9, [[7, 8], [7, 8], [7, 8], [7, 8], [8, 9], [9, 10]], R); g.shape(9, [[15, 16], [15, 16], [15, 16], [15, 16], [14, 15], [13, 14]], R);
          g.r(9, 7, 6, 1, R.d); g.r(9, 8, 6, 1, R.l);
          if (T >= 2) { g.r(9, 8, 6, 1, LF.m); g.s(8, 9, 1, 1, LF.h); }
        }
        leaf(10, 1, LF); leaf(13, 1, LF); g.p(12, 3, R.h);
        if (T >= 1) { leaf(5, 5, LF); leaf(17, 5, LF); leaf(6, 10, LF); leaf(16, 10, LF); }
        if (T >= 2) { g.p(8, 3, '#f06a8a'); g.p(15, 3, '#f06a8a'); g.p(9, 14, '#f0d860'); g.p(14, 14, '#f06a8a'); }
        if (T >= 3) { g.s(7, 1, 1, 2, '#7a5a38'); g.s(6, 0, 1, 1, '#7a5a38'); g.s(5, 0, 1, 1, LF.h); g.s(8, 0, 1, 1, LF.m); }
        if (T >= 4) { g.r(8, 3, 8, 1, GOLD.m); g.s(4, 1, 1, 1, GOLD.h); g.s(3, 3, 1, 2, GOLD.m); g.p(11, 0, '#ffffff'); g.p(12, 0, GOLD.h); }
        if (!back) g.gems(this.anc);
      }
    }
  };

  // ---- WEAPONS (separate held sprites, 16x40, point up; grip = hand anchor) -
  const WW = 16;
  const WEAP = {
    sword: {
      grip: [8, 28], anc: [[7, 29], [7, 20], [7, 37]], oy: -6, H: 34, tipY: T => 29 - [11, 14, 17, 19, 21][T] - 6,
      draw(g, T) {
        g.oy = -6;
        const B = RP(['#a0907e', '#aeb8c8', '#c4d4e8', '#d8ecff', '#fff0c0'][T]), wide = T >= 2;
        const L = [11, 14, 17, 19, 21][T], top = 29 - L, x0 = wide ? 6 : 7, w = wide ? 4 : 2;
        const G = T === 0 ? RP('#6a5a4a') : T === 1 ? RP('#8a94a8') : GOLD, lea = RP(T >= 3 ? '#3a2848' : '#5a3a24');
        for (let y = top; y <= 28; y++) {
          const tip = y === top, xx = tip ? 7 : x0, ww = tip ? 2 : w;
          g.r(xx, y, ww, 1, B.m); g.p(xx, y, B.h); g.p(xx + ww - 1, y, ww === 2 ? B.l : B.m);
          if (wide && !tip) { g.p(8, y, B.l); }
          if (T === 3 && !tip && y % 3 === 0) { g.p(x0, y, '#8ad8ff'); g.p(x0 + w - 1, y, '#8ad8ff'); }
          if (T === 4 && !tip) { if (y % 4 === 0) g.p(7, y, GOLD.m); g.p(9, y, GOLD.h); }
        }
        if (T === 0) { g.p(8, top + 2, '#a05a38'); g.p(7, top + 6, '#a05a38'); g.p(8, top + 8, '#a05a38'); g.ctx.clearRect(8, top + 4 + g.oy, 1, 1); g.p(7, top + 4, B.d); }
        if (T === 1) g.r(7, top + 3, 1, L - 5, B.l);
        const gw = [6, 8, 10, 12, 14][T], gx = 8 - gw / 2;
        g.b(gx, 29, gw, 2, G);
        if (T >= 2) { g.s(gx, 28, 1, 1, GOLD.h); }
        if (T >= 3) { g.s(gx, 27, 1, 2, GOLD.m); g.s(gx + 1, 31, 2, 1, GOLD.l); }
        if (T >= 4) { g.s(gx - 1, 26, 1, 3, GOLD.h); g.s(gx + 2, 31, 2, 2, WHITE.m); g.s(gx + 3, 33, 1, 1, WHITE.h); g.s(gx, 31, 1, 1, GOLD.m); }
        g.r(7, 31, 2, 6, lea.m);
        for (let y = 31; y < 37; y += 2) g.r(7, y, 2, 1, lea.l);
        if (T >= 2) { g.r(7, 31, 2, 1, GOLD.m); g.r(7, 36, 2, 1, GOLD.m); }
        if (T <= 1) g.b(7, 37, 2, 2, G); else if (T === 2) g.b(6, 37, 4, 2, GOLD); else g.b(6, 37, 4, 3, GOLD);
        g.gems(this.anc);
      }
    },
    staff: {
      grip: [8, 26], oy: 0, H: 38, tipY: T => [9, 9, 8.5, 8.5, 8.5][T] | 0, anc: [[7, 8], [7, 24], [7, 31]],
      draw(g, T) {
        const W = RP(['#7a5a3a', '#6a4a30', '#5e4028', '#e8e0c0', '#f4ecd0'][T]), O = RP(['#6a8ac0', '#58b0e8', '#9070f0', '#d070ff', '#ff9ae8'][T]);
        const r = [1.7, 2.3, 2.9, 3.3, 3.9][T], cy = [9, 9, 8.5, 8.5, 8.5][T], cx = 7.5;
        g.r(7, 14, 2, 23, W.m); g.r(7, 14, 1, 23, W.h); g.r(8, 14, 1, 23, W.l);
        if (T === 0) { g.p(8, 22, W.d); g.p(7, 29, W.d); }
        if (T >= 2) { g.r(7, 22, 2, 1, GOLD.m); g.r(7, 30, 2, 1, GOLD.m); g.r(7, 35, 2, 2, GOLD.m); }
        if (T >= 3) { g.p(7, 26, '#8ad8ff'); g.p(8, 33, '#8ad8ff'); g.r(7, 37, 2, 1, GOLD.l); }
        const pr = [[[6, 14], [5, 13], [5, 12], [5, 11], [5, 10]], [[6, 14], [5, 13], [4, 12], [4, 11], [4, 10], [4, 9]],
          [[6, 14], [5, 13], [4, 12], [4, 11], [4, 10], [4, 9], [5, 8]], [], []][T];
        const pc = T >= 2 ? GOLD : W;
        pr.forEach(([x, y]) => { g.p(x, y, pc.m); g.p(15 - x, y, pc.m); g.p(x, y - 1 < 0 ? 0 : y, pc.h); });
        if (T === 1) { g.p(4, 13, '#58c060'); g.p(11, 13, '#58c060'); g.p(5, 14, '#58c060'); }
        if (T >= 3) {                                            // crescent / rings
          for (let y = 0; y < 18; y++) for (let x = 0; x < WW; x++) {
            const d = Math.hypot(x - cx, y - cy), dr = Math.hypot(x - cx, (y - cy) * 2.4);
            if (T >= 3 && d >= r + 1 && d <= r + 2.1 && y <= cy + 2) g.p(x, y, d < r + 1.6 ? GOLD.h : GOLD.m);
            if (T >= 4 && Math.abs(dr - (r + 3.4)) < 0.55 && y > cy) g.p(x, y, GOLD.m);
          }
        }
        for (let y = 0; y < 18; y++) for (let x = 0; x < WW; x++) {   // orb
          const d = Math.hypot(x - cx, y - cy); if (d > r) continue;
          const sh = (x - cx) + (y - cy);
          g.p(x, y, sh < -r * 0.5 ? O.h : sh > r * 0.6 ? O.l : O.m);
        }
        g.p(Math.round(cx - r * 0.5 - 0.5), Math.round(cy - r * 0.5 - 0.5), '#ffffff');
        if (T >= 2) g.p(7, Math.round(cy), O.h);
        if (T >= 3) { g.p(2, 3, O.h); g.p(13, 5, O.h); g.p(3, 12, '#ffffff'); }
        if (T >= 4) { g.s(2, 7, 1, 2, GOLD.m); g.s(1, 6, 1, 1, GOLD.h); g.p(7, 0, GOLD.h); g.p(8, 0, GOLD.m); g.p(7, 1, '#fff'); g.p(8, 1, GOLD.h); }
        g.gems(this.anc);
      }
    },
    bow: {
      grip: [12, 16], oy: -4, H: 32, tipY: T => 2, anc: [[10, 19], [9, 12], [9, 28]],
      draw(g, T) {
        g.oy = -4;
        const W = RP(['#8a6038', '#6e4a2c', '#5a6a34', '#3c7a4c', '#f0e0a0'][T]);
        const bx = y => 11 - Math.round(6 * Math.pow((y - 20) / 14, 2)) + (T >= 2 ? Math.max(0, 9 - y) + Math.max(0, y - 31) : 0);
        const sx = bx(6);
        for (let y = 6; y <= 34; y++) {
          const a = bx(y), b = bx(y + 1 > 34 ? 34 : y + 1), lo = Math.min(a, b);
          const tipZone = y <= 8 || y >= 32;
          g.r(lo, y, Math.abs(a - b) + 2, 1, (T >= 2 && tipZone) ? GOLD.m : W.m);
          g.p(lo, y, (T >= 2 && tipZone) ? GOLD.h : W.h); g.p(Math.max(a, b) + 1, y, W.l);
          if (T === 3 && y % 5 === 2 && !tipZone) g.p(a + 1, y, '#9affb0');
          if (T === 4 && y % 4 === 0 && !tipZone) g.p(a, y, GOLD.m);
        }
        const SC = ['#d8d0c0', '#e8e0d0', '#f0e8d0', '#a0ffb0', '#ffffff'][T];
        g.r(sx, 7, 1, 27, SC);
        const lea = RP('#5a3a24');
        for (let y = 17; y <= 23; y++) { g.r(11, y, 2, 1, (y % 2) ? lea.l : lea.m); }
        if (T >= 2) { g.r(11, 17, 2, 1, GOLD.m); g.r(11, 23, 2, 1, GOLD.m); }
        if (T >= 3) { g.p(13, 18, '#8ad8ff'); g.p(13, 22, '#8ad8ff'); }
        if (T >= 4) { g.p(13, 17, WHITE.h); g.p(14, 16, WHITE.m); g.p(14, 18, WHITE.m); g.p(13, 23, WHITE.h); g.p(14, 22, WHITE.m); g.p(14, 24, WHITE.m); g.p(15, 20, GOLD.h); g.p(14, 20, GOLD.m); g.p(13, 20, GOLD.m); }
        g.gems(this.anc);
      }
    }
  };


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
  const piece = p => (p && p.family ? { family: p.family, tier: clamp(p.tier | 0, 0, 4), gems: p.gems || null, tempered: !!p.tempered } : null);
  function renderFrame(L, back, fi, only) {
    const { c, x } = makeCanvas(FW, FH), g = mkG(x, back), P = FR[fi];
    x.translate(0, TOP);
    const run = (slot, tbl, args) => {
      const p = L[slot]; if (!p || (only && only !== slot)) return;
      const fam = tbl[p.family]; if (!fam) return;
      g.gl = p.gems; g.oy = 0; withTemper(x, g, p.tempered, back, tg => fam.draw(tg, P, back, p.tier));
    };
    const doCape = () => { if (!only || only === 'cape') { g.gl = null; cape(g, P, back, L.chest); } };
    const tri = (slot, f) => { const p = L[slot]; if (!p || (only && only !== slot)) return; g.gl = null; withTemper(x, g, p.tempered, back, tg => f(tg, p)); };
    if (!only || only === 'body') {
      if (!back) doCape();
      g.gl = null; body(g, P, back, L);
      if (!L.boots) for (let s = 0; s < 2; s++) { g.oy = -(s ? P.ra : P.la); g.mir(s).b(8, 29, 4, 2, RP(L.skin || '#ecb890')); }
    } else if (!back) doCape();
    run('boots', BOOTS); run('chest', CHEST);
    if (back && (!only || only === 'cape')) doCape();
    tri('belt', (tg, p) => drawBelt(tg, P, back, p)); tri('amulet', (tg, p) => drawAmulet(tg, P, back, p));
    run('head', HEAD);
    if (fi === 6 && L.ring && (!only || only === 'ring')) {
      const hit = L.ring.filter(r => RANKS.indexOf(r.rarity) >= 3);
      if (hit.length) { const r = hit[0]; g.gl = null; withTemper(x, g, r.tempered, back, tg => drawRingGlint(tg, P, r)); }
    }
    if (!only) outline(c);
    return c;
  }
  function renderWeapon(w) {
    const fam = WEAP[w.family], { c, x } = makeCanvas(WW, fam ? fam.H : 20), g = mkG(x, false, WW);
    if (!fam) return { c, grip: [8, 10], tip: [8, 0] };
    g.gl = w.gems; fam.draw(g, w.tier); if (w.tempered) edgeLight(c, 0.6); outline(c);
    return { c, grip: fam.grip, tip: [8, fam.tipY(w.tier)] };
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
    } else { b.weapon = null; b.weaponGrip = { x: 0, y: 0 }; b.weaponTip = { x: 0, y: 0 }; }
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
    FW, FH, TOP, FRAMES: FR.length, ATTACK: 6, REST_ANGLE: REST, build, drawHero, slotSprite, rarityFx, rarityColor, drawGlow, emit, stepParticles, drawParticles, drawTrinketGlow, BELT_COLORS: BELTC, ELEMENT_COLORS: ELC,
    FAMILIES: { head: Object.keys(HEAD), chest: Object.keys(CHEST), boots: Object.keys(BOOTS), weapon: Object.keys(WEAP) },
    GEMS: Object.keys(GEMC), RARITIES: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
    gemColor: n => GEMC[n]
  };
})();
