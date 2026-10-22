'use strict';
// ---------------------------------------------------------------------------
// Items, loot, gems, XP and save (docs/design/progression-economy-saves.md, docs/design/items.md, docs/design/weapons-and-skills.md, docs/design/armour-suits.md). ITEMS (data.js) are the live gear FAMILIES (weapon
// variants, armour pieces) that decide skills + sprites; BASES are their tiers. Loaded by index.html and editor.html
// right after data.js (js/itemdata.js follows it): no hud/render/main deps at load time.
//
// ===== ITEM v2: the ONE item object (save v4; FINAL for M3 — the UI, art and level lanes build against this) =========
// Every gear piece and trinket, equipped, in the bag or on the ground, is this plain JSON object (saved as is):
// {
//   id: 'i_42',               instance id, unique per save (newUid). Save v3 called it `uid`.
//   base: 'sunforged',        base id: a BASES key (gear) or a TRINKET_BASES / trinket-unique id (itemdata.js). Never renamed.
//   variant: 'sword',         the family the base belongs to (a FAMILY_TIERS key):
//                               weapon -> variant (§23)  sword | staff | bow      (planned: rapier mace axe hammer halberd
//                                                                                  crossbow chakram spellbook orb daggers claws fans)
//                               chest  -> suit id (§24)  warden | dreamweave | stalker
//                               head / boots -> piece family  knighthelm arcanecowl wardenhood / knightgreaves clothsandals stalkershoes
//                               trinket -> its slot      ring | amulet | belt
//   class: 'blades',          weapon class  blades | greatarms | shots | foci | shadows
//                             armour class  heavy | caster | medium | shadow          trinket: 'trinket'
//   suit: 'warden' | null,    armour only: the §24 suit this piece counts toward (helm/boots too), else null
//   slot: 'weapon',           weapon | head | chest | boots | ring | amulet | belt. Equip keys (player.equip):
//                               weapon head chest boots ring1 ring2 amulet belt  (a 'ring' item goes in ring1 or ring2)
//   tier: 1,                  BASES tier INDEX 0..4 (= design T1..T5; hero.js clamps 0..4). Trinkets 0..2 (= T1..T3).
//                             Mythic is a rarity, not a tier.
//   rarity: 'rare',           common | uncommon | rare | epic | legendary | mythic (RARITY)
//   ilvl: 16,                 item level 1..40
//   req: 14,                  required hero level = max(base req, ilvl - 2) (Mythic >= 36)
//   implicit: { id: 'holyDmg', v: 0.06, text: '+6% holy damage' } | null,
//                             fixed per base (IMPLICITS / TRINKET_BASES, itemdata.js); id = a stat key. statsOf() adds it
//                             (M3 step 2); ids with no engine system yet land in p.sum for M4 (see recalcStats).
//   affixes: [{ id: 'power', tier: 2, v: 0.07, kind: 'P' }, { id: 'hp', tier: 1, v: 40, kind: 'S' }],
//                             id = stat key (AFFIX_V2), tier 1..3 (ilvl gates: T1 1+, T2 14+, T3 28+), v = rolled value in
//                             AFFIX units (percent stats are fractions), kind 'P' prefix | 'S' suffix; prefixes first.
//                             Ring = P only, belt = S only, amulet 1P+1S (§19.4).
//   sockets: [null, 'ruby_2'],  gem ids '<type>_<grade 1..3>' or null (empty). Rings never have sockets.
//   boon: null | { id: 'fireBurn', grade: 'minor'|'major', text: '...' },   trinkets only (BOONS, itemdata.js)
//   rule: null | 'rootcrown', the unique rule id a Legendary/Mythic carries (hook: hasUnique / hasRule); null on others
//   unique: null | 'rootcrown',  the named unique this is (UNIQUES / trinket uniques): it keeps its own name
//   hist: { found: 'pinewood' | null, kills: 0, bossKills: 0 },   §19.3 history; kills count on the equipped weapon only
//   tempered: null | { affix: 'power' },   §19.2: the one affix raised a tier at the Elder Stone (truthy = tempered)
//   name: { prefix: 'Fierce' | null, suffix: 'of the Fox' | null },   §19.3 name parts. Display name (itemName):
//                             unique ? its name : [prefix, BASES name, suffix].join(' '). Mythic suffix from MYTHIC_NAMES.
// }
// The M3 compat mirrors (it.reqLvl / it.uid / affix.stat) are REMOVED (step 2): every reader is on req / id / affix.id.
// compatItem / compatAffix stay as identity seams. makeItem() rolls v2 (§19.1 counts, named tiers, grammar names, boons); makeTestItem(opts) builds a deterministic
// v2 item for UI / art work. itemFlavor(it) = the flavour line (FLAVOR, looked up: not an item field).
// Engine (step 2): makeItem / rollTrinket / makeTrinketUnique / originRing, temperItem / imbueItem (Elder Stone, no UI yet),
// trinkets 15 % of drops once Act I's placements are done (trinketDropsOn), chest markers `loot: ring|amulet|belt`.
// ---------------------------------------------------------------------------
const SLOTS = ['weapon', 'head', 'chest', 'boots'];                 // gear slots (they grant skills; recalc + gems read these)
const TRINKET_SLOTS = ['ring1', 'ring2', 'amulet', 'belt'];          // §19.4 equip keys (passive only; stats land in step 2)
const EQUIP_SLOTS = SLOTS.concat(TRINKET_SLOTS);                      // every player.equip key (save v4)
const TRINKET_KINDS = ['ring', 'amulet', 'belt'];                     // item.slot of a trinket
const equipKeysFor = slot => slot === 'ring' ? ['ring1', 'ring2'] : [slot];
const MAX_LEVEL = 40;
// affixes = the §19.1 count (Common 0 · Uncommon 1 · Rare 1P+1S · Epic 3 · Legendary 2P+2S · Mythic 3P+2S); AFFIX_COUNT splits it
const RARITY = {
  common:    { i: 0, name: 'Common',    col: '#d8d8d8', mult: 1.00, affixes: 0, sockets: [0, 1] },
  uncommon:  { i: 1, name: 'Uncommon',  col: '#6ee36e', mult: 1.15, affixes: 1, sockets: [1, 1] },
  rare:      { i: 2, name: 'Rare',      col: '#5aa8ff', mult: 1.35, affixes: 2, sockets: [1, 2] },
  epic:      { i: 3, name: 'Epic',      col: '#c070ff', mult: 1.60, affixes: 3, sockets: [2, 3] },
  legendary: { i: 4, name: 'Legendary', col: '#ffb030', mult: 1.90, affixes: 4, sockets: [3, 3] },
  mythic:    { i: 5, name: 'Mythic',    col: '#ff4f7a', mult: 2.30, affixes: 5, sockets: [3, 3] },
};
// [P, S] per rarity (§19.1). Uncommon rolls ONE of either kind; Epic is 2P+1S or 1P+2S (makeItem picks).
const AFFIX_COUNT = { common: [0, 0], uncommon: [1, 0], rare: [1, 1], epic: [2, 1], legendary: [2, 2], mythic: [3, 2] };
const RARITIES = Object.keys(RARITY);
function mixHex(a, b, k) { const A = hexToRgb(a), B = hexToRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
// mythic colour-cycles; everything else is its table colour
const rarityCol = (r, t = G.t) => r === 'mythic' ? mixHex('#ff4f7a', '#ffb0f0', 0.5 + 0.5 * Math.sin(t * 3)) : RARITY[r].col;

// ===== bases: 12 live families x 5 tiers (tier 0..4), FAMILY_TIERS keyed by variant / suit / piece family (§23.6).
// Base ids never change (the M2 family names sit at tier 1, L8: 'dawnblade' is the Sword's T2 base). =====
const TIER_REQ = [1, 8, 16, 24, 32], MYTHIC_REQ = 36, TIER_DMG = [0.7, 1, 1.5, 2.1, 2.8];
const TIER_PCT = [0.6, 1, 1.25, 1.5, 1.8], TIER_FLAT = [0.5, 1, 2, 3.2, 4.5];
const FAMILY_TIERS = {
  sword: ['rustyblade:Rusty Blade', 'dawnblade', 'sunforged:Sunforged Blade', 'auroraedge:Aurora Edge', 'dawneternal:Dawn Eternal'],
  staff: ['willowwand:Willow Wand', 'starfall', 'cometrod:Comet Rod', 'nebulasceptre:Nebula Sceptre', 'nighteternal:Night Eternal'],
  bow: ['hunterbow:Hunter\'s Bow', 'moonbow', 'silverwing:Silverwing Bow', 'eclipsebow:Eclipse Longbow', 'mooneternal:Moon Eternal'],
  knighthelm: ['ironcap:Iron Cap', 'knighthelm', 'sunguard:Sunguard Helm', 'auroravisor:Aurora Visor', 'crownofdawn:Crown of Dawn'],
  arcanecowl: ['novicehood:Novice Hood', 'arcanecowl', 'starweave:Starweave Cowl', 'astralcirclet:Astral Circlet', 'crownofstars:Crown of Stars'],
  wardenhood: ['rangercap:Ranger Cap', 'wardenhood', 'mossmantle:Mossmantle Hood', 'thornwarden:Thornwarden Hood', 'crownofroots:Crown of Roots'],
  warden: ['ironmail:Iron Mail', 'knightplate', 'sunplate:Sunforged Plate', 'auroraplate:Aurora Plate', 'dawnaegis:Aegis of Dawn'],
  dreamweave: ['linenrobe:Linen Robe', 'dreamrobe', 'starwoven:Starwoven Robe', 'nebularobe:Nebula Vestments', 'dreamshroud:Eternal Dreamshroud'],
  stalker: ['jerkin:Leather Jerkin', 'stalkerjacket', 'nightcoat:Nightstalker Coat', 'shadowweave:Shadowweave Jacket', 'eclipsegarb:Eclipse Garb'],
  knightgreaves: ['ironboots:Iron Boots', 'knightgreaves', 'sungreaves:Sunforged Greaves', 'auroragreaves:Aurora Greaves', 'dawnstriders:Dawnstriders'],
  clothsandals: ['ropesandals:Rope Sandals', 'clothsandals', 'mistwalkers:Mistwalkers', 'skystep:Skystep Sandals', 'cloudsteps:Eternal Cloudsteps'],
  stalkershoes: ['softshoes:Soft Shoes', 'stalkershoes', 'quietstep:Quietstep Boots', 'shadowstep:Shadowstep Boots', 'eclipsetreads:Eclipse Treads'],
};
const BASES = {};
for (const slot of SLOTS) for (const fam of ITEMS[slot]) FAMILY_TIERS[fam.id].forEach((s, tier) => {
  const [id, name] = s.includes(':') ? s.split(':') : [s, fam.name];
  // family === variant (kept: older readers use b.family); suit = the §24 suit an armour piece counts toward
  BASES[id] = { id, name, slot, family: fam.id, variant: fam.id, class: fam.class, suit: fam.suit || null, tier, reqLvl: TIER_REQ[tier], icon: fam.icon, color: fam.color, kind: fam.kind };
});
const familyOf = base => (baseOf(base) || {}).family;
// trinket bases live in itemdata.js (loaded after this file): resolved lazily, never put in BASES (the gear-only tables)
let TRK_BASES = null;
function trinketBases() {
  if (TRK_BASES) return TRK_BASES;
  if (typeof TRINKET_BASES === 'undefined') return {};
  TRK_BASES = {};
  const add = (t, tier, req) => { TRK_BASES[t.id] = { id: t.id, name: t.name, slot: t.slot, family: t.slot, variant: t.slot, class: 'trinket', suit: null,
    tier, reqLvl: req, icon: t.slot, color: '#d8c8a0', kind: t.slot, implicit: t.implicit || null, unique: t.unique || null, rule: t.rule || null, boon: t.boon || null, origin: t.origin || null }; };
  for (const t of TRINKET_BASES) add(t, clamp((t.tier | 0) - 1, 0, 2), t.reqLvl || 1);
  for (const u of (typeof TRINKET_UNIQUES !== 'undefined' ? TRINKET_UNIQUES : []).concat(typeof WORLD_UNIQUES !== 'undefined' ? WORLD_UNIQUES : []))
    add(Object.assign({}, u, { unique: u.id, rule: u.id }), 1, 16);
  for (const o of typeof ORIGIN_RINGS !== 'undefined' ? ORIGIN_RINGS : []) add(o, 0, 1);
  return TRK_BASES;
}
// any base id -> its base row (gear BASES first, then trinkets)
const baseOf = id => BASES[id] || trinketBases()[id] || null;
const isTrinket = it => !!it && TRINKET_KINDS.includes(it.slot);
// damage types (§5b): the hero resists these; enemies resist all of them + holy
const RES_ELS = ['slash', 'pierce', 'fire', 'frost', 'nature', 'lightning', 'arcane', 'gloom'];
const RES_SHORT = { slash: 'Sl', pierce: 'Pi', fire: 'Fi', frost: 'Fr', nature: 'Na', lightning: 'Li', arcane: 'Ar', gloom: 'Gl' };
const EL_COL = { slash: '#ffffff', pierce: '#e7eeff', fire: '#ff9a4a', frost: '#9fe8ff', nature: '#8fe0a0', lightning: '#fff07a', arcane: '#d6b0ff', holy: '#fff2b0', gloom: '#c070ff' };
const resKey = el => 'res' + el[0].toUpperCase() + el.slice(1);
const PCT_STATS = { def: 1, power: 1, crit: 1, haste: 1, speed: 1, critDmg: 1, cdr: 1, skillDmg: 1, resAll: 1, resHoly: 1,
  statusChance: 1, chargeSpeed: 1, mpOnHit: 1, behindDmg: 1, reflect: 1, fishLuck: 1, onDodge: 1, onKill: 1 };
for (const el of RES_ELS) PCT_STATS[resKey(el)] = 1;
// element damage % (AFFIX_V2 prefixes, implicits, ring boons): one key per damage type, added to that type's hits
const DMG_ELS = ['slash', 'pierce', 'fire', 'frost', 'nature', 'lightning', 'arcane', 'holy', 'shatter'];
for (const el of DMG_ELS) PCT_STATS[el + 'Dmg'] = 1;
function baseStats(b) {
  const fam = item(b.slot, b.family); if (!fam) return {};   // trinkets: no base stats (their implicit is data until step 2)
  if (b.slot === 'weapon') return { dmg: fam.basic.dmg * TIER_DMG[b.tier] };
  const s = {};
  for (const k in fam.stats) s[k] = fam.stats[k] * (PCT_STATS[k] ? TIER_PCT : TIER_FLAT)[b.tier];
  for (const el in fam.res || {}) s[resKey(el)] = fam.res[el];   // chest family's built-in strength/weakness (±25%, flat)
  return s;
}

// ===== affixes + uniques =========================================================
// value at item level L = (a + b*L) * roll(0.6..1)
const AFFIX = { hp: [25, 6], mp: [15, 3], def: [0.02, 0.002], power: [0.045, 0.004], crit: [0.02, 0.0015], haste: [0.03, 0.003],
  regen: [1, 0.25], mpRegen: [0.8, 0.15], speed: [0.1, 0.01], critDmg: [0.1, 0.007], cdr: [0.02, 0.002], skillDmg: [0.04, 0.004] };
for (const el of RES_ELS) AFFIX[resKey(el)] = 'res';   // resistance affixes roll 10-20%, not by level; resAll is legendary-only
const STAT_NAME = { dmg: 'Damage', hp: 'HP', mp: 'MP', def: 'Armour', power: 'Damage', crit: 'Crit chance', haste: 'Attack speed', regen: 'HP/s',
  mpRegen: 'MP/s', speed: 'Move speed', critDmg: 'Crit damage', cdr: 'Cooldowns', skillDmg: 'Skill damage', resAll: 'All res' };
for (const el of RES_ELS) STAT_NAME[resKey(el)] = el[0].toUpperCase() + el.slice(1) + ' res';
for (const el of DMG_ELS) STAT_NAME[el + 'Dmg'] = el[0].toUpperCase() + el.slice(1) + ' damage';
Object.assign(STAT_NAME, { resHoly: 'Holy res', statusChance: 'Status chance', markCap: 'Mark cap', chargeSpeed: 'Charge rate', mpOnHit: 'MP on hit',
  pierce: 'Pierce', stagger: 'Stagger', poise: 'Poise', backstab: 'Backstab arc', behindDmg: 'Damage from behind', reflect: 'Reflect',
  potionCharge: 'Potion charge', fishLuck: 'Fishing luck', onDodge: 'HP on dodge', onKill: 'MP on kill' });
const STAT_ORDER = ['dmg', 'hp', 'mp', 'def', 'power', 'skillDmg', ...DMG_ELS.map(el => el + 'Dmg'), 'crit', 'critDmg', 'haste', 'cdr', 'chargeSpeed', 'statusChance', 'markCap',
  'regen', 'mpRegen', 'speed', 'onDodge', 'onKill', 'resAll', ...RES_ELS.map(resKey), 'resHoly'];
function fmtStat(k, v, sign = true) {
  const sg = sign ? (v >= 0 ? '+' : '-') : '', a = Math.abs(v);
  if (k === 'dmg') return `${sign && v < 0 ? '-' : ''}${Math.round(a)} ${STAT_NAME[k]}`;
  if (k === 'speed') return `${sg}${Math.round(a / 3.7 * 100)}% ${STAT_NAME[k]}`;
  if (k === 'def') return `${sg}${Math.round(a * 100)} ${STAT_NAME[k]}`;   // raw armour points; the sheet shows the resulting Defence %
  if (k.startsWith('res')) return `${sg}${Math.round(a * 100)}% ${STAT_NAME[k]}`;
  if (k === 'cdr') return `${sign ? (v >= 0 ? '-' : '+') : ''}${Math.round(a * 100)}% ${STAT_NAME[k]}`;
  if (PCT_STATS[k]) return `${sg}${Math.round(a * 100)}% ${STAT_NAME[k]}`;
  return `${sg}${a < 10 ? +a.toFixed(1) : Math.round(a)} ${STAT_NAME[k]}`;
}
// Named legendaries (§4.5): first-kill boss drops that change a skill's RULE. Rules are hooks for M4
// (check `hasUnique(p, id)` at the skill); M1 ships the table + drop path. `boss` = map:enemy that guarantees it.
const ECHO_DROP_LVL = 17;   // §30 "drops late (Act III+)": Grotto, the Act III band, starts at L17 (§11)
const UNIQUES = {
  rootcrown: { name: 'Root-Crown', base: 'mossmantle', boss: 'pinewood:bramblehorn', desc: 'Snare and Frost Nova root bosses for 1s.' },
  lanternplate: { name: 'Warden\'s Lantern Plate', base: 'sunplate', boss: 'ruins:boss', desc: 'Bulwark reflects projectiles.' },
  tideedge: { name: 'Tide-Edge', base: 'auroraedge', boss: 'grotto:mirelle', desc: 'Dash Strike leaves a frost trail that slows.' },
  cinderstride: { name: 'Cinderstride Boots', base: 'sungreaves', boss: 'caldera:kharzul', desc: 'Boots skill leaves a fire trail; lava immunity 2s.' },
  morrowbane: { name: 'Morrowbane', base: 'dawneternal', boss: 'spire:morrow', mythic: true, desc: 'R ultimate resets on boss phase change.' },
  // §30 the 19th unique (client decision; the §19.5 cap is 19 from here on): rule 'echo' (game.js ECHO). Not a boss's named drop
  // (boss ''): it is the Act III+ reward (lateUniqueDrop). anyWeapon: it rolls on the finder's own weapon variant at the drop's tier
  // (base = the fallback when there is no hero), so it works with every weapon class.
  echo: { name: 'Twice-Told', base: 'nebulasceptre', boss: '', anyWeapon: true, late: ECHO_DROP_LVL, desc: 'A spirit of you repeats your attacks a breath later (basic, Q, E; never R), retyped to your strongest element.' },
};
const hasUnique = (p, id) => EQUIP_SLOTS.some(s => p.equip[s] && p.equip[s].unique === id);
const hasRule = (p, id) => EQUIP_SLOTS.some(s => p.equip[s] && p.equip[s].rule === id);
const uniqueFor = key => Object.keys(UNIQUES).find(k => UNIQUES[k].boss === key);
// a boss unique (§19.5): the base's implicit + its rule + the rarity's random affixes (v2: 2P+2S; the old fixed +10 % resAll
// line is gone, resAll now rolls as a Legendary+ suffix). It keeps its own name (name parts stay null).
function makeUnique(id, ilvl) {
  const U = UNIQUES[id];
  let base = U.base;
  if (U.anyWeapon) {   // the finder's weapon variant, at the tier the item level allows (T3..T5)
    const p = G.player, fam = p && p.gear && p.equip && p.equip.weapon && FAMILY_TIERS[p.gear.weapon] ? p.gear.weapon : null;
    if (fam) { let t = 2; for (let k = 2; k < 5; k++) if (TIER_REQ[k] <= ilvl) t = k; base = FAMILY_TIERS[fam][t].split(':')[0]; }
  }
  return makeItem(base, U.mythic ? 'mythic' : 'legendary', Math.max(ilvl, BASES[base].reqLvl), { unique: id });
}

// ===== gems (docs/design/items.md) ==========================================================
const GEM_GRADES = ['Chipped', 'Clear', 'Radiant'], GEM_MAX = 3;
const G5 = a => g => a[g - 1];   // per-grade value table (grade 1..3)
// §20.4 gem budget (M2b balsim): Chipped 4 pp, Clear 8, Radiant 14 on the stronger side (1 pp = 1 % DPS or eHP;
// resist 0.01 = 1 pp, hp priced against the L20 base HP). Was Chipped Ruby 12.6 / Clear 28.7 pp.
const GR = g => [0.02, 0.04, 0.07][g - 1];   // armour gem resist (diamond: half, to everything)
const GEMS = {
  ruby: { name: 'Ruby', col: '#ff4a5a', el: 'fire', arm: g => ({ hp: G5([23, 46, 80])(g), resFire: GR(g) }), wpn: g => ({ power: G5([0.04, 0.08, 0.14])(g) }), amp: 'Fire skills' },
  sapphire: { name: 'Sapphire', col: '#4a8cff', el: 'frost', arm: g => ({ mp: G5([20, 55, 110])(g), mpRegen: G5([0.5, 1.5, 3])(g), resFrost: GR(g) }), wpn: g => ({ cdr: G5([0.02, 0.05, 0.08])(g) }), amp: 'Frost skills' },
  emerald: { name: 'Emerald', col: '#3ad67a', el: 'nature', arm: g => ({ regen: G5([1, 3.5, 7])(g), resNature: GR(g) }), wpn: g => ({ haste: G5([0.03, 0.06, 0.1])(g) }), amp: 'Nature skills, heals' },
  topaz: { name: 'Topaz', col: '#ffc83a', el: 'lightning', arm: g => ({ crit: G5([0.01, 0.03, 0.06])(g), resLightning: GR(g) }), wpn: g => ({ critDmg: G5([0.04, 0.08, 0.14])(g) }), amp: 'Lightning skills, +chain' },
  amethyst: { name: 'Amethyst', col: '#b46aff', el: 'arcane', arm: g => ({ power: G5([0.01, 0.02, 0.04])(g), resArcane: G5([0.015, 0.03, 0.05])(g), resGloom: G5([0.015, 0.03, 0.05])(g) }), wpn: g => ({ skillDmg: G5([0.04, 0.08, 0.14])(g) }), amp: 'Arcane skills' },
  diamond: { name: 'Diamond', col: '#e8f4ff', el: null, arm: g => ({ def: G5([0.01, 0.03, 0.06])(g), resAll: GR(g) / 2 }),
    wpn: g => { const v = G5([0.01, 0.02, 0.04])(g); return { power: v, def: v, crit: v / 2, haste: v }; }, amp: 'Ultimate cooldown' },
};
const GEM_TYPES = Object.keys(GEMS);
const gemParse = id => { const [t, g] = String(id).split('_'); return GEMS[t] && +g >= 1 && +g <= GEM_MAX ? { type: t, grade: +g, def: GEMS[t] } : null; };
const gemName = id => { const g = gemParse(id); return g ? `${GEM_GRADES[g.grade - 1]} ${g.def.name}` : '?'; };
const gemStats = (id, slot) => { const g = gemParse(id); return g ? (slot === 'weapon' ? g.def.wpn : g.def.arm)(g.grade) : {}; };
// skill amplification (any slot): grades summed per gem type across all equipped sockets
const EL_GEM = { fire: 'ruby', frost: 'sapphire', nature: 'emerald', lightning: 'topaz', arcane: 'amethyst' };
function gemAmp(p) {
  const a = {}; for (const t of GEM_TYPES) a[t] = 0;
  for (const s of EQUIP_SLOTS) for (const id of (p.equip[s] || { sockets: [] }).sockets) { const g = id && gemParse(id); if (g) a[g.type] += g.grade; }
  if (p.wrap) a[p.wrap.type] += 1;   // belt gemWrap boon: the wrapped gem counts one grade higher (recalcStats)
  return a;
}
// +5% per grade to that element's skills, ADDED to the hit's damage sum. M4 stubs: ruby burn on fireball/meteor,
// sapphire longer slows + nova radius, emerald poison on hit, amethyst area radius (hooks: elementAmp / p.amp).
const elementAmp = (p, el) => 0.05 * ((EL_GEM[el] && p.amp && p.amp[EL_GEM[el]]) || 0);
// diamond: +5 % ultimate charge rate per grade (was -5 % ultimate cooldown before the §15.3 charge bar)
const ultChargeBonus = p => 0.05 * ((p.amp && p.amp.diamond) || 0);
const chainBonus = p => Math.floor(((p.amp && p.amp.topaz) || 0) / 2);
const healMul = p => 1 + 0.06 * ((p.amp && p.amp.emerald) || 0);

// ===== instances (the v2 item object: see the shape block at the top) ================
let UID = 0;
const newUid = () => 'i_' + (++UID);
const rarityAtLeast = (r, min) => RARITY[r].i >= RARITY[min].i;
// §19.1 affix tiers are gated by item level: T1 1+, T2 14+, T3 28+
const AFFIX_TIER_ILVL = [1, 14, 28];
const affixTier = ilvl => ilvl >= AFFIX_TIER_ILVL[2] ? 3 : ilvl >= AFFIX_TIER_ILVL[1] ? 2 : 1;
// prefix (offence / utility) or suffix (defence / sustain), from AFFIX_V2 when itemdata.js is loaded; M2's `mp` is a suffix
const AFFIX_P = ['power', 'crit', 'critDmg', 'haste', 'skillDmg', 'cdr', 'statusChance', 'markCap', 'chargeSpeed'];
const affixKind = id => (typeof AFFIX_V2 !== 'undefined' && AFFIX_V2.prefix[id]) || AFFIX_P.includes(id) || /^[a-z]+Dmg$/.test(id) ? 'P' : 'S';
const mkAffix = (id, v, ilvl, tier) => compatAffix({ id, tier: tier || affixTier(ilvl), v, kind: affixKind(id) });
// the base's fixed implicit (IMPLICITS / trinket rows in itemdata.js), as { id, v, text } — data only until step 2
function implicitOf(base) {
  const t = trinketBases()[base], r = t ? t.implicit : typeof IMPLICITS !== 'undefined' ? IMPLICITS[base] : null;
  return r ? { id: r.stat, v: r.v, text: r.text } : null;
}
const newHist = () => ({ found: null, kills: 0, bossKills: 0 });
// the M3 compat mirrors were removed in step 2; these identity seams keep the call sites (v2Item, applySave) unchanged
const compatAffix = a => a;
const compatItem = it => it;
// the canonical v2 key order (save files diff cleanly); fills every v2 field a partial item lacks
function v2Item(o) {
  const b = baseOf(o.base) || {};
  return compatItem({ id: o.id, base: o.base, variant: o.variant || b.variant || null, class: o.class || b.class || null, suit: o.suit !== undefined ? o.suit : b.suit || null,
    slot: o.slot || b.slot, tier: o.tier != null ? o.tier : b.tier != null ? b.tier : 0, rarity: o.rarity, ilvl: o.ilvl, req: o.req,
    implicit: o.implicit !== undefined ? o.implicit : implicitOf(o.base), affixes: (o.affixes || []).map(compatAffix), sockets: o.sockets || [],
    boon: o.boon || null, rule: o.rule || null, unique: o.unique || null, hist: o.hist || newHist(), tempered: o.tempered || null,
    name: o.name || { prefix: null, suffix: null } });
}
// ===== makeItem v2 (§19.1, §19.3, §19.4) ====================================================================
// Affix rows come from AFFIX_V2 (itemdata.js): row[tier - 1] = { name, r: [lo, hi], minRarity? }. The tier is the ilvl gate
// (affixTier: T1 1+, T2 14+, T3 28+); only temperItem raises it. v is uniform in the tier's range (o.q fixes the quantile).
// Not rolled on drops until their system lands (M4): statusChance, markCap (valid ids for temper / makeTestItem / data).
const AFFIX_DORMANT = ['statusChance', 'markCap'];
// pool weights: element damage % and single resists are niche lines (8 resists would otherwise drown hp / def)
const affixWeight = id => /^res[A-Z]/.test(id) && id !== 'resAll' ? 0.35 : /^[a-z]+Dmg$/.test(id) && id !== 'critDmg' && id !== 'skillDmg' ? 0.5 : 1;
const affixTable = kind => (typeof AFFIX_V2 !== 'undefined' ? AFFIX_V2[kind === 'P' ? 'prefix' : 'suffix'] : null) || {};
const affixRow = (id, kind = affixKind(id)) => affixTable(kind)[id] || null;
const affixAllowed = (id, kind, rarity) => { const row = affixRow(id, kind); return !!row && row.every(t => !t.minRarity || rarityAtLeast(rarity, t.minRarity)); };
// the stored value: percent stats to 3 decimals, flat stats to 0.1 under 10 else whole, markCap whole
function roundAffix(id, v) { return id === 'markCap' ? Math.round(v) : PCT_STATS[id] ? Math.round(v * 1000) / 1000 : v < 10 ? Math.round(v * 10) / 10 : Math.round(v); }
function affixValue(id, tier, q = Math.random(), kind = affixKind(id)) {
  const row = affixRow(id, kind), t = row && row[clamp(tier, 1, 3) - 1]; if (!t) return 0;
  return roundAffix(id, t.r[0] + (t.r[1] - t.r[0]) * clamp(q, 0, 1));
}
function pickWeighted(ids) {
  const tot = ids.reduce((a, id) => a + affixWeight(id), 0); let r = Math.random() * tot;
  for (const id of ids) if ((r -= affixWeight(id)) < 0) return id;
  return ids[ids.length - 1];
}
// [P, S] for an item: §19.1 counts, Uncommon = one of either, Epic = 2P+1S | 1P+2S; ring P only, belt S only, amulet <= 1P+1S
function affixCounts(slot, rarity) {
  let [np, ns] = AFFIX_COUNT[rarity];
  if (rarity === 'uncommon' && Math.random() < 0.5) { np = 0; ns = 1; }
  if (rarity === 'epic' && Math.random() < 0.5) { np = 1; ns = 2; }
  if (slot === 'ring') { np += ns; ns = 0; } else if (slot === 'belt') { ns += np; np = 0; }
  else if (slot === 'amulet') { const n = np + ns; np = Math.min(1, np || (n > 1 ? 1 : 0)); ns = Math.min(1, n - np); }
  return [np, ns];
}
// trinket resist lines never exceed CAPS.trinketResLine (§19.6); recalcStats enforces the resAll total across trinkets
const trinketResCap = () => (typeof CAPS !== 'undefined' ? CAPS.trinketResLine : 0.1);
function rollAffixes(slot, rarity, ilvl, o = {}) {
  const tier = affixTier(ilvl), out = [], q = o.q;
  const push = (id, kind) => { let v = affixValue(id, tier, q != null ? q : Math.random(), kind); if (TRINKET_KINDS.includes(slot) && /^res[A-Z]/.test(id)) v = Math.min(v, trinketResCap()); out.push(compatAffix({ id, tier, v, kind })); };
  if (Array.isArray(o.affixes)) { for (const id of o.affixes) push(id, affixKind(id)); }
  else {
    const [np, ns] = affixCounts(slot, rarity);
    for (const [kind, n] of [['P', np], ['S', ns]]) for (let k = 0; k < n; k++) {
      const ids = Object.keys(affixTable(kind)).filter(id => !AFFIX_DORMANT.includes(id) && affixAllowed(id, kind, rarity) && !out.some(a => a.id === id));
      if (ids.length) push(pickWeighted(ids), kind);
    }
  }
  out.sort((a, c) => (a.kind === 'P' ? 0 : 1) - (c.kind === 'P' ? 0 : 1));   // prefixes first (stable)
  return out;
}
// §19.3 name grammar [prefix-tier name] [base] [of the suffix noun]: Uncommon one part, Rare+ both, Mythic suffix from MYTHIC_NAMES,
// uniques and origin rings keep their own names (parts null). The prefix is the first P affix's tier name, the suffix the first S's noun.
function nameParts(it, mythicSuffix) {
  const b = baseOf(it.base) || {};
  if (it.unique || b.unique || b.origin || it.rarity === 'common') return { prefix: null, suffix: null };
  const P = it.affixes.find(a => a.kind === 'P'), S = it.affixes.find(a => a.kind === 'S'), row = P && affixRow(P.id, 'P');
  const pre = row && row[P.tier - 1] ? row[P.tier - 1].name : null;
  const suf = it.rarity === 'mythic' ? mythicSuffix || (it.name && it.name.suffix) || (typeof MYTHIC_NAMES !== 'undefined' ? pick2(MYTHIC_NAMES) : null)
    : S && typeof SUFFIX_NOUN !== 'undefined' && SUFFIX_NOUN[S.id] ? 'of the ' + SUFFIX_NOUN[S.id] : null;
  return it.rarity === 'uncommon' ? { prefix: pre, suffix: pre ? null : suf } : { prefix: pre, suffix: suf };
}
// the flavour line (§19.3): one per base, unique, trinket base and origin ring (FLAVOR, itemdata.js). Looked up, never stored.
const itemFlavor = it => (typeof FLAVOR !== 'undefined' && it && (FLAVOR[it.unique] || FLAVOR[it.base])) || '';
// boon rows by id: BOONS (per slot) + the origin rings' fixed boons
let BOON_ROWS = null;
function boonRow(id) {
  if (!BOON_ROWS) { BOON_ROWS = {}; if (typeof BOONS !== 'undefined') for (const slot in BOONS) for (const r of BOONS[slot]) BOON_ROWS[r.id] = Object.assign({ slot }, r);
    if (typeof ORIGIN_RINGS !== 'undefined') for (const o of ORIGIN_RINGS) BOON_ROWS[o.boon.id] = Object.assign({ slot: 'ring', origin: o.origin }, o.boon); }
  return BOON_ROWS[id] || null;
}
// a trinket's boon (§19.4): Uncommon minor, Rare+ major; origin rings carry their fixed boon. Random drops only roll boons
// whose system runs today (boonLive, game.js EFFECTS); the data-only rows stay valid ids (makeTestItem, M4).
function rollBoon(b, rarity, want) {
  if (!TRINKET_KINDS.includes(b.slot) || rarity === 'common') return null;
  const grade = rarity === 'uncommon' ? 'minor' : 'major';
  if (b.boon) return { id: b.boon.id, grade, text: b.boon.text };
  const rows = typeof BOONS !== 'undefined' ? BOONS[b.slot] || [] : [];
  const live = rows.filter(r => typeof boonLive !== 'function' || boonLive(r.id));
  const row = (want && rows.find(r => r.id === want)) || pick2(live.length ? live : rows);
  return row ? { id: row.id, grade, text: row.text } : null;
}
// sockets: the rarity's range, its max only from ilvl 20 (§19.1); rings 0, amulet / belt 0..1 (Rare+ always 1)
function rollSockets(slot, rarity, ilvl) {
  if (slot === 'ring') return 0;
  if (TRINKET_KINDS.includes(slot)) return rarityAtLeast(rarity, 'rare') ? 1 : Math.random() < (rarity === 'common' ? 0.25 : 0.5) ? 1 : 0;
  const [s0, s1] = RARITY[rarity].sockets, hi = ilvl >= 20 ? s1 : Math.max(s0, s1 - 1);
  return rarity === 'common' ? (Math.random() < 0.25 ? 1 : 0) : s0 + ((Math.random() * (hi - s0 + 1)) | 0);
}
// makeItem(base, rarity, ilvl, o): any gear or trinket base. o (all optional): sockets (count) · affixes ([ids], kinds inferred)
// · q (0..1 roll quantile, balsim) · boon (a BOONS id) · unique (sets unique + rule; the name parts stay null) · mythicName
function makeItem(base, rarity = 'common', ilvl, o = {}) {
  const b = baseOf(base); if (!b) throw new Error('makeItem: unknown base ' + base);
  ilvl = clamp(Math.round(ilvl || b.reqLvl), 1, MAX_LEVEL);
  const req = clamp(Math.max(b.reqLvl, ilvl - 2, rarity === 'mythic' ? MYTHIC_REQ : 0), 1, MAX_LEVEL);
  const uq = o.unique || b.unique || null;
  const it = v2Item({ id: newUid(), base, rarity, ilvl, req, affixes: rollAffixes(b.slot, rarity, ilvl, o), sockets: [],
    boon: rollBoon(b, rarity, o.boon), rule: uq, unique: uq });
  it.name = nameParts(it, o.mythicName);
  const ns = o.sockets != null ? o.sockets : rollSockets(b.slot, rarity, ilvl);
  for (let i = 0; i < ns; i++) it.sockets.push(null);
  return it;
}
// ===== trinkets (§19.4): rollTrinket (drops), makeTrinketUnique (vaults / chests), originRing (the free starter ring) =====
const TRINKET_REQ = [1, 16, 32];
function rollTrinket(lvl, rarity, slot) {
  slot = TRINKET_KINDS.includes(slot) ? slot : pick2(['ring', 'ring', 'amulet', 'belt']);
  const list = Object.values(trinketBases()).filter(t => t.slot === slot && !t.unique && !t.origin).sort((a, c) => a.tier - c.tier);
  let k = 0; list.forEach((t, i) => { if (t.reqLvl <= lvl + 1) k = i; });
  if (k > 0 && Math.random() < 0.25) k--;
  return makeItem(list[k].id, rarity, lvl + (Math.random() < 0.3 ? 1 : 0));
}
// a trinket / world unique (§19.5): Legendary, its fixed implicit + rule, a major boon from its slot, 2 random affixes
const makeTrinketUnique = (id, ilvl) => makeItem(id, 'legendary', Math.max(ilvl || 16, trinketBases()[id].reqLvl));
// §17.1 + §19.4: the Origin passive is the starter ring's boon. Origins are not chosen in code yet, so the origin follows the
// starting weapon's class (a new game starts with the Rusty Blade -> blades -> Knight).
const ORIGIN_OF_CLASS = { blades: 'knight', foci: 'mystic', shots: 'ranger', shadows: 'thief', greatarms: 'warrior' };
function originRing(weaponBase) {
  const b = baseOf(weaponBase), id = 'origin_' + (ORIGIN_OF_CLASS[b && b.class] || 'knight');
  return trinketBases()[id] ? makeItem(id, 'uncommon', 1, { affixes: [], sockets: 0 }) : null;
}
// base + affix + unique + gem stats of one instance (summed)
function itemBase(it) {
  const b = baseOf(it.base), R = RARITY[it.rarity], k = R.mult * (1 + 0.015 * Math.max(0, it.ilvl - b.reqLvl)), base = {};
  const bs = baseStats(b); for (const st in bs) base[st] = st === 'dmg' ? Math.round(bs[st] * k) : st.startsWith('res') ? bs[st] : bs[st] * k;
  return base;
}
// one instance's stats: base + implicit + affixes + socketed gems, summed per stat (additive, §3 balance rule). Implicits
// apply from M3 step 2; boons, resonance and the belt's gem wrap are player-level (recalcStats), never per item.
function statsOf(it) {
  const s = {}, add = (k, v) => { s[k] = (s[k] || 0) + v; }, base = itemBase(it);
  for (const k in base) add(k, base[k]);
  if (it.implicit && it.implicit.id && typeof it.implicit.v === 'number') add(it.implicit.id, it.implicit.v);
  for (const a of it.affixes) add(a.id, a.v);
  for (const g of it.sockets) if (g) { const gs = gemStats(g, it.slot); for (const k in gs) add(k, gs[k]); }
  return s;
}
// display name (§19.3): a unique keeps its own name, everything else is [prefix] base [suffix]
function itemName(it) {
  if (it.unique && UNIQUES[it.unique]) return UNIQUES[it.unique].name;
  const b = baseOf(it.base), n = it.name || {};
  return [n.prefix, b ? b.name : it.base, n.suffix].filter(Boolean).join(' ');
}
// §20.6: main-path Dust ~900-1,200. sheets.js modelled ~2,820 (50 drops/zone) and suggested / 2.4; balsim's main path
// (40 kills + 3 chests + 2 elites + 7 trigger loot cards per band + bosses, 80 % salvaged) gives ~2,470 at / 1, so
// / 2.3 lands on ~1,080
const SALVAGE_DIV = 2.3;
// p (optional): the belt's salvageDust boon multiplies it (game.js EFFECTS, p.sum.salvageDust)
const salvageValue = (it, p) => Math.max(1, Math.round([1, 3, 8, 20, 50, 120][RARITY[it.rarity].i] * (1 + it.ilvl / 10) / SALVAGE_DIV * ((p && p.sum && p.sum.salvageDust) || 1)));
// renderer hook for M2: what the hero visibly wears in a slot
// slot: any EQUIP_SLOTS key. family === variant (hero.js reads `family`).
function equippedVisual(slot, p = G.player) {
  const it = p && p.equip[slot]; if (!it) return null;
  const b = baseOf(it.base); if (!b) return null;
  return { family: b.variant, variant: b.variant, class: b.class, suit: b.suit, tier: b.tier, rarity: it.rarity, gems: it.sockets.filter(Boolean), tempered: !!it.tempered, element: it.implicit && /Dmg$/.test(it.implicit.id) ? it.implicit.id.slice(0, -3) : null };
}

// ===== icon routing: the ONE place to swap in js/icons.js (ICONS.*) later =============
const itemIcon = it => { const b = baseOf(it.base) || { icon: 'chest', color: '#ffffff' }; return icon(b.icon, b.color); };
const gemIcon = (type, grade) => icon('gem', GEMS[type].col);
const miscIcon = name => icon(name, { potion: '#ff6a8a', dust: '#c7a8ff', chest: '#c08a5e', xp: '#b48aff' }[name] || '#ffffff');
const skillIcon = id => icon(SKILLS[id].icon, SKILLS[id].color);
const buffIcon = id => icon(BUFFS[id].icon, BUFFS[id].color);
function drawIcon(ctx, img, x, y, s) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, Math.round(x), Math.round(y), s, s); }
function drawRarityFrame(ctx, x, y, s, rarity, t = G.t) {
  const c = rarityCol(rarity, t), R = RARITY[rarity];
  ctx.fillStyle = rgba(c, 0.10 + R.i * 0.03); ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
  if (R.i >= 4) { const k = (t * 0.6) % 1; ctx.fillStyle = rgba('#ffffff', 0.5); ctx.fillRect(x + 2 + Math.round((s - 6) * k), y + 2, 2, 2); ctx.fillRect(x + s - 4 - Math.round((s - 6) * k), y + s - 4, 2, 2); }
}

