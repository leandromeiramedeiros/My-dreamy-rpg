'use strict';
// ---------------------------------------------------------------------------
// Procedural pixel art: characters, monsters, flora, props, icons, skies.
// Everything is generated once at load into offscreen canvases.
// ---------------------------------------------------------------------------
const ART = {};

// ===== Player =================================================================
const CHAR_FRONT = [
  '................',
  '................',
  '......KKKK......',
  '.....KHHHHK.....',
  '....KHLLHHhK....',
  '....KHLHHHhK....',
  '...KGGGGGGGGK...',
  '....KSSSSSSK....',
  '....KSESSESK....',
  '....KsSSSSsK....',
  '.....KKSSKK.....',
  '...KKlAAAAlKK...',
  '..KClAAGGAAlCK..',
  '..KCaAAGGAAaCK..',
  '..KSKaAAAAaKSK..',
  '..KCKWWGGWWKCK..',
  '..KcKaAAAAaKcK..',
  '...KKaaAAaaKK...',
];
const CHAR_BACK = [
  '................',
  '................',
  '......KKKK......',
  '.....KHHHHK.....',
  '....KHHHHHhK....',
  '....KHHHHHhK....',
  '...KGGGGGGGGK...',
  '....KhHHHHhK....',
  '....KhHHHHhK....',
  '....KhhhhhhK....',
  '.....KKhhKK.....',
  '...KKlCCCClKK...',
  '..KAlCCCCCClAK..',
  '..KAaCCCCCCaAK..',
  '..KSKCCCCCCKSK..',
  '..KCKCCcCcCKCK..',
  '..KcKCcCcCcKcK..',
  '...KKcCcCcCKK...',
];
const LEGS_IDLE = [
  '....KPPPPPPK....',
  '.....KPKKPK.....',
  '.....KPKKPK.....',
  '.....KOKKOK.....',
  '....KOOKKOOK....',
  '....KKKKKKKK....',
];
const LEGS_A = [
  '....KPPPPPPK....',
  '.....KPKKPK.....',
  '....KOOKKPK.....',
  '....KKKKKPK.....',
  '........KOOK....',
  '........KKKK....',
];
const LEGS_B = LEGS_A.map(r => r.split('').reverse().join(''));

const HEAD_OVERLAYS = {
  knighthelm: {
    front: { 0: '....RRR.........', 1: '.....RRRR.......', 7: '....KHSSSSHK....', 8: '....KHESSEHK....', 9: '....KhSSSShK....' },
    back: { 0: '....RRR.........', 1: '.....RRRR.......' },
  },
  arcanecowl: {
    front: {
      0: '.........KK.....', 1: '........KHHK....', 2: '.......KHHhK....', 3: '......KHHHhK....',
      4: '.....KHLHHHhK...', 5: '...KKKHHHHHhKK..', 6: '..KGGGGGGGGGGGK.',
    },
    back: {
      0: '.........KK.....', 1: '........KHHK....', 2: '.......KHHhK....', 3: '......KHHHhK....',
      4: '.....KHHHHHhK...', 5: '...KKKHHHHHhKK..', 6: '..KGGGGGGGGGGGK.',
    },
  },
  wardenhood: {
    front: {
      2: '......KKKK......', 3: '....KKHHHHKK....', 4: '...KHLLHHHHhK...', 5: '...KHLHHHHHhK...',
      6: '...KHHHHHHHhK...', 7: '...KHSSSSSShK...', 8: '...KHSESSEShK...', 9: '...KhsSSSSshK...', 10: '....KhKSSKhK....',
    },
    back: {
      2: '......KKKK......', 3: '....KKHHHHKK....', 4: '...KHHHHHHHhK...', 5: '...KHHHHHHHhK...',
      6: '...KHHHHHHHhK...', 7: '...KhHHHHHHhK...', 8: '...KhHHHHHHhK...', 9: '...KhhhhhhhhK...', 10: '....KhKhhKhK....',
    },
  },
};

// ===== The hero sprite seam (M3): the layered paper-doll in js/hero.js ===================================================
// buildPlayerSprites(equip) takes the equipped gear INSTANCES ({ slot: { base, rarity, sockets, tempered, implicit } }, items.js, all
// EQUIP_SLOTS keys) or plain family ids, and returns the p.spr shape the game and HUD read ({front, back, frontF, backF, white,
// portrait, w, h, ox}) plus `hero` (the HERO.build result: 7 cached frames per view, a held weapon and rim layers) and `sig`.
// Cost: ~10 ms once per equip change (renderFrame x 14); the rim layers (~25 ms more) are built one per frame afterwards (HERO.warmStep, from
// drawPlayer); drawPlayer itself only blits cached canvases (~25-70 us a frame).
// Item rules: the family is the item's VARIANT / suit (hero.js keys: sword staff bow, warden dreamweave stalker, ...), the tier is
// the BASES tier index 0..4 (trinkets 0..2, hero.js wants 1..3), a belt's family is its BASE id (its colour), never the variant.
function heroSig(equip) {          // cheap (per frame) change detector; the key of what is drawn, not of what is rolled
  let s = '';
  for (let i = 0; i < HERO_SLOTS.length; i++) {
    const v = equip[HERO_SLOTS[i]];
    s += v ? (typeof v === 'string' ? v : v.base + (v.rarity || '') + (v.tempered ? 'T' : '') + (v.sockets ? v.sockets.join('') : '') + (v.implicit ? v.implicit.id : '')) + '|' : '|';
  }
  return s;
}
const HERO_SLOTS = ['weapon', 'head', 'chest', 'boots', 'belt', 'amulet', 'ring1', 'ring2'];
function heroLookOf(equip) {
  const gemType = g => String(g).split('_')[0];
  const part = (slot, trinket) => {
    const v = equip[slot]; if (!v) return null;
    if (typeof v === 'string') return { family: v, tier: 1 };           // a bare family id (tools, old callers)
    const b = baseOf(v.base); if (!b) return null;
    const el = v.implicit && /Dmg$/.test(v.implicit.id) ? v.implicit.id.slice(0, -3) : null;
    const o = { family: trinket ? v.base : b.variant, tier: trinket ? b.tier + 1 : b.tier, rarity: v.rarity, tempered: !!v.tempered };
    if (trinket) o.element = el; else o.gems = (v.sockets || []).filter(Boolean).map(gemType);
    return o;
  };
  const rings = ['ring1', 'ring2'].map(k => part(k, true)).filter(Boolean);
  return { weapon: part('weapon'), head: part('head'), chest: part('chest'), boots: part('boots'), belt: part('belt', true), amulet: part('amulet', true), ring: rings.length ? rings : null };
}
const HERO_PORTRAIT_OX = 2;
function buildPlayerSprites(equip) {
  if (typeof HERO === 'undefined') return buildLegacyPlayerSprites(equip);
  const hero = HERO.build(heroLookOf(equip)), W = hero.w, H = hero.h;
  const pick4 = v => [hero[v][0], hero[v][3], hero[v][0], hero[v][5]];                   // idle, stride, idle, stride (old p.spr layout)
  const out = { hero, sig: heroSig(equip), front: pick4('front'), back: pick4('back') };
  out.frontF = out.front.map(flipH); out.backF = out.back.map(flipH);
  out.white = silhouette(out.front[0], '#ffffff');
  // portrait: hud.js crops 16x16 at (ox, ox); centre the face in it (head spans x 7..16, y 2..15 of the 24x34 frame)
  const pc = makeCanvas(20, 20); pc.x.drawImage(hero.front[0], -2, 0);
  out.portrait = pc.c; out.w = W; out.h = H; out.ox = HERO_PORTRAIT_OX;
  let top = 'common';                                                                     // best rarity worn: drives the aura, light and particles
  for (const k of HERO_SLOTS) { const v = equip[k]; if (v && typeof v !== 'string' && RARITY[v.rarity] && RARITY[v.rarity].i > RARITY[top].i) top = v.rarity; }
  out.top = top === 'common' ? null : top;
  return out;                                                                             // rim layers warm up a few per frame (HERO.warmStep, from drawPlayer)
}

// the M1 sprite builder: kept only as the fallback for pages that load art.js without hero.js
function buildLegacyPlayerSprites(equip) {
  const gear = {};
  for (const s of ['weapon', 'head', 'chest', 'boots']) { const v = equip[s]; gear[s] = typeof v === 'string' ? v : (v && familyOf(v.base)) || ITEMS[s][0].id; }
  const head = ITEMS.head.find(i => i.id === gear.head);
  const chest = ITEMS.chest.find(i => i.id === gear.chest);
  const boots = ITEMS.boots.find(i => i.id === gear.boots);
  const pal = Object.assign({
    K: '#1a1326', S: '#f6d2b5', s: '#d9a088', E: '#2b2140', G: '#f2c45a', W: '#5a3b2e',
  }, head.pal, chest.pal, boots.pal);
  if (ART.img['hero_' + gear.head + '_f']) return buildSpritePlayer(gear, Object.assign({}, head.pal, chest.pal, boots.pal));
  const ov = HEAD_OVERLAYS[gear.head];
  const build = (body, legs, over) => {
    const rows = body.slice();
    for (const k in over) rows[+k] = over[k];
    return asciiSprite(rows.concat(legs), pal);
  };
  const out = { front: [], back: [] };
  for (const legs of [LEGS_IDLE, LEGS_A, LEGS_IDLE, LEGS_B]) {
    out.front.push(build(CHAR_FRONT, legs, ov.front));
    out.back.push(build(CHAR_BACK, legs, ov.back));
  }
  out.frontF = out.front.map(flipH);
  out.backF = out.back.map(flipH);
  out.white = silhouette(out.front[0], '#ffffff');
  out.portrait = out.front[0];
  out.w = 16; out.h = 24; out.ox = 0;
  return out;
}

// ===== sprite images (js/sprites.js) ============================================
// The hero is drawn in the Knight colours; these exact colours are swapped for the gear worn.
const GEAR_MASK = {
  H: '#cfd6ea', h: '#8e97b8', L: '#ffffff', R: '#e0475e', A: '#a9b4d4', a: '#6d779e', l: '#e6ecfa',
  C: '#3b5bb5', c: '#263f86', P: '#4b4f6e', p: '#363a56', O: '#b9c2dc', o: '#7d86a6',
};
ART.img = {};
function loadSprites() {
  if (typeof SPRITE_ART === 'undefined') return Promise.resolve();
  return Promise.all(Object.entries(SPRITE_ART).map(([name, a]) => new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const fw = im.width / a.frames;
      ART.img[name] = [];
      for (let i = 0; i < a.frames; i++) { const { c, x } = makeCanvas(fw, im.height); x.drawImage(im, -i * fw, 0); ART.img[name].push(c); }
      res();
    };
    im.onerror = () => res();
    im.src = a.src;
  })));
}
function recolor(canvas, map) {
  const { c, x } = makeCanvas(canvas.width, canvas.height);
  x.drawImage(canvas, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const to = map[(d[i] << 16) | (d[i + 1] << 8) | d[i + 2]];
    if (to) { d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; }
  }
  x.putImageData(im, 0, 0);
  return c;
}
function buildSpritePlayer(gear, want) {
  if (want.P && !want.p) want.p = '#' + mulRgb(hexToRgb(want.P), 0.72).map(v => (v | 0).toString(16).padStart(2, '0')).join('');
  if (want.O && !want.o) want.o = '#' + mulRgb(hexToRgb(want.O), 0.68).map(v => (v | 0).toString(16).padStart(2, '0')).join('');
  const map = {};
  for (const k in GEAR_MASK) if (want[k]) { const m = hexToRgb(GEAR_MASK[k]); map[(m[0] << 16) | (m[1] << 8) | m[2]] = hexToRgb(want[k]); }
  const out = {
    front: ART.img['hero_' + gear.head + '_f'].map(f => recolor(f, map)),
    back: ART.img['hero_' + gear.head + '_b'].map(f => recolor(f, map)),
  };
  out.frontF = out.front.map(flipH); out.backF = out.back.map(flipH);
  out.white = silhouette(out.front[0], '#ffffff');
  out.portrait = out.front[0];
  out.w = out.front[0].width; out.h = out.front[0].height; out.ox = 1;
  return out;
}
const sprOne = n => ART.img[n] && ART.img[n][0];
const sprFamily = prefix => Object.keys(ART.img).filter(k => k.startsWith(prefix)).sort().map(k => ART.img[k][0]);
function applySprites() {
  if (!sprOne('slime')) return;
  for (const k of ['sword', 'staff', 'bow', 'arrow']) ART.weapons[k] = sprOne(k);
  ART.slime = { n: sprOne('slime'), w: silhouette(sprOne('slime')) };
  const h = ART.img.hound;
  ART.hound = { n: h, f: h.map(flipH), w: silhouette(h[0]), wf: silhouette(flipH(h[0])) };
  const b = sprOne('boss');
  ART.boss = { n: b, f: flipH(b), w: silhouette(b), wf: silhouette(flipH(b)) };
  { const dead = sprFamily('tree_dead_'); if (dead.length) ART.trees.dead = dead; }   // trees v2 come from frozenTrees (buildTreesV2), not this loop
  ART.bush = ART.bushV2 || sprFamily('bush_');   // §29 G2: cluster bushes (no full outline) replace the frozen blob bushes
  ART.grass = sprFamily('grass_');
  ART.rock = sprFamily('rock_') .filter(c => !sprFamily('rock_dark_').includes(c));
  ART.rockDark = sprFamily('rock_dark_');
  Object.assign(ART, {
    lantern: sprOne('lantern'), lanternBlue: sprOne('lantern_blue'), mushroom: sprOne('mushroom'),
    crystal: sprOne('crystal'), crystalViolet: sprOne('crystal_violet'), sign: sprOne('sign'),
    brazier: sprOne('brazier'), shrine: sprOne('shrine'), dummy: sprOne('dummy'),
  });
  ART.house.c = sprOne('house');
}

