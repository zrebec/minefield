# Architecture & Technical Notes

> Developer-facing companion to the [README](../README.md) (player manual). The permanent
> agent rules live in [AGENTS.md](../AGENTS.md), the execution guide in [CLAUDE.md](../CLAUDE.md),
> the live backlog in [ROADMAP.md](../ROADMAP.md). **The code and tests are the final source of
> truth** — when this file disagrees with `src/`, fix this file.

## Local dev

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm test         # unit tests (Vitest)
npm run smoke    # browser smoke test (Playwright; run AFTER npm run build) — boots the real
                 # bundle: title/ARIA → random run → flag → night → save → reload → resume
npm run capture  # refresh docs/img screenshots (Playwright)
```

**Dependencies:** `zx-kit` only — everything else is the Web Platform.

> **CI note (2026-07-03):** GitHub Pages deploys require `actions/upload-pages-artifact@v5+` and
> `actions/deploy-pages@v5+`. The Pages backend started rejecting v3-era artifacts on 2026-07-03 —
> the deploy fails seconds after creation with a generic *"Deployment failed, try again later"*
> while build and tests stay green (it cost us five failed deploys of 0.48.0). If a Pages deploy
> ever fails like that, check these two action versions FIRST. Details: [known-issues.md](known-issues.md).

## Technical highlights

- **Authentic colour clash** — each 8×8 cell has one ink + paper; stepping onto a cell flips the
  whole block. Because everything is grid-aligned, clash works *for free* here.
- **ROM bitmap font** — `zx-kit/font` 8×8 glyphs drawn pixel-by-pixel (no CSS fonts / `fillText`).
- **Web Audio square wave** — warnings/fanfares via `playPattern`; aircraft uses an LFO drone.
- **`setupCanvas(canvas, 4)`** — 256×192 game pixels → 1024×768, `ctx.scale(4,4)`; CSS handles
  responsive display. `curveDisplay()` adds CRT curvature; `drawScanlines()` the scanline overlay.
- **6-row HUD** — the bottom 6 cell-rows are the HUD (playfield is the top 32×18), one concern per
  row: backpack · timer · score+detector · mines+level · day/night · lives+random-tag.
- **Save** — `zx-kit/save`, **version 6** (the v4→v5 bump came with the perimeter fence: a v4 map has
  open edge columns and no exit gap, so its semantics no longer match — it's cleanly rejected and the
  game falls back to the title screen; **v5→v6 added the anti-cheat envelope signature** — every write
  carries a FNV-1a `sig`, so a hand-edited save loads as `tampered`; deterrent-grade, the secret ships
  in the bundle). Round-trips map, lives, score, inventory, revealed mines,
  day/night, seed, the **exit row**, **and the remaining time** — so a reload resumes exactly.
- **Custom key-repeat + gamepad** via `zx-kit/input` (immediate → 150 ms delay → 80 ms repeat).
- **TV border** via `document.body` background, state-driven (blue intro / black play / green level /
  red game over) + `flashBorder()` for explosions.
- **TileMap** (`zx-kit`) holds ground/mine/gem/visited/building tiles; `findById('mine')` powers
  the reveal debug, the recon-plane reveal and the planned Action Replay. **Flags live OUTSIDE the
  map** in `GameState.flags` — a pure visual overlay `Set` (since 0.50.0), so no tile rewrite
  (walking, airdrops, blasts) can eat one; the only removal is a detonation on that cell.
- **Buildings & fix-trap rule** — high-angle buildings are solid, mine-free boxes (see
  [buildings.md](buildings.md)); `fixObstacleTraps()` guarantees you never face
  *obstacle ahead + mines on both sides* around any solid obstacle — buildings **and the fence**.
- **Perimeter fence & always-guaranteed solvability** — a solid wall encloses the left/right edges with
  one entry gap (start row) and one exit gap (a seeded row kept ≥ `MIN_ENTRY_EXIT_ROW_GAP` apart). At
  **generation** a flood-fill (`isFieldSolvable`) proves a full safe entry→exit route, deterministically
  regenerating per seed if a board ever seals the exit off — and if **every** reroll stays sealed (raw
  unsolvability reaches ~90% per attempt at L4+ densities, so it happens: measured ~0.7% of L4+ fields
  before the fix), a deterministic **carve repair** defuses the mines on one shortest route, making
  solvability a construction guarantee (fixed 2026-07-03; see [known-issues.md](known-issues.md)). At
  **runtime**, the **enemy aircraft is guarded too**: every airdrop runs the same flood-fill and discards
  any mine that would cut the last safe route (the drop just doesn't happen — a pass can place 0 mines).
  Combined with the invariant that mines never land on the player's `visited` trail, the field is
  winnable under all circumstances. Covered by solvability tests (300 seeded + 100 random fields; 40
  seeds × 8 airplane passes; named carve-repair regressions) plus structure/determinism/movement-funnel
  tests.
- **Two aircraft, one seeded sky** — the **red enemy bomber** drops mines (solvability-guarded,
  forward-biased columns); the **white friendly recon plane** is the green-gem reward: summoned by
  `spawnFriendlyPlane`, it flies a purely seeded row (`:friendly` stream, independent of field state,
  so the N-th pass is identical for every daily player) and **permanently reveals every live mine in
  that row** — committed to `revealedMines` at spawn, so a save mid-flight can't lose the reward.
- **Debug overlay** — `zx-kit/debug` (`createDebugMonitor` / `beginFrame` / `endFrame` /
  `sampleDebug` / `drawDebugOverlay`); toggled with `O`. Shows FPS, frame ms, JS CPU load, and
  custom fields (phase, run state, level, mine count). Minefield is zx-kit's first `debug` consumer.

## Code architecture

```
src/
├── config.ts      ← all tunable game parameters (levels, gems, buildings, timings); atLevel() lookup
├── constants.ts   ← technical constants: resolution, palette re-export from zx-kit
├── font.ts        ← re-export of the ZX ROM font from zx-kit
├── sprites.ts     ← all sprites + tile factories as Uint8Array (8×8 px)
├── audio.ts       ← Web Audio engine: warnings, explosion, fanfare, aircraft; + per-card story-intro AY score + typewriter tick
├── input.ts       ← wrapper over zx-kit input (key-repeat config + game keys)
├── game.ts        ← GameState, TileMap, minefield/gem/building generation, daily seed, solvability
├── player.ts      ← movement, collision, flag, respawn, scoring, gem pickup, combo
├── a11y.ts        ← screen-reader bridge: announce/status live regions, legend, describeStep/orientation
├── airplane.ts    ← both aircraft: enemy bomber (timer, mine drop) + friendly recon plane (green-gem reward)
├── intro.ts       ← "Minefield" story intro: typewriter state machine + 5 hand-drawn scenes
├── renderer.ts    ← canvas rendering: TileMap, sprites, HUD, detector, night, overlays
├── save.ts        ← zx-kit save profile wiring (version 6, signed envelope)
├── highscore.ts   ← zx-kit hiscore adoption: level+date extras, auto-dating, legacy-table migration
├── strings.ts / strings.sk.ts / lang.ts ← i18n packs (EN/SK) + runtime locale switch
└── main.ts        ← game loop (requestAnimationFrame), phase switching ('story'→'intro'→'ingame'), debug overlay
```

## zx-kit features used

| zx-kit module | How Minefield uses it |
|---|---|
| `renderer` / `font` | canvas setup (×4), ROM bitmap font, sprites, scanlines, CRT curvature |
| `tilemap` | the playfield (ground/mine/gem/visited/fence/building tiles; flags are a game-side overlay) |
| `audio` | square-wave warnings/fanfares, aircraft drone; built-in `+`/`-` volume + HUD bar |
| `music` / `ay` | the **per-card story-intro score** (`seq` + `playAYLoop`, 3 voices + envelopes) — the only AY use; gameplay is pure beeper |
| `input` | key-repeat + gamepad; built-in `+`/`-` volume keys |
| `save` | typed save/load with versioning (v6) + FNV-1a envelope signature (anti-cheat deterrent) |
| `hiscore` | the local top-5 leaderboard (signed with the same secret; minefield adds level + daily date) |
| `rng` | seeded `mulberry32` for the daily field and both aircraft |
| `i18n` | EN/SK string packs, runtime `L` switch |
| `debug` | FPS/CPU overlay (Minefield is zx-kit's first `debug` consumer) |
