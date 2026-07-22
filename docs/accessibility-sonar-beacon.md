# Accessibility — sonar sweep (`D`) & exit beacon (`E`)

> **Status (2026-07-22):** both **SHIPPED**. `D` = on-demand audio radar sweep of nearby mines
> (the audio twin of the budget-gated visual reveal); `E` = exit beacon tone (the audio twin of the
> spoken exit bearing). This doc is the **implementation reference** — the exact encoding, the
> constants, and *what channel carries what information*. Design rationale + owner playtest history
> live in `retro/docs/sk/a11y.md` §5. Companions: `accessibility-detector.md` (deaf-side visual
> detector), `accessibility-orientation.md` (`E`/`G` spoken bearings).

## What these two keys are (and are NOT)

- **`D` — sonar sweep.** An audio-only radar. On *every* press while standing it plays one panned
  blip per live mine inside `SCAN_RADIUS`, nearest first. It gives **directions**, not exact cells —
  it does **not** replace triangulation (the core puzzle). It is the audio channel of the "reveal"
  key; the **visual** reveal that shares the same key is separately budget-gated (see below).
- **`E` — exit beacon.** A single centred tone whose loudness says "how close am I to the exit
  column" and whose pitch says "is the exit north or south of me". Pressed alongside the spoken exit
  bearing (`describeExit`): the **tone carries the feel** (hot/cold + up/down), the **speech carries
  the exact numbers**.

Neither is a continuous/unsolicited signal — both fire only on a key press. That is the line that
separates them from the **reverted directional compass** (see `accessibility-orientation.md` →
"Compass post-mortem"): on-demand + diegetic (the runner built a sonar) is allowed; continuous
density hints are banned.

## Who each channel serves

| Player | `D` visual reveal | `D` sonar sweep | HUD detector | `E` beacon |
|---|---|---|---|---|
| Sighted + hearing | budget-gated peek | audible | mirrors the beep | audible |
| **Blind** | (can't use) | **primary** | (can't use) | **primary** |
| **Deaf** | budget-gated peek | (can't hear) | **primary** (already done) | (can't hear) |

The sonar is an **audio** channel, so it primarily serves **blind** players (and any sighted player
who chooses to listen). The deaf are served by the **visual HUD detector** (the 4-segment meter +
beacon LED), which is already complete. Do not conflate "sonar" with "for the deaf".

## `D` — the two independent halves

`D` does two things on one press, deliberately decoupled:

1. **Sonar sweep — AUDIO — unlimited for everyone, every mode.** `scanMines(state, SCAN_RADIUS,
   SCAN_MAX_BEEPS)` in `game.ts` → `playSonarSweep(hits)` in `audio.ts`. Parity by construction: the
   audio channel costs nothing but the **~2 s of live clock** it sounds while the run timer ticks.
   Never a silent no-op — an empty radius plays the "all clear" blip.
2. **Visual reveal — VISUAL — budget-gated.** `tryToggleReveal(state)`. Daily `DAILY_REVEAL_LIMIT =
   0` → **never shows** the mines visually. Random `RANDOM_REVEAL_LIMIT = 1` → **one** activation per
   level, then off. Turning the reveal OFF is free; each ON consumes one; the next *step* hides it
   again (a budgeted peek). A spent budget no longer beeps `playDenied` — the sweep IS the response.

So, concretely, matching the owner's AirPods Pro playtest:

- **Daily run:** `D` = **pure sonar for everyone** (audio always plays; the visual reveal is 0, so
  the mines are never drawn). Nobody gets a free visual map on the scored board.
- **Random run:** `D` = sonar (always) **plus** one visual reveal of the live mines for the level;
  after that first peek, `D` is sonar-only for the rest of that level.

The gate is a single `[D-GATE]` block at the top of the `phase === 'playing'` branch in `main.ts`
(`if (consumeDebug() && runState !== 'paused')`). Paused freezes it (drained + dropped). CLAUDE.md →
"Debug keys" has the revert-to-idle-scout-only recipe.

