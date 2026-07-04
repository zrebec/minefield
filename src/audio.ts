import { MASTER_VOLUME, WARN_DEBOUNCE_MS } from './config.ts'
import type { TerrainType } from './sprites.ts'
import {
  initAudio as _initAudio,
  resumeAudio,
  getAudioContext,
  getMasterGain,
  playPattern,
  seq,
  playAYLoop,
  type Note,
  type LoopHandle,
  type AYNote,
} from 'zx-kit'

export { resumeAudio }

let airplaneOsc: OscillatorNode | null = null
let airplaneLfo: OscillatorNode | null = null
let airplaneGain: GainNode | null = null
let approachOsc: OscillatorNode | null = null
let approachGain: GainNode | null = null
let lastWarnTime = 0

// One-shot horror sting — plays once on first user interaction
const STARTUP_JINGLE: Note[] = [
  // Ascending diminished 7th arpeggio — ominous rise
  { freq: 262, dur: 120 },  // C4
  { freq: 311, dur: 120 },  // Eb4
  { freq: 370, dur: 120 },  // F#4 — tritone from C
  { freq: 440, dur: 120 },  // A4
  { freq: 523, dur: 120 },  // C5
  { freq: 622, dur: 120 },  // Eb5
  { freq: 740, dur: 300 },  // F#5 — peak, held
  { freq: 0, dur: 200 },  // silence — tension
  // Minor second trill — dissonant, unsettling
  { freq: 440, dur: 70 },
  { freq: 466, dur: 70 },
  { freq: 440, dur: 70 },
  { freq: 466, dur: 70 },
  { freq: 440, dur: 70 },
  { freq: 466, dur: 70 },
  { freq: 440, dur: 70 },
  { freq: 0, dur: 250 },  // silence — hold tension
  // Final tritone stab — diabolus in musica
  { freq: 196, dur: 120 },  // G3
  { freq: 0, dur: 60 },
  { freq: 131, dur: 120 },  // C3
  { freq: 0, dur: 60 },
  { freq: 185, dur: 700 },  // F#3 — tritone from C, ominous end
]

export function playStartupJingle(): void {
  playPattern(STARTUP_JINGLE)
}

export function initAudio(): void {
  _initAudio(MASTER_VOLUME)
}

export function playWarning(mineCount: number): void {
  if (mineCount === 0) return
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  if (now - lastWarnTime < WARN_DEBOUNCE_MS / 1000) return
  lastWarnTime = now

  const configs: [number, number, number, number][] = [
    [250, 20, 1, 60],
    [740, 80, 2, 60],
    [587, 100, 3, 55],
    [440, 120, 4, 50],
    [330, 150, 5, 40],
    [220, 200, 6, 40],
    [110, 300, 3, 30],
    [110, 300, 4, 25],
  ]
  const [freq, dur, pips, gap] = configs[Math.min(mineCount, 8) - 1]
  const notes: Note[] = []
  for (let i = 0; i < pips; i++) {
    notes.push({ freq, dur })
    if (i < pips - 1) notes.push({ freq: 0, dur: gap })
  }
  playPattern(notes)
}

export function playExplosion(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.9, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  gain.connect(getMasterGain()!)
  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, now)
  for (let i = 0; i < 40; i++) {
    osc.frequency.setValueAtTime(50 + Math.random() * 500, now + i * 0.012)
  }
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + 0.55)
}

export function playWin(): void {
  playPattern([
    { freq: 262, dur: 150 },
    { freq: 330, dur: 150 },
    { freq: 392, dur: 150 },
    { freq: 523, dur: 150 },
  ])
}

export function playGameOver(): void {
  playPattern([
    { freq: 262, dur: 270 },
    { freq: 247, dur: 270 },
    { freq: 233, dur: 270 },
    { freq: 220, dur: 270 },
    { freq: 208, dur: 270 },
  ])
}

export function playExtraLife(): void {
  // Short bright rising triad — distinct from the level-win fanfare.
  playPattern([
    { freq: 392, dur: 90 },
    { freq: 523, dur: 90 },
    { freq: 659, dur: 150 },
  ])
}

export function playReveal(): void {
  // Short ominous low two-tone — a mine has just been exposed.
  playPattern([
    { freq: 196, dur: 70 },
    { freq: 147, dur: 130 },
  ])
}

