// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { loadHighScores, saveHighScore, isHighScore, type HighScoreEntry } from './assets/highscore.ts'
import { STR_HIGH_SCORE_LINE } from './strings.ts'

// jsdom provides localStorage
beforeEach(() => localStorage.clear())

// ── STR_HIGH_SCORE_LINE format ────────────────────────────────────────────────

describe('STR_HIGH_SCORE_LINE', () => {
  it('includes MM-DD from a full YYYY-MM-DD date', () => {
    const line = STR_HIGH_SCORE_LINE(1, 'ZRB', 12345, 5, '2026-06-09')
    expect(line).toBe('1. ZRB  12345  LVL:5  06-09')
  })

  it('shows ----- for entries without a date (legacy)', () => {
    const line = STR_HIGH_SCORE_LINE(1, 'ZRB', 12345, 5)
    expect(line).toBe('1. ZRB  12345  LVL:5  -----')
  })

  it('all lines are the same width regardless of date presence', () => {
    const withDate    = STR_HIGH_SCORE_LINE(1, 'ZRB', 12345, 5, '2026-06-09')
    const withoutDate = STR_HIGH_SCORE_LINE(1, 'ZRB', 12345, 5)
    expect(withDate.length).toBe(withoutDate.length)
  })

  it('fits in 256px canvas (≤ 32 chars at 8px each)', () => {
    // worst case: rank 5, name "ABC", score 99999, level 10, date present
    const line = STR_HIGH_SCORE_LINE(5, 'ABC', 99999, 10, '2026-12-31')
    expect(line.length).toBeLessThanOrEqual(32)
    // also print for visual inspection
    const px = line.length * 8
    expect(px).toBeLessThanOrEqual(256)
  })

  it('visual snapshot — 5 entries as they appear on screen', () => {
    const entries: HighScoreEntry[] = [
      { name: 'ZRB', score: 12345, level: 5, date: '2026-06-09' },
      { name: 'ABE', score:  9876, level: 3, date: '2026-06-08' },
      { name: 'XYZ', score:  5000, level: 2, date: '2026-06-07' },
      { name: 'FOX', score:  3210, level: 1, date: '2026-05-31' },
      { name: 'OLD', score:  1111, level: 1 },                      // legacy — no date
    ]
    const lines = entries.map((e, i) =>
      STR_HIGH_SCORE_LINE(i + 1, e.name, e.score, e.level, e.date)
    )
    // Visual snapshot — update if format intentionally changes:
    expect(lines).toStrictEqual([
      '1. ZRB  12345  LVL:5  06-09',
      '2. ABE  09876  LVL:3  06-08',
      '3. XYZ  05000  LVL:2  06-07',
      '4. FOX  03210  LVL:1  05-31',
      '5. OLD  01111  LVL:1  -----',
    ])
  })
})

// ── saveHighScore auto-attaches today's date ──────────────────────────────────

describe('saveHighScore', () => {
  it('auto-attaches today ISO date when none supplied', () => {
    saveHighScore({ name: 'ZRB', score: 100, level: 1 })
    const [entry] = loadHighScores()
    expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('preserves an explicitly supplied date', () => {
    saveHighScore({ name: 'ZRB', score: 100, level: 1, date: '2025-01-15' })
    const [entry] = loadHighScores()
    expect(entry.date).toBe('2025-01-15')
  })
})

// ── loadHighScores backward-compat ───────────────────────────────────────────

describe('loadHighScores backward compat', () => {
  it('loads legacy entries without a date field', () => {
    const legacy = JSON.stringify([{ name: 'OLD', score: 500, level: 2 }])
    localStorage.setItem('minefield_hiscores', legacy)
    const scores = loadHighScores()
    expect(scores).toHaveLength(1)
    expect(scores[0].date).toBeUndefined()
  })
})

// ── isHighScore unchanged ─────────────────────────────────────────────────────

describe('isHighScore', () => {
  it('returns false for score 0', () => expect(isHighScore(0)).toBe(false))

  it('returns true when table has fewer than 5 entries', () => {
    saveHighScore({ name: 'ZRB', score: 100, level: 1 })
    expect(isHighScore(1)).toBe(true)
  })
})
