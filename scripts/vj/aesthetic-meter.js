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

// lagCorr(secs): cross-correlation of frame motion vs bass at lags 0..6 samples (0-600ms @10Hz).
// Answers "how LATE is the visual response?" — usable on wobble tracks where onsetResponse() is
// blind (>1.2 hits/s). peakLagMs ≈ spring latency. Insight 2026-08-18 iter 109: 2Hz springs lag
// ~300ms; at 140BPM wobble (430ms/hit) that lands the reaction almost on the NEXT hit — only the
// raw bassHit attack term keeps the visual on-beat. Design rule: kick attacks must come from raw
// onsets, springs are for sustained level only.
window.__vjMeter.lagCorr = (secs=60) => {
  const M = window.__vjMeter, buf = M.buf || M.samples || M._buf;
  if (!buf) return {err:'no buffer'};
  const n = Math.min(buf.length, Math.round(secs*10));
  const rows = buf.slice(-n);
  const mo = rows.map(r=>r.motion), ba = rows.map(r=>r.bass ?? r.energy);
  const corr = (a,b) => { const m=Math.min(a.length,b.length); const am=a.slice(0,m), bm=b.slice(0,m);
    const ma=am.reduce((x,y)=>x+y,0)/m, mb=bm.reduce((x,y)=>x+y,0)/m;
    let num=0,da=0,db=0; for(let i=0;i<m;i++){const x=am[i]-ma,y=bm[i]-mb;num+=x*y;da+=x*x;db+=y*y;}
    return num/Math.sqrt(da*db+1e-9); };
  const out=[];
  for (let lag=0; lag<=6; lag++) out.push(+corr(mo.slice(lag), ba.slice(0, ba.length-lag)).toFixed(3));
  const peak = out.indexOf(Math.max(...out));
  return {lags:out, peakLagMs:peak*100, peakR:out[peak]};
};

// residR(secs): decomposes musicality by TIMESCALE. rRaw = motion×energy (phrase/section
// coupling — sustained relief, level windows). rResid = (motion − 2.1s rolling median)×energy
// (beat-scale coupling only; constant forward drift and slow swells cancel out).
// Finding 2026-08-18 iter 121: lattice-vj/3 scores rRaw 0.41 / rResid −0.10 — strong phrase
// coupling, weak beat coupling. Per-beat response is spatially local (relief) so it barely
// registers in whole-frame motion; that's fine visually but this metric pair names the split.
window.__vjMeter.residR = (secs=60) => {
  const M=window.__vjMeter, buf=M.buf||M.samples||M._buf; if(!buf) return {err:'no buffer'};
  const n=Math.min(buf.length, Math.round(secs*10)); const rows=buf.slice(-n);
  const mo=rows.map(r=>r.motion), en=rows.map(r=>r.energy);
  const med=(a,i,w)=>{const s=a.slice(Math.max(0,i-w),Math.min(a.length,i+w+1)).slice().sort((x,y)=>x-y); return s[Math.floor(s.length/2)];};
  const resid=mo.map((v,i)=>v-med(mo,i,10));
  const corr=(a,b)=>{const m=a.length; const ma=a.reduce((x,y)=>x+y,0)/m, mb=b.reduce((x,y)=>x+y,0)/m;
    let num=0,da=0,db=0; for(let i=0;i<m;i++){const x=a[i]-ma,y=b[i]-mb;num+=x*y;da+=x*x;db+=y*y;}
    return num/Math.sqrt(da*db+1e-9);};
  return {rResid:+corr(resid,en).toFixed(3), rRaw:+corr(mo,en).toFixed(3), n};
};

