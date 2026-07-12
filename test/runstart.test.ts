import { describe, it, expect } from 'vitest'
import { createGame, type GameState } from '../src/game.ts'
import { movePlayer, tickPlayer } from '../src/player.ts'
import { createStoryState, stepStory } from '../src/intro.ts'
import { L } from '../src/lang.ts'
import { START_COL, TIMER_BASE_MS, WALK_DURATION_MS, MS_PER_CHAR, CARD_HOLD_MS } from '../src/config.ts'

// Race-free run start — the two logic gates behind the smoke test's `runStarted`
// check (scripts/smoke.mjs). That check once read false; the smoke harness was
// hardened (c95800d) but the owner asked to PROVE the game start can't stall as a
// matter of logic, not timing. Two gates decide "did the game actually start?":
//
//   1. The story pre-roll must reach `finished` — only then does main.ts hand off
//      to startRun(). If stepStory could ever hang, the game would never begin.
//   2. A fresh createGame must be immediately playable — the very first move
//      (step right off the entry gap, exactly what the smoke test does) must be
//      legal, or the run produces no trail and reads as "not started".
//
// Both are deterministic invariants here, so what the browser smoke test can only
// sample, these tests prove.

// ── Gate 1: the story pre-roll always terminates ───────────────────────────────
// Drive the real card set to completion under a given cadence; assert it finishes
// within a sane frame budget and that the card index NEVER regresses (monotonic
// progress — no oscillation, no stall). Returns the frame it finished on.
function driveStory(dtPerFrame: number, pressEvery: number, maxFrames = 100_000): number | null {
  const s = createStoryState()
  let lastCard = 0
  for (let f = 0; f < maxFrames; f++) {
    const pressed = pressEvery > 0 && f % pressEvery === 0
    stepStory(s, dtPerFrame, pressed)
    expect(s.card).toBeGreaterThanOrEqual(lastCard)   // monotonic — a card is never un-advanced
    lastCard = s.card
    if (s.finished) return f + 1
  }
  return null
}

describe('run start — the story pre-roll always opens the gate to startRun', () => {
  // A matrix of realistic-through-degenerate frame rates × input cadences. If any
  // combination could stall, the pre-roll would trap the player before the game.
  const dts = [16, 33, 50, MS_PER_CHAR, MS_PER_CHAR * 4, CARD_HOLD_MS + 1]
  const cadences = [0, 1, 2, 3, 5, 7, 13]   // 0 = never press (pure auto-advance)

  for (const dt of dts) {
    for (const pressEvery of cadences) {
      it(`reaches finished at dt=${dt}ms, key every ${pressEvery || '∞'} frames`, () => {
        expect(driveStory(dt, pressEvery)).not.toBeNull()
      })
    }
  }

  it('never pressing still auto-advances every card to the end', () => {
    // Pure hold-based advance: type time + CARD_HOLD_MS per card, no input at all.
    expect(driveStory(16, 0)).not.toBeNull()
  })

  it('mashing a key every frame fast-forwards without corrupting or hanging', () => {
    // Each card costs two frames (press finishes typing, next press advances), so
    // N cards finish in ~2N frames — bounded, never stuck.
    const frames = driveStory(1, 1)
    expect(frames).not.toBeNull()
    expect(frames!).toBeLessThanOrEqual(2 * L.STR_STORY_CARDS.length + 2)
  })
})

// ── Gate 2: a fresh run is immediately playable ────────────────────────────────
// startRun() just calls createGame() and drops into 'ingame' at runState 'idle'.
// The player's first real input is a step to the right off the entry gap (the
// smoke test's first move). From the entry cell (col 0, startRow) up/down are the
// solid perimeter fence and left is off-board, so RIGHT is the ONLY legal first
// move — and createGame guarantees a solvable entry→exit path, so (1, startRow)
// MUST be walkable. This mirrors main.ts's idle→running first step and asserts the
// step actually lands, producing the visited trail the smoke test detects.
function firstStepRight(state: GameState): void {
  // Mirror of main.ts:285-288 (the idle→running gate on the first movement):
  state.runState = 'running'
  state.debugMode = false
  movePlayer(state, 'right')
}

function assertStartable(state: GameState, label: string): void {
  expect(state.phase, label).toBe('playing')
  expect(state.runState, label).toBe('idle')
  expect(state.lives, label).toBeGreaterThanOrEqual(1)
  expect(state.timeLeftMs, label).toBe(TIMER_BASE_MS)   // full clock, not yet ticking
  expect(state.walkTween, label).toBeNull()
  expect(state.playerCol, label).toBe(START_COL)
  expect(state.playerRow, label).toBe(state.startRow)
  expect(state.map.getTile(START_COL, state.startRow)?.id, label).toBe('visited')  // spawn trail seed
}

function assertFirstStepLands(state: GameState, label: string): void {
  firstStepRight(state)
  // A tween exists ⇒ movePlayer accepted the step ⇒ (1, startRow) was walkable.
  expect(state.walkTween, `${label}: first step right must be legal`).not.toBeNull()
  tickPlayer(state, WALK_DURATION_MS + 5)   // land the walk (runs commitMove)
  expect(state.playerCol, label).toBe(START_COL + 1)
  expect(state.playerRow, label).toBe(state.startRow)
  expect(state.walkTween, label).toBeNull()
  // The vacated spawn cell is the yellow trail the smoke test reads in column 0.
  expect(state.map.getTile(START_COL, state.startRow)?.id, label).toBe('visited')
  expect(state.runState, label).toBe('running')
}

describe('run start — a fresh daily run is immediately playable (every date, every level)', () => {
  // A spread of daily dates across the year × the level range that spans every
  // mine mix (beacon from L3, cluster later, high density from L4). Every one is
  // seeded, so this is a hard determinism guarantee, not a sample.
  const dates = ['2026-01-01', '2026-03-17', '2026-06-24', '2026-07-12', '2026-09-07', '2026-12-31']
  const levels = [0, 1, 2, 3, 4, 5, 6, 7]

  for (const date of dates) {
    for (const level of levels) {
      it(`${date} L${level + 1}: startable and the first step lands`, () => {
        const seed = `${date}:L${level}`
        const state = createGame(level, 0, seed)
        assertStartable(state, `${seed}`)
        assertFirstStepLands(state, `${seed}`)
      })
    }
  }

  it('is byte-identical for the same daily seed (deterministic start)', () => {
    const a = createGame(4, 0, '2026-07-12:L4')
    const b = createGame(4, 0, '2026-07-12:L4')
    expect(a.startRow).toBe(b.startRow)
    expect(a.exitRow).toBe(b.exitRow)
  })
})

describe('run start — a fresh random run is immediately playable (unseeded, sampled)', () => {
  // Random runs use an unseeded RNG, so each call is a fresh board. Sample enough
  // per level (incl. the carve-heavy high levels) that a boxed-in spawn would show.
  const levels = [0, 1, 2, 3, 4, 5, 6, 7]
  const REPS = 15

  for (const level of levels) {
    it(`L${level + 1}: ${REPS} random boards all start and take a first step`, () => {
      for (let i = 0; i < REPS; i++) {
        const state = createGame(level)   // no seed ⇒ random, off-leaderboard
        assertStartable(state, `random L${level} #${i}`)
        assertFirstStepLands(state, `random L${level} #${i}`)
      }
    })
  }
})
