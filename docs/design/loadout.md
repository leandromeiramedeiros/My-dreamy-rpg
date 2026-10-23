# Loadout v3: Lead / Support

Nothing is learned; everything comes from what Aerin wears. The HAND item leads, the OFFHAND item supports.
Terms: [../GLOSSARY.md](../GLOSSARY.md). Skills per line: [weapons-and-skills.md](weapons-and-skills.md). Keys: [controls.md](controls.md).

## Slots and skills
* Slots: HAND, OFFHAND, head, chest, boots, ring1, ring2, amulet, belt-or-satchel.
* Each item line (weapon variant, shield, companion) has exactly 3 skills: action, spell, ultimate.
  They never change with tier or rarity. Tier and rarity change numbers, sockets and looks.
* HAND item: M1 action, Q spell, Shift+Q ultimate. OFFHAND item: M2 action, E spell, Shift+E ultimate.
* The hand action is the combo: builds MP (8 per hit), carries the class passive. The offhand action is the class
  off-action: no MP, costs stamina. Spell and ultimate are identical in either slot.
* One shared ultimate charge bar. Pages share a 1.0 s casting rhythm.
* Armour pieces host the three actives (head R, chest F, boots V). See [armour-suits.md](armour-suits.md).

## Slot matrix
| Item | Hands | Fits | Off-action (M2) |
|---|---|---|---|
| Blades: Sword, Rapier, Mace | 1H | HAND or OFFHAND | Parry: 0.25 s window, riposte stagger 3, ICD 1 s |
| Shadows: Daggers, Claws, Fans | 1H | HAND or OFFHAND | Step: 0.6-tile sidestep, backstab mark, no i-frames |
| Chakram | 1H | HAND or OFFHAND | Snapshot (the only 1H Shot) |
| Foci 1H: Wand, Orb | 1H | HAND or OFFHAND | Ward: hold a mana shield, pops to a nova on release |
| Greatarms: Axe, Hammer, Halberd | 2H | HAND | worn companion only; hold M1 = Heavy Strike (1 s, x1.8, poise) |
| Shots 2H: Bow, Crossbow | 2H | HAND | hold M1 = Focus |
| Staff | 2H | HAND | hold M1 = Channel beam, tap = bolt |
| Shields: Buckler, Heater, Tower | 1H | OFFHAND only | the shield's own action |
| Companions: Grimoire, Quiver, Warhorn | worn | OFFHAND with a 2H or 1H | the deck's action |

* Empty offhand is allowed. With a 1H: M2 is the class off-action x1.0, E and Shift+E empty. With a 2H: M2, E, Shift+E empty.
* Active keys: 1H + 1H, shield or companion = 6. 2H + companion = 6. 2H alone = 3. 1H alone = 4.
* Class off-passives: Blades parry window +0.1 s; Shadows Step leaves a decoy at T3+; Foci cantrips cost 0 MP;
  Shots snapshot crits; Shields block costs stamina, not HP; companions none.

## Shields
| Shield | Action | Spell | Ultimate |
|---|---|---|---|
| Buckler | Parry+ (0.35 s; reflects projectiles at T3+) | Bash (stagger 2, short dash) | Aegis (3 s; parries restore 10% HP) |
| Heater | Block (70% front, poise) | Shield Bash (reflect mid-dash) | Bulwark Charge (carry the first enemy hit) |
| Tower | Wall (100% front block, speed x0.5, projectiles stop, 8 stamina/s) | Shove (line knockback, wind emitter) | Fortress (4 s dome blocks projectiles) |

## Companions: decks
A companion is a deck. Its action cycles or primes, its spell fires the active entry, its ultimate fires them all.
| Companion | Action | Spell | Ultimate | Entries |
|---|---|---|---|---|
| Grimoire (mage) | Turn: next page + 0-MP cantrip | Cast the active page | Chapter: every page over 1.5 s | Pages |
| Quiver (ranger) | Nock | Loose | Quiver Storm | Arrows: Venom, Fire, Frost, Bola, Grapple, Split, Explosive |
| Warhorn (warrior) | Bellow (guard-break, stagger 1) | Call | Last Stand: 4 s poise +30% damage, then -20% speed 3 s | Calls: War Cry, Rally, Taunt, Quake-call, Stand |

