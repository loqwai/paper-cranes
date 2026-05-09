// taco-kandi controller — latched beat pulse + smoothed bass for non-twitchy reactivity
//
// User flag iter 55: "Get the beat/zoom thing working more reliably (but don't
// use the 'beat uniform) You might need to use a controller."
//
// The raw `beat` flag is unreliable across tracks. Build a multi-signal kick
// detector here: bassZScore peaks + bassN delta + spectralFluxZScore peaks.
// Three signals OR'd together latch into beat_kick (NEW output) which fires
// far more consistently than the binary beat flag.
//
// Outputs:
//   beat_pulse  — kept for backwards-compat (beat OR strong bassZ spike, ~1s decay)
//   beat_kick   — NEW iter 55: STRONGER multi-signal kick detector. Use this for
//                 beat-driven zoom/effects instead of beat_pulse on its own.
//   bass_smooth — EMA-smoothed bassNormalized, no per-frame jitter
//   drop_glow   — sustained drop signal (build + drop)
//
// Internal state — module-level lets persist across frames.

let beatPulse = 0
let beatKick = 0
let bassSmooth = 0
let bassPrev = 0
let dropGlow = 0

export default (features) => {
  // User rule: NEVER use the `beat` boolean uniform. Even reading it via
  // features.beat is rejected — kick detection is from z-scores only.
  const bassZ = features.bassZScore ?? 0
  const energyZ = features.energyZScore ?? 0
  const fluxZ = features.spectralFluxZScore ?? 0
  const bassN = features.bassNormalized ?? 0
  const bassMedian = features.bassMedian ?? bassN
  const bassSlope = features.bassSlope ?? 0
  const bassR2 = features.bassRSquared ?? 0

  // ---- BEAT PULSE — conservative kick (bassZ-only, exp-decay) ----
  // Triggers on STRONG bass spikes only (bassZ > 0.6). For shaders that want
  // a calm beat indicator without flicker on lighter kicks. Slower decay
  // (~0.92/frame ≈ 0.7s halflife) keeps the pulse held even longer.
  const bassPulseTrigger = Math.max(0, (bassZ - 0.6) * 1.5)
  beatPulse = bassPulseTrigger > 0.15 ? Math.max(beatPulse, Math.min(bassPulseTrigger, 1.0)) : beatPulse * 0.92
  if (beatPulse < 0.01) beatPulse = 0

  // ---- BEAT KICK — z-score multi-signal detector (iter 55, primary) ----
  // OR's three independent kick-indicators so SOMETHING almost always fires
  // on a beat across genres, WITHOUT using the unreliable `beat` flag:
  //   1. bassZScore > 0.3 — bass louder than recent average
  //   2. bassN rising delta > 0.04 — sudden bass attack (frame-to-frame diff)
  //   3. spectralFluxZScore > 0.4 — timbral change (snare/clap)
  // Latch ratchets up, exp-decays at ~0.90/frame (~0.5s visible halflife).
  const bassDelta = Math.max(0, bassN - bassPrev)
  bassPrev = bassN
  const kickFromBassZ     = Math.max(0, (bassZ - 0.3) * 1.5)     // 0..1.05 for bassZ 0.3..1.0
  const kickFromBassDelta = Math.max(0, (bassDelta - 0.04) * 12) // 0..1 for delta 0.04..0.12
  const kickFromFlux      = Math.max(0, (fluxZ - 0.4) * 1.5)     // 0..0.9 for fluxZ 0.4..1.0
  const kickTrigger = Math.max(kickFromBassZ, kickFromBassDelta, kickFromFlux)
  beatKick = kickTrigger > 0.08 ? Math.max(beatKick, Math.min(kickTrigger, 1.0)) : beatKick * 0.90
  if (beatKick < 0.01) beatKick = 0

  // ---- BASS SMOOTH ----
  const target = Math.max(bassN, bassMedian)
  bassSmooth = bassSmooth * 0.85 + target * 0.15

  // ---- DROP GLOW ----
  const slopeConfidence = Math.max(0, bassSlope) * bassR2 * 100
  const spike = Math.max(energyZ, bassZ * 0.7, slopeConfidence)
  dropGlow = spike > 0.15 ? Math.max(dropGlow, Math.min(spike, 1.0)) : dropGlow * 0.96
  if (dropGlow < 0.01) dropGlow = 0

  return {
    beat_pulse: beatPulse,
    beat_kick: beatKick,
    bass_smooth: bassSmooth,
    drop_glow: dropGlow
  }
}
