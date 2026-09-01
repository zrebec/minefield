// Walking the Playwright-driven scripts past the loading picture.
//
// Since 0.67.0 the game opens on a loading screen that gates every other screen:
// a browser refuses to start an AudioContext before a real user gesture, so the
// game asks for one key up front and everything past it may assume sound exists
// (ROADMAP.md → Decisions, 2026-08-27). Only Enter, gamepad Start or a tap
// leaves it — see the `appPhase === 'loading'` branch in main.ts.
//
// Every script that drives the real page therefore has to walk through the gate
// before it may press a single game key. None of them did: smoke.mjs,
// offline.mjs and persist.mjs each went `goto` → `press('r')`, and from
// 2026-08-27 all three reported a dead game (`runStarted` / `playableOffline` /
// `playableFromColdStart` false) while the game itself was fine. The fix lives
// here once rather than three times over — CLAUDE.md coding rule 1.
//
// This is a probe, not a blind Enter. Enter on the TITLE starts a DAILY run, and
// a daily is the one thing these scripts must never touch (only random runs stay
// off the leaderboard). So it refuses to press until it can actually see the
// gate, and reports what happened instead of assuming.

/** Both live regions' text, the only evidence of the phase outside the canvas. */
const regions = (page) => page.evaluate(() => [
  document.getElementById('sr-announcer')?.textContent ?? '',
  document.getElementById('sr-status')?.textContent ?? '',
])

/**
 * Leave the loading screen. Returns true if the gate was up and we got past it,
 * false if it never appeared or nothing moved after the key — either of which is
 * a real regression worth failing a gate script on, so callers record it as a
 * named check rather than letting it pass silently.
 */
export const passBootGate = async (page, timeoutMs = 8000) => {
  // The gate announces itself into #sr-announcer at boot — the one announcement
  // in the game that has to work before audio does, and the only trace of the
  // screen that exists outside the canvas. It is pinned to name the key in both
  // locales (test/loading.test.ts: "names Enter in both locales"), which is what
  // makes this string check locale-safe.
  const gateUp = await page.waitForFunction(
    () => (document.getElementById('sr-announcer')?.textContent ?? '')
      .toLowerCase().includes('enter'),
    null, { timeout: timeoutMs },
  ).then(() => true, () => false)
  if (!gateUp) return false

  const before = await regions(page)
  await page.keyboard.press('Enter')

  // The two ways out write to different regions: a cold start lands on the title
  // and announces it (#sr-announcer), a save-resume skips the title and speaks
  // its orientation line instead (#sr-status). Waiting on "either one moved"
  // covers both without this helper having to know which boot it just watched.
  return page.waitForFunction(
    ([a, s]) => (document.getElementById('sr-announcer')?.textContent ?? '') !== a
      || (document.getElementById('sr-status')?.textContent ?? '') !== s,
    before, { timeout: timeoutMs },
  ).then(() => true, () => false)
}
