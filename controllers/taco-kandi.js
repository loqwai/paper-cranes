// taco-kandi controller — latched beat pulse + smoothed bass for non-twitchy reactivity
//
// User flag iter 55: "Get the beat/zoom thing working more reliably (but don't
// use the 'beat uniform) You might need to use a controller."
//
// The raw `beat` flag is unreliable across tracks. Build a multi-signal kick
// detector here: bassZScore peaks + bassN delta + spectralFluxZScore peaks.
// Three signals OR'd together latch into beat_kick (NEW output) which fires
// far more consistently than the binary beat flag.
//
// Outputs:
//   beat_pulse  — kept for backwards-compat (beat OR strong bassZ spike, ~1s decay)
//   beat_kick   — NEW iter 55: STRONGER multi-signal kick detector. Use this for
//                 beat-driven zoom/effects instead of beat_pulse on its own.
//   bass_smooth — EMA-smoothed bassNormalized, no per-frame jitter
//   drop_glow   — sustained drop signal (build + drop)
//
// Internal state — module-level lets persist across frames.

let beatPulse = 0
let beatKick = 0
let bassSmooth = 0
let bassPrev = 0
let dropGlow = 0

// Spring-physics zoom_pulse state (iter 67).
let zoomPos = 0      // current spring position [0, 1]
let zoomVel = 0      // current spring velocity

// BPM detection state (iter 72).
// User: "Maybe we calculate the bpm in the controller even".
// Track timestamps of CONFIDENT recent kicks. Median inter-kick interval
// gives BPM. Once we have BPM we can phase-lock visuals to predicted beats
// even when the immediate audio frame is quiet.
let lastFrameTime = 0       // perf.now() at last call
let kickStamps = []         // [t1, t2, ...] in seconds since module load
let lastKickTime = 0        // for predicting next-beat
let lastKickValue = 0       // hysteresis — only register a NEW kick after value drops
let bpmSmoothed = 120       // EMA-smoothed BPM (default 120 until we have data)
let beatPhasePos = 0        // 0..1, ramps with elapsed time / beat_period
let moduleStartTime = null  // first-call performance.now()

