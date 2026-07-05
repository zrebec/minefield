import { describe, it, expect, vi } from 'vitest'
import { playDirectionCue } from './audio.ts'   // vi.mock below makes this a spy
import { movePlayer, respawnPlayer, toggleFlag, tickPlayer } from './player.ts'
import { createGame, cellKey, INVENTORY_CAP, type GameState } from './game.ts'
import { C, COLS, ROWS } from './constants.ts'
import {
  START_COL,
  SCORE_PER_CELL, SCORE_MULTIPLIERS,
  EXPLOSION_FLASH_MS, LEVEL_COMPLETE_DELAY_MS,
  COMBO_DURATION_MS, GEM_SCORE, GEM_TIME_BONUS_MS, GOLD_SCORE_BONUS,
  GREEN_GEMS_PER_PLANE,
  DAY_STEPS, NIGHT_STEPS,
  WALK_DURATION_MS,
} from './config.ts'
import type { Direction } from './input.ts'
import { makeTileGround, makeTileMine, makeTileVisited, makeTileGem, makeTileFence, TILE_EXPLODED, type TerrainType } from './sprites.ts'

vi.mock('./audio.ts', () => ({
  playWarning: vi.fn(),
  playDirectionCue: vi.fn(),
  playExplosion: vi.fn(),
  playGemCollect: vi.fn(),
  playFootstep: vi.fn(),
  playExtraLife: vi.fn(),
  playReveal: vi.fn(),
  isAmbientSoundActive: vi.fn().mockReturnValue(false),
  // Pulled in transitively via airplane.ts (spawnFriendlyPlane → startFriendlyPlane).
  startAirplane: vi.fn(),
  stopAirplane: vi.fn(),
  startFriendlyPlane: vi.fn(),
  stopFriendlyPlane: vi.fn(),
  startApproachSound: vi.fn(),
  isApproachSoundActive: vi.fn().mockReturnValue(false),
}))

function cellVariant(col: number, row: number): 'a' | 'b' {
  return (col + row) % 2 === 0 ? 'a' : 'b'
}

// Triggers a movement and runs the walk to completion, so the post-commit state
// (mine reveal, score, position update) is observable in the same test step.
function step(state: GameState, dir: Direction): void {
  movePlayer(state, dir)
  tickPlayer(state, WALK_DURATION_MS + 1)
}

// Clean state at position (5,5) with all cells set to unvisited ground
function makeState(col = 5, row = 5): GameState {
  const state = createGame(0)
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      state.map.setTile(c, r, makeTileGround(cellVariant(c, r), 'grass'))
    }
  state.playerCol = col
  state.playerRow = row
  state.playerDir = 'right'
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
    step(state, 'right')
    expect(state.playerCol).toBe(5)
    expect(state.playerDir).toBe('right')  // unchanged
  })

  it('does nothing when phase is gameover', () => {
    const state = makeState()
    state.phase = 'gameover'
    step(state, 'up')
    expect(state.playerRow).toBe(5)
    expect(state.playerDir).toBe('right')  // unchanged
  })

  it('does nothing when phase is levelcomplete', () => {
    const state = makeState()
    state.phase = 'levelcomplete'
    step(state, 'down')
    expect(state.playerRow).toBe(5)
  })
})

// ── movePlayer — direction update ─────────────────────────────────────────────

describe('movePlayer — direction update', () => {
  it('updates playerDir even on a valid move', () => {
    const state = makeState()
    step(state, 'up')
    expect(state.playerDir).toBe('up')
  })

  it('updates playerDir even on a blocked move (wall)', () => {
    const state = makeState(0, 5)
    step(state, 'left')
    expect(state.playerDir).toBe('left')
    expect(state.playerCol).toBe(0)
  })
})

// ── movePlayer — bounds checking ──────────────────────────────────────────────

describe('movePlayer — bounds checking', () => {
  it('does not move left from col=0', () => {
    const state = makeState(0, 5)
    step(state, 'left')
    expect(state.playerCol).toBe(0)
  })

  it('does not move up from row=0', () => {
    const state = makeState(5, 0)
    step(state, 'up')
    expect(state.playerRow).toBe(0)
  })

  it('does not move down from row=ROWS-1', () => {
    const state = makeState(5, ROWS - 1)
    step(state, 'down')
    expect(state.playerRow).toBe(ROWS - 1)
  })

  it('allows move to col=COLS-1 (last column before right edge)', () => {
    const state = makeState(COLS - 2, 5)
    step(state, 'right')
    expect(state.playerCol).toBe(COLS - 1)
    expect(state.phase).toBe('playing')
  })
})

