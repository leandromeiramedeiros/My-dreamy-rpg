#!/usr/bin/env node
'use strict';
// Ship gate (M4a). Runs the check suite strictly one step at a time, from the repo root:
//   smoke -> play -> act1-route -> validate-ids -> maps/engine-check -> forge-rt -> perf -> qa/run-big (kbm, all, --god, seed 1)
// Each step's stdout+stderr goes to tools/out/check/<name>.log (gitignored). Every step runs even after a failure,
// so the table shows the whole picture. Prints a summary table (name, PASS/FAIL, seconds); exit 1 on any FAIL.
//
// Usage:
//   node tools/check.js                  full gate (about 10 min with the bot)
//   node tools/check.js --fast           skip perf.js and the big-run bot
//   node tools/check.js --only play,smoke  run only the named steps (in gate order)
//   node tools/check.js --fast --only smoke,play
// Exit codes: 0 all selected steps passed, 1 a step failed, 2 bad arguments.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(__dirname, 'out', 'check');

// gate order. slow = skipped by --fast; bot = the big-run playthrough (also skipped by --fast)
const STEPS = [
  { name: 'smoke', file: 'tools/smoke.js', args: [] },
  { name: 'play', file: 'tools/play.js', args: [] },
  { name: 'act1-route', file: 'tools/act1-route.js', args: [] },
  { name: 'validate-ids', file: 'tools/validate-ids.js', args: [] },
  { name: 'engine-check', file: 'tools/maps/engine-check.js', args: [] },
  { name: 'forge-rt', file: 'tools/forge-rt-check.js', args: [] },
  { name: 'perf', file: 'tools/perf.js', args: [], slow: true },
  { name: 'run-big', file: 'tools/qa/run-big.js', args: ['kbm', 'all', '--god', '--seed', '1'], slow: true, bot: true },
];

function parseArgs(argv) {
  const opts = { fast: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fast') opts.fast = true;
    else if (a === '--only') {
      const v = argv[++i];
      if (!v) return { error: '--only needs a comma-separated list of step names' };
      opts.only = v.split(',').map(s => s.trim()).filter(Boolean);
    } else if (a.startsWith('--only=')) opts.only = a.slice(7).split(',').map(s => s.trim()).filter(Boolean);
    else return { error: `unknown argument: ${a}` };
  }
  if (opts.only) {
    const known = STEPS.map(s => s.name);
    const bad = opts.only.filter(n => !known.includes(n));
    if (bad.length) return { error: `unknown step(s): ${bad.join(', ')} (known: ${known.join(', ')})` };
  }
  return opts;
}

function selectSteps(opts) {
  let steps = STEPS.slice();
  if (opts.only) steps = steps.filter(s => opts.only.includes(s.name));
  if (opts.fast) steps = steps.filter(s => !s.slow && !s.bot);
  return steps;
}

function runStep(step) {
  const abs = path.join(ROOT, step.file);
  if (!fs.existsSync(abs)) return { status: 'FAIL', code: -1, secs: 0, out: `missing file: ${step.file}\n` };
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [abs, ...step.args], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, windowsHide: true,
  });
  const secs = (Date.now() - t0) / 1000;
  const out = (r.stdout || '') + (r.stderr || '') + (r.error ? `\nspawn error: ${r.error.message}\n` : '');
  const code = r.status === null ? -1 : r.status;
  return { status: code === 0 && !r.error ? 'PASS' : 'FAIL', code, secs, out };
}

function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.error) { console.error(`check: ${opts.error}`); process.exit(2); }
  const steps = selectSteps(opts);
  if (!steps.length) { console.error('check: no steps selected'); process.exit(2); }
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const rows = [];
  for (const step of steps) {
    console.log(`\n== ${step.name}  (${step.file} ${step.args.join(' ')})`.trimEnd());
    const res = runStep(step);
    const logPath = path.join(LOG_DIR, `${step.name}.log`);
    fs.writeFileSync(logPath, res.out);
    console.log(`   ${res.status} in ${res.secs.toFixed(1)} s, exit ${res.code}, log ${path.relative(ROOT, logPath).split(path.sep).join('/')}`);
    if (res.status === 'FAIL') {
      const tail = res.out.trimEnd().split('\n').slice(-12);
      console.log(tail.map(l => '   | ' + l).join('\n'));
    }
    rows.push({ name: step.name, status: res.status, secs: res.secs });
  }

  const w = Math.max(4, ...rows.map(r => r.name.length));
  console.log('\n' + pad('step', w) + '  result  seconds');
  console.log(pad('-'.repeat(4), w) + '  ------  -------');
  for (const r of rows) console.log(pad(r.name, w) + '  ' + pad(r.status, 6) + '  ' + r.secs.toFixed(1).padStart(7));
  const skipped = STEPS.filter(s => !steps.includes(s)).map(s => s.name);
  if (skipped.length) console.log(`skipped: ${skipped.join(', ')}${opts.fast ? ' (--fast)' : ''}`);
  const failed = rows.filter(r => r.status === 'FAIL').length;
  console.log(failed ? `\nGATE FAILED: ${failed} of ${rows.length} step(s)` : `\nGATE PASSED: ${rows.length} of ${rows.length} step(s)`);
  process.exit(failed ? 1 : 0);
}

main();
