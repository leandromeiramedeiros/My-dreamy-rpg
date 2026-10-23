# Pillars and hard rules

Terms: [../GLOSSARY.md](../GLOSSARY.md). Everything else under `docs/design/` is listed in [INDEX.md](INDEX.md).

## Pitch
The Dream is unravelling. Aerin, a Dreamer, wakes on a floating island and fights through five zones to relight the
four Dawn Shards before Morrow, the Unwaking King, stops the dawn for good. Story: [story.md](story.md).
A short action-RPG with Diablo-style loot (rarity, sockets, gems) where gear visibly changes the hero.

## Pillars
* You are what you wear: every skill comes from equipment ([loadout.md](loadout.md)).
* Gear is readable: tier changes the shape, rarity changes the glow ([visual-bible.md](visual-bible.md)).
* Telegraphed danger: anything that can kill you is announced ([enemies-bosses.md](enemies-bosses.md)).
* Elements are a language, taught in play and never gated ([elements-statuses.md](elements-statuses.md)).
* One difficulty (Normal) plus New Game Plus.

## Hard technical rules
* The JS build runs from `file://`: classic scripts with shared globals. No ES modules, no bundler, no npm runtime dependencies. It is the reference implementation.
* A new js file is added to `index.html`.
* Scene 480x270 scaled 2x with nearest neighbour; the HUD is 960x540.
* The studio builds the game minus the world: systems, tables, sprites and audio, tested only in mockup arenas ([arenas.md](arenas.md)).
  The client builds every zone in Godot ([world-brief.md](world-brief.md)). The handoff package `handoff/` is the deliverable ([../PORTING.md](../PORTING.md)).
* Assets are PNG sheets + JSON sidecars on disk, embedded into the JS build by `tools/export/embed.js` ([asset-pipeline.md](asset-pipeline.md)).
  Every asset is human-editable; no binary-only formats.
* 60 fps. Particle hard cap about 600. Perf budgets: [lighting-status-fx.md](lighting-status-fx.md).
* `node tools/smoke.js` must pass; the full gate is `node tools/check.js` ([balance.md](balance.md)).
* Saves: key `dreamy.save.v1` for slot 1 (slots 2 and 3 use `.s2` and `.s3`), always in try/catch, with an internal
  `version` field and `migrate(save)`. See [progression-economy-saves.md](progression-economy-saves.md).
* Docs under `docs/design/` state current truth only, at most 150 lines each; `names.md` is exempt.

## Rejected
Crafting beyond Temper and Imbue, reputation, a day and night clock, mounts, extra minigames, set items, talent trees.
