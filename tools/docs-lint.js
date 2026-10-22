#!/usr/bin/env node
'use strict';
// Docs lint (M4a). Checks docs/**/*.md:
//   1. dead relative links: [text](target) whose target file or folder does not exist (anchors and queries are stripped;
//      http, https, mailto and in-page #links are not checked). A target that was retired in the M4a cleanup is reported
//      as "link to retired file" instead of "dead link".
//   2. docs/design/*.md (recursive) over 150 lines, except names.md.
//   3. the words "supersede", "supersedes", "superseded" anywhere in docs/design/**.
//   4. glossary tables (docs/GLOSSARY.md and any other *glossary*.md under docs/) have 5 columns in every row.
// docs/design/ may not exist yet (the Docs lane is creating it); a missing folder just has nothing to check.
// Usage: node tools/docs-lint.js [repo-root]     exit 0 when there are no errors, 1 otherwise. Warnings never fail.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const DOCS = path.join(ROOT, 'docs');
const DESIGN = path.join(DOCS, 'design');
const MAX_DESIGN_LINES = 150;
const LINE_EXEMPT = new Set(['names.md']);

// files and folders deleted in the M4a cleanup (tools/qa/dbg-* except dbg-fight.js also retired)
const RETIRED = [
  'tools/qa/old', 'tools/engine-tour.js', 'tools/shots-hud.js', 'tools/shots-m3-art.js', 'tools/shots-m3-ui.js',
  'tools/shots-m3-ui-fixes.js', 'tools/echo-gate.js', 'tools/m1-world.js', 'tools/hero-preview.html',
  'tools/icon-preview.html', 'tools/enemy-preview.html', 'tools/balance/dust_flow.csv', 'tools/balance/enemy_curve.csv',
  'tools/balance/hero_curve.csv', 'tools/balance/item_pp.csv', 'tools/balance/xp_path.csv', 'tools/qa/dbg-touch.out.json',
];
const isRetired = rel => RETIRED.some(p => rel === p || rel.startsWith(p + '/')) || /^tools\/qa\/dbg-(?!fight\.js$)/.test(rel);

const errors = [];
const warnings = [];
const err = (file, line, msg) => errors.push(`ERROR ${file}${line ? ':' + line : ''}  ${msg}`);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name.endsWith('.md')) out.push(p);
  }
  return out;
}
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const mdFiles = walk(DOCS);
const designFiles = walk(DESIGN);

// ---- 1. links (code fences skipped)
const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
for (const file of mdFiles) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let fence = false;
  lines.forEach((text, i) => {
    if (/^\s*```/.test(text)) { fence = !fence; return; }
    if (fence) return;
    for (const m of text.matchAll(LINK)) {
      let t = m[1];
      if (/^(https?:|mailto:|data:|#)/i.test(t)) continue;
      t = t.split('#')[0].split('?')[0];
      if (!t) continue;
      try { t = decodeURIComponent(t); } catch (_) { /* keep raw */ }
      const target = t.startsWith('/') ? path.join(ROOT, t) : path.join(path.dirname(file), t);
      if (fs.existsSync(target)) continue;
      const tr = path.relative(ROOT, target).split(path.sep).join('/');
      if (isRetired(tr)) err(rel(file), i + 1, `link to retired file ${t} (deleted in M4a cleanup)`);
      else err(rel(file), i + 1, `dead link ${t}`);
    }
  });
}

// ---- 2. line count in docs/design
for (const file of designFiles) {
  const name = path.basename(file);
  if (LINE_EXEMPT.has(name)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const n = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  if (n > MAX_DESIGN_LINES) err(rel(file), 0, `${n} lines (max ${MAX_DESIGN_LINES} for docs/design/*.md)`);
}

// ---- 3. supersede words in docs/design
const SUPERSEDE = /\bsupersede(s|d)?\b/i;
for (const file of designFiles) {
  fs.readFileSync(file, 'utf8').split('\n').forEach((text, i) => {
    if (SUPERSEDE.test(text)) err(rel(file), i + 1, `"${text.match(SUPERSEDE)[0]}" in docs/design (state the current truth only)`);
  });
}

// ---- 4. glossary tables: 5 columns
const glossaryFiles = mdFiles.filter(f => /glossary/i.test(path.basename(f)));
const cellCount = row => {
  let s = row.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).length;
};
const SEP = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
for (const file of glossaryFiles) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let fence = false, tables = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fence = !fence; continue; }
    if (fence) continue;
    if (lines[i].trim().startsWith('|') && i + 1 < lines.length && SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      tables++;
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        const n = cellCount(lines[j]);
        if (n !== 5) err(rel(file), j + 1, `glossary table row has ${n} columns (want 5)`);
        j++;
      }
      i = j - 1;
    }
  }
  if (!tables) warnings.push(`WARN  ${rel(file)}  no table found`);
}

// ---- report
console.log(`docs-lint: ${mdFiles.length} markdown file(s) under docs/, ${designFiles.length} under docs/design/` +
  (fs.existsSync(DESIGN) ? '' : ' (docs/design/ not present yet: design checks skipped)'));
console.log(`           glossary files checked: ${glossaryFiles.map(rel).join(', ') || 'none'}`);
for (const l of warnings) console.log(l);
for (const l of errors) console.log(l);
console.log(`docs-lint: ${errors.length} error(s), ${warnings.length} warning(s)  ->  ${errors.length ? 'FAIL' : 'PASS'}`);
process.exit(errors.length ? 1 : 0);
