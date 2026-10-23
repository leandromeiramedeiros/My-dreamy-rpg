'use strict';
// tools/export/doll.js -- the hero doll's runtime layering, in JS: the specification the Godot shader
// (tools/export/hero_doll.gdshader) implements line for line, used by tools/export/doll-check.js to prove it.
// Input: the handoff layer sheets (colour <unit>.png + depth <unit>_z.png + sidecar), stacked in doll order.
// Per pixel p of one frame cell:
//   1. resolve: every layer's colour pixel (alpha > 0) with its depth (the _z grey, or the sidecar depth.default[dir] where the
//      _z alpha is 0); the nearest depth wins, a later layer wins a tie.
//   2. seam (stage B passSeams, across layers): a winning pixel that is not an outline-colour pixel, whose colour has a shade
//      entry in its layer's sidecar, and that has a 4-neighbour won by a layer of ANOTHER group (not an outline-colour pixel)
//      nearer by more than doll.seam_jump, takes its shade colour.
//   3. one cluster pass (stage B passClusters, once): a drawn pixel that is not outline-coloured, with no 4-neighbour (drawn,
//      not outline-coloured) of its own colour, takes the commonest of those neighbours' colours (a tie: the smaller RGB value).
// What stage B does and this does not (the residue doll-check.js measures): lone-material and orphan-tone passes, more cluster
// passes and spur removal over the STACKED G-buffers (here each layer was cleaned up alone by the forge).
const fs = require('fs'), path = require('path');
const { readPng } = require('./png8.js');

const rgbOf = h => parseInt(h.slice(1), 16);
// a doll layer from a handoff sidecar path: { colour, depth (images), j (sidecar), shade Map, group }
function loadLayer(sidecar) {
  const j = JSON.parse(fs.readFileSync(sidecar, 'utf8')), d = path.dirname(sidecar);
  const col = readPng(path.join(d, j.images.color)), dep = j.images.depth ? readPng(path.join(d, j.images.depth)) : null;
  const shade = new Map(Object.entries(j.shade || {}).map(([k, v]) => [rgbOf(k), rgbOf(v)]));
  return { j, col, dep, shade, group: j.group || j.unit, sw: col.w };
}
// composite one frame: layers (doll order), cell column c and direction row r; doll = the body's `doll` block.
// Returns { w, h, rgba, win (winning layer per pixel, -1 none), seam (count), clu (count) }
function composite(layers, c, r, doll) {
  const L0 = layers[0].j, [w, h] = L0.cell, N = w * h, dir = L0.dirs[r], JQ = doll.seam_jump, OUT = rgbOf(doll.outline);
  const win = new Int16Array(N).fill(-1), wd = new Int16Array(N).fill(-1), C0 = new Int32Array(N).fill(-1);
  layers.forEach((L, l) => {
    const def = L.j.depth ? L.j.depth.default[dir] : 128;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = ((r * h + y) * L.sw + c * w + x) * 4; if (!L.col.rgba[o + 3]) continue;
      const d = L.dep && L.dep.rgba[o + 3] ? L.dep.rgba[o] : def, i = y * w + x;
      if (d >= wd[i]) { wd[i] = d; win[i] = l; C0[i] = (L.col.rgba[o] << 16) | (L.col.rgba[o + 1] << 8) | L.col.rgba[o + 2]; }
    }
  });
  const nb = (i, f) => { const x = i % w; if (x + 1 < w) f(i + 1); if (x > 0) f(i - 1); if (i + w < N) f(i + w); if (i >= w) f(i - w); };
  const C1 = C0.slice(); let seam = 0, clu = 0;
  for (let i = 0; i < N; i++) {
    if (win[i] < 0 || C0[i] === OUT) continue;
    const s = layers[win[i]].shade.get(C0[i]); if (s == null) continue;
    let hit = false;
    nb(i, j => { if (win[j] >= 0 && C0[j] !== OUT && layers[win[j]].group !== layers[win[i]].group && wd[j] > wd[i] + JQ) hit = true; });
    if (hit) { C1[i] = s; seam++; }
  }
  const C2 = C1.slice();
  for (let i = 0; i < N; i++) {
    if (C1[i] < 0 || C1[i] === OUT) continue;
    const v = []; let same = false;
    nb(i, j => { if (C1[j] >= 0 && C1[j] !== OUT) { if (C1[j] === C1[i]) same = true; v.push(C1[j]); } });
    if (same || !v.length) continue;
    let bv = 0, bc = 0; for (const a of v) { let n = 0; for (const b of v) if (b === a) n++; if (n > bc || (n === bc && a < bv)) { bc = n; bv = a; } }
    C2[i] = bv; clu++;
  }
  const rgba = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) if (C2[i] >= 0) { rgba[i * 4] = C2[i] >> 16; rgba[i * 4 + 1] = (C2[i] >> 8) & 255; rgba[i * 4 + 2] = C2[i] & 255; rgba[i * 4 + 3] = 255; }
  return { w, h, rgba, win, seam, clu };
}
// the doll's layers for a loadout: base units (minus hidden tags) then the pieces in slot order; sheet = '' | '.atk.<class>'
function dollLayers(art, pieces, sheet) {
  const body = JSON.parse(fs.readFileSync(path.join(art, 'hero', 'body.json'), 'utf8')), doll = body.doll;
  const pj = pieces.map(id => ({ id, j: JSON.parse(fs.readFileSync(path.join(art, 'gear', id + '.json'), 'utf8')) }));
  const hidden = new Set(); pj.forEach(p => p.j.hides.forEach(t => hidden.add(t)));
  const out = [];
  for (const b of doll.base) {
    const sc = path.join(art, 'hero', b + sheet + '.json'); if (!fs.existsSync(sc)) continue;
    const L = loadLayer(sc); if (L.j.tag && hidden.has(L.j.tag)) continue; out.push(L);
  }
  pj.sort((a, b) => doll.slots.indexOf(a.j.slot) - doll.slots.indexOf(b.j.slot));
  for (const p of pj) { const sc = path.join(art, 'gear', p.id + sheet + '.json'); if (fs.existsSync(sc)) out.push(loadLayer(sc)); }
  return { layers: out, doll };
}
module.exports = { loadLayer, composite, dollLayers, rgbOf };
