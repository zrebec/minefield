# ROADMAP.md — Minefield (ZX Spectrum Edition)

> The single live source of truth for current work, priorities, decisions, and deferred ideas.
> The deep design narrative/history lives in the SK working doc `retro/docs/sk/minefield.md`.

## North Star

An audio-first, blind minefield traversal that is **fair** (one daily field for everyone, always winnable)
and **authentically ZX Spectrum**. Polished to a "finished product": complete loop, leaderboard, save,
accessibility, and a clear RULES screen. The strongest moat is accessibility (genuinely playable blind).

## Current Status

| Area | Status | Last verified |
|---|---|---|
| Core loop | Complete (cross → levels → highscore → save) | 2026-06-23 |
| Fence + solvability | **Done** — winnable under all circumstances (gen + airdrop guard) | 2026-06-23 |
| Daily / Random + anti-cheat | Complete | 2026-06-23 |
| Tests | 266 (Vitest) | 2026-06-23 |
| Build / release | semantic-release → GitHub Pages | 2026-06-23 |
| Accessibility | Partial (visual detector done; stereo/TTS planned) | 2026-06-23 |

## Now

### P1 — Green gem special (decide, then implement)
- **Problem:** green gem currently gives only a time bonus; it lacks a distinct identity. Gold already
  gives a score bonus, red gives lives, cyan reveals a mine — green is undifferentiated.
- **Options (owner deliberating):** keep time-only; "disarm a threat ahead" (stays in the deduction core,
  no fifth state); shield (survive one blast — but adds a fifth state + a second damage branch).
- **Acceptance:** one chosen behaviour, data-driven in `config.ts`/`GEM_KINDS`, tested.
- **Non-goal:** a combinatorial pile of overlapping mechanics.

### P1 — Difficulty tuning pass
- The fenced field is intentionally tense but currently "brutal". Tune via existing knobs only:
  mines/level (`LEVEL_CONFIGS`), mines/airplane pass (`acMineDrop*`), building max size/count.
- **Acceptance:** a daily L1–L2 is reliably beatable within `TIMER_BASE_MS` by a careful player.

## Next

- **Top/bottom perimeter fence** (cosmetic + tension) — reduces the playfield to 16 rows (rows 0 and last
  become fence). Re-check airplane band + mine/building density on the smaller field.
- **Action Replay (key feature)** — record `seed + timed inputs` (a few bytes), replay fast with mines
  revealed (Mined-Out effect). Three payoffs: reveal, shareable run (code/URL, pairs with daily),
  server-less score verification. Candidate to extract into zx-kit as a generic primitive.
- **RULES.md / in-game rules screen** with refreshed screenshots toward a 1.0 "finished product".

## Later

- **Probe / stone** player aid (throw ahead, reveal a 3×3 without detonating; cost `500 × level`).
- **Accessibility moat:** stereo/spatial warning (mine direction in L/R), ARIA live region + `SpeechSynthesis`
  TTS for screen readers, an exit beacon tone. Assist-mode toggle; flag assisted runs.
- **Hostages / allies** (Mined-Out inspiration): rescue followers, can't finish without carrying them out.

## Technical Debt

| Priority | Debt | Why it matters | Direction |
|---|---|---|---|
| P3 | Respawn keeps `runState='running'` (no idle re-scout; timer keeps running) | Possibly-intended death penalty, but inconsistent with the level-start scout | Owner decision; see `docs/known-issues.md` |
| P4 | `revealsUsed` not reset on respawn | Negligible (reveal is idle-only; daily = 0) | Note only |
| P3 | Capture script (`scripts/capture.mjs`) router predates the fence | Refreshed `play.png` may route oddly | Teach the BFS router the fence/exit before refreshing |

## Decisions

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-23 | Airplane guard checks **entry→exit** (not player position) | Player-independent → keeps daily deterministic; safe-trail invariant still guarantees winnability |
| 2026-06-23 | Forward bias instead of strict "never drop behind player" | "Behind player" is player-dependent → would break daily determinism |
| 2026-06-22 | Daily debug reveal = 0; random capped (`RANDOM_REVEAL_LIMIT`) | Screenshots can't be blocked; protect daily fairness at the source |
| 2026-06-23 | Reset the score combo on death | Cleaner for the daily leaderboard |

## Dropped / Archived

| Idea | Why |
|---|---|
| Global online leaderboard | Naively forgeable; daily seed + replay verification is cheaper and era-appropriate |
| Mid-game memory snapshot save | `JSON.stringify` loses Set/Map identity; we persist a typed map instead |

## Completed Milestones

| Date | Milestone |
|---|---|
| 2026-06-23 | Airplane solvability guard — field winnable under all circumstances |
| 2026-06-22 | Perimeter fence with one entry/exit gap + generation solvability guarantee |
| 2026-06-22 | Reveal budget (daily = 0, random capped); zx-kit 0.34 volume adoption |
| 2026-06-21 | 6-row HUD · per-level timer · per-colour gem time bonus · gold = score bonus · paged pause menu |
| earlier | Gems + backpack · daily seed · save/load · gamepad · day/night · buildings · CRT · highscore |
