# CLAUDE.md — Minefield (ZX Spectrum Edition)

> **Known issue:** `npm audit` flags 1 high vuln (**undici 6.26.0**) bundled inside the `npm` CLI (pulled by semantic-release) — **unfixable downstream, dev/CI-only, never shipped** (the game ships a static Vite bundle). Don't re-investigate (audit fix / `--force` / overrides / nuke all tried 2026-06-20). Full note: `docs/known-issues.md`.

> **✅ Resolved (2026-06-23) — the field is traversable under all circumstances.** Former P0: an airdrop
> could seal the only safe route mid-run. **Fixed:** every airdrop now runs `isFieldSolvable` (entry→exit)
> on the tentative board and **discards any mine that would seal the field** (`addDropMinesInBand`); a pass
> can place 0 mines. Determinism holds (the guard is entry→exit, player-independent) and the guarantee
> holds because mines never land on the player's `visited` trail (so they can always retreat to the entry
> and take the guaranteed path). Drops are also forward-biased and the flight band is rows 1..14. Regression:
> "solvable after 40 seeds × 8 passes" + "guard refuses every sealing drop". Analysis: `retro/docs/sk/minefield.md`
> §6/§7.

Guidance for Claude Code when working in this repository. **The code and tests are the source of
truth** — when this file disagrees with `src/`, the code wins (fix this file).

## What this is

A browser game inspired by classic ZX Spectrum "minefield" titles. Cross a blind minefield left→right;
sound (and a visual HUD detector) warns you of nearby mines; an aircraft periodically drops more.
**Functionally complete and LIVE** on GitHub Pages. The deeper SK design/working doc is
`retro/docs/sk/minefield.md`; this file is the in-repo agent doc.

- **Stack:** Vanilla TypeScript + Vite + HTML5 Canvas + Web Audio API, on **`zx-kit@^0.33.0`**.
- **Release:** semantic-release on push to `main` (app pattern, `npmPublish: false`) → build → deploy.
  234 tests (Vitest). Current version 0.31.x.
- **Owner commits and releases.** Don't commit or bump without being asked.

---

## ZX Spectrum authenticity — CRITICAL (eternal rules)

- **Resolution:** game runs at **256×192**, canvas scaled **4×** (1024×768) via zx-kit `setupCanvas`;
  `imageSmoothingEnabled = false`, no anti-aliasing anywhere. All coordinates are multiples of 8.
- **Palette:** exactly the 15 Spectrum colours from `zx-kit` `C` (8 normal + 7 bright; bright black =
  black). **No other hex values, ever.** Use `C.*`, never raw hex.
- **Colour clash:** each 8×8 cell has one INK + one PAPER. Because the whole game is grid-aligned this
  comes for free — stepping onto a cell flips the whole block. (zx-kit `attrscreen` not needed here.)
- **Font:** the ZX ROM 8×8 bitmap font via `zx-kit/font`, drawn pixel-by-pixel (`fillRect`) — never
  CSS fonts / `fillText`.
- **What must NOT appear:** gradients, shadows, border-radius, modern fonts, smooth scaling, CSS
  animation (all rendering is Canvas), external image assets (sprites are `Uint8Array` in `sprites.ts`),
  any non-Spectrum colour, or any game framework (React/Pixi/Phaser). zx-kit is the only dependency.

---

## Game mechanics (as shipped — verify against `game.ts` / `player.ts`)

### Field & HUD
- Playfield **32×18 cells**; the bottom **6 HUD rows** (one concern each): backpack · timer ·
  score+detector · mines+level · day/night · lives+random-tag. (`ROWS`/`STATUS_ROWS` in `constants.ts`;
  canvas height fixed at 192.)
- **Perimeter fence (2026-06-22):** a solid `fence` wall runs down col 0 and the last col, each with ONE
  walkable gap — the **entry** (seeded `startRow`, where the player spawns) and the **exit** (seeded
  `exitRow`, kept ≥ `MIN_ENTRY_EXIT_ROW_GAP` away → no straight line). The player must *find a route* across.
