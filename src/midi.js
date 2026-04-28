import { createMidiMapper } from './midi/MidiMapper.js'

// ============================================================================
// Channel + LED constants
// ----------------------------------------------------------------------------
// MIDI Fighter Twister convention (1-indexed in this file, matching Web MIDI):
//   ch=1  knob rotation in
//   ch=2  button click in / RGB LED out
//   ch=3  ring brightness / animations out
// Other devices (single-channel controllers) auto-assign on whichever channel
// they send and never get LED feedback (output is null for them).
// ============================================================================

const ROTATION_CHANNEL = 1
const BUTTON_CHANNEL = 2
const LED_CHANNEL = 2

const BASE_SENSITIVITY = 0.01
const MODE_TWEEN_MS = 180
const TWISTER_KNOB_COUNT = 16
const VJ_BUMP_KNOB = 16  // long-press fires `cranes:vj-bump`

const isTwisterDevice = (name) => /twister/i.test(name ?? '')

// LED color palette — Twister hue wheel positions (0..127).
// Used by setLedForKnob to mirror knob mode/state visually.
const LED = {
  off: 0,
  blue: 32,        // manual
  cyan: 48,        // treble / spectralRolloff
  green: 64,       // mids
  yellow: 96,      // pitchClass / spectralCentroid
  orange: 108,     // bass
  red: 124,        // energy
  pink: 116,       // spectralFlux
  purple: 112,     // entropy / roughness
  white: 127,      // claude-attention pulse
}

// Map an audio-feature name to a hue byte. Heuristic — first match wins.
const colorForAudioFeature = (feature) => {
  if (!feature) return LED.blue
  const f = feature.toLowerCase()
  if (f.includes('energy')) return LED.red
  if (f.includes('bass')) return LED.orange
  if (f.includes('mid')) return LED.green
  if (f.includes('treble') || f.includes('rolloff')) return LED.cyan
  if (f.includes('flux')) return LED.pink
  if (f.includes('entropy') || f.includes('roughness') || f.includes('crest')) return LED.purple
  if (f.includes('pitch') || f.includes('centroid')) return LED.yellow
  return LED.green
}

// ============================================================================
// State
// ============================================================================

const relativeKnobs = new Set()
const absoluteKnobs = new Set()

// knobIndex (number) -> { device, cc, channel } so we can address its LED
const ledTargets = new Map()

// knobIndex -> { from, to, startedAt, durationMs } for in-flight mode tween
const modeTweens = new Map()
let modeTweenRaf = null

// MIDI output for the active controller (assumes one Twister-class device).
let twisterOutput = null

// Cache of (knob, audioFeature) pairs parsed from the active shader source.
let shaderPairsCache = { source: null, pairs: new Map() }

// Knob events bus — long-press / claude-meta hooks subscribe here.
const knobEvents = new EventTarget()
const buttonHoldTimers = new Map()
const LONG_PRESS_MS = 600

// ============================================================================
// Encoder value handling (unchanged behavior — relative + absolute)
// ============================================================================

const isAbsoluteEncoder = (knob, value) => {
  if (value >= 30 && value <= 100) absoluteKnobs.add(knob)
  return absoluteKnobs.has(knob)
}

const setKnobValue = (knob, value) => {
  if (!window.cranes?.updateFeature) return
  const currentUrl = new URL(window.location)
  const min = parseFloat(currentUrl.searchParams.get(`${knob}.min`) ?? 0)
  const max = parseFloat(currentUrl.searchParams.get(`${knob}.max`) ?? 1)
  const clampedValue = Math.max(min, Math.min(max, value))
  window.cranes.updateFeature(knob, clampedValue)
}

const updateKnobValue = (knob, value) => {
  const currentUrl = new URL(window.location)
  const min = parseFloat(currentUrl.searchParams.get(`${knob}.min`) ?? 0)
  const max = parseFloat(currentUrl.searchParams.get(`${knob}.max`) ?? 1)
  const range = Math.abs(max - min)

  const scaledValue = (value / 127) * range + min
  if (isAbsoluteEncoder(knob, value)) return setKnobValue(knob, scaledValue)

  const currentValue = window.cranes?.manualFeatures?.[knob] ?? min
  const scaledSensitivity = BASE_SENSITIVITY * range

  if (value <= 63) {
    const delta = scaledSensitivity * value
    return setKnobValue(knob, currentValue + delta)
  }
  if (value >= 65) {
    const delta = -(scaledSensitivity * (128 - value))
    return setKnobValue(knob, currentValue + delta)
  }
}

