# GLOSSARY: canonical game terms

Purpose: one name per thing, for every conversation, doc, commit and line of UI text.
**Rule: use the Term column exactly. Names in "Not" are wrong or retired; correct them to the Term.**

Precedence: client rulings and `docs/meetings/2026-10-22-studio-experts.md` > code display names and ids > other docs.
Status: **live** (in the build now) · **M4a** (vertical slice: Vale + Pinewood) · **M4b** (full rollout) · **later** (no milestone assigned) · **retired** (final table only).
A dash in "Code id" means no code id yet. Retired terms live only in the last section.

## 1. Controls and hotkeys
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Bag key | Tab: opens the Bag | `inventory` | Inventory key | live |
| Boots key | V on keyboard: the dodge with i-frames; B on pad | `dodge` | Shift dodge | M4a |
| Chest key | F on keyboard; X on pad: fires the chest active | `skillF` | R as chest | M4a |
| Chord | Modifier plus key bound as one input, e.g. Shift+Q | — | — | M4a |
| Hand action | Mouse 1 (hold), RT: the HAND item's primary action | `attack` | — | M4a |
| Hand spell | Q, RB: the HAND item's spell | `skillQ` | — | M4a |
| Hand ultimate | Shift+Q, R3: the HAND item's ultimate | — | — | M4a |
| Head key | R on keyboard; Y on pad: fires the head active | `skillR` | C as head (helmet key) | M4a |
| Interact | Space, A: talk, open, read, use | `interact` | — | live |
| Map key | M: opens the map | `map` | — | live |
| Offhand action | Mouse 2 (hold), LT: the OFFHAND item's action | — | — | M4a |
| Offhand spell | E, LB: the OFFHAND item's spell | `skillE` | — | M4a |
| Offhand ultimate | Shift+E, L3: the OFFHAND item's ultimate | — | — | M4a |
| Pause key | Esc, Start: pause menu | `pause` | — | live |
| Pockets | Z / X / C, D-pad left/up/right: the three consumable keys | `s1` `s2` `s3` | potion key; skills 1 2 3 | M4a |
| Rebind screen | Settings screen that remaps keys; shows chords | `menus.js` | — | M4a |
| Touch wheel | Phone controls v3: attack button, second button, charge rings, arcs | — | — | M4a |

## 2. Combat and mechanics
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Aim shape | The telegraph geometry of a cast (cone, line, circle, ring, beam) | `AIM_STYLE` | — | live |
| Attack token | Limit on how many enemies attack the hero at once | — | — | live |
| Backstab | Hit from the target's rear 120° arc: bonus crit chance | — | — | live |
| Break | An enemy's stagger bar filled: it is stunned and takes extra damage | — | — | live |
| Channel | Hold the Staff's M1 for a beam; tap for a bolt | — | — | M4a |
| Charge (ultimate) | The one shared bar both ultimates spend | — | — | M4a |
| Combo | The primary hit chain of the HAND item (3-hit Blades, 4-hit Shadows, 2-hit Greatarms) | — | — | live |
| Cooldown | Per-skill recharge timer in seconds | `cd` | — | live |
| Death fling | Dying enemy is thrown from the killing hit | — | — | M4a |
| Dodge | Boots-key roll with i-frames | `dodge` | — | live |
| Echo | The mechanic: replays the HAND action and the Q spell only; the Twice-Told grants it | `echo` | — | live |
| Focus | Shots' hold-M1: aim, then the next shot crits | — | — | M4a |
| Heavy Strike | Greatarms two-hander hold-M1: 1 s charge, x1.8, poise | — | Heavy (that is the armour class); charged swing | M4a |
| Hitlag | Brief freeze of attacker and target on a hit; scales with `weight` | `hitstop` | Hitstop (setting label is wrong, UI fix later) | live |
| Hush | Spell from The Stopped Hour: toggle, world time ×0.25, hero full speed, drains MP | `hush` | time slow; bullet time; slow-mo (that is the boss-death effect) | M4a |
| I-frames | Invulnerable frames during Boots-key dodge | — | — | live |
| Level | Hero or enemy level number | `level` | — | live |
| Mastery | Per-variant skill rank 1 to 5 earned by use | — | — | live |
| Mastery rank 3 | Second form of the spell | — | — | M4b |
| Mastery rank 5 | Hybrid twist of the spell | — | — | M4b |
| Melee magnet | Short pull toward the target on a melee swing | — | — | live |
| MP | Mana: the hand action builds 8 per hit; spells spend it | `mp` | — | live |
| Off-action | Offhand item's M2 action: costs stamina, 0 MP, no charge | — | — | M4a |
| Off-passive | Passive from the OFFHAND item's class | — | — | M4a |
| Parry | Blades' off-action: 0.25 s window, then riposte stagger | — | Riposte (the old E skill) | M4a |
| Passive (class) | Bonus from the HAND item's class only | `passive` | — | live |
| Perfect dodge | Dodge timed to a hit: bonus effect | — | — | live |
| Poise | Hyper-armour while swinging: hits taken do not interrupt | — | — | live |
| Shrine warp | Fast travel between lit Checkpoint shrines | — | Rift; Warp door | live |
| Snapshot | Shots' and Chakram's off-action: a quick shot | — | — | M4a |
| Stagger | Meter that fills on hits; full means Break | `stagger` | — | live |
| Stamina | Resource spent by dodge and off-actions | `stamina` | — | live |
| Step | Shadows' off-action: 0.6-tile sidestep with a backstab mark | — | — | M4a |
| Tumble | Wind-pushed enemy tumbling along the ground | — | — | M4a |
| Ultimate | The strongest cast of an item line; spends Charge | — | — | M4a |
| Wake at shrine | Respawn at the last Checkpoint shrine after death | — | — | live |
| Ward | Foci's off-action: hold a mana shield, pops to a nova on release | — | — | M4a |
| Weight | Hitlag field: basic 1, heavy 1.5, ultimate 2 | `weight` | — | live |
| World scale | Time multiplier for everything but the hero: 1 normally, 0.25 in Hush | `G.timeScale` | global time scale; enemy time scale | M4a |

