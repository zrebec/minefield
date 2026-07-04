# AGENTS.md — Minefield (ZX Spectrum Edition)

> Permanent implementation rules for every coding and graphics agent.
> **Source code and tests are the final source of truth.** When a doc disagrees with `src/`, the code wins.
> This file is stable: no live priorities or changelog here — those live in `ROADMAP.md` and `CHANGELOG.md`.

## Mission

The Strip (repo/package still `minefield` until a focused rename) is a browser homage to early-1980s ZX
Spectrum "minefield" games: cross a **blind** minefield left→right, warned only by sound and a visual HUD
detector, while an aircraft periodically drops more mines. It must always stay: **audio-primary but not
audio-only**, **fair** (a daily field is the same for everyone and **always winnable**), and **visually
authentic ZX Spectrum**. The story (two countries with a no-man's-land Strip between them; a nightly plane
reseeds it with mines to keep torn-apart families apart; a runner with a home-made sonar carries parcels
across) is the in-world reason the daily field changes and the aircraft keeps dropping mines.

## Name

The game's name is **The Strip**; the on-screen title (`STR_TITLE`) and the document `<title>` in
`index.html` both read `THE STRIP` (since 2026-07-03). The repository, npm package, GitHub Pages base and
capture paths still read `minefield` — a full rename is a deliberate, deferred step. **Keep the internal
save key `minefield`** through any rename (same origin ⇒ existing saves and high-scores survive).

## Permanent Audio Rule

Gameplay audio is the **beeper** (`playPattern` / Web Audio square waves) — warnings, explosion, fanfares,
the aircraft drone. The **AY chip is reserved for the story intro's per-card score only** (`introTrack` /
`startIntroMusic` via zx-kit `seq`/`playAYLoop`). Do not add AY to gameplay. New intro sounds are additive —
never retune the existing beeper SFX without the owner. The **intro score + tempo are tuned by ear by the
owner** (`introTrack` in `audio.ts`).

## Permanent Accessibility Invariants

v1.0 publicly commits to full blind + deaf playability (README → Accessibility). These rules are
permanent from 2026-07-03:

- **Channel parity.** Every gameplay-critical signal must reach both eyes and ears. The audio warning
  and the HUD detector carry the same information today; any future signal (e.g. directional stereo
  warnings) must land in a visual channel too — never sound-only, never sight-only.
- **The ARIA layer is load-bearing.** `index.html`'s live regions (`#sr-announcer` assertive,
  `#sr-status` polite) and the canvas `role`/`aria-label` must not be removed or hidden with
  `display:none`/`visibility:hidden` (that silences screen readers). `.sr-only` is the only valid
  way to hide them visually.
- **Keyboard-complete.** Every screen and action must remain reachable by keyboard alone (gamepad is
  an addition, never a requirement).

## Read Order