// ============================================================================
// Shader-derived pairings
// ----------------------------------------------------------------------------
// Each tunable in a knobified shader is expected to look like
//     mix(knob_N, FEATURE, knob_N_mode)
// or be tagged at the top of the shader with
//     // @audio_pair: knob_N=FEATURE
// Parsing those gives us per-knob audio-feature mappings without any extra
// runtime registration. Profile-level overrides via setKnobMeta still win.
// ============================================================================

const parseShaderPairs = (source) => {
  if (!source) return new Map()
  if (shaderPairsCache.source === source) return shaderPairsCache.pairs
  const pairs = new Map()
  for (const m of source.matchAll(/\/\/\s*@audio_pair:\s*knob_(\d+)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)/g)) {
    pairs.set(parseInt(m[1], 10), m[2])
  }
  for (const m of source.matchAll(/mix\s*\(\s*knob_(\d+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*knob_(\d+)_mode\s*\)/g)) {
    if (m[1] !== m[3]) continue
    const idx = parseInt(m[1], 10)
    if (!pairs.has(idx)) pairs.set(idx, m[2])
  }
  shaderPairsCache = { source, pairs }
  return pairs
}

const getAudioFeatureForKnob = (knobIndex) => {
  const target = ledTargets.get(knobIndex)
  if (target) {
    const meta = mapper.getKnobMeta(target.device, knobIndex)
    if (meta?.audioFeature) return meta.audioFeature
  }
  return parseShaderPairs(window.cranes?.shader).get(knobIndex) ?? null
}

// ============================================================================
// LED output
// ============================================================================

const sendLed = (cc, color) => {
  if (!twisterOutput) return
  const status = 0xb0 | (LED_CHANNEL - 1)
  const safeColor = Math.max(0, Math.min(127, Math.floor(color)))
  const safeCC = Math.max(0, Math.min(127, Math.floor(cc)))
  twisterOutput.send([status, safeCC, safeColor])
}

const ledCCForKnob = (knobIndex) => {
  const target = ledTargets.get(knobIndex)
  if (target) return target.cc
  // Twister convention: physical CC = knobIndex - 1 (0..15)
  if (knobIndex >= 1 && knobIndex <= TWISTER_KNOB_COUNT) return knobIndex - 1
  return null
}

const setLedForKnob = (knobIndex) => {
  const cc = ledCCForKnob(knobIndex)
  if (cc == null) return
  const knobName = `knob_${knobIndex}`
  const audioFeature = getAudioFeatureForKnob(knobIndex)
  const mode = window.cranes?.manualFeatures?.[`${knobName}_mode`] ?? 1.0

  // mode 0 = manual (blue), mode 1 = audio (feature-coloured), tween between.
  const audioColor = colorForAudioFeature(audioFeature)
  const t = Math.max(0, Math.min(1, mode))
  const color = audioFeature ? Math.round(LED.blue + (audioColor - LED.blue) * t) : LED.blue
  sendLed(cc, color)
}

const refreshAllLeds = () => {
  // Light every shader-paired knob plus everything the user has actually rotated.
  const indices = new Set(ledTargets.keys())
  for (const i of parseShaderPairs(window.cranes?.shader).keys()) indices.add(i)
  for (const i of indices) setLedForKnob(i)
}

// ============================================================================
// Mode tween (smooth crossfade between manual and audio)
// ============================================================================

const stepTweens = () => {
  const now = performance.now()
  let stillRunning = false
  for (const [knobIndex, tween] of modeTweens) {
    const t = Math.min(1, (now - tween.startedAt) / tween.durationMs)
    const value = tween.from + (tween.to - tween.from) * t
    window.cranes.updateFeature(`knob_${knobIndex}_mode`, value)
    setLedForKnob(knobIndex)
    if (t >= 1) modeTweens.delete(knobIndex)
    else stillRunning = true
  }
  if (stillRunning) modeTweenRaf = requestAnimationFrame(stepTweens)
  else modeTweenRaf = null
}

