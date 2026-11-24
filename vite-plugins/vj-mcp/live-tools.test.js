// The live-show tools (docs/live-show-contract.md): what reaches the display, with which source.
import { describe, it, expect } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createVjMcpServer } from './server.js'

// One fake display; `live` is what its page reports under get_state's live key.
const harness = async ({ live = { hands: false, held: [], proposals: [] } } = {}) => {
  const sent = []
  const d = { id: 'abc123' }
  const page = { pinned: {}, live }
  const hub = {
    seq: 0,
    list: () => [{ id: d.id, shader: 'clit-set/2' }],
    resolve: () => d,
    send: (_d, type, data, extra) => {
      sent.push({ type, data, ...extra })
      if (type === 'update-params' && !page.live.hands) Object.assign(page.pinned, data)
      if (type === 'update-params' && page.live.hands) page.live.held = Object.keys(data)
    },
    request: async (_d, cmd) => (cmd === 'state' ? { pinned: page.pinned, live: page.live, shaderHash: 'x' } : { ok: true }),
  }
  const server = createVjMcpServer({ hub, shaders: { index: async () => [], read: async (n) => ({ name: n, code: 'c' }) }, venue: { displays: 'x', where: 'x', noneHint: 'x' } })
  const [a, b] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 't', version: '0' })
  await Promise.all([server.connect(a), client.connect(b)])
  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args })
    const text = r.content[0].text
    return { error: r.isError, json: text.startsWith('{') ? JSON.parse(text) : null, text }
  }
  return { sent, call, page }
}

describe('live-show tools', () => {
  it('set_params marks its write as an agent\'s by default, and as the board\'s when asked', async () => {
    const { sent, call } = await harness()
    await call('set_params', { params: { knob_1: 0.5 } })
    await call('set_params', { params: { knob_2: 0.5 }, source: 'board' })
    expect(sent.map((m) => m.source)).toEqual(['agent', 'board'])
  })

  it('set_params says held (not a mismatch) while his hands are on', async () => {
    const { call } = await harness({ live: { hands: true, held: [], proposals: [] } })
    const r = await call('set_params', { params: { knob_1: 0.5 } })
    expect(r.json).toMatchObject({ held: true, ok: true })
  })

  it('set_shader is an agent write and reports held mid-lock without waiting for the swap', async () => {
    const { sent, call } = await harness({ live: { hands: true, held: [], proposals: [] } })
    const r = await call('set_shader', { shader: 'sun/7' })
    expect(sent[0]).toMatchObject({ type: 'update-params', source: 'agent', data: { shader: 'sun/7' } })
    expect(r.json).toMatchObject({ held: true, loaded: false })
  })

  it('propose, answer_proposal, keep and panic each send one message to the display', async () => {
    const { sent, call } = await harness()
    await call('propose', { id: 'p1', label: 'k9 to max?', params: { knob_9: 1 } })
    await call('answer_proposal', { id: 'p1', take: true })
    await call('keep', {})
    await call('panic', { fork: 'sun/7' })
    expect(sent).toEqual([
      { type: 'vj-propose', data: { id: 'p1', label: 'k9 to max?', params: { knob_9: 1 } } },
      { type: 'proposal-answer', data: { id: 'p1', take: true } },
      { type: 'vj-keep', data: {} },
      { type: 'vj-panic', data: { fork: 'sun/7' } },
    ])
  })

  it('propose and panic refuse reserved keys and bad shader names', async () => {
    const { sent, call } = await harness()
    expect((await call('propose', { id: 'p', label: 'x', params: { shaderCode: 1 } })).error).toBe(true)
    expect((await call('panic', { fork: '../../evil' })).error).toBe(true)
    expect(sent).toEqual([])
  })
})
