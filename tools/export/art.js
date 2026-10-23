#!/usr/bin/env node
'use strict';
// tools/export/art.js -- forge sprite sheets for Godot / Aseprite (handoff/art/{hero,gear,enemies,bosses}/), rendered by
// tools/forge/forge.js directly (never through build.js, which owns js/forge-bank). Flat colour, one PNG per unit and sheet:
//   rows = the 8 directions in forge order S, SE, E, NE, N, NW, W, SW; columns = frames, anim after anim in the fixed order
//   idle, walk, cast, dash, hit, death, block, channel, carry (then the rig's extra anims: heal, sleep); every cell = the model's
//   frame; the pivot `origin` = the feet pixel, the same in every cell (Godot: offset = -origin).
// Sheets per unit: <unit>.png = Core (every anim but attacks); <unit>.atk.<class>.png = one weapon class's attack (hero: every
// attack:<class> the rig has; a weapon only in its own class; enemies: any).
// Hero layers (client ruling 2026-10-23: every piece is layered per pixel at runtime, no front / back split):
//   hero/body, hero/hair, hero/bangs, hero/hairside   the base units (the rig's body layer, its three hair layers by tag)
//   gear/<piece>.t<N>                                  every gear piece x tier
//   each = <unit>.png      the COLOUR sheet: the unit rendered ALONE by the forge (its own outline, cleanup and shading)
//          <unit>_z.png    the DEPTH sheet, same grid and origin: grey = the forge G-buffer depth dq of the pixel (1/6 px per
//                          step, 128 = the rig root, higher = nearer the camera); alpha 0 = no depth painted -> the sidecar's
//                          depth.default[dir]. Outline pixels: 0 (behind everything), or for a piece that draws its own
//                          outline (weapon, offhand) its nearest covered neighbour's depth - 1, so the line lands on the
//                          body exactly where stage B's own-outline pass puts it. Smear pixels: 255 in front, else 0.
//          <unit>_n.png    opt-in normal sheet (forge { normals: true }): body and hair always, gear with --normals-gear
//   The runtime (forge-rt in the JS build; HeroDoll in Godot) stacks the equipped units per pixel: the nearest depth wins, a
//   later unit wins a tie (order: body, hair, bangs, hairside, then the slots chest, boots, head, back, offhand, weapon).
//   enemies/<rig>[.atk.any].png  one layer. bosses/: no boss rig exists yet (nothing written).
// Sidecar <sheet>.json: { unit, sheet, images { color, depth, normal? }, slot, tier, class, hides, tag, group, own, depth { scale,
// offset, default { dir: dq }, ... }, shade { '#rgb': '#rgb' }, cell, origin, dirs, grid, anims, sockets, palette, aseprite }.
// The body's core sidecar also carries `doll`: the rig-wide layering rules (outline colour, seam jump, slot order, layer cap).
// Usage: node tools/export/art.js [--out dir] [--only <unit-prefix>] [--normals-gear] [--jobs n]
const fs = require('fs'), path = require('path'), os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const FORGE = require('../forge/forge.js'), { Img } = require('./png8.js');
const ROOT = path.join(__dirname, '..', '..'), MODELS = path.join(ROOT, 'tools', 'forge', 'models');
const ORDER = ['idle', 'walk', 'cast', 'dash', 'hit', 'death', 'block', 'channel', 'carry'];
const ENEMY_RIGS = ['brambleshaman', 'ogre', 'mountaintroll', 'shadehound'];   // = tools/forge/build.js ENEMY_RIGS
const LOOP = new Set(['idle', 'walk', 'sleep', 'channel', 'carry']);
const DEFAULT_MS = 100;
// the doll's stacking order after the base units (a tie goes to the later unit, as in forge-rt; js/render.js FH_SLOTS + back)
const SLOT_ORDER = ['chest', 'boots', 'head', 'back', 'offhand', 'weapon'];
const DQ_STEP = 1 / 6, DQ_ROOT = 128;

