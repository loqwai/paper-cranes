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
//   cs_pearl     0..1 crest envelope (0.15 s attack, 0.8 s release, gated) — pearl sparkle
//   cs_focus     -1..1 kurtosis z-score eased over 1.2 s (gated) — focal radius
//   cs_spread    0..1 spectral spread eased over 2 s (gated) — vignette opening
//   cs_grit      0..1 roughness envelope (0.3 s attack, 1.5 s release, gated) — nebula shimmer
//   cs_tone      0..1 spectral centroid, 8 s mean — slow colour lean (bright music warms the palette)
//   cs_A, cs_B   legacy: audio-eased fractal shape. No clit-set shader reads them any more (audio in the
//                fractal coordinates strobes, clit/4); kept so older forks still compile and run.
//
// NAVIGATION (clit-set/2+). Audio never moves the camera or the shape: position, zoom, rotation, power,
// body and curl come from the knobs and the autopilot clocks only. The audio links are the clocks' RATES:
// a confident build (cs_build) speeds the voyage clock up to 1.3x, loudness sets the spin rate (0.015-0.065 rad/s).
// Neither ever changes direction or position on the path.
//   cs_cx, cs_cy   camera centre in the fractal plane      cs_lz   log zoom (0 = home, ZOOM_MAX = 3x)
//   cs_rot         view rotation (rad)                     cs_curl per-iteration rotation (rad)
//   cs_navA, cs_navB  fractal power / body offset
//   cs_voyage      autopilot position in waypoints, 0..WAYPOINTS.length (5.x = gliding from the last back home)
//   cs_drift       spin (rad): one-way, always-on view rotation, already included in cs_rot
//   cs_beat        colour phase (turns): +BEAT_STEP x kick strength on every kick, eased 0.12 s, never back
//   cs_drive       0..1 loudness envelope (energy z-score, 0.5 = average) that sets the spin's rate
// cs_jump is NOT a waypoint index: it counts drops (+1 each, never decreases) and only turns the hue.
// knob_1 X, knob_2 Y, knob_3 VOYAGE at 0 = autopilot: the voyage drifts through WAYPOINTS by itself.
// X and Y push the camera from wherever the voyage has it: the dial value times PAN_SPAN, so a small
// nudge is a small move (no jump at the bottom of the dial). VOYAGE blends from the autopilot to a hand
// scrub over its first 8%, along the shorter way round the loop. knob_4 ZOOM, knob_6 POWER, knob_7 BODY,
// knob_8 CURL add on top of the voyage. Every target glides through a two-pole ease.
// knob_5 TURN is the exception: a scratch. It skips both glides and turns the picture with the hand,
// 0→1 = two full turns, on top of the voyage and the spin.
// ?coaster=1 turns X, Y and ZOOM into rate controls applied after the glide: knob_4 THROTTLE dives
// forward (log zoom, one way) at a speed set by the dial; knob_1 / knob_2 STEER (0.5 = straight, the
// rest is a turn rate; untouched 0 = straight). A drop surges the throttle. At LZ_CAP the coaster
// climbs: the dive eases back out while the voyage moves on half a waypoint, so the next drop starts on
// new terrain. Opt-in because the NFC variants bake knob_4 as a ZOOM position.

