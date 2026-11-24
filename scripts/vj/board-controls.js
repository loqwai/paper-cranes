// board-controls — the show board's controls as draw widgets (https://draw.hypnodroid.com), and the pure
// maths that turns what a person did to one into a knob value. No I/O here: board-bridge.js does that.
//
// Three widgets, defined once as a board skill (`vj-controls`) so every control is one unit with values:
//   vj-fader  fad-k<N>        a knob on a track; dragging `fad-k<N>-knob` sets knob_N (top = 1)
//   vj-xy     xy-k<A>-k<B>    a dot on a pad; dragging `xy-k<A>-k<B>-dot` sets knob_A (x) and knob_B (y, top = 1)
//   vj-button ctl-<action>    PANIC / KEEP / ◀ / ▶ / take / drop: select it and Send (see board-bridge.js)
// A drag reaches the bridge as a portal delta (the frame's commits); a press arrives as a Send.

const ONE_LINE = '^[^\\n\\r]*$'
const label = (max) => ({ type: 'string', minLength: 1, maxLength: max, pattern: ONE_LINE })
const share = { type: 'number', minimum: 0, maximum: 1 }
const INK = '#e6e6e6'

export const FADER = {
  widget: 'vj-fader',
  version: 1,
  title: 'VJ fader',
  description: 'One shader knob as a fader: drag the knob up or down; the board bridge sends it to the wall.',
  schema: {
    type: 'object',
    properties: {
      label: { ...label(12), description: 'the knob name, as the shader comments it' },
      down: { ...share, description: '1 minus the value: where the knob is drawn, 0 = top' },
    },
    required: ['label', 'down'],
  },
  parts: [
    { part: 'well', draw: { type: 'rectangle', x: 0, y: 0, width: 140, height: 500, strokeColor: 'transparent', backgroundColor: 'transparent', locked: true } },
    { part: 'track', draw: { type: 'rectangle', x: 55, y: 0, width: 30, height: 440, strokeColor: '#4a5568', backgroundColor: '#1a202c', fillStyle: 'solid', locked: true } },
    { part: 'knob', draw: { type: 'rectangle', x: 10, y: 390, width: 120, height: 50, strokeColor: INK, backgroundColor: '#d53f8c', fillStyle: 'solid', strokeWidth: 2 }, set: { y: { slot: 'down', per: 1 } } },
    { part: 'label', draw: { type: 'text', x: 0, y: 456, width: 140, height: 30, fontSize: 22, textAlign: 'center' }, set: { text: { slot: 'label' } } },
  ],
}

export const XY = {
  widget: 'vj-xy',
  version: 1,
  title: 'VJ XY pad',
  description: 'Two shader knobs on one pad: drag the dot; across sets the first knob, up sets the second.',
  schema: {
    type: 'object',
    properties: {
      label: { ...label(20), description: 'both knob names, as "ZOOM · TWIST"' },
      x: { ...share, description: 'the first knob value' },
      down: { ...share, description: '1 minus the second knob value: 0 = top' },
    },
    required: ['label', 'x', 'down'],
  },
  parts: [
    { part: 'pad', draw: { type: 'rectangle', x: 0, y: 0, width: 300, height: 300, strokeColor: '#4a5568', backgroundColor: '#1a202c', fillStyle: 'solid', locked: true } },
    { part: 'dot', draw: { type: 'ellipse', x: 240, y: 240, width: 60, height: 60, strokeColor: INK, backgroundColor: '#38b2ac', fillStyle: 'solid', strokeWidth: 2 }, set: { x: { slot: 'x', per: 1 }, y: { slot: 'down', per: 1 } } },
    { part: 'label', draw: { type: 'text', x: 0, y: 312, width: 300, height: 30, fontSize: 22, textAlign: 'center' }, set: { text: { slot: 'label' } } },
  ],
}

export const BUTTON = {
  widget: 'vj-button',
  version: 1,
  title: 'VJ button',
  description: 'One show action: select it and Send to Claude; the board bridge presses it on the wall.',
  schema: {
    type: 'object',
    properties: {
      label: { ...label(10), description: 'what it does, in one word' },
      tone: { type: 'string', enum: ['danger', 'go', 'plain'], description: 'colours it' },
    },
    required: ['label', 'tone'],
  },
  parts: [
    {
      part: 'face',
      draw: { type: 'rectangle', x: 0, y: 0, width: 170, height: 90, strokeWidth: 3, fillStyle: 'solid', strokeColor: INK, backgroundColor: '#2d3748' },
      by: { slot: 'tone', cases: { danger: { backgroundColor: '#c53030' }, go: { backgroundColor: '#2f855a' }, plain: { backgroundColor: '#2d3748' } } },
    },
    { part: 'label', draw: { type: 'text', x: 10, y: 28, width: 150, height: 34, fontSize: 28, textAlign: 'center' }, set: { text: { slot: 'label' } } },
  ],
}

