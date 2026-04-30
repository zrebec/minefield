import { defineConfig } from 'vite'
import { readFileSync } from 'fs'

const zxKitVersion = (JSON.parse(
  readFileSync('./node_modules/zx-kit/package.json', 'utf-8')
) as { version: string }).version

export default defineConfig({
  base: '/minefield/',
  define: {
    'import.meta.env.VITE_ZX_KIT_VERSION': JSON.stringify(zxKitVersion),
  },
  test: {
    environment: 'node',
  },
})