// ===== XP / levels (docs/design/progression-economy-saves.md) ===========================================================

const xpToNext = L => Math.round(60 * Math.pow(L, 1.55));
function gainXp(p, n) {
  if (p.level >= MAX_LEVEL || n <= 0) return;
  p.xp += n; text(p.x, p.y, p.z + 3.6, `+${n} XP`, '#c79bff');
  let up = false;
  while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) { p.xp -= xpToNext(p.level); p.level++; up = true; }
  if (p.level >= MAX_LEVEL) p.xp = 0;
  if (up) levelUpFx(p);
}
function levelUpFx(p) {
  recalcStats(p, true);   // full heal
  G.banner = { s: `LEVEL ${p.level}`, sub: '+4% HP   +3% damage   fully healed', t: 2.8, max: 2.8, lvl: true };
  sfx('levelup'); shake(3);
  fx({ type: 'pillar', x: p.x, y: p.y, col: '#ffe9a0', life: 0.8, r: 1.1 });
  fx({ type: 'ring', x: p.x, y: p.y, r: 2.2, col: '#ffd35a', life: 0.6 });
  burst(p.x, p.y, p.z + 1, 40, ['#fff6d6', '#ffd35a', '#c79bff', '#ffffff'], 3.5);
}

// ===== zone + enemy levels ===================================================================
// world map records may carry "level": [min, max]; editor-made maps without it default to the full range
const zoneLevel = (id = G.map && G.map.id) => { const l = G.world && G.world.maps[id] && G.world.maps[id].level; return Array.isArray(l) ? [+l[0] || 1, +l[1] || MAX_LEVEL] : [1, MAX_LEVEL]; };
function enemyClass(type) { const d = ENEMY[type] || {}; return d.ai === 'boss' ? 'boss' : (d.cls === 'elite' || d.elite || (d.cls == null && d.hp >= 1000)) ? 'elite' : 'normal'; }
// an instance: elite spawns (parts.js makeElite) count as elites
const enemyClassOf = e => (e.elite && !e.boss ? 'elite' : enemyClass(e.type));
// enemies track the hero inside the zone band; elites +2, bosses sit at the top of the band
// §26.2 elite pockets: a map's `levelAreas` [{ x, y, r, level }] pin the level enemies spawn at while the hero stands inside (the boss's
// level; elites still +2): a pocket's pack is spawned by its own enter card, so the hero is in its area when it spawns
function enemyLevel(type) {
  const [a, b] = zoneLevel(), c = enemyClass(type), d = ENEMY[type] || {}, p = G.player, LA = p && G.map && ((G.world.maps[G.map.id] || {}).levelAreas || []).find(z => Math.hypot(p.x - z.x, p.y - z.y) < z.r), L = LA ? +LA.level : p ? p.level : a;
  if (c === 'boss' && d.level) return clamp(+d.level, 1, MAX_LEVEL);   // bosses.js rows carry their story level
  return clamp(c === 'boss' ? b : L + (c === 'elite' ? 2 : 0), a, b);
}
// §20.3 (M2b balsim): ~1.09 per level tracks the measured reference-hero DPS (L1 -> L38 x23); was 0.6 x 1.1^(L-1)
const enemyHpMul = L => Math.pow(1.09, L - 1);
// §20.3 survival (M2b balsim): standing in 3 commons on Normal kills the reference hero in 10-14 s -> x ENEMY_DMG_K
const ENEMY_DMG_K = 4;   // M2a damage x4: ~12 s in 3 commons at Pinewood L7 and Ruins L13 (was ~50 s)
const enemyDmgMul = L => ENEMY_DMG_K * 0.7 * Math.pow(1.06, L - 1);
// kill XP (§20.3): a common gives row.xp (default hp/1300, capped) of its level's bar, an elite spawn x ELITE_XP;
// a guardian gives one full level of the HERO's bar and a mini-boss half (row xp overrides). Band ceiling: once the
// hero is 3+ levels above the zone band's top, commons give 10 %.
const ELITE_XP = 3, XP_CEILING_GAP = 3, XP_CEILING_MUL = 0.1;
function killXp(e) {
  const d = ENEMY[e.type] || {}, c = enemyClassOf(e), p = G.player;
  if (c === 'boss') return Math.max(1, Math.round(xpToNext(p.level) * (d.xp != null ? +d.xp : d.kind === 'mini' ? 0.5 : 1)));
  const k = (d.xp != null ? +d.xp : clamp((d.hp || 100) / 1300, 0.06, 1.2)) * (e.elite && enemyClass(e.type) !== 'elite' ? ELITE_XP : 1);
  const top = zoneLevel()[1], ceil = p.level >= top + XP_CEILING_GAP ? XP_CEILING_MUL : 1;
  return Math.max(1, Math.round(xpToNext(e.lvl) * k * ceil));
}