// ===== Weapons ================================================================
function buildWeapons() {
  ART.weapons = {
    sword: asciiSprite([
      '...KK...........',
      'KK.KGKKKKKKKKK..',
      'KWWGGLLLLLLLLLLK',
      'KK.KGBBBBBBBBK..',
      '...KK...........',
    ], { K: '#1a1326', W: '#6b4330', G: '#f2c45a', L: '#fff6d6', B: '#d8c08c' }),
    staff: asciiSprite([
      '................KK..',
      '...............KCCK.',
      'KWWWWWWWWWWWWWWGCLCK',
      '...............KCCK.',
      '................KK..',
    ], { K: '#1a1326', W: '#7a5236', G: '#f2c45a', C: '#7fe6ff', L: '#ffffff' }),
  };
  // bow, drawn as an arc (pointing right, string on the left)
  const pb = new PixBuf(7, 19);
  const wood = hexToRgb('#cfd9ff'), dark = hexToRgb('#6c78b8'), str = hexToRgb('#f6f2ff');
  for (let t = -1; t <= 1.0001; t += 0.02) {
    const x = 1 + Math.round(4.2 * (1 - t * t)), y = Math.round(9 + t * 9);
    pb.set(x, y, wood); pb.set(x + 1, y, dark);
  }
  for (let y = 0; y <= 18; y++) pb.set(1, y, str, 200);
  pb.set(5, 9, hexToRgb('#f2c45a')); pb.set(6, 9, hexToRgb('#f2c45a'));
  ART.weapons.bow = pb.outline(0.3).toCanvas();
  ART.weapons.arrow = asciiSprite(['K.........', 'WWWWWWWWLL', 'K.........'], { K: '#e7d6ff', W: '#bfa27a', L: '#ffffff' });
}

// ===== Monsters ===============================================================
function buildMonsters() {
  const slime = asciiSprite([
    '.....KKKK.....',
    '...KKMMLLKK...',
    '..KMMMMMLLMK..',
    '.KMMMMMMMMLMK.',
    '.KMMWEMMWEMMK.',
    'KMMMWEMMWEMMMK',
    'KMMMMMMMMMMMMK',
    'KmMMMMMKKMMMmK',
    'KmmMMMMMMMMmmK',
    '.KmmmmmmmmmmK.',
    '..KKKKKKKKKK..',
  ], { K: '#1d1430', M: '#8b7cf6', m: '#5a4bc4', L: '#e2dbff', W: '#ffffff', E: '#1a1326' });
  const hound = asciiSprite([
    '...........K..K...',
    '..........KDK.KDK.',
    '.KK......KDDDKDDDK',
    'KTTK...KDDDDDYDDK.',
    '.KTTKKKDDDDDDDDDDK',
    '..KDDDDDDDDDDDdWWK',
    '..KDDDDDDDDDDDDKK.',
    '..KdDDDDDDDDDDdK..',
    '..KdDKKDDDDKKDdK..',
    '..KdK.KdKKdK.KdK..',
    '..KKK.KKK.KKK.KKK.',
  ], { K: '#140d20', D: '#3d2f58', d: '#271d3c', T: '#a05bd6', Y: '#ff6b9a', W: '#efe8ff' });
  const hound2 = asciiSprite([
    '...........K..K...',
    '..........KDK.KDK.',
    '.KK......KDDDKDDDK',
    'KTTK...KDDDDDYDDK.',
    '.KTTKKKDDDDDDDDDDK',
    '..KDDDDDDDDDDDdWWK',
    '..KDDDDDDDDDDDDKK.',
    '..KdDDDDDDDDDDdK..',
    '..KdDKKDDDDKKDdK..',
    '.KdK..KdKKdK..KdK.',
    '.KKK..KKKKKK..KKK.',
  ], { K: '#140d20', D: '#3d2f58', d: '#271d3c', T: '#a05bd6', Y: '#ff6b9a', W: '#efe8ff' });
  ART.slime = { n: slime, w: silhouette(slime) };
  ART.hound = { n: [hound, hound2], f: [flipH(hound), flipH(hound2)], w: silhouette(hound), wf: silhouette(flipH(hound)) };
  ART.boss = buildBoss();
}

function buildBoss() {
  const W = 44, H = 58, pb = new PixBuf(W, H);
  const cloak = ramp(['#120b1e', '#1f1433', '#2e1f4a', '#45306a', '#5f4690']);
  const metal = ramp(['#2a2440', '#4a4366', '#7a7399', '#b6b0d6']);
  const cx = 22;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      let inside = false, mat = 0, v = 0;
      // hood / head
      const hy = y - 15;
      if (dx * dx / 64 + hy * hy / 72 < 1) { inside = true; v = 0.55 - dx / 22 - hy / 40; }
      // shoulders + robe
      if (y >= 18) {
        const t = (y - 18) / (H - 18);
        const half = 15 + t * 4 + Math.sin(y * 0.4) * 0.6;
        const tatter = y > H - 10 ? (fbm(x * 0.5, 3, 2, 9) * 14 > (y - (H - 10)) + 1 ? 1 : 0) : 1;
        if (Math.abs(dx) < half && tatter) {
          inside = true;
          v = 0.5 - dx / (half * 2.2) + Math.sin(dx * 0.9 + t * 3) * 0.12 - t * 0.25;
        }
      }
      // pauldrons
      for (const s of [-1, 1]) {
        const px = cx + s * 13, py = 21;
        const ddx = x - px, ddy = y - py;
        if (ddx * ddx / 42 + ddy * ddy / 22 < 1) { inside = true; mat = 1; v = 0.7 - ddx / 14 - ddy / 8; }
      }
      // horns
      for (const s of [-1, 1]) {
        for (let k = 0; k < 14; k++) {
          const hx = cx + s * (6 + k * 0.75), hyy = 10 - k * 0.8 + (k * k) * 0.03;
          if (Math.abs(x - hx) < 1.6 - k * 0.07 && Math.abs(y - hyy) < 1.2) { inside = true; mat = 2; v = 0.9 - k / 18; }
        }
      }
      if (!inside) continue;
      let c;
      if (mat === 1) c = rampDither(metal, clamp(v, 0, 1), x, y);
      else if (mat === 2) c = rampDither(ramp(['#3a2f55', '#8a7fb0', '#e8e0ff']), clamp(v, 0, 1), x, y);
      else c = rampDither(cloak, clamp(v + fbm(x * 0.3, y * 0.15, 2, 4) * 0.3 - 0.15, 0, 1), x, y);
      pb.set(x, y, c);
    }
  }
  // void face
  for (let y = 11; y < 21; y++) for (let x = cx - 5; x <= cx + 5; x++) {
    const dx = (x - cx) / 5.5, dy = (y - 16) / 5;
    if (dx * dx + dy * dy < 1) pb.set(x, y, hexToRgb('#07040c'));
  }
  // eyes + chest rune
  const eye = hexToRgb('#ff7ae0'), eyeL = hexToRgb('#ffffff');
  for (const s of [-1, 1]) { pb.set(cx + s * 2, 15, eye); pb.set(cx + s * 3, 15, eye); pb.set(cx + s * 2, 16, eyeL); pb.set(cx + s * 3, 16, eye); }
  const rune = hexToRgb('#c78bff');
  for (let k = -4; k <= 4; k++) { pb.set(cx + k, 30, rune); pb.set(cx, 30 + k, rune); }
  pb.set(cx - 2, 28, rune); pb.set(cx + 2, 32, rune); pb.set(cx + 2, 28, rune); pb.set(cx - 2, 32, rune);
  pb.set(cx, 30, hexToRgb('#ffffff'));
  pb.outline(0.25, hexToRgb('#06030b'));
  const n = pb.toCanvas();
  return { n, f: flipH(n), w: silhouette(n), wf: silhouette(flipH(n)) };
}

// ===== Flora ===================================================================
const PAL_LEAF = ramp(['#16353b', '#1f4e4c', '#2b6b5a', '#3f8b63', '#62aa6c', '#94cf7f', '#d2f0a6']);
const PAL_BARK = ramp(['#24162a', '#3e2834', '#5e3d40', '#80594f']);
const PAL_DEAD = ramp(['#120a1a', '#24172e', '#3a2747', '#56396a', '#7b5a96']);

function blobTree(seed, opt) {
  seedRng(seed);
  const W = opt.w, H = opt.h, pb = new PixBuf(W, H);
  const cx = W / 2;
  // trunk
  const trunkTop = opt.trunkTop, tw = opt.trunkW;
  for (let y = trunkTop; y < H; y++) {
    const spread = y > H - 3 ? 1 : 0;
    for (let x = Math.floor(cx - tw / 2) - spread; x < Math.ceil(cx + tw / 2) + spread; x++) {
      const v = 0.75 - (x - (cx - tw / 2)) / (tw + 1) * 0.6 + (hash2(x, y, seed) - 0.5) * 0.2;
      pb.set(x, y, rampDither(opt.bark || PAL_BARK, v, x, y));
    }
  }
  // canopy blobs
  const blobs = [];
  for (let i = 0; i < opt.blobs; i++) {
    const a = rand(0, Math.PI * 2), d = rand(0, opt.spread);
    blobs.push({ x: cx + Math.cos(a) * d * 1.1, y: opt.cy + Math.sin(a) * d * opt.squash, r: rand(opt.rmin, opt.rmax) });
  }
  blobs.push({ x: cx, y: opt.cy, r: opt.rmax });
  const lx = -0.55, ly = -0.75;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = -1, nx = 0, ny = 0;
    for (const b of blobs) {
      const dx = (x - b.x) / b.r, dy = (y - b.y) / (b.r * opt.vstretch);
      const d2 = dx * dx + dy * dy;
      if (d2 < 1) { const hgt = Math.sqrt(1 - d2) * b.r + (opt.cy - b.y) * 0.4; if (hgt > best) { best = hgt; nx = dx; ny = dy; } }
    }
    if (best < 0) continue;
    const leafy = vnoise(x * 0.45, y * 0.45, seed) * 0.35;
    let v = 0.45 + (-(nx * lx + ny * ly)) * 0.42 + leafy - 0.12 + (opt.cy - y) / H * 0.25;
    pb.set(x, y, rampDither(opt.pal, clamp(v, 0, 1), x, y));
  }
  // flecks (blossoms / fruit / glow)
  if (opt.flecks) for (let i = 0; i < opt.flecks.n; i++) {
    const b = pick(blobs), a = rand(0, Math.PI * 2), d = rand(0, b.r * 0.9);
    const x = Math.round(b.x + Math.cos(a) * d), y = Math.round(b.y + Math.sin(a) * d * opt.vstretch);
    if (pb.a(x, y)) pb.set(x, y, hexToRgb(pick(opt.flecks.c)));
  }
  pb.outline(0.42);
  return pb.toCanvas();
}

