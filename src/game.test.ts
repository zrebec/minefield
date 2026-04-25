import { describe, it, expect } from 'vitest'
import { countWarningMines, createGame, addDropMinesInBand, applyClusterBlast, type Cell, type MineType } from './game.ts'
import { COLS, ROWS } from './constants.ts'
import { BEACON_MINE_LEVEL, CLUSTER_MINE_LEVEL, GEM_COUNT } from './config.ts'

// ── Grid helpers ──────────────────────────────────────────────────────────────

function emptyGrid(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      hasMine: false,
      mineType: 'normal' as MineType,
      flagged: false,
      visited: false,
      exploded: false,
      hasGem: false,
    }))
  )
}

function setMine(grid: Cell[][], col: number, row: number, type: MineType = 'normal'): void {
  grid[row][col].hasMine = true
  grid[row][col].mineType = type
}

// ── countWarningMines ─────────────────────────────────────────────────────────

describe('countWarningMines — normal mines', () => {
  it('returns 0 when no mines around player', () => {
    const grid = emptyGrid()
    expect(countWarningMines(grid, 5, 5)).toBe(0)
  })

  it('counts a mine directly above', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 4)
    expect(countWarningMines(grid, 5, 5)).toBe(1)
  })

  it('counts a mine directly below', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 6)
    expect(countWarningMines(grid, 5, 5)).toBe(1)
  })

  it('counts a mine directly left', () => {
    const grid = emptyGrid()
    setMine(grid, 4, 5)
    expect(countWarningMines(grid, 5, 5)).toBe(1)
  })

  it('counts a mine directly right', () => {
    const grid = emptyGrid()
    setMine(grid, 6, 5)
    expect(countWarningMines(grid, 5, 5)).toBe(1)
  })

  it('does NOT count a diagonal mine', () => {
    const grid = emptyGrid()
    setMine(grid, 6, 4)  // top-right diagonal
    setMine(grid, 4, 4)  // top-left diagonal
    setMine(grid, 6, 6)  // bottom-right diagonal
    setMine(grid, 4, 6)  // bottom-left diagonal
    expect(countWarningMines(grid, 5, 5)).toBe(0)
  })

  it('counts all 4 adjacent mines', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 4)
    setMine(grid, 5, 6)
    setMine(grid, 4, 5)
    setMine(grid, 6, 5)
    expect(countWarningMines(grid, 5, 5)).toBe(4)
  })

  it('does not count already exploded mines', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 4)
    grid[4][5].exploded = true
    expect(countWarningMines(grid, 5, 5)).toBe(0)
  })

  it('handles player at grid edge without crash', () => {
    const grid = emptyGrid()
    setMine(grid, 1, 0)
    expect(() => countWarningMines(grid, 0, 0)).not.toThrow()
  })

  it('caps warning count at 8', () => {
    // Place beacon mines so count could exceed 8 via 2-cell range
    const grid = emptyGrid()
    setMine(grid, 5, 4); setMine(grid, 5, 6)
    setMine(grid, 4, 5); setMine(grid, 6, 5)
    setMine(grid, 5, 3, 'beacon'); setMine(grid, 5, 7, 'beacon')
    setMine(grid, 3, 5, 'beacon'); setMine(grid, 7, 5, 'beacon')
    // 4 adjacent normal + 4 beacon at range 2 = 8, should not exceed 8
    expect(countWarningMines(grid, 5, 5)).toBe(8)
  })
})

// ── countWarningMines — beacon mines ─────────────────────────────────────────

describe('countWarningMines — beacon mines', () => {
  it('beacon mine 1 cell away counts like a normal mine', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 4, 'beacon')
    expect(countWarningMines(grid, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells away ALSO warns', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 3, 'beacon')  // 2 rows above
    expect(countWarningMines(grid, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells left warns', () => {
    const grid = emptyGrid()
    setMine(grid, 3, 5, 'beacon')
    expect(countWarningMines(grid, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells right warns', () => {
    const grid = emptyGrid()
    setMine(grid, 7, 5, 'beacon')
    expect(countWarningMines(grid, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells below warns', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 7, 'beacon')
    expect(countWarningMines(grid, 5, 5)).toBe(1)
  })

  it('normal mine 2 cells away does NOT warn', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 3, 'normal')
    expect(countWarningMines(grid, 5, 5)).toBe(0)
  })

  it('cluster mine 2 cells away does NOT warn', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 3, 'cluster')
    expect(countWarningMines(grid, 5, 5)).toBe(0)
  })

  it('beacon mine 3 cells away does NOT warn', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 2, 'beacon')  // 3 rows above
    expect(countWarningMines(grid, 5, 5)).toBe(0)
  })

  it('beacon mine diagonally 2 away does NOT warn (only cardinal)', () => {
    const grid = emptyGrid()
    setMine(grid, 3, 3, 'beacon')  // diagonal 2 away
    expect(countWarningMines(grid, 5, 5)).toBe(0)
  })

  it('exploded beacon mine 2 cells away does not warn', () => {
    const grid = emptyGrid()
    setMine(grid, 5, 3, 'beacon')
    grid[3][5].exploded = true
    expect(countWarningMines(grid, 5, 5)).toBe(0)
  })
})