## 3. Elements, statuses and reactions
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Ablaze | Fire status tier 2 | — | — | M4a |
| Arcane | Element: marks and unravels | `arcane` | — | live |
| Breath | Story name of the wind element | — | — | live |
| Buffeted | Wind status tier 1: pushed along the gust | — | — | M4a |
| Burning | Fire status tier 1: damage over time | `burn` | Burn; Burning elite (that is the elite modifier) | live |
| Chilled | Frost status tier 1: slowed | `chill` | Chill | live |
| Conduct | Reaction: lightning on Chilled or Wet; Shock jumps to nearby Chilled or Wet bodies | — | — | M4a |
| Dazzled | Holy status tier 2 | — | — | M4a |
| Detonate | Reaction: stagger 3 or more on a Burning body consumes Burn for damage | — | — | M4a |
| Dread | Gloom status tier 1 | — | — | M4a |
| Drift | Reaction: wind on a body with a tier-1 status carries it to bodies in the gust | — | — | M4a |
| Dry | Silent interaction: fire or 2 s of wind ends Wet | — | — | M4a |
| Element | One of: slash, pierce, fire, frost, nature, lightning, arcane, holy, wind | `element` | — | live |
| Flash-freeze | Silent interaction: frost on Wet freezes at once | — | — | M4a |
| Frost | Element: slows and freezes | `frost` | — | live |
| Frozen | Frost status tier 2: no action; a physical hit Shatters it | — | Frozen elite (that is the elite modifier, now Rime) | M4a |
| Gloom | Enemy-only element and the world's corruption | `gloom` | — | live |
| Gloomed | Gloom status tier 2 | — | Gloomed elite (that is the elite modifier) | M4a |
| Holy | Element: smites and purifies | `holy` | — | live |
| Jolted | Lightning status tier 1 | — | — | M4a |
| Lifted | Wind status tier 2: knocked up; bosses never | — | — | M4a |
| Lightning | Element: chains and stuns | `lightning` | — | live |
| Marked | Arcane status tier 1 | — | — | M4a |
| Marks | Shadows' stacking mark counter 0 to 3 on an enemy | `marks` | — | live |
| Nature | Element: poison and roots | `nature` | poison; earth (merged into nature) | live |
| Numb | Hero-side form of Frozen: 0.5 s root, dodge breaks it | — | — | M4a |
| Overload | Reaction: arcane on Shocked; extra damage and cooldown cut | — | — | M4a |
| Pierce | Physical element of thrusts and arrows | `pierce` | — | live |
| Pierced | Pierce status tier 1 | — | — | M4a |
| Pinned | Pierce status tier 2: held in place | — | — | M4a |
| Poisoned | Nature status tier 1 | `poison` | Poison (merged into nature) | live |
| Purify | Reaction: holy on Burning or Poisoned; heals, strong vs gloom | — | — | M4a |
| Quench | Silent interaction: frost ends Burning and applies Chilled | — | — | M4a |
| Reaction | Named combo of two statuses or an element on a status (8 total) | — | — | M4a |
| Rent | Slash status tier 2 | — | — | M4a |
| Rooted | Nature status tier 2: cannot move | `root` | — | M4a |
| Rupture | Reaction: pierce on a full stagger bar; guaranteed crit | — | — | M4a |
| Shatter | Reaction: physical hit on Frozen; AoE of damage type shatter | — | Break (that is stagger) | M4a |
| Shocked | Lightning status tier 2 | — | — | M4a |
| Slash | Physical element of blades | `slash` | — | live |
| Smitten | Holy status tier 1 | — | — | M4a |
| Status | A timed debuff or buff on an entity, two tiers per element | `status.js` | — | M4a |
| Thaw | Silent interaction: fire on Frozen ends it | — | — | M4a |
| Unravelled | Arcane status tier 2 | — | — | M4a |
| Wet | Surface flag from water: enables Conduct and Flash-freeze | — | — | M4a |
| Wildfire | Reaction: fire on Poisoned; Burning spreads 2 tiles | — | — | M4a |
| Wind | Element: displacement and spread | `wind` | — | M4a |

