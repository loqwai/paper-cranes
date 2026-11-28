// Put NFC variant short links into the 2cb.pw KV namespace, then verify every one answers 301 to its `full`.
//
//   node scripts/nfc/short-links.mjs <variants.json> [--verify-only] [--dry-run]
//
// Each variant needs `short` (https://2cb.pw/<slug>) and `full`. Safety: a slug that already exists
// is only rewritten when it points at the same shader family (same origin + same `shader=` folder);
// anything else is reported and left alone. wrangler runs from os.tmpdir() so no repo wrangler config
// is picked up. A missing slug at the show is exactly the ece353a7 failure, so the verify pass is the
// point: it reads the live redirect for every tag.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const NAMESPACE = 'e239df04697f45d78631c29760c1a5b9'
const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
const verifyOnly = args.includes('--verify-only')
const dryRun = args.includes('--dry-run')
if (!file) { console.error('usage: node scripts/nfc/short-links.mjs <variants.json> [--verify-only] [--dry-run]'); process.exit(2) }

const variants = JSON.parse(readFileSync(file, 'utf8'))
const slugOf = short => new URL(short).pathname.slice(1)
const family = url => { const u = new URL(url); return `${u.origin}/?shader=${(u.searchParams.get('shader') ?? '').split('/')[0]}/` }
const work = mkdtempSync(join(tmpdir(), 'short-links-'))
const wrangler = (...a) => execFileSync('npx', ['wrangler', ...a], { cwd: work, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

if (!verifyOnly) {
  const prefixes = [...new Set(variants.map(v => slugOf(v.short).split('/')[0]))]
  const existing = new Set(prefixes.flatMap(p =>
    JSON.parse(wrangler('kv', 'key', 'list', '--remote', '--namespace-id', NAMESPACE, '--prefix', p)).map(k => k.name)))
  const put = [], refused = []
  for (const v of variants) {
    const slug = slugOf(v.short)
    if (existing.has(slug)) {
      const cur = wrangler('kv', 'key', 'get', '--remote', '--namespace-id', NAMESPACE, slug).trim()
      if (cur === v.full) continue
      if (!cur.startsWith(family(v.full))) { refused.push({ slug, cur }); continue }
    }
    put.push({ key: slug, value: v.full })
  }
  console.log(JSON.stringify({ existing: existing.size, toPut: put.length, refused }))
  if (put.length && !dryRun) {
    const bulk = join(work, 'bulk.json')
    writeFileSync(bulk, JSON.stringify(put))
    console.log(wrangler('kv', 'bulk', 'put', '--remote', '--namespace-id', NAMESPACE, bulk).trim().split('\n').pop())
  }
}

// VERIFY: every short must answer 301 with Location === full
const check = async v => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(v.short, { redirect: 'manual' })
      const loc = r.headers.get('location')
      if (r.status === 301 && loc === v.full) return { n: v.n, ok: true }
      if (attempt === 2) return { n: v.n, ok: false, status: r.status, loc }
    } catch (e) {
      if (attempt === 2) return { n: v.n, ok: false, error: String(e) }
    }
    await new Promise(r => setTimeout(r, 1500))
  }
}
const results = []
const queue = [...variants]
await Promise.all(Array.from({ length: 12 }, async () => { while (queue.length) results.push(await check(queue.shift())) }))
const bad = results.filter(r => !r.ok).sort((a, b) => a.n - b.n)
console.log(JSON.stringify({ verified: results.length - bad.length, of: results.length, bad: bad.slice(0, 20) }))
process.exit(bad.length ? 1 : 0)