// ── movePlayer — level complete ───────────────────────────────────────────────

describe('movePlayer — level complete', () => {
  it('triggers levelcomplete when moving right from col=COLS-1', () => {
    const state = makeState(COLS - 1, 5)
    step(state, 'right')
    expect(state.phase).toBe('levelcomplete')
  })

  it('sets levelCompleteTimer to LEVEL_COMPLETE_DELAY_MS', () => {
    const state = makeState(COLS - 1, 5)
    step(state, 'right')
    expect(state.levelCompleteTimer).toBe(LEVEL_COMPLETE_DELAY_MS)
  })

  it('does not update player position on level complete trigger', () => {
    const state = makeState(COLS - 1, 5)
    step(state, 'right')
    expect(state.playerCol).toBe(COLS - 1)
  })
})

// ── movePlayer — mine hit ─────────────────────────────────────────────────────

describe('movePlayer — mine hit', () => {
  it('sets phase to exploding', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    step(state, 'right')
    expect(state.phase).toBe('exploding')
  })

  // Regression test: flagging used to change a mine's tile.id to 'flag',
  // which meant this explosion check (tile.id === 'mine') silently missed it
  // — walking onto a flagged mine was treated as safe, scored ground. Flags
  // now live entirely OUTSIDE the map (state.flags overlay), so the tile is a
  // real mine by construction, it must explode exactly like an unflagged one —
  // and the detonation is the one event allowed to remove the flag.
  it('still explodes when the mine is flagged — and the detonation clears the flag', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    state.playerDir = 'right'
    toggleFlag(state)
    expect(state.map.getTile(6, 5)?.id).toBe('mine')  // sanity: still a real mine
    step(state, 'right')
    expect(state.phase).toBe('exploding')
    expect(state.map.getTile(6, 5)?.id).toBe('exploded')
    expect(state.flags.has(cellKey(6, 5))).toBe(false)  // detonation removed the flag
  })

  it('marks mine cell as exploded', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    step(state, 'right')
    expect(state.map.getTile(6, 5)?.id).toBe('exploded')
  })

  it('increments explodedMines counter', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    step(state, 'right')
    expect(state.explodedMines).toBe(1)
  })

  it('moves player onto the mine cell', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    step(state, 'right')
    expect(state.playerCol).toBe(6)
    expect(state.playerRow).toBe(5)
  })

  it('sets flashTimer and flashOn', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    step(state, 'right')
    expect(state.flashTimer).toBe(EXPLOSION_FLASH_MS)
    expect(state.flashOn).toBe(true)
  })

  it('does not add score for stepping on mine', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    step(state, 'right')
    expect(state.score).toBe(0)
  })

  it('does not step on already-exploded mine (treats as safe cell)', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    state.map.setTile(6, 5, { sprite: new Uint8Array(8), ink: C.YELLOW, paper: C.BLACK, solid: false, id: 'exploded' })
    step(state, 'right')
    expect(state.phase).toBe('playing')
  })
})

// ── movePlayer — normal move ───────────────────────────────────────────────────

describe('movePlayer — normal move', () => {
  it('updates player position', () => {
    const state = makeState(5, 5)
    step(state, 'right')
    expect(state.playerCol).toBe(6)
    expect(state.playerRow).toBe(5)
  })

  it('marks destination cell as visited', () => {
    const state = makeState(5, 5)
    step(state, 'right')
    expect(state.map.getTile(6, 5)?.id).toBe('visited')
  })

  it('does not mark source cell as visited', () => {
    const state = makeState(5, 5)
    step(state, 'right')
    expect(state.map.getTile(5, 5)?.id).toBe('ground')
  })

  it('does not re-score already visited cell', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileVisited(cellVariant(6, 5), 'grass'))
    step(state, 'right')
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
      step(state, dir)
      expect(state.playerCol).toBe(expectedCol)
      expect(state.playerRow).toBe(expectedRow)
    }
  })
})

