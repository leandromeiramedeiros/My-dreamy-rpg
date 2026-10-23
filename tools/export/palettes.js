#!/usr/bin/env node
'use strict';
// tools/export/palettes.js -- GIMP .gpl palettes (Aseprite, Godot, Krita and GIMP read them) in handoff/art/palettes/:
//   <zone>.gpl            the zone theme's ramps (js/maps.js THEMES: grass, path, stone, water, wood, earth, under, cloud, sky,
//                         flowers ...), one named swatch per step, for the zones of handoff/data/zones.json
//   material_<name>.gpl   the forge's gear ramps (tools/forge/models/chibi-palette.js): metal T1-T6, gold, leather, cloth T1-T6,
//                         gems (sapphire, ruby), wood, mail, fur
//   ui.gpl                the HUD palette (js/ui.js UI colours)
//   forge_<rig>.gpl       every colour the exported sheets of that rig use (written by all.js from tools/export/art.js)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const hex = c => typeof c === 'string' ? c : '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function gpl(name, swatches, cols = 8) {   // swatches: [[name, '#hex' | [r, g, b]]]
  return `GIMP Palette\nName: ${name}\nColumns: ${cols}\n#\n` + swatches.map(([n, c]) => { const [r, g, b] = rgb(hex(c)); return `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${n}`; }).join('\n') + '\n';
}
function writePalettes(outRoot, zones, forgePal) {
  const dir = path.join(outRoot, 'palettes'), files = [];
  fs.mkdirSync(dir, { recursive: true });
  const put = (f, txt) => { fs.writeFileSync(path.join(dir, f), txt); files.push(path.join(dir, f)); };
  const E = require('./engine.js')();
  for (const z of zones) {
    const th = E.THEMES[z.theme], sw = [];
    for (const [k, v] of Object.entries(th)) {
      if (Array.isArray(v) && v.length && (Array.isArray(v[0]) || typeof v[0] === 'string')) v.forEach((c, i) => sw.push([`${k} ${i}`, c]));
      else if (Array.isArray(v) && v.length === 3 && typeof v[0] === 'number') sw.push([k, v]);
      else if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) sw.push([k, v]);
    }
    put(path.basename(z.palette || `${z.id}.gpl`), gpl(`${z.name} (${z.id})`, sw, 7));
  }
  const P = require(path.join(ROOT, 'tools', 'forge', 'models', 'chibi-palette.js'));
  const r = m => Array.isArray(m) ? m : m.ramp;
  const mats = {
    metal: P.METAL.flatMap((m, t) => r(m).map((c, i) => [`T${t + 1} ${i}`, c])), gold: r(P.GOLD).map((c, i) => [`gold ${i}`, c]),
    leather: [...P.LEATHER.map((c, i) => [`leather ${i}`, c]), ...r(P.STRAP).map((c, i) => [`strap ${i}`, c])],
    cloth: P.CLOTH.flatMap((m, t) => m.map((c, i) => [`T${t + 1} ${i}`, c])),
    gems: [...r(P.SAPPHIRE).map((c, i) => [`sapphire ${i}`, c]), ...r(P.RUBY).map((c, i) => [`ruby ${i}`, c])],
    wood: P.WOOD.map((c, i) => [`wood ${i}`, c]), mail: P.MAIL.map((c, i) => [`mail ${i}`, c]), fur: P.FUR.map((c, i) => [`fur ${i}`, c]),
  };
  for (const [k, sw] of Object.entries(mats)) put(`material_${k}.gpl`, gpl(`material ${k}`, sw, 5));
  // ui: the UI colour table's literal in js/ui.js
  const src = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8'), m = src.match(/const C = Object\.assign\(\{([\s\S]*?)\}, \(ART\(\)[\s\S]*?\{([^}]*)\}\);/);
  const ui = [];
  for (const part of m ? [m[1], m[2]] : []) for (const [, k, c] of part.matchAll(/(\w+):\s*'(#[0-9a-fA-F]{6})'/g)) ui.push([k, c]);
  put('ui.gpl', gpl('ui (js/ui.js)', ui, 8));
  for (const [rig, set] of Object.entries(forgePal || {})) put(`forge_${rig}.gpl`, gpl(`forge ${rig} (every colour of its exported sheets)`, [...set].sort((a, b) => a - b).map((k, i) => [`c${i}`, [k >> 16, (k >> 8) & 255, k & 255]]), 16));
  return files;
}
module.exports = { writePalettes, gpl };
