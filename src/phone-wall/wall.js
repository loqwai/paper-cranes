// The wall half of the phone wall (docs/phone-wall.md): a `?remote=display&wall=1` page whose
// messages come from the pad over the local link (link.js) as well as, when there is one, the room
// socket. RemoteDisplay hands both to the same handler, so HANDS, KEEP, PANIC and proposals behave
// exactly as they do for a remote display.
import { WebSocketClient } from '../remote/WebSocketClient.js'
import { createLink } from './link.js'

// What the wall tells the pad over the link. The inspector's traffic (canvas shots, state) is for
// the VJ MCP on the room socket and never crosses to the pad.
const TO_PAD = new Set(['proposal', 'proposal-clear', 'vj-status', 'vj-learn-result'])

/** Is this page a phone wall? `?wall=1`, or opened as a presentation receiver. */
export const isWallPage = (loc = window.location, nav = globalThis.navigator) =>
  new URLSearchParams(loc.search).get('wall') === '1' || Boolean(nav?.presentation?.receiver)

/**
 * A WebSocketClient-shaped client for a wall. The room socket is opened only where there is a
 * broker: a `?room=` link, or the dev server. On a static host with no room the wall needs no
 * network at all, and a socket that can never connect would only light "Reconnecting" on the wall.
 */
export const createWallClient = (onMessage, onStatus, { dev = false, loc = window.location, nav = globalThis.navigator, makeSocket, link: givenLink } = {}) => {
  const params = new URLSearchParams(loc.search)
  const wantsSocket = params.has('room') || dev
  const socket = wantsSocket ? (makeSocket ?? ((m, s) => new WebSocketClient(m, s)))(onMessage, onStatus) : null
  const boot = Math.random().toString(36).slice(2, 10)
  const stats = { fromLink: 0, toLink: 0 }

  const link = givenLink ?? createLink({
    role: 'wall',
    // `boot` lets a pad tell a fresh wall (replugged, reopened) from the one it already fed;
    // `wantsShader` asks the pad for its shader when the wall was opened with none.
    info: () => ({ boot, wantsShader: !params.has('shader') }),
    onMessage: (msg) => { stats.fromLink++; onMessage(msg) },
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
