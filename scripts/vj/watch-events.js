// watch-events — one line per VJ MCP event, forever: the Monitor source for /show and /partner.
// It holds its place with `since`, so nothing is lost between waits, and reconnects when the dev
// server restarts. It replaces tailing .claude/vj-signals.jsonl and the CDP dial poll.
//   node scripts/vj/watch-events.js                      every event
//   node scripts/vj/watch-events.js release hands keep   only these types (event or signal type)
// Each line: {"seq":12,"type":"release","knob":"knob_4","value":0.91,…}. MCP_URL / PORT as mcp-call.js.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const url = process.env.MCP_URL || `http://localhost:${process.env.PORT || 6969}/mcp`
const types = process.argv.slice(2)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// A page signal arrives as {seq, t, type: 'vj-signal', signal: 'clip', data: {type: 'clip', …}};
// print it as {seq, type: 'clip', …data} so a grep on "type":"clip" works for both kinds.
export const flatten = ({ signal, data, ...rest }) =>
  signal ? { ...rest, ...data, seq: rest.seq, type: signal } : { ...rest, ...data }

const main = async () => {
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
      for (const e of body.events ?? []) console.log(JSON.stringify(flatten(e)))
    } catch (e) {
      console.log(JSON.stringify({ type: 'watch-error', error: e.message.slice(0, 200) }))
      client = null
      await sleep(3000)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main()