export const WIDGETS = [FADER, XY, BUTTON]

// The board skill that carries the widgets: submit it once per board with the draw MCP `skill` tool.
export const SKILL = {
  name: 'vj-controls',
  body: [
    'The show controls: vj-fader, vj-xy and vj-button widgets in frame `controls`.',
    'board-bridge.js (no model) turns them into VJ MCP calls. Do not answer their Sends.',
    'Drag a fader knob or the XY dot. Select a button, then Send to Claude.',
    'Redraw with `node scripts/vj/board-bridge.js layout --shader <name>`.',
  ].join('\n'),
  widgets: WIDGETS,
}

// ---- knobs a shader names (shaders.json `knobs`: "1|131:FOLD RATIO|…") ----

export const knobsOf = (spec) =>
  String(spec ?? '')
    .split('|')
    .filter(Boolean)
    .map((entry) => {
      const [n, ...name] = entry.split(':')
      return { knob: Number(n), name: name.join(':').trim() || null }
    })
    .filter((k) => Number.isInteger(k.knob) && k.knob >= 1 && k.knob <= 200)

// ---- layout: the frame and its widgets, as draw ops ----

export const BUTTONS = [
  { id: 'ctl-panic', label: 'PANIC', tone: 'danger' },
  { id: 'ctl-keep', label: 'KEEP', tone: 'go' },
  { id: 'ctl-prev', label: '◀', tone: 'plain' },
  { id: 'ctl-next', label: '▶', tone: 'plain' },
]

const COL = 390 // one phone width, in board units at zoom 1
const short = (name, knob) => (name ?? `K${knob}`).slice(0, 12)

/**
 * The control frame and every widget in it, as one `draw` call's ops. Faders for the first `faders` knobs the
 * shader names (named ones first), an XY pad for the next two, then the buttons. `values` (knob_N → 0..1) places
 * each knob where the wall has it now.
 */
export const layoutOps = ({ frame = 'controls', x = 0, y = 0, knobs = [], faders = 4, xy = true, values = {} } = {}) => {
  const named = [...knobs].sort((a, b) => (a.name ? 0 : 1) - (b.name ? 0 : 1))
  const onFaders = named.slice(0, faders)
  const onPad = xy ? named.slice(faders, faders + 2) : []
  const v = (k) => (Number.isFinite(values[`knob_${k}`]) ? Math.min(1, Math.max(0, values[`knob_${k}`])) : 0.5)
  const ops = []
  const at = (dx, dy) => ({ x: x + dx, y: y + dy })
  BUTTONS.forEach((b, i) => ops.push({ kind: 'widget', widget: 'vj-button', id: b.id, frameId: frame, ...at(20 + (i % 2) * 190, 20 + Math.floor(i / 2) * 110), width: 170, values: { label: b.label, tone: b.tone } }))
  const fy = 250
  const fw = onFaders.length ? Math.min(140, Math.floor((COL - 40) / onFaders.length) - 8) : 140
  onFaders.forEach((k, i) => ops.push({ kind: 'widget', widget: 'vj-fader', id: `fad-k${k.knob}`, frameId: frame, ...at(20 + i * (fw + 8), fy), width: fw, values: { label: short(k.name, k.knob), down: 1 - v(k.knob) } }))
  const padY = fy + (fw * 500) / 140 + 30
  if (onPad.length === 2) {
    const [a, b] = onPad
    ops.push({ kind: 'widget', widget: 'vj-xy', id: `xy-k${a.knob}-k${b.knob}`, frameId: frame, ...at(20, padY), width: COL - 40, values: { label: `${short(a.name, a.knob)} · ${short(b.name, b.knob)}`.slice(0, 20), x: v(a.knob), down: 1 - v(b.knob) } })
  }
  const height = Math.ceil(padY + (onPad.length === 2 ? ((COL - 40) * 342) / 300 : 0) + 40)
  return [{ kind: 'put', drafts: [{ id: frame, type: 'frame', x, y, width: COL, height, text: 'controls' }] }, ...ops]
}

/**
 * The controls drawn around the live picture (Window's `show` frame, a phone held sideways: the picture in the
 * middle, an iframe every tab lays over the canvas, so nothing may be drawn on it). Two faders on the left; the XY
 * pad and two more faders on the right; the buttons along the bottom. Every widget keeps `gap` clear of the picture.
 * `frame` and `picture` are board boxes ({x, y, width, height}).
 */
