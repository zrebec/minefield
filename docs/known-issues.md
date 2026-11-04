# Known Issues — Minefield

## Active Issues

*(none)*

## Resolved Issues

### All three release gates reported a dead game — twice over, and neither time was the game

- **Resolved:** 2026-09-01. New `scripts/lib/boot-gate.mjs` (`passBootGate`), wired into
  `smoke.mjs`, `offline.mjs` and `persist.mjs`; and the death-walk cadence in `smoke.mjs` now
  derives from `WALK_DURATION_MS` instead of a guessed 170 ms.
- **What happened:** from 0.67.0 (2026-08-27) to 2026-09-01, `npm run smoke`, `npm run offline`
  and `npm run persist` all exited 1. Each failed on exactly the check that says the game is
  playable — `runStarted`, `playableOffline`, `playableFromColdStart` — while every other check in
  the same report passed: the service worker installed, the precache filled, the offline reload
  served everything from cache, the cold start survived a dead server. A game that was fine looked
  dead in all three of its gates, right through the window where a release was being considered.
- **Why (first cause):** 0.67.0 put a **loading screen in front of every screen**, and it is left
  only by `Enter`, gamepad Start or a tap (`main.ts`). All three scripts went `goto` →
  `page.keyboard.press('r')`, so they pressed `r` at a picture that does not answer to `r`, then
  spent up to 90 further presses waiting for a run that could never start. Nothing in the scripts
  was aware the screen existed. The fix lives in ONE place because three copies of it would drift.
  **Do not open-code the `Enter`:** on the TITLE, `Enter` starts a **daily** run, and a daily is
  the one thing these scripts must never touch (only random runs stay off the leaderboard), so
  `passBootGate` waits until it can actually *see* the gate before pressing, and returns a named
  check rather than assuming.
- **Why (second cause, uncovered by fixing the first):** with the gate passed, `smoke` still
  failed `reachedGameOver`. `walkUntilGameOver` pressed an arrow every **170 ms** against a
  **220 ms** (`WALK_DURATION_MS`) step tween, and `main.ts` buffers exactly ONE move — so a large
  share of those presses bought no movement at all. The loop spent its whole 400-press budget
  without reaching a third death and declared the game unplayable. This bug is **older than the
  loading screen**; the boot gate had merely been hiding it.
- **How the second one was found (worth repeating):** by instrumenting the loop rather than
  reasoning about it. Adding one `isIngame()` probe per press made the whole suite go green — the
  probe's own latency pushed the cadence past 220 ms. The instrument *was* the diagnosis: if
  slowing a loop down fixes it, the loop was outrunning something. Measured directly afterwards:
  death 1 at press 46, death 2 at press 96, game over at press 215 — comfortably inside the
  budget, once every press actually moved the player.
- **Coverage:** each script now reports a `bootGate` check (smoke also reports
  `bootGateOnResume`, which exercises the *other* branch out of the gate — a save-resume goes
  straight back into the run and never touches the title). A gate that cannot find the loading
  screen fails loudly instead of quietly starting a daily.
- **Lesson for the next screen added in front of the game:** grep `scripts/` for `goto` before
  shipping it. Three scripts, one key, five days of red.

### The airplane approach tone kept sounding through the game-over screen

- **Resolved:** 2026-08-08 in `main.ts` — the gameover ENTRY hook now calls
  `stopAmbientSounds()` (and `consumeAnyKey()`, see the next entry).
- **What happened (owner's report):** losing the last life exactly while the plane-approach
  warning was sounding left the 1300 Hz square tone playing through the whole game-over/stats
  screen. It only stopped on the way back to the title.
- **Why:** `startApproachSound()` (audio.ts) starts a **continuous oscillator with no scheduled
  stop**. The only things that end it are `startAirplane()` (when the plane actually spawns) and
  `stopAmbientSounds()`. `updateAirplane` — which would spawn the plane — runs *only* inside
  `phase === 'playing'` + `runState === 'running'`, so once the run ends nothing is left to finish
  the job; and `stopAmbientSounds()` on the game-over screen sat inside `if (consumeAnyKey())`,
  i.e. it ran when the player DISMISSED the screen, not when they reached it. A non-fatal death
  self-heals (the run resumes and the plane spawns), which is why only the final life showed it.
  **This is a Minefield bug, not zx-kit:** the oscillator is raw Web Audio in `src/audio.ts`.
- **Reproduction (deterministic):** pin the plane (`acFirstMs = acFirstMaxMs = 8_000`), give
  level 1 `lives: 1` and `MINE_DENSITY 0.5`, then instrument `OscillatorNode.prototype.start/stop`
  via Playwright's `addInitScript` and walk into a mine ~3.5 s in. Before the fix a
  `square@1300Hz` was still unstopped on the stats screen; after it, none.
- **Coverage:** `scripts/smoke.mjs` gained `noLeakedAudioAtGameOver` (no oscillator without a
  `stop()` once the run is over). It is a NET, NOT A PROOF — it only bites when the death-walk
  ends mid-flyover, and reintroducing the bug did not fail it on the first try. main.ts has no
  unit-test seam; the deterministic repro above is the real evidence.

### A timeout game over was skipped instantly — the player never saw the summary

- **Resolved:** 2026-08-08, same entry hook: `consumeAnyKey()` now runs on EVERY path into
  `gameover`, not just the mine path.
- **What happened:** `pendingAnyKey` (zx-kit input) is a **sticky** flag set by any keydown and
  cleared only by `consumeAnyKey()`/`resetInput()`. Nothing reads it while `playing`, so it
  survives from the player's last movement key. The mine path already discarded it in the
  `exploding` branch ("so gameover doesn't auto-skip"), but a timeout death comes straight from
  `tickTimer` — so the game-over screen was dismissed on its very first frame. Harmless when the
  screen only showed a score; with the run summary on it, the player loses the whole thing.
- **Found by:** the audio-leak reproduction above, which used a timeout death and landed on the
  title instead of the game-over screen.
- **Coverage:** the deterministic repro (timeout variant) now shows `Game over.` in
  `#sr-announcer` and the stats in `#sr-menu`; `statsShownOnGameOver` in the smoke covers the
  mine path.

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
