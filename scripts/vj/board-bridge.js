// board-bridge — a draw board (https://draw.hypnodroid.com) as the show's phone control surface,
// with no model in the path. Buttons: each Send that selects one control becomes one VJ MCP call on
// the display (PANIC, KEEP, take or drop a proposal, the next or previous setlist beat, a knob to a
// value). Faders and the XY pad: the bridge watches the control frame on draw's read-only portal
// socket, and every drag commit becomes one `update-params` on the display's socket, as a dial's
// would. It can also keep a status card on the board fresh from get_state. Skills start it; nothing
// here asks a model anything. Full guide: docs/draw-control-surface.md.
//
//   node scripts/vj/board-bridge.js --board show-2026-11-24 --ticket <listener ticket> \
//     [--frame controls] [--panic clit-set/2] [--setlist sun-set] [--status-link <widget link>] [--status-every 5]
//   node scripts/vj/board-bridge.js layout --shader clit-set/2 --frame show --around 0,5600,1600,900 --picture 320,5780,960,540
//   node scripts/vj/board-bridge.js layout --shader clit-set/2 [--frame controls] [--x 0] [--y 0] [--faders 4]
//     prints {skill, ops}: submit `skill` once with the draw MCP `skill` tool, then `draw` the `ops`.
//     --around/--picture draw around the live picture in Window's `show` frame; without them, a column frame.
//
// --ticket   from the draw MCP `listener` tool, called as the bridge's own agent (e.g. show-bridge).
//            It lasts 8 h; exit code 2 means it expired: mint another and restart. Or set
//            DRAW_LISTEN_TICKET instead, which keeps the ticket out of `ps` and pasted command lines.
// --frame    the control frame the faders live in (default `controls`). Faders need draw's
//            ticket portal route (/api/listen/<board>/portal); until a draw deploy has it, the
//            bridge says so once and keeps retrying each minute, and the buttons work regardless.
// --panic    the known-good fork PANIC swaps to (no reload). Without it, PANIC calls the page's
//            own `panic` tool when the VJ MCP has one, else it is refused.
// --setlist  setlists/<name>.json, for ◀ / ▶. A setlist with a `driver` plays a beat by running it
//            (`node <driver> <n>`); otherwise a beat is set_shader {shader, params}.
// --status-link  a status-card widget link from the draw MCP `link` tool. Links last an hour:
//            when it answers 4xx the bridge says so once and stops posting; mint a new one.
// --kept-link  a link to frame `kept` from the draw MCP `link` tool: every KEEP (pad, MIDI, spacebar,
//            board) gets its card there and its picture in .claude/vj-shots/, no model (board-kept.js).
// --kept-frame  that frame's id (default `kept`).
// --hub      the display's socket for fader writes (default ws://<MCP host>/ws). Without one,
//            faders fall back to set_params, which is slower (it reads the value back).
// MCP_URL (default http://localhost:$PORT/mcp) and DRAW_URL (default https://draw.hypnodroid.com).
// SIGINT / SIGTERM stop it cleanly: sockets closed, the status card set to stopped.
//
// Control ids (a shape's bound label `<id>-text`, or a widget part `<id>-face` / `<id>-label`, counts
// as the control):
//   ctl-panic · ctl-keep · ctl-next · ctl-prev · ctl-k<N>-<0..100> (knob_N = value/100)
//   ctl-k<N>-off (release knob_N) · prop-<id>-take · prop-<id>-drop (answer proposal <id>)
//   fad-k<N> (vj-fader: drag fad-k<N>-knob) · xy-k<A>-k<B> (vj-xy: drag xy-k<A>-k<B>-dot)
// Every other Send is left alone: it is for a model (chat, a question) and its own listener.
//
// One line per action on stdout and in .claude/board-bridge.jsonl:
//   {sent, control, ok, ms}  ms = Send received → MCP call answered (the page has applied it).
// Fader writes are not logged one by one (ten a second); a line per drag says how many went out.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { aroundOps, knobWrites, knobsOf, layoutOps, SKILL } from './board-controls.js'
import { watchKeeps } from './board-kept.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LOG = join(ROOT, '.claude', 'board-bridge.jsonl')
const KEEPS = join(ROOT, '.claude', 'keeps.jsonl')
const PROPOSALS = join(ROOT, '.claude', 'vj-proposals.jsonl')
const SETLIST_STATE = join(ROOT, '.claude', 'setlist-state.json')

