import { it, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const CLI = new URL('./knob-correlate.js', import.meta.url).pathname

it('answers "no knobtrack data yet" on a checkout that has never logged a knob', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'knob-correlate-'))
  const { stdout } = await promisify(execFile)(process.execPath, [CLI], { cwd })
  expect(stdout.trim()).toBe('no knobtrack data yet')
})
