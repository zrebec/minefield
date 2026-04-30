// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupCanvas, flashBorder, playPattern, getAudioContext } from 'zx-kit'

// jsdom doesn't implement canvas rendering — mock getContext for every test
function makeCanvas() {
  const canvas = document.createElement('canvas')
  const mockCtx = { imageSmoothingEnabled: true, scale: vi.fn() }
  vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D)
  return { canvas, mockCtx }
}

// ── setupCanvas ───────────────────────────────────────────────────────────────

describe('setupCanvas', () => {
  it('sets canvas pixel width = width × scale (default 256)', () => {
    const { canvas } = makeCanvas()
    setupCanvas(canvas, 4)
    expect(canvas.width).toBe(1024)
  })

  it('sets canvas pixel height = height × scale (default 192)', () => {
    const { canvas } = makeCanvas()
    setupCanvas(canvas, 4)
    expect(canvas.height).toBe(768)
  })

  it('accepts custom width and height', () => {
    const { canvas } = makeCanvas()
    setupCanvas(canvas, 2, 320, 240)
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(480)
  })

  it('sets inline CSS width to game dimensions × scale', () => {
    const { canvas } = makeCanvas()
    setupCanvas(canvas, 4)
    expect(canvas.style.width).toBe('1024px')
  })

  it('sets inline CSS height to game dimensions × scale', () => {
    const { canvas } = makeCanvas()
    setupCanvas(canvas, 4)
    expect(canvas.style.height).toBe('768px')
  })

  it('returns the 2D rendering context', () => {
    const { canvas, mockCtx } = makeCanvas()
    const ctx = setupCanvas(canvas, 4)
    expect(ctx).toBe(mockCtx)
  })

  it('disables image smoothing on the context', () => {
    const { canvas, mockCtx } = makeCanvas()
    setupCanvas(canvas, 4)
    expect(mockCtx.imageSmoothingEnabled).toBe(false)
  })

  it('calls ctx.scale(scale, scale) to apply pixel coordinate transform', () => {
    const { canvas, mockCtx } = makeCanvas()
    setupCanvas(canvas, 4)
    expect(mockCtx.scale).toHaveBeenCalledWith(4, 4)
  })

  it('passes the provided scale value to ctx.scale', () => {
    const { canvas, mockCtx } = makeCanvas()
    setupCanvas(canvas, 3)
    expect(mockCtx.scale).toHaveBeenCalledWith(3, 3)
  })
})

// ── flashBorder ───────────────────────────────────────────────────────────────
// jsdom normalises hex colours to rgb() when reading style.backgroundColor

describe('flashBorder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.style.backgroundColor = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets border to flash color on first tick', () => {
    flashBorder('#FF0000', 2, 100)
    vi.advanceTimersByTime(100)
    expect(document.body.style.backgroundColor).toBe('rgb(255, 0, 0)')
  })

  it('alternates to reset color on second tick', () => {
    flashBorder('#FF0000', 1, 100, '#000000')
    vi.advanceTimersByTime(100)  // tick 0 → flash color
    vi.advanceTimersByTime(100)  // tick 1 → reset color
    expect(document.body.style.backgroundColor).toBe('rgb(0, 0, 0)')
  })

  it('resets to resetColor after all flashes complete', () => {
    flashBorder('#FF0000', 2, 100, '#000000')
    vi.advanceTimersByTime(500)
    expect(document.body.style.backgroundColor).toBe('rgb(0, 0, 0)')
  })

  it('defaults reset color to black', () => {
    flashBorder('#FF0000', 1, 100)
    vi.advanceTimersByTime(300)
    expect(document.body.style.backgroundColor).toBe('rgb(0, 0, 0)')
  })

  it('does not change border before first tick fires', () => {
    flashBorder('#FF0000', 2, 100)
    // No time advanced — setInterval hasn't fired yet
    expect(document.body.style.backgroundColor).toBe('')
  })

  it('supports custom reset color', () => {
    flashBorder('#FF0000', 1, 50, '#0000FF')
    vi.advanceTimersByTime(200)
    expect(document.body.style.backgroundColor).toBe('rgb(0, 0, 255)')
  })
})

// ── playPattern ───────────────────────────────────────────────────────────────

describe('playPattern', () => {
  it('does not throw when called before initAudio (no AudioContext)', () => {
    expect(() => playPattern([{ freq: 440, dur: 100 }])).not.toThrow()
  })

  it('does not throw with an empty note array', () => {
    expect(() => playPattern([])).not.toThrow()
  })

  it('does not throw with rest notes only (freq: 0)', () => {
    expect(() => playPattern([{ freq: 0, dur: 100 }])).not.toThrow()
  })

  it('does not throw with startDelay parameter', () => {
    expect(() => playPattern([{ freq: 440, dur: 100 }], 200)).not.toThrow()
  })

  it('does not throw with multiple notes and rests', () => {
    expect(() => playPattern([
      { freq: 262, dur: 150 },
      { freq: 0, dur: 50 },
      { freq: 330, dur: 150 },
    ])).not.toThrow()
  })

  it('getAudioContext returns null before initAudio — confirms silent guard', () => {
    expect(getAudioContext()).toBeNull()
  })
})