function gearOf(rig) {
  const pieces = {};
  for (const f of fs.readdirSync(MODELS).filter(f => f.startsWith(rig + '-') && f.endsWith('.js')).sort()) { const g = require(path.join(MODELS, f)); if (g && g.pieces) Object.assign(pieces, g.pieces); }
  return pieces;
}
const groupOf = L => L.group || 'body';
const withLayers = (m, keep) => Object.assign({}, m, { layers: (m.layers || [m]).filter(keep) });
const heroClasses = model => Object.keys(model.anims).filter(a => a.startsWith('attack:')).map(a => a.split(':')[1]);
// the sheets of a rig: [{ suffix, anims (logical names in column order) }]
function sheetsOf(model, hero) {
  const names = Object.keys(model.anims), logical = [...new Set(names.map(a => a.split(':')[0]))];
  const core = [...ORDER.filter(a => logical.includes(a) && a !== 'attack'), ...logical.filter(a => !ORDER.includes(a) && a !== 'attack')];
  const out = [{ suffix: '', anims: core }];
  if (hero) for (const c of heroClasses(model)) out.push({ suffix: '.atk.' + c, anims: ['attack:' + c] });
  else if (model.anims.attack) out.push({ suffix: '.atk.any', anims: ['attack'] });
  return out;
}
function animsJson(model, layout) {
  const A = {};
  layout.forEach(([a], c) => { const n = a.split(':')[0]; if (!A[n]) A[n] = { from: c, count: 0, ms: [], loop: LOOP.has(n) }; A[n].count++; });
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
const hex = k => '#' + k.toString(16).padStart(6, '0');

// the depth sheet of one rendered unit sheet S (forge sheet with { depth: true }); own = the unit draws its own outline.
// Returns { img (grey + alpha), def (per row: median dq of the covered pixels), clamp (covered pixels at dq 1 or 255), n }
function depthSheet(S, own) {
  const { w: SW, h: SH } = S, [cw, ch] = S.frame, D = S.depth, im = new Img(SW, SH), rows = SH / ch;
  const def = [], hist = Array.from({ length: rows }, () => new Uint32Array(256));
  let clamp = 0, n = 0;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const i = y * SW + x; if (!S.rgba[i * 4 + 3]) continue;
    const k = D.kind[i], r = (y / ch) | 0, c = (x / cw) | 0;
    let v;
    if (k === 1) { v = Math.max(1, D.z[i]); hist[r][v]++; n++; if (D.z[i] <= 1 || D.z[i] >= 255) clamp++; }
    else if (k === 3) v = D.smearOver[r][c] ? 255 : 0;
    else if (!own) v = 0;
    else {   // own outline: the nearest covered 4-neighbour in the same cell, minus one
      const lx = x % cw, ly = y % ch; let m = 0;
      if (lx + 1 < cw && D.kind[i + 1] === 1) m = Math.max(m, D.z[i + 1]);
      if (lx > 0 && D.kind[i - 1] === 1) m = Math.max(m, D.z[i - 1]);
      if (ly + 1 < ch && D.kind[i + SW] === 1) m = Math.max(m, D.z[i + SW]);
      if (ly > 0 && D.kind[i - SW] === 1) m = Math.max(m, D.z[i - SW]);
      v = Math.max(1, m - 1);
    }
    const o = i * 4; im.d[o] = im.d[o + 1] = im.d[o + 2] = v; im.d[o + 3] = 255;
  }
  for (let r = 0; r < rows; r++) {
    const H = hist[r]; let tot = 0; for (let v = 0; v < 256; v++) tot += H[v];
    let acc = 0, med = DQ_ROOT; if (tot) for (let v = 0; v < 256; v++) { acc += H[v]; if (acc * 2 >= tot) { med = v; break; } }
    def.push(med);
  }
  return { img: im, def, clamp, n };
}