// ── movePlayer — score and combo ──────────────────────────────────────────────

describe('movePlayer — score and combo', () => {
  it('adds score for first unvisited cell (combo x1)', () => {
    const state = makeState(5, 5)
    step(state, 'right')
    const expected = Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[0] * 1.0)
    expect(state.score).toBe(expected)
  })

  it('increments comboCount on new cell', () => {
    const state = makeState(5, 5)
    step(state, 'right')
    expect(state.comboCount).toBe(1)
  })

  it('resets comboTimer on new cell', () => {
    const state = makeState(5, 5)
    step(state, 'right')
    expect(state.comboTimer).toBe(COMBO_DURATION_MS)
  })

  it('applies increasing combo multiplier on consecutive new cells', () => {
    const state = makeState(5, 5)
    step(state, 'right')
    step(state, 'right')
    const expected =
      Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[0] * 1.0) +
      Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[0] * 1.1)
    expect(state.score).toBe(expected)
  })

  it('does not increment combo when revisiting cell', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileVisited(cellVariant(6, 5), 'grass'))
    step(state, 'right')
    expect(state.comboCount).toBe(0)
    expect(state.comboTimer).toBe(0)
  })

  it('uses level multiplier for score', () => {
    const state = makeState(5, 5)
    state.level = 1
    step(state, 'right')
    const expected = Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[1] * 1.0)
    expect(state.score).toBe(expected)
  })
})

// ── movePlayer — gem collection ───────────────────────────────────────────────

