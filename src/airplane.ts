import { CANVAS_W, CELL, ROWS } from './constants.ts'
import { LEVEL_CONFIGS, AIRPLANE_CROSS_MS, AIRPLANE_APPROACH_MS, AIRPLANE_DROP_DELAY_MS, AIRPLANE_ROW_MIN, AIRPLANE_ROW_MAX, AIRCRAFT_WARN_BLINK_MS, AUTOSAVE_THROTTLE_MS, atLevel } from './config.ts'
import { type GameState, addDropMinesInBand } from './game.ts'
import { createRng } from 'zx-kit'
import { startAirplane, stopAirplane, startFriendlyPlane, stopFriendlyPlane, startApproachSound, isApproachSoundActive, playReveal } from './audio.ts'
import { writeSaveThrottled } from 'zx-kit'
import { saveProfile } from './save.ts'
import { announce, status } from './a11y.ts'
import { L } from './lang.ts'

let dropScheduled = false
let dropTimer = 0

export function updateAirplane(state: GameState, dtMs: number): void {
  state.nextAircraftMs -= dtMs

  if (!state.airplane && state.phase === 'playing' &&
      state.nextAircraftMs <= AIRPLANE_APPROACH_MS && !isApproachSoundActive()) {
    startApproachSound()
    announce(L.STR_A11Y_PLANE_APPROACHING)   // screen-reader twin of the approach tone
  }

  if (state.nextAircraftMs <= 0 && !state.airplane && state.phase === 'playing') {
    spawnAirplane(state)
  }

  if (!state.airplane) return

  const plane = state.airplane
  const planeSpeed = (CANVAS_W + 32) / AIRPLANE_CROSS_MS

  plane.warningBlink = Math.floor(Date.now() / AIRCRAFT_WARN_BLINK_MS) % 2 === 0
  plane.x += plane.dir * planeSpeed * dtMs

  if (!plane.dropDone && !dropScheduled) {
    const mid = CANVAS_W / 2
    if ((plane.dir === 1 && plane.x > mid) || (plane.dir === -1 && plane.x < mid)) {
      dropScheduled = true
      dropTimer = AIRPLANE_DROP_DELAY_MS
    }
  }

  if (dropScheduled && !plane.dropDone) {
    dropTimer -= dtMs
    if (dropTimer <= 0) {
      const planeRow = Math.floor(plane.y / CELL)
      const minesBefore = state.totalMines
      addDropMinesInBand(state, plane.scheduledDropCount, planeRow, Math.min(planeRow + 2, ROWS - 1))
      const added = state.totalMines - minesBefore   // guard can place fewer than scheduled, even 0
      status(added > 0 ? L.STR_A11Y_PLANE_RESEEDED(added) : L.STR_A11Y_PLANE_PASSED)
      plane.dropDone = true
      dropScheduled = false
    }
  }

  const offscreen = plane.dir === 1 ? plane.x > CANVAS_W + 16 : plane.x < -16
  if (offscreen) {
    stopAirplane()   // enemy engine only — a friendly plane keeps its own drone
    state.airplane = null
    scheduleNext(state)
    // Autosave after each flyover — mine count just changed.
    writeSaveThrottled(saveProfile, 'auto', AUTOSAVE_THROTTLE_MS)
  }
}

function spawnAirplane(state: GameState): void {
  const cfg = atLevel(LEVEL_CONFIGS, state.level)
  let goRight: boolean, yRow: number, scheduledDropCount: number
  if (state.dropSeedBase !== null) {
    const rng = createRng(`${state.dropSeedBase}:pass${state.airplanePassIndex}`)
    goRight = rng.chance(0.5)
    yRow = rng.range(AIRPLANE_ROW_MIN, AIRPLANE_ROW_MAX + 1)
    scheduledDropCount = rng.range(cfg.acMineDropMin, cfg.acMineDropMax + 1)
  } else {
    goRight = Math.random() > 0.5
    yRow = AIRPLANE_ROW_MIN + Math.floor(Math.random() * (AIRPLANE_ROW_MAX - AIRPLANE_ROW_MIN + 1))
    scheduledDropCount = cfg.acMineDropMin + Math.floor(Math.random() * (cfg.acMineDropMax - cfg.acMineDropMin + 1))
  }
  dropScheduled = false
  dropTimer = 0
  state.airplane = {
    x: goRight ? -8 : CANVAS_W + 8,
    y: yRow * CELL,
    dir: goRight ? 1 : -1,
    active: true,
    dropDone: false,
    warningBlink: true,
    scheduledDropCount,
  }
  startAirplane()
}

