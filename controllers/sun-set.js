// sun-set — replays the user's dial journey from the 2026-10-09/10 show, beat by beat.
// Chain it AFTER the story controller: ?controller=black-sun&controller=sun-set
//
// Each beat holds the knob vectors the user actually had at moments of that era (dial RELEASE lines
// from watch-dials, the fork .md tables, the 01:50 boot URL — see .claude/skills/sun-set/JOURNEY.md).
// span is the beat's real length on the night in minutes (JOURNEY.md, 259 in all). The set is scaled
// to sunset_minutes (default 45): each beat holds its share of that, never under 90 s, and its era's
// real dial timeline plays at the same scaled speed. Every knob eases toward the current
// keyframe with a ~20 s time constant, so nothing jumps. K5 STORY is the exception: it steps, because
// easing it would sweep through every act in between and fire stories the music never earned.
//
// Knobs reach the shader by precedence: controller outputs < URL < manualFeatures < messageParams.
// A controller output would lose to the boot URL and to every dial, so this writes manualFeatures,
// the layer MIDI writes. A value there that isn't the one written last frame is a hand on a dial:
// from then on that knob is the user's for the rest of the set, across beats. Changing
// sunset_hands_reset (any new number) hands every touched knob back to the replay, eased from where
// the hand left it.
//
// Inputs: sunset_beat (1-based; 0 or absent = idle, touches nothing), sunset_minutes (total set
// length, default 45), sunset_auto_story (1 = leave K5/K6 to the music), sunset_hands_reset. swap.mjs
// sets the beat; ?sunset_beat=N in the URL jumps at boot.
// State lives on window.__sunSetState, so a hot swap of this file resumes.

const TAU = 20
const EPS = 1e-4
const STEP = new Set(['knob_5'])
const FREE = ['knob_5', 'knob_6']
const MINUTES = 45
const HOLD_MIN = 90

