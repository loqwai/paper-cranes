// clit-pilot: the show's autopilot (scripts/show/pilot.js) flying the clit-set coaster inside the page,
// for a phone with no knobs and no CDP loop (the NFC stickers). Chain it BEFORE clit-set:
//
//   ?shader=clit-set/2&controller=clit-pilot&controller=clit-set&coaster=1&wavelet=true
//
// It reads clit-set's cs_* events (drop, shift, build, kick, presence) from the previous frame, which
// flattenFeatures carries in controllerFeatures, and returns knob_1..knob_16 for clit-set to ease:
// THROTTLE (k4) and STEER (k1/k2) in coaster mode, the shape knobs, and the light knobs.
//
// Knobs baked into the URL are where the ride starts. A knob the page's own channels move later (MIDI,
// the remote, the vjpad) is a hand: the brain yields it for YIELD_SECS, exactly as the CLI pilot does.
import { init, step, setCoaster, FEATURES } from './pilot-brain.js'

const KNOBS = 16
const MOVED = 0.002
const CARVE = 1   // pan units per unit of steer offset at which the centring spring balances the carve
const num = x => Number.isFinite(x) ? x : 0
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

export function make() {
  let s = null
  let prev = null
  let last = null
  const ours = {}   // what this stage returned last frame: it comes back as the base unless a URL or hand outranks it
  return (f) => {
    const now = performance.now() / 1000
    const dt = last === null ? 1 / 60 : Math.min(Math.max(now - last, 0), 0.25)
    last = now

    const base = {}
    for (let n = 1; n <= KNOBS; n++) base[n] = Number.isFinite(f[`knob_${n}`]) ? f[`knob_${n}`] : 0
    const coaster = (f.coaster ?? 0) > 0.5
    // STEER (k1/k2) is a rate centred on 0.5: an unset 0 glided up to 0.5 through "hard over" and
    // pinned the ride on the track's wall before the first section change. Start straight.
    if (!s && coaster) for (const n of [1, 2]) if (base[n] === 0) base[n] = 0.5
    if (!s) {
      // stagger off: a sticker tap has seconds, not the wall's 45 s opening, to show the ride
      s = init(base, 1 + Math.floor((Number.isFinite(f.seed) ? f.seed : 0.5) * 100000), null, { stagger: false, coaster })
      prev = base
    }
    setCoaster(s, coaster)

    // The base value of a knob the pilot drives is its own last write (controllerFeatures) or a constant
    // URL bake; only a change that is neither is a hand.
    const live = {}
    for (let n = 1; n <= KNOBS; n++) {
      const written = s.knobs[n].written
      const hand = Math.abs(base[n] - prev[n]) > MOVED && Math.abs(base[n] - (ours[n] ?? base[n] + 1)) > MOVED
      live[n] = hand || written == null ? base[n] : written
    }
    prev = base

    const feats = {}
    for (const k of FEATURES) feats[k] = Number.isFinite(f[k]) ? f[k] : 0
    step(s, feats, live, dt)

    const out = {}
    for (let n = 1; n <= KNOBS; n++) out[`knob_${n}`] = s.knobs[n].value
    // The brain holds a steer until the next section change, and a held rate always ends on the wall
    // (cs_cx 1.37 on the phone: black screen). Unattended, steer back toward the centre in proportion to
    // the pan, so a carve settles about CARVE x its offset from straight instead of on the wall.
    // A knob the hand holds is left exactly as the hand set it.
    if (coaster) {
      const pan = { 1: num(f.cs_panX), 2: num(f.cs_panY) }
      for (const n of [1, 2]) if (s.t >= s.knobs[n].yieldUntil) out[`knob_${n}`] = clamp(s.knobs[n].value - pan[n] / CARVE, 0.2, 0.8)
    }
    for (let n = 1; n <= KNOBS; n++) ours[n] = out[`knob_${n}`]
    return out
  }
}
