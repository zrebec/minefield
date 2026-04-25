import { CANVAS_W, CELL, ROWS } from './constants.ts'
import { LEVEL_CONFIGS, AIRPLANE_CROSS_MS, AIRPLANE_APPROACH_MS } from './config.ts'
import { type GameState, addDropMines } from './game.ts'
import { startAirplane, stopAmbientSounds, startApproachSound, isApproachSoundActive } from './audio.ts'

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
      const cfg = LEVEL_CONFIGS[Math.min(state.level, LEVEL_CONFIGS.length - 1)]
      const count = cfg.acMineDropMin +
        Math.floor(Math.random() * (cfg.acMineDropMax - cfg.acMineDropMin + 1))
      addDropMines(state, count)
      plane.dropDone = true
      dropScheduled = false
    }
  }

  const offscreen = plane.dir === 1 ? plane.x > CANVAS_W + 16 : plane.x < -16
  if (offscreen) {
    stopAmbientSounds()
    state.airplane = null
    scheduleNext(state)
  }
}

function spawnAirplane(state: GameState): void {
  const goRight = Math.random() > 0.5
  const yRow = Math.floor(Math.random() * Math.floor(ROWS / 3))
  dropScheduled = false
  dropTimer = 0
  state.airplane = {
    x: goRight ? -8 : CANVAS_W + 8,
    y: yRow * CELL,
    dir: goRight ? 1 : -1,
    active: true,
    dropDone: false,
    warningBlink: true,
  }
  startAirplane()
}

function scheduleNext(state: GameState): void {
  const cfg = LEVEL_CONFIGS[Math.min(state.level, LEVEL_CONFIGS.length - 1)]
  state.nextAircraftMs = cfg.acMinMs + Math.random() * (cfg.acMaxMs - cfg.acMinMs)
}
