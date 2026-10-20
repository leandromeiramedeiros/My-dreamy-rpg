'use strict';
// ---------------------------------------------------------------------------
// Equipment v2 DATA (DESIGN §19, STORY.md voice). Plain tables, no logic.
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
};

// ===== flavour (§19.3): one line per base and per unique, STORY.md voice, <= 12 words =====
const FLAVOR = {
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
  // Trinket uniques
  pipslantern: 'A small lantern that still remembers its first light.',
  drownedcompass: 'It points toward the things the water was keeping.',
  ashensignet: 'Warm ash on the finger, a fire that never quite went out.',
  kindredband: 'Two bands that sing louder when they are near each other.',
  cindersash: 'Ember-red cloth, warm long after the fire has gone.',
  quietgirdle: 'It loosens at dusk, the way a tired traveller does.',
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
