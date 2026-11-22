// Signed request client for the remote-inspect channel (docs/remote-inspect.md).
// Shared by cranes-remote.js (the full CLI) and vj-tick.js (the guarded VJ loop).

import { randomUUID } from 'node:crypto'
import { signPayload } from '../../src/remote/inspectAuth.js'
import { readInspectToken } from './token.js'

const parse = (data) => {
  try { return JSON.parse(data) } catch { return null }
}

// opts: { port, url?, display?, timeoutMs?, onSkew? }
// Resolves with { ws, request(cmd, args), listDisplays(), onMessage(fn), display, close() }.
// Set remote.display to target one display: requests then carry `to` (pages that know `to` ignore
// requests for other displays) and only that display's reply is accepted.
export const createRemote = async ({ port, url, display, timeoutMs = 10_000, onSkew } = {}) => {
  const wsUrl = url ?? `ws://127.0.0.1:${port}/ws`
  const ws = await new Promise((resolve, reject) => {
    const s = new WebSocket(wsUrl)
    s.addEventListener('open', () => resolve(s), { once: true })
    s.addEventListener('error', () => reject(new Error(`cannot connect to ${wsUrl}`)), { once: true })
  })
  const onMessage = (fn) => ws.addEventListener('message', (ev) => {
    const m = parse(ev.data)
    if (m) fn(m)
  })
  let clockOffset = 0 // display clock minus ours, learned from a `stale` reply

  const request = async (cmd, args = {}, retried = false) => {
    const id = randomUUID()
    const payload = JSON.stringify({ id, ts: Date.now() + clockOffset, cmd, args, ...(remote.display ? { to: remote.display } : {}) })
    const sig = await signPayload(readInspectToken(), payload)
    const reply = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no reply to ${cmd} within ${timeoutMs} ms (is a display connected on port ${port}?)`)), timeoutMs)
      onMessage((m) => {
        if (m.type !== 'inspect-reply' || m.data?.id !== id) return
        if (remote.display && m.data.display !== remote.display) return
        clearTimeout(timer)
        resolve(m.data)
      })
      ws.send(JSON.stringify({ type: 'inspect', data: { payload, sig } }))
    })
    if (!reply.ok && reply.error === 'stale' && !retried && reply.now) {
      clockOffset = reply.now - Date.now()
      onSkew?.(clockOffset)
      return request(cmd, args, true)
    }
    if (!reply.ok) throw new Error(`display ${reply.display}: ${reply.error}`)
    return reply
  }

  // Every connected display answers a signed ping; collect their ids for `windowMs`.
  const listDisplays = async (windowMs = 1500) => {
    const id = randomUUID()
    const payload = JSON.stringify({ id, ts: Date.now() + clockOffset, cmd: 'ping', args: {} })
    const sig = await signPayload(readInspectToken(), payload)
    const seen = new Set()
    onMessage((m) => { if (m.type === 'inspect-reply' && m.data?.id === id && m.data.display) seen.add(m.data.display) })
    ws.send(JSON.stringify({ type: 'inspect', data: { payload, sig } }))
    await new Promise((r) => setTimeout(r, windowMs))
    return [...seen].sort()
  }

  const remote = { ws, request, onMessage, listDisplays, display, close: () => ws.close() }
  return remote
}

// Pick the display to talk to: the one asked for, else the only one connected. Refuses when
// several are connected and none was named, so one person's loop never drives another's screen.
export const resolveDisplay = (wanted, connected) => {
  if (wanted) return connected.includes(wanted) ? { display: wanted } : { error: `display ${wanted} is not connected (connected: ${connected.join(', ') || 'none'})` }
  if (connected.length === 1) return { display: connected[0] }
  if (!connected.length) return { error: 'no display connected' }
  return { error: `${connected.length} displays connected (${connected.join(', ')}): pass --display <id>` }
}