const KNOBS = 16
const TAU = Math.PI * 2
export const SCRATCH = 2 * TAU     // TURN (knob_5) full travel, rad
const SCRATCH_TAU = 0.05          // short enough to follow a hand, long enough to hide MIDI's 128 steps
export const ZOOM_MAX = 1.1      // log zoom cap (3x): the orbit-trap lace turns to speckle past ~3-4x
export const PAN_SPAN = 0.8      // X/Y: a full dial pans 0.8 in the fractal plane (2/3 of the screen height)
// COASTER. 2.frag is not self-similar under zoom (the lace turns to speckle past ~3.5x, its coherence
// gate fades it), so the dive cannot run forever: at LZ_CAP it climbs back out under a voyage move.
export const THROTTLE_RATE = 0.12   // log zoom per second at full throttle (home to the cap in ~11 s)
export const LZ_CAP = 1.3           // total depth that starts the climb (~3.7x)
export const KICK_DIVE = 0.012      // lz each full kick pushes the dive forward, times the throttle
export const SURGE = 1.2            // a drop adds SURGE x throttle (eased out over ~1.5 s); at hover audio never moves the camera
export const STEER_RATE = 0.18      // fractal-plane units per second at a full steer (screen-speed at any depth)
export const STEER_LIMIT = 0.6      // the track's walls: steering stops at ±0.6 from the voyage's path
export const CLIMB_SECS = 8
export const CLIMB_VOYAGE = 0.5     // waypoints the voyage moves on during a climb
const STEER_DEAD = 0.04
// Dial → steer -1..1. 0.5 ± 0.04 is straight; an untouched 0 (or the very bottom) is straight too,
// so all-zero knobs never mean hard-left forever.
export const steer = (v) => {
  if (!(v > 0.03)) return 0
  const d = v - 0.5
  return Math.sign(d) * smoothstep(STEER_DEAD, 0.5, Math.abs(d))
}
export const LEG_SECS = 80       // each leg glides the whole 80 s, no dwell (loop 480 s): never parked
// SPIN: an always-on, one-way view rotation on top of the voyage, so the picture never holds still
// (Aaron: "We should always be moving forward in the animation"). Geometry only evolves: no sine on
// zoom, pan or rotation (a sway reads as shiver on the show's probe and on the wall). Rotation about
// the screen centre keeps the radial profile, so it moves every pixel without breathing anything.
// Audio only changes the RATE: 0.015 rad/s in silence (~7 min a turn), 0.015-0.065 rad/s with music,
// following the energy z-score both ways (0.08 s attack, 0.35 s release). The floor beats the steepest
// waypoint turn (vortex eye → jellyfish, -0.9 rad over a 276 s leg, ≤ 0.005 rad/s), so the view never
// turns backwards. No per-kick surge: a 0.4 s rate jerk read as zoom jitter on the shiver probe.
export const SPIN = { base: 0.02, lo: 0.5, hi: 4 }   // rad/s x (0.5 silent .. 4 loud)
export const LURCH = 0.05        // rad the view jumps forward on each full kick (eased 0.12 s, never back)
export const PUNCH_SECS = 0.2    // cs_punch: ~30 ms attack, 0.2 s decay on every kick
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
// Shortest signed step from a to b around a loop of length n (so 5.9 → 0.1 is +0.2, not -5.8)
export const loopDelta = (a, b, n) => ((((b - a) % n) + n * 1.5) % n) - n / 2

// LEG PACING: a leg's length grows with how far it travels, in shape (power, body, curl) and in camera
// (pan, zoom, turn), so a big move takes minutes instead of 80 s. A fast morph or dive re-forms the lace
// faster than the eye follows; the show's shiver probe read ribbon cathedral → vortex eye (pan 0.37,
// zoom 0.4 in 80 s) as zoom jitter, 0.96 with no audio at 1080p.
export const SHAPE_PER_LEG = 0.45
const shapeDist = (a, b) => Math.abs(a.A - b.A) + 2 * Math.abs(a.B - b.B) + Math.abs(a.curl - b.curl)
  + Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy) + Math.abs(a.lz - b.lz) + 0.3 * Math.abs(a.rot - b.rot)
export const legSecs = (i) => {
  const n = WAYPOINTS.length
  const k = ((Math.floor(i) % n) + n) % n
  return LEG_SECS * Math.max(1, shapeDist(WAYPOINTS[k], WAYPOINTS[(k + 1) % n]) / SHAPE_PER_LEG)
}
export const LOOP_SECS = WAYPOINTS.map((_, i) => legSecs(i)).reduce((a, b) => a + b, 0)

// Voyage position u (in waypoints, wraps at WAYPOINTS.length) → a blended place.
// Mid-glide the camera pulls back a little, so each leg reads as rising, flying, settling.
export const place = (u) => {
  const n = WAYPOINTS.length
  const w = ((u % n) + n) % n
  const i = Math.floor(w)
  const a = WAYPOINTS[i], b = WAYPOINTS[(i + 1) % n]
  // Never parked: part linear, part eased, so the glide speed never drops below 40% of linear.
  // Each leg is one way in every coordinate (no mid-glide pull-back: that zoomed out and back in).
  const t = w - i
  const g = lerp(t, smoothstep(0, 1, t), 0.6)
  const out = {}
  for (const key of ['cx', 'cy', 'lz', 'rot']) out[key] = lerp(a[key], b[key], g)
  // The shape morphs linearly across the whole leg: its peak rate is 1/1.3 of the camera's eased glide
  for (const key of ['A', 'B', 'curl']) out[key] = lerp(a[key], b[key], t)
  return out
}

