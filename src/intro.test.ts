import { describe, it, expect, vi } from 'vitest'
import {
  cardCharCount,
  storyCardCount,
  createStoryState,
  stepStory,
  renderStoryCard,
  introDue,
  MS_PER_CHAR,
  CARD_HOLD_MS,
} from './intro.ts'

const DAY = 86_400_000

// zx-kit draws pixel-by-pixel via fillStyle + fillRect; a recording stub is
// enough to prove renderStoryCard runs end-to-end without a real canvas.
function makeMockCtx() {
  return { fillStyle: '', fillRect: vi.fn() } as unknown as CanvasRenderingContext2D
}

describe('cardCharCount', () => {
  it('sums the lengths of all lines', () => {
    expect(cardCharCount(['AB', 'CDE'])).toBe(5)
  })
  it('is 0 for an empty card', () => {
    expect(cardCharCount([])).toBe(0)
  })
})

describe('storyCardCount', () => {
  it('reports the active locale card count', () => {
    expect(storyCardCount()).toBeGreaterThan(0)
  })
})

describe('stepStory — typewriter', () => {
  const CARDS = [['ABCDE']] as const  // one 5-char card

  it('reveals roughly one character per MS_PER_CHAR', () => {
    const s = createStoryState()
    stepStory(s, MS_PER_CHAR * 2, false, CARDS)
    expect(Math.floor(s.revealed)).toBe(2)
  })

  it('clamps revealed to the card length (never overshoots)', () => {
    const s = createStoryState()
    // Big enough to type all 5 chars, but under CARD_HOLD_MS so it won't advance.
    stepStory(s, MS_PER_CHAR * 10, false, CARDS)
    expect(s.revealed).toBe(5)
    expect(s.card).toBe(0)
  })

  it('a press while still typing finishes the card instead of advancing', () => {
    const s = createStoryState()
    stepStory(s, 10, true, CARDS)        // pressed, but only ~0.26 chars typed
    expect(s.revealed).toBe(5)           // jumped to full
    expect(s.card).toBe(0)               // did NOT advance
    expect(s.finished).toBe(false)
  })
})

describe('stepStory — advancing', () => {
  const CARDS = [['A'], ['B']] as const

  it('a press on an already-typed card advances to the next', () => {
    const s = createStoryState()
    stepStory(s, MS_PER_CHAR, false, CARDS)  // type card 0 fully
    expect(s.card).toBe(0)
    stepStory(s, 1, true, CARDS)             // press → advance
    expect(s.card).toBe(1)
    expect(s.revealed).toBe(0)
    expect(s.finished).toBe(false)
  })

  it('auto-advances once a typed card has been held CARD_HOLD_MS', () => {
    const s = createStoryState()
    stepStory(s, MS_PER_CHAR, false, CARDS)      // card 0 fully typed
    stepStory(s, CARD_HOLD_MS, false, CARDS)     // hold elapses → advance
    expect(s.card).toBe(1)
  })

  it('does not auto-advance before the hold elapses', () => {
    const s = createStoryState()
    stepStory(s, MS_PER_CHAR, false, CARDS)  // card 0 fully typed
    stepStory(s, 100, false, CARDS)          // only a small hold so far
    expect(s.card).toBe(0)
  })

  it('sets finished after the last card and is then idempotent', () => {
    const s = createStoryState()
    stepStory(s, MS_PER_CHAR, false, CARDS)  // type card 0
    stepStory(s, 1, true, CARDS)             // → card 1
    stepStory(s, MS_PER_CHAR, false, CARDS)  // type card 1
    stepStory(s, 1, true, CARDS)             // → past last card
    expect(s.finished).toBe(true)
    const snapshot = { ...s }
    stepStory(s, 1000, true, CARDS)          // no-op once finished
    expect(s).toEqual(snapshot)
  })
})

describe('renderStoryCard — smoke', () => {
  it('clears and draws every card without throwing', () => {
    for (let card = 0; card < storyCardCount(); card++) {
      const ctx = makeMockCtx()
      expect(() => renderStoryCard(ctx, card, 3, true)).not.toThrow()
      expect(ctx.fillRect).toHaveBeenCalled()  // at least the black clear
    }
  })

  it('handles revealed = 0 and revealed past the card length', () => {
    const ctx = makeMockCtx()
    expect(() => renderStoryCard(ctx, 0, 0, false)).not.toThrow()
    expect(() => renderStoryCard(ctx, 0, 9999, true)).not.toThrow()
  })
})

describe('introDue — when the intro pre-rolls', () => {
  const now = 1_000 * DAY

  it('is due when never seen (no record)', () => {
    expect(introDue(null, now, 1, 1)).toBe(true)
  })

  it('is due when the content version changed (refreshed)', () => {
    expect(introDue({ v: 1, t: now }, now, 2, 30)).toBe(true)
  })

  it('is NOT due within the revalidate window', () => {
    expect(introDue({ v: 1, t: now - 0.5 * DAY }, now, 1, 1)).toBe(false)   // <1 day, daily window
    expect(introDue({ v: 1, t: now - 10 * DAY }, now, 1, 30)).toBe(false)   // <30 days, monthly window
  })

  it('is due once the window has elapsed', () => {
    expect(introDue({ v: 1, t: now - 1 * DAY }, now, 1, 1)).toBe(true)      // exactly 1 day, daily
    expect(introDue({ v: 1, t: now - 31 * DAY }, now, 1, 30)).toBe(true)    // past 30 days, monthly
  })
})