// ---- pure: which control did this Send press? ----

const shapeOf = (id) => id.replace(/-(text|face|label)$/, '')

// A press is a Send that selects exactly one control. A Send of the whole view (scope viewport:
// the button with nothing selected) lists everything on screen, and a chat line is words, so
// neither ever fires a control; nor does a selection holding two different controls.
export const controlOf = (send) => {
  if (!send || send.scope === 'viewport' || send.scope === 'chat') return null
  const found = [...new Set((send.selected ?? []).map((raw) => shapeOf(String(raw))))].map(controlFor).filter(Boolean)
  return found.length === 1 ? found[0] : null
}

const controlFor = (id) => {
  {
    if (id === 'ctl-panic') return { kind: 'panic', id }
    if (id === 'ctl-keep') return { kind: 'keep', id }
    if (id === 'ctl-next') return { kind: 'beat', step: 1, id }
    if (id === 'ctl-prev') return { kind: 'beat', step: -1, id }
    const knob = id.match(/^ctl-k(\d{1,3})-(off|\d{1,3})$/)
    if (knob) {
      const value = knob[2] === 'off' ? null : Math.min(100, Number(knob[2])) / 100
      return { kind: 'knob', knob: `knob_${Number(knob[1])}`, value, id }
    }
    const prop = id.match(/^prop-([A-Za-z0-9_]+)-(take|drop)$/)
    if (prop) return { kind: 'proposal', proposal: prop[1], answer: prop[2], id }
  }
  return null
}

export const parseArgs = (argv) => {
  const out = { statusEvery: 5 }
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    out[key] = argv[i + 1]
    i++
  }
  out.statusEvery = Number(out.statusEvery)
  return out
}

// The proposals file holds one line per event: {id, label, params, shader?} when /partner proposes,
// {id, answer, by} when someone answers. The latest proposal with no answer is the open one.
export const openProposal = (lines, id) => {
  const answered = new Set(lines.filter((l) => l.answer).map((l) => l.id))
  return lines.findLast((l) => l.params && l.id === id && !answered.has(l.id)) ?? null
}

// ---- the bridge ----

const readJsonl = (file) => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
const append = (file, obj) => {
  mkdirSync(dirname(file), { recursive: true })
  appendFileSync(file, JSON.stringify(obj) + '\n')
}

