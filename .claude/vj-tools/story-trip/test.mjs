import assert from 'node:assert/strict'

const DT = 0.09
const FRAMES = 20000
const CLASSIC = new URL('../../../controllers/black-sun.js', import.meta.url)
const STAGED = new URL('./black-sun.trip.js', import.meta.url)

const mulberry = seed => () => {
  seed |= 0; seed = seed + 0x6d2b79f5 | 0
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
  return ((t ^ t >>> 14) >>> 0) / 4294967296
}

const PATTERN = [
  ['steady', 50], ['build', 45], ['drop', 7], ['steady', 78], ['steady', 60], ['build', 60], ['drop', 10],
  ['steady', 40], ['silence', 30], ['quiet', 60], ['steady', 60], ['quiet', 80],
]
const phaseAt = t => {
  if (t < 30) return 'quiet'
  if (t < 120) return 'steady'
  const period = PATTERN.reduce((s, [, d]) => s + d, 0)
  let u = (t - 120) % period
  for (const [p, d] of PATTERN) { if (u < d) return p; u -= d }
  return 'steady'
}
const k1At = t => t >= 120 && !(t >= 1100 && t < 1200) ? 1 : 0

const feed = (k1Schedule) => {
  const rnd = mulberry(7)
  const n = (a) => (rnd() * 2 - 1) * a
  return Array.from({ length: FRAMES }, (_, i) => {
    const t = i * DT
    const phase = phaseAt(t)
    const level = { silence: 0, quiet: 0.02, steady: 0.1, build: 0.1 + 0.002 * (t % 60), drop: 0.25 }[phase]
    const eZ = { silence: 0, quiet: -0.4, steady: 0, build: 0.3, drop: 1.4 }[phase]
    const beat = phase !== 'silence' && phase !== 'quiet' && (t % 0.5) < DT
    return {
      phase, t,
      energy: level, energyMean: level, energyNormalized: level * 4, pitchClass: (Math.floor(t / 2) % 12) / 12,
      bassZScore: (phase === 'drop' ? 1.2 : 0) + n(0.15), midsZScore: n(0.2), trebleZScore: n(0.2),
      spectralEntropyNormalized: 0.5 + n(0.1), spectralCentroidZScore: n(0.2), bassNormalized: level * 3,
      energyZScore: eZ + n(0.1), spectralFluxZScore: 0.1 + n(0.15), spectralRoughnessZScore: n(0.2),
      spectralCrestZScore: n(0.2), spectralRolloffZScore: n(0.2), spectralCentroidMedian: 0.25,
      spectralSkewMean: 0.5, bassMedian: 0.08, spectralEntropyMedian: 0.8, spectralRolloffMean: 0.3,
      spectralKurtosisMedian: 0.5, energySlope: phase === 'build' ? 0.0004 : 0, energyRSquared: phase === 'build' ? 0.9 : 0.1,
      spectralSpreadMean: 0.2,
      wavelet_bassHit: beat ? 1 : 0, wavelet_confirmedDrop: phase === 'drop' ? 1.5 : 0,
      waveletBand3ZScore: n(0.3), waveletBand4ZScore: n(0.3), waveletBand5ZScore: n(0.3), waveletCentroidZScore: n(0.3),
      knob_1: k1Schedule(t), knob_5: 0, knob_6: 0, knob_7: 0, knob_15: 0, knob_16: 0,
    }
  })
}

let clockMs = 0
Object.defineProperty(globalThis, 'performance', { value: { now: () => clockMs }, configurable: true, writable: true })

const run = async (url, frames, onFrame) => {
  globalThis.window = { innerWidth: 1920, innerHeight: 1080 }
  clockMs = 0
  Math.random = mulberry(42)
  const { make } = await import(url.href)
  const step = make()
  return frames.map((f, i) => {
    clockMs += DT * 1000
    const o = step(f)
    onFrame?.(o, f, i, globalThis.window.__blackSunState)
    return o
  })
}

const classicFeed = feed(() => 0)
const classic = await run(CLASSIC, classicFeed)
const stagedOff = await run(STAGED, classicFeed)
const keys = Object.keys(classic.at(-1))
classic.forEach((o, i) => keys.forEach(k => assert.equal(stagedOff[i][k], o[k], `K1=0 diverged from classic at frame ${i} on ${k}`)))
console.log(`ok classic parity: ${FRAMES} frames × ${keys.length} outputs identical with K1 = 0`)

const tripFeed = feed(k1At)
const recent = []
let prevActT = 0, prevTripAct = 0, prevDive = 0, prevJTurn = 0, prevBud = -Infinity, classicAct = null, transitions = 0
const causes = {}
await run(STAGED, tripFeed, (o, f, i, S) => {
  Object.entries(o).forEach(([k, v]) => assert.ok(Number.isFinite(v), `non-finite ${k} at frame ${i}`))
  assert.ok(o.bs_tripHue >= 0 && o.bs_tripHue <= 300 / 360 + 1e-9, `hue left 0..300° at frame ${i}`)
  assert.ok(S.dive >= prevDive && S.jTurn >= prevJTurn && o.bs_budPh >= prevBud, `a trip clock ran backwards at frame ${i}`)
  prevDive = S.dive; prevJTurn = S.jTurn; prevBud = o.bs_budPh
  recent.push(f.phase); if (recent.length > Math.round(20 / DT)) recent.shift()
  const within = (secs, set) => recent.slice(-Math.round(secs / DT)).some(p => set.includes(p))
  if (f.knob_1 >= 0.5 && classicAct === null) classicAct = S.act
  if (f.knob_1 >= 0.5) assert.equal(S.act, classicAct, `classic act moved while the trip ran (frame ${i})`)
  if (f.knob_1 < 0.5) { classicAct = null; assert.equal(S.tripAct, prevTripAct, `trip act moved with K1 off (frame ${i})`) }
  if (S.tripAct !== prevTripAct) {
    const e = S.tripLog.at(-1)
    transitions++
    causes[e.cause] = (causes[e.cause] ?? 0) + 1
    const earned = {
      drop: () => f.phase === 'drop',
      build: () => within(20, ['build']),
      calm: () => !within(15, ['build', 'drop', 'silence']),
      low: () => within(15, ['silence', 'quiet']),
      fallback: () => prevActT + DT > 420,
      'bloom ran its course': () => e.from === 'BLOOM' && prevActT + DT > 25,
    }[e.cause]
    assert.ok(earned, `unknown trip cause "${e.cause}" at ${f.t.toFixed(1)} s`)
    assert.ok(earned(), `${e.from} → ${e.to} on "${e.cause}" at ${f.t.toFixed(1)} s was not earned (phase ${f.phase})`)
    console.log(`  ${f.t.toFixed(1).padStart(7)} s  ${e.from} → ${e.to}  (${e.cause})`)
  }
  prevTripAct = S.tripAct
  prevActT = o.bs_tripActT
})
assert.ok(transitions >= 6, `only ${transitions} trip transitions: the arc was not exercised`)
assert.ok(causes.drop >= 1, 'no drop-earned trip transition happened')
assert.ok(causes['bloom ran its course'] >= 1, 'BLOOM was never reached')
console.log(`ok trip arc: ${transitions} earned transitions ${JSON.stringify(causes)}; all outputs finite; clocks monotonic; hue in 0..300°`)
