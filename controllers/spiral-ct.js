// Slow, continuous spiral drift for rezz/spiral-ct.
//
// The shader's own SPIN_SPEED is audio-reactive (spectralFlux), so it stalls on
// quiet passages and lurches on busy ones. GLSL can't hold a scalar across
// frames, so it can't accumulate its own steady base rotation. This controller
// integrates a constant phase every frame — a hypnotic creep that never stops
// or reverses, riding underneath the audio spin.
//
// Output uniform: spiral_drift (radians-equiv phase, ever-increasing)
// Knob: knob_40 tunes speed (0 = barely moving, 1 = brisk). Default ~slow.

let drift = 0
let lastT = null

export default (features) => {
  const now = performance.now() / 1000
  if (lastT === null) lastT = now
  // Clamp dt so a backgrounded tab doesn't snap the spiral forward on refocus.
  const dt = Math.min(now - lastT, 0.1)
  lastT = now

  // Phase units per second. Slow by default; knob_40 scales up to a brisk creep.
  const speed = 0.015 + (features.knob_40 ?? 0.35) * 0.20
  drift += dt * speed

  return { spiral_drift: drift }
}
