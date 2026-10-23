'use strict';
// ---------------------------------------------------------------------------
// Gear roster and skills. Loadout v3 "Lead / Support" (docs/design/loadout.md): nothing is learned, everything comes from
// what Aerin wears. HAND item: M1 action (the combo), Q spell, Shift+Q ultimate. OFFHAND item: M2 off-action, E spell,
// Shift+E ultimate. Armour: head R, chest F, boots V (the dodge). Pockets Z / X / C hold consumables (POCKETS).
// `label` = the variant's display name; `name` stays the family's M2 name (also the T2 base name and the basic tooltip).
// ---------------------------------------------------------------------------
// ===== weapons (docs/design/weapons-and-skills.md): WEAPONS[class].variants[variantId] ==========================================================
// A class owns the rhythm (`swing`: the basicSwing template, game.js), the MP its hand action builds (`mpOnHit`, loadout.md "Resource
// rhythm": per class, basic attacks only), its hold-M1 and the off-action (CLASS_OFF); a variant owns its element, hands (1 | 2), its
// three skills (action = the basic / hold, `spell`, `ult`; they never change with tier or rarity), its swing shape (`sw`) and its look.
// `kind` is a RENDER hint only (render.js WEAPON_POSE: sword swing | staff cast | bow aim; anything else swings). `legacy` = the
// pre-v4 family id (save v3). `name` = the T2 base name (also the basic tooltip). A `planned` row would be NAME-ONLY (none left).
const WEAPONS = {
  blades: { name: 'Blades', swing: 'blade3', mpOnHit: 8, rhythm: '3-hit, 0.42 s, 8 MP/hit', passive: 'Parry as off-action; the 3rd hit is wide', variants: {
    sword: { id: 'sword', legacy: 'dawnblade', label: 'Sword', name: 'Dawnblade', kind: 'sword', element: 'slash', icon: 'sword', color: '#ffcf6a', desc: 'Sword forged from the first light of morning. Close-range, cleaving combos.',
      basic: { name: 'Dawn Cut', dmg: 50, rate: 0.42 }, hands: 1, spell: 'sunslash', ult: 'judgement' },
    rapier: { id: 'rapier', label: 'Rapier', name: 'Moonpoint', kind: 'sword', element: 'pierce', icon: 'sword', color: '#d8e4ff', desc: 'A duelist\'s needle. Long, narrow thrusts; a parry ripostes for a sure crit.',
      basic: { name: 'Thrust', dmg: 52, rate: 0.4 }, sw: 'thrust3', hands: 1, spell: 'fleche', ult: 'perforate', riposte: true },
    mace: { id: 'mace', label: 'Mace', name: 'Dawnmace', kind: 'sword', element: 'slash', icon: 'sword', color: '#f2d27a', desc: 'A flanged mace that rings like a bell. Every hit staggers.',
      basic: { name: 'Knell', dmg: 57, rate: 0.46, stagger: 1 }, hands: 1, spell: 'crush', ult: 'consecrate' },
  } },
  greatarms: { name: 'Greatarms', swing: 'great2', mpOnHit: 14, hold: 'heavy', rhythm: '2-hit, 0.62 s, 14 MP, hold M1 = Heavy Strike 1 s x1.8', passive: 'Heavy Strike holds poise; a worn companion supplies the tools', variants: {
    axe: { id: 'axe', label: 'Axe', name: 'Dawnbreaker', legacy: 'dawnbreaker', kind: 'sword', element: 'slash', icon: 'sword', color: '#ffb070', desc: 'A two-handed axe. Wide, committed swings that cleave a crowd.',
      basic: { name: 'Hew', dmg: 78, rate: 0.62 }, hands: 2, hold: 'heavy', spell: 'cleave', ult: 'colossus' },
    hammer: { id: 'hammer', label: 'Hammer', name: 'Sunhammer', kind: 'sword', element: 'slash', icon: 'sword', color: '#e0c890', desc: 'A maul that cracks the ground. Slow, staggering blows.',
      basic: { name: 'Pound', dmg: 92, rate: 0.66, stagger: 1 }, hands: 2, hold: 'heavy', spell: 'earthbreaker', ult: 'aftershock' },
    halberd: { id: 'halberd', label: 'Halberd', name: 'Dawnglaive', kind: 'sword', element: 'pierce', icon: 'sword', color: '#cfd8f0', desc: 'A long polearm: half again the reach of a sword. Thrust, then sweep.',
      basic: { name: 'Reach', dmg: 84, rate: 0.62 }, sw: 'reach2', hands: 2, hold: 'heavy', spell: 'sweep', ult: 'skewer' },
  } },
  shots: { name: 'Shots', swing: 'shot', mpOnHit: 7, hold: 'focus', rhythm: '1 shot, 0.36 s', passive: 'Focus: still for 0.6 s, next shot crits; Snapshot crits', variants: {
    bow: { id: 'bow', legacy: 'moonbow', label: 'Bow', name: 'Moonbow', kind: 'bow', element: 'pierce', icon: 'bow', color: '#c9d8ff', desc: 'Strung with moonlight. Fast shots, traps and evasive tumbles.',
      basic: { name: 'Moon Arrow', dmg: 30, rate: 0.36 }, hands: 2, hold: 'focus', spell: 'multishot', ult: 'arrowrain' },
    crossbow: { id: 'crossbow', label: 'Crossbow', name: 'Dawn Arbalest', kind: 'bow', element: 'pierce', icon: 'bow', color: '#e0d0b0', desc: 'A four-bolt clip, then a one-second reload. Bolts pierce once.',
      basic: { name: 'Bolt', dmg: 35, rate: 0.3 }, sw: 'quarrel', hands: 2, hold: 'focus', clip: 4, reload: 1, spell: 'piercingbolt', ult: 'ballista' },
    chakram: { id: 'chakram', label: 'Chakram', name: 'Moon Chakram', kind: 'chakram', element: 'slash', icon: 'orbit', color: '#e7eeff', desc: 'A returning disc: it cuts going out and coming back. The one-handed shot.',
      basic: { name: 'Disc', dmg: 19, rate: 0.42 }, sw: 'disc', hands: 1, hold: 'focus', spell: 'ricochet', ult: 'guillotine' },
  } },
  foci: { name: 'Foci', swing: 'magic', mpOnHit: 9, rhythm: 'bolt, 0.48 s, builds MP', passive: 'reactions refund 10 % MP; cantrips are free', variants: {
    staff: { id: 'staff', legacy: 'starfall', label: 'Staff', name: 'Starfall Staff', kind: 'staff', element: 'arcane', icon: 'staff', color: '#7fe6ff', desc: 'A staff that remembers the night sky. Ranged spells and huge area damage.',
      basic: { name: 'Arcane Bolt', dmg: 32, rate: 0.48 }, hands: 2, hold: 'channel', spell: 'firebolt', ult: 'meteor' },
    wand: { id: 'wand', label: 'Wand', name: 'Hazel Wand', kind: 'staff', element: 'arcane', icon: 'staff', color: '#c7e8ff', desc: 'A light focus for the hand. Quick bolts, frost shards and a binding rune.',
      basic: { name: 'Spark', dmg: 31, rate: 0.42 }, hands: 1, spell: 'frostshard', ult: 'runebinding' },
    orb: { id: 'orb', label: 'Orb', name: 'Starfall Orb', kind: 'staff', element: 'lightning', icon: 'orbs', color: '#bff0ff', desc: 'A storm in glass. Hold to channel a beam that drains 6 MP a second.',
      basic: { name: 'Static Bolt', dmg: 38, rate: 0.48 }, hands: 1, hold: 'channel', drain: 6, spell: 'chain', ult: 'tempest' },
  } },
  shadows: { name: 'Shadows', swing: 'shadow4', mpOnHit: 6, rhythm: '4-hit, 0.28 s, 6 MP', passive: 'Backstab: +30% crit from the rear arc; Marks', variants: {
    daggers: { id: 'daggers', legacy: 'nightfang', label: 'Daggers', name: 'Nightfang', kind: 'daggers', element: 'pierce', icon: 'sword', color: '#b9a8ff', art: 'sword',
      desc: 'A pair of night-forged fangs. Four quick cuts; circle to the rear.', basic: { name: 'Fang Cut', dmg: 33, rate: 0.28 }, hands: 1, spell: 'fanknives', ult: 'deathmark' },
    claws: { id: 'claws', label: 'Claws', name: 'Nightclaws', kind: 'daggers', element: 'slash', icon: 'sword', color: '#e0b0a0', desc: 'Frenzy: every hit is 5 % faster than the last (up to +50 %), gone after 1.5 s.',
      basic: { name: 'Rake', dmg: 19, rate: 0.28 }, hands: 1, frenzy: true, spell: 'rend', ult: 'savage' },
    fans: { id: 'fans', label: 'Fans', name: 'Moonfans', kind: 'daggers', element: 'slash', icon: 'wave', color: '#ffc8e8', desc: 'Paper and moonlight. Every hit leaves a Mark, and each Mark slows by 10 %.',
      basic: { name: 'Flutter', dmg: 27, rate: 0.28 }, hands: 1, markAll: true, spell: 'veildance', ult: 'thousandpetals' },
  } },
};
// ===== armour (docs/design/armour-suits.md): ARMOUR[class].suits[suitId].pieces[slot] =====================================================
// 12 suits x 3 pieces. The chest piece's family id IS the suit id. The live pre-M4b helm and boots ids keep theirs (knighthelm ...
// stalkershoes: sprite sheets, FAMILY_TIERS and saves are keyed by them); every other head is `<suit>helm`, every other boots
// `<suit>boots` (the art lanes' contract). Each piece hosts one active: head R, chest F, boots V (the dodge). `res` = the class
// profile (+-25) plus the suit's shift toward its element (<= +-10, armour-suits.md "Balance rules"). Pieces mix freely: three of one
// suit grant its twist (game.js SUIT_EFFECTS, an EFFECTS row src 'suit'); three of one class grant the class rule (game.js CLASS_EFFECTS).
const ARMOUR = {
  heavy: { name: 'Heavy', profile: 'HP/def; slash/pierce +25, lightning -25', rule: 'melee skills gain poise', suits: {
    warden: { id: 'warden', name: 'Warden', element: 'slash', pieces: {
      head: { id: 'knighthelm', name: 'Knight Helm', icon: 'helm', color: '#cfd6ea', skill: 'warcry', stats: { def: 0.08 }, desc: '+8% defence.',
      pal: { H: '#cfd6ea', h: '#8e97b8', L: '#ffffff', R: '#e0475e' } },
      chest: { id: 'warden', legacy: 'knightplate', name: 'Knight Plate', icon: 'chest', color: '#a9b4d4', skill: 'bulwark', stats: { def: 0.2, hp: 220 }, res: { slash: 0.25, pierce: 0.25, lightning: -0.25 }, desc: '+20% defence, +220 HP.',
      pal: { A: '#a9b4d4', a: '#6d779e', l: '#e6ecfa', C: '#3b5bb5', c: '#263f86', P: '#4b4f6e' } },
      boots: { id: 'knightgreaves', name: 'Knight Greaves', icon: 'boots', color: '#b9c2dc', skill: 'charge', stats: { def: 0.05 }, desc: '+5% defence.', pal: { O: '#b9c2dc' } },
    } },
    crusader: { id: 'crusader', name: 'Crusader', element: 'holy', pieces: {
      head: { id: 'crusaderhelm', name: 'Crusader Helm', icon: 'helm', color: '#f2e2b0', skill: 'judgementbell', stats: { def: 0.06, holyDmg: 0.05 }, desc: '+6% defence, +5% holy damage.' },
      chest: { id: 'crusader', name: 'Crusader Hauberk', icon: 'chest', color: '#e8d8a8', skill: 'consecratedguard', stats: { def: 0.18, hp: 240 }, res: { slash: 0.25, pierce: 0.25, lightning: -0.25, holy: 0.1 }, desc: '+18% defence, +240 HP.' },
      boots: { id: 'crusaderboots', name: 'Crusader Sabatons', icon: 'boots', color: '#e0d0a0', skill: 'vault', stats: { def: 0.04, regen: 1 }, desc: '+4% defence, +1 HP/s.' },
    } },
    juggernaut: { id: 'juggernaut', name: 'Juggernaut', element: 'fire', pieces: {
      head: { id: 'juggernauthelm', name: 'Juggernaut Helm', icon: 'helm', color: '#a89888', skill: 'groundslam', stats: { def: 0.07, hp: 20 }, desc: '+7% defence, +20 HP.' },
      chest: { id: 'juggernaut', name: 'Juggernaut Cuirass', icon: 'chest', color: '#9a8878', skill: 'brace', stats: { def: 0.16, hp: 300 }, res: { slash: 0.25, pierce: 0.25, lightning: -0.25, fire: 0.1 }, desc: '+16% defence, +300 HP.' },
      boots: { id: 'juggernautboots', name: 'Juggernaut Treads', icon: 'boots', color: '#8a7868', skill: 'bullrush', stats: { def: 0.04, hp: 30 }, desc: '+4% defence, +30 HP.' },
    } },
  } },
  caster: { name: 'Caster', profile: 'MP/power; arcane +25, physical -25', rule: 'zones follow you', suits: {
    dreamweave: { id: 'dreamweave', name: 'Dreamweave', element: 'arcane', pieces: {
      head: { id: 'dreamweavehelm', name: 'Dreamweave Circlet', icon: 'helm', color: '#b8a0f0', skill: 'arcaneward', stats: { power: 0.08, mp: 40 }, desc: '+8% power, +40 MP.' },
      chest: { id: 'dreamweave', legacy: 'dreamrobe', name: 'Dreamweave Robe', icon: 'chest', color: '#9c7ae0', skill: 'manasurge', stats: { power: 0.25, mp: 120, mpRegen: 5 }, res: { arcane: 0.25, slash: -0.25, pierce: -0.25 }, desc: '+25% power, +120 MP.',
      pal: { A: '#7a5cc4', a: '#4f3a8f', l: '#b8a0f0', C: '#2f2466', c: '#1f1846', P: '#5a3f9c' } },
      boots: { id: 'clothsandals', name: 'Cloud Sandals', icon: 'boots', color: '#e7c9a0', skill: 'blink', stats: { mpRegen: 3 }, desc: '+3 MP/s.', pal: { O: '#e7c9a0' } },
    } },
    frostweave: { id: 'frostweave', name: 'Frostweave', element: 'frost', pieces: {
      head: { id: 'arcanecowl', name: 'Arcane Cowl', icon: 'helm', color: '#9c7ae0', skill: 'frostnova', stats: { power: 0.1 }, desc: '+10% power.',
      pal: { H: '#5d3fa8', h: '#3d2878', L: '#9c7ae0' } },
      chest: { id: 'frostweave', name: 'Frostweave Robe', icon: 'chest', color: '#9fd8f0', skill: 'wintersveil', stats: { power: 0.22, mp: 100, mpRegen: 4, frostDmg: 0.06 }, res: { arcane: 0.25, slash: -0.25, pierce: -0.25, frost: 0.1 }, desc: '+22% power, +100 MP, +6% frost damage.' },
      boots: { id: 'frostweaveboots', name: 'Frostweave Slippers', icon: 'boots', color: '#bfe8f8', skill: 'glide', stats: { mpRegen: 2, speed: 0.1 }, desc: '+2 MP/s, +3% move speed.' },
    } },
    stormweave: { id: 'stormweave', name: 'Stormweave', element: 'lightning', pieces: {
      head: { id: 'stormweavehelm', name: 'Stormweave Hood', icon: 'helm', color: '#d8e870', skill: 'stormcall', stats: { power: 0.08, crit: 0.03 }, desc: '+8% power, +3% crit chance.' },
      chest: { id: 'stormweave', name: 'Stormweave Robe', icon: 'chest', color: '#c8d860', skill: 'staticcloak', stats: { power: 0.18, mp: 100, mpRegen: 4, lightningDmg: 0.04 }, res: { arcane: 0.25, slash: -0.25, pierce: -0.25, lightning: 0.1 }, desc: '+18% power, +100 MP, +4% lightning damage.' },
      boots: { id: 'stormweaveboots', name: 'Stormweave Shoes', icon: 'boots', color: '#e0f080', skill: 'flashstep', stats: { mpRegen: 2, haste: 0.04 }, desc: '+2 MP/s, +4% attack speed.' },
    } },
  } },
  medium: { name: 'Medium', profile: 'crit/haste; pierce +25, fire -25', rule: 'projectiles pierce once', suits: {
    stalker: { id: 'stalker', name: 'Stalker', element: 'pierce', pieces: {
      head: { id: 'stalkerhelm', name: 'Stalker Hood', icon: 'helm', color: '#a07050', skill: 'huntersmark', stats: { crit: 0.05 }, desc: '+5% crit chance.' },
      chest: { id: 'stalker', legacy: 'stalkerjacket', name: 'Stalker Jacket', icon: 'chest', color: '#c08a5e', skill: 'shadowveil', stats: { crit: 0.18, haste: 0.15 }, res: { pierce: 0.25, fire: -0.25 }, desc: '+18% crit, +15% attack speed.',
      pal: { A: '#8c5d3f', a: '#5e3d2a', l: '#c08a5e', C: '#2f6b4f', c: '#1f4a37', P: '#3e3a4a' } },
      boots: { id: 'stalkershoes', name: 'Stalker Shoes', icon: 'boots', color: '#7a5038', skill: 'tumble', stats: { speed: 0.45 }, desc: '+12% move speed.', pal: { O: '#6b4430' } },   // §24: Sprint cut, the Stalker dodge is Tumble (M4b)
    } },
    thornwarden: { id: 'thornwarden', name: 'Thornwarden', element: 'nature', pieces: {
      head: { id: 'wardenhood', name: 'Warden Hood', icon: 'helm', color: '#6aa77e', skill: 'mend', stats: { regen: 5 }, desc: '+5 HP/s regeneration.',
      pal: { H: '#3f7a58', h: '#2a5340', L: '#6aa77e' } },
      chest: { id: 'thornwarden', name: 'Thornwarden Coat', icon: 'chest', color: '#5f9a6e', skill: 'briarmantle', stats: { crit: 0.12, haste: 0.1, regen: 4 }, res: { pierce: 0.25, fire: -0.25, nature: 0.1 }, desc: '+12% crit, +10% attack speed, +4 HP/s.' },
      boots: { id: 'thornwardenboots', name: 'Thornwarden Boots', icon: 'boots', color: '#4f8a5e', skill: 'rootvault', stats: { speed: 0.3, regen: 2 }, desc: '+8% move speed, +2 HP/s.' },
    } },
    duelist: { id: 'duelist', name: 'Duelist', element: 'slash', pieces: {
      head: { id: 'duelisthelm', name: 'Duelist Hat', icon: 'helm', color: '#c05a6a', skill: 'taunt', stats: { crit: 0.03, critDmg: 0.04 }, desc: '+3% crit chance, +4% crit damage.' },
      chest: { id: 'duelist', name: 'Duelist Coat', icon: 'chest', color: '#b04a5a', skill: 'engarde', stats: { crit: 0.06, haste: 0.06, critDmg: 0.04 }, res: { pierce: 0.25, fire: -0.25, slash: 0.1 }, desc: '+6% crit, +6% attack speed, +4% crit damage.' },
      boots: { id: 'duelistboots', name: 'Duelist Boots', icon: 'boots', color: '#8a3a4a', skill: 'sidestep', stats: { speed: 0.35, haste: 0.02 }, desc: '+9% move speed, +2% attack speed.' },
    } },
  } },
  shadow: { name: 'Shadow', profile: 'speed/crit; pierce +25, nature -25', rule: 'dashes leave decoys', suits: {
    shade: { id: 'shade', name: 'Shade', legacy: 'shadeleathers', element: 'gloom', pieces: {
      head: { id: 'shadehelm', name: 'Shade Cowl', icon: 'helm', color: '#6a5a8a', skill: 'smokebomb', stats: { crit: 0.06 }, desc: '+6% crit chance.' },
      chest: { id: 'shade', name: 'Shade Leathers', icon: 'chest', color: '#5a4a7a', skill: 'fadestep', stats: { crit: 0.14, speed: 0.3, haste: 0.08 }, res: { pierce: 0.25, nature: -0.25, gloom: 0.1 }, desc: '+14% crit, +8% move speed, +8% attack speed.' },
      boots: { id: 'shadeboots', name: 'Shade Wraps', icon: 'boots', color: '#4a3a6a', skill: 'shadowstep', stats: { speed: 0.5 }, desc: '+13% move speed.' },
    } },
    nightshade: { id: 'nightshade', name: 'Nightshade', element: 'nature', pieces: {
      head: { id: 'nightshadehelm', name: 'Nightshade Mask', icon: 'helm', color: '#6a8a5a', skill: 'toxinflask', stats: { crit: 0.05, statusChance: 0.05 }, desc: '+5% crit chance, +5% status chance.' },
      chest: { id: 'nightshade', name: 'Nightshade Vest', icon: 'chest', color: '#5a7a4a', skill: 'venomcoat', stats: { crit: 0.12, speed: 0.25, natureDmg: 0.08 }, res: { pierce: 0.25, nature: -0.15 }, desc: '+12% crit, +7% move speed, +8% nature damage.' },
      boots: { id: 'nightshadeboots', name: 'Nightshade Steps', icon: 'boots', color: '#4a6a3a', skill: 'slink', stats: { speed: 0.45, crit: 0.02 }, desc: '+12% move speed, +2% crit chance.' },
    } },
    mirage: { id: 'mirage', name: 'Mirage', element: 'arcane', pieces: {
      head: { id: 'miragehelm', name: 'Mirage Veil', icon: 'helm', color: '#c8a8f0', skill: 'dreamveil', stats: { crit: 0.05, cdr: 0.03 }, desc: '+5% crit chance, 3% shorter cooldowns.' },
      chest: { id: 'mirage', name: 'Mirage Silks', icon: 'chest', color: '#b898e0', skill: 'mirrorimage', stats: { crit: 0.12, speed: 0.25, arcaneDmg: 0.08 }, res: { pierce: 0.25, nature: -0.25, arcane: 0.1 }, desc: '+12% crit, +7% move speed, +8% arcane damage.' },
      boots: { id: 'mirageboots', name: 'Mirage Slippers', icon: 'boots', color: '#a888d0', skill: 'phase', stats: { speed: 0.45, cdr: 0.02 }, desc: '+12% move speed, 2% shorter cooldowns.' },
    } },
  } },
};
// pre-v4 family id -> v4 variant / suit id (§23.6, §24). Ids not listed are unchanged (the helm and boots families).
const VARIANT_RENAME = { dawnblade: 'sword', dawnbreaker: 'axe', moonbow: 'bow', starfall: 'staff', nightfang: 'daggers',
  knightplate: 'warden', dreamrobe: 'dreamweave', stalkerjacket: 'stalker', shadeleathers: 'shade' };
