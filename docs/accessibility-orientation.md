# Accessibility — audio compass, replayable legend, blind orientation

> **Status (2026-07-05):** the directional **mine compass is shipped**; the three items
> below (A debug readout, B legend-replay key, C exit/gem orientation) are **spec'd but
> NOT implemented** — the owner is deliberately letting the UX marinate (testing on
> headphones + blindfolded first). Implement C only after the owner confirms it still
> feels right in play. This doc is the hand-off so a future session can continue without
> re-deriving context. Companion: `docs/accessibility-detector.md` (the visual detector,
> the deaf-side half of the promise).

## Why this exists

The v1.0 public promise (README, ships 2026-09-07) is full playability for blind **and**
deaf players. Channel-parity invariant (AGENTS.md): neither group may get *less* information
than a sighted-hearing player. A sighted player, in **scout mode**, can see the exit hole,
the gems, and buildings on the field (mines are hidden for everyone). A blind player today
gets **none** of that spatial orientation — that gap is what item C closes. Items A/B are
smaller supports around the shipped compass.

## Shipped foundation (do not change; reuse)

The mine compass, per step, encodes the **dominant live-mine direction within
`DENSITY_SCAN_RADIUS` cells** into three parity channels:

- **Audio** — `playDirectionCue(dir, intensity)` in `audio.ts`: a soft sine after the step.
- **HUD** — dim `ARROW_*` in `renderer.ts` (`renderDensityDir`).
- **ARIA/TTS** — `describeStep(state)` in `a11y.ts` (count + direction sentence).

All three read one source of truth: `dominantMineDir(map, col, row, radius)` in `game.ts`
(+ `mineCountToward`). It is intentionally a **dominant** direction over a **local** radius,
and returns `null` when no direction leads by `DENSITY_MIN_MARGIN` — so the field still has
to be explored (blind players must triangulate too; this was an explicit owner decision).

### Compass encoding — ground truth (pinned by `audio.test.ts`)

