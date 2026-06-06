// dodeca-bloom controller.
//
// PRINCIPLE: evolving states move UNIDIRECTIONALLY — monotonic accumulators whose
// RATE the music sets (forward only, never snap back). Levels use smoothed envelopes.
//
//   spin_angle / morph_phase / flow_phase / hue_phase  — monotonic phases
//   *_env       — slow smoothed band levels (bass/mids/treble/energy/entropy/centroid/flux)
//   bass_pump   — FAST bass envelope for punchy low-end reactivity (bass music)
//   drop_glow   — latched energy/bass spike + decay (knob_6 sustain)
//   pitch_pulse — melodic-jump flash
//
// State persists on window so editing this file (hot-reload) never resets the spin.

const S = (window.__dodecaState = window.__dodecaState || {
  lastT: null, spin: 0, morph: 0, flow: 0, hue: 0,
  bassEnv: 0, midsEnv: 0, trebleEnv: 0, energyEnv: 0, entropyEnv: 0, centroidEnv: 0, fluxEnv: 0,
  bassPump: 0, dropGlow: 0, pitchPulse: 0, prevPC: null,
})

const ema = (p, x, a) => { p = p || 0; return p + ((x ?? 0) - p) * a }   // coalesce: heals undefined/NaN from older persisted state

export default (f) => {
  const now = performance.now() / 1000
  if (S.lastT === null) S.lastT = now
  let dt = now - S.lastT
  S.lastT = now
  if (!(dt > 0) || dt > 0.1) dt = 0.016

  // smoothed level envelopes (slow)
  S.bassEnv     = ema(S.bassEnv,     f.bassNormalized,             0.05)
  S.midsEnv     = ema(S.midsEnv,     f.midsNormalized,             0.05)
  S.trebleEnv   = ema(S.trebleEnv,   f.trebleNormalized,           0.05)
  S.energyEnv   = ema(S.energyEnv,   f.energyNormalized,           0.05)
  S.entropyEnv  = ema(S.entropyEnv,  f.spectralEntropyNormalized,  0.04)
  S.centroidEnv = ema(S.centroidEnv, f.spectralCentroidNormalized, 0.05)
  S.fluxEnv     = ema(S.fluxEnv,     f.spectralFluxNormalized,     0.06)

  // FAST bass envelope — tracks wobbles/pumps without single-frame jitter
  S.bassPump = ema(S.bassPump, f.bassNormalized, 0.28)

  // monotonic accumulators: music sets the RATE
  S.spin  += (0.12 + (f.knob_5 ?? 0.4) * 0.9) * dt
  S.morph += (0.05 + S.energyEnv * 0.45) * dt
  S.flow  += (0.20 + S.entropyEnv * 1.1 + S.centroidEnv * 0.4) * dt
  S.hue   += (0.012 + Math.max(0, f.spectralFluxZScore ?? 0) * 0.05 + S.energyEnv * 0.04) * dt

  // events
  const spike = Math.max(f.energyZScore ?? 0, (f.bassZScore ?? 0) * 0.9)
  const decay = 0.93 + (f.knob_6 ?? 0.5) * 0.06
  S.dropGlow = spike > 0.2 ? Math.max(S.dropGlow, Math.min(spike, 1.0)) : S.dropGlow * decay
  if (S.dropGlow < 0.01) S.dropGlow = 0

  const pc = f.pitchClassNormalized ?? 0
  if (S.prevPC !== null) {
    let d = pc - S.prevPC
    if (d > 0.5) d -= 1.0
    if (d < -0.5) d += 1.0
    if (Math.abs(d) > 0.08 && S.pitchPulse < 0.3) S.pitchPulse = Math.min(Math.abs(d) * 5.0, 1.0)
  }
  S.prevPC = pc
  S.pitchPulse *= 0.88
  if (S.pitchPulse < 0.01) S.pitchPulse = 0

  return {
    spin_angle: S.spin, morph_phase: S.morph, flow_phase: S.flow, hue_phase: S.hue,
    bass_env: S.bassEnv, mids_env: S.midsEnv, treble_env: S.trebleEnv,
    energy_env: S.energyEnv, entropy_env: S.entropyEnv, centroid_env: S.centroidEnv, flux_env: S.fluxEnv,
    bass_pump: S.bassPump, drop_glow: S.dropGlow, pitch_pulse: S.pitchPulse,
  }
}