const variantId = id => VARIANT_RENAME[id] || id;
// ITEMS = the LIVE families per slot (drop pools and pick2 index order: the pre-M4b families first, in their M2 order, then the
// M4b lines in roster order; ITEMS[slot][0] is the slot's default family). This flat view is what the engine reads
// (item(slot, id), ITEMS[slot]); each row is the same object as in WEAPONS / ARMOUR / OFFHANDS and gains slot + class (+ suit).
const ITEMS = { weapon: [], head: [], chest: [], boots: [], offhand: [] };
const LIVE_FIRST = { weapon: ['sword', 'staff', 'bow', 'daggers'], head: ['knighthelm', 'arcanecowl', 'wardenhood'], chest: ['warden', 'dreamweave', 'stalker'], boots: ['knightgreaves', 'clothsandals', 'stalkershoes'] };
const byFirst = slot => (a, b) => { const L = LIVE_FIRST[slot] || [], i = L.indexOf(a.id), j = L.indexOf(b.id); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); };
for (const cls in WEAPONS) for (const id in WEAPONS[cls].variants) { const v = WEAPONS[cls].variants[id]; if (v.planned) continue; v.class = cls; v.slot = 'weapon'; if (!v.hold && WEAPONS[cls].hold === 'focus') v.hold = 'focus'; ITEMS.weapon.push(v); }
for (const cls in ARMOUR) for (const suit in ARMOUR[cls].suits) for (const slot of ['head', 'chest', 'boots']) {
  const pc = ARMOUR[cls].suits[suit].pieces[slot]; if (!pc || ARMOUR[cls].suits[suit].planned) continue;
  pc.class = cls; pc.suit = suit; pc.slot = slot; ITEMS[slot].push(pc);
}
for (const slot of ['weapon', 'head', 'chest', 'boots']) ITEMS[slot].sort(byFirst(slot));   // stable: the M4b lines keep roster order
// ===== OFFHAND lines (docs/design/loadout.md "Slot matrix", "Shields", "Companions: decks") ===============================
// A shield fits OFFHAND only (never under a two-hander); a companion is worn and fits OFFHAND with any HAND item. Each line
// has action (M2), spell (E) and ultimate (Shift+E). A companion is a DECK: its spell fires the active entry, its action
// cycles / primes, its ultimate fires every entry (the Warhorn's is Last Stand). `deck` = the PAGES kind it holds (page | arrow | call).
// `guard` = a held M2 (Heater Block, Tower Wall: game.js updateGuard).
const OFFHANDS = {
  shields: { name: 'Shields', variants: {
    buckler: { id: 'buckler', label: 'Buckler', name: 'Iron Buckler', kind: 'shield', role: 'shield', element: 'slash', icon: 'shield', color: '#c9b48a', hands: 1,
      stats: { def: 0.08, hp: 60 }, desc: 'A small round shield. Parry, bash, and hold the line.', action: 'parryplus', spell: 'bash', ult: 'aegis' },
    heater: { id: 'heater', label: 'Heater', name: 'Oath Heater', kind: 'shield', role: 'shield', element: 'slash', icon: 'shield', color: '#a8b8d8', hands: 1,
      stats: { def: 0.1, hp: 80 }, desc: 'A knight\'s shield. Hold to block 70 % from the front; bash through a volley.', action: 'block', spell: 'shieldbash', ult: 'bulwarkcharge' },
    tower: { id: 'tower', label: 'Tower', name: 'Wardwall', kind: 'shield', role: 'shield', element: 'slash', icon: 'shield', color: '#8898b8', hands: 1,
      stats: { def: 0.12, hp: 110 }, desc: 'A wall you carry. Hold to stop everything in front; slow, and very safe.', action: 'wall', spell: 'shove', ult: 'fortress' },
  } },
  companions: { name: 'Companions', variants: {
    grimoire: { id: 'grimoire', label: 'Grimoire', name: 'Dreambook', kind: 'grimoire', role: 'companion', deck: 'page', element: 'arcane', icon: 'orbs', color: '#c79bff', hands: 0,
      stats: { mp: 40, mpRegen: 1 }, desc: 'A book of dream pages. Turn the page, cast it, or read the whole chapter.', action: 'turn', spell: 'cast', ult: 'chapter' },
    quiver: { id: 'quiver', label: 'Quiver', name: 'Moon Quiver', kind: 'quiver', role: 'companion', deck: 'arrow', element: 'pierce', icon: 'arrows', color: '#a6c8ff', hands: 0,
      stats: { crit: 0.04, haste: 0.04 }, desc: 'A quiver of special arrows. Nock one, loose it, or empty the quiver.', action: 'nock', spell: 'loose', ult: 'quiverstorm' },
    warhorn: { id: 'warhorn', label: 'Warhorn', name: 'Rallying Horn', kind: 'warhorn', role: 'companion', deck: 'call', element: 'slash', icon: 'shout', color: '#e0b070', hands: 0,
      stats: { hp: 60, def: 0.04 }, desc: 'A horn of battle calls. Bellow to break a guard, sound the call, or make a Last Stand.', action: 'bellow', spell: 'call', ult: 'laststand' },
  } },
};
for (const cls in OFFHANDS) for (const id in OFFHANDS[cls].variants) { const v = OFFHANDS[cls].variants[id]; v.class = cls; v.slot = 'offhand'; ITEMS.offhand.push(v); }
// the class off-action: M2 with a 1H HAND item and no OFFHAND item, and the M2 of a 1H weapon worn in OFFHAND
const CLASS_OFF = { blades: 'parry', shadows: 'step', shots: 'snapshot', foci: 'ward' };
// deck entries (pages, arrows, calls) are re-homed casts: every entry is a SKILLS row (zero new casts: an entry reuses a live cast,
// or is a data row on a shared cast template, CT below). `deck` = the decks it fits (page = Grimoire, arrow = Quiver, call = Warhorn);
// four entries are shared. Capacity by the companion's tier (PAGE_CAP). They live in the hero's Pages store (p.pages, the "Pages
// tab") and are socketed into the companion's `pages` array. Key order is part of the save v4 -> v5 migration (old runes -> pages):
// the M4a rows stay first.
const PAGES = {
  frostshard: { deck: 'page' }, barrage: { deck: 'page' }, gravity: { deck: 'page' }, starstorm: { deck: 'page' }, chain: { deck: 'page' },
  orbit: { deck: 'page' }, dreamveil: { deck: 'page' }, shootingstar: { deck: 'page' }, secondwind: { deck: ['page', 'call'] }, bless: { deck: ['page', 'call'] },
  dawnwave: { deck: ['page', 'arrow', 'call'] }, moonbeam: { deck: ['page', 'arrow'] }, piercing: { deck: 'arrow' }, snare: { deck: 'arrow' },
  // M4b: mage pages
  firebolt: { deck: 'page' }, stormcall: { deck: 'page' }, toxinflask: { deck: 'page' }, judgementbell: { deck: 'page' }, frostnova: { deck: 'page' },
  // ranger arrows (one shared arrow template, CT.arrow)
  venomarrow: { deck: 'arrow' }, firearrow: { deck: 'arrow' }, frostarrow: { deck: 'arrow' }, bolaarrow: { deck: 'arrow' }, grapplearrow: { deck: 'arrow' },
  splitarrow: { deck: 'arrow' }, explosivearrow: { deck: 'arrow' },
  // warrior calls
  warcry: { deck: 'call' }, rally: { deck: 'call' }, taunt: { deck: 'call' }, quakecall: { deck: 'call' }, stand: { deck: 'call' },
  heroic: { deck: 'call' }, whirl: { deck: 'call' }, dashstrike: { deck: 'call' },
};
const PAGE_CAP = [2, 3, 4, 5, 6, 6];   // by companion tier T1..T5 (+ Mythic)
const PAGE_LOCK = 1.0;                // every page / arrow / call shares a 1.0 s casting rhythm
const pageFits = (id, deck) => { const d = PAGES[id] && PAGES[id].deck; return !!d && (d === deck || d === 'both' || (Array.isArray(d) && d.includes(deck))); };
// Grips (loadout.md "Grips"): a named pairing, matched by the two items' variant tags (never by slot checks). Each is an EFFECTS row
// (src 'grip', game.js GRIP_IMPL carries the bus hooks); the first time a pairing is worn it is a Codex discovery (G.prog.secrets
// 'grip:<id>'). Names that collided with tier or skill names (Hunter, Arbalest, Orbit, Pike Square) got the M4b naming pass.
const GRIPS = [
  { id: 'grip_vanguard', name: 'Vanguard', tags: ['sword', 'buckler'], hint: 'A parry primes Sunslash: +40% damage.' },
  { id: 'grip_twinfangs', name: 'Twin Fangs', tags: ['daggers', 'daggers'], hint: 'Mark cap +1.' },
  { id: 'grip_twinstars', name: 'Twin Stars', tags: ['wand', 'orb'], hint: 'An arcane hit on a Jolted foe takes 2 s off both spells (ICD 4 s).' },
  { id: 'grip_archmage', name: 'Archmage', tags: ['staff', 'grimoire'], hint: 'Pages hit 20% harder; Chapter costs 80 charge.' },
  { id: 'grip_fletcher', name: 'Fletcher', tags: ['bow', 'quiver'], hint: 'A loosed arrow gains +40% crit chance.' },
  { id: 'grip_warband', name: 'Warband', tags: ['axe', 'warhorn'], hint: 'Calls Detonate: a call hit on a Burning foe consumes the Burn for damage.' },
  { id: 'grip_dancer', name: 'Dancer', tags: ['rapier', 'fans'], hint: 'Step shares Parry\'s cooldown: every Step opens a parry window.' },
  { id: 'grip_sanctuary', name: 'Sanctuary', tags: ['mace', 'heater'], hint: 'Consecrate follows you; Block inside it restores 2% HP a second (one zone, no stacking).' },
  { id: 'grip_faultline', name: 'Faultline', tags: ['hammer', 'warhorn'], hint: 'A call makes every live crack erupt again.' },
  { id: 'grip_lodestar', name: 'Lodestar', tags: ['chakram', 'orb'], hint: 'Ricochet bounces twice more and each bounce zaps for lightning.' },
  { id: 'grip_cornered', name: 'Cornered', tags: ['claws', 'buckler'], hint: 'Below half HP Frenzy reaches +75%; a parry adds 3 Frenzy.' },
  { id: 'grip_spellblade', name: 'Spellblade', tags: ['sword', 'grimoire'], hint: 'Pages retype Sunslash: it takes the active page\'s element, +15%.' },
  { id: 'grip_hedgewall', name: 'Hedgewall', tags: ['halberd', 'quiver'], hint: 'Nock primes the Halberd too: the next hit is +40% and pins for 0.6 s.' },
  { id: 'grip_siegeworks', name: 'Siegeworks', tags: ['crossbow', 'quiver'], hint: 'Crossbow clip 6.' },
];
// pocket consumables (Z / X / C). `max` refills at a checkpoint; the potion keeps its own counter (p.potions, belt-aware max).
const POCKETS = {
  potion: { name: 'Health Potion', icon: 'potion', color: '#ff6a8a', desc: 'Heal 40% of max HP.' },
  flask: { name: 'Mana Flask', icon: 'surge', color: '#7fb0ff', max: 2, desc: 'Restore 50% of max MP.' },
  bomb: { name: 'Fire Bomb', icon: 'fire', color: '#ff8a4a', max: 3, desc: 'Throw a bomb that bursts into flame at your aim.' },
};
const POCKET_DEFAULT = ['potion', 'flask', 'bomb'];
const item = (slot, id) => ITEMS[slot] && ITEMS[slot].find(i => i.id === id);

