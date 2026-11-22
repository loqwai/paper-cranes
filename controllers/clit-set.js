// clit-set — frame-persistent state shared by every shaders/clit-set/*.frag.
//
//   ?shader=clit-set/1&controller=clit-set
//
// The shaders render without it (every cs_* uniform reads 0 and the shader falls back to raw audio
// features), but with it the fractal moves forward smoothly instead of jittering on raw z-scores.
// State lives on window.__clitSetState, so a hot swap of this file resumes mid-set.
//
// Channel discipline (docs/vj-preferences.md):
//   light / amplitude  → attack-fast, release-slow envelopes on z-scores, gated by presence
//   motion             → monotonic clocks; audio changes their RATE, never their direction
//   colour             → slow music only (20 s circular mean of pitchClassMedian)
//   events             → drop envelope with an 8 s refractory; nothing fires on a timer
//
// Outputs (declare each as `uniform float` in the shader):
//   cs_on        1 while this controller runs (the shader's switch between cs_* and raw features)
//   cs_time      monotonic seconds since load
//   cs_presence  0..1 is there music at all (energy gate, 0.25 s)
//   cs_flow      monotonic clock (turns, unwrapped): 0.02 turns/s in silence so quiet never freezes,
//                up to ~0.12 turns/s on loud, building music
//   cs_A, cs_B   fractal shape (power, body offset), eased from centroid / energy z-scores
//   cs_kick      kick punch: instant attack, cubic ease-out over 0.4 s, re-triggers from current
//   cs_bass, cs_mids, cs_treb   band envelopes 0..1 (z-score driven, gated)
//   cs_build     confident energy rise (slope × R²), 4 s attack, 3 s release
//   cs_drop      drop envelope: 50 ms attack, ~1.2 s release, 8 s refractory
//   cs_jump      +1 per drop, eased over ~1.5 s, never decreases (use fract / sin for new looks)
//   cs_shift     timbral shift (flux z-score + entropy change), 0.3 s attack, 2.5 s release
//   cs_hue       slow key (turns 0..1), circular 20 s mean of pitchClassMedian
//   cs_k1..cs_k16 knob_1..knob_16 eased (~0.35 s) so a dial twist glides instead of stepping
//   cs_breath    0..1 slow loudness (energyNormalized, 1.5 s) — clit-set/2 breathes the lace threshold
//
// NAVIGATION (clit-set/2+). Audio never touches these: audio in fractal coordinates strobes (clit/4).
//   cs_cx, cs_cy   camera centre in the fractal plane      cs_lz   log zoom (0 = home, ZOOM_MAX = 3x)
//   cs_rot         view rotation (rad)                     cs_curl per-iteration rotation (rad)
//   cs_navA, cs_navB  fractal power / body offset
// knob_1 X, knob_2 Y, knob_3 VOYAGE at 0 = autopilot: the voyage drifts through WAYPOINTS by itself.
// Turning one up blends manual control in over its first 8%. knob_4 ZOOM, knob_5 TURN, knob_6 POWER,
// knob_7 BODY, knob_8 CURL add on top of the voyage. Every target glides through a two-pole ease.

const KNOBS = 16
const TAU = Math.PI * 2
export const ZOOM_MAX = 1.1      // log zoom cap (3x): the orbit-trap lace turns to speckle past ~3-4x
export const LEG_SECS = 100      // each waypoint: ~40 s dwell, ~60 s glide to the next (loop 600 s)
const DWELL = 0.4
const NAV_TAU = 0.9              // two cascaded poles ≈ 1.8 s glide, smooth start and stop
const HOME = { name: 'home', cx: 0.77, cy: 0, lz: 0, rot: 0, A: 1.5, B: 0.55, curl: 0 }

// The voyage. Home first and last-in-loop, so the autopilot keeps returning to the landmark.
export const WAYPOINTS = [
  HOME,
  { name: 'ribbon cathedral', cx: 0.77, cy: 0.08, lz: 0.35, rot: 0, A: 1.5, B: 0.55, curl: 0.3 },
  { name: 'vortex eye', cx: 0.62, cy: 0.42, lz: 0.75, rot: 0.6, A: 1.62, B: 0.52, curl: 0.18 },
  { name: 'jellyfish tendrils', cx: 0.3, cy: 0.22, lz: 0.3, rot: -0.3, A: 1.5, B: 0.55, curl: 0.05 },
  { name: 'fern galaxy', cx: 0.77, cy: 0, lz: 0.2, rot: 0, A: 1.99, B: 0.43, curl: 0.22 },
  { name: 'rose carpet', cx: 0.77, cy: 0.06, lz: 0.1, rot: 0.15, A: 2.45, B: 0.3, curl: 0.12 },
]

const lerp = (a, b, t) => a + (b - a) * t
const manual = k => smoothstep(0, 0.08, k)
const bipolar = k => clamp01((k - 0.08) / 0.92) * 2 - 1

