// node --test .claude/skills/sun-set/sun-set.test.mjs
// Drives controllers/sun-set.js through its public make() the way the page does: one call per frame,
// knobs read back from window.cranes.manualFeatures.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { make, BEATS } from '../../../controllers/sun-set.js'

let clock = 0
Object.defineProperty(globalThis, 'performance', { value: { now: () => clock * 1000 }, configurable: true })

const fresh = () => {
  clock = 0
  globalThis.window = { cranes: { manualFeatures: {} } }
  return make()
}
const knobs = () => window.cranes.manualFeatures
const run = (fn, seconds, features, each = () => {}) => {
  for (let i = 0; i < seconds * 10; i++) {
    clock += 0.1
    fn(features)
    each()
  }
}
const giant = BEATS.findIndex(b => b.name === 'giant') + 1
const target = (n, i) => BEATS[n - 1].keys[0][1][i - 1]

beforeEach(() => fresh())

test('idle without a beat: touches nothing', () => {
  const fn = fresh()
  run(fn, 5, {})
  assert.deepEqual(knobs(), {})
})

test('eases toward the beat with no jumps, and arrives', () => {
  const fn = fresh()
  let prev = 0
  let biggest = 0
  run(fn, 10, { sunset_beat: giant }, () => {
    biggest = Math.max(biggest, Math.abs(knobs().knob_11 - prev))
    prev = knobs().knob_11
  })
  assert.ok(biggest < 0.01, `largest per-frame step ${biggest}`)
  assert.ok(knobs().knob_11 > 0.3 && knobs().knob_11 < target(giant, 11), `after 10 s: ${knobs().knob_11}`)
  run(fn, 110, { sunset_beat: giant })
  assert.ok(Math.abs(knobs().knob_11 - 0.92) < 0.01, `after 120 s: ${knobs().knob_11}`)
})

test('K1 stays below the TRIP threshold on every beat', () => {
  for (const b of BEATS) for (const [, v] of b.keys) assert.ok(v[0] < 0.5, b.name)
})

test('a hand on a dial keeps it for the rest of the set, across beats', () => {
  const fn = fresh()
  run(fn, 30, { sunset_beat: giant })
  knobs().knob_11 = 0.05
  run(fn, 300, { sunset_beat: giant })
  assert.equal(knobs().knob_11, 0.05)
  assert.ok(Math.abs(knobs().knob_12 - 0.78) < 0.02, `other dials keep moving: ${knobs().knob_12}`)
  run(fn, 60, { sunset_beat: giant + 1 })
  assert.equal(knobs().knob_11, 0.05, 'the next beat does not take it back')
  knobs().knob_11 = 0.3
  run(fn, 5, { sunset_beat: giant + 1 })
  assert.equal(knobs().knob_11, 0.3, 'and it follows every new turn')
})

test('sunset_hands_reset gives the knobs back, eased from the hand', () => {
  const fn = fresh()
  run(fn, 30, { sunset_beat: giant })
  knobs().knob_11 = 0.05
  run(fn, 30, { sunset_beat: giant })
  run(fn, 15, { sunset_beat: giant, sunset_hands_reset: 1 })
  assert.ok(knobs().knob_11 > 0.05 && knobs().knob_11 < 0.6, `eased back from the hand: ${knobs().knob_11}`)
})

test('auto story leaves K5 and K6 to the music', () => {
  const fn = fresh()
  run(fn, 20, { sunset_beat: 1, sunset_auto_story: 1 })
  assert.equal(knobs().knob_5, undefined)
  assert.equal(knobs().knob_6, undefined)
})

test('K5 steps to the keyframe instead of sweeping through acts', () => {
  const fn = fresh()
  const julia = BEATS.findIndex(b => b.name === 'julia-arms') + 1
  run(fn, 0.1, { sunset_beat: julia })
  assert.equal(knobs().knob_5, target(julia, 5))
})

test('the era is squeezed into the hold: the last keyframe is reached by the end', () => {
  const fn = fresh()
  const fan = BEATS.findIndex(b => b.name === 'fan-root') + 1
  run(fn, BEATS[fan - 1].hold + 120, { sunset_beat: fan })
  assert.ok(Math.abs(knobs().knob_14 - 0.795) < 0.01, `K14 ${knobs().knob_14}`)
  assert.equal(knobs().knob_5, 0)
})

test('sunset_minutes scales every beat to its share of the night, never under 90 s', () => {
  const night = BEATS.reduce((sum, b) => sum + b.span, 0)
  assert.equal(night, 259)
  for (const b of BEATS) assert.equal(b.hold, Math.round(Math.max(90, b.span / night * 45 * 60)), b.name)
  assert.equal(BEATS.find(b => b.name === 'kiss').hold, 90)
  const fan = BEATS.findIndex(b => b.name === 'fan-root') + 1
  const short = fresh()
  run(short, 59 / night * 10 * 60 + 120, { sunset_beat: fan, sunset_minutes: 10 })
  assert.ok(Math.abs(knobs().knob_14 - 0.795) < 0.01, `10 min set reaches 02:06: K14 ${knobs().knob_14}`)
  const long = fresh()
  run(long, 59 / night * 10 * 60 + 120, { sunset_beat: fan, sunset_minutes: 45 })
  assert.ok(knobs().knob_14 > 0.95, `45 min set is still at 01:20: K14 ${knobs().knob_14}`)
})
