// The retrievers under test. Every one ranks the same chunks (chunk.js) and returns chunk indices,
// best first.

// ── (a) plain BM25 ────────────────────────────────────────────────────────────────────────────
const STOP = new Set('a an and are as at be by can do does did for from get how i if in into is it its me my of on or so that the then this to use what when where which who why with without you your we our us he his him was were has have had there here than them they their these those just not no'.split(' '))
const plainTerms = (text) => (String(text).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => !STOP.has(w))

const bm25 = (docTerms, k1 = 1.2, b = 0.75) => {
  const docs = docTerms.map((ts) => {
    const tf = new Map()
    for (const t of ts) tf.set(t, (tf.get(t) ?? 0) + 1)
    return { tf, len: ts.length }
  })
  const N = docs.length
  const avg = docs.reduce((a, d) => a + d.len, 0) / N
  const df = new Map()
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  const idf = (t) => Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5))
  return { docs, idf, k1, b, avg }
}

const scoreBm25 = (ix, qTerms, d) => qTerms.reduce((s, t) => {
  const f = d.tf.get(t) ?? 0
  return f ? s + ix.idf(t) * (f * (ix.k1 + 1)) / (f + ix.k1 * (1 - ix.b + ix.b * d.len / ix.avg)) : s
}, 0)

const rankBy = (scores) => scores.map((s, i) => [s, i]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(([, i]) => i)

export const makeBm25 = (chunks) => {
  const ix = bm25(chunks.map((c) => plainTerms(c.text)))
  return (q) => {
    const qt = [...new Set(plainTerms(q))]
    return rankBy(ix.docs.map((d) => scoreBm25(ix, qt, d)))
  }
}

// ── (b) Field Guide's retriever (vite-plugins/vj-mcp/guide.js on feat/vj-mcp-guide, uncommitted
// at the time of the run): BM25 with suffix stemming, underscore splitting, a synonym table, and
// the section title counted three times. Ported verbatim except the workflow/topic favour, which
// has no meaning outside its guide file. Title here = file path + heading path.
const FG_STOP = new Set('a an and are as at be by can do does for from get how i if in into is it its me my of on or so that the then this to use what when where which with without you your want need make let should could would up down out off now just there here'.split(' '))
const stem = (w) => {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}
const SYNONYMS = { turn: ['knob'], slider: ['knob'], dial: ['knob'], fader: ['knob'], param: ['knob'], look: ['screenshot'], see: ['screenshot'], image: ['screenshot'], picture: ['screenshot'], judge: ['screenshot'], watch: ['wait'], poll: ['wait'], event: ['wait', 'signal'], listen: ['wait'], lock: ['secret'], live: ['relay'], deploy: ['relay'], room: ['relay'], edit: ['write'], save: ['write'], switch: ['swap'], load: ['swap'], hotswap: ['swap'], compile: ['validate'], broken: ['troubleshoot'], error: ['troubleshoot'], fail: ['troubleshoot'], screen: ['display'], tv: ['display'], projector: ['display'] }
const fgTerms = (text) => {
  const out = []
  for (const raw of String(text).toLowerCase().match(/[a-z0-9_]+/g) ?? []) {
    const words = raw.includes('_') ? [raw, ...raw.split('_')] : [raw]
    for (const w of words) {
      if (!w || FG_STOP.has(w)) continue
      const s = stem(w)
      out.push(s, ...(SYNONYMS[s] ?? []))
    }
  }
  return out
}

export const makeFieldGuide = (chunks) => {
  const docs = chunks.map((c) => {
    const head = fgTerms(`${c.file.replace(/[/.-]/g, ' ')} ${c.heading}`)
    const tf = new Map()
    for (const t of [...head, ...head, ...head, ...fgTerms(c.text)]) tf.set(t, (tf.get(t) ?? 0) + 1)
    return { tf, len: [...tf.values()].reduce((a, b) => a + b, 0) }
  })
  const avg = docs.reduce((a, d) => a + d.len, 0) / docs.length
  const df = new Map()
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  const idf = (t) => Math.log(1 + (docs.length - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5))
  return (q) => {
    const qt = [...new Set(fgTerms(q))]
    return rankBy(docs.map((d) => qt.reduce((s, t) => {
      const f = d.tf.get(t) ?? 0
      return s + (f ? idf(t) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.len / avg)) : 0)
    }, 0)))
  }
}

// ── (c) vectors only ──────────────────────────────────────────────────────────────────────────
const dot = (a, b) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}
const norm = (v) => {
  const n = Math.sqrt(dot(v, v)) || 1
  return v.map((x) => x / n)
}
export const makeVector = (chunkVecs) => {
  const vs = chunkVecs.map(norm)
  return (qVec) => {
    const q = norm(qVec)
    return vs.map((v, i) => [dot(v, q), i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i)
  }
}

// ── (d) hybrid: mindmeld's fusion. src/mcp/rrf.ts: score = sum over arms of 1/(60 + rank + 1).
// Candidate pools as src/mcp/search.ts candidatePool: lexical limit*2, vector limit*3.
export const rrf = (lists, k = 60) => {
  const fused = new Map()
  for (const list of lists) list.forEach((id, rank) => fused.set(id, (fused.get(id) ?? 0) + 1 / (k + rank + 1)))
  return [...fused.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([id]) => id)
}
export const hybrid = (lexical, vector, limit = 10) => rrf([lexical.slice(0, limit * 2), vector.slice(0, limit * 3)])