// ── Friendly (white) recon plane — the green-gem reward ─────────────────────

/**
 * Summon the friendly plane (GREEN_GEMS_PER_PLANE green gems). Returns false if
 * one is already in the air — the caller then keeps the gems and simply retries
 * on the next green pickup (same "spend only on success" pattern as the cyan
 * reveal). Row and direction are PURELY seeded (`:friendly` stream, independent
 * of field state), so the N-th friendly pass is identical for every player of a
 * daily — even a row with nothing left to reveal, that's the fair roll.
 *
 * The reveal itself — a snapshot of every live mine currently in the row — is
 * committed to `revealedMines` right here at spawn, NOT as the plane passes:
 * the plane is never persisted, so a save mid-flight must not lose the reward.
 * The flight only animates it (see the reveal mask in renderer.ts).
 */
export function spawnFriendlyPlane(state: GameState): boolean {
  if (state.friendlyPlane) return false
  let goRight: boolean, row: number
  if (state.dropSeedBase !== null) {
    const rng = createRng(`${state.dropSeedBase}:friendly${state.friendlyPassIndex}`)
    goRight = rng.chance(0.5)
    row = rng.range(AIRPLANE_ROW_MIN, AIRPLANE_ROW_MAX + 1)
  } else {
    goRight = Math.random() > 0.5
    row = AIRPLANE_ROW_MIN + Math.floor(Math.random() * (AIRPLANE_ROW_MAX - AIRPLANE_ROW_MIN + 1))
  }
  state.friendlyPassIndex++

  const shown = new Set(state.revealedMines.map((m) => `${m.col},${m.row}`))
  const reveals = state.map.findById('mine')
    .filter(({ y }) => y === row)
    .map(({ x, y }) => ({ col: x, row: y }))
    .filter((m) => !shown.has(`${m.col},${m.row}`))
    .sort((a, b) => a.col - b.col)
  state.revealedMines.push(...reveals)

  state.friendlyPlane = {
    x: goRight ? -8 : CANVAS_W + 8,
    row,
    dir: goRight ? 1 : -1,
    blink: true,
    reveals,
  }
  startFriendlyPlane()
  playReveal()
  return true
}

export function updateFriendlyPlane(state: GameState, dtMs: number): void {
  const plane = state.friendlyPlane
  if (!plane) return
  const planeSpeed = (CANVAS_W + 32) / AIRPLANE_CROSS_MS
  plane.blink = Math.floor(Date.now() / AIRCRAFT_WARN_BLINK_MS) % 2 === 0
  plane.x += plane.dir * planeSpeed * dtMs

  const offscreen = plane.dir === 1 ? plane.x > CANVAS_W + 16 : plane.x < -16
  if (offscreen) {
    stopFriendlyPlane()   // friendly engine only — an enemy plane keeps its drone
    state.friendlyPlane = null
  }
}

function scheduleNext(state: GameState): void {
  const cfg = atLevel(LEVEL_CONFIGS, state.level)
  if (state.dropSeedBase !== null) {
    const rng = createRng(`${state.dropSeedBase}:next${state.airplanePassIndex}`)
    state.nextAircraftMs = rng.float(cfg.acMinMs, cfg.acMaxMs)
  } else {
    state.nextAircraftMs = cfg.acMinMs + Math.random() * (cfg.acMaxMs - cfg.acMinMs)
  }
  state.airplanePassIndex++
}
