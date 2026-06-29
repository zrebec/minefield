# CLAUDE.md — Minefield (ZX Spectrum Edition)

> Claude Code execution guide (architecture + how the game actually works).
> **`AGENTS.md` is the permanent rules source of truth** (ZX authenticity, gameplay/testing/git invariants).
> **`ROADMAP.md` is the live backlog** — read it before starting work; this file is not the backlog.
> **The code and tests are the final source of truth** — when this file disagrees with `src/`, fix this file.

## Project Identity

- **Type:** browser game (single-page, static Vite bundle).
- **Player fantasy:** cross a blind minefield by listening; an aircraft keeps dropping more.
- **Stack:** Vanilla TypeScript · Vite · HTML5 Canvas · Web Audio API, on **`zx-kit@^0.34.0`** (only dep).
- **Release:** semantic-release on push to `main` (app pattern, `npmPublish: false`) → build → GitHub Pages.
- **Main branch:** `main`. **Owner commits/releases** — never push/bump/deploy without being asked.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # Vitest (294 tests)
npm run build     # dist/
npm run capture   # screenshots → docs/img/ (Playwright; needs chromium)
```

## Architecture Map

```
src/
├── config.ts      # all tunable params: LEVEL_CONFIGS, gems, buildings, timings, reveal/airplane consts
├── constants.ts   # resolution + palette re-export from zx-kit (COLS=32, ROWS=18, STATUS_ROWS=6)
├── font.ts        # ZX ROM font re-export
├── sprites.ts     # all sprites + tile factories as Uint8Array (8×8); makeTileFence, etc.
├── audio.ts       # Web Audio: warnings, explosion, fanfare, aircraft drone, volume; + intro AY underscore + typewriter tick
├── input.ts       # zx-kit input wrapper + game keys (D reveal, R random, SHIFT+S, +/-)
├── game.ts        # GameState, TileMap, field/gem/building gen, daily seed, isFieldSolvable, addDropMinesInBand
├── player.ts      # movement, collision, flag, respawn, scoring, gem pickup, combo
├── airplane.ts    # aircraft timer, animation, mine drop (calls addDropMinesInBand)
├── intro.ts       # "The Strip" intro: stepStory machine + typewriter + hand-drawn shot (8×8) + isIntroDue/markIntroSeen (localStorage seen-gate)
├── renderer.ts    # TileMap, sprites, HUD, detector, night, overlays
├── save.ts        # zx-kit save profile wiring (version 5)
├── strings.ts / strings.sk.ts / lang.ts   # i18n packs (incl. STR_STORY_CARDS)
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

## How It Works (implementation reference — verify against `game.ts`/`player.ts`)

### Story intro ("The Strip") — `intro.ts` + the `'story'` phase in `main.ts`
- **Flow (redesigned 2026-06-25):** the **title** is the cold-load screen; a save-resume goes straight to
  `'ingame'`. The story plays as a **pre-roll** when "due" on a mode-start, or on demand via the title's
  **`I`** key. `isIntroDue()` gates it (localStorage `minefield_intro` = `{v,t}`; `INTRO_REVALIDATE_DAYS`
  = 1 → daily until v1.0, ~30 monthly after; bump `INTRO_VERSION` to force a re-show). `enterStory(returnTarget)`
  sets the hand-off: `'ingame'` (start the chosen mode via `startRun`) or `'intro'` (back to title); marked
  seen on finish **or** skip. Pure core (`stepStory`, `StoryState`) drives the typewriter over
  `L.STR_STORY_CARDS`: each frame reveals `dt / MS_PER_CHAR` chars; **first key finishes** the card, a
  second (or `CARD_HOLD_MS`) **advances**. `MS_PER_CHAR` / `CARD_HOLD_MS` are owner-tuned.
- **Audio (new, additive — existing sounds untouched):** the AY underscore (`startIntroMusic` /
  `stopIntroMusic` in `audio.ts`, via zx-kit `seq`/`playAYLoop`) is the **only AY use** in the game;
  `playTypeClick` ticks the beeper per char. Autoplay policy: audio is silent until the first gesture, so
  the **first key only unlocks sound**. The startup jingle was **relocated off first-gesture** (it clashed
  with the AY) → it now plays once per session on a **direct** game-start (intro not shown).
- **Visual (`intro.ts`):** card 1 is a **hand-drawn establishing shot** from bespoke 8×8 tiles
  (`T_BRICK`/`T_WIRE`/`T_GROUND`/`T_MOON`/`T_STAR`/`T_MINE_DOME`); its **dithered night sky uses zx-kit
  `drawShade` + `DITHER.HALF`** (0.35.0 — the local `T_SKY` tile was removed). One ink + one paper per
  cell ⇒ colour-clash-correct. Cards 2–4 are still simpler sprite vignettes (to be redrawn bespoke). Title
  is **THE STRIP** (`STR_TITLE`).

### Field, fence & solvability
- Playfield **32×18 cells**; the bottom **6 HUD rows**: backpack · timer · score+detector · mines+level ·
  day/night · lives+random-tag. Canvas height fixed at 192.
- **Perimeter fence:** solid `fence` down col 0 and the last col, each with ONE walkable gap — entry
  (seeded `startRow`, spawn) and exit (seeded `exitRow`, ≥ `MIN_ENTRY_EXIT_ROW_GAP` away). Win = cross the
  right edge through the exit gap (`movePlayer` funnels it; the rest of the wall is solid).
- **Always winnable:** generation reserves a SAFE_RADIUS box around both gaps, `fixObstacleTraps` de-traps
  buildings + fence, `isFieldSolvable` (BFS) proves a full entry→exit path (regenerating `<seed>:r<n>` if a
  board seals the exit). **Runtime: the airplane is guarded** (`addDropMinesInBand` discards any drop that
  would seal the field — a pass can place 0). Mines never land on the player's `visited` trail, so retreat
  is always possible. Tests: 300 seeded + 100 random fields; 40 seeds × 8 airplane passes.

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
- **Terrain** grass/snow/dust (L1 grass). **Day/night** darkens ground+mine.
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
- **`D`** = `state.debugMode` — reveals all mines, **idle only** (off once moving). **Budget-gated**
  (`tryToggleReveal`): daily `DAILY_REVEAL_LIMIT = 0` (does nothing); random `RANDOM_REVEAL_LIMIT` per level
  (`null` = unlimited); turning OFF is free, each ON consumes one. zx-kit `Ctrl+Shift+B` / gamepad **Y** map
  here too.
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
