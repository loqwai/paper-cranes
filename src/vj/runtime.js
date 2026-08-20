// VJ runtime — loaded by ?vj=1 (see index.js). Closes the 2026-08-18 journal todo "bake VJ
// tooling into the display page": validator, aesthetic meter and cursor-hide now survive every
// reload because the PAGE installs them at boot, and the page WAKES the vibej loop by POSTing
// signals to /__vj-signal (picked up by a Monitor on .claude/vj-signals.jsonl).
const post = sig => fetch('/__vj-signal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sig) }).catch(() => {})

export const startVjRuntime = async () => {
  // 1. cursor hygiene (live-show rule: a corner-parked hover still shows a pointer)
  if (!document.getElementById('__vj-nocursor')) {
    const st = document.createElement('style')
    st.id = '__vj-nocursor'
    st.textContent = '*{cursor:none !important} #remote-status-indicator{display:none !important}'
    document.head.appendChild(st)
  }
  // 2. GL validator (compile-before-save gate for the loop's atomic edit macro)
  if (typeof window.__vjValidate !== 'function') {
    const { shaderWrapper } = await import('../shader-transformers/shader-wrapper.js')
    const canvas = document.createElement('canvas'); canvas.width = 4; canvas.height = 4
    const gl = canvas.getContext('webgl2')
    window.__vjValidate = src => {
      const sh = gl.createShader(gl.FRAGMENT_SHADER)
      gl.shaderSource(sh, shaderWrapper(src)); gl.compileShader(sh)
      const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS)
      const info = ok ? null : gl.getShaderInfoLog(sh)
      gl.deleteShader(sh)
      return { ok, info }
    }
  }
  // 3. aesthetic meter (5-probe kit + shiver probe; IIFE that installs window.__vjMeter)
  if (!window.__vjMeter) {
    try { eval(await fetch('/scripts/vj/aesthetic-meter.js?t=' + Date.now()).then(r => r.text())) } catch (e) { post({ type: 'error', what: 'meter-install', info: String(e) }) }
    if (window.__vjMeter && !window.__vjMeter.timer) window.__vjMeter.timer = setInterval(window.__vjMeter.sample, 100)
  }
  // 4. boot beacon — a reload can never again go unnoticed (tooling wipes were silent in v1)
  // Report the NON-knob params as a parsed object, not just the href: this shader carries 30
  // knobs in its URL, so any truncation limit that fits a log line hides the flags that actually
  // matter (wavelet, audio, noaudio, controller) behind the knob list.
  {
    const sp = new URLSearchParams(location.search), flags = {}
    for (const [k, v] of sp) if (!k.startsWith('knob_')) flags[k] = v
    post({ type: 'boot', url: location.href.slice(0, 600), flags })
  }
  // 5. watchdog — page-side health alerts, 5 s cadence, per-type cooldown so the file stays small
  const last = {}
  const alert = (type, data) => { const now = Date.now(); if (now - (last[type] || 0) < 30000) return; last[type] = now; post({ type, ...data }) }
  let prevGate = 1
  setInterval(() => {
    const M = window.__vjMeter; if (!M) return
    const s = M.summary(10); if (!s || s.n < 20) return
    if (s.clip > 0.005) alert('clip', { clip: s.clip })
    if (s.flicker > 0.7 && s.motion > 0.005) alert('flicker', { flicker: s.flicker })
    if (s.lumMin < 0.06 && s.gate > 0.9) alert('too-dark', { lumMin: s.lumMin })
    if (M.shiver) { const sh = M.shiver(30); if (sh.shiverScore > 0.45) alert('shiver', { score: sh.shiverScore, breathOsc: sh.breathOsc, dir: sh.zoomDirectionality }) }
    if (prevGate > 0.9 && s.gate <= 0.9) alert('gate-drop', { gate: s.gate })
    if (prevGate <= 0.9 && s.gate > 0.9) alert('gate-clean', { gate: s.gate })
    prevGate = s.gate
  }, 5000)
  // 6. pulse — periodic telemetry, 20 s. The loop cannot always screenshot (a display tab opened
  //    outside the session's Chrome tab group is undrivable), so the page volunteers its numbers:
  //    meter summary + residR, plus the knob vector whenever it CHANGED — which is how the loop
  //    sees which EXPLORE fader the user is actually flying.
  const knobVec = () => {
    const all = { ...window.cranes?.manualFeatures, ...window.cranes?.messageParams }
    return Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith('knob_')).map(([k, v]) => [k, +(+v).toFixed(3)]))
  }
  let prevKnobs = ''
  setInterval(() => {
    const M = window.__vjMeter; if (!M) return
    const s = M.summary(20); if (!s || s.n < 20) return
    const k = knobVec(), ks = JSON.stringify(k)
    const changed = ks !== prevKnobs; prevKnobs = ks
    post({ type: 'pulse', s, r: M.residR ? M.residR(20) : null, knobs: changed ? k : undefined })
  }, 20000)

  // 7. knobtrack — 2 Hz record of every knob MOVE plus what the music was doing at that instant.
  //    This fork's whole job is learning which audio feature the user is hand-tracking with each
  //    EXPLORE fader. That needs gesture-rate sampling (the 20 s pulse smears a fader sweep into a
  //    single number) and a feature vector time-aligned to the move, so the loop can correlate
  //    "they pushed knob_143 up" against "the track got brighter/rougher/louder" after the fact.
  const FEATS = ['energy', 'bass', 'mids', 'treble', 'spectralCentroid', 'spectralSpread', 'spectralSkew', 'spectralKurtosis', 'spectralFlux', 'spectralRolloff', 'spectralRoughness', 'spectralEntropy', 'spectralCrest', 'pitchClass']
  const featSnap = () => {
    const f = window.cranes?.measuredAudioFeatures || {}
    const o = {}
    for (const n of FEATS) {
      const nv = f[n + 'Normalized'], zv = f[n + 'ZScore']
      if (typeof nv === 'number') o[n + 'N'] = +nv.toFixed(3)
      if (typeof zv === 'number') o[n + 'Z'] = +zv.toFixed(3)
    }
    for (const n of ['energy', 'bass', 'mids', 'treble', 'spectralFlux', 'spectralCentroid']) {
      if (typeof f[n] === 'number') o[n] = +f[n].toFixed(3)
    }
    if (f.beat !== undefined) o.beat = f.beat ? 1 : 0
    // wavelet + controller outputs, captured GENERICALLY rather than by a hardcoded name list:
    // the user may well be imitating a CALCULATED channel (wavelet_bassHit, waveletBassSpring,
    // quietGate, melodyFlow) rather than a raw FFT feature, and a name list would silently miss
    // any channel added later.
    for (const src of [window.cranes?.waveletFeatures, window.cranes?.controllerFeatures]) {
      for (const n in src || {}) if (typeof src[n] === 'number' && isFinite(src[n])) o[n] = +src[n].toFixed(3)
    }
    return o
  }
  let lastK = null, moves = []
  setInterval(() => {
    const k = knobVec()
    if (lastK === null) { lastK = k; return }
    const d = {}
    for (const n in k) if (Math.abs(k[n] - (lastK[n] ?? k[n])) > 0.001) d[n] = k[n]
    lastK = k
    if (Object.keys(d).length) moves.push({ ms: +performance.now().toFixed(0), k: d, f: featSnap() })
  }, 100)
  setInterval(() => { if (moves.length) post({ type: 'knobtrack', moves: moves.splice(0, moves.length) }) }, 2000)
}