const connect = async (url) => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
  const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js')
  const client = new Client({ name: 'board-bridge', version: '0.1.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(url)))
  const { tools } = await client.listTools()
  const names = new Set(tools.map((t) => t.name))
  const call = async (name, args = {}) => {
    const res = await client.callTool({ name, arguments: args }, undefined, { timeout: 30_000 })
    const text = res.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
    let body = text
    try { body = JSON.parse(text) } catch {}
    if (res.isError) throw new Error(typeof body === 'string' ? body : JSON.stringify(body))
    return { body, images: res.content.filter((c) => c.type === 'image') }
  }
  return { call, has: (n) => names.has(n), tools: [...names], close: () => client.close() }
}

const statedKnobs = (state) => Object.fromEntries(
  Object.entries({ ...(state.knobs ?? {}), ...(state.pinned ?? {}) })
    .map(([k, v]) => [k, typeof v === 'object' && v !== null ? v.value : v])
    .filter(([k, v]) => /^knob_\d+$/.test(k) && Number.isFinite(v)),
)

const actions = (mcp, opts) => ({
  panic: async () => {
    if (mcp.has('panic')) return (await mcp.call('panic', opts.panic ? { fork: opts.panic } : {})).body
    if (!opts.panic) throw new Error('no --panic fork and the VJ MCP has no panic tool')
    return (await mcp.call('set_shader', { shader: opts.panic, source: 'board' })).body
  },
  keep: async ({ sent }) => {
    if (mcp.has('keep')) return (await mcp.call('keep', {})).body
    const { body: state, images } = await mcp.call('get_state', { features: 'core', screenshot: true })
    const t = new Date().toISOString()
    let shot = null
    if (images[0]) {
      shot = join(ROOT, '.claude', 'vj-shots', `keep-${t.replace(/[:.]/g, '-')}.jpg`)
      mkdirSync(dirname(shot), { recursive: true })
      writeFileSync(shot, Buffer.from(images[0].data, 'base64'))
    }
    const kept = { t, source: 'board', sent, shader: state.shader, shaderHash: state.shaderHash, controllers: state.controllers, params: statedKnobs(state), features: state.features, shot }
    append(KEEPS, kept)
    return { kept: kept.shader, knobs: Object.keys(kept.params).length, shot }
  },
  // A board tap is Aaron's own hand (docs/live-show-contract.md): source 'board' is never held by
  // the page's HANDS lock, and it turns the lock on like a dial.
  knob: async ({ knob, value }) => (await mcp.call('set_params', { params: { [knob]: value }, source: 'board' })).body,
  proposal: async ({ proposal, answer, sent }) => {
    if (mcp.has('answer_proposal')) return (await mcp.call('answer_proposal', { id: proposal, take: answer === 'take' })).body
    const open = openProposal(readJsonl(PROPOSALS), proposal)
    if (!open) throw new Error(`proposal ${proposal} is not open`)
    let applied = null
    if (answer === 'take') {
      applied = open.shader
        ? (await mcp.call('set_shader', { shader: open.shader, params: open.params, source: 'board' })).body
        : (await mcp.call('set_params', { params: open.params, source: 'board' })).body
    }
    append(PROPOSALS, { id: proposal, answer: answer === 'take' ? 'taken' : 'dropped', by: 'board', sent, t: new Date().toISOString() })
    return { proposal, answer, applied }
  },
  beat: async ({ step }) => {
    if (!opts.setlist) throw new Error('no --setlist')
    const list = JSON.parse(readFileSync(join(ROOT, 'setlists', `${opts.setlist}.json`), 'utf8'))
    const state = existsSync(SETLIST_STATE) ? JSON.parse(readFileSync(SETLIST_STATE, 'utf8')) : {}
    const now = state.setlist === list.name ? state.n : 0
    const n = Math.max(1, Math.min(list.beats.length, now + step))
    const beat = list.beats[n - 1]
    let result
    if (list.driver) {
      const run = spawnSync('node', [join(ROOT, list.driver), String(n)], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 })
      if (run.status !== 0) throw new Error(`${list.driver} ${n}: ${(run.stderr || run.stdout).trim().split('\n').pop()}`)
      result = run.stdout.trim().split('\n')[0]
    } else {
      result = (await mcp.call('set_shader', { shader: beat.shader ?? beat.path, params: beat.params ?? {}, source: 'board' })).body
    }
    writeFileSync(SETLIST_STATE, JSON.stringify({ setlist: list.name, n, name: beat.name, t: new Date().toISOString() }) + '\n')
    return { beat: n, name: beat.name, result }
  },
})

const sleep = (ms, signal) => new Promise((resolve) => {
  const timer = setTimeout(resolve, ms)
  signal?.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
})

/** 250 ms doubling to `cap`: how long to wait before the nth retry in a row. */
export const backoff = (failures, cap = 4000) => Math.min(cap, 250 * 2 ** failures)

// GET /api/listen/<board>: the same long poll the draw listener script makes, kept in one process
// so a tap costs one request and one MCP call, not a node start.
const listen = async function* ({ base, board, ticket, signal }) {
  let ack
  let first = true
  let failures = 0
  while (!signal.aborted) {
    const q = new URLSearchParams({ ...(ack && { ack }), ...(first && { handoff: '1' }) })
    let res
    try {
      res = await fetch(new URL(`/api/listen/${board}?${q}`, base), { headers: { 'Draw-Listen-Ticket': ticket }, signal: AbortSignal.any([signal, AbortSignal.timeout(95_000)]) })
    } catch {
      await sleep(backoff(failures++), signal)
      continue
    }
    if (res.status === 403) throw Object.assign(new Error('listen ticket refused or expired: call the draw listener tool again'), { code: 2 })
    if ([429, 500, 502, 503, 504].includes(res.status)) {
      await res.body?.cancel()
      await sleep(backoff(failures++), signal)
      continue
    }
    if (!res.ok) throw new Error(`listen answered ${res.status}: ${await res.text()}`)
    failures = 0
    first = false
    const answer = await res.json()
    if (!answer.send) continue
    ack = answer.send.sent
    yield answer.send
  }
}