## Sonar sweep — exact encoding (`scanBeepParams` in `audio.ts`)

For each hit, `dCol = mineCol − playerCol`, `dRow = mineRow − playerRow`,
`dist = max(|dCol|, |dRow|)` (Chebyshev — a square window).

| Info | Channel | Formula | Feel |
|---|---|---|---|
| **East / West** | **stereo pan** | `pan = clamp(dCol / SCAN_RADIUS, −1, +1)` | mine to your right → sound on the right; left → left |
| **North / South** | **pitch** | `freq = SCAN_FREQ_BASE + (−dRow)·SCAN_FREQ_ROW_STEP` | same row = 440 Hz; **north = higher**, south = lower |
| **Distance** | **volume** | linear `SCAN_VOL_NEAR` @ dist 1 → `SCAN_VOL_FAR` @ dist = radius | **nearer = louder** |

- Detects **live** mines only (`findById('mine')` — undetonated, off the walked trail; a stepped-on
  mine is `exploded`, a walked cell is `visited`).
- **Order:** nearest first, then by `dCol`, then `dRow` — deterministic, so the same board always
  plays the same sweep.
- **Cap:** `SCAN_MAX_BEEPS = 16` (nearest win; the rest are dropped so a dense field can't stretch
  the sweep past ~2 s).
- **Empty radius:** one centred low "all clear" blip (`SCAN_ALLCLEAR_FREQ`, `SCAN_ALLCLEAR_MS`).
- **Overlap guard, NOT a cooldown:** a `D` press *while a sweep is still sounding* is ignored
  (`sweepUntil`), so two sweeps can't interleave into an unreadable chord. Presses are otherwise
  unlimited. There is deliberately **no `SCAN_COOLDOWN`** — the cost is time on the clock.

### Sonar constants (`config.ts`, "Sonar sweep (D)")

| Const | Value | Meaning |
|---|---|---|
| `SCAN_RADIUS` | `5` | reach in cells (Chebyshev square window) |
| `SCAN_BEEP_MS` / `SCAN_GAP_MS` | `40` / `80` | one ping: beep length / silent gap after (slot = 120 ms) |
| `SCAN_MAX_BEEPS` | `16` | hard cap on pings per sweep (≈ 1.9 s worst case) |
| `SCAN_FREQ_BASE` / `SCAN_FREQ_ROW_STEP` | `440` / `55` | pitch: base (same row) / Hz per row N–S. Span ≈ 165–715 Hz |
| `SCAN_VOL_NEAR` / `SCAN_VOL_FAR` | `0.5` / `0.12` | volume at dist 1 / at edge of radius |
| `SCAN_ALLCLEAR_FREQ` / `SCAN_ALLCLEAR_MS` | `140` / `120` | the "nothing in range" blip |

## Exit beacon — exact encoding (`exitBeaconParams` / `playExitBeacon` in `audio.ts`)

`dCol = (COLS−1) − playerCol` (horizontal cells to the exit **column**, always ≥ 0 — the exit is
always on the east edge). `dRow = exitRow − playerRow`.

| Info | Channel | Formula | Feel |
|---|---|---|---|
| **Distance to exit column** | **volume** | geometric fade: `VOL_MAX` at ≤ `NEAR_DIST`, → `VOL_MIN` at ≥ `FAR_DIST` | **closer to the exit column = louder** (hot/cold) |
| **North / South** | **pitch** | `freq = max(FREQ_MIN, FREQ_BASE + (−dRow)·FREQ_ROW_STEP)` | **exit north = higher**, south = lower — *same rule as the sonar* |
| East / West | — | *(none — no pan)* | the exit is always east, so stereo would carry nothing |
| **On the exit's exact row** | **double beep** | `dRow === 0` → two short beeps instead of the sustained tone | "you're level — go straight east" |

