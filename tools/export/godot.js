// tools/export/godot.js -- fill godot-sample/ from handoff/ and verify it headless in Godot 4.7.
//   node tools/export/godot.js [--godot <exe>] [--copy-only] [--no-web]
// Copies: data/zones.json (first zone only), art/tiles/<zone>/, the hero core sheets (body, hair), six gear pieces (core),
// enemies/ogre (core + normals), props/tree_round_00, the importer into addons/handoff/. Then runs, one at a time:
//   1. --headless --import                                   (imports the PNGs)
//   2. --headless --script res://addons/handoff/godot_import.gd  (SpriteFrames .tres, the zone TileSet, scenes/main.tscn)
//   3. --headless --import  (picks up the new resources), then --headless --quit-after 120  (loads and runs the main scene)
//   4. --headless --export-release "Web" tools/out/export/web/index.html
// and counts ERROR / WARNING lines per step (SCRIPT ERROR lines count as errors).
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), H = path.join(ROOT, 'handoff'), S = path.join(ROOT, 'godot-sample');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const GODOT = arg('--godot', process.env.GODOT || 'C:\\Users\\leandro\\AppData\\Local\\Programs\\Godot\\Godot_v4.7.2-stable_win64_console.exe');
const GEAR = ['cape.t3', 'warden.t3', 'knightgreaves.t3', 'knighthelm.t3', 'sword.t3', 'shield.t3'];

function copy(src, dst) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
// a unit = its sidecar + every image it names
function unit(rel) {
  const j = JSON.parse(fs.readFileSync(path.join(H, 'art', rel + '.json'), 'utf8'));
  copy(path.join(H, 'art', rel + '.json'), path.join(S, 'art', rel + '.json'));
  const imgs = Object.values(j.images || {}).concat(Object.values(j.layers || {})).concat(j.image ? [j.image] : []);
  for (const f of imgs) if (f) copy(path.join(H, 'art', path.dirname(rel), f), path.join(S, 'art', path.dirname(rel), f));
}
function fill() {
  for (const d of ['art', 'data']) fs.rmSync(path.join(S, d), { recursive: true, force: true });
  const zones = JSON.parse(fs.readFileSync(path.join(H, 'data/zones.json'), 'utf8'));
  const z = zones.zones[0];
  fs.mkdirSync(path.join(S, 'data'), { recursive: true });
  fs.writeFileSync(path.join(S, 'data/zones.json'), JSON.stringify(Object.assign({}, zones, { zones: [z] }), null, 1) + '\n');
  const td = path.join(H, 'art/tiles', z.id);
  for (const f of fs.readdirSync(td)) copy(path.join(td, f), path.join(S, 'art/tiles', z.id, f));
  ['hero/body', 'hero/hair', ...GEAR.map(g => 'gear/' + g), 'enemies/ogre', 'props/tree_round_00'].forEach(unit);
  for (const f of ['godot_import.gd', 'godot_import_editor.gd']) copy(path.join(__dirname, f), path.join(S, 'addons/handoff', f));
  fs.mkdirSync(path.join(S, 'scenes'), { recursive: true });
  // the importer rebuilds scenes/main.tscn; until then a stand-in (the old scene would point at the .tres just wiped)
  const main = path.join(S, 'scenes/main.tscn');
  fs.writeFileSync(main, '[gd_scene format=3]\n\n[node name="Main" type="Node2D"]\n');
  let n = 0, b = 0;
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { n++; b += fs.statSync(p).size; } } })(path.join(S, 'art'));
  console.log(`copied: zone ${z.id}, ${n} art files, ${(b / 1048576).toFixed(2)} MB`);
}
function run(label, args) {
  const r = spawnSync(GODOT, ['--headless', '--path', S, ...args], { encoding: 'utf8', timeout: 600000 });
  const out = (r.stdout || '') + (r.stderr || ''), lines = out.split(/\r?\n/);
  const errs = lines.filter(l => /^\s*(SCRIPT )?ERROR/.test(l)), warns = lines.filter(l => /^\s*WARNING/.test(l));
  fs.writeFileSync(path.join(ROOT, 'tools/out/export', 'godot-' + label + '.log'), out);
  console.log(`${errs.length || r.status ? 'FAIL' : 'PASS'}  ${label.padEnd(8)} exit ${r.status}, ${errs.length} errors, ${warns.length} warnings`);
  for (const l of errs.concat(warns).slice(0, 12)) console.log('   ' + l.trim().slice(0, 200));
  return { errs: errs.length, warns: warns.length, status: r.status, out };
}
fs.mkdirSync(path.join(ROOT, 'tools/out/export'), { recursive: true });
fill();
if (!process.argv.includes('--copy-only')) {
  const res = [];
  res.push(run('import', ['--import']));
  const s = run('script', ['--script', 'res://addons/handoff/godot_import.gd']); res.push(s);
  const m = s.out.match(/godot_import: (.*)/); if (m) console.log('   ' + m[1]);
  res.push(run('reimport', ['--import']));
  res.push(run('run', ['--quit-after', '120']));
  if (!process.argv.includes('--no-web')) {
    const web = path.join(ROOT, 'tools/out/export/web');
    fs.rmSync(web, { recursive: true, force: true }); fs.mkdirSync(web, { recursive: true });
    res.push(run('web', ['--export-release', 'Web', path.join(web, 'index.html')]));
    const files = fs.existsSync(web) ? fs.readdirSync(web) : [];
    console.log(`   web: ${files.length} files, ${(files.reduce((a, f) => a + fs.statSync(path.join(web, f)).size, 0) / 1048576).toFixed(2)} MB (${files.join(', ')})`);
  }
  const E = res.reduce((a, r) => a + r.errs, 0), W = res.reduce((a, r) => a + r.warns, 0);
  console.log(`${E ? 'FAIL' : 'PASS'}  godot sample: ${E} errors, ${W} warnings (logs: tools/out/export/godot-*.log)`);
  process.exitCode = E ? 1 : 0;
}
