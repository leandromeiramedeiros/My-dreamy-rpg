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
//   node tools/export/all.js [--only tiles,props,art,palettes] [--force] [--normals-gear] [--dry] [--check]
// props renders the retired web game (page.js: the js-final reference checkout); without it the default run skips props.
// --check writes nothing: it stages the parts and compares every staged file's sha256 with the manifest (the exporter output
// is deterministic, so any difference means a model / tool changed since handoff/art was last exported); exit 1 on a mismatch,
// a staged file the manifest lacks, or a manifest file of the parts run that is no longer staged.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..'), ART = path.join(ROOT, 'handoff', 'art'), STAGE = path.join(ROOT, 'tools', 'out', 'export', 'stage');
const MANIFEST = path.join(ART, 'manifest.json');
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const rel = f => path.relative(ART, f).split(path.sep).join('/');
const PART_OF = r => r.startsWith('tiles/') ? 'tiles' : r.startsWith('props/') ? 'props' : r.startsWith('palettes/') ? 'palettes' : 'art';

async function main() {
  const a = process.argv.slice(2), oi = a.indexOf('--only'), FORCE = a.includes('--force'), DRY = a.includes('--dry');
  const CHECK = a.includes('--check'), ref = require('./page.js').hasReference();
  const parts = new Set(oi >= 0 ? a[oi + 1].split(',') : ['tiles', ...(ref ? ['props'] : []), 'art', 'palettes']);
  fs.rmSync(STAGE, { recursive: true, force: true }); fs.mkdirSync(STAGE, { recursive: true });
  const t0 = Date.now(), staged = [], log = [];
  const { exportZone, loadZones } = require('./tiles.js'), zones = loadZones();
  if (parts.has('tiles')) for (const z of zones) staged.push(...exportZone(z, path.join(STAGE, 'tiles')));
  if (parts.has('tiles')) log.push(`tiles: ${zones.length} zones`);
  if (oi < 0 && !ref) log.push('props: skipped (no js-final reference checkout, see tools/export/page.js)');
  if (parts.has('props')) { const r = await require('./props.js').exportProps(STAGE); staged.push(...r.files); log.push(`props: ${r.props} props, ${r.trees} trees`); }
  let forgePal = null;
  if (parts.has('art')) { const r = require('./art.js').exportArt(STAGE, { normalsGear: a.includes('--normals-gear') }); staged.push(...r.files); forgePal = r.pal; log.push(`art: ${r.stats.sheets} sheets, ${r.stats.images} PNGs`); }
  if (parts.has('palettes') || forgePal) staged.push(...require('./palettes.js').writePalettes(STAGE, zones, forgePal));
  // ---- sync under the manifest rule
  const man = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { files: {} };
  if (CHECK) {
    const bad = [], seenC = new Set();
    for (const s of staged) { const r = path.relative(STAGE, s).split(path.sep).join('/'); seenC.add(r); const h = sha(fs.readFileSync(s)); if (!man.files[r]) bad.push(r + ' (not in the manifest)'); else if (man.files[r] !== h) bad.push(r + ' (differs from the manifest)'); }
    for (const r of Object.keys(man.files)) if (!seenC.has(r) && (parts.has(PART_OF(r)) || PART_OF(r) === 'palettes' && forgePal) && (forgePal || !r.startsWith('palettes/forge_'))) bad.push(r + ' (in the manifest, no longer exported)');
    console.log(log.join(' | '));
    console.log(`export check: ${staged.length} staged files, ${bad.length} not matching handoff/art/manifest.json -> ${bad.length ? 'FAIL' : 'PASS'} | ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    for (const b of bad.slice(0, 15)) console.log('  ' + b);
    if (bad.length > 15) console.log(`  ... and ${bad.length - 15} more`);
    if (bad.length) console.log('  refresh with: node tools/export/all.js (the hand-edit rule applies), then commit handoff/art');
    process.exit(bad.length ? 1 : 0);
  }
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
    if (seen.has(r) || !parts.has(PART_OF(r)) && !(PART_OF(r) === 'palettes' && forgePal) || r.startsWith('palettes/forge_') && !forgePal) continue;   // forge_<rig>.gpl belong to the art part
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
