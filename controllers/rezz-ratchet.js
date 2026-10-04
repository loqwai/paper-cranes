// rezz-ratchet — monotonic clocks + smoothed envelopes for moody-octopus/rezz-1.
//
// The arm fractal flickered because audio was pushing texture coordinates and fractal
// parameters BACK AND FORTH every frame (raw Normalized/z on width, size, coil, flex, brightness).
// This controller is the ratchet: every phase only ever moves forward. Audio can change how FAST
// it moves (rate >= a positive floor), never where it is. Transients are shaped into
// fast-attack / slow-release envelopes before they touch anything.
//
//   rezzFlow   texture streams along the arm         rate 0.10 + 0.14 * energy
//   rezzDrive  bands stream out from the centre      rate 0.18 + 0.10 * energy
//   rezzSpin   per-level fold twist                  rate 0.010 + 0.025 * bass
//   rezzMorph  slow hex/ring shape cycle             rate 0.012 + 0.03 * mids
//   rezzKick   bass kick envelope (attack 30ms, release 220ms)   -> flex, rims, eye
//   rezzMids   mids body envelope (tau 350ms)                    -> texture brightness
//   rezzHit    flux hit envelope (attack 20ms, release 300ms)    -> texture flash
//   rezzGate   smoothed quiet gate (tau 400ms)
//   rezzBuild  section build 0..1: 3s energy envelope vs its 45s average, eased (tau 1.5s)
//   rezzDetail / rezzDetailSpin  fine-fold crawl + twist clocks (flux hits / centroid trend set the RATE)
//   rezzGrit (roughness) rezzDepth (entropy) rezzSharp (crest) rezzAir (treble) rezzTrend (centroid
//              slope*rSquared): smoothed envelopes for the fine lattice, amplitude only
//   rezzScene  AUTOPILOT clock: +1 per scene (~60s, a bit faster when loud). The shader crossfades
//              between per-scene preset looks with smootherstep, so the picture keeps evolving.
//
// Chainable: ?controller=rezz-ratchet

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const smoothstep = (a, b, x) => {
    const t = clamp01((x - a) / (b - a))
    return t * t * (3 - 2 * t)
}
const ZOOM_WRAP = 101 / 1.6                                  // 101 spiral periods in log r
const ZOOM_TEX = (4 * 1.6 * Math.PI * Math.PI) / ZOOM_WRAP   // texture shift per unit zoom: 4 fold periods per wrap
const ease = (cur, target, tau, dt) => cur + (target - cur) * (1 - Math.exp(-dt / tau))
const envelope = (cur, target, attack, release, dt) => ease(cur, target, target > cur ? attack : release, dt)

