# CLAUDE.md — Minefield (ZX Spectrum Edition)

> Claude Code execution guide (architecture + how the game actually works).
> **`AGENTS.md` is the permanent rules source of truth** (ZX authenticity, gameplay/testing/git invariants).
> **`ROADMAP.md` is the live backlog** — read it before starting work; this file is not the backlog.
> **The code and tests are the final source of truth** — when this file disagrees with `src/`, fix this file.

## Project Identity

- **Type:** browser game (single-page, static Vite bundle).
- **Player fantasy:** cross a blind minefield by listening; an aircraft keeps dropping more.
- **Stack:** Vanilla TypeScript · Vite · HTML5 Canvas · Web Audio API, on **`zx-kit@^0.36.0`** (only dep).
- **Release:** semantic-release on push to `main` (app pattern, `npmPublish: false`) → build → GitHub Pages.
  **Pages actions must stay `upload-pages-artifact@v5+` / `deploy-pages@v5+`** — the Pages backend
  rejects v3-era artifacts since 2026-07-03 (generic "Deployment failed, try again later", no
  description, build/tests green). Check these versions FIRST on any such deploy failure.
  **Gate quirk:** the CI release gate reads only the push's HEAD commit message — a releasable
  `fix:`/`feat:` pushed *underneath* a `docs:`/`chore:` commit won't release until the next
  releasable push (this happened to `4541bf7`). Push releasable commits last or alone;
  `workflow_dispatch` deploys the current main without cutting a release.
- **Main branch:** `main`. **Owner commits/releases** — never push/bump/deploy without being asked.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # Vitest (380 tests)
npm run build     # dist/
npm run smoke     # browser smoke test over dist/ (Playwright; run after build, before a release)
npm run capture   # screenshots → docs/img/ (Playwright; needs chromium)
```

## Coding practices (owner's standing rules — follow these)

These are non-negotiable. Each has already cost a real bug in this codebase.

1. **DRY — extend, don't copy.** If two places need the same logic, they call the
   same function (add a parameter/input if they differ slightly). Never paste a
   function's body into a new function. If only PART is shared, extract that part
   — not the whole thing including what differs. *(The airplane obstacle-trap check
   first duplicated `fixObstacleTraps`' geometry; the flag/id bug came from 5 sites
   re-implementing "is this a mine".)*
2. **One source of truth per decision.** A `tile.id === X` (or any rule) repeated
   across call sites, or a literal that duplicates a `config.ts` constant, is a
   smell — one of them will drift. `atLevel()` in `config.ts` is the canonical
   per-level array read; use it, don't re-write `arr[Math.min(level, …)]`.
3. **`config.ts` is the single source of truth for tunables.** Any value that is a
   constant and isn't computed during play belongs there — never a bare literal or
   local `const` in a feature file. Keep it *readable*: grouped by concern
   (graphics / audio / logic separate), **one-line comments, never multi-line
   litanies**, no stray `export default`.
4. **Don't overload one field with two meanings.** Identity/permanent state
   (`tile.id`) must not also carry transient/UI state (flagged) — put the transient
   bit elsewhere (`metadata.flagged`). *(This was the flag bug.)*
5. **Changing what data means ⇒ grep every consumer first.** Don't assume a refactor
   is safe because it "looks equivalent"; find each reader and check it.
6. **No correctness claim without a test that proves it.** "Looks right" is not
   evidence; a passing test is. State that must change together (e.g.
   `comboCount`+`comboTimer`) must be checked together.

## Architecture Map

```
src/
├── config.ts      # all tunable params: LEVEL_CONFIGS, MINE_DENSITY, gems, buildings, timings, reveal/airplane consts; atLevel() per-level lookup
├── constants.ts   # resolution + palette re-export from zx-kit (COLS=32, ROWS=18, STATUS_ROWS=6)
├── font.ts        # ZX ROM font re-export
├── sprites.ts     # all sprites + tile factories as Uint8Array (8×8); makeTileFence, etc.
├── audio.ts       # Web Audio: warnings, explosion, fanfare, aircraft drone, volume; + per-card intro AY score (introTrack) + typewriter tick
├── input.ts       # zx-kit input wrapper + game keys (D reveal, R random, SHIFT+S, SHIFT+arrow flag, +/-)
├── game.ts        # GameState, TileMap, field/gem/building gen, daily seed, isFieldSolvable, addDropMinesInBand
├── player.ts      # movement, collision, flag, respawn, scoring, gem pickup, combo
├── a11y.ts        # screen-reader bridge: announce/status live-region writes, setLegend, describeStep sentence
├── airplane.ts    # aircraft timer, animation, mine drop (calls addDropMinesInBand)
├── intro.ts       # "The Strip" intro: stepStory machine + typewriter + 5 hand-drawn scenes (8×8) + chapter titles + isIntroDue/markIntroSeen (seen-gate)
├── renderer.ts    # TileMap, sprites, HUD, detector, night, overlays
├── save.ts        # zx-kit save profile wiring (version 5)
├── strings.ts / strings.sk.ts / lang.ts   # i18n packs (incl. STR_STORY_CARDS); L on the title cycles EN/SK
└── main.ts        # game loop, phase switching, debug overlay (finishFrame helper)
```

## Important State Models

- `GamePhase = 'playing' | 'exploding' | 'levelcomplete' | 'gameover'`
- `AppPhase = 'story' | 'intro' | 'ingame' | 'hiscore'` (`'intro'` = title/landing; `'story'` = the
  narrative pre-roll, entered from the title when "due" or via `I`, then hands off to `'ingame'`/`'intro'`)
- `runState = 'idle' | 'running' | 'paused'` (idle = scout before the first step; reveal + freeze the timer)
- **Game loop:** `gameLoop` is guard-clause style — `intro`/`hiscore` `return` early, `ingame` falls
  through. Each exit path schedules the next frame via **`finishFrame(ctx)`** (runs `endFrame(dbg)` then
  draws the debug overlay after it, so the overlay's draw cost is excluded from the CPU reading).
  `beginFrame(dbg, timestamp)` is at the top of the loop.

## Accessibility (v1.0 promise — see README + ROADMAP P1)

v1.0 (`2026-09-07`) publicly commits to full blind + deaf playability. Where it stands in code:

- **Deaf: done.** The HUD detector mirrors every audio warning (adjacent meter + beacon LED).
- **ARIA skeleton (2026-07-03), in `index.html`:** the canvas has `role="img"` + a static English
  `aria-label` (localise it when TTS lands); two screen-reader live regions exist for the game to
  write into — `#sr-announcer` (`aria-live="assertive"`, urgent: warnings/explosions) and
  `#sr-status` (`aria-live="polite"`, state: score/level/menus) — hidden via `.sr-only` (never
  `display:none`, that silences them). `setLocale()` in `lang.ts` mirrors the locale onto
  `document.documentElement.lang` (tested in `lang.test.ts`).