- `TileMap` (zx-kit) holds tiles `ground` / `mine` / `gem` / `visited` / `flag` / `fence` / building tiles.
  `findById('mine')` returns non-detonated off-path mines (powers reveal-debug and planned replay).
- **Win a level:** reach the right edge (`newCol >= COLS`). The right wall is solid except `exitRow`, so
  `movePlayer` funnels the crossing through the exit gap (win logic unchanged). Step on a mine → explosion
  flash, lose a life, **respawn at the entry**. 0 lives **or** 0:00 → GAME OVER (saves deleted — no scumming).
- **Guaranteed solvable — generation AND runtime:** `createGame` reserves a SAFE_RADIUS box around **both**
  gaps (entry pre-existed; exit mirrors it), `fixObstacleTraps` de-traps buildings + fence, and
  `isFieldSolvable` (BFS) proves a full entry→exit path, regenerating deterministically (`<seed>:r<n>`) if a
  board seals the exit. **At runtime the airplane is guarded too** (see Aircraft) — so the field stays
  winnable under all circumstances. Test: 300 seeded + 100 random fields; 40 seeds × 8 airplane passes.

### Timer (`tickTimer` in game.ts, ticked from main.ts)
- `state.timeLeftMs` starts at `TIMER_BASE_MS` (10:00). `createGame` sets it, so it **resets every
  level**; it is **not** reset on mine-death respawn (per-level, not per-life). No carry-over.
- Ticks **only in `runState === 'running'`** (idle scout + pause freeze it). At 0 → `phase='gameover'`.
- Persisted in saves (`timeLeftMs?`) and restored, so reload resumes the clock (not a reset).
- HUD clock on the timer row; red + blinking under `TIMER_LOW_MS` (1:00). Purpose: counter to the
  back-and-forth re-sample "cheese". All values tunable in `config.ts`.

