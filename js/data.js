'use strict';
// ---------------------------------------------------------------------------
// Gear roster and skills. Loadout v3 "Lead / Support" (docs/design/loadout.md): nothing is learned, everything comes from
// what Aerin wears. HAND item: M1 action (the combo), Q spell, Shift+Q ultimate. OFFHAND item: M2 off-action, E spell,
// Shift+E ultimate. Armour: head R, chest F, boots V (the dodge). Pockets Z / X / C hold consumables (POCKETS).
// `label` = the variant's display name; `name` stays the family's M2 name (also the T2 base name and the basic tooltip).
// ---------------------------------------------------------------------------
// ===== weapons (docs/design/weapons-and-skills.md): WEAPONS[class].variants[variantId] ==========================================================
// A class owns the rhythm + passive and the off-action (CLASS_OFF); a variant owns its element, hands (1 | 2), its three skills
// (action = the basic / hold, `spell`, `ult`; they never change with tier or rarity) and its look. A `planned` row is a
// NAME-ONLY placeholder: no basic, no skills, no FAMILY_TIERS / BASES row. `legacy` = the pre-v4 family id (save v3).
// `hidden` = live but never dropped (Daggers: the M4a balsim pair Sword+Daggers; its art falls back to the sword).
const WEAPONS = {
  blades: { name: 'Blades', rhythm: '3-hit, 0.42 s, 8 MP/hit', passive: '3rd hit is a wide sweep, cancel-friendly', variants: {
    sword: { id: 'sword', legacy: 'dawnblade', label: 'Sword', name: 'Dawnblade', kind: 'sword', element: 'slash', icon: 'sword', color: '#ffcf6a', desc: 'Sword forged from the first light of morning. Close-range, cleaving combos.',
      basic: { name: 'Dawn Cut', dmg: 50, rate: 0.42 }, hands: 1, spell: 'sunslash', ult: 'judgement' },
    rapier: { id: 'rapier', label: 'Rapier', name: 'Rapier', planned: 'M4' },
    mace: { id: 'mace', label: 'Mace', name: 'Mace', planned: 'M4' },
  } },
  greatarms: { name: 'Greatarms', rhythm: '2-hit, 0.62 s, 14 MP, charge 1 s x1.8', passive: 'poise', variants: {
    axe: { id: 'axe', label: 'Axe', name: 'Axe', legacy: 'dawnbreaker', planned: 'M5' },
    hammer: { id: 'hammer', label: 'Hammer', name: 'Hammer', planned: 'M6' },
    halberd: { id: 'halberd', label: 'Halberd', name: 'Halberd', planned: 'M6' },
  } },
  shots: { name: 'Shots', rhythm: '1 shot, 0.36 s', passive: 'Focus: still for 0.6 s, next shot crits', variants: {
    bow: { id: 'bow', legacy: 'moonbow', label: 'Bow', name: 'Moonbow', kind: 'bow', element: 'pierce', icon: 'bow', color: '#c9d8ff', desc: 'Strung with moonlight. Fast shots, traps and evasive tumbles.',
      basic: { name: 'Moon Arrow', dmg: 30, rate: 0.36 }, hands: 2, hold: 'focus', spell: 'multishot', ult: 'arrowrain' },
    crossbow: { id: 'crossbow', label: 'Crossbow', name: 'Crossbow', planned: 'M4' },
    chakram: { id: 'chakram', label: 'Chakram', name: 'Chakram', planned: 'M5' },
  } },
  foci: { name: 'Foci', rhythm: 'bolt, 0.48 s, builds MP', passive: 'reactions refund 10 % MP', variants: {
    staff: { id: 'staff', legacy: 'starfall', label: 'Staff', name: 'Starfall Staff', kind: 'staff', element: 'arcane', icon: 'staff', color: '#7fe6ff', desc: 'A staff that remembers the night sky. Ranged spells and huge area damage.',
      basic: { name: 'Arcane Bolt', dmg: 32, rate: 0.48 }, hands: 2, hold: 'channel', spell: 'firebolt', ult: 'meteor' },
    spellbook: { id: 'spellbook', label: 'Spellbook', name: 'Spellbook', planned: 'M5' },
    orb: { id: 'orb', label: 'Orb', name: 'Orb', planned: 'M5' },
  } },
  shadows: { name: 'Shadows', rhythm: '4-hit (§17)', passive: 'backstab + Marks', variants: {
    daggers: { id: 'daggers', legacy: 'nightfang', label: 'Daggers', name: 'Nightfang', kind: 'daggers', element: 'pierce', icon: 'sword', color: '#b9a8ff', hidden: true, art: 'sword',
      desc: 'A pair of night-forged fangs. Four quick cuts; circle to the rear.', basic: { name: 'Fang Cut', dmg: 27, rate: 0.28 }, hands: 1, spell: 'fanknives', ult: 'deathmark' },
    claws: { id: 'claws', label: 'Claws', name: 'Claws', planned: 'M6' },
    fans: { id: 'fans', label: 'Fans', name: 'Fans', planned: 'M7' },
  } },
};
// ===== armour (docs/design/armour-suits.md): ARMOUR[class].suits[suitId].pieces[slot] =====================================================
// The chest piece's family id IS the suit id (warden / dreamweave / stalker). Helm and boots pieces keep their own family
// ids (knighthelm ...): the live sprite sheets and FAMILY_TIERS are keyed by them. Each sits in the suit whose C / Shift
// skill it carries per §24. A null piece or a `planned` suit is not built yet (nothing drops it). Pieces mix freely;
// suit twists and class rules land in M4.
const ARMOUR = {
  heavy: { name: 'Heavy', profile: 'HP/def; slash/pierce +25, lightning -25', rule: 'melee skills gain poise', suits: {
    warden: { id: 'warden', name: 'Warden', pieces: {
      head: { id: 'knighthelm', name: 'Knight Helm', icon: 'helm', color: '#cfd6ea', skill: 'warcry', stats: { def: 0.08 }, desc: '+8% defence.',
      pal: { H: '#cfd6ea', h: '#8e97b8', L: '#ffffff', R: '#e0475e' } },
      chest: { id: 'warden', legacy: 'knightplate', name: 'Knight Plate', icon: 'chest', color: '#a9b4d4', skill: 'bulwark', stats: { def: 0.2, hp: 220 }, res: { slash: 0.25, pierce: 0.25, lightning: -0.25 }, desc: '+20% defence, +220 HP.',
      pal: { A: '#a9b4d4', a: '#6d779e', l: '#e6ecfa', C: '#3b5bb5', c: '#263f86', P: '#4b4f6e' } },
      boots: { id: 'knightgreaves', name: 'Knight Greaves', icon: 'boots', color: '#b9c2dc', skill: 'charge', stats: { def: 0.05 }, desc: '+5% defence.', pal: { O: '#b9c2dc' } },
    } },
    crusader: { id: 'crusader', name: 'Crusader', planned: 'M6', pieces: { head: null, chest: null, boots: null } },
    juggernaut: { id: 'juggernaut', name: 'Juggernaut', planned: 'M4', pieces: { head: null, chest: null, boots: null } },
  } },
  caster: { name: 'Caster', profile: 'MP/power; arcane +25, physical -25', rule: 'zones follow you', suits: {
    dreamweave: { id: 'dreamweave', name: 'Dreamweave', pieces: {
      head: null,   // Arcane Ward helm: M4
      chest: { id: 'dreamweave', legacy: 'dreamrobe', name: 'Dreamweave Robe', icon: 'chest', color: '#9c7ae0', skill: 'manasurge', stats: { power: 0.25, mp: 120, mpRegen: 5 }, res: { arcane: 0.25, slash: -0.25, pierce: -0.25 }, desc: '+25% power, +120 MP.',
      pal: { A: '#7a5cc4', a: '#4f3a8f', l: '#b8a0f0', C: '#2f2466', c: '#1f1846', P: '#5a3f9c' } },
      boots: { id: 'clothsandals', name: 'Cloud Sandals', icon: 'boots', color: '#e7c9a0', skill: 'blink', stats: { mpRegen: 3 }, desc: '+3 MP/s.', pal: { O: '#e7c9a0' } },
    } },
    frostweave: { id: 'frostweave', name: 'Frostweave', pieces: {   // only the helm is live (Frost Nova)
      head: { id: 'arcanecowl', name: 'Arcane Cowl', icon: 'helm', color: '#9c7ae0', skill: 'frostnova', stats: { power: 0.1 }, desc: '+10% power.',
      pal: { H: '#5d3fa8', h: '#3d2878', L: '#9c7ae0' } },
      chest: null, boots: null,
    } },
    stormweave: { id: 'stormweave', name: 'Stormweave', planned: 'M7', pieces: { head: null, chest: null, boots: null } },
  } },
  medium: { name: 'Medium', profile: 'crit/haste; pierce +25, fire -25', rule: 'projectiles pierce once', suits: {
    stalker: { id: 'stalker', name: 'Stalker', pieces: {
      head: null,   // Hunter's Mark helm: M4
      chest: { id: 'stalker', legacy: 'stalkerjacket', name: 'Stalker Jacket', icon: 'chest', color: '#c08a5e', skill: 'shadowveil', stats: { crit: 0.18, haste: 0.15 }, res: { pierce: 0.25, fire: -0.25 }, desc: '+18% crit, +15% attack speed.',
      pal: { A: '#8c5d3f', a: '#5e3d2a', l: '#c08a5e', C: '#2f6b4f', c: '#1f4a37', P: '#3e3a4a' } },
      boots: { id: 'stalkershoes', name: 'Stalker Shoes', icon: 'boots', color: '#7a5038', skill: 'sprint', stats: { speed: 0.45 }, desc: '+12% move speed.', pal: { O: '#6b4430' } },   // §24 cuts Sprint (Stalker Shift becomes Tumble in M4)
    } },
    thornwarden: { id: 'thornwarden', name: 'Thornwarden', pieces: {   // only the helm is live (Mend)
      head: { id: 'wardenhood', name: 'Warden Hood', icon: 'helm', color: '#6aa77e', skill: 'mend', stats: { regen: 5 }, desc: '+5 HP/s regeneration.',
      pal: { H: '#3f7a58', h: '#2a5340', L: '#6aa77e' } },
      chest: null, boots: null,
    } },
    duelist: { id: 'duelist', name: 'Duelist', planned: 'M6', pieces: { head: null, chest: null, boots: null } },
  } },
  shadow: { name: 'Shadow', profile: 'speed/crit; pierce +25, nature -25', rule: 'dashes leave decoys', suits: {
    shade: { id: 'shade', name: 'Shade', legacy: 'shadeleathers', planned: 'M4', pieces: { head: null, chest: null, boots: null } },
    nightshade: { id: 'nightshade', name: 'Nightshade', planned: 'M6', pieces: { head: null, chest: null, boots: null } },
    mirage: { id: 'mirage', name: 'Mirage', planned: 'M7', pieces: { head: null, chest: null, boots: null } },
  } },
};
// pre-v4 family id -> v4 variant / suit id (§23.6, §24). Ids not listed are unchanged (the helm and boots families).
const VARIANT_RENAME = { dawnblade: 'sword', dawnbreaker: 'axe', moonbow: 'bow', starfall: 'staff', nightfang: 'daggers',
  knightplate: 'warden', dreamrobe: 'dreamweave', stalkerjacket: 'stalker', shadeleathers: 'shade' };
