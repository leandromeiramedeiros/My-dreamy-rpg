'use strict';
// Narrative data: story dialogue, bestiary lore and side quests. Source of truth: docs/design/story.md.
// Classic script (no modules). Every line is <= 12 words; boss lines keyed boss_<name>_<beat>.

// ---------------------------------------------------------------- DIALOGUE
const DIALOGUE = {
  // Whispering Vale
  vale_banner: { banner: 'Whispering Vale', sub: 'a dream drifting above the clouds' },
  vale_wake: { speaker: 'Pip', lines: ['Up. You were sleeping like you meant it.'] },
  vale_elder: { speaker: 'Elder Stone', lines: ['The Stone knows her. The Stone does not say.'] },
  vale_tablet: { speaker: 'Tablet', lines: ['Four Wardens. One would not wake.'] },
  vale_chest: { speaker: 'Pip', lines: ['That glow? Keep it. Gear remembers you.'] },
  vale_rift: { speaker: 'Pip', lines: ["The Pinewood screams. Let's be rude back."] },

  // Misty Pinewood
  pinewood_banner: { banner: 'Misty Pinewood', sub: 'the trees are running' },
  pinewood_fox: { speaker: 'Pip', lines: ['Everything with legs is leaving.'] },
  pinewood_tablet: { speaker: 'Tablet', lines: ['Bramblehorn kept the roots. He loved the roots too much.'] },
  pinewood_hollow: { speaker: 'Pip', lines: ["Under the wood, it's quieter. I hate it."] },
  boss_bramblehorn_intro: { speaker: 'Old Bramblehorn', lines: ['Little dream. You smell like him.'] },
  boss_bramblehorn_death: { speaker: 'Old Bramblehorn', lines: ['Tell him… the roots held. Tell him I stayed.'], drops: 'rootcrown' },

  // Gloomspire Ruins
  ruins_banner: { banner: 'Gloomspire Ruins', sub: 'where the Wardens swore' },
  ruins_tablet: { speaker: 'Tablet', lines: ['He sat at the head. He laughed the most.'] },
  ruins_pillars: { speaker: 'Pip', lines: ["Don't read the names on the pillars."] },
  boss_warden_intro: { speaker: 'The Gloam Warden', lines: ['I guarded his sleep. I do not guard it well.'] },
  boss_warden_death: { speaker: 'The Gloam Warden', lines: ['He dreamed a girl. Did you meet her?'], drops: 'lanternplate' },

  // Sunken Grotto
  grotto_banner: { banner: 'Sunken Grotto', sub: 'the tide forgot to leave' },
  grotto_lanterns: { speaker: 'Pip', lines: ["Still lit. Fishermen's. Someone keeps them."] },
  grotto_tablet: { speaker: 'Tablet', lines: ['Mirelle tried to wake him with the sea. The sea went under.'] },
  boss_mirelle_intro: { speaker: 'Lady Mirelle', lines: ['You again. You always come this far.'] },
  boss_mirelle_death: { speaker: 'Lady Mirelle', lines: ['Third time… this time, reach him.'], drops: 'tideedge' },
  grotto_after: { speaker: 'Pip', lines: ["She said 'again'. Don't ask me. Later."] },

  // Emberfall Caldera
  caldera_banner: { banner: 'Emberfall Caldera', sub: 'his anger, cooling' },
  caldera_tablet: { speaker: 'Tablet', lines: ['Kharzul forged the Shards. He forged the chains after.'] },
  boss_kharzul_intro: { speaker: 'Kharzul the Cinder Colossus', lines: ["Walk the fire, dream-girl. See if you're real."] },
  boss_kharzul_death: { speaker: 'Kharzul the Cinder Colossus', lines: ['You burn. Real things burn. Go wake your father.'], drops: 'cinderstride' },
  caldera_after: { speaker: 'Pip', lines: ['…Yes. I was going to tell you at the top.'] },

  // Sleepless Spire
  spire_banner: { banner: 'Sleepless Spire', sub: 'he is almost awake' },
  spire_tablet_1: { speaker: 'Tablet', lines: ['He named her Aerin.'] },
  spire_tablet_2: { speaker: 'Tablet', lines: ['He stopped eating.'] },
  spire_tablet_3: { speaker: 'Tablet', lines: ['He said: one more night.'] },
  spire_gauntlet: { speaker: 'Pip', lines: ['Whatever happens up there, I chose this.'] },
  boss_morrow_intro: { speaker: 'Morrow', lines: ['You came. You always come. Sit with me a while.'] },
  boss_morrow_phase2: { speaker: 'Morrow', lines: ["I can't lose you twice."] },
  boss_morrow_phase3_pip: { speaker: 'Pip', lines: ['Take my light. Burn him awake.'] },
  boss_morrow_death: { speaker: 'Morrow', lines: ["…morning. It's morning, little one."] },
  spire_epilogue: { banner: 'The Dream was never for him.', sub: '' }
};

