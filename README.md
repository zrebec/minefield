# THE STRIP — ZX Spectrum Edition

> *The game's name is **The Strip** — shown on the title screen, in the browser tab (`<title>`)
> and told in the story intro. The repository, npm package and live URL are still `minefield` until
> a focused rename (dir + GitHub + Pages base); the internal save key stays `minefield` so existing
> saves survive. See [ROADMAP](ROADMAP.md).*

> A retro browser game inspired by 1980s ZX Spectrum titles. Cross a blind minefield by **listening** —
> the closer the mines, the more urgent the sound — backed by a visual danger detector for players
> who can't (or don't want to) rely on audio.
> Vanilla TypeScript · HTML5 Canvas · Web Audio API · [zx-kit](https://www.npmjs.com/package/zx-kit)

![ZX Spectrum 256×192](https://img.shields.io/badge/ZX_Spectrum-256×192-00CD00?style=flat-square&labelColor=000000)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-0000FF?style=flat-square&labelColor=000000)
![Vite](https://img.shields.io/badge/Vite-8.x-FFFF00?style=flat-square&labelColor=000000)
![zx-kit](https://img.shields.io/badge/zx--kit-0.36-00CDCD?style=flat-square&labelColor=000000)

**Live:** GitHub Pages · auto-released via semantic-release on push to `main`.

## Screenshots

<p align="center">
  <a href="docs/img/intro.png"><img src="docs/img/intro.png" alt="Title / intro screen" width="48%"></a>
  <a href="docs/img/play.png"><img src="docs/img/play.png" alt="Mid-game: coloured trail, gems, HUD detector" width="48%"></a>
</p>

<p align="center">
  <a href="https://zrebec.github.io/minefield/">Play</a> ·
  <a href="ROADMAP.md">Roadmap</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="docs/known-issues.md">Known issues</a>
</p>

## At a Glance

| Property | Value |
|---|---|
| Status | Playable · **LIVE** · stabilising toward 1.0 |
| Runtime | Browser game (static Vite bundle) |
| Stack | TypeScript · Vite · Canvas · Web Audio · zx-kit |
| Native resolution | 256×192 (integer ×4) |
| Runtime dependencies | `zx-kit` only |
| Tests | 341 (Vitest) |
| Last verified | 2026-07-03 |

---

## Story

*Two countries that never declared a war — and never ended one.* Between them they carved a stretch of
no man's land and called it **the Strip**. Overnight it tore families apart — mothers from sons, lovers,
friends, each stranded on a different side — and **each night a plane reseeds the Strip** with mines to keep
them apart. (That is the in-world reason the **daily** field changes every day, and why an aircraft keeps
sowing mines mid-run.) For years no one could cross; the field swallowed all who tried.

Then **one man** watched *how* they sowed it, found the **pattern**, and built a **home-made sonar** that
hears a mine close by — and suddenly knew a safe way through. The people would not risk their own lives, so
they pressed **parcels** into his hands — for a mother, a love, a son across — and he carries them home.
*Sowing = the daily reseed · the pattern = the seed · the sonar = the audio warning · the parcels = the
gems · crossing = the win.*

A **5-chapter typewriter intro** (THE DIVIDE · TORN APART · NO WAY ACROSS · THE RUNNER · NEW HOPE) tells it
the first time you play (replay anytime with `I`; any key advances / skips). Each chapter is **hand-drawn in
8×8 tiles** (clash-correct by construction; dithered night skies via the kit's `drawShade`) and carries its
own **AY underscore** — a melancholic loop per card that darkens to a funeral dirge for *No Way Across* and
resolves into Beethoven's *Ode to Joy* for *New Hope*. AY is the **only** place The Strip touches the chip;
gameplay stays pure beeper.

---

## About

You're dropped into a **fenced** minefield and have to cross it — in through a gap in the left fence,
out through the **exit gap** in the right. You can't *see* the mines, you *hear* them: the more mines
around you, the lower and more intense the warning after each step. A **visual detector** in the HUD
mirrors that warning, so the game is fully playable without sound. Leave a coloured trail, collect
gems, and watch the sky — every few dozen seconds an aircraft flies over and drops fresh mines.

The field isn't open: **pseudo-3D buildings** (high-angle roofs with brick fronts) are scattered
across it as solid, mine-free obstacles you must go around. There are more of them each level, so
the field gradually becomes an irregular maze. They stay visible at night when the terrain darkens.

**The field is fenced in.** A solid perimeter wall runs down the left and right edges, each with a
single gap: the **entry** (your seeded start row) and the **exit** (a different seeded row, kept at
least a few rows apart, so there's never a straight line across). The exit is the only way out — you
have to *find a route* to it, not just walk right. Crucially, **the field is traversable under all
circumstances**: at generation a flood-fill proves a full safe entry→exit route (regenerating
deterministically on a board that lacks one, and — if every reroll stays sealed — **deterministically
defusing the mines on one shortest route**, so solvability is guaranteed by construction, not by
luck), and **the aircraft can never seal it either** — every airdrop is checked and any mine that
would cut the last safe route is discarded. A field is therefore **always winnable** — the challenge
is finding the path, not getting handed (or dropped) an impossible board.

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
| `SHIFT + ←→↑↓` | Flag / unflag the adjacent cell in that **absolute** direction (no turning needed) |
| `P` | Pause / resume |
| `SHIFT + S` | Manual save |
| `D` | Debug: reveal all mines — **idle only** (scout before you start; off once you move). **Disabled on the daily** (it would leak the scored solution); on **random/practice** it's capped (5 per level). |
| `O` | Toggle the **FPS / CPU debug overlay** (zx-kit `debug` module) |
| `+` / `-` | Volume up / down |

**On the title screen:** `SPACE` / `ENTER` / `S` (or gamepad Start) = **daily** run · `R` = **random** run
· **`I`** = (re)play the story intro · **`L`** = switch language (EN/SK, persisted; also updates the page's
`lang` for screen readers). The title is the landing screen; a save-resume goes straight into the game.

**The story intro** plays as a pre-roll when it's "due" (first time, after a content refresh, or once per
window — daily until v1.0) or on demand via `I`. During it, **any key** finishes typing the current card /
advances / skips.

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

1. Enter through the **gap in the left fence** (seeded entry row).
2. Move to reveal ground — visited cells take a contrasting trail colour (per terrain).
3. **Win the level:** find and step through the **gap in the right fence** (a different, seeded exit
   row) to cross the right edge (`newCol >= COLS`). The exit is the only crossing — the rest of the
   right wall is solid. A safe entry→exit route is **always guaranteed** — at generation and after every
   airdrop.
4. Stepping on a mine = explosion, flash, lose a life, respawn at the entry.
5. **Beat the clock:** each level has a countdown (see Timer); reaching 0:00 ends the run.
6. 0 lives **or** 0:00 = GAME OVER. On game over, saves are cleared (no save-scumming).

### Levels

| Level | Mines | Lives | Terrain | First aircraft | Aircraft interval |
|-------|-------|-------|---------|----------------|-------------------|
| 1 | 50 | 3 | always grass | 15–30 s | 20–45 s |
| 2 | 80 | 3 | random | 12–20 s | 15–30 s |
| 3 | 100 | 2 | random | 10–15 s | 10–20 s |
| 4+ | 110 | 2 | random | 8–12 s | 8–15 s |

Terrain (grass / snow / dust) sets the background and trail colour. **Cluster** mines appear from
level 2, **beacon** (ranged, cyan) mines from level 3. Building count rises per level.

### Timer

Each level starts with a **10:00** countdown (`TIMER_BASE_MS`). It ticks **only while you're moving**
— idle scouting and pause freeze it — and **resets to the base every level** (leftover time is not
carried over). Reaching **0:00 ends the run instantly**. Gems buy time back (below). The HUD clock
turns **red and blinks under 1:00**. All timer values are tunable constants in `config.ts`.

The timer is a deliberate counter to "cheese" — patiently stepping back and forth to re-sample the
proximity count and triangulate every mine. With a clock running, you deduce the cells that matter
and take calculated risks on the rest.

### Gems (12 per level: 3 red · 6 cyan · 1 gold · 2 green)

Every gem grants **+1000 score** and a **colour-specific time bonus**. Red, cyan and gold also have a
special function; green is collect-only for now (its special is an open design decision — see the roadmap).

| Gem | Time | Special |
|-----|------|---------|
| 🔵 cyan | +0:00 | **3 collected = permanently reveal one live mine** (seeded; visible even at night) |
| 🟢 green | +0:05 | collect-only for now (special undecided — see [Roadmap](ROADMAP.md)) |
| 🔴 red | +0:10 | **2 collected = +1 life** |
| 🟡 gold | +0:30 | rare; **+5000 score bonus** on top of the flat +1000 |

Rarer gems give more time (cyan is the most common, so it gives none). Inventory shows on the first
HUD row (1:1 sprites, cap 32); a full backpack leaves a gem on the field — and grants no time.

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
- **6-row HUD** — the bottom 6 cell-rows are the HUD (playfield is the top 32×18), one concern per
  row: backpack · timer · score+detector · mines+level · day/night · lives+random-tag.
- **Save** — `zx-kit/save`, **version 5** (the v4→v5 bump came with the perimeter fence: a v4 map has
  open edge columns and no exit gap, so its semantics no longer match — it's cleanly rejected and the
  game falls back to the title screen). Round-trips map, lives, score, inventory, revealed mines,
  day/night, seed, the **exit row**, **and the remaining time** — so a reload resumes exactly.
- **Custom key-repeat + gamepad** via `zx-kit/input` (immediate → 150 ms delay → 80 ms repeat).
- **TV border** via `document.body` background, state-driven (blue intro / black play / green level /
  red game over) + `flashBorder()` for explosions.
- **TileMap** (`zx-kit`) holds ground/mine/gem/visited/flag/building tiles; `findById('mine')` powers
  both the reveal debug and the planned Action Replay.
- **Buildings & fix-trap rule** — high-angle buildings are solid, mine-free boxes (see
  [`docs/buildings.md`](docs/buildings.md)); `fixObstacleTraps()` guarantees you never face
  *obstacle ahead + mines on both sides* around any solid obstacle — buildings **and the fence**.
- **Perimeter fence & always-guaranteed solvability** — a solid wall encloses the left/right edges with
  one entry gap (start row) and one exit gap (a seeded row kept ≥ `MIN_ENTRY_EXIT_ROW_GAP` apart). At
  **generation** a flood-fill (`isFieldSolvable`) proves a full safe entry→exit route, deterministically
  regenerating per seed if a board ever seals the exit off — and if **every** reroll stays sealed (raw
  unsolvability reaches ~90% per attempt at L4+ densities, so it happens: measured ~0.7% of L4+ fields
  before the fix), a deterministic **carve repair** defuses the mines on one shortest route, making
  solvability a construction guarantee (fixed 2026-07-03; see `docs/known-issues.md`). At **runtime**,
  the **aircraft is guarded too**: every airdrop runs the same flood-fill and discards any mine that
  would cut the last safe route (the drop just doesn't happen — a pass can place 0 mines). Combined
  with the invariant that mines never land on the player's `visited` trail, the field is winnable
  under all circumstances. Covered by solvability tests (300 seeded + 100 random fields; 40 seeds × 8
  airplane passes; named carve-repair regressions) plus structure/determinism/movement-funnel tests.
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
├── audio.ts       ← Web Audio engine: warnings, explosion, fanfare, aircraft; + per-card story-intro AY score + typewriter tick
├── input.ts       ← wrapper over zx-kit input (key-repeat config + game keys)
├── game.ts        ← GameState, TileMap, minefield/gem/building generation, daily seed
├── player.ts      ← movement, collision, flag, respawn, scoring, gem pickup
├── airplane.ts    ← aircraft timer, animation, mine drop
├── intro.ts       ← "The Strip" story intro: typewriter state machine + hand-drawn establishing shot
├── renderer.ts    ← canvas rendering: TileMap, sprites, HUD, detector, overlays
├── save.ts        ← zx-kit save profile wiring
└── main.ts        ← game loop (requestAnimationFrame), phase switching ('story'→'intro'→'ingame'), debug overlay
```

**Dependencies:** `zx-kit@^0.36.0` only — everything else is the Web Platform.

**Local dev:**
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm test         # unit tests (Vitest) — 341 tests
npm run capture  # refresh docs/img screenshots (Playwright)
```

---

## zx-kit Features Used

| zx-kit module | How Minefield uses it |
|---|---|
| `renderer` / `font` | canvas setup (×4), ROM bitmap font, sprites, scanlines, CRT curvature |
| `tilemap` | the playfield (ground/mine/gem/visited/flag/fence/building tiles) |
| `audio` | square-wave warnings/fanfares, aircraft drone; built-in `+`/`-` volume + HUD bar |
| `music` / `ay` | the **per-card story-intro score** (`seq` + `playAYLoop`, 3 voices + envelopes) — the only AY use; gameplay is pure beeper |
| `input` | key-repeat + gamepad; built-in `+`/`-` volume keys |
| `save` | typed save/load with versioning (v5) |
| `rng` | seeded `mulberry32` for the daily field and airplane behaviour |
| `debug` | FPS/CPU overlay (Minefield is zx-kit's first `debug` consumer) |

## Current State

| Area | State | Notes |
|---|---|---|
| Core loop | Complete | cross → levels → highscore → save |
| Fence + solvability | Complete | winnable under all circumstances (generation + airdrop guard + carve repair, 2026-07-03) |
| Story + intro | **Done (music tuning pending)** | 5-chapter typewriter intro + per-card AY score + 5 hand-drawn scenes + chapter titles; music tuned by ear |
| Save / load | Complete | version 5; auto-resume; cleared on game over |
| Tests | 341 | seeded solvability + property tests; + intro/audio + a11y contract coverage |
| Accessibility | In progress | visual detector done; **ARIA skeleton + live document `lang` shipped 2026-07-03**; stereo/TTS/beacon next (v1.0 scope) |
| Visuals | Readable | screenshots may be refreshed to show the fence + intro |

## Related Links

- [AGENTS.md](AGENTS.md) — permanent agent rules
- [CLAUDE.md](CLAUDE.md) — execution guide / architecture
- [ROADMAP.md](ROADMAP.md) — live backlog
- [Known issues](docs/known-issues.md)
- [zx-kit](https://www.npmjs.com/package/zx-kit)

---

## Accessibility

**Our public commitment: v1.0 (The Strip, `2026-09-07`) will be fully playable by blind and by
deaf players.** Not "compatible" — playable, start to finish, including the menus.

- **Deaf players — done.** The game is audio-primary but **not** audio-only: the HUD detector
  (shipped 2026-06-17) mirrors every warning visually — a 4-segment adjacent-mine meter plus a
  separate beacon LED — so no information exists in sound alone.
- **Blind players — in progress, v1.0 scope.** Coming with v1.0: **stereo/spatial warnings** (mine
  direction in the L/R channels — the engine primitive shipped in zx-kit 0.36), a **screen-reader
  live region + TTS** for warnings, state and every screen of the shell (title, pause, high-score
  entry, intro), an **exit beacon** tone, and an **assist-mode** flag so assisted runs are marked
  on the leaderboard. The ARIA skeleton (live regions, canvas labelling, live document `lang`)
  landed 2026-07-03; the game is already fully keyboard-driven.

An audio-first "playable blind" deductive traversal is an under-served niche — this is the
strongest moat the game has, and it ships with 1.0, not "someday". See `ROADMAP.md` (P1) and
`retro/docs/sk/minefield.md` §7.

## License

MIT — do what you want, Sinclair would be proud. 🕹️
