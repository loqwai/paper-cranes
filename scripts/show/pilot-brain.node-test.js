// node --test scripts/show/pilot-brain.node-test.js   (npm run test:pilot)
import test from 'node:test'
import assert from 'node:assert/strict'
import { init, step, meter, takeNotes, ZOOM_CAP, PAN_MAX, YIELD_SECS, GEOMETRY, ENGAGE_GAP } from './pilot-brain.js'

const DT = 1 / 15
const calm = {
  energy: 0.06, energyZScore: 0, pitchClassMedian: 0.3,
  spectralEntropyNormalized: 0.5, spectralFluxNormalized: 0.3, bassNormalized: 0.4, spectralCrestNormalized: 0.3,
  trebleNormalized: 0.3, spectralKurtosisNormalized: 0.3, midsNormalized: 0.4, spectralSpreadNormalized: 0.4,
  cs_presence: 1, cs_build: 0, cs_drop: 0, cs_shift: 0, cs_kick: 0,
}
const zeros = () => Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i + 1, 0]))

// Runs the brain as the page would: whatever it writes becomes the live value, unless `hand` overrides.
const fly = (s, live, secs, features, hand = () => ({})) => {
  const trace = []
  for (let i = 0; i < secs / DT; i++) {
    Object.assign(live, hand(s.t))
    const { writes } = step(s, typeof features === 'function' ? features(s.t) : features, live, DT)
    Object.assign(live, writes)
    trace.push({ t: s.t, ...live })
  }
  return trace
}

const monotonicBetween = (trace, key, from, to) => {
  const seg = trace.filter(r => r.t > from && r.t < to).map(r => r[key])
  const up = seg.every((v, i) => i === 0 || v >= seg[i - 1] - 1e-9)
  const down = seg.every((v, i) => i === 0 || v <= seg[i - 1] + 1e-9)
  return up || down
}

