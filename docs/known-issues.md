# Known Issues — Minefield

## Active Issues

*(none)*

## Resolved Issues

### `createGame` could return an unsolvable field when every reroll failed (former P0)

- **Resolved:** 2026-07-03 with a deterministic **carve repair** (`carveSafePath` in `game.ts`).
- **What happened:** raw unsolvability rises steeply with mine density — measured ~1% of raw boards at
  L1, ~53% at L3, **~90% at L4+** — so all `MAX_FIELD_ATTEMPTS` (64) rerolls could fail together and
  `createGame` shipped the last (unwinnable) board: measured **~0.7% of L4+ calls, seeded dailies
  included**. This is also what made the "random (unseeded) fields are always solvable" test flake —
  it was a real bug, not statistical noise.
- **Fix:** the reroll loop stays as the fast path; if the last attempt is still sealed, a BFS over
  solid-free cells (mines allowed) finds the shortest entry→exit route and defuses exactly the mines
  on it. Deterministic (fixed BFS order, no RNG) → a repaired daily is identical for everyone;
  already-solvable fields are never touched. "Always winnable" is now a construction guarantee.
- **Regression coverage:** `src/game.test.ts` — the three hunting seeds (`hunt3:187/574/1680`) that
  reproduced it stay solvable; a repaired daily is byte-identical across calls; validated on a
  9 000-field sample (0 unsolvable).

### Respawn keeps `runState='running'` (no idle re-scout after death) — resolved by design decision

- **Resolved:** 2026-07-03, **by owner decision — this is intended behaviour**, not a bug. Death costs
  you the scout: after a mine death you respawn at the entry with the run still `running` and the timer
  ticking; the free idle scout exists only at the start of a level. See `ROADMAP.md` (Decisions,
  2026-07-03).
- **Follow-up:** state this on the future RULES screen (ROADMAP P1/P2 #8) so players read it as a rule,
  not a bug.
- **Companion note (unchanged, negligible):** `revealsUsed` is not reset on respawn — reveal is
  idle-only and daily = 0, so impact is nil (`ROADMAP.md` Technical Debt, P4).

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
