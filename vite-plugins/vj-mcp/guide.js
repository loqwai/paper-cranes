// The VJ MCP's answers about itself: server instructions, the `guide` tool, one MCP prompt and
// one resource per workflow, all parsed from docs/vj-mcp-guide.md (the only copy of the text).
// The host passes the markdown in: the dev server reads the file, the relay Worker bundles it as
// a wrangler Text module. No model and no index here: `guide {question}` ranks sections by term
// overlap (BM25), so the same question always gets the same answer, in microseconds.
import { z } from 'zod'

const ENTRY = /^## ([a-z0-9-]+): (.+)$/
const GROUPS = { Workflows: 'workflow', Topics: 'topic' }

// md -> { orientation, entries: [{ id, title, kind, body, status, seeAlso }] }
export const parseGuide = (md) => {
  const entries = []
  const orientation = []
  let group = null
  let entry = null
  for (const line of String(md).split(/\r?\n/)) {
    const h1 = /^# (.+)$/.exec(line)
    if (h1) {
      group = h1[1].trim()
      entry = null
      continue
    }
    const h2 = ENTRY.exec(line)
    if (h2 && GROUPS[group]) {
      entry = { id: h2[1], title: h2[2].trim(), kind: GROUPS[group], lines: [] }
      entries.push(entry)
      continue
    }
    if (entry) entry.lines.push(line)
    else if (group === 'Orientation') orientation.push(line)
  }
  return {
    orientation: orientation.join('\n').trim(),
    entries: entries.map(({ lines, ...e }) => {
      const body = lines.join('\n').trim()
      const status = /^> Status: ([\s\S]*?)(?:\n(?!>)|$)/m.exec(body)?.[1].replace(/\n> ?/g, ' ').trim() ?? null
      const seeAlso = /^See also: (.+)$/m.exec(body)?.[1].split(',').map((s) => s.trim()).filter(Boolean) ?? []
      return { ...e, body, status, seeAlso }
    }),
  }
}

const cache = new Map()
const parsed = (md) => {
  if (!cache.has(md)) {
    if (cache.size > 4) cache.clear()
    cache.set(md, index(parseGuide(md)))
  }
  return cache.get(md)
}

// ── Retrieval ─────────────────────────────────────────────────────────────────────────────────
const STOP = new Set('a an and are as at be by can do does for from get how i if in into is it its me my of on or so that the then this to use what when where which with without you your want need make let should could would up down out off now just there here'.split(' '))
const stem = (w) => {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}
// Words an agent says for what the guide calls by another name.
const SYNONYMS = { turn: ['knob'], slider: ['knob'], dial: ['knob'], fader: ['knob'], param: ['knob'], look: ['screenshot'], see: ['screenshot'], image: ['screenshot'], picture: ['screenshot'], judge: ['screenshot'], watch: ['wait'], poll: ['wait'], event: ['wait', 'signal'], listen: ['wait'], lock: ['secret'], live: ['relay'], deploy: ['relay'], room: ['relay'], edit: ['write'], save: ['write'], switch: ['swap'], load: ['swap'], hotswap: ['swap'], compile: ['validate'], broken: ['troubleshoot'], error: ['troubleshoot'], fail: ['troubleshoot'], screen: ['display'], tv: ['display'], projector: ['display'] }
const terms = (text) => {
  const out = []
  for (const raw of String(text).toLowerCase().match(/[a-z0-9_]+/g) ?? []) {
    const words = raw.includes('_') ? [raw, ...raw.split('_')] : [raw]
    for (const w of words) {
      if (!w || STOP.has(w)) continue
      const s = stem(w)
      out.push(s, ...(SYNONYMS[s] ?? []))
    }
  }
  return out
}

