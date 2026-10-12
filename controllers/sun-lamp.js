// sun-lamp — the one clock shaders/sun/lamp/1.frag reads. No audio.
//
//   lp_u     travel seconds, ∫ speed dt. K7 SPEED sets the rate: 0.15× (calm drift) .. 1× the show's
//            pace. Every shader clock is a fixed multiple of it, so the dial changes rates, never
//            positions. Wrapped at WRAP so float32 keeps ~1 ms precision on a multi-day run.
//   lp_seam  0, except for SEAM seconds after a wrap, when the shader dissolves the old frame into
//            the new one so the jump in every clock never shows as a cut.

const WRAP = 8192
const SEAM = 4
const FRAME = 1 / 60
const SLOW = 0.15

const clamp01 = x => Math.min(1, Math.max(0, x))

export function make() {
  const S = window.__sunLampState ??= { u: 0, seam: SEAM, lastT: null }

  return (f) => {
    const now = performance.now() / 1000
    const step = now - (S.lastT ?? now)
    const dt = step > 0 && step <= 0.1 ? step : FRAME
    S.lastT = now
    S.u += SLOW * Math.pow(1 / SLOW, clamp01(f.knob_7 ?? 0)) * dt
    S.seam += dt
    if (S.u >= WRAP) {
      S.u -= WRAP
      S.seam = 0
    }
    return { lp_u: S.u, lp_seam: S.seam < SEAM ? 0.97 * (1 - S.seam / SEAM) : 0 }
  }
}