// The control frame, live: draw's read-only portal socket, opened with the listen ticket. Every
// commit that moves a fader knob or the XY dot arrives as a delta; `onWrites` gets the knob values.
// Reconnects with backoff; a draw without the ticket route (401/404/426) is retried each minute.
const watchFrame = ({ base, board, ticket, frame, signal, onWrites, log }) => {
  const held = new Map()
  let wholeSeq = null
  let failures = 0
  let missing = false
  let socket = null
  signal.addEventListener('abort', () => socket?.close(1000, 'bridge stopped'), { once: true })
  const open = async () => {
    const { WebSocket } = await import('ws')
    while (!signal.aborted) {
      const url = new URL(`/api/listen/${board}/portal`, base)
      url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:'
      const closed = await new Promise((resolve) => {
        socket = new WebSocket(url, { headers: { 'Draw-Listen-Ticket': ticket } })
        socket.on('unexpected-response', (_req, res) => { resolve({ status: res.statusCode }); res.resume() })
        socket.on('open', () => {
          failures = 0
          if (missing) log({ faders: 'draw has the ticket portal now: faders on' })
          missing = false
          socket.send(JSON.stringify({ t: 'watch', frame, since: null }))
          log({ faders: 'watching', frame })
        })
        socket.on('message', (raw) => {
          let message
          try { message = JSON.parse(String(raw)) } catch { return }
          if (message.t === 'frame') { held.clear(); wholeSeq = message.seq ?? null }
          for (const e of message.elements ?? []) e.isDeleted ? held.delete(e.id) : held.set(e.id, e)
          if (message.t === 'gone') log({ faders: `frame ${frame} is gone: draw the controls again (board-bridge.js layout)` })
          const writes = knobWrites(message, held, wholeSeq)
          if (Object.keys(writes).length) onWrites(writes)
        })
        socket.on('close', (code) => resolve({ code }))
        socket.on('error', () => {})
      })
      if (signal.aborted) return
      if (closed.status === 403) throw Object.assign(new Error('portal refused the listen ticket: call the draw listener tool again'), { code: 2 })
      // 401: a draw without the route sends the path to its sign-in gate (measured on draw.hypnodroid.com, 2026-11-24).
      if (closed.status === 401 || closed.status === 404 || closed.status === 426) {
        if (!missing) log({ faders: `off: this draw has no ticket portal route yet (${closed.status}); buttons still work; retrying each minute` })
        missing = true
        await sleep(60_000, signal)
        continue
      }
      await sleep(backoff(failures++, 10_000), signal)
    }
  }
  return open()
}

// Fader writes: straight onto the display's socket as an `update-params` with source "board", the
// path a dial takes (docs/live-show-contract.md), so the HANDS lock treats them as his hands. Newest
// value per knob wins while the socket is down; without a hub, one set_params at a time, newest wins.
const knobWriter = ({ hub, mcp, signal, log }) => {
  let socket = null
  let up = false
  let waiting = {}
  let inflight = false
  const viaMcp = async () => {
    if (inflight || !Object.keys(waiting).length) return
    inflight = true
    const params = waiting
    waiting = {}
    try { await mcp.call('set_params', { params, source: 'board' }) } catch (e) { log({ faders: 'set_params failed', error: e.message }) }
    inflight = false
    viaMcp()
  }
  const flush = () => {
    if (!Object.keys(waiting).length) return
    if (up) {
      socket.send(JSON.stringify({ type: 'update-params', data: waiting, source: 'board' }))
      waiting = {}
      return
    }
    if (!hub) viaMcp()
  }
  const connect = async () => {
    if (!hub) return
    const { WebSocket } = await import('ws')
    let failures = 0
    while (!signal.aborted) {
      await new Promise((resolve) => {
        socket = new WebSocket(hub)
        socket.on('open', () => { up = true; failures = 0; flush() })
        socket.on('close', () => { up = false; resolve() })
        socket.on('error', () => {})
      })
      if (!signal.aborted) await sleep(backoff(failures++, 10_000), signal)
    }
  }
  signal.addEventListener('abort', () => socket?.close(), { once: true })
  connect()
  return (writes) => { Object.assign(waiting, writes); flush() }
}

