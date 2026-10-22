# Weapons and skills

15 weapon variants in 5 classes. Slot rules, shields, decks and Grips: [loadout.md](loadout.md). Tier names: [names.md](names.md).
Terms: [../GLOSSARY.md](../GLOSSARY.md). Elements and reactions: [elements-statuses.md](elements-statuses.md).

## Class profile
| Class | Variants | Combo | Passive and hold-M1 |
|---|---|---|---|
| Blades (1H) | Sword, Rapier, Mace | 3-hit, 0.42 s, 8 MP per hit, wide third hit | Parry as off-action |
| Greatarms (2H) | Axe, Hammer, Halberd | 2-hit, 0.62 s, 14 MP | Hold M1: Heavy Strike, 1 s, x1.8, poise |
| Shots | Bow, Crossbow (2H), Chakram (1H) | 0.36 s | Hold M1: Focus (still 0.6 s, next shot crits) |
| Foci | Wand, Orb (1H), Staff (2H) | 0.48 s, builds MP | Reactions refund 10% MP |
| Shadows (1H) | Daggers, Claws, Fans | 4-hit, 0.28 s rate, 6 MP | Backstab: +30% crit from the rear 120 degree arc; Marks |

## Skills per variant
Action is the M1 combo. Spell is Q (or E), ultimate is Shift+Q (or Shift+E).
| Variant | Spell | Ultimate | Notes |
|---|---|---|---|
| Sword | Sunslash | Radiant Judgement | Reinforces Shatter and holy |
| Rapier | Flèche | Perforate | Duelist thrusts; Riposte on Parry |
| Mace | Crush | Consecrate | Every hit staggers 1 |
| Axe | Cleave | Colossus Strike (held) | |
| Hammer | Earthbreaker | Aftershock | Stagger 3 |
| Halberd | Sweep | Skewer | Reach x1.5; Sweep pushes wind |
| Bow | Multishot | Rain of Arrows | Tumble adds a 0-damage gust |
| Crossbow | Piercing Bolt | Ballista (1.2 s channel, at most 25% boss HP) | 4-bolt clip, 1 s reload |
| Chakram | Ricochet | Guillotine | Returns and hits twice; Snapshot off-action |
| Staff | Firebolt | Meteor | Hold M1 Channel beam, tap bolt |
| Wand | Frost Shards | Rune of Binding | Bolt action |
| Orb | Chain Lightning | Tempest | Channel drains 6 MP/s; beam DPS at most bolt +15% |
| Daggers | Fan of Knives | Death Mark | Pierce, Marks |
| Claws | Rend | Savage | Frenzy: +5% attack speed per hit, max +50%, decays after 1.5 s |
| Fans | Veil Dance | Thousand Petals | Marks on any hit, each slows 10%; Veil Dance pushes wind |

* Every variant uses at least 3 aim shapes. The channel-beam is the newest shape.
* Mastery and skill ranks: [loadout.md](loadout.md).
* A variant's status bonus is +15% `statusChance`, additive.

## Design intent
* Blades: parry then riposte; the third hit is wide. Decision: stand and counter, or press.
* Greatarms: commit to a swing. Heavy Strike hits hard and holds poise; the worn companion supplies tools.
* Shots: aim, then crit. Control the room from range; Snapshot and Focus reward patience.
* Foci: spend MP on reactions. Cantrips are free; the Staff is the controller.
* Shadows: circle to the rear, stack Marks, burst. Daggers favour backstab; Claws pressure; Fans mark and slow.

## Parity targets
* Weapon variants within +-15% DPS at equal tier. Utility 0.8 to 1.2x of the class mean.
* The loadout search samples 4 kits per class pair (hand x offhand x suit), +-15% at equal tier, no kit above a 60% pick rate.
* Details: [balance.md](balance.md).

## Echo and Hush interplay
* Echo replays the hand action and the Q spell only. Hush replaces the spell of the weapon it rolled on.
  See [combat-feel.md](combat-feel.md).
* Wind casts across the game: at most 3 ([wind.md](wind.md)).
