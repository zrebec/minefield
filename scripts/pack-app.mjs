// Builds "The Strip.app" and a drag-to-Applications disk image.
//
//   npm run pack:app        (runs build:offline first)
//
// A macOS .app is just a directory with a agreed-on shape, so this needs no
// packaging tool — only `sips` and `iconutil`, which ship with macOS, to turn
// our 1024 px icon into the .icns Finder wants.
//
//   The Strip.app/Contents/
//     Info.plist            what Finder reads
//     MacOS/the-strip       launcher/app-main.sh
//     Resources/the-strip.icns
//     Resources/serve.sh    shared with the .command launcher
//     Resources/game/       the --base=./ build
//
// NOT SIGNED. On this machine that is invisible — Gatekeeper only quarantines
// what arrived from the internet. A DOWNLOADED copy of an unsigned app needs
// System Settings > Privacy & Security > Open Anyway on macOS 15+, which is
// worse than the .command's prompt. So: the .app and the .dmg are for handing
// over directly (or for your own Dock); the zip stays the itch.io download.
// Fixing that properly needs a paid Apple Developer ID.

import { execFileSync } from 'node:child_process'
import { cp, mkdir, readdir, rm, chmod, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const build = resolve(root, 'dist-offline')
const out = resolve(root, 'release')
const app = resolve(out, 'The Strip.app')
const contents = resolve(app, 'Contents')

const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8')).version
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts })

const files = await readdir(build).catch(() => {
  console.error('pack:app: dist-offline/ is missing — run `npm run build:offline` first')
  process.exit(1)
})
if (!files.includes('index.html')) {
  console.error('pack:app: dist-offline/index.html is missing — the build did not finish')
  process.exit(1)
}

await rm(app, { recursive: true, force: true })
await mkdir(resolve(contents, 'MacOS'), { recursive: true })
await mkdir(resolve(contents, 'Resources/game'), { recursive: true })

// ── Icon ──────────────────────────────────────────────────────────────────────
// iconutil wants a directory of exactly-named PNGs. Every size is downscaled
// from the same 1024 master, so nothing is ever upscaled.
const iconset = resolve(out, 'the-strip.iconset')
await mkdir(iconset, { recursive: true })
const master = resolve(root, 'public/icons/icon-1024.png')
for (const [px, name] of [
  [16, 'icon_16x16.png'], [32, 'icon_16x16@2x.png'],
  [32, 'icon_32x32.png'], [64, 'icon_32x32@2x.png'],
  [128, 'icon_128x128.png'], [256, 'icon_128x128@2x.png'],
  [256, 'icon_256x256.png'], [512, 'icon_256x256@2x.png'],
  [512, 'icon_512x512.png'], [1024, 'icon_512x512@2x.png'],
]) {
  run('sips', ['-z', String(px), String(px), master, '--out', resolve(iconset, name)], { stdio: 'ignore' })
}
run('iconutil', ['-c', 'icns', iconset, '-o', resolve(contents, 'Resources/the-strip.icns')])
await rm(iconset, { recursive: true, force: true })

// ── Bundle ────────────────────────────────────────────────────────────────────
await writeFile(resolve(contents, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>The Strip</string>
  <key>CFBundleDisplayName</key><string>The Strip</string>
  <key>CFBundleIdentifier</key><string>io.github.zrebec.the-strip</string>
  <key>CFBundleExecutable</key><string>the-strip</string>
  <key>CFBundleIconFile</key><string>the-strip</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>LSMinimumSystemVersion</key><string>10.15</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`)

await cp(resolve(root, 'launcher/app-main.sh'), resolve(contents, 'MacOS/the-strip'))
await chmod(resolve(contents, 'MacOS/the-strip'), 0o755)
await cp(resolve(root, 'launcher/serve.sh'), resolve(contents, 'Resources/serve.sh'))
await cp(build, resolve(contents, 'Resources/game'), { recursive: true })

// ── Disk image ────────────────────────────────────────────────────────────────
// The /Applications symlink is what makes a .dmg an installer: open it and you
// drag the app across. UDZO = compressed read-only, the normal format.
const stage = resolve(out, 'dmg')
const dmg = resolve(out, 'The-Strip.dmg')
await rm(stage, { recursive: true, force: true })
await mkdir(stage, { recursive: true })
await cp(app, resolve(stage, 'The Strip.app'), { recursive: true })
run('ln', ['-s', '/Applications', resolve(stage, 'Applications')])
await rm(dmg, { force: true })
run('hdiutil', ['create', '-volname', 'The Strip', '-srcfolder', stage, '-ov', '-quiet', '-format', 'UDZO', dmg])
await rm(stage, { recursive: true, force: true })

console.log(JSON.stringify({
  ok: true,
  app: app.replace(`${root}/`, ''),
  dmg: dmg.replace(`${root}/`, ''),
  signed: false,
  note: 'unsigned — fine locally, needs System Settings > Privacy & Security if downloaded',
}, null, 1))
