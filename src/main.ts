import { C, COLS, ROWS } from './constants.ts'
import { BLINK_INTERVAL_MS, EXPLOSION_FLASH_MS, WALK_DURATION_MS, INTRO_PAGE_MS, SCAN_RADIUS, SCAN_MAX_BEEPS } from './config.ts'
import { createGame, dailySeed, seedDate, nextDailySeed, tickTimer, tryToggleReveal, scanMines, isFinalLevel, type GameState, type GamePhase, type Dir } from './game.ts'
import { initInput, tickMovement, consumeFlag, consumeDebug, consumePause, consumeAnyKey, resetInput, consumeManualSave, consumeRandomMap, consumeDirFlag, isHeld, type Direction } from './input.ts'
import { initAudio, stopAmbientSounds, playStartupJingle, playGameOver, playWin, startIntroMusic, stopIntroMusic, playTypeClick, playSonarSweep, playExitBeacon, playFlagBlip, playFlagRemoveBlip, playBlockedMove, playPauseCue } from './audio.ts'
import { flashBorder, setupCanvas, curveDisplay, drawVolumeBar, type SpectrumColor, createBlinker, tickBlinker, writeSave, readSaveLatest, deleteSave, createDebugMonitor, beginFrame, endFrame, sampleDebug, drawDebugOverlay } from 'zx-kit'
import { movePlayer, respawnPlayer, toggleFlag, tickPlayer } from './player.ts'
import { updateAirplane, updateFriendlyPlane } from './airplane.ts'
import { renderFrame, renderIntro, renderHiScoreEntry, runStatRows } from './renderer.ts'
import { renderStoryCard, createStoryState, stepStory, isIntroDue, markIntroSeen } from './intro.ts'
import { isHighScore, saveHighScore, loadHighScores } from './highscore.ts'
import { saveProfile, setStateGetter } from './save.ts'
import { L, cycleLocale } from './lang.ts'
import { announce, status, setLegend, setMenu, describeExit, describeGems, describeOrientation } from './a11y.ts'

type AppPhase = 'story' | 'intro' | 'ingame' | 'hiscore'

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

// Intro attract-mode cycling (INTRO_PAGE_MS lives in config.ts)
let introPage = 0
let introPageTimer = INTRO_PAGE_MS

// Story intro ("The Strip"): a typewriter pre-roll. Shown when "due" (isIntroDue)
// on a mode start, or on demand via the title's `I` key. `storyReturn` is where it
// hands off when finished/skipped: into the chosen game, or back to the title.
let story = createStoryState()
let introMusicCard = -1              // which card's AY track is playing (-1 = none / not started)
let storyReturn: 'intro' | 'ingame' = 'intro'
let storyPendingRandom = false       // which mode to launch when storyReturn === 'ingame'
let introReplayPending = false       // title `I` key → replay the intro
let jingled = false                  // startup sting plays once per session (direct start only)

function getCtx(): CanvasRenderingContext2D {
  return (document.getElementById('game') as HTMLCanvasElement).getContext('2d')!
}

function setBorderColor(color: SpectrumColor): void {
  document.body.style.backgroundColor = color
}

function initAudioOnce(): void {
  // Unlock the AudioContext on the first user gesture. The startup jingle is no
  // longer fired here (it clashed with the intro AY) — it plays once on a direct
  // game-start instead (see the title mode-select).
  if (!audioReady) {
    initAudio()
    audioReady = true
  }
}

// The title menu as browsable screen-reader lines: the key list + the current
// high-score table (#sr-menu). Rebuilt on every title entry (scores change)
// and on a locale switch (language changes).
function titleMenuLines(): string[] {
  const lines: string[] = [...L.STR_A11Y_MENU_LINES]
  const scores = loadHighScores()
  if (scores.length === 0) {
    lines.push(L.STR_A11Y_MENU_NO_SCORES)
  } else {
    lines.push(L.STR_A11Y_MENU_SCORES)
    scores.forEach((e, i) => lines.push(L.STR_A11Y_MENU_SCORE_ROW(i + 1, e.name, e.score, e.level, e.date)))
  }
  return lines
}

