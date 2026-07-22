import { describe, it, expect } from 'vitest'
import * as en from '../src/strings.ts'
import * as sk from '../src/strings.sk.ts'
import { CONTROLS, GEM_TIME_BONUS_MS } from '../src/config.ts'
import { GEM_KINDS } from '../src/game.ts'

// Guards the CONTROLS / gems single source against i18n drift: add a control or a
// gem kind and forget its wording, and one of these fails instead of rendering blank.
describe('controls / i18n consistency', () => {
  it('every control id has a description in both languages', () => {
    for (const c of CONTROLS) {
      expect(en.CONTROL_DESC[c.id], `EN desc for ${c.id}`).toBeTruthy()
      expect(sk.CONTROL_DESC[c.id], `SK desc for ${c.id}`).toBeTruthy()
    }
  })

  it('every gem kind has a label + special wording (both languages) and a numeric time bonus', () => {
    for (const k of GEM_KINDS) {
      expect(en.GEM_LABEL[k.id], `EN label for ${k.id}`).toBeTruthy()
      expect(sk.GEM_LABEL[k.id], `SK label for ${k.id}`).toBeTruthy()
      expect(en.GEM_SPECIAL[k.id], `EN special for ${k.id}`).toBeTruthy()
      expect(sk.GEM_SPECIAL[k.id], `SK special for ${k.id}`).toBeTruthy()
      expect(typeof GEM_TIME_BONUS_MS[k.id], `time bonus for ${k.id}`).toBe('number')
    }
  })

  it('pause page titles count matches across languages', () => {
    expect(en.STR_PAUSE_TITLES.length).toBe(sk.STR_PAUSE_TITLES.length)
  })

  it('accessibility strings exist and are non-empty in both languages', () => {
    for (const pack of [en, sk]) {
      expect(pack.STR_A11Y_LEGEND.length).toBeGreaterThan(40)   // a real explanatory paragraph
      expect(pack.STR_A11Y_LEGEND_HINT).toMatch(/\bH\b/)        // start hint points at the H replay key
      expect(pack.STR_A11Y_GAMEOVER).toBeTruthy()
      expect(pack.STR_A11Y_WIN).toBeTruthy()
    }
  })

  it('victory epilogue strings are ASCII (ROM font) and fit 32 cells in both languages', () => {
    for (const pack of [en, sk]) {
      for (const s of [pack.STR_WIN_TITLE, pack.STR_WIN_LINE1, pack.STR_WIN_LINE2]) {
        expect(s.length, s).toBeGreaterThan(0)
        expect(s.length, s).toBeLessThanOrEqual(32)
        // eslint-disable-next-line no-control-regex
        expect(/^[\x20-\x7E]*$/.test(s), s).toBe(true)
      }
    }
  })

  it('orientation strings (Item C) exist and are non-empty in both languages', () => {
    for (const pack of [en, sk]) {
      for (const w of [pack.STR_A11Y_RIGHT, pack.STR_A11Y_LEFT, pack.STR_A11Y_UP, pack.STR_A11Y_DOWN, pack.STR_A11Y_HERE]) {
        expect(w).toBeTruthy()
      }
      expect(pack.STR_A11Y_EXIT('2 right')).toContain('2 right')
      expect(pack.STR_A11Y_GEM_NEAREST('cyan', '2 right', 3)).toBeTruthy()
      expect(pack.STR_A11Y_GEM_NONE).toBeTruthy()
      // Pickup line must carry the remaining count — it's what keeps consecutive
      // pickups distinct for the status() dedupe (owner playtest 2026-07-15).
      expect(pack.STR_A11Y_GEM_GOT(pack.STR_A11Y_GEM_COLOUR.red, 7)).toContain('7')
      for (const k of ['red', 'cyan', 'gold', 'green']) expect(pack.STR_A11Y_GEM_COLOUR[k]).toBeTruthy()
      expect(pack.STR_A11Y_ORIENT('2 right', 5)).toBeTruthy()
      expect(pack.STR_A11Y_PLANE_APPROACHING).toBeTruthy()
      expect(pack.STR_A11Y_PLANE_RESEEDED(2)).toBeTruthy()
      expect(pack.STR_A11Y_PLANE_PASSED).toBeTruthy()
    }
  })

  it('title-menu mirror strings exist and advertise every title/a11y key (both languages)', () => {
    for (const pack of [en, sk]) {
      const all = pack.STR_A11Y_MENU_LINES.join(' ')
      // Every key the title screen (or the in-game a11y layer) listens to must be
      // named in the browsable menu — this is how a blind player learns them.
      for (const key of ['S', 'R', 'I', 'L', 'H', 'E', 'G', 'F', 'P']) {
        expect(all, `menu advertises ${key}`).toMatch(new RegExp(`\\b${key}\\b`))
      }
      expect(pack.STR_A11Y_TITLE).toBeTruthy()
      expect(pack.STR_A11Y_PAUSE).toBeTruthy()   // both packs speak a pause line
      expect(pack.STR_A11Y_MENU_SCORES).toBeTruthy()
      expect(pack.STR_A11Y_MENU_NO_SCORES).toBeTruthy()
      const row = pack.STR_A11Y_MENU_SCORE_ROW(1, 'ABC', 12500, 3, '2026-07-12')
      for (const part of ['1', 'ABC', '12500', '3', '2026-07-12']) expect(row).toContain(part)
      // Legacy dateless entries must still read as a sentence, not "undefined".
      expect(pack.STR_A11Y_MENU_SCORE_ROW(2, 'XYZ', 900, 1)).not.toContain('undefined')
    }
    expect(en.STR_A11Y_MENU_LINES.length).toBe(sk.STR_A11Y_MENU_LINES.length)
  })
})

// The story intro is typed char-by-char with the ZX ROM font (ASCII only) and
// left-aligned, so every line must be ASCII and fit the 256 px (32-cell) canvas.
// The card count must match across locales or main.ts walks off the end of one.
describe('story intro cards', () => {
  it('has the same number of cards in both languages', () => {
    expect(en.STR_STORY_CARDS.length).toBe(sk.STR_STORY_CARDS.length)
    expect(en.STR_STORY_CARDS.length).toBeGreaterThan(0)
  })

  it('every line is ASCII (the ROM font has no em-dash/diacritics) and ≤ 30 chars', () => {
    for (const pack of [en, sk]) {
      for (const card of pack.STR_STORY_CARDS) {
        for (const line of card) {
          expect(line.length, line).toBeLessThanOrEqual(30)
          // eslint-disable-next-line no-control-regex
          expect(/^[\x20-\x7E]*$/.test(line), line).toBe(true)
        }
      }
    }
  })

  it('has a skip hint in both languages', () => {
    expect(en.STR_STORY_SKIP_HINT).toBeTruthy()
    expect(sk.STR_STORY_SKIP_HINT).toBeTruthy()
  })

  it('has one chapter title per card in both languages (ASCII, fits the heading)', () => {
    for (const pack of [en, sk]) {
      expect(pack.STR_STORY_TITLES.length).toBe(pack.STR_STORY_CARDS.length)
      for (const title of pack.STR_STORY_TITLES) {
        expect(title.length, title).toBeLessThanOrEqual(20)   // "  N/5  TITLE  " must fit 32 cells
        // eslint-disable-next-line no-control-regex
        expect(/^[\x20-\x7E]*$/.test(title), title).toBe(true)
      }
    }
  })
})