- **Volume is the opposite of a constant.** At the *start* of a run you are ~31 columns from the
  exit → the tone sits at `BEACON_VOL_MIN` (a near-silent whisper), not loud. As you move **east**,
  `dCol` shrinks and the volume **swells geometrically** (perceptually even per column) up to
  `BEACON_VOL_MAX` at `≤ BEACON_NEAR_DIST` columns. Max loudness ⇒ you are basically at the exit
  column. (This corrects a common mental model of "loud at start, fades" — it is the reverse.)
- **Not auto-played at run start** (you're at max distance there → inaudible; the spoken orientation
  covers the start) and **not on resume** (that runs before the first audio-unlocking gesture). The
  beacon sounds **only on `E`**.
- **The double-beep alignment marker exists because pitch is a *relative* cue.** Absolute pitch is
  rare (~1 in 10 000), so a continuous pitch can never say *which* pitch is "centre". The zero-
  crossing (`dRow === 0`) therefore gets its own categorical earcon — the aviation-ILS "steady
  on-course" / radar-"lock" convention. No ±1 tolerance: movement is per-cell, so exact 0 is fairly
  reachable, and a tolerance band would blur the one row that matters.

### Beacon constants (`config.ts`, "Exit beacon (E)")

| Const | Value | Meaning |
|---|---|---|
| `BEACON_TONE_MS` | `200` | length of the single sustained tone |
| `BEACON_FREQ_BASE` / `BEACON_FREQ_ROW_STEP` / `BEACON_FREQ_MIN` | `440` / `18` / `90` | pitch: base (level) / Hz per row N–S / floor so the far south stays audible |
| `BEACON_NEAR_DIST` / `BEACON_FAR_DIST` | `3` / `31` | volume plateau (≤ NEAR = max) / whisper floor (≥ FAR = min). FAR ≈ entry→exit distance |
| `BEACON_VOL_MAX` / `BEACON_VOL_MIN` | `0.5` / `0.03` | loudest (at the exit column) / quietest (at the start) |
| `BEACON_ALIGN_BEEP_MS` / `BEACON_ALIGN_GAP_MS` | `80` / `70` | the two beeps + gap of the on-row alignment marker |

## Open gaps — audio the player still does NOT get (future work)

These are the "you bumped into something and nothing told you" holes. All are **spoken/earcon**
tasks, not new visual work. Tracked in `retro/docs/sk/a11y.md` §6.

1. **"You can't go further east."** The exit beacon tells you the exit *column* is close (loud) and
   whether you're level (double beep), but if you reach the east **fence off the exit row**, nothing
   says the wall stopped you — you can hear you're near the exit column yet not know you've run out
   of X and must go find the exit row. Needs a distinct "blocked by the east wall" earcon (or a
   generic "move blocked" cue, below).
2. **No flag-placement audio.** Placing / clearing a flag (`F` / SHIFT+arrow) is silent — a blind
   player has no confirmation the flag landed.
3. **No "edge of a building / blocked direction" audio.** When a building (or fence) blocks a
   direction, the move is silently swallowed. A blind player walking a building's edge can't tell a
   blocked side from a walkable one and must probe blindly. Needs a short "that way is blocked" cue
   (ideally a single generic *blocked-move* earcon that also covers gap #1's east wall).

## Constants + code index

- Constants: `config.ts` — `SCAN_*`, `BEACON_*` blocks (ear-tuning knobs; defaults are a start).
- Sweep data: `scanMines` (pure) + `ScanHit` in `game.ts`.
- Audio: `scanBeepParams` / `playSonarSweep` / `exitBeaconParams` / `playExitBeacon` in `audio.ts`
  (raw Web Audio graph with `StereoPannerNode` + per-blip gain — zx-kit `beep()` has no gain arg, so
  volume-by-distance needs the raw graph).
- Gate: `[D-GATE]` in `main.ts` (`phase === 'playing'`); beacon call `exitBeacon()` → `playExitBeacon`.
- Design + playtest history: `retro/docs/sk/a11y.md` §5 (and §6 for the open gaps above).

> **The ear is the real gate.** Every `SCAN_*` / `BEACON_*` number is an owner starting point; the
> blind-tester playtest (September 2026) decides the final tuning. Do not "fix" these by intuition.
