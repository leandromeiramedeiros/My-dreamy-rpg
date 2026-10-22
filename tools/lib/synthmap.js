'use strict';
// The synthetic 112x112 engine-check zone (docs/design/world-maps.md). Used by tools/play.js.
// Moved here from tools/engine-tour.js (deleted in M4a cleanup). Pure data, deterministic.
// Returns a map object in the js/world.js shape; it is injected at run time and never written to js/world.js.
function synthMap(W = 112, H = 112, seed = 7) {
  const hash = (x, y, s) => { let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 982451653 + seed * 2654435761; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fb = (x, y, s) => (vn(x, y, s) * 0.6 + vn(x * 2, y * 2, s + 1) * 0.3 + vn(x * 4, y * 4, s + 2) * 0.1);
  // sections (outer south, underground NW, vault NE, arena E) with 3-tile gutters between them
  const sections = [
    { id: 'outer', name: 'Synthetic Wood', kind: 'outer', x: 0, y: 44, w: 112, h: 68 },
    { id: 'under', name: 'Synthetic Hollow', kind: 'under', x: 0, y: 0, w: 54, h: 41, ambient: '#5a6a92', dark: 0.6 },
    { id: 'vault', name: 'Synthetic Vault', kind: 'vault', x: 57, y: 0, w: 55, h: 19, ambient: '#6a5a82', dark: 0.4 },
    { id: 'arena', name: 'Synthetic Arena', kind: 'arena', x: 57, y: 22, w: 55, h: 19 },
  ];
  const gutter = (x, y) => (y >= 41 && y < 44) ? 'v' : (x >= 54 && x < 57 && y < 41) ? 'k' : (x >= 57 && y >= 19 && y < 22) ? 'v' : null;
  const tiles = [], heights = [];
  for (let y = 0; y < H; y++) {
    let tr = '', hr = '';
    for (let x = 0; x < W; x++) {
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y), g = gutter(x, y);
      const coast = edge < 1 + fb(x * 0.2, y * 0.2, 3) * 3;
      if (g || coast) { tr += g || '.'; hr += '0'; continue; }
      const under = y < 41 && x < 54, creek = Math.abs(y - 78 - Math.sin(x * 0.12) * 6) < 1.4 && y >= 44;
      const n = fb(x * 0.09, y * 0.09, 5), road = Math.abs(x - 56 - Math.sin(y * 0.08) * 10) < 1.3 && y > 44;
      let t = creek ? 'w' : road ? 'p' : under ? (n > 0.55 ? 'x' : 'd') : n > 0.62 ? 'f' : n < 0.33 ? 'd' : 'g';
      if (x > 60 && y < 41 && y >= 22 && (x - 84) ** 2 + (y - 31) ** 2 < 49) t = 'x';   // arena floor
      if (t === 'x' && x > 60 && y >= 22 && y < 41 && ((x - 84) ** 2 + (y - 31) ** 2 < 26 && (x - 84) ** 2 + (y - 31) ** 2 > 20) && hash(x, y, 9) < 0.3) t = 'c';   // pillars
      if (creek && Math.abs(x - 56) < 2) t = 'b';
      let h = creek || road || t === 'b' ? 0 : n > 0.47 ? 4 : n > 0.4 ? 2 : 0;   // ~60 % of the land is raised (pinewood: 61 %)
      if (t === 'c') h = 3;
      if (x > 60 && y >= 22 && y < 41 && (x - 84) ** 2 + (y - 31) ** 2 < 49 && t !== 'c') h = 0;
      tr += t; hr += h.toString(36);
    }
    tiles.push(tr); heights.push(hr);
  }
  const at = (x, y) => tiles[Math.floor(y)] && tiles[Math.floor(y)][Math.floor(x)];
  const free = (x, y) => { const t = at(x, y); return t && !'.vkwc'.includes(t); };
  const objects = [];
  const KINDS = ['pine', 'pine', 'pine_young', 'pine_giant', 'rock', 'rock_dark', 'grass', 'grass', 'moss', 'mushroom_red', 'stump', 'tree_dead', 'bush', 'mushroom', 'log'];
  let k = 0;
  for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
    if (!free(x, y) || hash(x, y, 11) > 0.115) continue;
    const t = at(x, y) === 'p' || at(x, y) === 'b' ? null : KINDS[(hash(x, y, 12) * KINDS.length) | 0];
    if (!t) continue;
    objects.push({ t, x: x + 0.5, y: y + 0.5, v: (k++) % 3 });
  }
  for (let i = 0; i < 70; i++) { const x = 3 + hash(i, 1, 21) * (W - 6), y = 3 + hash(i, 2, 21) * (H - 6); if (free(x, y)) objects.push({ t: i % 3 ? 'lantern' : 'crystal', x, y }); }
  // shrines: 3 outer + 1 under; anchors; warp doors (outer <-> under keyed, outer -> vault sealed), arena gate
  const sp = (x, y) => { for (let r = 0; r < 6; r += 0.5) for (let a = 0; a < 6.28; a += 0.5) { const qx = x + Math.cos(a) * r, qy = y + Math.sin(a) * r; if (free(qx, qy) && free(qx + 1, qy) && free(qx, qy + 1)) return [Math.floor(qx) + 0.5, Math.floor(qy) + 0.5]; } return [x, y]; };
  const P = {}; for (const [id, x, y] of [['s1', 14, 100], ['s2', 56, 70], ['s3', 96, 56], ['su', 26, 20], ['door_under', 30, 50], ['door_up', 20, 12], ['door_vault', 96, 48], ['door_back', 80, 9], ['gate', 70, 31], ['start', 10, 104], ['arena', 84, 31]]) P[id] = sp(x, y);
  objects.push({ t: 'shrine', id: 'synth_s1', name: 'South road', x: P.s1[0], y: P.s1[1] }, { t: 'shrine', id: 'synth_s2', name: 'Creek ford', x: P.s2[0], y: P.s2[1] },
    { t: 'shrine', id: 'synth_s3', name: 'East gate', x: P.s3[0], y: P.s3[1] }, { t: 'shrine', id: 'synth_su', name: 'Hollow midpoint', x: P.su[0], y: P.su[1] });
  objects.push({ t: 'warpdoor', id: 'door_under', x: P.door_under[0], y: P.door_under[1], to: 'door_up', key: 'key_synth', label: 'Descend' },
    { t: 'warpdoor', id: 'door_up', x: P.door_up[0], y: P.door_up[1], to: 'door_under', label: 'Climb out' },
    { t: 'warpdoor', id: 'door_vault', x: P.door_vault[0], y: P.door_vault[1], to: 'door_back', open: false, label: 'Enter the vault' },
    { t: 'warpdoor', id: 'door_back', x: P.door_back[0], y: P.door_back[1], to: { x: P.door_vault[0], y: P.door_vault[1] + 1.2 }, label: 'Back' },
    { t: 'gate', id: 'arena_gate', x: P.gate[0], y: P.gate[1], ang: 0, len: 2.4, open: true });
  const packs = [[30, 96], [60, 92], [90, 100], [24, 64], [80, 70], [104, 60], [16, 28], [40, 12], [92, 10]];
  const triggers = [{ id: 'banner', when: { type: 'map_enter' }, actions: [{ type: 'objective', text: 'Tour the synthetic zone' }] }];
  packs.forEach(([x, y], i) => { const [px, py] = sp(x, y); triggers.push({ id: 'pack' + i, when: { type: 'enter_area', x: px, y: py, r: 7 }, actions: [{ type: 'spawn', enemy: ['slime', 'hound', 'wisp'][i % 3], count: 4, x: px, y: py, radius: 2 }] }, { id: 'pack' + i + '_done', when: { type: 'all_enemies_dead' }, requires: ['pack' + i], actions: [{ type: 'loot', rarity: 'uncommon', count: 1, x: px, y: py }] }); });
  triggers.push({ id: 'arena_in', when: { type: 'enter_area', x: P.arena[0], y: P.arena[1], r: 4 }, actions: [{ type: 'arena', id: 'synth_arena', gate: 'arena_gate', x: P.arena[0], y: P.arena[1], r: 7 }, { type: 'spawn', enemy: 'hound', count: 3, x: P.arena[0], y: P.arena[1], radius: 2 }] },
    { id: 'arena_won', when: { type: 'all_enemies_dead' }, requires: ['arena_in'], actions: [{ type: 'openGate', id: 'arena_gate' }] });
  for (let i = 0; i < 20; i++) triggers.push({ id: 'note' + i, when: { type: 'enter_area', x: 5 + hash(i, 3, 31) * 100, y: 50 + hash(i, 4, 31) * 55, r: 3 }, actions: [{ type: 'message', text: 'A synthetic note ' + i }] });
  return { name: 'Synthetic Zone', sub: 'engine check', theme: 'forest', W, H, tiles, heights, start: { x: P.start[0], y: P.start[1] }, portals: [], objects,
    objective: 'Tour the synthetic zone', level: [3, 8], sections, anchors: [{ id: 'arena_mid', x: P.arena[0], y: P.arena[1] }, { id: 'vault_mid', x: 84, y: 9 }], triggers };
}
module.exports = { synthMap };
