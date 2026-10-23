#!/usr/bin/env node
'use strict';
// tools/export/art.js -- forge sprite sheets for Godot / Aseprite (handoff/art/{hero,gear,enemies,bosses}/), rendered by
// tools/forge/forge.js directly (never through build.js, which owns js/forge-bank). Flat colour, one PNG per unit and sheet:
//   rows = the 8 directions in forge order S, SE, E, NE, N, NW, W, SW; columns = frames, anim after anim in the fixed order
//   idle, walk, cast, dash, hit, death, block, channel, carry (then the rig's extra anims: heal, sleep); every cell = the model's
//   frame; the pivot `origin` = the feet pixel, the same in every cell (Godot: offset = -origin).
// Sheets per unit: <unit>.png = Core (every anim but attacks); <unit>.atk.<class>.png = one weapon class's attack (hero:
// sword, staff, bow, none; enemies: any). Hero paper doll (depth split, minutes §3):
//   hero/body[.atk.<c>].png             the bare body (the base layer; never split)
//   hero/hair[...]_front.png / _back    the hair split against the body per pixel
//   gear/<piece>.t<N>[...]_front / _back  every gear piece, same grid and origin as the body: _back draws under the body, _front
//                                        over it, pieces ordered by zorder[dir]. front = every pixel where body + piece differs
//                                        from the body alone (the piece's own outline and inner lines are in it); back = the
//                                        piece's own pixels hidden behind the body. body + back + front == the forge's body +
//                                        piece render exactly; between two pieces the forge's per-pixel interleave is lost.
//   enemies/<rig>[.atk.any].png          one layer. bosses/: no boss rig exists yet (nothing written).
//   <sheet>_n.png                        opt-in normal sheet (forge render { normals: true }; RGB = screen x right, y up, z out,
//                                        0..255; Godot CanvasTexture.normal_texture): body, hair, enemies; gear with --normals-gear
// Sidecar <sheet>.json (minutes §3): { cell, origin, dirs, anims { name: { from, count, ms, loop } }, sockets { dir: { anim:
// [ per frame { name: { x, y, front } } ] } }, layer, zorder { dir: int }, palette, images, aseprite: { type: 'grid', cell } }.
// Usage: node tools/export/art.js [--out dir] [--only <unit-prefix>] [--normals-gear]
const fs = require('fs'), path = require('path');
const FORGE = require('../forge/forge.js'), { Img } = require('./png8.js');
const ROOT = path.join(__dirname, '..', '..'), MODELS = path.join(ROOT, 'tools', 'forge', 'models');
const ORDER = ['idle', 'walk', 'cast', 'dash', 'hit', 'death', 'block', 'channel', 'carry'];
const HERO_CLASSES = ['sword', 'staff', 'bow', 'none'];
const ENEMY_RIGS = ['brambleshaman', 'ogre', 'mountaintroll', 'shadehound'];   // = tools/forge/build.js ENEMY_RIGS
const LOOP = new Set(['idle', 'walk', 'sleep', 'channel', 'carry']);
const DEFAULT_MS = 100;

function gearOf(rig) {
  const pieces = {};
  for (const f of fs.readdirSync(MODELS).filter(f => f.startsWith(rig + '-') && f.endsWith('.js')).sort()) { const g = require(path.join(MODELS, f)); if (g && g.pieces) Object.assign(pieces, g.pieces); }
  return pieces;
}
const groupOf = L => L.group || 'body';
const withLayers = (m, keep) => Object.assign({}, m, { layers: (m.layers || [m]).filter(keep) });
// the sheets of a rig: [{ suffix, anims (logical names in column order) }]
function sheetsOf(model, hero) {
  const names = Object.keys(model.anims), logical = [...new Set(names.map(a => a.split(':')[0]))];
  const core = [...ORDER.filter(a => logical.includes(a) && a !== 'attack'), ...logical.filter(a => !ORDER.includes(a) && a !== 'attack')];
  const out = [{ suffix: '', anims: core }];
  if (hero) for (const c of HERO_CLASSES) { if (model.anims['attack:' + c]) out.push({ suffix: '.atk.' + c, anims: ['attack:' + c] }); }
  else if (model.anims.attack) out.push({ suffix: '.atk.any', anims: ['attack'] });
  return out;
}
function animsJson(model, layout, pieces) {
  const A = {};
  layout.forEach(([a, f], c) => { const n = a.split(':')[0]; if (!A[n]) A[n] = { from: c, count: 0, ms: [], loop: LOOP.has(n) }; A[n].count++; });
  for (const n in A) {
    const real = model.anims[n] ? n : Object.keys(model.anims).find(k => k.startsWith(n + ':') && layout.some(([a]) => a === k)) || n;
    const ms = (model.anims[real] && model.anims[real].ms) || [];
    A[n].ms = Array.from({ length: A[n].count }, (_, f) => ms[f] || DEFAULT_MS);
    if (!ms.length) A[n].ms_source = 'game (the game times this anim; 100 ms per frame shown)';
  }
  return A;
}
const isEmpty = im => { for (let i = 3; i < im.d.length; i += 4) if (im.d[i]) return false; return true; };
const toImg = (w, h, rgba) => { const im = new Img(w, h); im.d.set(rgba); return im; };
// mean baked depth per direction over the idle frames (a unit's zorder among the others; higher = nearer the camera)
function depthPerDir(model, unit) {
  const b = FORGE.bake(model, Object.assign({ anims: ['idle'] }, unit)), m = b.meta, D = model.dirs.length, out = [];
  const cols = m.cells.length / (m.layers.length * D);
  for (let d = 0; d < D; d++) {
    let s = 0, n = 0;
    for (let L = 0; L < m.layers.length; L++) for (let c = 0; c < cols; c++) {
      const cell = m.cells[(L * D + d) * cols + c]; if (!cell) continue;
      const [x, y, w, h] = cell;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const i = (yy * b.w + xx) * 4; if (b.rgba[i + 3]) { s += b.rgba[i + 2]; n++; } }
    }
    out.push(n ? s / n : 128);
  }
  return out;
}