## 4. Loadout and slots
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Belt | Trinket slot: boon plus three pockets; shares one slot with the Satchel | `belt` | — | live |
| Boon | Special effect on a Belt, ring or amulet | `boons` | — | live |
| Boots slot | Armour slot: boots piece, hosts the dodge active | `boots` | — | live |
| Chest slot | Armour slot: chest piece, hosts the chest active | `chest` | — | live |
| Companion | Worn offhand item: Grimoire, Quiver or Warhorn | — | — | M4a |
| Empty offhand | Allowed: 1H hand then M2 is the class off-action at x1.0 | — | — | M4a |
| HAND slot | Weapon in the main hand: M1, Q, Shift+Q | `weapon` | weapon 1 (retired) | M4a |
| Head slot | Armour slot: head piece, hosts the head active | `head` | — | live |
| Lead / Support | Loadout v3 model: HAND item leads, OFFHAND item supports | — | — | M4a |
| Loadout | The full equipped set: HAND, OFFHAND, armour, trinkets | — | — | live |
| OFFHAND slot | Second-hand item: M2, E, Shift+E; shield, 1H weapon or companion | — | weapon 2 (retired) | M4a |
| Pocket | One of three consumable slots on the Belt or Satchel | `s1` `s2` `s3` | potion slot | M4a |
| Satchel | Trinket slot: three pockets that also hold tools, +1 bag row, no boon | — | — | M4a |
| Slot matrix | The rule of which item class fits HAND or OFFHAND | — | — | M4a |
| Trinket slots | ring1, ring2, amulet, belt | `TRINKET_SLOTS` | — | live |
| Two-hander | 2H item that takes only a worn companion in OFFHAND | — | — | M4a |

## 5. Weapon classes and variants
Each variant has three skills: **action** (primary, or off-action in OFFHAND), **spell** (Q or E), **ultimate** (Shift+Q or Shift+E). Table meaning lists spell / ultimate.

### 5.1 Classes
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Blades | 1H class: Sword, Rapier, Mace; 3-hit combo | `blades` | — | live |
| Foci | Casting class: Wand, Orb (1H), Staff (2H) | `foci` | — | live |
| Greatarms | 2H class: Axe, Hammer, Halberd | `greatarms` | Great arms (CLASS_WORD label; see report) | live |
| Shadows | 1H class: Daggers, Claws, Fans; backstab and Marks | `shadows` | — | live |
| Shots | Ranged class: Bow, Crossbow (2H), Chakram (1H) | `shots` | — | live |
| Weapon variant | One weapon type within a class (15 total) | `WEAPONS` | — | live |

### 5.2 Blades
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Mace | Spell Crush / ultimate Consecrate; every hit staggers 1 | `mace` | — | M4b |
| Rapier | Spell Flèche / ultimate Perforate; duelist thrusts | `rapier` | — | M4b |
| Sword | Spell Sunslash / ultimate Radiant Judgement | `sword` | Dawnblade (its T2 name) | live |

### 5.3 Shadows
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Claws | Spell Rend / ultimate Savage; Frenzy attack speed | `claws` | — | M4b |
| Daggers | Pierce, Marks; spell and ultimate per DESIGN 17.2 options, not yet chosen | `daggers` | Nightfang (its T2 name) | M4b |
| Fans | Spell Veil Dance / ultimate Thousand Petals; returning fans | `fans` | — | M4b |

### 5.4 Greatarms
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Axe | Spell Cleave / ultimate Colossus Strike | `axe` | Dawnbreaker (its T2 name) | M4b |
| Halberd | Spell Sweep / ultimate Skewer; 1.5x range | `halberd` | — | M4b |
| Hammer | Spell Earthbreaker / ultimate Aftershock; stagger 3 | `hammer` | — | M4b |

### 5.5 Shots
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Bow | Spell Multishot / ultimate Rain of Arrows | `bow` | Moonbow (its T2 name) | live |
| Chakram | Spell Ricochet / ultimate Guillotine; returning disc | `chakram` | — | M4b |
| Crossbow | Spell Piercing Bolt / ultimate Ballista; 4-bolt clip | `crossbow` | — | M4b |

### 5.6 Foci
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Orb | 1H focus. Spell Chain Lightning / ultimate Tempest | `orb` | — | M4b |
| Staff | 2H focus. Spell Firebolt / ultimate Meteor; hold-M1 Channel | `staff` | Starfall (its T2 name) | live |
| Wand | New 1H focus: bolt action, spell Frost Shards, ultimate Rune of Binding | — | Spellbook (retired hand weapon); Willow Wand (the Staff T1 name) | M4b |

