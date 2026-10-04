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
//
// Chainable: ?controller=rezz-ratchet

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const smoothstep = (a, b, x) => {
    const t = clamp01((x - a) / (b - a))
    return t * t * (3 - 2 * t)
}
const ease = (cur, target, tau, dt) => cur + (target - cur) * (1 - Math.exp(-dt / tau))
const envelope = (cur, target, attack, release, dt) => ease(cur, target, target > cur ? attack : release, dt)

export const make = () => {
    const phase = { flow: 0, drive: 0, spin: 0, morph: 0 }
    const env = { gate: 0, energy: 0, bass: 0, mids: 0, kick: 0, midsBody: 0, hit: 0 }
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

        // the ratchet: rate >= floor > 0, so every phase strictly increases
        phase.flow += (0.10 + 0.14 * env.energy) * dt
        phase.drive += (0.18 + 0.10 * env.energy) * dt
        phase.spin += (0.010 + 0.025 * env.bass) * dt
        phase.morph += (0.012 + 0.03 * env.mids) * dt

        return {
            rezzFlow: phase.flow,
            rezzDrive: phase.drive,
            rezzSpin: phase.spin,
            rezzMorph: phase.morph,
            rezzKick: env.kick,
            rezzMids: env.midsBody,
            rezzHit: env.hit,
            rezzGate: g,
        }
    }
}