// Mirror the end-of-run summary into #sr-menu — the NAVIGABLE (never aria-live)
// region, the same channel the title menu uses. Deliberately not spoken: the
// screens already announce one line each, and the owner's standing rule is no new
// spoken text (a11y.md §6) — a blind player browses the numbers at their own pace
// instead of having nine sentences read at them. Cleared by whatever comes next
// (enterTitle rebuilds it, enterHiScore empties it).
function mirrorRunStats(): void {
  setMenu(runStatRows(state).map((r) => `${r.label}: ${r.value}`))
}

// Land on the title. Every path back to the menu funnels through here so the
// attract cycle restarts AND the sr-only menu mirror exists exactly while the
// title's keys are live (startRun/enterStory drop it again on the way out).
function enterTitle(): void {
  appPhase = 'intro'
  introPage = 0
  introPageTimer = INTRO_PAGE_MS
  setBorderColor(C.B_BLUE)
  setMenu(titleMenuLines())
  // Assertive, not polite: a polite status set right at page load is easily missed
  // (the reader is still on the <title>), which read as "then silence". Assertive
  // interrupts and re-reads, so the one-line "press H" prompt is actually heard.
  announce(L.STR_A11Y_TITLE)
}

function enterHiScore(): void {
  hiName = []
  hiCursor = 0
  padLetterIdx = 0
  resetInput()
  setMenu([])   // the end-of-run stats belong to the screen we just left, not to name entry
  appPhase = 'hiscore'
  flashBorder(C.B_WHITE, 2, 80, C.B_CYAN)
}

// Exit beacon for the CURRENT player position — the tone twin of the spoken exit
// bearing (a11y.md §5). Volume = distance to the exit column, pitch = north/south.
// The E key only: NOT at run start (you're at max distance, so it'd be inaudible)
// nor on resume (that runs before the first gesture, so audio is still locked).
function exitBeacon(): void {
  playExitBeacon(COLS - 1 - state.playerCol, state.exitRow - state.playerRow)
}

// Toggle a flag and, if one was actually PLACED (not removed, not a blocked
// cell), play the positional flag earcon (a11y.md §6.4). No dir = the player's
// facing direction (the F key); an explicit dir = a SHIFT+arrow flag.
function commitFlag(dir?: Direction): void {
  const r = toggleFlag(state, dir)
  if (r?.action === 'placed') playFlagBlip(r.dCol, r.dRow)
  else if (r?.action === 'removed') playFlagRemoveBlip()  // tiny low tick — a flag was taken back
}

// Begin a fresh run in the chosen mode. No save can exist at the title
// (auto-resume skips it), so this is always a fresh level 1.
function startRun(random: boolean): void {
  initAudioOnce()
  stopAmbientSounds()
  // random ⇒ dropSeedBase null ⇒ off the leaderboard.
  state = createGame(0, 0, random ? undefined : dailySeed(0))
  writeSave(saveProfile, 'auto')   // make the run resumable from level 1
  resetInput()
  setMenu([])   // leaving the title — its menu keys are dead now, so the mirror goes too
  // One polite line: mode + start-of-run orientation (exit bearing + gem count). A
  // second status() call would overwrite this before a screen reader reads it.
  status(`${random ? L.STR_A11Y_MODE_RANDOM : L.STR_A11Y_MODE_DAILY} ${describeOrientation(state)}`)
  appPhase = 'ingame'
  setBorderColor(C.BLACK)
}