const index = (g) => {
  const docs = g.entries.map((e) => {
    // Titles and ids say what a section is about; count them three times over the body.
    const head = terms(`${e.id.replace(/-/g, ' ')} ${e.title}`)
    const tf = new Map()
    for (const t of [...head, ...head, ...head, ...terms(e.body)]) tf.set(t, (tf.get(t) ?? 0) + 1)
    return { e, tf, len: [...tf.values()].reduce((a, b) => a + b, 0) }
  })
  const avg = docs.reduce((a, d) => a + d.len, 0) / Math.max(docs.length, 1)
  const df = new Map()
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  const idf = (t) => Math.log(1 + (docs.length - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5))
  // How-to questions want a recipe; what-is questions want the reference. Either wins a near tie.
  const REFERENCE = /\b(what (is|are|does|do)|why|mean|meaning)\b/i
  const rank = (question) => {
    const q = [...new Set(terms(question))]
    const favour = REFERENCE.test(question) ? 'topic' : 'workflow'
    return docs
      .map((d) => ({
        entry: d.e,
        score: (d.e.kind === favour ? 1.3 : 1) * q.reduce((s, t) => {
          const f = d.tf.get(t) ?? 0
          return s + (f ? idf(t) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.len / avg)) : 0)
        }, 0),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
  }
  return { ...g, byId: new Map(g.entries.map((e) => [e.id, e])), rank }
}

// ── Rendering ─────────────────────────────────────────────────────────────────────────────────
const uriFor = (e) => `vj://guide/${e.kind}s/${e.id}`
const section = (e) => `## ${e.id}: ${e.title}\n\n${e.body}`
const line = (e) => `- \`${e.id}\`: ${e.title}${e.status ? ' (coming soon)' : ''}`

export const guideContents = (md) => {
  const g = parsed(md)
  const of = (kind) => g.entries.filter((e) => e.kind === kind).map(line).join('\n')
  return `# VJ MCP guide\n\nCall \`guide {topic: "<id>"}\` for one section, or \`guide {question: "how do I ..."}\` for the best matches. Each workflow is also an MCP prompt (same id) and the resource vj://guide/workflows/<id>.\n\n## Workflows (step-by-step tool-call recipes)\n\n${of('workflow')}\n\n## Topics (reference)\n\n${of('topic')}\n`
}

export const guideTopic = (md, id) => {
  const e = parsed(md).byId.get(id)
  return e ? section(e) : null
}

// The top sections for a question, at most 3, dropping any far below the best.
export const guideAnswer = (md, question) => {
  const g = parsed(md)
  const ranked = g.rank(question)
  if (!ranked.length) return { hits: [], text: `No section matched ${JSON.stringify(question)}.\n\n${guideContents(md)}` }
  const hits = ranked.filter((r, i) => i === 0 || r.score >= ranked[0].score * 0.35).slice(0, 3)
  const shown = new Set(hits.map((h) => h.entry.id))
  const more = [...new Set([...hits.flatMap((h) => h.entry.seeAlso), ...ranked.slice(hits.length, hits.length + 3).map((r) => r.entry.id)])]
    .filter((id) => !shown.has(id) && g.byId.has(id))
  const text = [
    `Best matches for ${JSON.stringify(question)}: ${hits.map((h) => h.entry.id).join(', ')}`,
    ...hits.map((h) => section(h.entry)),
    more.length ? `See also: ${more.map((id) => `${id} (${g.byId.get(id).title})`).join('; ')}. Read one with guide {topic: "<id>"}.` : '',
  ].filter(Boolean).join('\n\n---\n\n')
  return { hits: hits.map((h) => ({ id: h.entry.id, score: +h.score.toFixed(3) })), text }
}

export const guideInstructions = (md, venue) => `${parsed(md).orientation}\n\n${venue?.where ?? ''}`.trim()

// ── MCP surface ───────────────────────────────────────────────────────────────────────────────
// registerTool: the host's wrapper (it logs calls), same signature as McpServer.registerTool.
export const registerGuide = (server, md, { registerTool = server.registerTool.bind(server) } = {}) => {
  const g = parsed(md)
  const text = (t) => ({ content: [{ type: 'text', text: t }] })
  const ids = g.entries.map((e) => e.id)

  registerTool('guide', {
    description: 'How to use this server, answered from its own guide (no model involved). No arguments: the contents (workflows and topics). topic: one section by id, e.g. "hot-swap-shader". question: the 1-3 best matching sections for a how-to question, e.g. "how do I swap the shader without reloading", with see-also ids. Workflows are numbered tool-call recipes with real argument shapes.',
    inputSchema: {
      topic: z.string().optional().describe(`a section id: ${ids.join(', ')}`),
      question: z.string().optional().describe('a how-to question in plain words'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ topic, question } = {}) => {
    if (topic) {
      const t = guideTopic(md, topic.trim())
      if (t) return text(t)
      if (!question) return { isError: true, content: [{ type: 'text', text: `no topic ${JSON.stringify(topic)}; topics: ${ids.join(', ')}` }] }
    }
    if (question) return text(guideAnswer(md, question).text)
    return text(guideContents(md))
  })

  for (const e of g.entries.filter((e) => e.kind === 'workflow')) {
    server.registerPrompt(e.id, {
      title: e.title,
      description: `VJ MCP workflow: ${e.title}${e.status ? ` (${e.status})` : ''}`,
    }, () => ({
      description: e.title,
      messages: [{ role: 'user', content: { type: 'text', text: `Follow this Paper Cranes VJ MCP workflow. Call the tools it names with the argument shapes shown, and confirm each step from the reply.\n\n${section(e)}` } }],
    }))
  }

  const resource = (name, uri, title, description, body) =>
    server.registerResource(name, uri, { title, description, mimeType: 'text/markdown' }, async (u) => ({
      contents: [{ uri: u.href, mimeType: 'text/markdown', text: body() }],
    }))
  resource('guide', 'vj://guide', 'VJ MCP guide: contents', 'The workflows and topics, with their ids.', () => guideContents(md))
  for (const e of g.entries) resource(`${e.kind}-${e.id}`, uriFor(e), e.title, `VJ MCP ${e.kind}: ${e.title}`, () => section(e))
  // The whole guide as one skill file, the way draw serves skill://draw/SKILL.md.
  resource('skill', 'skill://paper-cranes-vj/SKILL.md', 'Paper Cranes VJ skill', 'The whole VJ MCP guide as one skill file.', () =>
    `---\nname: paper-cranes-vj\ndescription: Drive Paper Cranes live shader displays through the VJ MCP: pick a display, turn knobs, hot-swap shaders, watch signals, judge screenshots, run a relay room.\n---\n\n${g.orientation}\n\n${g.entries.map(section).join('\n\n')}\n`)
}
