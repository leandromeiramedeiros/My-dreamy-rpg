'use strict';
// ---------------------------------------------------------------------------
// Items, loot, gems, XP and save (DESIGN §3–4). ITEMS (data.js) stay the gear
// FAMILIES that decide skills + sprites; BASES are their tiers. An equipped or
// dropped thing is an item INSTANCE:
//   { uid, base, slot, rarity, ilvl, reqLvl, affixes: [{ stat, v }], sockets: [null, 'ruby_2'], unique? }
// Loaded by index.html and editor.html right after data.js: no hud/render/main deps at load time.
// ---------------------------------------------------------------------------
const SLOTS = ['weapon', 'head', 'chest', 'boots'];
const MAX_LEVEL = 40;
const RARITY = {
  common:    { i: 0, name: 'Common',    col: '#d8d8d8', mult: 1.00, affixes: 0, sockets: [0, 1] },
  uncommon:  { i: 1, name: 'Uncommon',  col: '#6ee36e', mult: 1.15, affixes: 1, sockets: [1, 1] },
  rare:      { i: 2, name: 'Rare',      col: '#5aa8ff', mult: 1.35, affixes: 2, sockets: [1, 2] },
  epic:      { i: 3, name: 'Epic',      col: '#c070ff', mult: 1.60, affixes: 3, sockets: [2, 3] },
  legendary: { i: 4, name: 'Legendary', col: '#ffb030', mult: 1.90, affixes: 3, sockets: [3, 3] },
  mythic:    { i: 5, name: 'Mythic',    col: '#ff4f7a', mult: 2.30, affixes: 4, sockets: [3, 3] },
};
const RARITIES = Object.keys(RARITY);
function mixHex(a, b, k) { const A = hexToRgb(a), B = hexToRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
// mythic colour-cycles; everything else is its table colour
const rarityCol = (r, t = G.t) => r === 'mythic' ? mixHex('#ff4f7a', '#ffb0f0', 0.5 + 0.5 * Math.sin(t * 3)) : RARITY[r].col;

// ===== bases: 12 families x 5 tiers (tier 0..4). Existing family ids sit at tier 1 (L8). =====
const TIER_REQ = [1, 8, 16, 24, 32], MYTHIC_REQ = 36, TIER_DMG = [0.7, 1, 1.5, 2.1, 2.8];
const TIER_PCT = [0.6, 1, 1.25, 1.5, 1.8], TIER_FLAT = [0.5, 1, 2, 3.2, 4.5];
const FAMILY_TIERS = {
  dawnblade: ['rustyblade:Rusty Blade', 'dawnblade', 'sunforged:Sunforged Blade', 'auroraedge:Aurora Edge', 'dawneternal:Dawn Eternal'],
  starfall: ['willowwand:Willow Wand', 'starfall', 'cometrod:Comet Rod', 'nebulasceptre:Nebula Sceptre', 'nighteternal:Night Eternal'],
  moonbow: ['hunterbow:Hunter\'s Bow', 'moonbow', 'silverwing:Silverwing Bow', 'eclipsebow:Eclipse Longbow', 'mooneternal:Moon Eternal'],
  knighthelm: ['ironcap:Iron Cap', 'knighthelm', 'sunguard:Sunguard Helm', 'auroravisor:Aurora Visor', 'crownofdawn:Crown of Dawn'],
  arcanecowl: ['novicehood:Novice Hood', 'arcanecowl', 'starweave:Starweave Cowl', 'astralcirclet:Astral Circlet', 'crownofstars:Crown of Stars'],
  wardenhood: ['rangercap:Ranger Cap', 'wardenhood', 'mossmantle:Mossmantle Hood', 'thornwarden:Thornwarden Hood', 'crownofroots:Crown of Roots'],
  knightplate: ['ironmail:Iron Mail', 'knightplate', 'sunplate:Sunforged Plate', 'auroraplate:Aurora Plate', 'dawnaegis:Aegis of Dawn'],
  dreamrobe: ['linenrobe:Linen Robe', 'dreamrobe', 'starwoven:Starwoven Robe', 'nebularobe:Nebula Vestments', 'dreamshroud:Eternal Dreamshroud'],
  stalkerjacket: ['jerkin:Leather Jerkin', 'stalkerjacket', 'nightcoat:Nightstalker Coat', 'shadowweave:Shadowweave Jacket', 'eclipsegarb:Eclipse Garb'],
  knightgreaves: ['ironboots:Iron Boots', 'knightgreaves', 'sungreaves:Sunforged Greaves', 'auroragreaves:Aurora Greaves', 'dawnstriders:Dawnstriders'],
  clothsandals: ['ropesandals:Rope Sandals', 'clothsandals', 'mistwalkers:Mistwalkers', 'skystep:Skystep Sandals', 'cloudsteps:Eternal Cloudsteps'],
  stalkershoes: ['softshoes:Soft Shoes', 'stalkershoes', 'quietstep:Quietstep Boots', 'shadowstep:Shadowstep Boots', 'eclipsetreads:Eclipse Treads'],
};
const BASES = {};
for (const slot of SLOTS) for (const fam of ITEMS[slot]) FAMILY_TIERS[fam.id].forEach((s, tier) => {
  const [id, name] = s.includes(':') ? s.split(':') : [s, fam.name];
  BASES[id] = { id, name, slot, family: fam.id, tier, reqLvl: TIER_REQ[tier], icon: fam.icon, color: fam.color, kind: fam.kind };
});
const familyOf = base => (BASES[base] || {}).family;
// damage types (§5b): the hero resists these; enemies resist all of them + holy
const RES_ELS = ['slash', 'pierce', 'fire', 'frost', 'nature', 'lightning', 'arcane', 'gloom'];
const RES_SHORT = { slash: 'Sl', pierce: 'Pi', fire: 'Fi', frost: 'Fr', nature: 'Na', lightning: 'Li', arcane: 'Ar', gloom: 'Gl' };
const EL_COL = { slash: '#ffffff', pierce: '#e7eeff', fire: '#ff9a4a', frost: '#9fe8ff', nature: '#8fe0a0', lightning: '#fff07a', arcane: '#d6b0ff', holy: '#fff2b0', gloom: '#c070ff' };
const resKey = el => 'res' + el[0].toUpperCase() + el.slice(1);
const PCT_STATS = { def: 1, power: 1, crit: 1, haste: 1, speed: 1, critDmg: 1, cdr: 1, skillDmg: 1, resAll: 1 };
for (const el of RES_ELS) PCT_STATS[resKey(el)] = 1;
function baseStats(b) {
  const fam = item(b.slot, b.family);
  if (b.slot === 'weapon') return { dmg: fam.basic.dmg * TIER_DMG[b.tier] };
  const s = {};
  for (const k in fam.stats) s[k] = fam.stats[k] * (PCT_STATS[k] ? TIER_PCT : TIER_FLAT)[b.tier];
  for (const el in fam.res || {}) s[resKey(el)] = fam.res[el];   // chest family's built-in strength/weakness (±25%, flat)
  return s;
}

// ===== affixes + uniques =========================================================
// value at item level L = (a + b*L) * roll(0.6..1)
const AFFIX = { hp: [25, 6], mp: [15, 3], def: [0.02, 0.002], power: [0.03, 0.004], crit: [0.02, 0.0015], haste: [0.03, 0.003],
  regen: [1, 0.25], mpRegen: [0.8, 0.15], speed: [0.1, 0.01], critDmg: [0.08, 0.008], cdr: [0.02, 0.002], skillDmg: [0.04, 0.004] };
for (const el of RES_ELS) AFFIX[resKey(el)] = 'res';   // resistance affixes roll 10-20%, not by level; resAll is legendary-only
const STAT_NAME = { dmg: 'Damage', hp: 'HP', mp: 'MP', def: 'Armour', power: 'Damage', crit: 'Crit chance', haste: 'Attack speed', regen: 'HP/s',
  mpRegen: 'MP/s', speed: 'Move speed', critDmg: 'Crit damage', cdr: 'Cooldowns', skillDmg: 'Skill damage', resAll: 'All res' };
for (const el of RES_ELS) STAT_NAME[resKey(el)] = el[0].toUpperCase() + el.slice(1) + ' res';
const STAT_ORDER = ['dmg', 'hp', 'mp', 'def', 'power', 'skillDmg', 'crit', 'critDmg', 'haste', 'cdr', 'regen', 'mpRegen', 'speed', 'resAll', ...RES_ELS.map(resKey)];
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
const UNIQUES = {
  rootcrown: { name: 'Root-Crown', base: 'mossmantle', boss: 'pinewood:bramblehorn', desc: 'Snare and Frost Nova root bosses for 1s.' },
  lanternplate: { name: 'Warden\'s Lantern Plate', base: 'sunplate', boss: 'ruins:boss', desc: 'Bulwark reflects projectiles.' },
  tideedge: { name: 'Tide-Edge', base: 'auroraedge', boss: 'grotto:mirelle', desc: 'Dash Strike leaves a frost trail that slows.' },
  cinderstride: { name: 'Cinderstride Boots', base: 'sungreaves', boss: 'caldera:kharzul', desc: 'Boots skill leaves a fire trail; lava immunity 2s.' },
  morrowbane: { name: 'Morrowbane', base: 'dawneternal', boss: 'spire:morrow', mythic: true, desc: 'R ultimate resets on boss phase change.' },
};
const hasUnique = (p, id) => SLOTS.some(s => p.equip[s] && p.equip[s].unique === id);
const uniqueFor = key => Object.keys(UNIQUES).find(k => UNIQUES[k].boss === key);
function makeUnique(id, ilvl) {
  const U = UNIQUES[id], it = makeItem(U.base, U.mythic ? 'mythic' : 'legendary', Math.max(ilvl, BASES[U.base].reqLvl));
  it.unique = id; it.affixes.push({ stat: 'resAll', v: 0.1 }); return it;
}

// ===== gems (DESIGN §4.3) ==========================================================
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
  for (const s of SLOTS) for (const id of (p.equip[s] || { sockets: [] }).sockets) { const g = id && gemParse(id); if (g) a[g.type] += g.grade; }
  return a;
}
// +5% per grade to that element's skills, ADDED to the hit's damage sum. M4 stubs: ruby burn on fireball/meteor,
// sapphire longer slows + nova radius, emerald poison on hit, amethyst area radius (hooks: elementAmp / p.amp).
const elementAmp = (p, el) => 0.05 * ((EL_GEM[el] && p.amp && p.amp[EL_GEM[el]]) || 0);
// diamond: +5 % ultimate charge rate per grade (was -5 % ultimate cooldown before the §15.3 charge bar)
const ultChargeBonus = p => 0.05 * ((p.amp && p.amp.diamond) || 0);
const chainBonus = p => Math.floor(((p.amp && p.amp.topaz) || 0) / 2);
const healMul = p => 1 + 0.06 * ((p.amp && p.amp.emerald) || 0);

