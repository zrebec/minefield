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
 * VÝNIMKA: STR_A11Y_* reťazce sú HOVORENÉ (čítačka obrazovky / TTS), nie
 * kreslené fontom — tam POUŽÍVAJ plnú diakritiku, nech ich čítačka vysloví správne.
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

export const STR_FRIENDLY = '** PRIESKUM **'                // 14 znakov (spriatelené lietadlo)

// ── Prístupnosť (čítačka obrazovky / TTS) ───────────────────────────────────
// NEmajú pixel budget — sú hovorené, nie kreslené. Plné vety, plná diakritika.
// STR_A11Y_LEGEND je plný sprievodca na požiadanie (hovorí ho H). Nesie všetku
// hĺbku, aby titulná obrazovka ostala jednou vetou — cieľ, ovládanie, pravidlá,
// pojmy a zvuky. Zvuková časť MUSÍ sedieť s tým, čo hra naozaj hrá (playWarning /
// earcony v audio.ts + maják).
export const STR_A11Y_LEGEND =
  'The Strip — sprievodca. ' +
  'Cieľ. Prechádzaš cez slepé mínové pole, od medzery v plote vľavo k medzere vpravo. Míny nevidíš; ' +
  'bezpečnú cestu nájdeš počúvaním. Dostaň sa k východu vpravo a prejdeš úroveň; prejdi všetky úrovne a ' +
  'vyhráš — vojna sa skončí a Pás je bezpečný. ' +
  'Ovládanie. Šípky ťa posúvajú o jednu bunku. F označí bunku pred tebou ako podozrivú z míny; podrž ' +
  'Shift so šípkou a označíš v danom smere. P pozastaví a spustí hru. Plus a mínus menia hlasitosť. ' +
  'Počas hry: D spustí sonarový sken mín v okolí, E ti povie, kde je východ, G najbližší gem a H zopakuje ' +
  'tohto sprievodcu. Na titulnej obrazovke: medzerník zahrá dnešné pole, R náhodné pole, I príbeh a L ' +
  'prepne jazyk. ' +
  'Pravidlá. Keď stúpiš na mínu, vybuchne: stratíš život, a strata posledného života ukončí hru. Každá ' +
  'úroveň má aj časovač, ktorý odpočítava; keď dosiahne nulu, hra sa skončí. Denné pole je rovnaké pre ' +
  'všetkých hráčov a tvoje skóre ide do tabuľky najlepších; náhodné pole je na cvičenie a neboduje sa. ' +
  'Čo je na poli. Míny sú skryté a smrteľné — pípanie a sonar ťa varujú, keď sú blízko. Gemy sú bezpečné ' +
  'na zber: každý dá body a čas navyše, a niektoré sú špeciálne — dva červené gemy pridajú život, tri ' +
  'azúrové odhalia živú mínu, zlatý gem je veľký bonus k skóre a zelené gemy privolajú priateľské ' +
  'lietadlo, ktoré odhalí míny. Budovy sú pevné, tak ich obchádzaš. Pole obopína plot s jednou cestou ' +
  'dnu a jednou von. Vlajka je len tvoja poznámka na bunke — nemení to, čo je pod ňou. A z času na čas ' +
  'preletí nepriateľské lietadlo a rozsype nové míny; budeš ho počuť prilietať. ' +
  'Zvuky. Jemný krok znamená, že si prešiel bezpečne. Pípanie znamená, že hneď vedľa teba sú živé míny — ' +
  'jedno pípnutie na každú mínu, tak ich spočítaj; povedia koľko, nie kde, tak sa pohni a počúvaj znova, ' +
  'aby si našiel smer. Klesajúce dvojité pípnutie znamená, že krok ti zablokovala stena, budova alebo ' +
  'okraj poľa. Krátke pípnutie potvrdí, že si položil vlajku; hlboký ťuk znamená, že si ju vzal späť. ' +
  'Buchot je výbuch — stúpil si na mínu. Zo sonaru, klávesa D: jedno pípnutie na každú mínu, od ' +
  'najbližšej — ľavé či pravé ucho je západ či východ, vyšší tón je sever a nižší juh, hlasnejšie je ' +
  'bližšie; jediný hlboký tón znamená, že v dosahu nič nie je. Z majáku východu, klávesa E: tón, ktorý ' +
  'silnie, ako sa blížiš k stĺpcu východu, a stúpa, keď je východ nad tebou, a zmení sa na dvojité ' +
  'pípnutie, keď si presne na jeho úrovni — vtedy choď rovno na východ. ' +
  'Kedykoľvek stlač H a tohto sprievodcu si vypočuješ znova.'
// Krátky odkaz v statickom #sr-legend regióne pri štarte (nie plný sprievodca, ktorého
// vracajúci sa hráč nepotrebuje počuť zakaždým — H ho na požiadanie prehrá).
export const STR_A11Y_LEGEND_HINT = 'Stlač H a vypočuješ si zvukového sprievodcu.'

