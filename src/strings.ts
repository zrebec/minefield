/**
 * strings.ts — all visible text in Minefield, in one place.
 *
 * HOW TO LOCALISE
 * ───────────────
 * Change any string below and Vite hot-reloads the game instantly —
 * you immediately see whether the new text fits the fixed 256×192 layout.
 *
 * To ship a full locale: duplicate this file (e.g. strings.sk.ts),
 * translate every value, then register it in lang.ts.
 *
 * PIXEL BUDGET GUIDE (ZX Spectrum 8×8 font, 256 px wide canvas)
 * ──────────────────────────────────────────────────────────────
 * Full row (32 chars × 8 px):    256 px
 * Status bar:                     2 rows (16 px) at bottom
 * Intro text panel:               rows 12–22 (88 px)
 * Centered overlays:              use drawTextCentered — auto-fits any width
 *                                  up to 32 chars before clipping
 *
 * SPECIFIC BUDGETS
 * ────────────────
 * Status bar row 1 (top):
 *   SCORE prefix on left + LVL/COMBO/SCOUT on right.
 *   Combined max ~28 chars before they overlap.
 *
 * Status bar row 2 (bottom):
 *   MINES on left, DAY/NGT cycle centred, LIVES on right.
 *   Each ≤ 8 chars to keep clear of neighbours.
 *
 * Hi-score entry hints (centered, single row):
 *   Max ~32 chars. Currently 'UP/DN=LETTER  RGHT=NEXT  LEFT=DEL' = 33 chars
 *   and slightly overflows — keep new translations under 32.
 */

// ── Status bar — top row ──────────────────────────────────────────────────

// Player score, zero-padded to 5 digits.
// 'SCORE:99999' = 11 chars. Left-aligned at x=0.
export const STR_SCORE = (score: number) =>
  `SCORE:${String(score).padStart(5, '0')}`

// "Scout" / idle / not-yet-moved state, right-aligned. 5 chars.
export const STR_IDLE = 'SCOUT'

// Active combo display when comboCount ≥ 2. 'COMBO:x9' = 8 chars.
export const STR_COMBO = (count: number) => `COMBO:x${count}`

// Level display, right-aligned. 'LVL:99' = 6 chars.
export const STR_LEVEL = (levelOneBased: number) => `LVL:${levelOneBased}`

// Random (R-rerolled) run markers, top HUD row. STR_RANDOM_TAG is steady, the
// blinking STR_NO_SCORE warns the run is off the leaderboard.
export const STR_RANDOM_TAG = 'RND'
export const STR_NO_SCORE = 'NO SCORE'

// ── Status bar — bottom row ──────────────────────────────────────────────

// Remaining undisarmed mines counter. 'MINES:999' = 9 chars.
export const STR_MINES = (remaining: number) =>
  `MINES:${String(remaining).padStart(3, '0')}`

// Day/night cycle counter, centred. 'DAY:99' / 'NGT:99' = 6 chars.
export const STR_DAY   = (steps: number) => `DAY:${String(steps).padStart(2, '0')}`
export const STR_NIGHT = (steps: number) => `NGT:${String(steps).padStart(2, '0')}`

