// The display hub, independent of where its sockets live. Two hosts run it:
//   vite-plugins/vj-mcp/hub.js           the dev server's /ws broker (Node `ws` sockets in a Map)
//   workers/remote-relay/src/index.js    one Durable Object per ?room= on the public relay
//                                        (hibernatable sockets; the registry is in their attachments)
// The MCP tools (server.js) read and drive displays only through the object this returns.
//
//   Display { id, key, info, connectedAt, lastSeenAt, sock }
//     id    first 6 hex chars of the page's per-tab key; stable across reloads of that tab
//     info  the latest display-hello: { href, path, shader, ua, canvas, audio }
//     sock  the host's socket, opaque here; the host's `io` and `registry` know what it is
//   Event   { seq, t, type, display?, signal?, ...data }   ring of the last 500, for wait_for_event
//
// Requests to a display are `inspect {id, cmd, args}` down that display's own socket, answered by
// `inspect-reply {id, ok, result|error}` on the same socket. Never broadcast either way. A display
// answers `inspect` only after this hub has sent it `display-welcome` (src/remote/inspect.js), so a
// page on a relay with no hub never answers a peer that forges one.
import { ToolError } from './errors.js'

const EVENT_RING = 500

// Every message type that belongs to the hub and the one display it concerns. A broker hands the
// first two to the hub and drops all four from clients: only the hub may send the last two.
export const HUB_TYPES = new Set(['display-hello', 'inspect-reply', 'inspect', 'display-rekey', 'display-welcome'])

export const VALID_KEY = /^[0-9a-f-]{8,64}$/i
export const idOf = (key) => String(key).replace(/-/g, '').slice(0, 6).toLowerCase()

/**
 * io        { send(sock, text), isOpen(sock), drop(sock) }   drop = close a socket we replaced
 * registry  { all(), bySock(sock), add(d), remove(d), touch(d) }  all() returns Displays with sock
 * alive     async (d) => boolean. Default: ask the page (any inspect-reply, even "unknown cmd", is a
 *           sign of life). The dev hub passes a WebSocket ping instead.
 * uuid      () => string
 * nextSeq   (last) => number. Default last + 1. The relay passes a clock so seq keeps rising across
 *           a hibernation that forgets the ring.
 * noneHint  what an agent is told to do when no display is connected
 */
