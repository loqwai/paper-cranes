// Pure VJ decision rules for scripts/remote/vj-tick.js. No I/O here: every input is passed in, so
// scripts/remote/vj-rules.test.js can pin each rule.
//
// decide(obs, cfg)        -> one verdict from a FIXED menu, first matching rule wins
// checkAct(req, ctx)      -> { ok, why } guardrail check before a change is applied
// parseRequest(text, ...) -> map a person's chat line onto the same fixed menu (or 'unknown')
//
// cfg = { knownGood, profiles, limits } is always passed in (vj-config.js defaultConfig()), one per
// display: nothing in this module is shared state.
//
// The menu (verdict.action):
//   none          nothing to do
//   nudge         move one allowed knob by one small step        args: { knob, value }
//   gain          change the input gain                          args: { value }
//   release_time  a frozen `time` param is holding the clocks     args: {}
//   swap          hot-swap to a known-good shader (no reload)    args: { shader, controller }
//   reload        reload the page: ONLY when the frame counter is frozen
//   tell_aaron    something only a human at the device can fix  args: { message }

export const ACTIONS = ['none', 'nudge', 'gain', 'release_time', 'swap', 'reload', 'tell_aaron']

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const round = (v, d = 3) => +v.toFixed(d)

// The controller profile for this page, or null when the loop has no knob map for it.
export const profileFor = (status, profiles) => {
  for (const c of status?.controllers ?? []) if (profiles[c]) return { name: c, ...profiles[c] }
  return null
}

// Frozen = the tab is visible and the frame counter did not advance between two samples.
export const isFrozen = (a, b) =>
  a?.visibility === 'visible' && num(a?.frameCount) !== null && num(b?.frameCount) !== null && b.frameCount === a.frameCount

const hasParam = (href, key, value) => {
  try { return new URL(href).searchParams.get(key) === value } catch { return false }
}

// The known-good entry to swap to: same controller as the page first, never the shader on screen.
export const swapTarget = (status, knownGood) => {
  const ctl = status?.controllers ?? []
  const others = knownGood.filter((k) => k.shader !== status?.shader)
  return others.find((k) => ctl.includes(k.controller)) ?? others[0] ?? null
}

// A flat view of what the rules read. obs = { connected, error, status, statusEnd, features, history }
export const summarize = (obs) => {
  const a = obs.features?.audio ?? {}
  const c = obs.features?.controller ?? {}
  const m = obs.features?.meter ?? null
  return {
    energy: num(a.energy) ?? num(obs.status?.audio?.energy),
    energyZ: num(a.energyZScore),
    bassZ: num(a.bassZScore),
    presence: num(c.cs_presence),
    drop: num(c.cs_drop),
    kick: num(c.cs_kick),
    punch: num(c.cs_punch),
    gain: num(obs.status?.audio?.gain),
    knobs: obs.features?.knobs ?? {},
    meter: m && num(m.n) >= 5 ? m : null,
  }
}

const verdict = (action, rule, reason, args = {}) => ({ action, rule, reason, args })