- **ARIA live regions: wired (0.52.0).** `a11y.ts` writes them: `announce()` (assertive; toggles an
  invisible trailing NBSP so identical per-step sentences still re-read), `status()` (polite, deduped),
  `setLegend()` fills the navigable `#sr-legend` audio guide (refreshed on `L` locale change). Per-step
  sentence = `describeStep` (adjacent count + beacon — the future TTS source). `STR_A11Y_*` strings are
  SPOKEN → full Slovak diacritics allowed (the one exception to the ASCII rule in `strings.sk.ts`).
- **Blind orientation: shipped (Item C, 2026-07-09).** `E` speaks the exit's bearing, `G` the nearest
  gem + remaining count, both in-game only (gated in the `appPhase === 'ingame'` keydown branch so they
  don't reach hiscore name entry); a one-line summary is spoken on run start (folded into `startRun`'s
  status line) and on resume. `describeExit` / `describeGems` / `describeOrientation` + private
  `relPhrase(dCol,dRow)` in `a11y.ts` produce relative bearings ("22 right, 3 up") — **parity, not an
  assist** (sighted players scout exit + gems; mines stay hidden), so no leaderboard flag. Design +
  post-ship notes: `docs/accessibility-orientation.md`.
- **Directional mine compass: tried in 0.52.0, REVERTED 2026-07-09 — do not rebuild.** A density
  compass (dominant live-mine direction within radius 4 → panned sine cue + dim HUD arrow + ARIA
  clause) shipped and failed the owner's playtest: it reads as a danger warning but fires without
  adjacent danger (semantic collision with the sonar), tells you nothing about which STEP is safe,
  and has no diegetic basis. Also rejected: a radius-1 "detector" variant — per-direction adjacent
  info would gut triangulation (the core puzzle; the timer exists as its anti-cheese) and give blind
  players MORE than sighted ones. The infra above stayed; only the signal was cut (`git show e88cca5`
  has the old code). Deep write-up: `retro/docs/sk/minefield.md` §5.