// m:ss with UNBOUNDED minutes ('74:05') — no hour field, so a long run can never
// widen the string past the layout it was measured for. The single mm:ss formatter
// in the game: the HUD countdown, the SK pack and the end-of-run TIME stat all use
// it, so they can never drift apart.
export const formatClock = (ms: number): string =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`

// Countdown clock, HUD timer row (left). 'TIME 10:00' = 10 chars.
export const STR_TIME = (ms: number) => `TIME ${formatClock(ms)}`

// Lives label, followed by heart sprites. Length affects sprite x-position
// — keep this short or hearts shift left.
export const STR_LIVES_LABEL = 'LIVES:'

// Airplane warning banner, centred. Blinks. Max ~22 chars.
export const STR_AIRCRAFT = '** AIRCRAFT **'

// Friendly recon-plane banner (green-gem reward), centred. Blinks white. Same slot.
export const STR_FRIENDLY = '**  RECON  **'

// ── Accessibility (screen reader / TTS) ─────────────────────────────────────
// NOT pixel-budgeted — these are spoken, not drawn. Full natural sentences.
// STR_A11Y_LEGEND is the full on-demand guide (spoken by H). It carries all the
// depth so the title screen stays a single line — goal, controls, rules, a
// glossary, and the sounds. The sound section MUST match what the game actually
// plays (playWarning / the earcons in audio.ts + the beacon).
export const STR_A11Y_LEGEND =
  'Minefield — guide. ' +
  'The goal. You are crossing a blind minefield, from the gap in the fence on the left to the gap on ' +
  'the right. You cannot see the mines; you find a safe path by listening. Reach the exit on the right ' +
  'to clear a level, and clear every level to win — the war ends and the Strip is safe. ' +
  'Controls. The arrow keys move you one cell at a time. F flags the cell in front of you as a ' +
  'suspected mine; hold Shift with an arrow to flag in that direction instead. P pauses and resumes. ' +
  'Plus and minus change the volume. During play: D plays a sonar sweep of nearby mines, E tells you ' +
  'where the exit is, G tells you the nearest gem, and H repeats this guide. On the title screen: press ' +
  "Space to play today's field, R for a random field, I for the story, and L to switch language. " +
  'The rules. Step on a mine and it explodes: you lose a life, and losing your last life ends the game. ' +
  'Each level also has a timer counting down; if it reaches zero, the game ends. The daily field is the ' +
  'same for every player and your score goes on the high-score table; a random field is for practice and ' +
  'is not scored. ' +
  'What is on the field. Mines are hidden and deadly — the beeps and the sonar warn you when they are ' +
  'near. Gems are safe to pick up: each gives points and extra time, and some are special — two red gems ' +
  'earn a life, three cyan reveal a live mine, a gold gem is a large score bonus, and green gems call a ' +
  'friendly plane that reveals mines. Buildings are solid, so you walk around them. A fence surrounds the ' +
  'field with one way in and one way out. A flag is only your own note on a cell — it does not change ' +
  'what is underneath. And an enemy plane flies over now and then to scatter fresh mines; you will hear ' +
  'it approaching. ' +
  'The sounds. A soft footstep means you moved safely. Beeps mean live mines are right next to you — one ' +
  'beep for each mine, so count them; they tell you how many, not where, so move and listen again to ' +
  'find the direction. A descending double beep means a wall, a building, or the edge of the field ' +
  'blocked your step. A short blip confirms you placed a flag; a low tick means you took one back. A ' +
  'burst of noise is an explosion — you stepped on a mine. On the sonar, from D: one ping per mine, ' +
  'nearest first — left or right in your ears is west or east, a higher pitch is north and a lower pitch ' +
  'is south, and louder is closer; a single low tone means nothing is in range. On the exit beacon, from ' +
  "E: a tone that grows louder as you near the exit's column and rises when the exit is north of you, " +
  'becoming a double beep when you are exactly level with it — then head straight east. ' +
  'Press H at any time to hear this guide again.'
// Short prompt shown in the static #sr-legend region at start (not the full guide,
// which a returning player doesn't need re-read every time — H replays it on demand).
export const STR_A11Y_LEGEND_HINT = 'Press H to hear the audio guide.'

// Orientation (spoken): a relative bearing "<n> right, <n> up" — mines stay hidden,
// but exit + gems are visible to a sighted player in scout mode, so announcing them
// is parity, not an assist. Direction words feed relPhrase() in a11y.ts.
export const STR_A11Y_RIGHT = 'right'
export const STR_A11Y_LEFT  = 'left'
export const STR_A11Y_UP    = 'up'
export const STR_A11Y_DOWN  = 'down'
export const STR_A11Y_HERE  = 'here'
export const STR_A11Y_EXIT = (rel: string) => `Exit: ${rel}.`
export const STR_A11Y_GEM_COLOUR: Record<string, string> = { red: 'red', cyan: 'cyan', gold: 'gold', green: 'green' }
// Owner playtest 2026-07-15: terse — colour + remaining count, no sentence. The
// count also makes consecutive pickups distinct text, so status()'s dedupe can't
// silence a fast second pickup of the same colour.
export const STR_A11Y_GEM_GOT = (colour: string, left: number) => `${colour} gem, ${left} left.`
export const STR_A11Y_GEM_NEAREST = (colour: string, rel: string, n: number) =>
  `${colour} gem ${rel}. ${n} left.`
export const STR_A11Y_GEM_NONE = 'No gems left.'
export const STR_A11Y_ORIENT = (exitRel: string, gemCount: number) =>
  `Exit ${exitRel}. ${gemCount} ${gemCount === 1 ? 'gem' : 'gems'}.`

// Status announcements (polite region)
export const STR_A11Y_LEVEL_DONE = (levelOneBased: number) => `Level ${levelOneBased} complete.`
export const STR_A11Y_LIFE_LOST = (lives: number) => `Mine hit. ${lives} ${lives === 1 ? 'life' : 'lives'} left.`
export const STR_A11Y_GAMEOVER = 'Game over.'
export const STR_A11Y_WIN = 'You won. The war is over — the Strip is clear and the two countries are reunited.'
export const STR_A11Y_MODE_DAILY = 'Daily run.'
export const STR_A11Y_MODE_RANDOM = 'Random run.'
// Spoken (assertive) on pause so it re-reads on every pause, not just the first.
export const STR_A11Y_PAUSE = 'Paused.'

// Title menu, mirrored into the navigable #sr-menu region while the title is
// up (setMenu in a11y.ts). One array entry = one browsable line; must advertise
// every key the title screen actually listens to (main.ts intro branch).
// Terse by owner decree (2026-07-15): headwords, not sentences — a screen reader
// reads this at every title visit.
export const STR_A11Y_MENU_LINES: readonly string[] = [
  'Menu.',
  'Space, Enter or S: daily run — scored, same field for everyone.',
  'R: random run — not scored.',
  'I: story intro.',
  'L: language.',
  'H: audio guide. In game: E exit, G nearest gem.',
  'Arrows move, F flag, P pause, plus minus volume.',
]
export const STR_A11Y_MENU_SCORES    = 'High scores:'
export const STR_A11Y_MENU_NO_SCORES = 'No high scores yet.'
export const STR_A11Y_MENU_SCORE_ROW = (rank: number, name: string, score: number, level: number, date?: string) =>
  `${rank}. ${name}: ${score} points, level ${level}${date ? ', ' + date : ''}.`
// Scores are stored per origin (scoreProfile in highscore.ts), so the same game
// played from the web, from the offline launcher and from itch.io keeps three
// separate tables. A sighted player sees the host printed above the table; this
// is the same fact for a screen reader, and it matters more there — nothing else
// in the audio would ever hint at it.
export const STR_A11Y_MENU_PROFILE = (host: string) => `These scores are kept for ${host}.`
// Spoken on every landing on the title — deliberately ONE line (owner 2026-07-22):
// just point at H. Everything else (goal, controls, rules, glossary) lives in the
// H guide (STR_A11Y_LEGEND) and the browsable #sr-menu, so the start never rambles.
export const STR_A11Y_TITLE = 'Press H for rules and help.'

// Aircraft (approaching = assertive warning; reseed report = polite)
export const STR_A11Y_PLANE_APPROACHING = 'Plane approaching.'
export const STR_A11Y_PLANE_RESEEDED = (n: number) => `${n} new ${n === 1 ? 'mine' : 'mines'}.`
export const STR_A11Y_PLANE_PASSED = 'No new mines.'

// ── Loading screen ────────────────────────────────────────────────────────
// Drawn on cell row 4 of the loading picture, which is measured empty (see
// loading.ts). 11 chars, centred → columns 10-20, clear of the falling mines
// in columns 24-25.
export const STR_LOADING_PROMPT = 'PRESS ENTER'
// Spoken once when the loading screen appears. A game played by ear must say
// what it is waiting for: without this a blind player meets a picture they
// cannot see and silence they cannot interpret. It is also the only screen in
// the game where the announcement itself cannot be heard — the sound is not on
// yet, which is exactly what the keypress is for — so this goes to the screen
// reader, which is not subject to the browser's audio gesture rule.
export const STR_A11Y_LOADING = 'Minefield. Press Enter to start. This also turns the sound on.'

// ── Game-over overlay ─────────────────────────────────────────────────────

export const STR_GAME_OVER     = 'GAME  OVER'         // double-space styling
export const STR_PRESS_ANY_KEY = 'PRESS ANY KEY'
// Victory epilogue (drawn — ASCII only, ≤32 cols); reuses STR_SCORE_OVERLAY + STR_PRESS_ANY_KEY.
export const STR_WIN_TITLE = 'THE WAR IS OVER'
export const STR_WIN_LINE1 = 'THE STRIP IS CLEAR AT LAST'
export const STR_WIN_LINE2 = 'TWO LANDS ARE ONE AGAIN'

// Used by both game-over and level-complete overlays. Note: prefix has a
// trailing space (different from STR_SCORE which uses a colon). Pixel budget:
// 'SCORE: 99999' = 12 chars.
export const STR_SCORE_OVERLAY = (score: number) =>
  `SCORE: ${String(score).padStart(5, '0')}`

// End-of-run summary labels (game over + win). DRAWN with the ROM font, so ASCII
// only — Slovak included — and **≤ 10 chars**: renderRunStats lays each row out as
// 'LABEL:' padded to 12 columns + an 11-column right-aligned value, starting at
// column 4, so a longer label pushes the value off the 32-column screen. Both
// limits are test-guarded in strings.test.ts.
export const STAT_LABEL: Record<string, string> = {
  time: 'TIME',
  level: 'LEVEL',
  steps: 'STEPS',
  backtrack: 'BACKTRACK',
  combo: 'BEST COMBO',
  deaths: 'DEATHS',
  gems: 'GEMS',
  flags: 'FLAGS',
  onMines: 'ON MINES',
}

// ── Pause overlay (paged: controls / gems / scoring) ──────────────────────

export const STR_PAUSED = '** PAUSED **'
// Page titles (index = page). Hint line tells the player how to leaf/resume.
export const STR_PAUSE_TITLES = ['CONTROLS', 'GEMS', 'SCORING']
export const STR_PAUSE_HINT   = 'ARROWS: PAGE   P: RESUME'

// Per-control description, keyed by CONTROLS id. The key label comes from
// config (CONTROLS[].keys); this is just the wording.
export const CONTROL_DESC: Record<string, string> = {
  move:   'Move',
  flag:   'Flag cell ahead',
  flagDir: 'Flag any direction',
  pause:  'Pause / resume',
  save:   'Manual save',
  reveal: 'Sonar sweep + reveal',
  fps:    'FPS / CPU overlay',
  volume: 'Volume up / down',
  start:  'Start daily run',
  random: 'Start random run',
}

// Gem labels + special-function wording, keyed by gem id. Time bonus and point
// values are read from config at render time (single source), not duplicated here.
export const GEM_LABEL: Record<string, string> = { red: 'RED', cyan: 'CYAN', gold: 'GOLD', green: 'GREEN' }
export const GEM_SPECIAL: Record<string, string> = {
  red:   '2 = +1 life',
  cyan:  '3 = reveal a mine',
  gold:  'big points',
  green: '2 = recon plane',
}
export const STR_GEM_ALL  = (pts: number) => `Every gem: +${pts} pts`
export const STR_GEM_FULL = 'Full bag: gem left on field'

// Scoring page lines. Point values interpolated from config (single source).
export const STR_SCORE_LINES = (gemPts: number, goldBonus: number): string[] => [
  'Each new cell: base x level',
  'Combo: chain cells, up to x2',
  `Gem pickup: +${gemPts} (x combo)`,
  `Gold gem: +${goldBonus} extra`,
  'Stepping on a mine: 0 pts',
]

// ── Level-complete overlay ────────────────────────────────────────────────

export const STR_LEVEL_COMPLETE = 'LEVEL  COMPLETE!'
export const STR_GET_READY      = 'GET READY...'

// ── Hi-score name-entry screen ────────────────────────────────────────────

export const STR_NEW_HIGH_SCORE   = 'NEW HIGH SCORE!'
export const STR_ENTER_YOUR_NAME  = 'ENTER YOUR NAME:'

// Confirm/cancel hint when the user has typed ≥ 1 letter. 21 chars.
export const STR_HISCORE_CONFIRM  = 'START=SAVE   ESC=SKIP'

// Prompt shown before any letter is typed. 19 chars.
export const STR_HISCORE_PROMPT   = 'TYPE  OR  USE D-PAD'

// Bottom hint row — alternates depending on whether a pad letter is active.
// Pad version is 33 chars (slightly overflows by 1 char). Keep translations
// ≤ 32 chars to avoid clipping.
export const STR_HISCORE_HINT_PAD       = 'UP/DN=LETTER  RGHT=NEXT  LEFT=DEL'
export const STR_HISCORE_HINT_KEYBOARD  = 'KEYBOARD: TYPE LETTERS'

// ── Intro / title screen ──────────────────────────────────────────────────

// Game title — uses single-spaced letters for the retro spread effect.
// 17 chars including spaces. The game is "Minefield", and so are the repo, the
// directory and the URL: a 1982 Spectrum release would have carried this name,
// and the rename to "The Strip" was dropped on that reasoning (ROADMAP
// Decisions, 2026-08-16). "The Strip" survives only as the *place* in the story.
export const STR_TITLE    = 'M I N E F I E L D'

// Subtitle under the title. 21 chars.
export const STR_SUBTITLE = 'ZX  SPECTRUM  EDITION'

// Hi-scores section header. 11 chars.
export const STR_HIGH_SCORES_HEADER = 'HIGH SCORES'

// Controls hint lines (intro, alternates with high scores).
export const STR_CTRL_MOVE  = 'ARROWS / D-PAD = MOVE'  // 21 chars
export const STR_CTRL_FLAG  = 'F / BTN-A = FLAG MINE'  // 21 chars
export const STR_CTRL_PAUSE = 'P / START = PAUSE'      // 17 chars
export const STR_GOAL       = 'CROSS THE FIELD!'       // 16 chars

// Audio unlock prompt — appears under the controls list. 25 chars.

// "Press to start" banner — blinks. ≤ 32 chars. `I` replays the story intro.
export const STR_START_HINT = 'SPACE=DAILY  R=RANDOM  I=INTRO'

// ── Story intro ──────────────────────────────────────────────────────────
// The no-man's-land the story names is "the Strip" — a place, not the game.
// Keep it: the Slovak pack calls it "Pás" and the two must stay in step.
// Played once on cold load before the title (see intro.ts / main.ts 'story'
// phase). Each card is an array of left-aligned lines, typed out one char at a
// time. Keep every line ≤ 30 chars (ASCII only — the ZX ROM font has no em-dash;
// use '-'). The card COUNT must match across locales (strings.test.ts guards it).
export const STR_STORY_CARDS: readonly (readonly string[])[] = [
  [
    'A WAR NO ONE DECLARED.',
    'A WAR NO ONE ENDED.',
    'BETWEEN TWO COUNTRIES LAY',
    'A STRETCH OF NO MAN\'S LAND.',
    'THEY CALLED IT THE STRIP.',
  ],
  [
    'OVERNIGHT THEY TORE THEM',
    'APART: MOTHERS FROM SONS,',
    'LOVERS, FRIENDS. AND EACH',
    'NIGHT A PLANE RESEEDS THE',
    'DEATH THAT KEEPS THEM APART.',
  ],
  [
    'FOR YEARS THEY SEARCHED FOR',
    'A WAY ACROSS. THE FIELD',
    'SWALLOWED ALL WHO TRIED.',
    'NO PATH. NO RETURN. ONLY',
    'THE SILENCE AFTER THE BLAST.',
  ],
  [
    'THEN ONE MAN WATCHED HOW',
    'THEY SOWED IT, AND FOUND',
    'THE PATTERN. HE BUILT A',
    'SONAR - AND SUDDENLY HEARD',
    'A SAFE WAY THROUGH.',
  ],
  [
    'THE PEOPLE WOULD NOT RISK',
    'THEIR LIVES - SO THEY PRESSED',
    'PARCELS INTO HIS HANDS: FOR',
    'A MOTHER, A LOVE, A SON',
    'ACROSS. CARRY THEM HOME.',
  ],
]

// Chapter titles shown book-style on each card's heading rule ("N/5  TITLE").
// One per card; the count must match STR_STORY_CARDS (strings.test.ts guards it).
export const STR_STORY_TITLES: readonly string[] = [
  'THE DIVIDE',
  'TORN APART',
  'NO WAY ACROSS',
  'THE RUNNER',
  'NEW HOPE',
]

// Hint shown (blinking) at the bottom of every story card. 14 chars.
export const STR_STORY_SKIP_HINT = 'ANY KEY = SKIP'

// Footer lines — copyright + zx-kit version. `(C) 2026  RELEASE:{x}` is
// stretched to fit the right-aligned RELEASE tag without overflow at
// reasonable version-string lengths.
export const STR_COPYRIGHT      = (build: string)   => `(C) 2026  RELEASE:${build}`
export const STR_ZXKIT_VERSION  = (version: string) => `ZX-KIT:${version}`