export const createHubCore = ({ io, registry, uuid, alive, nextSeq = (last) => last + 1, noneHint = 'Open a page with ?remote=display, then retry.' }) => {
  const pending = new Map() // request id -> { sock, display, resolve, reject, timer }
  const events = []
  let seq = 0
  const waiters = new Set()

  const pushEvent = (type, data = {}) => {
    seq = nextSeq(seq)
    const evt = { seq, t: new Date().toISOString(), type, ...data }
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

  const failPending = (sock, why) => {
    for (const [rid, p] of pending) {
      if (p.sock !== sock) continue
      clearTimeout(p.timer)
      pending.delete(rid)
      p.reject(new ToolError(why))
    }
  }

  const send = (d, type, data) => {
    if (!io.isOpen(d.sock)) throw new ToolError(`display ${d.id} is not connected`)
    io.send(d.sock, JSON.stringify({ type, data }))
  }

  const request = (d, cmd, args = {}, timeoutMs = 5000) =>
    new Promise((resolveP, reject) => {
      const id = uuid()
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new ToolError(`display ${d.id} did not answer ${cmd} within ${timeoutMs} ms (tab hidden or frozen?)`))
      }, timeoutMs)
      pending.set(id, { sock: d.sock, display: d, resolve: resolveP, reject, timer })
      try {
        send(d, 'inspect', { id, cmd, args })
      } catch (e) {
        clearTimeout(timer)
        pending.delete(id)
        reject(e)
      }
    })

  // Any reply at all, error included, means a live page on the other end.
  const askAlive = (d) => request(d, 'ping', {}, 1500).then(() => true, (e) => !/did not answer|not connected/.test(e.message))
  const isAlive = alive ?? askAlive

  const forget = (d, why) => {
    registry.remove(d)
    failPending(d.sock, why)
    pushEvent('display-left', { display: d.id, shader: d.info.shader ?? null })
  }

  const byId = (id) => registry.all().find((d) => d.id === id)

  const onHello = async (sock, info = {}) => {
    const key = String(info.key ?? '')
    if (!VALID_KEY.test(key)) return
    const id = idOf(key)
    const now = new Date().toISOString()
    const mine = registry.bySock(sock)
    if (mine && mine.id === id) {
      mine.info = info
      mine.lastSeenAt = now
      registry.touch(mine)
      io.send(sock, JSON.stringify({ type: 'display-welcome', data: { id } }))
      return
    }
    // This socket said hello before under another key (a rekeyed tab): drop that entry, or it
    // would sit in the list forever and break every "only one display" default.
    if (mine) forget(mine, `display ${mine.id} re-announced as ${id}`)
    const existing = byId(id)
    if (existing) {
      // Two live tabs with one key: Chrome's Duplicate tab and window.open copy sessionStorage.
      // The first keeps the id; the newcomer is told to mint its own key and hello again.
      if (await isAlive(existing)) {
        if (io.isOpen(sock)) io.send(sock, JSON.stringify({ type: 'display-rekey', data: { id } }))
        return
      }
      // Same tab on a new socket (a reload, or a reconnect after a dead socket): the new one wins.
      forget(existing, `display ${id} reconnected; retry`)
      io.drop(existing.sock)
    }
    if (!io.isOpen(sock)) return
    const d = { id, key, info, connectedAt: now, lastSeenAt: now, sock }
    registry.add(d)
    io.send(sock, JSON.stringify({ type: 'display-welcome', data: { id } }))
    pushEvent('display-joined', { display: id, shader: info.shader ?? null, reconnect: Boolean(existing) })
  }

  const onReply = (sock, data = {}) => {
    const p = pending.get(data.id)
    if (!p || p.sock !== sock) return
    clearTimeout(p.timer)
    pending.delete(data.id)
    const d = registry.bySock(sock)
    if (d) {
      d.lastSeenAt = new Date().toISOString()
      registry.touch(d)
    }
    if (data.ok) p.resolve(data.result)
    else p.reject(new ToolError(`display ${p.display.id}: ${data.error}`))
  }

  const onClose = (sock) => {
    const d = registry.bySock(sock)
    if (d) forget(d, `display ${d.id} disconnected mid-request`)
    else failPending(sock, 'display disconnected mid-request')
  }

  const list = () => registry.all().map(summary)

  // `display` may be omitted when exactly one is connected, or given as any unique prefix.
  const resolve = (display) => {
    const all = registry.all()
    if (!all.length) throw new ToolError(`no display connected. ${noneHint}`)
    if (!display) {
      if (all.length === 1) return all[0]
      throw new ToolError(`${all.length} displays connected (${all.map((d) => d.id).join(', ')}); pass display`)
    }
    const hits = all.filter((d) => d.id.startsWith(String(display).toLowerCase()))
    if (hits.length === 1) return hits[0]
    if (!hits.length) throw new ToolError(`no display ${display}; connected: ${all.map((d) => d.id).join(', ')}`)
    throw new ToolError(`display ${display} is ambiguous: ${hits.map((d) => d.id).join(', ')}`)
  }

  // Events after `since` whose type is in `types` (all when empty), waiting up to timeoutMs for one.
  const waitFor = ({ since = 0, types = [], timeoutMs = 25000, signal } = {}) =>
    new Promise((resolveP) => {
      const match = () => events.filter((e) => e.seq > since && (!types.length || types.includes(e.type) || types.includes(e.signal)))
      const done = () => {
        waiters.delete(check)
        clearTimeout(timer)
        signal?.removeEventListener('abort', done)
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
