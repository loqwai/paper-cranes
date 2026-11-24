import { describe, expect, it } from 'vitest'
import { judgeAfter } from './preflight.js'

const state = (over = {}) => ({
  shader: 'clit-set/2',
  shaderError: null,
  audio: { state: 'running', energy: 0.1, input: 'BlackHole 2ch' },
  meter: { flicker: 0.2 },
  controller: { cs_time: 10, cs_presence: 0.9 },
  live: { pads: 1 },
  ...over,
})
const verdicts = (a, b, displays = [{ id: 'a1' }]) => Object.fromEntries(judgeAfter(displays, a, b).map((r) => [r.key, r.ok]))

describe('preflight after launch', () => {
  it('passes a healthy wall', () => {
    expect(verdicts(state(), state({ controller: { cs_time: 12, cs_presence: 0.9 } }))).toEqual({
      display: true, audio: true, runtime: true, controller: true, gate: true, pad: true,
    })
  })

  it('fails a controller whose clock stands still (it is throwing)', () => {
    expect(verdicts(state(), state()).controller).toBe(false)
  })

  it('fails silent audio, a missing meter, a closed gate and no pad', () => {
    const b = state({ audio: { state: 'running', energy: 0.001 }, meter: undefined, controller: { cs_time: 11, cs_presence: 0.1 }, live: { pads: 0 } })
    const v = verdicts(state({ audio: { state: 'running', energy: 0.001 } }), b)
    expect(v).toMatchObject({ audio: false, runtime: false, gate: false, pad: false, controller: true })
  })

  it('fails a compile error and no display', () => {
    expect(verdicts(state(), state({ shaderError: 'ERROR: 0:1' })).display).toBe(false)
    expect(verdicts(state(), state(), []).display).toBe(false)
  })
})
