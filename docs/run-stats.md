# End-of-run statistics — reference

> Status: **shipped 2026-08-08** (owner-approved the same day). Nine run-wide numbers on the
> game-over and win screens. This file records what the counters mean and, more importantly, *why*
> each one is defined the way it is — the definitions are the part that is easy to break later.

## 1. What is shown

| Line | Value example | Field |
|---|---|---|
| TIME | `14:32` | `stats.elapsedMs`, mm:ss |
| LEVEL | `4/10` | `state.level + 1` / `WIN_LEVEL` |
| STEPS | `184` | `stats.steps` |
| BACKTRACK | `47 (26%)` | `stats.backtrackSteps`, % of STEPS |
| BEST COMBO | `15` | `stats.bestCombo` |
| DEATHS | `3` | `stats.deaths` |
| GEMS | `38/48` | `stats.gems` / `GEM_COUNT × (level + 1)` |
| FLAGS | `12` | `stats.flagsPlaced` |
| ON MINES | `9 (75%)` | `stats.flagsOnMines`, % of FLAGS |

Owner's decisions, settled before implementation:

- **STEPS = committed moves only.** A blocked press into a wall and a buffered press are not
  counted anywhere; there is deliberately no "wasted keypresses" stat.
- **TIME runs only while `runState === 'running'`** — pause and the idle pre-run scout are frozen,
  exactly like the on-screen countdown. Never wall-clock.
- **Flag accuracy is judged at placement time.** A mine the airplane drops later onto a flagged
  cell does not retro-count as a hit.
- **GEMS counts pickups, not the backpack.** The two legitimately disagree, and the difference is
  every gem special: 2 red buy a life, 3 cyan a mine reveal, 2 green the recon plane — each SPENDS
  its gems out of the inventory. `GEMS 5/24` with three gems in the backpack means five were
  collected and two were cashed in. (A gem the full backpack refused was never collected and
  counts nowhere.) Verified in a playtest 2026-08-08 and pinned by two tests in `player.test.ts`.
- Both end screens show the block; there is no per-level breakdown and no paging.

## 2. Where the numbers come from

`RunStats` lives on `GameState` (`game.ts`) and is **run-scoped, not level-scoped**.

| Counter | Incremented in | Note |
|---|---|---|
| `elapsedMs` | `tickTimer` (game.ts) | the run clock rides the countdown's "only while running" contract |
| `steps` | `commitMove`, before the mine branch + `completeLevel` | a fatal step counts; the exit step counts |
| `backtrackSteps` | `commitMove`, off `alreadyWalked` | same predicate that decides scoring |
| `deaths` | `commitMove` mine branch | cluster chain detonations are not deaths |
| `gems` | `commitMove` gem pickup | run-wide twin of the per-level `gemsCollected` |
| `bestCombo` | `commitMove`, after `comboCount++` | high-water mark; survives the death that resets the streak |
| `flagsPlaced` / `flagsOnMines` | `toggleFlag`, placement branch only | removals don't decrement; refused flags count nothing |

**The level-advance trap.** Clearing a level builds a completely fresh `GameState`, and only what
is handed to `createGame` survives. Stats are its fifth parameter (`initialStats`), passed at the
one call site in `main.ts`'s `levelcomplete` branch — miss it and every number silently restarts at
level 2. The object is **copied**, never aliased, exactly like `inventory`.

**Persistence.** `MinefieldSave.stats?` is optional, so the save stayed at **v6** — no version
bump. Older saves load with zeroed counters.

## 3. Presentation

- `runStatRows(state)` (renderer.ts) is the single definition of the summary: label/value pairs.
  `runStatLines(state)` is the drawn form (padded), and `main.ts` mirrors the same rows into the
  screen-reader region. One source, two channels — they cannot disagree.
- **Layout is single-column** because the values reach four digits on a full run
  (`1024 (26%)` is 10 chars) — a two-column layout could not hold them.
  `STATS_COL 4` + label field 12 + value field 11 = columns 4–26 of 32.
- Rows are named constants (`GAMEOVER_STATS_TOP`/`WIN_STATS_TOP` and the matching `*_PRESS_ROW`)
  so the vertical fit is asserted in tests rather than eyeballed. **The win screen is the tighter
  of the two** — its prompt sits on row 17, the last row of the playfield. Adding a tenth stat
  fails a test instead of drawing over the HUD.
- Labels are **ASCII and ≤ 10 chars in every language pack** (test-guarded). Slovak uses
  `CAS / KROKY / SPAT / NAJ KOMBO / UMRTIA / GEMY / VLAJKY / NA MINACH`.
- `formatClock` (strings.ts, re-exported by strings.sk.ts) is the game's only mm:ss formatter —
  the HUD countdown and the TIME stat share it. Minutes are unbounded (`74:05`), so a long run
  widens the string instead of growing an hours field the layout was never measured for.

## 4. Accessibility

The stats go into `#sr-menu` — the **navigable, never-live** region, the same channel the title
menu uses — via `mirrorRunStats()` in main.ts. They are deliberately **not spoken**: each end
screen already announces one line, and the standing rule is no new spoken text (see
`retro/docs/sk/a11y.md` §6). `enterHiScore()` clears the mirror, so the summary never lingers over
name entry.

## 5. Test coverage

Each risk identified before implementation has a test that fails without the fix:

| Risk | Guarded by |
|---|---|
| Stats reset on level advance | `game.test.ts` — carry + copy-not-alias, mimicking main.ts's call |
| `NaN%` from a zero denominator | `renderer.test.ts` — a run with no steps/flags reads `0 (0%)` |
| Diacritics / over-long labels | `strings.test.ts` — ASCII + ≤10 chars + EN/SK key parity |
| Horizontal overflow | `renderer.test.ts` — worst-case values, `STATS_COL + line.length ≤ COLS` |
| Vertical overflow | `renderer.test.ts` — block + prompt fit inside `ROWS`, both screens |
| Duplicate mm:ss formatter | `strings.test.ts` — both packs expose `formatClock`; `STR_TIME` uses it |
| Stats lost on save/reload | `save.test.ts` — round-trip + a re-signed pre-stats save loads zeroed |
| Mirror lingering into name entry | `scripts/smoke.mjs` — `statsClearedAtNameEntry` (real browser) |

The smoke test also proves the whole chain in a real browser: counters survive a manual save and a
hard refresh (`statsSurvivedReload`, read out of the save payload), the summary reaches the
game-over screen (`statsShownOnGameOver`), and it never undercounts what the save already knew
(`statsContinuousToGameOver`).