// One verdict from the fixed menu. obs.request = { text, t } is a person's latest chat line, if any.
export const decide = (obs, cfg) => {
  const L = cfg.limits
  const knownGood = cfg.knownGood
  const st = obs.status
  if (!obs.connected || !st) {
    return verdict('tell_aaron', 'disconnected', obs.error ?? 'no reply from the page',
      { message: 'The visual is not connected to me. Open the cranes-local link on the device and keep the tab in front.' })
  }
  if (st.visibility && st.visibility !== 'visible') {
    return verdict('tell_aaron', 'hidden', `tab visibility is ${st.visibility}`,
      { message: 'The visual tab is in the background or the screen is off. Bring it to the front.' })
  }
  if (isFrozen(st, obs.statusEnd)) {
    return verdict('reload', 'frozen', `frameCount stuck at ${st.frameCount} while visible`)
  }
  const audio = st.audio ?? {}
  if (audio.state === 'suspended') {
    return verdict('tell_aaron', 'audio-suspended', 'AudioContext suspended (autoplay policy)',
      { message: 'Audio is paused by the browser. Tap the visual once.' })
  }
  if (st.shaderError) {
    const t = swapTarget(st, knownGood)
    if (t) return verdict('swap', 'shader-error', `shader error: ${String(st.shaderError).slice(0, 120)}`, { shader: t.shader, controller: t.controller })
  }
  if (num(st.manual?.time) !== null) {
    return verdict('release_time', 'time-held', `time is held at ${st.manual.time}: the clocks are frozen`)
  }
  if (!audio.running) {
    return verdict('tell_aaron', 'no-audio', `audio state ${audio.state ?? 'none'}, energy ${audio.energy ?? 'null'}`,
      { message: 'The visual hears no audio. Check the mic permission or the input.' })
  }

  const prof = profileFor(st, cfg.profiles)
  if (prof?.needsWavelet && !hasParam(st.href, 'wavelet', 'true')) {
    return verdict('tell_aaron', 'no-wavelet', 'page lacks wavelet=true (read at boot; fixing it needs a reload with it)',
      { message: 'The page is missing wavelet=true, so kicks barely show. Reopen 2cb.pw/clit-now when there is a quiet moment.' })
  }

  const s = summarize(obs)
  if (s.energyZ !== null && s.energyZ > L.dropZ) return verdict('none', 'drop-hold', `energyZScore ${round(s.energyZ, 2)} > ${L.dropZ}: hold during the drop`)
  if (s.drop !== null && s.drop > 0.5) return verdict('none', 'drop-hold', `cs_drop ${round(s.drop, 2)}: hold during the drop`)

  // Input level (clit-set presence gate). Gain is the level fix; the shader is never the fix.
  const gain = s.gain ?? 1
  if (prof && s.presence !== null && s.presence < L.presenceLow && s.energy !== null && s.energy > 0 && gain < L.gainMax) {
    return verdict('gain', 'input-quiet', `presence ${round(s.presence, 2)} < ${L.presenceLow} with music: raise gain`, { value: round(Math.min(L.gainMax, gain * L.gainStep), 2) })
  }
  if (s.energy !== null && s.energy > L.energyHot && gain > L.gainMin) {
    return verdict('gain', 'input-hot', `energy ${round(s.energy, 3)} > ${L.energyHot} at gain ${gain}: lower gain`, { value: round(Math.max(L.gainMin, gain / L.gainStep), 2) })
  }

  if (obs.request?.text) {
    const r = parseRequest(obs.request.text, prof, s.knobs, st, cfg)
    return { ...r, request: obs.request.text }
  }

  if (!s.meter) return verdict('none', 'no-meter', 'no meter data: open the page with &vj=1 to enable flicker/clip/motion rules')
  const m = s.meter
  const knob = (k) => num(s.knobs[k]) ?? 0
  const nudge = (k, dir, cap, rule, reason) => verdict('nudge', rule, reason, { knob: k, value: round(Math.max(0, Math.min(cap, knob(k) + dir * L.knobStep)), 2) })

  if (num(m.lumMax) !== null && m.lumMax < L.black) {
    const t = swapTarget(st, knownGood)
    if (t) return verdict('swap', 'black', `lumMax ${m.lumMax} < ${L.black}: screen is black`, { shader: t.shader, controller: t.controller })
  }
  if (num(m.clip) !== null && m.clip > L.clip) {
    if (prof && knob(prof.ember) > 0) return nudge(prof.ember, -1, 1, 'clip', `clip ${m.clip} > ${L.clip}: smaller ember`)
    if (prof && knob(prof.react) > 0) return nudge(prof.react, -1, 1, 'clip', `clip ${m.clip} > ${L.clip}: less REACT`)
    return verdict('none', 'clip-noknob', `clip ${m.clip} > ${L.clip} but no knob left to lower`)
  }
  const recent = [...(obs.history ?? []).slice(-(L.softTicks - 1)).map((h) => h.flicker), m.flicker]
  const sustained = recent.length >= L.softTicks && recent.every((f) => num(f) !== null && f > L.flickerSoft)
  if (num(m.flicker) !== null && (m.flicker >= L.flickerHard || sustained)) {
    const why = m.flicker >= L.flickerHard ? `flicker ${m.flicker} >= ${L.flickerHard}` : `flicker > ${L.flickerSoft} for ${L.softTicks} ticks`
    if (prof && knob(prof.react) > 0) return nudge(prof.react, -1, 1, 'flicker', `${why}: less REACT`)
    if (prof && knob(prof.trails) < L.trailsUpMax) return nudge(prof.trails, +1, L.trailsUpMax, 'flicker', `${why}: more TRAILS to smooth it`)
    return verdict('none', 'flicker-noknob', `${why} but no knob left`)
  }
  if (num(m.motion) !== null && m.motion < L.motionDead && s.energy !== null && s.energy > L.energyAlive) {
    if (prof && knob(prof.react) < L.reactUpMax) return nudge(prof.react, +1, L.reactUpMax, 'still', `motion ${m.motion} < ${L.motionDead} with energy ${round(s.energy, 3)}: more REACT`)
    const t = swapTarget(st, knownGood)
    if (t) return verdict('swap', 'still', `motion ${m.motion} still dead at REACT ${knob(prof?.react ?? '')}: swap`, { shader: t.shader, controller: t.controller })
  }
  return verdict('none', 'healthy', `flicker ${m.flicker}, clip ${m.clip}, motion ${m.motion}, energy ${s.energy}`)
}

