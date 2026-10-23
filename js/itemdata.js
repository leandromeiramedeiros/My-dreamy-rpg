'use strict';
// ---------------------------------------------------------------------------
// Equipment v2 DATA (docs/design/items.md, docs/design/story.md voice). Plain tables, no logic.
// Loaded by classic script after items.js. Engine code reads these globals.
//
// Units match items.js AFFIX: percent stats are fractions (0.05 = 5%), hp/mp/regen are flat,
// def is raw armour fraction (0.02 shows as "2 Armour"), speed is the same fraction as AFFIX.speed.
// Trigger suffixes: onDodge.r = % of max HP healed per dodge; onKill.r = % of max MP restored per kill.
//
// Implicit stat keys: the prefix/suffix keys below, plus implicit-only keys:
//   slashDmg, pierceDmg, shatterDmg, pierce (+N arrows), stagger (+N steps), poise (bool),
//   mpOnHit (% of damage as MP), backstab (+deg arc), behindDmg (% damage from behind), reflect (% blocked),
//   potionCharge (+N), fishLuck (%).
// ---------------------------------------------------------------------------

// ===== affixes (§19.1). Three named tiers per affix, gated by ilvl (T1 1+, T2 14+, T3 28+). =====
// Tier ranges do not overlap; T3 midpoint is about 2.5-3x T1 midpoint. resAll is Legendary+ only;
// onDodge and onKill are trigger affixes on Epic+.
const AFFIX_V2 = {
  prefix: {
    power: [
      { name: 'Keen', r: [0.03, 0.05] },
      { name: 'Fierce', r: [0.06, 0.08] },
      { name: 'Savage', r: [0.10, 0.13] },
    ],
    crit: [
      { name: 'Sharpened', r: [0.02, 0.03] },
      { name: 'Honed', r: [0.04, 0.05] },
      { name: 'Lethal', r: [0.07, 0.08] },
    ],
    critDmg: [
      { name: 'Heavy', r: [0.08, 0.12] },
      { name: 'Crushing', r: [0.16, 0.20] },
      { name: 'Ruinous', r: [0.24, 0.30] },
    ],
    haste: [
      { name: 'Quick', r: [0.03, 0.04] },
      { name: 'Swift', r: [0.06, 0.07] },
      { name: 'Whirling', r: [0.09, 0.11] },
    ],
    skillDmg: [
      { name: 'Vivid', r: [0.04, 0.06] },
      { name: 'Luminous', r: [0.08, 0.10] },
      { name: 'Resplendent', r: [0.12, 0.15] },
    ],
    cdr: [
      { name: 'Patient', r: [0.02, 0.03] },
      { name: 'Steady', r: [0.04, 0.05] },
      { name: 'Timeless', r: [0.06, 0.08] },
    ],
    fireDmg: [
      { name: 'Smoldering', r: [0.04, 0.06] },
      { name: 'Blazing', r: [0.08, 0.10] },
      { name: 'Searing', r: [0.12, 0.15] },
    ],
    frostDmg: [
      { name: 'Rimed', r: [0.04, 0.06] },
      { name: 'Frosted', r: [0.08, 0.10] },
      { name: 'Glacial', r: [0.12, 0.15] },
    ],
    natureDmg: [
      { name: 'Mossy', r: [0.04, 0.06] },
      { name: 'Verdant', r: [0.08, 0.10] },
      { name: 'Overgrown', r: [0.12, 0.15] },
    ],
    lightningDmg: [
      { name: 'Crackling', r: [0.04, 0.06] },
      { name: 'Thundering', r: [0.08, 0.10] },
      { name: 'Stormborn', r: [0.12, 0.15] },
    ],
    arcaneDmg: [
      { name: 'Shimmering', r: [0.04, 0.06] },
      { name: 'Starlit', r: [0.08, 0.10] },
      { name: 'Eventide', r: [0.12, 0.15] },
    ],
    holyDmg: [
      { name: 'Hallowed', r: [0.04, 0.06] },
      { name: 'Dawnlit', r: [0.08, 0.10] },
      { name: 'Sunwrought', r: [0.12, 0.15] },
    ],
    statusChance: [
      { name: 'Restless', r: [0.05, 0.07] },
      { name: 'Fated', r: [0.09, 0.12] },
      { name: 'Ominous', r: [0.16, 0.20] },
    ],
    markCap: [
      { name: 'Tethered', r: [1, 1] },
      { name: 'Bound', r: [2, 2] },
      { name: 'Fettered', r: [3, 3] },
    ],
    chargeSpeed: [
      { name: 'Eager', r: [0.05, 0.07] },
      { name: 'Ardent', r: [0.09, 0.12] },
      { name: 'Kindled', r: [0.14, 0.18] },
    ],
  },
  suffix: {
    hp: [
      { name: 'Sturdy', r: [25, 35] },
      { name: 'Hale', r: [55, 70] },
      { name: 'Unbroken', r: [75, 90] },
    ],
    def: [
      { name: 'Guarded', r: [0.02, 0.03] },
      { name: 'Bulwarked', r: [0.04, 0.055] },
      { name: 'Impregnable', r: [0.06, 0.08] },
    ],
    regen: [
      { name: 'Mending', r: [1, 1.5] },
      { name: 'Renewing', r: [2, 2.5] },
      { name: 'Undying', r: [3, 4] },
    ],
    mpRegen: [
      { name: 'Lucid', r: [0.8, 1.2] },
      { name: 'Tranquil', r: [1.6, 2.2] },
      { name: 'Serene', r: [2.4, 3.2] },
    ],
    speed: [
      { name: 'Lithe', r: [0.10, 0.14] },
      { name: 'Nimble', r: [0.20, 0.26] },
      { name: 'Windborne', r: [0.30, 0.38] },
    ],
    resFire: [
      { name: 'Warded', r: [0.06, 0.08] },
      { name: 'Hardened', r: [0.10, 0.14] },
      { name: 'Unyielding', r: [0.17, 0.20] },
    ],
    resFrost: [
      { name: 'Warded', r: [0.06, 0.08] },
      { name: 'Hardened', r: [0.10, 0.14] },
      { name: 'Unyielding', r: [0.17, 0.20] },
    ],
    resNature: [
      { name: 'Warded', r: [0.06, 0.08] },
      { name: 'Hardened', r: [0.10, 0.14] },
      { name: 'Unyielding', r: [0.17, 0.20] },
    ],
    resLightning: [
      { name: 'Warded', r: [0.06, 0.08] },
      { name: 'Hardened', r: [0.10, 0.14] },
      { name: 'Unyielding', r: [0.17, 0.20] },
    ],
    resArcane: [
      { name: 'Warded', r: [0.06, 0.08] },
      { name: 'Hardened', r: [0.10, 0.14] },
      { name: 'Unyielding', r: [0.17, 0.20] },
    ],
    resHoly: [
      { name: 'Warded', r: [0.06, 0.08] },
      { name: 'Hardened', r: [0.10, 0.14] },
      { name: 'Unyielding', r: [0.17, 0.20] },
    ],
    resSlash: [
      { name: 'Warded', r: [0.06, 0.08] },
      { name: 'Hardened', r: [0.10, 0.14] },
      { name: 'Unyielding', r: [0.17, 0.20] },
    ],
    resPierce: [
      { name: 'Warded', r: [0.06, 0.08] },
      { name: 'Hardened', r: [0.10, 0.14] },
      { name: 'Unyielding', r: [0.17, 0.20] },
    ],
    resAll: [
      { name: 'Sovereign', r: [0.03, 0.04], minRarity: 'legendary' },
      { name: 'Unbowed', r: [0.05, 0.06], minRarity: 'legendary' },
      { name: 'Dreamwarded', r: [0.08, 0.10], minRarity: 'legendary' },
    ],
    resGloom: [
      { name: 'Warded', r: [0.06, 0.08], minRarity: 'rare' },
      { name: 'Hardened', r: [0.10, 0.14], minRarity: 'rare' },
      { name: 'Unyielding', r: [0.17, 0.20], minRarity: 'rare' },
    ],
    onDodge: [
      { name: 'Evasive', r: [0.01, 0.015], minRarity: 'epic' },
      { name: 'Phantom', r: [0.02, 0.03], minRarity: 'epic' },
      { name: 'Wraithstep', r: [0.035, 0.04], minRarity: 'epic' },
    ],
    onKill: [
      { name: 'Gleaning', r: [0.02, 0.03], minRarity: 'epic' },
      { name: 'Reaping', r: [0.04, 0.05], minRarity: 'epic' },
      { name: 'Ravening', r: [0.06, 0.07], minRarity: 'epic' },
    ],
  },
};

// ===== suffix nouns (§19.3): "of the Fox". One nature or animal noun per suffix stat. =====
const SUFFIX_NOUN = {
  hp: 'Oak',
  def: 'Badger',
  regen: 'Spring',
  mpRegen: 'Owl',
  speed: 'Fox',
  resFire: 'Ember',
  resFrost: 'Rime',
  resNature: 'Moss',
  resLightning: 'Storm',
  resArcane: 'Moth',
  resHoly: 'Dawn',
  resSlash: 'Thorn',
  resPierce: 'Heron',
  resGloom: 'Lantern',
  resAll: 'Mountain',
  onDodge: 'Swallow',
  onKill: 'Wolf',
};