// ===== instances ====================================================================
let UID = 0;
const newUid = () => 'i_' + (++UID);
const rarityAtLeast = (r, min) => RARITY[r].i >= RARITY[min].i;
function makeItem(base, rarity = 'common', ilvl, o = {}) {
  const b = BASES[base], R = RARITY[rarity];
  ilvl = clamp(Math.round(ilvl || b.reqLvl), 1, MAX_LEVEL);
  const req = Math.max(b.reqLvl, ilvl - 2, rarity === 'mythic' ? MYTHIC_REQ : 0);
  const it = { uid: newUid(), base, slot: b.slot, rarity, ilvl, reqLvl: clamp(req, 1, MAX_LEVEL), affixes: [], sockets: [] };
  const pool = Object.keys(AFFIX).filter(k => AFFIX[k] !== 'res' && !(b.slot !== 'weapon' && k === 'skillDmg' && Math.random() < 0.5));
  for (let n = 0; n < 2; n++) pool.push(resKey(pick2(RES_ELS)));   // two resist candidates per roll (dupes are skipped)
  for (let n = 0; n < R.affixes && pool.length; n++) {
    const k = pool.splice((Math.random() * pool.length) | 0, 1)[0];
    if (it.affixes.some(a => a.stat === k)) { n--; continue; }
    if (AFFIX[k] === 'res') { it.affixes.push({ stat: k, v: Math.round(10 + Math.random() * 10) / 100 }); continue; }
    const [a, pl] = AFFIX[k];
    let v = (a + pl * ilvl) * (0.6 + Math.random() * 0.4) * (1 + 0.08 * R.i);
    v = PCT_STATS[k] ? Math.round(v * 1000) / 1000 : (v < 10 ? Math.round(v * 10) / 10 : Math.round(v));
    it.affixes.push({ stat: k, v });
  }
  const [s0, s1] = R.sockets, ns = o.sockets != null ? o.sockets : (rarity === 'common' ? (Math.random() < 0.25 ? 1 : 0) : s0 + ((Math.random() * (s1 - s0 + 1)) | 0));
  for (let i = 0; i < ns; i++) it.sockets.push(null);
  return it;
}
// base + affix + unique + gem stats of one instance (summed)
function itemBase(it) {
  const b = BASES[it.base], R = RARITY[it.rarity], k = R.mult * (1 + 0.015 * Math.max(0, it.ilvl - b.reqLvl)), base = {};
  const bs = baseStats(b); for (const st in bs) base[st] = st === 'dmg' ? Math.round(bs[st] * k) : st.startsWith('res') ? bs[st] : bs[st] * k;
  return base;
}
// one instance's stats: base + affixes + socketed gems, summed per stat (additive, §3 balance rule)
function statsOf(it) {
  const s = {}, add = (k, v) => { s[k] = (s[k] || 0) + v; }, base = itemBase(it);
  for (const k in base) add(k, base[k]);
  for (const a of it.affixes) add(a.stat, a.v);
  for (const g of it.sockets) if (g) { const gs = gemStats(g, it.slot); for (const k in gs) add(k, gs[k]); }
  return s;
}
const itemName = it => it.unique && UNIQUES[it.unique] ? UNIQUES[it.unique].name : BASES[it.base].name;
// §20.6: main-path Dust ~900-1,200 (was ~2,820) -> the old table / 2.4 (balsim checks income vs sinks)
const SALVAGE_DIV = 2.4;
const salvageValue = it => Math.max(1, Math.round([1, 3, 8, 20, 50, 120][RARITY[it.rarity].i] * (1 + it.ilvl / 10) / SALVAGE_DIV));
// renderer hook for M2: what the hero visibly wears in a slot
function equippedVisual(slot, p = G.player) {
  const it = p && p.equip[slot]; if (!it) return null;
  const b = BASES[it.base];
  return { family: b.family, tier: b.tier, rarity: it.rarity, gems: it.sockets.filter(Boolean) };
}

