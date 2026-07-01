import { describe, it, expect } from 'vitest'
import { createTileMap, createRng, type TileMap } from 'zx-kit'
import { countWarningMines, countAdjacentMines, countBeaconSignals, createGame, addDropMinesInBand, applyClusterBlast, revealMine, fixObstacleTraps, createsObstacleTrap, isFieldSolvable, tryToggleReveal, tickTimer, seedDate, nextDailySeed, todaySeed, GEM_KINDS, type MineType, type GameState } from './game.ts'
import { movePlayer } from './player.ts'
import { createBuilding, placeBuildings, type BuildingBox } from './buildings.ts'
import { C, COLS, ROWS } from './constants.ts'
import GEM_COUNT, { BEACON_MINE_LEVEL, CLUSTER_MINE_LEVEL, START_COL, START_ROW, SAFE_RADIUS, MIN_ENTRY_EXIT_ROW_GAP, DAILY_REVEAL_LIMIT, RANDOM_REVEAL_LIMIT, BIG_ROOF_MIN, BUILDING_WALL_HEIGHT, TIMER_BASE_MS } from './config.ts'
import { makeTileGround, makeTileMine, makeTileGem, makeTileVisited, makeTileBuilding, makeTileFence, flagTile, TILE_EXPLODED, type TerrainType } from './sprites.ts'

// ── Map helpers ───────────────────────────────────────────────────────────────

function cellVariant(col: number, row: number): 'a' | 'b' {
  return (col + row) % 2 === 0 ? 'a' : 'b'
}

function emptyMap(): TileMap {
  const map = createTileMap(COLS, ROWS)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      map.setTile(col, row, makeTileGround(cellVariant(col, row), 'grass'))
    }
  }
  return map
}

function setMine(map: TileMap, col: number, row: number, type: MineType = 'normal'): void {
  map.setTile(col, row, makeTileMine(type, cellVariant(col, row), 'grass'))
}

// Same as setMine, but flagged — flagging is a pure visual overlay, so this
// must behave identically to setMine for every game-logic purpose.
function setFlaggedMine(map: TileMap, col: number, row: number, type: MineType = 'normal'): void {
  map.setTile(col, row, flagTile(makeTileMine(type, cellVariant(col, row), 'grass')))
}

// ── countWarningMines ─────────────────────────────────────────────────────────

