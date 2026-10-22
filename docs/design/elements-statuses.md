# Elements, statuses, reactions, world verbs

Terms: [../GLOSSARY.md](../GLOSSARY.md). Code: `js/status.js`. Looks: [lighting-status-fx.md](lighting-status-fx.md). Wind: [wind.md](wind.md).

## Elements
Nine hero elements: slash, pierce, fire, frost, lightning, nature, arcane, holy, wind (story name Breath; short tag `Wi`).
* `shatter` is a damage type only. `gloom` is enemy-only. Wet is a surface flag, not an element.
* Hero resist clamp [-50%, +60%]. Resist tiers and archetypes: [enemies-bosses.md](enemies-bosses.md).

## Status ladders
* Build per hit = `25 * w * proc * (1 + statusChance + elementAmp)`. Weak x1.5, resist x0.5, immune 0, boss x0.25, elite x0.5.
* Tiers at 50 and 100. Decay 20 per second after 1.5 s. Two ladders live per body. Poison stacks to 3, Marks to 5.
* A reaction consumes its ladder and starts a 4 s reaction cooldown (boss 8 s) on tier 2.

| Element | Tier 1 | Tier 2 |
|---|---|---|
| fire | Burning 3 s | Ablaze 4 s |
| frost | Chilled | Frozen 1 s (boss 0.25 s, never twice in 8 s) |
| lightning | Jolted | Shocked 2.5 s |
| nature | Poisoned 5 s | Rooted 1.2 s |
| arcane | Marked (stacks to 5) | Unravelled |
| holy | Smitten | Dazzled 1.5 s |
| slash | Bleeding | Rent |
| pierce | Pierced | Pinned |
| wind | Buffeted | Lifted 0.8 s (elite 0.4 s, boss never) |
| gloom | Dread | Gloomed (-10% resists) |

## Hero side
* Tier 2 is never a hard CC on the hero. Frozen becomes Numb (0.5 s root); Lifted is a 1-tile knockback;
  Dazzled turns aim assist off for 1 s; Shocked stops MP regen for 2 s. DoT is 2% max HP per 0.5 s.
* Cleanse via potions, shrines, holy and Dreamveil.

## Reactions (eight)
Shatter, Wildfire, Conduct, Overload, Purify, Rupture, Detonate, Drift. Each has a name pop, an sfx and a motif.
| Reaction | Trigger | Effect |
|---|---|---|
| Shatter | physical hit on Frozen | AoE of damage type shatter |
| Wildfire | fire on Poisoned | Burning spreads 2 tiles |
| Conduct | lightning on Chilled or Wet | Shock jumps to nearby Chilled or Wet bodies |
| Overload | arcane on Shocked | extra damage and cooldown cut |
| Purify | holy on Burning or Poisoned | heals; strong against gloom |
| Rupture | pierce on a full stagger bar | guaranteed crit |
| Detonate | stagger 3 or more on a Burning body | consumes Burn for damage |
| Drift | wind on a body with a tier-1 status | carries the status to bodies in the gust |

* Reaction share of DPS: 20 to 30% (at most 40%).
* Silent interactions: Thaw (fire on Frozen ends it), Quench (frost ends Burning and applies Chilled),
  Flash-freeze (frost on Wet freezes at once, ICD 6 s), Dry (fire or 2 s of wind ends Wet).
* Cascade bound: `viaReaction` 1 s lockout, build x0.5, chain depth 2, reaction damage at most 300% per second.

## Wiring
* Radiant gems, per-element Dream Oil (60 s coat, build x0.3; made at the Elder Stone for Dust), the Opal and consumables.
  Gems: [items.md](items.md).
* Pip's charge: Pip carries a world charge to a receiver within 8 tiles (lit brazier = fire, rime crystal = frost,
  storm crystal = lightning, dawn shrine = holy). The M7 "flare" Dazzles an attacker (ICD 12 s).
* Saves hold no status fields: `e.status` is runtime. `G.prog.state[map][id]` is tolerant of missing keys.

## World verbs
* Receivers: `el:{accept, build, oil}`, hit through `hitReceivers(x, y, r, el, w)`. States change with `setState`.
  Conditions: `object_state`, `element_hit`. Tile patches: `tilePatch{tiles, life}` with `dirtyChunk` (at most 4 chunks).
* Objects (15): torch, brazier, bramble, icewall, seed (vine), conduit, fogbank, windmill, raft, glyph, seal, crystal_wall,
  vent, rime_crystal, storm_crystal; the shrine is a dawn source.
* Ice and obsidian tiles come only from patches. Grass fire: radius 0.7, spreads 0.4 s per tile, cap 16 tiles, 4 emitting, one fire per map.
* Rules:
  * Never gate main progress on a specced element: a world source within 20 tiles or Dream Oil from the Stone.
    The audit fails any main route that needs a `via`.
  * One of the five secrets per map is an elemental secret (skill-only).
  * 3 verb puzzles per big map (1 in the Vale, 0 in arenas). One new verb per section. Nothing is a trap.
  * Lasting states persist; transient ones reset.

## Placement by zone
* Vale: torch room under the Dreamer's Cairn. Pinewood: brambles on the Warrens door, creek freeze, grass-fire boar den.
* Ruins: conduits, a Reliquary holy seal, Belfry glyphs. Grotto: tide pool, Vault ice wall, Shallows crystal wall.
* Caldera: windmill, frozen lava path, four forge braziers. Spire: cloud bank, Vigil Walk seal, void raft.
* Isles: rafts and a three-isle conduit chain.

## Skills touching elements
* Gale (cone gust, Buffeted, Drift carrier) is a Grimoire page. Bow Tumble adds a 0-damage gust. Halberd Sweep, Fans Veil Dance and Orb Tempest involve wind.
* Gravity Well keeps arcane and gains the `vortex` tag. At most 3 wind casts overall.

## CI red flags
A Lifted boss; more than 8 named reactions; a main route that needs a `via`; reaction share above 40% with Drift;
an ice patch over 24 tiles; two grass fires on one map. Full list: [balance.md](balance.md).