// Voyage position u (in waypoints, wraps at WAYPOINTS.length) → a blended place.
// Mid-glide the camera pulls back a little, so each leg reads as rising, flying, settling.
export const place = (u) => {
  const n = WAYPOINTS.length
  const w = ((u % n) + n) % n
  const i = Math.floor(w)
  const a = WAYPOINTS[i], b = WAYPOINTS[(i + 1) % n]
  const g = smoothstep(DWELL, 1, w - i)
  const out = {}
  for (const key of ['cx', 'cy', 'lz', 'rot', 'A', 'B', 'curl']) out[key] = lerp(a[key], b[key], g)
  out.lz = Math.max(0, out.lz - 0.35 * Math.sin(Math.PI * g))
  return out
}

// Knobs + autopilot clock → navigation target. Fallback in shaders/clit-set/2.frag mirrors this with base = HOME.
export const nav = (k, autoU) => {
  const scrub = clamp01((k[2] - 0.08) / 0.92) * (WAYPOINTS.length - 0.001)
  const base = place(lerp(autoU, scrub, manual(k[2])))
  return {
    cx: base.cx - manual(k[1]) * bipolar(k[1]) * 0.6,
    cy: base.cy + manual(k[0]) * bipolar(k[0]) * 0.6,
    lz: Math.min(ZOOM_MAX, base.lz + k[3] * ZOOM_MAX),
    rot: base.rot + k[4] * TAU,
    A: base.A + k[5] * 1.4,
    B: base.B - k[6] * 0.4,
    curl: base.curl + k[7] * 0.45,
  }
}
export const KICK_SECS = 0.4
export const DROP_REFRACTORY = 8

const clamp01 = x => Math.min(1, Math.max(0, x))
const num = (x, d = 0) => Number.isFinite(x) ? x : d
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const toward = (cur, target, dt, tau) => cur + (target - cur) * (1 - Math.exp(-dt / tau))
const env = (cur, target, dt, attack, release) => toward(cur, target, dt, target > cur ? attack : release)

export const fresh = () => ({
  time: 0, last: null, flow: 0, presence: 0,
  A: 1.6, B: 0.55, bass: 0, mids: 0, treb: 0,
  kick: 0, kickAmp: 0, kickAge: 1, kickRefr: 0, bassWas: 0,
  build: 0, drop: 0, dropHold: 0, dropRefr: 0, jump: 0, jumpTo: 0,
  shift: 0, entFast: 0.5, entSlow: 0.5,
  hueX: 1, hueY: 0, knobs: Array(KNOBS).fill(null), breath: 0.5,
  voyage: 0, nav: null, navMid: null,
})

