// knob-correlate — "what was the user imitating with that fader?"
//
// The ?vj=1 runtime logs every knob MOVE at 10 Hz with the audio-feature vector at that instant
// (.claude/vj-signals.jsonl, type:"knobtrack"). This segments the log into GESTURES (a run of
// movement ended by >1.5 s of stillness = the user let go), then correlates INSIDE one gesture.
// Correlating across idle time is what makes everything look like r~0.3 mush.
//
//   LEVEL — knob VALUE tracks the feature   → they are riding it like a fader
//   DELTA — knob CHANGE tracks the feature  → they are punching events in it
// Humans react late, so lags 0-1.5 s are scanned and the best is reported.
//
//   node scripts/vj/knob-correlate.js            → last completed gesture
//   node scripts/vj/knob-correlate.js --live     → gesture in progress
import { readFileSync } from 'fs'

const live = process.argv.includes('--live')
// `ms` is performance.now(), which RESETS TO 0 on every page reload — sorting on it alone puts
// post-reload moves BEFORE older ones and makes "the last gesture" the stale pre-reload one.
// Re-anchor each move to the batch's server-stamped wall clock, which is monotonic across reloads.
const rows = []
for (const line of readFileSync('.claude/vj-signals.jsonl', 'utf8').trim().split('\n')) {
  let d; try { d = JSON.parse(line) } catch { continue }
  if (d.type !== 'knobtrack' || !d.moves?.length) continue
  const base = Date.parse(d.t), last = Math.max(...d.moves.map(m => m.ms))
  for (const m of d.moves) rows.push({ ...m, ms: base - (last - m.ms) })
}
rows.sort((a, b) => a.ms - b.ms)
if (!rows.length) { console.log('no knobtrack data yet'); process.exit(0) }

// segment: >1500ms without a move = released
const GAP = 2500, gestures = []   // MUST match RELEASE_MS in watch-release.js — a shorter gap here splits the
                                  // very gesture the detector just reported into fragments and correlates a slice.
let cur = [rows[0]]
for (let i = 1; i < rows.length; i++) {
  if (rows[i].ms - rows[i - 1].ms > GAP) { gestures.push(cur); cur = [] }
  cur.push(rows[i])
}
gestures.push(cur)
const done = gestures.filter(g => g.length >= 15)
if (!done.length) { console.log(`${gestures.length} gesture(s), none with >=15 samples yet`); process.exit(0) }
const backArg = process.argv.find(a => a.startsWith('--back='))
const back = backArg ? +backArg.split('=')[1] : 0
const g = done.at(-1 - back)
if (!g) { console.log(`only ${done.length} gestures`); process.exit(0) }
const dur = (g.at(-1).ms - g[0].ms) / 1000
console.log(`gesture: ${g.length} samples over ${dur.toFixed(1)}s  (${gestures.length} gestures in log)\n`)

const held = {}
const series = g.map(r => { Object.assign(held, r.k); return { k: { ...held }, f: r.f } })
// Both hand and audio are heavily autocorrelated, so the nominal n wildly overstates the
// evidence. Bartlett/Quenouille adjustment: n_eff = n * (1-r1a*r1b)/(1+r1a*r1b), then a t-test.
// Without this a 7 s ramp vs a smooth feature reads r=0.9 on ~5 independent points.
// Remove the linear trend before correlating LEVELS. Without this, a fader swept steadily for a
// minute correlates ~0.6 with every monotonic accumulator in the engine (spinPhase, huePhase,
// paletteShift, mutation...) purely because both increase with time — they all tie at the same r,
// which is the tell. We want the FLUCTUATION the hand is tracing, not the drift.
const detrend = (v) => {
  const n = v.length, mx = (n - 1) / 2
  let my = 0; for (const x of v) my += x; my /= n
  let sxy = 0, sxx = 0
  for (let i = 0; i < n; i++) { const dx = i - mx; sxy += dx * (v[i] - my); sxx += dx * dx }
  const b = sxx ? sxy / sxx : 0
  return v.map((y, i) => y - (my + b * (i - mx)))
}
const ac1 = (v) => { const n = v.length, m = v.reduce((s, x) => s + x, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { const d = v[i] - m; den += d * d; if (i) num += d * (v[i - 1] - m) }
  return den ? num / den : 0 }
const signif = (a, b, r) => {
  const n = Math.min(a.length, b.length)
  const ra = ac1(a), rb = ac1(b)
  const nEff = Math.max(3, n * (1 - ra * rb) / (1 + ra * rb + 1e-9))
  const t = Math.abs(r) * Math.sqrt((nEff - 2) / Math.max(1e-9, 1 - r * r))
  return { nEff: Math.round(nEff), ok: t > 3.0 }   // t>3 ~ p<0.01
}
const corr = (a, b) => {
  const n = Math.min(a.length, b.length); if (n < 12) return 0
  const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y }
  return num / Math.sqrt(da * db + 1e-9)
}
const knobs = [...new Set(g.flatMap(r => Object.keys(r.k)))]
// Mean/Median/Min/Max/StdDev/Slope/Intercept/RSquared are aggregates over a 500-frame history
// window. They drift smoothly, so over a few seconds they correlate ~1.0 with ANY smooth fader
// sweep — pure spurious regression. They are also bad wiring targets (they barely move per
// frame). Correlate only against per-frame channels: raw, Normalized, ZScore, Smooth, Spring.
const SLOW = /(Mean|Median|Min|Max|StandardDeviation|Slope|Intercept|RSquared)$/
const feats = [...new Set(g.flatMap(r => Object.keys(r.f)))].filter(f => !SLOW.test(f))
const LAGS = [0, 2, 4, 6, 8, 10, 12, 15]   // samples @100ms => 0..1.5s

