import { defineConfig, type Plugin } from 'vite'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const zxKitVersion = (JSON.parse(readFileSync('./node_modules/zx-kit/package.json', 'utf-8')) as { version: string }).version
const appVersion = (JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }).version

const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'"

/**
 * Emits `sw.js` into the build output — the offline half of the PWA wrap
 * (docs/offline.md). The precache list is read back off DISK after Vite has
 * finished writing, not assembled from the bundle graph: that is the only way
 * to catch both the hashed assets and everything Vite copied out of `public/`
 * (manifest, icons) in one pass, and it can never disagree with what shipped.
 *
 * No CSP change is needed for any of this: `worker-src` falls back through
 * `child-src` to `script-src 'self'`, and `manifest-src` to `default-src 'self'`.
 */
function offlineWrap(): Plugin {
  let outDir = ''
  let base = '/'

  const walk = (dir: string, prefix = ''): string[] =>
    readdirSync(dir, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]))

  return {
    name: 'offline-wrap',
    apply: 'build',
    configResolved(cfg) {
      outDir = resolve(cfg.root, cfg.build.outDir)
      base = cfg.base
    },
    closeBundle() {
      const files = walk(outDir)
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map'))
        .sort()

      // The cache name is a hash of every shipped byte, not just the version:
      // a `workflow_dispatch` rebuild off the same tag still produces a new
      // cache if anything actually changed, and an identical rebuild does not
      // churn the player's storage.
      const digest = createHash('sha1')
      for (const f of files) {
        digest.update(f)
        digest.update(readFileSync(join(outDir, f)))
      }

      // Whole assignment lines, not bare placeholder names: the template's own
      // header comment used to mention them, and a loose match happily filled
      // the comment instead of the constant — shipping an sw.js whose PRECACHE
      // was the literal token. The leftover check below makes that class of
      // mistake a build failure rather than a silent one.
      const cache = `minefield-${appVersion}-${digest.digest('hex').slice(0, 8)}`
      const sw = readFileSync(resolve('./scripts/sw-template.js'), 'utf-8')
        .replace("const CACHE = '__CACHE__'", `const CACHE = ${JSON.stringify(cache)}`)
        .replace("const INDEX = '__INDEX__'", `const INDEX = ${JSON.stringify(`${base}index.html`)}`)
        .replace('const PRECACHE = __PRECACHE__', `const PRECACHE = ${JSON.stringify(files.map((f) => `${base}${f}`), null, 2)}`)

      const leftover = sw.match(/__[A-Z]+__/)
      if (leftover) throw new Error(`offline-wrap: sw-template.js placeholder ${leftover[0]} was not filled`)

      writeFileSync(join(outDir, 'sw.js'), sw)
    },
  }
}

export default defineConfig(({ command }) => ({
  base: '/minefield/',
  define: {
    'import.meta.env.VITE_ZX_KIT_VERSION': JSON.stringify(zxKitVersion),
  },
  plugins: command === 'build' ? [
    {
      name: 'inject-csp',
      transformIndexHtml: (html: string) => html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">`,
      ),
    },
    offlineWrap(),
  ] : [],
  test: {
    environment: 'node',
  },
}))