// ===== loot rolls ===============================================================================
// first run: no random legendary/mythic — legendaries are the named first-kill uniques, mythic is Morrow's (NG+ later)
const RARITY_W = { normal: [62, 29, 7.5, 1.5, 0, 0], elite: [18, 44, 30, 8, 0, 0], chest: [20, 46, 27, 7, 0, 0], boss: [0, 0, 65, 35, 0, 0] };
function rollRarity(cls, lvl) {
  const w = RARITY_W[cls].map((v, i) => v * Math.pow(1 + lvl * 0.04, i));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);   // zone level shifts weight up the table
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return RARITIES[i];
  return 'common';
}
// §19.4: after the Act I placements (the first ring, Bramblehorn's amulet, the vault belt) trinkets are 15 % of item drops.
// "After" = the amulet chest has been opened (G.prog.secrets['trinket:amulet'], set by openChest) or the hero is past Act I (L10+).
const TRINKET_DROP = 0.15, TRINKET_DROP_LVL = 10;
const trinketDropsOn = (p = G.player) => !!((G.prog && G.prog.secrets && G.prog.secrets['trinket:amulet']) || (p && p.level >= TRINKET_DROP_LVL));
function rollItem(lvl, rarity, slot) {
  const p = G.player;
  if (TRINKET_KINDS.includes(slot) || (!slot && trinketDropsOn(p) && Math.random() < TRINKET_DROP)) return rollTrinket(lvl, rarity, slot);
  slot = slot || pick2(['weapon', 'weapon', 'head', 'chest', 'boots', 'head', 'chest', 'boots']);
  // 40% of drops stay in the families you already wear
  const fams = ITEMS[slot].map(f => f.id), fam = p && p.equip && p.equip[slot] && p.gear[slot] && Math.random() < 0.4 ? p.gear[slot] : pick2(fams);   // an empty slot (§28) biases nothing
  let tier = 0; for (let t = 0; t < 5; t++) if (TIER_REQ[t] <= lvl + 1) tier = t;
  if (tier > 0 && Math.random() < 0.25) tier--;
  if (tier === 4 && !rarityAtLeast(rarity, 'legendary')) tier = 3;   // the Eternal tier is legendary+
  const base = FAMILY_TIERS[fam][tier].split(':')[0];
  return makeItem(base, rarity, lvl + (Math.random() < 0.3 ? 1 : 0));
}
const rollGem = lvl => `${pick2(GEM_TYPES)}_${clamp(1 + Math.floor((lvl + frand(-3, 4)) / 10), 1, GEM_MAX)}`;
// what an enemy leaves behind: [{ kind:'item'|'gem'|'potion', it?, gem? }]
// `unique`: named legendary id for a boss's first kill
function rollLoot(cls, lvl, unique, pool) {
  const P = LOOT_POOLS[pool], out = [], itm = r => { let it = rollItem(lvl, r); for (let k = 0; P && P.exclude && P.exclude.includes(it.base) && k < 8; k++) it = rollItem(lvl, r); out.push({ kind: 'item', it }); };
  if (cls === 'boss') {
    if (unique) out.push({ kind: 'item', it: makeUnique(unique, lvl) });
    itm(rollRarity('boss', lvl)); itm(rollRarity('boss', lvl)); itm(rollRarity('elite', lvl));
    out.push({ kind: 'gem', gem: rollGem(lvl + 4) }, { kind: 'gem', gem: rollGem(lvl) }, { kind: 'potion' });
  } else if (cls === 'elite') {
    itm(rollRarity('elite', lvl)); if (Math.random() < 0.5) itm(rollRarity('elite', lvl));
    if (Math.random() < 0.4) out.push({ kind: 'gem', gem: rollGem(lvl) });
    if (Math.random() < 0.3) out.push({ kind: 'potion' });
  } else if (cls === 'chest') {
    itm(rollRarity('chest', lvl)); itm(rollRarity('chest', lvl));
    if (Math.random() < 0.7) out.push({ kind: 'gem', gem: rollGem(lvl) });
    out.push({ kind: 'potion' });
  } else {
    if (Math.random() < 0.24) itm(rollRarity('normal', lvl));
    if (Math.random() < 0.08) out.push({ kind: 'gem', gem: rollGem(lvl) });
    if (Math.random() < 0.06) out.push({ kind: 'potion' });
  }
  return out;
}
// The Vale's first chest (the tutorial chest, `starter: true`, ~2:00; director ruling M3): a fixed Common Iron Mail with
// 1 socket, the Origin ring for the starting class (§17.1 / §19.4: the Origin passive is that ring's boon) and a Chipped gem.
function starterLoot(p = G.player) {
  const w = p && p.equip && p.equip.weapon, ring = originRing(w ? w.base : 'rustyblade');
  return [{ kind: 'item', it: makeItem('ironmail', 'common', 1, { sockets: 1, affixes: [] }) }].concat(ring ? [{ kind: 'item', it: ring }] : [], [{ kind: 'gem', gem: 'ruby_1' }]);
}
// Enemy loot pools (enemydata.js `loot`): a common's item drops re-roll any base in `exclude` (the starter kit's bases, so a
// slime never drops a duplicate Rusty Blade). Rows naming an unknown pool fall back to the plain table (validate-ids flags them).
const STARTER_BASES = ['rustyblade', 'ironcap', 'ironmail', 'ironboots'];
const LOOT_POOLS = { common_vale: { exclude: STARTER_BASES }, common_pinewood: { exclude: STARTER_BASES } };

