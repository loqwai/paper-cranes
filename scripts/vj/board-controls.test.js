import { describe, it, expect } from 'vitest'
import { BUTTON, FADER, XY, aroundOps, draggedControl, faderValue, knobWrites, knobsOf, layoutOps, xyValue } from './board-controls.js'
import { backoff, controlOf } from './board-bridge.js'

// Where draw puts a widget part: its `draw` box scaled by width / the definition's width, from the instance's
// x, y, with a `set` field as that share (per 1) of its drawn value. The same rule draw's widgets use.
const DEF_W = { 'vj-fader': 140, 'vj-xy': 300, 'vj-button': 170 }
const DEF_H = { 'vj-fader': 500, 'vj-xy': 342, 'vj-button': 90 }
const DEFS = { 'vj-fader': FADER, 'vj-xy': XY, 'vj-button': BUTTON }
const partsOf = (op) => {
  const k = (op.width ?? DEF_W[op.widget]) / DEF_W[op.widget]
  return DEFS[op.widget].parts.map(({ part, draw, set = {} }) => {
    const field = (f) => (set[f] ? op.values[set[f].slot] * draw[f] : draw[f])
    return { id: `${op.id}-${part}`, x: op.x + field('x') * k, y: op.y + field('y') * k, width: draw.width * k, height: draw.height * k }
  })
}
const boxOf = (op) => ({ x: op.x, y: op.y, width: op.width, height: (op.width * DEF_H[op.widget]) / DEF_W[op.widget] })
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
const heldOf = (ops) => new Map(ops.filter((o) => o.kind === 'widget').flatMap(partsOf).map((e) => [e.id, e]))

describe('knobsOf: the knobs a shader names in shaders.json', () => {
  it('reads numbers and names, and drops what is not a knob', () => {
    expect(knobsOf('1|131:FOLD RATIO|x|0|201|7:A:B')).toEqual([
      { knob: 1, name: null },
      { knob: 131, name: 'FOLD RATIO' },
      { knob: 7, name: 'A:B' },
    ])
    expect(knobsOf(undefined)).toEqual([])
  })
})

describe('a fader', () => {
  const track = { x: 0, y: 100, width: 30, height: 440 }
  it('reads 1 with the knob at the top of its track and 0 at the bottom', () => {
    expect(faderValue({ y: 100, height: 50 }, track)).toBe(1)
    expect(faderValue({ y: 490, height: 50 }, track)).toBe(0)
  })
  it('clamps a knob dragged past either end', () => {
    expect(faderValue({ y: -400, height: 50 }, track)).toBe(1)
    expect(faderValue({ y: 9000, height: 50 }, track)).toBe(0)
  })
  it('gives back the value it was drawn at, at any width', () => {
    for (const width of [60, 130, 140, 300]) {
      for (const value of [0, 0.25, 0.5, 0.9, 1]) {
        const held = heldOf([{ kind: 'widget', widget: 'vj-fader', id: 'fad-k4', x: 10, y: 20, width, values: { label: 'K4', down: 1 - value } }])
        expect(faderValue(held.get('fad-k4-knob'), held.get('fad-k4-track'))).toBeCloseTo(value, 3)
      }
    }
  })
})

describe('an XY pad', () => {
  it('reads across as the first knob and up as the second', () => {
    const held = heldOf([{ kind: 'widget', widget: 'vj-xy', id: 'xy-k3-k9', x: 0, y: 0, width: 350, values: { label: 'A · B', x: 0.2, down: 0.3 } }])
    const [x, y] = xyValue(held.get('xy-k3-k9-dot'), held.get('xy-k3-k9-pad'))
    expect(x).toBeCloseTo(0.2, 3)
    expect(y).toBeCloseTo(0.7, 3)
  })
})

