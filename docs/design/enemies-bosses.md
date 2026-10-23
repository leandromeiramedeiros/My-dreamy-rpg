# Enemies and bosses

Terms: [../GLOSSARY.md](../GLOSSARY.md). Story and boss lore: [story.md](story.md). Elements: [elements-statuses.md](elements-statuses.md).
Zones (the client's placement brief): [world-brief.md](world-brief.md). Mockup arenas: [arenas.md](arenas.md). Targets: [balance.md](balance.md).

## Rules for new enemies
* A new enemy must add a verb. Palette swaps are banned. A zone variant counts as half an enemy (at most 2 per zone).
* Enemies are data: `{name, sprite, hp, speed, dmg, el, dmgType, stagger, res, tags, parts:[...], params}`.
* 29 named commons (below). Eight directions for every creature with a facing; amorphous and swarm use one.

## Behaviour parts
| Group | Parts |
|---|---|
| Movement (one) | chase, kite, orbit, charge, burrow, teleport, path-bound, stationary, sleep, mimic |
| Attack (1 to 2) | brute, shoot, beam, sniper, bomber, zone-caster, trap-layer |
| Support (0 to 1) | healer (4 s telegraphed heal, at most 30% of target HP), aura-buffer, summon, shield-front, linked |
| Death and group | split, zone-on-death, swarm (counts as one for XP and loot) |

## Commons by zone
This list is the client's brief for what each zone holds; the studio tests each zone's grammar in its `pack-<zone>` arena.
* Vale: Dream Moth.
* Pinewood: Gloom Slime, Shade Hound, Bramble Shaman, Ogre, Thornback Boar, Mountain Troll.
* Ruins: Wisp, Gloom Knight, Grave Chanter, Pillar Mimic, Shadeling Swarm, Void Archer.
* Grotto: Frost Jelly, Tide Crab, Glowfin Shoal, Deepsinger, Lightning Eel, Crystal Sentinel.
* Caldera: Cinder Imp, Slag Golem, Ash Wraith, Forge Priest, Magma Hopper.
* Spire: Vigil Knight (linked pair), Star Archer, Dread Herald, Unmade, Void Bomber.

## Elites
Eight modifiers in one `ELITE_MODS` table: Shielded, Storm, Burning, Rime (Chill aura; the elite is Wet), Gloomed,
Twin (linked copy at 50%), Vampiric, Summoner. Elite: 1.4x size, +150% HP, a guaranteed Rare. Elites never spawn beside healers.

## Encounter rules
* Each pack has 1 anchor, 2 to 4 pressure, 0 to 1 support, 0 to 1 ranged.
* After room 1 every room has a support or ranged enemy that is the correct first target.
* Per zone: one pack combines two supports; one pack is the wrong weapon on purpose.
* No pack has two enemies with the same movement part. Sleepers and mimics: at most once per map, only after a shrine.
  Swarms have a visible source.
* Pacing on the main path: a new enemy every ~4 min, a new verb every 6 min at most. CI data checks flag a 10-minute window
  without a new type and any zone with fewer than 4 movement parts.

## Archetypes and resists
* Armoured: resists slash; resists wind (Lifted becomes Buffeted). Amorphous: resists pierce, weak slash, resists Lifted.
* Ethereal: resists physical, weak holy, lightning and wind. Beasts: neutral.
* Fire-aligned enemies are immune to Burn; frost-aligned are weak to lightning; gloom is weak to holy.
* Hero resist clamp [-50%, +60%]. Enemy tiers: weak -50, neutral 0, resist +50, immune +100 (immune only on bosses, to their own element, never statuses).
| Zone | Deals | Weak to | Resists |
|---|---|---|---|
| Pinewood | slash, nature | fire | nature (trolls resist pierce) |
| Ruins | gloom, arcane, slash | holy, pierce (wisps weak lightning) | arcane |
| Grotto | frost, lightning, pierce | lightning, fire | frost |
| Caldera | fire, slash with stagger | frost | immune Burn (golems resist slash and pierce) |
| Spire | gloom, arcane | holy | gloom |

## Teaching weaknesses without a wiki
* Coloured damage numbers: WEAK large yellow, RESIST small grey, IMMUNE. The first weak or resist hit pops a 1.5 s nameplate,
  then weakness and resist icons show beside the health bar. Boss bars always show weaknesses.
* The bag shows hero resists as an icon row with compare deltas. Status icons are 12x12 (`ICONS.status`): over the enemy
  health bar; for the hero, a row above the skill bar, at most 8, debuffs first.

## Bestiary
About 56 entries (commons, 12 bosses, fish). Each shows an archetype tag with a one-sentence rule, a weak and resist row,
and an automatic "Best reaction" line.
* Hunt milestones: 10 kills reveal the full resist row; 25 give a drop hint and Dust; 50 give +5% damage (`huntBonus`, additive).
* Bosses: a kill unlocks lore 2; 3 kills unlock the move list. A zone's bestiary, fish and tablets form the zone 100% stamp.

## Bosses
Twelve named bosses: 5 minis (Mossjaw, Oathless, Brinemother, Slagheart, Twin Vigils), 5 main (Bramblehorn, Gloam Warden,
Mirelle, Kharzul, Morrow), 2 optional (Sorrel's Echo, Unwaking Child). Lore: [story.md](story.md).
* Multi-bar phases, one HP bar per phase: mini 2, guardian 3, act boss 4, Morrow 5. Damage clamps at the bar's end;
  a 1.2 to 1.8 s transition with an `onEnter` telegraph; a segmented HUD bar.
* Each new phase adds one move, gives one existing move a cunning form (feint, delayed second hit or predicted aim),
  and adds aggression (`windMul` 1.0, 0.85, 0.7 and shorter gaps).
* Fairness: melee-range wind-up at least 0.55 to 0.6 s, and `bossFairness` forbids unwarned lethal hits.
  Bosses may kill in one hit when telegraphed. There is no hit cap.
* Phase shifts: `phases[].res/el` may shift a weakness once per fight and the bar re-reveals it. Mirelle bar 2 floods the arena (Wet), bar 3 is weak to fire;
  Kharzul bar 4 is weak to stagger. Act I bosses do not shift.
* Stagger bar: a break window of 2 s, bar shown. Bosses are never immune to statuses.
* `BOSS_MOVES` is the move library (cleave, slam, volley, charge, voidrain, summon, lavaring, pull, beam, tidewave and more).
  Each boss's loot answers its mechanic: Bramblehorn's root grabs, Mirelle's pull, Kharzul's lava floor, Morrow's void tiles.
* Kharzul takes at most two of Cinderheart's mechanics (never the brazier charge); the rest go to other bosses as cunning forms.
* Morrow: P1 sword-knight, P2 dream-warp (void tiles), P3 giant form with starfall; Pip's Dawn Burst ends it.
* Vault bosses are built cheaply from common rows at boss scale with 2 elite modifiers.
* Each boss has one `boss-<id>` mockup arena with the shape it needs; death in an arena respawns at its shrine and the arena resets.

## Gear loop at the boss door
* The door shows "Recommended ilvl N, yours M": information, never a lock.
* Elite pockets (2 to 3 per map near the boss) guarantee a Rare of at least (boss ilvl - 2) on first clear, themed on the boss's weakness.
* Retry takes about 20 s by shrine-to-boss warp. Balsim target: at one gear tier lower, 3 to 4 of 6 runs win; at reference, 6 of 6.
