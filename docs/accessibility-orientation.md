# Accessibility — replayable legend, blind orientation

> **Status (2026-07-09):** **Item C (exit/gem orientation) is SHIPPED** — `E` speaks the exit
> bearing, `G` the nearest gem, plus a start-of-run + resume summary (`describeExit` /
> `describeGems` / `describeOrientation` in `a11y.ts`, verified live in-browser). The directional
> mine compass was **REVERTED** earlier the same day (see "Compass post-mortem") — item A died with
> it. **Item B** (on-demand legend replay on `H`) remains spec'd and NOT implemented — the one
> orientation piece still open, low-risk, can land any time. Companion:
> `docs/accessibility-detector.md` (the visual detector, the deaf-side half of the promise).

## Why this exists

The v1.0 public promise (README, ships 2026-09-07) is full playability for blind **and**
deaf players. Channel-parity invariant (AGENTS.md): neither group may get *less* information
than a sighted-hearing player. A sighted player, in **scout mode**, can see the exit hole,
the gems, and buildings on the field (mines are hidden for everyone). A blind player today
gets **none** of that spatial orientation — that gap is what item C closes.

## Shipped foundation (do not change; reuse)

The `a11y.ts` bridge + wired live regions (0.52.0), which survived the compass revert:

- `announce(text)` — assertive region `#sr-announcer` (forces re-reads of identical text).
- `status(text)` — polite region `#sr-status` (dedupes identical consecutive lines).
- `setLegend(text)` — fills the navigable `#sr-legend` audio guide from `STR_A11Y_LEGEND`;
  refreshed on locale change.
- `describeStep(state)` — the per-step sentence (adjacent count + beacon), announced after
  every move in `main.ts`; the future TTS source.
- Status lines on run start / level complete / life lost / game over, EN + SK
  (`STR_A11Y_*`, spoken → full diacritics).

## Compass post-mortem (REVERTED 2026-07-09 — do not rebuild)

0.52.0 shipped a density compass: the dominant live-mine direction within radius 4
(`dominantMineDir`) encoded as a panned sine cue + dim HUD arrow + an ARIA clause. The
owner's playtest killed it: it *sounds* like a danger warning but fires with no adjacent
danger (semantic collision with the sonar), a dominant direction over a 9×9 window says
nothing about which STEP is safe, and the story's sonar explicitly does NOT tell where
mines are. A radius-1 "detector" retune was rejected too — per-direction adjacent info
would gut triangulation (the core puzzle) and give blind players more than sighted ones.
The old code is in `git show e88cca5`; the deep write-up in `retro/docs/sk/minefield.md` §5.
Item A (a pan/pitch debug readout for the compass) died with the revert and has been
dropped from this spec.

### Free keys (verified against `input.ts` + `main.ts` keydown)

Taken: arrows, Shift+arrows, Shift+S (save), `D` (reveal), `R` (random), `P` (pause),
`F` (flag), `O` (debug overlay), `L` (language, intro), `I` (intro replay), `E` (exit
bearing, in-game), `G` (nearest gem, in-game), letters (hiscore name entry). **Free for
a11y: `H`** (reserved for Item B — legend replay).

---

## Item B — replayable audio legend on `H` ✅ SHIPPED 2026-07-11

> Built exactly to the design below: the `H` handler sits next to the `O` handler in `main.ts`
> (top-level keydown, every phase except hiscore where `H` is a name letter) and `announce`s
> `STR_A11Y_LEGEND`. Both legend strings now end by advertising the key ("Press H to hear this
> guide again."), guarded by an a11y test asserting the H mention in both languages.

Blind players shouldn't have to memorise the sound code; a key lets them replay the legend
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

## Item C — blind orientation: exit + gems ✅ SHIPPED 2026-07-09

> Built exactly to the design below. `describeExit` / `describeGems` / `describeOrientation` +
> a private `relPhrase(dCol,dRow)` (and `exitBearing`) live in `a11y.ts`; `E` / `G` fire in the
> `appPhase === 'ingame'` keydown branch in `main.ts`; the start summary is folded into
> `startRun`'s mode status line and repeated on the resume path. Strings `STR_A11Y_RIGHT/LEFT/
> UP/DOWN/HERE`, `STR_A11Y_EXIT`, `STR_A11Y_GEM_NEAREST`, `STR_A11Y_GEM_NONE`, `STR_A11Y_ORIENT`
> in both packs. Tests: 6 in `a11y.test.ts` (bearing, zero-drop, nearest-of-two, gem-none,
> here, orientation) + a strings-parity case. Verified live in headless Chromium:
> `status` after start = "Practice run started. Exit 31 right, 7 up. 12 gems on the field.",
> `E` → "Exit: 31 right, 7 up.", `G` → "Nearest gem: 16 right, 2 up. 12 gems left." The design
> that was implemented (kept for reference):

Owner-confirmed UX (two-question AskUserQuestion):
- **Interaction = on-demand keys + a start-of-run summary** (not constant auto-chatter).
- **Format = relative direction + distance** (`"22 right, 3 up"`) — *not* absolute
  chessboard coordinates.

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
  (screen axes). Compose `"<|dCol|> <word>, <|dRow|> <word>"`, dropping any zero term.

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

## OPEN — post-ship follow-ups (owner to validate by ear / blindfolded)

C shipped with the on-demand model; these remain open, deferrable past v1.0:

- Is on-demand enough, or is a gentle **proximity ping** when adjacent to a gem also wanted
  (so a gem isn't walked past)? Deferred; easy to add later as an opt-in.
- Should **buildings/obstacles** also be announceable (sighted players see them)? Likely a
  follow-on parity item, out of scope here.
- Exact wording/verbosity of the sentences (tune for how it *sounds* read aloud, not how it
  reads on the page). SK gem count uses gem/gemy/gemov; revisit if a blind SK tester prefers
  "drahokam".

Item B (legend replay on `H`) is still unbuilt — low-risk, can land any time.

## Verification (run after any change here)

Node 22 (`export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH"`), in `minefield/`:
`npx tsc --noEmit`, `npm test`, `npm run build`. Manual: headphones + VoiceOver (`Cmd+F5`) —
`E`/`G` announce exit / nearest gem relatively; the start summary speaks on run start; on
resume too. (Item C was verified this way in headless Chromium — see the status note above.)
Owner commits — do not commit.
