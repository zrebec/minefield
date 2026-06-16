import type { TileMap, Rng } from 'zx-kit'
import { COLS, ROWS } from './constants.ts'
import {
  START_COL, START_ROW, SAFE_RADIUS,
  BUILDING_COUNTS, BUILDING_WALL_HEIGHT, BUILDING_GAP,
  ROOF_MIN, ROOF_MAX_PER_LEVEL, BIG_ROOF_MIN,
} from './config.ts'
import { makeTileBuilding, type BuildingPart } from './sprites.ts'

/**
 * Logical bounding box of a placed building, in tile units. `roofW`/`roofD` are
 * the gameplay-facing roof footprint; `w`/`h` include the extra eave/side/base
 * tiles that the pseudo-3D drawing needs. The whole box is solid and mine-free.
 */
export interface BuildingBox {
  x: number
  y: number
  w: number
  h: number
  roofW: number
  roofD: number
}

// Inclusive-max integer from a seeded RNG so fields stay reproducible per seed.
function randInt(rng: Rng, min: number, max: number): number {
  return rng.range(min, max + 1)
}

/**
 * Stamps one pseudo-3D building into the map as a solid block of `'building'`
 * tiles. Layout (oblique "drawn cube" — grey roof on top, brick front + darker
 * right side, foundation at the bottom):
 *
 * ```
 *   [roof ][roof ][roof ][eave]   ← roof footprint roofW×roofD  + eave overhang
 *   [roof ][roof ][roof ][eave]
 *   [wall ][door ][wall ][side]   ← front wall (BUILDING_WALL_HEIGHT rows)
 *   [wall ][wall ][wall ][side]
 *   [base ][base ][base ][base]   ← foundation
 * ```
 *
 * Bounding box = (roofW + 1) × (roofD + wallH + 1). Returns it so the caller can
 * run placement/fairness checks. Coordinates outside the map are ignored by
 * `setTile`, so callers must size/position the box to fit (placeBuildings does).
 */
export function createBuilding(
  map: TileMap,
  c0: number,
  r0: number,
  roofW: number,
  roofD: number,
  wallH: number = BUILDING_WALL_HEIGHT,
): BuildingBox {
  const w = roofW + 1
  const h = roofD + wallH + 1
  const sideCol = c0 + roofW          // rightmost column: eave (roof rows) → side (wall rows)
  const wallTop = r0 + roofD          // first wall row
  const baseRow = r0 + roofD + wallH  // foundation row
  const doorCol = c0 + Math.floor((roofW - 1) / 2)
  const doorRow = baseRow - 1         // door sits on the bottom front-wall row

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const cc = c0 + dx
      const rr = r0 + dy
      let part: BuildingPart
      if (rr === baseRow) {
        part = 'base'
      } else if (rr < wallTop) {
        part = cc === sideCol ? 'eave' : 'roof'
      } else {
        part = cc === sideCol ? 'side'
          : (cc === doorCol && rr === doorRow) ? 'door'
            : 'wall'
      }
      map.setTile(cc, rr, makeTileBuilding(part))
    }
  }

  return { x: c0, y: r0, w, h, roofW, roofD }
}

// Does the box (already including its eave/side/base tiles) overlap the start
// safe zone? Buildings must never wall the player in at spawn — keep one extra
// ring of clearance so they can always step out.
function hitsSafeZone(c0: number, r0: number, w: number, h: number): boolean {
  for (let rr = r0; rr < r0 + h; rr++) {
    for (let cc = c0; cc < c0 + w; cc++) {
      if (Math.abs(cc - START_COL) <= SAFE_RADIUS + 1 &&
          Math.abs(rr - START_ROW) <= SAFE_RADIUS + 1) return true
    }
  }
  return false
}

// Is any existing building within `gap` tiles of this box (incl. diagonals)?
// Keeps a walkable lane between buildings and forbids corner-touch.
function tooCloseToBuilding(
  map: TileMap, c0: number, r0: number, w: number, h: number, gap: number,
): boolean {
  for (let rr = r0 - gap; rr < r0 + h + gap; rr++) {
    for (let cc = c0 - gap; cc < c0 + w + gap; cc++) {
      if (map.getTile(cc, rr)?.id === 'building') return true
    }
  }
  return false
}

/**
 * Places this level's buildings into the map. **Call before placeMines** so
 * mines/airplane drops (ground-only) automatically avoid every building cell.
 *
 * Invariants guaranteed by construction:
 * - the border ring (row 0, last row, col 0, exit col COLS-1) is never built on
 *   → the player can always reach the right exit (reachability is structural);
 * - the start safe zone (+1) is clear;
 * - buildings keep ≥ BUILDING_GAP empty tiles between them (no corner-touch);
 * - a "big" building (roof ≥ BIG_ROOF_MIN) appears on the every-other-level
 *   cadence the owner asked for.
 *
 * Returns the placed boxes (may be fewer than targeted if the field is tight,
 * never throws).
 */
export function placeBuildings(map: TileMap, level: number, rng: Rng): BuildingBox[] {
  const [minCount, maxCount] = BUILDING_COUNTS[Math.min(level, BUILDING_COUNTS.length - 1)]
  const target = randInt(rng, minCount, maxCount)
  const roofMax = ROOF_MAX_PER_LEVEL[Math.min(level, ROOF_MAX_PER_LEVEL.length - 1)]
  // "Big at least once per two levels": force the first building big on odd
  // (0-indexed) levels, where the per-level cap actually allows a big roof.
  const forceBig = level % 2 === 1 && roofMax >= BIG_ROOF_MIN

  const boxes: BuildingBox[] = []
  let attempts = 0
  while (boxes.length < target && attempts < target * 60) {
    attempts++
    const needBig = forceBig && boxes.length === 0
    const lo = needBig ? BIG_ROOF_MIN : ROOF_MIN
    const roofW = randInt(rng, lo, roofMax)
    const roofD = randInt(rng, lo, roofMax)
    const w = roofW + 1
    const h = roofD + BUILDING_WALL_HEIGHT + 1

    // Keep ≥1 margin from top/left/bottom edges and leave the exit column free:
    // box columns ⊂ [1 .. COLS-2], box rows ⊂ [1 .. ROWS-2].
    const maxC0 = COLS - 1 - w
    const maxR0 = ROWS - 1 - h
    if (maxC0 < 1 || maxR0 < 1) continue  // can't fit this size with margins

    const c0 = randInt(rng, 1, maxC0)
    const r0 = randInt(rng, 1, maxR0)
    if (hitsSafeZone(c0, r0, w, h)) continue
    if (tooCloseToBuilding(map, c0, r0, w, h, BUILDING_GAP)) continue

    boxes.push(createBuilding(map, c0, r0, roofW, roofD))
  }
  return boxes
}
