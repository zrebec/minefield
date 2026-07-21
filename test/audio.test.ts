import { describe, it, expect } from 'vitest'
import { startIntroMusic, stopIntroMusic, playTypeClick, playSonarSweep, playExitBeacon, scanBeepParams, exitBeaconParams } from '../src/audio.ts'
import { SCAN_RADIUS, SCAN_FREQ_BASE, SCAN_VOL_NEAR, SCAN_VOL_FAR, BEACON_FREQ_BASE, BEACON_FREQ_MIN, BEACON_NEAR_DIST, BEACON_FAR_DIST, BEACON_VOL_MAX, BEACON_VOL_MIN } from '../src/config.ts'

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

// Sonar sweep + exit beacon (a11y.md §5) — same silent-guard contract, plus the
// pure pan/pitch/volume mapping which needs no AudioContext at all.
describe('sonar sweep & exit beacon — silent before initAudio', () => {
  it('playSonarSweep does not throw without an audio context — with and without hits', () => {
    expect(() => playSonarSweep([])).not.toThrow()
    expect(() => playSonarSweep([{ dCol: 1, dRow: -2, dist: 2 }])).not.toThrow()
  })

  it('playExitBeacon does not throw without an audio context', () => {
    expect(() => playExitBeacon(15, -3)).not.toThrow()
    expect(() => playExitBeacon(0, 0)).not.toThrow()
  })
})

describe('scanBeepParams — pan/pitch/volume encoding', () => {
  it('pan follows east/west and clamps to full left/right at the radius edge', () => {
    expect(scanBeepParams({ dCol: 0, dRow: -3, dist: 3 }).pan).toBe(0)                       // same column → centre
    expect(scanBeepParams({ dCol: SCAN_RADIUS, dRow: 0, dist: SCAN_RADIUS }).pan).toBe(1)   // east edge → hard right
    expect(scanBeepParams({ dCol: -SCAN_RADIUS, dRow: 0, dist: SCAN_RADIUS }).pan).toBe(-1) // west edge → hard left
    const half = scanBeepParams({ dCol: 2, dRow: 0, dist: 2 }).pan
    expect(half).toBeGreaterThan(0)
    expect(half).toBeLessThan(1)
  })

  it('pitch encodes north/south: same row = base, north higher, south lower', () => {
    expect(scanBeepParams({ dCol: 2, dRow: 0, dist: 2 }).freq).toBe(SCAN_FREQ_BASE)
    const north = scanBeepParams({ dCol: 0, dRow: -2, dist: 2 }).freq
    const south = scanBeepParams({ dCol: 0, dRow: 2, dist: 2 }).freq
    expect(north).toBeGreaterThan(SCAN_FREQ_BASE)
    expect(south).toBeLessThan(SCAN_FREQ_BASE)
    expect(north).toBeGreaterThan(0)
    expect(south).toBeGreaterThan(0)   // still audible at the southern edge — never 0/negative Hz
  })

  it('volume encodes distance: adjacent = NEAR, radius edge = FAR, monotonic between', () => {
    expect(scanBeepParams({ dCol: 1, dRow: 0, dist: 1 }).vol).toBe(SCAN_VOL_NEAR)
    expect(scanBeepParams({ dCol: SCAN_RADIUS, dRow: 0, dist: SCAN_RADIUS }).vol).toBeCloseTo(SCAN_VOL_FAR)
    const mid = scanBeepParams({ dCol: 3, dRow: 0, dist: 3 }).vol
    expect(mid).toBeLessThan(SCAN_VOL_NEAR)
    expect(mid).toBeGreaterThan(SCAN_VOL_FAR)
  })
})

describe('exitBeaconParams — volume = X distance, pitch = north/south', () => {
  it('volume is max within NEAR_DIST and fades toward VOL_MIN at FAR_DIST', () => {
    expect(exitBeaconParams(0, 0).vol).toBe(BEACON_VOL_MAX)                    // on the exit column
    expect(exitBeaconParams(BEACON_NEAR_DIST, 0).vol).toBe(BEACON_VOL_MAX)     // edge of the max zone
    expect(exitBeaconParams(BEACON_FAR_DIST, 0).vol).toBeCloseTo(BEACON_VOL_MIN)   // at the entry
  })

  it('volume is monotonic — closer to the exit is never quieter, never fully silent', () => {
    const near = exitBeaconParams(5, 0).vol
    const far = exitBeaconParams(20, 0).vol
    expect(near).toBeGreaterThan(far)
    expect(far).toBeGreaterThan(BEACON_VOL_MIN)      // still audible mid-board
    // Past FAR the whisper floor holds — never louder again, never zero.
    expect(exitBeaconParams(BEACON_FAR_DIST + 5, 0).vol).toBeCloseTo(BEACON_VOL_MIN)
  })

  it('pitch rises for a northern exit, falls for a southern one — the sonar convention', () => {
    expect(exitBeaconParams(10, 0).freq).toBe(BEACON_FREQ_BASE)                // same row → base
    expect(exitBeaconParams(10, -5).freq).toBeGreaterThan(BEACON_FREQ_BASE)    // exit north → higher
    expect(exitBeaconParams(10, 5).freq).toBeLessThan(BEACON_FREQ_BASE)        // exit south → lower
  })

  it('pitch never drops below the audible floor at the far southern edge', () => {
    expect(exitBeaconParams(0, 17).freq).toBeGreaterThanOrEqual(BEACON_FREQ_MIN)   // ROWS-1 rows south
  })
})