// ===== implicits (§19.1): one per base id in items.js BASES. Fixed, not rerollable. =====
// Each family's five tiers have distinct lines and fit that family's skills and element.
const IMPLICITS = {
  // Dawnblade (sword, slash): Sunslash, Heroic Strike, Dash Strike, Whirling Blade, Judgement, Dawn Wave
  rustyblade:      { stat: 'slashDmg', v: 0.04, text: '+4% slash damage' },
  dawnblade:       { stat: 'shatterDmg', v: 0.10, text: '+10% Shatter damage' },
  sunforged:       { stat: 'holyDmg', v: 0.06, text: '+6% holy damage' },
  auroraedge:      { stat: 'stagger', v: 1, text: '+1 stagger on heavy strikes' },
  dawneternal:     { stat: 'chargeSpeed', v: 0.08, text: 'Charged swings build charge 8% faster' },

  // Starfall Staff (staff, arcane): Firebolt, Frost Shard, Barrage, Gravity Well, Meteor, Starstorm
  willowwand:      { stat: 'arcaneDmg', v: 0.04, text: '+4% arcane damage' },
  starfall:        { stat: 'statusChance', v: 0.05, text: '+5% status chance on bolts' },
  cometrod:        { stat: 'fireDmg', v: 0.08, text: '+8% fire damage on falling stars' },
  nebulasceptre:   { stat: 'frostDmg', v: 0.08, text: '+8% frost damage from the sceptre' },
  nighteternal:    { stat: 'arcaneDmg', v: 0.14, text: '+14% arcane damage from the night sky' },

  // Moonbow (bow, pierce): Multishot, Piercing Shot, Tumble, Snare Trap, Arrow Rain, Moonbeam
  hunterbow:       { stat: 'pierce', v: 1, text: '+1 pierce' },
  moonbow:         { stat: 'haste', v: 0.04, text: '+4% attack speed' },
  silverwing:      { stat: 'critDmg', v: 0.10, text: '+10% crit damage on arrows' },
  eclipsebow:      { stat: 'statusChance', v: 0.06, text: '+6% status chance from snares' },
  mooneternal:     { stat: 'pierce', v: 2, text: '+2 pierce on every arrow' },

  // Knight Helm (head, no element): War Cry
  ironcap:         { stat: 'def', v: 0.02, text: '+2 Armour' },
  knighthelm:      { stat: 'poise', v: 1, text: 'War Cry grants poise' },
  sunguard:        { stat: 'holyDmg', v: 0.05, text: '+5% holy damage' },
  auroravisor:     { stat: 'crit', v: 0.02, text: '+2% crit chance; War Cry crits stagger' },
  crownofdawn:     { stat: 'hp', v: 20, text: '+20 HP' },

  // Arcane Cowl (head, arcane/frost): Frost Nova
  novicehood:      { stat: 'arcaneDmg', v: 0.03, text: '+3% arcane damage' },
  arcanecowl:      { stat: 'frostDmg', v: 0.06, text: '+6% frost damage; Frost Nova reaches further' },
  starweave:       { stat: 'cdr', v: 0.03, text: '3% shorter cooldowns' },
  astralcirclet:   { stat: 'statusChance', v: 0.05, text: '+5% chance to chill on Frost Nova' },
  crownofstars:    { stat: 'mpRegen', v: 0.6, text: '+0.6 MP/s' },

  // Warden Hood (head, nature): Mend
  rangercap:       { stat: 'natureDmg', v: 0.03, text: '+3% nature damage' },
  wardenhood:      { stat: 'regen', v: 0.5, text: '+0.5 HP/s' },
  mossmantle:      { stat: 'natureDmg', v: 0.06, text: '+6% nature damage; Mend heals more slowly' },
  thornwarden:     { stat: 'reflect', v: 0.03, text: 'Thorns return 3% of blocked damage' },
  crownofroots:    { stat: 'regen', v: 1, text: '+1 HP/s; Mend cleanses roots' },

  // Knight Plate (chest, slash/pierce resist, lightning weak): Bulwark
  ironmail:        { stat: 'hp', v: 15, text: '+15 HP' },
  knightplate:     { stat: 'poise', v: 1, text: 'Bulwark grants poise' },
  sunplate:        { stat: 'holyDmg', v: 0.06, text: '+6% holy damage; Bulwark glows gold' },
  auroraplate:     { stat: 'reflect', v: 0.05, text: 'Bulwark reflects 5% of blocked damage' },
  dawnaegis:       { stat: 'hp', v: 40, text: '+40 HP; Bulwark heals on block' },

  // Dreamweave Robe (chest, arcane resist): Mana Surge
  linenrobe:       { stat: 'mpOnHit', v: 0.10, text: '+10% MP on hit' },
  dreamrobe:       { stat: 'arcaneDmg', v: 0.06, text: '+6% arcane damage' },
  starwoven:       { stat: 'cdr', v: 0.04, text: '4% shorter Mana Surge cooldown' },
  nebularobe:      { stat: 'mpRegen', v: 0.8, text: '+0.8 MP/s' },
  dreamshroud:     { stat: 'skillDmg', v: 0.10, text: '+10% skill damage; Mana Surge casts twice' },

  // Stalker Jacket (chest, pierce resist, fire weak): Shadow Veil
  jerkin:          { stat: 'crit', v: 0.02, text: '+2% crit chance' },
  stalkerjacket:   { stat: 'haste', v: 0.04, text: '+4% attack speed' },
  nightcoat:       { stat: 'critDmg', v: 0.10, text: '+10% crit damage from the shadows' },
  shadowweave:    { stat: 'backstab', v: 15, text: 'Backstab arc widens by 15 degrees' },
  eclipsegarb:     { stat: 'statusChance', v: 0.06, text: '+6% status chance on unseen foes' },

  // Knight Greaves (boots): Charge
  ironboots:       { stat: 'hp', v: 10, text: '+10 HP' },
  knightgreaves:   { stat: 'poise', v: 1, text: 'Charge grants poise while it lasts' },
  sungreaves:      { stat: 'holyDmg', v: 0.05, text: '+5% holy damage on Charge' },
  auroragreaves:   { stat: 'chargeSpeed', v: 0.06, text: 'Charge builds 6% faster' },
  dawnstriders:    { stat: 'speed', v: 0.20, text: '+5% move speed' },

  // Cloud Sandals (boots): Blink
  ropesandals:     { stat: 'mpRegen', v: 0.3, text: '+0.3 MP/s' },
  clothsandals:    { stat: 'cdr', v: 0.03, text: 'Blink cooldown 3% shorter' },
  mistwalkers:     { stat: 'speed', v: 0.15, text: '+4% move speed' },
  skystep:         { stat: 'cdr', v: 0.05, text: 'Blink cooldown 5% shorter' },
  cloudsteps:      { stat: 'mpRegen', v: 1.0, text: '+1 MP/s; Blink refunds 4 MP' },

  // Stalker Shoes (boots): Sprint
  softshoes:       { stat: 'speed', v: 0.10, text: '+3% move speed' },
  stalkershoes:    { stat: 'statusChance', v: 0.03, text: '+3% status chance on Sprint strikes' },
  quietstep:       { stat: 'crit', v: 0.02, text: '+2% crit chance after Sprint' },
  shadowstep:      { stat: 'speed', v: 0.25, text: '+7% move speed' },
  eclipsetreads:   { stat: 'critDmg', v: 0.10, text: '+10% crit damage on Sprint strikes' },

  // Nightfang daggers (Shadows, pierce; M4a hidden line): Fan of Knives, Death Mark
  shiv:            { stat: 'crit', v: 0.02, text: '+2% crit chance' },
  nightfang:       { stat: 'haste', v: 0.04, text: '+4% attack speed' },
  twineclipse:     { stat: 'critDmg', v: 0.10, text: '+10% crit damage' },
  widowskiss:      { stat: 'statusChance', v: 0.05, text: '+5% status chance on cuts' },
  fangseternal:    { stat: 'power', v: 0.04, text: '+4% damage' },

  // Buckler (OFFHAND shield): Parry+, Bash, Aegis
  woodbuckler:     { stat: 'hp', v: 40, text: '+40 HP' },
  ironbuckler:     { stat: 'poise', v: 1, text: '+1 poise' },
  sunbuckler:      { stat: 'holyDmg', v: 0.05, text: '+5% holy damage' },
  aurorabuckler:   { stat: 'reflect', v: 0.03, text: 'Reflects 3% of damage taken' },
  bucklereternal:  { stat: 'regen', v: 1, text: '+1 HP regen per second' },

  // Grimoire (OFFHAND companion, pages): Turn, Cast, Chapter
  worngrimoire:    { stat: 'mpRegen', v: 0.5, text: '+0.5 MP regen per second' },
  dreamgrimoire:   { stat: 'skillDmg', v: 0.06, text: '+6% skill damage' },
  stargrimoire:    { stat: 'mpRegen', v: 0.8, text: '+0.8 MP regen per second' },
  nebulacodex:     { stat: 'cdr', v: 0.03, text: '+3% cooldown reduction' },
  codexeternal:    { stat: 'mpRegen', v: 1.0, text: '+1 MP regen per second' },

  // Quiver (OFFHAND companion, arrows): Nock, Loose, Quiver Storm
  leatherquiver:   { stat: 'haste', v: 0.03, text: '+3% attack speed' },
  moonquiver:      { stat: 'pierce', v: 1, text: '+1 pierce' },
  silverquiver:    { stat: 'critDmg', v: 0.08, text: '+8% crit damage on arrows' },
  eclipsequiver:   { stat: 'statusChance', v: 0.04, text: '+4% status chance on arrows' },
  quivereternal:   { stat: 'crit', v: 0.03, text: '+3% crit chance' },

  // ===== M4b lines (every weapon line, shield, companion and suit live) =====
  // Rapier (Blades, pierce): Fleche, Perforate; parries riposte
  tinneedle:       { stat: 'pierceDmg', v: 0.04, text: '+4% pierce damage' },
  moonpoint:       { stat: 'crit', v: 0.02, text: '+2% crit chance' },
  silverestoc:     { stat: 'critDmg', v: 0.10, text: '+10% crit damage on ripostes' },
  starpoint:       { stat: 'haste', v: 0.04, text: '+4% attack speed' },
  needleeternal:   { stat: 'pierceDmg', v: 0.12, text: '+12% pierce damage' },
  // Mace (Blades, slash): Crush, Consecrate
  ironcudgel:      { stat: 'slashDmg', v: 0.04, text: '+4% slash damage' },
  dawnmace:        { stat: 'stagger', v: 1, text: '+1 stagger on heavy strikes' },
  sunwardenmace:   { stat: 'holyDmg', v: 0.06, text: '+6% holy damage' },
  auroramaul:      { stat: 'hp', v: 30, text: '+30 HP' },
  voweternal:      { stat: 'holyDmg', v: 0.12, text: '+12% holy damage' },
  // Axe (Greatarms, slash): Cleave, Colossus Strike
  splittingaxe:    { stat: 'slashDmg', v: 0.05, text: '+5% slash damage' },
  dawnbreaker:     { stat: 'stagger', v: 1, text: '+1 stagger on heavy strikes' },
  sunforgedaxe:    { stat: 'chargeSpeed', v: 0.08, text: 'Ultimate charges 8% faster' },
  auroracleaver:   { stat: 'critDmg', v: 0.12, text: '+12% crit damage' },
  dawncolossus:    { stat: 'power', v: 0.05, text: '+5% damage' },
  // Hammer (Greatarms, slash): Earthbreaker, Aftershock
  sledge:          { stat: 'hp', v: 25, text: '+25 HP' },
  sunhammer:       { stat: 'stagger', v: 1, text: '+1 stagger on heavy strikes' },
  mountainmaul:    { stat: 'def', v: 0.03, text: '+3 Armour' },
  auroraanvil:     { stat: 'chargeSpeed', v: 0.10, text: 'Ultimate charges 10% faster' },
  hammereternal:   { stat: 'stagger', v: 2, text: '+2 stagger on heavy strikes' },
  // Halberd (Greatarms, pierce): Sweep, Skewer; reach
  pike:            { stat: 'pierceDmg', v: 0.04, text: '+4% pierce damage' },
  dawnglaive:      { stat: 'haste', v: 0.03, text: '+3% attack speed' },
  sunhalberd:      { stat: 'slashDmg', v: 0.08, text: '+8% slash damage on sweeps' },
  aurorapartisan:  { stat: 'stagger', v: 1, text: '+1 stagger on heavy strikes' },
  reacheternal:    { stat: 'pierceDmg', v: 0.12, text: '+12% pierce damage' },
  // Crossbow (Shots, pierce): Piercing Bolt, Ballista; clip + reload
  handcrossbow:    { stat: 'pierce', v: 1, text: '+1 pierce' },
  dawnarbalest:    { stat: 'critDmg', v: 0.08, text: '+8% crit damage on bolts' },
  sunbolt:         { stat: 'pierceDmg', v: 0.08, text: '+8% pierce damage' },
  auroraballista:  { stat: 'stagger', v: 1, text: '+1 stagger on heavy strikes' },
  bolteternal:     { stat: 'pierce', v: 2, text: '+2 pierce on every bolt' },
  // Chakram (Shots, slash): Ricochet, Guillotine; the disc returns
  rim:             { stat: 'slashDmg', v: 0.04, text: '+4% slash damage' },
  moonchakram:     { stat: 'haste', v: 0.04, text: '+4% attack speed' },
  silverring:      { stat: 'crit', v: 0.03, text: '+3% crit chance' },
  eclipsering:     { stat: 'statusChance', v: 0.05, text: '+5% status chance on discs' },
  ringeternal:     { stat: 'slashDmg', v: 0.12, text: '+12% slash damage' },
  // Wand (Foci, arcane / frost): Frost Shard, Runebinding
  birchtwig:       { stat: 'arcaneDmg', v: 0.04, text: '+4% arcane damage' },
  hazelwand:       { stat: 'frostDmg', v: 0.06, text: '+6% frost damage' },
  sunsparkwand:    { stat: 'cdr', v: 0.03, text: '3% shorter cooldowns' },
  aurorawand:      { stat: 'statusChance', v: 0.05, text: '+5% chance to chill' },
  sparketernal:    { stat: 'skillDmg', v: 0.10, text: '+10% skill damage' },
  // Orb (Foci, lightning): Chain, Tempest; hold M1 to drain
  glassbauble:     { stat: 'lightningDmg', v: 0.04, text: '+4% lightning damage' },
  starfallorb:     { stat: 'mpOnHit', v: 0.10, text: '+10% MP on hit' },
  cometorb:        { stat: 'lightningDmg', v: 0.08, text: '+8% lightning damage' },
  nebulasphere:    { stat: 'mpRegen', v: 0.8, text: '+0.8 MP/s' },
  orbeternal:      { stat: 'lightningDmg', v: 0.14, text: '+14% lightning damage' },
  // Claws (Shadows, slash): Rend, Savage; Frenzy
  boneclaws:       { stat: 'haste', v: 0.03, text: '+3% attack speed' },
  nightclaws:      { stat: 'slashDmg', v: 0.06, text: '+6% slash damage' },
  silvertalon:     { stat: 'crit', v: 0.03, text: '+3% crit chance' },
  eclipseclaws:    { stat: 'behindDmg', v: 0.10, text: '+10% damage from behind' },
  clawseternal:    { stat: 'haste', v: 0.08, text: '+8% attack speed' },
  // Fans (Shadows, slash / wind): Veil Dance, Thousand Petals; every hit Marks
  paperfans:       { stat: 'speed', v: 0.10, text: '+3% move speed' },
  moonfans:        { stat: 'markCap', v: 1, text: '+1 Mark cap' },
  silverplume:     { stat: 'critDmg', v: 0.10, text: '+10% crit damage' },
  eclipsefans:     { stat: 'statusChance', v: 0.05, text: '+5% status chance' },
  fanseternal:     { stat: 'markCap', v: 2, text: '+2 Mark cap' },
  // Heater (OFFHAND shield): Block, Shield Bash, Bulwark Charge
  oakheater:       { stat: 'hp', v: 40, text: '+40 HP' },
  oathheater:      { stat: 'def', v: 0.02, text: '+2 Armour' },
  sunheater:       { stat: 'holyDmg', v: 0.05, text: '+5% holy damage' },
  auroraheater:    { stat: 'reflect', v: 0.04, text: 'Reflects 4% of blocked damage' },
  oatheternal:     { stat: 'hp', v: 80, text: '+80 HP' },
  // Tower (OFFHAND shield): Wall, Shove, Fortress
  doorshield:      { stat: 'def', v: 0.03, text: '+3 Armour' },
  wardwall:        { stat: 'hp', v: 50, text: '+50 HP' },
  sunwall:         { stat: 'poise', v: 1, text: '+1 poise' },
  aurorabastion:   { stat: 'def', v: 0.05, text: '+5 Armour' },
  walleternal:     { stat: 'regen', v: 1.2, text: '+1.2 HP/s' },
  // Warhorn (OFFHAND companion, calls): Bellow, Call, Last Stand
  cowhorn:         { stat: 'hp', v: 30, text: '+30 HP' },
  rallyinghorn:    { stat: 'cdr', v: 0.03, text: '3% shorter cooldowns' },
  sunhorn:         { stat: 'power', v: 0.03, text: '+3% damage' },
  auroraclarion:   { stat: 'regen', v: 1, text: '+1 HP/s' },
  calleternal:     { stat: 'skillDmg', v: 0.08, text: '+8% skill damage' },
  // Crusader (heavy, holy): Judgement Bell, Consecrated Guard, Vault
  pothelm:         { stat: 'def', v: 0.02, text: '+2 Armour' },
  crusaderhelm:    { stat: 'holyDmg', v: 0.05, text: '+5% holy damage' },
  bellhelm:        { stat: 'stagger', v: 1, text: '+1 stagger on heavy strikes' },
  aurorahalo:      { stat: 'regen', v: 0.8, text: '+0.8 HP/s' },
  crownofvows:     { stat: 'holyDmg', v: 0.10, text: '+10% holy damage' },
  quiltedgambeson: { stat: 'hp', v: 15, text: '+15 HP' },
  crusaderhauberk: { stat: 'holyDmg', v: 0.06, text: '+6% holy damage' },
  sunhauberk:      { stat: 'def', v: 0.03, text: '+3 Armour' },
  aurorahauberk:   { stat: 'regen', v: 1, text: '+1 HP/s inside your own Consecrate' },
  vestmentofdawn:  { stat: 'hp', v: 40, text: '+40 HP' },
  hobnails:        { stat: 'hp', v: 10, text: '+10 HP' },
  crusadersabatons:{ stat: 'holyDmg', v: 0.04, text: '+4% holy damage on Vault' },
  sunsabatons:     { stat: 'def', v: 0.02, text: '+2 Armour' },
  aurorasabatons:  { stat: 'stagger', v: 1, text: '+1 stagger on heavy strikes' },
  pilgrimsteps:    { stat: 'speed', v: 0.20, text: '+5% move speed' },
  // Juggernaut (heavy, fire): Ground Slam, Brace, Bull Rush
  buckethelm:      { stat: 'hp', v: 15, text: '+15 HP' },
  juggernauthelm:  { stat: 'stagger', v: 1, text: '+1 stagger on heavy strikes' },
  forgehelm:       { stat: 'fireDmg', v: 0.06, text: '+6% fire damage' },
  auroraram:       { stat: 'def', v: 0.03, text: '+3 Armour' },
  crownofcinders:  { stat: 'fireDmg', v: 0.10, text: '+10% fire damage' },
  scrapplate:      { stat: 'def', v: 0.02, text: '+2 Armour' },
  juggernautcuirass: { stat: 'poise', v: 1, text: 'Brace lasts longer' },
  forgecuirass:    { stat: 'fireDmg', v: 0.06, text: '+6% fire damage' },
  auroracuirass:   { stat: 'hp', v: 35, text: '+35 HP' },
  anvilheart:      { stat: 'hp', v: 50, text: '+50 HP' },
  ironclogs:       { stat: 'hp', v: 10, text: '+10 HP' },
  juggernauttreads:{ stat: 'stagger', v: 1, text: '+1 stagger on Bull Rush' },
  forgetreads:     { stat: 'fireDmg', v: 0.05, text: '+5% fire damage' },
  auroratreads:    { stat: 'def', v: 0.02, text: '+2 Armour' },
  quakestriders:   { stat: 'chargeSpeed', v: 0.08, text: 'Ultimate charges 8% faster' },
  // Dreamweave circlet (caster, arcane): Arcane Ward
  linencirclet:    { stat: 'mpRegen', v: 0.3, text: '+0.3 MP/s' },
  dreamcirclet:    { stat: 'arcaneDmg', v: 0.05, text: '+5% arcane damage' },
  starcirclet:     { stat: 'cdr', v: 0.03, text: '3% shorter cooldowns' },
  nebuladiadem:    { stat: 'mpOnHit', v: 0.08, text: '+8% MP on hit' },
  crownofdreams:   { stat: 'skillDmg', v: 0.08, text: '+8% skill damage' },
  // Frostweave (caster, frost): Winter's Veil, Glide
  woolrobe:        { stat: 'mpRegen', v: 0.3, text: '+0.3 MP/s' },
  frostrobe:       { stat: 'frostDmg', v: 0.06, text: '+6% frost damage' },
  rimerobe:        { stat: 'statusChance', v: 0.05, text: '+5% chance to chill' },
  aurorarime:      { stat: 'cdr', v: 0.04, text: '4% shorter cooldowns' },
  wintereternal:   { stat: 'frostDmg', v: 0.12, text: '+12% frost damage' },
  feltslippers:    { stat: 'speed', v: 0.10, text: '+3% move speed' },
  frostslippers:   { stat: 'frostDmg', v: 0.04, text: '+4% frost damage' },
  rimewalkers:     { stat: 'cdr', v: 0.04, text: 'Glide cooldown 4% shorter' },
  auroraskates:    { stat: 'speed', v: 0.20, text: '+5% move speed' },
  snowfallsteps:   { stat: 'mpRegen', v: 0.8, text: '+0.8 MP/s' },
  // Stormweave (caster, lightning): Storm Call, Static Cloak, Flash Step
  canvashood:      { stat: 'lightningDmg', v: 0.03, text: '+3% lightning damage' },
  stormhood:       { stat: 'mpRegen', v: 0.5, text: '+0.5 MP/s' },
  thunderhood:     { stat: 'lightningDmg', v: 0.06, text: '+6% lightning damage' },
  aurorastormcowl: { stat: 'statusChance', v: 0.05, text: '+5% chance to jolt' },
  crownofstorms:   { stat: 'lightningDmg', v: 0.10, text: '+10% lightning damage' },
  oilclothrobe:    { stat: 'mpOnHit', v: 0.08, text: '+8% MP on hit' },
  stormrobe:       { stat: 'lightningDmg', v: 0.06, text: '+6% lightning damage' },
  thunderrobe:     { stat: 'cdr', v: 0.04, text: '4% shorter cooldowns' },
  aurorastormrobe: { stat: 'mpRegen', v: 0.8, text: '+0.8 MP/s' },
  stormeternal:    { stat: 'skillDmg', v: 0.10, text: '+10% skill damage' },
  rushsandals:     { stat: 'speed', v: 0.10, text: '+3% move speed' },
  stormshoes:      { stat: 'lightningDmg', v: 0.04, text: '+4% lightning damage' },
  sparkheels:      { stat: 'cdr', v: 0.04, text: 'Flash Step cooldown 4% shorter' },
  aurorasparkheels:{ stat: 'speed', v: 0.20, text: '+5% move speed' },
  boltstriders:    { stat: 'lightningDmg', v: 0.08, text: '+8% lightning damage' },
  // Stalker hood (medium, pierce): Hunter's Mark
  leathercap:      { stat: 'crit', v: 0.02, text: '+2% crit chance' },
  stalkerhood:     { stat: 'markCap', v: 1, text: '+1 Mark cap' },
  nightstalkerhood:{ stat: 'pierceDmg', v: 0.06, text: '+6% pierce damage' },
  shadowweavecowl: { stat: 'critDmg', v: 0.10, text: '+10% crit damage' },
  eclipsemask:     { stat: 'pierce', v: 1, text: '+1 pierce' },
  // Thornwarden (medium, nature): Briar Mantle, Root Vault
  mosscoat:        { stat: 'natureDmg', v: 0.03, text: '+3% nature damage' },
  thorncoat:       { stat: 'reflect', v: 0.03, text: 'Thorns return 3% of damage taken' },
  briarcoat:       { stat: 'natureDmg', v: 0.06, text: '+6% nature damage' },
  aurorabriarcoat: { stat: 'regen', v: 0.8, text: '+0.8 HP/s' },
  rootseternal:    { stat: 'statusChance', v: 0.08, text: '+8% status chance' },
  barkboots:       { stat: 'hp', v: 10, text: '+10 HP' },
  thornboots:      { stat: 'natureDmg', v: 0.04, text: '+4% nature damage' },
  briarboots:      { stat: 'cdr', v: 0.04, text: 'Root Vault cooldown 4% shorter' },
  aurorabarkboots: { stat: 'speed', v: 0.15, text: '+4% move speed' },
  bloomsteps:      { stat: 'regen', v: 1, text: '+1 HP/s' },
  // Duelist (medium, slash): Taunt, En Garde, Side-step
  feathercap:      { stat: 'crit', v: 0.02, text: '+2% crit chance' },
  duelisthat:      { stat: 'slashDmg', v: 0.05, text: '+5% slash damage' },
  silverbrim:      { stat: 'critDmg', v: 0.10, text: '+10% crit damage' },
  auroraplume:     { stat: 'haste', v: 0.04, text: '+4% attack speed' },
  crownofblades:   { stat: 'power', v: 0.05, text: '+5% damage' },
  swordsmanscoat:  { stat: 'haste', v: 0.03, text: '+3% attack speed' },
  duelistcoat:     { stat: 'crit', v: 0.02, text: '+2% crit chance' },
  silverthreadcoat:{ stat: 'critDmg', v: 0.10, text: '+10% crit damage on ripostes' },
  auroradoublet:   { stat: 'slashDmg', v: 0.08, text: '+8% slash damage' },
  bladeeternal:    { stat: 'crit', v: 0.04, text: '+4% crit chance' },
  cuffedboots:     { stat: 'speed', v: 0.10, text: '+3% move speed' },
  duelistboots:    { stat: 'cdr', v: 0.03, text: 'Side-step cooldown 3% shorter' },
  silverspurs:     { stat: 'crit', v: 0.02, text: '+2% crit chance after Side-step' },
  auroraspurs:     { stat: 'speed', v: 0.20, text: '+5% move speed' },
  lungeeternal:    { stat: 'haste', v: 0.05, text: '+5% attack speed' },
  // Shade (shadow, arcane): Smoke Bomb, Fade Step, Shadowstep
  ragcowl:         { stat: 'crit', v: 0.02, text: '+2% crit chance' },
  shadecowl:       { stat: 'behindDmg', v: 0.06, text: '+6% damage from behind' },
  duskcowl:        { stat: 'cdr', v: 0.03, text: '3% shorter cooldowns' },
  aurorashadecowl: { stat: 'critDmg', v: 0.10, text: '+10% crit damage' },
  crownofdusk:     { stat: 'backstab', v: 15, text: 'Backstab arc widens by 15 degrees' },
  ragleathers:     { stat: 'speed', v: 0.10, text: '+3% move speed' },
  shadeleathers:   { stat: 'crit', v: 0.02, text: '+2% crit chance' },
  duskleathers:    { stat: 'behindDmg', v: 0.08, text: '+8% damage from behind' },
  auroraleathers:  { stat: 'haste', v: 0.04, text: '+4% attack speed' },
  gloameternal:    { stat: 'critDmg', v: 0.14, text: '+14% crit damage' },
  ragwraps:        { stat: 'speed', v: 0.10, text: '+3% move speed' },
  shadewraps:      { stat: 'crit', v: 0.02, text: '+2% crit chance after Shadowstep' },
  duskwraps:       { stat: 'cdr', v: 0.04, text: 'Shadowstep cooldown 4% shorter' },
  aurorawraps:     { stat: 'speed', v: 0.25, text: '+7% move speed' },
  nightfallsteps:  { stat: 'behindDmg', v: 0.10, text: '+10% damage from behind' },
  // Nightshade (shadow, nature): Toxin Flask, Venom Coat, Slink
  clothmask:       { stat: 'natureDmg', v: 0.03, text: '+3% nature damage' },
  nightshademask:  { stat: 'statusChance', v: 0.04, text: '+4% chance to poison' },
  venommask:       { stat: 'natureDmg', v: 0.06, text: '+6% nature damage' },
  auroramask:      { stat: 'cdr', v: 0.04, text: '4% shorter cooldowns' },
  crownofthorns:   { stat: 'natureDmg', v: 0.10, text: '+10% nature damage' },
  herbvest:        { stat: 'regen', v: 0.5, text: '+0.5 HP/s' },
  nightshadevest:  { stat: 'natureDmg', v: 0.05, text: '+5% nature damage' },
  venomvest:       { stat: 'haste', v: 0.04, text: '+4% attack speed' },
  auroravest:      { stat: 'statusChance', v: 0.06, text: '+6% status chance' },
  blighteternal:   { stat: 'natureDmg', v: 0.12, text: '+12% nature damage' },
  mossshoes:       { stat: 'speed', v: 0.10, text: '+3% move speed' },
  nightshadesteps: { stat: 'natureDmg', v: 0.04, text: '+4% nature damage' },
  venomsteps:      { stat: 'cdr', v: 0.04, text: 'Slink cooldown 4% shorter' },
  auroracreepers:  { stat: 'speed', v: 0.20, text: '+5% move speed' },
  creepereternal:  { stat: 'behindDmg', v: 0.10, text: '+10% damage from behind' },
  // Mirage (shadow, arcane): Dreamveil, Mirror Image, Phase
  gauzeveil:       { stat: 'arcaneDmg', v: 0.03, text: '+3% arcane damage' },
  mirageveil:      { stat: 'cdr', v: 0.03, text: '3% shorter cooldowns' },
  glassveil:       { stat: 'arcaneDmg', v: 0.06, text: '+6% arcane damage' },
  auroraglassveil: { stat: 'mpRegen', v: 0.6, text: '+0.6 MP/s' },
  crownofmirrors:  { stat: 'skillDmg', v: 0.08, text: '+8% skill damage' },
  gauzesilks:      { stat: 'crit', v: 0.02, text: '+2% crit chance' },
  miragesilks:     { stat: 'arcaneDmg', v: 0.05, text: '+5% arcane damage' },
  glasssilks:      { stat: 'haste', v: 0.04, text: '+4% attack speed' },
  aurorasilks:     { stat: 'critDmg', v: 0.10, text: '+10% crit damage' },
  mirroreternal:   { stat: 'arcaneDmg', v: 0.12, text: '+12% arcane damage' },
  gauzeslippers:   { stat: 'speed', v: 0.10, text: '+3% move speed' },
  mirageslippers:  { stat: 'cdr', v: 0.03, text: 'Phase cooldown 3% shorter' },
  glassslippers:   { stat: 'arcaneDmg', v: 0.04, text: '+4% arcane damage' },
  auroraslippers:  { stat: 'speed', v: 0.20, text: '+5% move speed' },
  shimmereternal:  { stat: 'crit', v: 0.04, text: '+4% crit chance' },
};

