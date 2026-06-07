// moire-eye controller — MONOTONIC motion engine (iris-7 philosophy).
// GLSL can't accumulate across frames, so we hold the forward-advancing PHASES here.
// Rule: phases only ever increase; audio modulates their RATE, never their value —
// so the eye evolves smoothly forward and NEVER snaps/flashes. The only direct-amplitude
// reactions exposed are bass (smoothed) and a gentle drop swell (decays slowly).
//
// knob_13 tunes the drop decay length.

let spin = 0   // eye/tunnel rotation phase (monotonic)
let flow = 0   // moiré ripple flow phase (monotonic)
let hue  = 0   // palette drift phase (monotonic)
let bassEnv = 0 // smoothed bass level (allowed reactive amplitude)
let drop = 0    // gentle drop swell: rises on a big energy lift, decays slowly (no strobe)
let calm = 0    // smoothed quietness (breakdown)

export default (f) => {
  const bn = f.bassNormalized ?? 0
  const en = f.energyNormalized ?? 0
  const fx = Math.max(0, f.spectralFluxNormalized ?? 0)
  const ez = f.energyZScore ?? 0

  // MONOTONIC PHASES — always forward, audio only speeds them up. No oscillation, no snap.
  // SPEED DIALS (flash-free): knob_3 spin, knob_4 flow, knob_5 hue. 0 = frozen, 0.5 = default, 1 = 2x.
  const spinK = (f.knob_47 ?? 0.5) * 2.0   // knob_47 = SPIN speed (user-linked; 0 = frozen)
  const flowK = (f.knob_4 ?? 0.5) * 2.0    // knob_4 = flow speed
  const hueK  = (f.knob_5 ?? 0.5) * 2.5    // knob_5 = hue-drift speed
  spin += (0.0005 + bn * 0.0016) * spinK            // rotation (much slower); knob_47, 0 = frozen
  flow += (0.0010 + en * 0.0032 + fx * 0.0016) * flowK  // ripple flow (much slower); knob_4 speed
  hue  += (0.0006 + en * 0.0014) * hueK             // very slow palette drift; knob_5 speed

  // BASS — smoothed envelope (the one allowed direct-amplitude reaction). Smooth, not flashy.
  bassEnv += (bn - bassEnv) * 0.22

  // DROP — swell on a large sustained energy lift, slow exponential decay. One swell per drop,
  // reads as a breath not a strobe. knob_13 lengthens the tail.
  const decay = 0.955 + (f.knob_13 ?? 0.5) * 0.035   // ~0.955..0.990 per frame
  const target = ez > 0.5 ? Math.min(ez, 1.0) : 0.0
  drop = Math.max(target, drop * decay)

  // CALM — smoothed quietness for breakdown muting.
  calm += ((1 - Math.min(1, en * 1.6)) - calm) * 0.04

  return {
    spin_phase: spin,
    flow_phase: flow,
    hue_phase: hue,
    bass_env: bassEnv,
    drop_env: drop,
    calm_env: calm,
  }
}