// Orientácia (hovorené): relatívny smer „<n> vpravo, <n> hore" — míny ostávajú
// skryté, ale východ + gemy vidí vidiaci hráč v scout móde, takže ich hlásenie je
// parita, nie výhoda. Slová smeru kŕmia relPhrase() v a11y.ts.
export const STR_A11Y_RIGHT = 'vpravo'
export const STR_A11Y_LEFT  = 'vľavo'
export const STR_A11Y_UP    = 'hore'
export const STR_A11Y_DOWN  = 'dole'
export const STR_A11Y_HERE  = 'tu'
export const STR_A11Y_EXIT = (rel: string) => `Východ: ${rel}.`
export const STR_A11Y_GEM_COLOUR: Record<string, string> = { red: 'červený', cyan: 'tyrkysový', gold: 'zlatý', green: 'zelený' }
// Playtest ownera 2026-07-15: stroho — farba + zvyšný počet, žiadna veta. Počet
// zároveň robí po sebe idúce zbery unikátnym textom, takže dedupe v status()
// neumlčí rýchly druhý gem tej istej farby.
export const STR_A11Y_GEM_GOT = (colour: string, left: number) => `${colour} gem, ${left} zostáva.`
export const STR_A11Y_GEM_NEAREST = (colour: string, rel: string, n: number) =>
  `${colour} gem ${rel}. ${n} zostáva.`
export const STR_A11Y_GEM_NONE = 'Žiadne gemy nezostali.'
export const STR_A11Y_ORIENT = (exitRel: string, gemCount: number) =>
  `Východ ${exitRel}. ${gemCount} ${gemCount === 1 ? 'gem' : gemCount >= 2 && gemCount <= 4 ? 'gemy' : 'gemov'}.`

// Status hlásenia (polite región)
export const STR_A11Y_LEVEL_DONE = (levelOneBased: number) => `Úroveň ${levelOneBased} dokončená.`
export const STR_A11Y_LIFE_LOST = (lives: number) =>
  `Zásah mínou. Zostáva ${lives} ${lives === 1 ? 'život' : lives >= 2 && lives <= 4 ? 'životy' : 'životov'}.`
export const STR_A11Y_GAMEOVER = 'Koniec hry.'
export const STR_A11Y_WIN = 'Vyhral si. Vojna sa skončila — Pás je čistý a dve krajiny sú zas spolu.'
export const STR_A11Y_MODE_DAILY = 'Denný beh.'
export const STR_A11Y_MODE_RANDOM = 'Náhodný beh.'
// Hovorené (assertive) pri pauze — nech sa prehrá pri každej pauze, nie len prvej.
export const STR_A11Y_PAUSE = 'Pauza.'

// Titulné menu, zrkadlené do navigovateľného #sr-menu regiónu, kým je titulná
// obrazovka hore (setMenu v a11y.ts). Jeden prvok poľa = jeden riadok; musí
// spomenúť každý kláves, na ktorý titulná obrazovka naozaj počúva.
// Stroho podľa ownera (2026-07-15): heslá, nie vety — čítačka to číta pri
// každej návšteve titulnej obrazovky.
export const STR_A11Y_MENU_LINES: readonly string[] = [
  'Menu.',
  'Medzerník, Enter alebo S: denný beh — bodovaný, rovnaké pole pre všetkých.',
  'R: náhodný beh — nebodovaný.',
  'I: úvodný príbeh.',
  'L: jazyk.',
  'H: zvukový sprievodca. V hre: E východ, G najbližší gem.',
  'Šípky pohyb, F vlajka, P pauza, plus mínus hlasitosť.',
]
export const STR_A11Y_MENU_SCORES    = 'Najlepšie skóre:'
export const STR_A11Y_MENU_NO_SCORES = 'Zatiaľ žiadne skóre.'
export const STR_A11Y_MENU_SCORE_ROW = (rank: number, name: string, score: number, level: number, date?: string) =>
  `${rank}. ${name}: ${score} bodov, úroveň ${level}${date ? ', ' + date : ''}.`
// Hovorené pri každom pristátí na titulnej obrazovke — zámerne JEDNA veta (owner
// 2026-07-22): len ukáž na H. Všetko ostatné (cieľ, ovládanie, pravidlá, pojmy) je
// v H sprievodcovi (STR_A11Y_LEGEND) a v navigovateľnom #sr-menu, nech štart nekecá.
export const STR_A11Y_TITLE = 'Stlač H pre pravidlá a pomoc.'

// Lietadlo (blíži sa = assertive varovanie; presiatie = polite hlásenie)
export const STR_A11Y_PLANE_APPROACHING = 'Blíži sa lietadlo.'
export const STR_A11Y_PLANE_RESEEDED = (n: number) =>
  `${n} ${n === 1 ? 'nová mína' : n >= 2 && n <= 4 ? 'nové míny' : 'nových mín'}.`
