// Boot check — what the player actually sees in the first two seconds.
//
// This script exists because the loading screen shipped and never appeared. It
// had a module, a phase, a render function and eight passing tests; the tail of
// main() overwrote the phase at boot and nothing noticed, because every test
// asked about the *asset* and none asked whether anyone looked at it.
//
// So this one drives the real thing: a headless browser, the real boot path, no
// dev hooks. It captures the first frame, presses Enter, captures the next, and
// fails if they are the same picture.
//
//   node scripts/boot-shot.mjs             # assert only
//   node scripts/boot-shot.mjs --write     # also write docs/img/boot-*.png
//
// Needs the dev-only devDependency `playwright` (browser: `npx playwright install chromium`).
// The Vite server is in-process, on its own port, and dies with the script — it
// is not a background dev server.

import { createServer } from 'vite'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'docs/img')
const WRITE = process.argv.includes('--write')

const canvasPng = (page) =>
  page.evaluate(() => document.getElementById('game').toDataURL('image/png'))

async function main() {
  // strictPort is off, so this lands on a free port and never fights whatever
  // the developer already has running.
  const server = await createServer({
    root,
    server: { host: '127.0.0.1', port: 5199, strictPort: false },
    logLevel: 'warn',
  })
  await server.listen()
  const url = server.resolvedUrls.local[0]

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  // Vite pre-bundles deps on first load and the reload it triggers can wipe the
  // canvas mid-capture. Reload once with the cache warm.
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.getElementById('game') !== null)

  // A cold load must not have a save, or we would be measuring the resume path.
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  // Past 1800 ms deliberately. zx-kit's drawVolumeBar starts with
  // `_volumeChangedAt = 0`, so for the first VOLUME_BAR_MS (1.5 s) of *every*
  // page load it paints the volume bar for a change that never happened — over
  // the title screen before, over this picture now. A shorter wait captures that
  // artifact and makes the screenshot look like a bug in the loading screen.
  await page.waitForTimeout(1800)

  const first = await canvasPng(page)
  const announced = await page.evaluate(
    () => document.getElementById('sr-announcer')?.textContent?.trim() ?? '',
  )

  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  const second = await canvasPng(page)

  // The resume branch, end to end. Start a daily run and take one real step so
  // the game writes a save, then reload: the picture must come back. A resumed
  // run needs the key more than a cold load does — it goes straight into
  // gameplay, and until some key is pressed the AudioContext is locked, so the
  // sonar and the mine warning are silent in a game played by ear.
  // Space from the title does not always reach the game directly: on a cold load
  // isIntroDue() is true (we cleared the marker), so it plays the typewriter
  // story first. Keep pressing until the save appears rather than guessing how
  // many cards there are.
  //
  // zx-kit keys slots as `<namespace>:<profile.key>:<slot>`; 'minefield' is the
  // profile key from save.ts, and startRun() writes an 'auto' slot at once so
  // the run is resumable from level 1.
  const savedNow = () =>
    page.evaluate(() => Object.keys(localStorage).some((k) => k.includes(':minefield:')))

  let hasSave = false
  for (let press = 0; press < 40 && !hasSave; press++) {
    await page.keyboard.press('Space')
    await page.waitForTimeout(250)
    hasSave = await savedNow()
  }
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  const afterResume = await canvasPng(page)

  await browser.close()
  await server.close()

  const problems = []
  if (first === second) {
    problems.push('the first frame and the frame after Enter are identical — Enter did nothing')
  }
  if (!hasSave) {
    problems.push('no save was written, so the resume branch below proved nothing')
  } else if (afterResume !== first) {
    problems.push('reloading with a save did not come back to the loading screen')
  }
  if (!announced.toLowerCase().includes('enter')) {
    problems.push(`the loading screen announced ${JSON.stringify(announced)}, which does not mention Enter`)
  }

  if (WRITE) {
    await mkdir(outDir, { recursive: true })
    for (const [name, data] of [['boot-loading', first], ['boot-after-enter', second], ['boot-resume', afterResume]]) {
      await writeFile(resolve(outDir, `${name}.png`), Buffer.from(data.split(',')[1], 'base64'))
      console.log(`wrote docs/img/${name}.png`)
    }
  }

  if (problems.length) {
    for (const p of problems) console.error(`FAIL: ${p}`)
    process.exit(1)
  }
  console.log('PASS: the loading screen is the first frame on a cold load and on a resume, and Enter leaves it')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
