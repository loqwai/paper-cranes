// Show each retriever's top 3 for some questions, for gold adjudication.
//   node research/journal-vectors/inspect.js <question-id> ...
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildChunks } from './chunk.js'
import { embedAll } from './embed.js'
import { makeBm25, makeFieldGuide, makeVector } from './retrievers.js'

const HERE = new URL('.', import.meta.url).pathname
const cacheFile = join(HERE, 'out/emb-ollama.json')
const chunks = buildChunks()
const qs = JSON.parse(readFileSync(join(HERE, 'questions.json'), 'utf8'))
const ids = process.argv.slice(2)
const { vectors } = await embedAll(chunks.map((c) => c.text), { cacheFile })
const { vectors: qv } = await embedAll(qs.map((q) => q.q), { cacheFile })
const bm = makeBm25(chunks), fg = makeFieldGuide(chunks), vec = makeVector(vectors)
for (const q of qs.filter((x) => ids.includes(x.id))) {
  const i = qs.indexOf(q)
  console.log(`\n### ${q.id}: ${q.q}`)
  const seen = new Set()
  for (const [n, r] of [['bm25', bm(q.q)], ['fg', fg(q.q)], ['vec', vec(qv[i])]]) {
    for (const ci of r.slice(0, 3)) {
      const c = chunks[ci]
      if (seen.has(ci)) continue
      seen.add(ci)
      console.log(`${n.padEnd(4)} ${c.file}:${c.start}-${c.end} | ${c.heading.slice(0, 60)} | ${c.text.split('\n').slice(2).join(' ').slice(0, 170)}`)
    }
  }
}