export const step = (S, f, dt) => {
  S.time += dt

  // PRESENCE: everything that adds light is multiplied by this, so silence relaxes to the resting look
  // (quiet must never mean brighter: noise z-scores spike when the music stops)
  const energy = num(f.energy, 0)
  S.presence = toward(S.presence, smoothstep(0.002, 0.02, energy), dt, 0.25)
  const live = S.presence

  // SHAPE: the fractal parameters clit/2 drove straight from raw z-scores, now eased
  const cz = Math.max(-1, Math.min(1.5, num(f.spectralCentroidZScore, 0)))
  const ez = Math.max(-1, Math.min(1.5, num(f.energyZScore, 0)))
  const aTarget = 1.3 + 0.5 * clamp01(cz) * live + 0.1        // clit/2: mapValue(centroidZ, 0,1, 1.2,1.8) + 0.1
  const bTarget = 0.55 + 0.15 * ez * live
  S.A = toward(S.A, aTarget, dt, 0.35)
  S.B = toward(S.B, bTarget, dt, 0.25)

  // BANDS: attack fast, release slow
  S.bass = env(S.bass, clamp01(num(f.bassZScore, 0) * 1.2) * live, dt, 0.04, 0.5)
  S.mids = env(S.mids, clamp01(num(f.midsZScore, 0) * 0.8 + 0.2) * live, dt, 0.08, 0.6)
  S.treb = env(S.treb, clamp01(num(f.trebleZScore, 0) * 0.9 + 0.15) * live, dt, 0.05, 0.4)

  // KICK: wavelet onset when ?wavelet=true, else a rising edge of the bass z-score
  S.kickRefr = Math.max(0, S.kickRefr - dt)
  const bz = num(f.bassZScore, 0)
  const wHit = Number.isFinite(f.wavelet_bassHit) ? f.wavelet_bassHit > 0.9 : false
  const zHit = bz > 0.45 && S.bassWas <= 0.45
  S.bassWas = bz
  if ((wHit || zHit) && S.kickRefr === 0 && live > 0.3) {
    S.kickAmp = Math.max(S.kick, clamp01(0.6 + 0.4 * bz)) * live
    S.kickAge = 0
    S.kickRefr = 0.18
  }
  S.kickAge = Math.min(1, S.kickAge + dt / KICK_SECS)
  S.kick = S.kickAmp * (1 - S.kickAge) ** 3

  // BUILD: confident energy rise
  const trend = num(f.energySlope, 0) * num(f.energyRSquared, 0)
  S.build = env(S.build, clamp01(trend * 10) * live, dt, 4, 3)

  // DROP: confirmed by the wavelet pass, or energy and bass both well above their history
  S.dropRefr = Math.max(0, S.dropRefr - dt)
  S.dropHold = Math.max(0, S.dropHold - dt)
  const dropHit = num(f.wavelet_confirmedDrop, 0) > 0.5 || (ez > 0.6 && bz > 0.5)
  if (dropHit && live > 0.5 && S.dropRefr === 0 && S.time > 6) {
    S.dropHold = 0.6
    S.dropRefr = DROP_REFRACTORY
    S.jumpTo += 1
  }
  S.drop = toward(S.drop, S.dropHold > 0 ? 1 : 0, dt, S.dropHold > 0 ? 0.05 : 1.2)
  S.jump = toward(S.jump, S.jumpTo, dt, 0.5)

  // SHIFT: timbre changes (flux spike, or entropy moving off its slow mean)
  const ent = num(f.spectralEntropyNormalized, 0.5)
  S.entFast = toward(S.entFast, ent, dt, 0.5)
  S.entSlow = toward(S.entSlow, ent, dt, 6)
  const shift = clamp01(0.6 * Math.max(0, num(f.spectralFluxZScore, 0) - 0.3) + 0.4 * smoothstep(0.03, 0.2, Math.abs(S.entFast - S.entSlow))) * live
  S.shift = env(S.shift, shift, dt, 0.3, 2.5)

  // FLOW: always forward. Silence still turns slowly (no dead zones), music speeds it up
  S.flow += (0.02 + 0.06 * live * clamp01(num(f.energyNormalized, 0)) + 0.04 * S.build + 0.05 * S.kick) * dt

  // HUE: slow key, circular mean so B→C does not sweep the whole wheel
  const pc = num(f.pitchClassMedian, num(f.pitchClass, 0)) * Math.PI * 2
  S.hueX = toward(S.hueX, Math.cos(pc), dt, 20)
  S.hueY = toward(S.hueY, Math.sin(pc), dt, 20)
  const hue = (Math.atan2(S.hueY, S.hueX) / (Math.PI * 2) + 1) % 1

  // KNOBS: eased so a twist glides
  for (let i = 0; i < KNOBS; i++) {
    const k = num(f[`knob_${i + 1}`], 0)
    S.knobs[i] = S.knobs[i] == null ? k : toward(S.knobs[i], k, dt, 0.35)
  }

  // BREATH: slow loudness, thickens the lace on loud passages and thins it to a hairline in quiet ones
  S.breath = toward(S.breath, clamp01(num(f.energyNormalized, 0.5)) * live + 0.3 * (1 - live), dt, 1.5)

  // VOYAGE: the autopilot clock only moves forward; a little faster on loud building music, never backwards
  S.voyage = (S.voyage + dt / LEG_SECS * (1 + 0.3 * live * S.build)) % WAYPOINTS.length
  const target = nav(S.knobs.map(v => v ?? 0), S.voyage)
  S.navMid ??= { ...target }
  S.nav ??= { ...target }
  for (const key in target) {
    S.navMid[key] = toward(S.navMid[key], target[key], dt, NAV_TAU)
    S.nav[key] = toward(S.nav[key], S.navMid[key], dt, NAV_TAU)
  }

  const out = {
    cs_on: 1, cs_time: S.time, cs_presence: S.presence, cs_flow: S.flow,
    cs_A: S.A, cs_B: S.B, cs_kick: S.kick, cs_bass: S.bass, cs_mids: S.mids, cs_treb: S.treb,
    cs_build: S.build, cs_drop: S.drop, cs_jump: S.jump, cs_shift: S.shift, cs_hue: hue,
    cs_breath: S.breath,
    cs_cx: S.nav.cx, cs_cy: S.nav.cy, cs_lz: S.nav.lz, cs_rot: S.nav.rot,
    cs_navA: S.nav.A, cs_navB: S.nav.B, cs_curl: S.nav.curl,
  }
  S.knobs.forEach((v, i) => { out[`cs_k${i + 1}`] = v })
  return out
}

export function make() {
  const root = globalThis.window ?? globalThis
  const S = root.__clitSetState = { ...fresh(), ...(root.__clitSetState ?? {}) }   // older state gains new fields
  return (f) => {
    const now = performance.now() / 1000
    const dt = S.last === null ? 1 / 60 : Math.min(Math.max(now - S.last, 0), 0.25)
    S.last = now
    return step(S, f, dt)
  }
}