1. `AGENTS.md` (this file)
2. `ROADMAP.md` (current priorities)
3. Relevant `src/` and tests
4. `CLAUDE.md` (execution guide / architecture)
5. `docs/known-issues.md`
6. SK working doc `retro/docs/sk/minefield.md` (deep design history, owner's language)

## Core Principles

- **zx-kit is the only runtime dependency.** Everything else is the Web Platform.
- **Determinism is sacred for the daily.** The daily field (and its airplane behaviour) is derived from a
  date seed; it must be reproducible. Never make daily generation depend on wall-clock, random, or
  non-persisted runtime state.
- **Less is more.** No game framework, no new runtime deps, no speculative systems.
- **The code and tests are the truth**; docs serve them.

## Allowed Work

- Implement approved items from `ROADMAP.md`.
- Small scoped refactors that preserve behaviour.
- Improve tests, docs, accessibility, performance, visual readability.
- Propose extracting a primitive into zx-kit **only** after a second real consumer exists.

## Forbidden Work

- Add a runtime dependency or a game framework (React/Pixi/Phaser/…).
- Introduce any non-Spectrum colour, CSS font, or canvas effect (see Visual Rules).
- Break daily determinism, fence/airplane solvability, save compatibility (without a version bump), or
  the leaderboard anti-cheat (`dropSeedBase === null` ⇒ random ⇒ no score).
- External runtime image assets (sprites are `Uint8Array` in `sprites.ts`; concept art lives in `docs/`).
- Commit, push, bump, publish, release, or deploy **without explicit owner approval.**

## Permanent Visual Rules (ZX authenticity — eternal)

- **Resolution 256×192**, canvas scaled **integer ×4** via `zx-kit` `setupCanvas`; `imageSmoothingEnabled =
  false`. All coordinates are multiples of 8.
- **Palette: exactly the 15 Spectrum colours** from `zx-kit` `C` (8 normal + 7 bright). **Never raw hex.**
- **Colour clash:** one INK + one PAPER per 8×8 cell. The game is grid-aligned, so clash is free.
- **Font:** the ZX ROM 8×8 bitmap font via `zx-kit/font`, drawn with `fillRect` — never `fillText`/CSS.
- **Must never appear:** gradients, shadows, border-radius, modern fonts, smooth scaling, CSS animation
  in the canvas, external image assets.

## Sprite Rules

Sprites are `Uint8Array` (8×8, one byte per row) defined in `sprites.ts`. A new/changed sprite must define:
its visual role + readable silhouette, exact dimensions, ink/paper policy, source rows, and be readable at
native 256×192. Tile/visual changes that affect movement need a regression test.

## Gameplay Invariants (Minefield-specific, permanent)

- **Movement is orthogonal**, one cell per step (animated tween). Win = cross the right edge
  (`newCol >= COLS`) through the single **exit gap** in the right fence.
- **A daily field is always winnable** — guaranteed at generation (`isFieldSolvable` BFS + deterministic
  regeneration + the deterministic `carveSafePath` repair when every reroll stays sealed — a construction
  guarantee, not a probabilistic one) **and** at runtime (the airplane discards any drop that would seal
  the field). Mines never land on the player's `visited` trail, so the player can always retreat and
  re-route.
- **Warning count** = 4 orthogonal neighbours (dist 1, any mine) + beacon mines at orthogonal dist 2
  (from L3), `min(count, 8)`. **Diagonals never count** (the player can't move into them).
- **Flags are a pure visual overlay** (`GameState.flags`, never stored in tiles): they never affect
  gameplay — movement, airdrops (a flag is not a shield), solvability, warnings — and they are
  removed ONLY by the player toggling them off or by a mine detonating on that cell. Never let a
  tile rewrite touch them; never gate game logic on them (sole grandfathered exception: revealMine's
  reward dedup reads them). Flaggable: anything non-solid except an exploded crater.
- **No save-scumming:** saves are cleared on game over.
- **Anti-cheat:** random runs (`dropSeedBase === null`) never reach the leaderboard, persisted + re-synced.
- **Daily debug reveal is disabled** (`DAILY_REVEAL_LIMIT = 0`) — revealing every mine would leak the
  scored solution, and screenshots can't be technically blocked.

## Collision Invariants

Grid/tile collision only (no pixel masks). `Tile.solid` blocks movement (buildings, fence). Mines are
**not** solid — stepping onto one detonates. Any change to solidity or the warning math needs a test.

## Testing Invariants

- Every `feat`/`fix`/`perf` adds or updates tests. Every reproduced bug gets a **named regression test**.
- Deterministic systems get **seeded** tests; solvability/generation get property tests over many seeds.
- Run focused tests → full suite → `npm run build` before proposing a commit message.

## Documentation Rules

| Change | Update |
|---|---|
| New/changed control | `README.md` |
| New permanent invariant | `AGENTS.md` (+ a pointer in `CLAUDE.md` if execution-relevant) |
| New active priority / status change | `ROADMAP.md` |
| New reproducible issue | `docs/known-issues.md` |
| Released player-facing change | `CHANGELOG.md` (via CI) |

In-repo docs are **English only** (README/AGENTS/CLAUDE/ROADMAP/code comments). Slovak working notes live
in `retro/docs/sk/` and are not committed.

## Work in Small Steps

Each step: solves one problem, keeps the game runnable, adds tests when behaviour changes, ends with a
concise summary and a proposed commit message.

## Git Discipline

Before proposing a commit message, inspect `git status --short`, `git diff --check`, `git diff --stat`,
then run `npm test` and `npm run build`.

## Commit Message Rules

Conventional Commits. `feat`/`fix`/`perf` need a detailed body covering the change, tests, and doc impact.
Propose messages; **do not execute commits without owner approval.**

```text
type(scope): concise summary

- change one
- change two

Tests:
- ...
```

## Release & Deployment Discipline

The owner manages pushes, releases, and deployment (semantic-release on push to `main` → build → GitHub
Pages). Agents recommend the release type but never push/release/deploy. After a CI release commit, the
owner pulls before further work.
