# CLAUDE.md — Minefield (ZX Spectrum Style)

## Projekt

Browserová hra inšpirovaná klasickými ZX Spectrum hrami typu "Minefield".
Hráč sa pohybuje po minovom poli, zvuk ho varuje pred blízkosťou mín.
Občas preletí lietadlo a pridá nové míny.

**Stack**: Vanilla TypeScript + Vite + HTML5 Canvas + Web Audio API  
**Výstup**: Single-page app, žiadne externé knižnice okrem Vite

---

## ZX Spectrum autenticita — KRITICKÉ

### Rozlíšenie a škálovanie
- Interná hra beží na **256×192 pixelov** (originálne Spectrum rozlíšenie)
- Canvas je vykreslený scaled **4×** → fyzická veľkosť 1024×768px
- `imageSmoothingEnabled = false` — ŽIADNY anti-aliasing nikde
- Všetky súradnice sú vždy násobky 8 (character grid)

### Paleta — presne 15 farieb Spectrum
```
NORMAL:
  BLACK   #000000
  BLUE    #0000CD
  RED     #CD0000
  MAGENTA #CD00CD
  GREEN   #00CD00
  CYAN    #00CDCD
  YELLOW  #CDCD00
  WHITE   #CDCDCD

BRIGHT:
  BLACK   #000000  (rovnaká)
  BLUE    #0000FF
  RED     #FF0000
  MAGENTA #FF00FF
  GREEN   #00FF00
  CYAN    #00FFFF
  YELLOW  #FFFF00
  WHITE   #FFFFFF
```
Tieto farby sa používajú VÝHRADNE. Žiadne iné hex hodnoty.

### Color clash
- Každý 8×8 blok má len 2 farby: INK a PAPER
- Toto je nutné dodržať pre autentický look
- Implementovať ako `ColorAttr` mapa paralelná s canvas

### Font
- Použiť **ZX Spectrum ROM font** — 8×8 pixel bitmap font
- Font data zakódovať priamo v TypeScript ako `Uint8Array` (256 znakov × 8 bajtov)
- Renderovať manuálne cez `putImageData`, nie cez CSS/HTML text
- Includovať aspoň ASCII 32–127 (printable chars)

### Sprite dizajn (8×8 px, Spectrum paleta)
Všetky sprite-y definovať ako 8×8 pixel mapy v TypeScript:

- **Hráč** – humanoidná figúrka, 4 smery (up/down/left/right variant)
- **Míny** – kruhová s bodkami, klasický Spectrum look
- **Explosion** – 2-frame animácia
- **Lietadlo** – 16×8 alebo 8×8 sprite, jednoduchý siluetový tvar
- **Flag** – označenie podozrivého políčka (voliteľné)
- **Grass/Ground** – textúra pozadia (dve varianty pre šachovnicový vzor)

---

## Herná mechanika

### Grid
- Hracia plocha: **32×22 buniek** (= 256×176 px, 2 riadky reserved pre status bar)
- Každá bunka: `{ hasMine: boolean, flagged: boolean, visited: boolean }`
- Hráč štartuje v strede, v okolí 3×3 od štartu ŽIADNE míny

### Pohyb hráča
- **Šípky** — pohyb o 1 bunku
- Key repeat: prvý pohyb ihneď, ďalšie po 150ms delay, potom každých 80ms
- Hráč sa môže pohybovať len na platné bunky (v rámci gridu)
- Po každom pohybe: detekcia míny + zvukové varovanie

### Míny — inicializácia
- Počet mín: konfigurovateľné podľa levelu (default: 60 z 32×22 = ~8.5%)
- Rozmiestnené náhodne, okrem štartovej zóny 3×3

### Životný cyklus bunky
```
NENAVŠTÍVENÁ → hráč vstúpi → NAVŠTÍVENÁ
NAVŠTÍVENÁ + mína → EXPLÓZIA → strata života
```

### Šliapnutie na mínu
1. Flash efekt (blink celej obrazovky — biela/čierna, 3× za 200ms)
2. Explosion sprite animácia na mieste míny
3. Beep vzor: dlhý nízky tón (explózia sound)
4. Strata 1 života
5. Hráč sa teleportuje späť na štartovú pozíciu
6. Míny zostávajú (okrem tej aktivovanej)

---

## Zvukový systém — Web Audio API

### Základný princíp
- `AudioContext` inicializovať na prvý user gesture (klik/klávesa)
- Výhradne `OscillatorNode` s `type = "square"` — pravý Spectrum 1-bit zvuk
- `GainNode` pre volume control a envelope

### Varovanie podľa blízkosti
Počítať míny v okolí 3×3 od hráča (max 8 susedov):

```
0 mín  → ticho
1 mínu → 880 Hz, 80ms, 1× pip
2 míny → 740 Hz, 80ms, 2× pip (medzera 60ms)
3 míny → 587 Hz, 100ms, 3× pip
4 míny → 440 Hz, 120ms, 4× pip
5 mín  → 330 Hz, 150ms, rýchly buzz
6 mín  → 220 Hz, 200ms, pomalý buzz
7–8 mín→ 110 Hz, 300ms, hrozivý hum
```

Každý pip: krátky `square` oscillator s attack/release 5ms (aby neboli kliknutia).
Varovanie hrať IHNEĎ po každom pohybe, nie kontinuálne.

