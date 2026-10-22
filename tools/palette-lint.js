#!/usr/bin/env node
'use strict';
// Palette lint (M4a). Checks every colour ramp it can find:
//   - forge material ramps in tools/forge/models/**/*.js: explicit arrays of hex colours (the form
//     [shadow, low, mid, high, (glint)] that forge.js reads from `ramp:` / material fields);
//   - ELFX colour rows in js/elfx.js: the `ramp` of each registry row (loaded in a vm sandbox, read as data).
// Rules per ramp:
//   R1  4 tones, plus an optional 5th glint colour (any other length is a finding);
//   R2  luminance (CIE L*) strictly increases along the ramp, glint included;
//   R3  the darkest tone differs from the outline colour #0c0714 by dL >= 8 (CIE L*).
// Flat ramps (every entry the same colour, e.g. the glow cores) are deliberate and are counted, not checked.
// Forge ramps written as one colour plus `tones: [...]` are derived at build time and are counted, not checked.
// Report-only by default (exit 0). Pass --strict to exit 1 when there are findings.
// Usage: node tools/palette-lint.js [--strict]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const MODELS = path.join(ROOT, 'tools', 'forge', 'models');
const ELFX = path.join(ROOT, 'js', 'elfx.js');
const OUTLINE = '#0c0714';
const MIN_DL = 8;
const STRICT = process.argv.includes('--strict');

// CIE L* of a #rrggbb colour (sRGB, D65)
function lstar(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
}
const norm = h => h.toLowerCase();

const ramps = [];   // { src, id, line, colours }
const findings = [];
let flat = 0, derived = 0;

// ---- forge models: arrays of hex literals (2 or more entries) are ramps
const HEX_ARRAY = /\[\s*((?:['"]#[0-9a-fA-F]{6}['"]\s*,?\s*)+)\]/g;
const HEX = /#[0-9a-fA-F]{6}/g;
const modelFiles = fs.existsSync(MODELS)
  ? fs.readdirSync(MODELS, { recursive: true }).map(f => f.split(path.sep).join('/')).filter(f => f.endsWith('.js')).sort()
  : [];
for (const f of modelFiles) {
  const file = path.join(MODELS, f);
  const text = fs.readFileSync(file, 'utf8');
  const src = 'tools/forge/models/' + f;
  for (const m of text.matchAll(HEX_ARRAY)) {
    const colours = m[1].match(HEX).map(norm);
    if (colours.length < 2) continue;
    const line = text.slice(0, m.index).split('\n').length;
    ramps.push({ src, id: `array@${line}`, line, colours });
  }
  // one colour + tones: derived at build time (forge.js shades it), not a literal ramp
  derived += (text.match(/ramp:\s*['"]#[0-9a-fA-F]{6}['"]\s*,\s*tones:/g) || []).length;
}

// ---- ELFX rows (registry data): run the file in a sandbox and read ELFX.rows
if (fs.existsSync(ELFX)) {
  const ctx = vm.createContext({ console, Math });
  try {
    vm.runInContext(fs.readFileSync(ELFX, 'utf8'), ctx, { filename: 'js/elfx.js' });
    const rows = vm.runInContext('ELFX.rows', ctx);
    for (const [el, row] of Object.entries(rows)) {
      if (!Array.isArray(row.ramp)) continue;
      ramps.push({ src: 'js/elfx.js', id: `rows.${el}`, line: 0, colours: row.ramp.map(norm) });
    }
  } catch (e) {
    findings.push(`ERROR js/elfx.js  could not load ELFX.rows: ${e.message}`);
  }
}

// ---- rules
const outlineL = lstar(OUTLINE);
let checked = 0;
for (const r of ramps) {
  const where = `${r.src}${r.line ? ':' + r.line : ''} ${r.id}`;
  const c = r.colours;
  if (c.every(h => h === c[0])) { flat++; continue; }
  checked++;
  if (c.length !== 4 && c.length !== 5) {
    findings.push(`WARN  ${where}  ${c.length} colours (want 4 tones + optional glint)`);
    continue;
  }
  const L = c.map(lstar);
  for (let i = 1; i < L.length; i++) {
    if (!(L[i] > L[i - 1])) {
      findings.push(`WARN  ${where}  luminance does not increase at step ${i + 1}: ${c[i - 1]} L*${L[i - 1].toFixed(1)} -> ${c[i]} L*${L[i].toFixed(1)}`);
      break;
    }
  }
  const dL = L[0] - outlineL;
  if (dL < MIN_DL) findings.push(`WARN  ${where}  darkest tone ${c[0]} is dL ${dL.toFixed(1)} from outline ${OUTLINE} (want >= ${MIN_DL})`);
}

// ---- report
console.log(`palette-lint: ${ramps.length} ramp(s) found (${modelFiles.length} forge model files, ELFX rows from js/elfx.js)`);
console.log(`              checked ${checked}, flat ${flat} (skipped), forge derived from one colour + tones ${derived} (skipped)`);
console.log(`              outline ${OUTLINE} L* ${outlineL.toFixed(1)}; rules: 4 tones (+1 glint), L* strictly rising, dL >= ${MIN_DL}`);
for (const f of findings) console.log(f);
console.log(`palette-lint: ${findings.length} finding(s) -> ${findings.length ? (STRICT ? 'FAIL (--strict)' : 'report only') : 'PASS'}`);
process.exit(findings.length && STRICT ? 1 : 0);
