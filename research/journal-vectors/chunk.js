// Chunk the paper-cranes "memory" corpus (journals, docs, per-shader docs, the sun-set JOURNEY)
// into heading-scoped passages with line ranges, so every retriever ranks the same units and a
// hit can be scored against a gold line range.
//
// mindmeld chunks conversations by message groups up to 28k chars and embeds LLM summaries of
// them. Markdown already has structure, so here a chunk is one heading section (with its heading
// path as context), split at paragraph boundaries when it runs past MAX chars. No summariser:
// the raw passage is what gets embedded, because a citation has to point at real lines.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../..', import.meta.url).pathname
const MAX = 1800
const MIN = 120

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (name.endsWith('.md')) out.push(p)
  }
  return out
}

export const corpusFiles = () => [
  ...walk(join(ROOT, 'journals')),
  ...walk(join(ROOT, 'docs')),
  ...walk(join(ROOT, 'shaders')),
  join(ROOT, '.claude/skills/sun-set/JOURNEY.md'),
].map((p) => relative(ROOT, p)).sort()

const dateOf = (file, text) =>
  /(\d{4}-\d{2}-\d{2})/.exec(file)?.[1] ?? /\b(20\d\d-\d\d-\d\d)\b/.exec(text.slice(0, 600))?.[1] ?? null

const shaderOf = (file) => {
  const m = /^shaders\/(.+)\/[^/]+\.md$/.exec(file)
  if (m) return m[1].replace(/\/wip\//, '/')
  const j = /^journals\/(.+?)(-cool-moments|-iteration-log|-hypotheses)?\.md$/.exec(file)
  return j && j[2] ? j[1] : null
}

export const chunkFile = (file) => {
  const text = readFileSync(join(ROOT, file), 'utf8')
  const lines = text.split(/\r?\n/)
  const sections = []
  const path = []
  let cur = { heading: [], start: 1, lines: [] }
  let fence = false
  lines.forEach((line, i) => {
    if (/^```/.test(line)) fence = !fence
    const h = !fence && /^(#{1,4})\s+(.+)$/.exec(line)
    if (h) {
      if (cur.lines.some((l) => l.trim())) sections.push(cur)
      const depth = h[1].length
      path.length = depth - 1
      path[depth - 1] = h[2].trim()
      cur = { heading: path.filter(Boolean).slice(), start: i + 1, lines: [line] }
      return
    }
    cur.lines.push(line)
  })
  if (cur.lines.some((l) => l.trim())) sections.push(cur)

  // Split long sections at blank lines; merge tiny ones into the next section of the same file.
  const pieces = []
  for (const s of sections) {
    let buf = []
    let bufStart = s.start
    let size = 0
    s.lines.forEach((l, k) => {
      if (size + l.length > MAX && !l.trim() && buf.length) {
        pieces.push({ heading: s.heading, start: bufStart, end: s.start + k - 1, body: buf.join('\n') })
        buf = []
        size = 0
        bufStart = s.start + k + 1
        return
      }
      if (size > MAX * 1.6 && buf.length) {
        pieces.push({ heading: s.heading, start: bufStart, end: s.start + k - 1, body: buf.join('\n') })
        buf = []
        size = 0
        bufStart = s.start + k
      }
      buf.push(l)
      size += l.length + 1
    })
    if (buf.some((l) => l.trim())) pieces.push({ heading: s.heading, start: bufStart, end: s.start + s.lines.length - 1, body: buf.join('\n') })
  }
  const merged = []
  for (const p of pieces) {
    const prev = merged.at(-1)
    if (prev && prev.body.trim().length < MIN) {
      prev.end = p.end
      prev.body = `${prev.body}\n${p.body}`
      prev.heading = p.heading.length > prev.heading.length ? p.heading : prev.heading
      continue
    }
    merged.push({ ...p })
  }
  const date = dateOf(file, text)
  const shader = shaderOf(file)
  return merged.map((p, i) => ({
    id: `${file}#${i}`,
    file,
    heading: p.heading.join(' > '),
    start: p.start,
    end: p.end,
    date,
    shader,
    // What gets indexed: where it lives, then the passage. The file path carries the shader name.
    text: `${file}\n${p.heading.join(' > ')}\n\n${p.body.trim()}`,
  }))
}

export const buildChunks = () => corpusFiles().flatMap(chunkFile)

if (import.meta.url === `file://${process.argv[1]}`) {
  const chunks = buildChunks()
  const out = process.argv[2] ?? join(ROOT, 'research/journal-vectors/out/chunks.json')
  writeFileSync(out, JSON.stringify(chunks))
  const chars = chunks.reduce((a, c) => a + c.text.length, 0)
  console.log(`${corpusFiles().length} files, ${chunks.length} chunks, ${chars} chars, mean ${Math.round(chars / chunks.length)}`)
}
