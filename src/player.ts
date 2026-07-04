import { CELL, COLS, ROWS } from './constants.ts'
import { START_COL, SCORE_PER_CELL, SCORE_MULTIPLIERS, EXPLOSION_FLASH_MS, LEVEL_COMPLETE_DELAY_MS, GEM_SCORE, GEM_TIME_BONUS_MS, GOLD_SCORE_BONUS, RED_GEMS_PER_LIFE, CYAN_GEMS_PER_REVEAL, COMBO_DURATION_MS, COMBO_MAX_MULTIPLIER, DAY_STEPS, NIGHT_STEPS, WALK_DURATION_MS, atLevel } from './config.ts'
import { type GameState, countWarningMines, applyClusterBlast, revealMine, cellKey, inventoryTotal, INVENTORY_CAP, type MineType } from './game.ts'
import type { Direction } from './input.ts'
import { playWarning, playExplosion, playGemCollect, playFootstep, playExtraLife, playReveal, isAmbientSoundActive } from './audio.ts'
import { makeTileVisited, TILE_EXPLODED } from './sprites.ts'
import { createTween, tickTween, tickAnimation, resetAnimation } from 'zx-kit'

function cellVariant(col: number, row: number): 'a' | 'b' {
  return (col + row) % 2 === 0 ? 'a' : 'b'
}

function comboMultiplier(comboCount: number): number {
  return Math.min(1 + (comboCount - 1) * 0.1, COMBO_MAX_MULTIPLIER)
}

// Per-frame walk progression: ticks the active tween + animation, then drains
// any buffered direction so continuous key-hold flows step-to-step without gap.
export function tickPlayer(state: GameState, dt: number): void {
  if (state.walkTween) {
    tickAnimation(state.walkAnim, dt)
    tickTween(state.walkTween, dt)
    // tickTween's onComplete clears walkTween (commitMove / completeLevel)
  }
  if (!state.walkTween && state.bufferedDir && state.phase === 'playing') {
    const dir = state.bufferedDir
    state.bufferedDir = null
    movePlayer(state, dir)
  }
}

export function movePlayer(state: GameState, dir: Direction): void {
  if (state.phase !== 'playing') return

  // Already walking → buffer this press for when the current step lands
  if (state.walkTween) {
    state.bufferedDir = dir
    return
  }

  state.playerDir = dir
  const newCol = state.playerCol + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
  const newRow = state.playerRow + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)

  // Walking off the right edge — animated exit, level-complete on tween end
  if (newCol >= COLS) {
    resetAnimation(state.walkAnim)
    state.walkTween = createTween(
      state.playerCol * CELL, state.playerRow * CELL,
      newCol * CELL, newRow * CELL,
      WALK_DURATION_MS,
      { onComplete: () => completeLevel(state) },
    )
    return
  }

  if (newCol < 0 || newRow < 0 || newRow >= ROWS) return

  const tile = state.map.getTile(newCol, newRow)
  if (tile === null) return
  if (tile.solid) return

  resetAnimation(state.walkAnim)
  state.walkTween = createTween(
    state.playerCol * CELL, state.playerRow * CELL,
    newCol * CELL, newRow * CELL,
    WALK_DURATION_MS,
    { onComplete: () => commitMove(state, newCol, newRow) },
  )
}

function completeLevel(state: GameState): void {
  state.walkTween = null
  state.bufferedDir = null
  state.phase = 'levelcomplete'
  state.levelCompleteTimer = LEVEL_COMPLETE_DELAY_MS
}

