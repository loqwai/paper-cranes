import { describe, expect, it } from 'vitest'
import { ACTIONS, checkAct, commandFor, decide, parseRequest } from './vj-rules.js'
import { defaultConfig, mergeConfig } from './vj-config.js'
import { resolveDisplay } from './client.js'

const HREF = 'https://cranes-local.hypnodroid.com/?shader=clit-set/2&controller=clit-set&wavelet=true&vj=1'

// A healthy clit-set page on a phone mic, with meters.
const healthy = (over = {}) => {
  const o = {
    connected: true,
    status: {
      href: HREF, shader: 'clit-set/2', controllers: ['clit-set'], frameCount: 1000, fps: 58, visibility: 'visible',
      audio: { state: 'running', running: true, energy: 0.03, gain: 1 }, shaderError: null, manual: {}, vjMeter: true,
    },
    statusEnd: { frameCount: 1060, visibility: 'visible' },
    features: {
      audio: { energy: 0.03, energyZScore: 0.1, bassZScore: 0.2 },
      controller: { cs_presence: 0.97, cs_drop: 0, cs_kick: 0.4, cs_punch: 0.2 },
      knobs: { knob_12: 0.2 },
      meter: { n: 60, secs: 30, flicker: 0.3, clip: 0, motion: 0.05, lum: 0.3, lumMax: 0.4, motionVsEnergy: 0.2 },
    },
    history: [],
  }
  return structuredClone({ ...o, ...over })
}
const with_ = (fn) => { const o = healthy(); fn(o); return o }
const cfg = () => defaultConfig()
const run = (o) => decide(o, cfg())

describe('decide: one verdict from the fixed menu', () => {
  it('every verdict uses a menu action', () => {
    for (const o of [healthy(), { connected: false }, with_((o) => { o.statusEnd.frameCount = 1000 })]) expect(ACTIONS).toContain(run(o).action)
  })

  it('healthy page: none', () => {
    expect(run(healthy())).toMatchObject({ action: 'none', rule: 'healthy' })
  })

  it('no reply from the page: tell Aaron, never act', () => {
    expect(run({ connected: false, error: 'no reply' })).toMatchObject({ action: 'tell_aaron', rule: 'disconnected' })
  })

  it('frozen frame counter while visible: reload', () => {
    expect(run(with_((o) => { o.statusEnd.frameCount = 1000 }))).toMatchObject({ action: 'reload', rule: 'frozen' })
  })

  it('a hidden tab stops rAF but is not frozen: tell Aaron, no reload', () => {
    const v = run(with_((o) => { o.status.visibility = 'hidden'; o.statusEnd.frameCount = 1000 }))
    expect(v).toMatchObject({ action: 'tell_aaron', rule: 'hidden' })
  })

  it('frozen wins over a drop (reload during a drop only when frozen)', () => {
    const v = run(with_((o) => { o.statusEnd.frameCount = 1000; o.features.audio.energyZScore = 0.9 }))
    expect(v.action).toBe('reload')
  })

  it('suspended audio: tell Aaron to tap', () => {
    expect(run(with_((o) => { o.status.audio = { state: 'suspended', running: false } }))).toMatchObject({ action: 'tell_aaron', rule: 'audio-suspended' })
  })

  it('shader error: swap to a known-good shader that is not the one on screen', () => {
    const v = run(with_((o) => { o.status.shaderError = 'ERROR: 0:12' }))
    expect(v).toMatchObject({ action: 'swap', rule: 'shader-error', args: { shader: 'clit-set/1', controller: 'clit-set' } })
  })

  it('a held time param: release it', () => {
    expect(run(with_((o) => { o.status.manual = { time: 0 } }))).toMatchObject({ action: 'release_time' })
  })

  it('clit-set without wavelet=true: tell Aaron (boot param, needs a reload he times)', () => {
    const v = run(with_((o) => { o.status.href = HREF.replace('&wavelet=true', '') }))
    expect(v).toMatchObject({ action: 'tell_aaron', rule: 'no-wavelet' })
  })

  it('in a drop: hold every tuning rule, even with bad flicker', () => {
    const v = run(with_((o) => { o.features.audio.energyZScore = 0.8; o.features.meter.flicker = 3 }))
    expect(v).toMatchObject({ action: 'none', rule: 'drop-hold' })
  })

  it('presence gate shut while music plays: raise gain by one step', () => {
    const v = run(with_((o) => { o.features.controller.cs_presence = 0.1; o.status.audio.gain = 2 }))
    expect(v).toMatchObject({ action: 'gain', rule: 'input-quiet', args: { value: 3 } })
  })

  it('gain never recommended past the cap', () => {
    const v = run(with_((o) => { o.features.controller.cs_presence = 0.1; o.status.audio.gain = 8 }))
    expect(v.action).not.toBe('gain')
  })

  it('no meter (no vj=1): none, and says how to get one', () => {
    const v = run(with_((o) => { delete o.features.meter }))
    expect(v).toMatchObject({ action: 'none', rule: 'no-meter' })
    expect(v.reason).toMatch(/vj=1/)
  })

  it('black screen: swap', () => {
    expect(run(with_((o) => { o.features.meter.lumMax = 0.01 }))).toMatchObject({ action: 'swap', rule: 'black' })
  })

  it('clipping: lower EMBER first, then REACT', () => {
    expect(run(with_((o) => { o.features.meter.clip = 0.05; o.features.knobs.knob_14 = 0.5 }))).toMatchObject({ action: 'nudge', args: { knob: 'knob_14', value: 0.4 } })
    expect(run(with_((o) => { o.features.meter.clip = 0.05 }))).toMatchObject({ action: 'nudge', args: { knob: 'knob_12', value: 0.1 } })
  })

  it('flicker over the hard limit: lower REACT one step', () => {
    expect(run(with_((o) => { o.features.meter.flicker = 2.4 }))).toMatchObject({ action: 'nudge', rule: 'flicker', args: { knob: 'knob_12', value: 0.1 } })
  })

  it('flicker over the soft limit only acts when sustained across ticks', () => {
    expect(run(with_((o) => { o.features.meter.flicker = 0.9 })).action).toBe('none')
    expect(run(with_((o) => { o.features.meter.flicker = 0.9; o.history = [{ flicker: 0.8 }] }))).toMatchObject({ action: 'nudge', rule: 'flicker' })
  })

  it('flicker with REACT already 0: more TRAILS, capped', () => {
    const v = run(with_((o) => { o.features.meter.flicker = 2.4; o.features.knobs = {} }))
    expect(v).toMatchObject({ action: 'nudge', args: { knob: 'knob_11', value: 0.1 } })
    const capped = run(with_((o) => { o.features.meter.flicker = 2.4; o.features.knobs = { knob_11: 0.5 } }))
    expect(capped).toMatchObject({ action: 'none', rule: 'flicker-noknob' })
  })

  it('still picture with music playing: more REACT, then swap once REACT is at its cap', () => {
    expect(run(with_((o) => { o.features.meter.motion = 0.001 }))).toMatchObject({ action: 'nudge', rule: 'still', args: { knob: 'knob_12', value: 0.3 } })
    expect(run(with_((o) => { o.features.meter.motion = 0.001; o.features.knobs.knob_12 = 0.6 }))).toMatchObject({ action: 'swap', rule: 'still' })
  })

  it('still picture in silence is fine', () => {
    expect(run(with_((o) => { o.features.meter.motion = 0.001; o.features.audio.energy = 0.001 })).action).toBe('none')
  })

  it('a controller with no profile never gets a knob nudge', () => {
    const v = run(with_((o) => { o.status.controllers = ['other']; o.features.meter.flicker = 2.4 }))
    expect(v.action).not.toBe('nudge')
  })

  it('per-display config changes the thresholds without touching another display', () => {
    const strict = mergeConfig(defaultConfig(), { limits: { flickerHard: 0.5 } })
    const o = with_((o) => { o.features.meter.flicker = 0.6 })
    expect(decide(o, strict).action).toBe('nudge')
    expect(decide(o, defaultConfig()).action).toBe('none')
  })
})

