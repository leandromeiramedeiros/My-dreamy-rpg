#!/usr/bin/env node
'use strict';
// validate-ids.js: checks that every id referenced across the game data resolves to a real definition.
//
// Loads the classic scripts into one vm context in index.html order, plus js/itemdata.js and js/sfxdata.js,
// and js/music.js if index.html does not load it, with stubbed browser globals.
// Prints one line per problem as `file: kind id -> missing target`. Errors exit 1; warnings never do.
// Warnings cover ids that are only matched loosely (e.g. root_crown vs rootcrown) or that name planned
// content with no definition yet (e.g. bestiary entries for bosses that do not exist as enemies).
//
// Usage: node tools/validate-ids.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
// Load order: the classic scripts in index.html, in the order they appear there, with js/itemdata.js
// after items.js and js/sfxdata.js after maps.js. js/music.js is appended when index.html does not load it.
function loadOrder() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const names = [...html.matchAll(/<script\s+src="js\/([a-z0-9_]+)\.js"/g)].map((m) => m[1]);
  const insertAfter = (list, after, name) => {
    if (!list.includes(name)) list.splice(list.indexOf(after) + 1, 0, name);
  };
  insertAfter(names, 'items', 'itemdata');
  insertAfter(names, 'maps', 'sfxdata');
  if (!names.includes('music')) names.push('music');
  return names;
}
const LOAD_ORDER = loadOrder();
// Scripts whose top-level code is pure data. A load failure in one of these is an error; in the
// DOM-driven scripts it is only a warning, because the stubs cannot stand in for a real page.
const DATA_FILES = new Set(['util', 'settings', 'data', 'items', 'itemdata', 'world', 'maps', 'sfxdata', 'dialogue', 'music']);

// ---------------------------------------------------------------- browser stubs
// A callable, chainable stub: any property read returns another stub, any call returns one too.
function stub() {
  const fn = function () {};
  return new Proxy(fn, {
    get: (t, k) => {
      if (k in t) return t[k];
      if (k === Symbol.toPrimitive) return () => 0;
      if (typeof k === 'symbol' || k === 'then') return undefined;
      return (t[k] = stub());
    },
    set: (t, k, v) => { t[k] = v; return true; },
    apply: () => stub(),
    construct: () => stub(),
  });
}

function loadData() {
  const ctx = { console };
  ctx.document = stub();
  ctx.window = ctx;
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  ctx.Image = function () { return stub(); };
  ctx.URLSearchParams = URLSearchParams;
  ctx.addEventListener = () => {};
  ctx.requestAnimationFrame = () => 0;
  ctx.setTimeout = () => 0;
  ctx.location = { search: '', href: '' };
  ctx.navigator = {};
  ctx.performance = { now: () => 0 };
  vm.createContext(ctx);

  const loadErrors = [];
  for (const name of LOAD_ORDER) {
    const file = path.join(ROOT, 'js', name + '.js');
    try {
      vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file, timeout: 5000 });
    } catch (e) {
      loadErrors.push({ file: 'js/' + name + '.js', message: e.message, data: DATA_FILES.has(name) });
    }
  }
  const get = (expr) => { try { return vm.runInContext(expr, ctx); } catch (e) { return undefined; } };
  return { get, loadErrors };
}

