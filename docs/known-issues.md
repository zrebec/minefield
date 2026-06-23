# Known Issues — Minefield

## Active Issues

### P3 — Respawn keeps `runState='running'` (no idle re-scout after death)

- **Status:** open — owner decision (likely intended).
- **Player impact:** low. After a mine death you respawn at the entry, but the run stays `running`, so
  there is no fresh idle scout and the timer keeps ticking (unlike the start of a level).
- **Reproduction:** start a level (idle), move (→ running), step on a mine, respawn → you are at the entry
  in `running` with the clock still going.
- **Expected (one option):** respawn re-enters `idle` for a brief re-scout, freezing the timer.
- **Actual:** `respawnPlayer` does not reset `runState`; it stays `running`.
- **Notes:** could be a deliberate death penalty. Decide before any change. Related: `ROADMAP.md`
  (Technical Debt). A secondary, negligible companion: `revealsUsed` is not reset on respawn (reveal is
  idle-only and daily = 0, so impact is nil).

### Infra — undici 6.26.0 high `npm audit` warning (bundled in the npm CLI) · dev/CI-only · NOT shipped

- **Status:** open, **unfixable downstream**, waiting on upstream npm. Flagged 2026-06-20. Not a
  player-facing issue. Shared across the ecosystem (anything using semantic-release).
- **Where it comes from:** `undici@6.26.0` is a **bundled dependency of the `npm` CLI**, pulled into the
  **dev** tree by semantic-release (`@semantic-release/npm`). It lives inside the npm tarball.
- **Why it can't be fixed here:** npm bundles its own deps; a downstream project can't override them.
  `npm audit fix` says so itself ("is a bundled dependency of npm … cannot be fixed automatically").
  Verified ineffective (2026-06-20): `audit fix`, `--force`, package `overrides`, nuke + reinstall, global
  npm upgrade. The fix must come from upstream npm bundling a patched undici.
- **Why the real risk is negligible:** dev/CI-only (semantic-release in a trusted GitHub Actions runner).
  **Not in the shipped artifact** — the game ships a static Vite bundle; npm/undici never reach the
  browser. This game's `dependencies` is only `zx-kit`, and zx-kit has zero runtime deps.
- **Plan:** accept; re-check `npm audit` on each release. **Do not re-investigate.**

## Resolved Issues

### `airplanePassIndex` not persisted (airplane sequence reset on reload)

- **Resolved:** 2026-06-23. The seeded airplane pass counter was missing from `MinefieldSave`, so a reload
  restarted the airplane sequence from pass 0 and a reloaded daily run diverged from a non-reloading one.
- **Regression coverage:** `src/save.test.ts` — a run saved at `airplanePassIndex = 3` reloads at 3.

### Score combo survived death

- **Resolved:** 2026-06-23. The score combo (multiplier for continuous safe steps) reset only on timer
  expiry, not on death, so dying mid-combo kept the multiplier. `respawnPlayer` now resets it. (The gem
  backpack is untouched, as intended — collected gems stay collected.)
- **Regression coverage:** `src/player.test.ts` — death resets the combo but leaves the backpack intact.

### Airplane could seal the only safe route mid-run (former P0)

- **Resolved:** 2026-06-23. Every airdrop now runs `isFieldSolvable` and discards any mine that would seal
  the field. Combined with the safe-`visited`-trail invariant, the field is winnable under all
  circumstances. See `ROADMAP.md` (Decisions) and `retro/docs/sk/minefield.md` §6/§7.
- **Regression coverage:** "solvable after 40 seeds × 8 passes" + "guard refuses every sealing drop".