// ===== icon routing: the ONE place to swap in js/icons.js (ICONS.*) later =============
const itemIcon = it => icon(BASES[it.base].icon, BASES[it.base].color);
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

// ===== XP / levels (DESIGN §3) ===========================================================

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
function enemyLevel(type) {
  const [a, b] = zoneLevel(), c = enemyClass(type), L = G.player ? G.player.level : a, d = ENEMY[type] || {};
  if (c === 'boss' && d.level) return clamp(+d.level, 1, MAX_LEVEL);   // bosses.js rows carry their story level
  return clamp(c === 'boss' ? b : L + (c === 'elite' ? 2 : 0), a, b);
}
const enemyHpMul = L => 0.6 * Math.pow(1.1, L - 1);
const enemyDmgMul = L => 0.7 * Math.pow(1.06, L - 1);
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
function rollItem(lvl, rarity, slot) {
  const p = G.player;
  slot = slot || pick2(['weapon', 'weapon', 'head', 'chest', 'boots', 'head', 'chest', 'boots']);
  // 40% of drops stay in the families you already wear
  const fams = ITEMS[slot].map(f => f.id), fam = p && p.gear[slot] && Math.random() < 0.4 ? p.gear[slot] : pick2(fams);
  let tier = 0; for (let t = 0; t < 5; t++) if (TIER_REQ[t] <= lvl + 1) tier = t;
  if (tier > 0 && Math.random() < 0.25) tier--;
  if (tier === 4 && !rarityAtLeast(rarity, 'legendary')) tier = 3;   // the Eternal tier is legendary+
  const base = FAMILY_TIERS[fam][tier].split(':')[0];
  return makeItem(base, rarity, lvl + (Math.random() < 0.3 ? 1 : 0));
}
const rollGem = lvl => `${pick2(GEM_TYPES)}_${clamp(1 + Math.floor((lvl + frand(-3, 4)) / 10), 1, GEM_MAX)}`;
// what an enemy leaves behind: [{ kind:'item'|'gem'|'potion', it?, gem? }]
// `unique`: named legendary id for a boss's first kill
function rollLoot(cls, lvl, unique) {
  const out = [], itm = r => out.push({ kind: 'item', it: rollItem(lvl, r) });
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
// the Vale's first chest: try another weapon family, an armour upgrade and a first gem
function starterLoot() {
  const fam = pick2(['starfall', 'moonbow']), arm = pick2(['head', 'chest', 'boots']);
  return [{ kind: 'item', it: makeItem(FAMILY_TIERS[fam][0].split(':')[0], 'uncommon', 1, { sockets: 1 }) },
    { kind: 'item', it: makeItem(FAMILY_TIERS[pick2(ITEMS[arm]).id][0].split(':')[0], 'uncommon', 2, { sockets: 1 }) },
    { kind: 'gem', gem: 'ruby_1' }];
}

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
const isEquipped = (p, it) => SLOTS.some(s => p.equip[s] === it);
function equipItem(p, inst) {
  if (!inst || !BASES[inst.base]) return 'Nothing to equip';
  if (inst.reqLvl > p.level) return `Requires level ${inst.reqLvl}`;
  const i = p.bag.indexOf(inst), old = p.equip[inst.slot];
  if (old === inst) return '';
  p.equip[inst.slot] = inst;
  if (i >= 0) p.bag[i] = old || null; else if (old && !bagAdd(p, old)) { p.equip[inst.slot] = old; return 'Bag full'; }
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
  p.bag[bi] = null; const v = salvageValue(it); p.dust += v; return v;
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
// bag sort: gear by rarity (best first) then slot then item level, gems last (grouped by type and grade)
function sortBag(p) {
  const rank = e => e.gem ? 1000 : -RARITY[e.rarity].i * 100 - e.ilvl / 100;
  const slotI = e => e.gem ? 0 : SLOTS.indexOf(e.slot);
  const list = p.bag.filter(Boolean).sort((a, b) => rank(a) - rank(b) || slotI(a) - slotI(b) || (a.gem ? String(a.gem).localeCompare(b.gem) : 0));
  p.bag = list.concat(new Array(BAG_SIZE - list.length).fill(null));
}
// trigger action `loot`: N items of at least `rarity` at x,y (default: beside the hero) — room-clear rewards
function lootAction(a) {
  const p = G.player, [lo, hi] = zoneLevel(), L = clamp(p.level, lo, hi), min = RARITY[a.rarity] ? a.rarity : 'uncommon', list = [];
  for (let i = 0; i < clamp(+a.count || 1, 1, 12); i++) { let r = rollRarity('elite', L); if (!rarityAtLeast(r, min)) r = min; const it = rollItem(L, r); if (+a.sockets > 0) it.sockets = Array(Math.min(3, +a.sockets)).fill(null); list.push({ kind: 'item', it }); }
  // generator extras: gem: true · chest: 'gold' | 'silver' (one more item, a better gem) · item: key_* | socket_rune | unique id
  if (a.gem) list.push({ kind: 'gem', gem: rollGem(L) });
  if (a.chest === 'gold' || a.chest === 'silver') { list.push({ kind: 'item', it: rollItem(L, a.chest === 'gold' ? 'epic' : 'rare') }); if (a.chest === 'gold') list.push({ kind: 'gem', gem: rollGem(L + 5) }); }
  if (a.item) {
    if (/^key_/.test(a.item)) { const S = G.prog.secrets || (G.prog.secrets = {}); S['key:' + a.item] = true; text(p.x, p.y, p.z + 3.4, 'Key found', '#ffd35a', true); if (typeof UI !== 'undefined') UI.toast({ text: 'Key: ' + a.item.replace(/^key_/, '').replace(/_/g, ' '), col: '#ffd35a' }); sfx('loot'); }
    else if (UNIQUES[a.item]) list.push({ kind: 'item', it: makeUnique(a.item, L) });
    else { (p.runes = p.runes || []).push(a.item); if (typeof UI !== 'undefined') UI.toast({ text: a.item.replace(/_/g, ' '), col: '#b48aff' }); }
  }
  const has = v => v != null && v !== '', x = has(a.x) ? +a.x : p.x + 1, y = has(a.y) ? +a.y : p.y + 1;
  fx({ type: 'pillar', x, y, col: rarityCol(min), life: 0.6, r: 0.8 });
  dropLoot(x, y, list);
}

// ===== inventory actions (input-agnostic: mouse, touch and later gamepad/ui.js drive these) =================
// State: G.ui.open/tab, G.ui.sel (focused item or gem), G.ui.gem (picked gem's bag index), G.ui.salvage, G.ui.note.
// Mouse acts on the first click; touch selects on the first tap and acts on the second.
function openInv(tab) { G.ui.open = true; G.ui.tab = tab || G.ui.tab || 'inv'; G.ui.gem = null; G.ui.salvage = false; G.mouse.down = false; }
function closeInv() { if (!G.ui.open) return; G.ui.open = false; G.ui.gem = null; G.ui.salvage = false; G.ui.sel = null; saveGame(); }
function invNote(s, col = '#ffb0c8') { G.ui.note = { s, col, t: G.t + 2.6 }; if (col === '#ffb0c8') sfx('hurt'); }
// touch and gamepad are select-then-select (CONTROLS.md): the first tap / A shows the item, the second acts
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
  if (G.drops.length > MAX_DROPS) { const i = G.drops.findIndex(q => q.rar === 'common'); G.drops.splice(i >= 0 ? i : 0, 1); }
}
function dropLoot(x, y, list) { list.forEach((d, i) => delay(i * 0.08, () => spawnDrop(x, y, d))); }
function onEnemyKilled(e) {
  if (e.dummy || !G.player) return;
  const p = G.player, c = enemyClassOf(e);
  gainXp(p, killXp(e));
  let uq = null;
  if (c === 'boss') {
    const k = G.map.id + ':' + e.type, d = ENEMY[e.type] || {}, B = typeof BOSSES !== 'undefined' ? BOSSES[d.boss || e.type] : null;
    if (!G.prog.firsts[k]) {
      uq = uniqueFor(k) || (B && B.unique && UNIQUES[B.unique] ? B.unique : null) || Object.keys(UNIQUES).find(u => UNIQUES[u].boss.split(':')[1] === e.type) || null;
      if (B && B.rune) { (p.runes = p.runes || []).push('skill_rune'); if (typeof UI !== 'undefined') UI.toast({ text: 'Skill Rune', col: '#b48aff' }); }   // Mossjaw: guaranteed rune
    }
    G.prog.firsts[k] = true;
  }
  dropLoot(e.x, e.y, rollLoot(c, e.lvl, uq));
  if (c === 'boss') delay(1.5, saveGame);
}
function pickup(p, d) {
  if (d.kind === 'potion') {
    if (p.potions < MAX_POTIONS) { p.potions++; text(p.x, p.y, p.z + 3, '+1 Potion', '#ff8aa8'); } else healPlayer(p, p.maxHp * 0.15);
  } else if (d.kind === 'gem') { if (!bagAdd(p, { gem: d.gem })) return false; text(p.x, p.y, p.z + 3, gemName(d.gem), gemParse(d.gem).def.col); }
  else { if (!bagAdd(p, d.it)) return false; text(p.x, p.y, p.z + 3, itemName(d.it), RARITY[d.it.rarity].col, RARITY[d.it.rarity].i >= 3); }
  sfx(RARITY[d.rar].i >= 3 ? 'loot' : 'pickup');
  if (typeof UI !== 'undefined' && d.kind !== 'potion') {   // loot toast on the right edge (HUD.md)
    if (d.kind === 'gem') UI.toast({ text: gemName(d.gem), icon: gemIcon(gemParse(d.gem).type), col: gemParse(d.gem).def.col });
    else UI.toast({ text: itemName(d.it), icon: itemIcon(d.it), rarity: d.it.rarity });
  } else if (typeof UI !== 'undefined') UI.toast({ text: '+1 Potion', icon: miscIcon('potion'), col: '#ff8fa8' });
  burst(d.x, d.y, d.z + 0.3, 8 + RARITY[d.rar].i * 4, [rarityCol(d.rar), '#ffffff'], 2);
  return true;
}
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
  if (floor) for (const d of list) if (d.kind === 'item' && !rarityAtLeast(d.it.rarity, floor)) d.it = rollItem(L, floor);
  dropLoot(o.x, o.y, list);
  gainXp(p, Math.round(xpToNext(L) * (o.src.starter ? 0.8 : 0.5)));
}
function setCheckpoint(x, y, label) {
  const p = G.player;
  G.checkpoint = { map: G.map.id, x, y };
  p.potions = MAX_POTIONS;
  say(`${label || 'Checkpoint'} — potions refilled`); sfx('heal'); fx({ type: 'ring', x, y, r: 1.4, col: '#9ef0ff', life: 0.5 }); saveGame();
}
function updateLoot(dt) {
  const p = G.player; if (!p || p.dead || G.state !== 'play') return;
  for (const d of G.drops) {
    d.t += dt;
    if (d.t > 0.5 && dist(p.x, p.y, d.x, d.y) < 0.65) {
      if (pickup(p, d)) d.done = true;
      else if (!G.bagWarnT || G.t > G.bagWarnT) { say('Bag full — salvage something (TAB)'); G.bagWarnT = G.t + 2.5; }
    }
  }
  G.drops = G.drops.filter(d => !d.done);
  // chests, shrines and lore tablets wait for the Interact action (Space / A / the touch context button);
  // pickups above stay automatic. G.prompt = the nearest one in reach, for the HUD prompt and interact().
  let best = null, bd = 9;
  for (const o of G.map.objects) {
    // o.use = { kind, reach, on(o), text(o), fn(o) }: map-engine interactables (maps.js: keydoor, lever, fishspot)
    const kind = o.chest && !o.opened ? 'chest' : o.checkpoint ? 'shrine' : o.tablet ? 'tablet' : o.use && o.use.on(o) ? o.use.kind : null; if (!kind) continue;
    const d = dist(p.x, p.y, o.x, o.y), reach = o.use && kind === o.use.kind ? o.use.reach : kind === 'chest' ? 1.3 : kind === 'shrine' ? 1.4 : 1.5;
    if (d < reach && d < bd) { bd = d; best = { kind, obj: o }; }
  }
  if (G.tablet && (!best || best.obj !== G.tablet)) G.tablet = null;   // walking away closes the tablet
  if (best) {
    const o = best.obj, cpHere = G.checkpoint && G.checkpoint.map === G.map.id && dist(G.checkpoint.x, G.checkpoint.y, o.x, o.y) < 2.5;
    best.text = o.use && best.kind === o.use.kind ? o.use.text(o) : best.kind === 'chest' ? 'Open' : best.kind === 'tablet' ? (G.tablet === o ? 'Close' : 'Read') : cpHere ? 'Rest (refill potions)' : 'Rest (set checkpoint)';
    best.x = o.x; best.y = o.y; best.z = o.z || 0;
  }
  G.prompt = best;
}
function interact(p) {
  const q = G.prompt; if (!q || p.dead) return false;
  const o = q.obj;
  if (q.kind === 'chest' && !o.opened) openChest(o);
  else if (q.kind === 'shrine') setCheckpoint(p.x, p.y);
  else if (q.kind === 'tablet') { G.tablet = G.tablet === o ? null : o; if (G.tablet) sfx('pickup'); }
  else if (o.use && q.kind === o.use.kind) o.use.fn(o);
  return true;
}