describe('movePlayer — gem collection', () => {
  it('removes gem from cell when collected (cell becomes visited)', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileGem())
    step(state, 'right')
    expect(state.map.getTile(6, 5)?.id).toBe('visited')
  })

  it('increments gemsCollected counter', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileGem())
    const before = state.gemsCollected
    step(state, 'right')
    expect(state.gemsCollected).toBe(before + 1)
  })

  it('adds GEM_SCORE on top of cell score', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileGem())
    step(state, 'right')
    const cellScore = Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[0] * 1.0)
    const gemScore  = Math.round(GEM_SCORE * 1.0)
    expect(state.score).toBe(cellScore + gemScore)
  })

  it('collects the gem into the backpack by kind', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileGem('red', C.RED))
    step(state, 'right')
    expect(state.inventory.red).toBe(1)
  })

  it('refuses a gem when the backpack is full — it stays on the field', () => {
    const state = makeState(5, 5)
    state.inventory = { cyan: INVENTORY_CAP }   // backpack full
    state.map.setTile(6, 5, makeTileGem('red', C.RED))
    const beforeGems = state.gemsCollected
    step(state, 'right')
    expect(state.inventory.red ?? 0).toBe(0)         // not collected
    expect(state.gemsCollected).toBe(beforeGems)     // not counted
    expect(state.map.getTile(6, 5)?.id).toBe('gem')  // gem remains, cell not claimed
  })

  it('grants the gem-colour time bonus on pickup (red)', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileGem('red', C.RED))
    const before = state.timeLeftMs
    step(state, 'right')
    expect(state.timeLeftMs).toBe(before + GEM_TIME_BONUS_MS.red)
  })

  it('grants no time for a zero-bonus gem colour (cyan)', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileGem('cyan', C.CYAN))
    const before = state.timeLeftMs
    step(state, 'right')
    expect(state.timeLeftMs).toBe(before)            // GEM_TIME_BONUS_MS.cyan === 0
  })

  it('grants no time when the backpack is full (gem not collected)', () => {
    const state = makeState(5, 5)
    state.inventory = { red: INVENTORY_CAP }         // full of a high-bonus colour
    state.map.setTile(6, 5, makeTileGem('red', C.RED))
    const before = state.timeLeftMs
    step(state, 'right')
    expect(state.timeLeftMs).toBe(before)
  })

  it('gold grants its score bonus on top of the flat gem score', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileGem('gold', C.YELLOW))
    step(state, 'right')
    const cellScore = Math.round(SCORE_PER_CELL * SCORE_MULTIPLIERS[0] * 1.0)
    const gemScore  = Math.round(GEM_SCORE * 1.0)
    expect(state.score).toBe(cellScore + gemScore + GOLD_SCORE_BONUS)
  })

  it('converts every two red gems into an extra life (and consumes them)', () => {
    const state = makeState(5, 5)
    const lives0 = state.lives
    state.map.setTile(6, 5, makeTileGem('red', C.RED))
    step(state, 'right')
    expect(state.lives).toBe(lives0)            // one red: no life yet
    expect(state.inventory.red).toBe(1)
    state.map.setTile(7, 5, makeTileGem('red', C.RED))
    step(state, 'right')
    expect(state.lives).toBe(lives0 + 1)        // second red → +1 life
    expect(state.inventory.red ?? 0).toBe(0)    // pair consumed
  })

  it('a fourth red gem grants a second life', () => {
    const state = makeState(5, 5)
    const lives0 = state.lives
    for (let i = 0; i < 4; i++) {
      state.map.setTile(6 + i, 5, makeTileGem('red', C.RED))
      step(state, 'right')
    }
    expect(state.lives).toBe(lives0 + 2)
    expect(state.inventory.red ?? 0).toBe(0)
  })

  it('other gem colours never grant a life', () => {
    const state = makeState(5, 5)
    const lives0 = state.lives
    state.map.setTile(6, 5, makeTileGem('cyan', C.CYAN))
    state.map.setTile(7, 5, makeTileGem('cyan', C.CYAN))
    step(state, 'right')
    step(state, 'right')
    expect(state.lives).toBe(lives0)
    expect(state.inventory.cyan).toBe(2)
  })

  it('reveals a live mine after a third cyan gem (and consumes the three)', () => {
    const state = makeState(5, 5)
    state.map.setTile(10, 10, makeTileMine('normal', 'a', 'grass')) // a live mine off the path
    for (let i = 0; i < 3; i++) state.map.setTile(6 + i, 5, makeTileGem('cyan', C.CYAN))
    for (let i = 0; i < 3; i++) step(state, 'right')
    expect(state.revealedMines).toHaveLength(1)
    expect(state.revealedMines[0]).toEqual({ col: 10, row: 10 })
    expect(state.inventory.cyan ?? 0).toBe(0)
  })

  it('does not reveal before the third cyan gem', () => {
    const state = makeState(5, 5)
    state.map.setTile(10, 10, makeTileMine('normal', 'a', 'grass'))
    state.map.setTile(6, 5, makeTileGem('cyan', C.CYAN))
    state.map.setTile(7, 5, makeTileGem('cyan', C.CYAN))
    step(state, 'right')
    step(state, 'right')
    expect(state.revealedMines).toHaveLength(0)
    expect(state.inventory.cyan).toBe(2)
  })

  it('summons the friendly plane on the Nth green gem (and consumes the N)', () => {
    const state = makeState(5, 5)
    for (let i = 0; i < GREEN_GEMS_PER_PLANE; i++) state.map.setTile(6 + i, 5, makeTileGem('green', C.GREEN))
    for (let i = 0; i < GREEN_GEMS_PER_PLANE; i++) step(state, 'right')
    expect(state.friendlyPlane).not.toBeNull()
    expect(state.inventory.green ?? 0).toBe(0)
    expect(state.friendlyPassIndex).toBe(1)
  })

  it('does not summon the plane one gem short of the threshold', () => {
    const state = makeState(5, 5)
    const short = GREEN_GEMS_PER_PLANE - 1
    for (let i = 0; i < short; i++) state.map.setTile(6 + i, 5, makeTileGem('green', C.GREEN))
    for (let i = 0; i < short; i++) step(state, 'right')
    expect(state.friendlyPlane).toBeNull()
    expect(state.inventory.green ?? 0).toBe(short)
  })

  it('keeps the green gems when a plane is already airborne (retries later)', () => {
    const state = makeState(5, 5)
    // A plane is already in the air — a fresh trigger must not consume the gems.
    state.friendlyPlane = { x: 0, row: 3, dir: 1, blink: true, reveals: [] }
    const n = GREEN_GEMS_PER_PLANE
    for (let i = 0; i < n; i++) state.map.setTile(6 + i, 5, makeTileGem('green', C.GREEN))
    for (let i = 0; i < n; i++) step(state, 'right')
    expect(state.inventory.green).toBe(n)      // not spent — the reward will fire on the next green
    expect(state.friendlyPassIndex).toBe(0)    // seed stream untouched
  })
})

