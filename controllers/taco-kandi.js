// taco-kandi controller — latched beat pulse + smoothed bass for non-twitchy reactivity
//
// Problem: float(beat) and raw bassZScore make the shader twitch/shiver on every transient.
// Solution: latching values with exponential decay — spikes ratchet UP, then ease down smoothly.
//
// Outputs:
//   beat_pulse  — latches on beat OR significant bass spike, decays over ~1s
//                 used for the smooth zoom/scale instead of float(beat)
//   bass_smooth — smoothed bassNormalized using EMA + median floor, no per-frame jitter
//   drop_glow   — same pattern as the-coat's drop_glow (sustained build/drop)

let beatPulse = 0
let bassSmooth = 0
let dropGlow = 0

export default (features) => {
  const beat = features.beat ? 1 : 0
  const bassZ = features.bassZScore ?? 0
  const energyZ = features.energyZScore ?? 0
  const bassN = features.bassNormalized ?? 0
  const bassMedian = features.bassMedian ?? bassN
  const bassSlope = features.bassSlope ?? 0
  const bassR2 = features.bassRSquared ?? 0

  // ---- BEAT PULSE — latch on beat OR big bass spike, decay smoothly ----
  // Trigger conditions: real beat flag OR a strong bass z-score (>0.6)
  const trigger = Math.max(beat, Math.max(0, (bassZ - 0.6) * 1.5))
  // Latch: ratchet up if trigger exceeds current value
  beatPulse = trigger > 0.15 ? Math.max(beatPulse, Math.min(trigger, 1.0)) : beatPulse * 0.92
  if (beatPulse < 0.01) beatPulse = 0

  // ---- BASS SMOOTH — EMA filter eliminates per-frame jitter ----
  // Use median as the slow floor, blend toward current bassNormalized at low rate
  const target = Math.max(bassN, bassMedian)
  bassSmooth = bassSmooth * 0.85 + target * 0.15

  // ---- DROP GLOW — sustained drop signal (from the-coat pattern) ----
  // Combines energy-Z, bass-Z, and confident bass slope (rising bass = drop incoming)
  const slopeConfidence = Math.max(0, bassSlope) * bassR2 * 100
  const spike = Math.max(energyZ, bassZ * 0.7, slopeConfidence)
  dropGlow = spike > 0.15 ? Math.max(dropGlow, Math.min(spike, 1.0)) : dropGlow * 0.96
  if (dropGlow < 0.01) dropGlow = 0

  return {
    beat_pulse: beatPulse,
    bass_smooth: bassSmooth,
    drop_glow: dropGlow
  }
}
