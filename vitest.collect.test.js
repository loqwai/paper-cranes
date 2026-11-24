// `npm test` broke twice by collecting files it should not: .claude/skills node:test files
// (no vitest suite, so the run fails) and dist/** copies after a build (every controller test
// run twice, against stale code). Ask vitest itself what it would collect, with a decoy test
// planted in each place that must stay out, and check every file is inside the intended roots.
import { describe, it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const ROOT = dirname(fileURLToPath(import.meta.url))
// node_modules/ gets no decoy (it may be a symlink shared with other checkouts); the check still covers it.
const FORBIDDEN = ['.claude/', 'dist/', 'node_modules/', 'e2e/', '.show-repos/']
const DECOY_DIRS = FORBIDDEN.filter((dir) => dir !== 'node_modules/')
const DECOY = '__vitest_collect_decoy__.test.js'

const collected = async () => {
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [join(ROOT, 'node_modules/vitest/vitest.mjs'), 'list', '--filesOnly', '--json'],
    { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 }
  )
  return JSON.parse(stdout.slice(stdout.indexOf('['))).map(({ file }) => relative(ROOT, file))
}

describe('vitest collection', () => {
  it('collects nothing from .claude/, dist/, node_modules/, e2e/ or .show-repos/', async () => {
    const decoys = DECOY_DIRS.map((dir) => join(ROOT, dir, '__decoy__', DECOY))
    // Remove whole roots this test created (a fresh checkout has no dist/), only the decoy dir otherwise.
    const cleanup = DECOY_DIRS.map((dir) => (existsSync(join(ROOT, dir)) ? join(ROOT, dir, '__decoy__') : join(ROOT, dir)))
    try {
      await Promise.all(decoys.map(async (path) => {
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, "import { it } from 'vitest'\nit('decoy', () => {})\n")
      }))
      const files = await collected()
      expect(files.length).toBeGreaterThan(0)
      expect(files).toContain('vitest.collect.test.js')
      expect(files.filter((file) => FORBIDDEN.some((dir) => file.startsWith(dir)))).toEqual([])
    } finally {
      await Promise.all(cleanup.map((path) => rm(path, { recursive: true, force: true })))
    }
  }, 60_000)
})
