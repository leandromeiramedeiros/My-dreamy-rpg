# RESUME — where work stands

Open a new Claude Code chat on this repo. It is the game director (rules: `CLAUDE.md`), and picks up from here.
Plan and lanes: `docs/PRODUCTION.md`. M4 vision and client rulings: `docs/meetings/2026-10-22-studio-experts.md`.

## State (2026-10-22)
- M3 is live on Pages. Suites run on the local Windows box (smoke, play.js green).
- **M3 hot-fix lane** (branch `claude/m3-hotfix`): QA bot `run-big.js kbm all` must reach the end of Act I; first stall
  at Pinewood r2 ("Find the root door of the Hollow") after a shrine warp, then the Hawk's Rest summit drop. Verify the
  ship gate, merge to the default branch.
- Studio Experts meeting held; client rulings recorded; M4a/M4b planned.
- `docs/GLOSSARY.md` being built (enforced per CLAUDE.md).

## Next, in order
1. Merge the hot-fix once the full ship gate passes.
2. Cut the M4a branch; start the **Forge** lane (hero recreated from the SlyNyrd blog images, kept git-ignored) and
   the **Cleanup + Docs** lane. Loadout, Lighting + status and Wind follow per PRODUCTION.md.
3. After every open branch merges: purge `tools/qa/old` from history (git filter-repo + force-push; client-approved).