// ===== flavour (§19.3): one line per base and per unique, docs/design/story.md voice, <= 12 words =====
const FLAVOR = {
  // Nightfang daggers
  shiv: 'Small enough to forget, sharp enough to be remembered.',
  nightfang: 'Two quiet teeth that bite only in the dark.',
  twineclipse: 'One for the sun, one for the moon, both for you.',
  widowskiss: 'Its touch is light. Its goodbye is not.',
  fangseternal: 'The night lent its fangs and never asked for them back.',
  // Buckler
  woodbuckler: 'Planks from a door that never let the cold in.',
  ironbuckler: 'Dented in the shape of every blow it turned aside.',
  sunbuckler: 'A little round sunrise you can hold up to the dark.',
  aurorabuckler: 'The sky above the north, bent into a shield.',
  bucklereternal: 'It has stood in front of you in every dream.',
  // Grimoire
  worngrimoire: 'Half its pages are blank. They are waiting for you.',
  dreamgrimoire: 'Written in a hand that changes while you read.',
  stargrimoire: 'Each page is a small night sky, folded flat.',
  nebulacodex: 'The ink drifts like clouds that remember a shape.',
  codexeternal: 'The last chapter is always the one you are living.',
  // Quiver
  leatherquiver: 'It smells of pine needles and patient mornings.',
  moonquiver: 'Arrows drawn from it come out cool and silver.',
  silverquiver: 'Every arrow rings once, like a bell, as it leaves.',
  eclipsequiver: 'Dark on one side, bright on the other, never empty.',
  quivereternal: 'It holds one more arrow than you will ever need.',
  // ===== M4b lines =====
  // Rapier
  tinneedle: 'Bent twice and straightened twice. It still points true.',
  moonpoint: 'Thin as a moonbeam through a keyhole.',
  silverestoc: 'It answers every blow with a quicker one.',
  starpoint: 'The night sky taught it where to stop.',
  needleeternal: 'It has threaded every gap in every armour ever dreamed.',
  // Mace
  ironcudgel: 'Honest iron. It never pretended to be a sword.',
  dawnmace: 'Its flanges catch the morning like a bell catches wind.',
  sunwardenmace: 'Carried by wardens who walked the night roads.',
  auroramaul: 'Each blow leaves a small sky ringing in the dark.',
  voweternal: 'A promise made heavy enough to keep.',
  // Axe
  splittingaxe: 'It split firewood for a house that is still warm.',
  dawnbreaker: 'Swung once at the horizon, and the night gave way.',
  sunforgedaxe: 'The smith quenched it in a sunrise.',
  auroracleaver: 'The northern lights caught in its bite.',
  dawncolossus: 'Lifting it feels like lifting the morning.',
  // Hammer
  sledge: 'It built a bridge once. Now it breaks walls.',
  sunhammer: 'Struck on an anvil made of noon.',
  mountainmaul: 'The mountain lent its weight, and wants it back.',
  auroraanvil: 'Every strike rings a colour no one has named.',
  hammereternal: 'The ground still flinches when it remembers.',
  // Halberd
  pike: 'Long enough to keep the dark at arm\'s length.',
  dawnglaive: 'Its blade sweeps like the first light over a field.',
  sunhalberd: 'Held at the gate while the town slept.',
  aurorapartisan: 'Its long shadow points north, always.',
  reacheternal: 'However far the dark runs, this reaches further.',
  // Crossbow
  handcrossbow: 'Small, patient, and very sure of itself.',
  dawnarbalest: 'Wound tight as a held breath before morning.',
  sunbolt: 'Each bolt leaves a thin bright line in the air.',
  auroraballista: 'It was built to wake giants, and sometimes does.',
  bolteternal: 'The string has never once gone slack.',
  // Chakram
  rim: 'A plain ring of steel that always finds its way home.',
  moonchakram: 'It circles like the moon, and comes back like it.',
  silverring: 'It sings one long note through the air.',
  eclipsering: 'A dark disc with a bright edge, like a hidden sun.',
  ringeternal: 'Thrown in one dream, caught in the next.',
  // Wand
  birchtwig: 'Picked up on a walk. It picked you back.',
  hazelwand: 'Hazel finds water. This one finds frost.',
  sunsparkwand: 'A spark from a hearth that would not go out.',
  aurorawand: 'It draws thin ribbons of sky behind each spell.',
  sparketernal: 'The first spark of the first fire, still lit.',
  // Orb
  glassbauble: 'A storm the size of a plum, asleep for now.',
  starfallorb: 'A fallen star, kept polite in a glass shell.',
  cometorb: 'Its tail of light curls when you are not looking.',
  nebulasphere: 'Clouds of lightning turn slowly inside.',
  orbeternal: 'Hold it to your ear and hear the first thunder.',
  // Claws
  boneclaws: 'Old bones, sharpened by older hunger.',
  nightclaws: 'They tap softly on the dark, asking to come in.',
  silvertalon: 'Bright enough to see them coming. Too late.',
  eclipseclaws: 'They cut where the light cannot reach.',
  clawseternal: 'Every beast that ever hunted lent them a nail.',
  // Fans
  paperfans: 'Folded from letters nobody sent.',
  moonfans: 'Each fold holds a little moonlight and a little wind.',
  silverplume: 'Light as a feather, sharp as its quill.',
  eclipsefans: 'Open them and the room forgets its shadows.',
  fanseternal: 'The wind of every dance, folded into one.',
  // Heater
  oakheater: 'Cut from the oak that sheltered a sleeping village.',
  oathheater: 'A vow is painted on the back, facing you.',
  sunheater: 'It shines brightest when the blows come fastest.',
  auroraheater: 'The northern sky, hammered flat and held firm.',
  oatheternal: 'It kept its oath long after the one who swore it.',
  // Tower
  doorshield: 'It was a door once. It still keeps things out.',
  wardwall: 'Wardens lined up behind it and the night stopped.',
  sunwall: 'A sunrise you can stand behind.',
  aurorabastion: 'Lights dance on its face while the arrows break.',
  walleternal: 'The last wall of the last town, carried with you.',
  // Warhorn
  cowhorn: 'It called the herd home every evening for years.',
  rallyinghorn: 'One long note, and tired arms lift again.',
  sunhorn: 'It sounds like morning coming over a hill.',
  auroraclarion: 'Its call hangs in the air like the northern lights.',
  calleternal: 'Every voice that ever said "stand" is in it.',
  // Crusader helm
  pothelm: 'Dented, warm, and a little too big.',
  crusaderhelm: 'The eye slit faces the dawn.',
  bellhelm: 'It rings faintly when the dark is near.',
  aurorahalo: 'A ring of light that keeps the night at bay.',
  crownofvows: 'Each point of it is a promise kept.',
  // Crusader hauberk
  quiltedgambeson: 'Stitched by someone who wanted you home.',
  crusaderhauberk: 'Its rings were blessed one at a time.',
  sunhauberk: 'Sworn to the sun, and the sun swore back.',
  aurorahauberk: 'Light moves across the mail like a slow tide.',
  vestmentofdawn: 'Worn by the first who walked into the dark.',
  // Crusader sabatons
  hobnails: 'They clatter on stone like a small brave drum.',
  crusadersabatons: 'Each step lands like a vow.',
  sunsabatons: 'They leave warm prints on cold ground.',
  aurorasabatons: 'They leap as if the sky called them up.',
  pilgrimsteps: 'They have walked every road to every shrine.',
  // Juggernaut helm
  buckethelm: 'Honestly, it was a bucket.',
  juggernauthelm: 'It has met many walls and won every time.',
  forgehelm: 'The forge-fire still glows behind the visor.',
  auroraram: 'Its horns curl like the lights over the snow.',
  crownofcinders: 'Embers sleep in it, waiting for a fight.',
  // Juggernaut cuirass
  scrapplate: 'Every piece came from a fight that was lost.',
  juggernautcuirass: 'Plant your feet and let the world push.',
  forgecuirass: 'Born in the forge, and it never cooled.',
  auroracuirass: 'A furnace of cold northern light.',
  anvilheart: 'Hammers break on it. Hearts do not.',
  // Juggernaut treads
  ironclogs: 'Loud. Heavy. Impossible to knock over.',
  juggernauttreads: 'The road gets out of their way.',
  forgetreads: 'They leave scorched prints on the flagstones.',
  auroratreads: 'They thunder like a storm under the snow.',
  quakestriders: 'The ground learns to fear each step.',
  // Dreamweave circlet
  linencirclet: 'A plain band that hums when you dream.',
  dreamcirclet: 'Woven from the threads between sleep and waking.',
  starcirclet: 'Small stars sit on it like dew.',
  nebuladiadem: 'A cloud of light that thinks with you.',
  crownofdreams: 'The dreamer\'s own crown, lent for a while.',
  // Frostweave robe
  woolrobe: 'Warm wool, and a little frost in the hem.',
  frostrobe: 'Each thread was spun on a winter night.',
  rimerobe: 'Rime gathers on it and never melts.',
  aurorarime: 'The winter sky, sewn into a cloak.',
  wintereternal: 'It remembers the first snow that ever fell.',
  // Frostweave slippers
  feltslippers: 'Soft enough to cross a frozen pond in silence.',
  frostslippers: 'Ice forms a path ahead of them.',
  rimewalkers: 'They glide like breath across a window.',
  auroraskates: 'They carve shining lines into the cold.',
  snowfallsteps: 'Every step falls as softly as snow.',
  // Stormweave hood
  canvashood: 'It kept the rain off. Then it caught the lightning.',
  stormhood: 'The hairs on your neck stand when you wear it.',
  thunderhood: 'It rumbles quietly, like a storm far away.',
  aurorastormcowl: 'Sparks dance in its folds like northern lights.',
  crownofstorms: 'The storm kneels for whoever wears it.',
  // Stormweave robe
  oilclothrobe: 'Made for the rain, and the rain made it more.',
  stormrobe: 'It crackles when you move too fast.',
  thunderrobe: 'Thunder is woven in the lining.',
  aurorastormrobe: 'Light runs down it like rain on glass.',
  stormeternal: 'The first storm still rages in its seams.',
  // Stormweave shoes
  rushsandals: 'For running to shelter. Or away from it.',
  stormshoes: 'They spark on stone.',
  sparkheels: 'Each step is a little flash of light.',
  aurorasparkheels: 'They leave bright trails across the dark.',
  boltstriders: 'Faster than thunder, and nearly as loud.',
  // Stalker hood
  leathercap: 'It smells of rain and long waiting.',
  stalkerhood: 'Pull it low and see only your quarry.',
  nightstalkerhood: 'It turns your eyes into a cat\'s.',
  shadowweavecowl: 'Shadows fold around it like a second hood.',
  eclipsemask: 'Behind it, the hunt is all there is.',
  // Thornwarden coat
  mosscoat: 'Moss grew on it while its owner slept.',
  thorncoat: 'Hug it and you will be sorry.',
  briarcoat: 'The briars grow back no matter how often cut.',
  aurorabriarcoat: 'Thorns of pale light curl along its sleeves.',
  rootseternal: 'Its roots reach down into every forest at once.',
  // Thornwarden boots
  barkboots: 'They creak like old trees in a slow wind.',
  thornboots: 'Thorns sprout wherever they land.',
  briarboots: 'They leave a small hedge behind them.',
  aurorabarkboots: 'Bark that glows faintly, like moonlit birch.',
  bloomsteps: 'Flowers open in their footprints.',
  // Duelist hat
  feathercap: 'The feather was won in a fair fight.',
  duelisthat: 'Tip it once before. Tip it once after.',
  silverbrim: 'Its silver brim flashes like a drawn blade.',
  auroraplume: 'Its plume moves before you do.',
  crownofblades: 'Worn by whoever won the last duel. That is you.',
  // Duelist coat
  swordsmanscoat: 'Cut to move, patched where it did not.',
  duelistcoat: 'It has never once lost its composure.',
  silverthreadcoat: 'The silver thread catches every glancing blow.',
  auroradoublet: 'It shimmers like a blade turning in the light.',
  bladeeternal: 'Every duel ever fought is stitched into its cuffs.',
  // Duelist boots
  cuffedboots: 'Light on the heel, quick off the mark.',
  duelistboots: 'Step left, step right, step out of reach.',
  silverspurs: 'They ring when you dance away.',
  auroraspurs: 'Bright spurs for a bright retreat.',
  lungeeternal: 'They already know where the next blow lands.',
  // Shade cowl
  ragcowl: 'Torn just enough to hide your face.',
  shadecowl: 'Your face becomes a rumour.',
  duskcowl: 'Woven from the hour after sunset.',
  aurorashadecowl: 'Dark below, faintly bright above, like the far north.',
  crownofdusk: 'The dusk sits on your brow and keeps your secrets.',
  // Shade leathers
  ragleathers: 'Scraps sewn together by someone who did not want to be seen.',
  shadeleathers: 'They swallow the lantern light.',
  duskleathers: 'They darken as the day does.',
  auroraleathers: 'A shadow with a little light caught inside.',
  gloameternal: 'The gloam itself, worn close.',
  // Shade wraps
  ragwraps: 'Wrapped tight, footsteps gone.',
  shadewraps: 'You were there. Now you are behind them.',
  duskwraps: 'They step through shadows like open doors.',
  aurorawraps: 'They flicker, and you are elsewhere.',
  nightfallsteps: 'Where they walk, night comes early.',
  // Nightshade mask
  clothmask: 'It keeps the fumes out. Mostly.',
  nightshademask: 'Dark leaves pressed against a quiet face.',
  venommask: 'Its breath is sweet and very dangerous.',
  auroramask: 'A pale green glow behind the eyes.',
  crownofthorns: 'Every thorn drips a single patient drop.',
  // Nightshade vest
  herbvest: 'Its pockets are full of things not to eat.',
  nightshadevest: 'It blooms at night, quietly.',
  venomvest: 'The stitching is green, and so is the edge of your blade.',
  auroravest: 'A soft glow, like poison in moonlight.',
  blighteternal: 'Every garden that ever went bad remembers it.',
  // Nightshade steps
  mossshoes: 'Moss underfoot, nothing heard.',
  nightshadesteps: 'They crush no leaf and leave no print.',
  venomsteps: 'The grass wilts politely where they pass.',
  auroracreepers: 'They creep like pale vines along the ground.',
  creepereternal: 'Patient as roots, quick as a strike.',
  // Mirage veil
  gauzeveil: 'Through it the world looks a little unsure.',
  mirageveil: 'Your enemies see you a step to the left.',
  glassveil: 'Woven glass that bends every glance.',
  auroraglassveil: 'It throws small rainbows into the dark.',
  crownofmirrors: 'Every face in it is yours, and none of them are.',
  // Mirage silks
  gauzesilks: 'So light you forget where your body ends.',
  miragesilks: 'They shimmer like heat over a summer road.',
  glasssilks: 'Your reflection moves a moment before you do.',
  aurorasilks: 'Colours drift across them like a dream fading.',
  mirroreternal: 'The first reflection, still looking back.',
  // Mirage slippers
  gauzeslippers: 'They barely touch the ground.',
  mirageslippers: 'Where you step is not quite where you are.',
  glassslippers: 'They chime softly when you vanish.',
  auroraslippers: 'Light steps for a light that wanders.',
  shimmereternal: 'They walk between one moment and the next.',
  // Dawnblade
  rustyblade: 'It remembers one good morning, and waits for another.',
  dawnblade: 'Forged where the first light touched the cold water.',
  sunforged: 'Still warm from a sunrise nobody else saw.',
  auroraedge: 'It hums softly when someone far away is sleeping.',
  dawneternal: 'Every dawn it has ever seen is folded in its edge.',
  // Starfall Staff
  willowwand: 'Cut from a willow that leaned toward the stars.',
  starfall: 'It keeps the night sky the way a child keeps a shell.',
  cometrod: 'A small comet that agreed to stay for a while.',
  nebulasceptre: 'Its glow drifts like a cloud that forgot its shape.',
  nighteternal: 'The night never ends here; it only changes its name.',
  // Moonbow
  hunterbow: 'Its owner walked into the pines and did not come back.',
  moonbow: 'Strung with moonlight that will not quite fade.',
  silverwing: 'Its arrows fly like pale birds going home.',
  eclipsebow: 'It is darkest just before the arrow finds its mark.',
  mooneternal: 'The moon lent this bow and never asked for it back.',
  // Knight Helm
  ironcap: 'Plain iron, worn smooth by many quiet years.',
  knighthelm: 'A helm that remembers the weight of every oath.',
  sunguard: 'Gold leaf on the brow, for the morning that follows.',
  auroravisor: 'Through its visor the sky looks very far away.',
  crownofdawn: 'Worn once by a queen who waited for the sun.',
  // Arcane Cowl
  novicehood: 'A student\'s hood, still smelling of old candle smoke.',
  arcanecowl: 'Cold to the touch, like a frost-bright window.',
  starweave: 'Woven one thread at a time, through a long winter.',
  astralcirclet: 'A ring of silver that hums to the sleeping stars.',
  crownofstars: 'Thin light gathers at its brow, then lets go.',
  // Warden Hood
  rangercap: 'A cap for long walks where the path grows faint.',
  wardenhood: 'Moss grows softly along its seams, as if it cares.',
  mossmantle: 'The forest keeps watch through its quiet green folds.',
  thornwarden: 'Each thorn was a promise made to the roots.',
  crownofroots: 'Roots reach up from the earth to crown its wearer.',
  // Knight Plate
  ironmail: 'Riveted links, each one a name somebody still says.',
  knightplate: 'Plate that bends a little, so it will not break.',
  sunplate: 'Gilded plate, polished by the hands of the faithful.',
  auroraplate: 'Light falls on it and stays a moment longer.',
  dawnaegis: 'Sworn to the dawn, and it has never broken that oath.',
  // Dreamweave Robe
  linenrobe: 'Plain linen, dyed the colour of a dream remembered.',
  dreamrobe: 'Threads of violet that shimmer when you almost sleep.',
  starwoven: 'Each star in the weave is a dream someone let go.',
  nebularobe: 'Soft clouds of colour, pulled gently around the shoulders.',
  dreamshroud: 'It keeps the dreams you forgot, and keeps them warm.',
  // Stalker Jacket
  jerkin: 'Old leather that has walked a great many lonely roads.',
  stalkerjacket: 'Brown and quiet, like a hedge in the last light.',
  nightcoat: 'Its pockets hold the smell of rain and small fires.',
  shadowweave: 'Shadows cling to it, gentle as a sleeping cat.',
  eclipsegarb: 'Dark as a sun that chose to rest for a while.',
  // Knight Greaves
  ironboots: 'Heavy boots for a road that never seems to end.',
  knightgreaves: 'Each step rings like a bell in an empty hall.',
  sungreaves: 'Their gold catches the last light of the day.',
  auroragreaves: 'They carry the warmth of a morning all the way.',
  dawnstriders: 'Made for walking toward a sunrise that is always near.',
  // Cloud Sandals
  ropesandals: 'Woven from rope and an old fisherman\'s patience.',
  clothsandals: 'Light as a cloud, and just as easily lost.',
  mistwalkers: 'They leave no print on the grass after the mist.',
  skystep: 'They step on air as though air were the ground.',
  cloudsteps: 'Eternal steps, taken softly, in a sky with no bottom.',
  // Stalker Shoes
  softshoes: 'Soft soles for hushed rooms and sleeping gardens.',
  stalkershoes: 'Worn through at the heel from many quiet chases.',
  quietstep: 'Each step falls where the last one forgot to be.',
  shadowstep: 'They pass through the shade without disturbing it.',
  eclipsetreads: 'Treads that follow the moon across a dark sky.',
  // Boss uniques (UNIQUES in items.js)
  rootcrown: 'The roots held. Bramblehorn asked that someone remember.',
  lanternplate: 'A warden\'s plate, lit from inside by a small flame.',
  tideedge: 'The sea remembers every blade it has ever swallowed.',
  cinderstride: 'The boots still glow where a king once walked.',
  morrowbane: 'It was forged to end a dream, and it does so gently.',
  echo: 'Whatever you do, it does again: a breath behind you, and a little brighter.',
  stillhour: 'The clock stopped at a quarter past. You did not.',
  // Trinket uniques
  pipslantern: 'A small lantern that still remembers its first light.',
  drownedcompass: 'It points toward the things the water was keeping.',
  ashensignet: 'Warm ash on the finger, a fire that never quite went out.',
  kindredband: 'Two bands that sing louder when they are near each other.',
  cindersash: 'Ember-red cloth, warm long after the fire has gone.',
  quietgirdle: 'It loosens at dusk, the way a tired traveller does.',
  // Trinket bases (§19.4)
  tarnished_band: 'A plain band, dull until someone needs it to shine.',
  dreamsilver_band: 'Silver drawn from a dream just before waking.',
  starmetal_band: 'It fell from the sky and chose a finger to stay on.',
  lantern_charm: 'A tiny lantern that hums when the night is long.',
  dreamglass_pendant: 'Hold it to the light and a dream looks back.',
  starhollow_amulet: 'There is a small sky inside, and it is waiting.',
  rope_sash: 'Knotted by tired hands for a long walk home.',
  mistwoven_belt: 'Woven from morning mist that forgot to lift.',
  moonlit_girdle: 'It keeps the moon close when the road is dark.',
  // Origin rings (§17.1): the starter ring of each origin
  origin_knight: 'Your first oath, small enough to wear every day.',
  origin_mystic: 'It remembers the first dream you ever kept.',
  origin_ranger: 'Worn smooth by every trail you have not walked yet.',
  origin_thief: 'Nobody saw you take it. Nobody ever does.',
  origin_warrior: 'A promise to stand, made before you knew why.',
  // World uniques
  cometband: 'A band of falling light, caught and kept for a while.',
  tidewovenclasp: 'Woven from sea grass, it holds the garden close.',
  afterimagependant: 'Each leap leaves a little of the wearer behind.',
  summonersthread: 'A thread tied to small things that answer when called.',
  hollowbell: 'It rings once for each thing that was lost.',
};