### Lietadlo zvuk
- Vyšší tón: 1200–1400 Hz, rýchly buzz pattern
- Modulovať frekvenciu miernym LFO pre "motor" efekt
- Trvanie: kým lietadlo prechádza cez obrazovku

### Explózia
- Noise-like efekt: rýchle prepínanie frekvencií 50–500 Hz náhodne
- Trvanie: 500ms, klesajúca hlasitosť

### Výhra / Prehra
- Výhra (všetky míny označené alebo všetky bezpečné políčka navštívené):
  `C4 → E4 → G4 → C5` — krátka fanfára, square wave
- Prehra (0 životov):
  `C4 → B3 → Bb3 → A3 → Ab3` — klesajúci motív, dlhý

---

## Lietadlo event

### Trigger
- Náhodný interval: 45–90 sekúnd od posledného preletu
- Prvý prelet: najskôr po 30 sekundách od štartu

### Animácia
- Sprite lieže z ľavého okraja na pravý (alebo opačne, náhodne)
- Y pozícia: náhodná, v hornej tretine obrazovky
- Rýchlosť: prechod cez 256px za 3 sekundy (reálny čas, nie game ticks)
- Lietadlo je nad všetkými ostatnými prvkami (vykreslené naposled)

### Efekt
- Počas preletu: varovný text na status bare `** AIRCRAFT! **` (blikajúci)
- Po prelete: pridať **5–10 nových mín** náhodne na nenavštívené bunky bez mín
- Krátka pauza 1s pred pridaním mín (dramatický efekt)

---

## Status bar (spodok, 2 riadky = 16px)

```
SCORE:00000  LIVES:███    MINES:060  LEVEL:1
```

- `SCORE` — počet navštívených bezpečných buniek × level multiplier
- `LIVES` — zobrazené ako blokové znaky (█ = život, · = stratený)
- `MINES` — počet zostávajúcich neodhalených mín (odhadovaný)
- Všetko renderované Spectrum fontom, INK=WHITE PAPER=BLACK

---

## Levely

| Level | Mriežka | Mín | Lietadlo interval | Životov |
|-------|---------|-----|-------------------|---------|
| 1     | 32×22   | 60  | 45–90s            | 3       |
| 2     | 32×22   | 80  | 30–60s            | 3       |
| 3     | 32×22   | 100 | 20–45s            | 2       |
| 4+    | 32×22   | 110 | 15–30s            | 2       |

Prechod na ďalší level: hráč navštívi všetky bezpečné políčka (alebo správne označí všetky míny).

---

## Intro obrazovka

Spectrum-štýlová loading/title obrazovka:

```
████████████████████████████
█                          █
█   M I N E F I E L D     █
█                          █
█   ZX Spectrum Edition    █
█                          █
█   PRESS ANY KEY          █
█                          █
████████████████████████████
```

- Farby: CYAN INK na BLACK PAPER, border BLUE
- Blikajúci `PRESS ANY KEY` (každých 500ms toggle)
- Voliteľne: krátka loading bar animácia (Spectrum nostalgia)

---

## Technická štruktúra

```
minefield/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.ts          # Init, AudioContext unlock, game start
│   ├── game.ts          # GameState, grid, level management
│   ├── player.ts        # Pohyb, kolízie, lives
│   ├── audio.ts         # Web Audio engine, všetky zvuky
│   ├── renderer.ts      # Canvas, škálovanie, Spectrum paleta
│   ├── font.ts          # ZX Spectrum ROM font data + renderText()
│   ├── sprites.ts       # Všetky sprite dáta ako pixel arrays
│   ├── airplane.ts      # Airplane event, timer, animácia
│   ├── input.ts         # Keyboard handling, key repeat
│   └── constants.ts     # SCALE=4, COLS=32, ROWS=22, farby, etc.
```

### Render loop
```typescript
// requestAnimationFrame loop
// 1. Clear canvas
// 2. Render ground/grid
// 3. Render mines (len ak debug mode alebo explodovaná)
// 4. Render player
// 5. Render airplane (ak aktívne)
// 6. Render status bar
// 7. Render overlays (flash, game over, intro)
```

### GameState
```typescript
type GameState = 'intro' | 'playing' | 'exploding' | 'levelcomplete' | 'gameover'
```

---

## Čo NESMIE byť

- Žiadne gradienty, tiene, border-radius
- Žiadne moderné fonty (Arial, sans-serif, atď.)
- Žiadny smooth canvas scaling
- Žiadne CSS animácie — všetko cez Canvas
- Žiadne externé obrázky — všetky sprite-y sú pixel arrays v kóde
- Žiadne knižnice okrem Vite (no React, no Pixi.js, no Phaser)
- Žiadne farby mimo Spectrum palety

---

## Vývojové príkazy

```bash
npm create vite@latest minefield -- --template vanilla-ts
cd minefield
npm install
npm run dev    # localhost:5173
npm run build  # dist/
```

---

## Priorita implementácie (fázy)

1. **Canvas + paleta + font render** — statická obrazovka so Spectrum fontom
2. **Grid + hráč sprite + pohyb šípkami**
3. **Míny + detekcia + zvukový warning systém**
4. **Explózia + životy + game over**
5. **Status bar + score + levely**
6. **Lietadlo event**
7. **Intro obrazovka + polish**
