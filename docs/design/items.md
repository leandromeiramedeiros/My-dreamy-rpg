# Items: bases, rarity, affixes, gems, trinkets, uniques

Terms: [../GLOSSARY.md](../GLOSSARY.md). Names: [names.md](names.md). Power budget and caps: [balance.md](balance.md).
Slots and Grips: [loadout.md](loadout.md). Looks: [visual-bible.md](visual-bible.md).

## Item schema
`{uid, base, slot, rarity, ilvl, reqLvl, affixes:[{stat, v, tier}], sockets, implicit, boon, hist:{found, kills, bossKills, tempered}, tempered}`
* Bag: 30 slots (6x5). Salvage returns Dust; gems return to the bag.
* Tooltip v2: at most 12 lines. Name format: `[prefix-tier name] [base] [of the suffix noun]`.
* 500 kills with a weapon unlock a cosmetic trail.

## Tiers and levels
* Gear tiers T1 to T5 need level 1/8/16/24/32; Mythic needs 36. Three named affix tiers gate by ilvl 1/14/28.
* `req = max(base, ilvl - 2)`. Drop ilvl is the enemy level +-2. From ilvl 20, an item may roll max sockets.
* One implicit per base tier.

## Rarity
| Rarity | Multiplier | Colour | Sockets | Affixes |
|---|---|---|---|---|
| Common | 1.00 | `#d8d8d8` | 0 to 1 | 0 |
| Uncommon | 1.15 | `#6ee36e` | 1 | 1 |
| Rare | 1.35 | `#5aa8ff` | 1 to 2 | 1 prefix + 1 suffix |
| Epic | 1.60 | `#c070ff` | 2 to 3 | 3 (2P+1S or 1P+2S) |
| Legendary | 1.90 | `#ffb030` | 3 | 2P + 2S + a unique rule |
| Mythic | 2.30 | `#ff4f7a` (animated) | 3 | 3P + 2S + a rule |

A Socket Rune adds one socket (max 3). Colour-blind shapes: [controls.md](controls.md).

## Affixes
* Prefixes: power, crit, critDmg, haste, skillDmg, cdr, element %, statusChance, Mark cap, charge speed.
* Suffixes: hp, def, regen, mpRegen, speed, resists, resAll (Legendary and up), on-dodge and on-kill triggers (Epic and up).
* Temper: 20 / 60 / 150 Dust (Rare / Epic / Legendary and up). Once per item; raises one affix a tier.
* Imbue: adds a socket for Dust. No affix reroll. No other crafting.

## Drops
* About every third kill drops an item. Room clear: at least Uncommon. Elite: Rare or better.
* Mini-boss: a guaranteed Epic with at least 2 sockets. Boss: a named Legendary. Morrow: a Mythic.
* Elite pockets and the boss-door gear loop: [enemies-bosses.md](enemies-bosses.md).

## Gems
Six types, each in three grades: Chipped, Clear, Radiant. Three of a grade combine into the next at the Elder Stone. Removal is free.
| Gem | Element | Armour | Weapon |
|---|---|---|---|
| Ruby | fire | +HP | +damage |
| Sapphire | frost | +MP | +cdr |
| Emerald | nature | +HP regen | +attack speed |
| Topaz | lightning | +crit | +crit damage |
| Amethyst | arcane / gloom | +power % | +skill damage |
| Diamond | neutral | +def %, all stats | ultimate cooldown |

* Armour gem resists 10 / 20 / 30 by grade (Diamond 5 / 10 / 15 against all).
* A Radiant element gem in a weapon retypes 30% of basic damage (status build x0.3).
* Opal is the wind gem (Breath); its wiring is in [elements-statuses.md](elements-statuses.md).
* Gems add status chance and reaction size ([elements-statuses.md](elements-statuses.md)).

## Trinkets
| Slot | Affixes | Sockets | Role |
|---|---|---|---|
| Ring x2 | prefixes only | 0 | elements and reactions |
| Amulet | 1P + 1S | 1 | ultimate |
| Belt | suffixes only | 1 | boon + 3 pockets (or the Satchel) |

* Trinket reqLvl 1 / 16 / 32. About 12 boons per slot, as `EFFECTS` rows `src:'trinket'`. Boon ids never stack.
* Mythic trinkets drop only in NG+.
* Acquisition: first ring from the first Vale chest, amulet from Bramblehorn's chest, belt from the first secret vault, then 15% of drops.
* Ring resonance: two same-element rings give +25% reaction size and an aura (inside the 50% cap).
* The Origin passive is the starter ring boon. Belt wrap boon: the best gem in chest or boots counts one grade higher.
* Trinket resist caps: +10% per line, +15% resAll total.

## Uniques (cap 20)
* 7 boss or optional-boss drops, 6 trinket uniques, 5 world uniques (vaults or fishing Sunken Chests, built on tags).
* Twice-Told grants Echo (19th). The Stopped Hour grants Hush (20th). Both: [combat-feel.md](combat-feel.md).
* Skill-variant legendaries swap the spell for a sibling variant's spell (one per class, inside the cap).
* Each unique has a fixed implicit or rule plus 2 random affixes. No set items.
* Named: Root-Crown (Snare and Frost Nova root bosses 1 s), Tide-Edge (frost trail, Wet), Cinderstride Boots
  (fire trail, 2 s lava immunity), Morrow's Regret, Kharzul's Anvil, Shardheart Plate (chest, Warden Mythic),
  Pip's Lantern (amulet; ultimate casts twice at 50%; Pip's three-lanterns quest),
  Morrowbane and Dawn Eternal (ultimate resets on a boss phase change).
* Rules are `EFFECTS` rows; ids in `UNIQUES` and `WORLD_UNIQUES`.

## Caps (`CAPS` in recalcStats)
cdr 40, crit 60, haste 50, gear power 150, reaction bonus 50, Mark cap 5, potions 5. Additive sums, one multiply
([progression-economy-saves.md](progression-economy-saves.md)).
