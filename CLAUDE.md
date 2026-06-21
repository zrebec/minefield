# CLAUDE.md — Minefield (ZX Spectrum Edition)

> **Known issue:** `npm audit` flags 1 high vuln (**undici 6.26.0**) bundled inside the `npm` CLI (pulled by semantic-release) — **unfixable downstream, dev/CI-only, never shipped** (the game ships a static Vite bundle). Don't re-investigate (audit fix / `--force` / overrides / nuke all tried 2026-06-20). Full note: `docs/known-issues.md`.

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
- Playfield **32×21 cells**; the bottom **3 HUD rows** hold the inventory (top), then score/mines and
  level/lives. Player starts at the left edge on a **seeded** start row.
- `TileMap` (zx-kit) holds tiles `ground` / `mine` / `gem` / `visited` / `flag` / building tiles.
  `findById('mine')` returns non-detonated off-path mines (powers reveal-debug and planned replay).
- **Win a level:** reach the right edge (`newCol >= COLS`). Step on a mine → explosion flash, lose a
  life, respawn at start. 0 lives → GAME OVER (saves are deleted — no save-scumming).

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
- 🔴 red — **2 = +1 life** (`RED_GEMS_PER_LIFE = 2`).
- 🔵 cyan — **3 = permanently reveal one live mine** (`CYAN_GEMS_PER_REVEAL = 3`; seeded, night-visible).
- 🟡 gold — rare (1/level), collect-only for now (planned: score, maybe +time).
- 🟢 green — collect-only for now (planned: shield).
- Data-driven via `GEM_KINDS` (id, `C` colour, weight); exact quotas via largest-remainder.

### Buildings (replaced the old linear walls)
High-angle **pseudo-3D buildings**: a roof footprint (2–8 tiles/dim, rolled independently) + 2 brick
rows + 1 foundation row; the whole bounding box is **solid and mine-free**. Count rises per level.
`fixWallTraps()` guarantees you never face *obstacle ahead + mines on both perpendicular sides* (you
always keep at least one dodge besides backing up). **8 unit tests + a property test over 20 generated
levels.** Full spec: `docs/buildings.md`.

### Other systems
- **Terrain** grass/snow/dust (L1 always grass) — sets background + trail colour. **Day/night** cycle
  darkens ground+mine (gems/buildings stay visible).
- **Aircraft** — per-level timing in `LEVEL_CONFIGS` (`acFirst*`/`acMin*`/`acMax*`); crosses in ~3 s,
  drops `acMineDropMin..Max` mines on unvisited non-building cells; status bar blinks `** AIRCRAFT **`;
  LFO-modulated engine drone.
- **Detector** (HUD) — mirrors the audio: adjacent mines 0–4 (amber/red discs) + a separate cyan beacon
  LED. Makes the game playable deaf. Spec: `docs/accessibility-detector.md`.
- **Audio** (`audio.ts`) — square-wave warnings/fanfares via zx-kit `playPattern`; explosion noise;
  aircraft LFO drone; volume `+`/`-`.
- **Save** (`save.ts` + zx-kit `save`) — version 3, 1 char/cell; `auto` slot (from L1 + at each level
  start) + `manual` (`SHIFT+S`); auto-resume of an in-progress save on launch; cleared on game over.
- **Levels:** L1 50 mines/3 lives · L2 80/3 · L3 100/2 · L4+ 110/2. Cluster mines from L2, beacon from L3.
- **Input** (`input.ts` over zx-kit) — arrows (repeat 150 ms→80 ms) + full **gamepad**; `F` flag,
  `P` pause, `SHIFT+S` save, `+`/`-` volume.
- **i18n** — all UI text in swappable EN/SK packs (`strings.ts` / `strings.sk.ts`).
- **CRT** — `curveDisplay()` curvature + `drawScanlines()`.

### Debug keys (two different things — don't conflate)
- **`D`** = `state.debugMode` — **reveals all mines, idle only** (scout before you move; off once you
  move; permanently off for the level once running). zx-kit `Ctrl+Shift+B` / gamepad **Y** map here too.
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

> Tomorrow's work (per owner, 2026-06-20): **gems + timer together** (gems add time). The **timer must
> be persisted** in auto/manual saves and restored on load — otherwise load acts as a timer reset.

---

## Dev commands

```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # dist/
npm test       # Vitest (234 tests)
```
