---
name: verify
description: How to verify a Minefield change live in the real browser (Vite dev server + Playwright driving the actual page/DOM).
---

# Verifying Minefield live

Unit tests live in `/test`; this is for proving a change at the real surface —
the canvas + the ARIA DOM a screen reader meets.

## Handle

```bash
npm run dev -- --port 5199 --strictPort   # background; app at http://localhost:5199/minefield/
```

Playwright is a devDependency (chromium already installed — `npm run smoke`
uses it). A scratchpad script must import it by absolute path (ESM won't walk
into the project's node_modules from outside):

```js
import { chromium } from '<repo>/node_modules/playwright/index.mjs'
```

Use a fresh `browser.newContext()` per scenario — fresh profile = empty
localStorage = story intro due, no save, no scores, EN locale.

## Driving the game

- Cold load lands on the title (unless a save resumes). Keys: SPACE=daily,
  R=random, I=intro replay, L=locale, H=audio guide.
- Fresh storage ⇒ the story pre-roll runs before the game: ~12× `Enter` with
  ~120 ms gaps skips all 5 cards (first key finishes a card, second advances).
- Walking: `ArrowRight` etc., ≥160 ms apart (walk tween ~WALK_DURATION_MS).
- **Reading state without pixels:** the ARIA regions are a reliable oracle —
  `#sr-announcer` (deaths, "Game over.", the legend), `#sr-status` (mode/
  orientation/title lines), `#sr-menu` (title menu mirror, one `<p>`/line).
- **Forcing a game over:** start a run and random-walk
  (`['ArrowRight','ArrowRight','ArrowUp','ArrowDown']`, ~600 presses cap)
  until `#sr-announcer` contains "Game over." — 3 lives go quickly. Straight
  right often survives; mix directions.
- **Reaching hiscore entry needs a DAILY run** — random runs never record
  scores (by design). After game over: any key → name entry → letters →
  `Enter` saves → title. On the title, `Enter`/`Space` STARTS A RUN — don't
  press them to "confirm" anything there.
- Faster deterministic fields for level/win flows: `MINE_DENSITY`≈0.001 or
  `WIN_LEVEL = 1` in `config.ts` (dev only, revert before commit).
