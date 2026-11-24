import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // dist/ gets controllers/*.test.js copied in by the build, with imports that only resolve from the source tree.
    // .claude/skills holds node:test files (node --test ...); vitest runs them but finds no suite and fails the run.
    exclude: ['e2e/**', 'dist/**', '**/node_modules/**', '.show-repos/**', '.claude/**'],
  },
})
