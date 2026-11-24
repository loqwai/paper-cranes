// watch-events — one line per VJ MCP event, forever: the Monitor source for /show and /partner.
// It holds its place with `since`, so nothing is lost between waits, and reconnects when the dev
// server restarts. It replaces tailing .claude/vj-signals.jsonl and the CDP dial poll.
//   node scripts/vj/watch-events.js                      every event
//   node scripts/vj/watch-events.js release hands keep   only these types (event or signal type)
//   --settle <ms>  print a knob's `release` only once it has stayed still this long (default 1000;
//                  0 prints every one). The page sends `release` after 50 ms of stillness, so one
//                  sweep of a dial is a burst of them; each line wakes a model, so print the last.
// Each line: {"seq":12,"type":"release","knob":"knob_4","value":0.91,…}. MCP_URL / PORT as mcp-call.js.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const url = process.env.MCP_URL || `http://localhost:${process.env.PORT || 6969}/mcp`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const parseArgs = (argv) => {
  const i = argv.indexOf('--settle')
  const settleMs = i === -1 ? 1000 : Number(argv[i + 1])
  const types = argv.filter((a, j) => i === -1 || (j !== i && j !== i + 1))
  return { types, settleMs: Number.isFinite(settleMs) && settleMs > 0 ? settleMs : 0 }
}

// A page signal arrives as {seq, t, type: 'vj-signal', signal: 'clip', data: {type: 'clip', …}};
// print it as {seq, type: 'clip', …data} so a grep on "type":"clip" works for both kinds.
export const flatten = ({ signal, data, ...rest }) =>
  signal ? { ...rest, ...data, seq: rest.seq, type: signal } : { ...rest, ...data }

// Holds each knob's latest `release` and prints it once no newer one has come for settleMs.
// Every other event prints at once.
export const makeSettler = ({ settleMs, print, setTimer = setTimeout, clearTimer = clearTimeout }) => {
  const pending = new Map()
  return (e) => {
    if (!settleMs || e.type !== 'release') return print(e)
    clearTimer(pending.get(e.knob))
    pending.set(e.knob, setTimer(() => { pending.delete(e.knob); print(e) }, settleMs))
  }
}

const main = async () => {
  const { types, settleMs } = parseArgs(process.argv.slice(2))
  const emit = makeSettler({ settleMs, print: (e) => console.log(JSON.stringify(e)) })
  let since
  let client
  while (true) {
    try {
      if (!client) {
        client = new Client({ name: 'watch-events', version: '0.1.0' })
        await client.connect(new StreamableHTTPClientTransport(new URL(url)))
      }
      const res = await client.callTool({
        name: 'wait_for_event',
        arguments: { ...(since !== undefined && { since }), ...(types.length && { types }), timeout_s: 50 },
      }, undefined, { timeout: 70_000 })
      const body = JSON.parse(res.content.find((c) => c.type === 'text')?.text ?? '{}')
      if (Number.isFinite(body.seq)) since = body.seq
      for (const e of body.events ?? []) emit(flatten(e))
    } catch (e) {
      console.log(JSON.stringify({ type: 'watch-error', error: e.message.slice(0, 200) }))
      client = null
      await sleep(3000)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main()
