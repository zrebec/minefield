import { defineConfig } from 'vite'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { dependencies: Record<string, string> }
const zxKitVersion = pkg.dependencies['zx-kit'].replace(/^[\^~>=]/, '')

export default defineConfig({
  base: '/minefield/',
  define: {
    'import.meta.env.VITE_ZX_KIT_VERSION': JSON.stringify(zxKitVersion),
  },
  test: {
    environment: 'node',
  },
})
