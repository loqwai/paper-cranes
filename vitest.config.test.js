// `npm run build` copies controllers/ (and their *.test.js) into dist/. Without this exclude a
// build doubles those tests in every later `vitest run` and inflates the counts reviewers read.
import { it, expect } from 'vitest'
import config from './vitest.config.js'

it('never collects tests from the build output', () => {
  expect(config.test.exclude).toContain('dist/**')
})
