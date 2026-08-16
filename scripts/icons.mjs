// App-icon generator — the PWA / itch.io / desktop icon set.
//
//   node scripts/icons.mjs --candidates [outDir]   # preview sheet, pick one
//   node scripts/icons.mjs <name>                  # write the real set to public/
//
// The SOURCE is SVG, not an 8×8 sprite. The 8×8 rule (AGENTS.md "Permanent
// Visual Rules") governs the 256×192 playfield — it does not govern a 1024 px
// icon in the macOS Dock, where it would only throw away resolution the format
// gives us for free. What DOES carry over is the palette: every colour below is
// a real Spectrum colour from `zx-kit`'s `C`, never a raw hex, and there are no
// gradients — a Spectrum cannot make one.
//
// Rasterising runs in headless Chromium (Node has no SVG renderer); same
// devDependency and same trick as scripts/capture.mjs.

import { chromium } from 'playwright'
import { C } from 'zx-kit'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const VB = 512          // SVG viewBox — a vector unit grid, not a pixel size

// ── Motifs ────────────────────────────────────────────────────────────────────
// Each ink is quoted from what the thing already IS in the game, not picked for
// the icon: mines are the danger red, cyan is what `D` sweeps and `F` plants,
// and B_YELLOW is the ink your own walked trail is drawn in on grass
// (TERRAIN_VISITED_INK in src/sprites.ts).

// A · MINA — contact mine: body, eight horns, one white glint. The glint is the
// oldest trick in Spectrum art and it is what turns a red disc into a sphere.
const mine = () => {
  const horns = Array.from({ length: 8 }, (_, i) =>
    `<path d="M -20 -98 L -10 -166 Q 0 -173 10 -166 L 20 -98 Z" transform="rotate(${i * 45})"/>`).join('')
  return `
    <defs><clipPath id="ball"><circle cx="256" cy="256" r="112"/></clipPath></defs>
    <g transform="translate(256 256)">
      <g fill="${C.RED}">${horns}</g>
      <circle r="112" fill="${C.RED}"/>
    </g>
    <circle cx="226" cy="222" r="106" fill="${C.B_RED}" clip-path="url(#ball)"/>
    <circle cx="212" cy="206" r="23" fill="${C.B_WHITE}"/>`
}

// B · SONAR — the `D` sweep: an emitter throwing three arcs east. Brightness
// falls off outward using the Spectrum's own normal/bright pair as the only two
// steps available — that IS the machine's idea of a gradient.
const sonar = () => {
  const arc = (r, colour) => {
    const a = 0.95 // half-sweep in radians (≈54°)
    const [x1, y1] = [170 + r * Math.cos(-a), 256 + r * Math.sin(-a)]
    const [x2, y2] = [170 + r * Math.cos(a), 256 + r * Math.sin(a)]
    return `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"
      fill="none" stroke="${colour}" stroke-width="30" stroke-linecap="round"/>`
  }
  return `
    <circle cx="170" cy="256" r="36" fill="${C.B_CYAN}"/>
    ${arc(96, C.B_CYAN)}
    ${arc(158, C.B_CYAN)}
    ${arc(220, C.CYAN)}`
}

// C · STOPA — a bare footprint. The whole game is one question asked over and
// over (where do you put your foot) and yellow is the colour that question
// leaves behind on the field.
const step = () => `
  <g fill="${C.B_YELLOW}">
    <path d="M 168 262 C 168 196 196 158 254 158 C 312 158 344 198 344 258
             C 344 300 330 320 322 344 C 314 368 300 378 256 378
             C 212 378 196 366 190 342 C 184 318 168 300 168 262 Z"/>
    <ellipse cx="163" cy="150" rx="34" ry="40" transform="rotate(-14 163 150)"/>
    <ellipse cx="228" cy="120" rx="26" ry="31"/>
    <ellipse cx="285" cy="117" rx="25" ry="30"/>
    <ellipse cx="335" cy="130" rx="23" ry="27" transform="rotate(14 335 130)"/>
    <ellipse cx="374" cy="158" rx="20" ry="24" transform="rotate(26 374 158)"/>
    <ellipse cx="268" cy="418" rx="72" ry="58"/>
  </g>`

const CANDIDATES = {
  mine:  { label: 'A · MINA',  draw: mine,  ink: C.B_RED },
  sonar: { label: 'B · SONAR', draw: sonar, ink: C.B_CYAN },
  step:  { label: 'C · STOPA', draw: step,  ink: C.B_YELLOW },
}

// No frame: full-bleed BLACK paper, motif on top. Every platform draws its own
// container around an app icon (macOS squircle, Android mask, the browser's tab
// strip) — a border of our own would only fight it, and on Android's 80 %-
// diameter circular crop it would survive as splinters in the corners.
//
// `scale` shrinks the motif for the maskable variants so the crop takes paper,
// never artwork.
const svgFor = (cand, { scale = 1 } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}">
  <rect width="${VB}" height="${VB}" fill="${C.BLACK}"/>
  <g transform="translate(${VB / 2} ${VB / 2}) scale(${scale}) translate(${-VB / 2} ${-VB / 2})">${cand.draw()}</g>
