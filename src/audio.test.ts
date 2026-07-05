import { describe, it, expect } from 'vitest'
import { startIntroMusic, stopIntroMusic, playTypeClick, compassAudio } from './audio.ts'
import { DIRCUE_PAN, DIRCUE_FREQ_HIGH, DIRCUE_FREQ_MID, DIRCUE_FREQ_LOW } from './config.ts'

// The intro audio is NEW (AY underscore + typewriter tick) and must honour the
// same silent-guard contract as the rest of audio.ts: safe to call before
// initAudio (no AudioContext yet) without throwing.
describe('story intro audio — silent before initAudio', () => {
  it('playTypeClick does not throw without an audio context', () => {
    expect(() => playTypeClick()).not.toThrow()
  })

  it('startIntroMusic / stopIntroMusic do not throw without an audio context', () => {
    expect(() => startIntroMusic()).not.toThrow()
    expect(() => stopIntroMusic()).not.toThrow()
  })

  it('stopIntroMusic is idempotent (safe with nothing playing)', () => {
    stopIntroMusic()
    expect(() => stopIntroMusic()).not.toThrow()
  })
})

// Pins the directional compass encoding (accessibility): pan = horizontal axis,
// pitch = vertical axis. Asserts AGAINST the config constants, not magic numbers —
// so retuning DIRCUE_* in config.ts stays valid, but a change that breaks the
// scheme (e.g. E stops being right-panned, or N/S share a pitch) fails here. The
// audio legend (STR_A11Y_LEGEND) describes exactly this mapping to players, so this
// test is the guard that code and legend can't drift apart silently.
describe('compassAudio — directional pan/pitch mapping', () => {
  it('east pans right at mid pitch', () => {
    expect(compassAudio('e')).toEqual({ pan: DIRCUE_PAN, freq: DIRCUE_FREQ_MID })
  })
  it('west pans left at mid pitch', () => {
    expect(compassAudio('w')).toEqual({ pan: -DIRCUE_PAN, freq: DIRCUE_FREQ_MID })
  })
  it('north is centred and high', () => {
    expect(compassAudio('n')).toEqual({ pan: 0, freq: DIRCUE_FREQ_HIGH })
  })
  it('south is centred and low', () => {
    expect(compassAudio('s')).toEqual({ pan: 0, freq: DIRCUE_FREQ_LOW })
  })

  it('left/right are mirror-panned, and N/S share no pitch with each other or E/W', () => {
    expect(compassAudio('e').pan).toBe(-compassAudio('w').pan)          // symmetric stereo
    expect(compassAudio('e').pan).toBeGreaterThan(0)                    // east really is to the right
    const freqs = new Set((['n', 's', 'e'] as const).map((d) => compassAudio(d).freq))
    expect(freqs.size).toBe(3)                                          // N, S, E/W all distinguishable by pitch
  })
})
