import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // .claude/skills holds node:test files (node --test ...); vitest runs them but finds no suite and fails the run.
    exclude: ['e2e/**', '**/node_modules/**', '.show-repos/**', '.claude/**'],
  },
})