### Daily vs Random (single source of truth: `state.dropSeedBase`)
- **Daily** = seed `YYYY-MM-DD:Ln` → everyone gets the same field; scores count.
- **Random** = no seed → `dropSeedBase === null` → **never** written to the leaderboard (anti-cheat;
  persisted in the save + re-synced on reload so save+reload can't launder a random score onto the board).
- Chosen **only on the title**: `SPACE`/`ENTER`/`S` = daily, `R` = random. `R` is inert in-game.

### Warning count — `countWarningMines`
> **ERRATA (kept as a permanent warning).** This file once claimed mines are counted in a **3×3** area
> (8 neighbours). That is wrong and once triggered a false "the game counts diagonals" alarm. **Reality
> in code, and tested** (`game.test.ts`, incl. *"beacon mine diagonally 2 away does NOT warn"*):
- **4 orthogonal neighbours, distance 1** — any mine type `+= 1` (max 4). The player only moves
  orthogonally, so a diagonal mine is non-actionable → correctly ignored.
- **+ `beacon` mines at orthogonal distance 2** (cyan, from level 3, `BEACON_MINE_RATIO`) — the *only*
  reason the sum can exceed 4 (max `4 + 4 = 8`). Diagonal beacons do **not** count.
- Returns `min(count, 8)`. The warning + detector fire **after every step** (incl. re-entering a
  visited cell — relevant to the cheese discussion in the SK doc §7).

### Gems (12 per level: 3 red · 6 cyan · 1 gold · 2 green; backpack cap 32)
Every gem grants **+1000 score** (`GEM_SCORE`) and a **per-colour time bonus** (`GEM_TIME_BONUS_MS`
map in config: cyan 0 · green 5s · red 10s · gold 30s — rarer = more). A full backpack leaves the gem
on the field and grants nothing. On top of that, two colours have a special function:
- 🔴 red — **2 = +1 life** (`RED_GEMS_PER_LIFE = 2`).
- 🔵 cyan — **3 = permanently reveal one live mine** (`CYAN_GEMS_PER_REVEAL = 3`; seeded, night-visible).
- 🟡 gold — special **not yet implemented** (planned: a score bonus *above* the flat +1000).
- 🟢 green — special **not yet implemented** (planned: shield — survive one blast without respawning).
- Data-driven via `GEM_KINDS` (id, `C` colour, weight); exact quotas via largest-remainder.

### Buildings (replaced the old linear walls)
High-angle **pseudo-3D buildings**: a roof footprint (2–8 tiles/dim, rolled independently) + 2 brick
rows + 1 foundation row; the whole bounding box is **solid and mine-free**. Count rises per level.
`fixObstacleTraps()` guarantees you never face *obstacle ahead + mines on both perpendicular sides*
around **any solid obstacle — buildings AND the fence** (you always keep at least one dodge besides
backing up). **Property tests over generated levels.** Full spec: `docs/buildings.md`.

### Other systems
- **Terrain** grass/snow/dust (L1 always grass) — sets background + trail colour. **Day/night** cycle
  darkens ground+mine (gems/buildings stay visible).
- **Aircraft** — per-level timing in `LEVEL_CONFIGS` (`acFirst*`/`acMin*`/`acMax*`); crosses in ~3 s, flies
  rows `AIRPLANE_ROW_MIN..MAX` (1..14), drops `acMineDropMin..Max` mines on unvisited non-building cells.
  **Solvability-guarded** (`addDropMinesInBand`): each drop is kept only if `isFieldSolvable` still holds —
  any mine that would seal the field is discarded (a pass can place 0). Columns are **forward-biased**
  (`max` of two seeded draws) toward the exit side. Status bar blinks `** AIRCRAFT **`; LFO engine drone.
- **Detector** (HUD) — mirrors the audio: adjacent mines 0–4 (amber/red discs) + a separate cyan beacon
  LED. Makes the game playable deaf. Spec: `docs/accessibility-detector.md`.
- **Audio** (`audio.ts`) — square-wave warnings/fanfares via zx-kit `playPattern`; explosion noise;
  aircraft LFO drone; volume `+`/`-`.
- **Save** (`save.ts` + zx-kit `save`) — **version 5**, 1 char/cell (`#` = fence); `auto` slot (from L1 +
  at each level start) + `manual` (`SHIFT+S`); auto-resume on launch; cleared on game over. The v4→v5 bump
  came with the perimeter fence (a v4 map has open edge columns + no exit gap → cleanly rejected → falls
  back to the title screen). Persists `exitRow`, `timeLeftMs?` (and inventory/revealed mines), so reload
  resumes exactly.
- **Levels:** L1 50 mines/3 lives · L2 80/3 · L3 100/2 · L4+ 110/2. Cluster mines from L2, beacon from L3.
- **Input** (`input.ts` over zx-kit) — arrows (repeat 150 ms→80 ms) + full **gamepad**; `F` flag,
  `P` pause, `SHIFT+S` save, `+`/`-` volume.
- **i18n** — all UI text in swappable EN/SK packs (`strings.ts` / `strings.sk.ts`).
- **CRT** — `curveDisplay()` curvature + `drawScanlines()`.

### Debug keys (two different things — don't conflate)
- **`D`** = `state.debugMode` — **reveals all mines, idle only** (scout before you move; off once you
  move; permanently off for the level once running). zx-kit `Ctrl+Shift+B` / gamepad **Y** map here too.
  **Budget-gated (`tryToggleReveal`, 2026-06-22):** revealing every mine would leak a **scored daily**
  solution, so daily gets `DAILY_REVEAL_LIMIT = 0` (the key does nothing); random/practice gets
  `RANDOM_REVEAL_LIMIT = 5` per level (`null` = unlimited). Turning the reveal OFF is free; each ON
  consumes one. (Screenshots can't be technically blocked — a canvas has no DRM/secure path like
  YouTube's EME video — so we protect daily fairness at the source instead. SK doc §6/§7.)
- **`O`** = `showDebug` — toggles the **zx-kit `debug` FPS/CPU overlay** (`createDebugMonitor` /
  `beginFrame` / `endFrame` / `sampleDebug` / `drawDebugOverlay`). Minefield is zx-kit's **first
  `debug` consumer**. Shows FPS, frame ms, JS CPU load + custom fields (phase, run, level, mines).
  Single-letter keys are used because browsers reserve `F3`/`Ctrl+Shift+B`/`F12`.

---

## Code structure

```
src/
├── config.ts      # all tunable params: LEVEL_CONFIGS, gems, buildings, timings
├── constants.ts   # resolution + palette re-export from zx-kit
├── font.ts        # ZX ROM font re-export
├── sprites.ts     # all sprites as Uint8Array (8×8)
├── audio.ts       # Web Audio: warnings, explosion, fanfare, aircraft, volume
├── input.ts       # zx-kit input wrapper + game keys (D reveal, R random, SHIFT+S, +/-)
├── game.ts        # GameState, TileMap, field/gem/building gen, daily seed, countWarningMines
├── player.ts      # movement, collision, flag, respawn, scoring, gem pickup
├── airplane.ts    # aircraft timer, animation, mine drop
├── renderer.ts    # TileMap, sprites, HUD, detector, night, overlays
├── save.ts        # zx-kit save profile wiring
├── strings.ts / strings.sk.ts / lang.ts   # i18n packs
└── main.ts        # game loop, phase switching, debug overlay (finishFrame helper)
```

`GamePhase = 'playing' | 'exploding' | 'levelcomplete' | 'gameover'`;
`AppPhase = 'intro' | 'ingame' | 'hiscore'`.

**Game loop note:** `gameLoop` is guard-clause style — `intro` and `hiscore` `return` early, `ingame`
falls through. Each exit path schedules the next frame via the **`finishFrame(ctx)`** helper, which
also runs `endFrame(dbg)` and draws the debug overlay (after `endFrame`, so the overlay's own draw cost
is excluded from the CPU reading). `beginFrame(dbg, timestamp)` is at the top of the loop.

---

## Planned features (NOT implemented — designs kept here)

### Probe / stone (player aid)
Throw a stone ahead to scout before entering. Direction = last move; distance = `player+3 .. edge`
(random); reveals a 3×3 around the landing point; a mine there is shown but **does not detonate**.
Reveal is **movement-triggered reset** (clears on any move; no timer) — state `probedCells: Set<string>`
(`"col,row"`). Cost `500 × level`, deducted from score, never going negative; probed cells give no
score (you weren't there). Open: throw sideways too? arc trajectory? key binding (TBD).

### Action Replay — KEY FEATURE (cross-cutting, planned)
Record a run and replay it **fast**, **revealing the mines** (the Mined-Out reveal). The game is
**fully deterministic from the seed** (terrain, mines, gems, aircraft, reveal), so a run = **seed +
timed input list** (a few bytes), **not** raw canvas frames.
- **Record:** log every input (direction, flag…) + step/time.
- **Replay:** re-simulate from the same seed by feeding inputs (original or fast); render frames.
- **Reveal:** we know the seed → draw mines visibly → "where the mines were".
- **Three payoffs:** reveal (Mined-Out effect); **shareable** run (seed+inputs = short code/URL,
  Wordle-style, pairs with daily); **server-less score verification / anti-cheat** (replay the run).
- **zx-kit:** a deterministic input-recorder/replayer is a generic primitive — every seeded zx-kit game
  gets replay + sharing + verification for free. Open: extract to zx-kit later, or build it there and
  let minefield be the reference integration.

> **Done (2026-06-21):** the 6-row HUD, the per-level timer, and per-colour gem time bonuses all
> shipped (timer is persisted + restored). **Still open:** the gem *special* functions for gold
> (score bonus) and green (shield) — see the Gems section.

---

## Dev commands

```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # dist/
npm test       # Vitest (234 tests)
```
