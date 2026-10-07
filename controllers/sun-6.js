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
//   bs_diskPh             accretion-disk orbit clock in radians, unwrapped (mids speed it up)
//   bs_fAge, bs_fId, bs_fAmp   flux flare: age 0 → 1 over 1.8 s, which ray (0..1), strength
//   bs_wAge, bs_wAmp      distortion wavefront: age 0 → 1 over 6 s, launched only by large audio changes
//   bs_heat … bs_pull     STORY params (see ACTS); bs_nova detonation flash 1 → 0; bs_shell seconds since
//                         the last supernova (capped 30); bs_act / bs_actT current act index + seconds in it
//   bs_sunX, bs_sunY      the sun's position (sky path + sink); bs_night day → deep space
//   bs_galPh, bs_wind, bs_fluxPh   galaxy arms: flow phase (mids rate), winding (eased step on events), flux wave clock
//   bs_reach              0..1 huge-ray mode, eased; windows open in REBIRTH / hot sections / by chance; K6 forces
//   bs_cX, bs_cY, bs_cOn, bs_kiss   binary companion position, presence, kiss envelope; bs_waveX/Y wave centre
//   bs_irisScale          eye size, 0.7–1.25. Holds between SECTION changes (not kicks); each one eases
//                         it to a new size over SHUTTER_SECS
//   bs_shutter, bs_shutterAng   the camera-shutter transition: 0 → 1 → 0 blade cover over the
//                         transition, and a blade angle (turns) that only advances while it runs

const EYE_SECS = 180
const SHUTTER_SECS = 1.6
const SECTION_REFRACTORY = 12

// ── STORY ENGINE — acts of a stellar life, abstracted. Each act is a target vector of story params
// the shader reads; params glide toward the current act's targets with that act's ease (time
// constant ≈ ease/3, so ~95% arrived after `ease` seconds) — never snaps. The music advances the
// story (see `next`); minDwell guards against flapping, maxDwell guarantees progress. K5 STORY
// (knob_5) forces an act: 0 = auto, otherwise act = floor(k × ACTS.length).
//
//   heat     0 ember … 0.5 red … 1 gold (main sequence) … 1.4 pale yellow-white (never white)
//   size     sun scale        power  ray reach/brightness   dark   scene dimming (sky → night)
//   abstract scene dissolves into plasma   chaos  turbulence   pull  extra lensing (collapse)
//   sink     how far the sun sinks toward the horizon   night  day sky → deep space   move  how fast it drifts
//
// `next(m, dwell)` returns the next act index or -1. m = musical state (see below).
const ACTS = [
  { name: 'MAIN SEQUENCE', ease: 40, min: 60, max: 180, p: { heat: 1.0, size: 1.0, power: 1.0, dark: 0.0, abstract: 0.0, chaos: 0.3, pull: 0.0, sink: 0.0, night: 0.0, move: 1.0 },
    next: (m, d) => m.building && d > 45 ? 3 : (m.calm && d > 60) || d > 180 ? 1 : -1 },
  { name: 'RED GIANT', ease: 60, min: 45, max: 150, p: { heat: 0.55, size: 1.65, power: 0.75, dark: 0.15, abstract: 0.1, chaos: 0.2, pull: 0.0, sink: 0.05, night: 0.25, move: 0.5 },
    next: (m, d) => m.building && d > 45 ? 3 : (m.low && d > 45) || d > 150 ? 2 : -1 },
  { name: 'DYING', ease: 60, min: 45, max: 120, p: { heat: 0.2, size: 0.45, power: 0.3, dark: 0.7, abstract: 0.0, chaos: 0.1, pull: 0.1, sink: 0.38, night: 0.8, move: 0.7 },
    next: (m, d) => (m.building && d > 30) || d > 120 ? 3 : -1 },
  { name: 'COLLAPSE', ease: 25, min: 15, max: 90, p: { heat: 0.4, size: 0.22, power: 0.2, dark: 0.85, abstract: 0.2, chaos: 0.6, pull: 1.0, sink: 0.38, night: 0.95, move: 0.0 },
    next: (m, d) => (m.drop && d > 15) || d > 90 ? 4 : -1 },
  { name: 'SUPERNOVA', ease: 4, min: 25, max: 25, p: { heat: 1.4, size: 1.9, power: 2.0, dark: 0.0, abstract: 0.5, chaos: 1.0, pull: 0.0, sink: 0.3, night: 0.55, move: 0.0 },
    next: (m, d) => d > 25 ? 5 : -1 },
  { name: 'NEBULA', ease: 30, min: 60, max: 150, p: { heat: 0.8, size: 0.55, power: 0.55, dark: 0.3, abstract: 1.0, chaos: 0.7, pull: 0.0, sink: 0.12, night: 1.0, move: 0.6 },
    next: (m, d) => (m.calm && d > 60) || d > 150 ? 6 : -1 },
  { name: 'REBIRTH', ease: 45, min: 45, max: 75, p: { heat: 1.2, size: 0.5, power: 0.8, dark: 0.4, abstract: 0.35, chaos: 0.3, pull: 0.0, sink: 0.0, night: 0.5, move: 0.9 },
    next: (m, d) => d > 60 ? 0 : -1 },
]
const STORY_KEYS = ['heat', 'size', 'power', 'dark', 'abstract', 'chaos', 'pull', 'sink', 'night', 'move']