function commitMove(state: GameState, newCol: number, newRow: number): void {
  state.walkTween = null

  // Re-query: airplane could have dropped a mine on this cell during the walk
  const tile = state.map.getTile(newCol, newRow)
  if (tile === null) return

  if (tile.id === 'mine') {
    const mineType = tile.metadata?.mineType as MineType
    if (mineType === 'cluster') applyClusterBlast(state, newCol, newRow)
    state.map.setTile(newCol, newRow, TILE_EXPLODED)
    state.flags.delete(cellKey(newCol, newRow)) // detonation — the only way a flag dies
    state.explodedMines++
    state.playerCol = newCol
    state.playerRow = newRow
    state.bufferedDir = null
    state.phase = 'exploding'
    state.flashTimer = EXPLOSION_FLASH_MS
    state.flashOn = true
    playExplosion()
    return
  }

  state.playerCol = newCol
  state.playerRow = newRow

  const hadGem = tile.id === 'gem'
  const gemKind = hadGem ? ((tile.metadata?.gemKind as string) ?? 'cyan') : undefined
  // A full backpack can't claim a gem: leave it on the field (cell stays a gem,
  // not visited) so it's collectible again once a slot frees up.
  const collectGem = hadGem && inventoryTotal(state.inventory) < INVENTORY_CAP
  const claimsCell = !hadGem || collectGem

  if (claimsCell && tile.id !== 'visited') {
    state.map.setTile(newCol, newRow, makeTileVisited(cellVariant(newCol, newRow), state.terrain))
    state.comboCount++
    state.comboTimer = COMBO_DURATION_MS
    const levelMult = atLevel(SCORE_MULTIPLIERS, state.level)
    const cMult = comboMultiplier(state.comboCount)
    state.score += Math.round(SCORE_PER_CELL * levelMult * cMult)

    state.cycleSteps--
    if (state.cycleSteps <= 0) {
      state.isNight = !state.isNight
      state.cycleSteps = state.isNight ? NIGHT_STEPS : DAY_STEPS
    }
  }

  if (collectGem && gemKind) {
    state.inventory[gemKind] = (state.inventory[gemKind] ?? 0) + 1
    state.gemsCollected++
    state.timeLeftMs += GEM_TIME_BONUS_MS[gemKind] ?? 0  // time bonus by gem colour
    const cMult = comboMultiplier(state.comboCount)
    state.score += Math.round(GEM_SCORE * cMult)
    playGemCollect(state.comboCount)
    // Every RED_GEMS_PER_LIFE red gems convert into an extra life, freeing slots.
    if (gemKind === 'red' && state.inventory.red >= RED_GEMS_PER_LIFE) {
      state.inventory.red -= RED_GEMS_PER_LIFE
      state.lives++
      playExtraLife()
    }
    // Every CYAN_GEMS_PER_REVEAL cyan gems reveal one live mine (only spend the
    // gems if a mine was actually revealed).
    if (gemKind === 'cyan' && state.inventory.cyan >= CYAN_GEMS_PER_REVEAL && revealMine(state)) {
      state.inventory.cyan -= CYAN_GEMS_PER_REVEAL
      playReveal()
    }
    // GOLD: a one-off score bonus on top of the flat GEM_SCORE above.
    if (gemKind === 'gold') {
      state.score += GOLD_SCORE_BONUS
    }
  }

  const nearby = countWarningMines(state.map, newCol, newRow)
  if (nearby > 0) {
    playWarning(nearby)
  } else if (!hadGem && !isAmbientSoundActive()) {
    playFootstep(state.terrain)
  }
}

export function respawnPlayer(state: GameState): void {
  state.lives--
  state.playerCol = START_COL
  state.playerRow = state.startRow
  state.playerDir = 'right'
  state.walkTween = null
  state.bufferedDir = null
  resetAnimation(state.walkAnim)
  state.phase = state.lives <= 0 ? 'gameover' : 'playing'
  state.isNight = false
  state.cycleSteps = DAY_STEPS
  // Death breaks the score combo (the streak of safe steps), the score multiplier
  // resets to 1×. The gem backpack (inventory) is untouched — gems already collected
  // stay collected.
  state.comboCount = 0
  state.comboTimer = 0
}

// Flag the cell one step away from the player in `dir` — defaults to the
// direction they're facing (the classic "flag ahead" behaviour), but callers
// can pass an explicit absolute direction (e.g. SHIFT+arrow) to flag a cell
// regardless of which way the player currently faces — needed for triangulation
// play, where the facing direction after walking around rarely matches the
// side the mine turned out to be on.
//
// Flags are a PURE VISUAL OVERLAY (state.flags — see GameState): toggling one
// never touches the tile, so it cannot change what's really there and nothing
// that rewrites tiles can ever eat it. Flaggable: anything non-solid except an
// exploded crater (ground, mine, gem — and the visited trail; the player may
// annotate whatever they like, whether or not they care what's underneath).
export function toggleFlag(state: GameState, dir: Direction = state.playerDir): void {
  if (state.phase !== 'playing') return
  if (state.walkTween) return  // can't flag mid-step
  const dc = dir === 'right' ? 1 : dir === 'left' ? -1 : 0
  const dr = dir === 'down' ? 1 : dir === 'up' ? -1 : 0
  const fc = state.playerCol + dc
  const fr = state.playerRow + dr
  const key = cellKey(fc, fr)
  if (state.flags.has(key)) {
    state.flags.delete(key)
    return
  }
  const tile = state.map.getTile(fc, fr)
  if (tile === null || tile.solid || tile.id === 'exploded') return
  state.flags.add(key)
}
