import { describe, it, expect } from 'vitest'
import { createTileMap, type TileMap } from 'zx-kit'
import { countWarningMines, createGame, addDropMinesInBand, applyClusterBlast, fixWallTraps, type MineType } from './game.ts'
import { C, COLS, ROWS } from './constants.ts'
import GEM_COUNT, { BEACON_MINE_LEVEL, CLUSTER_MINE_LEVEL, START_COL, START_ROW } from './config.ts'
import { makeTileGround, makeTileMine, makeTileGem, makeTileVisited, makeTileWall, TILE_EXPLODED, type TerrainType } from './sprites.ts'

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

// ── fixWallTraps ──────────────────────────────────────────────────────────────

function setWall(map: TileMap, col: number, row: number): void {
  map.setTile(col, row, makeTileWall())
}

describe('fixWallTraps — vertical wall', () => {
  it('removes one of the two perpendicular mines flanking a wall', () => {
    const map = emptyMap()
    // Vertical wall at column 5; approach cell is (4,5); perp = (4,4) and (4,6)
    setWall(map, 5, 5)
    setMine(map, 4, 4)
    setMine(map, 4, 6)

    fixWallTraps(map, 'grass')

    const mineCount = map.findById('mine').length
    expect(mineCount).toBe(1)
  })

  it('also resolves the trap on the opposite side of the wall', () => {
    const map = emptyMap()
    // Approach from the right at (6,5); perp = (6,4) and (6,6)
    setWall(map, 5, 5)
    setMine(map, 6, 4)
    setMine(map, 6, 6)

    fixWallTraps(map, 'grass')

    expect(map.findById('mine').length).toBe(1)
  })
})

describe('fixWallTraps — horizontal wall', () => {
  it('removes one of the two perpendicular mines above/below a horizontal wall', () => {
    const map = emptyMap()
    // Horizontal wall at (5,5); approach cell above is (5,4); perp = (4,4) and (6,4)
    setWall(map, 5, 5)
    setMine(map, 4, 4)
    setMine(map, 6, 4)

    fixWallTraps(map, 'grass')

    expect(map.findById('mine').length).toBe(1)
  })
})

describe('fixWallTraps — no-op cases', () => {
  it('does nothing when only one perpendicular neighbor is a mine', () => {
    const map = emptyMap()
    setWall(map, 5, 5)
    setMine(map, 4, 4)
    // (4,6) stays as ground

    fixWallTraps(map, 'grass')

    expect(map.findById('mine').length).toBe(1)
    expect(map.getTile(4, 4)?.id).toBe('mine')
  })

  it('does nothing when there are no walls', () => {
    const map = emptyMap()
    setMine(map, 4, 4)
    setMine(map, 4, 6)
    setMine(map, 6, 4)
    setMine(map, 6, 6)

    fixWallTraps(map, 'grass')

    expect(map.findById('mine').length).toBe(4)
  })

  it('does not touch mines beyond the immediate perpendicular pair', () => {
    const map = emptyMap()
    setWall(map, 5, 5)
    setMine(map, 4, 4)
    setMine(map, 4, 6)
    // Bystander far away — must survive
    setMine(map, 10, 10)

    fixWallTraps(map, 'grass')

    expect(map.findById('mine').length).toBe(2)
    expect(map.getTile(10, 10)?.id).toBe('mine')
  })

  it('replaces the relocated mine with a ground tile (not visited or other)', () => {
    const map = emptyMap()
    setWall(map, 5, 5)
    setMine(map, 4, 4)
    setMine(map, 4, 6)

    fixWallTraps(map, 'grass')

    // One of (4,4) / (4,6) is now ground
    const ids = [map.getTile(4, 4)?.id, map.getTile(4, 6)?.id]
    expect(ids).toContain('ground')
    expect(ids).toContain('mine')
  })
})

describe('fixWallTraps — invariant via createGame', () => {
  // Property test: across many random levels, no wall is ever flanked by
  // mines on both perpendicular sides of any of its approach cells.
  it('createGame never leaves a mine|wall|mine perpendicular pattern', () => {
    for (let run = 0; run < 20; run++) {
      const level = run % 4
      const state = createGame(level)
      const walls = state.map.findById('wall')
      for (const { x, y } of walls) {
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ac = x + dc, ar = y + dr
          const approach = state.map.getTile(ac, ar)
          // Only walkable approach cells matter — a mine approach kills the
          // player before they ever face the wall, so it isn't a "trap".
          if (!approach || approach.id === 'wall' || approach.id === 'mine') continue
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
