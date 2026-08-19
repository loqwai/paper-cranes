// Aesthetic meter for /vibej — paste into the display tab (or `await import`) to sample the WebGL
// canvas at 10 Hz and summarise motion / flicker / dark floor / clipping / hue drift, correlated
// against live audio features. Written live 2026-08-18 (lattice-vj/2 exploration run).
//
//   window.__vjMeter.summary(60)  → last 60 s
//
// Metrics (all on a 64×36 downsample, luminance = Rec.709):
//   lum        mean luminance 0..1              (0.25–0.45 reads well on a projector)
//   dark       fraction of pixels with L < 0.08  (want > 0.10: a real dark floor)
//   clip       fraction with L > 0.92 or any channel > 0.98 (want ≈ 0)
//   sat        mean HSV saturation
//   motion     mean |ΔL| between consecutive samples (100 ms apart)
//   flicker    mean |2nd difference of motion| / mean motion — high = jittery alternation, low = smooth
//   motionVsEnergy / motionVsBass   Pearson r of motion against raw energy / bassNormalized:
//              > 0.3 = the picture moves WITH the music; ≈ 0 = it moves regardless
//   hueDriftPerMin  circular-mean hue drift, turns/min (user asked ≤ ~0.03)
//   hueConc    hue concentration 0..1 (1 = monochrome field, 0 = every hue at once)
(() => {
  if (window.__vjMeter) clearInterval(window.__vjMeter.timer)
  const cv = document.querySelector('canvas')
  const W = 64, H = 36
  const c2 = document.createElement('canvas'); c2.width = W; c2.height = H
  const cx = c2.getContext('2d', { willReadFrequently: true })
  const M = window.__vjMeter = { buf: [], prev: null, timer: null, W, H }
  const rgb2h = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 1e-6) return null; let h; if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; return (h / 6 + 1) % 1 }
  M.sample = () => {
    try {
      cx.drawImage(cv, 0, 0, W, H); const d = cx.getImageData(0, 0, W, H).data; const n = W * H
      let lum = 0, dark = 0, clip = 0, diff = 0, hx = 0, hy = 0, hn = 0, sat = 0
      const cur = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b; cur[i] = l; lum += l
        if (l < 0.08) dark++; if (l > 0.92 || r > 0.98 || g > 0.98 || b > 0.98) clip++
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b); sat += mx > 0 ? (mx - mn) / mx : 0
        const h = rgb2h(r, g, b); if (h !== null && mx - mn > 0.15) { hx += Math.cos(h * 6.283); hy += Math.sin(h * 6.283); hn++ }
        if (M.prev) diff += Math.abs(l - M.prev[i])
      }
      const f = window.cranes?.flattenFeatures?.() ?? {}
      M.buf.push({ t: performance.now() / 1000, lum: lum / n, dark: dark / n, clip: clip / n, sat: sat / n, motion: M.prev ? diff / n : 0, hue: hn ? (Math.atan2(hy, hx) / 6.283 + 1) % 1 : null, hueConc: hn ? Math.hypot(hx, hy) / hn : 0, energy: f.energy ?? 0, bass: f.bassNormalized ?? 0, kick: f.wavelet_bassHit ?? 0, gate: f.quietGate ?? 0 })
      M.prev = cur; if (M.buf.length > 900) M.buf.shift()
    } catch (e) { M.err = String(e) }
  }
  M.summary = (secs = 60) => {
    const now = performance.now() / 1000; const b = M.buf.filter(s => now - s.t <= secs).slice(1)
    if (b.length < 5) return { n: b.length }
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length; const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))) }
    const corr = (a, c) => { const ma = mean(a), mc = mean(c); return mean(a.map((x, i) => (x - ma) * (c[i] - mc))) / ((sd(a) * sd(c)) || 1e-9) }
    const mo = b.map(s => s.motion), en = b.map(s => s.energy), ba = b.map(s => s.bass)
    let fl = 0; for (let i = 2; i < mo.length; i++) fl += Math.abs(mo[i] - 2 * mo[i - 1] + mo[i - 2]); fl /= (mo.length - 2) || 1
    const hs = b.map(s => s.hue).filter(h => h !== null); let drift = 0; for (let i = 1; i < hs.length; i++) { let d = hs[i] - hs[i - 1]; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; drift += d }
    const dur = b[b.length - 1].t - b[0].t
    return { n: b.length, secs: +dur.toFixed(1), lum: +mean(b.map(s => s.lum)).toFixed(3), dark: +mean(b.map(s => s.dark)).toFixed(3), clip: +mean(b.map(s => s.clip)).toFixed(3), sat: +mean(b.map(s => s.sat)).toFixed(3), motion: +mean(mo).toFixed(4), motionSd: +sd(mo).toFixed(4), flicker: +(fl / (mean(mo) || 1e-9)).toFixed(2), motionVsEnergy: +corr(mo, en).toFixed(2), motionVsBass: +corr(mo, ba).toFixed(2), hue: +(hs.at(-1) ?? 0).toFixed(2), hueDriftPerMin: +(drift / dur * 60).toFixed(3), hueConc: +mean(b.map(s => s.hueConc)).toFixed(2), energy: +mean(en).toFixed(3), gate: +mean(b.map(s => s.gate)).toFixed(2) }
  }
  M.hueHist = () => { const cv2 = document.querySelector('canvas'); const c3 = document.createElement('canvas'); c3.width = W; c3.height = H; const cx3 = c3.getContext('2d'); cx3.drawImage(cv2, 0, 0, W, H); const d = cx3.getImageData(0, 0, W, H).data; const bins = new Array(12).fill(0); let tot = 0; for (let i = 0; i < W * H; i++) { const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn; if (dd < 0.15) continue; let h; if (mx === r) h = ((g - b) / dd) % 6; else if (mx === g) h = (b - r) / dd + 2; else h = (r - g) / dd + 4; h = (h / 6 + 1) % 1; bins[Math.floor(h * 12) % 12] += dd; tot += dd } const n = bins.map(x => +(x / (tot || 1)).toFixed(2)); const order = n.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]); return { bins: n, modes: order.slice(0, 3).map(([v, i]) => ({ hue: +(i / 12).toFixed(2), w: v })), spread: n.filter(x => x > 0.05).length } }
  // onset gain: mean motion 0-300ms AFTER each bass hit vs 100-200ms before. >1.3 = kicks visible.
  // Caveat: collapses on wobble bass (hits > ~1.2/s -> windows overlap, gain -> 1).
  M.onsetResponse = (secs = 60) => { const now = performance.now() / 1000; const b = M.buf.filter(s => now - s.t <= secs); if (b.length < 20) return null; const mo = b.map(s => s.motion); const base = mo.reduce((a, c) => a + c, 0) / mo.length; let hits = 0, post = 0, postN = 0, pre = 0, preN = 0; for (let i = 2; i < b.length - 3; i++) { if (b[i].kick > 0.5 && b[i - 1].kick <= 0.5) { hits++; for (let k = 0; k < 3; k++) { post += mo[i + k]; postN++ } for (let k = 1; k <= 2; k++) { pre += mo[i - k]; preN++ } } } return { hits, base: +base.toFixed(4), postKick: +(post / (postN || 1)).toFixed(4), preKick: +(pre / (preN || 1)).toFixed(4), gain: +((post / (postN || 1)) / (pre / (preN || 1) || 1e-9)).toFixed(2) } }
  // flicker excluding kick windows -- "twitchy" without counting musical punches
  M.offKickFlicker = (secs = 60) => { const now = performance.now() / 1000; const b = M.buf.filter(s => now - s.t <= secs); const mask = b.map(s => s.kick > 0.5); for (let i = 0; i < b.length; i++) { if (b[i].kick > 0.5) { for (let k = 1; k <= 4; k++) if (i + k < b.length) mask[i + k] = true } } const mo = []; for (let i = 0; i < b.length; i++) if (!mask[i]) mo.push(b[i].motion); if (mo.length < 10) return null; const mean = mo.reduce((a, c) => a + c, 0) / mo.length; let fl = 0, n = 0; for (let i = 2; i < mo.length; i++) { fl += Math.abs(mo[i] - 2 * mo[i - 1] + mo[i - 2]); n++ } return { offKickSamples: mo.length, motionOff: +mean.toFixed(4), flickerOff: +((fl / n) / (mean || 1e-9)).toFixed(2) } }
  const baseSummary = M.summary
  M.summary = (secs = 60) => { const r = baseSummary(secs); const now = performance.now() / 1000; const b = M.buf.filter(s => now - s.t <= secs); if (b.length) { r.lumMin = +Math.min(...b.map(s => s.lum)).toFixed(3); r.lumMax = +Math.max(...b.map(s => s.lum)).toFixed(3) } return r }
  M.timer = setInterval(M.sample, 100)
  return 'meter installed'
})()
