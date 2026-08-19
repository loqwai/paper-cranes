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
  post({ type: 'boot', url: location.href.slice(0, 200) })
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
}