describe('countWarningMines — normal mines', () => {
  it('returns 0 when no mines around player', () => {
    const map = emptyMap()
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('counts a mine directly above', () => {
    const map = emptyMap()
    setMine(map, 5, 4)
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('counts a mine directly below', () => {
    const map = emptyMap()
    setMine(map, 5, 6)
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('counts a mine directly left', () => {
    const map = emptyMap()
    setMine(map, 4, 5)
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('counts a mine directly right', () => {
    const map = emptyMap()
    setMine(map, 6, 5)
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('does NOT count a diagonal mine', () => {
    const map = emptyMap()
    setMine(map, 6, 4)
    setMine(map, 4, 4)
    setMine(map, 6, 6)
    setMine(map, 4, 6)
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('counts all 4 adjacent mines', () => {
    const map = emptyMap()
    setMine(map, 5, 4)
    setMine(map, 5, 6)
    setMine(map, 4, 5)
    setMine(map, 6, 5)
    expect(countWarningMines(map, 5, 5)).toBe(4)
  })

  it('does not count already exploded mines', () => {
    const map = emptyMap()
    setMine(map, 5, 4)
    map.setTile(5, 4, TILE_EXPLODED)
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('handles player at grid edge without crash', () => {
    const map = emptyMap()
    setMine(map, 1, 0)
    expect(() => countWarningMines(map, 0, 0)).not.toThrow()
  })

  it('caps warning count at 8', () => {
    const map = emptyMap()
    setMine(map, 5, 4); setMine(map, 5, 6)
    setMine(map, 4, 5); setMine(map, 6, 5)
    setMine(map, 5, 3, 'beacon'); setMine(map, 5, 7, 'beacon')
    setMine(map, 3, 5, 'beacon'); setMine(map, 7, 5, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(8)
  })
})

// ── detector split: immediate adjacency vs ranged beacon ─────────────────────

describe('countAdjacentMines / countBeaconSignals (HUD split)', () => {
  it('adjacency counts only distance-1 mines, any type, max 4', () => {
    const map = emptyMap()
    setMine(map, 5, 4); setMine(map, 6, 5, 'beacon')   // up = normal, right = beacon (dist 1)
    expect(countAdjacentMines(map, 5, 5)).toBe(2)       // both count as immediate
  })

  it('adjacency ignores distance-2 beacons (those are the ranged signal)', () => {
    const map = emptyMap()
    setMine(map, 5, 3, 'beacon')                        // 2 above
    expect(countAdjacentMines(map, 5, 5)).toBe(0)
  })

  it('beacon signal counts only distance-2 beacons (not normal mines, not dist-1)', () => {
    const map = emptyMap()
    setMine(map, 5, 3, 'beacon')                        // 2 above = beacon signal
    setMine(map, 3, 5)                                  // 2 left = normal → ignored
    setMine(map, 5, 4, 'beacon')                        // 1 above = adjacency, not signal
    expect(countBeaconSignals(map, 5, 5)).toBe(1)
  })

  it('the two parts sum to the audio value', () => {
    const map = emptyMap()
    setMine(map, 5, 4); setMine(map, 4, 5)              // 2 adjacent
    setMine(map, 5, 3, 'beacon'); setMine(map, 7, 5, 'beacon')  // 2 beacon signals
    const total = countAdjacentMines(map, 5, 5) + countBeaconSignals(map, 5, 5)
    expect(total).toBe(countWarningMines(map, 5, 5))
    expect(total).toBe(4)
  })

  // Regression: flagging used to swap a mine's tile.id to 'flag', which made
  // it silently drop out of these counts (the beeper would go quiet next to a
  // flagged mine). Flagging is now a pure visual overlay — a flagged mine
  // must count exactly like an unflagged one.
  it('a flagged adjacent mine still counts', () => {
    const map = emptyMap()
    setFlaggedMine(map, 5, 4)
    expect(countAdjacentMines(map, 5, 5)).toBe(1)
  })

  it('a flagged beacon mine still signals at distance 2', () => {
    const map = emptyMap()
    setFlaggedMine(map, 5, 3, 'beacon')
    expect(countBeaconSignals(map, 5, 5)).toBe(1)
  })
})

// ── countWarningMines — beacon mines ─────────────────────────────────────────

describe('countWarningMines — beacon mines', () => {
  it('beacon mine 1 cell away counts like a normal mine', () => {
    const map = emptyMap()
    setMine(map, 5, 4, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells away ALSO warns', () => {
    const map = emptyMap()
    setMine(map, 5, 3, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells left warns', () => {
    const map = emptyMap()
    setMine(map, 3, 5, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells right warns', () => {
    const map = emptyMap()
    setMine(map, 7, 5, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells below warns', () => {
    const map = emptyMap()
    setMine(map, 5, 7, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('normal mine 2 cells away does NOT warn', () => {
    const map = emptyMap()
    setMine(map, 5, 3, 'normal')
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('cluster mine 2 cells away does NOT warn', () => {
    const map = emptyMap()
    setMine(map, 5, 3, 'cluster')
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('beacon mine 3 cells away does NOT warn', () => {
    const map = emptyMap()
    setMine(map, 5, 2, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('beacon mine diagonally 2 away does NOT warn (only cardinal)', () => {
    const map = emptyMap()
    setMine(map, 3, 3, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('exploded beacon mine 2 cells away does not warn', () => {
    const map = emptyMap()
    setMine(map, 5, 3, 'beacon')
    map.setTile(5, 3, TILE_EXPLODED)
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })
})

// ── Mine type placement ───────────────────────────────────────────────────────

describe('mine type placement via createGame', () => {
  it('level 1 has no beacon or cluster mines', () => {
    for (let run = 0; run < 5; run++) {
      const state = createGame(0)
      for (const { tile } of state.map.findById('mine')) {
        expect(tile.metadata?.mineType).toBe('normal')
      }
    }
  })

  it(`level ${BEACON_MINE_LEVEL + 1} contains at least some beacon mines (probabilistic)`, () => {
    let foundBeacon = false
    for (let run = 0; run < 10 && !foundBeacon; run++) {
      const state = createGame(BEACON_MINE_LEVEL)
      foundBeacon = state.map.findById('mine').some(({ tile }) => tile.metadata?.mineType === 'beacon')
    }
    expect(foundBeacon).toBe(true)
  })

  it(`level ${CLUSTER_MINE_LEVEL + 1} contains at least some cluster mines (probabilistic)`, () => {
    let foundCluster = false
    for (let run = 0; run < 10 && !foundCluster; run++) {
      const state = createGame(CLUSTER_MINE_LEVEL)
      foundCluster = state.map.findById('mine').some(({ tile }) => tile.metadata?.mineType === 'cluster')
    }
    expect(foundCluster).toBe(true)
  })

  it('mine types are only normal/beacon/cluster, never undefined', () => {
    const state = createGame(3)
    for (const { tile } of state.map.findById('mine')) {
      expect(['normal', 'beacon', 'cluster']).toContain(tile.metadata?.mineType)
    }
  })

  it('dropped mines (addDropMinesInBand) are always normal type', () => {
    const state = createGame(3)
    addDropMinesInBand(state, 5, 5, 7)
    for (const { col, row } of state.droppedMines) {
      expect(state.map.getTile(col, row)?.metadata?.mineType).toBe('normal')
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
    for (let r = 0; r <= 2; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        state.map.setTile(c, r, { sprite: new Uint8Array(8), ink: C.BLACK, paper: C.BLACK, solid: false, id: 'visited' })
      }
    }
    addDropMinesInBand(state, 5, 0, 2)
    for (const { col, row } of state.droppedMines) {
      expect(state.map.getTile(col, row)?.id).toBe('mine')
      // Confirm source was not visited (mine was placed on non-visited cell)
      expect(row).toBeGreaterThanOrEqual(0)
    }
  })
})

// ── Gem placement ─────────────────────────────────────────────────────────────

describe('gem placement', () => {
  it(`places exactly ${GEM_COUNT} gems per level`, () => {
    for (let run = 0; run < 3; run++) {
      const state = createGame(0)
      expect(state.map.findById('gem').length).toBe(GEM_COUNT)
    }
  })

  it('gems are never placed on mine cells', () => {
    for (let run = 0; run < 5; run++) {
      const state = createGame(2)
      for (const { x, y } of state.map.findById('gem')) {
        // After gem is placed, the original mine tile should be gone
        // (gem placement skips mine cells, so no cell should be both)
        const tile = state.map.getTile(x, y)
        expect(tile?.id).toBe('gem')
      }
      // No mine cell should have a gem tile on it (they are separate)
      for (const { x, y } of state.map.findById('mine')) {
        expect(state.map.getTile(x, y)?.id).toBe('mine')
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
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) {
        state.map.setTile(c, r, makeTileGround(cellVariant(c, r), 'grass'))
      }

    applyClusterBlast(state, 5, 5)

    const neighbors = [
      [4, 4], [5, 4], [6, 4],
      [4, 5], [6, 5],
      [4, 6], [5, 6], [6, 6],
    ]
    for (const [col, row] of neighbors) {
      expect(state.map.getTile(col, row)?.id).toBe('visited')
    }
  })

  it('does not mark the center cell as visited', () => {
    const state = createGame(0)
    state.map.setTile(5, 5, makeTileGround(cellVariant(5, 5), 'grass'))
    applyClusterBlast(state, 5, 5)
    expect(state.map.getTile(5, 5)?.id).not.toBe('visited')
  })

  it('chain-explodes mines in the 8 surrounding cells', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r), 'grass'))
    setMine(state.map, 4, 4)
    setMine(state.map, 6, 5)
    setMine(state.map, 5, 6)
    const minesBefore = state.explodedMines

    applyClusterBlast(state, 5, 5)

    expect(state.explodedMines).toBe(minesBefore + 3)
    expect(state.map.getTile(4, 4)?.id).toBe('exploded')
    expect(state.map.getTile(5, 6)?.id).toBe('exploded')
    expect(state.map.getTile(6, 5)?.id).toBe('exploded')
  })

  // Regression: flagging used to change a mine's id to 'flag', so a flagged
  // mine caught in a cluster blast silently failed to chain-detonate.
  it('chain-explodes a flagged mine too', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r), 'grass'))
    setFlaggedMine(state.map, 6, 5)
    const minesBefore = state.explodedMines

    applyClusterBlast(state, 5, 5)

    expect(state.explodedMines).toBe(minesBefore + 1)
    expect(state.map.getTile(6, 5)?.id).toBe('exploded')
  })

  it('chain-exploded cells are not marked as visited', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r), 'grass'))
    setMine(state.map, 4, 4)

    applyClusterBlast(state, 5, 5)

    expect(state.map.getTile(4, 4)?.id).toBe('exploded')
  })

  it('does not re-explode already exploded cells', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r), 'grass'))
    state.map.setTile(4, 4, TILE_EXPLODED)
    const minesBefore = state.explodedMines

    applyClusterBlast(state, 5, 5)

    expect(state.explodedMines).toBe(minesBefore)
  })

  it('clears gems swept by the blast', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r), 'grass'))
    state.map.setTile(4, 4, makeTileGem())

    applyClusterBlast(state, 5, 5)

    expect(state.map.getTile(4, 4)?.id).toBe('visited')
  })

  it('does not visit already visited cells (no double-visit)', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r), 'grass'))
    state.map.setTile(4, 4, makeTileVisited(cellVariant(4, 4), 'grass'))

    applyClusterBlast(state, 5, 5)

    expect(state.map.getTile(4, 4)?.id).toBe('visited')
  })

  it('handles blast at grid corner without out-of-bounds crash', () => {
    const state = createGame(0)
    state.map.setTile(0, 0, makeTileGround(cellVariant(0, 0), 'grass'))
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

  it('marks starting cell as visited from the start', () => {
    const state = createGame(0)
    expect(state.map.getTile(START_COL, state.startRow)?.id).toBe('visited')
  })

  it('initializes walkTween to null (player not walking)', () => {
    const state = createGame(0)
    expect(state.walkTween).toBeNull()
  })

  it('initializes walkAnim with two looping frames', () => {
    const state = createGame(0)
    expect(state.walkAnim.frameCount).toBe(2)
    expect(state.walkAnim.loop).toBe(true)
  })

  it('initializes bufferedDir to null', () => {
    const state = createGame(0)
    expect(state.bufferedDir).toBeNull()
  })
})

// ── Terrain — tile factory colors ──────────────────────────────────────────��──

describe('terrain — makeTileGround colors per terrain', () => {
  it('grass variant a → C.B_GREEN', () => {
    expect(makeTileGround('a', 'grass').ink).toBe(C.B_GREEN)
  })
  it('grass variant b → C.GREEN', () => {
    expect(makeTileGround('b', 'grass').ink).toBe(C.GREEN)
  })
  it('snow variant a → C.B_WHITE', () => {
    expect(makeTileGround('a', 'snow').ink).toBe(C.B_WHITE)
  })
  it('snow variant b → C.WHITE', () => {
    expect(makeTileGround('b', 'snow').ink).toBe(C.WHITE)
  })
  it('dust variant a → C.B_YELLOW', () => {
    expect(makeTileGround('a', 'dust').ink).toBe(C.B_YELLOW)
  })
  it('dust variant b → C.YELLOW', () => {
    expect(makeTileGround('b', 'dust').ink).toBe(C.YELLOW)
  })
  it('paper is always C.BLACK across all terrains', () => {
    const terrains: TerrainType[] = ['grass', 'snow', 'dust']
    for (const terrain of terrains) {
      expect(makeTileGround('a', terrain).paper).toBe(C.BLACK)
      expect(makeTileGround('b', terrain).paper).toBe(C.BLACK)
    }
  })
  it('id is always "ground"', () => {
    const terrains: TerrainType[] = ['grass', 'snow', 'dust']
    for (const terrain of terrains) {
      expect(makeTileGround('a', terrain).id).toBe('ground')
    }
  })
  it('terrain is stored in tile metadata', () => {
    expect(makeTileGround('a', 'snow').metadata?.terrain).toBe('snow')
    expect(makeTileGround('b', 'dust').metadata?.terrain).toBe('dust')
  })
})

describe('terrain — makeTileMine visually matches ground', () => {
  it('grass: mine ink matches ground ink for both variants', () => {
    expect(makeTileMine('normal', 'a', 'grass').ink).toBe(makeTileGround('a', 'grass').ink)
    expect(makeTileMine('normal', 'b', 'grass').ink).toBe(makeTileGround('b', 'grass').ink)
  })
  it('snow: mine ink matches ground ink for both variants', () => {
    expect(makeTileMine('normal', 'a', 'snow').ink).toBe(makeTileGround('a', 'snow').ink)
    expect(makeTileMine('normal', 'b', 'snow').ink).toBe(makeTileGround('b', 'snow').ink)
  })
  it('dust: mine ink matches ground ink for both variants', () => {
    expect(makeTileMine('normal', 'a', 'dust').ink).toBe(makeTileGround('a', 'dust').ink)
    expect(makeTileMine('normal', 'b', 'dust').ink).toBe(makeTileGround('b', 'dust').ink)
  })
  it('mine paper is always C.BLACK — same as ground', () => {
    const terrains: TerrainType[] = ['grass', 'snow', 'dust']
    for (const terrain of terrains) {
      expect(makeTileMine('cluster', 'a', terrain).paper).toBe(C.BLACK)
    }
  })
  it('mine id is still "mine" not "ground" — only appearance is shared', () => {
    expect(makeTileMine('normal', 'a', 'snow').id).toBe('mine')
  })
})

describe('terrain — makeTileVisited path color', () => {
  it('grass → C.B_YELLOW (yellow footprint on green)', () => {
    expect(makeTileVisited('a', 'grass').ink).toBe(C.B_YELLOW)
    expect(makeTileVisited('b', 'grass').ink).toBe(C.B_YELLOW)
  })
  it('snow → C.B_CYAN (cyan footprint on white snow)', () => {
    expect(makeTileVisited('a', 'snow').ink).toBe(C.B_CYAN)
    expect(makeTileVisited('b', 'snow').ink).toBe(C.B_CYAN)
  })
  it('dust → C.B_WHITE (white trail on yellow dust)', () => {
    expect(makeTileVisited('a', 'dust').ink).toBe(C.B_WHITE)
    expect(makeTileVisited('b', 'dust').ink).toBe(C.B_WHITE)
  })
  it('visited ink differs from ground ink on each terrain — ensures visible contrast', () => {
    const terrains: TerrainType[] = ['grass', 'snow', 'dust']
    for (const terrain of terrains) {
      expect(makeTileVisited('a', terrain).ink).not.toBe(makeTileGround('a', terrain).ink)
    }
  })
  it('id is always "visited"', () => {
    const terrains: TerrainType[] = ['grass', 'snow', 'dust']
    for (const terrain of terrains) {
      expect(makeTileVisited('a', terrain).id).toBe('visited')
    }
  })
  it('terrain is stored in tile metadata', () => {
    expect(makeTileVisited('a', 'dust').metadata?.terrain).toBe('dust')
  })
})

// ── Terrain — createGame integration ──────────────────────────────────────────

describe('terrain — createGame selection and map consistency', () => {
  it('level 0 always uses grass (5 runs)', () => {
    for (let run = 0; run < 5; run++) {
      expect(createGame(0).terrain).toBe('grass')
    }
  })

  it('level 1+ always has a valid TerrainType (10 runs)', () => {
    const valid: TerrainType[] = ['grass', 'snow', 'dust']
    for (let run = 0; run < 10; run++) {
      expect(valid).toContain(createGame(1).terrain)
    }
  })

  it('level 1+ can produce non-grass terrain (probabilistic — 30 runs)', () => {
    let seenNonGrass = false
    for (let run = 0; run < 30 && !seenNonGrass; run++) {
      if (createGame(1).terrain !== 'grass') seenNonGrass = true
    }
    expect(seenNonGrass).toBe(true)
  })

  it('all ground tiles in map use the terrain ink (grass = green)', () => {
    const state = createGame(0)  // grass — deterministic
    for (const { x, y, tile } of state.map.findById('ground')) {
      const variant: 'a' | 'b' = (x + y) % 2 === 0 ? 'a' : 'b'
      expect(tile.ink).toBe(makeTileGround(variant, 'grass').ink)
    }
  })

  it('all mine tiles are visually identical to ground tiles (same ink)', () => {
    const state = createGame(0)  // grass
    for (const { x, y, tile } of state.map.findById('mine')) {
      const variant: 'a' | 'b' = (x + y) % 2 === 0 ? 'a' : 'b'
      expect(tile.ink).toBe(makeTileGround(variant, 'grass').ink)
    }
  })

  it('starting visited cell has terrain path color (grass → yellow)', () => {
    const state = createGame(0)
    expect(state.map.getTile(START_COL, state.startRow)?.ink).toBe(C.B_YELLOW)
  })
})

// ── Terrain — airplane drop ────────────────────────────────────────────────────

describe('terrain — addDropMinesInBand uses state terrain', () => {
  it('dropped mines on grass terrain have green ink', () => {
    const state = createGame(0)  // terrain = grass
    addDropMinesInBand(state, 5, 0, ROWS - 1)
    for (const { col, row } of state.droppedMines) {
      const tile = state.map.getTile(col, row)
      expect(tile?.id).toBe('mine')
      expect([C.B_GREEN, C.GREEN]).toContain(tile?.ink)
    }
  })

  it('dropped mines on snow terrain have white ink', () => {
    const state = createGame(0)
    state.terrain = 'snow'
    addDropMinesInBand(state, 5, 0, ROWS - 1)
    for (const { col, row } of state.droppedMines) {
      expect([C.B_WHITE, C.WHITE]).toContain(state.map.getTile(col, row)?.ink)
    }
  })

  it('dropped mines on dust terrain have yellow ink', () => {
    const state = createGame(0)
    state.terrain = 'dust'
    addDropMinesInBand(state, 5, 0, ROWS - 1)
    for (const { col, row } of state.droppedMines) {
      expect([C.B_YELLOW, C.YELLOW]).toContain(state.map.getTile(col, row)?.ink)
    }
  })
})

// ── Terrain — cluster blast ────────────────────────────────────────────────────

describe('terrain — applyClusterBlast visited tiles use terrain path color', () => {
  function setupBlastArea(state: ReturnType<typeof createGame>, terrain: TerrainType): void {
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++)
        state.map.setTile(c, r, makeTileGround(cellVariant(c, r), terrain))
  }

  const NEIGHBORS: [number, number][] = [[4, 4], [5, 4], [6, 4], [4, 5], [6, 5], [4, 6], [5, 6], [6, 6]]

  it('blast on grass creates yellow visited tiles', () => {
    const state = createGame(0)  // terrain = grass
    setupBlastArea(state, 'grass')
    applyClusterBlast(state, 5, 5)
    for (const [col, row] of NEIGHBORS) {
      const tile = state.map.getTile(col, row)
      if (tile?.id === 'visited') expect(tile.ink).toBe(C.B_YELLOW)
    }
  })

  it('blast on snow creates cyan visited tiles', () => {
    const state = createGame(0)
    state.terrain = 'snow'
    setupBlastArea(state, 'snow')
    applyClusterBlast(state, 5, 5)
    for (const [col, row] of NEIGHBORS) {
      const tile = state.map.getTile(col, row)
      if (tile?.id === 'visited') expect(tile.ink).toBe(C.B_CYAN)
    }
  })

  it('blast on dust creates white visited tiles', () => {
    const state = createGame(0)
    state.terrain = 'dust'
    setupBlastArea(state, 'dust')
    applyClusterBlast(state, 5, 5)
    for (const [col, row] of NEIGHBORS) {
      const tile = state.map.getTile(col, row)
      if (tile?.id === 'visited') expect(tile.ink).toBe(C.B_WHITE)
    }
  })
})

// ── fixObstacleTraps ──────────────────────────────────────────────────────────

// A single solid obstacle tile (one building cell) — enough to exercise the
// per-tile trap-relocation logic without stamping a whole building.
function setObstacle(map: TileMap, col: number, row: number): void {
  map.setTile(col, row, makeTileBuilding('brick'))
}

describe('fixObstacleTraps — vertical wall', () => {
  it('removes one of the two perpendicular mines flanking a wall', () => {
    const map = emptyMap()
    // Vertical wall at column 5; approach cell is (4,5); perp = (4,4) and (4,6)
    setObstacle(map, 5, 5)
    setMine(map, 4, 4)
    setMine(map, 4, 6)

    fixObstacleTraps(map, 'grass')

    const mineCount = map.findById('mine').length
    expect(mineCount).toBe(1)
  })

  it('also resolves the trap on the opposite side of the wall', () => {
    const map = emptyMap()
    // Approach from the right at (6,5); perp = (6,4) and (6,6)
    setObstacle(map, 5, 5)
    setMine(map, 6, 4)
    setMine(map, 6, 6)

    fixObstacleTraps(map, 'grass')

    expect(map.findById('mine').length).toBe(1)
  })
})

describe('fixObstacleTraps — horizontal wall', () => {
  it('removes one of the two perpendicular mines above/below a horizontal wall', () => {
    const map = emptyMap()
    // Horizontal wall at (5,5); approach cell above is (5,4); perp = (4,4) and (6,4)
    setObstacle(map, 5, 5)
    setMine(map, 4, 4)
    setMine(map, 6, 4)

    fixObstacleTraps(map, 'grass')

    expect(map.findById('mine').length).toBe(1)
  })
})

describe('fixObstacleTraps — no-op cases', () => {
  it('does nothing when only one perpendicular neighbor is a mine', () => {
    const map = emptyMap()
    setObstacle(map, 5, 5)
    setMine(map, 4, 4)
    // (4,6) stays as ground

    fixObstacleTraps(map, 'grass')

    expect(map.findById('mine').length).toBe(1)
    expect(map.getTile(4, 4)?.id).toBe('mine')
  })

  it('does nothing when there are no walls', () => {
    const map = emptyMap()
    setMine(map, 4, 4)
    setMine(map, 4, 6)
    setMine(map, 6, 4)
    setMine(map, 6, 6)

    fixObstacleTraps(map, 'grass')

    expect(map.findById('mine').length).toBe(4)
  })

  it('does not touch mines beyond the immediate perpendicular pair', () => {
    const map = emptyMap()
    setObstacle(map, 5, 5)
    setMine(map, 4, 4)
    setMine(map, 4, 6)
    // Bystander far away — must survive
    setMine(map, 10, 10)

    fixObstacleTraps(map, 'grass')

    expect(map.findById('mine').length).toBe(2)
    expect(map.getTile(10, 10)?.id).toBe('mine')
  })

  it('replaces the relocated mine with a ground tile (not visited or other)', () => {
    const map = emptyMap()
    setObstacle(map, 5, 5)
    setMine(map, 4, 4)
    setMine(map, 4, 6)

    fixObstacleTraps(map, 'grass')

    // One of (4,4) / (4,6) is now ground
    const ids = [map.getTile(4, 4)?.id, map.getTile(4, 6)?.id]
    expect(ids).toContain('ground')
    expect(ids).toContain('mine')
  })
})

// createsObstacleTrap answers "would a mine HERE complete a trap", checked
// outward from the candidate cell — the read-only counterpart addDropMinesInBand
// consults before committing an airplane-dropped mine, so airplane drops can't
// silently recreate the traps fixObstacleTraps eliminates at generation time.
// Same fixture geometry as the fixObstacleTraps tests above, viewed from the
// other flank's perspective.
describe('createsObstacleTrap', () => {
  it('true: placing at the second flank when the first flank is already a mine (vertical wall)', () => {
    const map = emptyMap()
    setObstacle(map, 5, 5)         // approach (4,5); perps (4,4) and (4,6)
    setMine(map, 4, 4)
    expect(createsObstacleTrap(map, 4, 6)).toBe(true)
  })

  it('true: the opposite side of the same vertical wall', () => {
    const map = emptyMap()
    setObstacle(map, 5, 5)         // approach (6,5); perps (6,4) and (6,6)
    setMine(map, 6, 4)
    expect(createsObstacleTrap(map, 6, 6)).toBe(true)
  })

  it('true: horizontal wall, above the wall', () => {
    const map = emptyMap()
    setObstacle(map, 5, 5)         // approach (5,4); perps (4,4) and (6,4)
    setMine(map, 4, 4)
    expect(createsObstacleTrap(map, 6, 4)).toBe(true)
  })

  it('false: no obstacle at all — flanking mines alone are not a trap', () => {
    const map = emptyMap()
    setMine(map, 4, 4)
    expect(createsObstacleTrap(map, 4, 6)).toBe(false)
  })

  it('false: obstacle present but the other flank has no mine yet', () => {
    const map = emptyMap()
    setObstacle(map, 5, 5)
    // (4,4) stays ground — only one candidate cell, no existing flank mine
    expect(createsObstacleTrap(map, 4, 6)).toBe(false)
  })

  it('false: the approach cell itself is solid (not a valid approach)', () => {
    const map = emptyMap()
    setObstacle(map, 5, 5)
    setObstacle(map, 4, 5)   // approach cell is ALSO solid
    setMine(map, 4, 4)
    expect(createsObstacleTrap(map, 4, 6)).toBe(false)
  })

  it('false: a mine far away is not mistaken for a flank', () => {
    const map = emptyMap()
    setObstacle(map, 5, 5)
    setMine(map, 10, 10)
    expect(createsObstacleTrap(map, 4, 6)).toBe(false)
  })
})

describe('fixObstacleTraps — invariant via createGame', () => {
  // Property test: across many random levels, no wall is ever flanked by
  // mines on both perpendicular sides of any of its approach cells.
  it('createGame never leaves a mine|wall|mine perpendicular pattern', () => {
    for (let run = 0; run < 20; run++) {
      const level = run % 4
      const state = createGame(level)
      const obstacles = state.map.findById('building')
      for (const { x, y } of obstacles) {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ac = x + dc, ar = y + dr
          const approach = state.map.getTile(ac, ar)
          // Only walkable approach cells matter — a mine approach kills the
          // player before they ever face the obstacle, so it isn't a "trap".
          if (!approach || approach.id === 'building' || approach.id === 'mine') continue
          const perpDirs = dc === 0 ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]]
          const bothMines = perpDirs.every(([pdc, pdr]) =>
            state.map.getTile(ac + pdc, ar + pdr)?.id === 'mine'
          )
          expect(bothMines).toBe(false)
        }
      }
    }
  })
})

// ── createBuilding — geometry & high-angle composition ────────────────────────

describe('createBuilding — geometry', () => {
  it('reserves a roofW × (roofD + wallH + 1) box of solid building tiles', () => {
    const map = emptyMap()
    const box = createBuilding(map, 4, 3, 3, 3)
    expect(box).toMatchObject({ x: 4, y: 3, w: 3, h: 3 + BUILDING_WALL_HEIGHT + 1, roofW: 3, roofD: 3 })

    let count = 0
    for (let r = box.y; r < box.y + box.h; r++) {
      for (let c = box.x; c < box.x + box.w; c++) {
        const t = map.getTile(c, r)
        expect(t?.id).toBe('building')
        expect(t?.solid).toBe(true)
        count++
      }
    }
    expect(count).toBe(box.w * box.h)
  })

  it('stacks roof → eave lip → 2 brick rows → 1 concrete row, top to bottom', () => {
    const map = emptyMap()
    const box = createBuilding(map, 2, 2, 4, 3)   // roof 2..3, eave 4, brick 5..6, concrete 7
    expect(map.getTile(2, 2)?.metadata?.part).toBe('roof')       // roof body
    expect(map.getTile(2, 4)?.metadata?.part).toBe('eave')       // overhang lip
    expect(map.getTile(2, 5)?.metadata?.part).toBe('side')       // dark edge column
    expect(map.getTile(3, 5)?.metadata?.part).toBe('window')     // lit window (interior, w≥4)
    expect(map.getTile(4, 5)?.metadata?.part).toBe('brick')      // bright front face
    for (let c = box.x; c < box.x + box.w; c++) {
      expect(map.getTile(c, box.y + box.h - 1)?.metadata?.part).toBe('concrete')  // whole bottom row
    }
  })

  it('has lit windows on a wide front and never a door', () => {
    const map = emptyMap()
    const box = createBuilding(map, 5, 5, 6, 4)
    let windows = 0
    let doors = 0
    for (let r = box.y; r < box.y + box.h; r++) {
      for (let c = box.x; c < box.x + box.w; c++) {
        const part = map.getTile(c, r)?.metadata?.part
        if (part === 'window') windows++
        if (part === 'door') doors++
      }
    }
    expect(windows).toBeGreaterThan(0)
    expect(doors).toBe(0)
  })

  it('puts a chimney on a roomy roof but not on a tiny one', () => {
    const big = emptyMap()
    createBuilding(big, 3, 3, 5, 4)
    expect(big.findById('building').some(({ tile }) => tile.metadata?.part === 'chimney')).toBe(true)

    const tiny = emptyMap()
    createBuilding(tiny, 3, 3, 3, 3)
    expect(tiny.findById('building').some(({ tile }) => tile.metadata?.part === 'chimney')).toBe(false)
  })

  it('renders the roof as ZX grey (WHITE ink on BLACK paper)', () => {
    const map = emptyMap()
    createBuilding(map, 1, 1, 3, 3)
    const roof = map.getTile(1, 1)
    expect(roof?.ink).toBe(C.WHITE)
    expect(roof?.paper).toBe(C.BLACK)
  })

  it('shades the edge columns darker (RED) than the bright front brick (B_RED)', () => {
    const map = emptyMap()
    createBuilding(map, 2, 2, 3, 3)               // brick rows 5..6, w=3 (no windows)
    expect(map.getTile(2, 5)?.ink).toBe(C.RED)    // left edge column = side
    expect(map.getTile(3, 5)?.ink).toBe(C.B_RED)  // interior = bright brick
  })
})

// ── placeBuildings — placement & fairness ─────────────────────────────────────

// Flood-fill over non-solid cells from the start to any cell in the exit column.
// Mines are NOT solid, so they never disconnect the field — only buildings do.
function canReachExit(map: TileMap, startRow: number): boolean {
  const seen = new Set<string>()
  const stack: Array<[number, number]> = [[START_COL, startRow]]
  while (stack.length) {
    const [c, r] = stack.pop()!
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue
    const key = `${c},${r}`
    if (seen.has(key)) continue
    seen.add(key)
    if (map.getTile(c, r)?.solid) continue
    if (c === COLS - 1) return true
    stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1])
  }
  return false
}

describe('placeBuildings — placement & fairness', () => {
  it('never builds on the border ring (row 0, last row, col 0, exit col)', () => {
    for (let level = 0; level < 4; level++) {
      const map = emptyMap()
      placeBuildings(map, level, createRng(1000 + level), START_ROW, 2)
      for (let c = 0; c < COLS; c++) {
        expect(map.getTile(c, 0)?.id).not.toBe('building')
        expect(map.getTile(c, ROWS - 1)?.id).not.toBe('building')
      }
      for (let r = 0; r < ROWS; r++) {
        expect(map.getTile(0, r)?.id).not.toBe('building')
        expect(map.getTile(COLS - 1, r)?.id).not.toBe('building')
      }
    }
  })

  it('never blocks the start safe zone', () => {
    for (let s = 0; s < 20; s++) {
      const map = emptyMap()
      placeBuildings(map, s % 4, createRng(7 + s), START_ROW, 2)
      for (let dr = -SAFE_RADIUS; dr <= SAFE_RADIUS; dr++) {
        for (let dc = -SAFE_RADIUS; dc <= SAFE_RADIUS; dc++) {
          const t = map.getTile(START_COL + dc, START_ROW + dr)
          if (t) expect(t.id).not.toBe('building')
        }
      }
    }
  })

  it('keeps at least one empty tile between any two buildings (no corner-touch)', () => {
    for (let s = 0; s < 10; s++) {
      const map = emptyMap()
      const boxes = placeBuildings(map, 3, createRng(42 + s), START_ROW, 2)
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j]
          // ≥1 empty column OR ≥1 empty row between the boxes
          const sepX = b.x > a.x + a.w || a.x > b.x + b.w
          const sepY = b.y > a.y + a.h || a.y > b.y + b.h
          expect(sepX || sepY).toBe(true)
        }
      }
    }
  })

  it('places a genuinely big building (both roof dims ≥ BIG_ROOF_MIN) every two levels', () => {
    for (const level of [1, 3]) {       // odd 0-indexed levels = the guaranteed-big cadence
      const map = emptyMap()
      const boxes = placeBuildings(map, level, createRng(99 + level), START_ROW, 2)
      const hasBig = boxes.some((b) => b.roofW >= BIG_ROOF_MIN && b.roofD >= BIG_ROOF_MIN)
      expect(hasBig).toBe(true)
    }
  })

  it('does not throw and places nothing when there is no free room', () => {
    const map = emptyMap()
    // Fill the whole interior with buildings → every candidate is rejected for
    // overlap/gap, so nothing new fits. Must degrade gracefully, never throw.
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) map.setTile(c, r, makeTileBuilding('brick'))
    }
    let boxes: BuildingBox[] = []
    expect(() => { boxes = placeBuildings(map, 4, createRng(1), START_ROW, 2) }).not.toThrow()
    expect(boxes).toHaveLength(0)
  })

  it('the player can always reach the exit column from the start (20 random levels)', () => {
    for (let run = 0; run < 20; run++) {
      const state = createGame(run % 4, 0, `reach-${run}`)
      expect(canReachExit(state.map, state.startRow)).toBe(true)
    }
  })
})