// ===== mythic titles (§19.1, §19.3): "[prefix] [base] [title]". No silly names near the twist. =====
const MYTHIC_NAMES = [
  'of the Unwaking', 'of the Quiet Shore', 'of the Last Lantern', 'of the Drowned Bell',
  'of the Lingering Dawn', 'of the Sleepless Tide', 'of the Hollow Moon', 'of the Gentle Ember',
  'of the Forgotten Hearth', 'of the Pale Harbour', 'of the Silent Orchard', 'of the Long Night',
  'of the Seventh Wish', 'of the Unfinished Song', 'of the Glass Meadow', 'of the Wakeful Dream',
  'of the Starlit Shoals', 'of the Kindled Thread', 'of the Mended Sky', 'of the Whispering Vale',
  'of the Last Morning', 'of the Patient Stone', 'of the Sunken Garden', 'of the Woven Dusk',
  'of the Returning Tide', 'of the Gilded Rain', 'of the Vanished Path', 'of the Cradle Star',
  'of the Dreaming Grove', 'of the Open Door',
];

// ===== trinkets (§19.4): ring, amulet, belt x 3 tiers (reqLvl 1 / 16 / 32). Belt implicit is +1 potion charge. =====
const TRINKET_BASES = [
  { id: 'tarnished_band', name: 'Tarnished Band', slot: 'ring', tier: 1, reqLvl: 1, implicit: { stat: 'power', v: 0.02, text: '+2% power' } },
  { id: 'dreamsilver_band', name: 'Dreamsilver Band', slot: 'ring', tier: 2, reqLvl: 16, implicit: { stat: 'power', v: 0.04, text: '+4% power' } },
  { id: 'starmetal_band', name: 'Starmetal Band', slot: 'ring', tier: 3, reqLvl: 32, implicit: { stat: 'power', v: 0.06, text: '+6% power' } },
  { id: 'lantern_charm', name: 'Lantern Charm', slot: 'amulet', tier: 1, reqLvl: 1, implicit: { stat: 'chargeSpeed', v: 0.03, text: '+3% charge rate' } },
  { id: 'dreamglass_pendant', name: 'Dreamglass Pendant', slot: 'amulet', tier: 2, reqLvl: 16, implicit: { stat: 'chargeSpeed', v: 0.05, text: '+5% charge rate' } },
  { id: 'starhollow_amulet', name: 'Starhollow Amulet', slot: 'amulet', tier: 3, reqLvl: 32, implicit: { stat: 'chargeSpeed', v: 0.08, text: '+8% charge rate' } },
  { id: 'rope_sash', name: 'Rope Sash', slot: 'belt', tier: 1, reqLvl: 1, implicit: { stat: 'potionCharge', v: 1, text: '+1 potion charge' } },
  { id: 'mistwoven_belt', name: 'Mistwoven Belt', slot: 'belt', tier: 2, reqLvl: 16, implicit: { stat: 'potionCharge', v: 1, text: '+1 potion charge' } },
  { id: 'moonlit_girdle', name: 'Moonlit Girdle', slot: 'belt', tier: 3, reqLvl: 32, implicit: { stat: 'potionCharge', v: 1, text: '+1 potion charge' } },
];