describe('chat requests map onto the same menu', () => {
  const req = (text, fn = () => {}) => run(with_((o) => { o.request = { text }; fn(o) }))

  it('"wilder" raises REACT by one step', () => {
    expect(req('make it wilder!')).toMatchObject({ action: 'nudge', rule: 'request-wilder', args: { knob: 'knob_12', value: 0.3 }, request: 'make it wilder!' })
  })
  it('"too much flashing" calms it, even though it says "much"', () => {
    expect(req('too much flashing')).toMatchObject({ action: 'nudge', rule: 'request-calmer', args: { knob: 'knob_12', value: 0.1 } })
  })
  it('"change it" swaps to a known-good shader', () => {
    expect(req('can you change it')).toMatchObject({ action: 'swap', args: { shader: 'clit-set/1' } })
  })
  it('a request can never move geometry: "zoom in" is not understood', () => {
    expect(req('zoom in on the middle')).toMatchObject({ action: 'tell_aaron', rule: 'request-unknown' })
  })
  it('health rules win over a request', () => {
    expect(req('wilder', (o) => { o.statusEnd.frameCount = 1000 }).action).toBe('reload')
    expect(req('wilder', (o) => { o.features.audio.energyZScore = 0.9 }).rule).toBe('drop-hold')
  })
  it('parseRequest without a profile only offers swaps', () => {
    expect(parseRequest('wilder', null, {}, healthy().status, cfg()).action).toBe('none')
  })
})

