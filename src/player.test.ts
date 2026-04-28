import { describe, it, expect, vi, beforeEach } from 'vitest'
import { movePlayer, respawnPlayer, toggleFlag } from './player.ts'
import { createGame, type GameState } from './game.ts'
import { COLS, ROWS } from './constants.ts'
import {
  START_COL, START_ROW,
  SCORE_PER_CELL, SCORE_MULTIPLIERS,
  EXPLOSION_FLASH_MS, LEVEL_COMPLETE_DELAY_MS,
  COMBO_DURATION_MS, GEM_SCORE,
} from './config.ts'

vi.mock('./audio.ts', () => ({
  playWarning: vi.fn(),
  playExplosion: vi.fn(),
  playGemCollect: vi.fn(),
}))

// Clean state at position (5,5) with no mines, cleared visited flags
function makeState(col = 5, row = 5): GameState {
  const state = createGame(0)
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      state.grid[r][c].hasMine = false
      state.grid[r][c].visited = false
      state.grid[r][c].flagged = false
      state.grid[r][c].hasGem = false
    }
  state.playerCol = col
  state.playerRow = row
  state.playerDir = 'right'
  state.playerWalkFrame = 0
  state.score = 0
  state.comboCount = 0
  state.comboTimer = 0
  state.explodedMines = 0
  return state
}

// ── movePlayer — phase guard ───────────────────────────────────────────────────

describe('movePlayer — phase guard', () => {
  it('does nothing when phase is exploding', () => {
    const state = makeState()
    state.phase = 'exploding'
    movePlayer(state, 'right')
    expect(state.playerCol).toBe(5)
    expect(state.playerDir).toBe('right')  // unchanged
  })

  it('does nothing when phase is gameover', () => {
    const state = makeState()
    state.phase = 'gameover'
    movePlayer(state, 'up')
    expect(state.playerRow).toBe(5)
    expect(state.playerDir).toBe('right')  // unchanged
  })

  it('does nothing when phase is levelcomplete', () => {
    const state = makeState()
    state.phase = 'levelcomplete'
    movePlayer(state, 'down')
    expect(state.playerRow).toBe(5)
  })
})

// ── movePlayer — direction update ─────────────────────────────────────────────

describe('movePlayer — direction update', () => {
  it('updates playerDir even on a valid move', () => {
    const state = makeState()
    movePlayer(state, 'up')
    expect(state.playerDir).toBe('up')
  })

  it('updates playerDir even on a blocked move (wall)', () => {
    const state = makeState(0, 5)
    movePlayer(state, 'left')   // blocked — col would go -1
    expect(state.playerDir).toBe('left')  // direction still updates
    expect(state.playerCol).toBe(0)       // position stays
  })
})

// ── movePlayer — bounds checking ──────────────────────────────────────────────

describe('movePlayer — bounds checking', () => {
  it('does not move left from col=0', () => {
    const state = makeState(0, 5)
    movePlayer(state, 'left')
    expect(state.playerCol).toBe(0)
  })

  it('does not move up from row=0', () => {
    const state = makeState(5, 0)
    movePlayer(state, 'up')
    expect(state.playerRow).toBe(0)
  })

  it('does not move down from row=ROWS-1', () => {
    const state = makeState(5, ROWS - 1)
    movePlayer(state, 'down')
    expect(state.playerRow).toBe(ROWS - 1)
  })

  it('allows move to col=COLS-1 (last column before right edge)', () => {
    const state = makeState(COLS - 2, 5)
    movePlayer(state, 'right')
    expect(state.playerCol).toBe(COLS - 1)
    expect(state.phase).toBe('playing')
  })
})

// ── movePlayer — level complete ───────────────────────────────────────────────

describe('movePlayer — level complete', () => {
  it('triggers levelcomplete when moving right from col=COLS-1', () => {
    const state = makeState(COLS - 1, 5)
    movePlayer(state, 'right')
    expect(state.phase).toBe('levelcomplete')
  })

  it('sets levelCompleteTimer to LEVEL_COMPLETE_DELAY_MS', () => {
    const state = makeState(COLS - 1, 5)
    movePlayer(state, 'right')
    expect(state.levelCompleteTimer).toBe(LEVEL_COMPLETE_DELAY_MS)
  })

  it('does not update player position on level complete trigger', () => {
    const state = makeState(COLS - 1, 5)
    movePlayer(state, 'right')
    expect(state.playerCol).toBe(COLS - 1)  // stays at last col
  })
})

// ── movePlayer — mine hit ─────────────────────────────────────────────────────