// ===== boons (§19.4). Uncommon gets minor, Rare+ gets major. 12 per slot. Ids never stack. =====
// Example numbers from §19.4 are used as the major value (integers: minor = example, major = example + 1).
const BOONS = {
  ring: [
    { id: 'fireBurn', name: 'Ember Sign', text: '+15% fire damage and +10% Burn chance',
      minor: { fireDmg: 0.08, burnChance: 0.05 }, major: { fireDmg: 0.15, burnChance: 0.10 }, tags: ['fire', 'burn'] },
    { id: 'shatterRadius', name: 'Wide Fracture', text: 'Shatter radius +1',
      minor: { shatterRadius: 1 }, major: { shatterRadius: 2 }, tags: ['reaction', 'shatter'] },
    { id: 'conductJump', name: 'Leaping Current', text: 'Conduct +1 jump',
      minor: { conductJump: 1 }, major: { conductJump: 2 }, tags: ['lightning', 'conduct'] },
    { id: 'backstabArc', name: 'Wider Shadow', text: 'Backstab arc +30 degrees',
      minor: { backstab: 15 }, major: { backstab: 30 }, tags: ['melee', 'backstab'] },
    { id: 'markCap', name: 'Many Threads', text: '+1 Mark cap',
      minor: { markCap: 1 }, major: { markCap: 2 }, tags: ['mark'] },
    { id: 'chargedSwing', name: 'Quickened Wrath', text: 'Charged swings 0.25 s faster',
      minor: { chargeTime: 0.12 }, major: { chargeTime: 0.25 }, tags: ['melee', 'charge'] },
    { id: 'projPierce', name: 'Piercing Thought', text: 'Projectiles +1 pierce',
      minor: { pierce: 1 }, major: { pierce: 2 }, tags: ['projectile'] },
    { id: 'frostPower', name: 'Hoarfrost Band', text: '+15% frost damage and +10% Freeze chance',
      minor: { frostDmg: 0.08, freezeChance: 0.05 }, major: { frostDmg: 0.15, freezeChance: 0.10 }, tags: ['frost', 'freeze'] },
    { id: 'naturePower', name: 'Rootbound Loop', text: '+15% nature damage and +10% Poison chance',
      minor: { natureDmg: 0.08, poisonChance: 0.05 }, major: { natureDmg: 0.15, poisonChance: 0.10 }, tags: ['nature', 'poison'] },
    { id: 'lightningPower', name: 'Storm Ring', text: '+15% lightning damage; Shock lasts 1 s longer',
      minor: { lightningDmg: 0.08, shockDur: 0.5 }, major: { lightningDmg: 0.15, shockDur: 1 }, tags: ['lightning', 'shock'] },
    { id: 'arcanePower', name: 'Mirror Loop', text: '+15% arcane damage; Marks last 1 s longer',
      minor: { arcaneDmg: 0.08, markDur: 0.5 }, major: { arcaneDmg: 0.15, markDur: 1 }, tags: ['arcane', 'mark'] },
    { id: 'holyPower', name: 'Halo Hoop', text: '+15% holy damage; holy hits stagger more',
      minor: { holyDmg: 0.08, stagger: 0.5 }, major: { holyDmg: 0.15, stagger: 1 }, tags: ['holy'] },
  ],
  amulet: [
    { id: 'chargeFromReact', name: 'Reaction Locket', text: '+15% charge from reactions',
      minor: { reactCharge: 0.08 }, major: { reactCharge: 0.15 }, tags: ['reaction', 'ultimate'] },
    { id: 'rFrostTag', name: 'Frozen Ultimate', text: 'R gains the frost tag',
      minor: { rTag: 'frost' }, major: { rTag: 'frost', rDmg: 0.10 }, tags: ['ultimate', 'frost'] },
    { id: 'rCost', name: 'Thrifty Light', text: 'R costs 80 charge',
      minor: { rCost: 90 }, major: { rCost: 80 }, tags: ['ultimate'] },
    { id: 'rFirstFree', name: 'First Dawn', text: 'The first R in each fight is free',
      minor: { rFirstCost: 0.5 }, major: { rFirstFree: true }, tags: ['ultimate'] },
    { id: 'ultDmg', name: 'Lantern Heart', text: '+10% ultimate damage',
      minor: { ultDmg: 0.05 }, major: { ultDmg: 0.10 }, tags: ['ultimate'] },
    { id: 'ultRadius', name: 'Wider Glow', text: 'R radius +1',
      minor: { ultRadius: 0.5 }, major: { ultRadius: 1 }, tags: ['ultimate'] },
    { id: 'ultBuffDur', name: 'Lingering Dream', text: 'R buffs last 2 s longer',
      minor: { ultBuffDur: 1 }, major: { ultBuffDur: 2 }, tags: ['ultimate', 'buff'] },
    { id: 'skillDmgFull', name: 'Full Charge', text: '+8% skill damage while charge is full',
      minor: { skillDmg: 0.04 }, major: { skillDmg: 0.08 }, tags: ['ultimate'] },
    { id: 'chargeOnDodge', name: 'Nimble Heart', text: 'Dodges grant 5 charge',
      minor: { chargeOnDodge: 3 }, major: { chargeOnDodge: 5 }, tags: ['dodge', 'ultimate'] },
    { id: 'chargeOnKill', name: 'Gathered Light', text: 'Kills grant 2 charge',
      minor: { chargeOnKill: 1 }, major: { chargeOnKill: 2 }, tags: ['kill', 'ultimate'] },
    { id: 'mpOnR', name: 'Quiet Reserve', text: 'R restores 20 MP',
      minor: { mpOnR: 10 }, major: { mpOnR: 20 }, tags: ['ultimate', 'mp'] },
    { id: 'critAfterR', name: 'Sharpened Dusk', text: '+5% crit chance for 6 s after R',
      minor: { crit: 0.03 }, major: { crit: 0.05 }, tags: ['ultimate', 'crit'] },
  ],
  belt: [
    { id: 'potionCleanse', name: 'Cleansing Sash', text: 'Potions also cleanse one status',
      minor: { potionCleanse: 1 }, major: { potionCleanse: 2 }, tags: ['potion'] },
    { id: 'killHeal', name: 'Gift of Victory', text: 'Kill-heal +50%',
      minor: { killHeal: 0.25 }, major: { killHeal: 0.5 }, tags: ['kill', 'heal'] },
    { id: 'cookingDur', name: 'Lasting Supper', text: 'Cooking buffs last 15 min',
      minor: { cookingDurMin: 10 }, major: { cookingDurMin: 15 }, tags: ['food'] },
    { id: 'salvageDust', name: 'Thrifty Hands', text: 'Salvage Dust x1.5',
      minor: { salvageDust: 1.25 }, major: { salvageDust: 1.5 }, tags: ['salvage'] },
    { id: 'gemWrap', name: 'Wrapped Gems', text: 'Gems in chest and boots count +1 grade, clamped at Radiant',
      minor: { gemWrapSlots: ['chest'], gemWrapGrade: 1 }, major: { gemWrapSlots: ['chest', 'boots'], gemWrapGrade: 1 }, tags: ['gem', 'chest', 'boots'] },
    { id: 'potionCap', name: 'Full Pouch', text: '+1 potion charge',
      minor: { potionCharge: 1 }, major: { potionCharge: 2 }, tags: ['potion'] },
    { id: 'dustOnKill', name: 'Drifting Dust', text: '+2 Dust on elite kills',
      minor: { dustOnElite: 1 }, major: { dustOnElite: 2 }, tags: ['kill', 'salvage'] },
    { id: 'flaskRegen', name: 'Slow Mending', text: 'Potions heal 3% of max HP per second for 4 s',
      minor: { potionRegen: 0.01 }, major: { potionRegen: 0.03 }, tags: ['potion', 'heal'] },
    { id: 'foodXp', name: 'Shared Meal', text: '+10% XP from food',
      minor: { foodXp: 0.05 }, major: { foodXp: 0.10 }, tags: ['food'] },
    { id: 'fishLuck', name: 'Patient Line', text: '+5% fishing luck',
      minor: { fishLuck: 0.03 }, major: { fishLuck: 0.05 }, tags: ['fishing'] },
    { id: 'potionMp', name: 'Still Water', text: 'Potions also restore 20% MP',
      minor: { potionMp: 0.10 }, major: { potionMp: 0.20 }, tags: ['potion', 'mp'] },
    { id: 'dodgeIframe', name: 'Long Veil', text: 'Dodge i-frame window 0.1 s longer',
      minor: { dodgeIframeDur: 0.05 }, major: { dodgeIframeDur: 0.1 }, tags: ['dodge'] },
  ],
};

