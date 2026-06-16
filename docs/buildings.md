# Budovy namiesto „bezduchých“ stien — dizajn (pseudo-3D oblique)

> **Status: NÁVRH na schválenie (neimplementované).** Zdroj: zadanie ownera (2026-06-16) +
> overenie v kóde (`game.ts`, `sprites.ts`, `renderer.ts`, `player.ts`, `config.ts`) + 4 zafixované
> rozhodnutia (nižšie). Pendant v portfólio docs: `retro/docs/sk/minefield.md` →
> *„Chrobáky do hlavy → Budovy namiesto bezduchých stien“*.
>
> **Cieľ:** lineárne, náhodne pohodené steny nahradiť **pseudo-3D budovami** — obdĺžnikové pôdorysy,
> ktoré opticky „vyrastajú“ ako kreslená kocka (šedá strecha + tehlový predok + tmavší bok).

---

## 1. Zafixované rozhodnutia (owner, 2026-06-16)

| # | Otázka | Rozhodnutie |
|---|--------|-------------|
| 1 | **Max veľkosť strechy** | **8×8 tiles**, min **3×3** (rozmer berie **iba strechu**; bok + pôdorys + predná stena sú tiles navyše). |
| 2 | **Steny vs budovy** | **Budovy nahrádzajú** lineárne steny. `placeWalls` → `placeBuildings`. |
| 3 | **Kolízia / férovosť** | **Celý vykreslený obrys budovy** = `solid` a **bez mín**. Pod nepriehľadnou strechou sa nikdy neskryje mína ani cesta. |
| 4 | **Vizuál** | **Kreslená kocka (oblique)** — šedá strecha zhora, viditeľný **predok aj bok** (hĺbka). |

---

## 2. Čo je zadarmo (overené v kóde — netreba nič riešiť navyše)

Keď je budova zložená z dlaždíc s `solid: true` a `id` ≠ `'ground'`, platí **automaticky**:

- **Žiadne míny na/v budove** — `placeMines` (`game.ts:145`) aj airplane `addDropMinesInBand`
  (`game.ts:293`) kladú výhradne na `ground`. Každý non-ground tile je vynechaný. ✓
- **Lietadlo nezhodí míny na strechu** — to isté pravidlo (`ground`-only drop). ✓
- **Nedá sa cez budovu prejsť** — `player.ts:61` zastaví pohyb na `tile.solid === true`. ✓
- **Render zadarmo** — `map.render(ctx)` (`renderer.ts:364`) vykreslí každú dlaždicu vrátane budov.
- **Reachability/trap nástroje fungujú** — `map.findById('building')` (O(1)) + `isSolid` sú už v kite.

> **Dôsledok:** „míny nie sú v budovách / lietadlo na ne nezhadzuje / nedá sa cez ne prejsť“ **nie je
> nová práca** — vyplýva to z toho, že budova = solid non-ground dlaždice. Práca je len v *generovaní*
> tvaru, *kresbe* kocky a *férovosti* rozmiestnenia.

---

## 3. Architektúra — logika vs kresba (oddelené, ale obe cez TileMap)

Budova **žije priamo v `TileMap`** ako blok dlaždíc `id: 'building'`, `solid: true`. Nerobíme paralelnú
„building" dátovú štruktúru ani vlastný render — **maximálne využijeme zx-kit** (`createTileMap`,
`setTile`, `findById`, `isSolid`, `render`, `drawSprite` / per-cell ink+paper).

```
LOGIKA (TileMap)                         KRESBA (ten istý tile)
─────────────────                        ──────────────────────
id: 'building'  → blokuje pohyb          sprite: dielec (strecha/stena/bok/…)
solid: true     → mine-exclusion zadarmo ink/paper: farba podľa dielca
metadata.part   → 'roof'|'wall'|'side'…  → map.render() to nakreslí
```