// [seconds into the era, [K1..K16]]. K1 is 0 throughout: black-sun reads K1 ≥ 0.5 as the TRIP story.
const PARTY = [0, 0.81, 0.4, 1, 0.54, 0.2, 0.71, 1, 1, 0.28, 0.16, 0.06, 1, 0.27, 0.56, 0.37]
const FAN = [0, 1, 1, 0.425, 0, 0.984, 0, 0, 0.567, 0.724, 0.921, 0.512, 0, 0.795, 0, 0.425]
export const BEATS = [
  { name: 'pre-party', span: 41, keys: [
    [0, [0, 0, 0.17, 0.14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],                          // 20:20:59 "This was very beautiful so far."
    [176, [0, 0.98, 0.59, 0, 0.61, 0.28, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]],                  // 20:23:55
    [755, [0, 0.67, 0.66, 0, 0.61, 1, 1, 0, 0, 0.26, 0, 0, 0, 0, 0, 0]],                  // 20:33:34
    [1130, [0, 0.62, 0.61, 1, 0.61, 1, 1, 1, 0, 0.26, 0.41, 0.27, 1, 0, 0.75, 1]],        // 20:39:49
    [1433, PARTY],                                                                         // 20:44:52
  ] },
  { name: 'orbit', span: 7, keys: [
    [0, PARTY],                                                                            // 21:00 (no releases 20:45–21:15)
    [958, [0, 0.97, 0.99, 1, 0.46, 1, 0.78, 0.28, 0.93, 0.58, 0.73, 0.24, 0.56, 0.57, 0.56, 0.43]],  // 21:15:58
  ] },
  { name: 'fractal-sky', span: 19, keys: [
    [0, [0, 0.929, 1, 0.339, 0.669, 1, 0.772, 0.417, 0.717, 0, 0.551, 0.811, 1, 0, 0.654, 0.898]],  // 21:58 sun/10.md
  ] },
  { name: 'sun-cast', span: 20, keys: [
    [0, [0, 0.717, 0.551, 1, 0.961, 0.661, 0, 0.803, 0, 0.165, 0.803, 1, 0.331, 0.173, 0.039, 0.291]],  // 22:20 sun/11.md
  ] },
  { name: 'painterly', span: 16, keys: [
    [0, [0, 0.43, 1, 0.56, 0.49, 0.96, 0.9, 0.89, 0, 0, 0.21, 0.76, 0.64, 0.72, 0.8, 0.45]],       // 22:25:52
    [170, [0, 0.06, 0.95, 0.36, 0, 0.17, 0.92, 0.89, 0.46, 1, 1, 0.9, 0.11, 0.43, 0.8, 0.84]],     // 22:28:42
    [472, [0, 0.57, 0.72, 0.19, 0.26, 0.06, 0.65, 0.92, 0.54, 1, 0.96, 0.26, 0.2, 0.57, 0.8, 0.79]],  // 22:33:44
    [687, [0, 0.51, 0.72, 0.59, 0.12, 0, 0.38, 0.91, 0.61, 1, 0.95, 0.27, 0.2, 0.58, 0.86, 0.56]],  // 22:37:19
  ] },
  { name: 'sun-surface', span: 7, keys: [
    [0, [0, 0, 0.04, 0.41, 0.1, 0.19, 0.38, 1, 0.87, 0.69, 0.73, 1, 0.51, 0.35, 0.53, 0.39]],      // 22:38:58
    [229, [0, 0, 0.05, 0.58, 0.07, 0, 0.5, 0.59, 0.39, 0.85, 1, 1, 0.11, 0.26, 0.06, 0.76]],       // 22:42:47
    [302, [0, 0, 0.05, 0.58, 0.07, 0.36, 0.5, 0.59, 0, 0.85, 0.87, 0.94, 0.11, 0.54, 0.12, 0.97]],  // 22:44 ≈ sun/13.md
  ] },
  { name: 'julia-arms', span: 21, keys: [
    [0, [0, 0.4, 0.37, 1, 0.69, 1, 1, 1, 0.26, 1, 1, 1, 0.16, 1, 0.83, 0.4]],                     // 23:31:44 "…julia sets…"
    [215, [0, 0.03, 0.37, 0.6, 0.27, 0.67, 0.98, 0.75, 0.57, 0.8, 0.73, 0.96, 0, 0.81, 0.31, 0]],  // 23:35:19
    [374, [0, 0.03, 0.37, 0.69, 1, 0.84, 0.97, 1, 0.33, 0.8, 0.28, 1, 0.02, 0.26, 0.52, 0.42]],    // 23:37:58
    [470, [0, 0.19, 0.5, 0.7, 0, 0.2, 0.48, 1, 0.26, 0.53, 0.6, 0.5, 0.02, 0.29, 0.46, 0.42]],     // 23:39:34
    [1204, [0, 0, 0.94, 0.24, 0.7, 0.2, 0.12, 1, 0, 0.53, 0.28, 0.43, 0, 0.52, 0.61, 0.56]],       // 23:51:48
    [1463, [0, 0.67, 0.8, 0.05, 0.96, 0.87, 0.1, 0, 0.74, 0.44, 0.31, 0.89, 0.02, 0.52, 0.61, 0.93]],  // 23:56:07
  ] },
  { name: 'giant', span: 40, keys: [
    [0, [0, 0.44, 0.18, 0, 0, 0.69, 0, 0.37, 0.49, 0.72, 0.92, 0.61, 0.49, 0.43, 0.53, 0.35]],     // 00:39:26
    [409, [0, 0.44, 0, 0.76, 0, 0.69, 0, 0.08, 0.49, 0.72, 0.92, 0.78, 0.49, 0.43, 0.53, 0.35]],   // 00:46:15
    [2194, [0, 0.53, 0, 0.76, 0, 0.69, 0, 0.08, 0.49, 0.72, 0.92, 0.78, 0.49, 0.43, 0.53, 0.35]],  // 01:16 sun/14.md
  ] },
  { name: 'fan-root', span: 59, keys: [
    [0, [0, 0.06, 0.39, 1, 0.46, 0.24, 0, 0.13, 0.06, 0.72, 0.79, 0.24, 0.49, 0.72, 0.53, 0.16]],  // 01:17:25 the new dial map
    [81, [0, 1, 0.43, 1, 0.77, 0.86, 0, 0, 0.06, 0.72, 0.79, 0.83, 0.93, 1, 0, 0.48]],             // 01:18:46
    [198, [0, 1, 1, 0.43, 0.79, 1, 0, 0, 0.57, 0.72, 0.79, 0.51, 1, 1, 0, 0.43]],                  // 01:20:43
    [2915, FAN],                                                                                    // 02:06 sun/15.md
  ] },
  { name: 'kiss', span: 5, keys: [[0, FAN]] },        // 02:16 sun/16.md, same dials
  { name: 'transit', span: 4, keys: [[0, FAN]] },     // 02:21 sun/17.md, same dials
  { name: 'audio-web', span: 4, keys: [[0, FAN]] },   // no dial data after 02:06: last known
  { name: 'og-sky', span: 16, keys: [[0, FAN]] },
]
const NIGHT = BEATS.reduce((sum, b) => sum + b.span, 0)
const holdOf = (beat, minutes) => Math.max(HOLD_MIN, beat.span / NIGHT * minutes * 60)
for (const b of BEATS) b.hold = Math.round(holdOf(b, MINUTES))   // the default holds, for swap.mjs list and auto

const targetAt = (keys, t) => keys.reduce((cur, [at, v]) => at <= t ? v : cur, keys[0][1])

export function make() {
  const S = window.__sunSetState ??= { beat: 0, t0: 0, last: 0, out: {}, hands: {}, reset: undefined }
  return (f) => {
    const now = performance.now() / 1000
    const n = Math.round(f.sunset_beat ?? 0)
    const beat = BEATS[n - 1]
    if (!beat) return {}
    if (n !== S.beat) Object.assign(S, { beat: n, t0: now, last: now })
    if (f.sunset_hands_reset !== S.reset) Object.assign(S, { reset: f.sunset_hands_reset, hands: {} })
    const dt = Math.min(Math.max(now - S.last, 0), 0.25)
    S.last = now
    const era = beat.keys.at(-1)[0]
    const minutes = f.sunset_minutes > 0 ? f.sunset_minutes : MINUTES
    const target = targetAt(beat.keys, (now - S.t0) * era / holdOf(beat, minutes))
    const m = window.cranes.manualFeatures
    const ease = 1 - Math.exp(-dt / TAU)
    target.forEach((v, i) => {
      const k = `knob_${i + 1}`
      if (f.sunset_auto_story && FREE.includes(k)) return
      if (S.out[k] !== undefined && m[k] !== undefined && Math.abs(m[k] - S.out[k]) > EPS) S.hands[k] = true
      if (S.hands[k]) {
        S.out[k] = m[k]
        return
      }
      const from = S.out[k] ?? m[k] ?? f[k] ?? 0
      const next = STEP.has(k) ? v : from + (v - from) * ease
      m[k] = next
      S.out[k] = next
    })
    return {}
  }
}
