# MINEFIELD — ZX Spectrum Edition

> Retro browserová hra inšpirovaná klasickými ZX Spectrum hrami z 80. rokov.  
> Vanilla TypeScript · HTML5 Canvas · Web Audio API · [zx-kit](https://www.npmjs.com/package/zx-kit)

![ZX Spectrum style screenshot placeholder](https://img.shields.io/badge/ZX_Spectrum-256×192-00CD00?style=flat-square&labelColor=000000)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-0000FF?style=flat-square&labelColor=000000)
![Vite](https://img.shields.io/badge/Vite-8.x-FFFF00?style=flat-square&labelColor=000000)
![zx-kit](https://img.shields.io/badge/zx--kit-0.2.2-00CDCD?style=flat-square&labelColor=000000)

---

## O hre

Hráč sa ocitá na minovom poli a musí ho prekonať — prejsť z ľavého okraja na pravý.
Míny nevidíš, ale *počuješ*: čím viac mín je v tvojom okolí, tým nižší a intenzívnejší
je zvukový signál. Nájdi bezpečnú cestu, zanechávaj žltú stopu a sleduj oblohu —
každých pár desiatok sekúnd preletí lietadlo, ktoré zhodí nové míny.

Hra je zámerný hold éře ZX Spectra (1982): pixelová grafika bez anti-aliasingu,
presná 15-farebná paleta, 8×8 bitmapový font priamo z ROM, štipľavý zvuk zo square
wave oscilátora. Žiadne moderné efekty — len čistý kód a retro pocit.

---

## Ovládanie

| Kláves | Akcia |
|--------|-------|
| `←` `→` `↑` `↓` | Pohyb hráča (key-repeat po 150 ms, interval 80 ms) |
| `F` | Označiť/odznačiť bunku **pred** hráčom ako podozrivú (vlajka) |
| `P` | Pauza / pokračovanie |
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
v `zx-kit/font.ts` — 96 znakov × 8 bajtov. Každý bit v bajte = jeden pixel.
Renderuje sa manuálne cez `fillRect(x, y, 1, 1)` — žiadne CSS fonty, žiadny `fillText`.

### 3. Web Audio API — square wave
Spectrum mal 1-bit zvuk: buď signál, alebo ticho. Emulujeme to cez `OscillatorNode`
s `type = "square"`. Zvukové vzory (varovania, fanfáry) sa definujú cez `playPattern()`
z `zx-kit` — sekvencia `Note[]` hodnôt `{ freq, dur }`. Zvuk lietadla používa LFO
(12 Hz square oscillator → gain node → frequency param).

### 4. Canvas škálovanie — setupCanvas + ctx.scale
`setupCanvas(canvas, 4)` z `zx-kit` nastaví canvas na 1024×768 px (4× ZX Spectrum
rozlíšenie 256×192) a aplikuje `ctx.scale(4, 4)`. Všetky následné kresliace volania
používajú **herné pixelové súradnice** (0–255, 0–191) — transformácia prebehne
automaticky. CSS `image-rendering: pixelated` zabezpečuje ostré pixely aj pri
dodatočnom CSS škálovaní na menších obrazovkách.

### 5. Key repeat systém
Prehliadač má vlastný key-repeat, ale ten nie je spoľahlivý naprieč OS. Implementujeme
vlastný (cez `zx-kit/input.ts`): prvý pohyb ihneď (immediate flag), potom delay 150 ms,
potom repeat každých 80 ms. To dáva pocit správnej Spectrum odozvy.

### 6. Bezel / border
ZX Spectrum TV border je emulovaný cez `document.body.style.backgroundColor` —
mení sa so stavom hry (modrá = intro, čierna = hra, flash explózie cez `flashBorder()`
z `zx-kit`, zelená = level complete, červená = game over).

---

## Architektúra kódu

```
src/
├── config.ts      ← VŠETKY herné parametre (laditeľné, hot-reload)
├── constants.ts   ← Technické konštanty: rozlíšenie, re-export palety z zx-kit
├── font.ts        ← Re-export ZX Spectrum ROM fontu z zx-kit
├── sprites.ts     ← Všetky sprite-y ako Uint8Array (8×8 px)
├── audio.ts       ← Web Audio engine: varovania, explózia, fanfára, lietadlo
├── input.ts       ← Wrapper okolo zx-kit input (nastavenie key-repeat z config)
├── game.ts        ← GameState, Cell grid, mínové pole, createGame()
├── player.ts      ← Pohyb, kolízia, flag, respawn, scoring
├── airplane.ts    ← Airplane timer, animácia, mine drop
├── renderer.ts    ← Canvas rendering: grid, sprites, status bar, overlays
└── main.ts        ← Game loop (requestAnimationFrame), fázové prepínanie
```

**Závislosti:**
- `zx-kit` — ZX Spectrum primitívy (paleta, font, renderer helpers, audio, input)
- Žiadne iné runtime závislosti — len Web Platform APIs

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
npm test       # unit testy (Vitest)
```

---

## Možné ďalšie vylepšenia

### Gameplay
- **Radar**: malá mapa v rohu ukazujúca hustotu mín (bez konkrétnych pozícií)
- **Power-upy**: lietadlo občas zhodí aj bonus (extra život, časové spomalenie)
- **Rôzne terény**: voda (spomalenie), cesta (bonus rýchlosť), bunker (ochrana pred 1 explóziou)
- **Multiplayer** (lokálny): dvaja hráči na jednej klávesnici, kto skôr prejde

### Vizuál
- **Väčší sprite lietadla**: 16×8 px (2 bunky šírky) pre lepšiu viditeľnosť
- **Loading bar** na intro obrazovke (ZX Spectrum "loading" nostalgia)
- **Explózia rozmetie susedné bunky**: vizuálny efekt debris

### Zvuk
- **AY-3-8910 emulácia**: presnejšia emulácia Spectrum sound chipa (3 kanály)
- **Melódie medzi levelmi**: krátka fanfára v ZX Spectrum štýle
- **Dopplerov efekt** na lietadle: vyšší tón pri priblížení, nižší pri vzdialení

### Technické
- **Service Worker + PWA**: hrateľné offline, pridateľné na plochu
- **Touch ovládanie**: swipe gesty pre mobilné zariadenia
- **Replay systém**: zaznamená vstupy, umožní si prezrieť cestu

---

## Licencia

MIT — rob s tým čo chceš, Sinclair by bol hrdý. 🕹️