### 5.7 Weapon tier names (T1 to T5, Mythic)
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Axe tiers | Splitting Axe, Dawnbreaker, Sunforged Axe, Aurora Cleaver, Dawn Colossus; Mythic Forgehand | `FAMILY_TIERS` | — | M4b |
| Bow tiers | Hunter's Bow, Moonbow, Silverwing, Eclipse Longbow, Moon Eternal; Mythic Moonmaw's Bow | `FAMILY_TIERS` | — | live |
| Chakram tiers | Rim, Moon Chakram, Silverring, Eclipse Ring, Ring Eternal; Mythic Aerin's Halo | — | — | M4b |
| Claws tiers | Bone Claws, Nightclaws, Silvertalon, Eclipse Claws, Claws Eternal; Mythic Bramblehorn's Roots | — | — | M4b |
| Crossbow tiers | Hand Crossbow, Dawn Arbalest, Sunbolt, Aurora Ballista, Bolt Eternal; Mythic Four Wardens | — | — | M4b |
| Daggers tiers | Shiv, Nightfang, Twin Eclipse, Widow's Kiss, TBD (naming pass, M4b); Mythic Reliquary | — | Night Eternal (collides with Staff T5) | M4b |
| Fans tiers | Paper Fans, Moonfans, Silverplume, Eclipse Fans, Fans Eternal; Mythic Mirelle's Tide | — | — | M4b |
| Halberd tiers | Pike, Dawnglaive, Sun Halberd, Aurora Partisan, Reach Eternal; Mythic Vigil's Glaive | — | — | M4b |
| Hammer tiers | Sledge, Sunhammer, Mountain Maul, Aurora Anvil, Hammer Eternal; Mythic Chainbreaker | — | — | M4b |
| Mace tiers | Iron Cudgel, Dawnmace, Sunwarden Mace, Aurora Maul, Vow Eternal; Mythic Lamplighter | — | — | M4b |
| Orb tiers | Glass Bauble, Starfall Orb, Comet Orb, Nebula Sphere, Orb Eternal; Mythic Last Light | — | — | M4b |
| Rapier tiers | Tin Needle, Moonpoint, Silver Estoc, Starpoint, Needle Eternal; Mythic Sorrel's Needle | — | — | M4b |
| Staff tiers | Willow Wand, Starfall Staff, Comet Rod, Nebula Sceptre, Night Eternal; Mythic Emberfall | `FAMILY_TIERS` | — | live |
| Sword tiers | Rusty Blade, Dawnblade, Sunforged Blade, Aurora Edge, Dawn Eternal; Mythic Morrowbane | `FAMILY_TIERS` | — | live |
| Tier (item) | Item power step: T1, T2, T3, T4, T5, then Mythic | `tier` | — | live |

## 6. Shields and companions
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Buckler | Shield. Action Parry+ / spell Bash / ultimate Aegis | — | — | M4a |
| Grimoire | Mage companion. Action Turn / spell Cast / ultimate Chapter | — | Spellbook (retired hand weapon) | M4a |
| Heater | Shield. Action Block / spell Shield Bash / ultimate Bulwark Charge | — | — | M4b |
| Quiver | Ranger companion. Action Nock / spell Loose / ultimate Quiver Storm | — | — | M4b |
| Shield | Held OFFHAND item with three skills; offhand only | — | — | M4a |
| Tower | Shield. Action Wall / spell Shove / ultimate Fortress | — | — | M4b |
| Warhorn | Warrior companion. Action Bellow / spell Call / ultimate Last Stand | — | — | M4b |

## 7. Pages, arrows, calls and Grips
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Archmage | Grip: Staff + Grimoire; Chapter costs 80 charge | — | — | M4b |
| Arrow | Item socketed into the Quiver (Venom, Fire, Frost, Bola, Grapple, Split, Explosive) | — | — | M4b |
| Call | Item socketed into the Warhorn (War Cry, Rally, Taunt, Quake-call, Stand) | — | — | M4b |
| Cornered | Grip: Claws + Buckler | — | — | M4b |
| Dancer | Grip: Rapier + Fans; Step shares Parry's cooldown | — | — | M4b |
| Faultline | Grip: Hammer + Warhorn | — | — | M4b |
| Grip | Named pairing of two items; a Codex discovery with a glint and aura | `src:'grip'` | — | M4b |
| Page | Item socketed into the Grimoire; a re-homed cast, T1 to T5 plus rarity | — | Dream Tome; rune alternate | M4a |
| Page slot | Grimoire socket; capacity by tier 2, 3, 4, 5, 6, 6 | — | — | M4a |
| Sanctuary | Grip: Mace + Heater; one zone, no stacking | — | — | M4b |
| Spellblade | Grip: Sword + Grimoire; pages retype Sunslash | — | — | M4b |
| TBD (naming pass, M4b) | Grip: Crossbow + Quiver; clip 6 | — | Arbalest (colliding name) | M4b |
| TBD (naming pass, M4b) | Grip: Bow + Quiver; Loose costs no Focus | — | Hunter (colliding name) | M4b |
| TBD (naming pass, M4b) | Grip: Chakram + Orb | — | Orbit (colliding name) | M4b |
| TBD (naming pass, M4b) | Grip: Halberd + Quiver | — | Pike Square (colliding name) | M4b |
| Twin Fangs | Grip: Daggers + Daggers; Marks cap +1 | — | — | M4b |
| Twin Stars | Grip: Wand + Orb; Overload refunds 2 s | — | — | M4b |
| Vanguard | Grip: Sword + Buckler; a parry primes Sunslash +40 % | — | — | M4a |
| Warband | Grip: Axe + Warhorn; calls also Detonate | — | — | M4b |