function buildFlora() {
  // §29 G2: the broadleaves are trees v2 (canopyTree, frozen sheets or ?trees=live); the old one-ellipse blobTree lollipops are gone
  ART.trees = { dead: [] };
  for (let i = 0; i < 4; i++) ART.trees.dead.push(deadTree(500 + i));
  ART.bush = [0, 1, 2].map(i => blobTree(600 + i, { w: 16, h: 12, trunkTop: 99, trunkW: 0, cy: 7, blobs: 4, spread: 3, squash: 0.6, rmin: 3, rmax: 5, vstretch: 0.85, pal: PAL_LEAF, flecks: { n: 3, c: ['#ffb3d1', '#ffffff'] } }));
  ART.grass = [0, 1].map(f => {
    const pb = new PixBuf(9, 8);
    const g = ramp(['#2b6b5a', '#4a9a63', '#86c97a', '#c9eea0']);
    for (let b = 0; b < 5; b++) {
      const bx = 1 + b * 1.7, hgt = 4 + (b % 3) * 1.5, lean = (f ? 0.18 : -0.12) * (b % 2 ? 1 : -0.5);
      for (let y = 0; y < hgt; y++) pb.set(Math.round(bx + lean * y), 7 - y, g[Math.min(3, Math.floor(y / hgt * 4))]);
    }
    return pb.toCanvas();
  });
}

function deadTree(seed) {
  seedRng(seed);
  const { c, x } = makeCanvas(28, 44);
  x.strokeStyle = '#2a1c38'; x.lineCap = 'round';
  const branch = (px, py, a, len, w, d) => {
    const nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len;
    x.lineWidth = w; x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
    if (d > 0) { branch(nx, ny, a - rand(0.3, 0.7), len * 0.7, w * 0.65, d - 1); branch(nx, ny, a + rand(0.3, 0.7), len * 0.7, w * 0.65, d - 1); }
  };
  branch(14, 44, -Math.PI / 2 + rand(-0.1, 0.1), 14, 4, 3);
  crisp(c);
  const pb = new PixBuf(28, 44); pb.img = x.getImageData(0, 0, 28, 44); pb.d = pb.img.data;
  for (let yy = 0; yy < 44; yy++) for (let xx = 0; xx < 28; xx++) if (pb.a(xx, yy)) pb.set(xx, yy, rampDither(PAL_DEAD, 0.25 + (14 - xx) / 40 + (44 - yy) / 120, xx, yy));
  return pb.toCanvas();
}

