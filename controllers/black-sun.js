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
//   bs_trip               K1 TRIP story mix, 0 → 1 eased over ~6 s (K1 ≥ 0.5). bs_act stays the CLASSIC
//                         act index the shader branches on (the trip act's `role`); bs_tripAct is the trip act
//   bs_julia, bs_jR       Julia-arm weight, and |c| (shape, eased per act)   bs_jTurn  c angle clock (turns)
//   bs_descend, bs_dive   self-similar dive amount, and its clock (turns; one octave per turn)
//   bs_fractal            fractal-garden sky weight   bs_tripHue  palette family (turns, 0 … 300°/360)
//
// EVOLUTION — slow music character (all 0..1, time constants 10–20 s; safe for colour and mix weights):
//   bs_moodChaos     spectralEntropyMean      busy/noisy vs tonal
//   bs_moodGrit      spectralRoughnessMedian  dissonance / beating
//   bs_moodFocus     spectralKurtosisMean     peaked, focused spectrum
//   bs_moodSpike     spectralCrestMean        spiky transients vs smooth pads
//   bs_moodTilt      spectralSkewMean         dark vs bright tilt
//   bs_moodAir       spectralRolloffMean      how high the highs reach
//   bs_moodVolatile  flux + roughness std-dev volatile vs steady sections
//   bs_moodWave      waveletCentroidNormalized  DWT brightness centre
//   bs_moodRise      energy/centroid slope × R²   0.5 flat, 1 confident build, 0 confident fall
//   bs_moodKey       pitchClassMedian, circularly smoothed over 20 s (turns: 0..1 around the key wheel)
// bs_evo*            monotonic clocks in turns (fract), one per mood above (Chaos, Grit, Focus, Spike, Air,
//                    Volatile, Wave, Rise). Each runs at 0.003 + 0.03 × its mood turns/s, slower in silence —
//                    the music sets the RATE only, so use integer multiples / sin(2π·evo) for geometry
// DRAMATIC, SAFE (envelopes, never raw flashes):
//   bs_dropEnv       0..1: confirmed drop (wavelet_confirmedDrop, or energy+bass z-scores high); 150 ms
//                    attack, ~3 s release, 8 s refractory
//   bs_buildEnv      0..1: confident build (energy/centroid slope × R²); 6 s attack, 3 s release
//   bs_shiftPulse    0..1: timbral shift (flux z-score + entropy change rate); 0.3 s attack, 2.5 s release
//   bs_evoJump       one-way plateau step: +1 per confirmed drop, eased over ~3 s. Never decreases —
//                    use fract()/mod for the new geometric state; it never strobes back

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
// MUSIC-EARNED (user, 2026-10-06: "that sudden growth of the sun was not warranted by the music"):
// every transition names its musical cause. Size jumps (SUPERNOVA, RED GIANT swell) happen only on an
// event — a drop after a build, a build, calm/low stretches. The only non-musical exit is a long
// ≥7 min fallback, and it glides 2.5× slower (`slow`) toward a gentle act, never toward SUPERNOVA.
// Steady music simply holds the act. next(m, dwell) → [act, cause] | null.
const FALLBACK = 420
const ACTS = [
  { name: 'MAIN SEQUENCE', ease: 40, min: 60, p: { heat: 1.0, size: 1.0, power: 1.0, dark: 0.0, abstract: 0.0, chaos: 0.3, pull: 0.0, sink: 0.0, night: 0.0, move: 1.0 },
    next: (m, d) => m.building && d > 45 ? [3, 'build'] : m.calm && d > 60 ? [1, 'calm'] : d > FALLBACK ? [1, 'fallback'] : null },
  { name: 'RED GIANT', ease: 60, min: 45, p: { heat: 0.55, size: 1.65, power: 0.75, dark: 0.15, abstract: 0.1, chaos: 0.2, pull: 0.0, sink: 0.05, night: 0.25, move: 0.5 },
    next: (m, d) => m.building && d > 45 ? [3, 'build'] : m.low && d > 45 ? [2, 'low'] : d > FALLBACK ? [2, 'fallback'] : null },
  { name: 'DYING', ease: 60, min: 45, p: { heat: 0.2, size: 0.45, power: 0.3, dark: 0.7, abstract: 0.0, chaos: 0.1, pull: 0.1, sink: 0.38, night: 0.8, move: 0.7 },
    next: (m, d) => m.building && d > 30 ? [3, 'build'] : d > FALLBACK ? [6, 'fallback'] : null },
  { name: 'COLLAPSE', ease: 25, min: 15, p: { heat: 0.4, size: 0.22, power: 0.2, dark: 0.85, abstract: 0.2, chaos: 0.6, pull: 1.0, sink: 0.38, night: 0.95, move: 0.0 },
    next: (m, d) => m.drop && d > 15 ? [4, 'drop'] : d > FALLBACK ? [6, 'fallback'] : null },
  { name: 'SUPERNOVA', ease: 4, min: 25, p: { heat: 1.4, size: 1.9, power: 2.0, dark: 0.0, abstract: 0.5, chaos: 1.0, pull: 0.0, sink: 0.3, night: 0.55, move: 0.0 },
    next: (m, d) => d > 25 ? [5, 'detonation ran its course'] : null },
  { name: 'NEBULA', ease: 30, min: 60, p: { heat: 0.8, size: 0.55, power: 0.55, dark: 0.3, abstract: 1.0, chaos: 0.7, pull: 0.0, sink: 0.12, night: 1.0, move: 0.6 },
    next: (m, d) => m.calm && d > 60 ? [6, 'calm'] : d > FALLBACK ? [6, 'fallback'] : null },
  { name: 'REBIRTH', ease: 45, min: 45, p: { heat: 1.2, size: 0.5, power: 0.8, dark: 0.4, abstract: 0.35, chaos: 0.3, pull: 0.0, sink: 0.0, night: 0.5, move: 0.9 },
    next: (m, d) => m.building && d > 45 ? [0, 'build'] : d > FALLBACK ? [0, 'fallback'] : null },
]
const STORY_KEYS = ['heat', 'size', 'power', 'dark', 'abstract', 'chaos', 'pull', 'sink', 'night', 'move']