// ===== bag ==========================================================================================
const BAG_SIZE = 30, MAX_POTIONS = 3;
// bag entries: item instances, or gem stacks { gem: 'ruby_2', n }
function bagAdd(p, e) {
  if (e.gem) { const s = p.bag.find(b => b && b.gem === e.gem); if (s) { s.n += e.n || 1; return true; } }
  const i = p.bag.findIndex(b => !b); if (i < 0) return false;
  p.bag[i] = e.gem ? { gem: e.gem, n: e.n || 1 } : e; return true;
}
const bagFull = (p, gem) => !p.bag.some(b => !b) && !(gem && p.bag.some(b => b && b.gem === gem));
function takeGem(p, i) { const s = p.bag[i]; if (!s || !s.gem) return null; const id = s.gem; if (--s.n <= 0) p.bag[i] = null; return id; }

// ===== the inventory seams: each returns '' on success or the reason it refused ======================
const isEquipped = (p, it) => EQUIP_SLOTS.some(s => p.equip[s] === it);
// the equip key an item goes to: its slot; a ring fills an empty ring slot first, else replaces the WEAKER ring (rarity, then
// item level, then ring1). Every keyless path (clickBag, pad / touch) follows this; the inventory's pick mode passes a key.
const ringScore = it => (it ? RARITY[it.rarity].i * 100 + it.ilvl : -1);
function equipKey(p, it) {
  const ks = equipKeysFor(it.slot); if (ks.some(k => p.equip[k] === it)) return ks.find(k => p.equip[k] === it);
  const empty = ks.find(k => !p.equip[k]); if (empty || ks.length === 1) return empty || ks[0];
  return ks.reduce((w, k) => (ringScore(p.equip[k]) < ringScore(p.equip[w]) ? k : w), ks[0]);
}
function equipItem(p, inst, key) {
  if (!inst || !baseOf(inst.base)) return 'Nothing to equip';
  if (inst.req > p.level) return `Requires level ${inst.req}`;
  key = key && equipKeysFor(inst.slot).includes(key) ? key : equipKey(p, inst);
  const i = p.bag.indexOf(inst), old = p.equip[key];
  if (old === inst) return '';
  p.equip[key] = inst;
  if (i >= 0) p.bag[i] = old || null; else if (old && !bagAdd(p, old)) { p.equip[key] = old; return 'Bag full'; }
  recalcStats(p, false); return '';
}
// gem from bag stack `bi` into socket `si` of `it` (first empty when si is null); a filled socket swaps
function socketGem(p, it, si, bi) {
  if (!p.bag[bi] || !p.bag[bi].gem) return 'Pick a gem first';
  if (si == null) si = it.sockets.indexOf(null);
  if (si < 0 || si >= it.sockets.length) return it.sockets.length ? 'No empty socket' : 'This item has no sockets';
  const gem = p.bag[bi].gem;
  if (it.sockets[si]) { const r = unsocketGem(p, it, si); if (r) return r; }
  const k = p.bag.findIndex(b => b && b.gem === gem); takeGem(p, k);
  it.sockets[si] = gem; recalcStats(p, false); return '';
}
function unsocketGem(p, it, si) {
  const g = it.sockets[si]; if (!g) return '';
  if (!bagAdd(p, { gem: g })) return 'Bag full';
  it.sockets[si] = null; recalcStats(p, false); return '';
}
// gear -> Dream Dust; socketed gems return to the bag first. Returns the dust gained, or a reason string.
function salvageItem(p, bi) {
  const it = p.bag[bi]; if (!it || it.gem) return 'Only gear can be salvaged';
  for (let k = 0; k < it.sockets.length; k++) if (it.sockets[k]) { if (!bagAdd(p, { gem: it.sockets[k] })) return 'Bag full'; it.sockets[k] = null; }
  p.bag[bi] = null; const v = salvageValue(it, p); p.dust += v; return v;
}
// 3 gems of one kind and grade -> 1 of the next grade (bag stack `bi`). Returns '' or the reason it refused.
function combineGems(p, bi) {
  const e = p.bag[bi]; if (!e || !e.gem) return 'Pick a gem stack first';
  const g = gemParse(e.gem); if (!g) return 'Unknown gem';
  if (g.grade >= GEM_MAX) return 'Already the best grade';
  if (e.n < 3) return `Need 3 ${gemName(e.gem)} (have ${e.n})`;
  const next = `${g.type}_${g.grade + 1}`;
  e.n -= 3; if (e.n <= 0) p.bag[bi] = null;
  if (!bagAdd(p, { gem: next })) { if (p.bag[bi]) p.bag[bi].n += 3; else p.bag[bi] = { gem: e.gem, n: 3 }; return 'Bag full'; }
  return '';
}
// ===== Elder Stone crafting, engine only (§19.2; the panel is M5). Both return '' on success or the reason they refused. =====
// temperItem(it, affixId, p): raise ONE affix by one tier (T1 -> T2 -> T3), once per item, for Dust by rarity (Rare 20 /
// Epic 60 / Legendary+ 150; Common and Uncommon cannot be tempered). The roll keeps its place in the range (quantile), the
// name prefix follows the new tier, it.tempered = { affix }. imbueItem(it, p): one more socket up to the rarity's max (rings
// never; amulet / belt 1), for IMBUE_COST Dust by rarity.
const TEMPER_COST = { rare: 20, epic: 60, legendary: 150, mythic: 150 };
const IMBUE_COST = { common: 30, uncommon: 30, rare: 60, epic: 100, legendary: 150, mythic: 150 };
function temperItem(it, affixId, p = G.player) {
  if (!it || it.gem || !baseOf(it.base)) return 'Nothing to temper';
  const cost = TEMPER_COST[it.rarity]; if (!cost) return 'Only Rare or better can be tempered';
  if (it.tempered) return 'Already tempered';
  const a = it.affixes.find(x => x.id === affixId); if (!a) return 'No such affix';
  const row = affixRow(a.id, a.kind); if (!row) return 'This affix has no tiers';
  if (a.tier >= 3) return 'Already the highest tier';
  if ((p.dust || 0) < cost) return `Needs ${cost} Dust`;
  const lo = row[a.tier - 1].r, hi = row[a.tier].r, q = lo[1] > lo[0] ? clamp((a.v - lo[0]) / (lo[1] - lo[0]), 0, 1) : 0.5;
  a.tier++; a.v = affixValue(a.id, a.tier, q, a.kind);
  if (isTrinket(it) && /^res[A-Z]/.test(a.id)) a.v = Math.min(a.v, trinketResCap());
  it.tempered = { affix: a.id }; it.name = nameParts(it);
  p.dust -= cost;
  if (isEquipped(p, it)) recalcStats(p, false);
  return '';
}
const maxSocketsOf = it => it.slot === 'ring' ? 0 : TRINKET_KINDS.includes(it.slot) ? 1 : RARITY[it.rarity].sockets[1];
function imbueItem(it, p = G.player) {
  if (!it || it.gem || !baseOf(it.base)) return 'Nothing to imbue';
  if (it.slot === 'ring') return 'Rings cannot hold sockets';
  if (it.sockets.length >= maxSocketsOf(it)) return 'No room for another socket';
  const cost = IMBUE_COST[it.rarity];
  if ((p.dust || 0) < cost) return `Needs ${cost} Dust`;
  it.sockets.push(null); p.dust -= cost;
  if (isEquipped(p, it)) recalcStats(p, false);
  return '';
}
// bag sort: gear by rarity (best first) then slot then item level, gems last (grouped by type and grade)
function sortBag(p) {
  const rank = e => e.gem ? 1000 : -RARITY[e.rarity].i * 100 - e.ilvl / 100;
  const slotI = e => e.gem ? 0 : ['weapon', 'head', 'chest', 'boots', 'ring', 'amulet', 'belt'].indexOf(e.slot);
  const list = p.bag.filter(Boolean).sort((a, b) => rank(a) - rank(b) || slotI(a) - slotI(b) || (a.gem ? String(a.gem).localeCompare(b.gem) : 0));
  p.bag = list.concat(new Array(BAG_SIZE - list.length).fill(null));
}
// trigger action `loot`: N items of at least `rarity` at x,y (default: beside the hero) — room-clear rewards; `slot` fixes the
// item slot (§28 ~9:00: the Gnarlroot elite's Rare is a WEAPON, so the stat jump is felt on LMB)
// item: '<gear base>' (§28, the garden ambush's Iron Boots): that fixed piece (Common unless `rarity`), no random roll (count 0
// by default); it is put on if its slot is empty. A hero who already wears that slot (a save from before §28) gets the old
// room-clear roll instead: one item of `fallback` (default Uncommon).
// §26.2 elite pockets (the first-clear guarantee): `ilvl` floors the item level (boss ilvl - 2) and `slot: 'upgrade'` picks a gear
// slot the hero can use, rotating: among the slots no earlier pocket guarantee filled (G.prog.secrets['pocket:slots'], reset once all
// four had one), the first in stat-weight order weapon > chest > head > boots whose worn piece the drop would beat (empty, a lower
// tier than the hero can wear now, below Rare, or ilvl < L - 2), else the first left; it is rolled in the family the hero wears
// there (gear slots grant the skills). Weapon first: the tier step (TIER_DMG 0.7 -> 1) is what moves a -1 tier hero (balsim).
const POCKET_ORDER = ['weapon', 'chest', 'head', 'boots'];
const wearTier = lvl => { let t = 0; for (let k = 0; k < 4; k++) if (TIER_REQ[k] <= lvl) t = k; return t; };
function upgradeSlot(p, L) {
  const S = G.prog.secrets || (G.prog.secrets = {}), done = (S['pocket:slots'] || '').split(',').filter(Boolean);
  let free = POCKET_ORDER.filter(k => !done.includes(k)); if (!free.length) { free = POCKET_ORDER.slice(); done.length = 0; }
  const beats = k => { const it = p.equip[k], b = it && BASES[it.base]; return !it || !b || b.tier < wearTier(p.level) || !rarityAtLeast(it.rarity, 'rare') || (it.ilvl || 0) < L - 2; };
  const slot = free.find(beats) || free[0];
  done.push(slot); S['pocket:slots'] = done.join(',');
  return slot;
}
function rollUpgrade(p, L, r, slot) {
  const fam = p.gear && FAMILY_TIERS[p.gear[slot]] ? p.gear[slot] : null;
  if (!fam) return rollItem(L, r, slot);
  const tier = wearTier(p.level);   // the best tier the hero can wear NOW (never the +1 look-ahead; the Eternal tier is legendary+, never here)
  return makeItem(FAMILY_TIERS[fam][tier].split(':')[0], r, Math.min(L, p.level + 2));   // req = ilvl - 2 stays <= the hero's level
}
function lootAction(a) {
  const p = G.player, [lo, hi] = zoneLevel(), L = Math.max(clamp(p.level, lo, hi), +a.ilvl || 0), list = [];
  const gearBase = a.item && BASES[a.item] ? a.item : null, gearFree = gearBase && !p.equip[BASES[gearBase].slot];
  const min = RARITY[a.rarity] ? a.rarity : 'uncommon', rmin = gearBase && !gearFree ? (RARITY[a.fallback] ? a.fallback : 'uncommon') : min;
  const n = gearBase ? (gearFree ? (+a.count || 0) : Math.max(1, +a.count || 0)) : clamp(+a.count || 1, 1, 12);
  if (gearFree) list.push({ kind: 'item', it: makeItem(gearBase, RARITY[a.rarity] ? a.rarity : 'common', 1, { sockets: 0, affixes: [] }), equip: true });
  for (let i = 0; i < clamp(n, 0, 12); i++) { let r = rollRarity('elite', L); if (!rarityAtLeast(r, rmin)) r = rmin; const it = a.slot === 'upgrade' ? rollUpgrade(p, L, r, upgradeSlot(p, L)) : rollItem(L, r, SLOTS.includes(a.slot) || TRINKET_KINDS.includes(a.slot) ? a.slot : undefined); if (+a.sockets > 0) it.sockets = Array(Math.min(3, +a.sockets)).fill(null); list.push({ kind: 'item', it }); }
  // generator extras: gem: true · chest: 'gold' | 'silver' (one more item, a better gem) · item: key_* | socket_rune | unique id
  if (a.gem) list.push({ kind: 'gem', gem: rollGem(L) });
  if (a.chest === 'gold' || a.chest === 'silver') { list.push({ kind: 'item', it: rollItem(L, a.chest === 'gold' ? 'epic' : 'rare') }); if (a.chest === 'gold') list.push({ kind: 'gem', gem: rollGem(L + 5) }); }
  if (a.item) {
    if (/^key_/.test(a.item)) { const S = G.prog.secrets || (G.prog.secrets = {}); S['key:' + a.item] = true; text(p.x, p.y, p.z + 3.4, 'Key found', '#ffd35a', true); if (typeof UI !== 'undefined') UI.toast({ text: 'Key: ' + a.item.replace(/^key_/, '').replace(/_/g, ' '), col: '#ffd35a' }); sfx('loot'); }
    else if (UNIQUES[a.item]) list.push({ kind: 'item', it: makeUnique(a.item, L) });
    else if (trinketBases()[a.item] && trinketBases()[a.item].unique) list.push({ kind: 'item', it: makeTrinketUnique(a.item, L) });   // vault / world uniques (§19.5)
    else if (gearBase) { /* the fixed piece above */ }
    else { (p.runes = p.runes || []).push(a.item); if (typeof UI !== 'undefined') UI.toast({ text: a.item.replace(/_/g, ' '), col: '#b48aff' }); }
  }
  const has = v => v != null && v !== '', x = has(a.x) ? +a.x : p.x + 1, y = has(a.y) ? +a.y : p.y + 1;
  fx({ type: 'pillar', x, y, col: rarityCol(gearBase ? (list[0] ? list[0].it.rarity : rmin) : min), life: 0.6, r: 0.8 });
  dropLoot(x, y, list);
}
// trigger action `gear` (§28 opening): a first-kit piece lying in the world at x, y (the sword standing in the grass at 0:45, the
// Iron Cap on the cottage step at 3:50). Placed by a map_enter card, so it lies there again after a reload until it is taken;
// skipped once found (G.prog.secrets['found:<item>']) or when the hero already wears that slot (every save from before §28).
// Walking over it puts it on (pickup: `equip`). Exact position, no scatter, never evicted.
function gearAction(a) {
  const p = G.player, b = BASES[a.item]; if (!b || !p) return false;
  const S = G.prog.secrets || (G.prog.secrets = {});
  if (S['found:' + a.item] || p.equip[b.slot] || G.drops.some(d => d.found === a.item)) return false;
  const it = makeItem(a.item, RARITY[a.rarity] ? a.rarity : 'common', 1, { sockets: +a.sockets || 0, affixes: [] }), m = G.map;
  const x = +a.x, y = +a.y, z = tileH(m, x, y);
  G.drops.push({ kind: 'item', it, sx: x, sy: y, x, y, z, t: 0.5, rar: it.rarity, name: itemName(it), found: a.item, equip: true, keep: true, ground: true });
  return true;
}

