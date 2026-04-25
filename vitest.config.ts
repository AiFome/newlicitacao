// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    include:     ['**/*.{test,spec}.{ts,tsx}'],
    exclude:     ['node_modules', 'dist', '.next', 'coverage'],
    coverage: {
      provider:   'v8',
      reporter:   ['text', 'lcov', 'html'],
      include:    ['apps/api/src/**', 'apps/scraper/src/**'],
      exclude:    ['**/*.d.ts', '**/*.test.ts', '**/node_modules/**'],
      thresholds: {
        lines:     60,
        functions: 60,
        branches:  50,
      },
    },
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@licitabr/shared':   path.resolve('./packages/shared/src'),
      '@licitabr/database': path.resolve('./packages/database/src'),
    },
  },
})
