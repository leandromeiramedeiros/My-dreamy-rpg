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
  const names = [...html.matchAll(/<script\s+src="js\/([a-z0-9_-]+)\.js"/g)].map((m) => m[1]);
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
  const WEAPONS = get('WEAPONS'), ARMOUR = get('ARMOUR'), VARIANT_RENAME = get('VARIANT_RENAME'), FAMILY_TIERS = get('FAMILY_TIERS') || {};

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
    if (b.variant !== b.family || !b.class) fail(F.items, 'base', b.id, `variant "${b.variant}" + class "${b.class}"`);
  }
  // ---- §23 / §24 variant structure: live rows have 5 FAMILY_TIERS; planned rows are name-only (nothing can drop them);
  // every pre-v4 rename target exists
  const variantRows = [];
  for (const [cls, C] of Object.entries(WEAPONS || {})) for (const [id, v] of Object.entries(C.variants || {})) variantRows.push({ id, v, cls, where: `WEAPONS.${cls}.variants.${id}` });
  for (const [cls, C] of Object.entries(ARMOUR || {})) for (const [sid, S] of Object.entries(C.suits || {})) {
    variantRows.push({ id: sid, v: { planned: S.planned }, cls, where: `ARMOUR.${cls}.suits.${sid}`, suit: true });
    for (const [slot, pc] of Object.entries(S.pieces || {})) if (pc) variantRows.push({ id: pc.id, v: pc, cls, where: `ARMOUR.${cls}.suits.${sid}.pieces.${slot}` });
  }
  for (const r of variantRows) {
    if (r.v.id !== undefined && r.v.id !== r.id) fail(F.data, 'variant', r.where, `id "${r.v.id}"`);
    if (r.suit) continue;
    if (r.v.planned) { if (FAMILY_TIERS[r.id] || r.v.q || r.v.basic) fail(F.data, 'planned variant', r.where, 'name-only (no tiers / skills)'); }
    else if (!FAMILY_TIERS[r.id] || FAMILY_TIERS[r.id].length !== 5) fail(F.items, 'FAMILY_TIERS', r.id, `5 tiers for ${r.where}`);
  }
  for (const [from, to] of Object.entries(VARIANT_RENAME || {})) if (!variantRows.some((r) => r.id === to)) fail(F.data, 'VARIANT_RENAME', from, `target "${to}"`);
  for (const id of Object.keys(FAMILY_TIERS || {})) if (!Object.values(ITEMS).some((l) => l.some((f) => f.id === id))) fail(F.items, 'FAMILY_TIERS', id, 'live family in ITEMS');

  // ---- IMPLICITS and FLAVOR versus base ids (and unique / trinket base / origin ring ids for FLAVOR)
  const trinketIds = [...(TRINKET_BASES || []).map((t) => t.id), ...(ORIGIN_RINGS || []).map((o) => o.id)];
  for (const k of Object.keys(IMPLICITS || {})) if (!baseIds.has(k)) fail(F.itemdata, 'IMPLICITS', k, 'base id');
  for (const k of Object.keys(FLAVOR || {})) {
    if (!baseIds.has(k) && !uniqueList.some((x) => x.id === k) && !trinketIds.includes(k)) fail(F.itemdata, 'FLAVOR', k, 'base, unique, trinket base or origin ring id');
  }
  for (const id of trinketIds) if (!(FLAVOR || {})[id]) fail(F.itemdata, 'trinket', id, 'FLAVOR entry');
  for (const { id } of uniqueList) if (!(FLAVOR || {})[id]) warn(F.itemdata, 'unique', id, 'FLAVOR entry');

  // ---- §19 v2 item ids: affixes, implicits, boons, trinkets, caps (M3 step 2)
  const AFFIX_V2 = get('AFFIX_V2') || { prefix: {}, suffix: {} }, SUFFIX_NOUN = get('SUFFIX_NOUN') || {}, STAT_NAME = get('STAT_NAME') || {};
  const MYTHIC_NAMES = get('MYTHIC_NAMES') || [], CAPS = get('CAPS') || {}, RARITY = get('RARITY') || {};
  const statKey = (k) => Object.prototype.hasOwnProperty.call(STAT_NAME, k);
  for (const kind of ['prefix', 'suffix']) for (const [id, rows] of Object.entries(AFFIX_V2[kind] || {})) {
    if (!statKey(id)) fail(F.itemdata, `affix ${kind}`, id, 'a stat key (items.js STAT_NAME)');
    if (!Array.isArray(rows) || rows.length !== 3) { fail(F.itemdata, `affix ${kind}`, id, '3 named tiers'); continue; }
    rows.forEach((r, i) => {
      if (!r.name || !Array.isArray(r.r) || !(r.r[0] <= r.r[1])) fail(F.itemdata, `affix ${kind}`, `${id}[T${i + 1}]`, 'name + r: [lo, hi]');
      if (i && rows[i - 1].r && r.r && !(r.r[0] >= rows[i - 1].r[1])) fail(F.itemdata, `affix ${kind}`, `${id}[T${i + 1}]`, 'range above the tier below');
      if (r.minRarity && !RARITY[r.minRarity]) fail(F.itemdata, `affix ${kind}`, `${id}.minRarity`, r.minRarity);
    });
    if (kind === 'suffix' && !SUFFIX_NOUN[id]) fail(F.itemdata, 'affix suffix', id, 'SUFFIX_NOUN entry');
    if (kind === 'prefix' && (AFFIX_V2.suffix || {})[id]) fail(F.itemdata, 'affix', id, 'prefix OR suffix, not both');
  }
  for (const k of Object.keys(SUFFIX_NOUN)) if (!(AFFIX_V2.suffix || {})[k]) fail(F.itemdata, 'SUFFIX_NOUN', k, 'AFFIX_V2 suffix id');
  if (MYTHIC_NAMES.length !== 30 || new Set(MYTHIC_NAMES).size !== 30) fail(F.itemdata, 'MYTHIC_NAMES', String(MYTHIC_NAMES.length), '30 distinct names');
  for (const [id, im] of Object.entries(IMPLICITS || {})) if (!statKey(im.stat) || typeof im.v !== 'number') fail(F.itemdata, 'implicit', id, `stat key "${im.stat}"`);
  const trinketRows = [...(TRINKET_BASES || []), ...(TRINKET_UNIQUES || []), ...(WORLD_UNIQUES || [])];
  for (const t of trinketRows) if (t.implicit && (!statKey(t.implicit.stat) || typeof t.implicit.v !== 'number')) fail(F.itemdata, 'trinket implicit', t.id, `stat key "${t.implicit.stat}"`);
  for (const t of TRINKET_BASES || []) {
    if (![1, 2, 3].includes(t.tier) || [1, 16, 32][t.tier - 1] !== t.reqLvl) fail(F.itemdata, 'trinket base', t.id, 'tier 1/2/3 at req 1/16/32');
    if (t.slot === 'belt' && !(t.implicit && t.implicit.stat === 'potionCharge' && t.implicit.v === 1)) fail(F.itemdata, 'belt', t.id, 'implicit +1 potionCharge');
  }
  const trkAll = [...trinketRows.map((t) => t.id), ...(ORIGIN_RINGS || []).map((o) => o.id)], seenTrk = new Set();
  for (const id of trkAll) { if (seenTrk.has(id) || baseIds.has(id) || (UNIQUES || {})[id]) fail(F.itemdata, 'trinket id', id, 'unique across BASES / UNIQUES / trinket tables'); seenTrk.add(id); }
  for (const [slot, list] of Object.entries(BOONS || {})) for (const b of list) {
    if (!b.minor || !b.major || typeof b.text !== 'string') fail(F.itemdata, 'boon', b.id, 'minor + major values and text');
  }
  const EFFECT_IMPL = get('typeof EFFECT_IMPL !== "undefined" ? EFFECT_IMPL : null'), EFFECT_BY_ID = get('typeof EFFECT_BY_ID !== "undefined" ? EFFECT_BY_ID : null');
  if (EFFECT_IMPL && EFFECT_BY_ID) {
    for (const id of Object.keys(EFFECT_IMPL)) if (!(BOONS && Object.values(BOONS).some((l) => l.some((b) => b.id === id))) && !(ORIGIN_RINGS || []).some((o) => o.boon.id === id)) fail(F.game, 'EFFECT_IMPL', id, 'a BOONS / origin boon id');
    for (const list of Object.values(BOONS || {})) for (const b of list) { const r = EFFECT_BY_ID[b.id]; if (!r || r.src !== 'trinket') fail(F.game, 'EFFECTS', b.id, "a src:'trinket' row"); }
    for (const o of ORIGIN_RINGS || []) { const r = EFFECT_BY_ID[o.boon.id]; if (!r || r.src !== 'trinket') fail(F.game, 'EFFECTS', o.boon.id, "a src:'trinket' row"); }
  } else warn(F.game, 'EFFECTS', 'table', 'game.js did not load in the stub context (boon rows unchecked)');
  for (const k of ['cdr', 'crit', 'haste', 'gearPower', 'reactionBonus', 'markCap', 'potions', 'trinketResLine', 'trinketResAll', 'heroResMin', 'heroResMax']) if (typeof CAPS[k] !== 'number') fail(F.itemdata, 'CAPS', k, 'a number');
  // enemy loot pools (enemydata.js `loot`): common_* names must be a LOOT_POOLS key (boss rows carry notes, not pools)
  const LOOT_POOLS = get('LOOT_POOLS') || {};
  for (const [id, e] of Object.entries(ENEMY || {})) if (typeof e.loot === 'string' && /^common_/.test(e.loot) && !LOOT_POOLS[e.loot]) fail('js/enemydata.js', 'loot pool', id, e.loot);
  // world chest markers (level lane contract): loot names a trinket slot, guaranteed names a rarity
  for (const [mid, m] of Object.entries((WORLD_DATA && WORLD_DATA.maps) || {})) {
    const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.t === 'chest') {
      if (o.loot !== undefined && !TRINKET_SLOTS.includes(o.loot)) fail(F.world, 'chest loot', `${mid}@${o.x},${o.y}`, `"${o.loot}" (ring | amulet | belt)`);
      if (o.guaranteed !== undefined && !RARITY[o.guaranteed]) fail(F.world, 'chest guaranteed', `${mid}@${o.x},${o.y}`, `rarity "${o.guaranteed}"`);
    } for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v); } };
    walk(m);
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