// Play the story intro. `returnTarget` is the hand-off when it finishes or is
// skipped: 'ingame' pre-rolls into `storyPendingRandom`'s mode; 'intro' → title.
function enterStory(returnTarget: 'intro' | 'ingame', random = false): void {
  story = createStoryState()
  storyReturn = returnTarget
  storyPendingRandom = random
  introMusicCard = -1
  resetInput()
  setMenu([])   // leaving the title — its menu keys are dead now, so the mirror goes too
  appPhase = 'story'
  setBorderColor(C.B_BLUE)
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

  if (appPhase === 'story') {
    setBorderColor(C.B_BLUE)
    tickMovement(dt)  // keep gamepad polled
    const pressed = consumeAnyKey() || consumePause()
    // The unlocking key/click only enables sound — it must not also skip the first
    // card (introMusicCard === -1 ⇒ no track has started for this story yet).
    const justEnabled = audioReady && introMusicCard === -1
    const before = Math.floor(story.revealed)
    stepStory(story, dt, justEnabled ? false : pressed)
    if (Math.floor(story.revealed) > before) playTypeClick()  // a fresh char appeared
    // Per-card underscore: (re)start the track whenever the visible card changes.
    if (audioReady && !story.finished && story.card !== introMusicCard) {
      startIntroMusic(story.card)
      introMusicCard = story.card
    }
    if (story.finished) {
      stopIntroMusic()
      introMusicCard = -1
      markIntroSeen()               // seen on finish OR skip — silence it for the window
      if (storyReturn === 'ingame') {
        startRun(storyPendingRandom)   // pre-roll done → into the chosen game
      } else {
        resetInput()
        enterTitle()                   // launched via I → back to the title
      }
    } else {
      renderStoryCard(ctx, story.card, Math.floor(story.revealed), blink)
    }
    finishFrame(ctx)
    return
  }

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
    if (introReplayPending) {
      introReplayPending = false
      consumeAnyKey()
      initAudioOnce()
      enterStory('intro')              // I → watch the intro, then back to the title
    } else if (startKeyPending || startRandomPending) {
      const random = startRandomPending
      startKeyPending = false
      startRandomPending = false
      consumeAnyKey()   // drain so no stale key reaches ingame
      initAudioOnce()
      if (isIntroDue()) {
        enterStory('ingame', random)   // pre-roll the intro, then start the chosen mode
      } else {
        if (!jingled) { playStartupJingle(); jingled = true }  // title sting, once, only when we skip the intro
        startRun(random)
      }
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
          // Date the entry by the daily it belongs to (origin date), not wall-clock,
          // so a resumed older daily scores under its own date. Random never reaches
          // here; daily always has the prefix; undefined falls back to today.
          saveHighScore({ name: hiName.join(''), score: state.score, level: state.level + 1, date: seedDate(state.dropSeedBase) ?? undefined })
          resetInput()
          enterTitle()
        }
      } else if (key === 'ESC') {
        resetInput()
        enterTitle()
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
    consumeFlag(); consumeDebug(); consumeDirFlag()  // drain unused buttons

    renderHiScoreEntry(ctx, hiName, hiCursor, blink, PAD_LETTERS[padLetterIdx])
    finishFrame(ctx)
    return
  }

  state.blink = blink

  if (state.phase === 'playing') {
    // R does nothing in-game — random is chosen only on the title. Still drain
    // the key so an in-game press can't linger and trigger a random start later.
    consumeRandomMap()

    // ── [D-GATE] sonar sweep + mine-reveal gate (a11y.md §5, 2026-07-19) ─────
    // D now does TWO things on every press while standing (paused = frozen:
    // drained + dropped):
    //  1. ALWAYS plays the sonar sweep of mines in SCAN_RADIUS — unlimited, for
    //     every player. Parity by construction: the audio channel costs nothing
    //     but the time the sweep sounds on the live clock (idle scouting is
    //     free, exactly like the visual reveal). Never a silent no-op — an
    //     empty radius plays the "all clear" blip.
    //  2. Attempts the VISUAL reveal, which keeps its own budget (random =
    //     RANDOM_REVEAL_LIMIT, daily = 0 → never shows) — a budgeted PEEK; the
    //     next step hides it again ("debug off" on move in BOTH the idle and
    //     running branches). A spent budget no longer beeps playDenied — the
    //     sweep IS the key's response.
    //
    // TO REVERT to idle-scout-only: move ONLY this `if` block to the
    // [D-GATE-IDLE-ANCHOR] mark inside the idle branch below (the
    // consumeDebug() drains in the running/paused branches are kept alive
    // exactly so this stays a one-block move), and update README (controls,
    // `D` row) + CLAUDE.md ("Debug keys") — recipe in CLAUDE.md → "D-reveal mode".
    if (consumeDebug() && state.runState !== 'paused') {
      playSonarSweep(scanMines(state, SCAN_RADIUS, SCAN_MAX_BEEPS))  // audio channel — always
      tryToggleReveal(state)                                         // visual channel — budgeted
    }

    if (state.runState === 'idle') {
      // [D-GATE-IDLE-ANCHOR] — revert target for the [D-GATE] line above.
      consumePause()  // drain P — can't pause before starting
      const dir = tickMovement(dt, WALK_DURATION_MS)
      // SHIFT held → the arrow was a directional-flag press, not a movement
      // attempt (see the SHIFT+arrow handling in input.ts / toggleFlag below).
      if (dir && !isHeld('Shift')) {
        state.runState = 'running'
        state.debugMode = false   // a step hides the reveal again (the peek ends; budget decides if D can re-arm)
        if (movePlayer(state, dir) === 'blocked') playBlockedMove()
      }
      if (consumeFlag()) commitFlag()
      const dirFlag = consumeDirFlag()
      if (dirFlag) commitFlag(dirFlag)
      setBorderColor(C.BLACK)

    } else if (state.runState === 'running') {
      tickTimer(state, dt)  // clock ticks only while actively running
      consumeDebug()  // no-op today ([D-GATE] consumes first); REQUIRED again after an idle-only revert — keep
      if (consumePause()) {
        state.runState = 'paused'; pausePage = 0
        announce(L.STR_A11Y_PAUSE)   // assertive → re-reads on every pause (status() would dedupe repeats)
        playPauseCue(true)           // descending toggle
      }

      if (state.comboTimer > 0) {
        state.comboTimer -= dt
        if (state.comboTimer <= 0) { state.comboTimer = 0; state.comboCount = 0 }
      }
      if (state.dropFlashTimer > 0) {
        state.dropFlashTimer -= dt
        if (state.dropFlashTimer <= 0) { state.dropFlashTimer = 0; state.droppedMines = [] }
      }
      if (tickPlayer(state, dt) === 'blocked') playBlockedMove()  // a buffered press landed on a wall
      const dir = tickMovement(dt, WALK_DURATION_MS)
      if (dir && !isHeld('Shift')) {
        state.debugMode = false  // a step hides the reveal (peek semantics — see [D-GATE])
        if (movePlayer(state, dir) === 'blocked') playBlockedMove()
      }
      if (consumeFlag()) commitFlag()
      const dirFlag = consumeDirFlag()
      if (dirFlag) commitFlag(dirFlag)
      updateAirplane(state, dt)
      updateFriendlyPlane(state, dt)
      setBorderColor(C.BLACK)

    } else {
      // paused — paged help screen; arrows leaf the pages, P resumes
      consumeDebug()  // no-op today ([D-GATE] consumes first); REQUIRED again after an idle-only revert — keep
      if (consumePause()) { state.runState = 'running'; playPauseCue(false) }  // ascending toggle — earcon only
      const pdir = tickMovement(dt, WALK_DURATION_MS)
      if (!isHeld('Shift')) {
        if (pdir === 'right' || pdir === 'down') pausePage = (pausePage + 1) % PAUSE_PAGES
        else if (pdir === 'left' || pdir === 'up') pausePage = (pausePage + PAUSE_PAGES - 1) % PAUSE_PAGES
      }
      consumeFlag()
      consumeDirFlag()  // drain — flagging (any direction) not available while paused
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
      if (state.lives > 0) announce(L.STR_A11Y_LIFE_LOST(state.lives))  // lives>0 ⇔ respawned (not game over)
      consumeAnyKey()  // discard mine-step key so gameover doesn't auto-skip
    }

  } else if (state.phase === 'levelcomplete') {
    if (prevGamePhase !== 'levelcomplete') status(L.STR_A11Y_LEVEL_DONE(state.level + 1))
    setBorderColor(C.B_GREEN)
    resetInput()
    state.levelCompleteTimer -= dt
    if (state.levelCompleteTimer <= 0) {
      if (isFinalLevel(state.level)) {
        // Cleared the final crossing → win, not another level. Keep the current
        // state (its final score) and hand off to the 'won' phase below.
        stopAmbientSounds()
        state.phase = 'won'
      } else {
        const prevScore = state.score
        const prevInventory = state.inventory
        // Run-scoped counters: a level advance builds a FRESH GameState, so the
        // summary has to be handed over explicitly or every stat restarts here.
        const prevStats = state.stats
        stopAmbientSounds()
        // random run stays random across levels; otherwise the daily field per level.
        // Keep the run on its ORIGIN date (don't re-derive from today) so a run that
        // crosses midnight / is resumed next day stays one coherent daily — and its
        // highscore is dated by the field actually played. Backpack carries over.
        const nextSeed = nextDailySeed(state.dropSeedBase, state.level + 1)
        state = createGame(state.level + 1, prevScore, nextSeed, prevInventory, prevStats)
        writeSave(saveProfile, 'auto')   // checkpoint at the start of every level
      }
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
        enterTitle()
      }
    }

  } else if (state.phase === 'won') {
    // Victory epilogue — same shell as game over (no save-scumming; a daily winner
    // that places goes to name entry), but a celebration instead of a defeat.
    setBorderColor(C.B_GREEN)
    tickMovement(dt)  // keep gamepad polled
    if (consumeAnyKey()) {
      resetInput()
      initAudioOnce()
      stopAmbientSounds()
      deleteSave(saveProfile, 'auto')
      deleteSave(saveProfile, 'manual')
      if (state.dropSeedBase !== null && isHighScore(state.score)) {
        enterHiScore()
      } else {
        enterTitle()
      }
    }
  }

  // Play the game-over jingle once on entry (covers both a fatal step and timeout).
  if (state.phase === 'gameover' && prevGamePhase !== 'gameover') {
    playGameOver()
    announce(L.STR_A11Y_GAMEOVER)
    mirrorRunStats()
  }
  // Victory jingle + spoken announcement once on entry.
  if (state.phase === 'won' && prevGamePhase !== 'won') {
    playWin()
    announce(L.STR_A11Y_WIN)
    mirrorRunStats()
  }

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
  setLegend(L.STR_A11Y_LEGEND_HINT)   // short hint only; H announces the full guide (no wall of text at start)

  window.addEventListener('keydown', () => initAudioOnce(), { once: true })
  window.addEventListener('click', () => initAudioOnce(), { once: true })

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!e.repeat && (e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey && !e.altKey && appPhase !== 'hiscore') {
      showDebug = !showDebug
      e.preventDefault()
      return
    }

    // On-demand audio-legend replay (Item B): blind players shouldn't have to
    // memorise the sound code. Every phase except hiscore, where H is a name letter.
    if (!e.repeat && (e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey && appPhase !== 'hiscore') {
      announce(L.STR_A11Y_LEGEND)
      e.preventDefault()
      return
    }

    if (appPhase === 'intro') {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 's' || e.key === 'S') {
        startKeyPending = true
      } else if (e.key === 'i' || e.key === 'I') {
        introReplayPending = true   // replay the story intro on demand
      } else if (e.key === 'l' || e.key === 'L') {
        cycleLocale()   // synchronous, safe to call directly — no pending flag needed
        setLegend(L.STR_A11Y_LEGEND_HINT)   // keep the guide hint in the new language
        setMenu(titleMenuLines())           // rebuild the menu mirror in the new language
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
    } else if (appPhase === 'ingame') {
      // On-demand orientation for blind players (Item C): E = exit bearing, G =
      // nearest gem. In-game only, so these letters never reach hiscore name entry.
      if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'e' || e.key === 'E') { announce(describeExit(state)); exitBeacon(); e.preventDefault() }
        else if (e.key === 'g' || e.key === 'G') { announce(describeGems(state)); e.preventDefault() }
      }
    }
  })

  // Resume an in-progress save straight into the game, skipping the title; the
  // run keeps its daily/random identity via dropSeedBase. Saves are cleared on
  // game over, so this only fires for an unfinished run. readSaveLatest mutates
  // `state` in place, so it's oriented for the resume announcement below.
  if (readSaveLatest(saveProfile).ok) {
    appPhase = 'ingame'
    status(describeOrientation(state))   // re-orient a blind player on resume
    // No exitBeacon() here: this runs at page load, before any user gesture, so
    // the AudioContext is still locked and the tone could never sound. E replays
    // the bearing with its beacon on demand once audio is unlocked.
  } else {
    enterTitle()   // cold load lands on the title — fill the sr-only menu mirror
  }

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
