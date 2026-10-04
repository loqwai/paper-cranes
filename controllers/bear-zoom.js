/**
 * bear-zoom — a ratcheting zoom gate on the LOWEST wavelet band (claude/wip/bear/4).
 *
 * Load AFTER wavelet-ease: ?wavelet=true&controller=wavelet-ease&controller=bear-zoom
 *
 * waveletBand0 is the lowest DWT detail band (43-86 Hz: src/audio/dwt.js reverses the octave
 * list so band0 = deep bass). Its z-score is only ever an EVENT, never a scale: a rising
 * crossing of ARM steps the zoom one notch (up to MAX_NOTCH). The gate re-arms once z falls back
 * under REARM, and a refractory stops one surge from stepping twice.
 *
 * COUNTER-RATCHET (same controller, by design): the slope of the EMA-smoothed band0 z-score, a
 * least-squares fit over the last SLOPE_WIN_S seconds. The built-in *Slope features read 0 on mic
 * input, so it is derived here. When the slope turns down past SLOPE_DOWN a cooldown starts; a new
 * surge or the slope rising past SLOPE_RECOVER cancels it, and if it runs COOL_S the ratchet drops
 * back to notch 0 (normal zoom), then refuses new steps for LOCKOUT_S so it cannot flap in-out-in. A
 * notch that sees no new surge for IDLE_S also starts cooling, so a plateau can never pin the zoom in.
 *
 * Calibrated on 150 s of live mic music at 144 fps (2026-09-11): band0 z p50 -0.07, p90 0.43, p95 0.61,
 * p99 0.90, jitter 0.045/frame. Replaying this logic over that trace: ~12 steps/min, ~6 releases/min,
 * median hold 2.2 s (p90 4.8 s), zoomed ~40% of the time, no release->step inside 1 s. ARM 0.55 held
 * the zoom in ~80% of the time (every kick); a 1.6 s slope window held it 65-80%.
 *
 * WHAT YOU GET (declare each as `uniform float <name>;`)
 *   bearZoom         0..1, critically-damped spring: in over ~0.35 s, back out over ~1.3 s
 *   bearZoomNotch    0..MAX_NOTCH, the ratchet position (debug)
 *   bearZoomCooling  1 while a cooldown is running (debug)
 * window.__bearZoomLog keeps the last LOG_MAX events { t, ev, z, slope, notch } for timelines;
 * window.__bearZoomState is the live { z, zEma, slope, notch, cooling, zoom }.
 */

const ARM = 0.8               // band0 z-score that counts as a low-end surge (~p98 live)
const REARM = 0.2             // must fall back under this before the next surge can step
const REFRACTORY_S = 0.35
const MAX_NOTCH = 3
const Z_TAU_S = 0.12          // EMA on z before the slope fit (kills per-frame jitter)
const SLOPE_WIN_S = 1.0
const SLOPE_DOWN = -0.3       // z-units per second
const SLOPE_RECOVER = 0.15
const COOL_S = 0.8
const LOCKOUT_S = 1.5         // no new step this long after a release
// No cooldown may start this soon after a surge. The 1 s slope fit has not seen the surge yet, and live
// the cooldown was restarting on the very frame the surge cancelled it, releasing fresh notches early.
const SURGE_GRACE_S = 0.5
const IDLE_S = 10
const IN_OMEGA = 13.5         // critically damped settles ~95% in 4.74 / omega seconds
const OUT_OMEGA = 3.6
const LOG_MAX = 200

// least-squares slope of [t, v] pairs, times taken relative to the first sample for precision
const fitSlope = (samples) => {
    const n = samples.length
    if (n < 3) return 0
    const t0 = samples[0][0]
    let st = 0, sv = 0, stt = 0, stv = 0
    for (const [t, v] of samples) {
        const x = t - t0
        st += x; sv += v; stt += x * x; stv += x * v
    }
    const den = n * stt - st * st
    return den > 1e-9 ? (n * stv - st * sv) / den : 0
}

export const make = () => {
    let lastT = performance.now() / 1000
    let zEma = 0
    const samples = []
    let notch = 0
    let armed = true
    let lastSurgeT = -Infinity
    let lastReleaseT = -Infinity
    let cooling = false
    let coolT = 0
    const zoom = { pos: 0, vel: 0 }
    const log = window.__bearZoomLog = []
    const state = window.__bearZoomState = {}

    const note = (t, ev, z, slope) => {
        log.push({ t: +t.toFixed(3), ev, z: +z.toFixed(3), slope: +slope.toFixed(3), notch })
        if (log.length > LOG_MAX) log.shift()
    }

    return (features) => {
        const now = performance.now() / 1000
        const dt = Math.min(0.05, now - lastT)
        lastT = now
        const z = features.waveletBand0ZScore ?? 0

        zEma += (z - zEma) * (1 - Math.exp(-dt / Z_TAU_S))
        samples.push([now, zEma])
        while (samples.length && now - samples[0][0] > SLOPE_WIN_S) samples.shift()
        const slope = fitSlope(samples)

        // RATCHET: rising crossing with hysteresis + refractory
        if (!armed && z < REARM) armed = true
        if (armed && z > ARM && now - lastSurgeT > REFRACTORY_S && now - lastReleaseT > LOCKOUT_S) {
            armed = false
            lastSurgeT = now
            if (cooling) { cooling = false; note(now, 'cool-cancel', z, slope) }
            const stepped = notch < MAX_NOTCH
            if (stepped) notch++
            note(now, stepped ? 'step' : 'surge', z, slope)
        }

        // COOLDOWN: the slope turning down (or a long idle) walks the ratchet back to normal zoom
        const idle = now - lastSurgeT > IDLE_S
        if (notch > 0 && !cooling && now - lastSurgeT > SURGE_GRACE_S && (slope < SLOPE_DOWN || idle)) {
            cooling = true
            coolT = 0
            note(now, 'cool-start', z, slope)
        }
        if (cooling && !idle && slope > SLOPE_RECOVER) {
            cooling = false
            note(now, 'cool-cancel', z, slope)
        }
        if (cooling) {
            coolT += dt
            if (coolT >= COOL_S) {
                notch = 0
                cooling = false
                lastReleaseT = now
                note(now, 'release', z, slope)
            }
        }

        // OUTPUT: critically-damped spring, quick in, slow out
        const target = notch / MAX_NOTCH
        const omega = target > zoom.pos ? IN_OMEGA : OUT_OMEGA
        zoom.vel += (omega * omega * (target - zoom.pos) - 2 * omega * zoom.vel) * dt
        zoom.pos += zoom.vel * dt
        const bearZoom = Math.min(1, Math.max(0, zoom.pos))

        Object.assign(state, { z, zEma, slope, notch, cooling, zoom: bearZoom })
        return { bearZoom, bearZoomNotch: notch, bearZoomCooling: cooling ? 1 : 0 }
    }
}
