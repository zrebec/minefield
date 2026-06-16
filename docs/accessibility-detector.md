# Prístupnosť — detektor mín (3 svetlá) + haptika

> **Status: NÁVRH (neimplementované).** Dizajnová poznámka k prístupnosti a k „detektoru mín".
> Zdroj: nápad ownera + úprimný rozbor (Claude), 2026-06-15. Pendant v portfólio docs:
> `retro/docs/sk/minefield.md` (sekcie F4/F9 + „Na zamyslenie").

---

## Problém, ktorý to rieši

Minefield je **fundamentálne audio hra** — počet mín v okolí sa oznamuje výškou a počtom pípnutí
(`AudioContext`, viď `CLAUDE.md` → *Varovanie podľa blízkosti*). Dôsledok:

> **Nepočujúci a nedoslýchaví hráči hru nemôžu hrať vôbec.** Nie „horší zážitok" — **nula informácie.**

Toto je väčší férový dlh než vyvážená náhoda mín. Cieľ: dať varovanie aj **bez sluchu** —
vizuálne (detektor) a hapticky (vibrácie na gamepade).

---

## Nápad ownera

Na „detektore mín" sú **3 svetlá**. Po kroku sa **zabliká** (nie rozsvieti natrvalo) toľkokrát, koľko
mín má hráč okolo seba — **1 až 3**. Prečo nemôže byť 4:

- krok **späť** určite nie je mína (odtiaľ si prišiel = bezpečné),
- **diagonály sa nerátajú**,
- → neznáme sú len **3 bunky**: vpredu / vľavo / vpravo. (0 mín = nič nebliká.)

Placement zatiaľ otvorený — skoro celá obrazovka je hracia plocha, dole je málo miesta.

---

## Susednosť — čo kód reálne robí (errata k pôvodnému „rozporu")

> **Pôvodne tu stál „kritický rozpor": že audio ráta Moore 3×3 (8 susedov vrátane diagonál). To bol
> omyl prebratý zo zlého `CLAUDE.md` — opravené 2026-06-15.** Showstopper bol v dokumentácii, nie v hre.

**Realita (`game.ts → countWarningMines`, otestované v `game.test.ts`):**

- počíta **iba ortogonálnych susedov** (von Neumann), **diagonály NIE** — existuje aj test
  *„beacon mine diagonally 2 away does NOT warn (only cardinal)"*;
- **≤4 priľahlé** míny (vzdialenosť 1, akýkoľvek typ) **+ ≤4 beacon** míny (vzdialenosť 2 ortogonálne,
  cyan, od levelu 3) → `min(count, 8)`.

Takže **hra už je správna** — diagonála sa nerieši. Zostáva len **menší** dizajnový detail pre detektor:

| Zložka count | Rozsah | Akčné? |
|---|---|---|
| priľahlé míny (@1) | 0–4 (resp. 0–3 ak vynecháš „späť") | áno — ďalší krok |
| beacon míny (@2) | 0–4 | áno — o krok ďalej (telegraf) |
| **spolu (warning/zvuk)** | **0–8** | jedno číslo, zložky sa nedajú rozlíšiť |

**Dôsledok pre 3 svetlá:** detektor 0–3 nevie 1:1 zrkadliť zvuk, ktorý vie ísť na 8 cez beacony. Rozhodni:

- **(A) Beacon = vlastný indikátor** (4. svetlo / iná farba / iný haptický vzor) — zachová „3 svetlá pre
  priľahlé" **a** neoberie nepočujúceho o beacon-varovanie (inak má menej info než počujúci → opäť nefér).
  **Odporúčam.**
- **(B) Detektor ignoruje beacony** (ukáže len ≤3 priľahlé) — jednoduchšie, ale nepočujúci stratí beacon
  signál; OK len ak beacony zostanú čisto „bonus pre sluch".
- **(C) Zruš beacon príspevok @2** — vráti warning na čisté 0–4. Ale to **vykostí beacon mínu** (stane sa
  na nerozoznanie od normálnej) → reálne zruš celý typ. Dizajnová strata, nie oprava.

---

## Návrh riešenia (Claude)

### 1. „Rozsvieť N z 3", nie „blikni N-krát"
Sekvenčné blikanie núti hráča **počítať** (blikol 2× či 3×?) a **čakať**, kým signál dobehne → spomalí
tempo a vracia neistotu. **N rozsvietených z 3 LED** sa číta na jeden pohľad. Ak chceš „živý detektor"
pocit, nech rozsvietené ešte aj **jemne pulzujú**. Ak už blikať, tak **len v parite s pípaním** (beep
N× ↔ blik N×, rovnaký trigger) — vtedy to dáva zmysel. Čisté blikanie bez stáleho stavu neodporúčam.

### 2. Farba ako redundancia (nie jediný nosič)
`1 = žltá, 2 = oranžová, 3 = červená` *navyše* k počtu/pozícii → nebezpečenstvo prečítaš aj bez
počítania. Farba **nesmie** byť jediný kód (farboslepí) — vždy aj počet rozsvietených.

### 3. Jedno N → tri kanály
Spočítaj nebezpečenstvo **raz** (re-use existujúceho warning výpočtu) a pošli ho do
**beep / svetlo / rumble**. V nastaveniach prepínateľná ľubovoľná podmnožina — nepočujúci vypne zvuk,
nechá svetlo + rumble. Žiadna logika 3×.

### 4. Max-3 logika sedí — ak (a iba ak)
- „späť" je **definované** = smer posledného pohybu. To už existuje v **probe/kameň** (`CLAUDE.md` →
  *Probe — kameň*, „hod dopredu, smer posledného pohybu"). Konzistentné.
- pri **spawne / teleporte** (žiadny facing) treba fallback — napr. počítaj všetky 4 ortogonálne, kým
  nie je smer.
- a hlavne: platí len pri modeli (A)/(B), nie pri shipnutom Moore-8. Viď rozpor vyššie.

---

## Placement — reálne čísla

Status bar je **spodok, 2 riadky = 16px** a **už je plný**:

```
SCORE:00000  LIVES:███    MINES:060  LEVEL:1
```

Takže „pridaj to dole" znamená buď zmenšiť existujúci HUD, alebo ďalší riadok (ukrojí z 192px plochy).
Poradie mojich preferencií:

1. **BORDER (favorit).** ZX **mal** border a hry ním presne takto signalizovali. `flashBorder` už je
   v zx-kite a je **otestovaný** (game dokonca rieši jeho rAF model v testoch). Border podľa N →
   **nula nákladu na hraciu plochu**, autentické, placement problém zmizne.
2. **3 mini-LED pripnuté ku kurzoru/hráčovi** — oko nemusí uhnúť z akcie do rohu. Stojí pár pixelov pri
   hráčovi, nie globálny HUD priestor.
3. **Spodný HUD pruh** — najdrahší na miesto (status bar treba prepacknúť na ~24px). Až ak 1+2 nestačia.

---

## Haptika (gamepad) — F9

To isté N → **N pulzov vibrácie** cez Gamepad API `gamepad.vibrationActuator.playEffect('dual-rumble', …)`.

- **Minefield je jediná hra portfólia s podporou gamepadu** → exkluzívny bonus, nie všeobecná práca.
- ZX haptiku nemal — ale to je presne mantra *„Speccy bez HW limitov"*.
- Tri-modálna parita: beep / svetlo / rumble z jedného N. Degraduj ticho, ak `vibrationActuator`
  nie je (Safari/FF podpora je nerovnomerná) — nikdy nie chyba, len chýbajúci kanál.

---

## Otvorené rozhodnutia (TODO pred implementáciou)

- [ ] **Model susednosti** (A/B/C vyššie) — *blokuje všetko ostatné.*
- [ ] Border vs kurzor-LED vs HUD pruh (odporúčam border).
- [ ] Farby 1/2/3 a či pulzovať.
- [ ] Nastavenia: per-kanál prepínač (zvuk / svetlo / haptika).
- [ ] Intro obrazovka: vysvetliť detektor (najmä pri modeli B, kde sa líši od zvuku).

## Odkazy do existujúceho dizajnu
- `CLAUDE.md` → *Zvukový systém → Varovanie podľa blízkosti* (3×3, 0–8) — zdroj rozporu.
- `CLAUDE.md` → *Hráčske pomôcky → Probe — kameň* — už má „smer posledného pohybu" (facing).
- `CLAUDE.md` → *Status bar* — 16px, plný (placement constraint).
- zx-kit `flashBorder` — kandidát na border signál, už otestovaný v hre.
- `retro/docs/sk/minefield.md` — F4 (detektor), F9 (haptika), „Na zamyslenie" (širší kontext).
