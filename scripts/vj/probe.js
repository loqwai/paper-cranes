// probe — one before/after reading of a running visual, for A/B-ing a shader or controller edit.
// Needs ?vj=1 (it reads window.__vjMeter). Load it in the page, then call it:
//
//   await import('/scripts/vj/probe.js'); await window.__vjProbe(40)
//   node scripts/vj/show.js eval "async () => { await import('/scripts/vj/probe.js'); return window.__vjProbe(40) }"
//
// Studio only: never on the show page (only the VJ MCP touches it; get_state carries the meter).
//
// For a hot line input without one, play a file through the analyser at gain:
//   jam.html?shader=…&controller=…&wavelet=true&vj=1&audio_file=/test-audio/x.mp3&audio_gain=12&smoothing=0.15
// (smoothing=0.15 matches the mic path; the file path defaults to 0.85)
//
// It waits `secs` (default 40: one 30 s meter window plus slack), and meanwhile takes structure
// snapshots so it can say whether the GEOMETRY moved, not just the light:
//   structure2s / structure10s   mean |Δ| between brightness-normalised 64×36 frames (each frame
//                                minus its mean, over its SD), 2 s and 10 s apart. Colour and
//                                global brightness changes cancel; a still shape reads ≈ 0.05-0.1
//                                (noise, twinkle), a drifting one 0.3+.
//   csDelta2s / csDelta10s       change of every cs_* navigation output over the same spans
// plus __vjMeter.summary(30), residR(30) and shiver(30) at the end, and energy over the window.

const NAV = ['cs_cx', 'cs_cy', 'cs_lz', 'cs_rot', 'cs_navA', 'cs_navB', 'cs_curl', 'cs_jump']
const sleep = ms => new Promise(r => setTimeout(r, ms))

const frame = () => {
  const cv = document.querySelector('canvas'), W = 64, H = 36
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const cx = c.getContext('2d', { willReadFrequently: true })
  cx.drawImage(cv, 0, 0, W, H)
  const d = cx.getImageData(0, 0, W, H).data
  const L = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) L[i] = 0.2126 * d[i * 4] / 255 + 0.7152 * d[i * 4 + 1] / 255 + 0.0722 * d[i * 4 + 2] / 255
  const m = L.reduce((a, b) => a + b, 0) / L.length
  const sd = Math.sqrt(L.reduce((a, b) => a + (b - m) ** 2, 0) / L.length) || 1e-6
  return L.map(v => (v - m) / sd)
}
const fdiff = (a, b) => +(a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length).toFixed(3)
const nav = () => {
  const f = window.cranes?.flattenFeatures?.() ?? {}
  return Object.fromEntries(NAV.map(k => [k, f[k] ?? null]))
}
const delta = (a, b) => Object.fromEntries(NAV.map(k => [k, +((b[k] ?? 0) - (a[k] ?? 0)).toFixed(4)]))
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1)

window.__vjProbe = async (secs = 40) => {
  const M = window.__vjMeter
  if (!M) return { err: 'no __vjMeter: load the page with ?vj=1' }
  const t0 = performance.now()
  const s2 = [], s10 = [], n2 = [], n10 = [], energy = []
  const snaps = []
  while ((performance.now() - t0) / 1000 < secs) {
    snaps.push({ t: (performance.now() - t0) / 1000, fr: frame(), nav: nav() })
    energy.push(window.cranes?.flattenFeatures?.().energy ?? 0)
    await sleep(1000)
  }
  for (let i = 0; i < snaps.length; i++) {
    const j2 = snaps.findIndex(s => s.t >= snaps[i].t + 2), j10 = snaps.findIndex(s => s.t >= snaps[i].t + 10)
    if (j2 > 0) { s2.push(fdiff(snaps[i].fr, snaps[j2].fr)); n2.push(delta(snaps[i].nav, snaps[j2].nav)) }
    if (j10 > 0) { s10.push(fdiff(snaps[i].fr, snaps[j10].fr)); n10.push(delta(snaps[i].nav, snaps[j10].nav)) }
  }
  const absMean = rows => Object.fromEntries(NAV.map(k => [k, +mean(rows.map(r => Math.abs(r[k]))).toFixed(4)]))
  return {
    summary: M.summary(30), residR: M.residR(30), shiver: M.shiver?.(30),
    structure2s: { mean: +mean(s2).toFixed(3), min: Math.min(...s2) },
    structure10s: { mean: +mean(s10).toFixed(3), min: Math.min(...s10) },
    csDelta2s: absMean(n2), csDelta10s: absMean(n10),
    energy: { mean: +mean(energy).toFixed(3), max: +Math.max(...energy).toFixed(3) },
    navEnd: nav(),
  }
}
