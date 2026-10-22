# Armour and suits

12 suits in 4 classes, 3 pieces each (head, chest, boots) = 36 pieces at 6 tiers. Tier and Mythic names: [names.md](names.md).
Terms: [../GLOSSARY.md](../GLOSSARY.md). Loadout keys: [loadout.md](loadout.md). Elements: [elements-statuses.md](elements-statuses.md).

## Actives
Each piece hosts one active: head = R, chest = F, boots = V. The boots active is the dodge.
Order in the tables below: chest / head / boots. Skills never change with tier or rarity.
Every boots skill keeps at least 0.25 s of i-frames (dodge, leap, blink, slide, sidestep, carry, roll, pass-through).

## Classes
| Class | Profile | Resists | 3-piece rule |
|---|---|---|---|
| Heavy | HP, defence | slash and pierce +25, lightning -25 | melee skills gain poise |
| Caster | MP, power | arcane +25, physical -25 | zones follow you |
| Medium | crit, haste | pierce +25, fire -25 | projectiles pierce once |
| Shadow | speed, crit | pierce +25, nature -25 | dashes leave decoys |

## Suits
| Suit | Chest / Head / Boots | Reinforces and decision |
|---|---|---|
| Warden | Bulwark (reflects projectiles from T3+) / War Cry / Charge | Stagger, Rupture. Face the volley |
| Crusader | Consecrated Guard (holy zone) / Judgement Bell / Vault | Purify, holy. Zone or chase |
| Juggernaut | Brace (poise, then shove) / Ground Slam (cracks) / Bull Rush (carries an enemy, 0.25 s i-frames) | Stagger, Shatter, Detonate. Tank the hit on purpose |
| Dreamweave | Mana Surge / Arcane Ward (shield pops to a nova) / Blink | Overload. Shield or nova |
| Frostweave | Winter's Veil / Frost Nova / Glide (frost trail) | Chill into Shatter. Where you leave ice |
| Stormweave | Static Cloak / Stormcall / Flash Step (lightning line) | Shock, Conduct. Take hits to charge |
| Stalker | Shadow Veil / Hunter's Mark / Tumble | Rupture, Focus. Open from stealth |
| Thornwarden | Briar Mantle / Mend (Bloom) / Root Vault (leaves a snare) | Poison into Wildfire. Kite through snares |
| Duelist | En Garde (parry, shares the Rapier Parry ICD) / Taunt / Side-step (cd 3) | Rupture, Shock. Parry or dodge |
| Shade | Fade Step / Smoke Bomb / Shadowstep (decoy) | Marks, Overload. Where the decoy stands |
| Nightshade | Venom Coat / Toxin Flask / Slink (backstab from any angle) | Poison into Wildfire. Spread or stack |
| Mirage | Mirror Image / Dreamveil / Phase (pass through enemies) | Control, summons. Images as decoys or damage |

* Dreamveil sits on the Mirage head.
* Origins give the T1 chest: Knight Warden, Mystic Dreamweave, Ranger Stalker, Thief Shade, Warrior Juggernaut.

## Suit twists and full-dream bonus
* Three pieces of one suit grant the suit twist, an `EFFECTS` row (`src:'suit'`).
  Examples: Juggernaut poise never breaks below 25% HP; Stormweave Conduct jumps +1.
* Full-dream bonus: three pieces of a family plus the matching weapon apply the tag rule to trinket boons ([items.md](items.md)).
* Piece look and tier FX: [visual-bible.md](visual-bible.md).

## Balance rules
* eHP within +-10% inside a class. Utility 0.8 to 1.2x of the slot mean. No slot variant above a 60% pick rate.
* Total i-frame uptime at most 50%. Poise at most 75%. Summon cap 3 for images, decoys and summons together.
* Suit resists shift at most +-10% toward the suit element. The hero clamp [-50%, +60%] still applies.
* Poise, i-frames and summon caps are CI-checked ([balance.md](balance.md)).
