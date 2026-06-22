import { C, COLS, ROWS } from './constants.ts'
import { BLINK_INTERVAL_MS, EXPLOSION_FLASH_MS, WALK_DURATION_MS } from './config.ts'
import { createGame, dailySeed, tickTimer, tryToggleReveal, type GameState, type GamePhase, type Dir } from './game.ts'
import { initInput, tickMovement, consumeFlag, consumeDebug, consumePause, consumeAnyKey, resetInput, consumeManualSave, consumeRandomMap } from './input.ts'
import { initAudio, stopAmbientSounds, playStartupJingle, playGameOver } from './audio.ts'
import { flashBorder, setupCanvas, curveDisplay, drawVolumeBar, type SpectrumColor, createBlinker, tickBlinker, writeSave, readSaveLatest, deleteSave, createDebugMonitor, beginFrame, endFrame, sampleDebug, drawDebugOverlay } from 'zx-kit'
import { movePlayer, respawnPlayer, toggleFlag, tickPlayer } from './player.ts'
import { updateAirplane } from './airplane.ts'
import { renderFrame, renderIntro, renderHiScoreEntry } from './renderer.ts'
import { isHighScore, saveHighScore } from './assets/highscore.ts'
import { saveProfile, setStateGetter } from './save.ts'
import { L } from './lang.ts'

type AppPhase = 'intro' | 'ingame' | 'hiscore'

let appPhase: AppPhase = 'intro'
let state: GameState = createGame(0, 0, dailySeed(0))  // placeholder; replaced on resume/start
setStateGetter(() => state)
let lastTime = 0
// Capture mode (dev-only): when true the loop stops ticking/rendering so a
// manually installed frame stays on screen for a deterministic screenshot.
let frozen = false
const blinker = createBlinker(BLINK_INTERVAL_MS)
let audioReady = false
let prevGamePhase: GamePhase = 'playing'
// A run's daily/random identity is the single source of truth on the state:
// state.dropSeedBase === null ⇔ random. No separate flag to drift out of sync.

// Name entry state for hiscore phase
let hiName: string[] = []
let hiCursor = 0
const letterQueue: string[] = []
const PAD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ '
let padLetterIdx = 0

// Intro: Space / Enter / S (or gamepad Start) begin the daily run; R begins a random run.
let startKeyPending = false
let startRandomPending = false

// Debug mode
const dbg = createDebugMonitor({ targetFps: 60 })
let showDebug = false

// Pause screen paging (controls / gems / scoring); count from the i18n titles.
const PAUSE_PAGES = L.STR_PAUSE_TITLES.length
let pausePage = 0

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
  resetInput()
  appPhase = 'hiscore'
  flashBorder(C.B_WHITE, 2, 80, C.B_CYAN)
}

function finishFrame(ctx: CanvasRenderingContext2D): void {
  endFrame(dbg)
  // Built-in volume HUD: +/- keys are wired by initInput(); this auto-shows the
  // bar ~1.5 s after a change and hides itself. Defaults match the old volBar().
  drawVolumeBar(ctx)
  if (showDebug) {
    drawDebugOverlay(ctx, sampleDebug(dbg, {
      app: appPhase,
      phase: state.phase,
      run: state.runState,
      lvl: state.level + 1,
      mines: state.map.findById('mine').length,
    }))
  }
  requestAnimationFrame(gameLoop)
}

