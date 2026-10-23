# Design index

Current truth only, one system per file, at most 150 lines each (`names.md` is exempt). Read your lane's files, not all of them.
Canonical names: [../GLOSSARY.md](../GLOSSARY.md). Lanes and rulings: [../PRODUCTION.md](../PRODUCTION.md). Port contract: [../PORTING.md](../PORTING.md).
Lanes: Forge, Loadout, Lighting, Wind, Gear art (A suits, B weapons), Enemy forge, Arenas, Export, Elements (the `verbs` arena), Balance and QA, Docs.

| File | Covers | Read by |
|---|---|---|
| [pillars-and-rules.md](pillars-and-rules.md) | pitch, pillars, hard technical rules, rejected ideas | all lanes |
| [progression-economy-saves.md](progression-economy-saves.md) | levels, drops, Dream Dust, Elder Stone, modes, saves, fishing | Loadout, Balance, Arenas |
| [loadout.md](loadout.md) | Lead/Support slots, slot matrix, shields, decks, Grips, pockets, EFFECTS engine | Loadout, Gear art B, Balance |
| [weapons-and-skills.md](weapons-and-skills.md) | weapon classes, skill table per variant, parity targets | Loadout, Gear art B, Balance |
| [armour-suits.md](armour-suits.md) | 12 suits, actives, resists, twists | Loadout, Gear art A, Balance |
| [items.md](items.md) | item schema, tiers, rarity, affixes, gems, trinkets, uniques, caps | Loadout, Gear art, Balance |
| [names.md](names.md) | tier-name tables for weapons, suits, Mythics | Gear art A and B, Forge |
| [combat-feel.md](combat-feel.md) | hitlag, death fling, standing rules, Echo, Hush | Loadout, Lighting, Balance |
| [enemies-bosses.md](enemies-bosses.md) | 29 commons, elites, archetypes, encounters, bestiary, bosses | Enemy forge, Arenas, Balance |
| [elements-statuses.md](elements-statuses.md) | elements, ladders, statuses, eight reactions, world verbs | Arenas, Lighting, Loadout, Balance |
| [visual-bible.md](visual-bible.md) | art style, hero scale and rig, 8 directions, forge pipeline, tiles, rarity FX | Forge, Export, Gear art, Enemy forge |
| [asset-pipeline.md](asset-pipeline.md) | sheet grid, sidecar schema, depth split, tiles, palettes, manifest, embed step | Export, Forge, Docs |
| [lighting-status-fx.md](lighting-status-fx.md) | runtime status and lighting layers, ELFX, budgets | Lighting, Forge |
| [wind.md](wind.md) | wind field, `WIND.sample`, emitters, push per resistance | Wind, Lighting |
| [world-brief.md](world-brief.md) | placement brief per zone: sections, pacing, secrets, set pieces, opening timeline; data in `handoff/data/zones.json` | Docs, Arenas (the client builds from it) |
| [arenas.md](arenas.md) | mockup arenas: ids, sizes, authoring rules, what each asserts | Arenas, Balance and QA |
| [hud-ui.md](hud-ui.md) | HUD layout, screens, touch wheel, aiming, `js/ui.js` | Loadout (UI), Docs |
| [controls.md](controls.md) | input abstraction, hotkeys on three devices, focus model, accessibility | Loadout, Docs |
| [audio.md](audio.md) | music motifs, zone palette, engine, SFX recipes, mixing | Audio work, Export |
| [story.md](story.md) | premise, endings, beat sheet, boss lore and moves, `BOSS_MOVES` | Enemy forge, Docs |
| [balance.md](balance.md) | power points, reference curves, CI red flags, ship gate | Balance and QA, all content lanes |
