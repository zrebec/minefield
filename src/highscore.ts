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
    return raw ? (JSON.parse(raw) as HighScoreEntry[]) : []
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
