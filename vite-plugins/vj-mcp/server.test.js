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