## 8. Armour
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Armour class | Heavy, Caster, Medium, Shadow: three suits each | `ARMOUR` | — | live |
| Caster | Armour class: Dreamweave, Frostweave, Stormweave | `caster` | — | live |
| Crusader | Heavy suit 2 | `crusader` | — | M4b |
| Dreamweave | Caster suit 1 | `dreamweave` | Dreamrobe (legacy id) | live |
| Duelist | Medium suit 3 | `duelist` | — | M4b |
| Frostweave | Caster suit 2 | `frostweave` | — | M4b |
| Heavy | Armour class: Warden, Crusader, Juggernaut | `heavy` | — | live |
| Juggernaut | Heavy suit 3 | `juggernaut` | — | M4b |
| Medium | Armour class: Stalker, Thornwarden, Duelist | `medium` | — | live |
| Mirage | Shadow suit 3 | `mirage` | — | M4b |
| Nightshade | Shadow suit 2 | `nightshade` | — | M4b |
| Piece | One armour item: head, chest or boots | `pieces` | — | live |
| Shade | Shadow suit 1 | `shade` | Shadeleathers (legacy id) | M4b |
| Shadow (armour) | Armour class: Shade, Nightshade, Mirage | `shadow` | — | live |
| Stalker | Medium suit 1 | `stalker` | Stalkerjacket (legacy id) | live |
| Stormweave | Caster suit 3 | `stormweave` | — | M4b |
| Suit | Three-piece armour set; suit twist at 3 pieces | — | — | live |
| Suit twist | Bonus when three suit pieces are worn | — | — | M4b |
| Thornwarden | Medium suit 2 | `thornwarden` | — | M4b |
| Warden | Heavy armour suit 1 | `warden` | Knightplate (legacy id); Warden alone (ambiguous, write Warden suit) | live |
| Warden tiers | Iron Mail, Knight Plate, Sunforged Plate, Aurora Plate, Aegis of Dawn; Mythic Shardheart Plate | — | — | M4a |

Mythic armour (one per suit family): Shardheart Plate, Gloomspire Vestment, Forge Deep Cuirass, Nightlong Shroud, Brinemother's Veil, Gravewind, Pinewood Mist, Briarwatch Mantle, Oathless Jacket, Gloamveil, Mossjaw's Skin, Glasswarp Silk. Tier names for the other 11 suits are in DESIGN section 24.

## 9. Item structure
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Affix | Random stat on a rare or better item; prefix or suffix | `AFFIX_V2` | — | live |
| Common | Rarity 1, colour #d8d8d8 | `common` | — | live |
| Epic | Rarity 4, colour #c070ff | `epic` | — | live |
| Imbue | Give a weapon an element for Dust | `imbueItem` | — | live |
| Implicit | Fixed stat built into an item base | `IMPLICITS` | — | live |
| Item level | Level of an item drop | `ilvl` | — | live |
| Legendary | Rarity 5, colour #ffb030 | `legendary` | Unique (different thing) | live |
| Mythic | Rarity 6 and the tier above T5, colour #ff4f7a | `mythic` | — | live |
| Prefix | Affix before the item name | `AFFIX_V2` | — | live |
| Rare | Rarity 3, colour #5aa8ff | `rare` | — | live |
| Rarity | Item quality: Common, Uncommon, Rare, Epic, Legendary, Mythic | `RARITY` | — | live |
| Ring resonance | Bonus when both rings share an origin or element | — | — | live |
| Salvage | Break gear into Dream Dust; gems return to the bag | `salvageItem` | — | live |
| Suffix | Affix after the item name | `SUFFIX_NOUN` | — | live |
| Temper | Spend Dust to raise an item's power step | `TEMPER_COST` | — | live |
| Tempered | Item upgraded with Temper | `temperItem` | — | live |
| Trinket | Ring, amulet or belt item | `TRINKET_BASES` | — | live |
| Uncommon | Rarity 2, colour #6ee36e | `uncommon` | — | live |
| Unique | Fixed named item with a special rule | `UNIQUES` | Legendary (a rarity) | live |

## 10. Gems, runes, currencies and consumables
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Amethyst | Arcane gem | `amethyst` | — | live |
| Bag | The 30-slot pack | `BAG_SIZE` | Inventory | live |
| Chipped | Gem grade 1 | `GEM_GRADES` | — | live |
| Clear | Gem grade 2 | `GEM_GRADES` | — | live |
| Diamond | Neutral gem: defence and all resists | `diamond` | — | live |
| Dream Dust | Currency from salvaging; spent at the Elder Stone | `dust` | — | live |
| Dream Oil | Consumable that fuels world puzzles (oil) | — | — | M4b |
| Elder Stone | Shop and upgrade NPC-object in the Vale hub | — | — | live |
| Emerald | Nature gem | `emerald` | — | live |
| Gem | Socketable stone: Ruby, Sapphire, Emerald, Topaz, Amethyst, Diamond | `GEMS` | — | live |
| Gem grade | Chipped, Clear, Radiant | `GEM_GRADES` | — | live |
| Opal | Wind gem (client-approved) | — | — | M4b |
| Pocket item | Consumable placed in a Pocket (flasks, bombs, traps, oils) | — | — | M4a |
| Potion | Healing flask held in a Pocket; max 3 | `MAX_POTIONS` | — | live |
| Radiant | Gem grade 3 | `GEM_GRADES` | — | live |
| Ruby | Fire gem | `ruby` | — | live |
| Sapphire | Frost gem | `sapphire` | — | live |
| Socket | Gem slot on gear | `sockets` | — | live |
| Socket rune | Quest reward that adds a socket | `socket_rune` | — | live |
| Topaz | Lightning gem | `topaz` | — | live |