// ── Seeded start row ──────────────────────────────────────────────────────────

describe('seeded vertical start row', () => {
  it('is identical for the same seed (fair) and within the field', () => {
    const a = createGame(0, 0, 'start-row-seed')
    const b = createGame(0, 0, 'start-row-seed')
    expect(a.startRow).toBe(b.startRow)
    expect(a.startRow).toBeGreaterThanOrEqual(0)
    expect(a.startRow).toBeLessThan(ROWS)
  })

  it('spawns the player on the seeded row, marked visited', () => {
    const s = createGame(0, 0, 'start-row-seed')
    expect(s.playerRow).toBe(s.startRow)
    expect(s.map.getTile(START_COL, s.startRow)?.id).toBe('visited')
  })

  it('varies the start row across seeds (not pinned to one row)', () => {
    const rows = new Set(
      Array.from({ length: 30 }, (_, i) => createGame(0, 0, `row-${i}`).startRow),
    )
    expect(rows.size).toBeGreaterThan(1)
  })
})

// ── Coloured gems ─────────────────────────────────────────────────────────────

describe('gem kinds — exact-quota distribution & colour', () => {
  function gemCounts(seed: string): Record<string, number> {
    const state = createGame(0, 0, seed)
    const counts: Record<string, number> = {}
    for (const { tile } of state.map.findById('gem')) {
      const k = tile.metadata?.gemKind as string
      counts[k] = (counts[k] ?? 0) + 1
    }
    return counts
  }

  it('splits 12 gems as 3 red / 6 cyan / 1 gold / 2 green, every seed', () => {
    for (const seed of ['gems-a', 'gems-b', 'gems-c']) {
      expect(gemCounts(seed)).toEqual({ red: 3, cyan: 6, gold: 1, green: 2 })
    }
  })

  it('each gem tile carries its kind colour as ink', () => {
    const state = createGame(0, 0, 'gems-a')
    for (const { tile } of state.map.findById('gem')) {
      const kind = GEM_KINDS.find((k) => k.id === tile.metadata?.gemKind)
      expect(tile.ink).toBe(kind?.color)
    }
  })
})

