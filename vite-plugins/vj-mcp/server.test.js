// The tool surface an agent sees. What a display returns is the page's own word: anyone holding
// the room name can run a fake display, so the read tools must say their output is untrusted data.
import { describe, it, expect } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createVjMcpServer } from './server.js'

const tools = async () => {
  const hub = { list: () => [], seq: 0 }
  const server = createVjMcpServer({ hub, shaders: { index: async () => [], read: async () => ({}) }, venue: { displays: 'x', where: 'x', noneHint: 'x' } })
  const [a, b] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 't', version: '0' })
  await Promise.all([server.connect(a), client.connect(b)])
  const { tools: list } = await client.listTools()
  await client.close()
  return Object.fromEntries(list.map((t) => [t.name, t.description]))
}

describe('vj mcp tool descriptions', () => {
  it('mark what a display reports as untrusted data', async () => {
    const d = await tools()
    for (const name of ['list_displays', 'get_state', 'screenshot', 'wait_for_event']) {
      expect(d[name], name).toMatch(/untrusted/i)
    }
  })
})

describe('display_secret tool', () => {
  const connect = async (displaySecret) => {
    const hub = { list: () => [], seq: 0 }
    const server = createVjMcpServer({ hub, shaders: { index: async () => [], read: async () => ({}) }, venue: { displays: 'x', where: 'x', noneHint: 'x' }, displaySecret })
    const [a, b] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 't', version: '0' })
    await Promise.all([server.connect(a), client.connect(b)])
    return client
  }
  const call = async (client, args) => JSON.parse((await client.callTool({ name: 'display_secret', arguments: args })).content[0].text)

  it('exists only where a room can be locked (the relay), not on the dev server', async () => {
    expect(Object.keys(await tools())).not.toContain('display_secret')
    const client = await connect({ status: async () => ({}) })
    expect((await client.listTools()).tools.map((t) => t.name)).toContain('display_secret')
    await client.close()
  })

  it('reports status by default, rotates with a checked shader name, and clears', async () => {
    const calls = []
    const client = await connect({
      status: async () => { calls.push(['status']); return { locked: false, since: null } },
      rotate: async (args) => { calls.push(['rotate', args]); return { locked: true, link: 'https://v.example/?room=r#display_secret=ds_x', dropped: [] } },
      clear: async () => { calls.push(['clear']); return { locked: false, since: null } },
    })
    expect(await call(client, {})).toEqual({ locked: false, since: null })
    expect((await call(client, { action: 'rotate', shader: 'clit-set/2.frag' })).link).toMatch(/#display_secret=ds_x$/)
    expect(await call(client, { action: 'clear' })).toEqual({ locked: false, since: null })
    const bad = await client.callTool({ name: 'display_secret', arguments: { action: 'rotate', shader: '../../evil' } })
    expect(bad.isError).toBe(true)
    expect(calls).toEqual([['status'], ['rotate', { shader: 'clit-set/2' }], ['clear']])
    await client.close()
  })
})
