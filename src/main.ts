import { C, CANVAS_W, CELL, ROWS } from './constants.ts'
import { BLINK_INTERVAL_MS, EXPLOSION_FLASH_MS, WALK_DURATION_MS } from './config.ts'
import { createGame, dailySeed, type GameState, type GamePhase } from './game.ts'
import { initInput, tickMovement, consumeFlag, consumeDebug, consumePause, consumeAnyKey, resetInput, consumeVolUp, consumeVolDown, consumeManualSave } from './input.ts'
import { initAudio, stopAmbientSounds, playStartupJingle, increaseVolume, decreaseVolume, getMasterVolume } from './audio.ts'
import { flashBorder, setupCanvas, curveDisplay, drawProgressBar, tickUI, renderUI, resetUI, type SpectrumColor, createBlinker, tickBlinker, writeSave, readSaveLatest, deleteSave } from 'zx-kit'
import { movePlayer, respawnPlayer, toggleFlag, tickPlayer } from './player.ts'
import { updateAirplane } from './airplane.ts'
import { renderFrame, renderIntro, renderHiScoreEntry } from './renderer.ts'
import { isHighScore, saveHighScore } from './assets/highscore.ts'
import { saveProfile, setStateGetter } from './save.ts'

type AppPhase = 'intro' | 'ingame' | 'hiscore'

let appPhase: AppPhase = 'intro'
let state: GameState = createGame(0)
setStateGetter(() => state)
let lastTime = 0
const blinker = createBlinker(BLINK_INTERVAL_MS)
let audioReady = false
let prevGamePhase: GamePhase = 'playing'

// Name entry state for hiscore phase
let hiName: string[] = []
let hiCursor = 0
const letterQueue: string[] = []
const PAD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ '
let padLetterIdx = 0

// Intro: only Space / Enter / S start the game
let startKeyPending = false

const VOL_BAR_W = 10 * CELL  // 10 chars × 8 px
const VOL_BAR_X = (CANVAS_W - VOL_BAR_W) / 2
const VOL_BAR_Y = Math.floor(ROWS / 2) * CELL

function volBar() {
  return {
    id: 'volume',
    x: VOL_BAR_X,
    y: VOL_BAR_Y,
    width: VOL_BAR_W,
    value: getMasterVolume(),
    ink: C.B_GREEN,
    paper: C.BLACK,
    border: { style: 'solid' as const },
    visibilityLength: 1500,
  }
}

// Intro attract-mode cycling
const INTRO_PAGE_MS = 3000
let introPage = 0
let introPageTimer = INTRO_PAGE_MS

function getCtx(): CanvasRenderingContext2D {
  return (document.getElementById('game') as HTMLCanvasElement).getContext('2d')!
}

function setBorderColor(color: SpectrumColor): void {
  document.body.style.backgroundColor = color
}

function initAudioOnce(): void {
  if (!audioReady) {
    initAudio()
    audioReady = true
    playStartupJingle()
  }
}

function enterHiScore(): void {
  hiName = []
  hiCursor = 0
  padLetterIdx = 0
  resetInput(); resetUI()
  appPhase = 'hiscore'
  flashBorder(C.B_WHITE, 2, 80, C.B_CYAN)
}

