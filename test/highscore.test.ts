// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { loadHighScores, saveHighScore, isHighScore } from '../src/highscore.ts'

// zx-kit hiscore storage: one signed envelope slot per table.
const TABLE_KEY = 'zxkit:minefield-hiscore:hiscore'
const LEGACY_KEY = 'minefield_hiscores'

// jsdom provides localStorage
beforeEach(() => localStorage.clear())

// ── saveHighScore policy: auto-date + 3-char name padding ────────────────────

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

  it('pads short names to 3 chars so table columns align', () => {
    saveHighScore({ name: 'A', score: 100, level: 1 })
    const [entry] = loadHighScores()
    expect(entry.name).toBe('A  ')
  })

  it('keeps the table at 5 entries, best first', () => {
    for (let i = 1; i <= 6; i++) saveHighScore({ name: 'ABC', score: i * 100, level: 1 })
    const scores = loadHighScores()
    expect(scores).toHaveLength(5)
    expect(scores.map(e => e.score)).toStrictEqual([600, 500, 400, 300, 200])
  })
})

// ── Legacy table migration (pre-adoption raw JSON under minefield_hiscores) ──

describe('legacy table migration', () => {
  it('imports legacy entries (incl. date-less) and removes the legacy key', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([
      { name: 'ZRB', score: 900, level: 3, date: '2026-06-01' },
      { name: 'OLD', score: 500, level: 2 },
    ]))
    const scores = loadHighScores()
    expect(scores).toHaveLength(2)
    expect(scores[0]).toMatchObject({ name: 'ZRB', score: 900, date: '2026-06-01' })
    expect(scores[1].date).toBeUndefined()
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
    expect(localStorage.getItem(TABLE_KEY)).not.toBeNull()   // re-signed under the kit key
  })

  it('drops malformed legacy rows and survives a garbage legacy table', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([
      { name: 'ZRB', score: 900, level: 3 },
      { name: '', score: 1, level: 1 },          // empty name — invalid
      { name: 'BAD', score: 2 },                 // missing level — invalid
      'not-an-object',
    ]))
    expect(loadHighScores().map(e => e.name)).toStrictEqual(['ZRB'])

    localStorage.clear()
    localStorage.setItem(LEGACY_KEY, 'not json at all')
    expect(loadHighScores()).toStrictEqual([])
  })
})

// ── Anti-cheat: the table is signed; a hand-edited envelope loads as empty ───

describe('integrity signature', () => {
  it('rejects a table whose stored score was edited', () => {
    saveHighScore({ name: 'ZRB', score: 100, level: 1 })
    expect(loadHighScores()).toHaveLength(1)

    const raw = localStorage.getItem(TABLE_KEY)!
    localStorage.setItem(TABLE_KEY, raw.replace('100', '99999'))
    expect(loadHighScores()).toStrictEqual([])   // tampered ⇒ empty, never a crash
  })

  it('stores the table under its own profile key, outside the run-save namespace', () => {
    // A shared 'minefield' key would let this slot shadow the auto save in
    // main.ts's readSaveLatest resume check (it enumerates all slots per key).
    saveHighScore({ name: 'ZRB', score: 100, level: 1 })
    expect(localStorage.getItem(TABLE_KEY)).not.toBeNull()
    expect(localStorage.getItem('zxkit:minefield:hiscore')).toBeNull()
  })
})

// ── isHighScore unchanged ─────────────────────────────────────────────────────

describe('isHighScore', () => {
  it('returns false for score 0', () => expect(isHighScore(0)).toBe(false))

  it('returns true when table has fewer than 5 entries', () => {
    saveHighScore({ name: 'ZRB', score: 100, level: 1 })
    expect(isHighScore(1)).toBe(true)
  })

  it('requires beating the 5th score once the table is full', () => {
    for (let i = 1; i <= 5; i++) saveHighScore({ name: 'ABC', score: i * 100, level: 1 })
    expect(isHighScore(100)).toBe(false)   // ties don't qualify
    expect(isHighScore(101)).toBe(true)
  })
})