export const make = () => {
    // scene starts at a random point so each load opens on a different look
    const phase = { flow: 0, drive: 0, spin: 0, morph: 0, scene: Math.floor(Math.random() * 97), detail: 0, detailSpin: 0 }
    const env = {
        gate: 0, energy: 0, bass: 0, mids: 0, kick: 0, midsBody: 0, hit: 0, short: 0, long: 0, build: 0,
        grit: 0, depth: 0, sharp: 0, air: 0, trend: 0, trendScale: 0,
    }
    let lastT = performance.now() / 1000

    return (features) => {
        const now = performance.now() / 1000
        const dt = Math.min(0.05, Math.max(0, now - lastT))
        lastT = now

        // raw energy is the only feature that is truly 0 before the mic connects
        // (Normalized reads 0.5 and ZScore 1.0 in that state), so it gates everything
        const gateNow = smoothstep(0.003, 0.008, features.energy ?? 0)
        env.gate = ease(env.gate, gateNow, 0.4, dt)
        const g = env.gate

        env.energy = ease(env.energy, g * (features.energyNormalized ?? 0), 1.0, dt)
        env.bass = ease(env.bass, g * (features.bassNormalized ?? 0), 0.6, dt)
        env.mids = ease(env.mids, g * (features.midsNormalized ?? 0), 0.6, dt)

        const kickTarget = g * smoothstep(0.40, 0.75, features.bassNormalized ?? 0)
        env.kick = envelope(env.kick, kickTarget, 0.03, 0.22, dt)
        env.midsBody = ease(env.midsBody, g * smoothstep(0.45, 0.95, features.midsNormalized ?? 0), 0.35, dt)
        const hitTarget = g * smoothstep(0.30, 1.0, features.spectralFluxZScore ?? 0)
        env.hit = envelope(env.hit, hitTarget, 0.02, 0.30, dt)

        // section build: raw energy (not Normalized, whose history window re-centres it) over a 3s
        // envelope vs a 45s one. Loud relative to the recent set -> build. Eased so it never steps.
        const rawE = g * (features.energy ?? 0)
        // seed both from the first real reading, or a reload starts in a fake 45s "build"
        // (only once the gate is properly open: a near-silent seed made long ~0 and pinned build at 1)
        if (!env.long && g > 0.9) env.short = env.long = rawE
        env.short = ease(env.short, rawE, 3.0, dt)
        env.long = ease(env.long, rawE, 45.0, dt)
        const buildTarget = smoothstep(1.0, 1.5, env.short / Math.max(env.long, 1e-4))
        env.build = ease(env.build, g * buildTarget, 1.5, dt)

        // the ratchet: rate >= floor > 0, so every phase strictly increases
        phase.flow += (0.10 + 0.14 * env.energy) * dt
        phase.drive += (0.18 + 0.10 * env.energy) * dt
        phase.spin += (0.010 + 0.025 * env.bass) * dt
        phase.morph += (0.012 + 0.03 * env.mids) * dt
        phase.scene += (1 / 70 + (1 / 70) * env.build) * dt   // 70s per scene, 35s in a build

        // ── FINE-DETAIL AUDIO (iter22) — one feature per role, different domains, all smoothed ──
        env.grit = ease(env.grit, g * (features.spectralRoughnessNormalized ?? 0), 0.8, dt)   // quality: line grit
        env.depth = ease(env.depth, g * (features.spectralEntropyNormalized ?? 0), 2.0, dt)  // chaos: fold depth reveal
        env.sharp = ease(env.sharp, g * (features.spectralCrestNormalized ?? 0), 1.0, dt)    // peakiness: rim contrast
        env.air = envelope(env.air, g * smoothstep(0.35, 0.85, features.trebleNormalized ?? 0), 0.05, 0.4, dt) // air: violet sparkle
        // confident brightening: centroid slope x rSquared, normalised by its own running magnitude
        const trendRaw = (features.spectralCentroidSlope ?? 0) * (features.spectralCentroidRSquared ?? 0)
        env.trendScale = ease(env.trendScale, Math.abs(trendRaw), 20.0, dt)
        const trendN = Math.max(-1, Math.min(1, trendRaw / (2.5 * env.trendScale + 1e-12)))
        env.trend = ease(env.trend, g * trendN, 2.0, dt)

        // ── BASS ZOOM RATCHET (iter22): forward-only plunge in log-radius. Slow drift + a big surge on
        // every kick (kick envelope: 30ms attack / 220ms release), never reverses.
        // Wrap: the spiral repeats every 1/SPIRAL_TIGHT = 0.625 in log r, the arm fold every 1.6*pi^2 =
        // 15.7914 (= SPIRAL_TIGHT*2pi*2pi / SPIRAL_ARMS at HX_SEAM_N 1). No exact common period, so
        // wrap at 101 spiral periods (63.125) and drive the texture shift 0.064% faster, so one wrap is
        // exactly 4 fold periods (and 4*2^i at every finer level). Seamless, bounded, no float decay.
        // CHANGE THESE if the shader's SPIRAL_TIGHT / SPIRAL_ARMS / HX_SEAM_N change.
        // iter25: STEADY drift only. User: "Don't speed up the actual zooming by the bass." Bass stays on
        // the centre flex / rims / eye.
        phase.zoom = ((phase.zoom ?? 0) + 0.06 * dt) % ZOOM_WRAP

        // ── ARM SPIN RATCHET (iter25): the spiral arms always visibly rotate. Turns/sec, forward-only,
        // rate leaned by ADVANCED features (flux hits + confident centroid brightening), never bass.
        // One full turn = exactly one atan-seam jump (4 spiral periods, 1 fold period), so % 1 is seamless.
        // iter29: bear-move eyeSpin's SHAPE (base + energy + small kick) at much lower coefficients —
        // the user called eyeSpin (~0.43 turns/s) "too fast". ~0.07 turns/s at rest, ~0.18 at peak.
        const armRate = Math.max(0.04, 0.07 + 0.09 * env.energy + 0.02 * env.kick + 0.015 * env.hit)
        phase.armSpin = ((phase.armSpin ?? 0) + armRate * dt) % 1

        // detail clocks: fine fold levels crawl forward; flux hits SURGE the rate, never the position
        phase.detail += (0.25 + 0.9 * env.hit) * dt
        phase.detailSpin += Math.max(0.01, 0.05 + 0.035 * env.trend) * dt

        return {
            rezzFlow: phase.flow,
            rezzDrive: phase.drive,
            rezzSpin: phase.spin,
            rezzMorph: phase.morph,
            rezzKick: env.kick,
            rezzMids: env.midsBody,
            rezzHit: env.hit,
            rezzGate: g,
            rezzBuild: env.build,
            rezzScene: phase.scene,
            rezzArmSpin: phase.armSpin,         // spiral angle, turns (wrapped at 1)
            rezzZoom: phase.zoom,               // spiral log-r shift
            rezzZoomTex: phase.zoom * ZOOM_TEX, // arm-texture log-r shift (wrap-aligned)
            rezzDetail: phase.detail,
            rezzDetailRate: 0.25 + 0.9 * env.hit,   // current rate, for the shader's speed-based LOD
            rezzDetailSpin: phase.detailSpin,
            rezzGrit: env.grit,
            rezzDepth: env.depth,
            rezzSharp: env.sharp,
            rezzAir: env.air,
            rezzTrend: env.trend,
        }
    }
}
