/**
 * strings.sk.ts — slovenský preklad Minefieldu.
 *
 * Musí presne kopírovať tvar strings.ts (anglickej zdrojovej verzie).
 * Pri pridaní nového reťazca do strings.ts pridaj sem aj jeho preklad —
 * cast v lang.ts hovorí TypeScriptu, že tvary sú kompatibilné, takže
 * chýbajúci preklad sa neukáže ako TS chyba, ale ako prázdny text v hre.
 *
 * AKTIVÁCIA
 * ─────────
 * Nastav `LANGUAGE_CODE = 'sk'` v config.ts a HMR okamžite prepne hru.
 *
 * PIXEL BUDGET — DÔLEŽITÉ
 * ───────────────────────
 * Hra beží v pevnom rozlíšení 256×192 px, 8×8 px font.
 * Pixel budget každého reťazca je v komentári v strings.ts. Pri preklade
 * do slovenčiny pozor — slovenské slová bývajú dlhšie ako anglické.
 *
 * Diakritika: ROM font zx-kit má len ASCII. Á É Í Ó Ú Č Š Ž sa nevykreslia
 * správne — používaj len ASCII verzie (A E I O U C S Z).
 */

// ── Status bar — horný riadok ─────────────────────────────────────────────

export const STR_SCORE = (score: number) =>
  `SKORE:${String(score).padStart(5, '0')}`   // 11 znakov

export const STR_IDLE = 'PRIES'                              // 5 znakov (pripravený / prieskumník)

export const STR_COMBO = (count: number) => `KOMBO:x${count}` // 8 znakov

export const STR_LEVEL = (levelOneBased: number) => `LVL:${levelOneBased}`  // 6 znakov

// Náhodná (R) hra: STR_RANDOM_TAG je stály, blikajúce STR_NO_SCORE varuje, že
// beh nejde do rebríčka. Bez diakritiky (ZX ROM font).
export const STR_RANDOM_TAG = 'NAH'                          // 3 znaky (náhodný)
export const STR_NO_SCORE = 'BEZ SKORE'                      // 9 znakov

// ── Status bar — dolný riadok ─────────────────────────────────────────────

export const STR_MINES = (remaining: number) =>
  `MINY:${String(remaining).padStart(3, '0')}`   // 8 znakov

export const STR_DAY   = (steps: number) => `DEN:${String(steps).padStart(2, '0')}`  // 6 znakov
export const STR_NIGHT = (steps: number) => `NOC:${String(steps).padStart(2, '0')}`  // 6 znakov

// Odpočet času, HUD riadok časovača (vľavo). 'CAS 10:00' = 9 znakov.
export const STR_TIME = (ms: number) =>
  `CAS ${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`

export const STR_LIVES_LABEL = 'ZIV:'                       // 4 znaky (skrátené aby srdcia ostali napravo)

export const STR_AIRCRAFT = '** LIETADLO **'                // 14 znakov

// ── Game over overlay ─────────────────────────────────────────────────────

export const STR_GAME_OVER     = 'KONIEC  HRY'              // 11 znakov
export const STR_PRESS_ANY_KEY = 'STLAC KLAVES'             // 12 znakov

export const STR_SCORE_OVERLAY = (score: number) =>
  `SKORE: ${String(score).padStart(5, '0')}`                // 13 znakov

// ── Pause overlay (stránky: ovládanie / gemy / skóre) ─────────────────────

export const STR_PAUSED = '** PAUZA **'                     // 11 znakov
export const STR_PAUSE_TITLES = ['OVLADANIE', 'GEMY', 'SKORE']
export const STR_PAUSE_HINT   = 'SIPKY: STRANA   P: SPAT'

export const CONTROL_DESC: Record<string, string> = {
  move:   'Pohyb',
  flag:   'Vlajka pred hracom',
  pause:  'Pauza / pokracovanie',
  save:   'Manualne ulozenie',
  reveal: 'Odkry miny (v pokoji)',
  fps:    'FPS / CPU prekrytie',
  volume: 'Hlasitost +/-',
  start:  'Spustit denny beh',
  random: 'Spustit nahodny beh',
}

export const GEM_LABEL: Record<string, string> = { red: 'CERV', cyan: 'CYAN', gold: 'ZLAT', green: 'ZELEN' }
export const GEM_SPECIAL: Record<string, string> = {
  red:   '2 = +1 zivot',
  cyan:  '3 = odkry minu',
  gold:  'vela bodov',
  green: '(len cas)',
}
export const STR_GEM_ALL  = (pts: number) => `Kazdy gem: +${pts} b.`
export const STR_GEM_FULL = 'Plny batoh: gem ostane na poli'

