// Minefield high-score table on the zx-kit hiscore module. The kit owns the
// DATA (validation, top-N insert, envelope + FNV-1a integrity signature); this
// module owns the POLICY: the game-specific entry fields (level, daily origin
// date), auto-dating, 3-char name padding, and the one-time migration of the
// legacy raw-JSON table.

import {
  createHighScores, insertScore,
  loadHighScores as loadTable, isHighScore as wouldEnterTable,
  type HighScoreEntry as KitHighScoreEntry,
} from 'zx-kit'
import { SAVE_SECRET, HISCORE_MAX_ENTRIES } from './config.ts'

// Pre-adoption storage: a raw unsigned JSON array under its own key.
const LEGACY_KEY = 'minefield_hiscores'

/**
 * Which high-score table this is — the host the game was loaded from.
 *
 * Scores live in localStorage, and browsers scope that to the ORIGIN. So the
 * same game played from GitHub Pages, from the offline launcher on 127.0.0.1
 * and from itch.io keeps three separate tables, and a player who moves between
 * them watches their scores "disappear". Different browsers on the same address
 * do it too. Nothing can merge them — that is the web's security model, not a
 * bug we can fix here (docs/offline.md), and carrying scores across needs save
 * export, which is Post-1.0.
 *
 * What we CAN do is stop it being silent, which is why this exists: the title
 * screen prints it above the table and the screen-reader mirror speaks it.
 *
 * Returns '' where there is no document — unit tests run in the node env.
 */
export function scoreProfile(): string {
  return typeof location === 'undefined' ? '' : location.host
}

export interface HighScoreExtra {
  level: number
  date?: string   // YYYY-MM-DD daily origin date; absent in legacy entries
}

export type HighScoreEntry = KitHighScoreEntry<HighScoreExtra>

// Own profile key, NOT the run save's 'minefield': readSaveLatest enumerates
// every slot under a key, so a shared key would let the freshly-written hiscore
// slot shadow the auto save in the launch resume check.
const table = createHighScores<HighScoreExtra>({
  key: 'minefield-hiscore',
  maxEntries: HISCORE_MAX_ENTRIES,
  secret: SAVE_SECRET,
  validateExtra: (e) =>
    typeof e.level === 'number' && Number.isFinite(e.level) &&
    (e.date === undefined || typeof e.date === 'string'),
})

function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// One-time import of the legacy table, re-inserted through the kit so every
// surviving entry is validated and signed; malformed rows are dropped. The key
// is removed up front — a table that fails to parse is dead either way — which
// also makes the check idempotent (later calls see no key and return).
function migrateLegacyTable(): void {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw === null) return
    localStorage.removeItem(LEGACY_KEY)
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return
    for (const e of parsed) {
      if (e !== null && typeof e === 'object' && typeof (e as HighScoreEntry).name === 'string') {
        const entry = e as HighScoreEntry
        insertScore(table, { ...entry, name: entry.name.padEnd(3, ' ') })
      }
    }
  } catch {
    // a broken legacy table must never break the game
  }
}

export function loadHighScores(): HighScoreEntry[] {
  migrateLegacyTable()
  return loadTable(table)
}

export function saveHighScore(entry: HighScoreEntry): void {
  migrateLegacyTable()
  insertScore(table, {
    ...entry,
    name: entry.name.padEnd(3, ' '),   // names render 3 columns wide on the title table
    date: entry.date ?? todayIso(),
  })
}

export function isHighScore(score: number): boolean {
  migrateLegacyTable()
  return wouldEnterTable(table, score)
}