const variantId = id => VARIANT_RENAME[id] || id;
// ITEMS = the LIVE families per slot, in their M2 order (drop pools and pick2 index order are unchanged). This flat view
// is what the engine reads (item(slot, id), ITEMS[slot]); each row is the same object as in WEAPONS / ARMOUR and gains
// slot + class (+ suit for armour) here.
const ITEMS = { weapon: [], head: [], chest: [], boots: [], offhand: [] };
for (const id of ['sword', 'staff', 'bow', 'daggers']) for (const cls in WEAPONS) { const v = WEAPONS[cls].variants[id]; if (v && !v.planned) { v.class = cls; v.slot = 'weapon'; ITEMS.weapon.push(v); } }
for (const [slot, ids] of [['head', ['knighthelm', 'arcanecowl', 'wardenhood']], ['chest', ['warden', 'dreamweave', 'stalker']], ['boots', ['knightgreaves', 'clothsandals', 'stalkershoes']]])
  for (const id of ids) for (const cls in ARMOUR) for (const suit in ARMOUR[cls].suits) {
    const pc = ARMOUR[cls].suits[suit].pieces[slot];
    if (pc && pc.id === id) { pc.class = cls; pc.suit = suit; pc.slot = slot; ITEMS[slot].push(pc); }
  }