// ---------------------------------------------------------------------------------------------
// A chat line from a person watching this display. It can only pick from the same fixed menu, and
// the result still goes through checkAct (rate limit, drop hold, allowed knobs, step size).
// Health rules (frozen, no audio, drop hold, ...) run first and win over any request.
const INTENTS = [
  { intent: 'calmer', re: /\b(less|calm|calmer|chill|softer|slower|too (much|busy|bright)|flash\w*|flicker\w*|strobe)\b/i },
  { intent: 'smoother', re: /\b(trail\w*|smooth\w*|blur\w*|dreamy)\b/i },
  { intent: 'swap', re: /\b(change|swap|switch|different|next|another)\b/i },
  { intent: 'colour', re: /\b(colou?rs?|hue|palette)\b/i },
  { intent: 'wilder', re: /\b(more|crank|crazier|wilder|harder|bigger|reactive|react|punch\w*|hype)\b/i },
]

export const parseRequest = (text, prof, knobs, status, cfg) => {
  const L = cfg.limits
  const hit = INTENTS.find((i) => i.re.test(text))
  const knob = (k) => num(knobs?.[k]) ?? 0
  const step = (k, dir, cap) => round(Math.max(0, Math.min(cap, knob(k) + dir * L.knobStep)), 2)
  const why = `request "${String(text).slice(0, 80)}"`
  if (!hit) return verdict('tell_aaron', 'request-unknown', `${why}: no matching intent`, { message: 'I can do: wilder, calmer, smoother trails, change colour, or change the visual.' })
  if (hit.intent === 'swap') {
    const t = swapTarget(status, cfg.knownGood)
    return t ? verdict('swap', 'request-swap', why, { shader: t.shader, controller: t.controller }) : verdict('none', 'request-noop', `${why}: no other known-good shader`)
  }
  if (!prof) return verdict('none', 'request-noop', `${why}: no knob profile for this controller`)
  if (hit.intent === 'wilder') {
    if (knob(prof.react) >= L.reactUpMax) return verdict('none', 'request-noop', `${why}: REACT already at its cap ${L.reactUpMax}`)
    return verdict('nudge', 'request-wilder', why, { knob: prof.react, value: step(prof.react, +1, L.reactUpMax) })
  }
  if (hit.intent === 'calmer') {
    if (knob(prof.react) > 0) return verdict('nudge', 'request-calmer', why, { knob: prof.react, value: step(prof.react, -1, 1) })
    if (knob(prof.trails) < L.trailsUpMax) return verdict('nudge', 'request-calmer', `${why}: REACT already 0, more TRAILS`, { knob: prof.trails, value: step(prof.trails, +1, L.trailsUpMax) })
    return verdict('none', 'request-noop', `${why}: already as calm as the loop allows`)
  }
  if (hit.intent === 'smoother') {
    if (knob(prof.trails) >= L.trailsUpMax) return verdict('none', 'request-noop', `${why}: TRAILS already at its cap ${L.trailsUpMax}`)
    return verdict('nudge', 'request-smoother', why, { knob: prof.trails, value: step(prof.trails, +1, L.trailsUpMax) })
  }
  // colour: walk HUE up; at the top, walk it down (the reverse-window guard may then hold it)
  if (!prof.hue) return verdict('none', 'request-noop', `${why}: no HUE knob for this controller`)
  return verdict('nudge', 'request-colour', why, { knob: prof.hue, value: knob(prof.hue) >= 1 ? step(prof.hue, -1, 1) : step(prof.hue, +1, 1) })
}