// ---- jobs: one per hero unit (all its sheets) or enemy rig; run in worker threads
function heroUnits(model) {
  const pieces = gearOf('chibi'), out = [];
  out.push({ kind: 'base', id: 'body', dirRel: 'hero', tag: null, group: 'body' });
  for (const L of model.layers) if (groupOf(L) === 'hair') out.push({ kind: 'base', id: (L.tag || L.id).toLowerCase(), layerId: L.id, dirRel: 'hero', tag: L.tag || null, group: 'hair' });
  for (const id of Object.keys(pieces).sort()) out.push({ kind: 'piece', id, dirRel: 'gear' });
  return out;
}
function runJob(job, opt) {
  const files = [], pal = new Set(), st = { sheets: 0, images: 0, clamp: 0, covered: 0, shadeMax: 0, dqMin: 255, dqMax: 0 };
  const save = (rel, im, keep) => { const f = path.join(opt.out, rel); im.save(f); files.push(f); st.images++; if (keep) for (let i = 0; i < im.d.length; i += 4) if (im.d[i + 3]) pal.add((im.d[i] << 16) | (im.d[i + 1] << 8) | im.d[i + 2]); return path.basename(rel); };
  const side = (rel, j) => { const f = path.join(opt.out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); files.push(f); };
  const base = (model, layout, rig) => ({ rig, cell: model.frame, origin: model.origin, dirs: model.dirs.map(d => d[0]), grid: [layout.length, model.dirs.length],
    anims: animsJson(model, layout), aseprite: { type: 'grid', cell: model.frame, about: 'Aseprite: File > Import Sprite Sheet, Type: By Rows... use Grid: width / height = cell, no offset, no padding; or tools/export/aseprite.js to-ase' },
    palette: `palettes/forge_${rig}.gpl` });
  const sockOf = (sh, only) => { const o = {}; for (const d in sh.sockets) { o[d] = {}; for (const a in sh.sockets[d]) o[d][a.split(':')[0]] = sh.sockets[d][a].map(fs => { const r = {}; for (const k in fs) { if (only && !only.includes(k)) continue; const s = fs[k]; r[k] = { x: +(+s.x).toFixed(1), y: +(+s.y).toFixed(1), front: s.front != null ? !!s.front : undefined }; } return r; }); } return o; };

  if (job.kind === 'enemy') {
    const e = job.id, m = require(path.join(MODELS, `${e}.js`));
    for (const sh of sheetsOf(m, false)) {
      const S = FORGE.sheet(m, { anims: sh.anims, normals: true }), n = `enemies/${e}${sh.suffix}`;
      const images = { color: save(`${n}.png`, toImg(S.w, S.h, S.rgba), true), normal: save(`${n}_n.png`, toImg(S.w, S.h, S.nrm)) };
      side(`${n}.json`, Object.assign({ unit: e, sheet: sh.suffix.slice(1) || 'core', images, layer: 'body' }, base(m, S.layout, e), { sockets: sockOf(S) }));
      st.sheets++;
    }
    return { files, pal: [...pal], rig: e, st };
  }
  const rig = 'chibi', model = require(path.join(MODELS, 'chibi.js')), pieces = gearOf(rig);
  const p = job.kind === 'piece' ? pieces[job.id] : null;
  const unitM = job.kind === 'piece' ? withLayers(model, () => false) : job.id === 'body' ? withLayers(model, L => groupOf(L) === 'body') : withLayers(model, L => L.id === job.layerId);
  const own = !!(p && (p.ownOutline != null ? p.ownOutline : model.ownOutline && model.ownOutline[p.slot]));
  const normals = job.kind === 'base' || !!opt.normalsGear, dirs = model.dirs.map(d => d[0]);
  for (const sh of sheetsOf(model, true)) {
    if (p && sh.suffix.startsWith('.atk.') && p.class && sh.suffix !== '.atk.' + p.class) continue;   // a weapon only in its own class's attack
    const S = FORGE.sheet(unitM, { anims: sh.anims, pieces: p ? [p] : [], normals, depth: true });
    const color = toImg(S.w, S.h, S.rgba); if (isEmpty(color)) continue;
    const Z = depthSheet(S, own), n = `${job.dirRel}/${job.id}${sh.suffix}`;
    st.clamp += Z.clamp; st.covered += Z.n;
    for (let i = 0; i < S.w * S.h; i++) if (S.depth.kind[i] === 1) { const v = S.depth.z[i]; if (v < st.dqMin) st.dqMin = v; if (v > st.dqMax) st.dqMax = v; }
    const images = { color: save(`${n}.png`, color, true), depth: save(`${n}_z.png`, Z.img, false) };
    if (normals) images.normal = save(`${n}_n.png`, toImg(S.w, S.h, S.nrm));
    // the seam colour of every shaded colour: its material's shadow tone (flat materials have none: never seamed)
    const shade = {}; for (const [k, v] of [...S.depth.shade].sort((a, b) => a[0] - b[0])) shade[hex(k)] = hex(v);
    st.shadeMax = Math.max(st.shadeMax, Object.keys(shade).length);
    const j = { unit: job.id, sheet: sh.suffix.slice(1) || 'core', images,
      slot: p ? p.slot : job.id === 'body' ? 'body' : 'hair', tier: p ? p.tier || null : null, class: p ? p.class || null : null,
      hides: p ? p.hides || [] : [], tag: job.tag || null, group: p ? (p.layers[0].group || p.id) : job.group, own,
      depth: { image: images.depth, scale: DQ_STEP, unit: 'px', offset: DQ_ROOT, default: Object.fromEntries(dirs.map((d, r) => [d, Z.def[r]])),
        about: 'grey v = depth (v - offset) * scale px towards the camera from the rig root (higher = nearer); alpha 0 = unpainted: use default[dir] (the median depth of this sheet\'s covered pixels in that direction); 0 = behind every other layer (outline, rear smear); 255 = in front (front smear)' },
      shade };
    Object.assign(j, base(model, S.layout, rig));
    if (job.id === 'body') j.sockets = sockOf(S);
    else if (p && p.sockets) j.sockets = sockOf(S, Object.keys(p.sockets));
    if (job.id === 'body' && !sh.suffix) j.doll = { outline: model.outline, seam_jump: Math.round((model.innerLine != null ? model.innerLine : 2.5) * 6),
      base: ['body', ...model.layers.filter(L => groupOf(L) === 'hair').map(L => (L.tag || L.id).toLowerCase())], slots: SLOT_ORDER, layers_max: 1 + model.layers.filter(L => groupOf(L) === 'hair').length + SLOT_ORDER.length,
      classes: heroClasses(model),
      about: 'Layering at runtime: per pixel the nearest depth wins (a later unit wins a tie; order = base then slots). Seam: a covered pixel whose 4-neighbour of another group is nearer by more than seam_jump dq takes its shade colour. Then one cluster pass: a drawn non-outline pixel with no 4-neighbour of its own colour takes the commonest neighbouring colour (a tie takes the smaller RGB value). A piece hides every base unit whose tag is in its hides.' };
    side(`${n}.json`, j);
    st.sheets++;
  }
  return { files, pal: [...pal], rig, st };
}