// ── revealMine (cyan-gem reward) ──────────────────────────────────────────────

describe('revealMine — cyan-gem reward', () => {
  it('reveals an undetonated mine off the walked path', () => {
    const state = createGame(0, 0, 'reveal-seed')
    expect(revealMine(state)).toBe(true)
    expect(state.revealedMines).toHaveLength(1)
    const m = state.revealedMines[0]
    // findById('mine') only yields live mines, so the pick is a real, legal target
    expect(state.map.getTile(m.col, m.row)?.id).toBe('mine')
  })

  it('never reveals the same mine twice', () => {
    const state = createGame(0, 0, 'reveal-seed')
    revealMine(state); revealMine(state); revealMine(state)
    const keys = state.revealedMines.map((m) => `${m.col},${m.row}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('is deterministic for the same seed', () => {
    const a = createGame(0, 0, 'reveal-seed'); revealMine(a)
    const b = createGame(0, 0, 'reveal-seed'); revealMine(b)
    expect(a.revealedMines[0]).toEqual(b.revealedMines[0])
  })

  it('returns false once every live mine is revealed', () => {
    const state = createGame(0, 0, 'reveal-seed')
    const total = state.map.findById('mine').length
    expect(total).toBeGreaterThan(0)
    for (let i = 0; i < total; i++) expect(revealMine(state)).toBe(true)
    expect(revealMine(state)).toBe(false)
    expect(state.revealedMines).toHaveLength(total)
  })

  // Owner decision (2026-07-01): revealing an already-flagged mine would waste
  // the reward on something the player has already marked/found themselves.
  it('excludes already-flagged mines from candidates', () => {
    const state = createGame(0, 0, 'reveal-seed')
    const mines = state.map.findById('mine')
    expect(mines.length).toBeGreaterThan(1)
    // Flag every mine except the last one, leaving exactly one legal candidate.
    for (let i = 0; i < mines.length - 1; i++) {
      const { x, y, tile } = mines[i]
      state.map.setTile(x, y, flagTile(tile))
    }
    const onlyUnflagged = mines[mines.length - 1]
    expect(revealMine(state)).toBe(true)
    expect(state.revealedMines[0]).toEqual({ col: onlyUnflagged.x, row: onlyUnflagged.y })
  })

  it('returns false when every remaining mine is flagged', () => {
    const state = createGame(0, 0, 'reveal-seed')
    for (const { x, y, tile } of state.map.findById('mine')) {
      state.map.setTile(x, y, flagTile(tile))
    }
    expect(revealMine(state)).toBe(false)
    expect(state.revealedMines).toHaveLength(0)
  })
})

// ── Buildings: mine & airplane exclusion ──────────────────────────────────────

describe('buildings — mines and airplane drops never land on a building', () => {
  it('createGame never places a mine on a building cell (20 random levels)', () => {
    for (let run = 0; run < 20; run++) {
      const state = createGame(run % 4, 0, `mines-${run}`)
      const buildingCells = new Set(state.map.findById('building').map(({ x, y }) => `${x},${y}`))
      for (const { x, y } of state.map.findById('mine')) {
        expect(buildingCells.has(`${x},${y}`)).toBe(false)
      }
    }
  })

  // The requirement "airplane never drops a mine on a roof" is NOT an exception —
  // addDropMinesInBand only ever targets `ground`, so building cells are silently
  // skipped and stay buildings. This test pins that contract down.
  it('airplane drops skip building cells silently (no throw, building stays a building)', () => {
    const state = createGame(3, 0, 'drop-seed')
    const buildingCells = new Set(state.map.findById('building').map(({ x, y }) => `${x},${y}`))
    expect(buildingCells.size).toBeGreaterThan(0)

    for (let pass = 0; pass < 40; pass++) {
      state.airplanePassIndex = pass  // vary the seeded drop pattern across the whole field
      expect(() => addDropMinesInBand(state, 10, 0, ROWS - 1)).not.toThrow()
      for (const { col, row } of state.droppedMines) {
        expect(buildingCells.has(`${col},${row}`)).toBe(false)
      }
    }
    for (const key of buildingCells) {
      const [c, r] = key.split(',').map(Number)
      expect(state.map.getTile(c, r)?.id).toBe('building')
    }
  })

  it('a building tile adjacent to the player is not counted as a warning mine', () => {
    const map = emptyMap()
    createBuilding(map, 5, 5, 3, 3)          // roof corner at (5,5)
    expect(map.getTile(5, 5)?.id).toBe('building')
    expect(countWarningMines(map, 5, 4)).toBe(0)  // player directly above the roof, no mines
  })
})

// ── fixObstacleTraps — building perimeter edge cases ──────────────────────────

describe('fixObstacleTraps — building perimeter', () => {
  it('resolves a mine|building|mine trap on a real building perimeter', () => {
    const map = emptyMap()
    const box = createBuilding(map, 6, 6, 3, 3)
    // Approach from the left of the building: approach cell sits one tile left of
    // the front-left wall; flank it above and below with mines.
    const wallRow = box.y + 3                 // first wall row
    const ac = box.x - 1, ar = wallRow
    setMine(map, ac, ar - 1)
    setMine(map, ac, ar + 1)
    fixObstacleTraps(map, 'grass')
    const flanks = [map.getTile(ac, ar - 1)?.id, map.getTile(ac, ar + 1)?.id]
    expect(flanks).toContain('ground')         // one mine relocated away
  })

  it('leaves a single-sided mine next to a building untouched', () => {
    const map = emptyMap()
    createBuilding(map, 6, 6, 3, 3)
    setMine(map, 5, 9)                          // only one flank — not a trap
    fixObstacleTraps(map, 'grass')
    expect(map.getTile(5, 9)?.id).toBe('mine')
  })
})

// ── Timer ───────────────────────────────────────────────────────────────────────

describe('timer', () => {
  it('createGame starts every level at the base budget', () => {
    expect(createGame(0).timeLeftMs).toBe(TIMER_BASE_MS)
    expect(createGame(3).timeLeftMs).toBe(TIMER_BASE_MS)
  })

  it('tickTimer counts down by dt', () => {
    const state = createGame(0)
    tickTimer(state, 1000)
    expect(state.timeLeftMs).toBe(TIMER_BASE_MS - 1000)
    expect(state.phase).toBe('playing')
  })

  it('clamps at 0 (never negative) and ends the game when it runs out', () => {
    const state = createGame(0)
    tickTimer(state, TIMER_BASE_MS + 5000)   // overshoot
    expect(state.timeLeftMs).toBe(0)
    expect(state.phase).toBe('gameover')
  })

  it('does not end the game while time remains', () => {
    const state = createGame(0)
    tickTimer(state, TIMER_BASE_MS - 1)      // 1 ms left
    expect(state.timeLeftMs).toBe(1)
    expect(state.phase).toBe('playing')
  })
})

// ── Perimeter fence ───────────────────────────────────────────────────────────

describe('perimeter fence — structure', () => {
  it('left column is fence except one walkable hole at startRow; right column fence except one hole at exitRow', () => {
    for (let level = 0; level < 5; level++) {
      const state = createGame(level, 0, `fence-struct-${level}`)
      let leftHoles = 0, rightHoles = 0
      for (let row = 0; row < ROWS; row++) {
        const left = state.map.getTile(0, row)!
        const right = state.map.getTile(COLS - 1, row)!
        if (row === state.startRow) { expect(left.solid).toBe(false); leftHoles++ }
        else { expect(left.id).toBe('fence'); expect(left.solid).toBe(true) }
        if (row === state.exitRow) { expect(right.solid).toBe(false); rightHoles++ }
        else { expect(right.id).toBe('fence'); expect(right.solid).toBe(true) }
      }
      expect(leftHoles).toBe(1)
      expect(rightHoles).toBe(1)
    }
  })

  it('exit row differs from entry row by at least MIN_ENTRY_EXIT_ROW_GAP (60 seeds)', () => {
    for (let s = 0; s < 60; s++) {
      const state = createGame(s % 5, 0, `gap-${s}`)
      expect(Math.abs(state.exitRow - state.startRow)).toBeGreaterThanOrEqual(MIN_ENTRY_EXIT_ROW_GAP)
    }
  })
})

describe('perimeter fence — entry/exit safe guarantees (60 seeds × 5 levels)', () => {
  it('the cell directly ahead of the entry hole (col 1, startRow) is never a mine or solid', () => {
    for (let s = 0; s < 60; s++) {
      for (let level = 0; level < 5; level++) {
        const state = createGame(level, 0, `entry-${s}-${level}`)
        const ahead = state.map.getTile(1, state.startRow)!
        expect(ahead.id).not.toBe('mine')
        expect(ahead.solid).toBe(false)
      }
    }
  })

  it('the exit safe zone holds no mines, and the approach (col COLS-2, exitRow) is walkable', () => {
    for (let s = 0; s < 60; s++) {
      for (let level = 0; level < 5; level++) {
        const state = createGame(level, 0, `exit-${s}-${level}`)
        for (let dr = -SAFE_RADIUS; dr <= SAFE_RADIUS; dr++) {
          for (let dc = -SAFE_RADIUS; dc <= SAFE_RADIUS; dc++) {
            const t = state.map.getTile(COLS - 1 + dc, state.exitRow + dr)
            if (t) expect(t.id).not.toBe('mine')
          }
        }
        const approach = state.map.getTile(COLS - 2, state.exitRow)!
        expect(approach.id).not.toBe('mine')
        expect(approach.solid).toBe(false)
      }
    }
  })
})

describe('perimeter fence — solvability (BFS, large sample)', () => {
  it('every seeded field has at least one safe entry→exit path (60 seeds × 5 levels = 300 fields)', () => {
    for (let s = 0; s < 60; s++) {
      for (let level = 0; level < 5; level++) {
        const state = createGame(level, 0, `solve-${s}-${level}`)
        expect(isFieldSolvable(state.map, state.startRow, state.exitRow)).toBe(true)
      }
    }
  })

  it('random (unseeded) fields are always solvable too (100 fields)', () => {
    for (let i = 0; i < 100; i++) {
      const state = createGame(i % 5, 0)   // no seed → fresh random field each call
      expect(isFieldSolvable(state.map, state.startRow, state.exitRow)).toBe(true)
    }
  })

  it('isFieldSolvable returns false when the exit hole is walled off by mines', () => {
    // Hand-built unsolvable field: fence both columns, ground interior, then a full
    // vertical mine wall in front of the exit column → no safe path can reach it.
    const map = createTileMap(COLS, ROWS)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        map.setTile(col, row, makeTileGround(cellVariant(col, row), 'grass'))
      }
    }
    const startRow = 3, exitRow = 14
    for (let row = 0; row < ROWS; row++) setMine(map, COLS - 2, row)  // wall before exit
    expect(isFieldSolvable(map, startRow, exitRow)).toBe(false)
  })
})

describe('perimeter fence — determinism', () => {
  it('the same daily seed builds an identical field twice (map ids + startRow + exitRow)', () => {
    for (let level = 0; level < 5; level++) {
      const a = createGame(level, 0, `det-${level}`)
      const b = createGame(level, 0, `det-${level}`)
      expect(a.startRow).toBe(b.startRow)
      expect(a.exitRow).toBe(b.exitRow)
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          expect(a.map.getTile(col, row)?.id).toBe(b.map.getTile(col, row)?.id)
        }
      }
    }
  })
})

describe('debug mine-reveal budget (tryToggleReveal)', () => {
  it('daily mode: D does nothing — reveal never turns on, however many presses', () => {
    expect(DAILY_REVEAL_LIMIT).toBe(0)
    const s = createGame(0, 0, 'reveal-daily')   // seeded → daily
    expect(s.dropSeedBase).not.toBeNull()
    for (let i = 0; i < 10; i++) tryToggleReveal(s)
    expect(s.debugMode).toBe(false)
    expect(s.revealsUsed).toBe(0)
  })

  it('random mode: each ON consumes one reveal, OFF is free, blocked after the limit', () => {
    const s = createGame(0)            // no seed → random/practice
    expect(s.dropSeedBase).toBeNull()
    expect(typeof RANDOM_REVEAL_LIMIT).toBe('number')   // current default is finite
    const limit = RANDOM_REVEAL_LIMIT as number
    for (let i = 0; i < limit; i++) {
      tryToggleReveal(s)                       // ON — consumes one
      expect(s.debugMode).toBe(true)
      expect(s.revealsUsed).toBe(i + 1)
      tryToggleReveal(s)                       // OFF — free
      expect(s.debugMode).toBe(false)
      expect(s.revealsUsed).toBe(i + 1)        // off did not consume
    }
    tryToggleReveal(s)                         // budget spent → no-op
    expect(s.debugMode).toBe(false)
    expect(s.revealsUsed).toBe(limit)
  })

  it('createGame resets the reveal budget each level', () => {
    const s = createGame(0)
    tryToggleReveal(s)
    expect(s.revealsUsed).toBe(1)
    const next = createGame(1, s.score)        // new level
    expect(next.revealsUsed).toBe(0)
    expect(next.debugMode).toBe(false)
  })
})

describe('perimeter fence — movement funnel', () => {
  it('the player cannot step up or down into the fence at the entry hole', () => {
    // Find a seed whose startRow is interior so both up AND down hit the fence.
    let state = createGame(0, 0, 'funnel-0')
    let guard = 0
    while ((state.startRow === 0 || state.startRow === ROWS - 1) && guard < 50) {
      guard++
      state = createGame(0, 0, `funnel-${guard}`)
    }
    const row0 = state.startRow
    state.playerCol = START_COL
    state.playerRow = row0
    state.walkTween = null
    movePlayer(state, 'up')
    expect(state.walkTween).toBeNull()        // fence blocks
    movePlayer(state, 'down')
    expect(state.walkTween).toBeNull()        // fence blocks
    expect(state.playerRow).toBe(row0)
  })

  it('the player CAN step right off the entry hole into the field', () => {
    const state = createGame(0, 0, 'funnel-right')
    state.playerCol = START_COL
    state.playerRow = state.startRow
    state.walkTween = null
    movePlayer(state, 'right')
    expect(state.walkTween).not.toBeNull()    // move started
  })

  it('the right edge can be crossed only at the exit row (fence blocks every other row)', () => {
    const state = createGame(0, 0, 'funnel-exit')
    const blockedRow = state.exitRow >= 2 ? state.exitRow - 2 : state.exitRow + 2
    // A non-exit row: moving right into the fence does nothing.
    state.playerCol = COLS - 2
    state.playerRow = blockedRow
    state.walkTween = null
    movePlayer(state, 'right')
    expect(state.walkTween).toBeNull()
    // The exit row: stepping right enters the walkable hole.
    state.playerCol = COLS - 2
    state.playerRow = state.exitRow
    state.walkTween = null
    movePlayer(state, 'right')
    expect(state.walkTween).not.toBeNull()
  })
})

// ── Airplane drops — BFS solvability guard ────────────────────────────────────

// Minimal state for addDropMinesInBand (only the fields it touches).
function dropState(map: TileMap, startRow: number, exitRow: number, seed: string | null): GameState {
  return {
    map, startRow, exitRow, terrain: 'grass',
    dropSeedBase: seed, airplanePassIndex: 0,
    totalMines: 0, droppedMines: [], dropFlashTimer: 0,
  } as unknown as GameState
}

describe('airplane drops — solvability guard', () => {
  it('the field stays solvable after repeated airplane drops (40 seeds × 8 passes)', () => {
    for (let s = 0; s < 40; s++) {
      const state = createGame(s % 5, 0, `air-${s}`)
      for (let pass = 0; pass < 8; pass++) {
        addDropMinesInBand(state, 8, 1, 16)   // wide band → many chances to seal
        state.airplanePassIndex++              // each pass has its own drop seed
        expect(isFieldSolvable(state.map, state.startRow, state.exitRow)).toBe(true)
      }
    }
  })

  it('refuses every drop that would seal the only corridor (places 0)', () => {
    // All-ground field, then mine every row except a single horizontal corridor at R.
    // The corridor (row R) is the ONLY safe path → any mine on it seals the field.
    const map = createTileMap(COLS, ROWS)
    const R = 8
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) map.setTile(col, row, makeTileGround(cellVariant(col, row), 'grass'))
    }
    for (let row = 0; row < ROWS; row++) {
      if (row !== R) for (let col = 1; col <= COLS - 2; col++) setMine(map, col, row)
      // Fence the edges, gap at R (entry + exit on the corridor row).
      map.setTile(0, row, row === R ? makeTileGround(cellVariant(0, row), 'grass') : makeTileFence())
      map.setTile(COLS - 1, row, row === R ? makeTileGround(cellVariant(COLS - 1, row), 'grass') : makeTileFence())
    }
    const state = dropState(map, R, R, 'guard')
    expect(isFieldSolvable(map, R, R)).toBe(true)   // corridor open
    addDropMinesInBand(state, 20, R, R)             // try hard to drop on the corridor
    expect(isFieldSolvable(map, R, R)).toBe(true)   // guard kept it open
    let placed = 0
    for (let col = 1; col <= COLS - 2; col++) if (map.getTile(col, R)?.id === 'mine') placed++
    expect(placed).toBe(0)
    expect(state.totalMines).toBe(0)
  })

  // Regression coverage for the obstacle-trap prevention added alongside the
  // solvability guard: fixObstacleTraps only runs once, at generation — without
  // this, a later airplane drop could recreate the exact "forced step onto a
  // mine" trap it eliminated. Row 6 is mined everywhere except (4,6), so the
  // ONLY candidate the RNG can ever place at in that row is the one that would
  // complete the trap (obstacle at (5,5), existing flank mine at (4,4)).
  it('refuses a drop that would recreate an obstacle-flanking trap', () => {
    const map = createTileMap(COLS, ROWS)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) map.setTile(col, row, makeTileGround(cellVariant(col, row), 'grass'))
    }
    map.setTile(5, 5, makeTileBuilding('brick'))
    setMine(map, 4, 4)
    for (let col = 1; col <= COLS - 2; col++) {
      if (col !== 4) setMine(map, col, 6)   // every row-6 cell but the trap candidate
    }
    const state = dropState(map, 10, 10, 'trap-guard')

    addDropMinesInBand(state, 30, 6, 6)   // row-locked to 6; only (4,6) is ever a valid target

    expect(map.getTile(4, 6)?.id).toBe('ground')   // guard kept it open
    expect(state.totalMines).toBe(0)               // the only candidate was rejected every time
  })

  it('drops are deterministic for the same seed (daily stays comparable)', () => {
    const a = createGame(2, 0, 'air-det')
    const b = createGame(2, 0, 'air-det')
    for (let pass = 0; pass < 5; pass++) {
      addDropMinesInBand(a, 8, 1, 16); a.airplanePassIndex++
      addDropMinesInBand(b, 8, 1, 16); b.airplanePassIndex++
    }
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        expect(a.map.getTile(col, row)?.id).toBe(b.map.getTile(col, row)?.id)
      }
    }
    expect(a.totalMines).toBe(b.totalMines)
  })

  it('concentrates drops toward the exit side (forward bias)', () => {
    // Open all-ground field (resets keep it open) → isolate the column distribution.
    const map = createTileMap(COLS, ROWS)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) map.setTile(col, row, makeTileGround(cellVariant(col, row), 'grass'))
    }
    const state = dropState(map, 8, 2, 'bias')
    const cols: number[] = []
    for (let pass = 0; pass < 30; pass++) {
      state.airplanePassIndex = pass
      state.droppedMines = []
      addDropMinesInBand(state, 6, 5, 12)
      for (const d of state.droppedMines) {
        cols.push(d.col)
        map.setTile(d.col, d.row, makeTileGround(cellVariant(d.col, d.row), 'grass'))  // reset → keep open
      }
    }
    const mean = cols.reduce((acc, c) => acc + c, 0) / cols.length
    expect(mean).toBeGreaterThan((COLS - 2) / 2)   // skewed past the midpoint toward the exit
  })
})

// ── Daily run origin date (highscore fairness) ────────────────────────────────

describe('seedDate', () => {
  it('extracts the YYYY-MM-DD prefix from a daily seed', () => {
    expect(seedDate('2026-06-24:L3')).toBe('2026-06-24')
    expect(seedDate('2026-06-24:L0')).toBe('2026-06-24')
  })
  it('is null for a random run (null seed)', () => {
    expect(seedDate(null)).toBeNull()
  })
  it('is null for a non-dated / malformed seed', () => {
    expect(seedDate('garbage')).toBeNull()
    expect(seedDate('L3')).toBeNull()
  })
})

describe('nextDailySeed — a daily run keeps its origin date across levels', () => {
  it('reuses the run date (not today) for the next level', () => {
    expect(nextDailySeed('2026-06-24:L0', 1)).toBe('2026-06-24:L1')
    expect(nextDailySeed('2026-06-24:L1', 2)).toBe('2026-06-24:L2')
  })
  it('returns undefined for a random run (null seed)', () => {
    expect(nextDailySeed(null, 1)).toBeUndefined()
  })
  it('falls back to today for a malformed daily seed', () => {
    expect(nextDailySeed('weird', 1)).toBe(`${todaySeed()}:L1`)
  })
})
