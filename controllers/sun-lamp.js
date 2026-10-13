// sun-lamp — the clocks shaders/sun/lamp/3.frag reads (2.frag skips lp_m; 1.frag reads only lp_u and
// lp_seam). No audio.
//
//   lp_u     travel seconds, ∫ speed dt. K7 SPEED sets the rate: 0.15× (calm drift) .. 3× the show's
//            pace. Every shader clock is a fixed multiple of it, so the dial changes rates, never
//            positions. Wrapped at WRAP so float32 keeps ~1 ms precision on a multi-day run.
//   lp_e     the eruption clock, ∫ speed × (1 + 3 × K6 ERUPT) dt: the surface boils and the flares
//            fire faster as ERUPT rises, still without a jump. Wrapped at WRAP like lp_u.
//   lp_seam  0, except for SEAM seconds after lp_u wraps, when the shader dissolves the old frame
//            into the new one so the jump never shows as a cut.
//   lp_seamE the same dissolve for an lp_e wrap. Separate so 1.frag, which never reads lp_e, never
//            dissolves without a real discontinuity.
//   lp_m     the music clock 3.frag's synthetic music runs on, ∫ K16 ANIMATE dt: still at 0, about the
//            show's pace at 1, independent of SPEED, so the dial never jumps the picture. It wraps at
//            WRAP with no dissolve: every period the shader reads divides WRAP, so the wrap is seamless.

const WRAP = 8192
const SEAM = 4
const FRAME = 1 / 60
const SLOW = 0.15
const FAST = 3

const clamp01 = x => Math.min(1, Math.max(0, x))

export function make() {
  const S = window.__sunLampState ??= { u: 0, seam: SEAM, lastT: null }
  S.e ??= S.u
  S.seamE ??= SEAM
  S.m ??= S.u

  return (f) => {
    const now = performance.now() / 1000
    const step = now - (S.lastT ?? now)
    const dt = step > 0 && step <= 0.1 ? step : FRAME
    S.lastT = now
    const speed = SLOW * Math.pow(FAST / SLOW, clamp01(f.knob_7 ?? 0))
    S.u += speed * dt
    S.e += speed * (1 + 3 * clamp01(f.knob_6 ?? 0)) * dt
    S.m = (S.m + clamp01(f.knob_16 ?? 0) * dt) % WRAP
    S.seam += dt
    S.seamE += dt
    if (S.u >= WRAP) {
      S.u -= WRAP
      S.seam = 0
    }
    if (S.e >= WRAP) {
      S.e -= WRAP
      S.seamE = 0
    }
    const fade = t => t < SEAM ? 0.97 * (1 - t / SEAM) : 0
    return { lp_u: S.u, lp_e: S.e, lp_m: S.m, lp_seam: fade(S.seam), lp_seamE: fade(S.seamE) }
  }
}
