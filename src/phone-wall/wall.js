// The wall half of the phone wall (docs/phone-wall.md): a `?remote=display&wall=1` page whose
// messages come from the pad over the local link (link.js) as well as, when there is one, the room
// socket. RemoteDisplay hands both to the same handler, so HANDS, KEEP, PANIC and proposals behave
// exactly as they do for a remote display.
import { WebSocketClient } from '../remote/WebSocketClient.js'
import { createLink } from './link.js'

// What the wall tells the pad over the link. The inspector's traffic (canvas shots, state) is for
// the VJ MCP on the room socket and never crosses to the pad.
const TO_PAD = new Set(['proposal', 'proposal-clear', 'vj-status', 'vj-learn-result'])

// What the wall takes from the link: exactly what a pad routes here (pad.js TO_WALL and TO_BOTH).
// Any same-origin page can post to the link, so the broker's own frames (inspect, display-welcome,
// display-refused, display-rekey, vj-agent-shader), which reach a display only from the room socket
// whose broker drops any a client sends, never cross it.
export const FROM_PAD = new Set(['update-params', 'vj-keep', 'vj-panic', 'proposal-answer', 'pad-hello'])

/** Is this page a phone wall? `?wall=1`, or opened as a presentation receiver. */
export const isWallPage = (loc = window.location, nav = globalThis.navigator) =>
  new URLSearchParams(loc.search).get('wall') === '1' || Boolean(nav?.presentation?.receiver)

/**
 * A WebSocketClient-shaped client for a wall. The room socket is opened only where there is a
 * broker: a `?room=` link, or the dev server. On a static host with no room the wall needs no
 * network at all, and a socket that can never connect would only light "Reconnecting" on the wall.
 */
export const createWallClient = (onMessage, onStatus, { dev = false, loc = window.location, nav = globalThis.navigator, makeSocket, link: givenLink, BroadcastChannel } = {}) => {
  const params = new URLSearchParams(loc.search)
  const wantsSocket = params.has('room') || dev
  const socket = wantsSocket ? (makeSocket ?? ((m, s) => new WebSocketClient(m, s)))(onMessage, onStatus) : null
  const boot = Math.random().toString(36).slice(2, 10)
  const stats = { fromLink: 0, toLink: 0 }
  // Has any pad moved this wall yet? Only a fresh wall (just opened or replugged) takes a pad's
  // whole state: a second pad page (the NFC fallback tab, a reloaded or restored pad) linking to a
  // wall mid-set must not reset every knob on it to that page's defaults.
  let fed = false

  const link = givenLink ?? createLink({
    role: 'wall',
    // `boot` lets a pad tell a fresh wall (replugged, reopened) from the one it already fed;
    // `fresh` says no pad has moved it yet; `wantsShader` asks for the pad's shader when the wall
    // was opened with none.
    info: () => ({ boot, fresh: !fed, wantsShader: !fed && !params.has('shader') }),
    onMessage: (msg) => {
      if (!FROM_PAD.has(msg?.type)) return
      stats.fromLink++
      onMessage(msg)
      if (msg.type === 'update-params' && !fed) { fed = true; link.hello() }
    },
    ...(BroadcastChannel ? { BroadcastChannel } : {}),
  })

  const receiver = nav?.presentation?.receiver
  if (receiver) {
    receiver.connectionList
      .then((list) => {
        list.connections.forEach((c) => link.attach(c))
        list.addEventListener('connectionavailable', (e) => link.attach(e.connection))
      })
      .catch((e) => console.warn('[phone-wall] presentation receiver:', e))
  }
  globalThis.addEventListener?.('pagehide', () => link.stop())
  globalThis.addEventListener?.('pageshow', (e) => { if (e.persisted) link.start() })

  return {
    wall: true,
    link,
    stats,
    connect() {
      link.start()
      socket?.connect()
    },
    send(type, data, extra) {
      let sent = false
      if (TO_PAD.has(type) && link.send({ ...extra, type, data })) { stats.toLink++; sent = true }
      if (socket) sent = socket.send(type, data, extra) || sent
      return sent
    },
    disconnect() {
      link.stop()
      socket?.disconnect()
    },
    get isConnected() { return Boolean(socket?.isConnected || link.linked) },
    get socket() { return socket?.socket ?? null },
    get url() { return socket?.url },
  }
}
