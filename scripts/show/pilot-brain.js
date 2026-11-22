// pilot-brain: the pure half of scripts/show/pilot.js. No I/O: the loop feeds it the page's
// features, the live knob values and the meter, and it returns the knob values to write.
//
// Channel discipline (docs/vj-preferences.md, controllers/clit-set.js):
//   geometry  k1 X, k2 Y, k4 ZOOM, k6 POWER, k7 BODY, k8 CURL: slow first-order glides toward a
//             target that only changes on a musical event (section, build, drop, breakdown). A
//             first-order glide is monotonic between retargets, so nothing on geometry wobbles.
//   voyage    k3 at 0 is the controller's own autopilot journey and is left alone. A k3 the user
//             parked above the blend zone is flown forward only, never back (backwards scrubs
//             replay the trip in reverse).
//   rotation  k5 TURN is a direct scratch (0..1 = 720 degrees): only an eased one-way flourish
//             per drop, never a step, never back.
//   light     k9..k16: continuous, smoothed over 1-3 s, each from its own subtle feature.
// The user's hand always wins: a knob whose live value moved away from what the pilot last wrote
// is left alone until it has been still for YIELD_SECS.
// Coaster mode (the wall's ?coaster=1, controllers/clit-set.js): k4 is THROTTLE and k1/k2 STEER are
// turn rates centred on 0.5, so the same musical events drive speed and heading instead of a place.

export const YIELD_SECS = 20
export const TOUCH = 0.02
export const ZOOM_CAP = 0.55
export const PAN_MAX = 0.45
export const DROP_REFRACTORY = 30
export const SHIFT_REFRACTORY = 25
export const FLOURISH = 0.06
export const FLOURISH_MAX = 0.85
export const BLEND_TOP = 0.08
// Coaster: steering stays near straight (0.5 ± STEER_SPAN) so the ride carves instead of pinning a wall.
export const STEER_SPAN = 0.15
// Opening: knobs join one every ENGAGE_GAP seconds (ENGAGE_ORDER), each gliding no faster than
// ENGAGE_TAU for its first ENGAGE_SECS, so at most ~2 knobs are moving fast at once.
export const ENGAGE_GAP = 3
export const ENGAGE_TAU = 4
export const ENGAGE_SECS = 12
export const ENGAGE_ORDER = [10, 16, 12, 11, 14, 13, 15, 9, 8, 6, 7, 4, 1, 2, 5, 3]
// A hand move within this many seconds explains the meter's flicker: it is the user, not the pilot.
export const HAND_EXPLAINS = 10
const VOYAGE_PER_WAYPOINT = (1 - BLEND_TOP) / 6
const LEG_SECS = 80

export const GEOMETRY = [1, 2, 4, 6, 7, 8]
export const LIGHT = [9, 10, 11, 12, 13, 14, 15, 16]
export const NAMES = { 1: 'X', 2: 'Y', 3: 'VOYAGE', 4: 'ZOOM', 5: 'TURN', 6: 'POWER', 7: 'BODY', 8: 'CURL', 9: 'HUE', 10: 'NEBULA', 11: 'TRAILS', 12: 'REACT', 13: 'GLASSES', 14: 'EMBER', 15: 'SPOT', 16: 'LACE' }

// Every feature the brain reads. The loop fetches exactly these and fails loudly if one is missing.
export const FEATURES = [
  'energy', 'energyZScore', 'pitchClassMedian',
  'spectralEntropyNormalized', 'spectralFluxNormalized', 'bassNormalized', 'spectralCrestNormalized',
  'trebleNormalized', 'spectralKurtosisNormalized', 'midsNormalized', 'spectralSpreadNormalized',
  'cs_presence', 'cs_build', 'cs_drop', 'cs_shift', 'cs_kick',
]

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))
const ease = (x, target, dt, tau) => x + (target - x) * (1 - Math.exp(-dt / tau))

// Deterministic, so a replay of the same music makes the same flight.
const rng = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// A "place" is where the geometry glides to between events. Bounded so the shape stays in frame
// and the lace stays lace: pan off-frame and zoom past ~0.55 both turned the wall dark on 2026-11-22.
const placeFor = (rand, coaster) => ({
  1: coaster ? 0.5 + (rand() * 2 - 1) * STEER_SPAN : 0.05 + rand() * 0.35,
  2: coaster ? 0.5 + (rand() * 2 - 1) * STEER_SPAN : 0.05 + rand() * 0.35,
  4: 0.1 + rand() * 0.3,
  6: 0.1 + rand() * 0.5,
  7: 0.05 + rand() * 0.4,
  8: 0.1 + rand() * 0.45,
})

