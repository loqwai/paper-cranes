import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // .claude/ holds agent runtime files and the generated skills copy; a node:test file there has no vitest suite and fails the run.
    // dist/ holds build copies (controllers/*.test.js among them); never test those twice.
    exclude: ['e2e/**', '**/node_modules/**', '.show-repos/**', '.claude/**', 'dist/**'],
  },
})