## 11. Uniques and Mythic items
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Cinderstride Boots | Unique boots | `UNIQUES` | — | live |
| Morrowbane | Mythic Sword; the Sword line's Mythic name | `UNIQUES` | — | live |
| Root-Crown | Unique helm | `UNIQUES` | — | live |
| Tide-Edge | Unique weapon | `UNIQUES` | — | live |
| The Stopped Hour | Legendary unique (20th) whose rule replaces its spell with Hush | `stillhour` | time rune; Hush (that is the spell) | M4a |
| Twice-Told | Legendary unique that grants Echo (see Echo) | `echo` | — | live |
| Warden's Lantern Plate | Unique chest | `UNIQUES` | Warden's Lantern | live |
| World unique | Named drop tied to a place or boss | `WORLD_UNIQUES` | — | live |

## 12. Characters and NPCs
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Aerin | The hero, the Dreamer | `player` | — | live |
| Gloam | The corruption and its source in the Dream | `gloom` | — | live |
| Knight | Origin; starter ring Ring of the Shield | `origin_knight` | — | live |
| Mystic | Origin; starter ring Ring of the Dream | `origin_mystic` | — | live |
| Origin | Start-class choice; grants a starter ring | — | class (that is a weapon or armour class) | live |
| Pip | Aerin's lantern spirit companion | — | — | live |
| Ranger | Origin; starter ring Ring of the Trail | `origin_ranger` | — | live |
| Sorrel | Story character; Sorrel's Echo is an optional boss | — | — | live |
| Thief | Origin; starter ring Ring of the Unseen | `origin_thief` | — | live |
| Wardens | The four Wardens of the story | — | Warden alone (ambiguous); Guardians | live |
| Warrior | Origin; starter ring Ring of the Vow | `origin_warrior` | — | live |

## 13. Enemies (commons)

Note: count reconciled in the M4a DESIGN rewrite (29 names listed against the stated 28 commons).

| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Amorphous | Archetype: resists pierce, one-direction sprite | — | — | live |
| Armoured | Archetype: resists slash and pierce | — | — | live |
| Ash Wraith | Caldera: teleport backstab | — | — | M4b |
| Beasts | Archetype | — | — | live |
| Bramble Shaman | Pinewood: poison zones and heals | `brambleshaman` | — | live |
| Burning elite | Elite modifier: burning aura | — | Burning (that is the status) | M4b |
| Cinder Imp | Caldera: bomber | — | — | M4b |
| Crystal Sentinel | Grotto | — | — | M4b |
| Deepsinger | Grotto: aura-buffer | — | — | M4b |
| Dread Herald | Spire: aura and summons | — | — | M4b |
| Dream Moth | Vale: swarm drifting to light | `dreammoth` | — | live |
| Elite | Stronger common with a modifier | — | — | live |
| Elite modifiers | Shielded, Storm elite, Burning elite, Rime, Gloomed elite, Twin, Vampiric, Summoner | — | affix | M4b |
| Ethereal | Archetype: weak to holy, resists physical | — | — | live |
| Forge Priest | Caldera | — | — | M4b |
| Frost Jelly | Grotto: splitting jelly | — | — | M4b |
| Frozen elite | Elite modifier, becomes Rime; not the Frozen status | — | Frozen (that is the status) | M4b |
| Gloom Knight | Ruins: shield-front | — | — | M4b |
| Gloom Slime | Pinewood: splits | `gloomslime` | — | live |
| Gloomed elite | Elite modifier: gloom-touched elite | — | Gloomed (that is the status) | M4b |
| Glowfin Shoal | Grotto: orbiting swarm | — | — | M4b |
| Gnarlroot Brute | Pinewood elite brute | `gnarlbrute` | — | live |
| Grave Chanter | Ruins: summons wisps | — | — | M4b |
| Lightning Eel | Grotto | — | — | M4b |
| Magma Hopper | Caldera | — | — | M4b |
| Mountain Troll | Pinewood | `mountaintroll` | — | live |
| Ogre | Pinewood: cone brute | `ogre` | — | live |
| Pillar Mimic | Ruins: ambush | — | — | M4b |
| Shade Hound | Pinewood: line lunge | `shadehound` | — | live |
| Shadeling Swarm | Ruins | — | — | M4b |
| Slag Golem | Caldera: poise brute | — | — | M4b |
| Star Archer | Spire: sniper | — | — | M4b |
| Storm elite | Elite modifier: lightning storm | — | Storm | M4b |
| Thornback Boar | Pinewood | `thornbackboar` | — | live |
| Thornsow Matriarch | Pinewood elite | `thornsow` | — | live |
| Tide Crab | Grotto | — | — | M4b |
| Training dummy | Vale tutorial target | `dummy` | — | live |
| Unmade | Spire: copies the hero | — | — | M4b |
| Vigil Knight | Spire common: linked shield pair; the Twin Vigils boss is two of them | — | — | M4b |
| Void Archer | Ruins | — | — | M4b |
| Void Bomber | Spire | — | — | M4b |
| Wisp | Ruins: kiting shooter | — | — | M4b |