function exportArt(outRoot, opt = {}) {
  const files = [], pal = {}, stats = { sheets: 0, images: 0, units: 0, split: { equal: 0, frames: 0 } };
  const addPal = (rig, im) => { const P = pal[rig] || (pal[rig] = new Set()); for (let i = 0; i < im.d.length; i += 4) if (im.d[i + 3]) P.add((im.d[i] << 16) | (im.d[i + 1] << 8) | im.d[i + 2]); };
  const save = (rel, im, rig) => { const f = path.join(outRoot, rel); im.save(f); files.push(f); stats.images++; if (rig) addPal(rig, im); return path.basename(rel); };
  const side = (rel, j) => { const f = path.join(outRoot, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); files.push(f); };
  const want = id => !opt.only || id.startsWith(opt.only);
  const base = (model, sh, layout, rig) => ({ rig, cell: model.frame, origin: model.origin, dirs: model.dirs.map(d => d[0]), grid: [layout.length, model.dirs.length],
    anims: animsJson(model, layout), aseprite: { type: 'grid', cell: model.frame, about: 'Aseprite: File > Import Sprite Sheet, Type: By Rows... use Grid: width / height = cell, no offset, no padding; or tools/export/aseprite.js to-ase' },
    palette: `palettes/forge_${rig}.gpl` });
  const sockOf = sh => { const o = {}; for (const d in sh.sockets) { o[d] = {}; for (const a in sh.sockets[d]) o[d][a.split(':')[0]] = sh.sockets[d][a].map(fs => { const r = {}; for (const k in fs) { const s = fs[k]; r[k] = { x: +(+s.x).toFixed(1), y: +(+s.y).toFixed(1), front: s.front != null ? !!s.front : undefined }; } return r; }); } return o; };

  // ---- hero (chibi): body, hair, gear
  const rig = 'chibi', model = require(path.join(MODELS, 'chibi.js')), pieces = gearOf(rig);
  const bodyM = withLayers(model, L => groupOf(L) === 'body'), hairM = withLayers(model, L => groupOf(L) === 'hair'), noneM = withLayers(model, () => false);
  const sheets = sheetsOf(model, true), dirs = model.dirs.map(d => d[0]);
  // zorder: rank of the mean depth per direction among hair + every piece
  const units = [{ id: 'hair', unit: { group: 'hair' } }, ...Object.keys(pieces).sort().map(id => ({ id, unit: { piece: pieces[id] } }))];
  const depth = {}; for (const u of units) depth[u.id] = depthPerDir(model, u.unit);
  const zorder = {}; for (const u of units) zorder[u.id] = {};
  dirs.forEach((d, k) => { units.map(u => u.id).sort((a, b) => depth[a][k] - depth[b][k] || (a < b ? -1 : 1)).forEach((id, r) => { zorder[id][d] = r + 1; }); });
  for (const sh of sheets) {
    const B = FORGE.sheet(bodyM, { anims: sh.anims, normals: true }), Bimg = toImg(B.w, B.h, B.rgba), name = 'body' + sh.suffix;
    if (want('body')) {
      const images = { color: save(`hero/${name}.png`, Bimg, rig), normal: save(`hero/${name}_n.png`, toImg(B.w, B.h, B.nrm)) };
      side(`hero/${name}.json`, Object.assign({ unit: 'body', sheet: sh.suffix.slice(1) || 'core', images, layer: 'body', zorder: Object.fromEntries(dirs.map(d => [d, 0])),
        about: 'The base layer of the hero paper doll. Draw order per direction: every <unit>_back by zorder, this body, hair and every <unit>_front by zorder.' }, base(model, sh, B.layout, rig), { sockets: sockOf(B) }));
      stats.sheets++; stats.units++;
    }
    // split units against this body sheet
    const split = (id, dirRel, aloneM, composeM, pieceList, meta, normals) => {
      if (!want(id)) return;
      const C = FORGE.sheet(composeM, { anims: sh.anims, pieces: pieceList }), A = FORGE.sheet(aloneM, { anims: sh.anims, pieces: pieceList, normals });
      const front = new Img(C.w, C.h), back = new Img(C.w, C.h), N = C.w * C.h;
      for (let i = 0; i < N; i++) {
        const o = i * 4, diff = C.rgba[o] !== B.rgba[o] || C.rgba[o + 1] !== B.rgba[o + 1] || C.rgba[o + 2] !== B.rgba[o + 2] || C.rgba[o + 3] !== B.rgba[o + 3];
        if (diff) { if (C.rgba[o + 3]) for (let k = 0; k < 4; k++) front.d[o + k] = C.rgba[o + k]; }
        else if (A.rgba[o + 3]) for (let k = 0; k < 4; k++) back.d[o + k] = A.rgba[o + k];
      }
      // a piece that lifts body pixels to transparent cannot be expressed as an overlay: count it (expected 0)
      let lost = 0; for (let i = 0; i < N; i++) if (B.rgba[i * 4 + 3] && !C.rgba[i * 4 + 3]) lost++;
      if (isEmpty(front) && isEmpty(back)) return;
      const n = `${dirRel}/${id}${sh.suffix}`, images = { front: isEmpty(front) ? null : save(`${n}_front.png`, front, rig), back: isEmpty(back) ? null : save(`${n}_back.png`, back, rig) };
      if (normals) images.normal = save(`${n}_n.png`, toImg(A.w, A.h, A.nrm));
      side(`${n}.json`, Object.assign({ unit: id, sheet: sh.suffix.slice(1) || 'core', images, layer: meta.slot, zorder: zorder[id], hides: meta.hides || [], slot: meta.slot, tier: meta.tier, class: meta.class || null,
        split: { rule: 'front = pixels where body + this unit differs from the body alone; back = this unit\'s own pixels hidden behind the body', body_pixels_lost: lost } }, base(model, sh, C.layout, rig)));
      stats.sheets++; stats.units++;
    };
    split('hair', 'hero', hairM, withLayers(model, L => groupOf(L) === 'body' || groupOf(L) === 'hair'), [], { slot: 'hair' }, true);
    for (const id of Object.keys(pieces).sort()) {
      const p = pieces[id];
      if (sh.suffix.startsWith('.atk.') && p.class && sh.suffix !== '.atk.' + p.class) continue;   // a weapon only in its own class's attack
      split(id, 'gear', noneM, bodyM, [p], { slot: p.slot, tier: p.tier, class: p.class, hides: p.hides }, !!opt.normalsGear);
    }
  }
  // the split's own proof: body + every back (under) + front (over) == the forge's body + piece render, one per line, core sheet
  // (cheap: recomposes the files just written)

  // ---- enemies
  for (const e of ENEMY_RIGS) {
    if (!want(e)) continue;
    const m = require(path.join(MODELS, `${e}.js`));
    for (const sh of sheetsOf(m, false)) {
      const S = FORGE.sheet(m, { anims: sh.anims, normals: true }), n = `enemies/${e}${sh.suffix}`;
      const images = { color: save(`${n}.png`, toImg(S.w, S.h, S.rgba), e), normal: save(`${n}_n.png`, toImg(S.w, S.h, S.nrm)) };
      side(`${n}.json`, Object.assign({ unit: e, sheet: sh.suffix.slice(1) || 'core', images, layer: 'body', zorder: Object.fromEntries(m.dirs.map(d => [d[0], 0])) }, base(m, sh, S.layout, e), { sockets: sockOf(S) }));
      stats.sheets++; stats.units++;
    }
  }
  return { files, pal, stats };
}

module.exports = { exportArt, sheetsOf, ENEMY_RIGS };
if (require.main === module) {
  const a = process.argv.slice(2), oi = a.indexOf('--out'), on = a.indexOf('--only');
  const out = oi >= 0 ? path.resolve(a[oi + 1]) : path.join(ROOT, 'handoff', 'art');
  const t0 = Date.now(), r = exportArt(out, { only: on >= 0 ? a[on + 1] : null, normalsGear: a.includes('--normals-gear') });
  console.log(`art: ${r.stats.sheets} sheets, ${r.stats.images} PNGs in ${((Date.now() - t0) / 1000).toFixed(0)} s | palettes: ${Object.entries(r.pal).map(([k, v]) => `${k} ${v.size}`).join(', ')}`);
}