export const STR_A11Y_PLANE_PASSED = 'Žiadne nové míny.'

// ── Game over overlay ─────────────────────────────────────────────────────

export const STR_GAME_OVER     = 'KONIEC  HRY'              // 11 znakov
export const STR_PRESS_ANY_KEY = 'STLAC KLAVES'             // 12 znakov
// Víťazný epilóg (kreslený — ASCII bez diakritiky, ≤32 stĺpcov).
export const STR_WIN_TITLE = 'VOJNA SA SKONCILA'
export const STR_WIN_LINE1 = 'PAS JE KONECNE CISTY'
export const STR_WIN_LINE2 = 'DVE KRAJINY SU ZAS SPOLU'

export const STR_SCORE_OVERLAY = (score: number) =>
  `SKORE: ${String(score).padStart(5, '0')}`                // 13 znakov

// ── Pause overlay (stránky: ovládanie / gemy / skóre) ─────────────────────

export const STR_PAUSED = '** PAUZA **'                     // 11 znakov
export const STR_PAUSE_TITLES = ['OVLADANIE', 'GEMY', 'SKORE']
export const STR_PAUSE_HINT   = 'SIPKY: STRANA   P: SPAT'

export const CONTROL_DESC: Record<string, string> = {
  move:   'Pohyb',
  flag:   'Vlajka pred hracom',
  flagDir: 'Vlajka - lubovolny smer',
  pause:  'Pauza / pokracovanie',
  save:   'Manualne ulozenie',
  reveal: 'Sonar + odkry miny',
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
  green: '2 = lietadlo',
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

export const STR_CTRL_MOVE  = 'SIPKY / D-PAD = POHYB'       // 21 znakov
export const STR_CTRL_FLAG  = 'F / BTN-A = OZNAC MINU'      // 22 znakov
export const STR_CTRL_PAUSE = 'P / START = PAUZA'           // 17 znakov
export const STR_GOAL       = 'PREJDI POLE!'                // 12 znakov

export const STR_AUDIO_HINT = 'KLIK/TAP PRE ZVUK'           // 17 znakov

export const STR_START_HINT = 'SPACE=DENNY R=NAHODNY I=INTRO' // 29 znakov; I = prehrať intro

// ── Príbehové intro ("The Strip") ──────────────────────────────────────────
// Bez diakritiky (ROM font), každý riadok ≤ 30 znakov, '-' namiesto pomlčky.
// Počet kariet musí sedieť s EN (stráži strings.test.ts).
// Pozn.: v hre sa zobrazujú ANGLICKE karty (default locale = EN); toto je SK
// preklad pre SK locale + ako poznámka. Počet kariet musí sedieť s EN (5).
export const STR_STORY_CARDS: readonly (readonly string[])[] = [
  [
    'VOJNA, KTORU NIKTO',
    'NEVYHLASIL. A NIKTO',
    'NEUKONCIL. MEDZI DVOMA',
    'KRAJINAMI NECHALI UZEMIE',
    'NIKOHO. VOLALI HO PAS.',
  ],
  [
    'CEZ NOC ICH ROZTRHLI - MATKY',
    'OD SYNOV, MILENCOV, PRIATELOV.',
    'A KAZDU NOC LIETADLO NANOVO',
    'ZASEJE SMRT, CO ICH DELI.',
  ],
  [
    'ROKY HLADALI CESTU K SEBE.',
    'POLE POHLTILO KAZDEHO, KTO',
    'TO SKUSIL. ZIADNA CESTA.',
    'ZIADNY NAVRAT. LEN TICHO',
    'PO VYBUCHU.',
  ],
  [
    'POTOM JEDEN MUZ SLEDOVAL,',
    'AKO HO ZASIEVAJU, A NASIEL',
    'VZOREC. VYROBIL SI SONAR',
    'A ZRAZU POCUL BEZPECNU',
    'CESTU.',
  ],
  [
    'LUDIA NECHCELI RISKOVAT',
    'VLASTNE ZIVOTY - TAK MU DALI',
    'DO RUK ZASIELKY: PRE MATKU,',
    'PRE LASKU, PRE SYNA NA DRUHEJ',
    'STRANE. ODNES ICH DOMOV.',
  ],
]

// Kapitoly (book-style) — počet musí sedieť s STR_STORY_CARDS (5).
export const STR_STORY_TITLES: readonly string[] = [
  'ROZDELENIE',
  'ROZTRHNUTI',
  'NIET CESTY',
  'BEZEC',
  'NOVA NADEJ',
]

export const STR_STORY_SKIP_HINT = 'LUBOVOLNA KLAVESA = DALEJ' // 25 znakov

export const STR_COPYRIGHT      = (build: string)   => `(C) 2026  VYDANIE:${build}`
export const STR_ZXKIT_VERSION  = (version: string) => `ZX-KIT:${version}`