const statusLoop = async (mcp, opts, signals, signal) => {
  if (!opts.statusLink) return
  let warned = false
  while (!signal.aborted) {
    try {
      const { body: s } = await mcp.call('get_state', { features: 'none' })
      const fps = Number.isFinite(s.fps) ? Math.round(s.fps) : null
      const hands = signals.hands ? `hands ON ${signals.hands.knob ?? ''}`.trim() : 'hands off'
      const pad = signals.pad == null ? 'pad ?' : signals.pad ? 'pad alive' : 'PAD DOWN'
      const state = s.shaderError || fps === null || fps < 30 || signals.pad === false ? 'blocked' : 'running'
      const ok = await postStatus(opts.statusLink, {
        title: String(s.shader ?? 'no shader').slice(-32),
        state,
        number: fps === null ? '-' : `${fps}`,
        unit: `fps · ${hands} · ${pad}`.slice(0, 40),
        provenance: `get_state · board-bridge · ${new Date().toISOString().slice(11, 19)}Z`,
      }, '2m')
      if (!ok && !warned) {
        warned = true
        console.log(JSON.stringify({ status: 'link refused', fix: 'mint a new status-card link and restart with --status-link' }))
      }
      if (!ok) return
    } catch (e) {
      console.log(JSON.stringify({ status: 'get_state failed', error: e.message }))
    }
    await sleep(opts.statusEvery * 1000, signal)
  }
}

// A status card is a widget write through a link: a draw, never a Send or a chat line, so it wakes no
// agent listening on the board.
const postStatus = async (link, values, expires) => {
  const res = await fetch(link, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ protocol: 'widget', values, expires }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
  await res?.body?.cancel()
  return !!res?.ok
}

// hands / pad-alive come from the page's ?vj=1 signals; the status card shows the latest of each.
const signalLoop = async (mcp, signals, signal) => {
  let since
  while (!signal.aborted) {
    try {
      const { body } = await mcp.call('wait_for_event', { ...(since !== undefined && { since }), timeout_s: 50 })
      since = body.seq
      for (const e of body.events ?? []) {
        const type = e.signal?.type ?? e.type
        if (type === 'hands') signals.hands = e.signal?.on ? e.signal : null
        if (type === 'pad-alive') signals.pad = !!e.signal?.alive
      }
    } catch {
      await sleep(2000, signal)
    }
  }
}

// `layout`: the widgets skill and the draw ops for the control frame, for an agent to apply once with
// the draw MCP (`skill` then `draw`). Reads the shader's knob names from the dev server's shaders.json
// and, when a display is up, where its knobs stand now.
const layout = async (opts, mcpUrl) => {
  const origin = new URL(mcpUrl).origin
  const shaders = await (await fetch(`${origin}/shaders.json`)).json()
  const list = Array.isArray(shaders) ? shaders : shaders.shaders ?? []
  const shader = opts.shader && list.find((s) => s.name === opts.shader)
  if (opts.shader && !shader) throw new Error(`no shader ${opts.shader} in ${origin}/shaders.json`)
  let values = {}
  try {
    const mcp = await connect(mcpUrl)
    const { body } = await mcp.call('get_state', { features: 'none' })
    values = Object.fromEntries(Object.entries({ ...(body.knobs ?? {}), ...(body.pinned ?? {}) }).map(([k, v]) => [k, typeof v === 'object' && v ? v.value : v]))
    await mcp.close()
  } catch {}
  const knobs = knobsOf(shader?.knobs)
  const box = (s) => { const [x, y, width, height] = String(s).split(',').map(Number); return { x, y, width, height } }
  // --around <frame box> --picture <picture box>: the controls drawn around the live picture in an existing frame
  // (frame `show`, docs/draw-control-surface.md); otherwise a phone-width column frame of its own.
  const ops = opts.around
    ? aroundOps({ frameId: opts.frame ?? 'show', frame: box(opts.around), picture: box(opts.picture), knobs, values })
    : layoutOps({ frame: opts.frame ?? 'controls', x: Number(opts.x ?? 0), y: Number(opts.y ?? 0), knobs, faders: Number(opts.faders ?? 4), values })
  console.log(JSON.stringify({ skill: SKILL, ops }))
}