// ---------------------------------------------------------------------------------------------
// Guardrails. req = { action, args, force }. ctx = { now (ms), log (this display's changes,
// oldest first: { t, action, args, before, ok }), obs, cfg }
export const checkAct = (req, ctx) => {
  const L = ctx.cfg.limits
  const knownGood = ctx.cfg.knownGood
  const { action, args = {}, force = false } = req
  const now = ctx.now
  const applied = (ctx.log ?? []).filter((e) => e.ok)
  const last = applied.at(-1)
  const sinceS = (e) => (e ? (now - e.t) / 1000 : Infinity)
  const no = (why) => ({ ok: false, why })
  const st = ctx.obs?.status

  if (!['nudge', 'gain', 'release_time', 'swap', 'reload', 'panic', 'undo'].includes(action)) return no(`unknown action ${action}`)
  if (!st) return no('no status from the page: cannot check guardrails')

  if (action === 'reload') {
    const lastReload = applied.filter((e) => e.action === 'reload').at(-1)
    if (sinceS(lastReload) < L.reloadGapS) return no(`a reload ran ${Math.round(sinceS(lastReload))} s ago; wait ${L.reloadGapS} s between reloads`)
    if (!force && !isFrozen(st, ctx.obs.statusEnd)) return no('refusing reload: the frame counter is advancing (not frozen). Use --force only if Aaron asked for a reload.')
    return { ok: true }
  }
  // Restoring actions: panic, undo and releasing a held clock are never rate limited.
  if (action === 'panic' || action === 'undo' || action === 'release_time') return { ok: true }
  if (sinceS(last) < L.minChangeGapS) return no(`last change was ${Math.round(sinceS(last))} s ago; wait until ${L.minChangeGapS} s have passed`)

  const s = summarize(ctx.obs)
  const inDrop = (s.energyZ !== null && s.energyZ > L.dropZ) || (s.drop !== null && s.drop > 0.5)

  if (action === 'nudge') {
    const prof = profileFor(st, ctx.cfg.profiles)
    const { knob, value } = args
    if (!prof) return no('no knob profile for this controller: nudges are disabled')
    if (prof.geometry.includes(knob)) return no(`${knob} moves geometry: never touched by the loop`)
    if (!prof.allowed.includes(knob)) return no(`${knob} is not in the allowed list ${prof.allowed.join(',')}`)
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return no('value must be a number in 0..1')
    if (inDrop) return no('in a drop: hold')
    const cur = num(s.knobs[knob]) ?? 0
    const step = value - cur
    if (Math.abs(step) > L.maxKnobStep + 1e-9) return no(`step ${round(step, 3)} is larger than ${L.maxKnobStep}`)
    const prev = applied.filter((e) => e.action === 'nudge' && e.args?.knob === knob).at(-1)
    if (prev && sinceS(prev) < L.reverseWindowS) {
      const prevStep = prev.args.value - (prev.before?.value ?? 0)
      if (prevStep * step < 0) return no(`${knob} moved the other way ${Math.round(sinceS(prev))} s ago: no back-and-forth within ${L.reverseWindowS} s`)
    }
    return { ok: true }
  }
  if (action === 'gain') {
    const v = args.value
    if (typeof v !== 'number' || v < L.gainMin || v > L.gainMax) return no(`gain must be in ${L.gainMin}..${L.gainMax}`)
    const cur = s.gain ?? 1
    if (v > cur * L.gainStep + 1e-9 || v < cur / L.gainStep - 1e-9) return no(`gain step ${cur} -> ${v} is larger than x${L.gainStep}`)
    if (inDrop) return no('in a drop: hold')
    return { ok: true }
  }
  if (action === 'swap') {
    if (!knownGood.some((k) => k.shader === args.shader)) return no(`${args.shader} is not in the known-good list: ${knownGood.map((k) => k.shader).join(', ')}`)
    return { ok: true }
  }
  return { ok: true } // release_time
}

// The exact shell command for a verdict (null when there is nothing to run).
export const commandFor = (v, { node = 'node', script, port }) => {
  const pre = `PORT=${port} ${node} ${script} act`
  switch (v.action) {
    case 'nudge': return `${pre} nudge ${v.args.knob} ${v.args.value}`
    case 'gain': return `${pre} gain ${v.args.value}`
    case 'release_time': return `${pre} release-time`
    case 'swap': return `${pre} swap ${v.args.shader}`
    case 'reload': return `${pre} reload`
    default: return null
  }
}