// ===== Trees v2 (docs/design/world-maps.md G2; world-art minutes §2.1) ==============================================================
// canopyTree(seed, S) (broadleaf) and pineTree2(seed, S) return the COMPOSITE canvas (trunk + canopy: what the editor, the
// shadow tiles, hit tests and audits read; ART.trees.* / ART.pines.* stay canvas arrays) carrying the parts render.js splits:
//   c.trunk    trunk, root toes, branches, baked 4 px AO ellipse        c.canopy  the leaves (drawn OVER the hero, fades)
//   c.canopyF  the canopy with its top 60 % shifted -1 / 0 / +1 px      c.swayF   the composite in those 3 sway frames
//   c.canopyW / c.swayW  the same in 5 wind frames -2..+2 (index = frame + 2; treeFrame(img, fr, part) builds the +-2 on first use)
//   c.cbox     the canopy's opaque box [x0, y0, x1, y1] (the hero-under-canopy test)
// Light is on the RIGHT (Vale moon x 470, forest sun x 360): every sheet is right-lit and a left-lit theme mirrors it
// (maps.js placeObjects sets a tree's flip from the theme, never at random). No full outline: a 1 px darker edge on the shadow
// side only. Approved output is frozen into js/sprites.js (tools/freeze.js: frames [trunk, canopy]); ?trees=live
// builds them here instead. Lift: the crown = leaf clusters on Fibonacci points of a flattened ellipsoid, darker inside and
// underneath (Lumina src/engine/world/props/Trees.js buildBroadleaf; docs/CREDITS.md), drawn as three 2D pixel masses.
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const B2X2 = [0.125, 0.625, 0.875, 0.375];
// ordered 2x2 dither between ADJACENT ramp steps only (never a per-pixel hash)
function ramp2(r, v, x, y) { const f = clamp(v, 0, 0.9999) * (r.length - 1), i = Math.floor(f); return r[(f - i) > B2X2[((y & 1) << 1) | (x & 1)] ? Math.min(i + 1, r.length - 1) : i]; }
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const LEAF2 = ramp(['#1b2142', '#1d3f4c', '#245d55', '#33805c', '#5aa564', '#93cb72', '#d6eca0']);
const TEAL2 = ramp(['#191f46', '#1a3c5a', '#21606c', '#2f8582', '#4fae98', '#8bd6b4', '#d2f4df']);
const BLOSSOM2 = ramp(['#3a1f4a', '#68336f', '#9f4f8e', '#d277ae', '#f1a3ca', '#ffd2e6', '#fff2f8']);
const AMBER2 = ramp(['#1c1a2e', '#33292a', '#544024', '#7d5a26', '#a9782f', '#d29d46', '#f2ca7a']);
const BIRCH2 = ramp(['#1c2236', '#2b3d33', '#45603a', '#678443', '#93a94e', '#c4cd6a', '#eeeaa2']);
const BARK2 = ramp(['#1c1226', '#352235', '#553644', '#7a5150', '#a07468']);
const BARK_BIRCH = ramp(['#2a2638', '#59536a', '#9a94a8', '#cfcad6', '#f2eef4']);
const PINE2 = ramp(['#0b1424', '#10232a', '#173328', '#204630', '#2f5c3a', '#4a7a44', '#7c9a54']);
const PINE_BARK2 = ramp(['#1a1018', '#33201a', '#4a2e22', '#64402e', '#86583c']);
const AO_RGB = hexToRgb('#140a24');
const RIM_VALE = hexToRgb('#ffd6ec'), RIM_FOREST = hexToRgb('#d0904a');
// split helpers: the 3 sway frames and the composite (shared by the live builders and the frozen sheets)
function opaqueBox(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? [0, 0, 0, 0] : [x0, y0, x1 + 1, y1 + 1];
}
function treeFromParts(trunk, canopy) {
  const W = trunk.width, H = trunk.height, cut = Math.round(H * 0.6);
  const shift = dx => { const { c, x } = makeCanvas(W, H); x.drawImage(canopy, 0, cut, W, H - cut, 0, cut, W, H - cut); x.drawImage(canopy, 0, 0, W, cut, dx, 0, W, cut); return c; };
  const canopyF = [shift(-1), canopy, shift(1)];
  const swayF = canopyF.map(f => { const { c, x } = makeCanvas(W, H); x.drawImage(trunk, 0, 0); x.drawImage(f, 0, 0); return c; });
  const c = swayF[1];
  c.trunk = trunk; c.canopy = canopy; c.canopyF = canopyF; c.swayF = swayF; c.cbox = opaqueBox(canopy);
  // wind (js/wind.js): 5 canopy frames -2..+2 px (index = frame + 2); the +-1 frames are canopyF / swayF, the +-2 ones are built on first use
  c.canopyW = [null, canopyF[0], canopy, canopyF[2], null]; c.swayW = [null, swayF[0], swayF[1], swayF[2], null]; c._shift = shift;
  return c;
}
// frame fr (-2..+2) of a tree composite: the canopy alone (part = 0) or trunk + canopy (part = 1); built lazily for +-2
function treeFrame(img, fr, part) {
  const i = fr + 2, A = part ? img.swayW : img.canopyW;
  if (A[i]) return A[i];
  const cf = img.canopyW[i] || (img.canopyW[i] = img._shift(fr));
  if (!part) return cf;
  const { c, x } = makeCanvas(img.width, img.height); x.drawImage(img.trunk, 0, 0); x.drawImage(cf, 0, 0);
  return (img.swayW[i] = c);
}
function treeAO(pb, cx, yb, w) {   // the 4 px ground-contact ellipse baked into the base (2 alpha levels, no smooth ramp)
  const rx = w * 0.9 + 2, ry = 2.2;
  for (let y = yb - 2; y <= yb + 1; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - yb) / ry) ** 2; if (d < 1) pb.set(x, y, AO_RGB, d < 0.45 ? 130 : 75);
  }
}
// trunk from yb (base) up to yt: 1 px dark side, 1 px warm lit side, a 5-step bark ramp with vertical streaks, a flare at the
// foot and a knot. Returns xc(y), the trunk's centre line (a gentle bend of `lean` px at the top).
function treeTrunk(pb, S, cx, yb, yt, lean, seed) {
  const bark = S.bark, span = Math.max(1, yb - yt), xc = y => cx + lean * Math.pow(clamp((yb - y) / span, 0, 1), 1.6);
  for (let y = yt; y <= yb; y++) {
    const t = (yb - y) / span, w = lerp(S.trunkW[0], S.trunkW[1], Math.pow(t, 0.6)) + Math.max(0, 3 - (yb - y)) * 1.3;
    const xa = Math.round(xc(y) - w / 2 + 0.01), xb = Math.max(xa + 1, Math.round(xc(y) + w / 2 - 0.01));   // width steps alternate sides (no ledges)
    for (let x = xa; x < xb; x++) {
      const u = (x + 0.5 - xa) / (xb - xa);
      let c = ramp2(bark, 0.22 + u * 0.58 + (vnoise(x * 0.9, y * 0.08, seed + 5) - 0.5) * 0.3, x, y);
      if (S.birch && vnoise(x * 0.6, y * 0.55, seed + 6) > 0.72) c = bark[1];   // birch: dark lenticel bands
      if (x === xa && xb - xa > 1) c = bark[0];
      else if (x === xb - 1 && xb - xa > 2) c = mixRgb(bark[bark.length - 1], S.rim, 0.35);
      pb.set(x, y, c);
    }
  }
  const ky = Math.round(lerp(yb - 4, yt + span * 0.4, rand(0.2, 0.7))), kx = Math.round(xc(ky) + rand(-0.5, 0.8));   // a knot
  pb.set(kx, ky, bark[0]); pb.set(kx, ky + 1, bark[0]); pb.set(kx + 1, ky + 1, bark[3]);
  return xc;
}
function treeRoots(pb, S, xc, yb) {   // 2-3 root toes of 3 px reaching out and down from the flare
  const n = rand() < 0.55 ? 3 : 2, w = S.trunkW[0];
  for (let k = 0; k < n; k++) {
    const s = k === 2 ? (rand() < 0.5 ? -1 : 1) : k ? 1 : -1, bx = xc(yb) + s * (w / 2 + 1.5) - (k === 2 ? s * 2.5 : 0);
    for (let q = 0; q < 3; q++) {
      const x = Math.round(bx + s * q), y = yb - 1 + (q >> 1) + (k === 2 ? 1 : 0), c = S.bark[s > 0 ? 3 : 1];
      pb.set(x, y, c); if (q === 0) pb.set(x, y - 1, S.bark[s > 0 ? 2 : 1]);
    }
  }
}
function treeLine(pb, x0, y0, x1, y1, w0, w1, c0, c1) {   // a tapering branch, dark side below-left
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t), w = lerp(w0, w1, t);
    pb.set(Math.round(x), Math.round(y), c1); if (w > 1.4) pb.set(Math.round(x), Math.round(y) + 1, c0);
  }
}
// leaf pixels of one layer: rim light on the lit side of EVERY cluster (where its right / upper-right / upper neighbour is a
// cluster drawn earlier or nothing), a 1 px cast shade under a nearer cluster, and the darker edge on the shadow side only
function leafPasses(C, own, S, cl) {
  const W = C.w, H = C.h, o = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? -1 : own[y * W + x], rim = [], shade = [], edge = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = own[y * W + x]; if (k < 0) continue;
    const c = cl[k], ord = c.ord, nb = [o(x + 1, y), o(x + 1, y - 1), o(x, y - 1)];
    const litHalf = (x + 0.5 - c.sx) * 0.8 + (c.sy - y - 0.5) > -0.25 * c.r;
    if (litHalf && nb.some(j => j < 0 || cl[j].ord < ord)) { rim.push([x, y, (nb[0] < 0 || nb[2] < 0 ? 1.2 : 0.85) * (c.mass ? S.rimMix : S.rimMix * 0.55)]); continue; }
    const up = o(x + 1, y - 1); if (up >= 0 && cl[up].ord > ord && cl[up].mass >= c.mass) shade.push([x, y]);
    if (o(x - 1, y) < 0 || o(x, y + 1) < 0) edge.push([x, y]);
  }
  for (const [x, y, a] of runsOnly(rim, W)) C.set(x, y, mixRgb(C.get(x, y), S.rim, a));
  for (const [x, y] of shade) C.set(x, y, mixRgb(C.get(x, y), S.pal[0], 0.38));
  for (const [x, y] of edge) C.set(x, y, mixRgb(C.get(x, y), S.pal[0], 0.55));
}
// silhouette clean-up before the rim passes: a leaf pixel with <= 1 leaf 4-neighbour goes, a 1 px hole with >= 3 leaf 4-neighbours
// is filled from its darkest neighbour (both read as specks against a bright sky)
function despeckle(C, own) {
  const W = C.w, H = C.h, o = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? -1 : own[y * W + x];
  for (let pass = 0; pass < 2; pass++) {
    const drop = [], fill = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nb = [o(x - 1, y), o(x + 1, y), o(x, y - 1), o(x, y + 1)], n = nb.filter(k => k >= 0).length;
      if (o(x, y) >= 0) { if (n <= 1) drop.push([x, y]); }
      else if (n >= 3) { let best = null, bl = 1e9, bk = -1; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (o(x + dx, y + dy) >= 0) { const c = C.get(x + dx, y + dy), l = c[0] + c[1] + c[2]; if (l < bl) { bl = l; best = c; bk = o(x + dx, y + dy); } } fill.push([x, y, best, bk]); }
    }
    for (const [x, y] of drop) { C.set(x, y, [0, 0, 0], 0); own[y * W + x] = -1; }
    for (const [x, y, c, k] of fill) { C.set(x, y, c); own[y * W + x] = k; }
  }
}
// a highlight pixel with no 4-neighbour in its own set reads as a speck (> 60 luma off all 4 neighbours): keep runs of >= 2 only
function runsOnly(list, W) { const k = new Set(list.map(([x, y]) => y * W + x)); return list.filter(([x, y]) => k.has(y * W + x - 1) || k.has(y * W + x + 1) || k.has((y - 1) * W + x) || k.has((y + 1) * W + x)); }
function canopyTree(seed, S) {
  seedRng(seed);
  const W = S.W, H = S.H, yb = H - 2, cx = W / 2 + rand(-0.8, 0.8);
  const T = new PixBuf(W, H), C = new PixBuf(W, H), own = new Int16Array(W * H).fill(-1);
  // ---- crown layout in unit space (x radius 1, y radius S.asp): Fibonacci points + a crown top + inner clusters
  const n = randi(S.clusters[0], S.clusters[1]), off = rand(), cl = [];
  for (let i = 0; i < n; i++) {
    const t = (i + off) / n, py = 1 - t * 1.8, pr = Math.sqrt(Math.max(0, 1 - py * py)), th = i * GOLDEN + rand(-0.3, 0.3), k = rand(0.52, 0.8);
    cl.push({ X: Math.cos(th) * pr * k, Y: py * k, Z: Math.sin(th) * pr * k, r: rand(S.card[0], S.card[1]), inner: false });
  }
  cl.push({ X: rand(-0.12, 0.12), Y: 0.66, Z: 0.1, r: rand(S.card[0], S.card[1]) * 0.85, inner: false });
  for (let i = 0; i < S.inner; i++) { const a = i / S.inner * 6.283 + rand(-0.4, 0.4); cl.push({ X: Math.cos(a) * 0.3, Y: rand(-0.25, 0.15), Z: Math.sin(a) * 0.3 - 0.25, r: S.card[1] * 1.05, inner: true }); }
  for (const c of cl) {
    c.occ = c.inner ? 0.5 : clamp(0.66 + 0.5 * Math.hypot(c.X, c.Y, c.Z), 0.6, 1.05) * (0.8 + 0.2 * sstep(-0.8, 0.6, c.Y));
    c.L = c.X * 0.7 + c.Y * 0.9 + c.Z * 0.35;   // facing the light: upper right, a little toward the viewer
  }
  // three masses: shadow (inner + the least lit 30 %), lit (the most lit 28 %, smaller cards), mid (the rest)
  const outer = cl.filter(c => !c.inner).sort((a, b) => a.L - b.L);
  outer.forEach((c, i) => { c.mass = i < outer.length * 0.3 ? 0 : i >= outer.length * 0.72 ? 2 : 1; });
  for (const c of cl) { if (c.inner) c.mass = 0; if (c.mass === 2) c.r *= 0.82; }
  // fit the crown into the top of the sprite: x within the width, y from row 1 down to the crown bottom
  const crownBot = Math.round(H * (1 - S.trunk));
  for (const c of cl) { c.ux = c.X + (c.mass === 0 ? -0.1 : 0); c.uy = -c.Y * S.asp * 0.9 + c.Z * S.asp * 0.3 + (c.mass === 0 ? 0.1 : 0); }
  let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
  for (const c of cl) { bx0 = Math.min(bx0, c.ux - c.r); bx1 = Math.max(bx1, c.ux + c.r); by0 = Math.min(by0, c.uy - c.r); by1 = Math.max(by1, c.uy + c.r); }
  const scx = (W - 2) / (bx1 - bx0), scy = Math.min(scx * 1.25, (crownBot - 1) / (by1 - by0));   // x fills the width, y the crown band
  for (const c of cl) { c.sx = cx + (c.ux - (bx0 + bx1) / 2) * scx; c.sy = 1 + (c.uy - by0) * scy; c.ry = c.r * scy; c.r *= scx; if (c.mass === 0 && !c.inner) { c.sx -= 2; c.sy += 2; } }   // the shadow mass sits 2 px down-left
  const cyc = 1 + ((0 - by0) * scy), botY = 1 + (by1 - by0) * scy;
  // ---- trunk (into the crown), roots, AO, 2-3 branches toward low clusters
  treeAO(T, cx, yb, S.trunkW[0]);
  const xc = S.bush ? null : treeTrunk(T, S, cx, yb, Math.round(cyc), rand(-1.2, 1.2), seed);
  if (xc) treeRoots(T, S, xc, yb);
  const low = cl.filter(c => !c.inner).sort((a, b) => b.sy - a.sy), nb = xc ? randi(2, 3) : 0;
  for (let i = 0; i < nb && i < low.length; i++) {
    const tg = low[(i * 2) % low.length], sy = Math.round(lerp(cyc, botY, rand(0.55, 0.9)));
    treeLine(T, xc(sy), sy, lerp(xc(sy), tg.sx, 0.8), lerp(sy, tg.sy, 0.7), 2, 1, S.bark[0], S.bark[tg.sx > xc(sy) ? 3 : 1]);
  }
  // ---- leaf clusters, back to front (inner, then by depth; the lit mass last)
  cl.sort((a, b) => ((a.inner ? -10 : 0) + a.mass * 0.6 + a.Z) - ((b.inner ? -10 : 0) + b.mass * 0.6 + b.Z));
  cl.forEach((c, i) => { c.ord = i; });
  const BASE = [0.13, 0.42, 0.7], LO = [0, 0.28, 0.6], HI = [0.36, 0.74, 0.98];
  cl.forEach((c, ci) => {
    const r = c.r, ry = c.ry * (S.squash || 0.92);
    for (let y = Math.floor(c.sy - ry - 1); y <= Math.ceil(c.sy + ry + 1); y++) for (let x = Math.floor(c.sx - r - 1); x <= Math.ceil(c.sx + r + 1); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const dx = (x + 0.5 - c.sx) / r, dy = (y + 0.5 - c.sy) / ry, d2 = dx * dx + dy * dy;
      if (d2 > 1 - 0.25 * vnoise(x * 0.5 + ci * 5.3, y * 0.5, seed + 21)) continue;   // the edge eroded into 3-5 px leaf clumps
      const nz = Math.sqrt(Math.max(0, 1 - d2)), lam = dx * 0.6 - dy * 0.68 + nz * 0.42;
      const q = vnoise(x * 0.42 + ci * 3.1, y * 0.42, seed + 11);
      let v = BASE[c.mass] + (c.occ - 0.85) * 0.3 + lam * 0.2 + (q - 0.5) * 0.16 - (q < 0.24 ? 0.1 : 0);
      C.set(x, y, ramp2(S.pal, clamp(v, LO[c.mass], HI[c.mass]), x, y)); own[y * W + x] = ci;
    }
  });
  despeckle(C, own);
  leafPasses(C, own, S, cl);
  // flecks (blossom / fruit / glints): 2 px pairs on mid / lit clusters, never a lone pixel (a lone one reads as a speck)
  if (S.flecks) for (let i = 0; i < S.flecks.n; i++) {
    const cs = cl.filter(c => c.mass > 0), c = cs[Math.floor(rand() * cs.length)], a = rand(0, 6.283), d = rand(0, c.r * 0.75);
    const x = Math.round(c.sx + Math.cos(a) * d), y = Math.round(c.sy + Math.sin(a) * d * 0.9), col = hexToRgb(S.flecks.c[Math.floor(rand() * S.flecks.c.length)]);
    if (C.a(x, y) && C.a(x + 1, y)) { C.set(x, y, col); C.set(x + 1, y, col); }
  }
  return treeFromParts(T.toCanvas(), C.toCanvas());
}
// pine v2: asymmetric tiers (each side's reach 0.6-1.1 independently), 6-9 tiers drawn bottom-up so every tier's drooping tips
// hang over the one below (with a cast shade under it), per-tier needle gaps, a bare tip, broken lower branches on giants,
// rim light on the lit side of every tier and dust on the tier tops; lit-side sheet, no outline
function pineTree2(seed, S) {
  seedRng(seed);
  const W = S.W, H = S.H, yb = H - 2, cx = W / 2;
  const T = new PixBuf(W, H), C = new PixBuf(W, H), own = new Int16Array(W * H).fill(-1);
  const tip = randi(S.tip[0], S.tip[1]), crownTop = 1 + tip, crownBot = Math.floor(H * (1 - S.bare));
  treeAO(T, cx, yb, S.trunkW[0]);
  const xc = treeTrunk(T, S, cx, yb, 1, rand(-0.7, 0.7), seed);
  treeRoots(T, S, xc, yb);
  for (let k = 0; k < (S.broken || 0); k++) {   // broken lower branches on the bare trunk
    const y = Math.round(lerp(crownBot + 3, yb - 12, rand())), s = k % 2 ? 1 : -1, len = randi(3, 6);
    for (let q = 1; q <= len; q++) T.set(Math.round(xc(y) + s * (S.trunkW[1] + 1 + q)), y + Math.round(q * 0.45), S.bark[s > 0 ? 2 : 0]);
  }
  const n = randi(S.tiers[0], S.tiers[1]), step = (crownBot - crownTop) / n, cl = [];
  for (let i = n - 1; i >= 0; i--) {
    const y0 = crownTop + i * step + rand(-0.6, 0.6), k = (i + 1) / n, base = 1.5 + k * (W / 2 - 2.5), gs = seed * 7 + i * 31;
    const ci = cl.length; cl.push({ ord: n - 1 - i, mass: 1, sx: xc(y0), sy: y0 + step * 0.4, r: base });
    for (const s of [-1, 1]) {
      const rx = Math.max(1.5, base * rand(0.6, 1.1)), ry = step * 0.75 + 1, ccx = xc(y0) + s * rx * 0.42, ccy = y0 + step * 0.5;
      for (let y = Math.floor(ccy - ry - 1); y <= Math.ceil(ccy + ry * 1.8); y++) for (let x = Math.floor(ccx - rx - 1); x <= Math.ceil(ccx + rx + 1); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const dx = (x + 0.5 - ccx) / rx, dy = (y + 0.5 - ccy - Math.abs(dx) * ry * 0.6) / ry;   // droop toward the tips
        if (dx * dx + dy * dy > 1 - vnoise(x * 0.7, y * 0.7, gs) * 0.45) continue;
        if (vnoise(x * 0.32, y * 0.6, gs + 7) > 0.82) continue;   // gaps show the sky: their own holes on every tier
        const v = 0.6 - dy * 0.4 + (s > 0 ? 0.1 : -0.1) - (Math.abs(x + 0.5 - xc(y)) < 2 ? 0.06 : 0) - k * 0.14 + (vnoise(x * 0.9, y * 0.3, gs + 3) - 0.5) * 0.1;
        C.set(x, y, ramp2(S.pal, v, x, y)); own[y * W + x] = ci;
      }
    }
  }
  despeckle(C, own);
  // rim on every tier's lit edge (x right of the trunk), dust on lit tier tops, cast shade under the tier above, shadow-side edge
  const o = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? -1 : own[y * W + x], rim = [], dust = [], shade = [], edge = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = o(x, y); if (k < 0) continue;
    // open = sky, not a needle hole: the gap runs >= 3 px (or off the sprite), so holes get no rim and no dust (no confetti)
    const right = x + 0.5 > xc(y) + 1, r1 = o(x + 1, y), openR = r1 < 0 && o(x + 2, y) < 0 && o(x + 3, y) < 0, openU = o(x, y - 1) < 0 && o(x, y - 2) < 0;
    if (right && (openR || (r1 >= 0 && cl[r1].ord < cl[k].ord))) { rim.push([x, y]); continue; }
    if (right && openU && vnoise(x * 0.35, y * 0.2, seed + 9) > 0.4) { dust.push([x, y]); continue; }
    const a1 = o(x, y - 1), a2 = o(x, y - 2), a3 = o(x, y - 3), up = j => j >= 0 && cl[j].ord > cl[k].ord;
    if (up(a1) || (a1 === k && (up(a2) || (a2 === k && up(a3))))) { shade.push([x, y]); continue; }   // a 3 px cast shade under the tier above
    if (o(x - 1, y) < 0 || o(x, y + 1) < 0) edge.push([x, y]);
  }
  for (const [x, y] of runsOnly(rim, W)) C.set(x, y, mixRgb(C.get(x, y), S.rim, 0.55));
  for (const [x, y] of runsOnly(dust, W)) C.set(x, y, mixRgb(C.get(x, y), S.rim, 0.3));
  for (const [x, y] of shade) C.set(x, y, mixRgb(C.get(x, y), S.pal[0], 0.5));
  for (const [x, y] of edge) C.set(x, y, mixRgb(C.get(x, y), S.pal[0], 0.5));
  return treeFromParts(T.toCanvas(), C.toCanvas());
}
// Species: per zone 3+ species x 6 variants x 2 sizes, ordered big0, small0, big1, small1, ... so the data's variant index
// (o.v % n) walks both sizes. `trunk` = the bare trunk's share of the sprite height (35-45 % broadleaf), asp = crown height / width.
const TREE_SPECIES = {
  round: { sizes: [[38, 60], [28, 44]], trunk: 0.36, asp: 0.9, clusters: [9, 11], card: [0.42, 0.56], inner: 4, pal: LEAF2, bark: BARK2, trunkW: [7, 3], rim: RIM_VALE, rimMix: 0.55, flecks: { n: 3, c: ['#f4d98a'] }, seed: 1100 },
  poplar: { sizes: [[22, 64], [18, 46]], trunk: 0.24, asp: 2.5, clusters: [13, 16], card: [0.5, 0.66], inner: 4, squash: 1.1, pal: TEAL2, bark: BARK2, trunkW: [5, 2.5], rim: RIM_VALE, rimMix: 0.55, seed: 1200 },
  blossom: { sizes: [[38, 58], [28, 42]], trunk: 0.38, asp: 0.78, clusters: [9, 11], card: [0.4, 0.54], inner: 4, pal: BLOSSOM2, bark: BARK2, trunkW: [6, 3], rim: hexToRgb('#fff0f6'), rimMix: 0.5, flecks: { n: 10, c: ['#ffffff', '#fff0f7'] }, seed: 1300 },
  teal: { sizes: [[34, 56], [26, 40]], trunk: 0.36, asp: 1.05, clusters: [9, 11], card: [0.42, 0.56], inner: 4, pal: TEAL2, bark: BARK2, trunkW: [6, 3], rim: RIM_VALE, rimMix: 0.55, flecks: { n: 3, c: ['#bff7ff'] }, seed: 1400 },
  // forest broadleaves (step-4 density: Pinewood's 2nd / 3rd species beside the pines)
  oak: { sizes: [[40, 64], [28, 44]], trunk: 0.4, asp: 0.8, clusters: [9, 12], card: [0.4, 0.54], inner: 4, pal: AMBER2, bark: PINE_BARK2, trunkW: [7, 3], rim: RIM_FOREST, rimMix: 0.55, seed: 1500 },
  birch: { sizes: [[24, 62], [18, 44]], trunk: 0.44, asp: 1.9, clusters: [8, 10], card: [0.44, 0.6], inner: 2, squash: 1.05, pal: BIRCH2, bark: BARK_BIRCH, trunkW: [4, 2], birch: true, rim: RIM_FOREST, rimMix: 0.5, seed: 1600 },
};
const PINE_SPECIES = {
  giant: { W: 60, H: 140, bare: 0.44, tiers: [8, 10], tip: [3, 5], broken: 3, trunkW: [10, 3], n: 3, seed: 1900 },
  tall: { W: 36, H: 82, bare: 0.3, tiers: [6, 9], tip: [3, 5], broken: 0, trunkW: [6, 1.5], n: 6, seed: 1910 },
  young: { W: 20, H: 42, bare: 0.12, tiers: [6, 7], tip: [3, 4], broken: 0, trunkW: [3, 1], n: 6, seed: 1930 },
};
const TREES_LIVE = typeof location !== 'undefined' && /[?&]trees=live\b/.test(location.search || '');
function buildTreeSpecies(kind) {
  const S = TREE_SPECIES[kind], out = [];
  for (let v = 0; v < 6; v++) for (let z = 0; z < 2; z++) {
    const [w, h] = S.sizes[z], sk = z ? 0.78 : 1;
    out.push(canopyTree(S.seed + v * 10 + z, Object.assign({}, S, { W: w, H: h, clusters: z ? [S.clusters[0] - 2, S.clusters[1] - 2] : S.clusters, card: S.card.map(c => c / sk), trunkW: z ? S.trunkW.map(t => Math.max(1, t - 1)) : S.trunkW })));
  }
  return out;
}
function buildPineSpecies(kind) {
  const S = PINE_SPECIES[kind], out = [];
  for (let v = 0; v < S.n; v++) out.push(pineTree2(S.seed + v, Object.assign({ pal: PINE2, bark: PINE_BARK2, rim: RIM_FOREST }, S)));
  return out;
}
// the frozen sheets (js/sprites.js 'tree_<kind>_NN' / 'pine_<kind>_NN', 2 frames: trunk, canopy) -> composites; null = build live
function frozenTrees(prefix) {
  if (TREES_LIVE) return null;
  const keys = Object.keys(ART.img).filter(k => k.startsWith(prefix) && /_\d\d$/.test(k)).sort();
  if (!keys.length || keys.some(k => ART.img[k].length < 2)) return null;
  return keys.map(k => treeFromParts(ART.img[k][0], ART.img[k][1]));
}
// bushes v2: the same cluster crown with no trunk (the crown sits on its AO), no full outline; frozen as 'bush2_NN' (2 frames)
const BUSH_SPECIES = { w: 18, h: 13, trunk: 0.02, asp: 0.62, clusters: [5, 6], card: [0.5, 0.64], inner: 2, pal: LEAF2, bark: BARK2, trunkW: [5, 2], rim: RIM_VALE, rimMix: 0.5, bush: true, flecks: { n: 2, c: ['#ffb3d1'] } };
function buildBushes() { return [0, 1, 2, 3].map(v => canopyTree(1700 + v, Object.assign({}, BUSH_SPECIES, { W: BUSH_SPECIES.w + (v % 2) * 2, H: BUSH_SPECIES.h }))); }
function buildTreesV2() {
  for (const k of Object.keys(TREE_SPECIES)) ART.trees[k] = frozenTrees('tree_' + k + '_') || buildTreeSpecies(k);
  ART.pines = {};
  for (const k of Object.keys(PINE_SPECIES)) ART.pines[k] = frozenTrees('pine_' + k + '_') || buildPineSpecies(k);
  ART.bushV2 = frozenTrees('bush2_') || buildBushes();
}

