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

function buildPlayerSprites(gear) {
  const head = ITEMS.head.find(i => i.id === gear.head);
  const chest = ITEMS.chest.find(i => i.id === gear.chest);
  const boots = ITEMS.boots.find(i => i.id === gear.boots);
  const pal = Object.assign({
    K: '#1a1326', S: '#f6d2b5', s: '#d9a088', E: '#2b2140', G: '#f2c45a', W: '#5a3b2e',
  }, head.pal, chest.pal, boots.pal);
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
  return out;
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
const PAL_LEAF_TEAL = ramp(['#132f40', '#1b4a5a', '#27686f', '#3a8b84', '#5cb19a', '#95d7b6', '#d8f6e2']);
const PAL_BLOSSOM = ramp(['#4a2348', '#7a3a6e', '#b45a92', '#e184b6', '#f6b1d2', '#ffe0ee', '#ffffff']);
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
  ART.trees = { round: [], poplar: [], blossom: [], teal: [], dead: [] };
  for (let i = 0; i < 4; i++) {
    ART.trees.round.push(blobTree(100 + i, { w: 30, h: 42, trunkTop: 26, trunkW: 4, cy: 16, blobs: 6, spread: 6, squash: 0.8, rmin: 5, rmax: 9, vstretch: 1, pal: PAL_LEAF, flecks: { n: 6, c: ['#ffe9a8', '#fff6dc'] } }));
    ART.trees.poplar.push(blobTree(200 + i, { w: 18, h: 50, trunkTop: 38, trunkW: 3, cy: 21, blobs: 6, spread: 4, squash: 3.2, rmin: 4, rmax: 7, vstretch: 2.2, pal: PAL_LEAF_TEAL }));
    ART.trees.blossom.push(blobTree(300 + i, { w: 32, h: 42, trunkTop: 25, trunkW: 4, cy: 15, blobs: 7, spread: 7, squash: 0.7, rmin: 5, rmax: 9, vstretch: 0.95, pal: PAL_BLOSSOM, flecks: { n: 18, c: ['#ffffff', '#fff0f7'] } }));
    ART.trees.teal.push(blobTree(400 + i, { w: 26, h: 38, trunkTop: 24, trunkW: 3, cy: 14, blobs: 5, spread: 5, squash: 0.9, rmin: 4, rmax: 8, vstretch: 1, pal: PAL_LEAF_TEAL, flecks: { n: 5, c: ['#bff7ff'] } }));
    ART.trees.dead.push(deadTree(500 + i));
  }
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
  for (let x = 0; x < W; x++) {
    let n = Math.pow(1 - Math.abs(fbm(x * 0.005, 0.5, 4, seed) * 2 - 1), 2.2) * 1.15;
    if (jag) n = 1 - Math.abs(fbm(x * 0.01, 1.5, 3, seed) * 2 - 1) * 0.9;
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

function buildFog(seed, hex) {
  const S = 128, pb = new PixBuf(S, S), c = hexToRgb(hex);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = fbm(x / 32, y / 32, 4, seed, 4);
    const a = clamp((n - 0.42) / 0.35, 0, 1);
    pb.set(x, y, c, Math.round(smooth(a) * 255));
  }
  return pb.toCanvas();
}

function buildArt() {
  buildWeapons();
  buildMonsters();
  buildFlora();
  buildProps();
  ART.icons = {};
}
function icon(glyph, color) {
  const k = glyph + color;
  return ART.icons[k] || (ART.icons[k] = makeIcon(glyph, color));
}