// ---------------------------------------------------------------- BESTIARY_LORE
// lore: shown on the Bestiary entry. lore2: unlocked on kill (bosses and mini-bosses only).
// Enemy ids: slime, wisp, hound, ogre, troll, dummy (world.js / game.js); boss = The Gloam Warden (game.js ENEMY.boss).
const BESTIARY_LORE = {
  // Regular enemies
  slime: { lore: 'Gloom slime. Squishy. Please do not ask where it came from.' },
  wisp: { lore: 'Wisps. Pretty, rude, and always just out of reach.' },
  hound: { lore: 'Shade hounds. Friendly, if you are a sandwich.' },
  ogre: { lore: 'Ogre. Big, slow to think, quick to swing.' },
  troll: { lore: "Mountain troll. Big, grumpy, mostly sleeping. Let's keep it that way." },
  dummy: { lore: 'Training dummy. It never hits back. Lucky thing.' },

  // Guardians and bosses (lore2 unlocked on kill)
  boss: { lore: 'The Gloam Warden. Old, loyal, and very tired.', lore2: 'It guarded a dream, and the dream had a name.' },
  bramblehorn: { lore: 'Old Bramblehorn. Loved the roots a little too much.', lore2: "He stayed behind. That's the part I can't forget." },
  mirelle: { lore: 'Lady Mirelle. Tides hush at her command.', lore2: 'She tried three times. Pip is still counting.' },
  kharzul: { lore: 'Kharzul. Smith of Shards, and chains after.', lore2: 'Every Shard he forged lights something in you.' },
  morrow: { lore: 'The Unwaking King. Gentle. Tired. Very dreamy.', lore2: 'He dreamed her back. Every Shard makes her more real.' },

  // Planned mini-bosses and optional bosses
  mossjaw: { lore: 'Mossjaw. Burns well. Don\'t ask how I know.', lore2: 'Even beasts dream his dream now. Poor things.' },
  oathless: { lore: 'The Oathless. Once sworn, now just stuck.', lore2: "Sworn to keep his sleep. Forgot why, somehow." },
  brinemother: { lore: 'Brinemother. Sea-mother, rather cross about it.', lore2: 'She went under trying to wake him. For good.' },
  slagheart: { lore: 'Slagheart. Hot-tempered, and cooling fast.', lore2: "Slagheart's fire is old anger. Old anger cools." },
  vigils: { lore: 'Twin Vigils. One voice, two shadows, no sleep.', lore2: 'Two knights, one heart, both guarding a dream.' },
  sorrel_echo: { lore: "Sorrel's Echo. Copies you. Try being unpredictable.", lore2: 'Sorrel woke him once. Then was exiled for it.' },
  unwaking_child: { lore: 'A small shadow with stolen moves. Be kind.', lore2: "Aerin's shadow. Still missing its owner, I think." },

  // Other planned enemies
  shaman: { lore: 'Bramble Shaman. Chanting at the dark. Rude, but brave.' }
};

// ---------------------------------------------------------------- QUESTS
// reward.options are gem | socket_rune (choice). extra is an optional additional reward.
const QUESTS = [
  {
    id: 'shard_root', zone: 'pinewood', giver: 'Pip', title: 'The Pinewood Shard', main: true,
    text: 'The Shard lies under the wood. Follow the roots.',
    steps: ['Defeat the elite and take its key', 'Enter Root Hollow', 'Defeat Mossjaw', 'Defeat Old Bramblehorn'],
    reward: { kind: 'shard', id: 'root' }
  },
  {
    id: 'vale_lantern', zone: 'vale', giver: 'Elder Stone', title: "The Stone's Lost Lantern",
    text: 'The Stone misplaced a lantern. It will not say where.',
    steps: ['Find the Stone\'s lost lantern', 'Return the lantern to the Elder Stone'],
    reward: { kind: 'choice', options: ['gem', 'socket_rune'] }, extra: { kind: 'rune' }
  },
  {
    id: 'pinewood_foxkit', zone: 'pinewood', giver: 'Fox kit', title: "A Fox Kit's Mother",
    text: 'A kit lost its mother to the ogres. Find her.',
    steps: ['Find the fox kit', 'Defeat the ogres holding its mother', 'Bring the mother back to her kit'],
    reward: { kind: 'choice', options: ['gem', 'socket_rune'] }
  },
  {
    id: 'ruins_pillars', zone: 'ruins', giver: 'Pip', title: 'The Names on the Pillars',
    text: 'Pip says not to read them. Read them anyway.',
    steps: ['Read the names on the pillars', 'Tell Pip what you found'],
    reward: { kind: 'choice', options: ['gem', 'socket_rune'] }
  },
  {
    id: 'grotto_lanterns', zone: 'grotto', giver: 'Fisherman', title: "Fishermen's Lanterns",
    text: 'The drowned lanterns still burn. Relight them for the fishermen.',
    steps: ['Relight the first drowned lantern', 'Relight the second drowned lantern', 'Relight the third drowned lantern'],
    reward: { kind: 'choice', options: ['gem', 'socket_rune'] }
  },
  {
    id: 'caldera_golem', zone: 'caldera', giver: "Kharzul's apprentice", title: "Kharzul's Apprentice Golem",
    text: 'A small golem lost its way in the forge. Guide it home.',
    steps: ['Find the apprentice golem', 'Escort the golem back to the forge'],
    reward: { kind: 'choice', options: ['gem', 'socket_rune'] }
  },
  {
    id: 'spire_lanterns', zone: 'spire', giver: 'Pip', title: "Pip's Three Lanterns",
    text: 'Pip left three lanterns on the Spire. Light them.',
    steps: ['Light the first lantern', 'Light the second lantern', 'Light the third lantern'],
    reward: { kind: 'choice', options: ['gem', 'socket_rune'] }
  }
];
