import { mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { changing, keptLabel, keptOps, onKeep } from './board-kept.js'

describe('board-kept', () => {
  it('labels a keep with time, shader and the knobs that are not 0', () => {
    const label = keptLabel({ t: '2026-11-24T04:05:00Z', shader: 'clit-set/2', params: { knob_12: 0.333, knob_4: 0.66, knob_5: 0, cs_time: 9 } })
    expect(label).toMatch(/^\d\d:\d\d · clit-set\/2\nk4 0.66 k12 0.33$/)
  })

  it('copies only files that keep changing', () => {
    expect(changing('clit-set/2-wip')).toBe(true)
    expect(changing('clit-set/2-p3')).toBe(true)
    expect(changing('clit-set/2')).toBe(false)
  })

  it('stacks cards down the kept frame', () => {
    const [op] = keptOps({ id: 'x', label: 'L' })
    expect(op.drafts[0]).toMatchObject({ id: 'kept-x', frameId: 'kept', text: 'L' })
    const [third] = keptOps({ id: 'y', label: 'L', box: { x: 100, y: 200 }, n: 2 })
    expect(third.drafts[0]).toMatchObject({ x: 120, y: 392 })
  })

  it('saves the picture and a -wip file, then posts the card; no model involved', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kept-'))
    const calls = []
    const mcp = {
      call: async (name, args) => {
        calls.push(name)
        if (name === 'screenshot') return { body: {}, images: [{ data: Buffer.from('jpeg').toString('base64') }] }
        if (name === 'read_shader') return { body: { code: `// ${args.shader}` } }
        throw new Error(name)
      },
    }
    const posted = []
    const out = await onKeep({ mcp, root, post: async (ops) => { posted.push(ops); return true } }, { t: '2026-11-24T04:05:00.000Z', shader: 'clit-set/2-wip', params: { knob_4: 0.5 } })
    expect(calls).toEqual(['screenshot', 'read_shader'])
    expect(readFileSync(out.shot, 'utf8')).toBe('jpeg')
    expect(existsSync(out.copied)).toBe(true)
    expect(posted).toHaveLength(1)
    expect(out.posted).toBe(true)
  })
})