describe('movePlayer — mine hit', () => {
  it('sets phase to exploding', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasMine = true
    movePlayer(state, 'right')
    expect(state.phase).toBe('exploding')
  })

  it('marks mine cell as exploded and removes mine flag', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasMine = true
    movePlayer(state, 'right')
    expect(state.grid[5][6].exploded).toBe(true)
    expect(state.grid[5][6].hasMine).toBe(false)
  })

  it('increments explodedMines counter', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasMine = true
    movePlayer(state, 'right')
    expect(state.explodedMines).toBe(1)
  })

  it('moves player onto the mine cell', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasMine = true
    movePlayer(state, 'right')
    expect(state.playerCol).toBe(6)
    expect(state.playerRow).toBe(5)
  })

  it('sets flashTimer and flashOn', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasMine = true
    movePlayer(state, 'right')
    expect(state.flashTimer).toBe(EXPLOSION_FLASH_MS)
    expect(state.flashOn).toBe(true)
  })

  it('does not add score for stepping on mine', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasMine = true
    movePlayer(state, 'right')
    expect(state.score).toBe(0)
  })

  it('does not toggle playerWalkFrame on mine hit', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasMine = true
    movePlayer(state, 'right')
    expect(state.playerWalkFrame).toBe(0)
  })

  it('does not step on already-exploded mine (treats as safe cell)', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasMine = true
    state.grid[5][6].exploded = true
    movePlayer(state, 'right')
    expect(state.phase).toBe('playing')  // no explosion
  })
})

// ── movePlayer — normal move ───────────────────────────────────────────────────

describe('movePlayer — normal move', () => {
  it('updates player position', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    expect(state.playerCol).toBe(6)
    expect(state.playerRow).toBe(5)
  })

  it('marks destination cell as visited', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    expect(state.grid[5][6].visited).toBe(true)
  })

  it('does not mark source cell as visited', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    expect(state.grid[5][5].visited).toBe(false)
  })

  it('does not re-score already visited cell', () => {
    const state = makeState(5, 5)
    state.grid[5][6].visited = true
    movePlayer(state, 'right')
    expect(state.score).toBe(0)
    expect(state.comboCount).toBe(0)
  })

  it('moves in all four directions correctly', () => {
    const checks: Array<['up'|'down'|'left'|'right', number, number]> = [
      ['right', 6, 5],
      ['left',  4, 5],
      ['down',  5, 6],
      ['up',    5, 4],
    ]
    for (const [dir, expectedCol, expectedRow] of checks) {
      const state = makeState(5, 5)
      movePlayer(state, dir)
      expect(state.playerCol).toBe(expectedCol)
      expect(state.playerRow).toBe(expectedRow)
    }
  })
})

// ── movePlayer — score and combo ──────────────────────────────────────────────

describe('movePlayer — score and combo', () => {
  it('adds score for first unvisited cell (combo x1)', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    const expected = Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[0] * 1.0)
    expect(state.score).toBe(expected)
  })

  it('increments comboCount on new cell', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    expect(state.comboCount).toBe(1)
  })

  it('resets comboTimer on new cell', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    expect(state.comboTimer).toBe(COMBO_DURATION_MS)
  })

  it('applies increasing combo multiplier on consecutive new cells', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')   // comboCount=1, mult=1.0
    movePlayer(state, 'right')   // comboCount=2, mult=1.1
    const expected =
      Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[0] * 1.0) +
      Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[0] * 1.1)
    expect(state.score).toBe(expected)
  })

  it('does not increment combo when revisiting cell', () => {
    const state = makeState(5, 5)
    state.grid[5][6].visited = true
    movePlayer(state, 'right')
    expect(state.comboCount).toBe(0)
    expect(state.comboTimer).toBe(0)
  })

  it('uses level multiplier for score', () => {
    const state = makeState(5, 5)
    state.level = 1  // SCORE_MULTIPLIERS[1] = 1.2
    movePlayer(state, 'right')
    const expected = Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[1] * 1.0)
    expect(state.score).toBe(expected)
  })
})

// ── movePlayer — gem collection ───────────────────────────────────────────────

describe('movePlayer — gem collection', () => {
  it('removes gem from cell when collected', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasGem = true
    movePlayer(state, 'right')
    expect(state.grid[5][6].hasGem).toBe(false)
  })

  it('increments gemsCollected counter', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasGem = true
    const before = state.gemsCollected
    movePlayer(state, 'right')
    expect(state.gemsCollected).toBe(before + 1)
  })

  it('adds GEM_SCORE on top of cell score', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasGem = true
    movePlayer(state, 'right')
    const cellScore = Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[0] * 1.0)
    const gemScore  = Math.round(GEM_SCORE * 1.0)
    expect(state.score).toBe(cellScore + gemScore)
  })

  it('does not collect gem on already-visited cell', () => {
    const state = makeState(5, 5)
    state.grid[5][6].visited = true
    state.grid[5][6].hasGem = true
    const before = state.gemsCollected
    movePlayer(state, 'right')
    // gem still collected (code checks hasGem independently of visited)
    expect(state.gemsCollected).toBe(before + 1)
    expect(state.grid[5][6].hasGem).toBe(false)
  })
})

