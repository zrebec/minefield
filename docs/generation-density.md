# Mine density vs. free area — generation health

> Design note, 2026-07-03. Companion to the **generation-health criterion** in `ROADMAP.md` (P1 #2)
> and the carve-repair entry in `known-issues.md`. Owner's observation that triggered it: our raw
> mine counts look nearly identical to **Mined-Out** (the model) — so why does our generation choke?
>
> **STATUS: ✅ IMPLEMENTED (2026-07-03, same day) — solution A + guard test D.** Owner drafted the
> first implementation; finished together. `MINE_DENSITY = [0.105, 0.19, 0.19, 0.18]` in
> `config.ts`; the budget = density × `countMineEligibleCells` (exact count sharing the
> `canHostMine` predicate with `placeMines` — one source of truth, `game.ts`). `LEVEL_CONFIGS.mines`
> removed. Measured after calibration (400 boards/level): mines ≈50/80/74/61–63, raw-solvable
> **99.5 / 87.5 / 77.8 / 61.5 / 71.5 %** (L1…L4+) — L1–L2 keep their old feel, everything clears the
> ≥50% criterion, guarded by the deterministic seeded test in `game.test.ts` ("generation health").
> The analysis below is kept as the rationale.

## The insight

**Mine count is configured against the *total* playfield, but difficulty (and solvability) is a
function of the *free* area.** Mined-Out had an open field: every non-mine cell was walkable. The
Strip does not — buildings and the perimeter fence remove walkable cells, and building count *rises
per level* alongside mine count. Two pressures squeeze the same shrinking space:

```
effective density = mines / (interior cells − building cells − safe zones)
```

At L4+ (110 mines) with a high building count, the effective density crosses the percolation
range where random open cells stop forming a connected left→right path. Measured 2026-07-03
(300 seeded boards per level): raw boards solvable without rerolls — **L1 99% · L2 87% · L3 47% ·
L4+ 10%**. In other words: at L4+ the generator no longer *generates* playable boards, it
*selects* them (mean ~9 rerolls per board), and before the carve repair ~0.7% of boards exhausted
all 64 rerolls and shipped unwinnable. Same mine count as Mined-Out, very different geometry.

## Target (the criterion, from ROADMAP P1 #2)

**≥ ~50% of RAW generated boards per level must be solvable without rerolls.** Rerolls and the
carve repair stay as safety nets, not as the generator's operating mode.

## Candidate solutions

### A. Density-normalised mine count (recommended)
Compute the mine budget from the board that exists, not from a constant:
`mines = round(MINE_DENSITY[level] × freeCells)` where `freeCells` = interior − building cells −
entry/exit safe zones, counted **after** `placeBuildings` (buildings are drawn first already, so
the order works today). Calibrate `MINE_DENSITY` so that L1–L2 match the current feel and L3/L4+
land at Mined-Out's *effective* density.
- **Pros:** the knob finally measures what the player experiences; building count can keep rising
  per level without silently re-hardening the field; one constant per level in `config.ts`.
- **Cons / risks:** see the risk table — mine count varies per board (HUD, README table).

### B. Cap total building area per level
Keep fixed mine counts; bound `Σ building cells ≤ X% of interior` so the free area can't shrink
below what the mine count assumes.
- **Pros:** smallest change; counts stay stable.
- **Cons:** attacks the symptom (space), not the coupling; two caps (count + area) to co-tune;
  big-building variety suffers at high levels.

### C. Simply lower L3/L4+ mine counts
Pure `LEVEL_CONFIGS` tuning (e.g. 100 → ~85, 110 → ~90) until the ≥50% criterion holds.
- **Pros:** zero code; can ship inside the difficulty pass immediately.
- **Cons:** re-couples silently the next time buildings change — the drift that got us here.

### D. Guard test (belongs with any of A–C)
A seeded generation-health test: generate N boards per level with the reroll loop disabled (or by
calling `buildField`-level logic) and assert the raw-solvable share ≥ 50%. Turns the criterion
into CI, so density can't creep back unnoticed.

**Recommendation: A + D**, with C as the quick interim inside the August difficulty pass if A
doesn't fit the session. B only if big buildings turn out to be the dominant cause during tuning.

## Risks (mostly for A, flagged regardless)

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Daily determinism** | Mine budget must derive only from seeded state | `freeCells` comes from the seeded board after `placeBuildings` — same seed ⇒ same buildings ⇒ same count. No wall-clock, no `Math.random()`. Keep the determinism-guard test (ROADMAP #13) in scope |
| **Variable mine count per day** | HUD `MINES:` and the README level table stop being one fixed number | Cosmetic: HUD already shows `totalMines` from the actual board; README table becomes "≈N (density-based)" |
| **Tests pinning exact counts** | Any test asserting `totalMines === 110` breaks | Grep and re-express as density bounds before switching |
| **Perceived difficulty drop** | Fewer mines at L3/L4+ | The *felt* difficulty comes from density + timer + airdrops; compensate with `acMineDrop*` if runs get too comfortable — airdrops are solvability-guarded already |
| **Airdrop pressure unbalanced** | Airplane adds mines to a now-sparser board | Include drops in the calibration playtests; the per-drop BFS guard already caps the harm |
| **Carve becomes invisible dead code** | With healthy density it (almost) never fires | Good — that's its job. Keep the `hunt3:*` regressions so it stays proven |
| **Save compatibility** | None — generation-time only, map is persisted as tiles | No version bump needed |

## Cross-references

- `ROADMAP.md` → P1 #2 (criterion + measurement), P2 #13 (determinism guard), #14 (test seeding).
- `docs/known-issues.md` → "createGame could return an unsolvable field" (the carve repair).
- `src/game.ts` → `bfsPath` / `isFieldSolvable` / `carveSafePath`; `src/buildings.ts` →
  `placeBuildings` (margins + gaps are what keep the carve's mine-free graph connected).
