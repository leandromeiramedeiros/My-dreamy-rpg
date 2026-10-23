'use strict';
// tools/export/engine.js -- the game's own pure code (lib/util.js + lib/maps.js, copied from the retired web build, tag js-final) loaded headless in a node vm, so the exporters
// rasterise with the engine's ramps, themes and ground grammar (no DOM: ImageData and makeCanvas are stubbed; a "canvas" is
// just { width, height, img }). Usage: const E = require('./engine.js')(); E.THEMES, E.rasterRect(...), E.topColor(...).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
class ImageData { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } }
function canvasStub() {
  const c = { width: 1, height: 1, img: null };
  c.getContext = () => ({ putImageData: im => { c.img = im; }, getImageData: () => c.img, drawImage() {}, imageSmoothingEnabled: false, globalCompositeOperation: '' });
  return c;
}
function makeEngine() {
  const ctx = { ImageData, console, location: { search: '' }, document: { createElement: canvasStub } };
  vm.createContext(ctx);
  for (const f of ['util.js', 'maps.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, 'lib', f), 'utf8'), ctx, { filename: f });
  // top-level const / class bindings live in the script scope: lift the ones the exporters need onto the context
  const consts = ['THEMES', 'TPRI', 'N8', 'SLAB', 'ZS', 'TILE_TYPES', 'BAYER2'];
  vm.runInContext(`globalThis.__E = { ${consts.map(n => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ')},
    rampQ, rampH, nField, nAt, groundBase, topColor, tileFlags, tileDeco, groundPrep, rasterRect, rasterColumn,
    newMap, typeAt, hAt, isGrassy, hash2, vnoise, fbm, isoX, isoY, toWorld, mixRgb, mulRgb, hexToRgb, ramp, clamp, PixBuf,
    NF_GRASS, NF_MED, NF_CRACK, NF_MOSS };`, ctx);
  return Object.assign({ ctx, ImageData }, ctx.__E);
}
module.exports = makeEngine;
