// Score every retriever against questions.json: recall@1/3/5 (did any top-k chunk overlap a gold
// line range) and MRR@10. Plus a random-chunk control and a paired bootstrap on recall@3.
//
//   node research/journal-vectors/eval.js                 # local Ollama bge-m3
//   node research/journal-vectors/eval.js --backend workers   # Workers AI bge-m3 (needs CF_* env)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildChunks } from './chunk.js'
import { embedAll } from './embed.js'
import { makeBm25, makeFieldGuide, makeVector, hybrid } from './retrievers.js'

const HERE = new URL('.', import.meta.url).pathname
const OUT = join(HERE, 'out')
mkdirSync(OUT, { recursive: true })
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : dflt
}
const backend = arg('backend', 'ollama')
const log = (m) => console.error(`[eval] ${m}`)

const chunks = buildChunks()
const questions = JSON.parse(readFileSync(join(HERE, 'questions.json'), 'utf8'))

// v1 = the gold written before any retriever ran. v2 adds `goldAdded`: passages that also answer the
// question, found by reading every retriever's top 3 on the misses (all retrievers alike).
const goldSet = arg('gold', 'v2')
for (const q of questions) q.goldUsed = goldSet === 'v2' ? [...q.gold, ...(q.goldAdded ?? [])] : q.gold
const isGold = (q, c) => q.goldUsed.some((g) => g.file === c.file && c.start <= g.end && c.end >= g.start)
for (const q of questions) {
  const n = chunks.filter((c) => isGold(q, c)).length
  if (!n) throw new Error(`question ${q.id}: no chunk overlaps its gold`)
  q.goldChunks = n
}

const { vectors: chunkVecs, embedded, seconds } = await embedAll(chunks.map((c) => c.text), { backend, cacheFile: join(OUT, `emb-${backend}.json`), log })
log(`chunks ${chunks.length}, newly embedded ${embedded} in ${seconds.toFixed(1)}s`)
const { vectors: qVecs } = await embedAll(questions.map((q) => q.q), { backend, cacheFile: join(OUT, `emb-${backend}.json`), log })

const bm25 = makeBm25(chunks)
const fg = makeFieldGuide(chunks)
const vec = makeVector(chunkVecs)

const runs = {
  'a bm25': (q) => bm25(q.q),
  'b field-guide': (q) => fg(q.q),
  'c vectors': (q, i) => vec(qVecs[i]),
  'd hybrid bm25+vec': (q, i) => hybrid(bm25(q.q), vec(qVecs[i])),
  'd2 hybrid fg+vec': (q, i) => hybrid(fg(q.q), vec(qVecs[i])),
}

const firstHit = (q, ranked) => {
  const r = ranked.slice(0, 10).findIndex((ci) => isGold(q, chunks[ci]))
  return r < 0 ? null : r + 1
}

// Seeded PRNG for the random control and the bootstrap.
let seed = 1234567
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const shuffle = (n) => {
  const a = [...Array(n).keys()]
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const per = {}
for (const [name, fn] of Object.entries(runs)) per[name] = questions.map((q, i) => firstHit(q, fn(q, i)))
// Random control: mean over 200 shuffles, reported as expected values.
const RANDOM_N = 200
const randomRanks = []
for (let s = 0; s < RANDOM_N; s++) randomRanks.push(questions.map((q) => firstHit(q, shuffle(chunks.length))))

const metrics = (ranks) => ({
  r1: ranks.filter((r) => r && r <= 1).length / ranks.length,
  r3: ranks.filter((r) => r && r <= 3).length / ranks.length,
  r5: ranks.filter((r) => r && r <= 5).length / ranks.length,
  mrr: ranks.reduce((s, r) => s + (r ? 1 / r : 0), 0) / ranks.length,
})
const mean = (arr) => Object.fromEntries(Object.keys(arr[0]).map((k) => [k, arr.reduce((s, m) => s + m[k], 0) / arr.length]))

const subsets = {
  all: () => true,
  paraphrase: (q) => q.paraphrase,
  literal: (q) => !q.paraphrase,
  'consumer: guide': (q) => q.consumer === 'guide',
  'consumer: partner': (q) => q.consumer === 'partner',
  'consumer: phone': (q) => q.consumer === 'phone',
}
const table = {}
for (const [sname, pred] of Object.entries(subsets)) {
  const idx = questions.map((q, i) => (pred(q) ? i : -1)).filter((i) => i >= 0)
  table[sname] = { n: idx.length, random: mean(randomRanks.map((rr) => metrics(idx.map((i) => rr[i])))) }
  for (const name of Object.keys(runs)) table[sname][name] = metrics(idx.map((i) => per[name][i]))
}

// Paired bootstrap: recall@3 difference of each retriever vs the better lexical baseline.
const hit3 = (name) => per[name].map((r) => (r && r <= 3 ? 1 : 0))
const boot = (a, b, B = 5000) => {
  const n = a.length
  const diffs = []
  for (let k = 0; k < B; k++) {
    let s = 0
    for (let j = 0; j < n; j++) {
      const i = Math.floor(rand() * n)
      s += a[i] - b[i]
    }
    diffs.push(s / n)
  }
  diffs.sort((x, y) => x - y)
  return { diff: a.reduce((s, x, i) => s + x - b[i], 0) / n, lo: diffs[Math.floor(B * 0.025)], hi: diffs[Math.floor(B * 0.975)] }
}
const baseline = table.all['a bm25'].r3 >= table.all['b field-guide'].r3 ? 'a bm25' : 'b field-guide'
const paired = {}
for (const name of ['c vectors', 'd hybrid bm25+vec', 'd2 hybrid fg+vec']) {
  const a = hit3(name), b = hit3(baseline)
  paired[name] = { vs: baseline, ...boot(a, b), wins: a.filter((x, i) => x > b[i]).length, losses: a.filter((x, i) => x < b[i]).length }
}

const perQuestion = questions.map((q, i) => ({ id: q.id, kind: q.kind, paraphrase: q.paraphrase, ...Object.fromEntries(Object.keys(runs).map((n) => [n, per[n][i]])),
  top1: Object.fromEntries(Object.keys(runs).map((n) => [n, chunks[runs[n](q, i)[0]]?.id])) }))

const result = { backend, gold: goldSet, at: new Date().toISOString(), chunks: chunks.length, questions: questions.length, table, paired, perQuestion }
writeFileSync(join(OUT, `results-${backend}-gold${goldSet}.json`), JSON.stringify(result, null, 2))

const f = (x) => x.toFixed(2)
for (const [sname, row] of Object.entries(table)) {
  console.log(`\n${sname} (n=${row.n})`)
  console.log('retriever            r@1   r@3   r@5   MRR@10')
  for (const name of ['random', ...Object.keys(runs)]) {
    const m = row[name]
    console.log(`${name.padEnd(20)} ${f(m.r1)}  ${f(m.r3)}  ${f(m.r5)}  ${f(m.mrr)}`)
  }
}
console.log('\npaired recall@3 vs', baseline)
for (const [n, p] of Object.entries(paired)) console.log(`${n.padEnd(20)} diff ${f(p.diff)} [95% ${f(p.lo)}, ${f(p.hi)}]  wins ${p.wins} losses ${p.losses}`)
console.log('\nper question (first-hit rank, - = none in top 10)')
for (const p of perQuestion) console.log(`${p.id.padEnd(20)} ${p.paraphrase ? 'P' : ' '} ${Object.keys(runs).map((n) => String(p[n] ?? '-').padStart(3)).join(' ')}`)