// ── Mine type placement ───────────────────────────────────────────────────────

describe('mine type placement via createGame', () => {
  it('level 1 has no beacon or cluster mines', () => {
    // Run multiple times to reduce false-negative probability
    for (let run = 0; run < 5; run++) {
      const state = createGame(0)
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = state.grid[r][c]
          if (cell.hasMine) {
            expect(cell.mineType).toBe('normal')
          }
        }
      }
    }
  })

  it(`level ${BEACON_MINE_LEVEL + 1} contains at least some beacon mines (probabilistic)`, () => {
    // With 80 mines and 12% ratio, probability of zero beacon mines is ~0.00001
    let foundBeacon = false
    for (let run = 0; run < 10 && !foundBeacon; run++) {
      const state = createGame(BEACON_MINE_LEVEL)
      for (let r = 0; r < ROWS && !foundBeacon; r++) {
        for (let c = 0; c < COLS && !foundBeacon; c++) {
          if (state.grid[r][c].hasMine && state.grid[r][c].mineType === 'beacon') {
            foundBeacon = true
          }
        }
      }
    }
    expect(foundBeacon).toBe(true)
  })

  it(`level ${CLUSTER_MINE_LEVEL + 1} contains at least some cluster mines (probabilistic)`, () => {
    let foundCluster = false
    for (let run = 0; run < 10 && !foundCluster; run++) {
      const state = createGame(CLUSTER_MINE_LEVEL)
      for (let r = 0; r < ROWS && !foundCluster; r++) {
        for (let c = 0; c < COLS && !foundCluster; c++) {
          if (state.grid[r][c].hasMine && state.grid[r][c].mineType === 'cluster') {
            foundCluster = true
          }
        }
      }
    }
    expect(foundCluster).toBe(true)
  })

  it('mine types are only normal/beacon/cluster, never undefined', () => {
    const state = createGame(3)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = state.grid[r][c]
        if (cell.hasMine) {
          expect(['normal', 'beacon', 'cluster']).toContain(cell.mineType)
        }
      }
    }
  })

  it('dropped mines (addDropMinesInBand) are always normal type', () => {
    const state = createGame(3)
    addDropMinesInBand(state, 5, 5, 7)
    for (const { col, row } of state.droppedMines) {
      expect(state.grid[row][col].mineType).toBe('normal')
    }
  })

  it('addDropMinesInBand places mines only within the specified row band', () => {
    const state = createGame(0)
    addDropMinesInBand(state, 10, 3, 5)
    for (const { row } of state.droppedMines) {
      expect(row).toBeGreaterThanOrEqual(3)
      expect(row).toBeLessThanOrEqual(5)
    }
  })

  it('addDropMinesInBand sets dropFlashTimer to 500', () => {
    const state = createGame(0)
    addDropMinesInBand(state, 3, 0, 2)
    expect(state.dropFlashTimer).toBe(500)
  })

  it('addDropMinesInBand records dropped positions in droppedMines', () => {
    const state = createGame(0)
    addDropMinesInBand(state, 3, 0, 2)
    expect(state.droppedMines.length).toBeGreaterThan(0)
    expect(state.droppedMines.length).toBeLessThanOrEqual(3)
  })

  it('addDropMinesInBand does not place mines on visited cells', () => {
    const state = createGame(0)
    // Mark a large area as visited
    for (let r = 0; r <= 2; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        state.grid[r][c].hasMine = false
        state.grid[r][c].visited = true
      }
    }
    addDropMinesInBand(state, 5, 0, 2)
    for (const { col, row } of state.droppedMines) {
      expect(state.grid[row][col].visited).toBe(false)
    }
  })
})