`compassAudio(dir): { pan, freq }` in `audio.ts` (pure, unit-tested against the config
constants so it can't drift out of sync with the spoken legend):

| dir | pan | pitch | player hears |
|---|---|---|---|
| `e` east / right | `+DIRCUE_PAN` | `DIRCUE_FREQ_MID` | right ear |
| `w` west / left | `−DIRCUE_PAN` | `DIRCUE_FREQ_MID` | left ear |
| `n` north / up | `0` | `DIRCUE_FREQ_HIGH` | high, centred |
| `s` south / down | `0` | `DIRCUE_FREQ_LOW` | low, centred |

Tunables in `config.ts`: `DIRCUE_PAN`, `DIRCUE_FREQ_HIGH/MID/LOW`, `DIRCUE_GAIN`,
`DIRCUE_DELAY_MS`, `DENSITY_SCAN_RADIUS`, `DENSITY_MIN_MARGIN`. Retune freely; the legend
string `STR_A11Y_LEGEND` (strings.ts / strings.sk.ts) describes this mapping to players and
**must be kept in sync** with any change.

### Free keys (verified against `input.ts` + `main.ts` keydown)

Taken: arrows, Shift+arrows, Shift+S (save), `D` (reveal), `R` (random), `P` (pause),
`F` (flag), `O` (debug overlay), `L` (language, intro), `I` (intro replay), letters
(hiscore name entry). **Free for a11y: `H`, `E`, `G`.**

---

## Item A — live pan/pitch debug readout (small, do first when resuming)

So the owner can *see on screen what the blind player hears* while tuning by ear.

- **File:** `main.ts`, the `showDebug` block that calls `sampleDebug(dbg, { … })`
  (the object already takes arbitrary key→value fields: `app`, `phase`, `run`, `lvl`, `mines`).
- **Add** a `compass` field:
  ```ts
  const cdir = dominantMineDir(state.map, state.playerCol, state.playerRow)
  const ca = cdir ? compassAudio(cdir) : null
  // inside sampleDebug({ … }):
  compass: ca ? `${cdir!.toUpperCase()} ${ca.pan >= 0 ? '+' : ''}${ca.pan.toFixed(2)} ${ca.freq}Hz` : '—',
  ```
- **Imports:** `dominantMineDir` from `game.ts`, `compassAudio` from `audio.ts`.
- Shows e.g. `compass: E +0.60 440Hz`, or `—` when no dominant direction. Toggle with `O`.

## Item B — replayable audio legend on `H`

Blind players shouldn't have to memorise the pan rules; a key lets them replay the legend
any time. (`#sr-legend` already exists as a static, navigable region — this adds on-demand
speech so they don't have to browse to it.)

- **File:** `main.ts`, the top-level keydown handler (next to the `O` handler).
- **Add**, guarded to every phase **except** hiscore (where `H` is a name letter):
  ```ts
  if (!e.repeat && (e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey && appPhase !== 'hiscore') {
    announce(L.STR_A11Y_LEGEND)   // assertive → screen reader reads it immediately
    e.preventDefault(); return
  }
  ```
- `announce`, `L` are already imported in `main.ts`. Works in intro (learn before playing)
  and in-game.
- **Optional:** advertise the key in `STR_A11Y_LEGEND` itself ("press H to hear this again")
  and/or in the pause "controls" page.

## Item C — blind orientation: exit + gems (the main feature)

Owner-confirmed UX (two-question AskUserQuestion):
- **Interaction = on-demand keys + a start-of-run summary** (not constant auto-chatter).
- **Format = relative direction + distance** (`"22 right, 3 up"`), consistent with the
  compass mental model — *not* absolute chessboard coordinates.

Parity/fairness: sighted players see the exit hole and gems in scout mode, so announcing
them to blind players is **parity, not an assist** → no leaderboard flag. Everything derives
from deterministic state, so the daily stays identical for all.

### C.1 `a11y.ts` — relative-phrase helper + three formatters

```ts
// "22 right, 3 up" from player → target. Omits a zero component; both zero → STR_A11Y_HERE.
// Uses word strings so it localises (see C.3).
function relPhrase(dCol: number, dRow: number): string

// Exit is the single hole in the right fence: column COLS-1, row state.exitRow.
export function describeExit(state: GameState): string          // "Exit: 22 right, 3 up."

// Nearest uncollected gem (min |dCol|+|dRow| over map.findById('gem')) + remaining count.
// Collected gems are already removed from the map (they become 'visited'), so
// findById('gem').length == gems still on the field. Empty → STR_A11Y_GEM_NONE.
export function describeGems(state: GameState): string          // "Nearest gem: 4 right, 2 down. 12 gems left."

// Start-of-run orientation summary (exit direction + gem count).
export function describeOrientation(state: GameState): string   // "Exit 22 right, 3 up. 12 gems on the field."
```

- Reuse: `state.map.findById('gem')`, `state.exitRow`, `COLS` (from `constants.ts`),
  `state.playerCol/Row`.
- `relPhrase(dCol,dRow)`: `dCol>0` → right, `<0` → left; `dRow>0` → down, `<0` → up
  (screen axes; matches the compass's E/right, S/down). Compose
  `"<|dCol|> <word>, <|dRow|> <word>"`, dropping any zero term.

### C.2 `main.ts` — query keys (in-game only)

In the keydown handler, add an in-game branch (must be gated so `E`/`G` don't leak into
hiscore name entry — both are letters):

```ts
else if (appPhase === 'ingame') {
  if (e.key === 'e' || e.key === 'E') { announce(describeExit(state)); e.preventDefault() }
  else if (e.key === 'g' || e.key === 'G') { announce(describeGems(state)); e.preventDefault() }
}
```
Import `describeExit`, `describeGems` from `a11y.ts`. (`state` is the module-level `let` in
`main.ts`; the closure reads the live value across level changes — fine.)

### C.3 Start summary + strings

- **Start summary:** in `startRun(random)` (`main.ts`), fold orientation into the existing
  mode status line so the polite region speaks one coherent sentence (a second `status()`
  call would overwrite the first before it's read):
  ```ts
  status(`${random ? L.STR_A11Y_MODE_RANDOM : L.STR_A11Y_MODE_DAILY} ${describeOrientation(state)}`)
  ```
  Optionally also on **resume** (the `readSaveLatest(...).ok → appPhase='ingame'` path).
- **Strings** (both `strings.ts` and `strings.sk.ts`; a11y strings are SPOKEN → **use full
  Slovak diacritics**, unlike the ROM-font UI strings):
  `STR_A11Y_RIGHT`, `STR_A11Y_LEFT`, `STR_A11Y_UP`, `STR_A11Y_DOWN`, `STR_A11Y_HERE`,
  `STR_A11Y_EXIT(rel)`, `STR_A11Y_GEM_NEAREST(rel, n)`, `STR_A11Y_GEM_NONE`,
  `STR_A11Y_ORIENT(exitRel, gemCount)`.

### C.4 Tests

- `a11y.test.ts` (jsdom; reuse the existing `cleanState(pcol,prow)` + `mine()` helpers):
  - `describeExit` — put the player left of the exit, assert the phrase contains the column
    distance and "right".
  - `describeGems` — two gems at different distances → the nearer one's phrase; assert the
    remaining count; empty field → `STR_A11Y_GEM_NONE`.
  - `describeOrientation` — contains the exit direction and the gem count.
  - `relPhrase` — drops a zero component (same row → no "up/down"); both zero → `STR_A11Y_HERE`.
- `strings.test.ts` — new `STR_A11Y_*` non-empty in EN and SK.
- Query keys `E`/`G`/`H` aren't unit-testable (keydown in `main.ts`); the pure formatters
  they call are the tested surface.

---

## OPEN — awaiting owner playtest

The interaction model + format are chosen, but the owner will validate by ear / blindfolded
before C is built, and may adjust after playtest:

- Is on-demand enough, or is a gentle **proximity ping** when adjacent to a gem also wanted
  (so a gem isn't walked past)? Deferred; easy to add later as an opt-in.
- Should **buildings/obstacles** also be announceable (sighted players see them)? Likely a
  follow-on parity item, out of scope here.
- Exact wording/verbosity of the sentences (tune for how it *sounds* read aloud, not how it
  reads on the page).

Do not implement C until the owner gives the go-ahead. A/B are lower-risk and can land first.

## Verification (for whoever implements this)

Node 22 (`export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH"`), in `minefield/`:
`npx tsc --noEmit`, `npm test`, `npm run build`. Manual: headphones + VoiceOver (`Cmd+F5`) —
`H` replays the legend; `E`/`G` announce exit / nearest gem relatively; the start summary
speaks on run start; the `O` debug overlay shows `compass: <dir> <pan> <freq>` while walking.
Owner commits — do not commit.