// Knobs + autopilot clock + spin → navigation target. Pure in the clocks: no audio argument.
// Fallback in shaders/clit-set/2.frag mirrors this with base = HOME and no spin.
export const nav = (k, autoU, spin = 0, coaster = false) => {
  const n = WAYPOINTS.length
  const scrub = clamp01((k[2] - 0.08) / 0.92) * (n - 0.001)
  const base = place(autoU + loopDelta(autoU, scrub, n) * manual(k[2]))
  return {
    cx: coaster ? base.cx : base.cx - k[1] * PAN_SPAN,
    cy: coaster ? base.cy : base.cy + k[0] * PAN_SPAN,
    lz: Math.min(ZOOM_MAX, base.lz + (coaster ? 0 : k[3] * ZOOM_MAX)),
    rot: base.rot + spin,
    A: base.A + k[5] * 1.4,
    B: base.B - k[6] * 0.4,
    curl: base.curl + k[7] * 0.45,
  }
}
export const KICK_SECS = 0.4
export const BEAT_STEP = 0.11    // cs_beat turns per full kick
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
  voyage: 0, voyageSeeded: false, nav: null, navMid: null, drift: 0, drive: 0, beat: 0, beatTo: 0, lurch: 0, lurchTo: 0, scratch: null, punch: 0, punchFrom: 0, punchAge: 9,
  bFast: 0, bSlow: 0, eFast: 0, eSlow: 0, localWas: 0, thump: 0,
  pearl: 0, focus: 0, spread: 0, grit: 0, tone: 0.5,
  throttle: 0, surge: 0, dive: 0, diveTo: 0, panX: 0, panY: 0, steerX: 0, steerY: 0, climb: 0,
})