// ===== ground decals (docs/design/world-maps.md G2; world-art minutes §2.3) ========================================================
// 16 flat kinds per zone, coloured from the theme's own ramps, baked into the ground chunks / column tops by maps.js (never in
// the y-sort, no collider). Each kind has 2-3 shape variants. Every mark is >= 2 px in some direction and sits 1-2 ramp steps from
// the ground it lies on, so a decal never reads as a speck. DECAL_KINDS order = the kind index maps.js stores.
const DECAL_KINDS = ['tuft', 'tuftPale', 'flowers', 'litterA', 'litterB', 'litterC', 'needles', 'pebbles', 'rootA', 'rootB', 'rootC', 'rootD', 'moss', 'puddle', 'cobble', 'fern'];
function buildDecalSet(th, seed) {
  if (th._decals) return th._decals;
  const keepRng = _rng; seedRng(seed * 977 + 5);   // built lazily (first chunk): never disturb the shared seeded stream
  const G = th.grass, E = th.earth, S = th.stone, P = th.path, Wt = th.water, Wd = th.wood || E;
  const warm = th.flowers.map(hexToRgb), set = {};
  const mk = (w, h, draw) => { const pb = new PixBuf(w, h); draw(pb, w, h); const c = pb.toCanvas(); c.ax = w >> 1; c.ay = h - 1; return c; };
  const blade = (pb, x, h, lean, cols, y0) => { for (let y = 0; y < h; y++) pb.set(Math.round(x + lean * y), y0 - y, cols[Math.min(cols.length - 1, Math.floor(y / h * cols.length))]); };
  set.tuft = [0, 1, 2].map(v => mk(7, 6, (pb) => { const n = 3 + (v % 2); for (let b = 0; b < n; b++) blade(pb, 1 + b * 1.6, 3 + ((b + v) % 3), (b % 2 ? 0.2 : -0.15), [G[2], G[3], G[4]], 5); }));
  set.tuftPale = [0, 1].map(v => mk(7, 6, (pb) => { for (let b = 0; b < 4; b++) blade(pb, 1 + b * 1.5, 3 + ((b + v) % 2) * 1.5, (b % 2 ? 0.18 : -0.12), [G[3], G[4], G[5]], 5); }));
  set.flowers = [0, 1, 2].map(v => mk(8, 5, (pb) => {
    for (let k = 0; k < 3; k++) { const x = 1 + k * 2.4 + (v === 1 && k === 1 ? 0.6 : 0), y = 1 + ((k + v) % 2), c = warm[(k + v) % warm.length]; blade(pb, x + 0.5, 4 - y, 0, [G[2], G[3]], 4); pb.set(Math.round(x), y, c); pb.set(Math.round(x) + 1, y, c); }
  }));
  const leafy = (cols, n) => mk(9, 5, (pb) => { for (let k = 0; k < n; k++) { const x = Math.floor(rand(0, 7)), y = Math.floor(rand(0, 4)), c = cols[Math.floor(rand() * cols.length)]; pb.set(x, y, c); pb.set(x + 1, y, c); if (rand() < 0.4) pb.set(x + 1, y + 1, cols[0]); } });
  set.litterA = [0, 1].map(() => leafy([E[3], E[4], Wd[2]], 5));
  set.litterB = [0, 1].map(() => leafy([E[4], E[5], warm[0]], 4));
  set.litterC = [0, 1].map(() => leafy([G[2], E[3], Wd[3]], 6));
  set.needles = [0, 1].map(() => mk(10, 4, (pb) => { for (let k = 0; k < 7; k++) { const x = Math.floor(rand(0, 8)), y = Math.floor(rand(0, 4)), c = [E[2], E[3], Wd[1]][k % 3]; pb.set(x, y, c); pb.set(x + 1, y, c); pb.set(x + 2, y, c); } }));
  set.pebbles = [0, 1, 2].map(v => mk(8, 4, (pb) => { for (let k = 0; k < 2 + v % 2; k++) { const x = 1 + k * 3, y = 1 + ((k + v) % 2); pb.set(x, y, S[4]); pb.set(x + 1, y, S[3]); pb.set(x, y + 1, S[2]); pb.set(x + 1, y + 1, S[1]); } }));
  // roots: from the trunk foot (the anchor, top-centre of the decal) out and down, 2 px thick for the first half
  const root = (dir, len, drop) => { const w = len + 3, pb = new PixBuf(w * 2, drop + 3); const cx = w; for (let q = 0; q < len; q++) { const x = cx + dir * q, y = Math.round(q / len * drop); pb.set(x, y, Wd[q < len / 2 ? 2 : 1]); if (q < len / 2) pb.set(x, y + 1, Wd[0]); } const c = pb.toCanvas(); c.ax = cx; c.ay = 0; return c; };
  set.rootA = [root(-1, 6, 2), root(1, 6, 2)]; set.rootB = [root(-1, 8, 3), root(1, 8, 3)];
  set.rootC = [root(-1, 5, 3), root(1, 5, 3)]; set.rootD = [root(-1, 9, 2), root(1, 9, 2)];
  set.moss = [0, 1].map(v => mk(11, 5, (pb, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = ((x + 0.5 - w / 2) / (w / 2)) ** 2 + ((y + 0.5 - h / 2) / (h / 2)) ** 2; if (d < 1 - 0.3 * vnoise(x * 0.6, y * 0.6, seed + v)) pb.set(x, y, ramp2([G[1], G[2], G[3]], 0.75 - d * 0.6, x, y)); } }));
  set.puddle = [0, 1].map(v => mk(11 + v * 2, 5, (pb, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = ((x + 0.5 - w / 2) / (w / 2)) ** 2 + ((y + 0.5 - h / 2) / (h / 2)) ** 2; if (d < 1) pb.set(x, y, d > 0.6 ? E[1] : y === 1 && x > 2 && x < w - 3 ? Wt[4] : Wt[2]); } }));
  set.cobble = [0, 1, 2].map(v => mk(10, 4, (pb) => { for (let k = 0; k < 3; k++) { const x = k * 3 + (v % 2), y = (k + v) % 2; for (let q = 0; q < 3; q++) pb.set(x + q, y, q === 2 ? P[1] : P[3]); for (let q = 0; q < 3; q++) pb.set(x + q, y + 1, P[1]); } }));
  set.fern = [0, 1].map(v => mk(11, 7, (pb) => {
    for (const s of [-1, 1]) for (let q = 0; q < 5; q++) { const x = 5 + s * q, y = 6 - Math.round(q * 0.9 + (q > 2 ? -(q - 2) * 0.6 : 0)) - (v && s > 0 ? 1 : 0); pb.set(x, y, G[q < 2 ? 2 : 3]); if (q % 2) pb.set(x, y - 1, G[4]); }
    pb.set(5, 6, G[1]); pb.set(5, 5, G[2]);
  }));
  _rng = keepRng;
  return (th._decals = DECAL_KINDS.map(k => set[k]));
}