export const init = (live, seed = 1, f = null, { stagger = true, coaster = false } = {}) => {
  const knobs = {}
  for (let n = 1; n <= 16; n++) knobs[n] = { value: live[n], written: null, seen: live[n], yieldUntil: -Infinity, engageAt: stagger ? ENGAGE_GAP * ENGAGE_ORDER.indexOf(n) : 0 }
  const rand = rng(seed)
  return {
    t: 0,
    seed,
    coaster,
    knobs,
    place: placeFor(rand, coaster),
    geoTau: 14,
    voyage: live[3] > BLEND_TOP ? 'fly' : live[3] < 0.005 ? 'auto' : 'parked',
    hueDir: 1,
    sm: { flux: 0.3, bass: 0.3, crest: 0.3, treble: 0.3, kurt: 0.3, lace: 0.3, entropy: 0.5, quiet: 0, pitch: null, tonal: 0 },
    ev: { prevDrop: f ? f.cs_drop : 0, prevShift: f ? f.cs_shift : 0, lastHand: -Infinity, lastDrop: -Infinity, lastShift: -Infinity, drops: 0, shifts: 0, plungeUntil: -Infinity, spotUntil: -Infinity, breakdown: false },
    guard: { calmUntil: -Infinity, gpuUntil: -Infinity, darkUntil: -Infinity },
    flourish: null,
    rand,
    notes: [],
  }
}

const note = (s, msg) => s.notes.push(`${s.t.toFixed(0)}s ${msg}`)

// Hand-over. Returns the set of knobs the pilot may write this tick.
const observe = (s, live) => {
  const owned = new Set()
  for (let n = 1; n <= 16; n++) {
    const k = s.knobs[n]
    const v = live[n]
    if (k.written != null && Math.abs(v - k.written) > TOUCH && s.t >= k.yieldUntil) note(s, `yield K${n} ${NAMES[n]} (hand ${k.written.toFixed(2)}→${v.toFixed(2)})`)
    if (k.written != null && Math.abs(v - k.written) > TOUCH) {
      s.ev.lastHand = s.t
      k.yieldUntil = s.t + YIELD_SECS
      k.written = null
    }
    if (Math.abs(v - k.seen) > 0.002 && s.t < k.yieldUntil) {
      k.yieldUntil = s.t + YIELD_SECS
      s.ev.lastHand = s.t
    }
    k.seen = v
    if (s.t < k.yieldUntil || s.t < k.engageAt) {
      k.value = v
      continue
    }
    if (k.written == null) k.value = v
    owned.add(n)
  }
  return owned
}

const events = (s, f, owned) => {
  const ev = s.ev
  const dropEdge = f.cs_drop > 0.5 && ev.prevDrop <= 0.5 && s.t - ev.lastDrop > DROP_REFRACTORY
  const shiftEdge = f.cs_shift > 0.55 && ev.prevShift <= 0.55 && s.t - ev.lastShift > SHIFT_REFRACTORY
  ev.prevDrop = f.cs_drop
  ev.prevShift = f.cs_shift

  if (shiftEdge) {
    ev.lastShift = s.t
    ev.shifts += 1
    s.place = placeFor(s.rand, s.coaster)
    s.geoTau = 16
    s.hueKick = 0.08
    note(s, `section change (flux/entropy shift ${f.cs_shift.toFixed(2)}) -> new place X${s.place[1].toFixed(2)} Y${s.place[2].toFixed(2)} zoom${s.place[4].toFixed(2)} power${s.place[6].toFixed(2)} curl${s.place[8].toFixed(2)}`)
  }

  const quietNow = f.cs_presence > 0.5 && s.sm.quiet < -0.35 && f.cs_build < 0.1
  if (quietNow && !ev.breakdown) note(s, `breakdown (energy z ${s.sm.quiet.toFixed(2)}) -> opening up: zoom out, body low`)
  if (!quietNow && ev.breakdown) note(s, 'breakdown over')
  ev.breakdown = quietNow

  if (!dropEdge) return
  ev.lastDrop = s.t
  ev.drops += 1
  ev.spotUntil = s.t + 4
  const move = ev.drops % 3
  if (move !== 2 && owned.has(5) && s.knobs[5].value < FLOURISH_MAX) {
    s.flourish = { to: s.knobs[5].value + FLOURISH }
    note(s, `drop #${ev.drops} -> scratch flourish K5 +${FLOURISH} (one way)`)
  }
  if (move !== 1) {
    ev.plungeUntil = s.t + 6
    note(s, `drop #${ev.drops} -> zoom plunge`)
  }
  if (s.voyage === 'fly') {
    s.voyageKick = VOYAGE_PER_WAYPOINT * 0.5
    note(s, `drop #${ev.drops} -> voyage jumps half a waypoint forward`)
  }
  s.place = { ...s.place, 6: clamp(s.place[6] + 0.15 - s.rand() * 0.3, 0.05, 0.75), 8: clamp(s.place[8] + 0.2 - s.rand() * 0.4, 0.05, 0.7) }
}