describe('knobWrites: what a portal message asks of the wall', () => {
  const ops = [
    { kind: 'widget', widget: 'vj-fader', id: 'fad-k12', x: 0, y: 0, width: 140, values: { label: 'K12', down: 0.5 } },
    { kind: 'widget', widget: 'vj-xy', id: 'xy-k3-k9', x: 200, y: 0, width: 300, values: { label: 'A · B', x: 0.5, down: 0.5 } },
  ]
  const held = heldOf(ops)

  it('turns a dragged fader knob into its knob value', () => {
    const knob = { ...held.get('fad-k12-knob'), y: 0 }
    held.set(knob.id, knob)
    expect(knobWrites({ t: 'delta', elements: [knob] }, held)).toEqual({ knob_12: 1 })
  })

  it('turns a dragged XY dot into both knobs', () => {
    const pad = held.get('xy-k3-k9-pad')
    const dot = { ...held.get('xy-k3-k9-dot'), x: pad.x, y: pad.y + pad.height - 60 }
    expect(knobWrites({ t: 'delta', elements: [dot] }, held)).toEqual({ knob_3: 0, knob_9: 0 })
  })

  it('writes nothing for the whole frame sent on connect, so the board never yanks the wall back', () => {
    expect(knobWrites({ t: 'frame', elements: [...held.values()] }, held)).toEqual({})
  })

  it('ignores labels, tracks, buttons, deletions and controls it cannot place', () => {
    const elements = [held.get('fad-k12-label'), held.get('fad-k12-track'), { id: 'ctl-panic-face' }, { ...held.get('fad-k12-knob'), isDeleted: true }, { id: 'fad-k99-knob', y: 0, height: 50 }]
    expect(knobWrites({ t: 'delta', elements }, held)).toEqual({})
  })

  it('names the control a moved part drives', () => {
    expect(draggedControl('fad-k7-knob')).toMatchObject({ kind: 'fader', knobs: ['knob_7'] })
    expect(draggedControl('xy-k1-k2-dot')).toMatchObject({ kind: 'xy', knobs: ['knob_1', 'knob_2'] })
    expect(draggedControl('fad-k7-track')).toBeNull()
  })
})

describe('the layouts', () => {
  const knobs = knobsOf('101:ZOOM PUNCH|5|7:TWIST|9:FOLD|12|199:DEBUG FIELD|3:HUE')

  it('draws the column frame first, then one widget per control, the named knobs on faders', () => {
    const ops = layoutOps({ knobs })
    expect(ops[0]).toMatchObject({ kind: 'put', drafts: [{ id: 'controls', type: 'frame', width: 390 }] })
    const ids = ops.slice(1).map((o) => o.id)
    expect(ids).toEqual(['ctl-panic', 'ctl-keep', 'ctl-prev', 'ctl-next', 'fad-k101', 'fad-k7', 'fad-k9', 'fad-k199', 'xy-k3-k5'])
    for (const op of ops.slice(1)) expect(op.frameId).toBe('controls')
  })

  it('places each knob where the wall has it', () => {
    const ops = layoutOps({ knobs, values: { knob_7: 0.8 } })
    expect(ops.find((o) => o.id === 'fad-k7').values.down).toBeCloseTo(0.2)
    expect(ops.find((o) => o.id === 'fad-k9').values.down).toBe(0.5)
  })

  it('keeps every control in the show frame and clear of the live picture', () => {
    const frame = { x: 0, y: 5600, width: 1600, height: 900 }
    const picture = { x: 320, y: 5780, width: 960, height: 540 }
    const ops = aroundOps({ frame, picture, knobs })
    expect(ops.map((o) => o.widget).sort()).toEqual(['vj-button', 'vj-button', 'vj-button', 'vj-button', 'vj-fader', 'vj-fader', 'vj-fader', 'vj-fader', 'vj-xy'])
    const clear = { x: picture.x - 24, y: picture.y - 24, width: picture.width + 48, height: picture.height + 48 }
    for (const op of ops) {
      const b = boxOf(op)
      expect(overlaps(b, clear), `${op.id} over the picture`).toBe(false)
      expect(b.x >= frame.x && b.y >= frame.y && b.x + b.width <= frame.x + frame.width && b.y + b.height <= frame.y + frame.height, `${op.id} outside the frame`).toBe(true)
    }
    const boxes = ops.map(boxOf)
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)))
  })
})

describe('a widget button pressed by Send', () => {
  it('counts its face or its label as the button', () => {
    expect(controlOf({ sent: 's', selected: ['ctl-panic-face'] })).toMatchObject({ kind: 'panic', id: 'ctl-panic' })
    expect(controlOf({ sent: 's', selected: ['ctl-next-label', 'ctl-next-face'] })).toMatchObject({ kind: 'beat', step: 1 })
  })
  it('never presses anything for a fader or the pad, which a drag drives', () => {
    expect(controlOf({ sent: 's', selected: ['fad-k4-knob'] })).toBeNull()
  })
})

it('backs off from 250 ms, doubling, up to its cap', () => {
  expect([0, 1, 2, 3, 4, 5].map((n) => backoff(n))).toEqual([250, 500, 1000, 2000, 4000, 4000])
  expect(backoff(9, 10_000)).toBe(10_000)
})