// ===== Props ===================================================================
function buildProps() {
  ART.lantern = asciiSprite([
    '.KKK.', 'KGGGK', 'KYWYK', 'KYYYK', 'KGGGK', '.KWK.', '..W..', '..W..', '..W..', '..W..', '..W..', '..W..', '..W..', '..W..', '.KWK.', 'KWWWK',
  ], { K: '#21152c', G: '#3b2a48', Y: '#ffd27a', W: '#5e3d40' });
  ART.lanternBlue = asciiSprite([
    '.KKK.', 'KGGGK', 'KYWYK', 'KYYYK', 'KGGGK', '.KWK.', '..W..', '..W..', '..W..', '..W..', '..W..', '..W..', '..W..', '..W..', '.KWK.', 'KWWWK',
  ], { K: '#140d20', G: '#2b2240', Y: '#9ef0ff', W: '#3a2f55' });
  ART.rock = [0, 1, 2].map(i => shadedBlob(700 + i, 12 + i * 2, 8 + i, ramp(['#2c2844', '#45406a', '#6a6596', '#9a95c4', '#d4d0f0'])));
  ART.rockDark = [0, 1].map(i => shadedBlob(720 + i, 12 + i * 3, 9 + i, ramp(['#130c1d', '#241a36', '#3a2c55', '#57447c'])));
  ART.mushroom = asciiSprite(['.KKKK.', 'KCCLCK', 'KCCCCK', '.KWWK.', '..WW..'], { K: '#1b2a4a', C: '#6fd6ff', L: '#e6fbff', W: '#d8d0e8' });
  ART.crystal = crystalCluster(800, ramp(['#2a3d8a', '#3f6fd0', '#6fb8ff', '#b6ecff', '#ffffff']));
  ART.crystalViolet = crystalCluster(801, ramp(['#3a1c6b', '#6a33b0', '#a46cf0', '#dbb8ff', '#ffffff']));
  ART.sign = asciiSprite([
    'KKKKKKKKKKK.', 'KWWWWWWWWWLK', 'KWkkWkWkkWWK', 'KWWWWWWWWWLK', 'KKKKKKKKKKK.', '....KWK.....', '....KWK.....', '....KWK.....', '....KWK.....', '...KKWKK....',
  ], { K: '#21152c', W: '#9c6a45', L: '#c08a5a', k: '#5b3a2e' });
  ART.brazier = asciiSprite([
    'KKKKKKKKKK', 'KSLLLLLLSK', '.KSSSSSSK.', '..KSSSSK..', '...KSSK...', '...KSSK...', '...KSSK...', '..KSSSSK..', '.KKKKKKKK.',
  ], { K: '#0e0918', S: '#4a4366', L: '#7a7399' });
  ART.house = buildHouse();
  ART.shrine = asciiSprite([
    '....KKKK....', '...KSLLSK...', '..KSSLLSSK..', '..KSSSSSSK..', '...KSSSSK...', '...KSSSSK...', '...KSSSSK...', '..KKSSSSKK..', '.KSSSSSSSSK.', 'KKKKKKKKKKKK',
  ], { K: '#1d1830', S: '#8f86a8', L: '#d4cdea' });
}

function shadedBlob(seed, w, h, pal) {
  const pb = new PixBuf(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x - w / 2 + 0.5) / (w / 2), dy = (y - h + 0.5) / h;
    const r = 1 + (vnoise(x * 0.5, y * 0.5, seed) - 0.5) * 0.35;
    if (dx * dx + dy * dy > r * r) continue;
    const v = 0.55 - dx * 0.35 + dy * 0.45 + (hash2(x, y, seed) - 0.5) * 0.15;
    pb.set(x, y, rampDither(pal, v, x, y));
  }
  pb.outline(0.4);
  return pb.toCanvas();
}

function crystalCluster(seed, pal) {
  seedRng(seed);
  const W = 16, H = 22, pb = new PixBuf(W, H);
  const shards = [{ x: 8, h: 20, w: 3 }, { x: 4, h: 12, w: 2.5, lean: -0.25 }, { x: 12, h: 14, w: 2.5, lean: 0.25 }];
  for (const s of shards) {
    for (let y = 0; y < s.h; y++) {
      const t = y / s.h;
      const halfW = s.w * (t < 0.25 ? t / 0.25 : 1);
      const cx = s.x + (s.lean || 0) * (s.h - y);
      for (let x = Math.floor(cx - halfW); x <= Math.ceil(cx + halfW); x++) {
        if (Math.abs(x - cx) > halfW) continue;
        const v = 0.55 + (cx - x) / (halfW + 1) * 0.35 + (1 - t) * 0.25;
        pb.set(x, H - s.h + y, rampDither(pal, v, x, y));
      }
    }
  }
  pb.outline(0.35);
  return pb.toCanvas();
}

