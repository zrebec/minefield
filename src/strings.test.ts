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