</svg>
`

// ── Output set ────────────────────────────────────────────────────────────────
// 192 + 512 are what Chrome's install criteria and Lighthouse look for. 1024 is
// for macOS: Chrome builds the installed .app's icon from the manifest and the
// .icns format carries a 1024 slot, so anything smaller shows soft in Finder.
// apple-touch-icon must be a PNG at 180 — Safari ignores SVG there.
//
// There is no separate maskable set. The motif's widest point is a horn tip at
// radius 173 of the 256 half-viewBox — 68 % diameter, inside the 80 % circle
// Android crops to. So the same files carry `purpose: "any maskable"` in the
// manifest; a shrunken duplicate would be a second copy of the same picture.
const OUTPUTS = [
  { file: 'icons/icon-192.png',         size:  192 },
  { file: 'icons/icon-512.png',         size:  512 },
  { file: 'icons/icon-1024.png',        size: 1024 },
  { file: 'icons/apple-touch-icon.png', size:  180 },
  { file: 'icons/favicon-32.png',       size:   32 },
]

// Windows wants one .ico carrying every size Explorer might ask for — the Dock's
// .icns equivalent. Built here rather than by the packer so the whole icon set
// comes from one command.
const ICO_SIZES = [16, 32, 48, 64, 128, 256]

/**
 * Pack PNGs into an .ico. The format is a 6-byte header, one 16-byte directory
 * entry per image, then the payloads — and since Vista a payload may be a whole
 * PNG rather than a raw DIB, which is what makes this thirty lines instead of a
 * dependency. A width/height byte of 0 means 256.
 */
const toIco = (images) => {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)                 // reserved
  header.writeUInt16LE(1, 2)                 // 1 = icon (2 would be cursor)
  header.writeUInt16LE(images.length, 4)

  const dir = Buffer.alloc(16 * images.length)
  let offset = header.length + dir.length
  images.forEach(({ size, buf }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o)
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1)
    dir.writeUInt8(0, o + 2)                 // palette entries — none, it is truecolour
    dir.writeUInt8(0, o + 3)                 // reserved
    dir.writeUInt16LE(1, o + 4)              // colour planes
    dir.writeUInt16LE(32, o + 6)             // bits per pixel
    dir.writeUInt32LE(buf.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += buf.length
  })

  return Buffer.concat([header, dir, ...images.map((i) => i.buf)])
}

// ── Rasterising ───────────────────────────────────────────────────────────────

const rasterise = async (page, svg, size) => {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<style>html,body{margin:0;padding:0;overflow:hidden}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  )
  return page.screenshot({ type: 'png' })
}

const write = async (path, data) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, data)
}

// ── Main ──────────────────────────────────────────────────────────────────────

const [arg, argOut] = process.argv.slice(2)
if (!arg) {
  console.error('usage: node scripts/icons.mjs --candidates [outDir] | node scripts/icons.mjs <name>')
  console.error(`names: ${Object.keys(CANDIDATES).join(', ')}`)
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage()

if (arg === '--candidates') {
  const outDir = resolve(argOut ?? resolve(root, 'docs/img/icon-candidates'))
  const names = Object.keys(CANDIDATES)
  for (const name of names) {
    await write(resolve(outDir, `${name}.svg`), svgFor(CANDIDATES[name]))
    await write(resolve(outDir, `${name}-256.png`), await rasterise(page, svgFor(CANDIDATES[name]), 256))
  }
  // Contact sheet: each motif at 256 (Dock size) and at 64 (tab/favicon size),
  // because an icon that only works big is not an icon.
  const cell = 256, small = 64, gap = 32, pad = 28, labelH = 40
  await page.setViewportSize({
    width: pad * 2 + names.length * cell + (names.length - 1) * gap,
    height: pad * 2 + cell + gap + small + labelH,
  })
  await page.setContent(`<style>
      html,body{margin:0;background:#202020;font:15px ui-monospace,monospace;color:#fff}
      .row{display:flex;gap:${gap}px;padding:${pad}px}
      figure{margin:0;text-align:center}
      .big{width:${cell}px;height:${cell}px;display:block}
      .small{width:${small}px;height:${small}px;display:block;margin:${gap}px auto 0}
      figcaption{margin-top:14px;letter-spacing:.08em}
    </style><div class="row">${names.map((n) => {
      const b64 = Buffer.from(svgFor(CANDIDATES[n])).toString('base64')
      return `<figure>
        <img class="big" src="data:image/svg+xml;base64,${b64}">
        <img class="small" src="data:image/svg+xml;base64,${b64}">
        <figcaption>${CANDIDATES[n].label}</figcaption>
      </figure>`
    }).join('')}</div>`)
  await write(resolve(outDir, 'candidates.png'), await page.screenshot({ type: 'png' }))
  console.log(JSON.stringify({ ok: true, mode: 'candidates', outDir, names }, null, 1))
} else {
  const cand = CANDIDATES[arg]
  if (!cand) {
    console.error(`unknown icon "${arg}" — known: ${Object.keys(CANDIDATES).join(', ')}`)
    await browser.close()
    process.exit(1)
  }
  const written = []
  for (const { file, size, scale } of OUTPUTS) {
    await write(resolve(root, 'public', file), await rasterise(page, svgFor(cand, { scale }), size))
    written.push(`public/${file}`)
  }
  // NOT into public/ — anything there is copied into every build and then
  // precached by the service worker, so a Windows-only icon would ride along in
  // the web deployment and in every player's cache for nothing. It lives beside
  // the launcher that actually uses it.
  const ico = []
  for (const size of ICO_SIZES) ico.push({ size, buf: await rasterise(page, svgFor(cand), size) })
  await write(resolve(root, 'launcher/win/minefield.ico'), toIco(ico))
  written.push('launcher/win/minefield.ico')

  await write(resolve(root, 'public/icon.svg'), svgFor(cand))
  written.push('public/icon.svg')
  console.log(JSON.stringify({ ok: true, icon: arg, ink: cand.ink, icoSizes: ICO_SIZES, written }, null, 1))
}

await browser.close()
