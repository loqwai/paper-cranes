// the-coat controller — sustained drop glow with exponential decay
// Outputs drop_glow: raw sustained value for the shader to shape
// knob_13 controls decay rate but is read in the controller because
// frame-to-frame state requires JS

let dropGlow = 0

export default (features) => {
  const spike = Math.max(features.energyZScore ?? 0, (features.bassZScore ?? 0) * 0.7)
  const decay = 0.94 + (features.knob_13 ?? 0.5) * 0.055

  dropGlow = spike > 0.15
    ? Math.max(dropGlow, Math.min(spike, 1.0))
    : dropGlow * decay

  if (dropGlow < 0.01) dropGlow = 0

  return { drop_glow: dropGlow }
}