// ── movePlayer — directional compass cue ──────────────────────────────────────

describe('movePlayer — directional compass cue', () => {
  it('plays the compass cue for the dominant mine direction after a step', () => {
    const state = makeState(5, 5)
    // Cluster to the east of where the player lands (6,5): three mines in a row.
    state.map.setTile(7, 5, makeTileMine('normal', 'a', 'grass'))
    state.map.setTile(8, 5, makeTileMine('normal', 'b', 'grass'))
    state.map.setTile(9, 5, makeTileMine('normal', 'a', 'grass'))
    vi.mocked(playDirectionCue).mockClear()
    step(state, 'right')
    expect(playDirectionCue).toHaveBeenCalledWith('e', expect.any(Number))
  })

  it('stays silent (no cue) when no direction clearly dominates', () => {
    const state = makeState(5, 5)   // empty field around the player
    vi.mocked(playDirectionCue).mockClear()
    step(state, 'right')
    expect(playDirectionCue).not.toHaveBeenCalled()
  })
})

// ── movePlayer — walk tween ───────────────────────────────────────────────────

describe('movePlayer — walk tween', () => {
  it('creates a walkTween on a valid move', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    expect(state.walkTween).not.toBeNull()
  })

  it('walkTween starts at current pixel position', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    expect(state.walkTween!.fromX).toBe(5 * 8)
    expect(state.walkTween!.fromY).toBe(5 * 8)
  })

  it('walkTween targets the destination pixel position', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    expect(state.walkTween!.toX).toBe(6 * 8)
    expect(state.walkTween!.toY).toBe(5 * 8)
  })

  it('does not commit position immediately on movePlayer', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    expect(state.playerCol).toBe(5)  // still at start
  })

  it('does not reveal mine until tween completes', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    movePlayer(state, 'right')
    expect(state.phase).toBe('playing')  // not yet exploding
    tickPlayer(state, WALK_DURATION_MS + 1)
    expect(state.phase).toBe('exploding')  // committed at end of walk
  })

  it('does not score until tween completes', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    expect(state.score).toBe(0)
    tickPlayer(state, WALK_DURATION_MS + 1)
    expect(state.score).toBeGreaterThan(0)
  })

  it('clears walkTween on commit', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    tickPlayer(state, WALK_DURATION_MS + 1)
    expect(state.walkTween).toBeNull()
  })

  it('second movePlayer during active walk buffers the direction', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    movePlayer(state, 'right')  // buffered, not started
    expect(state.bufferedDir).toBe('right')
    expect(state.walkTween!.toX).toBe(6 * 8)  // still original target
  })

  it('drains buffered direction after current walk completes', () => {
    const state = makeState(5, 5)
    movePlayer(state, 'right')
    movePlayer(state, 'right')  // buffer
    tickPlayer(state, WALK_DURATION_MS + 1)  // commit first walk + drain buffer → starts second
    expect(state.playerCol).toBe(6)           // first walk committed
    expect(state.bufferedDir).toBeNull()
    expect(state.walkTween).not.toBeNull()    // second walk underway
  })
})

// ── tickPlayer — when not walking ─────────────────────────────────────────────

