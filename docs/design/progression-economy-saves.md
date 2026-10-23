# Progression, economy, saves

Terms: [../GLOSSARY.md](../GLOSSARY.md). Items and drops: [items.md](items.md). Power curves: [balance.md](balance.md).

## Levels
* Level 1 to 40. `xpToNext(L) = round(60 * L^1.55)`. Each level gives +4% HP and +3% damage. No talent tree.
* Level bands: Vale 1 to 3, Pinewood 3 to 10, Ruins 10 to 17, Grotto 17 to 24, Caldera 24 to 31, Spire 31 to 38. Levels 39 and 40 are optional or NG+.
* Bosses grant 1 level, mini-bosses 0.5. XP falls to 10% once the hero is 3 levels above the band.
* Death: wake at the last shrine and lose 10% of current-level XP. Trigger state persists.
* Hero level at Morrow lands in 34 to 40.

## Stat maths
All bonuses add into one sum per stat, which is multiplied once. Buffs are multiplicative but capped. Caps: [items.md](items.md).

## Drops and pacing
* About every third kill drops. Room clear: Uncommon or better. Elite: Rare or better. Mini-boss: a guaranteed Epic with 2 or more sockets.
  Boss: a named Legendary. Morrow: a Mythic.
* Potions: about 1.2 per room, at most 2 per room.
* Autosave on zone entry, after each boss and on closing the bag.

## Economy
* Dream Dust is the one currency. There is no gold and no merchant; the Elder Stone in the Vale hub is the shop.
* Income about 900 to 1,200 per main path; a completionist earns about 3,000. Planned spend about 700
  (6 tempers, 2 imbues, 3 Chipped gems, 2 runes). Income is about 1.3x spend.
* Salvage gives Dust. Sinks: Temper, Imbue, Dream Oil, pages from the Stone.
* Dust sinks must never exceed income ([balance.md](balance.md)).

## Elder Stone
Hub object. It tempers, imbues, combines gems, sells one page per zone, brews Dream Oil, re-rolls an Origin once,
and trades fish ([world-brief.md](world-brief.md)).

## Modes
* Normal is the only difficulty. After the ending, NG+ offers: enemies x1.6, Mythic rolls everywhere, corrupted elites,
  and a modifiers screen with no NG+-only content.

## Saves
* Three slots. Key `dreamy.save.v1` (slot 1), `dreamy.save.v1.s2`, `dreamy.save.v1.s3`; constants `SAVE_SLOTS = 3`, `SAVE_KEY_BASE` in `js-final:js/items.js`.
* Every read and write is in try/catch. A `version` field and `migrate(save)` upgrade old saves. Loadout v3 raises `SAVE_VERSION` to 5 (it is 4 until that lands).
* Stored: the hero, bag, loadout, `G.prog` trigger state, per-map sections and shrines, fog of war.
* Not stored: status effects, Hush active, runtime timers.
* `node js-final:tools/save-migrate.js` is the save migration gate.

## Fishing
* Spots: 2 per outer map plus 1 hidden. Rods: Twig, Dawn Rod, Cinder, Moonline. Lava fishing needs the Cinder rod; void fishing a Cinder rod with an Amethyst;
  moon fishing is the Vale pond after all Shards are lit.
* Minigame: hold Interact to cast across 3 rings (farther is rarer); bite window 0.8 s (1.0 s with a Sapphire rod); reel against a tension bar (48x6 px);
  1 s in the red snaps the line; a rare fish bursts once and a legendary twice; at most 20 s per catch.
* Catches: 4 commons per zone, 1 rare, 1 legendary (Mossback, Dawnminnow, Frostgill, Cinderkoi, Voidlamprey, Moonmaw). 18 fish plus legendaries. 15% of bites are treasure.
* Cooking at shrine fires gives a 10-minute food buff, kept through death: zone fish +15 resist, rare +10% element damage,
  legendary a unique effect (Moonmaw doubles kill-heal).
* Fishing Log tab in the Bestiary: rewards at 10 / 20 / 30 entries. Elder Stone trades: 3 rare fish for a Clear gem;
  a legendary fish for a pearl slot on a legendary. The rod sits in a non-combat `tool` slot with 1 socket.
* Code: `js-final:js/fishing.js`, state machine `idle, casting, waiting, bite, reeling, caught or snapped` in `G.fishing`; tables FISH, FOOD, ROD.

## Optional content
Quests (1 to 2 per zone, given by NPCs, rewarding a gem or page), vaults, Starlit Shoals (no combat), the Gloaming Below, the Dream Arena.