describe('checkAct: guardrails are code', () => {
  const now = 1_000_000_000
  const ctx = (over = {}) => ({ now, log: [], obs: healthy(), cfg: cfg(), ...over })

  it('reload is refused while frames advance, allowed when frozen or forced', () => {
    expect(checkAct({ action: 'reload' }, ctx()).ok).toBe(false)
    expect(checkAct({ action: 'reload' }, ctx({ obs: with_((o) => { o.statusEnd.frameCount = 1000 }) })).ok).toBe(true)
    expect(checkAct({ action: 'reload', force: true }, ctx()).ok).toBe(true)
  })

  it('at most one reload per reloadGapS, even forced', () => {
    const log = [{ t: now - 30_000, action: 'reload', ok: true }]
    expect(checkAct({ action: 'reload', force: true }, ctx({ log })).ok).toBe(false)
  })

  it('rate limit: one change per minute; refused attempts do not count', () => {
    const args = { knob: 'knob_12', value: 0.3 }
    expect(checkAct({ action: 'nudge', args }, ctx({ log: [{ t: now - 20_000, action: 'gain', ok: true }] })).ok).toBe(false)
    expect(checkAct({ action: 'nudge', args }, ctx({ log: [{ t: now - 20_000, action: 'gain', ok: false }] })).ok).toBe(true)
    expect(checkAct({ action: 'nudge', args }, ctx({ log: [{ t: now - 61_000, action: 'gain', ok: true }] })).ok).toBe(true)
  })

  it('panic, undo and release_time bypass the rate limit', () => {
    const log = [{ t: now - 5_000, action: 'nudge', ok: true }]
    expect(checkAct({ action: 'panic' }, ctx({ log })).ok).toBe(true)
    expect(checkAct({ action: 'undo' }, ctx({ log })).ok).toBe(true)
    expect(checkAct({ action: 'release_time' }, ctx({ log })).ok).toBe(true)
  })

  it('geometry knobs are refused outright', () => {
    const r = checkAct({ action: 'nudge', args: { knob: 'knob_4', value: 0.1 } }, ctx())
    expect(r).toMatchObject({ ok: false })
    expect(r.why).toMatch(/geometry/)
  })

  it('knob steps larger than maxKnobStep are refused', () => {
    expect(checkAct({ action: 'nudge', args: { knob: 'knob_12', value: 0.8 } }, ctx()).ok).toBe(false)
  })

  it('no back-and-forth: a knob may not reverse within reverseWindowS', () => {
    const log = [{ t: now - 120_000, action: 'nudge', args: { knob: 'knob_12', value: 0.2 }, before: { value: 0.1 }, ok: true }]
    expect(checkAct({ action: 'nudge', args: { knob: 'knob_12', value: 0.1 } }, ctx({ log })).ok).toBe(false)
    expect(checkAct({ action: 'nudge', args: { knob: 'knob_12', value: 0.3 } }, ctx({ log })).ok).toBe(true)
  })

  it('nudges and gain are held during a drop', () => {
    const obs = with_((o) => { o.features.audio.energyZScore = 0.9 })
    expect(checkAct({ action: 'nudge', args: { knob: 'knob_12', value: 0.3 } }, ctx({ obs })).ok).toBe(false)
    expect(checkAct({ action: 'gain', args: { value: 1.5 } }, ctx({ obs })).ok).toBe(false)
  })

  it('gain: bounded and one x1.5 step at a time', () => {
    expect(checkAct({ action: 'gain', args: { value: 1.5 } }, ctx()).ok).toBe(true)
    expect(checkAct({ action: 'gain', args: { value: 4 } }, ctx()).ok).toBe(false)
    expect(checkAct({ action: 'gain', args: { value: 20 } }, ctx()).ok).toBe(false)
  })

  it('swap only to the known-good list', () => {
    expect(checkAct({ action: 'swap', args: { shader: 'clit-set/1' } }, ctx()).ok).toBe(true)
    expect(checkAct({ action: 'swap', args: { shader: 'wip/claude/banana-debug' } }, ctx()).ok).toBe(false)
  })
})

describe('commands and displays', () => {
  it('commandFor names the display and the act subcommand', () => {
    const cmd = commandFor({ action: 'nudge', args: { knob: 'knob_12', value: 0.3 } }, { script: '/x/vj-tick.js --display ab12cd', port: 6977 })
    expect(cmd).toBe('PORT=6977 node /x/vj-tick.js --display ab12cd act nudge knob_12 0.3')
    expect(commandFor({ action: 'none', args: {} }, { script: 's', port: 1 })).toBeNull()
  })

  it('resolveDisplay: the only one, the named one, or refuse to guess', () => {
    expect(resolveDisplay(undefined, ['a1'])).toEqual({ display: 'a1' })
    expect(resolveDisplay('b2', ['a1', 'b2'])).toEqual({ display: 'b2' })
    expect(resolveDisplay(undefined, ['a1', 'b2']).error).toMatch(/--display/)
    expect(resolveDisplay('zz', ['a1']).error).toMatch(/not connected/)
    expect(resolveDisplay(undefined, []).error).toMatch(/no display/)
  })
})