// ===== origin rings (§17.1, §19.4): the Origin passive is a free starter ring's boon. =====
const ORIGIN_RINGS = [
  { id: 'origin_knight', name: 'Ring of the Shield', origin: 'Knight', slot: 'ring',
    boon: { id: 'originKnight', name: 'Oath of the Shield', text: '+10% defence',
      minor: { def: 0.10 }, major: { def: 0.10 }, tags: ['defence'] } },
  { id: 'origin_mystic', name: 'Ring of the Dream', origin: 'Mystic', slot: 'ring',
    boon: { id: 'originMystic', name: 'Dream Tithe', text: '+10% MP on hit',
      minor: { mpOnHit: 0.10 }, major: { mpOnHit: 0.10 }, tags: ['mp'] } },
  { id: 'origin_ranger', name: 'Ring of the Trail', origin: 'Ranger', slot: 'ring',
    boon: { id: 'originRanger', name: 'Keen Eye', text: '+10% crit damage',
      minor: { critDmg: 0.10 }, major: { critDmg: 0.10 }, tags: ['crit'] } },
  { id: 'origin_thief', name: 'Ring of the Unseen', origin: 'Thief', slot: 'ring',
    boon: { id: 'originThief', name: 'Unseen Debt', text: '+10% damage from behind',
      minor: { behindDmg: 0.10 }, major: { behindDmg: 0.10 }, tags: ['backstab'] } },
  { id: 'origin_warrior', name: 'Ring of the Vow', origin: 'Warrior', slot: 'ring',
    boon: { id: 'originWarrior', name: 'Vow of Iron', text: '+1 stagger on weapon skills',
      minor: { stagger: 1 }, major: { stagger: 1 }, tags: ['weapon', 'stagger'] } },
];