// ── TRIP STORY (K1 ≥ 0.5) — the same engine, a second arc for an audience that knows the first. The
// classic params above still glide (so the existing shader follows the trip with no edits), plus four
// trip params the shader hooks read:
//   julia    Julia-arm weight/reach   jR  |c| of the arms (shape; eased per act, never audio)
//   descend  rate of the self-similar dive (bs_dive)   fractal  fractal-garden sky weight
// `hue` is the act's OKLCH palette family in degrees, kept in 0..300 so no glide ever crosses magenta;
// LUCID takes its hue from the slow key instead. `role` = the classic act whose side effects the act
// borrows (3 inward shudder, 4 detonation + companion flung, 5 companion flung, 6 companion re-forms).
// Every exit is music-earned (build / drop / calm / low) or the long gentle FALLBACK.
const TRIP_ACTS = [
  { name: 'HATCHLING', role: 0, ease: 40, min: 45, hue: 45,
    p: { heat: 0.9, size: 0.6, power: 0.6, dark: 0.2, abstract: 0.1, chaos: 0.25, pull: 0.0, sink: 0.0, night: 0.4, move: 0.6, julia: 0.35, jR: 0.70, descend: 0.0, fractal: 0.0 },
    next: (m, d) => m.building && d > 30 ? [1, 'build'] : m.low && d > 45 ? [6, 'low'] : d > FALLBACK ? [1, 'fallback'] : null },
  { name: 'UNFURL', role: 0, ease: 30, min: 40, hue: 75,
    p: { heat: 1.0, size: 0.8, power: 1.3, dark: 0.1, abstract: 0.2, chaos: 0.4, pull: 0.0, sink: 0.0, night: 0.3, move: 0.9, julia: 1.0, jR: 0.7885, descend: 0.1, fractal: 0.1 },
    next: (m, d) => m.drop && d > 20 ? [2, 'drop'] : m.calm && d > 60 ? [3, 'calm'] : d > FALLBACK ? [3, 'fallback'] : null },
  { name: 'DIVE', role: 3, ease: 12, min: 30, hue: 200,
    p: { heat: 0.7, size: 0.35, power: 0.9, dark: 0.35, abstract: 0.6, chaos: 0.6, pull: 0.4, sink: 0.0, night: 0.8, move: 0.2, julia: 0.8, jR: 0.76, descend: 1.0, fractal: 0.7 },
    next: (m, d) => m.drop && d > 40 ? [5, 'drop'] : m.calm && d > 30 ? [3, 'calm'] : m.low && d > 30 ? [6, 'low'] : d > FALLBACK ? [3, 'fallback'] : null },
  { name: 'GARDEN', role: 5, ease: 45, min: 60, hue: 270,
    p: { heat: 0.8, size: 0.5, power: 0.6, dark: 0.3, abstract: 1.0, chaos: 0.5, pull: 0.0, sink: 0.1, night: 1.0, move: 0.5, julia: 0.6, jR: 0.74, descend: 0.35, fractal: 1.0 },
    next: (m, d) => m.building && d > 45 ? [4, 'build'] : d > FALLBACK ? [4, 'fallback'] : null },
  { name: 'TWIN', role: 0, ease: 30, min: 30, hue: 220,
    p: { heat: 1.1, size: 0.9, power: 1.0, dark: 0.15, abstract: 0.3, chaos: 0.5, pull: 0.2, sink: 0.0, night: 0.6, move: 0.8, julia: 0.9, jR: 0.7885, descend: 0.2, fractal: 0.3 },
    next: (m, d) => m.drop && d > 15 ? [5, 'drop'] : m.low && d > 45 ? [6, 'low'] : d > FALLBACK ? [6, 'fallback'] : null },
  { name: 'BLOOM', role: 4, ease: 5, min: 25, hue: 40,
    p: { heat: 1.3, size: 1.5, power: 1.8, dark: 0.0, abstract: 0.6, chaos: 0.9, pull: 0.0, sink: 0.1, night: 0.5, move: 0.0, julia: 1.0, jR: 0.79, descend: 0.6, fractal: 0.5 },
    next: (m, d) => d > 25 ? [6, 'bloom ran its course'] : null },
  { name: 'LUCID', role: 6, ease: 45, min: 45, hue: null,
    p: { heat: 1.0, size: 0.6, power: 0.8, dark: 0.3, abstract: 0.4, chaos: 0.3, pull: 0.0, sink: 0.0, night: 0.6, move: 0.8, julia: 0.7, jR: 0.72, descend: 0.3, fractal: 0.4 },
    next: (m, d) => m.building && d > 45 ? [1, 'build'] : m.calm && d > 60 ? [0, 'calm'] : d > FALLBACK ? [0, 'fallback'] : null },
]
const TRIP_KEYS = ['julia', 'jR', 'descend', 'fractal']
const TRIP_REST = { julia: 0, descend: 0, fractal: 0 }   // K1 below 0.5: the trip layers glide out; jR holds

