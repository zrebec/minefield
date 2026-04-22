import { CANVAS_W, CANVAS_H, C } from './constants.ts'
import { BLINK_INTERVAL_MS, EXPLOSION_FLASH_MS } from './config.ts'
import { createGame, type GameState } from './game.ts'
import { initInput, tickMovement, consumeFlag, consumeDebug, consumeAnyKey } from './input.ts'
import { initAudio } from './audio.ts'
import { movePlayer, respawnPlayer, toggleFlag } from './player.ts'
import { updateAirplane } from './airplane.ts'
import { renderFrame, renderIntro } from './renderer.ts'

type AppPhase = 'intro' | 'ingame'

let appPhase: AppPhase = 'intro'
let state: GameState = createGame(0)
let lastTime = 0
let blink = true
let blinkTimer = BLINK_INTERVAL_MS
let audioReady = false

function getCanvas(): HTMLCanvasElement {
  return document.getElementById('game') as HTMLCanvasElement
}

function getCtx(): CanvasRenderingContext2D {
  const ctx = getCanvas().getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return ctx
}

function setBorderColor(color: string): void {
  document.body.style.backgroundColor = color
}

function initAudioOnce(): void {
  if (!audioReady) {
    initAudio()
    audioReady = true
  }
}

function gameLoop(timestamp: number): void {
  const dt = Math.min(timestamp - lastTime, 100)
  lastTime = timestamp
  const ctx = getCtx()

  blinkTimer -= dt
  if (blinkTimer <= 0) {
    blink = !blink
    blinkTimer = BLINK_INTERVAL_MS
  }

  if (appPhase === 'intro') {
    setBorderColor(C.B_BLUE)
    if (consumeAnyKey()) {
      initAudioOnce()
      state = createGame(0)
      appPhase = 'ingame'
      setBorderColor(C.BLACK)
    }
    renderIntro(ctx, blink)
    requestAnimationFrame(gameLoop)
    return
  }

  if (consumeDebug()) state.debugMode = !state.debugMode
  state.blink = blink

  if (state.phase === 'playing') {
    const dir = tickMovement(dt)
    if (dir) movePlayer(state, dir)
    if (consumeFlag()) toggleFlag(state)
    updateAirplane(state, dt)
    setBorderColor(C.BLACK)

  } else if (state.phase === 'exploding') {
    state.flashTimer -= dt
    if (state.flashTimer > 0) {
      // Flash: biele/čierne záblesky — EXPLOSION_FLASH_MS / 100ms per flash
      state.flashOn = Math.floor(state.flashTimer / (EXPLOSION_FLASH_MS / 6)) % 2 === 0
      setBorderColor(state.flashOn ? C.B_WHITE : C.BLACK)
    } else {
      state.flashOn = false
      setBorderColor(C.BLACK)
      respawnPlayer(state)
      consumeAnyKey()  // discard mine-step key so gameover doesn't auto-skip
    }

  } else if (state.phase === 'levelcomplete') {
    setBorderColor(C.B_GREEN)
    state.levelCompleteTimer -= dt
    if (state.levelCompleteTimer <= 0) {
      const prevScore = state.score
      state = createGame(state.level + 1, prevScore)
    }

  } else if (state.phase === 'gameover') {
    setBorderColor(C.B_RED)
    if (consumeAnyKey()) {
      initAudioOnce()
      appPhase = 'intro'
      setBorderColor(C.B_BLUE)
    }
  }

  renderFrame(ctx, state)
  requestAnimationFrame(gameLoop)
}

function main(): void {
  const canvas = getCanvas()
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H

  initInput()
  setBorderColor(C.B_BLUE)

  window.addEventListener('keydown', () => initAudioOnce(), { once: true })
  window.addEventListener('click', () => initAudioOnce(), { once: true })

  requestAnimationFrame(gameLoop)
}

main()
