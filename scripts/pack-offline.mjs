// Builds the two shippable packages from ONE relative-base build.
//
//   npm run pack:offline
//
// Output in release/:
//   the-strip-web.zip           index.html at the ROOT — this is the itch.io
//                               HTML5 upload. itch unzips it and serves it from
//                               a path it chooses, so nothing may be absolute.
//   the-strip-offline-macos.zip the same build plus a launcher and a READ ME,
//                               inside a folder, for the itch "downloads"
//                               section and for a USB stick.
//
// Both come from `npm run build:offline` (base ./). The GitHub Pages build in
// dist/ keeps base /minefield/ and is not touched — mixing the two would break
// whichever deployment lost the coin toss.

import { execFileSync } from 'node:child_process'
import { cp, mkdir, readdir, rm, chmod } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const build = resolve(root, 'dist-offline')
const out = resolve(root, 'release')
const stage = resolve(out, 'The Strip')

const zip = (cwd, archive, what) => {
  // -r recurse, -q quiet, -X drop Finder junk. zip preserves the unix mode
  // bits, which is the whole reason the launcher stays executable after the
  // player unzips it — ditto/tar would work too, zip is what itch expects.
  execFileSync('zip', ['-r', '-q', '-X', archive, ...what], { cwd, stdio: 'inherit' })
  return archive
}

const files = await readdir(build).catch(() => {
  console.error('release: dist-offline/ is missing — run `npm run build:offline` first')
  process.exit(1)
})
if (!files.includes('index.html')) {
  console.error('release: dist-offline/index.html is missing — the build did not finish')
  process.exit(1)
}

await rm(out, { recursive: true, force: true })
await mkdir(stage, { recursive: true })

// 1. The itch.io web upload: the build, nothing else, index.html at the root.
const web = zip(build, resolve(out, 'the-strip-web.zip'), files)

// 2. The downloadable offline package: same build + how to run it.
await cp(build, stage, { recursive: true })
await cp(resolve(root, 'launcher/The Strip.command'), resolve(stage, 'The Strip.command'))
// serve.sh is sourced by the .command at runtime, so it has to travel with it.
// It stays non-executable on purpose: double-clicking it should open an editor,
// not look like a second way to start the game.
await cp(resolve(root, 'launcher/serve.sh'), resolve(stage, 'serve.sh'))
await cp(resolve(root, 'launcher/READ ME.txt'), resolve(stage, 'READ ME.txt'))
await chmod(resolve(stage, 'The Strip.command'), 0o755)
await chmod(resolve(stage, 'serve.sh'), 0o644)
const desktop = zip(out, resolve(out, 'the-strip-offline-macos.zip'), ['The Strip'])
await rm(stage, { recursive: true, force: true })

console.log(JSON.stringify({
  ok: true,
  web: web.replace(`${root}/`, ''),
  desktop: desktop.replace(`${root}/`, ''),
  contents: files.sort(),
}, null, 1))