describe('tickPlayer — idle', () => {
  it('does nothing when no walkTween and no buffered direction', () => {
    const state = makeState(5, 5)
    const beforeCol = state.playerCol
    tickPlayer(state, 100)
    expect(state.playerCol).toBe(beforeCol)
    expect(state.walkTween).toBeNull()
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
    expect(state.playerRow).toBe(state.startRow)
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

  it('resets night to day on respawn', () => {
    const state = makeState()
    state.lives = 2
    state.isNight = true
    state.cycleSteps = 5
    respawnPlayer(state)
    expect(state.isNight).toBe(false)
    expect(state.cycleSteps).toBe(DAY_STEPS)
  })

  it('clears any active walkTween and buffered direction', () => {
    const state = makeState()
    state.lives = 2
    movePlayer(state, 'right')
    state.bufferedDir = 'down'
    respawnPlayer(state)
    expect(state.walkTween).toBeNull()
    expect(state.bufferedDir).toBeNull()
  })

  it('resets the score combo on death, but leaves the gem backpack intact', () => {
    const state = makeState()
    state.lives = 3
    state.comboCount = 7
    state.comboTimer = 1000
    state.inventory = { cyan: 2 }
    respawnPlayer(state)
    expect(state.comboCount).toBe(0)              // combo (score multiplier) broken by death
    expect(state.comboTimer).toBe(0)
    expect(state.inventory).toEqual({ cyan: 2 })  // backpack untouched — gems stay collected
  })

  it('keeps revealed mines across death — a lit row stays lit for the whole level', () => {
    const state = makeState()
    state.lives = 2
    state.revealedMines = [{ col: 4, row: 8 }, { col: 7, row: 8 }]
    respawnPlayer(state)
    expect(state.revealedMines).toEqual([{ col: 4, row: 8 }, { col: 7, row: 8 }])
  })
})

// ── day/night cycle ───────────────────────────────────────────────────────────

describe('day/night cycle — counter ticks only on new cells', () => {
  it('cycleSteps decrements when moving to unvisited cell', () => {
    const state = makeState(5, 5)
    const before = state.cycleSteps
    step(state, 'right')
    expect(state.cycleSteps).toBe(before - 1)
  })

  it('cycleSteps does NOT decrement on visited cell', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileVisited(cellVariant(6, 5), 'grass'))
    const before = state.cycleSteps
    step(state, 'right')
    expect(state.cycleSteps).toBe(before)
  })

  it('cycleSteps does NOT decrement on mine hit', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    const before = state.cycleSteps
    step(state, 'right')
    expect(state.cycleSteps).toBe(before)
  })

  it('transitions to night when cycleSteps reaches zero', () => {
    const state = makeState(5, 5)
    state.cycleSteps = 1
    state.isNight = false
    step(state, 'right')   // last unvisited step
    expect(state.isNight).toBe(true)
    expect(state.cycleSteps).toBe(NIGHT_STEPS)
  })

  it('transitions back to day when night counter reaches zero', () => {
    const state = makeState(5, 5)
    state.cycleSteps = 1
    state.isNight = true
    step(state, 'right')
    expect(state.isNight).toBe(false)
    expect(state.cycleSteps).toBe(DAY_STEPS)
  })

  it('does NOT transition on visited path — player can roam path without triggering night', () => {
    const state = makeState(5, 5)
    state.cycleSteps = 1
    state.isNight = false
    state.map.setTile(6, 5, makeTileVisited(cellVariant(6, 5), 'grass'))
    step(state, 'right')
    expect(state.isNight).toBe(false)   // still day
    expect(state.cycleSteps).toBe(1)    // counter unchanged
  })

  it('night starts fresh with NIGHT_STEPS after transition', () => {
    const state = makeState(5, 5)
    state.cycleSteps = 1
    step(state, 'right')
    expect(state.cycleSteps).toBe(NIGHT_STEPS)
  })

  it('multiple day→night→day cycles work correctly', () => {
    const state = makeState(1, 5)
    // Use up all day steps
    state.cycleSteps = 1
    step(state, 'right')    // → night, NIGHT_STEPS
    expect(state.isNight).toBe(true)
    // Use up night steps
    state.cycleSteps = 1
    state.playerCol = 1; state.playerRow = 5
    state.map.setTile(2, 5, makeTileGround(cellVariant(2, 5), 'grass'))
    step(state, 'right')    // → day, DAY_STEPS
    expect(state.isNight).toBe(false)
    expect(state.cycleSteps).toBe(DAY_STEPS)
  })
})

// ── toggleFlag ────────────────────────────────────────────────────────────────