// ===== OFFHAND lines (docs/design/loadout.md "Slot matrix", "Shields", "Companions: decks") ===============================
// A shield fits OFFHAND only (never under a two-hander); a companion is worn and fits OFFHAND with any HAND item. Each line
// has action (M2), spell (E) and ultimate (Shift+E). A companion is a DECK: its spell fires the active entry, its action
// cycles / primes, its ultimate fires every entry. `deck` = the PAGES kind it holds (page | arrow).
const OFFHANDS = {
  shields: { name: 'Shields', variants: {
    buckler: { id: 'buckler', label: 'Buckler', name: 'Buckler', kind: 'shield', role: 'shield', element: 'slash', icon: 'shield', color: '#c9b48a', hands: 1,
      stats: { def: 0.08, hp: 60 }, desc: 'A small round shield. Parry, bash, and hold the line.', action: 'parryplus', spell: 'bash', ult: 'aegis' },
  } },
  companions: { name: 'Companions', variants: {
    grimoire: { id: 'grimoire', label: 'Grimoire', name: 'Grimoire', kind: 'grimoire', role: 'companion', deck: 'page', element: 'arcane', icon: 'orbs', color: '#c79bff', hands: 0,
      stats: { mp: 40, mpRegen: 1 }, desc: 'A book of dream pages. Turn the page, cast it, or read the whole chapter.', action: 'turn', spell: 'cast', ult: 'chapter' },
    quiver: { id: 'quiver', label: 'Quiver', name: 'Quiver', kind: 'quiver', role: 'companion', deck: 'arrow', element: 'pierce', icon: 'arrows', color: '#a6c8ff', hands: 0,
      stats: { crit: 0.04, haste: 0.04 }, desc: 'A quiver of special arrows. Nock one, loose it, or empty the quiver.', action: 'nock', spell: 'loose', ult: 'quiverstorm' },
  } },
};
for (const cls in OFFHANDS) for (const id in OFFHANDS[cls].variants) { const v = OFFHANDS[cls].variants[id]; v.class = cls; v.slot = 'offhand'; ITEMS.offhand.push(v); }
// the class off-action: M2 with a 1H HAND item and no OFFHAND item, and the M2 of a 1H weapon worn in OFFHAND
const CLASS_OFF = { blades: 'parry', shadows: 'step', shots: 'snapshot', foci: 'ward' };
// deck entries (pages and arrows) are re-homed casts (zero new casts). deck: 'page' (Grimoire) | 'arrow' (Quiver) | 'both' (shared).
// Capacity by the companion's tier (PAGE_CAP). They live in the hero's Pages store (p.pages, the "Pages tab") and are socketed
// into the companion's `pages` array.
const PAGES = {
  frostshard: { deck: 'page' }, barrage: { deck: 'page' }, gravity: { deck: 'page' }, starstorm: { deck: 'page' }, chain: { deck: 'page' },
  orbit: { deck: 'page' }, dreamveil: { deck: 'page' }, shootingstar: { deck: 'page' }, secondwind: { deck: 'page' }, bless: { deck: 'page' },
  dawnwave: { deck: 'both' }, moonbeam: { deck: 'both' }, piercing: { deck: 'arrow' }, snare: { deck: 'arrow' },
};
const PAGE_CAP = [2, 3, 4, 5, 6, 6];   // by companion tier T1..T5 (+ Mythic)
const PAGE_LOCK = 1.0;                // every page / arrow shares a 1.0 s casting rhythm
const pageFits = (id, deck) => !!PAGES[id] && (PAGES[id].deck === deck || PAGES[id].deck === 'both');
// Grips (loadout.md "Grips"): a named pairing, matched by the two items' variant tags (never by slot checks). M4a ships the
// three the balsim pairs need; hook sites read p.grip (game.js recalcStats). The Bow + Quiver name waits for the M4b naming pass.
const GRIPS = [
  { id: 'grip_vanguard', name: 'Vanguard', tags: ['sword', 'buckler'], hint: 'A parry primes Sunslash: +40% damage.' },
  { id: 'grip_archmage', name: 'Archmage', tags: ['staff', 'grimoire'], hint: 'Pages hit 20% harder; Chapter costs 80 charge.' },
  { id: 'grip_bow_quiver', name: 'Bow + Quiver', tags: ['bow', 'quiver'], hint: 'Loose costs no Focus: a loosed arrow always crits.' },
];
// pocket consumables (Z / X / C). `max` refills at a checkpoint; the potion keeps its own counter (p.potions, belt-aware max).
const POCKETS = {
  potion: { name: 'Health Potion', icon: 'potion', color: '#ff6a8a', desc: 'Heal 40% of max HP.' },
  flask: { name: 'Mana Flask', icon: 'surge', color: '#7fb0ff', max: 2, desc: 'Restore 50% of max MP.' },
  bomb: { name: 'Fire Bomb', icon: 'fire', color: '#ff8a4a', max: 3, desc: 'Throw a bomb that bursts into flame at your aim.' },
};
const POCKET_DEFAULT = ['potion', 'flask', 'bomb'];
const item = (slot, id) => ITEMS[slot] && ITEMS[slot].find(i => i.id === id);

// helper: clamp a cast target to a max range from the player
function targetIn(p, tx, ty, range) {
  const d = dist(p.x, p.y, tx, ty);
  if (d <= range) return [tx, ty];
  return [p.x + (tx - p.x) / d * range, p.y + (ty - p.y) / d * range];
}

