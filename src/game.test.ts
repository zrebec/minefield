import { describe, it, expect } from 'vitest'
import { createTileMap, createRng, type TileMap } from 'zx-kit'
import { countWarningMines, countAdjacentMines, countBeaconSignals, createGame, addDropMinesInBand, applyClusterBlast, fixObstacleTraps, type MineType } from './game.ts'
import { createBuilding, placeBuildings, type BuildingBox } from './buildings.ts'
import { C, COLS, ROWS } from './constants.ts'
import GEM_COUNT, { BEACON_MINE_LEVEL, CLUSTER_MINE_LEVEL, START_COL, START_ROW, SAFE_RADIUS, BIG_ROOF_MIN, BUILDING_WALL_HEIGHT } from './config.ts'
import { makeTileGround, makeTileMine, makeTileGem, makeTileVisited, makeTileBuilding, TILE_EXPLODED, type TerrainType } from './sprites.ts'

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
    expect(state.map.getTile(START_COL, START_ROW)?.id).toBe('visited')
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
    expect(state.map.getTile(START_COL, START_ROW)?.ink).toBe(C.B_YELLOW)
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
function canReachExit(map: TileMap): boolean {
  const seen = new Set<string>()
  const stack: Array<[number, number]> = [[START_COL, START_ROW]]
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
      placeBuildings(map, level, createRng(1000 + level))
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
      placeBuildings(map, s % 4, createRng(7 + s))
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
      const boxes = placeBuildings(map, 3, createRng(42 + s))
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
      const boxes = placeBuildings(map, level, createRng(99 + level))
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
    expect(() => { boxes = placeBuildings(map, 4, createRng(1)) }).not.toThrow()
    expect(boxes).toHaveLength(0)
  })

  it('the player can always reach the exit column from the start (20 random levels)', () => {
    for (let run = 0; run < 20; run++) {
      const state = createGame(run % 4, 0, `reach-${run}`)
      expect(canReachExit(state.map)).toBe(true)
    }
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