- **No built-in TTS (decided 2026-07-11).** The game never calls `SpeechSynthesis` — it mirrors
  canvas state into the ARIA live regions and the player's screen reader does the speaking. Do not
  propose TTS; revisit only if the September playtest with a real screen-reader user shows
  live-region latency hurts real-time play.
- **Still to wire (ROADMAP P1):** legend replay on `H` (Item B — the last small orientation piece,
  spec'd in `docs/accessibility-orientation.md`), exit beacon, assist-mode flag, and the **shell**:
  title, pause pages, high-score letter entry and intro must all be announced — "fully playable"
  covers menus, not just the field.

## How It Works (implementation reference — verify against `game.ts`/`player.ts`)

### Story intro ("The Strip") — `intro.ts` + the `'story'` phase in `main.ts`
- **Story (5 chapters):** two countries that never declared/ended a war carve a no-man's-land (the Strip);
  a nightly plane reseeds it with mines, keeping torn-apart families apart; a runner reads the **pattern**,
  builds a home-made **sonar** that hears mines, and carries **parcels** to loved ones across. Maps to the
  mechanics (sowing = daily reseed · pattern = seed · sonar = audio warning · parcels = gems · crossing =
  win). **English ships** (`STR_STORY_CARDS` in `strings.ts`); Slovak is a translation (`strings.sk.ts`).
  Chapter titles `STR_STORY_TITLES` (THE DIVIDE / TORN APART / NO WAY ACROSS / THE RUNNER / NEW HOPE) show
  book-style on each card's heading rule.
- **Flow (redesigned 2026-06-25):** the **title** is the cold-load screen; a save-resume goes straight to
  `'ingame'`. The story plays as a **pre-roll** when "due" on a mode-start, or on demand via the title's
  **`I`** key. `isIntroDue()` gates it (localStorage `minefield_intro` = `{v,t}`; `INTRO_REVALIDATE_DAYS`
  = 1 → daily until v1.0, ~30 monthly after; bump `INTRO_VERSION` to force a re-show). `enterStory(returnTarget)`
  sets the hand-off: `'ingame'` (start the chosen mode via `startRun`) or `'intro'` (back to title); marked
  seen on finish **or** skip. Pure core (`stepStory`, `StoryState`) drives the typewriter over
  `L.STR_STORY_CARDS`: each frame reveals `dt / MS_PER_CHAR` chars; **first key finishes** the card, a
  second (or `CARD_HOLD_MS`) **advances**. `MS_PER_CHAR` / `CARD_HOLD_MS` are owner-tuned.
- **Audio (new, additive — existing sounds untouched):** a **per-card AY score** (`introTrack(card)` →
  `startIntroMusic(card)` in `audio.ts`, via zx-kit `seq`/`playAYLoop`; 3 voices + per-note volume/envelopes
  via `voiced()`), switched on card change. The arc: lament → **funeral dirge** (despair) → a brightening
  turn → Beethoven's **"Ode to Joy"** (new hope). The **only AY use** in the game; gameplay stays beeper.
  `playTypeClick` ticks the beeper per char. Autoplay: silent until the first gesture (the first key only
  unlocks sound); the startup jingle was relocated off first-gesture (clashed with the AY) → now once per
  session on a **direct** game-start. **Music is tuned by ear by the owner.**
- **Visual (`intro.ts`):** **all 5 chapters are hand-drawn** (`drawEstablishingShot` / `drawSowerScene` /
  `drawDespairScene` / `drawCrossingScene` / `drawDeliveryScene`) from bespoke 8×8 tiles; dithered skies use
  zx-kit `drawShade` + `DITHER`. One ink + one paper per cell ⇒ colour-clash-correct. Title is **THE STRIP**
  (`STR_TITLE`).

### Field, fence & solvability
- Playfield **32×18 cells**; the bottom **6 HUD rows**: backpack · timer · score+detector · mines+level ·
  day/night · lives+random-tag. Canvas height fixed at 192.
- **Mine budget is density-based (2026-07-03):** `round(atLevel(MINE_DENSITY, level) ×
  countMineEligibleCells(map, …))`, computed AFTER placeBuildings — the budget follows the space that
  exists, so buildings can't silently harden the field. `canHostMine` is the single predicate shared
  by the budget counter and `placeMines` (they can never drift). Deterministic (seeded board only).
  `LEVEL_CONFIGS.mines` is GONE — tune density, not counts. Guarded by the seeded generation-health
  test (≥50% of raw boards solvable per level; measured 61.5–99.5%).
- **Perimeter fence:** solid `fence` down col 0 and the last col, each with ONE walkable gap — entry
  (seeded `startRow`, spawn) and exit (seeded `exitRow`, ≥ `MIN_ENTRY_EXIT_ROW_GAP` away). Win = cross the
  right edge through the exit gap (`movePlayer` funnels it; the rest of the wall is solid).
- **Always winnable:** generation reserves a SAFE_RADIUS box around both gaps, `fixObstacleTraps` de-traps
  buildings + fence, `isFieldSolvable` (BFS) proves a full entry→exit path (regenerating `<seed>:r<n>` if a
  board seals the exit). If **all** `MAX_FIELD_ATTEMPTS` rerolls stay sealed (raw unsolvability ≈90% per
  attempt at L4+ — measured 2026-07-03; ~0.7% of L4+ `createGame` calls used to ship unwinnable),
  `carveSafePath` deterministically defuses the mines on one shortest entry→exit route — a construction
  guarantee, no RNG, so a repaired daily is identical for everyone. Both share `bfsPath` (one source of
  truth for movement reachability; only the mine predicate differs). **Runtime: the airplane is guarded**
  (`addDropMinesInBand` discards any drop that would seal the field — a pass can place 0). Mines never
  land on the player's `visited` trail, so retreat is always possible. Tests: 300 seeded + 100 random
  fields; 40 seeds × 8 airplane passes; named carve regressions (`hunt3:*` seeds).

### Timer (`tickTimer`)
- `timeLeftMs` starts at `TIMER_BASE_MS` (10:00), set by `createGame` → **resets every level** (not per
  death). Ticks **only in `runState === 'running'`** (idle + pause freeze it). 0 → `phase='gameover'`.
  Persisted + restored. Red + blinking under `TIMER_LOW_MS`. It is the deliberate counter to triangulation
  "cheese". All values tunable in `config.ts`.

### Daily vs Random (single source of truth: `dropSeedBase`)
- **Daily** = seed `YYYY-MM-DD:Ln` → same field for everyone; scores count. **Random** = no seed →
  `dropSeedBase === null` → never on the leaderboard (persisted + re-synced on reload). Chosen only on the
  title (`SPACE`/`ENTER`/`S` = daily, `R` = random).

### Warning count — `countWarningMines`
> **ERRATA (permanent).** Older docs claimed a **3×3** (8-neighbour) count — wrong, and it triggered a
> false "counts diagonals" alarm. Reality (and tested): **4 orthogonal neighbours, dist 1** (any mine, max
> 4) **+ `beacon` mines at orthogonal dist 2** (cyan, from L3) → `min(count, 8)`. Diagonals never count
> (the player moves orthogonally). Fires after **every** step (incl. re-entering a visited cell).

### Gems (12/level: 3 red · 6 cyan · 1 gold · 2 green; backpack cap 32)
Every gem: **+`GEM_SCORE` (1000)** + a per-colour time bonus (`GEM_TIME_BONUS_MS`: cyan 0 · green 5s · red
10s · gold 30s). Full backpack → gem stays, no time. Specials:
- 🔴 red — **2 = +1 life** (`RED_GEMS_PER_LIFE`).
- 🔵 cyan — **3 = reveal one live mine** (`CYAN_GEMS_PER_REVEAL`; seeded, night-visible).
- 🟡 gold — **+`GOLD_SCORE_BONUS` (5000)** on top of the flat score (implemented in `player.ts`).
- 🟢 green — **no special yet** (time bonus only); the special is an open ROADMAP decision.

### Buildings, terrain, aircraft, audio, save, input
- **Buildings:** pseudo-3D, solid + mine-free; count rises per level. `fixObstacleTraps()` prevents
  *obstacle ahead + mines on both perpendicular sides* around any solid (buildings **and** fence).
- **Flags (overlay model, 2026-07-04):** `GameState.flags` is a `Set<cellKey>` — flags live entirely
  OUTSIDE the map, so no tile rewrite (walking, airdrops, blasts) can eat one. `toggleFlag` only
  adds/removes set entries (flaggable: non-solid except exploded — incl. the visited trail); the
  ONLY other removal is a detonation on that cell (`commitMove` mine branch, `applyClusterBlast`).
  Rendered by `drawFlags` after the night sweep (visible at night by draw order), before the player.
  Persisted through the v5 per-cell chars (`f/m/c/b`, gem digits 5-8, new `'v'` = flagged visited).
  Flags never gate game logic (not a shield vs airdrops); sole read-only exception: revealMine dedup.
- **Terrain** grass/snow/dust (L1 grass). **Day/night**: night blacks out unvisited ground+mine —
  `hiddenAtNight` in `renderer.ts` is the single visibility predicate (gems, visited trail,
  explosions stay lit; flags are drawn over the sweep by `drawFlags`).
- **Aircraft:** flies rows `AIRPLANE_ROW_MIN..MAX` (1..14); drops `acMineDropMin..Max` mines on unvisited
  non-building cells, **solvability-guarded**, columns **forward-biased** (`max` of two seeded draws).
  `airplanePassIndex` drives the seeded `:pass`/`:drop`/`:next` seeds and is persisted.
- **Audio:** square-wave warnings/fanfares (`playPattern`), explosion noise, aircraft LFO drone, `+`/`-`.
- **Save (`save.ts` + zx-kit `save`) — version 5**, 1 char/cell (`#` = fence). `auto` (from L1 + each
  level start) + `manual` (`SHIFT+S`); auto-resume on launch; cleared on game over. Persists `exitRow`,
  `airplanePassIndex`, `timeLeftMs?`, inventory, revealed mines. v4→v5 came with the fence (v4 maps are
  cleanly rejected → title).
- **Input:** arrows (repeat 150→80 ms) + gamepad; `F` flag, `P` pause, `SHIFT+S` save, `+`/`-` volume.
- **i18n:** EN/SK packs (`strings.ts`/`strings.sk.ts`). **CRT:** `curveDisplay()` + `drawScanlines()`.

### Debug keys (two different things)
- **`D`** = `state.debugMode` — reveals all mines **while standing, any time** (a step hides them
  again — a budgeted *peek*). **Budget-gated** (`tryToggleReveal`, returns false = denied → main
  plays `playDenied`): daily `DAILY_REVEAL_LIMIT = 0` (always denied); random `RANDOM_REVEAL_LIMIT`
  activations per level (`null` = unlimited); turning OFF is free, each ON consumes one. zx-kit
  `Ctrl+Shift+B` / gamepad **Y** map here too.
  **D-reveal mode (TESTING-PHASE — final mode decided before v1.0).** The "any time" gate is ONE
  line in `main.ts` marked `[D-GATE]` (top of the `phase === 'playing'` block). **Revert recipe to
  the original idle-scout-only behaviour** (safe for any model to follow):
  1. In `main.ts`, cut the single `if (consumeDebug() && …) playDenied()` line at `[D-GATE]` and
     paste it at the `[D-GATE-IDLE-ANCHOR]` comment inside the `runState === 'idle'` branch;
     delete the big `[D-GATE]` comment block.
  2. Do NOT touch the `consumeDebug()` drains in the running/paused branches — they are kept alive
     exactly for this revert (they stop a mid-run press from firing at the next idle).
  3. The `state.debugMode = false` lines on movement (idle + running branches) stay in both modes.
  4. Update the `D` row in README's controls table back to "idle only (scout before you start)".
  5. `npm test` — the `tryToggleReveal` tests are mode-independent and must stay green.
- **`O`** = `showDebug` — toggles the zx-kit `debug` FPS/CPU overlay (Minefield is its first consumer).
  Single letters because browsers reserve `F3`/`Ctrl+Shift+B`/`F12`.

## Known Traps

- **Warning count is orthogonal-only** — see the ERRATA above before "fixing" it.
- **Daily determinism is sacred** — airplane drops/flight/timing are seeded; never key generation off the
  player's position or wall-clock. (Airdrop layouts are mildly path-dependent via the `visited`-skip — the
  deliberate price of the safe-trail invariant; "identical for everyone" is soft for airdrops, "always
  winnable" is not.)
- **Save compatibility** — schema changes that misalign the map need a version bump (v5 today); add new
  fields as optional with a fallback (see `airplanePassIndex`, `exitRow`).
- **Browser shortcut conflicts** — `D`/`O` are used because `F12`/`Ctrl+Shift+B`/`F3` are reserved.
- **Capture router** (`scripts/capture.mjs`) only treats mines+buildings as blocked, not the fence — teach
  it the fence before refreshing `play.png`.
