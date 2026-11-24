// Embedding backends with a content-hash cache: local Ollama bge-m3 (what mindmeld runs) and
// Cloudflare Workers AI @cf/baai/bge-m3 over its REST API. Both give 1024-dim vectors.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'

export const ollamaEmbed = async (texts) => {
  const r = await fetch(`${OLLAMA}/api/embed`, { method: 'POST', body: JSON.stringify({ model: 'bge-m3', input: texts }) })
  if (!r.ok) throw new Error(`ollama ${r.status} ${await r.text()}`)
  return (await r.json()).embeddings
}

// CF_ACCOUNT_ID + CF_API_TOKEN (Workers AI read). Batch limit for bge-m3 text is 100 per call.
export const workersAiEmbed = async (texts) => {
  const { CF_ACCOUNT_ID, CF_API_TOKEN } = process.env
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`, {
    method: 'POST',
    headers: { authorization: `Bearer ${CF_API_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ text: texts }),
  })
  const j = await r.json()
  if (!j.success) throw new Error(`workers ai: ${JSON.stringify(j.errors)}`)
  return j.result.data
}

const BACKENDS = { ollama: ollamaEmbed, workers: workersAiEmbed }

export const embedAll = async (texts, { backend = 'ollama', cacheFile, batch = 16, log = () => {} } = {}) => {
  const cache = cacheFile && existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {}
  const key = (t) => createHash('sha256').update(t).digest('hex').slice(0, 24)
  const todo = [...new Set(texts.filter((t) => !cache[key(t)]))]
  const fn = BACKENDS[backend]
  const t0 = Date.now()
  for (let i = 0; i < todo.length; i += batch) {
    const part = todo.slice(i, i + batch)
    const vecs = await fn(part)
    part.forEach((t, k) => { cache[key(t)] = vecs[k].map((x) => +x.toFixed(6)) })
    if ((i / batch) % 10 === 0) {
      log(`${backend}: ${i + part.length}/${todo.length} embedded, ${((Date.now() - t0) / 1000).toFixed(1)}s`)
      if (cacheFile) writeFileSync(cacheFile, JSON.stringify(cache))
    }
  }
  if (cacheFile && todo.length) writeFileSync(cacheFile, JSON.stringify(cache))
  return { vectors: texts.map((t) => cache[key(t)]), embedded: todo.length, seconds: (Date.now() - t0) / 1000 }
}
