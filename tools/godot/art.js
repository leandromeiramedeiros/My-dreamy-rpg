#!/usr/bin/env node
'use strict';
// tools/godot/art.js -- copies the handoff art into the Godot project and builds its Godot resources.
//   node tools/godot/art.js [--src=<handoff dir>] [--no-godot]
// 1. Copies handoff/art/** -> godot/art/ (hero, gear, enemies, props, tiles, palettes) and handoff/data/zones.json ->
//    godot/data/zones.json. A file already in godot/art that differs from the handoff copy is kept (hand-edited) unless --force.
// 2. Runs Godot headless: --import (PNGs), the handoff importer (godot/addons/handoff/godot_import.gd, the
//    tools/export/godot_import.gd approach: one SpriteFrames .tres per sheet image from its sidecar, a TileSet per zone),
//    then --import again.
const fs = require('fs'), path = require('path');
const { runGodot, ROOT, PROJECT } = require('./godot');

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const SRC = path.resolve(arg('src', path.join(ROOT, 'handoff')));
const FORCE = process.argv.includes('--force');
if (!fs.existsSync(path.join(SRC, 'art'))) { console.error('no handoff art at ' + SRC + ' (pass --src=<handoff dir>)'); process.exit(1); }

let copied = 0, same = 0, kept = 0, bytes = 0;
function copy(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const a = fs.readFileSync(src);
  if (fs.existsSync(dst)) {
    const b = fs.readFileSync(dst);
    if (a.equals(b)) { same++; return; }
    if (!FORCE) { kept++; return; }
  }
  fs.writeFileSync(dst, a); copied++; bytes += a.length;
}
(function walk(d, rel) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name), r = path.join(rel, e.name);
    if (e.isDirectory()) walk(p, r);
    else if (e.name !== 'manifest.json') copy(p, path.join(PROJECT, 'art', r));
  }
})(path.join(SRC, 'art'), '');
copy(path.join(SRC, 'data', 'zones.json'), path.join(PROJECT, 'data', 'zones.json'));
console.log(`art: ${copied} copied (${(bytes / 1048576).toFixed(2)} MB), ${same} unchanged, ${kept} kept (hand-edited; --force overwrites)`);

if (!process.argv.includes('--no-godot')) {
  const r = [runGodot('art-import1', ['--import']), runGodot('art-sheets', ['--script', 'res://addons/handoff/art_import_cli.gd'])];
  const m = r[1].out.match(/godot_import: (.*)/); if (m) console.log('   ' + m[1]);
  r.push(runGodot('art-import2', ['--import']));
  process.exitCode = r.some(x => !x.ok) ? 1 : 0;
}
