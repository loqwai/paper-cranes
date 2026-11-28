import { describe, it, expect } from 'vitest'
import { controlOf, openProposal, parseArgs } from './board-bridge.js'

const send = (...selected) => ({ sent: 'send-1', selected })

describe('controlOf: which control a board Send pressed', () => {
  it('reads the fixed controls, and a tap on a label counts as its shape', () => {
    expect(controlOf(send('ctl-panic'))).toMatchObject({ kind: 'panic' })
    expect(controlOf(send('ctl-keep-text'))).toMatchObject({ kind: 'keep', id: 'ctl-keep' })
    expect(controlOf(send('ctl-next'))).toMatchObject({ kind: 'beat', step: 1 })
    expect(controlOf(send('ctl-prev'))).toMatchObject({ kind: 'beat', step: -1 })
  })

  it('turns a knob button into a 0..1 value, and off into a release', () => {
    expect(controlOf(send('ctl-k4-100'))).toMatchObject({ kind: 'knob', knob: 'knob_4', value: 1 })
    expect(controlOf(send('ctl-k12-35'))).toMatchObject({ knob: 'knob_12', value: 0.35 })
    expect(controlOf(send('ctl-k4-250'))).toMatchObject({ value: 1 })
    expect(controlOf(send('ctl-k4-off'))).toMatchObject({ knob: 'knob_4', value: null })
  })

  it('answers proposals by id', () => {
    expect(controlOf(send('prop-p7-take-text'))).toMatchObject({ kind: 'proposal', proposal: 'p7', answer: 'take' })
    expect(controlOf(send('prop-p7-drop'))).toMatchObject({ answer: 'drop' })
  })

  it('leaves every other Send to the model listeners', () => {
    expect(controlOf(send('f8', 'sticky-1'))).toBeNull()
    expect(controlOf({ sent: 'send-2', scope: 'chat' })).toBeNull()
    expect(controlOf(send('ctl-panicky'))).toBeNull()
  })

  it('needs exactly one control: a view sent whole, or two controls, presses nothing', () => {
    expect(controlOf(send('note', 'ctl-keep', 'ctl-keep-text'))).toMatchObject({ kind: 'keep' })
    expect(controlOf(send('ctl-keep', 'ctl-panic'))).toBeNull()
    expect(controlOf({ sent: 'send-3', scope: 'viewport', selected: ['ctl-panic'] })).toBeNull()
  })
})

describe('openProposal', () => {
  const lines = [
    { id: 'p1', label: 'k4 max', params: { knob_4: 1 } },
    { id: 'p2', label: 'warmer', params: { knob_9: 0.3 } },
    { id: 'p1', answer: 'dropped' },
  ]
  it('finds a proposal nobody has answered', () => {
    expect(openProposal(lines, 'p2')).toMatchObject({ params: { knob_9: 0.3 } })
  })
  it('refuses one already answered, or unknown', () => {
    expect(openProposal(lines, 'p1')).toBeNull()
    expect(openProposal(lines, 'p9')).toBeNull()
  })
})

it('parseArgs camel-cases flags and numbers the status period', () => {
  expect(parseArgs(['--board', 'show-x', '--status-link', 'u', '--status-every', '3'])).toMatchObject({ board: 'show-x', statusLink: 'u', statusEvery: 3 })
})
