import { COLS, ROWS } from './constants.ts'
import { START_COL, START_ROW, SAFE_RADIUS, LEVEL_CONFIGS } from './config.ts'

export type GamePhase = 'intro' | 'playing' | 'exploding' | 'levelcomplete' | 'gameover'
export type Dir = 'up' | 'down' | 'left' | 'right'

export interface Cell {
  hasMine: boolean
  flagged: boolean
  visited: boolean
  exploded: boolean
}

export interface AirplaneState {
  x: number
  y: number
  dir: 1 | -1
  active: boolean
  dropDone: boolean
  warningBlink: boolean
}

export interface GameState {
  phase: GamePhase
  grid: Cell[][]
  level: number
  lives: number
  score: number
  playerCol: number
  playerRow: number
  playerDir: Dir
  flashTimer: number
  flashOn: boolean
  debugMode: boolean
  airplane: AirplaneState | null
  nextAircraftMs: number
  blink: boolean
  blinkTimer: number
  totalMines: number
  explodedMines: number
  levelCompleteTimer: number
}

function makeGrid(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      hasMine: false,
      flagged: false,
      visited: false,
      exploded: false,
    }))
  )
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function placeMines(grid: Cell[][], count: number, safeCol: number, safeRow: number): void {
  let placed = 0
  let attempts = 0
  while (placed < count && attempts < count * 20) {
    attempts++
    const col = randomInt(0, COLS - 1)
    const row = randomInt(0, ROWS - 1)
    if (Math.abs(col - safeCol) <= SAFE_RADIUS && Math.abs(row - safeRow) <= SAFE_RADIUS) continue
    if (col === COLS - 1) continue  // keep exit column clear
    if (grid[row][col].hasMine) continue
    grid[row][col].hasMine = true
    placed++
  }
}

export function countNeighborMines(grid: Cell[][], col: number, row: number): number {
  let count = 0
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const r = row + dr
    const c = col + dc
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      if (grid[r][c].hasMine && !grid[r][c].exploded) count++
    }
  }
  return count
}

export function createGame(level = 0, initialScore = 0): GameState {
  const cfg = LEVEL_CONFIGS[Math.min(level, LEVEL_CONFIGS.length - 1)]
  const grid = makeGrid()
  placeMines(grid, cfg.mines, START_COL, START_ROW)

  const firstAcMs = cfg.acFirstMs + Math.random() * (cfg.acFirstMaxMs - cfg.acFirstMs)

  return {
    phase: 'playing',
    grid,
    level,
    lives: cfg.lives,
    score: initialScore,
    playerCol: START_COL,
    playerRow: START_ROW,
    playerDir: 'right',
    flashTimer: 0,
    flashOn: false,
    debugMode: false,
    airplane: null,
    nextAircraftMs: firstAcMs,
    blink: true,
    blinkTimer: 500,
    totalMines: cfg.mines,
    explodedMines: 0,
    levelCompleteTimer: 0,
  }
}

export function addDropMines(state: GameState, count: number): void {
  let added = 0
  let attempts = 0
  while (added < count && attempts < count * 20) {
    attempts++
    const col = randomInt(0, COLS - 2)
    const row = randomInt(0, ROWS - 1)
    if (state.grid[row][col].hasMine) continue
    if (state.grid[row][col].visited) continue
    state.grid[row][col].hasMine = true
    state.totalMines++
    added++
  }
}
