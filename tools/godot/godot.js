'use strict';
// tools/godot/godot.js -- runs Godot 4.7.2 on godot/ and counts ERROR / WARNING lines (Godot exits 0 on script errors, so the
// log is the truth). Logs land in tools/out/godot/<label>.log.  GODOT=<exe> overrides the default install path.
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const PROJECT = path.join(ROOT, 'godot');
const LOGS = path.join(ROOT, 'tools/out/godot');
const GODOT = process.env.GODOT || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local'), 'Programs/Godot/Godot_v4.7.2-stable_win64_console.exe');

// a few engine lines are noise on a headless box (no audio device, the editor layout file); they never count as errors
const IGNORE = [/Condition "!editor_layouts.is_valid\(\)"/, /WASAPI/, /Can't open audio/];

function runGodot(label, args, opts = {}) {
  fs.mkdirSync(LOGS, { recursive: true });
  const full = (opts.headless === false ? [] : ['--headless']).concat(['--path', PROJECT], args);
  const r = spawnSync(GODOT, full, { encoding: 'utf8', timeout: opts.timeout || 600000, maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || ''), lines = out.split(/\r?\n/);
  const isErr = l => /^\s*(SCRIPT )?ERROR/.test(l) && !IGNORE.some(re => re.test(l));
  const errs = lines.filter(isErr), warns = lines.filter(l => /^\s*WARNING/.test(l));
  fs.writeFileSync(path.join(LOGS, label + '.log'), out);
  const ok = !errs.length && (r.status === 0 || opts.anyExit);
  if (!opts.quiet) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(10)} exit ${r.status}, ${errs.length} errors, ${warns.length} warnings  (tools/out/godot/${label}.log)`);
    for (const l of errs.concat(warns).slice(0, 12)) console.log('   ' + l.trim().slice(0, 220));
    if (r.error) console.log('   ' + r.error.message);
  }
  return { ok, errs: errs.length + (ok ? 0 : (errs.length ? 0 : 1)), warns: warns.length, status: r.status, out };
}

module.exports = { runGodot, GODOT, PROJECT, ROOT };