## 14. Bosses

Note: count reconciled in the M4a DESIGN rewrite (12 or 13 bosses; only named bosses listed).

| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Boss | Any boss, main or mini | — | Guardian; Mini-boss (narrower kinds) | live |
| Boss bar | HUD bar with phase pips | — | — | live |
| Boss move | One entry of `BOSS_MOVES` (cone, circle, line, charge, volley, rain, ring, beam, pull, summon, zone, arenaShrink, blink, mirror, shield, vanish, roar, sequence, random) | `BOSS_MOVES` | — | live |
| Brinemother | Vault boss, Drowned Vault | `brinemother` | — | later |
| Guardian | Main-boss kind (code `kind`) | `kind` | Boss (any boss); Mini-boss | live |
| Kharzul the Cinder Colossus | Main boss 4 | `kharzul` | Kharzul | later |
| Lady Mirelle | Main boss 3 | `mirelle` | Mirelle | later |
| Mini-boss | Mini-kind boss, e.g. Mossjaw, Slagheart | `mini` | Guardian | live |
| Morrow | Main boss 5, the finale; also the Unwaking King of the story | `morrow` | — | later |
| Mossjaw | Mini-boss, Root Hollow | `mossjaw` | — | live |
| Oathless | Vault boss, Warden Crypt | `oathless` | — | M4b |
| Old Bramblehorn | Main boss 1, Pinewood | `bramblehorn` | Bramblehorn | live |
| Slagheart | Mini-boss, Forge Deep | `slagheart` | — | later |
| Sorrel's Echo | Optional boss | `sorrel_echo` | — | later |
| The Gloam Warden | Main boss 2 | `boss` | Gloam Warden; Warden alone (ambiguous) | live |
| Twin Vigils | Boss made of two linked Vigil Knights, Spire ascent (see Vigil Knight) | `vigils` | — | later |
| Unwaking Child | Optional boss | `unwaking_child` | — | later |

## 15. Acts and story
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Act | Story chapter tied to one zone | — | — | live |
| Act I | Pinewood, ends at Bramblehorn | — | — | live |
| Act II | Gloomspire Ruins | — | — | M4b |
| Act III | Sunken Grotto | — | — | later |
| Act IV | Emberfall Caldera | — | — | later |
| Dawn Burst | Aerin's finishing power in the finale | — | — | later |
| Dawn Shards | Collected fragments of the dawn from the Wardens | — | — | live |
| Difficulty mode | Story, Normal, NG+ | — | — | live |
| Finale | Sleepless Spire and Morrow's Throne | — | — | later |
| NG+ | New Game Plus: Morrow dreams again | — | — | later |
| Prologue | Whispering Vale: wake, tutorial | — | — | live |

## 16. Maps, zones, sections and set pieces
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Big map | One of the eight zone maps | — | — | live |
| Bramblehorn's Clearing | Boss arena in Pinewood | — | — | live |
| Brazier | Lightable world object | — | — | live |
| Broken Stair | Ruins set piece | — | — | M4b |
| Checkpoint shrine | Respawn and warp point | `shrine` | — | live |
| Dream Arena | Vale section reached by bridge | — | — | live |
| Dreamer's bed | Start shrine in the Vale | — | — | live |
| Dreamer's Cairn | Tall Vale stack, levels 4, 9, 14 | — | — | live |
| Drifting Isles | Eighth big map | — | — | later |
| Drop-down ledge | One-way ledge you step off to a lower level | — | — | live |
| Drowned Vault | Vault section | — | — | later |
| Emberfall Caldera | Zone 5 | — | — | later |
| Fox Warrens | Pinewood underground section | — | — | live |
| Gloomspire Ruins | Zone 3; Act II | — | — | M4b |
| Hawk's Rest | Pinewood vantage, height 16 | — | — | live |
| Misty Pinewood | Zone 2; Act I | — | — | live |
| Moon Pond | Vale section behind a key gate | — | — | live |
| Morrow's Throne | Final map | — | — | later |
| Pip's Lanterns | Vale bridge section | — | — | live |
| Rift | Portal between maps; `home` and `next` | `home` `next` | Portal; Warp door (different term) | live |
| Rim Walk | Set piece | — | — | later |
| Root Hollow | Pinewood vault section; Mossjaw's den | `rootHollow` | — | live |
| Root ladder | Ladder object that climbs between levels | — | — | live |
| Section | Named part of a big map (outer, under, vault, arena) | — | — | live |
| Set piece | Tall hand-built landmark or vantage | — | — | live |
| Sleepless Spire | Zone 6 | — | — | later |
| Stone's Crown | Vale summit | — | — | live |
| Sunken Grotto | Zone 4 | — | — | later |
| Tide Well | Set piece | — | — | later |
| Vantage | A high viewpoint set piece, e.g. Hawk's Rest | `vantage` | — | live |
| Warden Crypt | Vault section | — | — | M4b |
| Whispering Vale | Zone 1, the hub | — | — | live |
| Zone | One big map of the world | — | — | live |