const tweenModeTo = (knobIndex, target) => {
  const knobName = `knob_${knobIndex}`
  const current = window.cranes?.manualFeatures?.[`${knobName}_mode`] ?? 1.0
  modeTweens.set(knobIndex, {
    from: current,
    to: target,
    startedAt: performance.now(),
    durationMs: MODE_TWEEN_MS,
  })
  if (!modeTweenRaf) modeTweenRaf = requestAnimationFrame(stepTweens)
}

const toggleKnobMode = (knobIndex) => {
  const knobName = `knob_${knobIndex}`
  const current = window.cranes?.manualFeatures?.[`${knobName}_mode`] ?? 1.0
  const target = current > 0.5 ? 0.0 : 1.0
  tweenModeTo(knobIndex, target)
  knobEvents.dispatchEvent(new CustomEvent('mode-toggle', {
    detail: { knobIndex, knobName, mode: target },
  }))
}

// ============================================================================
// Initial defaults: audio-on
// ============================================================================

const ensureAudioOnDefault = (knobIndex) => {
  const knobName = `knob_${knobIndex}`
  const modeKey = `${knobName}_mode`
  if (window.cranes?.manualFeatures?.[modeKey] != null) return
  if (!window.cranes?.updateFeature) return
  window.cranes.updateFeature(modeKey, 1.0)
}

// Pre-seed all 16 Twister mode uniforms to 1.0 (audio-on) so untouched knobs
// still drive their paired feature in the shader from the very first frame.
const seedAudioOnDefaults = () => {
  if (!window.cranes?.updateFeature) return
  for (let i = 1; i <= TWISTER_KNOB_COUNT; i++) ensureAudioOnDefault(i)
}

// ============================================================================
// MIDI message dispatch
// ============================================================================

const handleRotation = (deviceName, cc, channel, value) => {
  let knobName = mapper.mapCCToKnob(deviceName, cc, channel)
  if (!knobName) {
    // Twister rig is hardcoded — don't auto-assign on stray CCs (a missed
    // bank shift or a button-channel leak would otherwise shift the layout).
    if (isTwisterDevice(deviceName)) return
    knobName = mapper.autoAssign(deviceName, cc, channel)
  }

  const knobIndex = parseInt(knobName.replace('knob_', ''), 10)
  if (!ledTargets.has(knobIndex)) {
    ledTargets.set(knobIndex, { device: deviceName, cc, channel })
    ensureAudioOnDefault(knobIndex)
    setLedForKnob(knobIndex)
  }
  updateKnobValue(knobName, value)
}

// Lock the Twister's CC→knob mapping to the canonical layout: rotation on ch=1,
// CC N maps to knob_(N+1) for N in 0..15. Pre-populates ledTargets so LEDs
// light up at startup without waiting for a turn. Idempotent — safe to re-run.
const seedTwisterProfile = (deviceName) => {
  const canonical = {}
  for (let cc = 0; cc < TWISTER_KNOB_COUNT; cc++) {
    canonical[mapper.makeCCKey(cc, ROTATION_CHANNEL)] = cc + 1
  }
  mapper.replaceMappings(deviceName, canonical)
  for (let cc = 0; cc < TWISTER_KNOB_COUNT; cc++) {
    const knobIndex = cc + 1
    ledTargets.set(knobIndex, { device: deviceName, cc, channel: ROTATION_CHANNEL })
    ensureAudioOnDefault(knobIndex)
  }
}