export default (features) => {
  // User rule: NEVER use the `beat` boolean uniform. Even reading it via
  // features.beat is rejected — kick detection is from z-scores only.
  const bassZ = features.bassZScore ?? 0
  const energyZ = features.energyZScore ?? 0
  const fluxZ = features.spectralFluxZScore ?? 0
  const bassN = features.bassNormalized ?? 0
  const bassMedian = features.bassMedian ?? bassN
  const bassSlope = features.bassSlope ?? 0
  const bassR2 = features.bassRSquared ?? 0

  // ---- BEAT PULSE — conservative kick (bassZ-only, exp-decay) ----
  // Triggers on STRONG bass spikes only (bassZ > 0.6). For shaders that want
  // a calm beat indicator without flicker on lighter kicks. Slower decay
  // (~0.92/frame ≈ 0.7s halflife) keeps the pulse held even longer.
  const bassPulseTrigger = Math.max(0, (bassZ - 0.6) * 1.5)
  beatPulse = bassPulseTrigger > 0.15 ? Math.max(beatPulse, Math.min(bassPulseTrigger, 1.0)) : beatPulse * 0.92
  if (beatPulse < 0.01) beatPulse = 0

  // ---- BEAT KICK — z-score multi-signal detector (iter 55, primary) ----
  // OR's three independent kick-indicators so SOMETHING almost always fires
  // on a beat across genres, WITHOUT using the unreliable `beat` flag:
  //   1. bassZScore > 0.3 — bass louder than recent average
  //   2. bassN rising delta > 0.04 — sudden bass attack (frame-to-frame diff)
  //   3. spectralFluxZScore > 0.4 — timbral change (snare/clap)
  // Latch ratchets up, exp-decays at ~0.90/frame (~0.5s visible halflife).
  const bassDelta = Math.max(0, bassN - bassPrev)
  bassPrev = bassN
  const kickFromBassZ     = Math.max(0, (bassZ - 0.3) * 1.5)     // 0..1.05 for bassZ 0.3..1.0
  const kickFromBassDelta = Math.max(0, (bassDelta - 0.04) * 12) // 0..1 for delta 0.04..0.12
  const kickFromFlux      = Math.max(0, (fluxZ - 0.4) * 1.5)     // 0..0.9 for fluxZ 0.4..1.0
  const kickTrigger = Math.max(kickFromBassZ, kickFromBassDelta, kickFromFlux)
  beatKick = kickTrigger > 0.08 ? Math.max(beatKick, Math.min(kickTrigger, 1.0)) : beatKick * 0.90
  if (beatKick < 0.01) beatKick = 0

  // ---- BASS SMOOTH ----
  const target = Math.max(bassN, bassMedian)
  bassSmooth = bassSmooth * 0.85 + target * 0.15

  // ---- DROP GLOW ----
  const slopeConfidence = Math.max(0, bassSlope) * bassR2 * 100
  const spike = Math.max(energyZ, bassZ * 0.7, slopeConfidence)
  dropGlow = spike > 0.15 ? Math.max(dropGlow, Math.min(spike, 1.0)) : dropGlow * 0.96
  if (dropGlow < 0.01) dropGlow = 0

  // ---- ZOOM PULSE — spring-physics animation function (iter 67) ----
  // User: "We still need less shivery bass response. Use one of the animation
  // functions." Critically-damped spring: kicks PUSH velocity, friction
  // decelerates, position is the smoothed pulse the shader reads. No per-
  // frame z-score jitter survives because the spring acts as a low-pass
  // physical filter — it can only move so fast.
  //
  // Tuning:
  //   stiffness = 0.20 — pulled toward 0 with this constant per frame.
  //   damping   = 0.86 — velocity friction (1=no friction, 0=instant stop).
  //                      0.86 ≈ ~0.3s decay halflife at 60fps.
  //   kick      = max of beatKick + bassDelta * 25 → fed into velocity.
  // Result: a real kick punches the spring upward by ~0.3-0.6, then it
  // smoothly decays back to 0 over ~300ms with elastic easing. Multiple
  // close kicks stack additively (each adds velocity). No twitchy jitter.
  const kickEnvelope = Math.max(beatKick, kickFromBassDelta) * 0.35
  zoomVel += kickEnvelope        // kick injects velocity
  zoomVel -= zoomPos * 0.20      // spring force toward 0
  zoomVel *= 0.86                // damping (friction)
  zoomPos += zoomVel
  // Clamp position so it can't blow up if a freak input lands.
  if (zoomPos < 0) { zoomPos = 0; zoomVel *= -0.3 }  // soft bounce off floor
  if (zoomPos > 1.5) { zoomPos = 1.5; zoomVel *= -0.3 }

  // ---- BPM DETECTION + BEAT PHASE (iter 72) ----
  // User: "Maybe we calculate the bpm in the controller even".
  // 1. Detect kick events (rising edge of beatKick > 0.4, with hysteresis).
  // 2. Record timestamp; keep last ~16 kicks.
  // 3. Compute median inter-kick interval → BPM.
  // 4. Phase-lock beatPhasePos to a predicted beat grid: ramps 0→1 between
  //    expected beats, snaps to the closest predicted beat-time.
  if (moduleStartTime === null) moduleStartTime = performance.now()
  const nowS = (performance.now() - moduleStartTime) / 1000

  // Hysteresis: register a kick when beatKick crosses up through 0.45 AND
  // hadn't been there last frame (rising edge). Avoids double-counting
  // sustained kicks during decay.
  if (beatKick > 0.45 && lastKickValue <= 0.45) {
    kickStamps.push(nowS)
    if (kickStamps.length > 16) kickStamps.shift()
    lastKickTime = nowS
  }
  lastKickValue = beatKick

  // Compute median inter-kick interval if we have ≥ 4 kicks
  if (kickStamps.length >= 4) {
    const intervals = []
    for (let i = 1; i < kickStamps.length; i++) {
      intervals.push(kickStamps[i] - kickStamps[i-1])
    }
    intervals.sort((a, b) => a - b)
    const median = intervals[Math.floor(intervals.length / 2)]
    // Clamp to plausible musical BPM range (60..200 → period 1.0..0.3s)
    if (median >= 0.30 && median <= 1.0) {
      const newBpm = 60 / median
      // EMA smooth so BPM doesn't whiplash on a stray double-kick or skip
      bpmSmoothed = bpmSmoothed * 0.85 + newBpm * 0.15
    }
  }

  // BEAT PHASE: 0..1 ramp synchronized to predicted beat grid.
  // Time elapsed since last detected kick / beat period (1/bpm * 60).
  const beatPeriodS = 60 / bpmSmoothed
  const tSinceLastKick = nowS - lastKickTime
  // Position in current "beat slot": fraction 0..1 of beatPeriodS
  beatPhasePos = (tSinceLastKick % beatPeriodS) / beatPeriodS

  return {
    beat_pulse: beatPulse,
    beat_kick: beatKick,
    bass_smooth: bassSmooth,
    drop_glow: dropGlow,
    zoom_pulse: zoomPos,
    bpm: bpmSmoothed,
    beat_phase: beatPhasePos,
  }
}