export const STR_SCORE_LINES = (gemPts: number, goldBonus: number): string[] => [
  'Kazda nova bunka: base x level',
  'Combo: retaz buniek, az x2',
  `Zber gemu: +${gemPts} (x combo)`,
  `Zlaty gem: +${goldBonus} navyse`,
  'Slapnutie na minu: 0 b.',
]

// ── Level complete overlay ────────────────────────────────────────────────

export const STR_LEVEL_COMPLETE = 'LEVEL  HOTOVY!'          // 14 znakov
export const STR_GET_READY      = 'PRIPRAV SA...'           // 13 znakov

// ── Hi-score name entry ───────────────────────────────────────────────────

export const STR_NEW_HIGH_SCORE   = 'NOVE TOP SKORE!'       // 15 znakov
export const STR_ENTER_YOUR_NAME  = 'ZADAJ MENO:'           // 11 znakov

export const STR_HISCORE_CONFIRM  = 'START=ULOZ   ESC=PRES' // 21 znakov

export const STR_HISCORE_PROMPT   = 'PISAJ ALEBO POUZI PAD' // 21 znakov

export const STR_HISCORE_HINT_PAD       = 'HORE/DOLE=PIS  VPRAVO=DAL  DEL'  // 30 znakov
export const STR_HISCORE_HINT_KEYBOARD  = 'KLAVESNICA: PISAJ PISMENA'        // 25 znakov

// ── Intro / title screen ──────────────────────────────────────────────────

// "The Strip" je názov hry (brand, nechávame anglicky); repo/adresár zatiaľ
// ostáva "minefield" do neskoršieho cieleného premenovania.
export const STR_TITLE    = 'T H E   S T R I P'             // 17 znakov

export const STR_SUBTITLE = 'ZX  SPECTRUM  EDICIA'          // 20 znakov

export const STR_HIGH_SCORES_HEADER = 'NAJLEPSIE SKORE'     // 15 znakov

export const STR_HIGH_SCORE_LINE = (rank: number, name: string, score: number, level: number, date?: string) => {
  const d = date && date.length >= 10 ? date.slice(5) : '-----'
  return `${rank}. ${name}  ${String(score).padStart(5, '0')}  LVL:${level}  ${d}`
}

export const STR_CTRL_MOVE  = 'SIPKY / D-PAD = POHYB'       // 21 znakov
export const STR_CTRL_FLAG  = 'F / BTN-A = OZNAC MINU'      // 22 znakov
export const STR_CTRL_PAUSE = 'P / START = PAUZA'           // 17 znakov
export const STR_GOAL       = 'PREJDI POLE!'                // 12 znakov

export const STR_AUDIO_HINT = 'KLIK/TAP PRE ZVUK'           // 17 znakov

export const STR_START_HINT = 'SPACE=DENNY R=NAHODNY I=INTRO' // 29 znakov; I = prehrať intro

// ── Príbehové intro ("The Strip") ──────────────────────────────────────────
// Bez diakritiky (ROM font), každý riadok ≤ 30 znakov, '-' namiesto pomlčky.
// Počet kariet musí sedieť s EN (stráži strings.test.ts).
export const STR_STORY_CARDS: readonly (readonly string[])[] = [
  [
    'ZIMA. JEDENASTY ROK',
    'VOJNY KTORU NIKTO',
    'NEVYHLASIL. MEDZI MURMI',
    'LEZI PAS - POLE',
    'POCHOVANEJ SMRTI.',
  ],
  [
    'KAZDU NOC ICH ROZSIEVAC',
    'PRELETI A ZNOVA HO ZASEJE.',
    'KAZDU NOC INY HROB.',
  ],
  [
    'PRECHADZAS POTME.',
    'MINY NEVIDIS - POCUJES ICH.',
    'NAJDI MEDZERU V DRUHEJ',
    'STENE. PREJDI PRED USVITOM.',
  ],
  [
    'PRVEHO POSLA NASLI',
    'AZ NA JAR. ALE PRESIEL.',
    'A PRVU ZASIELKU',
    'DONIESOL DOMOV.',
  ],
]

export const STR_STORY_SKIP_HINT = 'LUBOVOLNA KLAVESA = DALEJ' // 25 znakov

export const STR_COPYRIGHT      = (build: string)   => `(C) 2026  VYDANIE:${build}`
export const STR_ZXKIT_VERSION  = (version: string) => `ZX-KIT:${version}`