describe('toggleFlag', () => {
  it('flags the cell directly in front (right) — the tile itself is NEVER touched', () => {
    const state = makeState(5, 5)
    state.playerDir = 'right'
    const before = state.map.getTile(6, 5)
    toggleFlag(state)
    expect(state.flags.has(cellKey(6, 5))).toBe(true)
    expect(state.map.getTile(6, 5)).toBe(before)  // reference-identical: pure overlay
    expect(state.map.getTile(6, 5)?.id).toBe('ground')
  })

  // REGRESSION (2026-07-04, "can't place flags at night"): placement never had a
  // night gate — the flag landed but the night sweep painted it black, so the key
  // looked dead (and a second press silently toggled it off again). Flags now live
  // in state.flags and drawFlags paints them AFTER the night sweep, so visibility
  // holds by draw order; this pins the state side of the chain.
  it('a flag placed at night lands and survives (drawFlags renders after the night sweep)', () => {
    const state = makeState(5, 5)
    state.isNight = true
    state.playerDir = 'right'
    toggleFlag(state)
    expect(state.flags.has(cellKey(6, 5))).toBe(true)
    expect(state.map.getTile(6, 5)?.id).toBe('ground')  // tile untouched — nothing to black out or eat
  })

  it('flags cell in front when facing up', () => {
    const state = makeState(5, 5)
    state.playerDir = 'up'
    toggleFlag(state)
    expect(state.flags.has(cellKey(5, 4))).toBe(true)
  })

  it('flags cell in front when facing down', () => {
    const state = makeState(5, 5)
    state.playerDir = 'down'
    toggleFlag(state)
    expect(state.flags.has(cellKey(5, 6))).toBe(true)
  })

  it('flags cell in front when facing left', () => {
    const state = makeState(5, 5)
    state.playerDir = 'left'
    toggleFlag(state)
    expect(state.flags.has(cellKey(4, 5))).toBe(true)
  })

  it('flagging a mine keeps id "mine" (the bug this fixes: a flagged mine must still explode)', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileMine('normal', cellVariant(6, 5), 'grass'))
    state.playerDir = 'right'
    toggleFlag(state)
    const tile = state.map.getTile(6, 5)
    expect(tile?.id).toBe('mine')
    expect(state.flags.has(cellKey(6, 5))).toBe(true)
  })

  it('unflags already-flagged cell (toggle) — the tile is identical throughout', () => {
    const state = makeState(5, 5)
    state.playerDir = 'right'
    const before = state.map.getTile(6, 5)
    toggleFlag(state)
    toggleFlag(state)
    expect(state.flags.has(cellKey(6, 5))).toBe(false)
    expect(state.map.getTile(6, 5)).toBe(before)  // flag+unflag = zero tile writes
  })

  // Owner decision (2026-07-04): a flag is the player's own note — they may mark
  // anything non-solid, whether or not they care what's underneath. That now
  // includes the visited trail (e.g. "don't come back this way").
  it('flags the VISITED trail too', () => {
    const state = makeState(5, 5)
    state.playerDir = 'right'
    state.map.setTile(6, 5, makeTileVisited(cellVariant(6, 5), 'grass'))
    toggleFlag(state)
    expect(state.flags.has(cellKey(6, 5))).toBe(true)
    expect(state.map.getTile(6, 5)?.id).toBe('visited')
  })

  it('refuses solid cells (fence/building) and exploded craters', () => {
    const state = makeState(5, 5)
    state.playerDir = 'right'
    state.map.setTile(6, 5, makeTileFence())
    toggleFlag(state)
    expect(state.flags.size).toBe(0)
    state.map.setTile(6, 5, TILE_EXPLODED)
    toggleFlag(state)
    expect(state.flags.size).toBe(0)
  })

  // THE OWNER'S REPRO (2026-07-04): walk, flag a neighbouring cell, then step onto
  // it — the cell becomes walked trail, but the flag MUST survive. Before the
  // overlay model, commitMove's setTile(visited) silently ate the flag.
  it('walking onto a flagged cell converts it to visited AND keeps the flag', () => {
    const state = makeState(5, 5)
    toggleFlag(state, 'right')                       // flag (6,5)
    expect(state.flags.has(cellKey(6, 5))).toBe(true)
    step(state, 'right')                             // now walk onto it
    expect(state.map.getTile(6, 5)?.id).toBe('visited')
    expect(state.flags.has(cellKey(6, 5))).toBe(true)  // the annotation survived the walk
  })

  it('collecting a gem on a flagged cell keeps the flag', () => {
    const state = makeState(5, 5)
    state.map.setTile(6, 5, makeTileGem('green', C.GREEN))
    toggleFlag(state, 'right')
    step(state, 'right')
    expect(state.map.getTile(6, 5)?.id).toBe('visited')  // gem collected, cell walked
    expect(state.flags.has(cellKey(6, 5))).toBe(true)
  })

  it('does nothing when phase is not playing', () => {
    const state = makeState(5, 5)
    state.phase = 'gameover'
    state.playerDir = 'right'
    toggleFlag(state)
    expect(state.flags.size).toBe(0)
  })

  it('does not crash when player faces grid edge', () => {
    const state = makeState(COLS - 1, 5)
    state.playerDir = 'right'
    expect(() => toggleFlag(state)).not.toThrow()
    expect(state.flags.size).toBe(0)  // off-map cell is not flaggable
  })

  it('does nothing while player is mid-walk', () => {
    const state = makeState(5, 5)
    state.playerDir = 'right'
    movePlayer(state, 'right')   // start walk → walkTween active
    toggleFlag(state)
    expect(state.flags.size).toBe(0)
  })

  // Explicit `dir` — SHIFT+arrow triangulation flagging, independent of facing.
  it('flags an explicit direction that differs from playerDir', () => {
    const state = makeState(5, 5)
    state.playerDir = 'up'          // facing up
    toggleFlag(state, 'right')      // but flag to the right instead
    expect(state.flags.has(cellKey(6, 5))).toBe(true)
    expect(state.flags.has(cellKey(5, 4))).toBe(false)   // "up" (facing) untouched
  })

  it('leaves playerDir unchanged after an explicit-direction flag', () => {
    const state = makeState(5, 5)
    state.playerDir = 'up'
    toggleFlag(state, 'right')
    expect(state.playerDir).toBe('up')   // no facing side-effect
  })

  it('explicit direction still toggles off an already-flagged cell', () => {
    const state = makeState(5, 5)
    state.playerDir = 'up'
    toggleFlag(state, 'left')
    toggleFlag(state, 'left')
    expect(state.flags.has(cellKey(4, 5))).toBe(false)
  })

  it('omitting dir still defaults to playerDir (backward compatible)', () => {
    const state = makeState(5, 5)
    state.playerDir = 'down'
    toggleFlag(state)
    expect(state.flags.has(cellKey(5, 6))).toBe(true)
  })

  it('explicit direction still respects phase/walk guards', () => {
    const state = makeState(5, 5)
    state.playerDir = 'up'
    state.phase = 'gameover'
    toggleFlag(state, 'right')
    expect(state.flags.size).toBe(0)
  })
})

