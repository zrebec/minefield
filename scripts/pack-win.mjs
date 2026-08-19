// Builds the Windows offline package.
//
//   npm run pack:win        (runs build:offline first)
//
// Output: release/minefield-offline-windows.zip
//
//   Minefield/
//     Minefield.cmd                 double-click this
//     Create desktop shortcut.cmd   run once for an icon on the Desktop
//     serve.ps1                     the server (PowerShell — always present)
//     minefield.ico                 the shortcut's icon
//     READ ME.txt
//     game/                         the --base=./ build
//
// The game sits in game/ rather than beside the scripts because serve.ps1
// serves exactly one directory and must not be able to hand out its own source.
// (The macOS zip is flat instead, because there the .command has to sit next to
// index.html for a plain double-click to make sense; both are then wrapped the
// same way by the .app / the shortcut.)
//
// Nothing is signed, and on Windows that shows up as SmartScreen rather than
// Gatekeeper: a downloaded .cmd gets "Windows protected your PC" with a "More
// info -> Run anyway" escape. Documented in the package's READ ME.

import { execFileSync } from 'node:child_process'
import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const build = resolve(root, 'dist-offline')
const out = resolve(root, 'release')
const stage = resolve(out, 'win/Minefield')

const files = await readdir(build).catch(() => {
  console.error('pack:win: dist-offline/ is missing — run `npm run build:offline` first')
  process.exit(1)
})
if (!files.includes('index.html')) {
  console.error('pack:win: dist-offline/index.html is missing — the build did not finish')
  process.exit(1)
}

await rm(resolve(out, 'win'), { recursive: true, force: true })
await mkdir(stage, { recursive: true })

for (const name of [
  'Minefield.cmd', 'Create desktop shortcut.cmd',
  'serve.ps1', 'shortcut.ps1', 'minefield.ico', 'READ ME.txt',
]) {
  await cp(resolve(root, 'launcher/win', name), resolve(stage, name))
}
await cp(build, resolve(stage, 'game'), { recursive: true })

// -X drops the Finder metadata that would otherwise ride along as __MACOSX/
// noise in a zip a Windows user opens.
const archive = resolve(out, 'minefield-offline-windows.zip')
await rm(archive, { force: true })
execFileSync('zip', ['-r', '-q', '-X', archive, 'Minefield'], { cwd: resolve(out, 'win'), stdio: 'inherit' })
await rm(resolve(out, 'win'), { recursive: true, force: true })

console.log(JSON.stringify({
  ok: true,
  zip: archive.replace(`${root}/`, ''),
  signed: false,
  untested: 'no Windows machine here — first real run is the owner\'s',
}, null, 1))