Každá bunka obrysu budovy nesie **svoj 8×8 dielec** (roof / wall / side / base / chimney) a svoju
**ink/paper** dvojicu (color-clash zostáva autentický — 2 farby na blok). Tým je „celý obrys solid &
bez mín“ (rozhodnutie #3) vynútené *konštrukciou*: žiadna bunka pod kresbou nie je `ground`.

> **Pozn.:** identický prístup ako dnešné `wall` dlaždice — len `id` je `'building'` a dlaždíc je viac
> druhov. Žiadny nový rendering engine, žiadny presah „nad“ tilemapou, ktorý by mohol nečestne zakryť
> susedný `ground`.

---

## 4. Geometria budovy (oblique „kreslená kocka“)

### 4.1 Pojmy

- **Strecha (roof footprint)** — `W × D` dlaždíc, `W, D ∈ [3, 8]`. *Toto* je „veľkosť budovy“, ako ju
  zadáva jadro hry a ako ju vníma hráč.
- **Obrys (bounding box)** — celý rezervovaný obdĺžnik dlaždíc: strecha **+ predná stena** (`H_wall`
  riadkov) **+ pravý bok** (1 stĺpec) **+ pätka/tieň** (1 riadok). Celý obrys je `solid` a bez mín.

### 4.2 Mapa dlaždíc — príklad **min 3×3 strecha** (`W=3, D=3, H_wall=2`)

```
        col→  c0  c0+1 c0+2 c0+3
   row r0    [R]  [R]  [R]  [E]     R = strecha (šedá)   E = pravá hrana strechy (zvýraznenie)
       r0+1  [R]  [R]  [R]  [E]
       r0+2  [R]  [R]  [R]  [E]
       r0+3  [F]  [F]  [F]  [s]     F = predná stena (tehly)   s = bok (tmavšie tehly)
       r0+4  [F]  [G]  [F]  [s]     G = brána/okno (kozmetika, stále solid)
       r0+5  [p]  [p]  [p]  [s]     p = pätka / tieň pri zemi
```

- **Obrys** = `(W+1) × (D + H_wall + 1)` = pre 3×3 → **4 × 6 dlaždíc**.
- **Hĺbka (3D)** vzniká z troch vecí: **šedá plocha strechy** zhora + **pravý bok `s`/`E`** v tmavšej
  tehle + **predná stena** s bránou. Presne to odlišuje kocku od plochej steny (rozhodnutie #4).

### 4.3 Oblique „lean“ (naklonenie) — jadro vs polish

- **Jadro (Fáza 1–2):** obrys ostáva **čistý obdĺžnik** (vyššie). Bok `s` + hrana `E` už dávajú
  čitateľnú kocku. Toto sa **bez problémov dlaždicuje pre ľubovoľné 3×3…8×8** a je čisté pri
  `imageSmoothingEnabled = false`.
- **Voliteľný polish:** jemné naklonenie strechy hore-vpravo (parallelogram) cez **rohové dielce**.
  Obrys zostáva obdĺžnik (rohové „diery“ vyplní sky/roof-overhang dielec) → **nič nie je „iba čiastočne
  viditeľné“**. Mieru naklonenia (0 / 1 dlaždica) ladíme vizuálne, **nega­mensilo gameplay**.

> **Prečo nie plný parallelogram od začiatku:** pri 8×8 streche by per-riadkové schody zhltli veľa artu
> a hraničných prípadov. Postupujeme inkrementálne (Fáza 1 = logika, Fáza 2 = kocka), presne ako
> odporúča portfólio doc.

### 4.4 Rozmery v `createBuilding` (rozmer definuje create metóda — zadanie)

```ts
createBuilding(map, c0, r0, roofW, roofD, opts?)   // roofW, roofD ∈ [3..8]
// stampne do TileMap obrys: roof (WxD) + side (1 stĺpec) + front (H_wall) + base (1)
// vráti bounding box { x, y, w, h } pre placement/fairness kontroly
```

`H_wall` (výška prednej steny) — **návrh: 2** (alebo mierne škáluj s `roofD`). Laditeľné v `config.ts`.

---

## 5. Dielce (8×8 sprites) + paleta

Nové 8×8 dlaždice do `sprites.ts` (ako pixel-arrays, žiadne externé obrázky):

| Dielec | `metadata.part` | Sprite (návrh) | Ink | Paper |
|--------|-----------------|----------------|-----|-------|
| **Strecha** | `roof` | 50 % dither (`0xAA`/`0x55`) → **autentická ZX šedá** | `C.WHITE` | `C.BLACK` |
| **Hrana strechy** | `roof-edge` | dither + plná pravá/horná línia | `C.WHITE` | `C.BLACK` |
| **Predná stena** | `wall` | tehlový vzor (≈ dnešný `WALL`) | `C.B_RED` | `C.BLACK` |
| **Bok** | `side` | tehlový vzor, **tmavší** (tieň) | `C.RED` | `C.BLACK` |
| **Brána/okno** | `door` | obdĺžnik/mreža v stene (kozmetika) | `C.B_YELLOW` | `C.BLACK` |
| **Pätka/tieň** | `base` | tenký tieň pri zemi | `C.BLACK`/`C.RED` | `C.BLACK` |
| **Komín** *(nice-to-have)* | `chimney` | malý blok + „dym“ | `C.WHITE` | `C.BLACK` |

**„Šedá“ na ZX neexistuje ako hex** → robíme ju **ditherom bielej/čiernej** (`C.WHITE` na `C.BLACK`),
čo je dobový spôsob, ako Speccy „šedú“ kreslil. **Hĺbka kocky** = bright červená predok (`C.B_RED`) vs
normálna červená bok (`C.RED`). Všetko **výhradne v palete** (žiadne nové hex hodnoty).

> Color-clash ostáva korektný: každá 8×8 bunka má jednu (ink, paper) dvojicu — presne ZX limit.

---

## 6. Umiestnenie a férovosť — `placeBuildings()`

Nahrádza `placeWalls`. Volá `createBuilding` v cykle s odmietacími podmienkami (ako dnešné `placeWalls`,
ale na obdĺžniky):

**Tvrdé pravidlá (zo zadania):**
- **Žiaden okraj / roh poľa, nič „čiastočne viditeľné“.** Celý **bounding box** musí byť ≥ **1 dlaždica**
  od horného/dolného/ľavého okraja a **nesmie zasiahnuť rohy poľa**. *(„pletivo na okolí“ = okraj
  hracej plochy; v hre nie je fyzický plot — je to konceptuálny margin + zx-kit border/bezel.)*
- **Pravý výstupný stĺpec voľný** — bounding box sa **nesmie dotknúť `col === COLS-1`** (cieľová hrana,
  ktorou hráč prechádza vpravo; `player.ts:45`).
- **Štartová zóna voľná** — žiadny prienik so `SAFE_RADIUS` okolo `(START_COL, START_ROW) = (0, 11)`.
- **Medzi budovami ≥ 1 dlaždica medzera** — aby nevznikali „kapsy“ a slepé pasce medzi dvomi budovami
  a aby každá kocka čítala samostatne.

**Férovosť (rozšíriť existujúce nástroje):**
- **`fixWallTraps` → zovšeobecniť na obvod budov** (`game.ts:157`). Dnes rieši „prekážka vpredu + mína
  na oboch kolmých stranách“ okolo jednej steny; po zmene musí iterovať **`findById('building')`** a
  riešiť ten istý trap na **celom obvode** budovy (rohy, úzke uličky medzi budovami).
- **Reachability** — flood-fill cez ne-`solid` dlaždice musí garantovať, že zo štartu `(0,11)` je
  **dosiahnuteľný pravý výstup** *aj* **všetky gemy**. Rozšíriť property test (`game.test.ts`, 20
  náhodných levelov) o budovy.

**Hustota / balans (návrh, laditeľné v `config.ts`):**

| Level | Počet budov (návrh) | Veľkosť strechy | Pozn. |
|-------|---------------------|------------------|-------|
| 1 | 2–3 | 3×3 – 4×4 | málo, učiace |
| 2 | 3–4 | 3×3 – 5×5 | |
| 3 | 4–5 | 3×3 – 6×6 | hustejšie |
| 4+ | 5–6 | 3×3 – 8×8 | 8×8 **zriedka** |

> **8×8 je naozaj veľká:** na 22-riadkovom poli má bounding box ~**11 riadkov** výšky (8 strecha + 2
> stena + 1 pätka) a 9 stĺpcov → **pол obrazovky**. Preto sa 8×8 použije len ojedinele a v malom počte,
> inak by sa playfield prehnane zmenšil. Počet mín ostáva (50–110) → menšia plocha = **hustejšie a
> strategickejšie**, čo je presne zámer. Linter (reachability) stráži, aby to ostalo férové.

---

## 7. Render & interakcia s existujúcimi efektmi

- **Kreslenie:** `map.render(ctx)` vykreslí budovy automaticky (dlaždice sú v mape). Hráč/lietadlo sa
  kreslia **nad** mapou (`renderer.ts:403/406`) → nič netreba meniť v poradí.
- **Noc:** dnešný night overlay (`renderer.ts:368`) čierni len `ground` a `mine`. Budovy (`'building'`)
  **ostanú viditeľné v noci** — rovnako ako dnes steny. Konzistentné a žiadúce (orientačný bod).
- **Debug:** kreslí míny — budov sa netýka.
- **Drop-flash / explosion / flash overlay:** bez zmeny (operujú nad `ground`/`mine`/hráčom).

---

## 8. Fázovanie implementácie (inkrementálne, oddelené riziko)

1. **Logika (najprv, „ploché tehly“).** `buildings.ts`: `createBuilding` + `placeBuildings` (obrysy,
   margins, safe-zone, medzery), `id:'building'`, `solid:true`, zatiaľ vykreslené plochým tehlovým
   dielcom. Rozšíriť `fixWallTraps` + reachability. → **Hrateľné a férové skôr**, gameplay hotový.
2. **Kocka (vizuál).** Pridať dielce strecha/bok/hrana/brána/pätka + ink/paper mapovanie; obrys ostáva
   obdĺžnik. Čisto kresba — **nemení gameplay**.
3. **Polish (voliteľné).** Oblique lean cez rohové dielce, **komín**, jemný pulz/tieň. Nice-to-have.

---

## 9. Súbory, ktorých sa to dotkne

| Súbor | Zmena |
|-------|-------|
| `src/sprites.ts` | nové 8×8 dielce (roof/roof-edge/wall/side/door/base/chimney) + `makeTileBuilding(part, …)` |
| `src/buildings.ts` *(nový)* | `createBuilding`, `placeBuildings` |
| `src/game.ts` | `placeWalls` → `placeBuildings`; `fixWallTraps` zovšeobecniť na `'building'` |
| `src/config.ts` | `BUILDING_COUNTS`, rozmery (min/max strecha, `H_wall`) namiesto `WALL_*` |
| `src/renderer.ts` | minimálne / žiadne (mapa sa kreslí sama; max. doladiť night/debug výnimky) |
| `src/game.test.ts` | rozšíriť trap-fix + reachability property test o budovy |

---

## 10. Otvorené (návrhy s defaultmi — uprav pri review)

- `H_wall` výška steny: **2** (alebo `clamp(roofD-1, 2, 3)`).
- Počty/veľkosti budov po level: tabuľka v §6 (návrh).
- Komín: **mimo v1** (Fáza 3, nice-to-have — potvrdené zadaním).
- Sila oblique „lean“: **0 v jadre**, jemný v polishi (ladí sa vizuálne).

---

## 11. Navrhnutá commit message (po implementácii, EN)

```
feat(buildings): replace linear walls with pseudo-3D buildings

Swap soulless linear walls for oblique pseudo-3D buildings stamped into the
TileMap as solid 'building' tiles. Whole bounding box is solid and mine-free,
so nothing hides under the opaque grey roof; mine/airplane exclusion and
collision come for free from the existing ground-only checks.

- buildings.ts: createBuilding (3x3..8x8 roof) + placeBuildings (margins,
  safe-zone, inter-building gap, no field corners/edges, exit column kept clear)
- sprites.ts: roof (dithered grey), brick front + darker side, door, base,
  optional chimney — all within the Spectrum palette
- generalise fixWallTraps and the reachability property test to buildings
- config: BUILDING_COUNTS / sizes replace WALL_* settings

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

> *Dokument napísaný pred kódom — slúži ako review gate. Po tvojom GO začínam implementáciu po fázach
> (§8); commituješ a releasuješ ty.*
