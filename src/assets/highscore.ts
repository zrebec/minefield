const HS_KEY = 'minefield_hiscores'
const MAX_ENTRIES = 5

export interface HighScoreEntry {
  name: string
  score: number
  level: number
}

export function loadHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(HS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((e): e is HighScoreEntry =>
        e !== null &&
        typeof e === 'object' &&
        typeof (e as HighScoreEntry).name === 'string' &&
        (e as HighScoreEntry).name.trim().length > 0 &&
        (e as HighScoreEntry).name.length <= 10 &&
        typeof (e as HighScoreEntry).score === 'number' &&
        Number.isFinite((e as HighScoreEntry).score) &&
        typeof (e as HighScoreEntry).level === 'number' &&
        Number.isFinite((e as HighScoreEntry).level),
      )
      .map(e => ({ ...e, name: e.name.padEnd(3, ' ') }))
  } catch {
    return []
  }
}

export function saveHighScore(entry: HighScoreEntry): void {
  const scores = loadHighScores()
  scores.push(entry)
  scores.sort((a, b) => b.score - a.score)
  localStorage.setItem(HS_KEY, JSON.stringify(scores.slice(0, MAX_ENTRIES)))
}

export function isHighScore(score: number): boolean {
  if (score === 0) return false
  const scores = loadHighScores()
  if (scores.length < MAX_ENTRIES) return true
  return score > scores[scores.length - 1].score
}