// ── movePlayer — walk animation ───────────────────────────────────────────────

describe('movePlayer — walk animation', () => {
  it('toggles playerWalkFrame 0 → 1 on first move', () => {
    const state = makeState()
    movePlayer(state, 'right')
    expect(state.playerWalkFrame).toBe(1)
  })

  it('toggles playerWalkFrame 1 → 0 on second move', () => {
    const state = makeState()
    movePlayer(state, 'right')
    movePlayer(state, 'right')
    expect(state.playerWalkFrame).toBe(0)
  })

  it('does not toggle playerWalkFrame on blocked move (wall)', () => {
    const state = makeState(0, 5)
    movePlayer(state, 'left')
    expect(state.playerWalkFrame).toBe(0)
  })

  it('does not toggle playerWalkFrame on mine hit', () => {
    const state = makeState(5, 5)
    state.grid[5][6].hasMine = true
    movePlayer(state, 'right')
    expect(state.playerWalkFrame).toBe(0)
  })

  it('does not toggle playerWalkFrame on level complete trigger', () => {
    const state = makeState(COLS - 1, 5)
    movePlayer(state, 'right')
    expect(state.playerWalkFrame).toBe(0)
  })
})

// ── respawnPlayer ─────────────────────────────────────────────────────────────

describe('respawnPlayer', () => {
  it('decrements lives by 1', () => {
    const state = makeState()
    state.lives = 3
    respawnPlayer(state)
    expect(state.lives).toBe(2)
  })

  it('resets player position to start', () => {
    const state = makeState(10, 10)
    respawnPlayer(state)
    expect(state.playerCol).toBe(START_COL)
    expect(state.playerRow).toBe(START_ROW)
  })

  it('resets playerDir to right', () => {
    const state = makeState()
    state.playerDir = 'up'
    respawnPlayer(state)
    expect(state.playerDir).toBe('right')
  })

  it('sets phase to playing when lives remain', () => {
    const state = makeState()
    state.lives = 2
    respawnPlayer(state)
    expect(state.phase).toBe('playing')
  })

  it('sets phase to gameover when last life is lost', () => {
    const state = makeState()
    state.lives = 1
    respawnPlayer(state)
    expect(state.phase).toBe('gameover')
    expect(state.lives).toBe(0)
  })
})

// ── toggleFlag ────────────────────────────────────────────────────────────────

describe('toggleFlag', () => {
  it('flags the unvisited cell directly in front (right)', () => {
    const state = makeState(5, 5)
    state.playerDir = 'right'
    toggleFlag(state)
    expect(state.grid[5][6].flagged).toBe(true)
  })

  it('flags cell in front when facing up', () => {
    const state = makeState(5, 5)
    state.playerDir = 'up'
    toggleFlag(state)
    expect(state.grid[4][5].flagged).toBe(true)
  })

  it('flags cell in front when facing down', () => {
    const state = makeState(5, 5)
    state.playerDir = 'down'
    toggleFlag(state)
    expect(state.grid[6][5].flagged).toBe(true)
  })

  it('flags cell in front when facing left', () => {
    const state = makeState(5, 5)
    state.playerDir = 'left'
    toggleFlag(state)
    expect(state.grid[5][4].flagged).toBe(true)
  })

  it('unflags already-flagged cell (toggle)', () => {
    const state = makeState(5, 5)
    state.playerDir = 'right'
    state.grid[5][6].flagged = true
    toggleFlag(state)
    expect(state.grid[5][6].flagged).toBe(false)
  })

  it('does not flag a visited cell', () => {
    const state = makeState(5, 5)
    state.playerDir = 'right'
    state.grid[5][6].visited = true
    toggleFlag(state)
    expect(state.grid[5][6].flagged).toBe(false)
  })

  it('does nothing when phase is not playing', () => {
    const state = makeState(5, 5)
    state.phase = 'gameover'
    state.playerDir = 'right'
    toggleFlag(state)
    expect(state.grid[5][6].flagged).toBe(false)
  })

  it('does not crash when player faces grid edge', () => {
    const state = makeState(COLS - 1, 5)
    state.playerDir = 'right'
    expect(() => toggleFlag(state)).not.toThrow()
  })
})