// element = damage type per docs/design/elements-statuses.md: slash | pierce | fire | frost | nature | lightning | arcane | holy (gloom: enemies only).
// stagger (0-3) rides on heavy hits (stored on the target; the stagger bar is M4). Gems amplify by element (items.js).
// weight = hitlag weight w (docs/design/combat-feel.md): basic / light 1 (default), heavy 1.5, ultimate 2. It replaces the old explicit
// hitstop() calls: game.js hitlag() freezes the target clamp(round((2 + 6r) w), 2, 8) steps and picks the global freeze.
const SKILLS = {
  // ---------------- Sword (blades; was the Dawnblade family) ----------------
  sunslash: { name: 'Sunslash', element: 'slash', icon: 'arc', color: '#ffcf6a', cd: 3, mp: 18, aim:{shape:'cone',range:2.1,arc:2.5}, desc: 'Sweep a wide arc of dawnlight in front of you.',
    cast(p, a) { swingWeapon(p, 0.26, 2.8); hitCone(p.x, p.y, a, 2.5, 2.1, 150, { knock: 0.35 }); fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 2.6, r: 2.1, col: '#ffd77a', life: 0.28, w: 5 }); sfx('slash'); } },
  heroic: { name: 'Heroic Strike', element: 'slash', stagger: 3, weight: 1.5, icon: 'strike', color: '#ffb84a', cd: 5, mp: 25, aim:{shape:'cone',range:1.9,arc:1.7}, desc: 'Lunge forward and smash — stuns for 1s.',
    cast(p, a) {
      dashPlayer(p, Math.cos(a), Math.sin(a), 1.4, 0.12, { onEnd: () => {
        swingWeapon(p, 0.2, 2.2); hitCone(p.x, p.y, a, 1.7, 1.9, 170, { stun: 1.0, knock: 0.7 });
        fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 1.8, r: 1.9, col: '#fff2b0', life: 0.3, w: 7 }); shake(5); sfx('heavy');
      } });
    } },
  dashstrike: { name: 'Dash Strike', element: 'slash', icon: 'dash', color: '#ffd77a', cd: 6, mp: 25, aim:{shape:'dash',range:3.8,len:3.8,w:1.0}, desc: 'Dash through enemies, cutting everything in your path.',
    cast(p, a) { dashPlayer(p, Math.cos(a), Math.sin(a), 3.8, 0.22, { trail: '#ffe9a0', hit: { dmg: 130, r: 1.0, knock: 0.3 }, invuln: true }); sfx('dash'); } },
  whirl: { name: 'Whirling Blade', element: 'slash', icon: 'spin', color: '#ffe08a', cd: 7, mp: 30, aim:{shape:'self',range:0,r:2.0}, desc: 'Spin three times, hitting all around you.',
    cast(p) {
      for (let k = 0; k < 3; k++) delay(k * 0.22, () => {
        p.spin = 0.22; hitArea(p.x, p.y, 2.0, 60, { knock: 0.25 });
        fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: k * 2.1, arc: Math.PI * 2, r: 2.0, col: '#ffe9a0', life: 0.22, w: 4 }); sfx('slash');
      });
    } },
  judgement: { name: 'Radiant Judgement', element: 'holy', weight: 2, icon: 'beam', color: '#fff2b0', cd: 16, mp: 60, aim:{shape:'circle',range:6,r:2.5}, desc: 'ULTIMATE — call a pillar of light: huge damage and a long stun.',
    cast(p, a, tx, ty) {
      [tx, ty] = targetIn(p, tx, ty, 6);
      fx({ type: 'marker', x: tx, y: ty, r: 2.5, col: '#ffe9a0', life: 0.5 });
      delay(0.5, () => { hitArea(tx, ty, 2.5, 340, { stun: 1.4 }); fx({ type: 'pillar', x: tx, y: ty, col: '#fff2b0', life: 0.7, r: 2.5 }); burst(tx, ty, 0, 40, ['#fff6d6', '#ffd77a', '#ffffff'], 5); shake(8); sfx('boom'); });
    } },
  dawnwave: { name: 'Dawn Wave', element: 'holy', weight: 2, icon: 'wave', color: '#ffe9a0', cd: 12, mp: 45, aim:{shape:'proj',range:10.8,w:1.0}, desc: 'PAGE — Release a crescent of light that pierces everything.',
    cast(p, a) { swingWeapon(p, 0.25, 2.4); spawnProj({ x: p.x, y: p.y, z: p.z + 1.4, ang: a, speed: 9, r: 1.0, dmg: 220, pierce: 99, life: 1.2, kind: 'wave', col: '#ffe9a0', knock: 0.4 }); sfx('wave'); } },
  // ---------------- Staff (foci; was the Starfall family) ----------------
  firebolt: { name: 'Firebolt', element: 'fire', icon: 'fire', color: '#ff8a4a', cd: 2.5, mp: 18, aim:{shape:'proj',range:13.2,w:0.35}, desc: 'Hurl a bolt that explodes and burns.',
    cast(p, a) { castAnim(p); spawnProj({ x: p.x, y: p.y, z: p.z + 1.6, ang: a, speed: 11, r: 0.35, dmg: 74, life: 1.2, kind: 'fire', col: '#ff9a4a', burn: 2, explode: { r: 1.1, dmg: 30 } }); sfx('fire'); } },
  frostshard: { name: 'Frost Shards', element: 'frost', icon: 'frost', color: '#9fe8ff', cd: 3, mp: 20, aim:{shape:'proj',range:9.6,w:0.3}, desc: 'Fire three piercing shards that slow.',
    cast(p, a) { castAnim(p); for (const o of [-0.22, 0, 0.22]) spawnProj({ x: p.x, y: p.y, z: p.z + 1.6, ang: a + o, speed: 12, r: 0.3, dmg: 68, life: 0.8, kind: 'frost', col: '#bff4ff', pierce: 1, slow: 2 }); sfx('frost'); } },
  barrage: { name: 'Arcane Barrage', element: 'arcane', icon: 'orbs', color: '#c79bff', cd: 6, mp: 30, aim:{shape:'proj',range:14.4,w:0.3}, desc: 'Five homing missiles seek out foes.',
    cast(p, a) { castAnim(p); for (let k = 0; k < 5; k++) delay(k * 0.07, () => spawnProj({ x: p.x, y: p.y, z: p.z + 1.6, ang: a + (k - 2) * 0.35, speed: 8, r: 0.3, dmg: 30, life: 1.8, kind: 'arcane', col: '#d6b0ff', homing: 7 })); sfx('arcane'); } },
  gravity: { name: 'Gravity Well', element: 'arcane', icon: 'well', color: '#a07aff', cd: 9, mp: 35, aim:{shape:'circle',range:7,r:2.8}, desc: 'Open a well that drags enemies in and grinds them.',
    cast(p, a, tx, ty) { castAnim(p); [tx, ty] = targetIn(p, tx, ty, 7); zone({ x: tx, y: ty, r: 2.8, life: 2.6, tick: 0.25, dmg: 26, pull: 3.2, col: '#a07aff', kind: 'well' }); WIND.cast('well', tx, ty, 0); sfx('arcane'); } },
  meteor: { name: 'Meteor', element: 'fire', weight: 2, icon: 'meteor', color: '#ff7a4a', cd: 18, mp: 70, aim:{shape:'circle',range:7,r:2.7}, desc: 'ULTIMATE — call down a meteor. Massive area damage + burn.',
    cast(p, a, tx, ty) {
      castAnim(p); [tx, ty] = targetIn(p, tx, ty, 7);
      fx({ type: 'marker', x: tx, y: ty, r: 2.7, col: '#ff8a4a', life: 0.9 });
      fx({ type: 'meteor', x: tx, y: ty, life: 0.9, col: '#ff9a4a' });
      delay(0.9, () => { hitArea(tx, ty, 2.7, 400, { burn: 4, knock: 0.6 }); fx({ type: 'ring', x: tx, y: ty, r: 3, col: '#ffb070', life: 0.5 }); burst(tx, ty, 0, 60, ['#ffd27a', '#ff8a4a', '#ff4a3a', '#fff'], 7); shake(10); sfx('boom'); });
    } },
  starstorm: { name: 'Starstorm', element: 'holy', weight: 2, icon: 'stars', color: '#bfe8ff', cd: 16, mp: 60, aim:{shape:'circle',range:7,r:2.4}, desc: 'PAGE — A storm of falling stars over an area.',
    cast(p, a, tx, ty) {
      castAnim(p); [tx, ty] = targetIn(p, tx, ty, 7);
      fx({ type: 'marker', x: tx, y: ty, r: 2.6, col: '#bfe8ff', life: 2.2 });
      for (let k = 0; k < 14; k++) delay(0.1 + k * 0.14, () => {
        const r = Math.sqrt(Math.random()) * 2.4, an = Math.random() * 6.28, sx = tx + Math.cos(an) * r, sy = ty + Math.sin(an) * r;
        fx({ type: 'meteor', x: sx, y: sy, life: 0.25, col: '#cfeaff', small: true });
        delay(0.25, () => { hitArea(sx, sy, 1.0, 85, {}); burst(sx, sy, 0, 10, ['#ffffff', '#bfe8ff'], 3); shake(2); });
      });
      sfx('arcane');
    } },
  // ---------------- Bow (shots; was the Moonbow family) ----------------
  multishot: { name: 'Multishot', element: 'pierce', icon: 'arrows', color: '#c9d8ff', cd: 3, mp: 18, aim:{shape:'cone',range:10.5,arc:0.56}, desc: 'Loose a fan of five arrows.',
    cast(p, a) { castAnim(p); for (let k = -2; k <= 2; k++) spawnProj({ x: p.x, y: p.y, z: p.z + 1.5, ang: a + k * 0.14, speed: 15, r: 0.25, dmg: 38, life: 0.7, kind: 'arrow', col: '#e7eeff' }); sfx('bow'); } },
  piercing: { name: 'Piercing Shot', element: 'pierce', weight: 1.5, icon: 'pierce', color: '#a6c8ff', cd: 4, mp: 22, aim:{shape:'proj',range:13.2,w:0.4}, desc: 'A charged arrow that pierces every enemy in a line.',
    cast(p, a) { castAnim(p); spawnProj({ x: p.x, y: p.y, z: p.z + 1.5, ang: a, speed: 22, r: 0.4, dmg: 175, life: 0.6, kind: 'arrow', col: '#cfe0ff', pierce: 99, big: true, knock: 0.4 }); sfx('bow'); shake(2); } },
  tumble: { name: 'Tumble', element: 'pierce', icon: 'roll', color: '#9ad8ff', cd: 5, mp: 12, aim:{shape:'dash',range:2.8,len:2.8}, desc: 'Roll away from your aim; your next shots deal +30% for 3s.',
    cast(p, a) { dashPlayer(p, -Math.cos(a), -Math.sin(a), 2.8, 0.2, { invuln: true, roll: true }); addBuff(p, 'focus', 3); WIND.cast('tumble', p.x, p.y, a); sfx('dash'); } },
  snare: { name: 'Snare Trap', element: 'nature', icon: 'trap', color: '#8fe0a0', cd: 8, mp: 20, aim:{shape:'circle',range:5,r:1.4}, desc: 'Throw a trap that roots and wounds the first enemies to step in.',
    cast(p, a, tx, ty) { [tx, ty] = targetIn(p, tx, ty, 5); zone({ x: tx, y: ty, r: 1.4, life: 8, trap: true, dmg: 95, stun: 2.2, col: '#8fe0a0', kind: 'trap' }); sfx('trap'); } },
  arrowrain: { name: 'Rain of Arrows', element: 'pierce', weight: 2, icon: 'rain', color: '#c9d8ff', cd: 16, mp: 60, aim:{shape:'circle',range:7.5,r:2.4}, desc: 'ULTIMATE — arrows rain down on an area, slowing everything.',
    cast(p, a, tx, ty) { castAnim(p); [tx, ty] = targetIn(p, tx, ty, 7.5); zone({ x: tx, y: ty, r: 2.4, life: 3.2, tick: 0.2, dmg: 32, slow: 1, col: '#c9d8ff', kind: 'rain' }); sfx('bow'); } },
  moonbeam: { name: 'Moonbeam', element: 'holy', weight: 2, icon: 'moonbeam', color: '#d8e4ff', cd: 15, mp: 55, aim:{shape:'line',range:11,len:11,w:0.9}, desc: 'PAGE — Channel a beam of moonlight down a long line.',
    cast(p, a) {
      castAnim(p, 0.4); p.rootT = 0.35;
      fx({ type: 'line', x: p.x, y: p.y, ang: a, len: 11, w: 0.9, col: '#d8e4ff', life: 0.35, tele: true });
      delay(0.35, () => { hitLine(p.x, p.y, a, 11, 0.9, 310, { knock: 0.5 }); fx({ type: 'beam', x: p.x, y: p.y, z: p.z + 1.5, ang: a, len: 11, col: '#e8f0ff', life: 0.4 }); shake(6); sfx('beam'); });
    } },
  // ---------------- Armour ----------------
  bulwark: { name: 'Bulwark', element: 'slash', stagger: 2, icon: 'shield', color: '#a9b4d4', cd: 14, mp: 20, aim:{shape:'self',range:0,r:1.7}, desc: 'CHEST — take 60% less damage for 3.5s and shove foes away.',
    cast(p) { addBuff(p, 'bulwark', 3.5); hitArea(p.x, p.y, 1.7, 30, { knock: 1.0 }); fx({ type: 'ring', x: p.x, y: p.y, r: 1.8, col: '#cfe0ff', life: 0.35 }); sfx('shield'); } },
  manasurge: { name: 'Mana Surge', element: 'arcane', icon: 'surge', color: '#9c7ae0', cd: 18, mp: 0, aim:{shape:'self',range:0,r:1.4}, desc: 'CHEST — restore 120 MP and gain +30% power for 6s.',
    cast(p) { p.mp = Math.min(p.maxMp, p.mp + 120); addBuff(p, 'surge', 6); fx({ type: 'ring', x: p.x, y: p.y, r: 1.4, col: '#c7a8ff', life: 0.5 }); burst(p.x, p.y, p.z + 1, 20, ['#c7a8ff', '#ffffff'], 2); sfx('arcane'); } },
  shadowveil: { name: 'Shadow Veil', element: 'arcane', icon: 'cloak', color: '#6aa77e', cd: 15, mp: 20, aim:{shape:'self',range:0}, desc: 'CHEST — vanish for 3s (+40% speed); your next hit is a guaranteed critical.',
    cast(p) { addBuff(p, 'veil', 3); burst(p.x, p.y, p.z + 1, 20, ['#2f6b4f', '#1a1326', '#8fe0a0'], 2); sfx('dash'); } },
  warcry: { name: 'War Cry', element: 'slash', stagger: 2, icon: 'shout', color: '#ffcf6a', cd: 12, mp: 20, aim:{shape:'self',range:0,r:2.6}, desc: 'HELMET — a roar that stuns and knocks back nearby enemies.',
    cast(p) { hitArea(p.x, p.y, 2.6, 40, { stun: 1.3, knock: 0.9 }); fx({ type: 'ring', x: p.x, y: p.y, r: 2.7, col: '#ffd77a', life: 0.4 }); shake(4); sfx('shout'); } },
  frostnova: { name: 'Frost Nova', element: 'frost', icon: 'nova', color: '#9fe8ff', cd: 12, mp: 25, aim:{shape:'self',range:0,r:2.6}, desc: 'HELMET — freeze all nearby enemies in place for 2s.',
    cast(p) { hitArea(p.x, p.y, 2.6, 60, { stun: 2.0, freeze: true }); fx({ type: 'ring', x: p.x, y: p.y, r: 2.7, col: '#bff4ff', life: 0.5 }); burst(p.x, p.y, 0.5, 30, ['#ffffff', '#bff4ff', '#7fd2ff'], 4); sfx('frost'); } },
  mend: { name: 'Mend', element: 'nature', icon: 'heart', color: '#8fe0a0', cd: 14, mp: 25, aim:{shape:'self',range:0}, desc: 'HELMET — heal 25% of max HP over 4s.',
    cast(p) { addBuff(p, 'mend', 4); sfx('heal'); } },
  charge: { name: 'Charge', element: 'slash', stagger: 3, weight: 1.5, icon: 'charge', color: '#b9c2dc', cd: 7, st: 35, aim:{shape:'dash',range:4.2,len:4.2,w:1.0}, desc: 'BOOTS — charge forward, bowling enemies over.',
    cast(p, a) { dashPlayer(p, Math.cos(a), Math.sin(a), 4.2, 0.26, { trail: '#cfe0ff', hit: { dmg: 60, r: 1.0, knock: 1.0 }, invuln: true }); sfx('dash'); } },
  blink: { name: 'Blink', element: 'arcane', icon: 'blink', color: '#e7c9a0', cd: 6, st: 30, aim:{shape:'dash',range:3.6,len:3.6}, desc: 'BOOTS — teleport a short distance toward your aim.',
    cast(p, a) { blinkPlayer(p, a, 3.6); sfx('blink'); } },
  sprint: { name: 'Sprint', element: 'nature', icon: 'sprint', color: '#c08a5e', cd: 9, st: 30, aim:{shape:'self',range:0}, desc: 'BOOTS — +80% move speed for 3s and shake off slows.',
    cast(p) { addBuff(p, 'sprint', 3); p.slowT = 0; burst(p.x, p.y, 0.2, 10, ['#ffffff', '#e7d6c0'], 2); sfx('dash'); } },
  // §28: bare feet (no boots yet) still dodge: a short roll toward your aim (game.js slotSkill, UNARMED.roll)
  roll: { name: 'Roll', element: 'slash', icon: 'roll', color: '#e7e0ff', cd: 1.2, st: 25, aim:{shape:'dash',range:2.4,len:2.4}, desc: 'BAREFOOT — a quick roll toward your aim. Boots replace it.',
    cast(p, a) { dashPlayer(p, Math.cos(a), Math.sin(a), 2.4, 0.22, { invuln: true, roll: true }); sfx('dash'); } },
  // ---------------- Daggers (shadows; live for the M4a Sword+Daggers pair) ----------------
  fanknives: { name: 'Fan of Knives', element: 'pierce', icon: 'arrows', color: '#b9a8ff', cd: 4, mp: 20, aim:{shape:'self',range:0,r:5}, desc: 'Throw a ring of eight piercing knives.',
    cast(p, a) { castAnim(p, 0.15); for (let k = 0; k < 8; k++) spawnProj({ x: p.x, y: p.y, z: p.z + 1.3, ang: a + k * Math.PI / 4, speed: 13, r: 0.25, dmg: 44, life: 0.4, kind: 'arrow', col: '#d6c8ff', pierce: 1 }); sfx('bow'); } },
  deathmark: { name: 'Death Mark', element: 'pierce', weight: 2, icon: 'star', color: '#b9a8ff', cd: 14, mp: 50, aim:{shape:'circle',range:7,r:1.6}, desc: 'ULTIMATE — mark a spot: a cut now, a killing burst 1.2 s later.',
    cast(p, a, tx, ty) {
      [tx, ty] = targetIn(p, tx, ty, 7);
      hitArea(tx, ty, 1.6, 120, { knock: 0.2 }); fx({ type: 'marker', x: tx, y: ty, r: 1.6, col: '#b9a8ff', life: 1.2 });
      delay(1.2, () => { hitArea(tx, ty, 1.8, 330, { stun: 0.6 }); fx({ type: 'ring', x: tx, y: ty, r: 1.9, col: '#d6c8ff', life: 0.4 }); burst(tx, ty, 0, 30, ['#ffffff', '#b9a8ff'], 4); shake(6); sfx('boom'); });
    } },
  // ---------------- Off-actions (M2: stamina, no MP, no charge; loadout.md slot matrix) ----------------
  parry: { name: 'Parry', element: 'slash', icon: 'shield', color: '#ffe6a0', cd: 1, cdKey: 'parry', st: 12, off: true, aim:{shape:'self',range:0}, desc: 'OFF-ACTION — a 0.25 s parry window; a parried hit is negated and the attacker staggered (riposte).',
    cast(p) { startParry(p, PARRY.blades); } },
  parryplus: { name: 'Parry+', element: 'slash', icon: 'shield', color: '#c9b48a', cd: 1, cdKey: 'parry', st: 12, off: true, aim:{shape:'self',range:0}, desc: 'BUCKLER — a 0.35 s parry window; reflects projectiles from T3.',
    cast(p) { startParry(p, PARRY.buckler, { reflect: offTier(p) >= 2 }); } },
  step: { name: 'Step', element: 'pierce', icon: 'dash', color: '#b9a8ff', cd: 0.8, st: 10, off: true, aim:{shape:'dash',range:0.6,len:0.6}, desc: 'OFF-ACTION — a 0.6-tile sidestep; your next hit is a backstab (+30% crit).',
    cast(p, a) { const s = IN && IN.move && IN.move.mag ? 1 : -1, sa = a + s * Math.PI / 2; dashPlayer(p, Math.cos(sa), Math.sin(sa), 0.6, 0.1, {}); p.stepMark = G.t + 2; sfx('dash'); } },
  snapshot: { name: 'Snapshot', element: 'pierce', icon: 'pierce', color: '#c9d8ff', cd: 1.5, st: 10, off: true, aim:{shape:'proj',range:10,w:0.25}, desc: 'OFF-ACTION — a quick shot that always crits.',
    cast(p, a) { castAnim(p, 0.12); spawnProj({ x: p.x, y: p.y, z: p.z + 1.5, ang: a, speed: 17, r: 0.25, dmg: 34, life: 0.6, kind: 'arrow', col: '#e7eeff', crit: true }); sfx('bow'); } },
  ward: { name: 'Ward', element: 'arcane', icon: 'surge', color: '#9fe8ff', cd: 4, st: 15, off: true, aim:{shape:'self',range:0,r:2.2}, desc: 'OFF-ACTION — a 1.5 s mana shield (-50% damage taken) that pops into a nova.',
    cast(p) { addBuff(p, 'ward', 1.5); delay(1.5, () => { hitArea(p.x, p.y, 2.2, 60, { knock: 0.5 }); fx({ type: 'ring', x: p.x, y: p.y, r: 2.3, col: '#9fe8ff', life: 0.35 }); sfx('arcane'); }); } },
  // ---------------- Buckler (shield): action Parry+, spell Bash, ultimate Aegis ----------------
  bash: { name: 'Bash', element: 'slash', stagger: 2, weight: 1.5, icon: 'strike', color: '#c9b48a', cd: 4, mp: 18, aim:{shape:'cone',range:1.8,arc:1.6}, desc: 'A short shield dash that staggers what it hits.',
    cast(p, a) { dashPlayer(p, Math.cos(a), Math.sin(a), 1.4, 0.12, { onEnd: () => { swingWeapon(p, 0.16, 1.6); hitCone(p.x, p.y, a, 1.6, 1.8, 120, { knock: 0.8, stun: 0.4 }); fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 1.6, r: 1.8, col: '#f2e2b8', life: 0.22, w: 6 }); shake(3); sfx('heavy'); } }); } },
  aegis: { name: 'Aegis', element: 'holy', weight: 2, icon: 'shield', color: '#fff2b0', cd: 12, mp: 30, aim:{shape:'self',range:0,r:1.6}, desc: 'ULTIMATE — for 3 s every hit is parried, and each parry restores 10% HP.',
    cast(p) { addBuff(p, 'aegis', 3); fx({ type: 'ring', x: p.x, y: p.y, r: 1.6, col: '#fff2b0', life: 0.5 }); sfx('shield'); } },
  // ---------------- Grimoire / Quiver (companions = decks) ----------------
  turn: { name: 'Turn', element: 'arcane', icon: 'orbs', color: '#c79bff', cd: 0.5, st: 8, off: true, aim:{shape:'proj',range:9,w:0.3}, desc: 'Turn to the next page and flick a free cantrip.',
    cast(p, a) { deckNext(p); castAnim(p, 0.12); spawnProj({ x: p.x, y: p.y, z: p.z + 1.6, ang: a, speed: 11, r: 0.3, dmg: 22, life: 0.8, kind: 'arcane', col: '#d6b0ff' }); sfx('arcane'); } },
  nock: { name: 'Nock', element: 'pierce', icon: 'arrows', color: '#a6c8ff', cd: 0.5, st: 8, off: true, aim:{shape:'self',range:0}, desc: 'Nock the next arrow; your next shot hits 40% harder and pierces once.',
    cast(p) { deckNext(p); p.nocked = G.t + 4; sfx('bow'); } },
  chapter: { name: 'Chapter', element: 'arcane', weight: 2, icon: 'stars', color: '#c79bff', cd: 12, mp: 0, aim:{shape:'circle',range:7,r:2.4}, desc: 'ULTIMATE — read every page in the book over 1.5 s.',
    cast(p, a, tx, ty) { deckAll(p, a, tx, ty); } },
  quiverstorm: { name: 'Quiver Storm', element: 'pierce', weight: 2, icon: 'rain', color: '#a6c8ff', cd: 12, mp: 0, aim:{shape:'circle',range:7.5,r:2.4}, desc: 'ULTIMATE — loose every arrow in the quiver over 1.5 s.',
    cast(p, a, tx, ty) { deckAll(p, a, tx, ty); } },
  // ---------------- The Stopped Hour (rule stillhour): Hush replaces the item's spell ----------------
  hush: { name: 'Hush', element: 'arcane', icon: 'veil', color: '#bcd0ff', cd: 3, mp: 30, toggle: true, aim:{shape:'self',range:0}, desc: 'Toggle: the world slows to a quarter; you do not. Drains 60 MP/s; hero damage x0.6.',
    cast(p) { hushStart(p); } },
  // ---------------- Pages (Grimoire entries; were the character skills) ----------------
  secondwind: { name: 'Second Wind', element: 'nature', icon: 'heart', color: '#ff8fb0', cd: 25, mp: 30, aim:{shape:'self',range:0}, desc: 'PAGE — instantly heal 35% of max HP.',
    cast(p) { healPlayer(p, p.maxHp * 0.35 * healMul(p)); fx({ type: 'ring', x: p.x, y: p.y, r: 1.2, col: '#ffb0c8', life: 0.5 }); burst(p.x, p.y, p.z + 1, 24, ['#ffb0c8', '#ffffff', '#8fe0a0'], 2); sfx('heal'); } },
  orbit: { name: 'Arcane Orbit', element: 'arcane', icon: 'orbit', color: '#c79bff', cd: 16, mp: 35, aim:{shape:'self',range:0}, desc: 'PAGE — three orbs circle you for 8s, burning anything they touch.',
    cast(p) { addBuff(p, 'orbit', 8); sfx('arcane'); } },
  chain: { name: 'Chain Lightning', element: 'lightning', icon: 'chain', color: '#9fe0ff', cd: 7, mp: 30, aim:{shape:'circle',range:7,r:3}, desc: 'PAGE — lightning leaps between up to 6 enemies.',
    cast(p, a, tx, ty) { castAnim(p); chainLightning(p, tx, ty); sfx('zap'); } },
  dreamveil: { name: 'Dreamveil', element: 'arcane', icon: 'veil', color: '#ffb0e0', cd: 30, mp: 40, aim:{shape:'self',range:0,r:8}, desc: 'PAGE — bend the dream: enemies move at 35% speed for 4s.',
    cast(p) { addBuff(p, 'dreamveil', 4); fx({ type: 'ring', x: p.x, y: p.y, r: 8, col: '#ffb0e0', life: 0.8 }); sfx('veil'); } },
  bless: { name: 'Blessing of Dawn', element: 'holy', icon: 'bless', color: '#ffe08a', cd: 24, mp: 30, aim:{shape:'self',range:0}, desc: 'PAGE — +40% damage for 8s.',
    cast(p) { addBuff(p, 'bless', 8); fx({ type: 'pillar', x: p.x, y: p.y, col: '#ffe9a0', life: 0.5, r: 0.8 }); sfx('heal'); } },
  shootingstar: { name: 'Shooting Star', element: 'fire', icon: 'star', color: '#fff2b0', cd: 6, mp: 22, aim:{shape:'circle',range:7,r:1.6}, desc: 'PAGE — a star crashes down at your cursor.',
    cast(p, a, tx, ty) {
      [tx, ty] = targetIn(p, tx, ty, 7);
      fx({ type: 'meteor', x: tx, y: ty, life: 0.35, col: '#fff2b0', small: true });
      delay(0.35, () => { hitArea(tx, ty, 1.6, 170, { knock: 0.4 }); fx({ type: 'ring', x: tx, y: ty, r: 1.7, col: '#fff2b0', life: 0.35 }); burst(tx, ty, 0, 24, ['#fff', '#fff2b0', '#ffd77a'], 4); shake(4); sfx('boom'); });
    } },
};

const BUFFS = {
  bulwark: { name: 'Bulwark', icon: 'shield', color: '#a9b4d4' },
  surge: { name: 'Mana Surge', icon: 'surge', color: '#9c7ae0' },
  veil: { name: 'Shadow Veil', icon: 'cloak', color: '#6aa77e' },
  mend: { name: 'Mend', icon: 'heart', color: '#8fe0a0' },
  sprint: { name: 'Sprint', icon: 'sprint', color: '#c08a5e' },
  orbit: { name: 'Arcane Orbit', icon: 'orbit', color: '#c79bff' },
  dreamveil: { name: 'Dreamveil', icon: 'veil', color: '#ffb0e0' },
  bless: { name: 'Blessing', icon: 'bless', color: '#ffe08a' },
  focus: { name: 'Focus', icon: 'roll', color: '#9ad8ff' },
  ward: { name: 'Ward', icon: 'surge', color: '#9fe8ff' },
  aegis: { name: 'Aegis', icon: 'shield', color: '#fff2b0' },
  hush: { name: 'Hush', icon: 'veil', color: '#bcd0ff' },
};