// ===== trinket uniques (§19.5): 6 total, 2 per slot. Fixed implicit and rule. =====
const TRINKET_UNIQUES = [
  { id: 'pipslantern', name: "Pip's Lantern", slot: 'amulet', tags: ['ultimate'],
    implicit: { stat: 'chargeSpeed', v: 0.05, text: '+5% charge rate' },
    rule: { ult: 'double', powerMul: 0.5 }, text: 'Your ultimate casts twice, each at half power.' },
  { id: 'drownedcompass', name: 'Drowned Compass', slot: 'amulet', tags: ['ultimate'],
    implicit: { stat: 'fishLuck', v: 0.03, text: '+3% fishing luck' },
    rule: { ultRevealsChests: true }, text: 'R reveals hidden chests in the room.' },
  { id: 'ashensignet', name: 'Ashen Signet', slot: 'ring', tags: ['fire', 'burn'],
    implicit: { stat: 'fireDmg', v: 0.03, text: '+3% fire damage' },
    rule: { burnSpreads: 1 }, text: 'Burn ticks spread Burn to one nearby foe.' },
  { id: 'kindredband', name: 'Kindred Band', slot: 'ring', tags: ['reaction'],
    implicit: { stat: 'power', v: 0.02, text: '+2% power' },
    rule: { resonanceMul: 2 }, text: 'Ring resonance bonus doubles when both rings match.' },
  { id: 'cindersash', name: 'Cinder Sash', slot: 'belt', tags: ['potion', 'fire'],
    implicit: { stat: 'potionCharge', v: 1, text: '+1 potion charge' },
    rule: { potionEmber: true }, text: 'Potions leave an ember that burns nearby foes.' },
  { id: 'quietgirdle', name: 'Girdle of Quiet Dusk', slot: 'belt', tags: ['potion', 'boss'],
    implicit: { stat: 'potionCharge', v: 1, text: '+1 potion charge' },
    rule: { potionsRefillOnPhase: true }, text: 'Potions refill on every boss phase change.' },
];

