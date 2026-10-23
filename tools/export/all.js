#!/usr/bin/env node
'use strict';
// tools/export/all.js -- the one entry point of the art export: builds everything into a staging folder
// (tools/out/export/stage/, git-ignored), then syncs it into handoff/art/ under the EXPORT MANIFEST rule (minutes §4):
//   handoff/art/manifest.json = { files: { "<path under handoff/art>": "<sha256>" } } of what the exporter last wrote.
//   For every staged file: no manifest entry -> write; on-disk sha256 == manifest sha256 -> (re)write; on-disk sha256 differs ->
//   the file was HAND-EDITED: skipped and listed (--force overwrites). A file the exporter no longer makes is deleted only
//   when unedited. Unchanged bytes are never rewritten (stable mtimes, clean git status).
// Parts: tiles (tools/export/tiles.js; zones from handoff/data/zones.json), props (props.js, needs Playwright), art (art.js,
// the forge sheets, ~5 min), palettes (palettes.js). Usage:
//   node tools/export/all.js [--only tiles,props,art,palettes] [--force] [--normals-gear] [--dry]
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..'), ART = path.join(ROOT, 'handoff', 'art'), STAGE = path.join(ROOT, 'tools', 'out', 'export', 'stage');
const MANIFEST = path.join(ART, 'manifest.json');
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const rel = f => path.relative(ART, f).split(path.sep).join('/');
const PART_OF = r => r.startsWith('tiles/') ? 'tiles' : r.startsWith('props/') ? 'props' : r.startsWith('palettes/') ? 'palettes' : 'art';

async function main() {
  const a = process.argv.slice(2), oi = a.indexOf('--only'), FORCE = a.includes('--force'), DRY = a.includes('--dry');
  const parts = new Set(oi >= 0 ? a[oi + 1].split(',') : ['tiles', 'props', 'art', 'palettes']);
  fs.rmSync(STAGE, { recursive: true, force: true }); fs.mkdirSync(STAGE, { recursive: true });
  const t0 = Date.now(), staged = [], log = [];
  const { exportZone, loadZones } = require('./tiles.js'), zones = loadZones();
  if (parts.has('tiles')) for (const z of zones) staged.push(...exportZone(z, path.join(STAGE, 'tiles')));
  if (parts.has('tiles')) log.push(`tiles: ${zones.length} zones`);
  if (parts.has('props')) { const r = await require('./props.js').exportProps(STAGE); staged.push(...r.files); log.push(`props: ${r.props} props, ${r.trees} trees`); }
  let forgePal = null;
  if (parts.has('art')) { const r = await require('./art.js').exportArt(STAGE, { normalsGear: a.includes('--normals-gear') }); staged.push(...r.files); forgePal = r.pal; const s = r.stats; log.push(`art: ${s.units} units, ${s.sheets} sheets, ${s.images} PNGs (depth dq ${s.dqMin}..${s.dqMax}, ${s.clamp} of ${s.covered} covered px at the clamp ends 1 / 255; shade map max ${s.shadeMax})`); }
  if (parts.has('palettes') || forgePal) staged.push(...require('./palettes.js').writePalettes(STAGE, zones, forgePal));
  // ---- sync under the manifest rule
  const man = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { files: {} };
  const next = Object.assign({}, man.files), cnt = { written: 0, unchanged: 0, edited: [], deleted: 0 };
  const seen = new Set();
  for (const s of staged) {
    const r = path.relative(STAGE, s).split(path.sep).join('/'), dest = path.join(ART, r), buf = fs.readFileSync(s), h = sha(buf);
    seen.add(r);
    if (fs.existsSync(dest)) {
      const cur = sha(fs.readFileSync(dest));
      if (cur === h) { cnt.unchanged++; next[r] = h; continue; }
      if (man.files[r] && cur !== man.files[r] && !FORCE) { cnt.edited.push(r); continue; }   // hand-edited: keep it
    }
    if (!DRY) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf); }
    next[r] = h; cnt.written++;
  }
  for (const r of Object.keys(man.files)) {   // files the exporter no longer makes (only in the parts run now)
    if (seen.has(r) || !parts.has(PART_OF(r)) && !(PART_OF(r) === 'palettes' && forgePal)) continue;
    const dest = path.join(ART, r);
    if (fs.existsSync(dest) && sha(fs.readFileSync(dest)) !== man.files[r] && !FORCE) { cnt.edited.push(r + ' (no longer exported)'); continue; }
    if (!DRY && fs.existsSync(dest)) fs.rmSync(dest);
    delete next[r]; cnt.deleted++;
  }
  const sorted = Object.fromEntries(Object.keys(next).sort().map(k => [k, next[k]]));
  const manTxt = JSON.stringify({ about: 'Export manifest (tools/export/all.js): sha256 of every file the exporter wrote. A file whose bytes differ from its entry was hand-edited: a rerun skips it unless --force.', files: sorted }, null, 1) + '\n';
  if (!DRY) fs.writeFileSync(MANIFEST, manTxt);
  let bytes = 0; for (const r of Object.keys(sorted)) { const f = path.join(ART, r); if (fs.existsSync(f)) bytes += fs.statSync(f).size; }
  console.log(log.join(' | '));
  console.log(`sync: ${cnt.written} written, ${cnt.unchanged} unchanged, ${cnt.deleted} deleted, ${cnt.edited.length} hand-edited kept${FORCE ? ' (--force)' : ''} | handoff/art: ${Object.keys(sorted).length} files, ${(bytes / 1048576).toFixed(2)} MB | ${((Date.now() - t0) / 1000).toFixed(0)} s${DRY ? ' (dry run)' : ''}`);
  for (const e of cnt.edited) console.log('  hand-edited, skipped: ' + e);
}
main().catch(e => { console.error(e); process.exit(1); });
