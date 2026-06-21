# MINEFIELD — ZX Spectrum Edition

> A retro browser game inspired by 1980s ZX Spectrum titles. Cross a blind minefield by **listening** —
> the closer the mines, the more urgent the sound — backed by a visual danger detector for players
> who can't (or don't want to) rely on audio.
> Vanilla TypeScript · HTML5 Canvas · Web Audio API · [zx-kit](https://www.npmjs.com/package/zx-kit)

![ZX Spectrum 256×192](https://img.shields.io/badge/ZX_Spectrum-256×192-00CD00?style=flat-square&labelColor=000000)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-0000FF?style=flat-square&labelColor=000000)
![Vite](https://img.shields.io/badge/Vite-8.x-FFFF00?style=flat-square&labelColor=000000)
![zx-kit](https://img.shields.io/badge/zx--kit-0.33-00CDCD?style=flat-square&labelColor=000000)

**Live:** GitHub Pages · auto-released via semantic-release on push to `main`.

---

## About

You're dropped on a minefield and have to cross it — left edge to right edge. You can't *see* the
mines, you *hear* them: the more mines around you, the lower and more intense the warning after each
step. A **visual detector** in the HUD mirrors that warning, so the game is fully playable without
sound. Leave a coloured trail, collect gems, and watch the sky — every few dozen seconds an aircraft
flies over and drops fresh mines.

The field isn't open: **pseudo-3D buildings** (high-angle roofs with brick fronts) are scattered
across it as solid, mine-free obstacles you must go around. There are more of them each level, so
the field gradually becomes an irregular maze. They stay visible at night when the terrain darkens.

Two ways to play:

- **Daily** — the seed is the date, so everyone in the world plays the **same field** that day
  (Wordle-style comparable scores). Scores count toward the leaderboard.
- **Random** — a fresh field for practice; **never** written to the leaderboard.

It's a deliberate homage to the ZX Spectrum (1982): pixel art with no anti-aliasing, the exact
15-colour palette, the 8×8 ROM bitmap font, and biting 1-bit-flavoured square-wave sound.

---

## Controls

| Key | Action |
|-----|--------|
| `←` `→` `↑` `↓` | Move (key-repeat: 150 ms delay, 80 ms interval). Also full **gamepad** support. |
| `F` | Flag / unflag the cell **in front** of the player |
| `P` | Pause / resume |
| `SHIFT + S` | Manual save |
| `D` | Debug: reveal all mines — **idle only** (scout before you start; off once you move) |
| `O` | Toggle the **FPS / CPU debug overlay** (zx-kit `debug` module) |
| `+` / `-` | Volume up / down |

**On the title screen:** `SPACE` / `ENTER` / `S` (or gamepad Start) = **daily** run · `R` = **random** run.

> Why `D` and `O`? Browsers reserve most "obvious" debug chords (`F12`, `Ctrl+Shift+B`, `F3`), so
> game-local single letters are used instead. `D` reveals mines (a gameplay scouting aid, idle only);
> `O` toggles the performance overlay (a dev aid, any time). zx-kit's `Ctrl+Shift+B` and gamepad **Y**
> still map to the mine-reveal debug too.

### Audio warning (after every step)

| Adjacent mines | Sound |
|----------------|-------|
| 0 | silence |
| 1 | 880 Hz · 1 pip |
| 2 | 740 Hz · 2 pips |
| 3 | 587 Hz · 3 pips |
| 4 | 440 Hz · 4 pips |
| 5–6 | 330–220 Hz · fast buzz |
| 7–8 | 110 Hz · ominous hum |

The HUD detector splits this into **adjacent** mines (0–4, amber/red discs) plus a separate **beacon**
LED for ranged (2-cell) mines — see [`docs/accessibility-detector.md`](docs/accessibility-detector.md).

---

## Goal and loop

1. Start at the **left edge** (seeded start row).
2. Move to reveal ground — visited cells take a contrasting trail colour (per terrain).
3. **Win the level:** reach the **right edge** (`newCol >= COLS`).
4. Stepping on a mine = explosion, flash, lose a life, respawn at the start.
5. 0 lives = GAME OVER. On game over, saves are cleared (no save-scumming).

### Levels

| Level | Mines | Lives | Terrain | First aircraft | Aircraft interval |
|-------|-------|-------|---------|----------------|-------------------|
| 1 | 50 | 3 | always grass | 15–30 s | 20–45 s |
| 2 | 80 | 3 | random | 12–20 s | 15–30 s |
| 3 | 100 | 2 | random | 10–15 s | 10–20 s |
| 4+ | 110 | 2 | random | 8–12 s | 8–15 s |

Terrain (grass / snow / dust) sets the background and trail colour. **Cluster** mines appear from
level 2, **beacon** (ranged, cyan) mines from level 3. Building count rises per level.

### Gems (12 per level: 3 red · 6 cyan · 1 gold · 2 green)

| Gem | Effect |
|-----|--------|
| 🔴 red | **2 collected = +1 life** |
| 🔵 cyan | **3 collected = permanently reveal one live mine** (seeded; visible even at night) |
| 🟡 gold | rare; collect-only for now (planned: **score**, maybe **+time**) |
| 🟢 green | collect-only for now (planned: **shield**) |

Inventory shows in the top HUD row (1:1 sprites, cap 32).

### Aircraft

Every few dozen seconds an aircraft crosses the screen (~3 s) and drops **3–10 new mines** on
unvisited, non-building cells. The status bar blinks `** AIRCRAFT **`; the engine sound is
LFO-modulated for an authentic drone.

---

## Technical highlights

- **Authentic colour clash** — each 8×8 cell has one ink + paper; stepping onto a cell flips the
  whole block. Because everything is grid-aligned, clash works *for free* here.
- **ROM bitmap font** — `zx-kit/font` 8×8 glyphs drawn pixel-by-pixel (no CSS fonts / `fillText`).
- **Web Audio square wave** — warnings/fanfares via `playPattern`; aircraft uses an LFO drone.
- **`setupCanvas(canvas, 4)`** — 256×192 game pixels → 1024×768, `ctx.scale(4,4)`; CSS handles
  responsive display. `curveDisplay()` adds CRT curvature; `drawScanlines()` the scanline overlay.
- **Custom key-repeat + gamepad** via `zx-kit/input` (immediate → 150 ms delay → 80 ms repeat).
- **TV border** via `document.body` background, state-driven (blue intro / black play / green level /
  red game over) + `flashBorder()` for explosions.
- **TileMap** (`zx-kit`) holds ground/mine/gem/visited/flag/building tiles; `findById('mine')` powers
  both the reveal debug and the planned Action Replay.
- **Buildings & fix-trap rule** — high-angle buildings are solid, mine-free boxes (see
  [`docs/buildings.md`](docs/buildings.md)); `fixWallTraps()` guarantees you never face
  *obstacle ahead + mines on both sides* (8 unit tests + a property test across 20 generated levels).
- **Debug overlay** — `zx-kit/debug` (`createDebugMonitor` / `beginFrame` / `endFrame` /
  `sampleDebug` / `drawDebugOverlay`); toggled with `O`. Shows FPS, frame ms, JS CPU load, and
  custom fields (phase, run state, level, mine count). Minefield is zx-kit's first `debug` consumer.

---

## Code architecture

```
src/
├── config.ts      ← all tunable game parameters (levels, gems, buildings, timings)
├── constants.ts   ← technical constants: resolution, palette re-export from zx-kit
├── font.ts        ← re-export of the ZX ROM font from zx-kit
├── sprites.ts     ← all sprites as Uint8Array (8×8 px)
├── audio.ts       ← Web Audio engine: warnings, explosion, fanfare, aircraft
├── input.ts       ← wrapper over zx-kit input (key-repeat config + game keys)
├── game.ts        ← GameState, TileMap, minefield/gem/building generation, daily seed
├── player.ts      ← movement, collision, flag, respawn, scoring, gem pickup
├── airplane.ts    ← aircraft timer, animation, mine drop
├── renderer.ts    ← canvas rendering: TileMap, sprites, HUD, detector, overlays
├── save.ts        ← zx-kit save profile wiring
└── main.ts        ← game loop (requestAnimationFrame), phase switching, debug overlay
```

**Dependencies:** `zx-kit@^0.33.0` only — everything else is the Web Platform.

**Local dev:**
```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # production build → dist/
npm test       # unit tests (Vitest) — 234 tests
```

---

## Accessibility

The game is audio-primary but **not** audio-only: the HUD detector mirrors every warning visually,
so deaf players get the same information. Planned next: stereo/spatial warning (mine direction in the
L/R channels), an ARIA live region + TTS for screen readers, and an exit beacon — an audio-first
"playable blind" deductive traversal is an under-served niche. See `retro/docs/sk/minefield.md` §7.

## Known issues

`npm audit` reports a high `undici` advisory bundled inside the npm CLI (via semantic-release) — it is
**unfixable downstream, dev/CI-only, and never shipped** to players. See [`docs/known-issues.md`](docs/known-issues.md).

## License

MIT — do what you want, Sinclair would be proud. 🕹️