// ── terrain — movePlayer visited tile path color ───────────────────────────────

describe('terrain — movePlayer visited tile path color', () => {
  // Player at (5,5) moves right to (6,5). destination variant = (6+5)%2=1 → 'b'
  // grass visited: B_YELLOW, snow: B_CYAN, dust: B_WHITE

  const cases: Array<[TerrainType, string]> = [
    ['grass', 'B_YELLOW'],
    ['snow',  'B_CYAN'  ],
    ['dust',  'B_WHITE' ],
  ]

  for (const [terrain, inkName] of cases) {
    it(`creates visited tile with ${inkName} ink on ${terrain} terrain`, () => {
      const state = makeState(5, 5)
      state.terrain = terrain
      step(state, 'right')
      const tile = state.map.getTile(6, 5)
      expect(tile?.id).toBe('visited')
      expect(tile?.ink).toBe(C[inkName as keyof typeof C])
    })
  }

  it('visited tile id is always "visited" regardless of terrain', () => {
    for (const terrain of ['grass', 'snow', 'dust'] as TerrainType[]) {
      const state = makeState(5, 5)
      state.terrain = terrain
      step(state, 'right')
      expect(state.map.getTile(6, 5)?.id).toBe('visited')
    }
  })

  it('grass visited ink differs from snow visited ink', () => {
    const grassState = makeState(5, 5)
    grassState.terrain = 'grass'
    step(grassState, 'right')

    const snowState = makeState(5, 5)
    snowState.terrain = 'snow'
    step(snowState, 'right')

    expect(grassState.map.getTile(6, 5)?.ink).not.toBe(snowState.map.getTile(6, 5)?.ink)
  })

  it('stores terrain in visited tile metadata', () => {
    for (const terrain of ['grass', 'snow', 'dust'] as TerrainType[]) {
      const state = makeState(5, 5)
      state.terrain = terrain
      step(state, 'right')
      expect(state.map.getTile(6, 5)?.metadata?.terrain).toBe(terrain)
    }
  })
})
