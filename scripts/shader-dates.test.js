import { describe, it, expect } from 'vitest'
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bakedDatesText, writeBakedDates, shouldAutoRefreshBake } from './shader-dates.js'

const dates = new Map([
  ['shaders/b.frag', '2026-01-02T00:00:00-07:00'],
  ['shaders/Z.frag', '2026-01-03T00:00:00-07:00'],
  ['shaders/a.frag', '2026-01-01T00:00:00-07:00'],
  ['shaders/deleted.frag', '2025-01-01T00:00:00-07:00'],
])

describe('shader-dates baked file', () => {
  it('drops shaders that no longer exist and sorts keys by code point', () => {
    const existing = new Set(['shaders/a.frag', 'shaders/b.frag', 'shaders/Z.frag'])
    expect(Object.keys(JSON.parse(bakedDatesText(dates, existing)))).toEqual([
      'shaders/Z.frag',
      'shaders/a.frag',
      'shaders/b.frag',
    ])
  })

  it('leaves the file untouched when the text would not change', async () => {
    const file = join(await mkdtemp(join(tmpdir(), 'shader-dates-')), 'shader-dates.json')
    expect((await writeBakedDates(dates, { file })).written).toBe(true)
    const before = (await stat(file)).mtimeMs
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(await writeBakedDates(dates, { file })).toEqual({ count: 4, written: false })
    expect((await stat(file)).mtimeMs).toBe(before)
  })

  it('rewrites a stale file', async () => {
    const file = join(await mkdtemp(join(tmpdir(), 'shader-dates-')), 'shader-dates.json')
    await writeFile(file, '{}\n')
    expect((await writeBakedDates(dates, { file })).written).toBe(true)
    expect(await readFile(file, 'utf-8')).toBe(bakedDatesText(dates))
  })

  it('auto-refreshes from a dev server or build only while shaders are being changed', () => {
    expect(shouldAutoRefreshBake({ usable: true, dirtyShaderCount: 0 })).toBe(false)
    expect(shouldAutoRefreshBake({ usable: true, dirtyShaderCount: 2 })).toBe(true)
    expect(shouldAutoRefreshBake({ usable: false, dirtyShaderCount: 2 })).toBe(false)
  })
})
