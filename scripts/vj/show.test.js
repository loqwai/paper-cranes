import { it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const CLI = new URL('./show.js', import.meta.url).pathname

// Read-only commands only: nothing here launches the show browser. An unused CDP port keeps it
// away from a real show browser on 9333.
const run = async (args, env = {}) => {
  try {
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [CLI, ...args], {
      env: { ...process.env, SHOW_CDP_PORT: '9799', ...env },
    })
    return { code: 0, stdout, stderr }
  } catch (err) {
    return { code: err.code, stdout: err.stdout, stderr: err.stderr }
  }
}

it.runIf(process.platform === 'linux')('says to install xrandr instead of crashing with spawn ENOENT', async () => {
  const { code, stderr } = await run(['displays'], { PATH: '/nonexistent' })
  expect(code).toBe(1)
  expect(stderr.trim()).toMatch(/^show\.js displays: .*xrandr, which is not installed/)
  expect(stderr).not.toMatch(/at .*show\.js:\d+/)
}, 30_000)

it('answers a command against a browser that is not running with the fix, not a stack trace', async () => {
  const { code, stderr } = await run(['shot'])
  expect(code).toBe(1)
  expect(stderr.trim()).toBe('show.js shot: show browser not running on http://127.0.0.1:9799 — run: node scripts/vj/show.js launch <url>')
}, 30_000)