export const aroundOps = ({ frame, picture, frameId = 'show', knobs = [], values = {}, gap = 24 }) => {
  const named = [...knobs].sort((a, b) => (a.name ? 0 : 1) - (b.name ? 0 : 1))
  const v = (k) => (Number.isFinite(values[`knob_${k}`]) ? Math.min(1, Math.max(0, values[`knob_${k}`])) : 0.5)
  const ops = []
  const left = { x: frame.x + gap, w: picture.x - gap - (frame.x + gap) }
  const right = { x: picture.x + picture.width + gap, w: frame.x + frame.width - gap - (picture.x + picture.width + gap) }
  const top = frame.y + gap
  const faderW = Math.floor((left.w - 12) / 2)
  const fader = (k, x, y) => ops.push({ kind: 'widget', widget: 'vj-fader', id: `fad-k${k.knob}`, frameId, x, y, width: faderW, values: { label: short(k.name, k.knob), down: 1 - v(k.knob) } })
  const [a, b, c, d, e, f] = named
  if (a) fader(a, left.x, top)
  if (b) fader(b, left.x + faderW + 12, top)
  let rightY = top
  if (e && f) {
    ops.push({ kind: 'widget', widget: 'vj-xy', id: `xy-k${e.knob}-k${f.knob}`, frameId, x: right.x, y: top, width: right.w, values: { label: `${short(e.name, e.knob)} · ${short(f.name, f.knob)}`.slice(0, 20), x: v(e.knob), down: 1 - v(f.knob) } })
    rightY = top + (right.w * 342) / 300 + gap
  }
  if (c) fader(c, right.x, rightY)
  if (d) fader(d, right.x + faderW + 12, rightY)
  const by = picture.y + picture.height + gap
  const bw = Math.min(170, Math.floor((picture.width - 3 * 20) / 4))
  BUTTONS.forEach((btn, i) => ops.push({ kind: 'widget', widget: 'vj-button', id: btn.id, frameId, x: picture.x + i * (bw + 20), y: by, width: bw, values: { label: btn.label, tone: btn.tone } }))
  return ops
}

// ---- what a drag means ----

const clamp01 = (n) => Math.min(1, Math.max(0, n))
const round = (n) => Math.round(n * 1000) / 1000

/** knob_N from a fader: the knob's place along its track, top = 1. Scale-free: only the boxes matter. */
export const faderValue = (knob, track) => {
  const travel = track.height - knob.height
  if (!(travel > 0)) return null
  return round(clamp01(1 - (knob.y - track.y) / travel))
}

/** [x, y] from an XY dot on its pad, each 0..1, y top = 1. */
export const xyValue = (dot, pad) => {
  const tx = pad.width - dot.width, ty = pad.height - dot.height
  if (!(tx > 0 && ty > 0)) return null
  return [round(clamp01((dot.x - pad.x) / tx)), round(clamp01(1 - (dot.y - pad.y) / ty))]
}

/** Which control a moved element drives: `fad-k<N>-knob` or `xy-k<A>-k<B>-dot`, else null. */
export const draggedControl = (id) => {
  const fader = /^fad-k(\d{1,3})-knob$/.exec(id)
  if (fader) return { kind: 'fader', id: `fad-k${fader[1]}`, knobs: [`knob_${Number(fader[1])}`], part: 'knob', base: 'track' }
  const xy = /^xy-k(\d{1,3})-k(\d{1,3})-dot$/.exec(id)
  if (xy) return { kind: 'xy', id: `xy-k${xy[1]}-k${xy[2]}`, knobs: [`knob_${Number(xy[1])}`, `knob_${Number(xy[2])}`], part: 'dot', base: 'pad' }
  return null
}

/**
 * The knob writes a portal message implies, given every element the bridge holds (id → element, updated first).
 * One write per moved control, newest geometry wins; a control whose base part is missing writes nothing. A whole
 * `frame` picture (on connect, or when the frame itself moved) writes nothing: it says where the knobs are drawn, not
 * that anyone moved one, and replaying it would yank the wall back to the board.
 */
export const knobWrites = (message, held) => {
  if (message?.t !== 'delta') return {}
  const out = {}
  for (const e of message.elements ?? []) {
    if (e.isDeleted) continue
    const c = draggedControl(e.id)
    if (!c) continue
    const base = held.get(`${c.id}-${c.base}`)
    if (!base) continue
    if (c.kind === 'fader') {
      const v = faderValue(e, base)
      if (v !== null) out[c.knobs[0]] = v
    } else {
      const v = xyValue(e, base)
      if (v) { out[c.knobs[0]] = v[0]; out[c.knobs[1]] = v[1] }
    }
  }
  return out
}
