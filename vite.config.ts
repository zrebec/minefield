import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/minefield/',
  resolve: {
    alias: {
      'zx-kit': resolve(__dirname, '../zx-kit/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
  },
})
