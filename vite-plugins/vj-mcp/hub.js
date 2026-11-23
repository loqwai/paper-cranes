// The display hub: what the dev server knows about the pages it can VJ.
//
// A Display is one browser socket on /ws that said `display-hello` (a `?remote=display` page;
// src/remote/inspect.js). The broker (remote-ws-plugin) hands the hub every socket event; the
// MCP tools (tools.js) read and drive displays only through the hub. Nothing here is persisted:
// a dev-server restart drops it, and every display re-announces itself on reconnect.
//
//   Display { id, key, ws, info, connectedAt, lastSeenAt }
//     id    first 6 hex chars of the page's per-tab key; stable across reloads of that tab
//     info  the latest display-hello: { href, path, shader, ua, canvas, audio }
//   Event   { seq, t, type, display?, signal?, ...data }   ring of the last 500, for wait_for_event
//     type  display-joined | display-left | vj-signal (signal = the /__vj-signal type: boot, clip, pulse, ...)
//
// Requests to a display are `inspect {id, cmd, args}` down that display's own socket, answered
// by `inspect-reply {id, ok, result|error}` on the same socket. Never broadcast either way.
import { WebSocket } from 'ws'
import { randomUUID } from 'node:crypto'

export class ToolError extends Error {}

const EVENT_RING = 500

export const createHub = () => {
  const displays = new Map() // id -> Display
  const bySocket = new Map() // ws -> Display
  const pending = new Map() // request id -> { display, resolve, reject, timer }
  const events = []
  let seq = 0
  const waiters = new Set()

  const pushEvent = (type, data = {}) => {
    const evt = { seq: ++seq, t: new Date().toISOString(), type, ...data }
    events.push(evt)
    if (events.length > EVENT_RING) events.splice(0, events.length - EVENT_RING)
    for (const w of waiters) w()
    return evt
  }

  const summary = (d) => ({
    id: d.id,
    shader: d.info.shader ?? null,
    path: d.info.path ?? null,
    href: d.info.href,
    ua: d.info.ua,
    canvas: d.info.canvas,
    audio: d.info.audio,
    connectedAt: d.connectedAt,
    lastSeenAt: d.lastSeenAt,
  })

  const failPending = (display, why) => {
    for (const [rid, p] of pending) {
      if (p.display !== display) continue
      clearTimeout(p.timer)
      pending.delete(rid)
      p.reject(new ToolError(why))
    }
  }

  const onHello = (ws, info = {}) => {
    const key = String(info.key ?? '')
    if (!/^[0-9a-f-]{8,64}$/i.test(key)) return
    const id = key.replace(/-/g, '').slice(0, 6).toLowerCase()
    const now = new Date().toISOString()
    const existing = displays.get(id)
    if (existing && existing.ws === ws) {
      existing.info = info
      existing.lastSeenAt = now
      return
    }
    // Same tab on a new socket (reload, reconnect): the new socket wins.
    if (existing) {
      bySocket.delete(existing.ws)
      failPending(existing, `display ${id} reconnected; retry`)
    }
    const d = { id, key, ws, info, connectedAt: now, lastSeenAt: now }
    displays.set(id, d)
    bySocket.set(ws, d)
    pushEvent('display-joined', { display: id, shader: info.shader ?? null, reconnect: Boolean(existing) })
  }

  const onReply = (ws, data = {}) => {
    const p = pending.get(data.id)
    if (!p || p.display.ws !== ws) return
    clearTimeout(p.timer)
    pending.delete(data.id)
    p.display.lastSeenAt = new Date().toISOString()
    if (data.ok) p.resolve(data.result)
    else p.reject(new ToolError(`display ${p.display.id}: ${data.error}`))
  }

  const onClose = (ws) => {
    const d = bySocket.get(ws)
    if (!d) return
    bySocket.delete(ws)
    if (displays.get(d.id) === d) displays.delete(d.id)
    failPending(d, `display ${d.id} disconnected mid-request`)
    pushEvent('display-left', { display: d.id, shader: d.info.shader ?? null })
  }

  const list = () => [...displays.values()].map(summary)

  // `display` may be omitted when exactly one is connected, or given as any unique prefix.
  const resolve = (display) => {
    const all = [...displays.values()]
    if (!all.length) throw new ToolError('no display connected. Open a page with ?remote=display on this dev server (e.g. /jam.html?shader=<path>&remote=display), then retry; list_displays shows what is connected.')
    if (!display) {
      if (all.length === 1) return all[0]
      throw new ToolError(`${all.length} displays connected (${all.map((d) => d.id).join(', ')}); pass display`)
    }
    const hits = all.filter((d) => d.id.startsWith(String(display).toLowerCase()))
    if (hits.length === 1) return hits[0]
    if (!hits.length) throw new ToolError(`no display ${display}; connected: ${all.map((d) => d.id).join(', ')}`)
    throw new ToolError(`display ${display} is ambiguous: ${hits.map((d) => d.id).join(', ')}`)
  }

  const send = (d, type, data) => {
    if (d.ws.readyState !== WebSocket.OPEN) throw new ToolError(`display ${d.id} is not connected`)
    d.ws.send(JSON.stringify({ type, data }))
  }

  const request = (d, cmd, args = {}, timeoutMs = 5000) =>
    new Promise((resolveP, reject) => {
      const id = randomUUID()
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new ToolError(`display ${d.id} did not answer ${cmd} within ${timeoutMs} ms (tab hidden or frozen?)`))
      }, timeoutMs)
      pending.set(id, { display: d, resolve: resolveP, reject, timer })
      try {
        send(d, 'inspect', { id, cmd, args })
      } catch (e) {
        clearTimeout(timer)
        pending.delete(id)
        reject(e)
      }
    })

  // Events after `since` whose type is in `types` (all when empty), waiting up to timeoutMs for one.
  const waitFor = ({ since = 0, types = [], timeoutMs = 25000, signal } = {}) =>
    new Promise((resolveP) => {
      const match = () => events.filter((e) => e.seq > since && (!types.length || types.includes(e.type) || types.includes(e.signal)))
      const done = () => {
        waiters.delete(check)
        clearTimeout(timer)
        resolveP({ seq, events: match() })
      }
      const check = () => { if (match().length) done() }
      const timer = setTimeout(done, timeoutMs)
      waiters.add(check)
      signal?.addEventListener('abort', done, { once: true })
      check()
    })

  return {
    onHello, onReply, onClose, list, resolve, send, request, pushEvent, waitFor,
    get seq() { return seq },
  }
}
