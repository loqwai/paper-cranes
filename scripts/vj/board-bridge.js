// board-bridge — a draw board (https://draw.hypnodroid.com) as the show's phone control surface,
// with no model in the path. It listens on the board as one agent, and each Send that selects a
// control shape becomes one VJ MCP call on the display: PANIC, KEEP, take or dismiss a proposal,
// the next or previous setlist beat, a knob to a value. It can also keep a status card on the
// board fresh from get_state. Skills start it; nothing here asks a model anything.
//
//   node scripts/vj/board-bridge.js --board show-2026-11-24 --ticket <listener ticket> \
//     [--panic clit-set/2] [--setlist sun-set] [--status-link <widget link>] [--status-every 5]
//
// --ticket   from the draw MCP `listener` tool, called as the bridge's own agent (e.g. show-bridge).
//            It lasts 8 h; exit code 2 means it expired: mint another and restart.
// --panic    the known-good fork PANIC swaps to (no reload). Without it, PANIC calls the page's
//            own `panic` tool when the VJ MCP has one, else it is refused.
// --setlist  setlists/<name>.json, for ◀ / ▶. A setlist with a `driver` plays a beat by running it
//            (`node <driver> <n>`); otherwise a beat is set_shader {shader, params}.
// --status-link  a status-card widget link from the draw MCP `link` tool. Links last an hour:
//            when it answers 4xx the bridge says so once and stops posting; mint a new one.
// MCP_URL (default http://localhost:$PORT/mcp) and DRAW_URL (default https://draw.hypnodroid.com).
//
// Control ids (a shape's bound label `<id>-text` counts as the shape):
//   ctl-panic · ctl-keep · ctl-next · ctl-prev · ctl-k<N>-<0..100> (knob_N = value/100)
//   ctl-k<N>-off (release knob_N) · prop-<id>-take · prop-<id>-drop (answer proposal <id>)
// Every other Send is left alone: it is for a model (chat, a question) and its own listener.
//
// One line per action on stdout and in .claude/board-bridge.jsonl:
//   {sent, control, ok, ms}  ms = Send received → MCP call answered (the page has applied it).
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LOG = join(ROOT, '.claude', 'board-bridge.jsonl')
const KEEPS = join(ROOT, '.claude', 'keeps.jsonl')
const PROPOSALS = join(ROOT, '.claude', 'vj-proposals.jsonl')
const SETLIST_STATE = join(ROOT, '.claude', 'setlist-state.json')

// ---- pure: which control did this Send press? ----

const shapeOf = (id) => id.replace(/-text$/, '')

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

const knobsOf = (state) => Object.fromEntries(
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
    const kept = { t, source: 'board', sent, shader: state.shader, shaderHash: state.shaderHash, controllers: state.controllers, params: knobsOf(state), features: state.features, shot }
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

// GET /api/listen/<board>: the same long poll the draw listener script makes, kept in one process
// so a tap costs one request and one MCP call, not a node start.
const listen = async function* ({ base, board, ticket }) {
  let ack
  let first = true
  let failures = 0
  while (true) {
    const q = new URLSearchParams({ ...(ack && { ack }), ...(first && { handoff: '1' }) })
    let res
    try {
      res = await fetch(new URL(`/api/listen/${board}?${q}`, base), { headers: { 'Draw-Listen-Ticket': ticket }, signal: AbortSignal.timeout(95_000) })
    } catch (e) {
      await new Promise((r) => setTimeout(r, Math.min(4000, 250 * 2 ** failures++)))
      continue
    }
    if (res.status === 403) throw Object.assign(new Error('listen ticket refused or expired: call the draw listener tool again'), { code: 2 })
    if ([500, 502, 503, 504].includes(res.status)) {
      await new Promise((r) => setTimeout(r, Math.min(4000, 250 * 2 ** failures++)))
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

const statusLoop = async (mcp, opts, signals) => {
  if (!opts.statusLink) return
  let warned = false
  while (true) {
    try {
      const { body: s } = await mcp.call('get_state', { features: 'none' })
      const fps = Number.isFinite(s.fps) ? Math.round(s.fps) : null
      const hands = signals.hands ? `hands ON ${signals.hands.knob ?? ''}`.trim() : 'hands off'
      const pad = signals.pad == null ? 'pad ?' : signals.pad ? 'pad alive' : 'PAD DOWN'
      const state = s.shaderError || fps === null || fps < 30 || signals.pad === false ? 'blocked' : 'running'
      const res = await fetch(opts.statusLink, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ protocol: 'widget', values: {
          title: String(s.shader ?? 'no shader').slice(-32),
          state,
          number: fps === null ? '-' : `${fps}`,
          unit: `fps · ${hands} · ${pad}`.slice(0, 40),
          provenance: `get_state · board-bridge · ${new Date().toISOString().slice(11, 19)}Z`,
        }, expires: '2m' }),
      })
      if (!res.ok && !warned) {
        warned = true
        console.log(JSON.stringify({ status: 'link refused', code: res.status, fix: 'mint a new status-card link and restart with --status-link' }))
      }
      if (!res.ok) return
    } catch (e) {
      console.log(JSON.stringify({ status: 'get_state failed', error: e.message }))
    }
    await new Promise((r) => setTimeout(r, opts.statusEvery * 1000))
  }
}

// hands / pad-alive come from the page's ?vj=1 signals; the status card shows the latest of each.
const signalLoop = async (mcp, signals) => {
  let since
  while (true) {
    try {
      const { body } = await mcp.call('wait_for_event', { ...(since !== undefined && { since }), timeout_s: 50 })
      since = body.seq
      for (const e of body.events ?? []) {
        const type = e.signal?.type ?? e.type
        if (type === 'hands') signals.hands = e.signal?.on ? e.signal : null
        if (type === 'pad-alive') signals.pad = !!e.signal?.alive
      }
    } catch {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}

const main = async () => {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.board || !opts.ticket) {
    console.error('usage: board-bridge.js --board <name> --ticket <listener ticket> [--panic <fork>] [--setlist <name>] [--status-link <url>]')
    process.exit(64)
  }
  const mcpUrl = process.env.MCP_URL || `http://localhost:${process.env.PORT || 6969}/mcp`
  const mcp = await connect(mcpUrl)
  const act = actions(mcp, opts)
  const signals = { hands: null, pad: null }
  console.log(JSON.stringify({ bridge: 'up', board: opts.board, mcp: mcpUrl, pageTools: ['panic', 'keep', 'answer_proposal', 'propose'].filter(mcp.has) }))
  statusLoop(mcp, opts, signals)
  signalLoop(mcp, signals)
  try {
    for await (const send of listen({ base: process.env.DRAW_URL || 'https://draw.hypnodroid.com', board: opts.board, ticket: opts.ticket })) {
      const recv = performance.now()
      const control = controlOf(send)
      if (!control) {
        console.log(JSON.stringify({ sent: send.sent, ignored: send.scope ?? 'no scope', selected: (send.selected ?? []).length }))
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
      console.log(JSON.stringify(line))
      append(LOG, line)
    }
  } catch (e) {
    console.error(e.message)
    process.exit(e.code ?? 1)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