// ===== inventory actions (input-agnostic: mouse, touch and later gamepad/ui.js drive these) =================
// State: G.ui.open/tab, G.ui.sel (focused item or gem), G.ui.gem (picked gem's bag index), G.ui.salvage, G.ui.note.
// Mouse acts on the first click; touch selects on the first tap and acts on the second.
function openInv(tab) { G.ui.open = true; G.ui.tab = tab || G.ui.tab || 'inv'; G.ui.gem = null; G.ui.salvage = false; G.mouse.down = false; }
function closeInv() { if (!G.ui.open) return; G.ui.open = false; G.ui.gem = null; G.ui.salvage = false; G.ui.sel = null; G.ui.teach = null; saveGame(); }
function invNote(s, col = '#ffb0c8') { G.ui.note = { s, col, t: G.t + 2.6 }; if (col === '#ffb0c8') sfx('hurt'); }
// touch and gamepad are select-then-select (docs/design/controls.md): the first tap / A shows the item, the second acts
const secondTap = key => { if (!(G.touch || (typeof IN !== 'undefined' && IN.device === 'pad')) || G.ui.sel === key) return true; G.ui.sel = key; return false; };
function clickItem(it) {
  const p = G.player;
  if (G.ui.gem != null) { const r = socketGem(p, it, null, G.ui.gem); if (r) invNote(r); else { sfx('shield'); G.ui.gem = null; } G.ui.sel = it; return; }
  G.ui.sel = it;
}
function clickSocket(it, k) {
  const p = G.player;
  if (G.ui.gem != null) { const r = socketGem(p, it, k, G.ui.gem); if (r) invNote(r); else { sfx('shield'); G.ui.gem = null; } G.ui.sel = it; return; }
  if (it.sockets[k]) { const r = unsocketGem(p, it, k); if (r) invNote(r); else { invNote('Gem returned to the bag', '#9ef0ff'); sfx('blink'); } }
  else invNote('Pick a gem from the bag first', '#a99cc8');
}
function clickBag(i, alt) {
  const p = G.player, e = p.bag[i];
  if (!e) { G.ui.gem = null; G.ui.sel = null; return; }
  if (e.gem) {
    if (G.ui.gem === i) { G.ui.gem = null; return; }
    G.ui.gem = i; G.ui.sel = { gem: e.gem, gemIdx: i }; G.ui.salvage = false; sfx('pickup'); return;
  }
  if (G.ui.gem != null) { clickItem(e); return; }
  if (alt || G.ui.salvage) {
    if (!secondTap(e)) return;
    if (RARITY[e.rarity].i >= 3 && G.ui.confirm !== e) { G.ui.confirm = e; invNote(`Salvage ${itemName(e)}? Click again`, '#ffd35a'); return; }
    const r = salvageItem(p, i); G.ui.confirm = null;
    if (typeof r === 'string') invNote(r); else { invNote(`+${r} Dream Dust`, '#d6c2ff'); sfx('chest'); G.ui.sel = null; }
    return;
  }
  if (!secondTap(e)) return;
  const r = equipItem(p, e);
  if (r) invNote(r); else { sfx('shield'); G.ui.sel = e; }
}
// ===== ground drops + chests + checkpoints (updated from main loop) ============================
const MAX_DROPS = 40;
function spawnDrop(x, y, d) {
  const m = G.map; let tx = x, ty = y;
  for (let k = 0; k < 10; k++) { const a = Math.random() * 6.28, r = 0.5 + Math.random() * 0.9, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r; if (walkable(m, nx, ny, tileH(m, x, y))) { tx = nx; ty = ny; break; } }
  const rar = d.kind === 'item' ? d.it.rarity : d.kind === 'gem' ? 'rare' : 'uncommon';
  const name = d.kind === 'item' ? itemName(d.it) : d.kind === 'gem' ? gemName(d.gem) : 'Health Potion';
  G.drops.push(Object.assign({ sx: x, sy: y, x: tx, y: ty, z: tileH(m, tx, ty), t: 0, rar, name }, d));
  if (RARITY[rar].i >= 1) sfx('drop' + RARITY[rar].i);   // pitch-stepped chime per rarity
  if (G.drops.length > MAX_DROPS) { let i = G.drops.findIndex(q => q.rar === 'common' && !q.keep); if (i < 0) i = G.drops.findIndex(q => !q.keep); if (i >= 0) G.drops.splice(i, 1); }
}
function dropLoot(x, y, list) { list.forEach((d, i) => delay(i * 0.08, () => spawnDrop(x, y, d))); }
function onEnemyKilled(e) {
  if (e.dummy || !G.player) return;
  const p = G.player, c = enemyClassOf(e);
  gainXp(p, killXp(e));
  let uq = null;
  const w = p.equip.weapon; if (w && w.hist) { w.hist.kills++; if (c === 'boss') w.hist.bossKills++; }   // §19.3: equipped weapon only
  if (c === 'boss') {
    const k = G.map.id + ':' + e.type, d = ENEMY[e.type] || {}, B = typeof BOSSES !== 'undefined' ? BOSSES[d.boss || e.type] : null;
    if (!G.prog.firsts[k]) {
      uq = uniqueFor(k) || (B && B.unique && UNIQUES[B.unique] ? B.unique : null) || Object.keys(UNIQUES).find(u => (UNIQUES[u].boss || '').split(':')[1] === e.type) || null;
      if (B && B.rune) { (p.runes = p.runes || []).push('skill_rune'); if (typeof UI !== 'undefined') UI.toast({ text: 'Skill Rune', col: '#b48aff' }); }   // Mossjaw: guaranteed rune
    }
    G.prog.firsts[k] = true;
  }
  const loot = rollLoot(c, e.lvl, uq, (ENEMY[e.type] || {}).loot), late = lateUniqueDrop(e, c);
  if (late) loot.unshift({ kind: 'item', it: makeUnique(late, e.lvl) });
  dropLoot(e.x, e.y, loot);
  if (c === 'boss') delay(1.5, saveGame);
}
// §30 the late uniques (UNIQUES[id].late = min enemy level): the first boss-class kill (mini-boss, guardian, act boss) at or
// above that level drops it, once per save (G.prog.secrets['unique:<id>']). A loot card's `item: 'echo'` also places it.
function lateUniqueDrop(e, c) {
  if (c !== 'boss' || e.dummy || !G.prog) return null;
  const S = G.prog.secrets || (G.prog.secrets = {});
  for (const id in UNIQUES) { const U = UNIQUES[id]; if (U.late && (e.lvl || 0) >= U.late && !S['unique:' + id]) { S['unique:' + id] = true; return id; } }
  return null;
}
// §28 first-kit pickups: a drop flagged `equip` (the sword in the grass, the cottage cap, the ambush boots, the first chest's ring)
// is PUT ON when its slot is empty, so the hero visibly takes it up; a `teach` drop (the first chest's mail) goes into the bag,
// which then opens on it with EQUIP focused (only during a bare opening, G.prog.secrets.opening). `found` records the piece
// (gearAction never places it again).
function wearOnPickup(p, d) {
  if (!d.equip || d.kind !== 'item') return false;
  const it = d.it, key = equipKeysFor(it.slot).find(k => !p.equip[k]);
  if (!key || it.req > p.level) return false;
  p.equip[key] = it; recalcStats(p, false);
  if (typeof hudNoun === 'function') hudNoun(key);
  burst(p.x, p.y, p.z + 1.2, 18, [rarityCol(it.rarity), '#ffffff', '#ffe6a0'], 2.4);
  fx({ type: 'ring', x: p.x, y: p.y, r: 1.1, col: '#ffe6a0', life: 0.45 });
  return true;
}
function pickup(p, d) {
  if (d.kind === 'potion') {
    if (p.potions < maxPotions(p)) { p.potions++; text(p.x, p.y, p.z + 3, '+1 Potion', '#ff8aa8'); } else healPlayer(p, p.maxHp * 0.15);
  } else if (d.kind === 'gem') {
    if (!bagAdd(p, { gem: d.gem })) return false; text(p.x, p.y, p.z + 3, gemName(d.gem), gemParse(d.gem).def.col);
    if (d.teach === 'socket' && openingActive()) delay(0.7, () => teachSocket(p, d.gem));
  }
  else {
    const worn = wearOnPickup(p, d);
    if (!worn && !bagAdd(p, d.it)) return false;
    if (d.it.hist && !d.it.hist.found && G.map) d.it.hist.found = G.map.id; text(p.x, p.y, p.z + 3, itemName(d.it), RARITY[d.it.rarity].col, RARITY[d.it.rarity].i >= 3);
    if (d.found && G.prog) (G.prog.secrets || (G.prog.secrets = {}))['found:' + d.found] = true;
    if (d.teach && !worn && openingActive()) delay(0.7, () => teachEquip(p, d.it));
  }
  sfx(RARITY[d.rar].i >= 3 ? 'loot' : 'pickup');
  if (typeof UI !== 'undefined' && d.kind !== 'potion') {   // loot toast on the right edge (docs/design/hud-ui.md)
    if (d.kind === 'gem') UI.toast({ text: gemName(d.gem), icon: gemIcon(gemParse(d.gem).type), col: gemParse(d.gem).def.col });
    else UI.toast({ text: itemName(d.it), icon: itemIcon(d.it), rarity: d.it.rarity, item: d.it });
  } else if (typeof UI !== 'undefined') UI.toast({ text: '+1 Potion', icon: miscIcon('potion'), col: '#ff8fa8' });
  burst(d.x, d.y, d.z + 0.3, 8 + RARITY[d.rar].i * 4, [rarityCol(d.rar), '#ffffff'], 2);
  return true;
}
// the first chest's lesson (§28 "the bag opens on the mail"): the inventory opens on the item, EQUIP focused. Waits while
// another screen is up; skipped once the item is worn or gone from the bag.
function teachEquip(p, it) {
  if (!p.bag.includes(it) || G.state !== 'play') return;
  if (G.ui.open || G.ui.pause || G.ui.help || G.ui.map || G.fadeDir) { delay(0.5, () => teachEquip(p, it)); return; }
  openInv('inv'); G.ui.sel = it; G.ui.teach = { it, t: G.t };
  if (typeof UI !== 'undefined' && UI.focus) UI.focus.set('btn:equip');
}
// a bare-start game (§28) is "in its opening" until the hero wears the whole first kit; saves from before §28 never are
const openingActive = () => !!(G.prog && G.prog.secrets && G.prog.secrets.opening === 'bare');
const chestKey = o => `${G.map.id}:${o.x},${o.y}`;
function syncChests(m) { for (const o of m.objects) if (o.chest) { o.opened = !!G.prog.chests[`${m.id}:${o.src.x},${o.src.y}`]; o.img = o.opened ? ART.chestOpen : ART.chest; } }
function openChest(o) {
  const p = G.player;
  o.opened = true; o.img = ART.chestOpen; G.prog.chests[chestKey(o.src)] = true;
  const [a, b] = zoneLevel(), L = clamp(p.level, a, b);
  sfx('chest'); shake(2);
  burst(o.x, o.y, o.z + 0.8, 30, ['#ffd35a', '#fff6d6', '#ffffff'], 3);
  fx({ type: 'ring', x: o.x, y: o.y, r: 1.2, col: '#ffd35a', life: 0.4 });
  // chest tier (generator: wood | silver | gold) raises the rarity floor; gold adds an item and a gem
  const floor = { silver: 'uncommon', gold: 'rare' }[o.src.tier], list = o.src.starter ? starterLoot() : rollLoot('chest', L);
  if (o.src.tier === 'gold') list.push({ kind: 'item', it: rollItem(L, rollRarity('elite', L)) }, { kind: 'gem', gem: rollGem(L + 5) });
  if (floor) for (const d of list) if (d.kind === 'item' && !rarityAtLeast(d.it.rarity, floor)) d.it = rollItem(L, floor, isTrinket(d.it) ? d.it.slot : undefined);
  guaranteeRarity(list, o.src.guaranteed, L);
  list.push(...chestTrinket(o.src, L));
  const legacy = legacyOriginRing(o.src); if (legacy) list.push({ kind: 'item', it: legacy });
  // §28 the first chest (~2:00): its kit flies to the hero; the Origin ring goes on (ring slot 1 means something from here),
  // the mail and the gem go into the bag, which then opens on the mail with EQUIP focused (pickup)
  if (o.src.starter) for (const d of list) { d.auto = true; if (d.kind === 'item' && isTrinket(d.it)) d.equip = true; else if (d.kind === 'item') d.teach = true; }
  dropLoot(o.x, o.y, list);
  gainXp(p, Math.round(xpToNext(L) * (o.src.starter ? 0.8 : 0.5)));
}
// chest marker `guaranteed: '<rarity>'` (level lane contract, e.g. the mini-boss and Warrens chests: 'epic'): at least one GEAR item
// of that rarity or better. If none rolled it, the best gear item is re-rolled at that rarity in its own slot. The marker's trinket
// (`loot`) is never touched: amulets and belts stay Rare by the §19.4 contract.
function guaranteeRarity(list, min, L) {
  if (!RARITY[min]) return;
  const gear = list.filter(d => d.kind === 'item' && !isTrinket(d.it));
  if (gear.some(d => rarityAtLeast(d.it.rarity, min))) return;
  const d = gear.sort((a, b) => RARITY[b.it.rarity].i - RARITY[a.it.rarity].i)[0];
  if (d) d.it = rollItem(L, min, d.it.slot); else list.unshift({ kind: 'item', it: rollItem(L, min, pick2(SLOTS)) });
}
// a save from before §28 that opened the tutorial chest when it held no ring (the ring sat in the ledge chest, now moved): the
// next Vale chest it opens carries the Origin ring, once, if the hero owns no ring at all
function legacyOriginRing(src) {
  const p = G.player, S = G.prog && (G.prog.secrets || (G.prog.secrets = {}));
  if (!S || src.starter || !G.map || G.map.id !== 'vale' || S['trinket:ring']) return null;
  const tut = G.map.objects.find(o => o.chest && o.src && o.src.starter);
  if (!tut || !G.prog.chests[chestKey(tut.src)]) return null;
  if (EQUIP_SLOTS.some(k => p.equip[k] && p.equip[k].slot === 'ring') || p.bag.some(e => e && e.slot === 'ring')) return null;
  S['trinket:ring'] = true;
  return originRing(p.equip.weapon ? p.equip.weapon.base : 'rustyblade');
}
// CHEST CONTRACT (level lane, §19.4 placements): a chest marker may carry `loot: 'ring' | 'amulet' | 'belt'`. Opening it drops,
// IN ADDITION to the normal loot, one trinket of that slot: a ring Uncommon+ (the chest's rarity roll, floored), an amulet or
// a belt Rare (+ the chest tier floor: gold -> at least Rare anyway). It also records G.prog.secrets['trinket:<slot>'] (saved),
// which unlocks random trinket drops once the amulet's chest is open (trinketDropsOn).
const TRINKET_CHEST_FLOOR = { ring: 'uncommon', amulet: 'rare', belt: 'rare' };
const trinketSlotOf = src => (src && TRINKET_KINDS.includes(src.loot) ? src.loot : null);   // a chest marker's `loot` slot, or null
function chestTrinket(src, L) {
  const slot = trinketSlotOf(src); if (!slot) return [];
  // §28: the tutorial chest's `loot: 'ring'` IS the Origin ring starterLoot already holds; it records the source, adds no second ring
  if (src.starter && slot === 'ring') { if (G.prog) (G.prog.secrets || (G.prog.secrets = {}))['trinket:ring'] = true; return []; }
  let r = rollRarity('chest', L); if (!rarityAtLeast(r, TRINKET_CHEST_FLOOR[slot])) r = TRINKET_CHEST_FLOOR[slot];
  if (slot !== 'ring' && RARITY[r].i > RARITY.rare.i) r = 'rare';   // amulet / belt: Rare exactly (§19.4 placements)
  if (G.prog) (G.prog.secrets || (G.prog.secrets = {}))['trinket:' + slot] = true;
  return [{ kind: 'item', it: rollTrinket(L, r, slot) }];
}
const maxPotions = p => p.maxPotions || MAX_POTIONS;   // MAX_POTIONS + belt potion charges, capped at CAPS.potions (recalcStats)
function setCheckpoint(x, y, label) {
  const p = G.player;
  G.checkpoint = { map: G.map.id, x, y };
  p.potions = maxPotions(p);
  say(`${label || 'Checkpoint'} — potions refilled`); sfx('heal'); fx({ type: 'ring', x, y, r: 1.4, col: '#9ef0ff', life: 0.5 }); saveGame();
}
const INTERACT_R = 2.5, LOOT_NEAR = [];
function updateLoot(dt) {
  const p = G.player; if (!p || p.dead || G.state !== 'play') return;
  for (const d of G.drops) {
    d.t += dt;
    if (d.auto && d.t > 0.9) { d.x += (p.x - d.x) * Math.min(1, dt * 9); d.y += (p.y - d.y) * Math.min(1, dt * 9); d.sx = d.x; d.sy = d.y; d.z = p.z; }   // the first chest's kit flies to the hero
    if (d.t > 0.5 && dist(p.x, p.y, d.x, d.y) < 0.65) {
      if (pickup(p, d)) d.done = true;
      else if (!G.bagWarnT || G.t > G.bagWarnT) { say('Bag full — salvage something (TAB)'); G.bagWarnT = G.t + 2.5; }
    }
  }
  G.drops = G.drops.filter(d => !d.done);
  // chests, shrines and lore tablets wait for the Interact action (Space / A / the touch context button);
  // pickups above stay automatic. G.prompt = the nearest one in reach, for the HUD prompt and interact().
  // perf: only the objects in the spatial-grid buckets around the hero (maps.js gridQuery), not every prop of the map;
  // INTERACT_R covers the largest reach (keydoor 1.8)
  let best = null, bd = 9;
  LOOT_NEAR.length = 0;
  const near = typeof gridQuery === 'function' ? gridQuery(G.map, 'objs', p.x - INTERACT_R, p.y - INTERACT_R, p.x + INTERACT_R, p.y + INTERACT_R, LOOT_NEAR) : G.map.objects;
  for (const o of near) {
    // o.use = { kind, reach, on(o), text(o), fn(o) }: map-engine interactables (maps.js: keydoor, lever, fishspot)
    const kind = o.chest && !o.opened ? 'chest' : o.checkpoint ? 'shrine' : o.tablet ? 'tablet' : o.use && o.use.on(o) ? o.use.kind : null; if (!kind) continue;
    const d = dist(p.x, p.y, o.x, o.y), reach = o.use && kind === o.use.kind ? o.use.reach : kind === 'chest' ? 1.3 : kind === 'shrine' ? 1.4 : 1.5;
    if (d < reach && d < bd) { bd = d; best = { kind, obj: o }; }
  }
  if (G.tablet && (!best || best.obj !== G.tablet)) G.tablet = null;   // walking away closes the tablet
  if (best) {
    const o = best.obj, cpHere = G.checkpoint && G.checkpoint.map === G.map.id && dist(G.checkpoint.x, G.checkpoint.y, o.x, o.y) < 2.5;
    best.text = best.kind === 'fishspot' && firstCastOpen(o) ? 'Fish' : o.use && best.kind === o.use.kind ? o.use.text(o) + doorRecText(o) : best.kind === 'chest' ? 'Open' : best.kind === 'tablet' ? (G.tablet === o ? 'Close' : 'Read') : cpHere ? 'Rest (refill potions)' : 'Rest (set checkpoint)';
    best.x = o.x; best.y = o.y; best.z = o.z || 0;
  }
  G.prompt = best;
}
// §26.2 / §28 10:00: a boss door (warp door marker `boss: '<enemy id>'`) shows "Recommended ilvl N · yours M" in its prompt.
// N = the boss's level, M = the mean item level of the four gear slots worn (an empty slot counts 0). Information, never a lock.
const gearIlvl = (p = G.player) => Math.round(SLOTS.reduce((a, k) => a + (p.equip[k] ? p.equip[k].ilvl : 0), 0) / SLOTS.length);
function doorRecText(o) {
  const id = o && o.warpdoor && o.src && o.src.boss, e = id && ENEMY[id]; if (!e) return '';
  return `  ·  Recommended ilvl ${e.level || enemyLevel(id)}  ·  yours ${gearIlvl()}`;
}
function interact(p) {
  const q = G.prompt; if (!q || p.dead) return false;
  const o = q.obj;
  if (q.kind === 'chest' && !o.opened) openChest(o);
  else if (q.kind === 'shrine') setCheckpoint(p.x, p.y);
  else if (q.kind === 'tablet') { G.tablet = G.tablet === o ? null : o; if (G.tablet) sfx('pickup'); }
  else if (q.kind === 'fishspot' && firstCastOpen(o)) firstCast(p, o);
  else if (o.use && q.kind === o.use.kind) o.use.fn(o);
  return true;
}
// §28 2:20: ONE cast at the Vale's first fishing spot (pool vale_a, beside the tutorial chest) lands a guaranteed Chipped gem;
// in a bare opening the bag then opens with that gem picked, so it goes into the mail's socket right there. Every other cast
// stays the maps.js stub until fishing lands. Saved as G.prog.fishing.valeCast.
const FIRST_CAST = { map: 'vale', pool: 'vale_a', gem: 'sapphire_1' };
const firstCastOpen = o => !!(o && o.src && G.map && G.map.id === FIRST_CAST.map && o.src.pool === FIRST_CAST.pool && !(G.prog.fishing && G.prog.fishing.valeCast));
function firstCast(p, o) {
  (G.prog.fishing || (G.prog.fishing = {})).valeCast = true;
  fx({ type: 'ring', x: o.x, y: o.y, r: 0.8, col: '#9fe8ff', life: 0.6 }); sfx('blink'); p.rootT = Math.max(p.rootT, 0.6);
  delay(0.6, () => {
    burst(o.x, o.y, (o.z || 0) + 0.4, 14, ['#9fe8ff', '#ffffff', GEMS.sapphire.col], 2.2);
    dropLoot(p.x, p.y, [{ kind: 'gem', gem: FIRST_CAST.gem, auto: true, teach: 'socket' }]);
  });
}
// the second bag lesson ("socket"): the bag opens with the fished gem picked; clicking the mail's empty socket sets it
function teachSocket(p, gem) {
  if (G.state !== 'play') return;
  if (G.ui.open || G.ui.pause || G.ui.help || G.ui.map || G.fadeDir) { delay(0.5, () => teachSocket(p, gem)); return; }
  const i = p.bag.findIndex(e => e && e.gem === gem), host = EQUIP_SLOTS.map(k => p.equip[k]).find(it => it && it.sockets.some(g => !g));
  if (i < 0 || !host) return;
  openInv('inv'); G.ui.gem = i; G.ui.sel = { gem, gemIdx: i }; G.ui.teach = { gem, t: G.t };
}