// ---------------------------------------------------------------- checks
const F = {
  data: 'js/data.js', items: 'js/items.js', itemdata: 'js/itemdata.js', world: 'js/world.js',
  game: 'js/game.js', sfx: 'js/sfxdata.js', dialogue: 'js/dialogue.js', music: 'js/music.js',
};
const errors = [];
const warnings = [];
const fail = (file, kind, id, target) => errors.push(`${file}: ${kind} ${id} -> ${target}`);
const warn = (file, kind, id, target) => warnings.push(`${file}: ${kind} ${id} -> ${target}`);
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Resolve a referenced item id. Exact matches are fine; a single loose match (same letters after
// dropping case, underscores and punctuation) is a warning because the intent is unclear; no match is an error.
function checkItemRef(file, kind, owner, ref, itemIds) {
  if (itemIds.has(ref)) return;
  const loose = [...itemIds].filter((x) => norm(x) === norm(ref));
  if (loose.length === 1) warn(file, kind, owner, `${ref} (loose match for "${loose[0]}", not exact)`);
  else fail(file, kind, owner, ref);
}

// Planned content from docs/DESIGN.md §21.1 (roster), §21.3 (vault bosses) and §22.1/22.2 (maps). A reference
// to one of these ids is a warning, not an error, until the map or enemy definition lands.
const PLANNED_MAPS = new Set([
  'roothollow', 'bramblehorn_clearing', 'warden_crypt', 'wardens_hall', 'grotto', 'drowned_vault', 'mirelle_basin',
  'caldera', 'forge_deep', 'the_anvil', 'spire', 'sleepless_court', 'morrows_throne', 'moon_pond', 'fox_warrens',
  'oath_reliquary', 'glowfin_shallows', 'slag_chambers', 'vigil_walk', 'drifting_isles', 'starlit_shoals',
  'gloaming_below', 'dream_arena', 'pips_lanterns',
]);
const PLANNED_ENEMIES = new Set([
  // §21.1 commons
  'dream_moth', 'bramble_shaman', 'thornback_boar', 'gloom_knight', 'grave_chanter', 'pillar_mimic',
  'shadeling_swarm', 'frost_jelly', 'tide_crab', 'glowfin_shoal', 'deepsinger', 'lightning_eel', 'cinder_imp',
  'slag_golem', 'ash_wraith', 'forge_priest', 'magma_hopper', 'void_bomber', 'vigil_knight', 'star_archer',
  'dread_herald', 'unmade',
  // §21.1 bosses, mini-bosses, optional and vault bosses
  'bramblehorn', 'mirelle', 'kharzul', 'morrow', 'mossjaw', 'slagheart', 'sorrel_echo', 'unwaking_child',
  'oathless', 'brinemother', 'vigils', 'shaman',
]);

// Trinket slots are fixed by the engine (rings, amulets and belts; see docs/DESIGN.md §19).
const TRINKET_SLOTS = ['ring', 'amulet', 'belt'];

// Resolve a reference to a map or enemy id. Defined ids pass; planned ids (DESIGN §21/§22) are warnings;
// anything else is an error.
function refOrPlanned(file, kind, owner, ref, defined, planned, what) {
  if (defined.has(ref)) return;
  if (planned.has(ref)) warn(file, kind, owner, `${ref} (planned ${what}, not defined yet)`);
  else fail(file, kind, owner, ref);
}

function main() {
  const { get, loadErrors } = loadData();
  for (const le of loadErrors) {
    if (le.data) fail(le.file, 'load', 'script', le.message);
    else warn(le.file, 'load', 'script', le.message);
  }

  const ITEMS = get('ITEMS'), SKILLS = get('SKILLS'), CHAR_SKILLS = get('CHAR_SKILLS');
  const BASES = get('BASES'), UNIQUES = get('UNIQUES'), SLOTS = get('SLOTS'), GEMS = get('GEMS');
  const IMPLICITS = get('IMPLICITS'), FLAVOR = get('FLAVOR'), BOONS = get('BOONS');
  const ORIGIN_RINGS = get('ORIGIN_RINGS'), TRINKET_BASES = get('TRINKET_BASES');
  const TRINKET_UNIQUES = get('TRINKET_UNIQUES'), WORLD_UNIQUES = get('WORLD_UNIQUES');
  const WORLD_DATA = get('WORLD_DATA'), ENEMY = get('ENEMY');
  const DIALOGUE = get('DIALOGUE'), QUESTS = get('QUESTS'), BESTIARY_LORE = get('BESTIARY_LORE');
  const SFX_RECIPES = get('SFX_RECIPES'), WARN_SFX = get('WARN_SFX'), SFX_CAPTIONS = get('SFX_CAPTIONS');
  const MUSIC = get('MUSIC'), MUSIC_PATCHES = get('MUSIC_PATCHES');

  const skillIds = new Set(Object.keys(SKILLS || {}));
  const baseIds = new Set(Object.keys(BASES || {}));
  const uniqueList = [
    ...Object.entries(UNIQUES || {}).map(([id, u]) => ({ id, u, file: F.items })),
    ...(TRINKET_UNIQUES || []).map((u) => ({ id: u.id, u, file: F.itemdata })),
    ...(WORLD_UNIQUES || []).map((u) => ({ id: u.id, u, file: F.itemdata })),
  ];
  const equipSlots = new Set(SLOTS || []);
  const mapIds = new Set(Object.keys((WORLD_DATA && WORLD_DATA.maps) || {}));
  const enemyIds = new Set([...Object.keys(ENEMY || {}), ...Object.keys((WORLD_DATA && WORLD_DATA.enemies) || {})]);
  const recipeIds = new Set(Object.keys(SFX_RECIPES || {}));

  // Every id an item, drop or quest can name. Used for drops and quest rewards.
  const itemIds = new Set([
    ...baseIds,
    ...uniqueList.map((x) => x.id),
    ...(TRINKET_BASES || []).map((t) => t.id),
    ...(ORIGIN_RINGS || []).map((o) => o.id),
    ...Object.keys(GEMS || {}),
  ]);

  // ---- skills named by families (items), character skills, bases and uniques
  for (const slot of Object.keys(ITEMS || {})) {
    for (const fam of ITEMS[slot]) {
      for (const key of ['q', 'e', 'r']) {
        for (const sk of fam[key] || []) if (!skillIds.has(sk)) fail(F.data, 'skill', `${fam.id}.${key}`, sk);
      }
      if (fam.skill && !skillIds.has(fam.skill)) fail(F.data, 'skill', `${fam.id}.skill`, fam.skill);
    }
  }
  for (const sk of CHAR_SKILLS || []) if (!skillIds.has(sk)) fail(F.data, 'character skill', sk, 'SKILLS entry');
  // Every skill needs an aim block (docs/HUD.md, "Touch v2", "Aiming") with a known shape and a numeric range.
  const AIM_SHAPES = new Set(['cone', 'circle', 'line', 'proj', 'self', 'dash']);
  for (const [id, sk] of Object.entries(SKILLS || {})) {
    if (!sk.aim || typeof sk.aim !== 'object') fail(F.data, 'aim', id, 'missing aim block');
    else if (!AIM_SHAPES.has(sk.aim.shape)) fail(F.data, 'aim', id, `invalid shape "${sk.aim.shape}"`);
    else if (typeof sk.aim.range !== 'number' || !(sk.aim.range >= 0)) fail(F.data, 'aim', id, `invalid range "${sk.aim.range}"`);
  }
  for (const { id, u, file } of uniqueList) {
    for (const sk of [].concat(u.skill || [], u.skills || [])) if (!skillIds.has(sk)) fail(file, 'skill', id, sk);
  }
  // Each base must belong to a family in its slot (BASES is built from ITEMS, so this guards the table).
  for (const b of Object.values(BASES || {})) {
    const fams = (ITEMS && ITEMS[b.slot]) || [];
    if (!fams.some((f) => f.id === b.family)) fail(F.items, 'base', b.id, `family "${b.family}" in slot "${b.slot}"`);
  }

  // ---- IMPLICITS and FLAVOR versus base ids (and unique ids for FLAVOR)
  for (const k of Object.keys(IMPLICITS || {})) if (!baseIds.has(k)) fail(F.itemdata, 'IMPLICITS', k, 'base id');
  for (const k of Object.keys(FLAVOR || {})) {
    if (!baseIds.has(k) && !uniqueList.some((x) => x.id === k)) fail(F.itemdata, 'FLAVOR', k, 'base or unique id');
  }
  for (const id of baseIds) {
    if (!(IMPLICITS || {})[id]) fail(F.itemdata, 'base', id, 'IMPLICITS entry');
    if (!(FLAVOR || {})[id]) fail(F.itemdata, 'base', id, 'FLAVOR entry');
  }
  for (const { id, u } of uniqueList.filter((x) => x.u.base !== undefined)) {
    if (!baseIds.has(u.base)) fail(F.items, 'unique', id, u.base);
  }

  // ---- boons and uniques that name a slot
  const checkSlot = (file, kind, id, slot, allowed) => {
    if (!allowed.has(slot)) fail(file, kind, id, `slot "${slot}"`);
  };
  const trinketSlots = new Set(TRINKET_SLOTS);
  for (const u of uniqueList) {
    if (u.u.base !== undefined && BASES && BASES[u.u.base]) checkSlot(u.file, 'unique base slot', u.id, BASES[u.u.base].slot, equipSlots);
  }
  for (const t of TRINKET_BASES || []) checkSlot(F.itemdata, 'trinket base', t.id, t.slot, trinketSlots);
  for (const u of TRINKET_UNIQUES || []) checkSlot(F.itemdata, 'trinket unique', u.id, u.slot, trinketSlots);
  for (const u of WORLD_UNIQUES || []) checkSlot(F.itemdata, 'world unique', u.id, u.slot, trinketSlots);
  for (const o of ORIGIN_RINGS || []) checkSlot(F.itemdata, 'origin ring', o.id, o.slot, trinketSlots);
  const boonIdCount = {};
  for (const [slot, list] of Object.entries(BOONS || {})) {
    checkSlot(F.itemdata, 'boon slot', slot, slot, trinketSlots);
    for (const b of list) boonIdCount[b.id] = (boonIdCount[b.id] || 0) + 1;
  }
  for (const o of ORIGIN_RINGS || []) boonIdCount[o.boon.id] = (boonIdCount[o.boon.id] || 0) + 1;
  for (const [id, n] of Object.entries(boonIdCount)) if (n > 1) fail(F.itemdata, 'boon', id, 'unique boon id (found ' + n + ')');

  // ---- world: start map, portal targets, enemy types in spawns
  if (!mapIds.has(WORLD_DATA.start)) fail(F.world, 'start', 'WORLD_DATA', WORLD_DATA.start);
  for (const [mapId, map] of Object.entries(WORLD_DATA.maps || {})) {
    (map.portals || []).forEach((p, i) => {
      refOrPlanned(F.world, 'portal', `${mapId}#${i}`, p.to, mapIds, PLANNED_MAPS, 'map');
    });
    for (const tr of map.triggers || []) {
      for (const a of tr.actions || []) {
        if (a.type === 'spawn' && a.enemy !== undefined) {
          refOrPlanned(F.world, 'enemy', `${mapId}:${tr.id}`, a.enemy, enemyIds, PLANNED_ENEMIES, 'enemy');
        }
      }
    }
  }

  // ---- dialogue, bestiary and quests
  const bestiaryKeys = new Set(Object.keys(BESTIARY_LORE || {}));
  for (const k of bestiaryKeys) {
    if (!enemyIds.has(k)) warn(F.dialogue, 'bestiary', k, 'enemy definition (planned entry?)');
  }
  for (const [key, entry] of Object.entries(DIALOGUE || {})) {
    const boss = key.match(/^boss_([a-z0-9]+)_/);
    if (boss) {
      if (!enemyIds.has(boss[1]) && !bestiaryKeys.has(boss[1])) {
        warn(F.dialogue, 'dialogue', key, `enemy "${boss[1]}" (no definition${PLANNED_ENEMIES.has(boss[1]) ? ', planned' : ''})`);
      }
    } else {
      const prefix = key.split('_')[0];
      if (key.includes('_') && !mapIds.has(prefix)) warn(F.dialogue, 'dialogue', key, `map "${prefix}" (no such map${PLANNED_MAPS.has(prefix) ? ', planned' : ''})`);
    }
    if (entry.drops) checkItemRef(F.dialogue, 'drops', key, entry.drops, itemIds);
  }
  const questIds = new Set();
  for (const q of QUESTS || []) {
    if (questIds.has(q.id)) fail(F.dialogue, 'quest', q.id, 'unique quest id');
    questIds.add(q.id);
    refOrPlanned(F.dialogue, 'quest', q.id, q.zone, mapIds, PLANNED_MAPS, 'map');
    if (q.extra && typeof q.extra === 'string') checkItemRef(F.dialogue, 'extra', q.id, q.extra, itemIds);
  }

  // ---- sound captions and warning cues versus sound recipes
  for (const [key, recipe] of Object.entries(WARN_SFX || {})) {
    if (!recipeIds.has(recipe)) fail(F.sfx, 'WARN_SFX', key, recipe);
  }
  for (const key of Object.keys(SFX_CAPTIONS || {})) {
    if (!recipeIds.has(key)) fail(F.sfx, 'SFX_CAPTIONS', key, 'SFX_RECIPES entry');
  }

  // ---- music: layer patches, stems and mix keys versus MUSIC_PATCHES and song layers
  for (const [songId, song] of Object.entries(MUSIC || {})) {
    const layers = song.layers || {};
    for (const [layerId, L] of Object.entries(layers)) {
      for (const p of [L.patch, L.alt]) {
        if (p && !(MUSIC_PATCHES || {})[p]) fail(F.music, 'MUSIC patch', `${songId}.${layerId}`, p);
      }
    }
    for (const [stem, names] of Object.entries(song.stems || {})) {
      for (const n of names) if (!layers[n]) fail(F.music, 'stem', `${songId}.${stem}`, `layer "${n}"`);
    }
    for (const n of Object.keys(song.mix || {})) if (!layers[n]) fail(F.music, 'mix', songId, `layer "${n}"`);
  }

  // ---- report
  for (const line of errors) console.log(line);
  for (const line of warnings) console.log('warning: ' + line);
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
  if (errors.length === 0) console.log('no unresolved ids (warnings are for planned or loose references)');
  process.exitCode = errors.length ? 1 : 0;
}

main();