// Inputs. Before the analyser has history these are undefined/NaN for a few frames; a NaN folded into
// an envelope would stick forever, so audio state only advances on frames where all of them are numbers.
const INPUTS = ['energyMean', 'bassZScore', 'midsZScore', 'trebleZScore', 'energyNormalized',
  'spectralEntropyNormalized', 'spectralCentroidZScore', 'bassNormalized', 'energyZScore',
  'spectralFluxZScore', 'spectralRoughnessZScore', 'spectralCrestZScore', 'spectralRolloffZScore',
  'spectralCentroidMedian', 'spectralSkewMean', 'bassMedian', 'spectralEntropyMedian',
  'spectralRolloffMean', 'spectralKurtosisMedian', 'energySlope', 'energyRSquared', 'spectralSpreadMean']
const FRAME = 1 / 60

const clamp01 = x => Math.min(1, Math.max(0, x))
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
// the shader's per-frame coefficients, made frame-rate independent
const rate = (aPerFrame, dt) => 1 - Math.pow(1 - aPerFrame, dt / FRAME)
const ema = (p, x, a, dt) => p + (clamp01(x) - p) * rate(a, dt)
const envAR = (p, x, att, rel, dt) => { x = clamp01(x); return p + (x - p) * rate(x > p ? att : rel, dt) }
const fract = x => x - Math.floor(x)