// ===== world uniques (§19.5): found in secret vaults or Sunken Chests. Built on §18 tags, work with every family. =====
const WORLD_UNIQUES = [
  { id: 'cometband', name: 'Comet Band', slot: 'ring', tags: ['projectile', 'mark'],
    implicit: { stat: 'statusChance', v: 0.04, text: '+4% status chance' },
    rule: { projCurveToMarked: true }, text: 'Projectiles curve toward Marked enemies.' },
  { id: 'tidewovenclasp', name: 'Tidewoven Clasp', slot: 'belt', tags: ['zone'],
    implicit: { stat: 'mpRegen', v: 0.5, text: '+0.5 MP/s' },
    rule: { zoneFollows: true }, text: 'Zone skills follow you as you move.' },
  { id: 'afterimagependant', name: 'Afterimage Pendant', slot: 'amulet', tags: ['dash'],
    implicit: { stat: 'speed', v: 0.10, text: '+3% move speed' },
    rule: { dashImageRecasts: 1 }, text: 'Dashes leave an image that recasts your last skill once.' },
  { id: 'summonersthread', name: "Summoner's Thread", slot: 'ring', tags: ['summon'],
    implicit: { stat: 'power', v: 0.02, text: '+2% power' },
    rule: { summonsFireBasic: true }, text: 'Summons fire your basic attack.' },
  { id: 'hollowbell', name: 'Hollow Bell', slot: 'belt', tags: ['nova'],
    implicit: { stat: 'cdr', v: 0.02, text: '2% shorter cooldowns' },
    rule: { novaFiresTwice: true }, text: 'Novas fire a second time at your aim point.' },
];

// ===== caps (§19.6): applied in recalcStats =====
const CAPS = {
  cdr: 0.4,            // cooldown reduction (§20.5: 40 %, matches recalcStats)
  crit: 0.6,           // crit chance
  haste: 0.5,          // attack speed
  gearPower: 1.5,      // gear power
  reactionBonus: 0.5,  // reaction bonus
  markCap: 5,          // Mark cap
  potions: 5,          // potion charges
  trinketResLine: 0.10,   // max +10% per trinket resist line
  trinketResAll: 0.15,    // max +15% resAll across all four trinkets
  heroResMin: -0.5,       // hero resist clamp, low
  heroResMax: 0.6,        // hero resist clamp, high
};

// ===== Dream Oil (docs/design/elements-statuses.md "Wiring"): a per-element weapon coat made at the Elder Stone for Dust. =====
// dur: seconds of coat; build: the oil element's status build on a basic hit (x the ladder's 25); price: Dust (a Stone object's
// `price` overrides it: the verbs arena's Stone is free). Applied by items.js buyOil -> elements-world.js EW.coat.
const DREAM_OIL = {
  dur: 60, build: 0.3, price: 15,
  rows: {
    fire: { name: 'Ember Oil', col: '#ff9a4a', text: 'Basic hits also carry fire: Burning, lights torches and dry grass' },
    frost: { name: 'Rime Oil', col: '#9fe8ff', text: 'Basic hits also carry frost: Chilled, freezes water' },
    lightning: { name: 'Storm Oil', col: '#fff07a', text: 'Basic hits also carry lightning: Jolted, wakes conduits' },
    nature: { name: 'Seed Oil', col: '#8fe0a0', text: 'Basic hits also carry nature: Poisoned, grows seeds' },
    arcane: { name: 'Rune Oil', col: '#d6b0ff', text: 'Basic hits also carry arcane: Marked, lights glyphs' },
    holy: { name: 'Dawn Oil', col: '#fff2b0', text: 'Basic hits also carry holy: Smitten, breaks seals' },
    wind: { name: 'Breath Oil', col: '#c8f0e8', text: 'Basic hits also carry wind: Buffeted, turns windmills' },
  },
};