// Inputs. Before the analyser has history these are undefined/NaN for a few frames; a NaN folded into
// an envelope would stick forever, so audio state only advances on frames where all of them are numbers.
const INPUTS = ['energy', 'pitchClass', 'energyMean', 'bassZScore', 'midsZScore', 'trebleZScore', 'energyNormalized',
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

// LATTICE-FEAT-1 feature bank → bs_f0..bs_f39, each conditioned to 0..1 (0.5 = neutral).
// Kinds: n = already normalized, z = zScore (-1..1 → 0..1), tr = trend (sign(slope) × rSquared),
// sd = volatility (stdDev over the min..max range). Speeds: fast = light (80 ms / 500 ms),
// mid = 250 ms / 1.2 s, slow = shape (3 s / 8 s) — only slow channels may steer geometry rates.
//  0 bassNormalized      1 midsNormalized      2 trebleNormalized     3 energyNormalized
//  4 spectralFluxNorm    5 spectralCrestNorm   6 spectralRoughNorm    7 spectralCentroidNorm
//  8..13 waveletBand0..5Normalized             14 pitchClassNorm      15 spectralRolloffNorm
// 16 bassZ  17 trebleZ  18 entropyZ  19 spreadZ  20 skewZ  21 kurtosisZ  22 centroidZ  23 fluxZ
// 24 waveletCentroidZ  25 waveletSpreadZ  26 waveletTiltZ  27 energyZ
// 28 energy trend  29 centroid trend  30 entropy trend  31 waveletTilt trend
// 32 flux volatility  33 roughness volatility  34 bass volatility
// 35 spreadNorm  36 kurtosisNorm  37 skewNorm  38 entropyNorm  39 waveletTiltNorm
const FB_SPEC = [
  ...['bass', 'mids', 'treble', 'energy', 'spectralFlux', 'spectralCrest', 'spectralRoughness', 'spectralCentroid',
    'waveletBand0', 'waveletBand1', 'waveletBand2', 'waveletBand3', 'waveletBand4', 'waveletBand5',
    'pitchClass', 'spectralRolloff'].map(k => [k, 'n', 'fast']),
  ...['bass', 'treble', 'spectralEntropy', 'spectralSpread', 'spectralSkew', 'spectralKurtosis', 'spectralCentroid',
    'spectralFlux', 'waveletCentroid', 'waveletSpread', 'waveletTilt', 'energy'].map(k => [k, 'z', 'mid']),
  ...['energy', 'spectralCentroid', 'spectralEntropy', 'waveletTilt'].map(k => [k, 'tr', 'slow']),
  ...['spectralFlux', 'spectralRoughness', 'bass'].map(k => [k, 'sd', 'slow']),
  ...['spectralSpread', 'spectralKurtosis', 'spectralSkew', 'spectralEntropy', 'waveletTilt'].map(k => [k, 'n', 'slow']),
]
const FB_SPEED = { fast: [0.08, 0.5], mid: [0.25, 1.2], slow: [3, 8] }
const fbTarget = (f, [k, kind]) => {
  const g = (s) => f[k + s]
  if (kind === 'n') return g('Normalized')
  if (kind === 'z') return 0.5 + 0.5 * g('ZScore')
  if (kind === 'tr') return 0.5 + 0.5 * Math.sign(g('Slope')) * g('RSquared')
  return 2 * g('StandardDeviation') / Math.max(g('Max') - g('Min'), 1e-6)
}

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
    kAge: 1, kAmp: 0, kRefr: 0, kT: 9, kDur: 0.35, kPeak: 0, fluxEnv: 0, fAge: 1, fId: 0, fAmp: 0,
    bassSlow: 0, wAge: 1, wAmp: 0, sinceWave: 99,
    // story
    act: 0, actT: 0, actLog: [], slow: 1, forced: -1, buildT: 0, armed: 0, calmT: 0, lowT: 0, nova: 0, novaT: 99,
    heat: 1.0, size: 1.0, power: 1.0, dark: 0.0, abstract: 0.0, chaos: 0.3, pull: 0.0,
    sink: 0.0, night: 0.0, move: 1.0, skyPh: 0,
    galPh: 0, wind: 0, windTo: 0, fluxPh: 0, billow: 0, bassS: 0, kickS: 0,
    // LEGIBLE channels
    snAge: 1, snAmp: 0, snWas: 0, pitchMove: 0, pcWas: 0, build: 0, bassSus: 0, midsS: 0, cX: -2.0, cY: 1.4, kiss: 0,
    reach: 0, reachLeft: 0, sinceReach: 0, hotT: 0,
    // binary companion
    sunX: 0, sunY: 0.10, waveX: 0, waveY: 0.10, handX: 0, handY: 0.10,
    cOn: 0, cR: 2.6, cPh: 2.6, cPrec: 0, kissT: 1, sinceKiss: 0, kissFired: 1, k7Was: 0, kissLog: [], presence: 0,
    // section-change detector + shutter
    sustE: 0, sustF: 0, trend: 0, gateWas: null, sinceSection: 0,   // no event in the first 12 s (z-scores are noise until history fills)
    irisFrom: 1, irisTo: 1, shutterP: 1, shutterAng: 0, events: 0,
    // EVOLUTION (slow moods → monotonic clocks) and dramatic-but-safe events
    mChaos: 0.5, mGrit: 0.5, mFocus: 0.5, mSpike: 0.5, mTilt: 0.5, mAir: 0.5, mVolatile: 0.5, mWave: 0.5, mRise: 0.5,
    keyX: 1, keyY: 0,
    eChaos: 0, eGrit: 0, eFocus: 0, eSpike: 0, eAir: 0, eVolatile: 0, eRise: 0, eWave: 0,
    dropEnv: 0, dropHold: 0, dropRefr: 0, buildEnv: 0, shiftPulse: 0, entFast: 0.5, entSlow: 0.5,
    jump: 0, jumpTo: 0,
    latSpin: null, latRot: null,   // LATTICE-FEAT-1: seeded from bs_time below so the swap is seamless
    // TRIP story (K1)
    tripOn: 0, trip: 0, tripAct: 0, tripActT: 0, tripLog: [], tripSlow: 1,
    julia: 0, jR: 0.70, descend: 0, fractal: 0, dive: 0, jTurn: 0, tripHue: 45,
    budPh: null,   // BUD-CLOCK: seeded from diskPh below so the arms don't jump when BUD_PH switches over
  }
  // A state object from an older version of this file may lack newer keys, or hold a NaN an older
  // version latched (bs_fAge did, and froze the wall: out() threw every frame). Repair those fields
  // to their defaults; keep every healthy one, so the clocks and the eye stay where they were.
  const S = window.__blackSunState ??= {}
  for (const k in DEFAULTS) {
    const bad = typeof DEFAULTS[k] === 'number' && !Number.isFinite(S[k])
    if (!(k in S) || bad) S[k] = DEFAULTS[k]
  }
  if (!Array.isArray(S.fb) || S.fb.length !== FB_SPEC.length) S.fb = FB_SPEC.map(() => 0.5)
  S.fb = S.fb.map(v => Number.isFinite(v) ? v : 0.5)
  if (!Number.isFinite(S.latSpin)) S.latSpin = S.time * 0.004
  if (!Number.isFinite(S.latRot)) S.latRot = S.time * 0.0015
  if (!Number.isFinite(S.budPh)) S.budPh = S.diskPh
  if (!Number.isFinite(S.spT)) S.spT = S.time    // K7 SPEED clocks: seeded so nothing jumps on hot-swap
  if (!Number.isFinite(S.spB)) S.spB = S.budPh
  if (!Number.isFinite(S.flowPh)) { S.flowPh = 0; S.flowB = 0 }   // FLOW-CLOCK: seeded so nothing jumps on hot-swap

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
    // WAVELET (user, 2026-10-06: "use the wavelet uniforms"): the beat channels run on the DWT onsets,
    // which lead the FFT by ~60 ms. The page must run wavelet analysis (?wavelet=true, or enabled live).
    // No fallback to FFT onsets — missing wavelet features after warm-up is a launch error.
    if (['wavelet_bassHit', 'wavelet_confirmedDrop', 'waveletBand3ZScore', 'waveletBand4ZScore', 'waveletBand5ZScore', 'waveletCentroidZScore'].some(k => !Number.isFinite(f[k]))) {
      if (S.time > 6) throw new Error('black-sun: wavelet features missing — load the page with &wavelet=true')
      return out()
    }

    // PRESENCE: the music is playing RIGHT NOW (raw energy, ~0.25 s ease). energyMean lags ~8 s, so on a
    // sudden quiet gap the old gate stayed open while hiss sent crest/roughness/centroid z-scores
    // spiking — the scene got BRIGHTER in silence. Everything audio-driven is multiplied by presence.
    S.presence += (smoothstep(0.002, 0.01, f.energy) - S.presence) * (1 - Math.exp(-dt / 0.25))
    const gate = smoothstep(0.003, 0.015, f.energyMean) * S.presence   // matches the shader's GATE (tuned to the BlackHole line feed)

    // light envelopes — z-scores relative to the track, so they swing 0↔1 with the music
    S.bass     = envAR(S.bass, f.bassZScore * 0.7 + 0.25, 0.35, 0.05, dt)
    S.mids     = envAR(S.mids, f.midsZScore * 0.7 + 0.25, 0.25, 0.04, dt)
    S.treb     = envAR(S.treb, f.waveletBand5ZScore * 0.8 + 0.25, 0.5, 0.08, dt)   // hats: wavelet band 5
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
    S.diskPh += (0.6 + 0.8 * S.build) * dt   // plasma boil; the build quickens it   // plasma/disk orbit, radians; NOT wrapped (inner/outer at non-integer ratios). mids + bass speed the boil

    // kick: envelope + one deliberate wavefront per onset
    // KICK: wavelet bass onset (sharp, ~21 ms window) with a 120 ms refractory → envelope
    S.kRefr -= dt
    const wHit = f.wavelet_bassHit > 0.9 && S.kRefr <= 0
    if (wHit) S.kRefr = 0.12
    const kRaw = wHit ? clamp01(0.55 + 0.25 * f.wavelet_bassHit) * gate : 0
    const kPrev = S.kick
    // KICK-EASE (user: "an ease-out animation after the beat"): HIT → glide back. Instant attack on
    // the onset, then a cubic ease-out over T = 60% of the last inter-onset gap (0.25–0.45 s), so fast
    // tempos don't smear into mush. A new onset mid-release re-triggers from the current value (never
    // dips to zero first — no flicker).
    S.kT += dt
    if (kRaw > 0) {
      const ioi = S.kT
      S.kDur = Math.min(0.45, Math.max(0.25, 0.6 * (ioi > 0.15 && ioi < 2 ? ioi : 0.6)))
      S.kPeak = Math.max(S.kick, kRaw)
      S.kT = 0
    }
    const ku = Math.min(1, S.kT / S.kDur)
    S.kick = S.kPeak * Math.pow(1 - ku, 3)   // release ~0.5 s: a hit blooms and glides off instead of strobing
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
      drop: S.armed > 0 && f.wavelet_confirmedDrop > 1.0 && f.energyZScore - S.sustE > 0.4,   // the drop: wavelet-confirmed
      calm: S.calmT > 15,
      low: S.lowT > 10,
    }
    const k5 = f.knob_5 ?? 0
    const goTo = (i, cause) => {
      if (i === S.act) return
      S.actLog.push({ t: +S.time.toFixed(1), from: ACTS[S.act].name, to: ACTS[i].name, cause, eZ: +f.energyZScore.toFixed(2), sustE: +S.sustE.toFixed(2), trend: +S.trend.toFixed(2) })
      if (S.actLog.length > 50) S.actLog.shift()
      S.slow = cause === 'fallback' ? 2.5 : 1
      S.act = i; S.actT = 0
      if (i === 3) fireWave(0.8)                       // collapse: the space around it shudders inward
      if (i === 4) { S.armed = 0; S.novaT = 0; S.sinceWave = 99; fireWave(1); S.windTo = Math.min(2, S.windTo + 0.4) }   // detonation
      if (i === 6) S.windTo = 0                         // rebirth unwinds the galaxy (eased)
    }
    // K1 TRIP: ≥ 0.5 runs the trip arc. The classic act and its dwell freeze while it runs, and the
    // shared params glide from wherever they are, so flipping K1 either way is a morph, never a cut.
    const tripOn = (f.knob_1 ?? 0) >= 0.5
    S.trip += ((tripOn ? 1 : 0) - S.trip) * (1 - Math.exp(-dt / 6))
    const tripGoTo = (i, cause) => {
      if (i === S.tripAct) return
      S.tripLog.push({ t: +S.time.toFixed(1), from: TRIP_ACTS[S.tripAct].name, to: TRIP_ACTS[i].name, cause, eZ: +f.energyZScore.toFixed(2), sustE: +S.sustE.toFixed(2), trend: +S.trend.toFixed(2) })
      if (S.tripLog.length > 50) S.tripLog.shift()
      S.tripSlow = cause === 'fallback' ? 2.5 : 1
      S.tripAct = i; S.tripActT = 0
      if (cause === 'drop') S.armed = 0                 // a drop is spent once
      const role = TRIP_ACTS[i].role
      if (role === 3) fireWave(0.8)
      if (role === 4) { S.armed = 0; S.novaT = 0; S.sinceWave = 99; fireWave(1); S.windTo = Math.min(2, S.windTo + 0.4) }
      if (role === 6) S.windTo = 0
    }
    if (tripOn) {
      S.tripActT += dt
      if (k5 > 0.02) tripGoTo(Math.min(TRIP_ACTS.length - 1, Math.floor(k5 * TRIP_ACTS.length)), 'knob')
      else {
        const nx = TRIP_ACTS[S.tripAct].next(m, S.tripActT)
        if (nx && S.tripActT >= TRIP_ACTS[S.tripAct].min) tripGoTo(nx[0], nx[1])
      }
    } else if (k5 > 0.02) goTo(Math.min(ACTS.length - 1, Math.floor(k5 * ACTS.length)), 'knob')
    else {
      const nx = ACTS[S.act].next(m, S.actT)
      if (nx && S.actT >= ACTS[S.act].min) goTo(nx[0], nx[1])
    }
    const TA = TRIP_ACTS[S.tripAct]
    const A = tripOn ? TA : ACTS[S.act]
    const glideSlow = tripOn ? S.tripSlow : S.slow
    for (const k of STORY_KEYS) S[k] = S[k] + (A.p[k] - S[k]) * (1 - Math.exp(-dt * 3 / (A.ease * glideSlow)))
    for (const k of TRIP_KEYS) {
      const to = tripOn ? TA.p[k] : TRIP_REST[k] ?? S[k]
      S[k] += (to - S[k]) * (1 - Math.exp(-dt * 3 / (tripOn ? TA.ease * S.tripSlow : 18)))
    }
    // colour follows only slow music: the act's family, or (LUCID) the 20 s key folded into 0..300°
    const keyT = fract(Math.atan2(S.keyY, S.keyX) / (Math.PI * 2) + 1)
    const hueTo = TA.hue ?? 300 * (1 - Math.abs(2 * keyT - 1))
    if (tripOn) S.tripHue += (hueTo - S.tripHue) * (1 - Math.exp(-dt / 30))
    // geometry only evolves forward: the music sets these clocks' RATES, never their positions
    S.dive += S.descend * (0.04 + 0.08 * S.build) * dt
    S.jTurn += (1 / 240) * (1 + S.pitchMove + 0.5 * S.build) * dt
    const roleAct = tripOn ? TA.role : S.act
    S.tripOn = tripOn ? 1 : 0
    S.nova = S.novaT < 30 ? Math.exp(-S.novaT / 6) : 0  // the detonation flash, one big eased event
    // SKY PATH: a monotonic phase (never wrapped, never reversed) drives a slow Lissajous with
    // incommensurate periods — a full wander takes many minutes. The act's `move` sets the rate (0 =
    // the sun holds still), slow energy nudges it, and `sink` lowers it toward the horizon.
    S.skyPh += 0.012 * S.move * (0.6 + 0.6 * S.energy) * dt
    const pathX = 0.55 * Math.sin(S.skyPh * 2.0)
    const pathY = 0.10 + 0.18 * (Math.sin(S.skyPh * 3.17 + 1.0) - Math.sin(1.0)) - S.sink   // phase 0 = the old fixed (0, 0.10)
    // K15 SUN X / K16 SUN Y place the sun by hand. Each axis blends in over the first 8% of its dial so
    // lifting one off 0 never jumps it (or the other axis), and the hand position glides (~0.3 s) from
    // wherever the sky path had it. Frame units: y spans ±1, x spans ±aspect; 0.3 margin keeps it on screen.
    const aspect = window.innerWidth / window.innerHeight
    const handAxis = (k, auto, half, key) => {
      const w = Math.min(1, k / 0.08)
      if (w === 0) { S[key] = auto; return auto }
      S[key] += ((k * 2 - 1) * (half - 0.3) - S[key]) * (1 - Math.exp(-dt / 0.3))
      return auto + (S[key] - auto) * w
    }
    const handX = handAxis(f.knob_15 ?? 0, pathX, aspect, 'handX')
    const handY = handAxis(f.knob_16 ?? 0, pathY, 1, 'handY')

    // COMPANION: a small dark-red star. It enters from off-screen upper-left and spirals in over a
    // few minutes (radius eases inward), then dances a slow, slightly elliptical, precessing orbit
    // (mids speed the dance — a rate). The main star wobbles about the shared barycentre. KISS: on a
    // drop or section change (30 s refractory), or a strong sustained onset cluster — never on a timer
    // — the orbit dips until the coronas overlap, a distortion front fires from the contact
    // point, and they drift apart. SUPERNOVA flings it away; it re-forms and re-enters in REBIRTH.
    const flung = roleAct === 4 || roleAct === 5
    if (roleAct === 6 && S.cOn < 0.05) { S.cR = 2.6; S.cPh = 2.6 }
    S.cOn += ((flung ? 0 : 1) - S.cOn) * (1 - Math.exp(-dt / (flung ? 3 : 20)))
    const cRTo = flung ? 3.5 : tripOn && S.tripAct === 4 ? 0.5 : 0.78   // TWIN: the companion waltzes close
    S.cR += (cRTo - S.cR) * (1 - Math.exp(-dt / (flung ? 4 : 55)))
    S.cPh -= (0.04 + 0.12 * S.pitchMove) * dt            // melody: pitch movement drives the companion's dance          // clockwise: from the upper-left it swoops in over the top
    S.cPrec += 0.006 * dt
    S.sinceKiss += dt
    S.kissT = Math.min(1, S.kissT + dt / 10)
    const kiss = Math.pow(Math.sin(Math.PI * S.kissT), 2)
    const startKiss = (cause, guard = 30) => {
      if (S.sinceKiss < guard || S.cR > 1.2 || flung || S.kissT < 1) return
      S.sinceKiss = 0; S.kissT = 0; S.kissFired = 0
      S.kissLog.push({ t: +S.time.toFixed(1), cause })
      if (S.kissLog.length > 50) S.kissLog.shift()
    }
    // A kiss happens ONLY on a meaningful musical event (user, 2026-10-06: "only as the result of a
    // significant audio event that makes sense"): a drop, a section change (below), or a strong
    // sustained onset cluster. K7 is SPEED now (2026-10-10), not a manual kiss.
    if (m.drop) startKiss('drop')
    if (S.fluxEnv > 0.7 && S.sustF > 0.8) startKiss('onsets')
    const rEff = S.cR + (0.3 - S.cR) * kiss
    const ex = rEff * Math.cos(S.cPh), ey = rEff * 0.78 * Math.sin(S.cPh)
    const cp = Math.cos(S.cPrec), sp = Math.sin(S.cPrec)
    const ox = ex * cp - ey * sp, oy = ex * sp + ey * cp
    const wob = 0.12 * S.cOn * Math.min(1, 0.8 / Math.max(S.cR, 0.3))   // barycentre wobble, weak while it is still far out
    S.sunX = handX - ox * wob
    S.sunY = handY - oy * wob
    S.cX = S.sunX + ox
    S.cY = S.sunY + oy
    S.kiss = kiss
    if (!S.kissFired && S.kissT > 0.45) { S.kissFired = 1; S.sinceWave = 99; fireWave(1, (S.sunX + S.cX) / 2, (S.sunY + S.cY) / 2) }
    // GALAXY: the spiral arms' flow (mids set the speed — a rate, never a jump), their winding (a one-way
    // eased step on every drop / section change / supernova, capped), and an outward flux wave clock
    // LEGIBLE: each musical element gets ONE visual verb (sun.md table). Envelopes for those verbs:
    //   snare  — a mid-band flux onset → one spark ring bursting out along the rays (countable)
    //   melody — pitch movement (pitch-class steps + centroid motion) → the companion
    //   build  — confident energy trend → ray reach + background flow speed
    //   bass sustain — slow bassNormalized → nebula gas breathing
    //   mids   — mid-speed mids envelope → tendril sway amplitude
    const snRaw = clamp01((Math.max(f.waveletBand3ZScore, f.waveletBand4ZScore) - 0.35) * 1.6) * gate   // snare-ish: wavelet bands 3/4 onsets
    if (snRaw > 0.35 && S.snWas < 0.2 && S.snAge > 0.25) { S.snAge = 0; S.snAmp = clamp01(snRaw * 1.4) }
    else S.snAge = Math.min(1, S.snAge + dt / 0.9)
    S.snWas = snRaw
    const pc = f.pitchClass ?? 0
    const step = Math.min(Math.abs(pc - S.pcWas), 1 - Math.abs(pc - S.pcWas))
    S.pcWas = pc
    const pm = clamp01(step * 6 + Math.abs(f.waveletCentroidZScore) * 0.4) * gate   // melody: pitch-class steps + wavelet centroid glides
    S.pitchMove += (pm - S.pitchMove) * (1 - Math.exp(-dt / (pm > S.pitchMove ? 0.12 : 0.9)))
    S.build += (clamp01(S.trend * 0.8) * gate - S.build) * (1 - Math.exp(-dt / 2))
    S.bassSus += (clamp01(f.bassNormalized) * gate - S.bassSus) * (1 - Math.exp(-dt / (f.bassNormalized * gate > S.bassSus ? 1.2 : 2.5)))
    S.midsS += (clamp01(f.midsZScore * 0.6 + 0.3) * gate - S.midsS) * (1 - Math.exp(-dt / 0.35))
    S.budPh += (0.5 + 0.9 * S.bassSus) * dt   // BUD-CLOCK: Julia arms turn faster under sustained bass; rate only, never reverses
    const speed = Math.pow(4, clamp01(f.knob_7 ?? 0))   // K7 SPEED: 1×..4× rate on the giant's turn + boil clocks (rate only, never reverses)
    S.spT += speed * dt
    S.spB += speed * (0.5 + 0.9 * S.bassSus) * dt
    S.galPh += (0.05 + 0.5 * S.build) * dt   // build accelerates the background flow
    S.wind += (S.windTo - S.wind) * (1 - Math.exp(-dt / 4))
    S.fluxPh += (0.05 + 0.9 * S.flux * gate) * dt
    // FLOW-CLOCK: the backdrop's travel clock. Rate follows bass (attack ~150 ms, release ~600 ms) plus
    // loudness, so loud bass passages visibly stream and quiet ones drift. Rate only, never reverses.
    const fb = clamp01(f.bassNormalized) * gate
    S.flowB += (fb - S.flowB) * (1 - Math.exp(-dt / (fb > S.flowB ? 0.15 : 0.6)))
    S.flowPh += (0.1 + 3.2 * Math.pow(S.flowB, 1.5) + 0.5 * S.energy * gate) * dt
    // BILLOW: the only audio allowed to scale a background WARP — a slow (~4 s) ease of bass + roughness.
    // Warp amplitude that follows fast envelopes pushes the field back and forth every beat (shiver).
    // BACKGROUND ENVELOPES: big layers flicker on the main envelopes (bass attack ~3 frames, kick ~1).
    // Background light uses these instead: attack ~80 ms, release ~600 ms.
    const arS = (p, x) => p + (clamp01(x) - p) * (1 - Math.exp(-dt / (x > p ? 0.08 : 0.6)))
    S.bassS = arS(S.bassS, S.bass)
    S.kickS = arS(S.kickS, S.kick)
    S.billow += (clamp01(0.6 * S.bass + 0.4 * S.rough) * gate - S.billow) * (1 - Math.exp(-dt / 4))
    // REACH: huge rays as an aesthetic that comes and goes, not the default. A window opens in
    // REBIRTH or on a sustained hot section (10 s); it lasts 30–90 s and eases in/out over ~20 s. K6 REACH (knob_6) forces the amount.
    S.sinceReach += dt
    S.hotT = S.sustE > 0.5 ? S.hotT + dt : 0
    const openReach = () => { if (S.reachLeft > 0 || S.sinceReach < 60) return; S.reachLeft = 30 + 60 * Math.random(); S.sinceReach = 0 }
    if (roleAct === 6 || S.hotT > 10) openReach()   // music-earned only (no random windows)
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
      S.actLog.push({ t: +S.time.toFixed(1), shutter: +S.irisTo.toFixed(2), cause: 'section', eZ: +f.energyZScore.toFixed(2), sustE: +S.sustE.toFixed(2), sustF: +S.sustF.toFixed(2), trend: +S.trend.toFixed(2) })
      fireWave(1)
      S.windTo = Math.min(2, S.windTo + 0.2)
      startKiss('section')
    }

    evolve(f, dt)
    featureBank(f, dt)
    return out()
  }

  // EVOLUTION — the scene drifts with the music's slow character. Optional features: a missing or
  // non-finite one falls back to a neutral value instead of freezing the whole controller.
  function evolve(f, dt) {
    const num = (x, d) => Number.isFinite(x) ? x : d
    const slowTo = (p, x, tc) => p + (clamp01(x) - p) * (1 - Math.exp(-dt / tc))
    const live = S.presence

    S.mChaos    = slowTo(S.mChaos,    smoothstep(0.80, 1.00, num(f.spectralEntropyMean, 0.9)), 12)
    S.mGrit     = slowTo(S.mGrit,     smoothstep(0.05, 0.45, num(f.spectralRoughnessMedian, 0.25)), 12)
    S.mFocus    = slowTo(S.mFocus,    smoothstep(0.20, 0.80, num(f.spectralKurtosisMean, 0.5)), 12)
    S.mSpike    = slowTo(S.mSpike,    smoothstep(0.03, 0.25, num(f.spectralCrestMean, 0.1)), 12)
    S.mTilt     = slowTo(S.mTilt,     smoothstep(0.30, 0.70, num(f.spectralSkewMean, 0.5)), 12)
    S.mAir      = slowTo(S.mAir,      smoothstep(0.30, 0.90, num(f.spectralRolloffMean, 0.6)), 12)
    S.mVolatile = slowTo(S.mVolatile, 0.7 * smoothstep(0.03, 0.25, num(f.spectralFluxStandardDeviation, 0.1))
                                    + 0.3 * smoothstep(0.005, 0.06, num(f.spectralRoughnessStandardDeviation, 0.02)), 10)
    S.mWave     = slowTo(S.mWave,     num(f.waveletCentroidNormalized, 0.5), 15)
    const trendE = Math.max(-1, Math.min(1, num(f.energySlope, 0) * 600)) * num(f.energyRSquared, 0)
    const trendC = Math.max(-1, Math.min(1, num(f.spectralCentroidSlope, 0) * 600)) * num(f.spectralCentroidRSquared, 0)
    S.mRise     = slowTo(S.mRise, 0.5 + 0.5 * Math.max(-1, Math.min(1, 2 * trendE + trendC)), 10)

    // key: pitchClassMedian is circular, so smooth on the unit circle (no 11 → 0 jump)
    const key = num(f.pitchClassMedian, 0) * Math.PI * 2
    const kc = 1 - Math.exp(-dt / 20)
    S.keyX += (Math.cos(key) - S.keyX) * kc
    S.keyY += (Math.sin(key) - S.keyY) * kc

    // clocks in turns; the music sets only the RATE, so they never run backwards
    const r = (m) => (0.003 + 0.03 * m) * (0.3 + 0.7 * live) * dt
    S.eChaos += r(S.mChaos); S.eGrit += r(S.mGrit); S.eFocus += r(S.mFocus); S.eSpike += r(S.mSpike)
    S.eAir += r(S.mAir); S.eVolatile += r(S.mVolatile); S.eWave += r(S.mWave)
    S.eRise += r(Math.max(0, S.mRise - 0.5) * 2)

    // DRAMATIC, SAFE: envelopes for brightness/saturation swells, never raw flashes
    S.dropRefr = Math.max(0, S.dropRefr - dt)
    S.dropHold = Math.max(0, S.dropHold - dt)
    const hit = num(f.wavelet_confirmedDrop, 0) > 0.5 || (num(f.energyZScore, 0) > 0.6 && num(f.bassZScore, 0) > 0.5)
    if (hit && live > 0.5 && S.dropRefr === 0 && S.sinceSection > 6) {
      S.dropHold = 0.3
      S.dropRefr = 8
      S.jumpTo += 1
    }
    S.dropEnv += ((S.dropHold > 0 ? 1 : 0) - S.dropEnv) * (1 - Math.exp(-dt / (S.dropHold > 0 ? 0.05 : 1.0)))
    S.jump += (S.jumpTo - S.jump) * (1 - Math.exp(-dt / 1.0))

    const build = smoothstep(0.05, 0.30, Math.max(0, trendE) + 0.5 * Math.max(0, trendC)) * live
    S.buildEnv += (build - S.buildEnv) * (1 - Math.exp(-dt / (build > S.buildEnv ? 6 : 3)))

    const ent = num(f.spectralEntropyNormalized, 0.5)
    S.entFast += (ent - S.entFast) * (1 - Math.exp(-dt / 0.5))
    S.entSlow += (ent - S.entSlow) * (1 - Math.exp(-dt / 6))
    const shift = clamp01(0.6 * Math.max(0, num(f.spectralFluxZScore, 0) - 0.3) + 0.4 * smoothstep(0.03, 0.2, Math.abs(S.entFast - S.entSlow))) * live
    S.shiftPulse += (shift - S.shiftPulse) * (1 - Math.exp(-dt / (shift > S.shiftPulse ? 0.3 : 2.5)))
  }

  function irisScale() {
    const p = S.shutterP, e = p * p * (3 - 2 * p)
    return S.irisFrom + (S.irisTo - S.irisFrom) * e
  }

  // LATTICE-FEAT-1: a missing or non-finite feature holds its channel where it was.
  function featureBank(f, dt) {
    FB_SPEC.forEach((spec, i) => {
      const x = fbTarget(f, spec)
      if (!Number.isFinite(x)) return
      const [att, rel] = FB_SPEED[spec[2]]
      const y = clamp01(x)
      S.fb[i] += (y - S.fb[i]) * (1 - Math.exp(-dt / (y > S.fb[i] ? att : rel)))
    })
    S.latSpin += dt * 0.004 * (0.75 + 0.5 * S.fb[30])   // entropy trend speeds the lattice morph (rate only)
    S.latRot += dt * 0.0015 * (0.7 + 0.6 * S.fb[39])    // wavelet tilt speeds the whole-lattice turn
  }

  // Fail loud: a NaN reaching the shader silently blanks whatever reads it (bs_pal did, before INPUTS).
  function out() {
    const o = {
      bs_time: S.time, bs_eye: S.eye,
      bs_presence: S.presence,
      bs_bass: S.bass, bs_mids: S.mids, bs_treb: S.treb, bs_energy: S.energy, bs_entropy: S.entropy,
      bs_centroid: S.centroid, bs_pump: S.pump, bs_drop: S.drop, bs_flux: S.flux, bs_rough: S.rough,
      bs_crest: S.crest, bs_roll: S.roll, bs_kick: S.kick,
      bs_curl: S.curl, bs_dir: S.dir, bs_flex: S.flex, bs_wave: S.wave, bs_len: S.len, bs_thick: S.thick,
      bs_flow: fract(S.flow), bs_twist: fract(S.twist), bs_flexPh: fract(S.flexPh), bs_pal: fract(S.pal),
      bs_kAge: S.kAge, bs_kAmp: S.kAmp, bs_kickEase: S.kick,
      bs_irisScale: irisScale(), bs_shutter: Math.sin(Math.PI * S.shutterP), bs_shutterAng: fract(S.shutterAng), bs_diskPh: S.diskPh,
      bs_fAge: S.fAge, bs_fId: S.fId, bs_fAmp: S.fAmp,
      bs_wAge: S.wAge, bs_wAmp: S.wAmp,
      bs_heat: S.heat, bs_size: S.size, bs_power: S.power, bs_dark: S.dark, bs_abstract: S.abstract,
      bs_chaos: S.chaos, bs_pull: S.pull, bs_night: S.night,
      bs_sunX: S.sunX, bs_sunY: S.sunY, bs_cX: S.cX, bs_cY: S.cY, bs_cOn: S.cOn, bs_kiss: S.kiss, bs_waveX: S.waveX, bs_waveY: S.waveY,
      bs_snAge: S.snAge, bs_snAmp: S.snAmp, bs_pitchMove: S.pitchMove, bs_build: S.build, bs_bassSus: S.bassSus, bs_midsS: S.midsS,
      bs_reach: S.reach, bs_billow: S.billow, bs_bassS: S.bassS, bs_kickS: S.kickS, bs_galPh: S.galPh, bs_wind: S.wind, bs_fluxPh: S.fluxPh,
      bs_nova: S.nova, bs_shell: Math.min(S.novaT, 30), bs_act: S.tripOn ? TRIP_ACTS[S.tripAct].role : S.act, bs_actT: S.tripOn ? S.tripActT : S.actT,
      bs_moodChaos: S.mChaos, bs_moodGrit: S.mGrit, bs_moodFocus: S.mFocus, bs_moodSpike: S.mSpike,
      bs_moodTilt: S.mTilt, bs_moodAir: S.mAir, bs_moodVolatile: S.mVolatile, bs_moodWave: S.mWave, bs_moodRise: S.mRise,
      bs_moodKey: fract(Math.atan2(S.keyY, S.keyX) / (Math.PI * 2) + 1),
      bs_evoChaos: fract(S.eChaos), bs_evoGrit: fract(S.eGrit), bs_evoFocus: fract(S.eFocus), bs_evoSpike: fract(S.eSpike),
      bs_evoAir: fract(S.eAir), bs_evoVolatile: fract(S.eVolatile), bs_evoRise: fract(S.eRise), bs_evoWave: fract(S.eWave),
      bs_dropEnv: S.dropEnv, bs_buildEnv: S.buildEnv, bs_shiftPulse: S.shiftPulse, bs_evoJump: S.jump,
      bs_latSpin: S.latSpin, bs_latRot: S.latRot,
      bs_trip: S.trip, bs_tripAct: S.tripAct, bs_tripActT: S.tripActT, bs_julia: S.julia, bs_jR: S.jR,
      bs_descend: S.descend, bs_fractal: S.fractal, bs_dive: fract(S.dive), bs_jTurn: fract(S.jTurn), bs_tripHue: S.tripHue / 360,
      bs_budPh: S.budPh,
      bs_spT: S.spT, bs_spB: S.spB, bs_flowPh: S.flowPh,
      ...Object.fromEntries(S.fb.map((v, i) => [`bs_f${i}`, v])),
    }
    const bad = Object.keys(o).filter(k => !Number.isFinite(o[k]))
    if (bad.length) throw new Error(`black-sun controller produced non-finite ${bad.join(', ')}`)
    return o
  }
}
