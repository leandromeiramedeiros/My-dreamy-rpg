#!/usr/bin/env node
'use strict';
// tools/export/props.js -- props, trees and ground decals for Godot (handoff/art/props/), read from the running game's own art
// (js/art.js built at load from js/sprites.js's frozen sheets and the procedural builders; OBJ_TYPES in js/maps.js).
//   <kind>[_NN].png + .json        one PNG per prop image (NN = variant when the kind has several); sidecar { origin (the
//                                  pixel on the ground point: Godot Sprite2D centered = false, offset = -origin), size,
//                                  collider_r (tiles; 0 = none), shadow (ellipse rx px), light, frames }
//   tree: <kind>_NN_trunk.png + _canopy.png + <kind>_NN.json   the two layers, one frame each; sidecar canopy { box (x0, y0,
//                                  x1, y1 of the canopy's opaque pixels), fade 0.35 over 0.2 s while the hero is under it },
//                                  wind { cut_row: rows above it sway -2..+2 px (a canopy shader in Godot) }, flip_by_light
//   decals_<zone>.png + .json      the 16 ground-decal kinds x up to 3 variants of the zone, fixed cells; per cell its rect and
//                                  anchor (decals are baked flat into the ground: no collider, no sort)
// Usage: node tools/export/props.js [--out dir]   (default handoff/art)
const fs = require('fs'), path = require('path');
const { inGame, toImg } = require('./page.js'), { Img } = require('./png8.js'), { loadZones } = require('./tiles.js');
const ROOT = path.join(__dirname, '..', '..');

function pick() {   // runs in the page
  const SKIP = new Set(['gate', 'keydoor', 'hidden', 'fishspot', 'sunbeam', 'root_ladder', 'fox', 'rabbit']);   // placeholder art only
  const out = { props: [], decals: {} }, seen = new Map();
  for (const [kind, def] of Object.entries(OBJ_TYPES)) {
    if (SKIP.has(kind)) continue;
    let imgs = def.img(); if (!Array.isArray(imgs)) imgs = [imgs];
    const frames = def.grass ? imgs.length : 1, list = def.grass ? [imgs[0]] : imgs;
    list.forEach((c, v) => {
      if (seen.has(c)) return; seen.set(c, kind);
      const rec = { kind, variant: list.length > 1 ? v : null, w: c.width, h: c.height, r: def.r || 0, shadow: def.shadow || 0, light: def.light || null, tree: !!def.tree, label: def.label };
      if (def.house) { rec.origin = [ART.house.ox, ART.house.oy + 16]; }
      if (c.trunk && c.canopy) { rec.trunk = __grab(c.trunk); rec.canopy = __grab(c.canopy); rec.cbox = c.cbox; rec.cut = Math.round(c.height * 0.6); }
      else rec.img = def.grass ? imgs.map(__grab) : [__grab(c)];
      out.props.push(rec);
    });
  }
  if (ART.chestOpen) out.props.push({ kind: 'chest_open', variant: null, w: ART.chestOpen.width, h: ART.chestOpen.height, r: 0.3, shadow: 6, light: null, img: [__grab(ART.chestOpen)], label: 'Treasure chest (open)' });
  for (const [id, th] of Object.entries(THEMES)) out.decals[id] = buildDecalSet(th, th.seed | 0).map((vs, k) => ({ kind: DECAL_KINDS[k], v: vs.map(c => Object.assign(__grab(c), { ax: c.ax, ay: c.ay })) }));
  out.lightSide = Object.fromEntries(Object.entries(THEMES).map(([id, th]) => [id, th.moon.x < RW / 2 ? 'left' : 'right']));
  return out;
}

async function exportProps(outRoot) {
  const data = await inGame('map=vale', pick), dir = path.join(outRoot, 'props'), files = [];
  fs.mkdirSync(dir, { recursive: true });
  const save = (name, im) => { Img.from(toImg(im)).save(path.join(dir, name)); files.push(name); };
  const json = (name, o) => { fs.writeFileSync(path.join(dir, name), JSON.stringify(o, null, 1) + '\n'); files.push(name); };
  let props = 0, trees = 0;
  for (const p of data.props) {
    const id = p.kind + (p.variant != null ? '_' + String(p.variant).padStart(2, '0') : '');
    const base = { id, kind: p.kind, label: p.label, size: [p.w, p.h], origin: p.origin || [p.w / 2, p.h - 1], collider_r: p.r, shadow: p.shadow, light: p.light };
    if (p.trunk) {
      save(`${id}_trunk.png`, p.trunk); save(`${id}_canopy.png`, p.canopy); trees++;
      json(`${id}.json`, Object.assign(base, { layers: { trunk: `${id}_trunk.png`, canopy: `${id}_canopy.png` },
        canopy: p.tree ? { box: p.cbox, fade: 0.35, fade_s: 0.2, rule: 'split while the hero (14 x 32 px box at his feet) overlaps box and stands behind the trunk; canopy alpha 1 -> fade' } : null,
        wind: { cut_row: p.cut, px: [-2, -1, 0, 1, 2], about: 'rows above cut_row shift by the wind frame (js/wind.js); Godot: a canopy shader' },
        flip_by_light: p.tree, flip_about: 'mirrored when the zone light is on the left (zones.json light_side)' }));
    } else {
      const frames = p.img.length;
      if (frames > 1) { const s = new Img(p.w * frames, p.h); p.img.forEach((g, f) => s.blit(Img.from(toImg(g)), f * p.w, 0)); s.save(path.join(dir, `${id}.png`)); files.push(`${id}.png`); }
      else save(`${id}.png`, p.img[0]);
      props++;
      json(`${id}.json`, Object.assign(base, { image: `${id}.png`, frames: frames > 1 ? { count: frames, cell: [p.w, p.h], about: 'wind frames, left to right' } : null }));
    }
  }
  // decal atlases per zone
  const zones = loadZones();
  for (const z of zones) {
    const set = data.decals[z.theme]; if (!set) continue;
    const cw = Math.max(...set.flatMap(k => k.v.map(c => c.w))), chh = Math.max(...set.flatMap(k => k.v.map(c => c.h))), cols = Math.max(...set.map(k => k.v.length));
    const atlas = new Img(cols * cw, set.length * chh), cells = [];
    set.forEach((k, r) => k.v.forEach((c, v) => { atlas.blit(Img.from(toImg(c)), v * cw, r * chh); cells.push({ kind: k.kind, variant: v, col: v, row: r, rect: [v * cw, r * chh, c.w, c.h], anchor: [c.ax, c.ay] }); }));
    atlas.save(path.join(dir, `decals_${z.id}.png`)); files.push(`decals_${z.id}.png`);
    json(`decals_${z.id}.json`, { zone: z.id, image: `decals_${z.id}.png`, cell: [cw, chh], grid: [cols, set.length], about: 'Ground decals of the zone: row = kind (DECAL_KINDS order), col = variant; rect = the opaque image inside its cell (top-left aligned), anchor = the pixel placed on the ground point. Baked flat on the ground (no collider, no Y-sort).', cells });
  }
  return { files: files.map(f => path.join(dir, f)), props, trees, lightSide: data.lightSide };
}
module.exports = { exportProps };
if (require.main === module) {
  const a = process.argv.slice(2), oi = a.indexOf('--out'), out = oi >= 0 ? path.resolve(a[oi + 1]) : path.join(ROOT, 'handoff', 'art');
  exportProps(out).then(r => console.log(`props: ${r.props} props + ${r.trees} trees (trunk + canopy), ${r.files.length} files`)).catch(e => { console.error(e); process.exit(1); });
}
