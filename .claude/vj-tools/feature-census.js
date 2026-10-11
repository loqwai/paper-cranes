#!/usr/bin/env node
// Feature census: sample every numeric feature on the live show page for N seconds (in-browser,
// ~30 Hz) and print one ranked TSV — which features actually move on this music.
// usage: node .claude/vj-tools/feature-census.js [seconds=20] [out.tsv]
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const secs = Number(process.argv[2] ?? 20)
const out = process.argv[3]

const sampler = `async (secs) => {
  const rows = {}
  const t0 = performance.now()
  while (performance.now() - t0 < secs * 1000) {
    const f = window.cranes.flattenFeatures()
    for (const [k, v] of Object.entries(f)) {
      if (typeof v !== "number" || !Number.isFinite(v) || /^knob_|^seed/.test(k)) continue
      ;(rows[k] ??= []).push(v)
    }
    ;(rows.__e ??= []).push(f.energy ?? 0)
    await new Promise(r => setTimeout(r, 33))
  }
  const e = rows.__e; delete rows.__e
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length
  const pct = (s, p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]
  const em = mean(e), es = Math.sqrt(mean(e.map(x => (x - em) ** 2))) || 1e-9
  return Object.entries(rows).map(([k, a]) => {
    const m = mean(a), sd = Math.sqrt(mean(a.map(x => (x - m) ** 2)))
    const s = [...a].sort((x, y) => x - y), p5 = pct(s, 0.05), p95 = pct(s, 0.95), med = pct(s, 0.5)
    const hi = p5 + 0.7 * (p95 - p5), lo = p5 + 0.4 * (p95 - p5)
    let on = 0, armed = true
    for (const x of a) { if (armed && x > hi) { on++; armed = false } else if (x < lo) armed = true }
    const n = Math.min(a.length, e.length)
    const r = sd < 1e-9 ? 0 : a.slice(0, n).reduce((s2, x, i) => s2 + (x - m) * (e[i] - em), 0) / n / (sd * es)
    const live = sd / (Math.abs(med) + sd + 1e-9)
    return [k, sd, p5, p95, on, Math.abs(r), live]
  })
}`

const raw = execFileSync('node', ['scripts/vj/show.js', 'eval', sampler, JSON.stringify([secs])], { encoding: 'utf8', maxBuffer: 1 << 26 })
const rows = JSON.parse(raw).sort((a, b) => b[6] - a[6])
const f = x => (typeof x === 'number' ? +x.toPrecision(4) : x)
const tsv = ['name\tstd\tp5\tp95\tonsets\tabsR_energy\tlive', ...rows.map(r => r.map(f).join('\t'))].join('\n') + '\n'
if (out) writeFileSync(out, tsv)
process.stdout.write(tsv)