## 17. World objects and verbs
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Condition | World verb: object test (e.g. Wet, burning) | — | — | M4b |
| Fishing spot | Dreamfishing point | — | — | live |
| Gate | Door opened by a switch | — | — | live |
| Hidden wall | Wall revealed by an element | — | — | live |
| Key door | Door needing a key | — | — | live |
| Lever | Switch object | — | — | live |
| Lore tablet | Readable stone with lore | — | — | live |
| Receiver | World verb: object that reacts to an element | — | — | M4b |
| State | World verb: object's current phase | — | — | M4b |
| Sunbeam | Light object | — | — | live |
| Tile patch | World verb: tile changes (ice, grass) | — | — | M4b |
| Treasure chest | Loot chest; tiers wood, silver, gold | — | — | live |
| Warp door | Door into a section or dungeon | — | Rift; portal | live |

## 18. UI terms
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Banner | Zone or event title across the screen | — | — | live |
| Bestiary | Screen listing met enemies (B) | `bestiary` | — | live |
| Character screen | Stats and gear screen (K) | `character` | — | live |
| Codex | Record of discoveries (Grips) | — | — | M4b |
| Damage numbers | Floating hit values | — | — | live |
| Dream Glass | The HUD style and name | — | — | live |
| Dreamfishing | Fishing minigame; has a Fishing Log | — | — | live |
| Help button | HUD button that opens help | `help` | — | live |
| Loot toast | Pickup popup | — | — | live |
| Minimap | Corner map | — | — | live |
| Nameplate | Name and bar above an entity | — | — | live |
| Objective | The current goal line shown in the Tracker | — | Tracker (that is the panel) | live |
| Pause menu | Esc menu | `menu` | — | live |
| Portrait block | HUD block with hero face, bars | — | — | live |
| Quest screen | Quest list (J) | `quests` | — | live |
| Skill bar | HUD bar of 4 groups of 3: [M1 Q Shift+Q] [M2 E Shift+E] [head chest boots] [Z X C] | — | — | M4a |
| Status row | HUD row of status icons | — | — | live |
| Title screen | Start screen | — | — | live |
| Toast | Short pop-up message | — | — | live |
| Tracker | HUD panel showing the quest Objective | — | quest tracker | live |

## 19. Production and tools
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Balsim | Balance simulator | `tools/balsim.js` | — | live |
| Bot | Automated play-through runner | `tools/qa/run-big.js` | — | live |
| Director | Orchestrating role who merges and rules | — | — | live |
| Dressing room | Forge preview page | `tools/forge/preview.html` | — | M4a |
| ELFX | Effects registry and renderer (rim light, shadows, rays, fog) | `elfx.js` | — | live |
| Forge | Deterministic sprite generator | `tools/forge/` | — | M4a |
| Forge bank | Packed sprite data | `js/forge-bank/` | — | M4a |
| Lane | One parallel work stream | — | — | live |
| Milestone | Delivery step: M1 to M8 | — | — | live |
| `ref` rig | Hero-frame skeleton: 32 px body in a 48 px frame | — | — | M4a |
| Rim light | Edge highlight on sprites | — | — | M4a |
| Save version | Save format: v4 live, v5 with Loadout v3 | `SAVE_VERSION` | — | live |
| Side-by-side board | Reference vs forge approval board (M4a gate) | — | — | M4a |
| Slice (vertical) | M4a scope: Vale and Pinewood | — | — | M4a |
| Socket (forge) | Attachment point on the rig: handR, handL, head, chest, cast, weaponTip, offhandTip | — | — | M4a |
| Wind field | Runtime wind: `WIND.sample`, emitters (vector, radial, pull, blast, zone) | `js/wind.js` | — | M4a |

## 20. Retired terms
| Retired term | Replaced by | Code id | Retired by | Status |
|---|---|---|---|---|
| Changeover | removed (OFFHAND is the second weapon) | — | meeting 4.6 | retired |
| Character skills 1 / 2 / 3 | Pages (re-homed casts) | `CHAR_SKILLS` | meeting 4.6 | retired |
| Dream Tomes | removed (pages replace them) | — | meeting 4.6 | retired |
| HUD skill bar (old) | Skill bar (4 groups of 3) | — | meeting 4.7 | retired |
| Modifier slots | removed (second form replaces them) | — | meeting 4.5 | retired |
| Potion slot | Pockets | `potion` | meeting 4.6 | retired |
| Q / E / R rune alternates | Pages | — | meeting 4.6 | retired |
| Shift dodge | Boots key (V) | `dodge` | client ruling 1 | retired |
| Spellbook (hand weapon) | Grimoire (companion); Wand takes the Foci 1H seat | `spellbook` | meeting 4.3 | retired |
| Two weapon slots | HAND and OFFHAND | — | meeting 4.6 | retired |
