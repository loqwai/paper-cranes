import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // .claude/skills holds node:test files (node --test ...); vitest runs them but finds no suite and fails the run.
    // dist/ holds build copies (controllers/*.test.js among them); never test those twice.
    exclude: ['e2e/**', '**/node_modules/**', '.show-repos/**', '.claude/**', 'dist/**'],
  },
})