function buildHouse() {
  // 2x2 tile footprint. Canvas origin: N corner of footprint at (40, 50).
  const { c, x } = makeCanvas(80, 104);
  const OX = 40, OY = 50, wh = 24, rh = 22;
  const P = (wx, wy, z) => [OX + (wx - wy) * 16, OY + (wx + wy) * 8 - z];
  const poly = (pts, fill) => { x.fillStyle = fill; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill(); };
  const line = (a, b, col, w = 1) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(a[0] + 0.5, a[1] + 0.5); x.lineTo(b[0] + 0.5, b[1] + 0.5); x.stroke(); };
  // chimney (behind roof)
  poly([P(0.4, 0.5, wh + 10), P(0.75, 0.5, wh + 10), P(0.75, 0.5, wh + 30), P(0.4, 0.5, wh + 30)], '#5b4f78');
  poly([P(0.75, 0.5, wh + 10), P(0.75, 0.85, wh + 10), P(0.75, 0.85, wh + 30), P(0.75, 0.5, wh + 30)], '#3d3456');
  poly([P(0.4, 0.5, wh + 30), P(0.75, 0.5, wh + 30), P(0.75, 0.85, wh + 30), P(0.4, 0.85, wh + 30)], '#7d70a0');
  // back roof plane (faces -y)
  poly([P(-0.15, -0.15, wh - 2), P(2.15, -0.15, wh - 2), P(2.15, 1, wh + rh), P(-0.15, 1, wh + rh)], '#3d5ea8');
  // walls
  poly([P(0, 2, 0), P(2, 2, 0), P(2, 2, wh), P(0, 2, wh)], '#efe1cf');      // SW face (lit)
  poly([P(2, 2, 0), P(2, 0, 0), P(2, 0, wh), P(2, 2, wh)], '#b9a7a8');      // SE face (shade)
  // gable on SE side
  poly([P(2, 0, wh), P(2, 2, wh), P(2, 1, wh + rh)], '#a8969c');
  // stone base
  poly([P(0, 2, 0), P(2, 2, 0), P(2, 2, 5), P(0, 2, 5)], '#8f86a8');
  poly([P(2, 2, 0), P(2, 0, 0), P(2, 0, 5), P(2, 2, 5)], '#665d80');
  // timber frame
  const tb = '#5e3d40';
  for (const u of [0, 1, 2]) line(P(u, 2, 5), P(u, 2, wh), tb);
  for (const v of [0, 2]) line(P(2, v, 5), P(2, v, wh), tb);
  line(P(0, 2, wh), P(2, 2, wh), tb); line(P(2, 2, wh), P(2, 0, wh), tb);
  line(P(0, 2, 14), P(2, 2, 14), tb);
  line(P(2, 0, wh), P(2, 1, wh + rh), tb); line(P(2, 2, wh), P(2, 1, wh + rh), tb);
  // windows (warm glow) on SW face
  for (const u0 of [0.3, 1.25]) {
    poly([P(u0, 2, 9), P(u0 + 0.45, 2, 9), P(u0 + 0.45, 2, 18), P(u0, 2, 18)], '#3b2a48');
    poly([P(u0 + 0.06, 2, 10), P(u0 + 0.39, 2, 10), P(u0 + 0.39, 2, 17), P(u0 + 0.06, 2, 17)], '#ffcf7a');
    line(P(u0 + 0.225, 2, 10), P(u0 + 0.225, 2, 17), '#c98a3a');
  }
  // round gable window
  x.fillStyle = '#ffe39a'; const gw = P(2, 1, wh + 8); x.fillRect(gw[0] - 2, gw[1] - 2, 3, 4);
  // door on SE face
  poly([P(2, 1.35, 0), P(2, 0.65, 0), P(2, 0.65, 15), P(2, 1.35, 15)], '#3b2430');
  poly([P(2, 1.27, 0), P(2, 0.73, 0), P(2, 0.73, 13), P(2, 1.27, 13)], '#ffb85c');
  // front roof plane (faces +y) with shingle rows
  const r0 = P(-0.15, 2.15, wh - 2), r1 = P(2.15, 2.15, wh - 2), r2 = P(2.15, 1, wh + rh), r3 = P(-0.15, 1, wh + rh);
  poly([r0, r1, r2, r3], '#5c86d6');
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    const a = [lerp(r0[0], r3[0], t), lerp(r0[1], r3[1], t)], b = [lerp(r1[0], r2[0], t), lerp(r1[1], r2[1], t)];
    line(a, b, k % 2 ? '#4670c0' : '#7aa3ec');
  }
  line(r3, r2, '#b9d4ff'); line(r0, r1, '#2e4a8a');
  line(r1, r2, '#2e4a8a');
  crisp(c);
  return { c, ox: OX, oy: OY, lights: [{ x: 2.05, y: 1, z: 1.2, r: 46, col: '#ffb86a', a: 0.9 }, { x: 0.55, y: 2.1, z: 2.3, r: 30, col: '#ffcf7a', a: 0.7 }, { x: 1.5, y: 2.1, z: 2.3, r: 30, col: '#ffcf7a', a: 0.7 }], chimney: { x: 0.6, y: 0.65, z: (wh + 32) / ZS } };
}

// ===== Icons ===================================================================
function makeIcon(glyph, color) {
  const { c, x } = makeCanvas(16, 16);
  const g = x.createLinearGradient(0, 0, 16, 16);
  g.addColorStop(0, rgba(color, 0.95)); g.addColorStop(1, '#1a1330');
  x.fillStyle = g; x.fillRect(0, 0, 16, 16);
  x.strokeStyle = '#ffffff'; x.fillStyle = '#ffffff'; x.lineWidth = 1.6; x.lineCap = 'round';
  const L = (a, b, cc, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(cc, d); x.stroke(); };
  const C = (cx, cy, r, f) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); f ? x.fill() : x.stroke(); };
  const A = (cx, cy, r, a0, a1) => { x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke(); };
  switch (glyph) {
    case 'sword': L(3, 13, 13, 3); L(4, 9, 7, 12); break;
    case 'staff': L(3, 13, 11, 5); C(12, 4, 2.2, true); break;
    case 'bow': A(4, 8, 7, -1.2, 1.2); L(6.5, 1.5, 6.5, 14.5); break;
    case 'arc': A(8, 10, 6, -2.8, -0.3); A(8, 10, 3.5, -2.6, -0.5); break;
    case 'strike': L(3, 13, 12, 4); L(9, 3, 13, 7); C(12, 4, 1.5, true); break;
    case 'dash': L(2, 8, 12, 8); L(9, 5, 13, 8); L(9, 11, 13, 8); L(3, 5, 6, 5); L(3, 11, 6, 11); break;
    case 'spin': A(8, 8, 5.5, 0, 4.8); L(13, 6, 13.5, 9); C(8, 8, 1.5, true); break;
    case 'beam': L(8, 1, 8, 13); L(5, 10, 11, 10); C(8, 14, 1.5, true); break;
    case 'wave': A(6, 8, 6, -1.1, 1.1); A(3, 8, 6, -0.9, 0.9); break;
    case 'fire': x.beginPath(); x.moveTo(8, 2); x.quadraticCurveTo(14, 9, 8, 14); x.quadraticCurveTo(2, 9, 8, 2); x.fill(); break;
    case 'frost': for (let a = 0; a < 3; a++) { const t = a * Math.PI / 3; L(8 - Math.cos(t) * 6, 8 - Math.sin(t) * 6, 8 + Math.cos(t) * 6, 8 + Math.sin(t) * 6); } break;
    case 'orbs': C(4, 8, 2, true); C(8, 4, 2, true); C(12, 8, 2, true); C(8, 12, 2, true); break;
    case 'well': A(8, 8, 6, 0, 5); A(8, 8, 3.5, 1, 6); C(8, 8, 1.2, true); break;
    case 'meteor': C(10, 10, 3.5, true); L(2, 2, 7, 7); L(2, 6, 6, 9); L(6, 2, 9, 6); break;
    case 'stars': for (const [sx, sy] of [[4, 4], [11, 6], [6, 12]]) { L(sx - 2, sy, sx + 2, sy); L(sx, sy - 2, sx, sy + 2); } break;
    case 'arrows': L(2, 13, 13, 2); L(2, 9, 10, 2); L(6, 13, 13, 6); break;
    case 'pierce': L(1, 8, 14, 8); L(11, 5, 14, 8); L(11, 11, 14, 8); C(6, 8, 2.5); break;
    case 'roll': A(8, 8, 5, 0.5, 5.5); L(13, 9, 10, 11); break;
    case 'trap': L(2, 12, 14, 12); for (let k = 0; k < 4; k++) { L(3 + k * 3, 12, 4.5 + k * 3, 6); L(4.5 + k * 3, 6, 6 + k * 3, 12); } break;
    case 'rain': for (let k = 0; k < 4; k++) L(3 + k * 3, 2 + (k % 2) * 3, 3 + k * 3, 8 + (k % 2) * 3); L(2, 14, 14, 14); break;
    case 'moonbeam': A(9, 8, 6, 1.9, 4.4); L(5, 8, 15, 8); break;
    case 'shield': x.beginPath(); x.moveTo(8, 2); x.lineTo(13, 4); x.lineTo(12, 10); x.lineTo(8, 14); x.lineTo(4, 10); x.lineTo(3, 4); x.closePath(); x.stroke(); L(8, 4, 8, 12); break;
    case 'surge': x.beginPath(); x.moveTo(8, 2); x.quadraticCurveTo(14, 10, 8, 14); x.quadraticCurveTo(2, 10, 8, 2); x.stroke(); L(8, 6, 8, 11); L(6, 8, 10, 8); break;
    case 'cloak': A(8, 9, 5, 3.4, 6.0); C(8, 9, 1.6, true); L(3, 12, 13, 12); break;
    case 'shout': A(4, 8, 3, -1, 1); A(4, 8, 6, -0.9, 0.9); A(4, 8, 9, -0.8, 0.8); break;
    case 'nova': for (let a = 0; a < 4; a++) { const t = a * Math.PI / 4; L(8 - Math.cos(t) * 7, 8 - Math.sin(t) * 7, 8 + Math.cos(t) * 7, 8 + Math.sin(t) * 7); } C(8, 8, 2, true); break;
    case 'heart': x.beginPath(); x.moveTo(8, 13); x.bezierCurveTo(1, 8, 3, 2, 8, 6); x.bezierCurveTo(13, 2, 15, 8, 8, 13); x.fill(); break;
    case 'charge': L(2, 10, 10, 10); L(2, 6, 8, 6); x.beginPath(); x.moveTo(10, 4); x.lineTo(14, 8); x.lineTo(10, 12); x.closePath(); x.fill(); break;
    case 'blink': C(5, 10, 2.5); C(11, 5, 2.5, true); L(7, 8, 9, 7); break;
    case 'sprint': L(3, 12, 9, 3); L(9, 3, 12, 9); L(1, 8, 5, 8); L(1, 11, 4, 11); break;
    case 'orbit': C(8, 8, 2, true); A(8, 8, 6, 0, 6.3); C(14, 8, 1.5, true); C(2, 8, 1.5, true); break;
    case 'chain': x.beginPath(); x.moveTo(10, 1); x.lineTo(4, 9); x.lineTo(9, 9); x.lineTo(5, 15); x.stroke(); break;
    case 'veil': A(8, 6, 6, 0.2, 2.9); A(8, 10, 6, 0.2, 2.9); C(8, 5, 1.5, true); break;
    case 'bless': L(8, 2, 8, 14); L(3, 6, 13, 6); C(8, 6, 3); break;
    case 'star': x.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.6 : 6.5, a = -Math.PI / 2 + k * Math.PI / 5; x.lineTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r); } x.closePath(); x.fill(); break;
    case 'helm': A(8, 9, 5, Math.PI, 0); L(3, 9, 13, 9); L(8, 4, 8, 12); break;
    case 'chest': x.strokeRect(4, 3, 8, 10); L(4, 6, 12, 6); break;
    case 'boots': L(5, 2, 5, 12); L(5, 12, 12, 12); L(9, 2, 9, 9); break;
    case 'gem': x.beginPath(); x.moveTo(8, 2); x.lineTo(13, 6); x.lineTo(8, 14); x.lineTo(3, 6); x.closePath(); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; L(3, 6, 13, 6); L(8, 2, 6, 6); L(8, 2, 10, 6); L(6, 6, 8, 14); L(10, 6, 8, 14); break;
    case 'potion': x.fillRect(7, 2, 2, 3); C(8, 10, 4.2, true); x.fillStyle = 'rgba(255,80,110,0.9)'; C(8, 10.8, 3, true); break;
    case 'dust': for (const [sx, sy, r] of [[5, 6, 1.6], [10, 4, 1.2], [9, 10, 2], [4, 12, 1.2], [13, 9, 1]]) C(sx, sy, r, true); break;
    default: C(8, 8, 4, true);
  }
  // frame
  x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 1; x.strokeRect(0.5, 0.5, 15, 15);
  return crisp(c, 60);
}

// ===== Sky / background layers ============================================
function buildSky(theme) {
  const W = 640, H = 360, pb = new PixBuf(W, H);
  const sky = ramp(theme.sky);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = y / (H * 0.78) + (fbm(x * 0.01, y * 0.02, 3, 31) - 0.5) * 0.12;
    pb.set(x, y, rampDither(sky, v, x, y));
  }
  const sky1 = pb.toCanvas();
  // stars
  seedRng(theme.seed);
  const stars = [];
  for (let i = 0; i < 140; i++) stars.push({ x: rand(0, W), y: rand(0, H * 0.55) ** 1.0, p: rand(0, 6.28), s: rand(0.3, 1.2), big: rand() < 0.08 });
  return { c: sky1, stars };
}

