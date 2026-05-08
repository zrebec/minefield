import { defineConfig } from 'vite'
import { readFileSync } from 'fs'

const zxKitVersion = (JSON.parse(readFileSync('./node_modules/zx-kit/package.json', 'utf-8')) as { version: string }).version

const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'"

export default defineConfig(({ command }) => ({
  base: '/minefield/',
  define: {
    'import.meta.env.VITE_ZX_KIT_VERSION': JSON.stringify(zxKitVersion),
  },
  plugins: command === 'build' ? [{
    name: 'inject-csp',
    transformIndexHtml: (html) => html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">`,
    ),
  }] : [],
  test: {
    environment: 'node',
  },
}))
