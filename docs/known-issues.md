# Known Issues — Minefield

## Active Issues

*(none)*

## Resolved Issues

### Walking over a crater erased it — the record of where a mine went off was lost

- **Resolved:** 2026-08-08 in `commitMove` (`player.ts`): the exploded crater joins the visited
  trail as an **already-walked** cell, so it is never rewritten. `TILE_EXPLODED` also stopped
  borrowing the blast animation's sprite — it is now its own hand-drawn grey grave cross
  (`GRAVE_CROSS` in `sprites.ts`), because a permanent marker and a transient explosion should not
  look the same.
- **What happened (owner's report):** step onto a crater and `commitMove`'s `setTile(visited)`
  replaced it with plain trail. The player then had no way to see where they had actually lost a
  life — information they paid for with that life, and information the field offers nowhere else.
  Same rewrite-eats-state class as the flag bug below, and it also silently unlocked flagging on
  that cell (`toggleFlag` refuses craters, but the cell was no longer a crater).
- **The catch:** permanence alone would have opened a score farm. A crater never becomes
  `'visited'`, so `tile.id !== 'visited'` stays true forever and every re-entry would have re-paid
  cell score, combo and a day/night step. Hence the explicit `alreadyWalked` rule — a crater is a
  cell you already walked, and you already paid for it with a life. No save version bump: `'X'`
  already persisted craters.
- **Regression coverage:** `player.test.ts` (crater survives a walkover and a walk-away-and-back;
  no score/combo/cycle; the anti-farm loop; still unflaggable after being walked over),
  `renderer.test.ts` (`TILE_EXPLODED` uses the grave cross, never an `EXPLOSION_*` frame; grey and
  walkable). Verified in a real browser: died, respawned, retraced onto the crater and stepped off
  — the cross is still there and the score never moved.

### Flags were eaten by tile rewrites (walking onto a flagged cell, airdrops) — fixed by the overlay model

- **Resolved:** 2026-07-04 by moving flags OUT of the map entirely: `GameState.flags` is a
  `Set<cellKey>` overlay; tiles are never modified by flagging, and `drawFlags` paints the FLAG
  sprite over the map (after the night sweep, before the player).
- **What happened (owner's repro):** walk, flag a neighbouring cell (`SHIFT+arrow`), then step onto
  it — `commitMove`'s `setTile(visited)` replaced the tile and the flag silently vanished, leaving
  plain trail. The same class of bug applied to every tile rewrite (airplane drops onto flagged
  ground, cluster blasts). Root cause: the flag lived *inside* the tile (`metadata.flagged`), so
  every tile writer was a potential flag eraser — patching consumers one by one was whack-a-mole.
- **The rules now (owner, 2026-07-04):** a flag is a pure visual overlay that never changes game
  behaviour (movement, drops, solvability — it is NOT a shield: the plane drops on flagged ground
  exactly like on plain ground, anything else would be a flag-your-corridor exploit); a flag can be
  placed on anything non-solid except an exploded crater (ground, mine, gem, visited trail); and a
  flag NEVER disappears except when a mine detonates on that cell (step or cluster chain) or the
  player toggles it off. Save format v5 unchanged — the existing per-cell flag chars persist the
  overlay, plus a new `'v'` code for the now-possible flagged-visited state (old saves load as-is).
- **Regression coverage:** `player.test.ts` (the owner's repro verbatim: walk onto a flagged cell →
  visited + flag survives; flag/unflag never mutates the tile — reference-identical; detonation
  clears the flag; visited flaggable, solid/exploded refused), `game.test.ts` (drops land on
  flagged ground AND the flag survives; cluster blast clears only detonated cells' flags),
  `save.test.ts` (round-trips incl. flagged visited). Owner play-tested in the browser.

### Flags invisible (and seemingly unplaceable) at night — regression from the 0.47.0 flag refactor

> **Superseded 2026-07-04:** the metadata-based fix described below was replaced the next day by
> the overlay model (entry above) — night visibility now comes from draw order (`drawFlags` runs
> after the night sweep), which cannot regress per-consumer. Kept for history.

- **Resolved:** 2026-07-04 with `hiddenAtNight(tile)` in `renderer.ts` — the single predicate the
  night overlay sweeps go through: night hides unvisited, **unflagged** terrain only.
- **What happened:** 0.47.0 correctly turned flagging into a pure metadata overlay (the tile keeps
  its true id — the fix for "flagging a mine defused it"). Side effect: flagged tiles reappeared in
  the night overlay's `findById('ground'/'mine')` sweeps, so night painted them black. Existing
  flags vanished at nightfall; a flag placed at night landed but looked like the key did nothing —
  and a confused second press silently toggled it off again. Placement itself never had a night
  gate. (Regression window: 0.47.0 → 0.48.x. The overlay's own comment — "flags remain visible" —
  documented the original intent all along; tell-tale inconsistency: a flag on a *gem* stayed
  visible at night, because only ground/mine ids were swept.)
- **Why it slipped through:** coding practice #5 in person — the flag refactor changed what
  `tile.id` means for flagged cells and updated five consumers; the night overlay was the sixth.
- **Regression coverage:** `src/renderer.test.ts` (the `hiddenAtNight` contract: flagged
  ground/mine visible, gems/visited/exploded/fence never hidden) + `src/player.test.ts` ("a flag
  placed at night lands and stays visible through the night sweep"). Verified end-to-end in a real
  browser: walking into night and flagging adds the flag's exact 112 bright-cyan pixels on canvas.

### Pages deploy failed 5× with "Deployment failed, try again later" (stale Pages actions)

- **Resolved:** 2026-07-03 by upgrading `actions/upload-pages-artifact@v3 → @v5` and
  `actions/deploy-pages@v4 → @v5` (owner commit `4541bf7`; Node 24 follow-up `76540a5`).
- **What happened:** the 0.48.0 release built and tested green, but every deploy attempt (5 in a
  row, including reruns) failed seconds after the Pages deployment was created — deployment
  statuses went `waiting → queued → in_progress → failure` in ~15 s with an **empty description**.
  The artifact itself was verified clean (valid `artifact.tar`, 4 regular files, no symlinks);
  no GitHub incident was active; the workflow was unchanged since a successful deploy on
  2026-07-01. Root cause: both Pages actions got new majors in spring 2026 (deploy-pages v5.0.0
  on 2026-03-25, upload-pages-artifact v5.0.0 on 2026-04-10, Node 24 native) and the Pages
  backend stopped accepting the 2024-era v3 artifact flavour on 2026-07-03. The Node-20
  deprecation annotation in the logs was a red herring (warning only).
- **Rule going forward:** keep `upload-pages-artifact@v5+` and `deploy-pages@v5+`; on any deploy
  failure with this generic message, check these two action versions FIRST. The same fix was
  applied to every zx-kit game repo with a Pages workflow (chaosbunny, iceroads, submarine).

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
