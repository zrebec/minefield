import { CANVAS_W, CELL, ROWS } from './constants.ts'
import { LEVEL_CONFIGS, AIRPLANE_CROSS_MS, AIRPLANE_APPROACH_MS } from './config.ts'
import { type GameState, addDropMinesInBand } from './game.ts'
import { createRng } from 'zx-kit'
import { startAirplane, stopAmbientSounds, startApproachSound, isApproachSoundActive } from './audio.ts'
import { writeSaveThrottled } from 'zx-kit'
import { saveProfile } from './save.ts'

const DROP_DELAY_MS = 1000

let dropScheduled = false
let dropTimer = 0

export function updateAirplane(state: GameState, dtMs: number): void {
  state.nextAircraftMs -= dtMs

  if (!state.airplane && state.phase === 'playing' &&
      state.nextAircraftMs <= AIRPLANE_APPROACH_MS && !isApproachSoundActive()) {
    startApproachSound()
  }

  if (state.nextAircraftMs <= 0 && !state.airplane && state.phase === 'playing') {
    spawnAirplane(state)
  }

  if (!state.airplane) return

  const plane = state.airplane
  const planeSpeed = (CANVAS_W + 32) / AIRPLANE_CROSS_MS

  plane.warningBlink = Math.floor(Date.now() / 250) % 2 === 0
  plane.x += plane.dir * planeSpeed * dtMs

  if (!plane.dropDone && !dropScheduled) {
    const mid = CANVAS_W / 2
    if ((plane.dir === 1 && plane.x > mid) || (plane.dir === -1 && plane.x < mid)) {
      dropScheduled = true
      dropTimer = DROP_DELAY_MS
    }
  }

  if (dropScheduled && !plane.dropDone) {
    dropTimer -= dtMs
    if (dropTimer <= 0) {
      const planeRow = Math.floor(plane.y / CELL)
      addDropMinesInBand(state, plane.scheduledDropCount, planeRow, Math.min(planeRow + 2, ROWS - 1))
      plane.dropDone = true
      dropScheduled = false
    }
  }

  const offscreen = plane.dir === 1 ? plane.x > CANVAS_W + 16 : plane.x < -16
  if (offscreen) {
    stopAmbientSounds()
    state.airplane = null
    scheduleNext(state)
    // Autosave after each flyover — mine count just changed.
    writeSaveThrottled(saveProfile, 'auto', 5000)
  }
}

function spawnAirplane(state: GameState): void {
  const cfg = LEVEL_CONFIGS[Math.min(state.level, LEVEL_CONFIGS.length - 1)]
  let goRight: boolean, yRow: number, scheduledDropCount: number
  if (state.dropSeedBase !== null) {
    const rng = createRng(`${state.dropSeedBase}:pass${state.airplanePassIndex}`)
    goRight = rng.chance(0.5)
    yRow = rng.int(ROWS - 2)
    scheduledDropCount = rng.range(cfg.acMineDropMin, cfg.acMineDropMax + 1)
  } else {
    goRight = Math.random() > 0.5
    yRow = Math.floor(Math.random() * (ROWS - 2))
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

function scheduleNext(state: GameState): void {
  const cfg = LEVEL_CONFIGS[Math.min(state.level, LEVEL_CONFIGS.length - 1)]
  if (state.dropSeedBase !== null) {
    const rng = createRng(`${state.dropSeedBase}:next${state.airplanePassIndex}`)
    state.nextAircraftMs = rng.float(cfg.acMinMs, cfg.acMaxMs)
  } else {
    state.nextAircraftMs = cfg.acMinMs + Math.random() * (cfg.acMaxMs - cfg.acMinMs)
  }
  state.airplanePassIndex++
}