// knobs that move identically are one physical control mapped twice — report once
const sig = {}
for (const kn of knobs) sig[kn] = series.map(s => s.k[kn]).join(',')
const groups = {}
for (const kn of knobs) (groups[sig[kn]] ||= []).push(kn)

for (const [, names] of Object.entries(groups)) {
  const kn = names[0]
  const kv = series.map(s => s.k[kn])
  if (kv.some(v => typeof v !== 'number')) continue
  const spread = Math.max(...kv) - Math.min(...kv)
  const label = names.length > 1 ? `${names.join(' = ')}` : kn
  if (spread < 0.02) { console.log(`${label}: still (spread ${spread.toFixed(3)})\n`); continue }
  const dv = kv.map((v, i) => (i ? v - kv[i - 1] : 0))
  const out = []
  for (const fn of feats) {
    const fv = series.map(s => s.f[fn])
    if (fv.some(v => typeof v !== 'number')) continue
    if (Math.max(...fv) - Math.min(...fv) < 1e-6) continue
    for (const lag of LAGS) {
      const fL = fv.slice(0, fv.length - lag)
      const kL = detrend(kv.slice(lag)), dL = dv.slice(lag), fLd = detrend(fL)
      const rl = corr(kL, fLd), rd = corr(dL, fL)
      out.push({ fn, lag, kind: 'level', r: rl, ...signif(kL, fLd, rl) })
      out.push({ fn, lag, kind: 'delta', r: rd, ...signif(dL, fL, rd) })
    }
  }
  out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  const seen = new Set(), top = []
  for (const o of out) { const key = o.fn + o.kind; if (seen.has(key)) continue; seen.add(key); top.push(o); if (top.length >= 8) break }
  console.log(`${label}   range ${Math.min(...kv).toFixed(2)}-${Math.max(...kv).toFixed(2)}`)
  for (const o of top) console.log(`   ${o.kind.padEnd(5)} r=${o.r >= 0 ? ' ' : ''}${o.r.toFixed(3)}  lag ${(o.lag * 0.1).toFixed(1)}s  n_eff=${String(o.nEff).padStart(4)} ${o.ok ? 'SIG ' : '  . '} ${o.fn}`)
  console.log()
}

