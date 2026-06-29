import { describe, it, expect } from 'vitest'
import * as en from './strings.ts'
import * as sk from './strings.sk.ts'
import { CONTROLS, GEM_TIME_BONUS_MS } from './config.ts'
import { GEM_KINDS } from './game.ts'

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