function gameLoop(timestamp: number): void {
  const dt = Math.min(timestamp - lastTime, 100)
  lastTime = timestamp
  const ctx = getCtx()

  // Global volume control — drawProgressBar registers state; renderUI redraws after world render
  if (consumeVolUp()) { increaseVolume(); drawProgressBar(ctx, volBar()) }
  if (consumeVolDown()) { decreaseVolume(); drawProgressBar(ctx, volBar()) }

  const blink = tickBlinker(blinker, dt)

  if (appPhase === 'intro') {
    setBorderColor(C.B_BLUE)
    introPageTimer -= dt
    if (introPageTimer <= 0) {
      introPage++
      introPageTimer = INTRO_PAGE_MS
    }
    tickMovement(dt)  // keep gamepad polled
    if (consumePause()) startKeyPending = true  // gamepad Start button starts game
    if (startKeyPending) {
      startKeyPending = false
      consumeAnyKey()   // drain so no stale key reaches ingame
      initAudioOnce()
      stopAmbientSounds()
      state = createGame(0, 0, dailySeed(0))   // daily field — same for everyone today
      readSaveLatest(saveProfile)   // mutates state in-place if a save exists
      introPage = 0
      introPageTimer = INTRO_PAGE_MS
      resetInput(); resetUI()
      appPhase = 'ingame'
      setBorderColor(C.BLACK)
    }
    renderIntro(ctx, blink, introPage)
    tickUI(dt); renderUI(ctx)
    requestAnimationFrame(gameLoop)
    return
  }

  if (appPhase === 'hiscore') {
    while (letterQueue.length > 0) {
      const key = letterQueue.shift()!
      if (key === 'BS') {
        if (hiCursor > 0) { hiName.pop(); hiCursor-- }
        padLetterIdx = 0
      } else if (key === 'ENTER') {
        if (hiCursor >= 1) {
          saveHighScore({ name: hiName.join('').padEnd(3, ' '), score: state.score, level: state.level + 1 })
          resetInput(); resetUI()
          appPhase = 'intro'
          setBorderColor(C.B_BLUE)
        }
      } else if (key === 'ESC') {
        resetInput(); resetUI()
        appPhase = 'intro'
        setBorderColor(C.B_BLUE)
      } else if (hiCursor < 3) {
        hiName.push(key)
        hiCursor++
        padLetterIdx = 0
      }
    }

    // Gamepad D-pad letter cycling
    const padDir = tickMovement(dt)
    if (padDir === 'up')   padLetterIdx = (padLetterIdx + 1) % PAD_LETTERS.length
    if (padDir === 'down') padLetterIdx = (padLetterIdx + PAD_LETTERS.length - 1) % PAD_LETTERS.length
    if (padDir === 'right' && hiCursor < 3) letterQueue.push(PAD_LETTERS[padLetterIdx])
    if (padDir === 'left')                  letterQueue.push('BS')
    if (consumePause()) {
      if (hiCursor < 3) letterQueue.push(PAD_LETTERS[padLetterIdx])
      letterQueue.push('ENTER')
    }
    consumeFlag(); consumeDebug()  // drain unused gamepad buttons

    renderHiScoreEntry(ctx, hiName, hiCursor, blink, PAD_LETTERS[padLetterIdx])
    tickUI(dt); renderUI(ctx)
    requestAnimationFrame(gameLoop)
    return
  }

  state.blink = blink

  if (state.phase === 'playing') {
    if (state.runState === 'idle') {
      // Debug available only in idle — scout before starting
      if (consumeDebug()) state.debugMode = !state.debugMode
      consumePause()  // drain P — can't pause before starting
      const dir = tickMovement(dt, WALK_DURATION_MS)
      if (dir) {
        state.runState = 'running'
        state.debugMode = false   // debug off permanently for this level
        movePlayer(state, dir)
      }
      if (consumeFlag()) toggleFlag(state)
      setBorderColor(C.BLACK)

    } else if (state.runState === 'running') {
      consumeDebug()  // drain — debug not available while running
      if (consumePause()) state.runState = 'paused'

      if (state.comboTimer > 0) {
        state.comboTimer -= dt
        if (state.comboTimer <= 0) { state.comboTimer = 0; state.comboCount = 0 }
      }
      if (state.dropFlashTimer > 0) {
        state.dropFlashTimer -= dt
        if (state.dropFlashTimer <= 0) { state.dropFlashTimer = 0; state.droppedMines = [] }
      }
      tickPlayer(state, dt)
      const dir = tickMovement(dt, WALK_DURATION_MS)
      if (dir) movePlayer(state, dir)
      if (consumeFlag()) toggleFlag(state)
      updateAirplane(state, dt)
      setBorderColor(C.BLACK)

    } else {
      // paused — drain all inputs except P
      consumeDebug()
      if (consumePause()) state.runState = 'running'
      tickMovement(dt, WALK_DURATION_MS)   // drain direction queue
      consumeFlag()
    }

    // Manual save (SHIFT+S) — works in any runState of 'playing'
    if (consumeManualSave()) {
      const result = writeSave(saveProfile, 'manual')
      if (result.ok) flashBorder(C.B_CYAN, 1, 100)
    }

  } else if (state.phase === 'exploding') {
    if (prevGamePhase !== 'exploding') flashBorder(C.B_WHITE, 3, 100)
    state.flashTimer -= dt
    if (state.flashTimer > 0) {
      state.flashOn = Math.floor(state.flashTimer / (EXPLOSION_FLASH_MS / 6)) % 2 === 0
    } else {
      state.flashOn = false
      respawnPlayer(state)
      consumeAnyKey()  // discard mine-step key so gameover doesn't auto-skip
    }

  } else if (state.phase === 'levelcomplete') {
    setBorderColor(C.B_GREEN)
    resetInput(); resetUI()
    state.levelCompleteTimer -= dt
    if (state.levelCompleteTimer <= 0) {
      const prevScore = state.score
      stopAmbientSounds()
      state = createGame(state.level + 1, prevScore, dailySeed(state.level + 1))   // daily field per level
      writeSave(saveProfile, 'auto')   // checkpoint at the start of every level
    }

  } else if (state.phase === 'gameover') {
    setBorderColor(C.B_RED)
    tickMovement(dt)  // keep gamepad polled
    if (consumeAnyKey()) {
      resetInput(); resetUI()
      initAudioOnce()
      stopAmbientSounds()
      // No save scumming — saves are cleared on game over (Spectrum philosophy)
      deleteSave(saveProfile, 'auto')
      deleteSave(saveProfile, 'manual')
      if (isHighScore(state.score)) {
        enterHiScore()
      } else {
        appPhase = 'intro'
        setBorderColor(C.B_BLUE)
      }
    }
  }

  prevGamePhase = state.phase
  renderFrame(ctx, state)
  tickUI(dt); renderUI(ctx)
  requestAnimationFrame(gameLoop)
}

function main(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement
  setupCanvas(canvas, 4)
  curveDisplay(canvas, 0.6)
  // CSS handles responsive display — clear inline size set by setupCanvas
  canvas.style.width = ''
  canvas.style.height = ''

  initInput()
  setBorderColor(C.B_BLUE)

  window.addEventListener('keydown', () => initAudioOnce(), { once: true })
  window.addEventListener('click', () => initAudioOnce(), { once: true })

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (appPhase === 'intro') {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 's' || e.key === 'S') {
        startKeyPending = true
      }
    } else if (appPhase === 'hiscore') {
      if (e.key.length === 1 && /[A-Za-z]/.test(e.key)) {
        letterQueue.push(e.key.toUpperCase())
      } else if (e.key === 'Backspace') {
        letterQueue.push('BS')
      } else if (e.key === 'Enter') {
        letterQueue.push('ENTER')
      } else if (e.key === 'Escape') {
        letterQueue.push('ESC')
      }
    }
  })

  requestAnimationFrame(gameLoop)
}

main()