test('build then drop: curl and power rise through the build, the drop fires one one-way flourish, guardrails hold', () => {
  const live = { ...zeros(), 5: 0.4 }
  const s = init(live, 7, null, { stagger: false })
  fly(s, live, 10, calm)
  const curlBefore = live[8]
  const powerBefore = live[6]
  fly(s, live, 20, { ...calm, energyZScore: 0.6, cs_build: 0.9 })
  assert.ok(live[8] > curlBefore + 0.1, `curl rose ${curlBefore} -> ${live[8]}`)
  assert.ok(live[6] > powerBefore + 0.1, `power rose ${powerBefore} -> ${live[6]}`)
  takeNotes(s)
  const turnBefore = live[5]
  const drop = t => ({ ...calm, energyZScore: 1, cs_build: 0.4, cs_drop: t < 31 ? 1 : 0.2 })
  const trace = fly(s, live, 6, drop)
  const notes = takeNotes(s).join('\n')
  assert.match(notes, /drop #1/)
  assert.ok(live[5] > turnBefore + 0.05 && live[5] <= turnBefore + 0.0601, `flourish ${turnBefore} -> ${live[5]}`)
  assert.ok(monotonicBetween(trace, 5, 0, Infinity), 'TURN only moves one way')
  for (const r of trace) {
    assert.ok(r[4] <= ZOOM_CAP + 1e-9, `zoom ${r[4]} capped`)
    assert.ok(r[1] <= PAN_MAX + 1e-9 && r[2] <= PAN_MAX + 1e-9, 'pan stays in frame')
  }
  fly(s, live, 3, drop)
  assert.doesNotMatch(takeNotes(s).join('\n'), /drop #2/, 'refractory: a held drop envelope fires once')
})

test('geometry glides one way between events, never wobbling with the music', () => {
  const live = zeros()
  const s = init(live, 3, null, { stagger: false })
  const jittery = t => ({ ...calm, bassNormalized: 0.5 + 0.5 * Math.sin(t * 13), energyZScore: 0.3 * Math.sin(t * 7), cs_kick: (t * 2) % 1 < 0.1 ? 1 : 0 })
  const trace = fly(s, live, 30, jittery)
  for (const n of GEOMETRY) assert.ok(monotonicBetween(trace, n, 0.5, 30), `K${n} is monotonic with no event`)
})

test('quiet breakdown opens up: zoom out, body low', () => {
  const live = { ...zeros(), 4: 0.5, 7: 0.4 }
  const s = init(live, 5, null, { stagger: false })
  fly(s, live, 40, { ...calm, energyZScore: -0.9, energy: 0.02 })
  assert.match(takeNotes(s).join('\n'), /breakdown/)
  assert.ok(live[4] < 0.2, `zoom out to ${live[4]}`)
  assert.ok(live[7] < 0.15, `body low ${live[7]}`)
})

test('a hand on a knob makes the pilot yield it for YIELD_SECS after the last movement, then glide on from there', () => {
  const live = zeros()
  const s = init(live, 9, null, { stagger: false })
  fly(s, live, 5, calm)
  const handUntil = s.t + 3
  const hand = t => (t < handUntil ? { 8: 0.8 + 0.01 * Math.floor(t * 4 % 2) } : {})
  fly(s, live, 3, calm, hand)
  assert.match(takeNotes(s).join('\n'), /yield K8 CURL/)
  const held = live[8]
  fly(s, live, YIELD_SECS - 2, calm)
  assert.equal(live[8], held, 'pilot keeps its hands off while yielding')
  const trace = fly(s, live, 10, calm)
  assert.ok(Math.abs(trace[0][8] - held) < 0.02, 'resumes from where the hand left it, no jump')
  assert.notEqual(live[8], held, 'and glides on')
})

test('meter guard: a dark wall recentres and zooms out; slow frames lower trails', () => {
  const live = { ...zeros(), 1: 0.45, 2: 0.45, 4: 0.5, 11: 0.6 }
  const s = init(live, 11, null, { stagger: false })
  meter(s, { flicker: 0.2, lumMin: 0.03, jankMed: 33 })
  fly(s, live, 30, { ...calm, spectralFluxNormalized: 1 })
  assert.ok(live[1] < 0.3 && live[2] < 0.3, `recentred X${live[1]} Y${live[2]}`)
  assert.ok(live[4] <= 0.4, `zoom ${live[4]}`)
  assert.ok(live[11] <= 0.251, `trails ${live[11]}`)
})

test('VOYAGE at 0 stays the controller autopilot; a parked VOYAGE only ever flies forward', () => {
  const auto = zeros()
  const s1 = init(auto, 1, null, { stagger: false })
  const t1 = fly(s1, auto, 20, { ...calm, cs_drop: 1 })
  assert.ok(t1.every(r => r[3] === 0), 'never writes k3 at 0')
  const parked = { ...zeros(), 3: 0.35 }
  const s2 = init(parked, 1, null, { stagger: false })
  const t2 = fly(s2, parked, 60, t => ({ ...calm, cs_drop: t > 20 && t < 21 ? 1 : 0 }))
  assert.ok(monotonicBetween(t2, 3, 0, Infinity), 'forward only')
  assert.ok(parked[3] > 0.35, `advanced to ${parked[3]}`)
})

test('opening is staggered: knobs join one at a time, never more than 2 moving fast at once', () => {
  const live = { 1: 0.9, 2: 0.9, 3: 0, 4: 0.9, 5: 0.5, 6: 0.9, 7: 0.9, 8: 0.9, 9: 0.5, 10: 1, 11: 1, 12: 1, 13: 0.9, 14: 0.9, 15: 0.9, 16: 0.9 }
  const s = init(live, 13, calm)
  const trace = fly(s, live, 60, calm)
  let worst = 0
  for (let i = 1; i < trace.length; i++) {
    const fast = Object.keys(live).filter(n => Math.abs(trace[i][n] - trace[i - 1][n]) / DT > 0.05).length
    worst = Math.max(worst, fast)
  }
  assert.ok(worst <= 2, `${worst} knobs moving > 0.05/s at once`)
  assert.equal(trace[Math.round(ENGAGE_GAP * 2 / DT)][4], 0.9, 'ZOOM still untouched early in the opening')
})

test('a drop envelope already high at start is not a drop, and drops are at least 30 s apart', () => {
  const live = zeros()
  const s = init(live, 17, { ...calm, cs_drop: 1 }, { stagger: false })
  fly(s, live, 3, { ...calm, cs_drop: 1 })
  assert.doesNotMatch(takeNotes(s).join('\n'), /drop #/)
  fly(s, live, 40, t => ({ ...calm, cs_drop: (t % 10) < 1 ? 1 : 0 }))
  const drops = takeNotes(s).join('\n').match(/drop #\d+ ->/g) ?? []
  const n = new Set(drops).size
  assert.ok(n >= 1 && n <= 2, `${n} drops in 40 s`)
})

test('flicker caused by a hand does not calm the pilot; flicker with no hand does', () => {
  const live = zeros()
  const s = init(live, 19, null, { stagger: false })
  fly(s, live, 5, calm)
  fly(s, live, 1, calm, () => ({ 6: 0.9 }))
  meter(s, { flicker: 1.2, lumMin: 0.2, jankMed: 16 })
  assert.match(takeNotes(s).join('\n'), /a hand moved/)
  fly(s, live, 15, calm)
  meter(s, { flicker: 1.2, lumMin: 0.2, jankMed: 16 })
  assert.match(takeNotes(s).join('\n'), /3x slower/)
})
