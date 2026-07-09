import { describe, it, expect } from 'vitest'
import { startIntroMusic, stopIntroMusic, playTypeClick } from './audio.ts'

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