// ===== potions =========================================================================================
function drinkPotion(p) {
  if (p.dead || G.state !== 'play') return;
  if ((p.potT || 0) > G.t) return;
  if (p.potions <= 0) { say('No potions — they refill at checkpoints'); return; }
  if (p.hp >= p.maxHp) { say('Already at full health'); return; }
  p.potions--; p.potT = G.t + 1; healPlayer(p, p.maxHp * 0.4);
  burst(p.x, p.y, p.z + 1, 16, ['#ff8aa8', '#ffffff', '#ffd6ec'], 2); sfx('heal');
  if (typeof emitEffects === 'function') emitEffects('potion', { p });   // belt boons (cleanse, regen, MP)
}

// ===== save / load: 3 slots ===================================================================================
// Slot 1 keeps the original key 'dreamy.save.v1' (old saves load as slot 1); slots 2-3 use 'dreamy.save.v1.s2|s3'.
// 'dreamy.slots' = the slots array [{ slot, level, map, t, playtime } | null] x SAVE_SLOTS for the title screen, and
// 'dreamy.slot' the last slot used. Every save is the v4 shape below with its own `slot` field (the key name stays .v1).
const SAVE_SLOTS = 3, SAVE_KEY_BASE = 'dreamy.save.v1';
const saveKey = (slot = G.saveSlot || 1) => slot > 1 ? `${SAVE_KEY_BASE}.s${slot}` : SAVE_KEY_BASE;
const SAVE_KEY = SAVE_KEY_BASE;   // slot 1 (legacy name)
const LAST_SLOT = (() => { try { const n = +localStorage.getItem('dreamy.slot'); return n >= 1 && n <= SAVE_SLOTS ? n : 1; } catch (e) { return 1; } })();   // G.saveSlot starts here (game.js)
function saveSlots() {
  const out = [];
  for (let i = 1; i <= SAVE_SLOTS; i++) {
    let s = null; try { s = migrate(JSON.parse(localStorage.getItem(saveKey(i)))); } catch (e) { s = null; }
    out.push(s && s.player ? { slot: i, level: s.player.level, map: s.world && s.world.map, t: s.t, playtime: (s.stats && s.stats.playtime) || 0 } : null);
  }
  return out;
}
function writeSlotIndex() { try { localStorage.setItem('dreamy.slots', JSON.stringify(saveSlots())); localStorage.setItem('dreamy.slot', String(G.saveSlot || 1)); } catch (e) { /* ignore */ } }
// title: pick a slot; G.save then holds that slot's save (or null = empty slot)
function selectSlot(n) { G.saveSlot = clamp(n | 0, 1, SAVE_SLOTS); G.save = SAVE_ON ? readSave() : null; try { localStorage.setItem('dreamy.slot', String(G.saveSlot)); } catch (e) { /* ignore */ } return G.save; }
// showcase / play-test / ?map= runs never touch the real save
const SAVE_ON = (() => { try { const q = new URLSearchParams(location.search); return !q.get('scene') && !q.get('playtest') && !q.get('map'); } catch (e) { return false; } })();
// Save shape v4 (docs/design/progression-economy-saves.md, docs/design/items.md): { version, slot, player, skills, world, bosses, bestiary, fishing, quests, zone100,
// settings, bindings, stats }. player.equip has every EQUIP_SLOTS key (null = empty), items are the v2 shape (top of file),
// skills.wsk is keyed by weapon variant, skills.runes holds rune tokens ('skill_rune' = unbound) and bound runes as
// 'variant:slot' (e.g. 'sword:q' = the Sword's Q rune alternate, §23). The ultimate charge is not saved.
// migrate() upgrades older saves losslessly.
function saveData() {
  const p = G.player, seenOut = {};
  for (const k in G.seen) seenOut[k] = Object.assign({ seen: true, reactions: {} }, G.seen[k]);
  const byId = {};
  for (const id in p.ranks) byId[id] = { rank: skillRank(p, id), xp: p.ranks[id].hits, mods: [(p.mods[id] || {})[3] || null, (p.mods[id] || {})[5] || null] };
  for (const id in p.mods) if (!byId[id]) byId[id] = { rank: skillRank(p, id), xp: 0, mods: [p.mods[id][3] || null, p.mods[id][5] || null] };
  const bosses = {};
  for (const k in G.prog.firsts) { const type = k.split(':')[1]; bosses[k] = { kills: (G.seen[type] && G.seen[type].kills) || 1, firstKill: true }; }
  return {
    version: SAVE_VERSION, t: Date.now(), slot: G.saveSlot || 1,
    player: { level: p.level, xp: Math.floor(p.xp), equip: p.equip, bag: p.bag, dust: p.dust, potions: p.potions, tool: p.tool || null, uid: UID },
    skills: { byId, runes: p.runes || [], tomes: p.tomes || [], wsk: p.wsk, csk: p.csk },
    world: { map: G.map.id, checkpoint: G.checkpoint, trig: G.prog.trig, chests: G.prog.chests, secrets: G.prog.secrets || {}, gates: G.prog.gates || {},
      fog: fogSaveData(), sections: G.prog.sections || {}, shrines: G.prog.shrines || {}, once: G.prog.once || {}, obj: G.prog.obj || {} },
    bosses, bestiary: seenOut, fishing: G.prog.fishing || {}, quests: G.prog.quests || {}, zone100: G.prog.zone100 || {},
    settings: typeof settingsData === 'function' ? settingsData() : {},
    bindings: typeof IN !== 'undefined' ? IN.getBindings() : null,
    stats: { playtime: Math.round(G.stats.playtime), deaths: G.stats.deaths },
  };
}
function saveGame() {
  const p = G.player; if (!SAVE_ON || !p || !G.map || G.state === 'title') return false;
  try { localStorage.setItem(saveKey(), JSON.stringify(saveData())); writeSlotIndex(); return true; } catch (e) { return false; }
}
function readSave(slot = G.saveSlot || 1) {
  try { const s = migrate(JSON.parse(localStorage.getItem(saveKey(slot)))); return s && s.player && s.player.equip ? s : null; } catch (e) { return null; }
}
// the ONE place old saves are upgraded; add a step per schema change (bestiary, quests, secrets, mastery...)
const SAVE_VERSION = 4;
// v3 -> v4 item: v2 fields filled from the base (implicit) and the item level (old affix tiers); prefixes first
function migrateItem(it) {
  if (!it || typeof it !== 'object' || it.gem || !BASES[it.base]) return it;   // gem stacks; unknown bases stay (applySave drops them)
  const ilvl = +it.ilvl || 1, aff = (Array.isArray(it.affixes) ? it.affixes : []).map(a => ({ id: a.id || a.stat, tier: a.tier || affixTier(ilvl), v: a.v, kind: a.kind || affixKind(a.id || a.stat) }));
  aff.sort((a, c) => (a.kind === 'P' ? 0 : 1) - (c.kind === 'P' ? 0 : 1));
  const out = v2Item({ id: it.id || it.uid, base: it.base, rarity: it.rarity, ilvl, req: it.req != null ? it.req : it.reqLvl, affixes: aff,
    sockets: Array.isArray(it.sockets) ? it.sockets : [], boon: it.boon, rule: it.rule || it.unique || null, unique: it.unique, hist: it.hist, tempered: it.tempered, name: it.name });
  return JSON.parse(JSON.stringify(out));   // plain data (the compat mirrors are added by applySave)
}
// a bound Skill Rune (§23): 'variant:slot', e.g. runeKey('sword', 'q') === 'sword:q' = the Sword's Q alternate unlocked
const runeKey = (variant, slot) => variantId(variant) + ':' + slot;
const hasRune = (p, variant, slot) => (p.runes || []).includes(runeKey(variant, slot));
const renameRune = r => { const m = /^([a-z]+):(q|e|r|f|c|shift)$/.exec(r); return m ? variantId(m[1]) + ':' + m[2] : r; };
function migrate(s) {
  if (!s || typeof s !== 'object') return null;
  if (!s.version) s.version = s.v === 1 ? 1 : 0;            // v1 = the first M1 builds
  if (s.version < 2) {                                        // v2: 3 gem grades, persisted discovery, level cap 40
    const g3 = id => { const [t, g] = String(id).split('_'); return GEMS[t] ? `${t}_${clamp(Math.ceil(+g / 2), 1, GEM_MAX)}` : null; };
    for (const it of Object.values(s.equip || {}).concat(s.bag || [])) { if (!it) continue; if (it.gem) it.gem = g3(it.gem); if (it.sockets) it.sockets = it.sockets.map(g => g && g3(g)); }
    s.seen = s.seen || (s.prog && s.prog.seen) || {};
    s.version = 2;
  }
  if (s.version < 3) {                                        // v3: the §16.5 top-level shape (M2a); nothing dropped
    const prog = s.prog || {}, seen = s.seen || {}, bestiary = {}, bosses = {};
    for (const k in seen) bestiary[k] = Object.assign({ seen: true, kills: 0, res: {}, reactions: {} }, seen[k]);
    for (const k in prog.firsts || {}) { const type = k.split(':')[1]; bosses[k] = { kills: (seen[type] && seen[type].kills) || 1, firstKill: true }; }
    s = {
      version: 3, t: s.t || Date.now(), slot: 1,
      player: { level: s.level, xp: s.xp, equip: s.equip, bag: s.bag, dust: s.dust, potions: s.potions, tool: null, uid: s.uid },
      skills: { byId: {}, runes: [], tomes: [], wsk: s.wsk, csk: s.csk },
      world: { map: s.map, checkpoint: s.cp || null, trig: prog.trig || {}, chests: prog.chests || {}, secrets: {}, gates: {}, fog: {}, sections: {}, shrines: {} },
      bosses, bestiary, fishing: {}, quests: {}, zone100: {}, settings: null, bindings: null, stats: { playtime: 0, deaths: 0 },
    };
  }
  // v3 plus (§25 big maps, no version bump): world.fog / world.sections / world.shrines / world.once (once-per-save banners,
  // dialogue) / world.obj (the objective log, game.js) default to empty
  if (s.version >= 3 && s.world && typeof s.world === 'object') for (const k of ['fog', 'sections', 'shrines', 'once', 'obj']) if (!s.world[k] || typeof s.world[k] !== 'object') s.world[k] = {};
  if (s.version === 3) {                                      // v4 (§19.7, §23.6, §24): items v2, trinket slots, variant ids
    const P = s.player = s.player || {}, K = s.skills = s.skills || {}, eq = P.equip && typeof P.equip === 'object' ? P.equip : {};
    P.equip = {};
    for (const k of EQUIP_SLOTS) P.equip[k] = eq[k] ? migrateItem(eq[k]) : null;
    if (Array.isArray(P.bag)) P.bag = P.bag.map(migrateItem);
    if (K.wsk && typeof K.wsk === 'object') { const w = {}; for (const f in K.wsk) { const v = variantId(f); if (!w[v] || v === f) w[v] = K.wsk[f]; } K.wsk = w; }
    if (Array.isArray(K.runes)) K.runes = K.runes.map(renameRune);
    s.version = 4;
  }
  return s.version === SAVE_VERSION ? s : null;
}
// ===== fog of war in the save: world.fog[mapId] = 'WxH:' + base64 of the explored-tile bitfield (1 bit per tile,
// row-major, LSB first; ~2 KB for 112x112). Every map built this session writes its live bitmap (m.mini.vis, hud.js);
// maps not visited this session keep the string they were loaded with (G.prog.fog).
function fogEncode(vis, W, H) {
  const n = W * H, bytes = new Uint8Array((n + 7) >> 3);
  for (let i = 0; i < n; i++) if (vis[i]) bytes[i >> 3] |= 1 << (i & 7);
  let bin = ''; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return W + 'x' + H + ':' + btoa(bin);
}
function fogDecode(str, W, H) {
  if (typeof str !== 'string') return null;
  const m = /^(\d+)x(\d+):(.*)$/.exec(str); if (!m || +m[1] !== W || +m[2] !== H) return null;
  let bin; try { bin = atob(m[3]); } catch (e) { return null; }
  const vis = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) vis[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
  return vis;
}
function fogSaveData() {
  const out = Object.assign({}, G.prog.fog || {});
  for (const id in G.maps) { const m = G.maps[id]; if (m && m.mini && m.mini.vis && m.mini.prog === G.prog) out[id] = fogEncode(m.mini.vis, m.W, m.H); }   // never another run's fog
  return out;
}
function clearSave(slot = G.saveSlot || 1) { try { localStorage.removeItem(saveKey(slot)); writeSlotIndex(); } catch (e) { /* ignore */ } }
const hasKey = id => !!(G.prog && G.prog.secrets && G.prog.secrets['key:' + id]);
const validItem = it => it && baseOf(it.base) && RARITY[it.rarity] && Array.isArray(it.affixes) && Array.isArray(it.sockets);
function applySave(p, s) {
  const P = s.player || {}, K = s.skills || {}, W = s.world || {};
  p.level = clamp(+P.level || 1, 1, MAX_LEVEL); p.xp = Math.max(0, +P.xp || 0); p.dust = +P.dust || 0;
  const pot = P.potions != null ? +P.potions : null;   // clamped to the belt-aware max after recalcStats below
  for (const slot of EQUIP_SLOTS) {
    const it = (P.equip || {})[slot];
    if (validItem(it) && equipKeysFor(baseOf(it.base).slot).includes(slot)) { it.sockets = it.sockets.map(g => gemParse(g) ? g : null); p.equip[slot] = compatItem(it); }
    // §28 null gear slots: an empty saved slot stays empty (a bare hero mid-opening); a gear slot holding an item this build
    // cannot read gets the slot's first-kit Common (the old starter-kit fallback), so an existing save never loses a slot
    else p.equip[slot] = it && SLOTS.includes(slot) ? firstKitPiece(slot) : null;
  }
  p.bag = Array(BAG_SIZE).fill(null);
  (P.bag || []).slice(0, BAG_SIZE).forEach((e, i) => { if (validItem(e)) p.bag[i] = compatItem(e); else if (e && gemParse(e.gem) && e.n > 0) p.bag[i] = { gem: e.gem, n: e.n | 0 }; });
  p.tool = P.tool || null;
  if (K.wsk) for (const f in p.wsk) for (const k of ['q', 'e', 'r']) if (K.wsk[f] && SKILLS[K.wsk[f][k]] && item('weapon', f)[k].includes(K.wsk[f][k])) p.wsk[f][k] = K.wsk[f][k];   // keyed by variant (v4)
  if (Array.isArray(K.csk)) p.csk = K.csk.filter(id => CHAR_SKILLS.includes(id)).slice(0, 3);
  p.ranks = {}; p.mods = {};
  for (const id in K.byId || {}) {
    if (!SKILLS[id]) continue;
    const r = K.byId[id] || {}; p.ranks[id] = { hits: Math.max(0, Math.min(RANK_HITS * (RANK_MAX - 1), +r.xp | 0)) };
    const m = Array.isArray(r.mods) ? r.mods : [];
    if (m[0] && SKILL_MODS[m[0]]) (p.mods[id] = p.mods[id] || {})[3] = m[0];
    if (m[1] && SKILL_MODS[m[1]]) (p.mods[id] = p.mods[id] || {})[5] = m[1];
  }
  p.runes = Array.isArray(K.runes) ? K.runes : []; p.tomes = Array.isArray(K.tomes) ? K.tomes : [];
  const firsts = {}; for (const k in s.bosses || {}) if (s.bosses[k] && s.bosses[k].firstKill) firsts[k] = true;
  G.prog = { chests: W.chests || {}, firsts, trig: W.trig || {}, secrets: W.secrets || {}, gates: W.gates || {},
    fishing: s.fishing || {}, quests: s.quests || {}, zone100: s.zone100 || {},
    fog: W.fog || {}, sections: W.sections || {}, shrines: W.shrines || {}, once: W.once || {}, obj: W.obj || {} };
  for (const id in G.maps) if (G.maps[id]) G.maps[id].mini = null;   // minimaps re-seed their fog from the loaded save
  G.seen = {};
  for (const k in s.bestiary || {}) { const b = s.bestiary[k] || {}; G.seen[k] = { kills: +b.kills || 0, res: b.res || {}, reactions: b.reactions || {} }; }
  G.checkpoint = W.checkpoint || null;
  G.saveSlot = clamp(+(G.saveSlot || s.slot) || 1, 1, SAVE_SLOTS);
  G.stats = { playtime: +(s.stats && s.stats.playtime) || 0, deaths: +(s.stats && s.stats.deaths) || 0 };
  if (s.settings && typeof applySettings === 'function') applySettings(s.settings);
  if (s.bindings && typeof IN !== 'undefined') IN.setBindings(s.bindings);
  // the uid counter resumes exactly where the save left it (a load -> save round trip is byte-identical); a starter-kit
  // piece that stayed because its saved slot was invalid gets a fresh id above every loaded one
  const idNum = it => +(/^i_(\d+)$/.exec(it && it.id) || [0, 0])[1];
  const loaded = new Set();
  for (const k of EQUIP_SLOTS) if (p.equip[k] && P.equip && P.equip[k] === p.equip[k]) loaded.add(p.equip[k]);
  UID = Math.max(+P.uid || 0, ...[...loaded, ...p.bag].map(idNum));
  for (const k of SLOTS) if (p.equip[k] && !loaded.has(p.equip[k])) p.equip[k].id = newUid();
  recalcStats(p, true);
  p.potions = clamp(pot != null ? pot : maxPotions(p), 0, maxPotions(p));
}