export function make() {
  // State lives on the page, not in this closure: a hot swap of this file calls make() again, and a
  // fresh closure would snap the eye morph, every clock and every envelope back to zero on the wall.
  // The new instance resumes where the old one left off; clocks stay monotonic across swaps.
  const DEFAULTS = {
    lastT: null, time: 0, eye: 0,
    bass: 0, mids: 0, treb: 0, energy: 0, entropy: 0, centroid: 0.5, pump: 0, drop: 0,
    flux: 0, rough: 0, crest: 0, roll: 0.5, kick: 0,
    curl: 0.5, dir: 0.5, flex: 0.5, wave: 0.5, len: 0.5, thick: 0.5,
    flow: 0, twist: 0, flexPh: 0, pal: 0, diskPh: 0,
    kAge: 1, kAmp: 0, fluxEnv: 0, fAge: 1, fId: 0, fAmp: 0,
    bassSlow: 0, wAge: 1, wAmp: 0, sinceWave: 99,
    // story
    act: 0, actT: 0, forced: -1, buildT: 0, armed: 0, calmT: 0, lowT: 0, nova: 0, novaT: 99,
    heat: 1.0, size: 1.0, power: 1.0, dark: 0.0, abstract: 0.0, chaos: 0.3, pull: 0.0,
    sink: 0.0, night: 0.0, move: 1.0, skyPh: 0,
    galPh: 0, wind: 0, windTo: 0, fluxPh: 0, billow: 0, cX: -2.0, cY: 1.4, kiss: 0,
    reach: 0, reachLeft: 0, sinceReach: 0, hotT: 0,
    // binary companion
    sunX: 0, sunY: 0.10, waveX: 0, waveY: 0.10,
    cOn: 0, cR: 2.6, cPh: 2.6, cPrec: 0, kissT: 1, sinceKiss: 0, kissFired: 1,
    // section-change detector + shutter
    sustE: 0, sustF: 0, trend: 0, gateWas: null, sinceSection: 0,   // no event in the first 12 s (z-scores are noise until history fills)
    irisFrom: 1, irisTo: 1, shutterP: 1, shutterAng: 0, events: 0,
  }
  // A state object from an older version of this file may lack newer keys, or hold a NaN an older
  // version latched (bs_fAge did, and froze the wall: out() threw every frame). Repair those fields
  // to their defaults; keep every healthy one, so the clocks and the eye stay where they were.
  const S = window.__sun6State ??= {}
  for (const k in DEFAULTS) {
    const bad = typeof DEFAULTS[k] === 'number' && !Number.isFinite(S[k])
    if (!(k in S) || bad) S[k] = DEFAULTS[k]
  }

  return (f) => {
    const now = performance.now() / 1000
    if (S.lastT === null) S.lastT = now
    let dt = now - S.lastT
    S.lastT = now
    if (!(dt > 0) || dt > 0.1) dt = FRAME

    S.time += dt
    S.eye = Math.min(1, S.eye + dt / EYE_SECS)
    S.sinceSection += dt
    if (S.shutterP < 1) {
      S.shutterP = Math.min(1, S.shutterP + dt / SHUTTER_SECS)
      S.shutterAng += Math.abs(S.irisTo - S.irisFrom) * 1.2 * dt / SHUTTER_SECS   // blades turn while it runs
    }
    if (INPUTS.some(k => !Number.isFinite(f[k]))) return out()

    const gate = smoothstep(0.003, 0.015, f.energyMean)   // matches the shader's GATE (tuned to the BlackHole line feed)

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
    S.diskPh += (0.6 + 1.8 * S.mids * gate + 1.2 * S.bass * gate) * dt   // plasma/disk orbit, radians; NOT wrapped (inner/outer at non-integer ratios). mids + bass speed the boil

    // kick: envelope + one deliberate wavefront per onset
    const kRaw = clamp01((Math.max(f.bassZScore, f.energyZScore) - 0.2) * 1.8) * gate
    const kPrev = S.kick
    S.kick = envAR(S.kick, kRaw, 0.6, 0.04, dt)   // release ~0.5 s: a hit blooms and glides off instead of strobing
    if (kRaw > 0.45 && kPrev < 0.30 && S.kAge > 0.55) { S.kAge = 0; S.kAmp = kRaw }
    else S.kAge = Math.min(1, S.kAge + dt / 3)

    // flux flare: an onset of timbral change launches one plasma blob out along one ray (1.8 s ride)
    const fRaw = clamp01((f.spectralFluxZScore - 0.3) * 1.5) * gate
    const fPrev = S.fluxEnv
    S.fluxEnv = envAR(S.fluxEnv, fRaw, 0.6, 0.05, dt)
    if (fRaw > 0.5 && fPrev < 0.3 && S.fAge > 0.6) { S.fAge = 0; S.fAmp = fRaw; S.fId = Math.random() }
    else S.fAge = Math.min(1, S.fAge + dt / 1.8)

    // DISTORTION WAVES — only on LARGE changes, not every kick: an energy or bass z-score jumping well
    // above its own ~3 s envelope, a big flux spike, or a section change (below). 8 s refractory,
    // 6 s life; amplitude scales with how big the change was. (Thresholds 0.7 and 1.0 still fired
    // every ~7–10 s on the rehearsal feed — too often to read as an event.)
    S.bassSlow = S.bassSlow + (f.bassZScore - S.bassSlow) * rate(1 / 180, dt)
    S.sinceWave += dt
    S.wAge = Math.min(1, S.wAge + dt / 6)
    const jump = Math.max(f.energyZScore - S.sustE, f.bassZScore - S.bassSlow, (f.spectralFluxZScore - 1.2) * 0.8)
    const fireWave = (amp, x = S.sunX, y = S.sunY) => { if (S.sinceWave < 8) return; S.sinceWave = 0; S.wAge = 0; S.wAmp = clamp01(amp); S.waveX = x; S.waveY = y }
    if (jump > 1.3 && gate > 0.5) fireWave(0.55 + (jump - 1.3))

    // ── STORY: musical state → act transitions → param glide
    S.actT += dt
    S.novaT += dt
    S.buildT = S.trend > 0.5 && S.sustF > -0.2 ? S.buildT + dt : Math.max(0, S.buildT - dt * 2)
    if (S.buildT > 8) S.armed = 1
    S.calmT = Math.abs(S.sustE) < 0.25 && Math.abs(S.trend) < 0.3 ? S.calmT + dt : 0
    S.lowT = S.sustE < -0.25 || gate < 0.5 ? S.lowT + dt : 0
    const m = {
      building: S.buildT > 8,
      drop: S.armed > 0 && f.energyZScore > 0.8 && f.energyZScore - S.sustE > 0.5,
      calm: S.calmT > 15,
      low: S.lowT > 10,
    }
    const k5 = f.knob_5 ?? 0
    const goTo = (i) => {
      if (i === S.act) return
      S.act = i; S.actT = 0
      if (i === 3) fireWave(0.8)                       // collapse: the space around it shudders inward
      if (i === 4) { S.armed = 0; S.novaT = 0; S.sinceWave = 99; fireWave(1); S.windTo = Math.min(2, S.windTo + 0.4) }   // detonation
      if (i === 6) S.windTo = 0                         // rebirth unwinds the galaxy (eased)
    }
    if (k5 > 0.02) goTo(Math.min(ACTS.length - 1, Math.floor(k5 * ACTS.length)))
    else {
      const nx = ACTS[S.act].next(m, S.actT)
      if (nx >= 0 && S.actT >= ACTS[S.act].min) goTo(nx)
    }
    const A = ACTS[S.act]
    for (const k of STORY_KEYS) S[k] = S[k] + (A.p[k] - S[k]) * (1 - Math.exp(-dt * 3 / A.ease))
    S.nova = S.novaT < 30 ? Math.exp(-S.novaT / 6) : 0  // the detonation flash, one big eased event
    // SKY PATH: a monotonic phase (never wrapped, never reversed) drives a slow Lissajous with
    // incommensurate periods — a full wander takes many minutes. The act's `move` sets the rate (0 =
    // the sun holds still), slow energy nudges it, and `sink` lowers it toward the horizon.
    S.skyPh += 0.012 * S.move * (0.6 + 0.6 * S.energy) * dt
    const pathX = 0.55 * Math.sin(S.skyPh * 2.0)
    const pathY = 0.10 + 0.18 * (Math.sin(S.skyPh * 3.17 + 1.0) - Math.sin(1.0)) - S.sink   // phase 0 = the old fixed (0, 0.10)

    // COMPANION: a small dark-red star. It enters from off-screen upper-left and spirals in over a
    // few minutes (radius eases inward), then dances a slow, slightly elliptical, precessing orbit
    // (mids speed the dance — a rate). The main star wobbles about the shared barycentre. KISS: on a
    // drop or section change (30 s refractory), or a scripted approach every ~2.5 min of steady
    // music, the orbit dips until the coronas overlap, a distortion front fires from the contact
    // point, and they drift apart. SUPERNOVA flings it away; it re-forms and re-enters in REBIRTH.
    const flung = S.act === 4 || S.act === 5
    if (S.act === 6 && S.cOn < 0.05) { S.cR = 2.6; S.cPh = 2.6 }
    S.cOn += ((flung ? 0 : 1) - S.cOn) * (1 - Math.exp(-dt / (flung ? 3 : 20)))
    const cRTo = flung ? 3.5 : 0.78
    S.cR += (cRTo - S.cR) * (1 - Math.exp(-dt / (flung ? 4 : 55)))
    S.cPh -= (0.05 + 0.04 * S.mids * gate) * dt          // clockwise: from the upper-left it swoops in over the top
    S.cPrec += 0.006 * dt
    S.sinceKiss += dt
    S.kissT = Math.min(1, S.kissT + dt / 10)
    const kiss = Math.pow(Math.sin(Math.PI * S.kissT), 2)
    const startKiss = () => { if (S.sinceKiss < 30 || S.cR > 1.2 || flung) return; S.sinceKiss = 0; S.kissT = 0; S.kissFired = 0 }
    if (m.drop || S.sinceKiss > 150) startKiss()
    const rEff = S.cR + (0.3 - S.cR) * kiss
    const ex = rEff * Math.cos(S.cPh), ey = rEff * 0.78 * Math.sin(S.cPh)
    const cp = Math.cos(S.cPrec), sp = Math.sin(S.cPrec)
    const ox = ex * cp - ey * sp, oy = ex * sp + ey * cp
    const wob = 0.12 * S.cOn * Math.min(1, 0.8 / Math.max(S.cR, 0.3))   // barycentre wobble, weak while it is still far out
    S.sunX = pathX - ox * wob
    S.sunY = pathY - oy * wob
    S.cX = S.sunX + ox
    S.cY = S.sunY + oy
    S.kiss = kiss
    if (!S.kissFired && S.kissT > 0.45) { S.kissFired = 1; S.sinceWave = 99; fireWave(1, (S.sunX + S.cX) / 2, (S.sunY + S.cY) / 2) }
    // GALAXY: the spiral arms' flow (mids set the speed — a rate, never a jump), their winding (a one-way
    // eased step on every drop / section change / supernova, capped), and an outward flux wave clock
    S.galPh += (0.05 + 0.6 * S.mids * gate) * dt
    S.wind += (S.windTo - S.wind) * (1 - Math.exp(-dt / 4))
    S.fluxPh += (0.05 + 0.9 * S.flux * gate) * dt
    // BILLOW: the only audio allowed to scale a background WARP — a slow (~4 s) ease of bass + roughness.
    // Warp amplitude that follows fast envelopes pushes the field back and forth every beat (shiver).
    S.billow += (clamp01(0.6 * S.bass + 0.4 * S.rough) * gate - S.billow) * (1 - Math.exp(-dt / 4))
    // REACH: huge rays as an aesthetic that comes and goes, not the default. A window opens in
    // REBIRTH, on a sustained hot section (10 s), or by chance once ~3+ min have passed since the
    // last one; it lasts 30–90 s and eases in/out over ~20 s. K6 REACH (knob_6) forces the amount.
    S.sinceReach += dt
    S.hotT = S.sustE > 0.5 ? S.hotT + dt : 0
    const openReach = () => { if (S.reachLeft > 0 || S.sinceReach < 60) return; S.reachLeft = 30 + 60 * Math.random(); S.sinceReach = 0 }
    if (S.act === 6 || S.hotT > 10 || (S.sinceReach > 180 && Math.random() < dt / 90)) openReach()
    S.reachLeft = Math.max(0, S.reachLeft - dt)
    const k6 = f.knob_6 ?? 0
    const reachTo = k6 > 0.02 ? k6 : S.reachLeft > 0 ? 1 : 0
    S.reach += (reachTo - S.reach) * (1 - Math.exp(-dt / 6))

    // SECTION changes — sustained excursions, not kicks: a ~3 s EMA of energy and flux z-scores, a
    // confident build/drop trend, or the quiet gate flipping (track boundary). Long refractory.
    S.sustE = S.sustE + (f.energyZScore - S.sustE) * rate(1 / 180, dt)
    S.sustF = S.sustF + (f.spectralFluxZScore - S.sustF) * rate(1 / 180, dt)
    S.trend = f.energySlope * f.energyRSquared * 3000
    const gateFlip = S.gateWas !== null && (gate > 0.5) !== (S.gateWas > 0.5)
    S.gateWas = gate
    const section = Math.abs(S.sustE) > 0.45 || S.sustF > 0.5 || Math.abs(S.trend) > 0.6 || gateFlip
    if (section && S.sinceSection > SECTION_REFRACTORY && S.shutterP >= 1) {
      S.sinceSection = 0
      S.events++
      const cur = S.irisTo
      // louder / building → the eye opens wider; dropping out → it closes down. Bounce off the range ends.
      const up = (S.sustE + S.trend * 0.3) >= 0
      let next = cur + (up ? 1 : -1) * (0.22 + 0.1 * (S.events % 3) / 2)
      if (next > 1.25 || next < 0.7) next = cur - (next - cur)
      S.irisFrom = irisScale()
      S.irisTo = Math.min(1.25, Math.max(0.7, next))
      S.shutterP = 0
      fireWave(1)
      S.windTo = Math.min(2, S.windTo + 0.2)
      startKiss()
    }

    return out()
  }

  function irisScale() {
    const p = S.shutterP, e = p * p * (3 - 2 * p)
    return S.irisFrom + (S.irisTo - S.irisFrom) * e
  }

  // Fail loud: a NaN reaching the shader silently blanks whatever reads it (bs_pal did, before INPUTS).
  function out() {
    const o = {
      bs_time: S.time, bs_eye: S.eye,
      bs_bass: S.bass, bs_mids: S.mids, bs_treb: S.treb, bs_energy: S.energy, bs_entropy: S.entropy,
      bs_centroid: S.centroid, bs_pump: S.pump, bs_drop: S.drop, bs_flux: S.flux, bs_rough: S.rough,
      bs_crest: S.crest, bs_roll: S.roll, bs_kick: S.kick,
      bs_curl: S.curl, bs_dir: S.dir, bs_flex: S.flex, bs_wave: S.wave, bs_len: S.len, bs_thick: S.thick,
      bs_flow: fract(S.flow), bs_twist: fract(S.twist), bs_flexPh: fract(S.flexPh), bs_pal: fract(S.pal),
      bs_kAge: S.kAge, bs_kAmp: S.kAmp,
      bs_irisScale: irisScale(), bs_shutter: Math.sin(Math.PI * S.shutterP), bs_shutterAng: fract(S.shutterAng), bs_diskPh: S.diskPh,
      bs_fAge: S.fAge, bs_fId: S.fId, bs_fAmp: S.fAmp,
      bs_wAge: S.wAge, bs_wAmp: S.wAmp,
      bs_heat: S.heat, bs_size: S.size, bs_power: S.power, bs_dark: S.dark, bs_abstract: S.abstract,
      bs_chaos: S.chaos, bs_pull: S.pull, bs_night: S.night,
      bs_sunX: S.sunX, bs_sunY: S.sunY, bs_cX: S.cX, bs_cY: S.cY, bs_cOn: S.cOn, bs_kiss: S.kiss, bs_waveX: S.waveX, bs_waveY: S.waveY,
      bs_reach: S.reach, bs_billow: S.billow, bs_galPh: S.galPh, bs_wind: S.wind, bs_fluxPh: S.fluxPh,
      bs_nova: S.nova, bs_shell: Math.min(S.novaT, 30), bs_act: S.act, bs_actT: S.actT,
    }
    const bad = Object.keys(o).filter(k => !Number.isFinite(o[k]))
    if (bad.length) throw new Error(`black-sun controller produced non-finite ${bad.join(', ')}`)
    return o
  }
}
