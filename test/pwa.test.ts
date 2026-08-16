import { describe, it, expect } from 'vitest'
import manifestRaw from '../public/manifest.webmanifest?raw'
import indexHtml from '../index.html?raw'
import swTemplate from '../scripts/sw-template.js?raw'

// The offline wrap's contract, checked without a browser (docs/offline.md).
// scripts/offline.mjs proves the game actually RUNS with the network cut; this
// file guards the parts that are easy to break silently and that no runtime
// error would ever surface — a manifest key renamed, an icon path that no
// longer resolves, an absolute URL that works on Pages and 404s on itch.io.
//
// Files are pulled in with Vite's `?raw` / `import.meta.glob` rather than
// node:fs on purpose: tsconfig deliberately limits `types` to vite/client, and
// a test is not a good enough reason to take on @types/node.

// Every icon Vite can see on disk, keyed by path relative to this file.
const iconFiles = new Set(Object.keys({
  ...import.meta.glob('../public/icons/*.png'),
  ...import.meta.glob('../public/*.svg'),
}))

const manifest = JSON.parse(manifestRaw) as {
  name: string
  short_name: string
  start_url: string
  scope: string
  display: string
  background_color: string
  theme_color: string
  icons: { src: string, sizes: string, type: string, purpose?: string }[]
}

describe('manifest', () => {
  it('is named for the game', () => {
    // The installed app's name is what a player sees on their home screen, so
    // it has to be the game's name and nothing else. Game, directory, repo and
    // URL have all read `minefield` since the rename was cancelled (2026-08-16),
    // so there is no longer any gap between them to guard.
    expect(manifest.name).toBe('Minefield')
    expect(manifest.short_name).toBe('Minefield')
  })

  it('installs as a standalone window', () => {
    expect(manifest.display).toBe('standalone')
  })

  it('keeps start_url and scope RELATIVE', () => {
    // This is the whole reason one build serves both deployments. An absolute
    // '/minefield/' here would resolve against itch.io's own host, where the
    // game lives under a path itch chooses, and the installed app would open a
    // 404. Relative URLs resolve against the manifest, which is always beside
    // index.html.
    expect(manifest.start_url.startsWith('/')).toBe(false)
    expect(manifest.scope.startsWith('/')).toBe(false)
    for (const icon of manifest.icons) expect(icon.src.startsWith('/')).toBe(false)
  })

  it('uses Spectrum colours', () => {
    // zx-kit C.BLACK / C.B_BLUE — the border/paper pair index.html paints.
    expect(manifest.background_color).toBe('#000000')
    expect(manifest.theme_color).toBe('#0000FF')
  })

  it('ships the icon sizes browsers actually require', () => {
    const sizes = manifest.icons.map((i) => i.sizes)
    expect(sizes).toContain('192x192')   // Chrome's install criteria
    expect(sizes).toContain('512x512')   // splash screen + Lighthouse
    expect(manifest.icons.some((i) => i.type === 'image/svg+xml')).toBe(true)
  })

  it('offers icons with purpose exactly "any" — WebKit skips anything maskable', () => {
    // DO NOT "tidy" these back into a single `purpose: "any maskable"` entry.
    // That is what shipped first, and it cost Safari the icon entirely: WebKit
    // parses `purpose` and skips every icon whose value contains `maskable`,
    // using only `any` (or no purpose at all). With all four icons declared
    // "any maskable", Safari's Add to Dock fell through to drawing the first
    // letter of the name — it recorded `WKManifestIconKind = Monogram` in the
    // generated app's Info.plist. Separate entries, same files.
    const any = manifest.icons.filter((i) => i.purpose === 'any')
    expect(any.length).toBeGreaterThan(0)
    expect(any.some((i) => i.type === 'image/png')).toBe(true)   // Safari needs a raster one
    for (const icon of manifest.icons) expect(icon.purpose).not.toBe('any maskable')
  })

  it('still declares a maskable set, which the artwork earns', () => {
    // The motif's widest point sits inside the 80 %-diameter circle Android
    // crops to (see scripts/icons.mjs), so the same files legitimately serve
    // both purposes — they just cannot say so in one entry. If the artwork ever
    // grows past that, drop these entries rather than keep an untrue claim.
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)
  })

  it('points at files that exist', () => {
    for (const icon of manifest.icons) {
      expect(iconFiles.has(`../public/${icon.src}`), icon.src).toBe(true)
    }
  })
})

describe('index.html', () => {
  it('links the manifest and the icons through the base-URL placeholder', () => {
    // Hard-coding either base breaks the other deployment silently — the page
    // still loads, it just quietly has no icon and no install prompt.
    for (const href of [
      'manifest.webmanifest',
      'icon.svg',
      'icons/favicon-32.png',
      'icons/apple-touch-icon.png',
    ]) {
      expect(indexHtml).toContain(`%BASE_URL%${href}`)
    }
  })

  it('declares the theme colour the manifest declares', () => {
    expect(indexHtml).toContain(`content="${manifest.theme_color}"`)
  })

  it('still has the accessibility skeleton the wrap must not disturb', () => {
    // The offline wrap only added <link>s and <meta>s to the head. If a future
    // edit to that block ever eats a live region, the game goes silent for
    // screen readers and nothing else fails.
    for (const id of ['sr-announcer', 'sr-status', 'sr-legend', 'sr-menu']) {
      expect(indexHtml).toContain(`id="${id}"`)
    }
  })
})

describe('service worker template', () => {
  const template = swTemplate

  it('leaves exactly the three placeholders the build fills', () => {
    // The plugin matches whole assignment lines and throws on any leftover, so
    // a placeholder written anywhere else in the file would fail the build.
    // This test says which three are expected, so the failure is readable.
    expect(template).toContain("const CACHE = '__CACHE__'")
    expect(template).toContain("const INDEX = '__INDEX__'")
    expect(template).toContain('const PRECACHE = __PRECACHE__')
    expect(template.match(/__[A-Z]+__/g)).toHaveLength(3)
  })

  it('ignores Vary on every cache read', () => {
    // Without this the precached bundle is unreachable offline: addAll stores
    // entries fetched without an Origin header, the page requests its module
    // WITH one (Vite emits crossorigin), and any host answering `Vary: Origin`
    // makes every lookup miss. Cost a real debugging session — see the comment
    // in the template.
    expect(template).toContain('ignoreVary: true')
    expect(template).not.toMatch(/caches\.match\(req\)/)
    expect(template).not.toMatch(/cache\.match\(INDEX\)/)
  })

  it('deletes only this game\'s old caches', () => {
    // github.io is one origin for the whole portfolio; an unprefixed sweep
    // would delete the other games' caches too. `the-strip-` is this game's
    // too — builds shipped under the cancelled rename (2026-08-16) — and it is
    // listed so those orphans still get collected.
    expect(template).toContain("'minefield-'")
    expect(template).toContain("'the-strip-'")
    expect(template).toMatch(/OWNED_PREFIXES\.some\(/)
  })
})