// ===== starter + showcase kits ====================================================================================
// §28: the hero starts BARE (nightshirt, empty-handed, no ring): every EQUIP_SLOTS key null, bag empty. The kit is found in the
// Vale (FIRST_KIT): the Rusty Blade in the grass (0:45), the first chest's Iron Mail + Origin ring + gem (~2:00), the Iron Cap
// in the cottage (3:50), the Iron Boots from the garden ambush (4:50). p.gear keeps each slot's DEFAULT family id while the slot
// is empty (render.js reads item('weapon', p.gear.weapon).kind for the pose); behaviour is gated on p.equip (game.js).
function starterKit(p) {
  p.equip = {}; for (const k of EQUIP_SLOTS) p.equip[k] = null;
  p.bag = Array(BAG_SIZE).fill(null);
}
// the four Commons the Vale hands out (§28 table); FIRST_KIT_GEAR is also the fallback piece for a save whose gear slot holds an
// item this build cannot read (applySave: an existing save never loses a slot), and the dev kit for a bare hero dropped into a
// later map by ?map= (game.js startTriggers)
const FIRST_KIT = { weapon: 'rustyblade', head: 'ironcap', chest: 'ironmail', boots: 'ironboots' };
const firstKitPiece = slot => makeItem(FIRST_KIT[slot], 'common', 1, { sockets: slot === 'chest' ? 1 : 0, affixes: [] });
const isBare = p => !!p && SLOTS.every(k => !p.equip[k]);
// ?scene=... showcases: a mid-level hero (L16) with rare/epic tier-2 gear of the chosen weapon variant (legacy ids accepted)
function showcaseKit(p, wfam = 'sword') {
  wfam = FAMILY_TIERS[variantId(wfam)] && item('weapon', variantId(wfam)) ? variantId(wfam) : 'sword';
  const set = { sword: ['knighthelm', 'warden', 'knightgreaves'], staff: ['arcanecowl', 'dreamweave', 'clothsandals'], bow: ['wardenhood', 'stalker', 'stalkershoes'] }[wfam];
  const t2 = f => FAMILY_TIERS[f][2].split(':')[0];
  p.level = 16; p.xp = Math.round(xpToNext(16) * 0.4); p.dust = 140;
  p.equip.weapon = makeItem(t2(wfam), 'epic', 16, { sockets: 2 }); p.equip.weapon.sockets[0] = 'ruby_3';
  ['head', 'chest', 'boots'].forEach((s, i) => { p.equip[s] = makeItem(t2(set[i]), i === 1 ? 'epic' : 'rare', 16, { sockets: 1 }); });
  p.equip.chest.sockets[0] = 'diamond_2'; p.equip.head.sockets[0] = 'topaz_2';
  recalcStats(p, true);
}
function sampleBag(p) {
  const L = p.level, put = e => bagAdd(p, e);
  RARITIES.slice(0, 4).forEach((r, i) => put(rollItem(L, r, SLOTS[i % 4])));   // legendary = the named unique below
  put(makeUnique('lanternplate', L)); put(makeItem('auroraedge', 'epic', 26));   // a named legendary; too high level: red requirement
  for (let k = 0; k < 6; k++) put(rollItem(L - 4 + k, pick2(['common', 'uncommon', 'rare'])));
  GEM_TYPES.forEach((t, i) => put({ gem: `${t}_${1 + (i % 3)}`, n: 1 + (i % 3) }));
  put({ gem: 'amethyst_3', n: 1 });
}

