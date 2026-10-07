// black-sun — frame-persistent state for shaders/claude/wip/black-sun/sun-1.frag.
//
// The shader used to fake this state in a "stash row" of the feedback buffer (16-bit values in
// pixels 0..27 of row 0). That reset on every canvas resize and every iTime wrap. Here it is plain
// JS: seconds-based, double precision, and it survives shader hot-swaps.
//
// Chain it LAST:  ?controller=black-sun   (it reads only base audio features)
//
// Outputs (all `uniform float bs_*` in the shader):
//   bs_time               monotonic seconds since load — replaces iTime (no 1000 s wrap)
//   bs_eye                one-way black-hole → eye morph, 0 → 1 over EYE_SECS
//   bs_bass/mids/treb     attack-fast / release-slow envelopes on z-scores (light only)
//   bs_energy/entropy     slow EMAs of the normalized features
//   bs_centroid, bs_pump, bs_drop, bs_flux, bs_rough, bs_crest, bs_roll, bs_kick
//   bs_curl/dir/flex/wave/len/thick   ray shape, from slow stats, eased over ~4 s
//   bs_flow, bs_twist, bs_flexPh, bs_pal   monotonic phase clocks in turns (fract) — the music sets
//                         their RATE; the shader only ever uses integer multiples, so wrap is seamless
//   bs_kAge, bs_kAmp      kick wavefront: age 0 → 1 over 3 s, reset by an onset after a 1.6 s refractory

const EYE_SECS = 180
const FRAME = 1 / 60

const clamp01 = x => Math.min(1, Math.max(0, x))
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
// the shader's per-frame coefficients, made frame-rate independent
const rate = (aPerFrame, dt) => 1 - Math.pow(1 - aPerFrame, dt / FRAME)
const ema = (p, x, a, dt) => p + (clamp01(x) - p) * rate(a, dt)
const envAR = (p, x, att, rel, dt) => { x = clamp01(x); return p + (x - p) * rate(x > p ? att : rel, dt) }
const fract = x => x - Math.floor(x)

export function make() {
  const S = {
    lastT: null, time: 0, eye: 0,
    bass: 0, mids: 0, treb: 0, energy: 0, entropy: 0, centroid: 0.5, pump: 0, drop: 0,
    flux: 0, rough: 0, crest: 0, roll: 0.5, kick: 0,
    curl: 0.5, dir: 0.5, flex: 0.5, wave: 0.5, len: 0.5, thick: 0.5,
    flow: 0, twist: 0, flexPh: 0, pal: 0,
    kAge: 1, kAmp: 0,
  }

  return (f) => {
    const now = performance.now() / 1000
    if (S.lastT === null) S.lastT = now
    let dt = now - S.lastT
    S.lastT = now
    if (!(dt > 0) || dt > 0.1) dt = FRAME

    const gate = smoothstep(0.01, 0.06, f.energyMean)
    S.time += dt
    S.eye = Math.min(1, S.eye + dt / EYE_SECS)

    // light envelopes — z-scores relative to the track, so they swing 0↔1 with the music
    S.bass     = envAR(S.bass, f.bassZScore * 0.7 + 0.25, 0.35, 0.05, dt)
    S.mids     = envAR(S.mids, f.midsZScore * 0.7 + 0.25, 0.25, 0.04, dt)
    S.treb     = envAR(S.treb, f.trebleZScore * 0.7 + 0.2, 0.35, 0.05, dt)
    S.energy   = ema(S.energy, f.energyNormalized, 0.05, dt)
    S.entropy  = ema(S.entropy, f.spectralEntropyNormalized, 0.04, dt)
    S.centroid = envAR(S.centroid, f.spectralCentroidZScore * 0.5 + 0.5, 0.10, 0.03, dt)
    S.pump     = ema(S.pump, f.bassNormalized, 0.28, dt)
    const spike = Math.max(f.energyZScore, f.bassZScore * 0.9)
    S.drop = spike > 0.2 ? Math.max(S.drop, Math.min(spike, 1)) : S.drop * Math.pow(0.955, dt / FRAME)
    S.flux  = envAR(S.flux, f.spectralFluxZScore * 0.8 + 0.1, 0.45, 0.06, dt)
    S.rough = envAR(S.rough, f.spectralRoughnessZScore * 0.6 + 0.3, 0.20, 0.04, dt)
    S.crest = envAR(S.crest, f.spectralCrestZScore * 0.6 + 0.3, 0.25, 0.04, dt)
    S.roll  = envAR(S.roll, f.spectralRolloffZScore * 0.5 + 0.5, 0.10, 0.03, dt)

    // ray shape — slow stats only, eased again (~4 s) so a median stepping at a track change bends
    // the field instead of snapping it
    S.curl  = ema(S.curl,  smoothstep(0.08, 0.40, f.spectralCentroidMedian), 0.004, dt)
    S.dir   = ema(S.dir,   smoothstep(0.30, 0.70, f.spectralSkewMean), 0.004, dt)
    S.flex  = ema(S.flex,  smoothstep(0.03, 0.16, f.bassMedian), 0.004, dt)
    S.wave  = ema(S.wave,  smoothstep(0.60, 0.95, f.spectralEntropyMedian), 0.004, dt)
    S.len   = ema(S.len,   smoothstep(0.10, 0.45, f.spectralRolloffMean), 0.004, dt)
    S.thick = ema(S.thick, 1 - smoothstep(0.25, 0.75, f.spectralKurtosisMedian), 0.004, dt)

    // monotonic clocks: audio sets the rate, never the angle
    S.flow   += (0.20 + S.entropy * 1.1 + S.centroid * 0.4) / (2 * Math.PI) * dt
    S.twist  += (0.006 + 0.03 * Math.min(1, Math.max(-0.15, f.energySlope * f.energyRSquared * 3000))) * dt
    S.flexPh += (0.03 + 0.10 * smoothstep(0.10, 0.40, f.spectralSpreadMean)) * dt
    S.pal    += (1 / 1500) * (0.6 + 0.8 * gate) * dt   // ~25 min round the wheel

    // kick: envelope + one deliberate wavefront per onset
    const kRaw = clamp01((Math.max(f.bassZScore, f.energyZScore) - 0.2) * 1.8) * gate
    const kPrev = S.kick
    S.kick = envAR(S.kick, kRaw, 0.6, 0.10, dt)
    if (kRaw > 0.45 && kPrev < 0.30 && S.kAge > 0.55) { S.kAge = 0; S.kAmp = kRaw }
    else S.kAge = Math.min(1, S.kAge + dt / 3)

    return {
      bs_time: S.time, bs_eye: S.eye,
      bs_bass: S.bass, bs_mids: S.mids, bs_treb: S.treb, bs_energy: S.energy, bs_entropy: S.entropy,
      bs_centroid: S.centroid, bs_pump: S.pump, bs_drop: S.drop, bs_flux: S.flux, bs_rough: S.rough,
      bs_crest: S.crest, bs_roll: S.roll, bs_kick: S.kick,
      bs_curl: S.curl, bs_dir: S.dir, bs_flex: S.flex, bs_wave: S.wave, bs_len: S.len, bs_thick: S.thick,
      bs_flow: fract(S.flow), bs_twist: fract(S.twist), bs_flexPh: fract(S.flexPh), bs_pal: fract(S.pal),
      bs_kAge: S.kAge, bs_kAmp: S.kAmp,
    }
  }
}