const smooth = (s, f, dt) => {
  const sm = s.sm
  sm.flux = ease(sm.flux, f.spectralFluxNormalized, dt, 3)
  sm.bass = ease(sm.bass, f.bassNormalized * f.cs_presence, dt, 1.5)
  sm.crest = ease(sm.crest, f.spectralCrestNormalized, dt, 2.5)
  sm.treble = ease(sm.treble, Math.max(f.trebleNormalized, f.cs_kick), dt, 1)
  sm.kurt = ease(sm.kurt, f.spectralKurtosisNormalized, dt, 3)
  sm.lace = ease(sm.lace, 0.5 * f.midsNormalized + 0.5 * f.spectralSpreadNormalized, dt, 2.5)
  sm.entropy = ease(sm.entropy, f.spectralEntropyNormalized, dt, 3)
  sm.quiet = ease(sm.quiet, clamp(f.energyZScore, -1, 1), dt, 4)
  // Tonal motion: how far the slow key moved, folded round the pitch circle.
  if (sm.pitch != null) {
    const d = Math.abs(f.pitchClassMedian - sm.pitch)
    sm.tonal = ease(sm.tonal, Math.min(d, 1 - d) / dt, dt, 6)
  }
  sm.pitch = f.pitchClassMedian
}

const geometryTargets = (s, f) => {
  const g = { ...s.place }
  g[8] = clamp(g[8] + 0.35 * f.cs_build, 0, 0.9)
  g[6] = clamp(g[6] + 0.3 * f.cs_build, 0, 0.9)
  const straight = s.coaster ? 0.5 : null
  if (s.ev.breakdown) Object.assign(g, { 4: 0.08, 7: 0.05, 1: straight ?? Math.min(g[1], 0.2), 2: straight ?? Math.min(g[2], 0.2) })
  if (s.t < s.ev.plungeUntil) g[4] = g[4] + 0.2
  if (s.t < s.guard.darkUntil) Object.assign(g, { 1: straight ?? 0.15, 2: straight ?? 0.15, 4: Math.min(g[4], 0.2) })
  const zoomCap = s.t < s.guard.gpuUntil ? 0.4 : ZOOM_CAP
  g[4] = clamp(g[4], 0, zoomCap)
  const [lo, hi] = s.coaster ? [0.5 - STEER_SPAN, 0.5 + STEER_SPAN] : [0, PAN_MAX]
  g[1] = clamp(g[1], lo, hi)
  g[2] = clamp(g[2], lo, hi)
  return g
}

const lightTargets = (s, f) => {
  const sm = s.sm
  const l = {
    10: 0.2 + 0.6 * sm.entropy,
    11: 0.1 + 0.3 * sm.flux,
    12: 0.3 + 0.5 * sm.bass,
    13: 0.35 * sm.crest,
    14: 0.2 + 0.4 * sm.treble,
    15: 0.05 + 0.25 * sm.kurt + (s.t < s.ev.spotUntil ? 0.3 : 0),
    16: 0.25 + 0.45 * sm.lace,
  }
  return l
}

// GPU: TRAILS and ZOOM both high halved the frame rate (0.89 + 1.0 → 30 fps on 2026-11-22).
const trailsCap = (s) => {
  const zoom = s.knobs[4].value
  const cap = zoom > 0.35 ? 0.45 : 0.6
  return s.t < s.guard.gpuUntil ? Math.min(cap, 0.25) : cap
}

