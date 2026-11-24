// The VJ MCP answering questions about itself, through a real MCP client, from the real guide
// markdown (docs/vj-mcp-guide.md): instructions, the guide tool, prompts and resources.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createVjMcpServer } from './server.js'
import { parseGuide } from './guide.js'

const GUIDE = readFileSync(new URL('../../docs/vj-mcp-guide.md', import.meta.url), 'utf-8')
const WORKFLOWS = ['pick-display', 'change-knobs', 'hot-swap-shader', 'watch-page', 'screenshot-judge', 'relay-room', 'live-show-partner']
const TOPICS = ['tools', 'knobs', 'signals', 'displays', 'servers', 'security', 'troubleshooting']

const connect = async ({ guide = GUIDE, displaySecret } = {}) => {
  const hub = { list: () => [], seq: 0 }
  const server = createVjMcpServer({ hub, shaders: { index: async () => [], read: async () => ({}) }, venue: { displays: 'x', where: 'VENUE-LINE', noneHint: 'x' }, guide, displaySecret })
  const [a, b] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 't', version: '0' })
  await Promise.all([server.connect(a), client.connect(b)])
  return client
}
const ask = async (client, args) => {
  const r = await client.callTool({ name: 'guide', arguments: args })
  return { isError: !!r.isError, text: r.content[0].text }
}
const bestMatches = (text) => /^Best matches for .*?: (.+)$/m.exec(text)?.[1].split(', ')

let client
beforeAll(async () => { client = await connect() })
afterAll(async () => { await client.close() })

describe('the guide markdown', () => {
  it('holds every workflow and topic, each with a body', () => {
    const g = parseGuide(GUIDE)
    expect(g.entries.filter((e) => e.kind === 'workflow').map((e) => e.id)).toEqual(WORKFLOWS)
    expect(g.entries.filter((e) => e.kind === 'topic').map((e) => e.id)).toEqual(TOPICS)
    for (const e of g.entries) expect(e.body.length, e.id).toBeGreaterThan(80)
  })

  it('names only real ids in every See also line', () => {
    const g = parseGuide(GUIDE)
    const ids = new Set(g.entries.map((e) => e.id))
    for (const e of g.entries) for (const s of e.seeAlso) expect(ids.has(s), `${e.id} -> ${s}`).toBe(true)
  })

  it('marks the live-show workflow as not live yet, and nothing else', () => {
    const g = parseGuide(GUIDE)
    expect(g.entries.filter((e) => e.status).map((e) => e.id)).toEqual(['live-show-partner'])
  })
})

describe('server instructions', () => {
  it('carry the orientation from the guide, the workflows, and the venue line', () => {
    const ins = client.getInstructions()
    expect(ins).toMatch(/call `guide`/)
    for (const id of WORKFLOWS) expect(ins).toContain(`\`${id}\``)
    expect(ins).toContain('VENUE-LINE')
  })
})

describe('guide tool', () => {
  it('lists every workflow and topic when called with no arguments', async () => {
    const { text } = await ask(client, {})
    for (const id of [...WORKFLOWS, ...TOPICS]) expect(text).toContain(`\`${id}\``)
    expect(text).toMatch(/live-show-partner.*coming soon/)
  })

  it('returns one section verbatim by topic', async () => {
    const { text } = await ask(client, { topic: 'relay-room' })
    expect(text).toMatch(/^## relay-room: /)
    expect(text).toContain('display_secret {action: "rotate"')
  })

  it('refuses an unknown topic and lists the real ones', async () => {
    const r = await ask(client, { topic: 'nope' })
    expect(r.isError).toBe(true)
    expect(r.text).toContain('hot-swap-shader')
  })

  it.each([
    ['how do I swap the shader without reloading', 'hot-swap-shader'],
    ['how do I edit a shader and make sure it compiles', 'hot-swap-shader'],
    ['how do I turn a knob up', 'change-knobs'],
    ['my midi fader stopped working', 'troubleshooting'],
    ['how do I lock the room so nobody can fake a display', 'relay-room'],
    ['wait for the page to report it is too dark', 'watch-page'],
    ['which display am I talking to', 'pick-display'],
    ['what does the shiver signal mean', 'signals'],
  ])('%s -> %s first', async (question, id) => {
    const { text } = await ask(client, { question })
    expect(bestMatches(text)?.[0]).toBe(id)
    expect(text).toContain(`## ${id}: `)
  })

  it('answers the shader-swap question with the set_shader and write_shader recipe and a see-also', async () => {
    const { text } = await ask(client, { question: 'how do I swap the shader without reloading' })
    expect(text).toContain('set_shader {shader: "clit-set/2"')
    expect(text).toContain('write_shader {shader:')
    expect(text).toMatch(/See also: .*screenshot-judge/)
    expect(bestMatches(text).length).toBeLessThanOrEqual(3)
  })

  it('falls back to the contents when nothing matches', async () => {
    const { text } = await ask(client, { question: 'zzqx' })
    expect(text).toMatch(/No section matched/)
    expect(text).toContain('`pick-display`')
  })
})

describe('dev server host (tools.js)', () => {
  it('reads the guide from docs/ and serves it', async () => {
    const { createVjMcpServer: devServer } = await import('./tools.js')
    const server = devServer({ hub: { list: () => [], seq: 0 }, root: new URL('../..', import.meta.url).pathname, port: 7150 })
    const [a, b] = InMemoryTransport.createLinkedPair()
    const c = new Client({ name: 't', version: '0' })
    await Promise.all([server.connect(a), c.connect(b)])
    expect(c.getInstructions()).toContain('`hot-swap-shader`')
    expect((await c.listTools()).tools.map((t) => t.name)).toContain('guide')
    expect((await c.listPrompts()).prompts.length).toBe(WORKFLOWS.length)
    await c.close()
  })
})

describe('prompts and resources', () => {
  it('serve one prompt per workflow, whose message is the recipe', async () => {
    const { prompts } = await client.listPrompts()
    expect(prompts.map((p) => p.name)).toEqual(WORKFLOWS)
    const p = await client.getPrompt({ name: 'change-knobs' })
    expect(p.messages[0].content.text).toContain('set_params {params: {"knob_12": 0.8')
  })

  it('serve every section as a vj://guide resource, plus contents and a skill file', async () => {
    const { resources } = await client.listResources()
    const uris = resources.map((r) => r.uri)
    expect(uris).toContain('vj://guide')
    expect(uris).toContain('skill://paper-cranes-vj/SKILL.md')
    for (const id of WORKFLOWS) expect(uris).toContain(`vj://guide/workflows/${id}`)
    for (const id of TOPICS) expect(uris).toContain(`vj://guide/topics/${id}`)
    const r = await client.readResource({ uri: 'vj://guide/workflows/watch-page' })
    expect(r.contents[0].text).toContain('wait_for_event {since: <seq>')
    const skill = await client.readResource({ uri: 'skill://paper-cranes-vj/SKILL.md' })
    expect(skill.contents[0].text).toMatch(/^---\nname: paper-cranes-vj\n/)
  })
})
