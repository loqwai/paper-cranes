/**
 * blobs controller — MONOTONIC time/motion for shaders/redaphid/wip/blobs/blobs-1.frag
 *
 * The shaky reactivity came from multiplying iTime by an audio-varying factor
 * (iTime * MOTION) — when the factor changes the phase jerks. Here we accumulate phases
 * that ONLY EVER INCREASE; audio scales the per-frame SPEED, never the absolute phase.
 * The mirror tile factor is low-passed so the tiled copies don't jump scale frame-to-frame.
 * All inputs are spectral-domain (per the session mandate).
 *
 * Outputs (declare as `uniform float` in the shader):
 *   blobMotion  — ever-increasing blob-orbit phase   (speed from spectralFlux)
 *   mirrorRot   — ever-increasing mirror rotation     (speed from spectralCrest)
 *   mirrorTile  — smoothed tile / copy-count factor   (target from spectralCentroid)
 *
 * NOTE: this project's controller loader expects `export default function(features)` with
 * module-level state (see zoomer.js / mandelbrot.js) — NOT the make()/factory pattern.
 */

let state = null
const c01 = (x) => Math.max(0, Math.min(1, x || 0))

export default function controller(features) {
  const now = performance.now() / 1000
  if (!state) state = { motion: 0, mrot: 0, tile: 2.4, last: now }

  let dt = now - state.last
  state.last = now
  // clamp dt so a stalled/backgrounded tab can't jump or go backwards
  if (!(dt > 0) || dt > 0.1) dt = 1 / 60

  const fluxN  = c01(features.spectralFluxNormalized)
  const crestN = c01(features.spectralCrestNormalized)
  const centN  = c01(features.spectralCentroidNormalized)

  // SPEEDS always positive -> phases strictly monotonic (no shake)
  const motionSpeed = 0.5 + fluxN * 1.2
  const rotSpeed    = 0.04 + crestN * 0.12

  state.motion += dt * motionSpeed
  state.mrot   += dt * rotSpeed

  // low-pass the tile target (~0.6s) so copies don't pop in scale
  const tileTarget = 2.0 + centN * 1.4
  state.tile += (tileTarget - state.tile) * Math.min(1, dt * 1.5)

  return {
    blobMotion: state.motion,
    mirrorRot: state.mrot,
    mirrorTile: state.tile,
  }
}
