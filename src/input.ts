import { KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL } from './config.ts'

export type Direction = 'up' | 'down' | 'left' | 'right'

const DIR_KEYS: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
}

const held = new Set<string>()
let pendingFlag = false
let pendingDebug = false
let pendingAnyKey = false

let repeatDir: Direction | null = null
let repeatTimer = 0
let repeatPhase: 'delay' | 'repeat' | 'idle' = 'idle'
let pendingImmediate: Direction | null = null

export function initInput(): void {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.repeat) return
    pendingAnyKey = true
    held.add(e.key)

    const dir = DIR_KEYS[e.key]
    if (dir) {
      repeatDir = dir
      repeatPhase = 'delay'
      repeatTimer = KEY_REPEAT_DELAY
      pendingImmediate = dir
    }

    if (e.key === 'f' || e.key === 'F') pendingFlag = true

    if (e.ctrlKey && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
      pendingDebug = true
      e.preventDefault()
    }
  })

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    held.delete(e.key)
    const dir = DIR_KEYS[e.key]
    if (dir && repeatDir === dir) {
      repeatDir = null
      repeatPhase = 'idle'
    }
  })
}

export function tickMovement(dtMs: number): Direction | null {
  if (pendingImmediate !== null) {
    const d = pendingImmediate
    pendingImmediate = null
    return d
  }
  if (repeatDir !== null && repeatPhase !== 'idle') {
    repeatTimer -= dtMs
    if (repeatTimer <= 0) {
      repeatTimer += KEY_REPEAT_INTERVAL
      if (repeatPhase === 'delay') repeatPhase = 'repeat'
      return repeatDir
    }
  }
  return null
}

export function consumeFlag(): boolean {
  const v = pendingFlag; pendingFlag = false; return v
}

export function consumeDebug(): boolean {
  const v = pendingDebug; pendingDebug = false; return v
}

export function consumeAnyKey(): boolean {
  const v = pendingAnyKey; pendingAnyKey = false; return v
}

export function isHeld(key: string): boolean {
  return held.has(key)
}
