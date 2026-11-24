import { it, expect, vi } from 'vitest'
import { makeSettler, parseArgs } from './watch-events.js'

it('prints one release per dial sweep: the last, once the dial stays still', () => {
  vi.useFakeTimers()
  const out = []
  const emit = makeSettler({ settleMs: 1000, print: (e) => out.push(e) })
  emit({ type: 'hands', on: true, knob: 'knob_4' })
  for (const value of [0.57, 0.61, 0.79, 0.9]) { emit({ type: 'release', knob: 'knob_4', value }); vi.advanceTimersByTime(200) }
  emit({ type: 'release', knob: 'knob_5', value: 0.2 })
  expect(out).toEqual([{ type: 'hands', on: true, knob: 'knob_4' }])
  vi.advanceTimersByTime(1000)
  expect(out.slice(1)).toEqual([{ type: 'release', knob: 'knob_4', value: 0.9 }, { type: 'release', knob: 'knob_5', value: 0.2 }])
  vi.useRealTimers()
})

it('--settle 0 prints every release; types are the other arguments', () => {
  expect(parseArgs(['hands', 'release', '--settle', '0', 'keep'])).toEqual({ types: ['hands', 'release', 'keep'], settleMs: 0 })
  expect(parseArgs(['release'])).toEqual({ types: ['release'], settleMs: 1000 })
  const out = []
  const emit = makeSettler({ settleMs: 0, print: (e) => out.push(e) })
  emit({ type: 'release', knob: 'knob_4', value: 0.5 })
  expect(out).toHaveLength(1)
})