* Pages, arrows and calls are items. Capacity by companion tier: 2/3/4/5/6/6.
* They are socketed in the bag, stack by id, and sort into a "Pages" tab.
* They are re-homed cast functions (zero new casts), about 40 in all: mage ~18, ranger ~10, warrior ~8, 4 shared.
* The Elder Stone sells one per zone. More turn up at lore tablets, vaults and bosses.

## Grips
A Grip is a named pairing. It is an `EFFECTS` row (`src:'grip'`), matched by tags, never by slot checks.
Each is a Codex discovery, shown as a glint and an aura. About 14:
Sword+Buckler Vanguard; Daggers+Daggers Twin Fangs; Wand+Orb Twin Stars; Staff+Grimoire Archmage;
Bow+Quiver Fletcher; Axe+Warhorn Warband; Rapier+Fans Dancer; Mace+Heater Sanctuary; Hammer+Warhorn Faultline;
Chakram+Orb Lodestar; Claws+Buckler Cornered; Sword+Grimoire Spellblade; Halberd+Quiver Hedgewall;
Crossbow+Quiver Siegeworks (the M4b naming pass replaced the colliding Hunter, Orbit, Pike Square and Arbalest).
* The Combo Codex tab sits beside the Bestiary and reveals a Grip on its first trigger.

## Unlocks and ranks
* Variant mastery ranks 1 to 5 by kills. Rank 3 unlocks the spell's second form. Rank 5 adds a hybrid twist
  (Sword Judgement staggers, Rapier Riposte reflects, Hammer cracks last 6 s, Orb beam Conducts, Crossbow clip 6).
* Skill ranks 1 to 5 by use: +6% per rank.
* Suit twists apply at 3 pieces ([armour-suits.md](armour-suits.md)).
* Skill-variant legendaries swap the spell for a sibling variant's spell ([items.md](items.md)).

## Origins
Knight, Mystic, Ranger, Thief, Warrior each give a starter kit and a small passive. Re-choosable once at the Elder
Stone. The passive is the starter ring boon. Chest by origin: Knight Warden, Mystic Dreamweave, Ranger Stalker,
Thief Shade, Warrior Juggernaut. The Origin ring is found, never pre-equipped.

## Pockets, belt, satchel
* Three pockets, keys Z / X / C. They hold potions, bombs, traps, flasks and oils.
* Belt: boon + 3 pockets. Satchel: 3 pockets + tools and +1 bag row, no boon. They share one slot.

## Skill bar
Four groups of 3, 44 px each, gap 14, 624 px wide from x168 to x792 on the 960 grid:
[M1 Q Shift+Q] [M2 E Shift+E] [R V F] [Z X C]. An uncharged ultimate shows its chord tag dim.
Touch: big attack button (96), second button (72), charge rings, inner arc Q/E, outer arc R/V/F/Z/X/C with a page toggle.

## Resource rhythm
* `mpOnHit` is per class, basic attacks only; cap 40 MP/s from hits.
* Ultimate: one per ~40 s baseline, ~25 s with reactions, floor 18 s. Charge gain at most 5% per hit and 10% per reaction.
* Stamina feeds dodge and off-actions. Dodge cancels any cast after 0.1 s (50% MP refund); attacks cancel into skills.
* Skill gap: damage per MP at most 1.3x; best against worst in a role at most 1.5x.

## Effects engine
* Table `EFFECTS`: `{id, src, when, ifTags, ifState, do, icd, name, hint}`. `when` is cast, hit, kill, dodge,
  statusApplied, reaction or ultimate. An effect never names a skill; it matches tags.
* Skill tags: projectile, zone, dash, nova, cone, line, channel, summon, mark, charge, buff, heal, ultimate, melee, ranged, spin.
  Tooltips show a "Synergises with" line, and an element dot on skills that would react.
* ICD default 0.5 s. Proc coefficients: basic 1.0, projectile 0.6, zone tick 0.3, reflected 0.3, summon 0.4, Echo 0.5.
  Chain depth 2. Reaction damage cap 300% weapon damage per second.
* Live caps: zones 2, summons 3, images 1. Reflected damage at most 40% of power.

## Degenerate-build caps
* Pages cost full MP. One Orb's off-action is Ward. The parry ICD (1 s) is shared by every parry source.
* The Pip's Lantern amulet doubles only the hand ultimate.
* Echo replays the hand action and the Q spell only, never pages or offhand skills ([combat-feel.md](combat-feel.md)).