if (!isMainThread && workerData && workerData.artWorker) {
  parentPort.on('message', m => { if (m === null) return process.exit(0); try { parentPort.postMessage({ k: m.k, r: runJob(m.job, workerData.opt) }); } catch (e) { parentPort.postMessage({ k: m.k, err: String(e && e.stack || e) }); } });
}

async function exportArt(outRoot, opt = {}) {
  const model = require(path.join(MODELS, 'chibi.js'));
  const want = id => !opt.only || id.startsWith(opt.only);
  const jobs = [...heroUnits(model).filter(u => want(u.id)), ...ENEMY_RIGS.filter(want).map(id => ({ kind: 'enemy', id }))];
  // the biggest jobs first (armour renders every attack class)
  const o = { out: outRoot, normalsGear: !!opt.normalsGear }, n = Math.max(1, Math.min(opt.jobs || os.cpus().length - 1, jobs.length));
  const results = new Array(jobs.length);
  if (n === 1) jobs.forEach((j, k) => { results[k] = runJob(j, o); });
  else await new Promise((res, rej) => {
    let next = 0, done = 0; const ws = [];
    const feed = w => { if (next < jobs.length) { const k = next++; w.postMessage({ k, job: jobs[k] }); } else w.postMessage(null); };
    for (let i = 0; i < n; i++) {
      const w = new Worker(__filename, { workerData: { artWorker: true, opt: o } }); ws.push(w);
      w.on('message', m => { if (m.err) { ws.forEach(x => x.terminate()); return rej(new Error(`art: ${jobs[m.k].id}: ${m.err}`)); } results[m.k] = m.r; done++; if (done === jobs.length) res(); feed(w); });
      w.on('error', rej);
      feed(w);
    }
  });
  const files = [], pal = {}, stats = { sheets: 0, images: 0, units: jobs.length, clamp: 0, covered: 0, shadeMax: 0, dqMin: 255, dqMax: 0 };
  for (const r of results) {
    files.push(...r.files); const P = pal[r.rig] || (pal[r.rig] = new Set()); r.pal.forEach(c => P.add(c));
    for (const k of ['sheets', 'images', 'clamp', 'covered']) stats[k] += r.st[k];
    stats.shadeMax = Math.max(stats.shadeMax, r.st.shadeMax); stats.dqMin = Math.min(stats.dqMin, r.st.dqMin); stats.dqMax = Math.max(stats.dqMax, r.st.dqMax);
  }
  return { files, pal, stats };
}

module.exports = { exportArt, sheetsOf, depthSheet, heroUnits, ENEMY_RIGS, SLOT_ORDER };
if (require.main === module) {
  const a = process.argv.slice(2), arg = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const out = arg('--out') ? path.resolve(arg('--out')) : path.join(ROOT, 'handoff', 'art');
  const t0 = Date.now();
  exportArt(out, { only: arg('--only'), normalsGear: a.includes('--normals-gear'), jobs: arg('--jobs') ? +arg('--jobs') : 0 }).then(r => {
    const s = r.stats;
    console.log(`art: ${s.units} units, ${s.sheets} sheets, ${s.images} PNGs in ${((Date.now() - t0) / 1000).toFixed(0)} s | depth: dq ${s.dqMin}..${s.dqMax}, ${s.clamp} of ${s.covered} covered px at the clamp ends (1 / 255) | shade map max ${s.shadeMax} | palettes: ${Object.entries(r.pal).map(([k, v]) => `${k} ${v.size}`).join(', ')}`);
  }).catch(e => { console.error(e); process.exit(1); });
}
