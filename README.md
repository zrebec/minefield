# MINEFIELD — ZX Spectrum Edition

> Retro browserová hra inšpirovaná klasickými ZX Spectrum hrami z 80. rokov.  
> Vanilla TypeScript · HTML5 Canvas · Web Audio API · žiadne externé knižnice

![ZX Spectrum style screenshot placeholder](https://img.shields.io/badge/ZX_Spectrum-256×192-00CD00?style=flat-square&labelColor=000000)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-0000FF?style=flat-square&labelColor=000000)
![Vite](https://img.shields.io/badge/Vite-8.x-FFFF00?style=flat-square&labelColor=000000)

---

## O hre

Hráč sa ocitá na minovom poli a musí ho prekonať — prejsť z ľavého okraja na pravý.
Míny nevidíš, ale *počuješ*: čím viac mín je v tvojom okolí, tým nižší a intenzívnejší
je zvukový signál. Nájdi bezpečnú cestu, zanechávaj žltú stopu a sleduj oblohu —
každých pár desiatok sekúnd preletí lietadlo, ktoré zhodí nové míny.

Hra je zámerný hold éře ZX Spectra (1982): pixelová grafika bez anti-aliasingu,
presná 15-farebná paleta, 8×8 bitmapový font priamo z ROM, štipľavý zvuk zo square
wave oscilátora. Žiadne moderné efekty, žiadne knižnice — len čistý kód a retro pocit.

---

## Ovládanie

| Kláves | Akcia |
|--------|-------|
| `←` `→` `↑` `↓` | Pohyb hráča (key-repeat po 150 ms, interval 80 ms) |
| `F` | Označiť/odznačiť bunku **pred** hráčom ako podozrivú (vlajka) |
| `CTRL+SHIFT+B` | Debug mód — zobrazí všetky míny |

### Zvukové varovania (po každom kroku)

| Počet susedných mín | Zvuk |
|---------------------|------|
| 0 | ticho |
| 1 | 880 Hz · 1 pip |
| 2 | 740 Hz · 2 pipy |
| 3 | 587 Hz · 3 pipy |
| 4 | 440 Hz · 4 pipy |
| 5–6 | 330–220 Hz · rýchly buzz |
| 7–8 | 110 Hz · hrozivý hum |

---

## Cieľ a herný cyklus

1. Hráč štartuje na **ľavom okraji** (stred výšky)
2. Pohybom odhaľuje plochu — navštívené bunky sa zafarbujú na žlto (stopa)
3. **Výhra levelu**: dostať sa na pravý okraj poľa (stĺpec 31)
4. Šliapnutie na mínu = explózia, flash, strata života, respawn na štarte
5. 0 životov = GAME OVER

### Levely

| Level | Mín | Životy | Prvé lietadlo | Interval lietadiel |
|-------|-----|--------|---------------|-------------------|
| 1 | 60 | 3 | 15–30 s | 20–45 s |
| 2 | 80 | 3 | 12–20 s | 15–30 s |
| 3 | 100 | 2 | 10–15 s | 10–20 s |
| 4+ | 110 | 2 | 8–12 s | 8–15 s |

### Lietadlo

Každých niekoľko desiatok sekúnd preletí lietadlo naprieč obrazovkou (3 sekundy).
Po prelete zhodí **3–10 nových mín** na nenavštívené bunky. Status bar bliká varovaním
`** AIRCRAFT **`. Zvuk lietadla je modulovaný LFO pre autentický "motor" efekt.

---

## Technologické výzvy

### 1. ZX Spectrum color clash
Najcharakteristickejší artefakt Spectra: každý **8×8 pixelový blok** môže mať
len 2 farby (INK a PAPER). Hra toto dodržiava — každá bunka gridu má priradenú
dvojicu farieb a sprite sa renderuje výhradne v týchto dvoch farbách. Keď hráč
vstúpi na bunku, celý blok sa prepne na bielu/čiernu — presne ako na reálnom hardware.

### 2. Bitmapový font z ROM
ZX Spectrum ROM font (256 znakov, 8×8 px každý) je zakódovaný priamo ako `Uint8Array`
v `font.ts` — 768 bajtov pre ASCII 32–127. Každý bit v bajte = jeden pixel.
Renderuje sa manuálne cez `fillRect(x, y, 1, 1)` — žiadne CSS fonty, žiadny `fillText`.

### 3. Web Audio API — square wave
Spectrum mal 1-bit zvuk: buď signál, alebo ticho. Emulujeme to cez `OscillatorNode`
s `type = "square"`. Každý "pip" má 5 ms attack a release (eliminácia kliknutí),
varovania sú debounced (180 ms) aby sa neprekrývali pri rýchlom pohybe.
Zvuk lietadla používa LFO (12 Hz square oscillator → gain node → frequency param).

### 4. Canvas škálovanie bez rozmazania
Interná hra beží na **256×192 px** (originálne Spectrum rozlíšenie). Canvas element
má tieto rozmery natívne; CSS ho škáluje 4× na 1024×768 px s `image-rendering: pixelated`.
`imageSmoothingEnabled = false` zabezpečuje ostré pixely bez akéhokoľvek interpolovania.

### 5. Key repeat systém
Prehliadač má vlastný key-repeat, ale ten nie je spoľahlivý naprieč OS. Implementujeme
vlastný: prvý pohyb ihneď (immediate flag), potom delay 150 ms, potom repeat každých
80 ms. To dáva pocit správnej Spectrum odozvy.

### 6. Bezel / border
ZX Spectrum TV border je emulovaný cez `document.body.style.backgroundColor` —
mení sa so stavom hry (modrá = intro, čierna = hra, biela/čierna = flash explózie,
zelená = level complete, červená = game over).

---

## Architektúra kódu

```
src/
├── config.ts      ← VŠETKY herné parametre (laditeľné, hot-reload)
├── constants.ts   ← Technické konštanty: rozlíšenie, paleta
├── font.ts        ← ZX Spectrum ROM font data + getCharRow()
├── sprites.ts     ← Všetky sprite-y ako Uint8Array (8×8 px)
├── audio.ts       ← Web Audio engine: varovania, explózia, fanfára, lietadlo
├── input.ts       ← Keyboard + vlastný key-repeat systém
├── game.ts        ← GameState, Cell grid, mínové pole, createGame()
├── player.ts      ← Pohyb, kolízia, flag, respawn, scoring
├── airplane.ts    ← Airplane timer, animácia, mine drop
├── renderer.ts    ← Canvas rendering: grid, sprites, status bar, overlays
└── main.ts        ← Game loop (requestAnimationFrame), fázové prepínanie
```

**Render order** (každý frame):
1. Clear canvas
2. Grid cells (32×22) — každá bunka = paper fill + sprite v ink farbe
3. Airplane (ak aktívne) — na vrchu gridu
4. Status bar — SCORE / LVL / MINES / LIVES
5. Flash overlay (pri explózii)
6. Phase overlay (GAME OVER / LEVEL COMPLETE)

**Spustenie lokálne:**
```bash
npm install
npm run dev    # http://localhost:5173
npm run build  # produkčný build → dist/
```

---

## Možné ďalšie vylepšenia

### Gameplay
- **Radar**: malá mapa v rohu ukazujúca hustotu mín (bez konkrétnych pozícií)
- **Power-upy**: lietadlo občas zhodí aj bonus (extra život, časové spomalenie)
- **Rôzne terény**: voda (spomalenie), cesta (bonus rýchlosť), bunker (ochrana pred 1 explóziou)
- **Multiplayer** (lokálny): dvaja hráči na jednej klávesnici, kto skôr prejde
- **Highscore tabuľka**: localStorage top 10 s menami

### Vizuál
- **Animovaný hráč**: 2-framová animácia chôdze (striedanie nôh)
- **Väčší sprite lietadla**: 16×8 px (2 bunky šírky) pre lepšiu viditeľnosť
- **Loading bar** na intro obrazovke (ZX Spectrum "loading" nostalgia)
- **Attributové blikanie** (FLASH bit): blikajúce bunky pre špeciálne udalosti
- **Explózia rozmetie susedné bunky**: vizuálny efekt debris

### Zvuk
- **AY-3-8910 emulácia**: presnejšia emulácia Spectrum sound chipa (3 kanály)
- **Melódie medzi levelmi**: krátka fanfára v ZX Spectrum štýle
- **Dopplerov efekt** na lietadle: vyšší tón pri priblížení, nižší pri vzdialení

### Technické
- **Service Worker + PWA**: hrateľné offline, pridateľné na plochu
- **Touch ovládanie**: swipe gesty pre mobilné zariadenia
- **Replay systém**: zaznamená vstupy, umožní si prezrieť cestu
- **Level editor**: jednoduché nástroje na tvorbu vlastných polí

---

## Licencia

MIT — rob s tým čo chceš, Sinclair by bol hrdý. 🕹️