export function playDenied(): void {
  // Flat low "uh-uh" — a key was understood but refused (e.g. the D reveal
  // with its budget spent, or on the daily). Ends the silent no-op era: the
  // player always hears that the key is alive and simply not allowed.
  playPattern([
    { freq: 110, dur: 60 },
    { freq: 0, dur: 40 },
    { freq: 98, dur: 90 },
  ])
}

export function startApproachSound(): void {
  const ctx = getAudioContext()
  if (!ctx || approachOsc || airplaneOsc) return
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.value = 0.04
  gain.connect(getMasterGain()!)
  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = 1300
  osc.connect(gain)
  osc.start(now)
  approachGain = gain
  approachOsc = osc
}

export function stopApproachSound(): void {
  const ctx = getAudioContext()
  const osc = approachOsc
  const gain = approachGain
  if (!ctx || !osc) return
  const now = ctx.currentTime
  gain?.gain.linearRampToValueAtTime(0, now + 0.2)
  osc.stop(now + 0.25)
  approachOsc = null
  approachGain = null
}

export function isApproachSoundActive(): boolean {
  return approachOsc !== null
}

export function isAmbientSoundActive(): boolean {
  return approachOsc !== null || airplaneOsc !== null
}

export function playFootstep(terrain: TerrainType = 'grass'): void {
  const patterns: Record<TerrainType, Note[]> = {
    grass: [{ freq: 65, dur: 15 }],
    // double-crunch — two short low pulses, muffled by snow
    snow: [{ freq: 60, dur: 20 }, { freq: 0, dur: 10 }, { freq: 55, dur: 14 }],
    // single sharp tap — dry, higher pitch
    dust: [{ freq: 140, dur: 16 }],
  }
  playPattern(patterns[terrain])
}

export function playGemCollect(comboCount: number): void {
  const freq = Math.min(880 + (comboCount - 1) * 110, 1760)
  const notes: Note[] = [{ freq, dur: 60 }, { freq: 0, dur: 30 }]
  if (comboCount >= 2) notes.push({ freq: Math.min(freq * 1.25, 2200), dur: 60 })
  playPattern(notes)
}

export function startAirplane(): void {
  stopApproachSound()
  const ctx = getAudioContext()
  if (!ctx || airplaneOsc) return
  const now = ctx.currentTime

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.4, now + 0.3)
  gain.connect(getMasterGain()!)

  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = 1300

  const lfo = ctx.createOscillator()
  lfo.type = 'square'
  lfo.frequency.value = 12
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 80
  lfo.connect(lfoGain)
  lfoGain.connect(osc.frequency)
  osc.connect(gain)
  lfo.start(now)
  osc.start(now)

  airplaneGain = gain
  airplaneOsc = osc
  airplaneLfo = lfo
}

export function stopAmbientSounds(): void {
  stopApproachSound()
  const ctx = getAudioContext()
  if (!ctx || !airplaneGain || !airplaneOsc || !airplaneLfo) return
  const now = ctx.currentTime
  airplaneGain.gain.linearRampToValueAtTime(0, now + 0.3)
  airplaneOsc.stop(now + 0.35)
  airplaneLfo.stop(now + 0.35)
  airplaneOsc = null
  airplaneLfo = null
  airplaneGain = null
}

// ── Story intro audio ("The Strip") ────────────────────────────────────────
// The intro is the only place the kit's AY chip is used (everything else is the
// beeper). A somber, sparse minor loop underscores the typewriter story; a dry
// per-character tick is the "key strike". Both are NEW sounds — nothing existing
// is touched. Tune freely by ear.

let introMusic: LoopHandle | null = null

// Add volume (0–15) and an optional pluck/decay envelope to a seq() line. Rests
// (freq 0) pass through untouched. Lets us shape dynamics + timbre per voice.
function voiced(notes: AYNote[], vol: number, envShape?: number, envCycleDurMs?: number): AYNote[] {
  return notes.map((n) =>
    n.freq === 0 ? n
      : envShape === undefined ? { ...n, vol }
        : { ...n, vol, envShape, envCycleDurMs },
  )
}