// ── SHIVER PROBE (designed 2026-08-18 shutdown, after the 'shaking back and forth' saga) ──────────
// Detects OSCILLATION-WITHOUT-PROGRESSION — the thing the user called "shivering" / "sections
// breathing in and out" — and gives it a number so edits can be judged better/worse, not vibes.
//
// Why not pixels: translation and zoom ALSO oscillate every pixel. Shiver is structural, so we
// track three STRUCTURAL scalars per sample and ask each one "do you retrace, or go somewhere?":
//   edge     edge density (fraction of pixels with luma gradient > 0.12) — cell-size breathing
//   rc       radial brightness centroid (log rings around screen center) — sections moving in/out
//   zoomVel  per-step shift aligning consecutive log-radial profiles — signed zoom velocity
//
//   window.__vjMeter.shiver(60) →
//     zoomVel / zoomAbs / zoomDirectionality   net vs total zoom; directionality 1 = one-way
//         ratchet, ~0 = pure in-out breathing. THE ratchet needle.
//     edgeOsc / radialOsc (+ *Period s)        strength of the worst ANTI-PHASE autocorrelation
//         lobe on the detrended series (lags 0.3–8 s → periods up to ~16 s). > 0.35 = clear
//         periodic retracing. Period tells you WHICH oscillator (0.5–2 s = audio-rate spring on
//         geometry; 5–15 s = a shape clock).
//     retraceEdge / retraceRadial              total path ÷ range: a trend ≈ 1–2, k full
//         oscillations ≈ 2k. Catches SLOW rocking the autocorr window misses (use shiver(120+)
//         for ~70 s sweeps).
//     breathOsc, shiverScore, verdict          combined 0–1, gated by motion (still frame = 0).
//         Provisional thresholds: > 0.45 SHIVERING (act) · 0.25–0.45 suspect · < 0.25 fine.
//
// Better/worse over time: compare shiverScore + breathOsc + zoomDirectionality across windows or
// A/B across an edit. CALIBRATE deterministically next session: same track via ?audio_file=, run
// 90 s each on explore-2026-08-18/iter116-musicality-recipe.frag (known breather: standing radius
// 0.17 + audio on fold params) vs 4.frag iter-142 (plateau geometry) — thresholds get set from
// that pair. Same caveats as the rest of the kit: discard gate < 0.9 windows and the first 60 s
// after resume/reload.
;(() => {
  const M = window.__vjMeter; if (!M || M.shiver) return
  const W = M.W, H = M.H, R = 12
  const cv = document.querySelector('canvas')
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const cx = c.getContext('2d', { willReadFrequently: true })
  const cxp = (W - 1) / 2, cyp = (H - 1) / 2, rMax = Math.hypot(cxp, cyp)
  const ring = new Int8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lr = Math.log(Math.max(Math.hypot(x - cxp, y - cyp), 0.8)) / Math.log(rMax)
    ring[y * W + x] = Math.min(R - 1, Math.max(0, Math.floor(lr * R)))
  }
  const base = M.sample.bind(M)
  M.sample = () => {
    base()
    try {
      cx.drawImage(cv, 0, 0, W, H); const d = cx.getImageData(0, 0, W, H).data
      const L = new Float32Array(W * H)
      for (let i = 0; i < W * H; i++) L[i] = 0.2126 * d[i * 4] / 255 + 0.7152 * d[i * 4 + 1] / 255 + 0.0722 * d[i * 4 + 2] / 255
      let edges = 0
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x
        if (Math.abs(L[i + 1] - L[i - 1]) + Math.abs(L[i + W] - L[i - W]) > 0.12) edges++
      }
      const prof = new Float32Array(R), cnt = new Float32Array(R)
      for (let i = 0; i < W * H; i++) { prof[ring[i]] += L[i]; cnt[ring[i]]++ }
      let rc = 0, rw = 0
      for (let k = 0; k < R; k++) { prof[k] = cnt[k] ? prof[k] / cnt[k] : 0; rc += k * prof[k]; rw += prof[k] }
      const s = M.buf[M.buf.length - 1]
      if (s) { s.edge = edges / ((W - 2) * (H - 2)); s.prof = prof; s.rc = rw ? rc / rw : 0 }
    } catch (e) { M.errShiver = String(e) }
  }
  const shiftOf = (a, b) => {   // fractional ring shift of b vs a; + = pattern moved outward (zoom-in)
    const n = a.length
    const cost = sh => { let c = 0, m = 0; for (let k = 2; k < n - 2; k++) { const j = k - sh, j0 = Math.floor(j), f = j - j0; if (j0 < 0 || j0 + 1 >= n) continue; c += Math.abs(a[k] - (b[j0] * (1 - f) + b[j0 + 1] * f)); m++ } return m ? c / m : 1e9 }
    let best = 0, bc = Infinity
    for (let sh = -2; sh <= 2; sh += 0.25) { const cc = cost(sh); if (cc < bc) { bc = cc; best = sh } }
    return best
  }
  M.shiver = (secs = 60) => {
    const now = performance.now() / 1000
    const b = M.buf.filter(s => now - s.t <= secs && s.prof)
    if (b.length < 40) return { n: b.length, note: 'need more samples' }
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length
    const med = (a, i, w) => { const s2 = a.slice(Math.max(0, i - w), Math.min(a.length, i + w + 1)).slice().sort((x, y) => x - y); return s2[Math.floor(s2.length / 2)] }
    const detr = a => a.map((x, i) => x - med(a, i, 15))
    const dt = (b[b.length - 1].t - b[0].t) / (b.length - 1)
    const ac = a => {
      const m = mean(a), c0 = mean(a.map(x => (x - m) ** 2)) || 1e-12
      let worst = 0, worstLag = 0
      const l0 = Math.max(2, Math.round(0.3 / dt)), l1 = Math.min(a.length - 5, Math.round(8 / dt))
      for (let L2 = l0; L2 <= l1; L2++) {
        let c = 0, n = 0; for (let i = 0; i < a.length - L2; i++) { c += (a[i] - m) * (a[i + L2] - m); n++ }
        const r = c / n / c0
        if (r < worst) { worst = r; worstLag = L2 * dt }
      }
      return { osc: +Math.max(0, -worst).toFixed(2), period: +(worstLag * 2).toFixed(1) }
    }
    const retrace = a => { let tv = 0; for (let i = 1; i < a.length; i++) tv += Math.abs(a[i] - a[i - 1]); const s2 = a.slice().sort((x, y) => x - y); const range = (s2[Math.floor(s2.length * 0.95)] - s2[Math.floor(s2.length * 0.05)]) || 1e-9; return +(tv / range).toFixed(1) }
    const e = b.map(s => s.edge), rc = b.map(s => s.rc)
    const v = []; for (let i = 1; i < b.length; i++) v.push(shiftOf(b[i - 1].prof, b[i].prof))
    const de = detr(e), drc = detr(rc)
    const acE = ac(de), acRC = ac(drc)
    const netV = mean(v), absV = mean(v.map(Math.abs))
    const dir = absV > 1e-4 ? Math.abs(netV) / absV : 1
    const breathOsc = Math.max(acE.osc, acRC.osc)
    const mo = mean(b.map(s => s.motion || 0)), moN = Math.min(1, mo / 0.02)
    const score = +(moN * Math.max(breathOsc, (1 - dir) * Math.min(1, absV / 0.05))).toFixed(2)
    return {
      n: b.length, motion: +mo.toFixed(4),
      zoomVel: +netV.toFixed(3), zoomAbs: +absV.toFixed(3), zoomDirectionality: +dir.toFixed(2),
      edgeOsc: acE.osc, edgePeriod: acE.period, radialOsc: acRC.osc, radialPeriod: acRC.period,
      retraceEdge: retrace(de), retraceRadial: retrace(drc),
      breathOsc: +breathOsc.toFixed(2), shiverScore: score,
      verdict: score > 0.45 ? 'SHIVERING' : score > 0.25 ? 'suspect' : 'progressing/still'
    }
  }
})()
