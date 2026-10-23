#!/usr/bin/env node
'use strict';
// tools/godot/check.js -- the headless gate of the Godot project.
//   node tools/godot/check.js [--no-shot]
// 1. godot --headless --path godot --import (every script compiles, every resource imports)
// 2. godot --headless res://tests/smoke.tscn: loads every .tres, loads and instances every arena, runs the dummies arena
//    120 frames (the hero walks, the dummies stand), lands an M1 on a dummy (damage + number pop)
// 3. a windowed run of the same test that saves tools/out/godot/dummies.png (checked: not one flat colour)
// Godot exits 0 on script errors, so tools/godot/godot.js fails a step on any ERROR line in its log.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const { runGodot, ROOT } = require('./godot');

const SHOT = path.join(ROOT, 'tools/out/godot/dummies.png');
let ok = true;
const step = r => { ok = ok && r.ok; return r; };

step(runGodot('import', ['--import']));
const smoke = step(runGodot('smoke', ['res://tests/smoke.tscn']));
const line = smoke.out.split(/\r?\n/).find(l => l.startsWith('smoke: '));
let rep = {};
try { rep = JSON.parse(line.slice(7)); } catch (e) { ok = false; console.log('   no smoke report'); }
if (rep.tres != null) {
  console.log(`   .tres ${rep.tres}: ` + Object.entries(rep.tres_per_class || {}).sort().map(([k, v]) => k + ' ' + v).join(', '));
  console.log(`   arenas ${(rep.arenas || []).length}: ${(rep.arenas || []).join(', ')}`);
  console.log(`   dummies ${rep.dummies}, hero walked ${rep.hero_walked} tiles, dodge ${rep.dodge_tiles} tiles, M1 (${rep.hand}, first block ${rep.first_block_damage}) -> ${rep.hit_damage} damage, ${rep.pops} pop(s)`);
}
for (const f of rep.fails || []) console.log('   FAIL ' + f);
if ((rep.fails || []).length) ok = false;

if (!process.argv.includes('--no-shot')) {
  try { fs.unlinkSync(SHOT); } catch (e) { /* none yet */ }
  const shot = step(runGodot('shot', ['res://tests/smoke.tscn', '--', '--shot=' + SHOT.replace(/\\/g, '/')], { headless: false }));
  const py = spawnSync('python', ['-c', 'import sys\nfrom PIL import Image, ImageStat\nim = Image.open(sys.argv[1]).convert("RGB")\ns = ImageStat.Stat(im)\nprint(im.size[0], im.size[1], len(im.getcolors(1 << 20) or []), round(sum(s.stddev) / 3, 1))', SHOT], { encoding: 'utf8' });
  const [w, h, colors, sd] = (py.stdout || '').trim().split(/\s+/).map(Number);
  const good = fs.existsSync(SHOT) && colors > 16 && sd > 4;
  ok = ok && good && shot.ok;
  console.log(`${good ? 'PASS' : 'FAIL'}  screenshot ${path.relative(ROOT, SHOT).replace(/\\/g, '/')}: ${w}x${h}, ${colors} colours, stddev ${sd}` + (py.stderr ? '  ' + py.stderr.trim().slice(0, 200) : ''));
}
console.log(ok ? 'godot check: PASS' : 'godot check: FAIL');
process.exitCode = ok ? 0 : 1;