// One AY track per intro card — melancholic, low/mid register, up to 3 voices
// (melody / bass / arpeggio). Card 0 keeps the original lament; the arc darkens to
// a funeral dirge (card 3 = despair) and resolves into "Ode to Joy" (card 5 = new
// hope). Channel lengths are matched so each loops cleanly. ALL tunable by ear.
function introTrack(card: number): { a?: AYNote[]; b?: AYNote[]; c?: AYNote[] } {
  switch (card) {
    case 1: // "torn apart" — A-minor lament, a falling melody over i-VI-VII-v (7.2 s)
      return {
        a: voiced(seq('E4:700 D4:700 C4:1000 r:200 B3:600 A3:700 G3:700 F3:1000 E3:1200 r:400'), 12),
        b: voiced(seq('A2:1800 F2:1800 G2:1800 E2:1800'), 13),
        c: voiced(seq('A3:450 C4:450 E4:450 C4:450 A3:450 C4:450 F4:450 C4:450 B3:450 D4:450 G4:450 D4:450 B3:450 E4:450 G4:450 E4:450'), 7, 0, 240),
      }
    case 2: // despair — a funeral dirge: a tolling bell, a descending lament, a dominant pedal (7.2 s)
      return {
        a: voiced(seq('A3:1500 r:300 G3:1200 F3:1200 E3:1800 r:1200'), 11),
        b: voiced(seq('A2:1500 r:300 A2:1500 r:300 A2:1500 r:300 A2:1500 r:300'), 13, 0, 1400),
        c: voiced(seq('E2:7200'), 6),
      }
    case 3: // the runner — a rising motif brightening from A-minor toward C major (6 s)
      return {
        a: voiced(seq('A3:600 B3:600 C4:600 E4:600 D4:600 E4:600 G4:900 E4:900 r:600'), 12),
        b: voiced(seq('A2:1500 C3:1500 G2:1500 C3:1500'), 12),
        c: voiced(seq('A3:375 C4:375 E4:375 G4:375 A3:375 C4:375 E4:375 G4:375 G3:375 B3:375 D4:375 G4:375 G3:375 B3:375 D4:375 G4:375'), 8, 0, 200),
      }
    case 4: // new hope — Beethoven's "Ode to Joy" in C major, warm + full (16 s)
      return {
        a: voiced(seq(
          'E4:500 E4:500 F4:500 G4:500 G4:500 F4:500 E4:500 D4:500 '
          + 'C4:500 C4:500 D4:500 E4:500 E4:750 D4:250 D4:1000 '
          + 'E4:500 E4:500 F4:500 G4:500 G4:500 F4:500 E4:500 D4:500 '
          + 'C4:500 C4:500 D4:500 E4:500 D4:750 C4:250 C4:1000'), 13),
        b: voiced(seq('C3:2000 G2:2000 C3:2000 G2:2000 C3:2000 G2:2000 C3:2000 G2:1000 C3:1000'), 12),
        c: voiced(seq(
          'C4:500 E4:500 G4:500 E4:500 D4:500 G4:500 B4:500 G4:500 '
          + 'C4:500 E4:500 G4:500 E4:500 D4:500 G4:500 B4:500 G4:500 '
          + 'C4:500 E4:500 G4:500 E4:500 D4:500 G4:500 B4:500 G4:500 '
          + 'C4:500 E4:500 G4:500 E4:500 D4:500 G4:500 B4:500 G4:500'), 8, 0, 240),
      }
    default: // card 0 — the original A-minor lament, kept as-is (5.8 s)
      return {
        a: seq('A4:900 r:300 C5:600 B4:600 A4:900 r:300 E4:1200 r:1000'),
        b: seq('A2:2900 E2:2900'),
      }
  }
}

// (Re)start the intro underscore for a card, replacing any current loop.
export function startIntroMusic(card = 0): void {
  introMusic?.stop()
  introMusic = playAYLoop(introTrack(card))
}

export function stopIntroMusic(): void {
  introMusic?.stop()
  introMusic = null
}

// One short, dry beeper tick per typed character — a typewriter "clack", not a
// pitched note (kept high + brief so it sits over the AY without clashing).
export function playTypeClick(): void {
  playPattern([{ freq: 1760, dur: 6 }])
}