// Meter guard, fed every ~10 s. Returns nothing; sets guard windows.
export const meter = (s, m) => {
  if (m.flicker > 0.7 && s.t - s.ev.lastHand < HAND_EXPLAINS) note(s, `meter flicker ${m.flicker}: a hand moved, not the pilot`)
  if (m.flicker > 0.7 && s.t - s.ev.lastHand >= HAND_EXPLAINS) {
    s.guard.calmUntil = s.t + 30
    note(s, `meter flicker ${m.flicker} > 0.7 -> holding light, geometry 3x slower for 30 s`)
  }
  if (m.lumMin < 0.06) {
    s.guard.darkUntil = s.t + 30
    s.guard.calmUntil = s.t + 30
    note(s, `meter lumMin ${m.lumMin} < 0.06 -> recentre, zoom out`)
  }
  if (m.jankMed > 20) {
    s.guard.gpuUntil = s.t + 60
    note(s, `frame time ${m.jankMed} ms -> lowering trails and zoom`)
  }
}

// One tick. live: {1..16: number}, f: the FEATURES. Returns { writes: {n: value} } for owned knobs.
export const step = (s, f, live, dt) => {
  s.t += dt
  const owned = observe(s, live)
  smooth(s, f, dt)
  events(s, f, owned)

  const calm = s.t < s.guard.calmUntil
  const slow = calm ? 3 : 1
  const opening = n => Math.max(1, s.t < s.knobs[n].engageAt + ENGAGE_SECS ? ENGAGE_TAU : 1)
  const geo = geometryTargets(s, f)
  const plunging = s.t < s.ev.plungeUntil
  for (const n of GEOMETRY) {
    const tau = Math.max((n === 4 && plunging ? 1.5 : s.geoTau) * slow, opening(n))
    s.knobs[n].value = ease(s.knobs[n].value, geo[n], dt, tau)
  }
  s.geoTau = ease(s.geoTau, 14, dt, 30)

  if (s.voyage === 'fly') {
    const pace = 0.6 + 1.2 * clamp(f.cs_presence * (0.5 + 0.5 * clamp(f.energyZScore, -1, 1)), 0, 1)
    const kick = s.voyageKick ? s.voyageKick * (1 - Math.exp(-dt / 3)) : 0
    if (s.voyageKick) s.voyageKick -= kick
    if (s.voyageKick < 1e-4) s.voyageKick = 0
    const next = Math.min(0.999, s.knobs[3].value + (VOYAGE_PER_WAYPOINT / LEG_SECS) * pace * dt + kick)
    if (next >= 0.999 && s.knobs[3].value < 0.999) note(s, 'voyage reached the end of the loop (home) -> holding there')
    s.knobs[3].value = next
  }

  if (s.flourish) {
    s.knobs[5].value = ease(s.knobs[5].value, s.flourish.to, dt, 0.5)
    if (s.flourish.to - s.knobs[5].value < 0.001) s.flourish = null
  }

  const light = lightTargets(s, f)
  light[11] = Math.min(light[11], trailsCap(s))
  // Calm holds the light where it is: easing every light knob toward a new value at once is itself a flicker.
  if (!calm) for (const n of Object.keys(light)) s.knobs[n].value = ease(s.knobs[n].value, light[n], dt, Math.max(n === '14' ? 1 : 2, opening(n)))
  // The GPU cap holds even while calm: a slow wall is worse than a held one.
  if (calm && s.knobs[11].value > light[11]) s.knobs[11].value = ease(s.knobs[11].value, light[11], dt, ENGAGE_TAU)

  // HUE: a slow one-way creep that speeds up with tonal motion and section changes; it bounces
  // at the ends of the dial because a wrap 1→0 would sweep the whole wheel through the knob ease.
  const hueRate = 1 / 400 + clamp(s.sm.tonal, 0, 0.05) * 0.5 + (s.hueKick ? 0.02 : 0)
  if (s.hueKick) s.hueKick = Math.max(0, s.hueKick - 0.02 * dt)
  let hue = s.knobs[9].value + s.hueDir * hueRate * dt
  if (hue > 0.97 || hue < 0.03) s.hueDir *= -1
  s.knobs[9].value = clamp(hue, 0.03, 0.97)

  const writes = {}
  for (const n of owned) {
    if (n === 3 && s.voyage !== 'fly') continue
    if (n === 5 && !s.flourish && s.knobs[5].written == null) continue
    const v = +s.knobs[n].value.toFixed(4)
    if (s.knobs[n].written != null && Math.abs(v - s.knobs[n].written) < 0.0005) continue
    writes[n] = v
    s.knobs[n].written = v
  }
  return { writes }
}

export const takeNotes = (s) => s.notes.splice(0)