// ── Gem placement ─────────────────────────────────────────────────────────────

describe('gem placement', () => {
  it(`places exactly ${GEM_COUNT} gems per level`, () => {
    for (let run = 0; run < 3; run++) {
      const state = createGame(0)
      let gemCount = 0
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (state.grid[r][c].hasGem) gemCount++
        }
      }
      expect(gemCount).toBe(GEM_COUNT)
    }
  })

  it('gems are never placed on mine cells', () => {
    for (let run = 0; run < 5; run++) {
      const state = createGame(2)
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = state.grid[r][c]
          expect(cell.hasMine && cell.hasGem).toBe(false)
        }
      }
    }
  })

  it('gemsTotal in GameState matches GEM_COUNT', () => {
    const state = createGame(0)
    expect(state.gemsTotal).toBe(GEM_COUNT)
    expect(state.gemsCollected).toBe(0)
  })
})

// ── applyClusterBlast ─────────────────────────────────────────────────────────

describe('applyClusterBlast', () => {
  it('marks all 8 surrounding safe cells as visited', () => {
    const state = createGame(0)
    // Clear mines near center to isolate the test
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) { state.grid[r][c].hasMine = false; state.grid[r][c].exploded = false }

    applyClusterBlast(state, 5, 5)

    const neighbors = [
      [4,4],[5,4],[6,4],
      [4,5],      [6,5],
      [4,6],[5,6],[6,6],
    ]
    for (const [col, row] of neighbors) {
      expect(state.grid[row][col].visited).toBe(true)
    }
  })

  it('does not mark the center cell as visited', () => {
    const state = createGame(0)
    state.grid[5][5].hasMine = false
    applyClusterBlast(state, 5, 5)
    expect(state.grid[5][5].visited).toBe(false)
  })

  it('chain-explodes mines in the 8 surrounding cells', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.grid[r][c].hasMine = false
    // Place mines in 3 of the 8 surrounding cells
    setMine(state.grid, 4, 4)
    setMine(state.grid, 6, 5)
    setMine(state.grid, 5, 6)
    const minesBefore = state.explodedMines

    applyClusterBlast(state, 5, 5)

    expect(state.explodedMines).toBe(minesBefore + 3)
    expect(state.grid[4][4].exploded).toBe(true)
    expect(state.grid[5][6].exploded).toBe(true)
    expect(state.grid[6][5].exploded).toBe(true)
  })

  it('chain-exploded cells are not marked as visited', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.grid[r][c].hasMine = false
    setMine(state.grid, 4, 4)

    applyClusterBlast(state, 5, 5)

    expect(state.grid[4][4].visited).toBe(false)
    expect(state.grid[4][4].exploded).toBe(true)
  })

  it('does not re-explode already exploded cells', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.grid[r][c].hasMine = false
    state.grid[4][4].hasMine = true
    state.grid[4][4].exploded = true  // already exploded
    const minesBefore = state.explodedMines

    applyClusterBlast(state, 5, 5)

    expect(state.explodedMines).toBe(minesBefore)
  })

  it('clears gems swept by the blast', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) { state.grid[r][c].hasMine = false }
    state.grid[4][4].hasGem = true

    applyClusterBlast(state, 5, 5)

    expect(state.grid[4][4].hasGem).toBe(false)
    expect(state.grid[4][4].visited).toBe(true)
  })

  it('does not visit already visited cells (no double-visit)', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.grid[r][c].hasMine = false
    state.grid[4][4].visited = true  // already visited

    applyClusterBlast(state, 5, 5)

    // Still visited, no error
    expect(state.grid[4][4].visited).toBe(true)
  })

  it('handles blast at grid corner without out-of-bounds crash', () => {
    const state = createGame(0)
    state.grid[0][0].hasMine = false
    expect(() => applyClusterBlast(state, 0, 0)).not.toThrow()
  })
})

// ── GameState initial values ──────────────────────────────────────────────────

describe('createGame initial state', () => {
  it('combo starts at 0', () => {
    const state = createGame(0)
    expect(state.comboCount).toBe(0)
    expect(state.comboTimer).toBe(0)
  })

  it('preserves score across levels', () => {
    const state = createGame(2, 1234)
    expect(state.score).toBe(1234)
  })
})
