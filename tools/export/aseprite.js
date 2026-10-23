#!/usr/bin/env node
'use strict';
// tools/export/aseprite.js -- Aseprite round trip for the handoff art (Aseprite 1.3+, batch mode; scripts in tools/export/aseprite/).
//   node tools/export/aseprite.js to-ase <sidecar.json | sheet.png> [--out x.aseprite]
//        a sheet + its sidecar -> .aseprite (default tools/out/aseprite/<same path>.aseprite): one frame per cell, tags
//        <anim>_<dir>, frame durations, the pivot as slice "origin", the zone / rig palette. Hero gear and hair: layers
//        <unit>_back, body (reference: locked, never written back), <unit>_front on one canvas, so a human edits them in context.
//        Trees: trunk + canopy layers. Tile / decal atlases: one frame with Aseprite's grid = the cell.
//   node tools/export/aseprite.js from-ase <x.aseprite> [--root dir]
//        writes every non-reference layer back to its PNG (the path in the layer's user data, under --root, default
//        handoff/art), same grid, re-encoded by png8.js (lean indexed PNG); sidecars are not touched. The export manifest then
//        sees the PNG as hand-edited, so node tools/export/all.js keeps it.
//   node tools/export/aseprite.js roundtrip-check [--all]
//        to-ase + from-ase of one sheet per type (or every sidecar with --all) into tools/out/export/ase-check/, asserting the
//        re-exported PNGs are byte-identical to handoff/art's; plus Aseprite's own Import Sprite Sheet with the sidecar's
//        aseprite.cell and a plain CLI --sheet-type rows re-export, pixel-compared. Exit 1 on any mismatch.
// ASEPRITE env var overrides the executable path.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { Img, readPng } = require('./png8.js');
const ROOT = path.join(__dirname, '..', '..'), ART = path.join(ROOT, 'handoff', 'art'), LUA = path.join(__dirname, 'aseprite');
const ASE = process.env.ASEPRITE || 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe';
const run = (args) => execFileSync(ASE, ['-b', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const lua = (script, params) => run([...Object.entries(params).flatMap(([k, v]) => ['--script-param', `${k}=${v}`]), '--script', path.join(LUA, script)]);
const slash = p => p.split(path.sep).join('/');

// the plan sheet2ase.lua builds from: kind, grid, layers (absolute PNG paths, bottom to top)
function planFor(sidecar, root = ART) {
  const j = JSON.parse(fs.readFileSync(sidecar, 'utf8')), dir = path.dirname(sidecar), abs = f => slash(path.join(dir, f));
  const relRoot = slash(path.relative(root, sidecar));
  const zone = (relRoot.match(/^tiles\/([^/]+)\//) || [])[1];
  const palette = j.palette ? slash(path.join(root, j.palette)) : zone ? slash(path.join(root, 'palettes', `${zone}.gpl`)) : null;
  if (j.anims && j.dirs) {
    const layers = [];
    if (j.images.color) layers.push({ name: j.unit, png: abs(j.images.color) });
    else {
      const body = path.join(root, 'hero', `body${j.sheet === 'core' ? '' : '.' + j.sheet}.png`);
      if (j.images.back) layers.push({ name: `${j.unit}_back`, png: abs(j.images.back) });
      layers.push({ name: 'body', png: slash(body), ref: true });
      if (j.images.front) layers.push({ name: `${j.unit}_front`, png: abs(j.images.front) });
    }
    return { kind: 'anim', cell: j.cell, grid: j.grid, origin: j.origin, dirs: j.dirs, anims: j.anims, palette, layers, sidecar: relRoot };
  }
  if (j.layers && j.layers.trunk) return { kind: 'atlas', cell: j.size, grid: [1, 1], origin: j.origin, palette, sidecar: relRoot, layers: [{ name: 'trunk', png: abs(j.layers.trunk) }, { name: 'canopy', png: abs(j.layers.canopy) }] };
  if (j.size) return { kind: 'atlas', cell: j.frames ? j.frames.cell : j.size, grid: [j.frames ? j.frames.count : 1, 1], origin: j.origin, palette, sidecar: relRoot, layers: [{ name: j.id, png: abs(j.image) }] };
  return { kind: 'atlas', cell: j.cell, grid: j.grid, origin: null, palette, sidecar: relRoot, layers: [{ name: path.basename(j.image, '.png'), png: abs(j.image) }] };
}
function toAse(sidecar, out, root = ART) {
  const plan = planFor(sidecar, root); plan.out = slash(out);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const pf = out + '.plan.json'; fs.writeFileSync(pf, JSON.stringify(plan));
  const log = lua('sheet2ase.lua', { plan: pf }); fs.rmSync(pf);
  return { out, plan, log: log.trim() };
}
// from-ase: the layer PNGs re-encoded into `root` (their user-data paths are absolute paths under the root they came from:
// `from` maps them to `root`)
function fromAse(file, root = ART, from = null) {
  const tmp = path.join(ROOT, 'tools', 'out', 'export', 'ase-tmp', path.basename(file, '.aseprite'));
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  lua('ase2sheet.lua', { file: slash(path.resolve(file)), outdir: slash(tmp) });
  const list = JSON.parse(fs.readFileSync(path.join(tmp, 'layers.json'), 'utf8')), written = [];
  for (const L of list) {
    let dest = path.resolve(L.png); if (from) dest = path.join(root, path.relative(from, dest));
    const im = Img.from(readPng(L.tmp));
    const buf = im.png(), changed = !fs.existsSync(dest) || !fs.readFileSync(dest).equals(buf);
    if (changed) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf); }
    written.push({ dest, changed, layer: L.layer });
  }
  return written;
}
const samePixels = (a, b) => { const A = readPng(a), B = readPng(b); if (A.w !== B.w || A.h !== B.h) return false; for (let i = 0; i < A.rgba.length; i += 4) { if (!A.rgba[i + 3] && !B.rgba[i + 3]) continue; for (let k = 0; k < 4; k++) if (A.rgba[i + k] !== B.rgba[i + k]) return false; } return true; };

function roundtripCheck(all) {
  const CHK = path.join(ROOT, 'tools', 'out', 'export', 'ase-check'), copy = path.join(CHK, 'art');
  fs.rmSync(CHK, { recursive: true, force: true }); fs.mkdirSync(copy, { recursive: true });
  const sidecars = [];
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.json') && f !== 'manifest.json') sidecars.push(p); } };
  walk(ART);
  const pickOne = re => sidecars.find(s => re.test(slash(path.relative(ART, s))));
  const sample = all ? sidecars : [/^hero\/body\.json$/, /^hero\/body\.atk\.sword\.json$/, /^hero\/hair\.json$/, /^gear\/cape\.t3\.json$/, /^gear\/sword\.t2\.atk\.sword\.json$/, /^gear\/knighthelm\.t6\.json$/,
    /^enemies\/ogre\.json$/, /^enemies\/shadehound\.atk\.any\.json$/, /^bosses\//, /^tiles\/vale\/terrain_path\.json$/, /^tiles\/ruins\/terrain_water\.json$/, /^tiles\/pinewood\/cliff_pinewood\.json$/,
    /^tiles\/vale\/coast\.json$/, /^props\/lantern\.json$/, /^props\/tree_oak_03\.json$/, /^props\/grass\.json$/, /^props\/decals_vale\.json$/].map(pickOne).filter(Boolean);
  let files = 0, bytesSame = 0, pixSame = 0, bad = [];
  const types = {};
  for (const sc of sample) {
    const r = slash(path.relative(ART, sc)), ase = path.join(CHK, 'ase', r.replace(/\.json$/, '.aseprite'));
    const { plan } = toAse(sc, ase);
    const back = fromAse(ase, copy, ART);
    for (const w of back) {
      const orig = path.join(ART, path.relative(copy, w.dest)); files++;
      const bs = fs.readFileSync(orig).equals(fs.readFileSync(w.dest)), ps = bs || samePixels(orig, w.dest);
      if (bs) bytesSame++; if (ps) pixSame++; else bad.push(slash(path.relative(ART, orig)));
    }
    types[r.split('/')[0]] = (types[r.split('/')[0]] || 0) + 1;
    process.stdout.write(`  ${r}: ${plan.kind}, ${plan.layers.length} layer(s) -> ${back.length} PNG(s) back\n`);
  }
  console.log(`${bad.length ? 'FAIL' : 'PASS'}  roundtrip  ${sample.length} sheets (${Object.entries(types).map(([k, v]) => `${k} ${v}`).join(', ')}): ${files} PNGs re-exported, ${bytesSame} byte-identical, ${pixSame} pixel-identical`);
  for (const b of bad) console.log('        differs: ' + b);
  // Aseprite's own Import Sprite Sheet (the sidecar's aseprite settings) + a plain CLI rows export
  let imp = 0, impOk = 0; const impBad = [];
  for (const sc of sample) {
    const j = JSON.parse(fs.readFileSync(sc, 'utf8')); if (!j.aseprite) continue;
    const img = j.images && (j.images.color || j.images.front); if (!img) continue;
    const png = path.join(path.dirname(sc), img), tag = path.basename(sc, '.json'), ase = path.join(CHK, 'import', tag + '.aseprite'), out = path.join(CHK, 'import', tag + '.png');
    fs.mkdirSync(path.dirname(ase), { recursive: true });
    lua('import_check.lua', { png: slash(png), w: j.aseprite.cell[0], h: j.aseprite.cell[1], out: slash(ase) });
    run([slash(ase), '--sheet', slash(out), '--sheet-type', 'rows', '--sheet-columns', String(j.grid[0])]);
    imp++; if (samePixels(png, out)) impOk++; else impBad.push(slash(path.relative(ART, png)));
  }
  console.log(`${impBad.length ? 'FAIL' : 'PASS'}  import     ${impOk}/${imp} sheets: Aseprite Import Sprite Sheet (By Rows, cell = sidecar aseprite.cell) + CLI --sheet-type rows --sheet-columns <cols> gives the same pixels`);
  for (const b of impBad) console.log('        differs: ' + b);
  return !bad.length && !impBad.length;
}

if (require.main === module) {
  const [cmd, arg, ...rest] = process.argv.slice(2), opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
  if (!fs.existsSync(ASE)) { console.error('Aseprite not found: ' + ASE + ' (set ASEPRITE)'); process.exit(2); }
  if (cmd === 'to-ase') {
    let sc = path.resolve(arg); if (sc.endsWith('.png')) sc = sc.replace(/(_front|_back|_n)?\.png$/, '.json');
    const out = opt('--out') ? path.resolve(opt('--out')) : path.join(ROOT, 'tools', 'out', 'aseprite', path.relative(ART, sc).replace(/\.json$/, '.aseprite'));
    console.log(toAse(sc, out).log);
  } else if (cmd === 'from-ase') {
    for (const w of fromAse(path.resolve(arg), opt('--root') ? path.resolve(opt('--root')) : ART)) console.log(`${w.changed ? 'written  ' : 'unchanged'} ${slash(path.relative(ROOT, w.dest))} (layer ${w.layer})`);
  } else if (cmd === 'roundtrip-check') process.exitCode = roundtripCheck(process.argv.includes('--all')) ? 0 : 1;
  else { console.log('usage: node tools/export/aseprite.js to-ase <sidecar.json|sheet.png> [--out f] | from-ase <f.aseprite> [--root dir] | roundtrip-check [--all]'); process.exit(2); }
}
module.exports = { toAse, fromAse, planFor };