// ===== cast templates (CT) =====================================================================================================
// One shared cast per template: a SKILLS row built on a template is data (its numbers), not a new cast (the M4b budget counts
// templates once). CT.dash = dodges, leaps, carries, trails; CT.buff = a timed buff (optional heal / nova); CT.nova = a burst at
// the hero or the aim (optional delay, zone, cracks, buff, wind); CT.zone = a ground zone at the hero or the aim; CT.arrow =
// every Quiver arrow; CT.guard = a held M2 (Heater Block, Tower Wall). The engine hooks they lean on (zone cap and follow,
// decoys, guard, carry, trails, Marks, poison, root) live in game.js. `after(p, x, y, n)` = a row's small twist hook.
const ctAt = (p, o, tx, ty) => (o.at === 'target' ? targetIn(p, tx, ty, o.range || 6) : [p.x, p.y]);
const CT = {
  dash(o) { return { cast(p, a) {
    let d = a;
    if (o.dir === 'back') d = a + Math.PI;
    else if (o.dir === 'side') { const m = moveAngle(p); d = m != null ? m : a + Math.PI / 2; }
    else if (o.dir === 'move') { const m = moveAngle(p); if (m != null) d = m; }
    const x0 = p.x, y0 = p.y;
    if (o.decoy) spawnDecoy(x0, y0, o.decoy);
    const end = () => {
      if (o.land) { hitArea(p.x, p.y, o.land.r, o.land.dmg, o.land.hit || {}); fx({ type: 'ring', x: p.x, y: p.y, r: o.land.r + 0.2, col: o.col, life: 0.3 }); shake(3); }
      if (o.originZone) zone(Object.assign({ x: x0, y: y0, col: o.col }, o.originZone));
      if (o.after) o.after(p, x0, y0);
    };
    p.invulnT = Math.max(p.invulnT, o.iframes || 0.25);   // every boots skill keeps >= 0.25 s of i-frames (armour-suits.md)
    if (o.blink) { blinkPlayer(p, d, o.dist); p.invulnT = Math.max(p.invulnT, o.iframes || 0.25); end(); }
    else dashPlayer(p, Math.cos(d), Math.sin(d), o.dist, o.dur || 0.25, { invuln: true, trail: o.trail === false ? null : o.col, roll: !!o.roll, hit: o.hit || null, carry: !!o.carry, zoneTrail: o.zoneTrail || null, reflect: !!o.reflect, onEnd: end });
    if (o.buff) addBuff(p, o.buff[0], o.buff[1]);
    if (o.wind) WIND.emit(Object.assign({ x: p.x, y: p.y, dir: d, by: 1 }, o.wind));
    sfx(o.sfx || 'dash');
  } }; },
  buff(o) { return { cast(p) {
    addBuff(p, o.buff, o.t);
    if (o.heal) healPlayer(p, p.maxHp * o.heal * healMul(p));
    if (o.nova) hitArea(p.x, p.y, o.nova.r, o.nova.dmg, o.nova.hit || {});
    fx({ type: 'ring', x: p.x, y: p.y, r: o.nova ? o.nova.r + 0.2 : 1.4, col: o.col, life: 0.4 });
    burst(p.x, p.y, p.z + 1, 14, [o.col, '#ffffff'], 2); sfx(o.sfx || 'shield');
  } }; },
  nova(o) { return { cast(p, a, tx, ty) {
    const [x, y] = ctAt(p, o, tx, ty);
    const go = () => {
      const n = hitArea(x, y, o.r, o.dmg, o.hit || {});
      fx({ type: 'ring', x, y, r: o.r + 0.2, col: o.col, life: 0.4 }); burst(x, y, 0.4, 18, [o.col, '#ffffff'], 3);
      if (o.zone) zone(Object.assign({ x, y, col: o.col }, o.zone));
      if (o.cracks) crackRing(x, y, o.r, o.cracks);
      if (o.wind) WIND.emit(Object.assign({ x, y, dir: a, by: 1 }, o.wind));
      if (o.after) o.after(p, x, y, n);
      if (o.shake) shake(o.shake);
    };
    if (o.buff) addBuff(p, o.buff[0], o.buff[1]);
    if (o.swing) swingWeapon(p, 0.2, o.swing); else castAnim(p);
    if (o.delay) { fx({ type: 'marker', x, y, r: o.r, col: o.col, life: o.delay }); delay(o.delay, go); } else go();
    sfx(o.sfx || 'shout');
  } }; },
  zone(o) { return { cast(p, a, tx, ty) {
    const [x, y] = ctAt(p, o, tx, ty);
    castAnim(p);
    zone(Object.assign({ x, y, col: o.col, follow: !!o.follow }, o.z));
    fx({ type: 'ring', x, y, r: o.z.r + 0.2, col: o.col, life: 0.4 }); sfx(o.sfx || 'arcane');
  } }; },
  arrow(o) { return { cast(p, a) {
    castAnim(p);
    spawnProj(Object.assign({ x: p.x, y: p.y, z: p.z + 1.5, ang: a, speed: 16, r: 0.3, life: 0.75, kind: 'arrow' }, o));
    sfx('bow');
  } }; },
  guard(o) { return { cast(p) { startGuard(p, o); } }; },
};

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
  tumble: { name: 'Tumble', element: 'pierce', icon: 'roll', color: '#9ad8ff', cd: 8, st: 25, aim:{shape:'dash',range:2.8,len:2.8}, desc: 'BOOTS — roll away from your aim; your damage +30% for 1.5 s.',
    cast(p, a) { dashPlayer(p, -Math.cos(a), -Math.sin(a), 2.8, 0.2, { invuln: true, roll: true }); addBuff(p, 'focus', 1.5); WIND.cast('tumble', p.x, p.y, a); sfx('dash'); } },
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
    cast(p, a) { castAnim(p, 0.15); for (let k = 0; k < 8; k++) spawnProj({ x: p.x, y: p.y, z: p.z + 1.3, ang: a + k * Math.PI / 4, speed: 13, r: 0.25, dmg: 52, life: 0.4, kind: 'arrow', col: '#d6c8ff', pierce: 1 }); sfx('bow'); } },
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
  // ================= M4b: every weapon line, shield, companion and suit (docs/design/weapons-and-skills.md, loadout.md, armour-suits.md) =================
  // ---------------- Rapier (blades): Fleche, Perforate; a Parry ripostes for a sure crit (game.js parried) ----------------
  fleche: { name: 'Flèche', element: 'pierce', icon: 'pierce', color: '#d8e4ff', cd: 3, mp: 18, aim:{shape:'dash',range:2.8,len:2.8,w:0.8}, desc: 'Lunge through a line of foes with one long thrust.',
    cast(p, a) { dashPlayer(p, Math.cos(a), Math.sin(a), 2.8, 0.14, { trail: '#e8f0ff', hit: { dmg: 150, r: 0.8, knock: 0.2 } }); fx({ type: 'line', x: p.x, y: p.y, ang: a, len: 2.8, w: 0.5, col: '#e8f0ff', life: 0.2 }); sfx('dash'); } },
  perforate: { name: 'Perforate', element: 'pierce', weight: 2, icon: 'pierce', color: '#e8f0ff', cd: 16, mp: 60, aim:{shape:'line',range:3.2,len:3.2,w:0.5}, desc: 'ULTIMATE — six needle thrusts down a line, then a finishing lunge that always crits.',
    cast(p, a) {
      p.rootT = 0.8;
      for (let k = 0; k < 6; k++) delay(k * 0.1, () => { swingWeapon(p, 0.08, 0.5, k % 2 ? 1 : -1); hitLine(p.x, p.y, a, 3.2, 0.5, 35, { knock: 0.05 }); fx({ type: 'line', x: p.x, y: p.y, ang: a + (k % 2 ? 0.05 : -0.05), len: 3.2, w: 0.3, col: '#e8f0ff', life: 0.1 }); sfx('swing'); });
      delay(0.7, () => { hitLine(p.x, p.y, a, 3.6, 0.6, 110, { knock: 0.5, crit: true, stagger: 2 }); fx({ type: 'beam', x: p.x, y: p.y, z: p.z + 1.2, ang: a, len: 3.6, col: '#ffffff', life: 0.2 }); shake(5); sfx('heavy'); });
    } },
  // ---------------- Mace (blades): Crush, Consecrate; every basic hit staggers 1 ----------------
  crush: { name: 'Crush', element: 'slash', stagger: 3, weight: 1.5, icon: 'strike', color: '#f2d27a', cd: 3.5, mp: 20, aim:{shape:'cone',range:1.9,arc:1.6}, desc: 'An overhead blow that crushes guards: stagger 3.',
    cast(p, a) { swingWeapon(p, 0.22, 1.8, 1); delay(0.12, () => { hitCone(p.x, p.y, a, 1.6, 1.9, 165, { knock: 0.5 }); fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 1.6, r: 1.9, col: '#fff2b0', life: 0.25, w: 7 }); shake(4); sfx('heavy'); }); } },
  consecrate: { name: 'Consecrate', element: 'holy', weight: 2, icon: 'bless', color: '#fff2b0', cd: 16, mp: 60, aim:{shape:'self',range:0,r:3}, desc: 'ULTIMATE — hallow the ground around you: a holy burst, then 5 s of searing light.',
    cast(p) {
      hitArea(p.x, p.y, 3, 80, { stun: 0.5 }); fx({ type: 'pillar', x: p.x, y: p.y, col: '#fff2b0', life: 0.5, r: 1.4 }); shake(5); sfx('boom');
      zone({ x: p.x, y: p.y, r: 3, life: 5, tick: 0.5, dmg: 30, col: '#fff2b0', kind: 'consecrate', follow: p.grip === 'grip_sanctuary', sanctuary: p.grip === 'grip_sanctuary' });
    } },
  // ---------------- Axe (greatarms): Cleave, Colossus Strike ----------------
  cleave: { name: 'Cleave', element: 'slash', stagger: 1, weight: 1.5, icon: 'spin', color: '#ffb070', cd: 4, mp: 22, aim:{shape:'self',range:0,r:2.4}, desc: 'One full-circle swing that cleaves everything around you.',
    cast(p) { p.spin = 0.3; hitArea(p.x, p.y, 2.4, 170, { knock: 0.5 }); fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: p.aim, arc: Math.PI * 2, r: 2.4, col: '#ffd0a0', life: 0.3, w: 6 }); shake(4); sfx('heavy'); } },
  colossus: { name: 'Colossus Strike', element: 'slash', stagger: 3, weight: 2, icon: 'strike', color: '#ffb070', cd: 16, mp: 60, aim:{shape:'cone',range:3,arc:2}, desc: 'ULTIMATE — wind up (poise), then a world-splitting overhead in a wide cone.',
    cast(p, a) {
      p.rootT = 0.65; poiseFor(p, 0.7); castAnim(p, 0.6);
      fx({ type: 'marker', x: p.x + Math.cos(a) * 1.6, y: p.y + Math.sin(a) * 1.6, r: 2, col: '#ffb070', life: 0.6 });
      delay(0.6, () => { swingWeapon(p, 0.24, 2.4, 1); hitCone(p.x, p.y, a, 2, 3, 400, { knock: 0.9 }); fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 2.1, r: 3, col: '#fff0d0', life: 0.35, w: 9 }); burst(p.x + Math.cos(a) * 2, p.y + Math.sin(a) * 2, 0, 30, ['#ffd0a0', '#ffffff'], 5); shake(9); sfx('boom'); });
    } },
  // ---------------- Hammer (greatarms): Earthbreaker, Aftershock (cracks: game.js crackLine / crackRing) ----------------
  earthbreaker: { name: 'Earthbreaker', element: 'slash', stagger: 3, weight: 1.5, icon: 'wave', color: '#e0c890', cd: 4.5, mp: 24, aim:{shape:'line',range:5.5,len:5.5,w:0.8}, desc: 'Split the ground in a line; the cracks stay for 3 s.',
    cast(p, a) { swingWeapon(p, 0.2, 1.6, 1); hitLine(p.x, p.y, a, 5.5, 0.8, 150, { knock: 0.4 }); crackLine(p.x, p.y, a, 5.5); fx({ type: 'line', x: p.x, y: p.y, ang: a, len: 5.5, w: 0.8, col: '#e0c890', life: 0.3 }); shake(5); sfx('boom'); } },
  aftershock: { name: 'Aftershock', element: 'slash', stagger: 3, weight: 2, icon: 'nova', color: '#e0c890', cd: 16, mp: 60, aim:{shape:'self',range:0,r:3.2}, desc: 'ULTIMATE — a ground slam, then three aftershocks that keep staggering.',
    cast(p) {
      swingWeapon(p, 0.22, 2.2, 1); hitArea(p.x, p.y, 2.8, 220, { knock: 0.7 }); crackRing(p.x, p.y, 2.4, 4); fx({ type: 'ring', x: p.x, y: p.y, r: 3, col: '#f0d8a0', life: 0.4 }); shake(8); sfx('boom');
      const x = p.x, y = p.y;
      for (let k = 1; k <= 3; k++) delay(k * 0.6, () => { hitArea(x, y, 3.2, 70, { stagger: 1, knock: 0.3 }); fx({ type: 'ring', x, y, r: 3.3, col: '#e0c890', life: 0.35 }); shake(4); sfx('heavy'); });
    } },
  // ---------------- Halberd (greatarms): Sweep (pushes wind), Skewer; reach x1.5 ----------------
  sweep: { name: 'Sweep', element: 'slash', stagger: 1, weight: 1.5, icon: 'arc', color: '#cfd8f0', cd: 3.5, mp: 20, aim:{shape:'cone',range:2.8,arc:3}, desc: 'A long wheeling sweep that throws foes back on a gust.',
    cast(p, a) { swingWeapon(p, 0.26, 3.2); hitCone(p.x, p.y, a, 3, 2.8, 150, { knock: 0.7 }); fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 3, r: 2.8, col: '#e8f0ff', life: 0.3, w: 5 }); WIND.emit({ kind: 'radial', x: p.x, y: p.y, r: 3, force: 2.5, life: 0.5, by: 1 }); sfx('slash'); } },
  skewer: { name: 'Skewer', element: 'pierce', stagger: 3, weight: 2, icon: 'charge', color: '#cfd8f0', cd: 16, mp: 60, aim:{shape:'dash',range:4.5,len:4.5,w:0.9}, desc: 'ULTIMATE — charge with the point down, then drive it through: pins for 1 s.',
    cast(p, a) {
      dashPlayer(p, Math.cos(a), Math.sin(a), 4.5, 0.25, { trail: '#e8f0ff', hit: { dmg: 260, r: 0.9, knock: 0.3 }, invuln: true, onEnd: () => {
        hitLine(p.x, p.y, a, 3, 0.7, 140, { root: 1, knock: 0.2 }); fx({ type: 'beam', x: p.x, y: p.y, z: p.z + 1.2, ang: a, len: 3, col: '#ffffff', life: 0.25 }); shake(6); sfx('heavy');
      } }); sfx('dash');
    } },
  // ---------------- Crossbow (shots): Piercing Bolt, Ballista; 4-bolt clip, 1 s reload (game.js basicSwing) ----------------
  piercingbolt: { name: 'Piercing Bolt', element: 'pierce', weight: 1.5, icon: 'pierce', color: '#e0d0b0', cd: 3.5, mp: 20, aim:{shape:'proj',range:14,w:0.4}, desc: 'A heavy bolt that pierces every enemy in a line and pins them for 0.6 s.',
    cast(p, a) { castAnim(p); spawnProj({ x: p.x, y: p.y, z: p.z + 1.5, ang: a, speed: 24, r: 0.4, dmg: 120, life: 0.6, kind: 'arrow', col: '#f0e0c0', pierce: 99, big: true, knock: 0.3, root: 0.6 }); sfx('bow'); shake(2); } },
  ballista: { name: 'Ballista', element: 'pierce', stagger: 3, weight: 2, icon: 'beam', color: '#f0e0c0', cd: 16, mp: 60, aim:{shape:'line',range:14,len:14,w:0.7}, desc: 'ULTIMATE — brace for 1.2 s, then one siege bolt down a long line (at most 25% of a boss\'s HP).',
    cast(p, a) {
      p.rootT = 1.2; castAnim(p, 1.2); poiseFor(p, 1.2);
      fx({ type: 'line', x: p.x, y: p.y, ang: a, len: 14, w: 0.7, col: '#f0e0c0', life: 1.2, tele: true });
      delay(1.2, () => { if (CAST && CAST.ctx) CAST.ctx.bossCap = 0.25; hitLine(p.x, p.y, a, 14, 0.7, 340, { knock: 0.8 }); fx({ type: 'beam', x: p.x, y: p.y, z: p.z + 1.5, ang: a, len: 14, col: '#fff6e0', life: 0.35 }); shake(9); sfx('beam'); });
    } },
  // ---------------- Chakram (shots, 1H): Ricochet, Guillotine; the disc returns and hits twice ----------------
  ricochet: { name: 'Ricochet', element: 'slash', icon: 'orbit', color: '#e7eeff', cd: 3, mp: 18, aim:{shape:'proj',range:10,w:0.35}, desc: 'A disc that bounces between foes: 4 hits (6 with the Lodestar grip).',
    cast(p, a) { castAnim(p, 0.15); const lode = p.grip === 'grip_lodestar'; spawnProj({ x: p.x, y: p.y, z: p.z + 1.4, ang: a, speed: 13, r: 0.35, dmg: 40, life: 0.9, kind: 'arcane', col: '#e7eeff', bounce: lode ? 5 : 3, zap: lode ? 30 : 0 }); sfx('swing'); } },
  guillotine: { name: 'Guillotine', element: 'slash', weight: 2, icon: 'orbit', color: '#ffffff', cd: 16, mp: 60, aim:{shape:'line',range:7,len:7,w:1.1}, desc: 'ULTIMATE — a great disc carves out and back through everything, slowing it.',
    cast(p, a) { castAnim(p, 0.3); spawnProj({ x: p.x, y: p.y, z: p.z + 1.4, ang: a, speed: 11, r: 1.1, dmg: 200, life: 1.3, kind: 'wave', col: '#ffffff', pierce: 99, ret: 0.65, slow: 2, knock: 0.3 }); shake(3); sfx('wave'); } },
  // ---------------- Wand (foci, 1H): Frost Shards (above), Rune of Binding ----------------
  runebinding: { name: 'Rune of Binding', element: 'arcane', weight: 2, icon: 'well', color: '#c7e8ff', cd: 16, mp: 60, aim:{shape:'circle',range:7,r:2.6}, desc: 'ULTIMATE — a rune roots everything inside for 2.5 s, then bursts.',
    cast(p, a, tx, ty) {
      castAnim(p); [tx, ty] = targetIn(p, tx, ty, 7);
      hitArea(tx, ty, 2.6, 60, { root: 2.5 }); fx({ type: 'marker', x: tx, y: ty, r: 2.6, col: '#c7e8ff', life: 1.2 }); sfx('arcane');
      delay(1.2, () => { hitArea(tx, ty, 2.6, 300, { knock: 0.3 }); fx({ type: 'ring', x: tx, y: ty, r: 2.8, col: '#e0f0ff', life: 0.4 }); burst(tx, ty, 0, 36, ['#ffffff', '#c7e8ff', '#9a44ff'], 4); shake(7); sfx('boom'); });
    } },
  // ---------------- Orb (foci, 1H): Chain Lightning (above), Tempest; channel drains 6 MP/s ----------------
  tempest: { name: 'Tempest', element: 'lightning', weight: 2, icon: 'chain', color: '#bff0ff', cd: 16, mp: 60, aim:{shape:'self',range:0,r:3.2}, desc: 'ULTIMATE — a storm wheels around you for 4 s, jolting and shoving foes.',
    cast(p) { castAnim(p); zone({ x: p.x, y: p.y, r: 3.2, life: 4, tick: 0.4, dmg: 40, jolt: 2, col: '#bff0ff', kind: 'storm', follow: true }); WIND.emit({ kind: 'radial', x: p.x, y: p.y, r: 3.4, force: 2, life: 1, by: 1 }); sfx('zap'); } },
  // ---------------- Claws (shadows): Rend, Savage; Frenzy (game.js basicSwing) ----------------
  rend: { name: 'Rend', element: 'slash', icon: 'arc', color: '#e0b0a0', cd: 3, mp: 18, aim:{shape:'cone',range:1.6,arc:1.8}, desc: 'Three raking cuts; the target is Rent (+15% damage taken) for 4 s.',
    cast(p, a) { for (let k = 0; k < 3; k++) delay(k * 0.1, () => { swingWeapon(p, 0.09, 1.6, k % 2 ? 1 : -1); hitCone(p.x, p.y, a, 1.8, 1.6, 55, { knock: 0.08, rent: 4 }); fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 1.8, r: 1.6, col: '#ffb0a0', life: 0.12, w: 2, dir: k % 2 ? 1 : -1 }); sfx('swing'); }); } },
  savage: { name: 'Savage', element: 'slash', weight: 2, icon: 'dash', color: '#ff9080', cd: 16, mp: 60, aim:{shape:'circle',range:5,r:1.6}, desc: 'ULTIMATE — pounce on the target and maul it eight times; Frenzy maxes.',
    cast(p, a, tx, ty) {
      [tx, ty] = targetIn(p, tx, ty, 5); const d = dist(p.x, p.y, tx, ty), an = Math.atan2(ty - p.y, tx - p.x);
      dashPlayer(p, Math.cos(an), Math.sin(an), Math.max(0.2, d - 0.6), 0.16, { invuln: true, trail: '#ff9080', onEnd: () => {
        p.frenzy = frenzyCap(p); p.frenzyT = G.t + 1.5;
        for (let k = 0; k < 8; k++) delay(k * 0.12, () => { swingWeapon(p, 0.1, 1.6, k % 2 ? 1 : -1); hitArea(p.x, p.y, 1.6, 48, { knock: 0.05 }); fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a + k, arc: 1.6, r: 1.6, col: '#ffb0a0', life: 0.12, w: 3 }); sfx('swing'); });
      } }); sfx('dash');
    } },
  // ---------------- Fans (shadows): Veil Dance (pushes wind), Thousand Petals; Marks on every hit ----------------
  veildance: { name: 'Veil Dance', element: 'slash', icon: 'wave', color: '#ffc8e8', cd: 3.5, mp: 20, aim:{shape:'dash',range:3,len:3,w:1.1}, desc: 'Dance through foes on a gust: each is cut and Marked.',
    cast(p, a) { dashPlayer(p, Math.cos(a), Math.sin(a), 3, 0.25, { invuln: true, trail: '#ffc8e8', hit: { dmg: 120, r: 1.1, knock: 0.2, marks: 1 } }); WIND.emit({ kind: 'vector', x: p.x, y: p.y, dir: a, r: 3.2, force: 2.5, life: 0.5, arc: 1.2, by: 1 }); sfx('dash'); } },
  thousandpetals: { name: 'Thousand Petals', element: 'slash', weight: 2, icon: 'stars', color: '#ffc8e8', cd: 16, mp: 60, aim:{shape:'self',range:0,r:3}, desc: 'ULTIMATE — a storm of blade-petals wheels with you for 3 s, Marking all it cuts.',
    cast(p) { zone({ x: p.x, y: p.y, r: 3, life: 3, tick: 0.25, dmg: 30, marks: 1, col: '#ffc8e8', kind: 'petals', follow: true }); burst(p.x, p.y, p.z + 1, 30, ['#ffc8e8', '#ffffff'], 3); sfx('wave'); } },
  // ---------------- Heater (shield): Block (hold M2), Shield Bash, Bulwark Charge ----------------
  block: { name: 'Block', element: 'slash', icon: 'shield', color: '#a8b8d8', cd: 0.3, st: 6, off: true, aim:{shape:'self',range:0}, desc: 'HOLD — block 70% of hits from the front (poise); drains stamina.',
    ...CT.guard({ kind: 'block', cut: 0.7, arc: 2.1, speed: 0.7, drain: 10 }) },
  shieldbash: { name: 'Shield Bash', element: 'slash', stagger: 2, weight: 1.5, icon: 'strike', color: '#a8b8d8', cd: 4, mp: 18, aim:{shape:'dash',range:2.2,len:2.2,w:1}, desc: 'Drive the shield forward; shots that meet it mid-dash fly back.',
    cast(p, a) { dashPlayer(p, Math.cos(a), Math.sin(a), 2.2, 0.18, { trail: '#c8d8f0', hit: { dmg: 120, r: 1, knock: 0.8 }, reflect: true, invuln: true }); sfx('shield'); } },
  bulwarkcharge: { name: 'Bulwark Charge', element: 'slash', stagger: 3, weight: 2, icon: 'charge', color: '#a8b8d8', cd: 14, mp: 30, aim:{shape:'dash',range:5,len:5,w:1}, desc: 'ULTIMATE — charge behind the shield, carrying the first foe, and slam it down.',
    cast(p, a) {
      dashPlayer(p, Math.cos(a), Math.sin(a), 5, 0.35, { trail: '#c8d8f0', hit: { dmg: 60, r: 1, knock: 0.2 }, carry: true, invuln: true, onEnd: () => {
        hitArea(p.x + Math.cos(a) * 0.8, p.y + Math.sin(a) * 0.8, 1.8, 220, { stun: 1, knock: 0.8 }); fx({ type: 'ring', x: p.x, y: p.y, r: 2, col: '#e0e8ff', life: 0.35 }); shake(7); sfx('boom');
      } }); sfx('dash');
    } },
  // ---------------- Tower (shield): Wall (hold M2), Shove, Fortress ----------------
  wall: { name: 'Wall', element: 'slash', icon: 'shield', color: '#8898b8', cd: 0.3, st: 6, off: true, aim:{shape:'self',range:0}, desc: 'HOLD — stop everything from the front, shots included; you move at half speed.',
    ...CT.guard({ kind: 'wall', cut: 1, arc: 2.1, speed: 0.5, drain: 8 }) },
  shove: { name: 'Shove', element: 'slash', stagger: 2, weight: 1.5, icon: 'wave', color: '#8898b8', cd: 4, mp: 18, aim:{shape:'cone',range:3,arc:1.4}, desc: 'Heave the wall forward: a gust that hurls a line of foes back.',
    cast(p, a) { swingWeapon(p, 0.2, 1.4, 1); hitCone(p.x, p.y, a, 1.4, 3, 80, { knock: 1.6 }); WIND.emit({ kind: 'vector', x: p.x, y: p.y, dir: a, r: 3.5, force: 4, life: 0.6, arc: 1, by: 1 }); fx({ type: 'slash', x: p.x, y: p.y, z: p.z, ang: a, arc: 1.4, r: 3, col: '#c8d8f0', life: 0.25, w: 6 }); shake(4); sfx('heavy'); } },
  fortress: { name: 'Fortress', element: 'holy', weight: 2, icon: 'shield', color: '#e0e8ff', cd: 14, mp: 30, aim:{shape:'self',range:0,r:2.6}, desc: 'ULTIMATE — raise a dome for 4 s: enemy shots break on it, and you take 30% less inside.',
    cast(p) { p.fortress = { x: p.x, y: p.y, r: 2.6, until: G.t + 4 }; addBuff(p, 'fortress', 4); fx({ type: 'ring', x: p.x, y: p.y, r: 2.6, col: '#e0e8ff', life: 4 }); sfx('shield'); } },
  // ---------------- Warhorn (companion = a deck of calls): Bellow, the active call, Last Stand ----------------
  bellow: { name: 'Bellow', element: 'slash', stagger: 2, icon: 'shout', color: '#e0b070', cd: 1.2, st: 12, off: true, aim:{shape:'cone',range:2.4,arc:1.6}, desc: 'Turn to the next call and bellow: a guard-breaking roar (stagger 2).',
    cast(p, a) { deckNext(p); hitCone(p.x, p.y, a, 1.6, 2.4, 30, { knock: 0.4, guardBreak: true }); fx({ type: 'ring', x: p.x, y: p.y, r: 1.6, col: '#ffd890', life: 0.25 }); sfx('shout'); } },
  laststand: { name: 'Last Stand', element: 'slash', weight: 2, icon: 'shout', color: '#ffd890', cd: 14, mp: 0, aim:{shape:'self',range:0,r:2}, desc: 'ULTIMATE — 4 s of poise and +30% damage; then Winded (-20% speed) for 3 s.',
    cast(p) { addBuff(p, 'laststand', 4); poiseFor(p, 4); fx({ type: 'pillar', x: p.x, y: p.y, col: '#ffd890', life: 0.5, r: 1 }); shake(4); sfx('shout'); } },
  // ---------------- calls (Warhorn deck entries; warcry, heroic, whirl, dashstrike, secondwind, bless, dawnwave are shared) ----------------
  rally: { name: 'Rally', element: 'holy', icon: 'bless', color: '#ffd890', cd: 18, mp: 25, aim:{shape:'self',range:0}, desc: 'CALL — heal 12% and +15% damage for 6 s.',
    ...CT.buff({ buff: 'rally', t: 6, heal: 0.12, col: '#ffd890', sfx: 'shout' }) },
  taunt: { name: 'Taunt', element: 'slash', stagger: 1, icon: 'shout', color: '#c05a6a', cd: 12, mp: 15, aim:{shape:'self',range:0,r:4.5}, desc: 'HELMET / CALL — every foe nearby turns on you; you take 20% less for 3 s.',
    ...CT.nova({ r: 4.5, dmg: 25, hit: { taunt: 3 }, buff: ['taunt', 3], col: '#ff8a9a' }) },
  quakecall: { name: 'Quake-call', element: 'slash', stagger: 2, icon: 'nova', color: '#d0b080', cd: 12, mp: 25, aim:{shape:'self',range:0,r:2.6}, desc: 'CALL — the ground answers the horn: a quake that leaves cracks.',
    ...CT.nova({ r: 2.6, dmg: 110, hit: { knock: 0.5 }, cracks: 3, col: '#d0b080', sfx: 'boom', shake: 5 }) },
  stand: { name: 'Stand', element: 'slash', icon: 'shield', color: '#b0a090', cd: 14, mp: 20, aim:{shape:'self',range:0,r:2}, desc: 'CALL — Brace: poise and 30% less damage for 3 s, then a shove.',
    ...CT.buff({ buff: 'brace', t: 3, col: '#b0a090' }) },
  // ---------------- arrows (Quiver deck entries; one shared arrow template) ----------------
  venomarrow: { name: 'Venom', element: 'nature', icon: 'pierce', color: '#8fe07a', cd: 6, mp: 22, aim:{shape:'proj',range:12,w:0.3}, desc: 'ARROW — a barbed arrow that Poisons.', ...CT.arrow({ dmg: 55, col: '#b0f0a0', poison: 1 }) },
  firearrow: { name: 'Fire', element: 'fire', icon: 'fire', color: '#ff9a4a', cd: 6, mp: 22, aim:{shape:'proj',range:12,w:0.3}, desc: 'ARROW — a burning arrow that bursts on impact.', ...CT.arrow({ dmg: 45, col: '#ffb070', burn: 1.5, explode: { r: 1, dmg: 25 } }) },
  frostarrow: { name: 'Frost', element: 'frost', icon: 'frost', color: '#9fe8ff', cd: 6, mp: 22, aim:{shape:'proj',range:12,w:0.3}, desc: 'ARROW — an icy arrow that Chills.', ...CT.arrow({ dmg: 65, col: '#d0f4ff', slow: 2, pierce: 1 }) },
  bolaarrow: { name: 'Bola', element: 'nature', icon: 'trap', color: '#8fe0a0', cd: 8, mp: 22, aim:{shape:'proj',range:10,w:0.35}, desc: 'ARROW — a weighted bola that roots for 1.5 s.', ...CT.arrow({ dmg: 55, col: '#a0e0b0', root: 1.5, speed: 13 }) },
  grapplearrow: { name: 'Grapple', element: 'pierce', icon: 'chain', color: '#d0c0a0', cd: 8, mp: 22, aim:{shape:'proj',range:10,w:0.3}, desc: 'ARROW — a hooked line that drags the target to you.', ...CT.arrow({ dmg: 55, col: '#e0d0b0', pull: 1.2 }) },
  splitarrow: { name: 'Split', element: 'pierce', icon: 'arrows', color: '#c9d8ff', cd: 6, mp: 22, aim:{shape:'proj',range:12,w:0.3}, desc: 'ARROW — splits in two on its first hit.', ...CT.arrow({ dmg: 55, col: '#e7eeff', split: 2 }) },
  explosivearrow: { name: 'Blast', element: 'fire', weight: 1.5, icon: 'meteor', color: '#ff7a4a', cd: 8, mp: 26, aim:{shape:'proj',range:12,w:0.3}, desc: 'ARROW — a powder arrow: a wide blast where it lands.', ...CT.arrow({ dmg: 45, col: '#ff9a6a', explode: { r: 1.6, dmg: 70 }, knock: 0.6 }) },
  // ---------------- pages new in M4b (Grimoire deck entries) ----------------
  stormcall: { name: 'Stormcall', element: 'lightning', icon: 'chain', color: '#d8e870', cd: 10, mp: 30, aim:{shape:'circle',range:7,r:2.2}, desc: 'HELMET / PAGE — call a storm on the aim: 3 s of strikes that Jolt.',
    ...CT.zone({ at: 'target', range: 7, z: { r: 2.2, life: 3, tick: 0.5, dmg: 45, jolt: 2, kind: 'storm' }, col: '#e8f080', sfx: 'zap' }) },
  toxinflask: { name: 'Toxin Flask', element: 'nature', icon: 'potion', color: '#8fe07a', cd: 10, mp: 25, aim:{shape:'circle',range:6,r:1.8}, desc: 'HELMET / PAGE — lob a flask: it bursts into a Poison cloud for 4 s.',
    ...CT.nova({ at: 'target', range: 6, delay: 0.45, r: 1.8, dmg: 40, hit: { poison: 2 }, zone: { r: 1.8, life: 4, tick: 0.5, dmg: 10, poison: 1, kind: 'toxin' }, col: '#8fe07a', sfx: 'trap' }) },
  judgementbell: { name: 'Judgement Bell', element: 'holy', stagger: 2, icon: 'bless', color: '#fff2b0', cd: 12, mp: 20, aim:{shape:'self',range:0,r:2.8}, desc: 'HELMET / PAGE — a bell of judgement tolls: holy burst, 0.8 s stun.',
    ...CT.nova({ r: 2.8, dmg: 90, hit: { stun: 0.8 }, col: '#fff2b0', sfx: 'shout' }) },
  // ---------------- suits (armour-suits.md "Suits"): chest F / head R / boots V; every boots skill keeps >= 0.25 s of i-frames ----------------
  consecratedguard: { name: 'Consecrated Guard', element: 'holy', icon: 'bless', color: '#fff2b0', cd: 14, mp: 20, aim:{shape:'self',range:0,r:2.2}, desc: 'CHEST — a holy circle follows you for 5 s: foes inside burn, you take 25% less.',
    ...CT.zone({ follow: true, z: { r: 2.2, life: 5, tick: 0.5, dmg: 20, kind: 'consecrate', guard: 0.25 }, col: '#fff2b0', sfx: 'heal' }) },
  vault: { name: 'Vault', element: 'holy', icon: 'charge', color: '#f2e2b0', cd: 7, st: 30, aim:{shape:'dash',range:3.4,len:3.4}, desc: 'BOOTS — leap toward your aim and land in a holy burst.',
    ...CT.dash({ dist: 3.4, dur: 0.3, iframes: 0.3, land: { r: 1.6, dmg: 50, hit: { stagger: 1, knock: 0.4 } }, col: '#fff2b0',
      after: p => { if (suitTwist(p, 'crusader')) zone({ x: p.x, y: p.y, r: 2, life: 3, tick: 0.5, dmg: 18, col: '#fff2b0', kind: 'consecrate', guard: 0.25 }); } }) },
  brace: { name: 'Brace', element: 'slash', icon: 'shield', color: '#9a8878', cd: 14, mp: 20, aim:{shape:'self',range:0,r:2}, desc: 'CHEST — poise and 30% less damage for 3 s, then shove everything away.',
    ...CT.buff({ buff: 'brace', t: 3, col: '#c0b0a0' }) },
  groundslam: { name: 'Ground Slam', element: 'slash', stagger: 2, icon: 'nova', color: '#a89888', cd: 12, mp: 25, aim:{shape:'self',range:0,r:2.6}, desc: 'HELMET — slam the ground: stagger 2, and cracks that linger 3 s.',
    ...CT.nova({ r: 2.6, dmg: 110, hit: { knock: 0.5 }, cracks: 3, col: '#c0a890', sfx: 'boom', shake: 5 }) },
  bullrush: { name: 'Bull Rush', element: 'slash', stagger: 2, icon: 'charge', color: '#8a7868', cd: 7, st: 32, aim:{shape:'dash',range:3.8,len:3.8,w:1}, desc: 'BOOTS — rush forward carrying the first foe you meet.',
    ...CT.dash({ dist: 3.8, dur: 0.3, carry: true, hit: { dmg: 50, r: 1, knock: 0.6 }, col: '#c0b0a0' }) },
  arcaneward: { name: 'Arcane Ward', element: 'arcane', icon: 'surge', color: '#b8a0f0', cd: 14, mp: 25, aim:{shape:'self',range:0,r:2.4}, desc: 'HELMET — a shield worth 25% of max HP for 4 s; it pops into a nova.',
    cast(p) { p.arcaneWard = { hp: p.maxHp * 0.25, until: G.t + 4 }; fx({ type: 'ring', x: p.x, y: p.y, r: 1.2, col: '#d8c8ff', life: 0.5 }); sfx('arcane'); } },
  wintersveil: { name: 'Winter\'s Veil', element: 'frost', icon: 'frost', color: '#9fd8f0', cd: 15, mp: 25, aim:{shape:'self',range:0,r:2.2}, desc: 'CHEST — a frost veil for 5 s: you take 20% less and attackers are Chilled.',
    ...CT.buff({ buff: 'wintersveil', t: 5, nova: { r: 2.2, dmg: 40, hit: { slow: 1 } }, col: '#bff4ff', sfx: 'frost' }) },
  glide: { name: 'Glide', element: 'frost', icon: 'dash', color: '#bfe8f8', cd: 6, st: 28, aim:{shape:'dash',range:3.6,len:3.6}, desc: 'BOOTS — skate toward your aim, leaving a frost trail that Chills.',
    ...CT.dash({ dir: 'move', dist: 3.6, dur: 0.3, zoneTrail: { r: 0.7, life: 2.5, tick: 0.5, dmg: 12, slow: 0.6, kind: 'frost' }, col: '#bff4ff', sfx: 'frost' }) },
  staticcloak: { name: 'Static Cloak', element: 'lightning', icon: 'chain', color: '#c8d860', cd: 14, mp: 20, aim:{shape:'self',range:0}, desc: 'CHEST — for 6 s, every hit you take zaps the attacker and Jolts it.',
    ...CT.buff({ buff: 'staticcloak', t: 6, col: '#f0f080', sfx: 'zap' }) },
  flashstep: { name: 'Flash Step', element: 'lightning', icon: 'blink', color: '#e0f080', cd: 6, st: 28, aim:{shape:'dash',range:4,len:4,w:0.9}, desc: 'BOOTS — a lightning line: dash through foes, Jolting each.',
    ...CT.dash({ dist: 4, dur: 0.14, iframes: 0.3, hit: { dmg: 30, r: 0.9, knock: 0.1, jolt: 2 }, col: '#f0f080', sfx: 'zap' }) },
  huntersmark: { name: 'Hunter\'s Mark', element: 'pierce', icon: 'star', color: '#a07050', cd: 10, mp: 15, aim:{shape:'circle',range:8,r:2.4}, desc: 'HELMET — Mark every foe around the aim twice (+4% damage taken per Mark).',
    ...CT.nova({ at: 'target', range: 8, r: 2.4, dmg: 20, hit: { marks: 2 }, col: '#ffd0a0', sfx: 'bow' }) },
  briarmantle: { name: 'Briar Mantle', element: 'nature', icon: 'trap', color: '#5f9a6e', cd: 14, mp: 20, aim:{shape:'self',range:0}, desc: 'CHEST — thorns for 6 s: melee attackers take nature damage back.',
    ...CT.buff({ buff: 'briar', t: 6, col: '#8fe0a0', sfx: 'trap' }) },
  rootvault: { name: 'Root Vault', element: 'nature', icon: 'roll', color: '#4f8a5e', cd: 7, st: 28, aim:{shape:'dash',range:3,len:3}, desc: 'BOOTS — vault back from your aim, leaving a snare where you stood.',
    ...CT.dash({ dir: 'back', dist: 3, dur: 0.28, roll: true, originZone: { r: 1.4, life: 6, trap: true, dmg: 40, root: 1.5, kind: 'trap' }, col: '#8fe0a0' }) },
  engarde: { name: 'En Garde', element: 'slash', icon: 'shield', color: '#b04a5a', cd: 6, mp: 10, aim:{shape:'self',range:0}, desc: 'CHEST — a long 0.5 s parry window (shares the 1 s parry ICD).',
    cast(p) { startParry(p, 0.5); p.cds.parry = Math.max(p.cds.parry || 0, 1); } },
  sidestep: { name: 'Side-step', element: 'slash', icon: 'dash', color: '#8a3a4a', cd: 3, st: 20, aim:{shape:'dash',range:2.2,len:2.2}, desc: 'BOOTS — a quick side-step along your movement (cd 3).',
    ...CT.dash({ dir: 'side', dist: 2.2, dur: 0.25, col: '#ffb0c0' }) },
  fadestep: { name: 'Fade Step', element: 'arcane', icon: 'cloak', color: '#5a4a7a', cd: 14, mp: 20, aim:{shape:'dash',range:2.5,len:2.5}, desc: 'CHEST — step into shadow: 2 s unseen, the next hit crits.',
    ...CT.dash({ dist: 2.5, dur: 0.25, buff: ['veil', 2], col: '#8a7aaa' }) },
  smokebomb: { name: 'Smoke Bomb', element: 'nature', icon: 'cloak', color: '#6a5a8a', cd: 12, mp: 20, aim:{shape:'self',range:0,r:2.6}, desc: 'HELMET — a smoke burst: foes Chilled and you unseen for 1.5 s.',
    ...CT.nova({ r: 2.6, dmg: 30, hit: { slow: 1 }, buff: ['veil', 1.5], col: '#8a7aaa', sfx: 'veil' }) },
  shadowstep: { name: 'Shadowstep', element: 'arcane', icon: 'blink', color: '#4a3a6a', cd: 6, st: 28, aim:{shape:'dash',range:3.4,len:3.4}, desc: 'BOOTS — dash away and leave a decoy where you stood.',
    ...CT.dash({ dist: 3.4, dur: 0.26, decoy: 3, col: '#8a7aaa' }) },
  venomcoat: { name: 'Venom Coat', element: 'nature', icon: 'potion', color: '#5a7a4a', cd: 15, mp: 20, aim:{shape:'self',range:0}, desc: 'CHEST — for 8 s every hit you land Poisons.',
    ...CT.buff({ buff: 'venomcoat', t: 8, col: '#8fe07a', sfx: 'trap' }) },
  slink: { name: 'Slink', element: 'nature', icon: 'dash', color: '#4a6a3a', cd: 6, st: 26, aim:{shape:'dash',range:3,len:3}, desc: 'BOOTS — slink low: for 2 s you backstab from any angle.',
    ...CT.dash({ dist: 3, dur: 0.26, buff: ['slink', 2], col: '#8fe07a' }) },
  mirrorimage: { name: 'Mirror Image', element: 'arcane', icon: 'veil', color: '#b898e0', cd: 16, mp: 30, aim:{shape:'self',range:0}, desc: 'CHEST — an image of you for 6 s: it draws foes and shoots arcane bolts.',
    cast(p) { const tw = suitTwist(p, 'mirage'); spawnDecoy(p.x + Math.cos(p.aim + 1.6) * 1.2, p.y + Math.sin(p.aim + 1.6) * 1.2, tw ? 10 : 6, { image: true, bolt: tw ? 45 : 30 }); sfx('blink'); } },
  phase: { name: 'Phase', element: 'arcane', icon: 'blink', color: '#a888d0', cd: 6, st: 26, aim:{shape:'dash',range:3.4,len:3.4}, desc: 'BOOTS — phase straight through enemies toward your aim.',
    ...CT.dash({ dist: 3.4, dur: 0.3, iframes: 0.35, col: '#d8c8ff', sfx: 'blink' }) },
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
  // M4b
  rally: { name: 'Rally', icon: 'bless', color: '#ffd890' },
  taunt: { name: 'Taunt', icon: 'shout', color: '#ff8a9a' },
  brace: { name: 'Brace', icon: 'shield', color: '#c0b0a0' },
  wintersveil: { name: 'Winter\'s Veil', icon: 'frost', color: '#bff4ff' },
  staticcloak: { name: 'Static Cloak', icon: 'chain', color: '#f0f080' },
  briar: { name: 'Briar Mantle', icon: 'trap', color: '#8fe0a0' },
  venomcoat: { name: 'Venom Coat', icon: 'potion', color: '#8fe07a' },
  slink: { name: 'Slink', icon: 'dash', color: '#8fe07a' },
  fortress: { name: 'Fortress', icon: 'shield', color: '#e0e8ff' },
  laststand: { name: 'Last Stand', icon: 'shout', color: '#ffd890' },
  winded: { name: 'Winded', icon: 'roll', color: '#a7a3b8' },
  haste: { name: 'Haste', icon: 'sprint', color: '#ffb0c0' },
};
