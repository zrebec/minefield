# ROADMAP.md — Minefield (ZX Spectrum Edition)

> The single live source of truth for current work, priorities, decisions, and deferred ideas.
> The deep design narrative/history lives in the SK working doc `retro/docs/sk/minefield.md`.

## North Star

An audio-first, blind minefield traversal that is **fair** (one daily field for everyone, always winnable)
and **authentically ZX Spectrum**. Polished to a "finished product": complete loop, leaderboard, save,
accessibility, and a clear RULES screen. The strongest moat is accessibility (genuinely playable blind).

## Release — v1.0 (Minefield on itch.io)

**We ship.** v1.0 is a **firm-date, feature-frozen** release of Minefield on itch.io — not perpetual
development. After 1.0: bug-fixes and balance only, no new mechanics. (zx-kit's own road to 1.0 is a
separate track; Minefield's release does not block on extracting anything into the kit — see Decisions.)

**Definition of done for v1.0:**
- **Win condition + post-win screen** — the daily has a definite ending (reach `WIN_LEVEL`; epilogue →
  highscore → menu). See Road to v1.0 P1 item 0. *(Added 2026-07-13 — the game currently has no ending.)*
- Story intro complete: 4 cards with bespoke hand-drawn art, copy + tempo + AY/typewriter tuned by ear.
- Difficulty tuned (a daily L1–L2 reliably beatable); the **green-gem** special ✅ shipped 0.51.0
  (friendly recon plane).
- ~~Renamed to **The Strip**~~ — **cancelled 2026-08-16, the game is Minefield.** No longer part of
  the definition of done; see Decisions. Nothing about the repo, directory, Pages base or URL moves.
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
| Tests | 548 (Vitest) — incl. run-start race battery, the earcon/result-contract batteries (flag, blocked-move, pause), a live-context audio smoke, and the offline-wrap contract | 2026-07-31 |
| Build / release | semantic-release → GitHub Pages (latest **≥0.60.0**; the 2026-07-22 a11y batch releases per commit). Pages build keeps `base: /minefield/`; the itch.io / offline packages are a second build at `--base=./` via `npm run pack:offline` | 2026-07-31 |
| Offline / PWA | **Done (item 12, 2026-07-31)** — installable manifest + icon set; generated service worker; `npm run offline` + `npm run persist` prove a run is playable with the network cut **and** after the launcher quits; macOS `.app`/`.dmg`, Windows zip, itch.io zip. **Windows path is written but unrun** (no machine here). Ref: `docs/offline.md` | 2026-07-31 |
| Accessibility | **Deep — the strongest v1.0 moat.** Visual detector (deaf) ✅; ARIA live regions, no built-in TTS; orientation `E`/`G` + legend `H` ✅. **Audio earcons all shipped 2026-07-19→22:** on-demand **sonar sweep** on `D` (pan = E/W, pitch = N/S, volume = distance) + **exit beacon** on `E` (retuned 2026-07-21); **flag** place/remove; **blocked-move** descending double-beep (wall/building/edge); **pause** = assertive "PAUSE" + a descending/ascending two-tone. **Shell reworked 2026-07-22:** title trimmed to one line ("Press H for rules and help", spoken assertive) and **`H` = the full guide** (goal, controls, rules, glossary, sounds). **All three §6 audio gaps closed.** Remaining shell — **parked until a real screen-reader playtest**: `T` reads the time, high-score letter echo, `0` = help (calls the `H` guide), assist-mode toggle. Refs: `docs/accessibility-sonar-beacon.md` + `retro/docs/sk/a11y.md` §5–6 | 2026-07-22 |
| Win condition | **Shipped 0.57.0 (2026-07-14)** — reach `WIN_LEVEL` (config, default 10) → `won` phase → epilogue → highscore → menu; deterministic + announced. Owner-verified (daily records, random doesn't, ends after 1/3 levels) | 2026-07-14 |

## Road to v1.0 (`2026-09-07`) — prioritised backlog

~10 weeks. Order = priority. Hold the freeze: everything below is **polish / finish / accessibility — no
new mechanics** (those are Post-1.0). Each item ships with tests where behaviour changes.

### P1 — Finish & polish (the game must feel done)
0. **~~Win condition + post-win screen~~ — ✅ SHIPPED 0.57.0 (2026-07-14).** Owner chose **option 2**
   (`WIN_LEVEL`, config, default 10). On the final level-complete, `isFinalLevel(state.level)` → new `won`
   phase → post-win epilogue (war over, Strip cleared, two countries reunited) → highscore (if it places)
   → menu. Deterministic (`WIN_LEVEL` constant → same finish line for all) + announced (`STR_A11Y_WIN`,
   assertive); reuses the previously-unused `playWin()`; saves cleared like game over (no scumming); score
   stays the leaderboard rank. Unit-tested (`isFinalLevel` boundary/overshoot + epilogue strings); **no
   end-to-end smoke yet** (winning needs `WIN_LEVEL` crossings — future, low priority). Owner-verified:
   random stays off-board, daily records, ends correctly after 1 and 3 levels. **Post-1.0:** cumulative-
   time "Marathon" mode + "winners always recorded" (a low-scored winner currently just returns to menu).
   Rationale + the 3 options: `retro/docs/sk/minefield.md` §6.1.
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
4. **~~Confirm the jingle relocation~~ — ✅ CONFIRMED (owner, 2026-07-22).** Jingle now plays once per
   session on a direct game-start (not on first gesture); owner sign-off given after hearing it. No code
   change — this closed the open verification.
4b. **~~Decide the final `D`-reveal mode before v1.0~~ — ✅ DECIDED (owner, 2026-07-22): ANY-TIME is
   final.** The visual reveal shows mines on any `D` press while standing, until the budget
   (`DAILY_REVEAL_LIMIT` / `RANDOM_REVEAL_LIMIT` in config.ts) is spent; after that `D` stays
   sonar-only (no visual). This is the current behaviour and is playtest-verified — owner's verdict:
   "any-time is cleaner". The idle-scout-only alternative is dropped; the `[D-GATE]` revert recipe in
   `CLAUDE.md` stays as archived documentation only. No code change (already shipped).

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
   `G` ✅ (0.56.0)** · **aircraft approach + reseed ✅ (0.56.0)** · **title menu in `.sr-only` ✅
   (2026-07-15)** — `#sr-menu` navigable (not live) region, `setMenu()` in `a11y.ts`, one `<p>` per
   line: every title/a11y key + the high-score table as sentences; filled by `enterTitle()` (the single
   funnel back to the title, which also speaks a polite `STR_A11Y_TITLE` line), cleared by
   `startRun`/`enterStory`, rebuilt on `L`; verified live end-to-end (daily → game over → name entry →
   title shows the score row). **Owner decision 2026-07-15: spoken layer is DONE for v1.0** — his own
   playtest verdict: it talks too much; TLOU-style short positional cues beat sentences. The rest is
   **Shipped 2026-07-19→22:** the on-demand **sonar sweep** on `D` (audio twin of the budgeted reveal),
   the **exit beacon** on `E`, the **flag** + **blocked-move** earcons, **pause** = assertive "PAUSE" +
   a two-tone, the one-line title ("Press H for rules and help", spoken assertive), and **`H` = the full
   guide** (goal / controls / rules / glossary / sounds — this closed the "H-for-help rework"). ✅ Also
   2026-07-15: spoken lines cut to headwords; gem pickup speaks `colour + n left` (unique text defeats the
   `status()` dedupe that silenced a fast second pickup). **All three §6 audio gaps are now closed.**
   **Still parked until a real screen-reader playtest:** `T` reads the remaining time; high-score letter
   echo; `0` = help (should just call the `H` guide, i.e. `announce(STR_A11Y_LEGEND)`); assist-mode toggle
   (item 7). Deep log: `retro/docs/sk/a11y.md` §5–6 + `docs/accessibility-sonar-beacon.md`.
7. **~~Exit beacon tone~~ ✅ SHIPPED 2026-07-19, retuned 2026-07-21.** Remaining: **assist-mode toggle** —
   flag assisted runs (above all `D`-sonar use) so they're marked on the leaderboard. This is the one open
   a11y-*fairness* piece: the parity earcons (beacon/flag/blocked) don't need it, but the sonar gives
   audio mine-directions unlimited, so a leaderboard flag is the guard. Owner flagged it 2026-07-22.

### P1/P2 — "Finished product" surface
8. **RULES screen** (in-game) — controls, gems, the daily, accessibility.
9. **Refresh screenshots** — first fix the **capture router** (predates the fence; teach it the
   fence/exit), then regenerate intro + play shots.

### P2 — Branding & release logistics
10. **~~Rename → "The Strip"~~ — ✗ CANCELLED 2026-08-16.** Not deferred: dropped. The game is
    **Minefield** and the repo, directory, Pages base and URL all stay as they are, which is why
    this item is now zero work rather than a step. Rationale in Decisions. The only trace left is
    `SAVE_SECRET` in `config.ts`, which must keep its string or every existing save fails as
    `tampered`.
11. **itch.io page** — description, art, build upload, controls + accessibility note.
12. **~~PWA / offline~~ — ✅ SHIPPED 2026-07-31.** Installable (manifest + icon set), and the daily
    plays with the network cut. Service worker is **generated** by an `offlineWrap()` plugin in
    `vite.config.ts` from `scripts/sw-template.js` — Vite hashes asset filenames, so the
    hand-written precache list this was adapted from (`timeholder/sw.js`) would have gone stale on
    the next build. Cache-first for hashed assets, **network-first for `index.html`** (the one
    mutable name), `ignoreVary: true` on every read (without it the precached bundle is unreachable
    offline — `addAll` stores no `Origin`, the module request sends one, `Vary: Origin` splits
    them). Dev guard sits at **registration** (`import.meta.env.PROD`), not inside the worker, so
    `vite preview` on localhost stays testable. Proof is `npm run offline`: installs the worker,
    cuts the network, reloads, and **plays a run** with it still cut. Also ships the itch.io
    packages (`npm run pack:offline` → web zip + macOS offline zip with a launcher), a macOS
    `.app` + `.dmg` (`npm run pack:app`, unsigned — see the doc's Known limits) and the app icon
    (`scripts/icons.mjs`, SVG source → PNG + `.ico` set) and a Windows package (`npm run pack:win`,
    PowerShell `HttpListener` — **written but never executed, no Windows machine here**).
    Launchers **seed and quit** rather than blocking on a dialog. Tests 548. Ref: `docs/offline.md`.
    **Known and accepted for v1.0:** `localStorage` is origin-scoped, so Pages, the offline
    package, `preview` and itch.io each keep a **separate** high-score table. Carrying scores
    across needs save export — a new feature, frozen out of v1.0, and the same machinery as the
    replay code, so it should be built once, Post-1.0, not twice.

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
| 2026-08-16 | **The rename to "The Strip" is cancelled — the game is Minefield**, and so are the repo, the directory, the Pages base and the URL. A red line, not another deferral | A game released for the ZX Spectrum in 1982 would have been called Minefield. The rename bought nothing and spent the identity. "The Strip" survives only as the *place* in the story (Slovak: "Pás") — the brand and the place are two different words, and both locales keep them apart. `SAVE_SECRET` still reads `minefield:the-strip:v1`: it is an opaque signing key minted during that window, and changing it would fail every existing save as `tampered` (see `config.ts`) |
| 2026-07-31 | Offline: **generate** `sw.js` at build time; **never** hand-write the precache list | Vite hashes asset filenames — a literal list (as in `timeholder/sw.js`, the file this was adapted from) names a bundle that stops existing on the next build, and the breakage is invisible until someone goes offline |
| 2026-07-31 | `ignoreVary: true` on every service-worker cache read | `addAll` stores entries fetched without `Origin`; the module request sends one (Vite's `crossorigin`); a host answering `Vary: Origin` then misses every lookup and the game dies offline with a full cache |
| 2026-07-31 | Dev guard at **registration** (`import.meta.env.PROD`), not `hostname` inside the worker | Timeholder's hostname guard would bypass the cache on localhost — where `vite preview` serves the production build, i.e. exactly where `npm run offline` proves offline works. The guard would have made the proof a no-op |
| 2026-07-31 | Pages build keeps `base: /minefield/`; itch/offline is a **second** build at `--base=./` | itch serves HTML games from a path it chooses, so absolute URLs 404 there; switching the shared base instead would risk the live Pages deploy for no gain |
| 2026-07-31 | App icon is **SVG-sourced**, not an 8×8 sprite | The 8×8 rule governs the 256×192 playfield, not a 1024 px Dock icon; the palette constraint (zx-kit `C`, no gradients) is what actually carries the identity |
| 2026-07-31 | Manifest icons listed **twice** — `purpose: "any"` and `purpose: "maskable"` — never `"any maskable"` | Shipped as `"any maskable"` first and Safari drew a monogram instead: WebKit skips any icon whose purpose contains `maskable` and uses only `any`. Same files, separate entries; guarded by `test/pwa.test.ts`. Acceptance test is `WKManifestIconKind` in the app Safari generates |
| 2026-07-31 | Launchers **seed and quit** (serve → open browser → wait for quiet → exit), no blocking dialog | The server only exists to hand the files over once; `npm run persist` proves the game then survives a dead server, a closed browser and a cold start. The first version blocked on a Quit dialog: a modal every launch and a server still listening after the tab was closed |
| 2026-07-31 | The local package's desktop icon is **`Minefield.app`**, never Safari's *Add to Dock* | A Safari web app gets its own sandboxed container (`~/Library/Containers/com.apple.Safari.WebApp`) and inherits no service worker or cache from Safari. Added from `127.0.0.1:8137` it looks perfect and fails on first launch with "cannot connect". `scripts/persist.mjs` reuses one profile, so it does **not** cover this — noted in both files |
| 2026-07-31 | Windows server is **PowerShell `HttpListener`** on `http://localhost:8137/`, no runtime ladder | PowerShell ships with every Win10+, so the "no runtime" failure mode cannot happen; the loopback *name* needs no admin URL ACL, the numeric form would. Side effect: Windows origin `localhost:8137` ≠ macOS `127.0.0.1:8137` ⇒ separate score tables |
| 2026-07-31 | Score profile (the host) is **shown on the title screen and spoken** | Per-origin `localStorage` cannot be merged (v1.0 is frozen; export is Post-1.0 with the replay code). Silence was the real problem — a player just sees scores vanish. `scoreProfile()` in `highscore.ts`; row 12 in `renderIntro` + `STR_A11Y_MENU_PROFILE` |
| 2026-06-23 | Airplane guard checks **entry→exit** (not player position) | Player-independent → keeps daily deterministic; safe-trail invariant still guarantees winnability |
| 2026-06-23 | Forward bias instead of strict "never drop behind player" | "Behind player" is player-dependent → would break daily determinism |
| 2026-06-22 | Daily debug reveal = 0; random capped (`RANDOM_REVEAL_LIMIT`) | Screenshots can't be blocked; protect daily fairness at the source |
| 2026-06-23 | Reset the score combo on death | Cleaner for the daily leaderboard |
| 2026-06-24 | Story = **The Strip / Quiet War**; 4-card typewriter intro; AY used in the intro only | Gives the daily + airdrops an in-world reason; AY adds atmosphere without touching gameplay beeper |
| 2026-06-24 | Winter→spring handled by the 4th intro card (not a forced snow start) | Keeps terrain variety; bridges the wintry setup to a spring first-crossing |
| 2026-06-24 | **Rename to "The Strip" deferred** to a focused step (dir + GitHub + Pages base); save key stays `minefield` | Avoids a half-renamed repo mid-feature; same origin ⇒ saves survive |
| 2026-06-24 | **zx-kit extraction deferred** until a 2nd real consumer (kit's own rule) | Candidates: typewriter reveal, story-card stepper, dither/shade fill — lift them when chaosBunny/IceHaul needs one, not speculatively (and not during the kit's pre-1.0 freeze) |
| 2026-06-24 | **dither/shade extracted to zx-kit** (`drawShade` + `DITHER`, 0.35.0); Minefield consumes it | Foundational ZX primitive the kit lacked; pre-1.0 is the right window; chaosBunny is the confirmed 2nd consumer |
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
| 2026-07-22 | **A11y shell reworked** — pause speaks "PAUSE" (assertive, re-reads every pause) + a centred two-tone earcon (`playPauseCue`; pause descends 494→330, resume ascends); the title trimmed to ONE spoken line ("Press H for rules and help", via `announce` not `status` so it isn't missed at page load); and `STR_A11Y_LEGEND` (the `H` guide) expanded to the full briefing — goal, controls, rules, glossary, sounds — closing the old "H-for-help rework". `PAUSE_*` in config.ts; tests 528 |
| 2026-07-22 | **Green-gem legend fixed** — the in-game gem legend (`GEM_SPECIAL`) and CLAUDE.md still called green "time only"; corrected to "2 = recon plane" / "2 = lietadlo" (the friendly-plane special shipped 0.51.0). The spoken `H` guide was already correct — only the visual legend + doc were stale |
| 2026-07-22 | **Blocked-move earcon shipped** — a descending double beep (190→130 Hz), centred, no pan/direction, when a step is rejected by a wall/fence/building edge or the board edge (one generic cue). `movePlayer`/`tickPlayer` return a `MoveResult`; `main.ts` beeps only on `'blocked'` — the win-exit off the right edge stays `'moving'` (no buzz at the finish). Debounced vs held-key machine-gun. Closes the last of the three §6 audio gaps (east wall + building edge + fence). `BLOCKED_*` in config.ts; tests 525 (result-contract + descending/centred/debounce smoke). Ref: `docs/accessibility-sonar-beacon.md` |
| 2026-07-22 | **Flag earcon shipped** — `F`/SHIFT+arrow now sound: **placement** = positional blip (pan = E/W, pitch = N/S, sonar convention — says which adjacent cell you flagged); **removal** = a very low, very short, centred tick (no pan/pitch — "some flag taken back"). Fires only on a real event (`toggleFlag` → `FlagResult`\|`null`; `commitFlag` in main.ts); `FLAG_*`/`FLAG_REMOVE_*` in config.ts. Tests 515 (result-contract + a live-context smoke that the blip is actually scheduled). Ref: `docs/accessibility-sonar-beacon.md`. Also decided same day: `D`-reveal ANY-TIME is final (item 4b) |
| 2026-07-19 | **Sonar sweep + exit beacon shipped** — `D` plays an on-demand audio sweep of mines in range (pan = E/W, pitch = N/S, volume = distance; nearest first; a low "all clear" blip when empty) as the audio twin of the budgeted visual reveal, unlimited for everyone (its cost is time on the live clock); `E` sounds an exit beacon (retuned 2026-07-21: volume = distance to the exit column, pitch = N/S, a double beep when you are level, no pan). NOT the reverted compass — on-demand + diegetic (the runner built a sonar). `SCAN_*`/`BEACON_*` in config.ts. Ref: `docs/accessibility-sonar-beacon.md` |
| 2026-07-15 | **Title menu in `.sr-only` shipped** — `#sr-menu` navigable region mirrors the title menu (every title/a11y key + the high-score table as sentences, one `<p>` per line via `setMenu`); `enterTitle()` DRY-funnel fills it on every return to the title + speaks a polite "Title screen" line; cleared on run/story start, rebuilt on `L`. Tests 490; verified live in Chromium (incl. daily → game over → name entry → score row readable) |
| 2026-07-14 | **Win condition shipped (0.57.0)** — reach `WIN_LEVEL` (default 10) → `won` phase → post-win epilogue → highscore → menu; `isFinalLevel` trigger, deterministic + announced (`STR_A11Y_WIN`), reuses `playWin()`. Owner-verified (daily records, random doesn't, ends after 1/3 levels; tested via `MINE_DENSITY≈0.001`) |
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
