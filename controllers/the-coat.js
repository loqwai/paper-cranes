// the-coat controller — sustained drop glow + pitch-change event detector
// drop_glow: sustained value for the shader to shape (decay via knob_13)
// pitch_change: transient 0-1 pulse on pitch-class jumps > ~1 semitone,
//   decays in ~0.5s — "harmony arrived" signal long-flagged in journals

let dropGlow = 0
let pitchChange = 0
let prevPitchClass = null

export default (features) => {
  const spike = Math.max(features.energyZScore ?? 0, (features.bassZScore ?? 0) * 0.7)
  const decay = 0.94 + (features.knob_13 ?? 0.5) * 0.055

  dropGlow = spike > 0.15
    ? Math.max(dropGlow, Math.min(spike, 1.0))
    : dropGlow * decay

  if (dropGlow < 0.01) dropGlow = 0

  const pc = features.pitchClassNormalized ?? 0
  if (prevPitchClass !== null) {
    let d = pc - prevPitchClass
    if (d > 0.5) d -= 1.0
    if (d < -0.5) d += 1.0
    const jump = Math.abs(d)
    if (jump > 0.08 && pitchChange < 0.3) {
      pitchChange = Math.min(jump * 5.0, 1.0)
    }
  }
  prevPitchClass = pc
  pitchChange *= 0.85
  if (pitchChange < 0.01) pitchChange = 0

  return { drop_glow: dropGlow, pitch_change: pitchChange }
}