// ── BEAT-SYNC ────────────────────────────────────────────────────────────────────────────────
// "Moving to the beat" is not the knob VALUE tracking a feature — it is the knob's MOTION being
// periodic at the beat rate. Level/delta correlation is blind to that: a knob swept perfectly in
// time with the kick correlates ~0 with every feature if its phase is anywhere but locked.
// So: cross-correlate knob SPEED |delta| against the beat impulse train, and compare the knob's
// dominant oscillation period against the measured beat interval.
console.log('── beat-sync ──')
const beats = series.map(s => s.f.beat)
if (beats.some(b => typeof b !== 'number')) {
  console.log('no `beat` in this gesture (logged before the raw-feature upgrade) — re-drive to measure')
} else {
  const onsets = []
  for (let i = 1; i < beats.length; i++) if (beats[i] && !beats[i - 1]) onsets.push(i)
  const iv = onsets.slice(1).map((o, i) => (o - onsets[i]) * 0.1)
  const medIv = iv.length ? iv.sort((a, b) => a - b)[Math.floor(iv.length / 2)] : 0
  console.log(`${onsets.length} beat onsets, median interval ${medIv.toFixed(2)}s (${medIv ? (60 / medIv).toFixed(0) : '?'} BPM)`)
  for (const [, names] of Object.entries(groups)) {
    const kn = names[0], kv = series.map(s => s.k[kn])
    if (kv.some(v => typeof v !== 'number')) continue
    if (Math.max(...kv) - Math.min(...kv) < 0.02) continue
    const spd = kv.map((v, i) => (i ? Math.abs(v - kv[i - 1]) : 0))
    let best = { r: 0, lag: 0 }
    for (let lag = 0; lag <= 15; lag++) {
      const r = corr(spd.slice(lag), beats.slice(0, beats.length - lag))
      if (Math.abs(r) > Math.abs(best.r)) best = { r, lag }
    }
    // dominant period of knob motion, via autocorrelation of speed
    let bestP = { r: 0, p: 0 }
    for (let p = 3; p <= 40; p++) {
      const r = corr(spd.slice(p), spd.slice(0, spd.length - p))
      if (r > bestP.r) bestP = { r, p }
    }
    console.log(`${names.join(' = ')}:  speed-vs-beat r=${best.r.toFixed(3)} @ lag ${(best.lag * 0.1).toFixed(1)}s` +
                `   |   own period ${(bestP.p * 0.1).toFixed(1)}s (autocorr ${bestP.r.toFixed(2)})` +
                `${medIv ? `   ratio to beat ${(bestP.p * 0.1 / medIv).toFixed(2)}×` : ''}`)
  }
}

// ── PERIOD MATCHING ──────────────────────────────────────────────────────────────────────────
// Correlation demands PHASE lock. A human riding a fader in time with the track but drifting a
// beat ahead/behind scores r~0 against every feature while being a perfect tempo imitation.
// So compare DOMINANT PERIODS instead: whichever feature pulses at the same rate as the hand is
// the one being imitated, phase notwithstanding.
console.log('\n── period matching ──')
const domPeriod = (v) => {
  let best = { r: 0, p: 0 }
  for (let p = 3; p <= 30; p++) {          // 0.3s .. 3.0s
    const r = corr(v.slice(p), v.slice(0, v.length - p))
    if (r > best.r) best = { r, p }
  }
  return best
}
const featPeriods = []
for (const fn of feats) {
  const fv = series.map(s => s.f[fn])
  if (fv.some(v => typeof v !== 'number')) continue
  if (Math.max(...fv) - Math.min(...fv) < 1e-6) continue
  const d = domPeriod(fv)
  if (d.r > 0.15) featPeriods.push({ fn, ...d })
}
for (const [, names] of Object.entries(groups)) {
  const kn = names[0], kv = series.map(s => s.k[kn])
  if (kv.some(v => typeof v !== 'number')) continue
  if (Math.max(...kv) - Math.min(...kv) < 0.02) continue
  const spd = kv.map((v, i) => (i ? Math.abs(v - kv[i - 1]) : 0))
  const kp = domPeriod(spd)
  console.log(`${names.join(' = ')}: hand period ${(kp.p * 0.1).toFixed(1)}s (autocorr ${kp.r.toFixed(2)})`)
  const near = featPeriods
    .map(f => ({ ...f, ratio: (f.p / kp.p) }))
    .filter(f => Math.abs(f.ratio - 1) < 0.35 || Math.abs(f.ratio - 2) < 0.35 || Math.abs(f.ratio - 0.5) < 0.2)
    .sort((a, b) => b.r - a.r).slice(0, 8)
  if (!near.length) { console.log('   no feature pulses near this rate'); continue }
  for (const f of near) console.log(`   ${f.fn.padEnd(22)} period ${(f.p * 0.1).toFixed(1)}s  ratio ${f.ratio.toFixed(2)}×  autocorr ${f.r.toFixed(2)}`)
}
