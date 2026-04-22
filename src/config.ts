// ═══════════════════════════════════════════════════════════════════════════════
// MINEFIELD — GAME CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
// Všetky herné parametre sú na jednom mieste. Každá hodnota je okomentovaná.
// Po zmene stačí uložiť — Vite automaticky obnoví hru (hot reload).
// ═══════════════════════════════════════════════════════════════════════════════

// ── Ovládanie ─────────────────────────────────────────────────────────────────

// Oneskorenie pred začatím key-repeat (ms) — kolko cakáš po prvom stlačení
export const KEY_REPEAT_DELAY = 150

// Interval key-repeat (ms) — ako rýchlo sa pohybuje hráč pri dlhom držaní
export const KEY_REPEAT_INTERVAL = 80

// ── Hráč a štart ──────────────────────────────────────────────────────────────

// Stĺpec a riadok štartovej pozície (0-indexed)
// START_COL=0 = ľavý okraj, START_ROW=11 = stred výšky (ROWS/2)
export const START_COL = 0
export const START_ROW = 11

// Polomer bezpečnej zóny okolo štartu (bez mín)
// 1 = 3×3 okolo hráča, 2 = 5×5 okolo hráča
export const SAFE_RADIUS = 1

// ── Skóre ─────────────────────────────────────────────────────────────────────

// Body za každú novú navštívenú bunku (pred level multiplikátorom)
export const SCORE_PER_CELL = 10

// Level multiplikátory — každý ďalší level zvyšuje skóre
// Level 1 = 1.0×, Level 2 = 1.2×, Level 3 = 1.4×, atď.
// Nové levely nad index pokračujú poslednou hodnotou
export const SCORE_MULTIPLIERS = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0]

// ── Level konfigurácia ────────────────────────────────────────────────────────
// Každý level môže mať vlastné nastavenia.
// Levely nad posledný index opakujú poslednú konfiguráciu.

export interface LevelConfig {
  mines: number         // počet mín na hracej ploche
  lives: number         // počet životov na začiatku levelu
  acFirstMs: number     // čas do prvého lietadla v ms (minimum)
  acFirstMaxMs: number  // čas do prvého lietadla v ms (maximum)
  acMinMs: number       // min interval medzi lietadlami po prvom (ms)
  acMaxMs: number       // max interval medzi lietadlami po prvom (ms)
  acMineDropMin: number // min počet mín, ktoré lietadlo zhodí
  acMineDropMax: number // max počet mín, ktoré lietadlo zhodí
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  // Level 1 — úvod, menej mín, pomalšie lietadlá
  {
    mines: 60,
    lives: 3,
    acFirstMs: 15_000,   // prvé lietadlo najskôr po 15 sekundách
    acFirstMaxMs: 30_000,   // prvé lietadlo najneskôr po 30 sekundách
    acMinMs: 20_000,   // ďalšie lietadlo najskôr po 20 sekundách
    acMaxMs: 45_000,   // ďalšie lietadlo najneskôr po 45 sekundách
    acMineDropMin: 3,
    acMineDropMax: 6,
  },
  // Level 2 — viac mín, lietadlá o niečo častejšie
  {
    mines: 80,
    lives: 3,
    acFirstMs: 12_000,
    acFirstMaxMs: 20_000,
    acMinMs: 15_000,
    acMaxMs: 30_000,
    acMineDropMin: 4,
    acMineDropMax: 7,
  },
  // Level 3 — výzva, viac mín, lietadlá každých ~15–30 sekúnd
  {
    mines: 100,
    lives: 2,
    acFirstMs: 10_000,
    acFirstMaxMs: 15_000,
    acMinMs: 10_000,
    acMaxMs: 20_000,
    acMineDropMin: 5,
    acMineDropMax: 8,
  },
  // Level 4+ — hardcore, časté lietadlá, veľa mín
  {
    mines: 110,
    lives: 2,
    acFirstMs: 8_000,
    acFirstMaxMs: 12_000,
    acMinMs: 8_000,
    acMaxMs: 15_000,
    acMineDropMin: 6,
    acMineDropMax: 10,
  },
]

// ── Lietadlo — pohyb ──────────────────────────────────────────────────────────

// Čas prechodu lietadla naprieč obrazovkou (ms)
// 3000 = 3 sekundy, 2000 = rýchle, 4000 = pomalé
export const AIRPLANE_CROSS_MS = 3000

// ── Zvuk ──────────────────────────────────────────────────────────────────────

// Hlavná hlasitosť (0.0 – 1.0)
export const MASTER_VOLUME = 0.3

// Debounce pre zvukové varovanie (ms) — predchádza chaosu pri rýchlom pohybe
// Kratšie = viac zvuku pri každom kroku, dlhšie = menej prerekovania
export const WARN_DEBOUNCE_MS = 180

// ── Explózia ──────────────────────────────────────────────────────────────────

// Celková dĺžka flash efektu pri explózii (ms)
// 600 = 3 záblesky po 200ms, 400 = 2 záblesky
export const EXPLOSION_FLASH_MS = 600

// ── Blikanie textu ────────────────────────────────────────────────────────────

// Interval blikania (ms) — PRESS ANY KEY, AIRCRAFT!, atď.
export const BLINK_INTERVAL_MS = 500

// Interval blikania aircraft WARNING v status bare (ms)
export const AIRCRAFT_WARN_BLINK_MS = 250

// ── Level complete ────────────────────────────────────────────────────────────

// Čas zobrazenia "LEVEL COMPLETE" overlay pred prechodom na ďalší level (ms)
export const LEVEL_COMPLETE_DELAY_MS = 2500