// ===== makeTestItem(opts): a valid, deterministic v2 item for UI / art work (no RNG; the game never drops these) ===========
// opts (all optional): base | slot ('weapon'|'head'|'chest'|'boots'|'ring'|'amulet'|'belt', default 'weapon') + variant (a
//   FAMILY_TIERS key, default the slot's first family) + tier (0..4, trinkets 0..2) · rarity ('rare') · ilvl (the base req)
//   · affixes: a count or [{ id, tier?, v?, kind? }] (default: the §19.1 count for the rarity, ring P only, belt S only,
//   amulet 1P+1S; v = the tier's mid-range) · sockets: a count or an array of gem ids / null · boon: a BOONS id, an object
//   or false · unique: a UNIQUES / trinket-unique id (sets base, rule and name) · rule · tempered: true | affix id · hist · name
// e.g. makeTestItem({ slot: 'chest', variant: 'warden', tier: 2, rarity: 'epic', sockets: ['ruby_2', null], tempered: true })
//      makeTestItem({ slot: 'ring', rarity: 'rare', boon: 'fireBurn' })     makeTestItem({ unique: 'rootcrown' })
function makeTestItem(opts = {}) {
  const uq = opts.unique || null, trk = trinketBases();
  let base = opts.base || (uq && (UNIQUES[uq] ? UNIQUES[uq].base : trk[uq] ? uq : null));
  if (!base) {
    const slot = opts.slot || 'weapon';
    if (TRINKET_KINDS.includes(slot)) {
      const list = Object.values(trk).filter(t => t.slot === slot && !t.unique && !t.boon);
      base = (list.find(t => t.tier === (opts.tier | 0)) || list[0] || {}).id;
    } else {
      const fam = FAMILY_TIERS[opts.variant ? variantId(opts.variant) : ITEMS[slot][0].id];
      base = fam && fam[clamp(opts.tier | 0, 0, 4)].split(':')[0];
    }
  }
  const b = baseOf(base); if (!b) throw new Error('makeTestItem: unknown base / variant ' + (base || opts.variant));
  const rarity = RARITY[opts.rarity] ? opts.rarity : uq ? (UNIQUES[uq] && UNIQUES[uq].mythic ? 'mythic' : 'legendary') : 'rare';
  const ilvl = clamp(Math.round(opts.ilvl || b.reqLvl), 1, MAX_LEVEL);
  const req = clamp(Math.max(b.reqLvl, ilvl - 2, rarity === 'mythic' ? MYTHIC_REQ : 0), 1, MAX_LEVEL);
  const A = typeof AFFIX_V2 !== 'undefined' ? AFFIX_V2 : { prefix: { power: [{ name: 'Keen', r: [0.03, 0.05] }] }, suffix: { hp: [{ name: '', r: [20, 30] }] } };
  const tier = affixTier(ilvl), legend = RARITY[rarity].i >= 4;
  const pool = kind => Object.keys(kind === 'P' ? A.prefix : A.suffix).filter(id => !/^on[A-Z]/.test(id) && (legend || id !== 'resAll'));
  const mid = (id, kind, t) => { const row = (kind === 'P' ? A.prefix : A.suffix)[id]; const r = row && row[t - 1] && row[t - 1].r; return r ? +((r[0] + r[1]) / 2).toFixed(3) : 0.05; };
  let affixes;
  if (Array.isArray(opts.affixes)) affixes = opts.affixes.map(a => { const kind = a.kind || affixKind(a.id), t = a.tier || tier; return { id: a.id, tier: t, v: a.v != null ? a.v : mid(a.id, kind, t), kind }; });
  else {
    let [np, ns] = AFFIX_COUNT[rarity];
    if (typeof opts.affixes === 'number') { const n = opts.affixes; np = Math.ceil(n / 2); ns = n - np; }
    if (b.slot === 'ring') { np += ns; ns = 0; } else if (b.slot === 'belt') { ns += np; np = 0; } else if (b.slot === 'amulet') { np = Math.min(np, 1); ns = Math.min(ns, 1); }
    affixes = pool('P').slice(0, np).map(id => ({ id, tier, v: mid(id, 'P', tier), kind: 'P' })).concat(pool('S').slice(0, ns).map(id => ({ id, tier, v: mid(id, 'S', tier), kind: 'S' })));
  }
  affixes.sort((a, c) => (a.kind === 'P' ? 0 : 1) - (c.kind === 'P' ? 0 : 1));
  const maxSock = b.slot === 'ring' ? 0 : TRINKET_KINDS.includes(b.slot) ? 1 : RARITY[rarity].sockets[1];
  const sockets = Array.isArray(opts.sockets) ? opts.sockets.slice(0, Math.max(maxSock, opts.sockets.length)) : Array(opts.sockets != null ? clamp(opts.sockets | 0, 0, 3) : maxSock).fill(null);
  let boon = null;
  if (TRINKET_KINDS.includes(b.slot) && opts.boon !== false && rarity !== 'common') {
    const rows = typeof BOONS !== 'undefined' ? BOONS[b.slot] || [] : [], row = b.boon || (typeof opts.boon === 'object' ? opts.boon : rows.find(r => r.id === opts.boon) || rows[0]);
    if (row) boon = { id: row.id, grade: rarity === 'uncommon' ? 'minor' : 'major', text: row.text };
  }
  let name = opts.name || { prefix: null, suffix: null };
  if (!opts.name && !uq && !b.unique && RARITY[rarity].i >= 1) {
    const P = affixes.find(a => a.kind === 'P'), S = affixes.find(a => a.kind === 'S');
    const pre = P && A.prefix[P.id] && A.prefix[P.id][P.tier - 1] ? A.prefix[P.id][P.tier - 1].name : null;
    const suf = rarity === 'mythic' && typeof MYTHIC_NAMES !== 'undefined' ? MYTHIC_NAMES[0] : S && typeof SUFFIX_NOUN !== 'undefined' && SUFFIX_NOUN[S.id] ? 'of the ' + SUFFIX_NOUN[S.id] : null;
    name = rarity === 'uncommon' ? { prefix: pre, suffix: pre ? null : suf } : { prefix: pre, suffix: suf };
  }
  const temp = opts.tempered ? { affix: typeof opts.tempered === 'string' ? opts.tempered : (affixes[0] || {}).id || null } : null;
  return v2Item({ id: newUid(), base, rarity, ilvl, req, affixes, sockets, boon, rule: opts.rule || uq || b.rule || null, unique: uq || b.unique || null,
    hist: opts.hist || newHist(), tempered: temp, name });
}
