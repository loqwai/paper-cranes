// scripts/vj/learn-correlate.js — FETCHED BY URL at runtime (like aesthetic-meter.js); do not move.
// Installs window.__vjLearn(samples) → ranked guesses of which audio feature each moved knob was
// imitating, over a CONFIRMED gesture window (see runtime.js §7b — the vjpad LEARN button).
// Implements the 2026-08-19 measurement lessons (journal lattice-vj-6, "each cost a wrong answer"):
//   1. correlate INSIDE the confirmed gesture window only — across idle time everything is r~0.3 mush
//   2. linearly DETREND both series — a steady sweep tracks every monotonic accumulator (8-way r=0.605 tie)
//   3. Bartlett effective-N + |t| > 3 — a slow fader vs any smooth feature is ~3 independent points
//   4. history aggregates excluded outright (Mean/Median/Min/Max/StdDev/Slope/Intercept/RSquared drift
//      smoothly, spuriously match any sweep, and are poor wiring targets anyway)
//   5. hands run behind the ear — try lags 0..2 s
window.__vjLearn = (samples) => {
  if (!samples || samples.length < 30) return { ok: false, why: `too few samples (${samples?.length || 0}) — ride the fader a few seconds longer before LEARN` }
  const EXCL = /(Mean|Median|Min|Max|StandardDeviation|Slope|Intercept|RSquared)$/
  const series = (get) => {
    const o = {}
    samples.forEach((s, i) => { const src = get(s); for (const n in src) { (o[n] = o[n] || new Array(samples.length).fill(null))[i] = src[n] } })
    return o
  }
  // Keys come and go mid-window (pinning a pad ADDS a param, RELEASE deletes it), so a raw
  // series has null gaps that would disqualify every real gesture. Forward/back-fill: an absent
  // knob wasn't moving, which for correlation is the same as holding its last value.
  const fill = a => {
    let last = null
    for (let i = 0; i < a.length; i++) { if (a[i] == null) a[i] = last; else last = a[i] }
    let next = null
    for (let i = a.length - 1; i >= 0; i--) { if (a[i] == null) a[i] = next; else next = a[i] }
    return a
  }
  const knobs = series(s => s.k)
  const feats = series(s => s.f)
  for (const n in knobs) fill(knobs[n])
  for (const n in feats) { if (EXCL.test(n)) { delete feats[n]; continue } fill(feats[n]) }
  const clean = a => a.every(v => typeof v === 'number' && isFinite(v))
  const detrend = a => {
    const n = a.length; let sx = 0, sy = 0, sxx = 0, sxy = 0
    for (let i = 0; i < n; i++) { sx += i; sy += a[i]; sxx += i * i; sxy += i * a[i] }
    const d = n * sxx - sx * sx || 1e-9
    const b = (n * sxy - sx * sy) / d, c = (sy - b * sx) / n
    return a.map((y, i) => y - (b * i + c))
  }
  const ac1 = x => {
    let m = 0; for (const v of x) m += v; m /= x.length
    let num = 0, den = 0
    for (let i = 0; i < x.length; i++) { const d0 = x[i] - m; den += d0 * d0; if (i) num += d0 * (x[i - 1] - m) }
    return den < 1e-12 ? 0 : num / den
  }
  const corr = (a, b) => {
    const n = a.length
    let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i] } ma /= n; mb /= n
    let sab = 0, saa = 0, sbb = 0
    for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db }
    if (saa < 1e-12 || sbb < 1e-12) return null
    const r = sab / Math.sqrt(saa * sbb)
    const r1 = Math.max(-0.98, Math.min(0.98, ac1(a) * ac1(b)))
    const neff = Math.max(4, n * (1 - r1) / (1 + r1))
    const t = Math.abs(r) * Math.sqrt(Math.max(0, neff - 2) / Math.max(1e-9, 1 - r * r))
    return { r: +r.toFixed(3), neff: +neff.toFixed(1), t: +t.toFixed(2) }
  }
  const out = []
  for (const kn in knobs) {
    const tr = knobs[kn]
    if (!clean(tr)) continue
    const range = Math.max(...tr) - Math.min(...tr)
    if (range < 0.05) continue           // parked faders are not gestures
    const kd = detrend(tr)
    const hits = []
    for (const fn in feats) {
      const fa = feats[fn]
      if (!clean(fa)) continue
      const fd = detrend(fa)
      for (const shift of [0, 5, 10, 15, 20]) {         // 100 ms grid → lag 0/0.5/1/1.5/2 s
        if (kd.length - shift < 20) continue
        const c = corr(kd.slice(shift), fd.slice(0, fd.length - shift))
        if (c && c.t > 3 && Math.abs(c.r) > 0.4) hits.push({ feature: fn, lag: shift / 10, ...c })
      }
    }
    // keep each feature's best lag only, then rank
    const best = {}
    for (const h of hits) if (!best[h.feature] || Math.abs(h.r) > Math.abs(best[h.feature].r)) best[h.feature] = h
    const ranked = Object.values(best).sort((x, y) => Math.abs(y.r) - Math.abs(x.r))
    out.push({ knob: kn, range: +range.toFixed(2), n: tr.length, top: ranked.slice(0, 4) })
  }
  out.sort((x, y) => y.range - x.range)
  return { ok: true, knobs: out, secs: +((samples[samples.length - 1].ms - samples[0].ms) / 1000).toFixed(1) }
}
