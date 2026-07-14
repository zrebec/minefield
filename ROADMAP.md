# ROADMAP.md — Minefield (ZX Spectrum Edition)

> The single live source of truth for current work, priorities, decisions, and deferred ideas.
> The deep design narrative/history lives in the SK working doc `retro/docs/sk/minefield.md`.

## North Star

An audio-first, blind minefield traversal that is **fair** (one daily field for everyone, always winnable)
and **authentically ZX Spectrum**. Polished to a "finished product": complete loop, leaderboard, save,
accessibility, and a clear RULES screen. The strongest moat is accessibility (genuinely playable blind).

## Release — v1.0 (The Strip on itch.io)

**We ship.** v1.0 is a **firm-date, feature-frozen** release of The Strip on itch.io — not perpetual
development. After 1.0: bug-fixes and balance only, no new mechanics. (zx-kit's own road to 1.0 is a
separate track; The Strip's release does not block on extracting anything into the kit — see Decisions.)

**Definition of done for v1.0:**
- **Win condition + post-win screen** — the daily has a definite ending (reach `WIN_LEVEL`; epilogue →
  highscore → menu). See Road to v1.0 P1 item 0. *(Added 2026-07-13 — the game currently has no ending.)*
- Story intro complete: 4 cards with bespoke hand-drawn art, copy + tempo + AY/typewriter tuned by ear.
- Difficulty tuned (a daily L1–L2 reliably beatable); the **green-gem** special ✅ shipped 0.51.0
  (friendly recon plane).
- Renamed to **The Strip** (dir + GitHub repo + Pages base + README/badges/capture paths; save key stays).
- **RULES** screen + refreshed screenshots (intro + fenced field).
- **Accessibility moat** (option-C scope, updated 2026-07-11): screen-reader playability via ARIA live
  regions (no built-in TTS — the voice is the reader's), orientation + legend keys, exit beacon,
  sounded shell, assist toggle.
- itch.io page live (description, art, build, controls/accessibility note); all tests green.

**Committed v1.0 date: `2026-09-07`** (option C — "safe", chosen 2026-06-24). This is the **firm ship
date**; scope is frozen to the DoD below **plus the accessibility moat** (screen-reader playability +
orientation + beacon), which C buys. Guard against scope-creep — the extra weeks are for polish + playtest + a life buffer, not
new mechanics. The other candidates considered: A `2026-07-20` (aggressive, thin polish), B `2026-08-10`
(balanced).

## Current Status

| Area | Status | Last verified |
|---|---|---|
| Core loop | Complete (cross → levels → highscore → save) | 2026-06-23 |
| Fence + solvability | **Done** — winnable under all circumstances (gen + airdrop guard; **carve repair 2026-07-03** made it a construction guarantee — see known-issues) | 2026-07-03 |
| Daily fairness | **Done** — field **and** highscore dated by the run's **origin** daily (verified 2026-06-29) | 2026-06-29 |
| Leaderboard integrity | **Done (deterrent-grade)** — random runs off-board; envelope sig on saves + hiscore table (zx-kit `hiscore` adopted, save v6) — see item 16 | 2026-07-12 |
| Story + intro | **Done, music tuning by ear** — 5-chapter typewriter, 5 hand-drawn scenes, per-card AY score, book-style chapter titles; title-first flow, `I` replays | 2026-06-30 |
| Tests | 483 (Vitest) — incl. run-start race battery (`runstart.test.ts`: story pre-roll always finishes + fresh game's first move always legal) | 2026-07-13 |
| Build / release | semantic-release → GitHub Pages (latest **0.56.1**) | 2026-07-13 |
| Accessibility | In progress — visual detector done; ARIA live regions + orientation (`E`/`G`/`H`) shipped; **per-step spoken danger removed 0.56.0** (was off-by-one; beep + detector carry danger with parity); **gem colour + plane approach/reseed spoken 0.56.0**; no built-in TTS (2026-07-11). **Remaining shell (Sept): title menu → `.sr-only`, pause "PAUSE", `T`-time, hiscore entry, post-win** | 2026-07-13 |
| Win condition | **MISSING — the game has no ending** (levels run forever until death/timeout). Owner's September agenda item 1; see P1 item 0 | 2026-07-13 |

## Road to v1.0 (`2026-09-07`) — prioritised backlog

~10 weeks. Order = priority. Hold the freeze: everything below is **polish / finish / accessibility — no
new mechanics** (those are Post-1.0). Each item ships with tests where behaviour changes.

### P1 — Finish & polish (the game must feel done)
0. **Win condition + post-win screen (NEW 2026-07-13 — the biggest gap: the game has no ending).** Today
   levels run forever until death/timeout. Owner floated three triggers: (1) score 100k, (2) reaching a
   configurable target level ~10, (3) a cumulative time budget across N levels. **Claude's recommendation:
   option 2 — a config `WIN_LEVEL` (default ~10), which unifies all three: level = win trigger, score =
   leaderboard rank, cumulative-time = a Post-1.0 "Marathon" mode.** Why: a level target is a *definite*
   ending (score is farmable + an arbitrary gate; the cumulative-time model is the most interesting but a
   bigger, riskier mechanic shift for the pre-Sept window). On `levelcomplete`, if `level+1 >= WIN_LEVEL`
   → new `won` phase → post-win epilogue (war over, fields cleared, two countries reunited) → highscore →
   menu. Must stay **seeded/deterministic** (`WIN_LEVEL` constant → same finish line for all) and
   **announced** (`.sr-only`) like the rest of the shell. **Owner picks the trigger before building.**
   Effort M. Deep discussion + rationale: `retro/docs/sk/minefield.md` §6.1.
1. **Finish the intro — music tuning only.** The story (5 chapters), all 5 hand-drawn scenes, the per-card
   AY score (`introTrack`) and book-style chapter titles are **done**. What remains is the owner's by-ear
   tuning of the tracks + tempo (`MS_PER_CHAR` / `CARD_HOLD_MS`). Optional: a "press to begin (sound on)" gate.
2. **Difficulty tuning pass.** A daily L1–L2 **reliably beatable** within `TIMER_BASE_MS` by a careful
   player. Knobs only: `LEVEL_CONFIGS`, `acMineDrop*`, building size/count.
   **Generation-health criterion (added 2026-07-03): at least ~50% of RAW generated boards per level
   must be solvable without rerolls.** ✅ **Criterion implemented + guarded same day** — solution A
   (density-normalised mine budget, `MINE_DENSITY` × mine-eligible cells) landed with a deterministic
   seeded guard test in `game.test.ts`; measured raw-solvable is now 99.5/87.5/77.8/61.5/71.5%
   (L1…L4+) vs the pre-fix 99/87/47/**10**%. L1–L2 keep their old counts/feel (≈50/≈80 mines).
   What REMAINS for this pass: the **by-feel playtest** (timer budget, airplane pressure vs the new
   L3/L4+ counts — knobs: `MINE_DENSITY`, `acMineDrop*`, buildings) — numbers are calibrated, feel
   is the owner's call. Full analysis + risk table: [`docs/generation-density.md`](docs/generation-density.md).
3. **~~Green-gem special~~ — ✅ SHIPPED 0.51.0 (2026-07-04).** Two green gems summon the **friendly
   recon plane**: a purely seeded row sweep that permanently reveals every live mine in it
   (`spawnFriendlyPlane`, `GREEN_GEMS_PER_PLANE`); tested in `airplane.test.ts`. What remains is only
   the by-feel balance check inside the difficulty pass (#2).
4. **Confirm the jingle relocation** (now once-per-session on a direct game-start, not on first gesture) —
   quick owner sign-off.
4b. **Decide the final `D`-reveal mode before v1.0.** Currently (2026-07-04, testing-phase): usable
   any time while standing — a budgeted peek for playtest route/flag verification. The alternative
   is the original idle-scout-only gate. The switch is a **one-line move** (`[D-GATE]` in `main.ts`);
   the full revert recipe lives in `CLAUDE.md` → "D-reveal mode". Effort XS either way.

### P1 — Accessibility moat (in v1.0 because we chose option C — the strongest differentiator)
5. **~~Stereo / spatial warning~~ — TRIED & REVERTED 2026-07-09.** Shipped in 0.52.0 as a density
   compass (dominant mine direction → panned cue + HUD arrow), reverted after the owner's playtest:
   it read as a danger warning without adjacent danger, and a radius-1 variant would gut triangulation.
   Replaced by **blind orientation (was "option C"): ✅ SHIPPED 2026-07-09** — `E` speaks the exit
   bearing, `G` the nearest gem + count, plus a start/resume summary ("22 right, 3 up"), parity not
   assist. See `docs/accessibility-orientation.md`. **Legend replay on `H`: ✅ SHIPPED 2026-07-11**
   (Item B — every screen except hiscore name entry; the legend advertises the key, test-guarded).
6. **Screen-reader support — finish the shell (owner's September agenda 2026-07-13).** ARIA live regions
   wired 2026-07-05; **no built-in TTS (decided 2026-07-11)** — the game mirrors state into the DOM live
   regions and the player's screen reader speaks. The per-step danger sentence (`describeStep`) was
   **removed 0.56.0**: it was off-by-one (announced the cell being *left* — `movePlayer` starts a walk
   tween; position + beep commit at tween end), and the beep + visual detector already carry danger with
   parity, so the spoken count was a redundant, stale, interrupting third channel. Wired: explosion/
   respawn ✅ · game over ✅ · run/level status ✅ · orientation `E`/`G`/`H` ✅ · **gem colour on pickup +
   `G` ✅ (0.56.0)** · **aircraft approach + reseed ✅ (0.56.0)**. **Remaining (September list):**
   (a) **the whole title menu into a `.sr-only` div** — keys + the high-score table, so a blind player
   knows what to press and can read the scores; (b) **pause announces "PAUSE"** in `.sr-only` (a full
   pause menu for blind comes later); (c) **`T` reads the remaining time** (also spoken at run start);
   (d) high-score letter entry; (e) the **post-win screen** (item 0).
7. **Exit beacon tone** + **assist-mode toggle** (flag assisted runs so they're marked on the board).

### P1/P2 — "Finished product" surface
8. **RULES screen** (in-game) — controls, gems, the daily, accessibility.
9. **Refresh screenshots** — first fix the **capture router** (predates the fence; teach it the
   fence/exit), then regenerate intro + play shots.

### P2 — Branding & release logistics
10. **Rename → "The Strip"** — focused step: dir + GitHub repo + vite `base` `/minefield/`→`/the-strip/` +
    README/badges/capture paths. **Keep save key `minefield`** (same origin ⇒ saves survive).
11. **itch.io page** — description, art, build upload, controls + accessibility note.
12. **PWA / offline** — installable; play the daily offline. (Owner priority.)

### P2 — Stabilisation (robustness for ship)
13. **Determinism guard test** — assert no `Math.random()` / `Date.now()` / wall-clock in the daily path
    (prevents a regression of the date bug we just fixed).
14. **De-flake the statistical test** — the forward-bias `mean > midpoint` test flaked once in a full run;
    seed it / widen the sample so `npm test` never fails randomly. Audit other property tests for seeding.
    *(Note 2026-07-03: the OTHER intermittent failure — "random unseeded fields are always solvable" —
    turned out to be a real bug, not a flake: all 64 rerolls could fail at L4+ densities. Fixed at the
    root by the carve repair; that test is now guaranteed by construction. The forward-bias flake is
    still open.)*
15. **Save round-trip / version property tests** — every saved state reloads identically; old versions are
    cleanly rejected. (Guards the next save field, e.g. when heroes land Post-1.0.)

### P2 — Anti-cheat (SHIPPED 2026-07-12: deterrent-grade integrity hash, save v6 + zx-kit hiscore)
16. localStorage is client-editable (`zxkit:minefield:auto`; `data.score` / `data.dropSeedBase`) → the
    local leaderboard is trivially cheatable. Client-only + era-appropriate ⇒ can't be *forced*, only
    *deterred*. Defence in place: random runs never reach the board. **Decided for v1.0:** every write
    (auto + manual save **and the high-score entries** — the hash must cover both, or the front door
    stays open) stores a **hash + salt** of the payload alongside the data; a mismatch is rejected the
    same way as a bad save version. The salt ships in the JS — this is deterrence, not security, and
    that's the point: cheating must cost more than editing `lives`. Implementation notes: SubtleCrypto
    SHA-1 is async while the save path is sync → a small synchronous hash (e.g. FNV-1a) is equally
    deterrent; a mandatory field means a save **version bump v5→v6**. Effort S — schedule inside the
    P2 stabilisation block (August), with round-trip + tamper tests. **Full Action Replay** (seed +
    timed inputs → server-less score verification) remains the real lever and stays **Post-1.0**.
    **Refined 2026-07-11:** the hash chokepoint is built **once in zx-kit `save.ts`** (optional
    `secret` in the profile → `sig` field in the envelope, sync FNV-1a, new `tampered` load reason) —
    Minefield adopts it via the v5→v6 bump instead of rolling its own, and every other game (plus the
    planned zx-kit hiscore module) gets it for free. A salt derived from in-save values (player X,Y)
    was considered and rejected: every input is visible to the cheater anyway, and it complicates
    debugging without adding deterrence.
    **Shipped 2026-07-12:** save profile signed + bumped v5→v6 (unsigned v5 saves load as `tampered`
    → title); high scores moved onto the zx-kit `hiscore` module (`highscore.ts` is now a thin policy
    adapter — level+date extras, legacy-table migration re-signs old entries) under its **own** profile
    key `minefield-hiscore`, since `readSaveLatest`'s resume check enumerates every slot under a key.
    One `SAVE_SECRET` in config.ts covers both. Tamper + round-trip tests in save.test.ts /
    highscore.test.ts.

## Post-1.0 / Deferred (NOT in v1.0 — protects the freeze)

- **Heroes / villain / helpers** (full design in `retro/docs/sk/minefield-claude-owner-diskusia.md`):
  seeded green-beret (+life) + 6th-sense woman (assist); a night searchlight/patrol **villain**; mine-dog +
  medic-tent **helpers**; a simultaneous-move **"pair" mode**. **All must be SEEDED** or the daily stops
  being comparable.
- **Action Replay (full)** + **ghost replay** (race your past run / the top daily).
- **Top/bottom perimeter fence** (16-row playfield).
- **Probe / stone** aid; **hostages / allies** escort (Mined-Out).
- **zx-kit dev-validation warnings** (kit track — `engine/zx-kit/docs/dev-validation.md`).

## Technical Debt

| Priority | Debt | Why it matters | Direction |
|---|---|---|---|
| P4 | `revealsUsed` not reset on respawn | Negligible (reveal is idle-only; daily = 0) | Note only |
| P3 | Capture script (`scripts/capture.mjs`) router predates the fence | Refreshed `play.png` may route oddly | Teach the BFS router the fence/exit before refreshing |

## Decisions

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-23 | Airplane guard checks **entry→exit** (not player position) | Player-independent → keeps daily deterministic; safe-trail invariant still guarantees winnability |
| 2026-06-23 | Forward bias instead of strict "never drop behind player" | "Behind player" is player-dependent → would break daily determinism |
| 2026-06-22 | Daily debug reveal = 0; random capped (`RANDOM_REVEAL_LIMIT`) | Screenshots can't be blocked; protect daily fairness at the source |
| 2026-06-23 | Reset the score combo on death | Cleaner for the daily leaderboard |
| 2026-06-24 | Story = **The Strip / Quiet War**; 4-card typewriter intro; AY used in the intro only | Gives the daily + airdrops an in-world reason; AY adds atmosphere without touching gameplay beeper |
| 2026-06-24 | Winter→spring handled by the 4th intro card (not a forced snow start) | Keeps terrain variety; bridges the wintry setup to a spring first-crossing |
| 2026-06-24 | **Rename to "The Strip" deferred** to a focused step (dir + GitHub + Pages base); save key stays `minefield` | Avoids a half-renamed repo mid-feature; same origin ⇒ saves survive |
| 2026-06-24 | **zx-kit extraction deferred** until a 2nd real consumer (kit's own rule) | Candidates: typewriter reveal, story-card stepper, dither/shade fill — lift them when chaosBunny/IceHaul needs one, not speculatively (and not during the kit's pre-1.0 freeze) |
| 2026-06-24 | **dither/shade extracted to zx-kit** (`drawShade` + `DITHER`, 0.35.0); The Strip consumes it | Foundational ZX primitive the kit lacked; pre-1.0 is the right window; chaosBunny is the confirmed 2nd consumer |
| 2026-06-25 | Daily run carries its **origin date** across levels; highscore dated by it (not wall-clock) | A resumed/older daily scores under its own date — keeps the leaderboard fair (verified 2026-06-29) |
| 2026-06-25 | Intro flow: **title-first**; `I` replays; intro pre-rolls on a mode-start when "due" (localStorage; daily until v1.0) | Save-resume skipped the intro entirely; this makes it reachable + first-time-gated |
| 2026-06-25 | Startup jingle moved off first-gesture → once per session on a **direct** game-start | It clashed with the intro AY underscore; only the *timing* changed (sound unchanged) |
| 2026-06-30 | Story rewritten to **5 chapters** (two countries / no-man's-land / runner+sonar / parcels); each card a **bespoke scene + its own AY track**; cards **English**, SK translated | Owner wanted stronger drama; the two-countries framing + per-card score (lament→dirge→Ode to Joy) land the emotion; maps cleanly to the mechanics |
| 2026-07-03 | Document `<title>` reads **THE STRIP** now (repo/URL rename still a deferred focused step) | The tab is player-facing today; the in-game title already says THE STRIP — only infrastructure waits for the rename |
| 2026-07-03 | **Accessibility promise made public in README with the date**: v1.0 (2026-09-07) fully playable blind + deaf | A public commitment is the strongest anti-scope-creep device; the deaf half (visual detector) already shipped |
| 2026-07-03 | Respawn keeping `runState='running'` (no idle re-scout, timer keeps ticking) = **intended death penalty** | Death costs you the scout — deliberate; document it on the future RULES screen so it reads as a rule, not a bug |
| 2026-07-03 | Anti-cheat v1.0 = **integrity hash (hash + salt) on saves AND high-score entries**, save v5→v6; full Action Replay stays Post-1.0 | Deterrent-grade: raises cheating cost well above editing localStorage by hand; era-appropriate; effort S in the August stabilisation block |
| 2026-07-09 | Blind help is **orientation (exit/gem bearing), not a directional danger cue** — the stereo compass was reverted for reading as danger without danger | A density direction has low action value and collides with the sonar's meaning; a per-direction danger cue would gut triangulation. Exit/gem bearings are parity (sighted players scout them) without touching the puzzle |
| 2026-07-11 | **No built-in TTS** — dropped from the v1.0 moat; the game mirrors canvas state into ARIA live regions and the player's screen reader speaks | Speaking is the reader's job, not the game's; the infra already ships. Revisit only if the September playtest with a real screen-reader user shows live-region latency hurts real-time play |
| 2026-07-11 | **Integrity hash builds in zx-kit save envelope**, not per-game (optional `secret` → `sig`, FNV-1a, `tampered` load reason); X,Y-derived salt rejected | One chokepoint every game inherits (incl. the planned kit hiscore module); in-save salts are visible to the cheater anyway and only complicate debugging |

## Dropped / Archived

| Idea | Why |
|---|---|
| Global online leaderboard | Naively forgeable; daily seed + replay verification is cheaper and era-appropriate |
| Mid-game memory snapshot save | `JSON.stringify` loses Set/Map identity; we persist a typed map instead |

## Completed Milestones

| Date | Milestone |
|---|---|
| 2026-07-13 | **Title menu high-score table → fixed columns (0.56.1)** — each field on a fixed character column, score right-aligned (Excel-style), intro art 2 rows shorter for panel padding, `L:` moved off the 5th-score row (they were colliding into "093L: SK"); dead `STR_HIGH_SCORE_LINE` + its tests removed |
| 2026-07-13 | **A11y batch (0.56.0)** — removed the off-by-one per-step danger line (announced the cell being left → said "clear" while stepping onto a mine); gem colour spoken on pickup + `G`; enemy plane approach + field-reseed announced; audio guide reworded around counting beeps + a short "press H" start hint instead of the full guide |
| 2026-07-09 | **Blind orientation (Item C)** — `E` = exit bearing, `G` = nearest gem + count, start/resume summary ("22 right, 3 up"); parity not assist (no leaderboard flag); 380 tests, verified live in headless Chromium. Replaces the reverted stereo compass |
| 2026-07-05 | **Directional mine compass (0.52.0) tried, then reverted** — density compass read as danger without danger; the ARIA infra it introduced (live regions, `describeStep`, status lines) stayed and now carries orientation |
| 2026-07-04 | **Green-gem special shipped (0.51.0)** — two green gems summon the friendly white recon plane: seeded row sweep, permanently reveals its live mines; the enemy plane turned red to make room |
| 2026-07-03 | **Solvability became a construction guarantee** — `carveSafePath` repairs the rare board where all 64 rerolls stay sealed (~0.7% of L4+ fields, seeded dailies included, was shipping unwinnable); deterministic, covered by named regressions + a 9 000-field sample |
| 2026-07-03 | Accessibility skeleton — ARIA live regions + canvas labelling in `index.html` (guarded by a new a11y contract test suite), `<title>` → THE STRIP, live document `lang` synced by `setLocale()`; the four v1.0 decisions recorded (title, public promise, respawn-by-design, integrity hash) |
| 2026-06-30 | Intro story rewrite (5 dramatic chapters) + per-card AY score (lament → funeral dirge → Ode to Joy) + book-style chapter titles + all 5 hand-drawn scenes |
| 2026-06-29 | Daily-date fairness — field + highscore dated by the run's origin daily (verified via an edited save) |
| 2026-06-25 | Intro flow redesign — title-first, `I` replays, due-gated pre-roll (localStorage seen-flag) |
| 2026-06-25 | zx-kit 0.35.0 dither (`drawShade`/`DITHER`) shipped + adopted by the intro's night sky |
| 2026-06-24 | Story + narrative intro ("The Strip"): 4-card typewriter, AY underscore, hand-drawn establishing shot, title → THE STRIP |
| 2026-06-23 | Airplane solvability guard — field winnable under all circumstances |
| 2026-06-22 | Perimeter fence with one entry/exit gap + generation solvability guarantee |
| 2026-06-22 | Reveal budget (daily = 0, random capped); zx-kit 0.34 volume adoption |
| 2026-06-21 | 6-row HUD · per-level timer · per-colour gem time bonus · gold = score bonus · paged pause menu |
| earlier | Gems + backpack · daily seed · save/load · gamepad · day/night · buildings · CRT · highscore |
