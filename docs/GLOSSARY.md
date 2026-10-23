# GLOSSARY: canonical game terms

Purpose: one name per thing, for every conversation, doc, commit and line of UI text.
**Rule: use the Term column exactly. Names in "Not" are wrong or retired; correct them to the Term.**

Precedence: client rulings and `docs/meetings/2026-10-22-studio-experts.md` > code display names and ids > other docs.
Status: **live** (in the build now) · **M4a** (vertical slice: Vale + Pinewood) · **M4b** (full rollout) · **client** (the client's build, in Godot) · **later** (no milestone assigned) · **retired** (final table only).
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
| Clip | Crossbow ammo: 4 bolts, then a 1 s reload; the Siegeworks grip makes it 6 | `clip`, `clipMax` | — | M4b |
| Combo | The primary hit chain of the HAND item (3-hit Blades, 4-hit Shadows, 2-hit Greatarms) | — | — | live |
| Cooldown | Per-skill recharge timer in seconds | `cd` | — | live |
| Dash Strike | Blades skill: dash through enemies, cutting everything in your path | `dashstrike` | — | live |
| Death fling | Dying enemy is thrown from the killing hit | — | — | M4a |
| Death Mark | Daggers ultimate: mark a spot; a cut now, a killing burst 1.2 s later | `deathmark` | — | M4a |
| Decoy | An image of the hero that draws enemy aggro and soaks 2 hits (at most 3 out); from Shadowstep and Mirror Image | `DECOY` | — | M4b |
| Dodge | Boots-key roll with i-frames | `dodge` | — | live |
| Echo | The mechanic: replays the HAND action and the Q spell only; the Twice-Told grants it | `echo` | — | live |
| Fan of Knives | Daggers spell: throw a ring of eight piercing knives | `fanknives` | — | M4a |
| Firebolt | Staff spell: hurl a bolt that explodes and burns | `firebolt` | — | live |
| Focus | Shots' hold-M1: aim, then the next shot crits | — | — | M4a |
| Frenzy | Claws stacking attack speed: +5% per hit, cap 10, gone 1.5 s after the last hit | `frenzy` | — | M4b |
| Heavy Strike | Greatarms two-hander hold-M1: 1 s charge, x1.8, poise | — | Heavy (that is the armour class); charged swing | M4a |
| Heroic Strike | Blades skill: lunge forward and smash; stuns for 1 s | `heroic` | — | live |
| Hitlag | Brief freeze of attacker and target on a hit; scales with `weight` | `hitstop` | Hitstop (setting label is wrong, UI fix later) | live |
| Hush | Spell from The Stopped Hour: toggle, world time ×0.25, hero full speed, drains MP | `hush` | time slow; bullet time; slow-mo (that is the boss-death effect) | M4a |
| I-frames | Invulnerable frames during Boots-key dodge | — | — | live |
| ICD | Internal cooldown: the minimum time between two procs of the same effect (default 0.5 s; parry 1 s; flash-freeze 6 s) | — | — | M4a |
| Level | Hero or enemy level number | `level` | — | live |
| Mark cap | Stat: the most Marks that can sit on one enemy (cap 5) | `markCap` | — | live |
| Mastery | Per-variant skill rank 1 to 5 earned by use | — | — | live |
| Mastery rank 3 | Second form of the spell | — | — | M4b |
| Mastery rank 5 | Hybrid twist of the spell | — | — | M4b |
| Melee magnet | Short pull toward the target on a melee swing | — | — | live |
| Meteor | Staff ultimate: call down a meteor; massive area damage and burn | `meteor` | — | live |
| MP | Mana: the hand action builds 8 per hit; spells spend it | `mp` | — | live |
| Multishot | Bow spell: loose a fan of five arrows | `multishot` | — | live |
| Off-action | Offhand item's M2 action: costs stamina, 0 MP, no charge | — | — | M4a |
| Off-passive | Passive from the OFFHAND item's class | — | — | M4a |
| Parry | Blades' off-action: 0.25 s window, then riposte stagger | — | Riposte (the old E skill) | M4a |
| Passive (class) | Bonus from the HAND item's class only | `passive` | — | live |
| Perfect dodge | Dodge timed to a hit: bonus effect | — | — | live |
| Poise | Hyper-armour while swinging: hits taken do not interrupt | — | — | live |
| Proc coefficient | Per-source scaler on proc chance and damage: basic 1.0, projectile 0.6, summon 0.4, zone tick or reflected 0.3, Echo 0.5 | — | — | M4a |
| Radiant Judgement | Sword ultimate: call a pillar of light; huge damage and a long stun | `judgement` | — | live |
| Rain of Arrows | Bow ultimate: arrows rain down on an area, slowing everything | `arrowrain` | — | live |
| Riposte | The counter-hit after a parry (stagger 3, stun); with a Rapier in hand x2.2 and always crits | `riposte` | — | live |
| Shrine warp | Fast travel between lit Checkpoint shrines | — | Rift; Warp door | live |
| Snapshot | Shots' and Chakram's off-action: a quick shot | — | — | M4a |
| Stagger | Meter that fills on hits; full means Break | `stagger` | — | live |
| Stamina | Resource spent by dodge and off-actions | `stamina` | — | live |
| Step | Shadows' off-action: 0.6-tile sidestep with a backstab mark | — | — | M4a |
| Sunslash | Sword spell: sweep a wide arc of dawnlight in front of you | `sunslash` | — | live |
| Tumble | Wind-pushed enemy tumbling along the ground | — | — | M4a |
| Ultimate | The strongest cast of an item line; spends Charge | — | — | M4a |
| Wake at shrine | Respawn at the last Checkpoint shrine after death | — | — | live |
| Ward | Foci's off-action: hold a mana shield, pops to a nova on release | — | — | M4a |
| Weight | Hitlag field: basic 1, heavy 1.5, ultimate 2 | `weight` | — | live |
| Whirling Blade | Blades skill: spin three times, hitting all around you | `whirl` | — | live |
| World scale | Time multiplier for everything but the hero: 1 normally, 0.25 in Hush | `G.timeScale` | global time scale; enemy time scale | M4a |

## 3. Elements, statuses and reactions
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Ablaze | Fire status tier 2 | — | — | M4a |
| Arcane | Element: marks and unravels | `arcane` | — | live |
| Blessing | Buff from the Blessing of Dawn page: +40% damage for 8 s | `bless` | Blessing of Dawn (the page) | M4a |
| Breath | Story name of the wind element | — | — | live |
| Buffeted | Wind status tier 1: pushed along the gust | — | — | M4a |
| Bulwark | Chest skill and buff: take 60% less damage for 3.5 s and shove foes away | `bulwark` | — | live |
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
| Haste (buff) | Buff: a short attack-speed boost; the Duelist suit twist grants it after Side-step | `haste` | Haste (the attack-speed stat: write attack speed) | M4b |
| Holy | Element: smites and purifies | `holy` | — | live |
| Jolted | Lightning status tier 1 | — | — | M4a |
| Lifted | Wind status tier 2: knocked up; bosses never | — | — | M4a |
| Lightning | Element: chains and stuns | `lightning` | — | live |
| Mana Surge | Chest skill and buff: restore 120 MP and gain +30% power for 6 s | `manasurge`, `surge` | — | live |
| Marked | Arcane status tier 1 | — | — | M4a |
| Marks | Shadows' stacking mark counter 0 to 3 on an enemy | `marks` | — | live |
| Mend | Helmet skill and buff: heal 25% of max HP over 4 s | `mend` | — | live |
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
| Shadow Veil | Chest skill and buff: vanish for 3 s (+40% speed); your next hit is a guaranteed critical | `shadowveil`, `veil` | — | live |
| Shatter | Reaction: physical hit on Frozen; AoE of damage type shatter | — | Break (that is stagger) | M4a |
| Shocked | Lightning status tier 2 | — | — | M4a |
| Slash | Physical element of blades | `slash` | — | live |
| Smitten | Holy status tier 1 | — | — | M4a |
| Sprint | Boots skill and buff: +80% move speed for 3 s and shake off slows | `sprint` | — | live |
| Status | A timed debuff or buff on an entity, two tiers per element | `status.js` | — | M4a |
| Thaw | Silent interaction: fire on Frozen ends it | — | — | M4a |
| Unravelled | Arcane status tier 2 | — | — | M4a |
| Wet | Surface flag from water: enables Conduct and Flash-freeze | — | — | M4a |
| Wildfire | Reaction: fire on Poisoned; Burning spreads 2 tiles | — | — | M4a |
| Wind | Element: displacement and spread | `wind` | — | M4a |
| Winded | Debuff after Last Stand: -20% move speed for 3 s | `winded` | — | M4b |

## 4. Loadout and slots
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Belt | Trinket slot: boon plus three pockets; shares one slot with the Satchel | `belt` | — | live |
| Boon | Special effect on a Belt, ring or amulet | `boons` | — | live |
| Boots slot | Armour slot: boots piece, hosts the dodge active | `boots` | — | live |
| Chest slot | Armour slot: chest piece, hosts the chest active | `chest` | — | live |
| Companion | Worn offhand item: Grimoire or Quiver (M4a); Warhorn (M4b) | — | — | M4a |
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
| Consecrate | Mace ultimate: hallow the ground around you: a holy burst, then 5 s of searing light | `consecrate` | Consecrated Guard (the Crusader chest skill) | M4b |
| Crush | Mace spell: an overhead blow that crushes guards: stagger 3 | `crush` | — | M4b |
| Dawn Cut | Sword basic attack: the hand hit | `sword` | — | live |
| Flèche | Rapier spell: lunge through a line of foes with one long thrust | `fleche` | Fleche | M4b |
| Knell | Mace basic attack; every hit staggers 1 | `mace` | — | M4b |
| Mace | Spell Crush / ultimate Consecrate; every hit staggers 1 | `mace` | — | M4b |
| Perforate | Rapier ultimate: six needle thrusts down a line, then a finishing lunge that always crits | `perforate` | — | M4b |
| Rapier | Spell Flèche / ultimate Perforate; duelist thrusts | `rapier` | — | M4b |
| Sword | Spell Sunslash / ultimate Radiant Judgement | `sword` | Dawnblade (its T2 name) | live |
| Thrust | Rapier basic attack | `rapier` | — | M4b |

### 5.3 Shadows
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Claws | Spell Rend / ultimate Savage; Frenzy attack speed | `claws` | — | M4b |
| Daggers | Pierce, Marks; spell and ultimate per docs/design/weapons-and-skills.md | `daggers` | Nightfang (its T2 name) | M4b |
| Fang Cut | Daggers basic attack: four quick cuts; circle to the rear | `daggers` | — | M4a |
| Fans | Spell Veil Dance / ultimate Thousand Petals; returning fans | `fans` | — | M4b |
| Flutter | Fans basic attack; every basic Marks | `fans` | — | M4b |
| Rake | Claws basic attack; builds Frenzy | `claws` | — | M4b |
| Rend | Claws spell: three raking cuts; the target is Rent (+15% damage taken) for 4 s | `rend` | — | M4b |
| Thousand Petals | Fans ultimate: a storm of blade-petals wheels with you for 3 s, Marking all it cuts | `thousandpetals` | — | M4b |
| Veil Dance | Fans spell: dance through foes on a gust: each is cut and Marked | `veildance` | Dreamveil (the page) | M4b |

### 5.4 Greatarms
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Aftershock | Hammer ultimate: a ground slam, then three aftershocks that keep staggering | `aftershock` | — | M4b |
| Axe | Spell Cleave / ultimate Colossus Strike | `axe` | Dawnbreaker (its T2 name) | M4b |
| Cleave | Axe spell: one full-circle swing that cleaves everything around you | `cleave` | — | M4b |
| Colossus Strike | Axe ultimate: wind up (poise), then a world-splitting overhead in a wide cone | `colossus` | Dawn Colossus (the Axe T5) | M4b |
| Earthbreaker | Hammer spell: split the ground in a line; the cracks stay for 3 s | `earthbreaker` | — | M4b |
| Halberd | Spell Sweep / ultimate Skewer; 1.5x range | `halberd` | — | M4b |
| Hammer | Spell Earthbreaker / ultimate Aftershock; stagger 3 | `hammer` | — | M4b |
| Hew | Axe basic attack | `axe` | — | M4b |
| Pound | Hammer basic attack; every hit staggers 1 | `hammer` | — | M4b |
| Reach | Halberd basic attack; 1.5x range | `halberd` | — | M4b |
| Skewer | Halberd ultimate: charge with the point down, then drive it through: pins for 1 s | `skewer` | — | M4b |
| Sweep | Halberd spell: a long wheeling sweep that throws foes back on a gust | `sweep` | — | M4b |

### 5.5 Shots
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Ballista | Crossbow ultimate: brace 1.2 s, then one siege bolt down a long line (at most 25% of a boss's HP) | `ballista` | Aurora Ballista (the Crossbow T4) | M4b |
| Bolt | Crossbow basic attack; fires from the Clip | `crossbow` | — | M4b |
| Bow | Spell Multishot / ultimate Rain of Arrows | `bow` | Moonbow (its T2 name) | live |
| Chakram | Spell Ricochet / ultimate Guillotine; returning disc | `chakram` | — | M4b |
| Crossbow | Spell Piercing Bolt / ultimate Ballista; 4-bolt clip | `crossbow` | — | M4b |
| Disc | Chakram basic attack: a returning disc | `chakram` | — | M4b |
| Guillotine | Chakram ultimate: a great disc carves out and back through everything, slowing it | `guillotine` | — | M4b |
| Moon Arrow | Bow basic attack: the arrow shot | `bow` | — | live |
| Piercing Bolt | Crossbow spell: a heavy bolt that pierces every enemy in a line and pins them for 0.6 s | `piercingbolt` | Piercing Shot (the arrow) | M4b |
| Ricochet | Chakram spell: a disc that bounces between foes: 4 hits (6 with the Lodestar grip) | `ricochet` | — | M4b |

### 5.6 Foci
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Arcane Bolt | Staff basic attack: the tapped bolt (hold M1 is Channel) | `staff` | — | live |
| Orb | 1H focus. Spell Chain Lightning / ultimate Tempest | `orb` | — | M4b |
| Rune of Binding | Wand ultimate: a rune roots everything inside for 2.5 s, then bursts | `runebinding` | — | M4b |
| Spark | Wand basic attack | `wand` | — | M4b |
| Staff | 2H focus. Spell Firebolt / ultimate Meteor; hold-M1 Channel | `staff` | Starfall (its T2 name) | live |
| Static Bolt | Orb basic attack (hold M1 drains MP into a channel) | `orb` | — | M4b |
| Tempest | Orb ultimate: a storm wheels around you for 4 s, jolting and shoving foes | `tempest` | — | M4b |
| Wand | New 1H focus: bolt action, spell Frost Shards, ultimate Rune of Binding | — | Spellbook (retired hand weapon); Willow Wand (the Staff T1 name) | M4b |

### 5.7 Weapon tier names (T1 to T5, Mythic)
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Axe tiers | Splitting Axe, Dawnbreaker, Sunforged Axe, Aurora Cleaver, Dawn Colossus; Mythic Forgehand | `FAMILY_TIERS` | — | M4b |
| Bow tiers | Hunter's Bow, Moonbow, Silverwing, Eclipse Longbow, Moon Eternal; Mythic Moonmaw's Bow | `FAMILY_TIERS` | — | live |
| Chakram tiers | Rim, Moon Chakram, Silverring, Eclipse Ring, Ring Eternal; Mythic Aerin's Halo | — | — | M4b |
| Claws tiers | Bone Claws, Nightclaws, Silvertalon, Eclipse Claws, Claws Eternal; Mythic Bramblehorn's Roots | — | — | M4b |
| Crossbow tiers | Hand Crossbow, Dawn Arbalest, Sunbolt, Aurora Ballista, Bolt Eternal; Mythic Four Wardens | — | — | M4b |
| Daggers tiers | Shiv, Nightfang, Twin Eclipse, Widow's Kiss, Fangs Eternal; Mythic Reliquary | `FAMILY_TIERS` | Night Eternal (collides with Staff T5) | M4b |
| Fans tiers | Paper Fans, Moonfans, Silverplume, Eclipse Fans, Fans Eternal; Mythic Mirelle's Tide | — | — | M4b |
| Halberd tiers | Pike, Dawnglaive, Sun Halberd, Aurora Partisan, Reach Eternal; Mythic Vigil's Glaive | — | — | M4b |
| Hammer tiers | Sledge, Sunhammer, Mountain Maul, Aurora Anvil, Hammer Eternal; Mythic Chainbreaker | — | — | M4b |
| Mace tiers | Iron Cudgel, Dawnmace, Sunwarden Mace, Aurora Maul, Vow Eternal; Mythic Lamplighter | — | — | M4b |
| Orb tiers | Glass Bauble, Starfall Orb, Comet Orb, Nebula Sphere, Orb Eternal; Mythic Last Light | — | — | M4b |
| Rapier tiers | Tin Needle, Moonpoint, Silver Estoc, Starpoint, Needle Eternal; Mythic Sorrel's Needle | — | — | M4b |
| Staff tiers | Willow Wand, Starfall Staff, Comet Rod, Nebula Sceptre, Night Eternal; Mythic Emberfall | `FAMILY_TIERS` | — | live |
| Sword tiers | Rusty Blade, Dawnblade, Sunforged Blade, Aurora Edge, Dawn Eternal; Mythic Morrowbane | `FAMILY_TIERS` | — | live |
| Tier (item) | Item power step: T1, T2, T3, T4, T5, then Mythic | `tier` | — | live |
| Wand tiers | Birch Twig, Hazel Wand, Sunspark Wand, Aurora Wand, Spark Eternal; Mythic Wishbone (proposed) | `FAMILY_TIERS` | Willow Wand (the Staff T1) | M4b |

## 6. Shields and companions
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Bellow | Warhorn action: turn to the next call and bellow: a guard-breaking roar (stagger 2) | `bellow` | — | M4b |
| Block | Heater action, HOLD: block 70% of hits from the front (poise); drains stamina | `block` | — | M4b |
| Buckler tiers | Wooden Buckler, Iron Buckler, Sunforged Buckler, Aurora Buckler, Buckler Eternal; Mythic Hearthlid (proposed) | `FAMILY_TIERS` | — | M4b |
| Bulwark Charge | Heater ultimate: charge behind the shield, carrying the first foe, and slam it down | `bulwarkcharge` | Bulwark (the Warden chest skill) | M4b |
| Deck | The companion mechanic: a Grimoire, Quiver or Warhorn holds pages, arrows or calls; its action cycles or primes them and its spell fires the active one | — | page deck | M4a |
| Aegis | Shield ultimate: for 3 s every hit is parried, and each parry restores 10% HP | `aegis` | — | M4a |
| Bash | Shield spell: a short shield dash that staggers what it hits | `bash` | — | M4a |
| Buckler | Shield. Action Parry+ / spell Bash / ultimate Aegis | — | — | M4a |
| Chapter | Grimoire ultimate: read every page in the book over 1.5 s | `chapter` | — | M4a |
| Companions | Offhand class of companions (Grimoire, Quiver): worn with any HAND item | `companions` | — | M4a |
| Fortress | Tower ultimate: a dome for 4 s: enemy shots break on it, and you take 30% less inside | `fortress` | — | M4b |
| Grimoire | Mage companion. Action Turn / spell Grimoire cast / ultimate Chapter | — | Spellbook (retired hand weapon) | M4a |
| Grimoire cast | Grimoire spell: cast the active page | `cast` | Cast | M4a |
| Heater | Shield. Action Block / spell Shield Bash / ultimate Bulwark Charge | — | — | M4b |
| Heater tiers | Oak Heater, Oath Heater, Sunbright Heater, Aurora Heater, Oath Eternal; Mythic Sunken Crest (proposed) | `FAMILY_TIERS` | — | M4b |
| Last Stand | Warhorn ultimate and buff: 4 s of poise and +30% damage, then Winded | `laststand` | — | M4b |
| Nock | Quiver action: nock the next arrow; your next shot hits 40% harder and pierces once | `nock` | — | M4a |
| Parry+ | Buckler action: a 0.35 s parry window; reflects projectiles from T3 | `parryplus` | — | M4a |
| Quiver | Ranger companion. Action Nock / spell Quiver loose / ultimate Quiver Storm | — | — | M4a |
| Quiver loose | Quiver spell: loose the active arrow | `loose` | Loose | M4a |
| Quiver Storm | Quiver ultimate: loose every arrow in the quiver over 1.5 s | `quiverstorm` | — | M4a |
| Quiver tiers | Leather Quiver, Moon Quiver, Silver Quiver, Eclipse Quiver, Quiver Eternal; Mythic Thousandth Arrow (proposed) | `FAMILY_TIERS` | — | M4b |
| Shield | Held OFFHAND item with three skills; offhand only | — | — | M4a |
| Shield Bash | Heater spell: drive the shield forward; shots that meet it mid-dash fly back | `shieldbash` | Bash (the Buckler spell) | M4b |
| Shields | Offhand class of shields: fit OFFHAND only, never under a two-hander | `shields` | — | M4a |
| Shove | Tower spell: heave the wall forward: a gust that hurls a line of foes back | `shove` | — | M4b |
| Tower | Shield. Action Wall / spell Shove / ultimate Fortress | — | — | M4b |
| Tower tiers | Door Shield, Wardwall, Sunwall, Aurora Bastion, Wall Eternal; Mythic The Last Gate (proposed) | `FAMILY_TIERS` | — | M4b |
| Turn | Grimoire action: turn to the next page and flick a free cantrip | `turn` | — | M4a |
| Wall | Tower action, HOLD: stop everything from the front, shots included; you move at half speed | `wall` | — | M4b |
| Warhorn | Warrior companion. Action Bellow / spell Call / ultimate Last Stand | — | — | M4b |
| Warhorn call | Warhorn spell: blow the active call | `call` | Call (the socketed item) | M4b |
| Warhorn tiers | Cow Horn, Rallying Horn, Sunhorn, Aurora Clarion, Call Eternal; Mythic Hollowhorn (proposed) | `FAMILY_TIERS` | — | M4b |

## 7. Pages, arrows, calls and Grips
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Arcane Barrage | Page: five homing missiles seek out foes | `barrage` | — | M4a |
| Arcane Orbit | Page: three orbs circle you for 8 s, burning anything they touch | `orbit` | — | M4a |
| Archmage | Grip: Staff + Grimoire; Chapter costs 80 charge | — | — | M4a |
| Arrow | Item socketed into the Quiver (Piercing Shot, Snare Trap, Dawn Wave, Moonbeam and the M4b arrows below) | — | — | M4a |
| Blast Arrow | Arrow (the deck shows the first word): a powder arrow: a wide blast where it lands | `explosivearrow` | — | M4b |
| Blessing of Dawn | Page: +40% damage for 8 s | `bless` | Blessing (the buff) | M4a |
| Bola Arrow | Arrow (the deck shows the first word): a weighted bola that roots for 1.5 s | `bolaarrow` | — | M4b |
| Call | Item socketed into the Warhorn (War Cry, Rally, Taunt, Quake-call, Stand) | — | — | M4b |
| Chain Lightning | Page: lightning leaps between up to 6 enemies | `chain` | — | M4a |
| Cornered | Grip: Claws + Buckler | — | — | M4b |
| Dancer | Grip: Rapier + Fans; Step shares Parry's cooldown | — | — | M4b |
| Dawn Wave | Shared page and arrow: release a crescent of light that pierces everything | `dawnwave` | — | M4a |
| Dreamveil | Page: bend the dream; enemies move at 35% speed for 4 s | `dreamveil` | — | M4a |
| Faultline | Grip: Hammer + Warhorn | — | — | M4b |
| Fire Arrow | Arrow (the deck shows the first word): a burning arrow that bursts on impact | `firearrow` | — | M4b |
| Fletcher | Grip: Bow + Quiver; a loosed arrow gains +40% crit chance | `grip_fletcher` | Hunter (colliding name) | M4b |
| Frost Arrow | Arrow (the deck shows the first word): an icy arrow that Chills | `frostarrow` | — | M4b |
| Frost Shards | Page: fire three piercing shards that slow | `frostshard` | — | M4a |
| Grapple Arrow | Arrow (the deck shows the first word): a hooked line that drags the target to you | `grapplearrow` | — | M4b |
| Gravity Well | Page: open a well that drags enemies in and grinds them | `gravity` | — | M4a |
| Grip | Named pairing of two items; a Codex discovery with a glint and aura | `src:'grip'` | — | M4b |
| Hedgewall | Grip: Halberd + Quiver; Nock primes the Halberd too: the next hit is +40% and pins for 0.6 s | `grip_hedgewall` | Pike Square (colliding name) | M4b |
| Lodestar | Grip: Chakram + Orb; Ricochet bounces twice more and each bounce zaps for lightning | `grip_lodestar` | Orbit (colliding name) | M4b |
| Moonbeam | Shared page and arrow: channel a beam of moonlight down a long line | `moonbeam` | — | M4a |
| Page | Item socketed into the Grimoire; a re-homed cast, T1 to T5 plus rarity | — | Dream Tome; rune alternate | M4a |
| Page slot | Grimoire socket; capacity by tier 2, 3, 4, 5, 6, 6 | — | — | M4a |
| Piercing Shot | Arrow: a charged arrow that pierces every enemy in a line | `piercing` | — | M4a |
| Quake-call | Call: the ground answers the horn: a quake that leaves cracks | `quakecall` | Quake Call | M4b |
| Rally | Call and buff: heal 12% and +15% damage for 6 s | `rally` | — | M4b |
| Sanctuary | Grip: Mace + Heater; one zone, no stacking | — | — | M4b |
| Second Wind | Page: instantly heal 35% of max HP | `secondwind` | — | M4a |
| Shooting Star | Page: a star crashes down at your cursor | `shootingstar` | — | M4a |
| Siegeworks | Grip: Crossbow + Quiver; Crossbow clip 6 | `grip_siegeworks` | Arbalest (colliding name) | M4b |
| Snare Trap | Arrow: throw a trap that roots and wounds the first enemies to step in | `snare` | — | M4a |
| Spellblade | Grip: Sword + Grimoire; pages retype Sunslash | — | — | M4b |
| Split Arrow | Arrow (the deck shows the first word): splits in two on its first hit | `splitarrow` | — | M4b |
| Stand | Call: Brace: poise and 30% less damage for 3 s, then a shove | `stand` | Last Stand (the Warhorn ultimate) | M4b |
| Starstorm | Page: a storm of falling stars over an area | `starstorm` | — | M4a |
| Taunt | Duelist head skill and call, and buff: every foe nearby turns on you; you take 20% less for 3 s | `taunt` | — | M4b |
| Twin Fangs | Grip: Daggers + Daggers; Marks cap +1 | — | — | M4b |
| Twin Stars | Grip: Wand + Orb; Overload refunds 2 s | — | — | M4b |
| Vanguard | Grip: Sword + Buckler; a parry primes Sunslash +40 % | — | — | M4a |
| Venom Arrow | Arrow (the deck shows the first word): a barbed arrow that Poisons | `venomarrow` | — | M4b |
| Warband | Grip: Axe + Warhorn; calls also Detonate | — | — | M4b |

## 8. Armour
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Arcane Cowl | Frostweave head: +10% power; skill Frost Nova | `arcanecowl` | — | live |
| Arcane Ward | Head skill (Dreamweave): a shield worth 25% of max HP for 4 s; it pops into a nova | `arcaneward` | — | M4b |
| Armour class | Heavy, Caster, Medium, Shadow: three suits each | `ARMOUR` | — | live |
| Blink | Boots skill: teleport a short distance toward your aim | `blink` | — | live |
| Brace | Chest skill (Juggernaut): poise and 30% less damage for 3 s, then shove everything away | `brace` | — | M4b |
| Briar Mantle | Chest skill (Thornwarden): thorns for 6 s: melee attackers take nature damage back | `briarmantle` | — | M4b |
| Bull Rush | Boots skill (Juggernaut): rush forward carrying the first foe you meet | `bullrush` | — | M4b |
| Caster | Armour class: Dreamweave, Frostweave, Stormweave | `caster` | — | live |
| Charge | Boots skill: charge forward, bowling enemies over | `charge` | — | live |
| Cloud Sandals | Dreamweave boots: +3 MP/s; skill Blink | `clothsandals` | — | live |
| Consecrated Guard | Chest skill (Crusader): a holy circle follows you for 5 s: foes inside burn, you take 25% less | `consecratedguard` | — | M4b |
| Crusader | Heavy suit 2 | `crusader` | — | M4b |
| Crusader Hauberk | Crusader chest: +18% defence, +240 HP; skill Consecrated Guard | `crusader` | — | M4b |
| Crusader Helm | Crusader head: +6% defence, +5% holy damage; skill Judgement Bell | `crusaderhelm` | — | M4b |
| Crusader Sabatons | Crusader boots: +4% defence, +1 HP/s; skill Vault | `crusaderboots` | — | M4b |
| Crusader tiers | Head Pot Helm, Crusader Helm, Bellward Helm, Aurora Halo, Crown of Vows; chest Quilted Gambeson, Crusader Hauberk, Sunsworn Hauberk, Aurora Hauberk, Vestment of Dawn; boots Hobnail Boots, Crusader Sabatons, Sunsworn Sabatons, Aurora Sabatons, Pilgrim Steps | `FAMILY_TIERS` | — | M4b |
| Dreamweave | Caster suit 1 | `dreamweave` | Dreamrobe (legacy id) | live |
| Dreamweave Circlet | Dreamweave head: +8% power, +40 MP; skill Arcane Ward | `dreamweavehelm` | — | M4b |
| Dreamweave Robe | Dreamweave chest: +25% power, +120 MP, +5 MP/s; skill Mana Surge | `dreamweave` | — | live |
| Dreamweave tiers | Head Linen Circlet, Dreamweave Circlet, Starlit Circlet, Nebula Diadem, Crown of Dreams; chest Linen Robe, Dreamweave Robe, Starwoven Robe, Nebula Vestments, Eternal Dreamshroud; boots Rope Sandals, Cloud Sandals, Mistwalkers, Skystep Sandals, Eternal Cloudsteps | `FAMILY_TIERS` | — | M4b |
| Duelist | Medium suit 3 | `duelist` | — | M4b |
| Duelist Boots | Duelist boots: +9% move speed, +2% attack speed; skill Side-step | `duelistboots` | — | M4b |
| Duelist Coat | Duelist chest: +6% crit, +6% attack speed, +4% crit damage; skill En Garde | `duelist` | — | M4b |
| Duelist Hat | Duelist head: +3% crit chance, +4% crit damage; skill Taunt | `duelisthelm` | — | M4b |
| Duelist tiers | Head Feather Cap, Duelist Hat, Silverbrim Hat, Aurora Plume, Crown of Blades; chest Swordsman's Coat, Duelist Coat, Silverthread Coat, Aurora Doublet, Blade Eternal; boots Cuffed Boots, Duelist Boots, Silverspur Boots, Aurora Spurs, Lunge Eternal | `FAMILY_TIERS` | — | M4b |
| En Garde | Chest skill (Duelist): a long 0.5 s parry window (shares the 1 s parry ICD) | `engarde` | — | M4b |
| Fade Step | Chest skill (Shade): step into shadow: 2 s unseen, the next hit crits | `fadestep` | — | M4b |
| Flash Step | Boots skill (Stormweave): a lightning line: dash through foes, Jolting each | `flashstep` | — | M4b |
| Frost Nova | Helmet skill: freeze all nearby enemies in place for 2 s | `frostnova` | — | live |
| Frostweave | Caster suit 2 | `frostweave` | — | M4b |
| Frostweave Robe | Frostweave chest: +22% power, +100 MP, +6% frost damage; skill Winter's Veil | `frostweave` | — | M4b |
| Frostweave Slippers | Frostweave boots: +2 MP/s, +3% move speed; skill Glide | `frostweaveboots` | — | M4b |
| Frostweave tiers | Head Novice Hood, Arcane Cowl, Starweave Cowl, Astral Circlet, Crown of Stars; chest Wool Robe, Frostweave Robe, Rimewoven Robe, Aurora Rimecloak, Winter Eternal; boots Felt Slippers, Frostweave Slippers, Rimewalkers, Aurora Skates, Snowfall Steps | `FAMILY_TIERS` | — | M4b |
| Full-dream bonus | Three pieces of one suit family plus the matching weapon apply the tag rule to trinket boons | — | set bonus | M4b |
| Glide | Boots skill (Frostweave): skate toward your aim, leaving a frost trail that Chills | `glide` | — | M4b |
| Ground Slam | Head skill (Juggernaut): slam the ground: stagger 2, and cracks that linger 3 s | `groundslam` | — | M4b |
| Heavy | Armour class: Warden, Crusader, Juggernaut | `heavy` | — | live |
| Hunter's Mark | Head skill (Stalker): Mark every foe around the aim twice (+4% damage taken per Mark) | `huntersmark` | — | M4b |
| Judgement Bell | Head skill (Crusader): a bell of judgement tolls: holy burst, 0.8 s stun | `judgementbell` | — | M4b |
| Juggernaut | Heavy suit 3 | `juggernaut` | — | M4b |
| Juggernaut Cuirass | Juggernaut chest: +16% defence, +300 HP; skill Brace | `juggernaut` | — | M4b |
| Juggernaut Helm | Juggernaut head: +7% defence, +20 HP; skill Ground Slam | `juggernauthelm` | — | M4b |
| Juggernaut tiers | Head Bucket Helm, Juggernaut Helm, Forgebrow Helm, Aurora Ramhelm, Crown of Cinders; chest Scrap Plate, Juggernaut Cuirass, Forgeborn Cuirass, Aurora Cuirass, Anvilheart; boots Iron Clogs, Juggernaut Treads, Forgeborn Treads, Aurora Treads, Quakestriders | `FAMILY_TIERS` | — | M4b |
| Juggernaut Treads | Juggernaut boots: +4% defence, +30 HP; skill Bull Rush | `juggernautboots` | — | M4b |
| Knight Greaves | Warden boots: +5% defence; skill Charge | `knightgreaves` | — | live |
| Knight Helm | Warden head: +8% defence; skill War Cry | `knighthelm` | — | live |
| Knight Plate | Warden chest: +20% defence, +220 HP; skill Bulwark | `warden` | — | live |
| Medium | Armour class: Stalker, Thornwarden, Duelist | `medium` | — | live |
| Mirage | Shadow suit 3 | `mirage` | — | M4b |
| Mirage Silks | Mirage chest: +12% crit, +7% move speed, +8% arcane damage; skill Mirror Image | `mirage` | — | M4b |
| Mirage Slippers | Mirage boots: +12% move speed, 2% shorter cooldowns; skill Phase | `mirageboots` | — | M4b |
| Mirage tiers | Head Gauze Veil, Mirage Veil, Glasswoven Veil, Aurora Glassveil, Crown of Mirrors; chest Gauze Silks, Mirage Silks, Glasswoven Silks, Aurora Silks, Mirror Eternal; boots Gauze Slippers, Mirage Slippers, Glass Slippers, Aurora Slippers, Shimmer Eternal | `FAMILY_TIERS` | — | M4b |
| Mirage Veil | Mirage head: +5% crit chance, 3% shorter cooldowns; skill Dreamveil | `miragehelm` | — | M4b |
| Mirror Image | Chest skill (Mirage): an image of you for 6 s: it draws foes and shoots arcane bolts | `mirrorimage` | — | M4b |
| Nightshade | Shadow suit 2 | `nightshade` | — | M4b |
| Nightshade Mask | Nightshade head: +5% crit chance, +5% status chance; skill Toxin Flask | `nightshadehelm` | — | M4b |
| Nightshade Steps | Nightshade boots: +12% move speed, +2% crit chance; skill Slink | `nightshadeboots` | — | M4b |
| Nightshade tiers | Head Cloth Mask, Nightshade Mask, Venomweave Mask, Aurora Mask, Crown of Thorns; chest Herbalist Vest, Nightshade Vest, Venomweave Vest, Aurora Vest, Blight Eternal; boots Moss Shoes, Nightshade Steps, Venomweave Steps, Aurora Creepers, Creeper Eternal | `FAMILY_TIERS` | — | M4b |
| Nightshade Vest | Nightshade chest: +12% crit, +7% move speed, +8% nature damage; skill Venom Coat | `nightshade` | — | M4b |
| Phase | Boots skill (Mirage): phase straight through enemies toward your aim | `phase` | — | M4b |
| Piece | One armour item: head, chest or boots | `pieces` | — | live |
| Roll | Barefoot skill: a quick roll toward your aim; boots replace it | `roll` | — | live |
| Root Vault | Boots skill (Thornwarden): vault back from your aim, leaving a snare where you stood | `rootvault` | — | M4b |
| Shade | Shadow suit 1 | `shade` | Shadeleathers (legacy id) | M4b |
| Shade Cowl | Shade head: +6% crit chance; skill Smoke Bomb | `shadehelm` | — | M4b |
| Shade Leathers | Shade chest: +14% crit, +8% move speed, +8% attack speed; skill Fade Step | `shade` | — | M4b |
| Shade tiers | Head Rag Cowl, Shade Cowl, Duskwoven Cowl, Aurora Shadecowl, Crown of Dusk; chest Rag Leathers, Shade Leathers, Duskwoven Leathers, Aurora Leathers, Gloam Eternal; boots Rag Wraps, Shade Wraps, Duskwoven Wraps, Aurora Wraps, Nightfall Steps | `FAMILY_TIERS` | — | M4b |
| Shade Wraps | Shade boots: +13% move speed; skill Shadowstep | `shadeboots` | — | M4b |
| Shadow (armour) | Armour class: Shade, Nightshade, Mirage | `shadow` | — | live |
| Shadowstep | Boots skill (Shade): dash away and leave a decoy where you stood | `shadowstep` | — | M4b |
| Side-step | Boots skill (Duelist): a quick side-step along your movement (cd 3) | `sidestep` | — | M4b |
| Slink | Boots skill (Nightshade): slink low: for 2 s you backstab from any angle | `slink` | — | M4b |
| Smoke Bomb | Head skill (Shade): a smoke burst: foes Chilled and you unseen for 1.5 s | `smokebomb` | — | M4b |
| Stalker | Medium suit 1 | `stalker` | Stalkerjacket (legacy id) | live |
| Stalker Hood | Stalker head: +5% crit chance; skill Hunter's Mark | `stalkerhelm` | — | M4b |
| Stalker Jacket | Stalker chest: +18% crit, +15% haste; skill Shadow Veil | `stalker` | — | live |
| Stalker Shoes | Stalker boots: +12% move speed; skill Tumble | `stalkershoes` | — | live |
| Stalker tiers | Head Leather Cap, Stalker Hood, Nightstalker Hood, Shadowweave Cowl, Eclipse Mask; chest Leather Jerkin, Stalker Jacket, Nightstalker Coat, Shadowweave Jacket, Eclipse Garb; boots Soft Shoes, Stalker Shoes, Quietstep Boots, Shadowweave Boots, Eclipse Treads | `FAMILY_TIERS` | — | M4b |
| Static Cloak | Chest skill (Stormweave): for 6 s, every hit you take zaps the attacker and Jolts it | `staticcloak` | — | M4b |
| Stormcall | Head skill (Stormweave): call a storm on the aim: 3 s of strikes that Jolt | `stormcall` | — | M4b |
| Stormweave | Caster suit 3 | `stormweave` | — | M4b |
| Stormweave Hood | Stormweave head: +8% power, +3% crit chance; skill Stormcall | `stormweavehelm` | — | M4b |
| Stormweave Robe | Stormweave chest: +18% power, +100 MP, +4% lightning damage; skill Static Cloak | `stormweave` | — | M4b |
| Stormweave Shoes | Stormweave boots: +2 MP/s, +4% attack speed; skill Flash Step | `stormweaveboots` | — | M4b |
| Stormweave tiers | Head Canvas Hood, Stormweave Hood, Thundercall Hood, Aurora Stormcowl, Crown of Storms; chest Oilcloth Robe, Stormweave Robe, Thunderwoven Robe, Aurora Stormrobe, Storm Eternal; boots Rush Sandals, Stormweave Shoes, Sparkheel Shoes, Aurora Sparkheels, Boltstriders | `FAMILY_TIERS` | — | M4b |
| Suit | Three-piece armour set; suit twist at 3 pieces | — | — | live |
| Suit twist | Bonus when three suit pieces are worn | — | — | M4b |
| Thornwarden | Medium suit 2 | `thornwarden` | — | M4b |
| Thornwarden Boots | Thornwarden boots: +8% move speed, +2 HP/s; skill Root Vault | `thornwardenboots` | — | M4b |
| Thornwarden Coat | Thornwarden chest: +12% crit, +10% attack speed, +4 HP/s; skill Briar Mantle | `thornwarden` | — | M4b |
| Thornwarden tiers | Head Ranger Cap, Warden Hood, Mossmantle Hood, Thornwarden Hood, Crown of Roots; chest Moss Coat, Thornwarden Coat, Briarwoven Coat, Aurora Briarcoat, Roots Eternal; boots Bark Boots, Thornwarden Boots, Briarstep Boots, Aurora Barkboots, Bloomsteps | `FAMILY_TIERS` | — | M4b |
| Toxin Flask | Head skill (Nightshade): lob a flask: it bursts into a Poison cloud for 4 s | `toxinflask` | — | M4b |
| Tumble (skill) | Stalker boots skill: roll away from your aim; your damage +30% for 1.5 s | `tumble` | Tumble (the wind push); Sprint (cut from the Stalker boots) | M4b |
| Vault | Boots skill (Crusader): leap toward your aim and land in a holy burst | `vault` | — | M4b |
| Venom Coat | Chest skill (Nightshade): for 8 s every hit you land Poisons | `venomcoat` | — | M4b |
| War Cry | Helmet skill: a roar that stuns and knocks back nearby enemies | `warcry` | — | live |
| Warden | Heavy armour suit 1 | `warden` | Knightplate (legacy id); Warden alone (ambiguous, write Warden suit) | live |
| Warden Hood | Thornwarden head: +5 HP/s regeneration; skill Mend | `wardenhood` | — | live |
| Warden tiers | Iron Mail, Knight Plate, Sunforged Plate, Aurora Plate, Aegis of Dawn; Mythic Shardheart Plate | — | — | M4a |
| Winter's Veil | Chest skill (Frostweave): a frost veil for 5 s: you take 20% less and attackers are Chilled | `wintersveil` | — | M4b |

Mythic armour (one per suit family): Shardheart Plate, Gloomspire Vestment, Forge Deep Cuirass, Nightlong Shroud, Brinemother's Veil, Gravewind, Pinewood Mist, Briarwatch Mantle, Oathless Jacket, Gloamveil, Mossjaw's Skin, Glasswarp Silk. Tier names for the other suits are in docs/design/names.md (the rest are authored in the M4b gear lanes).

## 9. Item structure
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Affix | Random stat on a rare or better item; prefix or suffix | `AFFIX_V2` | — | live |
| Ardent | Prefix tier 2: +9 to 12% charge rate | `AFFIX_V2.prefix.chargeSpeed` | — | live |
| Blazing | Prefix tier 2: +8 to 10% fire damage | `AFFIX_V2.prefix.fireDmg` | — | live |
| Bound | Prefix tier 2: +2 Mark cap | `AFFIX_V2.prefix.markCap` | — | live |
| Bulwarked | Suffix tier 2: +4 to 5.5% armour | `AFFIX_V2.suffix.def` | — | live |
| Cleansing Sash | Boon: Potions also cleanse one status | `potionCleanse` | — | live |
| Common | Rarity 1, colour #d8d8d8 | `common` | — | live |
| Crackling | Prefix tier 1: +4 to 6% lightning damage | `AFFIX_V2.prefix.lightningDmg` | — | live |
| Crushing | Prefix tier 2: +16 to 20% crit damage | `AFFIX_V2.prefix.critDmg` | — | live |
| Dawnlit | Prefix tier 2: +8 to 10% holy damage | `AFFIX_V2.prefix.holyDmg` | — | live |
| Dream Tithe | Boon: +10% MP on hit | `originMystic` | — | live |
| Dreamglass Pendant | Amulet tier 2 (from L16): +5% charge rate | `dreamglass_pendant` | — | live |
| Dreamsilver Band | Ring tier 2 (from L16): +4% power | `dreamsilver_band` | — | live |
| Dreamwarded | Suffix tier 3: +8 to 10% all resistance (legendary or better) | `AFFIX_V2.suffix.resAll` | — | live |
| Drifting Dust | Boon: +2 Dust on elite kills | `dustOnKill` | — | live |
| Eager | Prefix tier 1: +5 to 7% charge rate | `AFFIX_V2.prefix.chargeSpeed` | — | live |
| Ember Sign | Boon: +15% fire damage and +10% Burn chance | `fireBurn` | — | live |
| Epic | Rarity 4, colour #c070ff | `epic` | — | live |
| Evasive | Suffix tier 1: +1 to 1.5% max HP healed per dodge (epic or better) | `AFFIX_V2.suffix.onDodge` | — | live |
| Eventide | Prefix tier 3: +12 to 15% arcane damage | `AFFIX_V2.prefix.arcaneDmg` | — | live |
| Fated | Prefix tier 2: +9 to 12% status chance | `AFFIX_V2.prefix.statusChance` | — | live |
| Fettered | Prefix tier 3: +3 Mark cap | `AFFIX_V2.prefix.markCap` | — | live |
| Fierce | Prefix tier 2: +6 to 8% power | `AFFIX_V2.prefix.power` | — | live |
| First Dawn | Boon: The first R in each fight is free | `rFirstFree` | — | live |
| Frosted | Prefix tier 2: +8 to 10% frost damage | `AFFIX_V2.prefix.frostDmg` | — | live |
| Frozen Ultimate | Boon: R gains the frost tag | `rFrostTag` | — | live |
| Full Charge | Boon: +8% skill damage while charge is full | `skillDmgFull` | — | live |
| Full Pouch | Boon: +1 potion charge | `potionCap` | — | live |
| Gathered Light | Boon: Kills grant 2 charge | `chargeOnKill` | — | live |
| Gift of Victory | Boon: Kill-heal +50% | `killHeal` | — | live |
| Glacial | Prefix tier 3: +12 to 15% frost damage | `AFFIX_V2.prefix.frostDmg` | — | live |
| Gleaning | Suffix tier 1: +2 to 3% max MP restored per kill (epic or better) | `AFFIX_V2.suffix.onKill` | — | live |
| Guarded | Suffix tier 1: +2 to 3% armour | `AFFIX_V2.suffix.def` | — | live |
| Hale | Suffix tier 2: +55 to 70 max HP | `AFFIX_V2.suffix.hp` | — | live |
| Hallowed | Prefix tier 1: +4 to 6% holy damage | `AFFIX_V2.prefix.holyDmg` | — | live |
| Halo Hoop | Boon: +15% holy damage; holy hits stagger more | `holyPower` | — | live |
| Hardened | Suffix tier 2, on every resistance affix: +10 to 14% resistance | `AFFIX_V2.suffix.res*` | — | live |
| Hoarfrost Band | Boon: +15% frost damage and +10% Freeze chance | `frostPower` | — | live |
| Honed | Prefix tier 2: +4 to 5% crit chance | `AFFIX_V2.prefix.crit` | — | live |
| Imbue | Give a weapon an element for Dust | `imbueItem` | — | live |
| Implicit | Fixed stat built into an item base | `IMPLICITS` | — | live |
| Impregnable | Suffix tier 3: +6 to 8% armour | `AFFIX_V2.suffix.def` | — | live |
| Item level | Level of an item drop | `ilvl` | — | live |
| Keen | Prefix tier 1: +3 to 5% power | `AFFIX_V2.prefix.power` | — | live |
| Keen Eye | Boon: +10% crit damage | `originRanger` | — | live |
| Kindled | Prefix tier 3: +14 to 18% charge rate | `AFFIX_V2.prefix.chargeSpeed` | — | live |
| Lantern Charm | Amulet tier 1 (from L1): +3% charge rate | `lantern_charm` | — | live |
| Lantern Heart | Boon: +10% ultimate damage | `ultDmg` | — | live |
| Lasting Supper | Boon: Cooking buffs last 15 min | `cookingDur` | — | live |
| Leaping Current | Boon: Conduct +1 jump | `conductJump` | — | live |
| Legendary | Rarity 5, colour #ffb030 | `legendary` | Unique (different thing) | live |
| Lethal | Prefix tier 3: +7 to 8% crit chance | `AFFIX_V2.prefix.crit` | — | live |
| Lingering Dream | Boon: R buffs last 2 s longer | `ultBuffDur` | — | live |
| Lithe | Suffix tier 1: +10 to 14% move speed | `AFFIX_V2.suffix.speed` | — | live |
| Long Veil | Boon: Dodge i-frame window 0.1 s longer | `dodgeIframe` | — | live |
| Lucid | Suffix tier 1: +0.8 to 1.2 MP per second | `AFFIX_V2.suffix.mpRegen` | — | live |
| Luminous | Prefix tier 2: +8 to 10% skill damage | `AFFIX_V2.prefix.skillDmg` | — | live |
| Many Threads | Boon: +1 Mark cap | `markCap` | — | live |
| Mending | Suffix tier 1: +1 to 1.5 HP per second | `AFFIX_V2.suffix.regen` | — | live |
| Mirror Loop | Boon: +15% arcane damage; Marks last 1 s longer | `arcanePower` | — | live |
| Mistwoven Belt | Belt tier 2 (from L16): +1 potion charge | `mistwoven_belt` | — | live |
| Moonlit Girdle | Belt tier 3 (from L32): +1 potion charge | `moonlit_girdle` | — | live |
| Mossy | Prefix tier 1: +4 to 6% nature damage | `AFFIX_V2.prefix.natureDmg` | — | live |
| Mythic | Rarity 6 and the tier above T5, colour #ff4f7a | `mythic` | — | live |
| Nimble | Suffix tier 2: +20 to 26% move speed | `AFFIX_V2.suffix.speed` | — | live |
| Nimble Heart | Boon: Dodges grant 5 charge | `chargeOnDodge` | — | live |
| Oath of the Shield | Boon: +10% defence | `originKnight` | — | live |
| Ominous | Prefix tier 3: +16 to 20% status chance | `AFFIX_V2.prefix.statusChance` | — | live |
| Overgrown | Prefix tier 3: +12 to 15% nature damage | `AFFIX_V2.prefix.natureDmg` | — | live |
| Patient | Prefix tier 1: +2 to 3% cooldown reduction | `AFFIX_V2.prefix.cdr` | — | live |
| Patient Line | Boon: +5% fishing luck | `fishLuck` | — | live |
| Phantom | Suffix tier 2: +2 to 3% max HP healed per dodge (epic or better) | `AFFIX_V2.suffix.onDodge` | — | live |
| Piercing Thought | Boon: Projectiles +1 pierce | `projPierce` | — | live |
| Prefix | Affix before the item name | `AFFIX_V2` | — | live |
| Quick | Prefix tier 1: +3 to 4% attack speed | `AFFIX_V2.prefix.haste` | — | live |
| Quickened Wrath | Boon: Charged swings 0.25 s faster | `chargedSwing` | — | live |
| Quiet Reserve | Boon: R restores 20 MP | `mpOnR` | — | live |
| Rare | Rarity 3, colour #5aa8ff | `rare` | — | live |
| Rarity | Item quality: Common, Uncommon, Rare, Epic, Legendary, Mythic | `RARITY` | — | live |
| Ravening | Suffix tier 3: +6 to 7% max MP restored per kill (epic or better) | `AFFIX_V2.suffix.onKill` | — | live |
| Reaction Locket | Boon: +15% charge from reactions | `chargeFromReact` | — | live |
| Reaping | Suffix tier 2: +4 to 5% max MP restored per kill (epic or better) | `AFFIX_V2.suffix.onKill` | — | live |
| Renewing | Suffix tier 2: +2 to 2.5 HP per second | `AFFIX_V2.suffix.regen` | — | live |
| Resplendent | Prefix tier 3: +12 to 15% skill damage | `AFFIX_V2.prefix.skillDmg` | — | live |
| Restless | Prefix tier 1: +5 to 7% status chance | `AFFIX_V2.prefix.statusChance` | — | live |
| Rimed | Prefix tier 1: +4 to 6% frost damage | `AFFIX_V2.prefix.frostDmg` | — | live |
| Ring of the Dream | Origin starter ring (Mystic): boon Dream Tithe, +10% MP on hit | `origin_mystic` | — | live |
| Ring of the Shield | Origin starter ring (Knight): boon Oath of the Shield, +10% defence | `origin_knight` | — | live |
| Ring of the Trail | Origin starter ring (Ranger): boon Keen Eye, +10% crit damage | `origin_ranger` | — | live |
| Ring of the Unseen | Origin starter ring (Thief): boon Unseen Debt, +10% damage from behind | `origin_thief` | — | live |
| Ring of the Vow | Origin starter ring (Warrior): boon Vow of Iron, +1 stagger on weapon skills | `origin_warrior` | — | live |
| Ring resonance | Bonus when both rings share an origin or element | — | — | live |
| Rootbound Loop | Boon: +15% nature damage and +10% Poison chance | `naturePower` | — | live |
| Rope Sash | Belt tier 1 (from L1): +1 potion charge | `rope_sash` | — | live |
| Ruinous | Prefix tier 3: +24 to 30% crit damage | `AFFIX_V2.prefix.critDmg` | — | live |
| Salvage | Break gear into Dream Dust; gems return to the bag | `salvageItem` | — | live |
| Savage | Prefix tier 3: +10 to 13% power | `AFFIX_V2.prefix.power` | — | live |
| Searing | Prefix tier 3: +12 to 15% fire damage | `AFFIX_V2.prefix.fireDmg` | — | live |
| Serene | Suffix tier 3: +2.4 to 3.2 MP per second | `AFFIX_V2.suffix.mpRegen` | — | live |
| Shared Meal | Boon: +10% XP from food | `foodXp` | — | live |
| Sharpened | Prefix tier 1: +2 to 3% crit chance | `AFFIX_V2.prefix.crit` | — | live |
| Sharpened Dusk | Boon: +5% crit chance for 6 s after R | `critAfterR` | — | live |
| Shimmering | Prefix tier 1: +4 to 6% arcane damage | `AFFIX_V2.prefix.arcaneDmg` | — | live |
| Slow Mending | Boon: Potions heal 3% of max HP per second for 4 s | `flaskRegen` | — | live |
| Smoldering | Prefix tier 1: +4 to 6% fire damage | `AFFIX_V2.prefix.fireDmg` | — | live |
| Sovereign | Suffix tier 1: +3 to 4% all resistance (legendary or better) | `AFFIX_V2.suffix.resAll` | — | live |
| Starhollow Amulet | Amulet tier 3 (from L32): +8% charge rate | `starhollow_amulet` | — | live |
| Starlit | Prefix tier 2: +8 to 10% arcane damage | `AFFIX_V2.prefix.arcaneDmg` | — | live |
| Starmetal Band | Ring tier 3 (from L32): +6% power | `starmetal_band` | — | live |
| Steady | Prefix tier 2: +4 to 5% cooldown reduction | `AFFIX_V2.prefix.cdr` | — | live |
| Still Water | Boon: Potions also restore 20% MP | `potionMp` | — | live |
| Storm Ring | Boon: +15% lightning damage; Shock lasts 1 s longer | `lightningPower` | — | live |
| Stormborn | Prefix tier 3: +12 to 15% lightning damage | `AFFIX_V2.prefix.lightningDmg` | — | live |
| Sturdy | Suffix tier 1: +25 to 35 max HP | `AFFIX_V2.suffix.hp` | — | live |
| Suffix | Affix after the item name | `SUFFIX_NOUN` | — | live |
| Sunwrought | Prefix tier 3: +12 to 15% holy damage | `AFFIX_V2.prefix.holyDmg` | — | live |
| Swift | Prefix tier 2: +6 to 7% attack speed | `AFFIX_V2.prefix.haste` | — | live |
| Tarnished Band | Ring tier 1 (from L1): +2% power | `tarnished_band` | — | live |
| Temper | Spend Dust to raise an item's power step | `TEMPER_COST` | — | live |
| Tempered | Item upgraded with Temper | `temperItem` | — | live |
| Tethered | Prefix tier 1: +1 Mark cap | `AFFIX_V2.prefix.markCap` | — | live |
| Thrifty Hands | Boon: Salvage Dust x1.5 | `salvageDust` | — | live |
| Thrifty Light | Boon: R costs 80 charge | `rCost` | — | live |
| Thundering | Prefix tier 2: +8 to 10% lightning damage | `AFFIX_V2.prefix.lightningDmg` | — | live |
| Timeless | Prefix tier 3: +6 to 8% cooldown reduction | `AFFIX_V2.prefix.cdr` | — | live |
| Tranquil | Suffix tier 2: +1.6 to 2.2 MP per second | `AFFIX_V2.suffix.mpRegen` | — | live |
| Trinket | Ring, amulet or belt item | `TRINKET_BASES` | — | live |
| Unbowed | Suffix tier 2: +5 to 6% all resistance (legendary or better) | `AFFIX_V2.suffix.resAll` | — | live |
| Unbroken | Suffix tier 3: +75 to 90 max HP | `AFFIX_V2.suffix.hp` | — | live |
| Uncommon | Rarity 2, colour #6ee36e | `uncommon` | — | live |
| Undying | Suffix tier 3: +3 to 4 HP per second | `AFFIX_V2.suffix.regen` | — | live |
| Unique | Fixed named item with a special rule | `UNIQUES` | Legendary (a rarity) | live |
| Unseen Debt | Boon: +10% damage from behind | `originThief` | — | live |
| Unyielding | Suffix tier 3, on every resistance affix: +17 to 20% resistance | `AFFIX_V2.suffix.res*` | — | live |
| Verdant | Prefix tier 2: +8 to 10% nature damage | `AFFIX_V2.prefix.natureDmg` | — | live |
| Vivid | Prefix tier 1: +4 to 6% skill damage | `AFFIX_V2.prefix.skillDmg` | — | live |
| Vow of Iron | Boon: +1 stagger on weapon skills | `originWarrior` | — | live |
| Warded | Suffix tier 1, on every resistance affix: +6 to 8% resistance | `AFFIX_V2.suffix.res*` | — | live |
| Whirling | Prefix tier 3: +9 to 11% attack speed | `AFFIX_V2.prefix.haste` | — | live |
| Wide Fracture | Boon: Shatter radius +1 | `shatterRadius` | — | live |
| Wider Glow | Boon: R radius +1 | `ultRadius` | — | live |
| Wider Shadow | Boon: Backstab arc +30 degrees | `backstabArc` | — | live |
| Windborne | Suffix tier 3: +30 to 38% move speed | `AFFIX_V2.suffix.speed` | — | live |
| Wraithstep | Suffix tier 3: +3.5 to 4% max HP healed per dodge (epic or better) | `AFFIX_V2.suffix.onDodge` | — | live |
| Wrapped Gems | Boon: Gems in chest and boots count +1 grade, clamped at Radiant | `gemWrap` | — | live |

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
| Fire Bomb | Pocket bomb: throw a bomb that bursts into flame at your aim | `bomb` | — | M4a |
| Gem | Socketable stone: Ruby, Sapphire, Emerald, Topaz, Amethyst, Diamond | `GEMS` | — | live |
| Gem grade | Chipped, Clear, Radiant | `GEM_GRADES` | — | live |
| Health Potion | Pocket potion: heal 40% of max HP | `potion` | — | live |
| Mana Flask | Pocket flask: restore 50% of max MP | `flask` | — | M4a |
| Opal | Wind gem (client-approved) | — | — | M4b |
| Pearl slot | Extra socket on a legendary, traded from the Elder Stone for a legendary fish | — | — | M4b |
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
| Afterimage Pendant | Amulet unique: dashes leave an image that recasts your last skill once | `afterimagependant` | — | live |
| Ashen Signet | Ring unique: burn ticks spread Burn to one nearby foe | `ashensignet` | — | live |
| Cinder Sash | Belt unique: potions leave an ember that burns nearby foes | `cindersash` | — | live |
| Cinderstride Boots | Unique boots | `UNIQUES` | — | live |
| Comet Band | Ring unique: projectiles curve toward Marked enemies | `cometband` | — | live |
| Drowned Compass | Amulet unique: R reveals hidden chests in the room | `drownedcompass` | — | live |
| Girdle of Quiet Dusk | Belt unique: potions refill on every boss phase change | `quietgirdle` | — | live |
| Kindred Band | Ring unique: ring resonance bonus doubles when both rings match | `kindredband` | — | live |
| Morrowbane | Mythic Sword; the Sword line's Mythic name | `UNIQUES` | — | live |
| Root-Crown | Unique helm | `UNIQUES` | — | live |
| Tide-Edge | Unique weapon | `UNIQUES` | — | live |
| The Stopped Hour | Legendary unique (20th) whose rule replaces its spell with Hush | `stillhour` | time rune; Hush (that is the spell) | M4a |
| Tidewoven Clasp | Belt unique: zone skills follow you as you move | `tidewovenclasp` | — | live |
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

Note: count reconciled in docs/design/enemies-bosses.md (29 names listed against the stated 28 commons).

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
| Gloom Knight | Ruins: shield-front (blocks 85 % from the front, takes x1.3 from behind) | `gloomknight` | — | M4b |
| Gloom Slime | Pinewood: splits | `gloomslime` | — | live |
| Gloomed elite | Elite modifier: gloom-touched elite | — | Gloomed (that is the status) | M4b |
| Glowfin Shoal | Grotto: orbiting swarm | — | — | M4b |
| Gnarlroot Brute | Pinewood elite brute | `gnarlbrute` | — | live |
| Grave Chanter | Ruins: teleporting caster, gloom bombs, raises bound wisps (no XP; they unravel when it dies) | `gravechanter` | — | M4b |
| Lightning Eel | Grotto | — | — | M4b |
| Magma Hopper | Caldera | — | — | M4b |
| Mountain Troll | Pinewood | `mountaintroll` | — | live |
| Ogre | Pinewood: cone brute | `ogre` | — | live |
| Pillar Mimic | Ruins: ambush, sleeps as a pillar, wakes at 1.8 tiles | `pillarmimic` | — | M4b |
| Shade Hound | Pinewood: line lunge | `shadehound` | — | live |
| Shadeling Swarm | Ruins: orbiting swarm, 5 bodies, one kill | `shadelingswarm` | — | M4b |
| Slag Golem | Caldera: poise brute | — | — | M4b |
| Star Archer | Spire: sniper | — | — | M4b |
| Storm elite | Elite modifier: lightning storm | — | Storm | M4b |
| Thornback Boar | Pinewood | `thornbackboar` | — | live |
| Thornsow Matriarch | Pinewood elite | `thornsow` | — | live |
| Tide Crab | Grotto | — | — | M4b |
| Training dummy | Vale tutorial target | `dummy` | — | live |
| Unmade | Spire: copies the hero | — | — | M4b |
| Vigil Knight | Spire common: linked shield pair; the Twin Vigils boss is two of them | — | — | M4b |
| Void Archer | Ruins: kiting sniper plus a 3-bolt fan | `voidarcher` | — | M4b |
| Void Bomber | Spire | — | — | M4b |
| Wisp | Ruins: kiting shooter, its bolt lands Dread | `wisp` | — | M4b |

## 14. Bosses

Note: count reconciled in docs/design/enemies-bosses.md (12 named bosses).

| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Boss | Any boss, main or mini | — | Guardian; Mini-boss (narrower kinds) | live |
| Boss bar | HUD bar with phase pips | — | — | live |
| Boss move | One entry of `BOSS_MOVES` (cone, circle, line, charge, volley, rain, ring, beam, pull, summon, zone, arenaShrink, blink, mirror, shield, gloam, vanish, roar, sequence, random) | `BOSS_MOVES` | — | live |
| Brinemother | Vault boss, Drowned Vault | `brinemother` | — | later |
| Cunning form | A boss move variant added per phase: feint, delayed second hit or predicted aim | — | — | M4b |
| Guardian | Main-boss kind (code `kind`) | `kind` | Boss (any boss); Mini-boss | live |
| Kharzul the Cinder Colossus | Main boss 4 | `kharzul` | Kharzul | later |
| Lady Mirelle | Main boss 3 | `mirelle` | Mirelle | later |
| Mini-boss | Mini-kind boss, e.g. Mossjaw, Slagheart | `mini` | Guardian | live |
| Morrow | Main boss 5, the finale; also the Unwaking King of the story | `morrow` | — | later |
| Mossjaw | Mini-boss, Root Hollow | `mossjaw` | — | live |
| Oathless | Mini-boss, Oath Reliquary (Ruins): shield-wall, cleave, volley; oath-charge at 50 % | `oathless` | — | M4b |
| Old Bramblehorn | Main boss 1, Pinewood | `bramblehorn` | Bramblehorn | live |
| Slagheart | Mini-boss, Forge Deep | `slagheart` | — | later |
| Sorrel's Echo | Optional boss | `sorrel_echo` | — | later |
| The Gloam Warden | Main boss 2, Warden's Hall (Act II guardian, 3 bars). The legacy M2a fight on the demo map is `boss` | `gloamwarden` | Gloam Warden; Warden alone (ambiguous) | live |
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
| Difficulty mode | Normal (the only difficulty) and NG+ | — | Story difficulty (removed) | live |
| Finale | Sleepless Spire and Morrow's Throne | — | — | later |
| NG+ | New Game Plus: Morrow dreams again | — | — | later |
| Prologue | Whispering Vale: wake, tutorial | — | — | live |

## 16. Maps, zones, sections and set pieces
| Term | Meaning | Code id | Not | Status |
|---|---|---|---|---|
| Bramblehorn's Clearing | Boss arena in Pinewood | — | — | live |
| Brazier | Lightable world object | — | — | live |
| Broken Stair | Ruins set piece | — | — | M4b |
| Checkpoint shrine | Respawn and warp point | `shrine` | — | live |
| Dream Arena | Vale section reached by bridge | — | — | live |
| Dreamer's bed | Start shrine in the Vale | — | — | live |
| Dreamer's Cairn | Tall Vale stack, levels 4, 9, 14 | — | — | live |
| Drifting Isles | Eighth zone, optional | — | — | later |
| Drop-down ledge | One-way ledge you step off to a lower level | — | — | live |
| Drowned Vault | Vault section | — | — | later |
| Elite pocket | A small elite encounter (2 to 3 per map near the boss) that guarantees a Rare of at least boss ilvl minus 2 on first clear | — | — | M4b |
| Emberfall Caldera | Zone 5 | — | — | later |
| Fox Warrens | Pinewood underground section | — | — | live |
| Gloomspire Ruins | Zone 3; Act II | — | — | M4b |
| Hawk's Rest | Pinewood vantage, height 16 | — | — | live |
| Misty Pinewood | Zone 2; Act I | — | — | live |
| Mockup arena | Hand-written test map of at most 32x32 tiles in which the studio tests systems, enemies and bosses; the studio makes no zone maps | `js/arenas.js` (`ARENAS`) | test map; arena map | M4b |
| Moon Pond | Vale section behind a key gate | — | — | live |
| Morrow's Throne | Final map | — | — | later |
| Pip's Lanterns | Vale bridge section | — | — | live |
| Placement brief | Per-zone checklist for the client: sections, hooks, pacing numbers, encounter slots, secrets, set pieces, signature moment (no coordinates); data in `zones.json` | `docs/design/world-brief.md`, `handoff/data/zones.json` | level design; map spec | M4b |
| Rift | Portal between maps; `home` and `next` | `home` `next` | Portal; Warp door (different term) | live |
| Rim Walk | Set piece | — | — | client |
| Root Hollow | Pinewood vault section; Mossjaw's den | `rootHollow` | — | live |
| Root ladder | Ladder object that climbs between levels | — | — | live |
| Section | Named part of a zone (outer, under, vault, arena) | — | — | live |
| Set piece | Tall hand-built landmark or vantage | — | — | live |
| Sleepless Spire | Zone 6 | — | — | later |
| Stone's Crown | Vale summit | — | — | live |
| Sunken Grotto | Zone 4 | — | — | later |
| Tide Well | Set piece | — | — | client |
| Vantage | A high viewpoint set piece, e.g. Hawk's Rest | `vantage` | — | live |
| Oath Reliquary | Ruins vault section; the Oathless's den | — | — | client |
| Warden Crypt | Vault section | — | — | client |
| Warden's Hall | Ruins guardian arena; the Gloam Warden | — | — | client |
| Whispering Vale | Zone 1, the hub | — | — | live |
| Zone | One of the eight areas of the world; the client builds each in Godot | — | Big map (retired) | live |

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
| Recommended ilvl | Boss-door text "Recommended ilvl N, yours M": information, never a lock | — | — | M4a |
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
| God mode | Bot flag `?god`: the hero takes no damage; blocker hunts only, never the ship gate | `--god` | invincible run | M3 hot-fix |
| Turbo | Bot lockstep fast-forward: the sim advances only when the Bot steps it, no rendering | `--turbo` `?turbo` | god mode (that is invincibility); speed hack | M3 hot-fix |
| Director | Orchestrating role who merges and rules | — | — | live |
| Dressing room | Forge preview page | `tools/forge/preview.html` | — | M4a |
| ELFX | Effects registry and renderer (rim light, shadows, rays, fog) | `elfx.js` | — | live |
| Forge | Deterministic sprite generator | `tools/forge/` | — | M4a |
| Forge bank | Packed sprite data | `js/forge-bank/` | — | M4a |
| Forge runtime | In-game compositor of forge banks into a cached sheet per loadout | `js/forge-rt.js` (`FORGE`) | — | M4a |
| Unit | One forge layer baked on its own: body, hair or a gear piece | — | — | M4a |
| Core sheet | A unit's sheet with every anim except attacks | `<unit>.core` | — | M4a |
| Atk sheet | A unit's attack anims for one weapon class | `<unit>.atk.<class>` | attack sheet | M4a |
| Line bank | One gear line's tier file in the forge bank | `js/forge-bank/<line>.t<N>.js` | — | M4a |
| Forge enemy | Enemy drawn from forge banks (8 true directions); others still use the old sprite | `js/forge-bank/<rig>.js` | — | M4a |
| Quadruped rig | Shared four-legged forge rig and anims for beasts | `tools/forge/models/quadruped-anims.js` | beast rig | M4a |
| Die sheet | A unit's hit and death anims in their own sheet | `<unit>.die` | — | M4a |
| Flat depth | Forge option: one depth value per body part, for smaller banks | `flatDepth` | — | M4a |
| FORGE_FX | Forge table of tier and rarity effects per item line (geometry per tier, palette, rim light and emitters per rarity) | `FORGE_FX` | — | M4a |
| Raster art | Painted art outside the forge (wordmark, dialogue portraits, key art), embedded as data-URI PNGs | `js/art-raster.js` (`RASTER`) | forge art | M4b |
| Lane | One parallel work stream | — | — | live |
| Milestone | Delivery step: M1 to M8 | — | — | live |
| `ref` rig | Hero-frame skeleton: 32 px body in a 48 px frame | — | — | M4a |
| Rim light | Edge highlight on sprites | — | — | M4a |
| Rim mask | Forge export: an 8-way outward-normal mask per sprite that the runtime tints by the dominant light | — | — | M4a |
| Save version | Save format: v4 live, v5 with Loadout v3 | `SAVE_VERSION` | — | live |
| Side-by-side board | Reference vs forge approval board (M4a gate) | — | — | M4a |
| Socket (forge) | Attachment point on the rig: handR, handL, head, chest, cast, weaponTip, offhandTip | — | — | M4a |
| Wind field | Runtime wind: `WIND.sample`, emitters (vector, radial, pull, blast, zone) | `js/wind.js` | — | M4a |
| Handoff package | The folder of everything the studio delivers for the client's Godot port: art, tiles, data, audio, docs | `handoff/` | export folder | M4b |
| Sidecar | JSON beside each sheet PNG: cell, origin, dirs, anims, sockets, layer, zorder, palette | `<sheet>.json` | metadata file | M4b |
| Terrain set | Godot TileSet terrain ("Match Corners and Sides") filled from a blob-47 template | `terrain_<name>.png` | autotile | M4b |
| Blob-47 template | The standard 12x4 layout of the 47 neighbour configurations of a terrain, plus 4 plain variants | `blob47` | wang tileset | M4b |
| Skirt | The hanging underside band of a floating island's edge (roots, lobes, fade); exported as the coast atlas | `coast.png` | — | M4b |
| Peering bit | Godot terrain neighbour flag on a tile; the importer fills them from the blob-47 sidecar | — | — | M4b |
| Zone record | One editable zone entry (name, theme, palette, terrains, cliff/coast/water files) | `handoff/data/zones.json` | — | M4b |
| Depth split | A gear piece exported as two sheets, drawn under and over the body | `_front` `_back` | layer split | M4b |
| Export manifest | Per-file sha256 list; a file whose hash differs was hand-edited and is skipped on rerun | `handoff/art/manifest.json` | export log | M4b |
| Godot pivot | Client ruling 2026-10-23: the studio makes no maps; the client builds every zone in Godot | — | Godot port-ready rules (dropped, now reversed) | M4b |
| Godot port | M10: the studio rewrites the game code in GDScript into the playable Godot project | `godot/` | GDScript rewrite | later |
| Port spike | M5 proof of the Godot port: hero movement, one line's hand action and spell, one status ladder, the Ogre, checked against golden vectors | `godot-sample/` | — | later |
| Action block | M10: one editable step of a Godot skill (projectile, cone, zone, dash, status build, VFX, SFX…); a SkillData is a list of them | `SkillData` | skill node, blueprint node | later |
| Data table | M10 Godot editor dock: every data table (enemies, items, skills, loot…) as an editable spreadsheet | — | blueprint | later |
| Editor-first authoring | M10: every game object is a Godot Resource or scene, edited in the Inspector and placed by drag and drop | `.tres` | blueprints | later |
| Golden vector | A recorded input and output of a JS function (damage, build, reaction, roll) that the GDScript port must reproduce | — | — | later |

## 20. Retired terms
| Retired term | Replaced by | Code id | Retired by | Status |
|---|---|---|---|---|
| Big map | Zone (the client builds it in Godot) | — | Godot pivot 2026-10-23 | retired |
| Changeover | removed (OFFHAND is the second weapon) | — | meeting 4.6 | retired |
| Character skills 1 / 2 / 3 | Pages (re-homed casts) | `CHAR_SKILLS` | meeting 4.6 | retired |
| Dream Tomes | removed (pages replace them) | — | meeting 4.6 | retired |
| Dreamy Editor | removed; the client builds zones in Godot (`editor.html`, `js/editor.js` deleted) | — | Godot pivot 2026-10-23 | retired |
| HUD skill bar (old) | Skill bar (4 groups of 3) | — | meeting 4.7 | retired |
| Level lane | Arenas lane (mockup arenas) and Export lane (tiles); Docs lane (placement brief) | — | Godot pivot 2026-10-23 | retired |
| Modifier slots | removed (second form replaces them) | — | meeting 4.5 | retired |
| Potion slot | Pockets | `potion` | meeting 4.6 | retired |
| Q / E / R rune alternates | Pages | — | meeting 4.6 | retired |
| Shift dodge | Boots key (V) | `dodge` | client ruling 1 | retired |
| Slice (vertical) | Mockup arenas (the M4a Vale and Pinewood scope is gone with the Act I maps) | — | Godot pivot 2026-10-23 | retired |
| Spellbook (hand weapon) | Grimoire (companion); Wand takes the Foci 1H seat | `spellbook` | meeting 4.3 | retired |
| Two weapon slots | HAND and OFFHAND | — | meeting 4.6 | retired |
| Story difficulty | Removed; Normal is the only difficulty | `difficulty` | client 2026-10-22 | retired |