// ===== potions =========================================================================================
function drinkPotion(p) {
  if (p.dead || G.state !== 'play') return;
  if ((p.potT || 0) > G.t) return;
  if (p.potions <= 0) { say('No potions — they refill at checkpoints'); return; }
  if (p.hp >= p.maxHp) { say('Already at full health'); return; }
  p.potions--; p.potT = G.t + 1; healPlayer(p, p.maxHp * 0.4);
  burst(p.x, p.y, p.z + 1, 16, ['#ff8aa8', '#ffffff', '#ffd6ec'], 2); sfx('heal');
}

// ===== save / load: 3 slots ===================================================================================
// Slot 1 keeps the original key 'dreamy.save.v1' (old saves load as slot 1); slots 2-3 use 'dreamy.save.v1.s2|s3'.
// 'dreamy.slots' = the slots array [{ slot, level, map, t, playtime } | null] x SAVE_SLOTS for the title screen, and
// 'dreamy.slot' the last slot used. Every save is the v3 shape below with its own `slot` field.
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
// Save shape v3 (DESIGN §16.5): { version, slot, player, skills, world, bosses, bestiary, fishing, quests, zone100,
// settings, bindings, stats }. The ultimate charge is not saved. migrate() upgrades older flat saves losslessly.
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
    world: { map: G.map.id, checkpoint: G.checkpoint, trig: G.prog.trig, chests: G.prog.chests, secrets: G.prog.secrets || {}, gates: G.prog.gates || {} },
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
const SAVE_VERSION = 3;
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
      world: { map: s.map, checkpoint: s.cp || null, trig: prog.trig || {}, chests: prog.chests || {}, secrets: {}, gates: {} },
      bosses, bestiary, fishing: {}, quests: {}, zone100: {}, settings: null, bindings: null, stats: { playtime: 0, deaths: 0 },
    };
  }
  return s.version === SAVE_VERSION ? s : null;
}
function clearSave(slot = G.saveSlot || 1) { try { localStorage.removeItem(saveKey(slot)); writeSlotIndex(); } catch (e) { /* ignore */ } }
const hasKey = id => !!(G.prog && G.prog.secrets && G.prog.secrets['key:' + id]);
const validItem = it => it && BASES[it.base] && RARITY[it.rarity] && Array.isArray(it.affixes) && Array.isArray(it.sockets);
function applySave(p, s) {
  const P = s.player || {}, K = s.skills || {}, W = s.world || {};
  p.level = clamp(+P.level || 1, 1, MAX_LEVEL); p.xp = Math.max(0, +P.xp || 0); p.dust = +P.dust || 0;
  p.potions = clamp(P.potions != null ? +P.potions : MAX_POTIONS, 0, MAX_POTIONS);
  for (const slot of SLOTS) { const it = (P.equip || {})[slot]; if (validItem(it) && BASES[it.base].slot === slot) { it.sockets = it.sockets.map(g => gemParse(g) ? g : null); p.equip[slot] = it; } }
  p.bag = Array(BAG_SIZE).fill(null);
  (P.bag || []).slice(0, BAG_SIZE).forEach((e, i) => { if (validItem(e)) p.bag[i] = e; else if (e && gemParse(e.gem) && e.n > 0) p.bag[i] = { gem: e.gem, n: e.n | 0 }; });
  p.tool = P.tool || null;
  if (K.wsk) for (const f in p.wsk) for (const k of ['q', 'e', 'r']) if (K.wsk[f] && SKILLS[K.wsk[f][k]] && item('weapon', f)[k].includes(K.wsk[f][k])) p.wsk[f][k] = K.wsk[f][k];
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
    fishing: s.fishing || {}, quests: s.quests || {}, zone100: s.zone100 || {} };
  G.seen = {};
  for (const k in s.bestiary || {}) { const b = s.bestiary[k] || {}; G.seen[k] = { kills: +b.kills || 0, res: b.res || {}, reactions: b.reactions || {} }; }
  G.checkpoint = W.checkpoint || null;
  G.saveSlot = clamp(+(G.saveSlot || s.slot) || 1, 1, SAVE_SLOTS);
  G.stats = { playtime: +(s.stats && s.stats.playtime) || 0, deaths: +(s.stats && s.stats.deaths) || 0 };
  if (s.settings && typeof applySettings === 'function') applySettings(s.settings);
  if (s.bindings && typeof IN !== 'undefined') IN.setBindings(s.bindings);
  UID = Math.max(UID, +P.uid || 0);
  recalcStats(p, true);
}

// ===== starter + showcase kits ====================================================================================
function starterKit(p) {
  p.equip = { weapon: makeItem('rustyblade', 'common', 1, { sockets: 0 }), head: makeItem('ironcap', 'common', 1, { sockets: 0 }),
    chest: makeItem('ironmail', 'common', 1, { sockets: 1 }), boots: makeItem('ironboots', 'common', 1, { sockets: 0 }) };
  p.bag = Array(BAG_SIZE).fill(null);
}
// ?scene=... showcases: a mid-level hero (L16) with rare/epic tier-2 gear of the chosen weapon family
function showcaseKit(p, wfam = 'dawnblade') {
  const set = { dawnblade: ['knighthelm', 'knightplate', 'knightgreaves'], starfall: ['arcanecowl', 'dreamrobe', 'clothsandals'], moonbow: ['wardenhood', 'stalkerjacket', 'stalkershoes'] }[wfam] || ['knighthelm', 'knightplate', 'knightgreaves'];
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