function buildMountains(theme, seed, colA, colB, haze, heightPx, jag) {
  const W = 900, H = 200, pb = new PixBuf(W, H);
  const pal = ramp([colA, colB]);
  const hz = hexToRgb(haze);
  // pine-forest skyline: a rolling ridge covered in spiky conifer silhouettes
  let pines = null;
  if (jag === 'pines') {
    seedRng(seed);
    pines = new Float32Array(W);
    for (let x = 0; x < W; x++) pines[x] = fbm(x * 0.004, 0.5, 3, seed) * 0.35;
    for (let i = 0; i < W / 7; i++) {
      const px = rand(0, W), hh = rand(0.3, 1), w = hh * rand(13, 19);
      for (let x = Math.floor(px - w); x <= px + w; x++) {
        if (x < 0 || x >= W) continue;
        const t = 1 - Math.abs(x - px) / w, saw = ((Math.abs(x - px) * 1.3) % 4) * 0.025;   // branch tiers
        pines[x] = Math.max(pines[x], 0.22 + hh * t * 0.62 - saw);
      }
    }
  }
  for (let x = 0; x < W; x++) {
    let n = Math.pow(1 - Math.abs(fbm(x * 0.005, 0.5, 4, seed) * 2 - 1), 2.2) * 1.15;
    if (jag === true) n = 1 - Math.abs(fbm(x * 0.01, 1.5, 3, seed) * 2 - 1) * 0.9;
    if (pines) n = pines[x];
    const top = H - heightPx * (0.25 + n * 0.85);
    for (let y = Math.floor(top); y < H; y++) {
      const t = (y - top) / (H - top);
      let c = rampDither(pal, clamp(0.85 - t * 0.8 + (fbm(x * 0.05, y * 0.05, 2, seed + 3) - 0.5) * 0.3, 0, 1), x, y);
      if (theme.snow && n > 0.95 && y - top < (n - 0.95) * 30) c = rampDither([hexToRgb(theme.snow), mixRgb(hexToRgb(theme.snow), pal[0], 0.4)], (x - y * 0.3) % 7 / 7, x, y);
      c = mixRgb(c, hz, clamp(t * 0.85, 0, 0.85));
      pb.set(x, y, c);
    }
  }
  return pb.toCanvas();
}

function buildCloud(seed, w, h, pal, alpha = 255) {
  seedRng(seed);
  const pb = new PixBuf(w, h);
  const blobs = [];
  for (let i = 0; i < 9; i++) blobs.push({ x: rand(w * 0.18, w * 0.82), y: rand(h * 0.45, h * 0.75), r: rand(h * 0.2, h * 0.42) });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let best = -1, ny = 0;
    for (const b of blobs) {
      const dx = (x - b.x) / b.r, dy = (y - b.y) / b.r, d2 = dx * dx + dy * dy;
      if (d2 < 1 && y < h * 0.8) { const hh = Math.sqrt(1 - d2); if (hh > best) { best = hh; ny = dy; } }
    }
    if (best < 0) continue;
    const v = 0.55 - ny * 0.45 + (vnoise(x * 0.2, y * 0.2, seed) - 0.5) * 0.15;
    pb.set(x, y, rampDither(pal, v, x, y), alpha);
  }
  return pb.toCanvas();
}

// cloud sea tile (docs/design/world-maps.md island edge v2): a 256 x 96 band of soft, dense cloud, tileable in x (period-8 noise over 256 px),
// billowy and lit on top, opaque at the bottom (drawCloudSea fills below it with `base`). layer 0 = the far layer, 1 = the near one.
// Pure hash noise (no seedRng), so building it never disturbs seeded generation.
function buildSeaTile(th, seed, layer) {
  const W = 256, H = 96, pb = new PixBuf(W, H), pal = th.cloud, n = pal.length - 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nz = fbm(x / 32, y / 20 + layer * 3.7, 4, seed, 8), t = y / H;
    const a = clamp((nz * 0.95 + t * 1.1 - 0.62) / 0.22, 0, 1);
    if (a <= 0) continue;
    const v = clamp(0.92 - t * 0.55 + (nz - 0.5) * 0.35 - (1 - a) * 0.15 - layer * 0.08, 0, 1);
    const f = v * n, i = Math.floor(f), c = pal[(f - i) > ((((y & 1) << 1) | (x & 1)) * 0.25 + 0.125) && i < n ? i + 1 : i];
    pb.set(x, y, c, Math.round(smooth(a) * 255));
  }
  return pb.toCanvas();
}

function buildFog(seed, hex) {
  const S = 128, pb = new PixBuf(S, S), c = hexToRgb(hex);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm(x / 32, y / 32, 4, seed, 4);
    const a = clamp((n - 0.42) / 0.35, 0, 1);
    pb.set(x, y, c, Math.round(smooth(a) * 255));
  }
  return pb.toCanvas();
}

// ===== forest ===================================================================
const PAL_PINE_BARK = ramp(['#1e120c', '#33201a', '#4a2e22', '#64402e', '#80563c']);   // logs / stumps
// (pine v1, pineTree: mirror-symmetric tiers with a hard-coded right rim, is replaced by pineTree2 above, §29 G2)
function buildForest() {
  buildTreesV2();   // §29 G2: canopyTree broadleaves + pine v2 (ART.trees.*, ART.pines.*)
  ART.mushroomRed = asciiSprite([
    '..KKKK..', '.KRRWRK.', 'KRWRRRRK', 'KRRRRWRK', '.KKSSKK.', '...SS...', '...SS...', '..KSSK..',
  ], { K: '#3a1410', R: '#d23a2a', W: '#f4ece0', S: '#e8dcc8' });
  const MOSS = ramp(['#1e2a14', '#2c3e1a', '#3e5622', '#57722c', '#7a9438', '#a6bc50']);
  ART.moss = [0, 1, 2].map(i => blobTree(940 + i, { w: 20, h: 11, trunkTop: 99, trunkW: 0, cy: 7, blobs: 5, spread: 4, squash: 0.45, rmin: 3, rmax: 5, vstretch: 0.7, pal: MOSS, flecks: { n: 4, c: ['#c8d870', '#a6bc50'] } }));
  // fallen log: a bark cylinder with a ring-cut end and moss on top
  ART.log = (() => {
    const W = 30, H = 12, pb = new PixBuf(W, H), bark = PAL_PINE_BARK, ringC = ramp(['#6a4a30', '#a07a4e', '#c8a06a']);
    for (let y = 0; y < H; y++) for (let x = 4; x < W; x++) {
      const dy = (y - 6) / 5; if (Math.abs(dy) > 1) continue;
      let c = rampDither(bark, 0.7 - dy * 0.45 + (vnoise(x * 0.25, y * 1.2, 5) - 0.5) * 0.4, x, y);
      if (dy < -0.55 && vnoise(x * 0.4, 2, 6) > 0.45) c = MOSS[3 + (x % 2)];
      pb.set(x, y, c);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < 9; x++) {
      const dx = (x - 4) / 3.2, dy = (y - 6) / 5, d = Math.hypot(dx, dy); if (d > 1) continue;
      pb.set(x, y, d > 0.82 ? bark[1] : rampDither(ringC, 0.6 - (Math.floor(d * 4) % 2) * 0.35, x, y));
    }
    return pb.outline(0.4).toCanvas();
  })();
  ART.stump = (() => {
    const W = 16, H = 13, pb = new PixBuf(W, H);
    for (let y = 3; y < H; y++) for (let x = 1; x < W - 1; x++) { const u = (x - 1) / (W - 2); const flare = y > H - 3 ? 1 : 0; if (x < 2 - flare || x > W - 3 + flare) continue; pb.set(x, y, rampDither(PAL_PINE_BARK, 0.25 + u * 0.55 + (vnoise(x, y * 0.3, 8) - 0.5) * 0.3, x, y)); }
    for (let y = 0; y < 7; y++) for (let x = 1; x < W - 1; x++) { const dx = (x - 7.5) / 6.5, dy = (y - 3.5) / 3; const d = Math.hypot(dx, dy); if (d > 1) continue; pb.set(x, y, hexToRgb(Math.floor(d * 5) % 2 ? '#a07a4e' : '#c8a06a')); }
    return pb.outline(0.4).toCanvas();
  })();
  ART.sunIcon = asciiSprite(['...Y...', '.Y.Y.Y.', '..YWY..', 'YYWWWYY', '..YWY..', '.Y.Y.Y.', '...Y...'], { Y: '#ffc860', W: '#fff4d0' });
}

// ===== pixel-data sprites (world.sprites — editable in the editor's pixel editor) ====
// { w, h, pal: ['#rrggbb', …], rows: ['..01..', …] }  '.' = transparent, '0'-'9','a'-'z' = palette index
ART.custom = {}; ART.customF = {};
function spriteFromData(s) {
  const pb = new PixBuf(Math.max(1, s.w), Math.max(1, s.h));
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const ch = (s.rows[y] || '')[x]; if (!ch || ch === '.') continue;
    const c = s.pal[parseInt(ch, 36)]; if (c) pb.set(x, y, hexToRgb(c));
  }
  return pb.toCanvas();
}
function buildCustomSprites(sprites) {
  ART.custom = {}; ART.customF = {};
  for (const id in sprites || {}) { try { ART.custom[id] = spriteFromData(sprites[id]); ART.customF[id] = flipH(ART.custom[id]); } catch (e) { /* skip broken sprite */ } }
}
// turn any canvas into editable pixel data (max 36 colours)
function canvasToSprite(canvas) {
  const w = canvas.width, h = canvas.height, d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const count = new Map();
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; count.set(k, (count.get(k) || 0) + 1); }
  const pal = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 36).map(e => e[0]);
  const near = k => { let best = 0, bd = 1e9; pal.forEach((p, i) => { const dd = ((p >> 16) - (k >> 16)) ** 2 + (((p >> 8) & 255) - ((k >> 8) & 255)) ** 2 + ((p & 255) - (k & 255)) ** 2; if (dd < bd) { bd = dd; best = i; } }); return best; };
  const rows = [];
  for (let y = 0; y < h; y++) { let r = ''; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; r += d[i + 3] > 100 ? near((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(36) : '.'; } rows.push(r); }
  return { w, h, pal: pal.map(k => '#' + k.toString(16).padStart(6, '0')), rows };
}

function buildArt() {
  buildWeapons();
  buildMonsters();
  buildFlora();
  buildProps();
  buildForest();
  applySprites();
  buildChests();
  ART.icons = {};
}
// treasure chest (closed / open) for the `chest` world object, stone tablet for `tablet`
function buildChests() {
  ART.tablet = asciiSprite(['..KKKKKK..', '.KSSSSSSK.', 'KSsLLLLsSK', 'KSsssssSSK', 'KSLLLsLLSK', 'KSsssssSSK', 'KSLLsLLLSK', 'KSsssssSSK', 'KSSSSSSSSK', 'KKKKKKKKKK', '.KmmmmmmK.'],
    { K: '#1a1326', S: '#8a84a8', s: '#5e5878', L: '#b8e0ff', m: '#3f6a4a' });
  const pal = { K: '#1a1326', W: '#8a5a34', w: '#5e3a20', G: '#ffd35a', g: '#b8862a', I: '#2a1a10', L: '#fff2b0' };
  ART.chest = asciiSprite([
    '..KKKKKKKKKK..', '.KWWWWWWWWWWK.', 'KWwwwwwwwwwwWK', 'KGGGGGGGGGGGGK', 'KWWWWWGGWWWWWK', 'KWwwwwGLwwwwWK',
    'KWwwwwGGwwwwWK', 'KWwwwwwwwwwwWK', 'KgWWWWWWWWWWgK', '.KKKKKKKKKKKK.'], pal);
  ART.chestOpen = asciiSprite([
    '.KKKKKKKKKKKK.', 'KWwwwwwwwwwwWK', 'KWWWWWWWWWWWWK', 'KGGGGGGGGGGGGK', 'KIIIIIIIIIIIIK', 'KGGGGGGGGGGGGK',
    'KWWWWWGGWWWWWK', 'KWwwwwwwwwwwWK', 'KgWWWWWWWWWWgK', '.KKKKKKKKKKKK.'], pal);
}
function icon(glyph, color) {
  const k = glyph + color;
  return ART.icons[k] || (ART.icons[k] = makeIcon(glyph, color));
}