function gameLoop(timestamp: number): void {
  if (frozen) return  // capture mode: keep the manually rendered frame
  beginFrame(dbg, timestamp)
  const dt = Math.min(timestamp - lastTime, 100)
  lastTime = timestamp
  const ctx = getCtx()

  const blink = tickBlinker(blinker, dt)

  if (appPhase === 'intro') {
    setBorderColor(C.B_BLUE)
    introPageTimer -= dt
    if (introPageTimer <= 0) {
      introPage++
      introPageTimer = INTRO_PAGE_MS
    }
    tickMovement(dt)  // keep gamepad polled
    if (consumePause()) startKeyPending = true         // gamepad Start = daily
    if (consumeRandomMap()) startRandomPending = true  // R = random (title only)
    if (startKeyPending || startRandomPending) {
      const random = startRandomPending
      startKeyPending = false
      startRandomPending = false
      consumeAnyKey()   // drain so no stale key reaches ingame
      initAudioOnce()
      stopAmbientSounds()
      // No save can exist at the title (auto-resume skips it when one does), so
      // this is always a fresh run. random ⇒ dropSeedBase null ⇒ off the board.
      state = createGame(0, 0, random ? undefined : dailySeed(0))
      writeSave(saveProfile, 'auto')   // make the run resumable from level 1
      introPage = 0
      introPageTimer = INTRO_PAGE_MS
      resetInput()
      appPhase = 'ingame'
      setBorderColor(C.BLACK)
    }
    renderIntro(ctx, blink, introPage)
    finishFrame(ctx)
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
          resetInput()
          appPhase = 'intro'
          setBorderColor(C.B_BLUE)
        }
      } else if (key === 'ESC') {
        resetInput()
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
    if (padDir === 'up') padLetterIdx = (padLetterIdx + 1) % PAD_LETTERS.length
    if (padDir === 'down') padLetterIdx = (padLetterIdx + PAD_LETTERS.length - 1) % PAD_LETTERS.length
    if (padDir === 'right' && hiCursor < 3) letterQueue.push(PAD_LETTERS[padLetterIdx])
    if (padDir === 'left') letterQueue.push('BS')
    if (consumePause()) {
      if (hiCursor < 3) letterQueue.push(PAD_LETTERS[padLetterIdx])
      letterQueue.push('ENTER')
    }
    consumeFlag(); consumeDebug()  // drain unused gamepad buttons

    renderHiScoreEntry(ctx, hiName, hiCursor, blink, PAD_LETTERS[padLetterIdx])
    finishFrame(ctx)
    return
  }

  state.blink = blink

  if (state.phase === 'playing') {
    // R does nothing in-game — random is chosen only on the title. Still drain
    // the key so an in-game press can't linger and trigger a random start later.
    consumeRandomMap()

    if (state.runState === 'idle') {
      // Debug reveal available only in idle — scout before starting. Budget-gated:
      // disabled on the scored daily, finite on random/practice (see tryToggleReveal).
      if (consumeDebug()) tryToggleReveal(state)
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
      tickTimer(state, dt)  // clock ticks only while actively running
      consumeDebug()  // drain — debug not available while running
      if (consumePause()) { state.runState = 'paused'; pausePage = 0 }

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
      // paused — paged help screen; arrows leaf the pages, P resumes
      consumeDebug()
      if (consumePause()) state.runState = 'running'
      const pdir = tickMovement(dt, WALK_DURATION_MS)
      if (pdir === 'right' || pdir === 'down') pausePage = (pausePage + 1) % PAUSE_PAGES
      else if (pdir === 'left' || pdir === 'up') pausePage = (pausePage + PAUSE_PAGES - 1) % PAUSE_PAGES
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
    resetInput()
    state.levelCompleteTimer -= dt
    if (state.levelCompleteTimer <= 0) {
      const prevScore = state.score
      const prevInventory = state.inventory
      const wasRandom = state.dropSeedBase === null
      stopAmbientSounds()
      // random run stays random across levels; otherwise the daily field per level.
      // Backpack carries over (it's the player's, not the field's).
      state = createGame(state.level + 1, prevScore, wasRandom ? undefined : dailySeed(state.level + 1), prevInventory)
      writeSave(saveProfile, 'auto')   // checkpoint at the start of every level
    }

  } else if (state.phase === 'gameover') {
    setBorderColor(C.B_RED)
    tickMovement(dt)  // keep gamepad polled
    if (consumeAnyKey()) {
      resetInput()
      initAudioOnce()
      stopAmbientSounds()
      // No save scumming — saves are cleared on game over (Spectrum philosophy)
      deleteSave(saveProfile, 'auto')
      deleteSave(saveProfile, 'manual')
      // Random runs never reach the leaderboard — otherwise you could practise
      // an easy map, farm a score and "beat" the daily. (dropSeedBase null = random.)
      if (state.dropSeedBase !== null && isHighScore(state.score)) {
        enterHiScore()
      } else {
        appPhase = 'intro'
        setBorderColor(C.B_BLUE)
      }
    }
  }

  // Play the game-over jingle once on entry (covers both a fatal step and timeout).
  if (state.phase === 'gameover' && prevGamePhase !== 'gameover') playGameOver()

  prevGamePhase = state.phase
  renderFrame(ctx, state, pausePage)
  finishFrame(ctx)
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
    if (!e.repeat && (e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey && !e.altKey && appPhase !== 'hiscore') {
      showDebug = !showDebug
      e.preventDefault()
      return
    }

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

  // Resume an in-progress save straight into the game, skipping the title; the
  // run keeps its daily/random identity via dropSeedBase. Saves are cleared on
  // game over, so this only fires for an unfinished run.
  if (readSaveLatest(saveProfile).ok) appPhase = 'ingame'

  requestAnimationFrame(gameLoop)
}

main()

// ─── Capture hook (dev-only, stripped from production builds) ──────────────────
// Drives deterministic screenshots for docs (scripts/capture.mjs). Deliberately
// has NO way to fake state — only real gameplay: start a fixed-seed game and take
// genuine moves (the actual movePlayer + walk). Every captured frame is therefore
// a state the game can really reach (score, backpack, trail all consistent).
// Tree-shaken out when import.meta.env.DEV is false.
if (import.meta.env.DEV) {
  // Read-only snapshot — lets the capture script route the player (BFS around
  // mines/buildings) without ever mutating the game's own state.
  const snapshot = () => ({
    phase: state.phase,
    runState: state.runState,
    player: { col: state.playerCol, row: state.playerRow },
    startRow: state.startRow,
    score: state.score,
    lives: state.lives,
    inventory: { ...state.inventory },
    revealedMines: state.revealedMines.map((m) => ({ ...m })),
    cols: COLS,
    rows: ROWS,
    gems: state.map.findById('gem').map(({ x, y, tile }) => ({ col: x, row: y, kind: tile.metadata?.gemKind as string })),
    mines: state.map.findById('mine').map(({ x, y }) => ({ col: x, row: y })),
    buildings: state.map.findById('building').map(({ x, y }) => ({ col: x, row: y })),
  })
    ; (window as unknown as Record<string, unknown>).__mf = {
      newGame(seed?: string) {                       // authentic fresh level (no injection)
        frozen = true
        state = createGame(0, 0, seed)
        appPhase = 'ingame'
        renderFrame(getCtx(), state)
        return snapshot()
      },
      steps(dirs: Dir[]) {                           // take REAL moves (movePlayer + walk to completion)
        for (const dir of dirs) {
          // mirror main.ts: the first move leaves the idle 'scout' state
          if (state.runState === 'idle') { state.runState = 'running'; state.debugMode = false }
          movePlayer(state, dir)
          tickPlayer(state, WALK_DURATION_MS + 5)
        }
        renderFrame(getCtx(), state)
        return snapshot()
      },
      setDebug(on: boolean) {                        // the real idle-only debug toggle
        state.debugMode = on
        renderFrame(getCtx(), state)
        return snapshot()
      },
      showIntro(page = 0): void {                    // the title screen
        frozen = true
        appPhase = 'intro'
        renderIntro(getCtx(), true, page)
      },
      field: snapshot,                               // read-only, for routing only
    }
}