const handleButton = (deviceName, cc, value) => {
  // Twister: rotation lives on ch=1 with the same CC.
  const rotationKey = mapper.makeCCKey(cc, ROTATION_CHANNEL)
  const knobIndex = mapper.getKnobIndexByCCKey(deviceName, rotationKey)
  if (knobIndex == null) return // never rotated this knob, ignore the click

  if (value === 127) {
    toggleKnobMode(knobIndex)
    const timer = setTimeout(() => {
      const detail = { knobIndex, knobName: `knob_${knobIndex}` }
      knobEvents.dispatchEvent(new CustomEvent('long-press', { detail }))
      if (knobIndex === VJ_BUMP_KNOB) {
        const at = new Date().toISOString()
        try { localStorage.setItem('cranes-vj-bump', at) } catch {}
        window.dispatchEvent(new CustomEvent('cranes:vj-bump', { detail: { at, ...detail } }))
      }
    }, LONG_PRESS_MS)
    buttonHoldTimers.set(knobIndex, timer)
    return
  }
  if (value === 0) {
    const timer = buttonHoldTimers.get(knobIndex)
    if (timer) clearTimeout(timer)
    buttonHoldTimers.delete(knobIndex)
  }
}

// ============================================================================
// Setup
// ============================================================================

const mapper = createMidiMapper()
window.cranes = window.cranes || {}
window.cranes.midiMapper = mapper

// Direct LED paint — for claude-in-chrome to colour knobs from outside. Pass a
// raw 0..127 hue byte or a palette name from `LED`. `flashLed` paints, then
// reverts to the computed (mode-tracking) colour after `ms`.
const paintLed = (knobIndex, color) => {
  const cc = ledCCForKnob(knobIndex)
  if (cc == null) return false
  sendLed(cc, color)
  return true
}
const paintLedNamed = (knobIndex, name) => {
  if (!(name in LED)) return false
  return paintLed(knobIndex, LED[name])
}
const flashLed = (knobIndex, color, ms = 300) => {
  if (!paintLed(knobIndex, color)) return false
  setTimeout(() => setLedForKnob(knobIndex), ms)
  return true
}

window.cranes.midi = {
  knobEvents,
  setLed: paintLed,
  setLedNamed: paintLedNamed,
  flashLed,
  setLedForKnob,
  refreshAllLeds,
  toggleKnobMode,
  tweenModeTo,
  parseShaderPairs: () => parseShaderPairs(window.cranes?.shader),
  setAudioFeature: (knobIndex, feature) => {
    const target = ledTargets.get(knobIndex)
    if (target) mapper.setKnobMeta(target.device, knobIndex, { audioFeature: feature })
    setLedForKnob(knobIndex)
  },
  LED,
  TWISTER_KNOB_COUNT,
}

seedAudioOnDefaults()
// Re-light LEDs whenever the shader source changes (HMR or manual reload).
// Also retries the audio-on seed in case `updateFeature` wasn't available at
// module load (edit.html races midi.js against edit.js).
let lastShaderSource = window.cranes?.shader ?? null
setInterval(() => {
  seedAudioOnDefaults()
  const current = window.cranes?.shader ?? null
  if (current === lastShaderSource) return
  lastShaderSource = current
  refreshAllLeds()
}, 500)

const attachInput = (input) => {
  if (isTwisterDevice(input.name)) seedTwisterProfile(input.name ?? 'Twister')
  input.addEventListener('midimessage', (message) => {
    const [command, control, value] = message.data
    const isCC = (command & 0xf0) === 0xb0
    if (!isCC) return

    const channel = (command & 0x0f) + 1
    const deviceName = input.name || 'Unknown MIDI Device'

    if (mapper.isLearning()) {
      mapper.handleLearnCC(deviceName, control, channel)
      return
    }

    if (channel === BUTTON_CHANNEL) {
      handleButton(deviceName, control, value)
      return
    }
    handleRotation(deviceName, control, channel, value)
  })
}

const attachOutput = (output) => {
  if (!/twister/i.test(output.name ?? '')) return
  twisterOutput = output
  refreshAllLeds()
}

navigator
  .requestMIDIAccess()
  .then((midiAccess) => {
    midiAccess.inputs.forEach(attachInput)
    midiAccess.outputs.forEach(attachOutput)

    midiAccess.addEventListener('statechange', (e) => {
      if (e.port.type === 'input' && e.port.state === 'connected') attachInput(e.port)
      if (e.port.type === 'output' && e.port.state === 'connected') attachOutput(e.port)
    })
  })
  .catch((error) => {
    console.error('MIDI failed to start', error)
  })