const main = async () => {
  const argv = process.argv.slice(2)
  const command = argv[0] && !argv[0].startsWith('--') ? argv.shift() : 'run'
  const opts = parseArgs(argv)
  // The ticket reads 8 h of the whole board: prefer the env var, which `ps` and a pasted command line do not show.
  opts.ticket ??= process.env.DRAW_LISTEN_TICKET
  const mcpUrl = process.env.MCP_URL || `http://localhost:${process.env.PORT || 6969}/mcp`
  if (command === 'layout') return layout(opts, mcpUrl)
  if (!opts.board || !opts.ticket) {
    console.error('usage: board-bridge.js --board <name> --ticket <listener ticket> [--frame controls] [--panic <fork>] [--setlist <name>] [--status-link <url>] [--kept-link <url>] [--hub <ws url>]\n       board-bridge.js layout --shader <name> [--frame controls] [--x 0] [--y 0] [--faders 4]')
    process.exit(64)
  }
  const stop = new AbortController()
  const { signal } = stop
  const log = (line) => console.log(JSON.stringify(line))
  const mcp = await connect(mcpUrl)
  const act = actions(mcp, opts)
  const signals = { hands: null, pad: null }
  const base = process.env.DRAW_URL || 'https://draw.hypnodroid.com'
  const hub = opts.hub ?? (() => { const u = new URL(mcpUrl); u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'; u.pathname = '/ws'; return u.href })()
  const finish = async (code) => {
    if (signal.aborted) return
    stop.abort()
    if (opts.statusLink) await postStatus(opts.statusLink, { title: 'board bridge', state: 'waiting', number: '-', unit: 'bridge stopped', provenance: `board-bridge · ${new Date().toISOString().slice(11, 19)}Z` }, '10m')
    await mcp.close().catch(() => {})
    log({ bridge: 'stopped', code })
    process.exit(code)
  }
  process.once('SIGINT', () => finish(0))
  process.once('SIGTERM', () => finish(0))
  log({ bridge: 'up', board: opts.board, mcp: mcpUrl, hub, frame: opts.frame ?? 'controls', pageTools: ['panic', 'keep', 'answer_proposal', 'propose'].filter(mcp.has) })
  statusLoop(mcp, opts, signals, signal)
  signalLoop(mcp, signals, signal)
  if (opts.keptLink) watchKeeps({ mcp, root: ROOT, link: opts.keptLink, frame: opts.keptFrame ?? 'kept', signal, log })
  const write = knobWriter({ hub, mcp, signal, log })
  let moved = 0
  let quiet = null
  watchFrame({
    base, board: opts.board, ticket: opts.ticket, frame: opts.frame ?? 'controls', signal, log,
    onWrites: (writes) => {
      write(writes)
      moved++
      clearTimeout(quiet)
      quiet = setTimeout(() => { log({ faders: 'drag', writes: moved, last: writes }); moved = 0 }, 500)
    },
  }).catch((e) => { console.error(e.message); finish(e.code ?? 1) })
  try {
    for await (const send of listen({ base, board: opts.board, ticket: opts.ticket, signal })) {
      const recv = performance.now()
      const control = controlOf(send)
      if (!control) {
        log({ sent: send.sent, ignored: send.scope ?? 'no scope', selected: (send.selected ?? []).length })
        continue
      }
      let line
      try {
        const result = await act[control.kind]({ ...control, sent: send.sent })
        line = { sent: send.sent, control: control.id, ok: true, ms: Math.round(performance.now() - recv), result }
      } catch (e) {
        line = { sent: send.sent, control: control.id, ok: false, ms: Math.round(performance.now() - recv), error: e.message }
      }
      line.t = new Date().toISOString()
      log(line)
      append(LOG, line)
    }
  } catch (e) {
    if (signal.aborted) return
    console.error(e.message)
    await finish(e.code ?? 1)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