export const step = (S, f, dt) => {
  const coaster = num(f.coaster, 0) > 0.5
  S.time += dt

  // PRESENCE: everything that adds light is multiplied by this, so silence relaxes to the resting look
  // (quiet must never mean brighter: noise z-scores spike when the music stops)
  const energy = num(f.energy, 0)
  // The gate is for true silence only: a phone mic in a loud club reads energy 0.01-0.03, which the old
  // 0.002..0.02 line-level ramp held near half-shut, multiplying every audio term toward nothing
  // 0.25 s to open, 3 s to close: the gaps between techno kicks must not shut the gate every beat
  S.presence = env(S.presence, smoothstep(0.0008, 0.006, energy), dt, 0.25, 3)
  // ?time=<s> holds time: the time-driven clocks stop, the audio-driven parts keep going (Aaron's test)
  const clock = Number.isFinite(f.time) ? 0 : 1
  // LOCAL loudness: bass and energy against their own last ~0.45 s, not the 500-frame history. On a
  // four-on-the-floor wall of sound the z-scores flatten to 0; the local ratio still jumps on every kick.
  const bassRaw = Math.max(0, num(f.bass, 0)), eRaw = Math.max(0, energy)
  S.bFast = toward(S.bFast, bassRaw, dt, 0.03)
  S.bSlow = toward(S.bSlow, bassRaw, dt, 0.45)
  S.eFast = toward(S.eFast, eRaw, dt, 0.05)
  S.eSlow = toward(S.eSlow, eRaw, dt, 0.6)
  const bassLocal = S.bFast / (S.bSlow + 1e-6) - 1
  const eLocal = S.eFast / (S.eSlow + 1e-6) - 1
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
  S.mids = env(S.mids, clamp01(num(f.midsZScore, 0) * 0.8 + 0.2) * live, dt, 0.25, 0.8)   // lace light: swells, never flashes
  S.treb = env(S.treb, clamp01(num(f.trebleZScore, 0) * 0.9 + 0.15) * live, dt, 0.05, 0.4)

  // KICK: wavelet onset when ?wavelet=true, else a rising edge of the bass z-score
  S.kickRefr = Math.max(0, S.kickRefr - dt)
  const bz = num(f.bassZScore, 0)
  const wHit = Number.isFinite(f.wavelet_bassHit) ? f.wavelet_bassHit > 0.9 : false
  const zHit = (bz > 0.45 && S.bassWas <= 0.45) || (bassLocal > 0.25 && S.localWas <= 0.25)
  S.bassWas = bz
  S.localWas = bassLocal
  if ((wHit || zHit) && S.kickRefr === 0 && live > 0.3) {
    S.kickAmp = Math.max(S.kick, clamp01(0.6 + 0.4 * Math.max(bz, bassLocal * 1.5))) * live
    S.kickAge = 0
    S.beatTo += BEAT_STEP * S.kickAmp
    S.lurchTo += LURCH * S.kickAmp
    S.punchFrom = S.punch
    S.punchAge = 0
    S.kickRefr = 0.18
    if (coaster && S.climb === 0) S.diveTo += KICK_DIVE * S.kickAmp * S.throttle
  }
  S.kickAge = Math.min(1, S.kickAge + dt / KICK_SECS)
  // BEAT: a colour phase that steps forward on every kick (eased 0.12 s) and never goes back
  S.beat = toward(S.beat, S.beatTo, dt, 0.12)
  S.lurch = toward(S.lurch, S.lurchTo, dt, 0.12)
  // PUNCH: 30 ms rise to the kick's strength, then a 0.2 s cubic fall (techno: lands on every beat)
  S.punchAge += dt
  const rise = Math.min(1, S.punchAge / 0.03)
  const fall = Math.max(0, 1 - Math.max(0, S.punchAge - 0.03) / PUNCH_SECS) ** 3
  S.punch = S.punchAge > 0.03 + PUNCH_SECS ? 0 : lerp(S.punchFrom, S.kickAmp, rise) * fall
  S.kick = S.kickAmp * (1 - S.kickAge) ** 3

  // THUMP: bass against its own last 0.45 s (20 ms attack, 0.2 s release): every kick, even in a wall of sound
  S.thump = env(S.thump, clamp01(bassLocal * 2.5) * live, dt, 0.02, 0.2)

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
    if (coaster && S.climb === 0) S.surge += SURGE * S.throttle
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
  S.flow += (0.02 * clock + 0.06 * live * clamp01(num(f.energyNormalized, 0)) + 0.04 * S.build + 0.05 * S.kick) * dt

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

  // TEXTURE: the features 2.frag used to read raw (they shimmered), now eased and gated by presence
  S.pearl = env(S.pearl, clamp01(num(f.spectralCrestNormalized, 0)) * live, dt, 0.15, 0.8)
  S.focus = toward(S.focus, Math.max(-1, Math.min(1, num(f.spectralKurtosisZScore, 0))) * live, dt, 1.2)
  S.spread = toward(S.spread, clamp01(num(f.spectralSpreadNormalized, 0)) * live, dt, 2)
  S.grit = env(S.grit, clamp01(num(f.spectralRoughnessNormalized, 0)) * live, dt, 0.3, 1.5)
  S.tone = toward(S.tone, live > 0.3 ? clamp01(num(f.spectralCentroidNormalized, 0.5)) : S.tone, dt, 8)

  // VOYAGE: the autopilot clock only moves forward; a little faster on loud building music, never backwards.
  // ?voyage0=<u> starts the journey at u (in waypoints, wraps mod WAYPOINTS.length) on the first frame,
  // so each NFC tag can open on its own place. Missing = 0 = home.
  if (!S.voyageSeeded) {
    const n = WAYPOINTS.length
    S.voyage = ((num(f.voyage0, 0) % n) + n) % n
    S.voyageSeeded = true
  }
  // Loud music flies the voyage faster (0.5x silent .. 2.5x loud), and each kick steps it forward a notch
  const pace = 0.5 * clock + 2 * S.drive
  S.voyage = (S.voyage + dt / legSecs(S.voyage) * pace * (1 + 0.3 * live * S.build) + 0.002 * S.punch * dt / 0.1) % WAYPOINTS.length
  // SPIN: always forward. Loudness (0.08 s attack, 0.35 s release) speeds it up, so the turn visibly
  // quickens with the music; it never reverses and never stops. Never wrapped: the glide would unwind it.
  S.drive = env(S.drive, clamp01(0.5 + 0.5 * num(f.energyZScore, 0) + 1.5 * eLocal) * live, dt, 0.08, 0.35)
  S.drift += dt * SPIN.base * (SPIN.lo * clock + (SPIN.hi - SPIN.lo) * S.drive)
  const target = nav(S.knobs.map(v => v ?? 0), S.voyage, 0, coaster)
  S.navMid ??= { ...target }
  S.nav ??= { ...target }
  for (const key in target) {
    S.navMid[key] = toward(S.navMid[key], target[key], dt, NAV_TAU)
    S.nav[key] = toward(S.nav[key], S.navMid[key], dt, NAV_TAU)
  }
  // COASTER: throttle and steer are rates on top of the glided voyage, eased 0.2 s so a hand reads at once
  if (coaster) {
    S.throttle = toward(S.throttle, clamp01(num(f.knob_4, 0)), dt, 0.2)
    S.steerX = toward(S.steerX, steer(num(f.knob_1, 0)), dt, 0.2)
    S.steerY = toward(S.steerY, steer(num(f.knob_2, 0)), dt, 0.2)
    S.surge = toward(S.surge, 0, dt, 1.5)
    if (S.climb === 0) {
      S.diveTo += THROTTLE_RATE * (S.throttle + S.surge) * dt
      S.panX = Math.max(-STEER_LIMIT, Math.min(STEER_LIMIT, S.panX + S.steerX * STEER_RATE * dt))
      S.panY = Math.max(-STEER_LIMIT, Math.min(STEER_LIMIT, S.panY + S.steerY * STEER_RATE * dt))
      if (S.nav.lz + S.dive >= LZ_CAP) {
        S.climb = CLIMB_SECS
        S.diveTo = 0
        S.surge = 0
      }
    } else {
      // CLIMB: back out of the dive and onto the track's centre while the voyage carries on to new terrain
      S.climb = Math.max(0, S.climb - dt)
      S.voyage = (S.voyage + CLIMB_VOYAGE * dt / CLIMB_SECS) % WAYPOINTS.length
      S.panX = toward(S.panX, 0, dt, CLIMB_SECS / 4)
      S.panY = toward(S.panY, 0, dt, CLIMB_SECS / 4)
    }
    S.dive = toward(S.dive, S.diveTo, dt, S.climb > 0 ? CLIMB_SECS / 4 : 0.15)
  }

  const turn = clamp01(num(f.knob_5, 0)) * SCRATCH
  S.scratch = S.scratch === null ? turn : toward(S.scratch, turn, dt, SCRATCH_TAU)

  const out = {
    cs_on: 1, cs_time: S.time, cs_presence: S.presence, cs_flow: S.flow,
    cs_A: S.A, cs_B: S.B, cs_kick: S.kick, cs_bass: S.bass, cs_mids: S.mids, cs_treb: S.treb,
    cs_build: S.build, cs_drop: S.drop, cs_jump: S.jump, cs_shift: S.shift, cs_hue: hue,
    cs_breath: S.breath, cs_pearl: S.pearl, cs_focus: S.focus, cs_spread: S.spread, cs_grit: S.grit, cs_tone: S.tone,
    // The spin goes on after the glide: it is already smooth (an integral of an eased rate), and through
    // the 1.8 s glide its beat-scale quickening landed a beat late (rResid went negative)
    cs_cx: S.nav.cx - S.panY, cs_cy: S.nav.cy + S.panX, cs_lz: S.nav.lz + S.dive,
    cs_rot: S.nav.rot + S.drift + S.lurch + S.scratch,
    cs_throttle: S.throttle, cs_dive: S.dive, cs_climb: S.climb,
    cs_navA: S.nav.A, cs_navB: S.nav.B, cs_curl: S.nav.curl,
    cs_voyage: S.voyage, cs_drift: S.drift, cs_drive: S.drive, cs_beat: S.beat, cs_punch: S.punch, cs_lurch: S.lurch, cs_scratch: S.scratch, cs_thump: S.thump,
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
