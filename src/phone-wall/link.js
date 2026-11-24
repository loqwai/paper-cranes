// The local link between the pad and the wall when both run on one phone (docs/phone-wall.md).
// No network, no relay: it carries the same {type, data} messages the room socket does, over
//   - a BroadcastChannel, which reaches every same-origin window of this browser (the wall as a
//     second Chrome window on the external display: Android desktop mode, Motorola Smart Connect,
//     or a popup PROJECT placed there), and
//   - PresentationConnections, when Chrome offers the Presentation API for the external display.
//
// Presence is a hello every second; a peer unheard for 3.5 s, or one that said bye, is gone. That
// is how the pad notices a pulled cable even when no close event arrives.
//
// Envelope: { pw: 1, from, role, n, info?, bye?, msg? }. `n` counts up per sender, so a message
// that reaches a peer over two ports is acted on once.

export const CHANNEL = 'cranes-phone-wall'
export const HELLO_MS = 1000
export const PEER_TTL_MS = 3500

const randomId = () => Math.random().toString(36).slice(2, 10)

export const createLink = ({
  role,
  id = randomId(),
  info = () => undefined,
  onMessage,
  onPeers,
  BroadcastChannel: BC = globalThis.BroadcastChannel,
  now = () => Date.now(),
} = {}) => {
  if (role !== 'pad' && role !== 'wall') throw new TypeError(`link role must be pad or wall, got ${role}`)
  const other = role === 'pad' ? 'wall' : 'pad'
  const ports = new Set()
  const peers = new Map() // id -> { seen, info, port }
  const lastN = new Map() // sender id -> last n acted on
  let n = 0
  let timer = null
  let channel = null

  const changed = () => onPeers?.([...peers].map(([pid, p]) => ({ id: pid, info: p.info, via: p.port.kind })))

  const envelope = (extra) => ({ pw: 1, from: id, role, n: ++n, ...extra })
  const post = (env) => {
    let sent = false
    for (const port of ports) sent = port.post(env) || sent
    return sent
  }
  const hello = () => post(envelope({ info: info() }))

  const receive = (env, port) => {
    if (!env || env.pw !== 1 || env.role !== other || env.from === id) return
    if (typeof env.n === 'number') {
      if (env.n <= (lastN.get(env.from) ?? 0)) return
      lastN.set(env.from, env.n)
    }
    if (env.bye) {
      if (peers.delete(env.from)) changed()
      return
    }
    const known = peers.get(env.from)
    peers.set(env.from, { seen: now(), info: env.info ?? known?.info, port })
    // A peer heard for the first time hears us back at once on that port, rather than at our next
    // hello: the side that attached a PresentationConnection second would otherwise wait a second.
    if (!known) port.post(envelope({ info: info() }))
    if (!known || (env.info && JSON.stringify(env.info) !== JSON.stringify(known.info))) changed()
    if (env.msg) onMessage?.(env.msg, env.from)
  }

  const sweep = () => {
    const cut = now() - PEER_TTL_MS
    let gone = false
    for (const [pid, p] of peers) if (p.seen < cut) gone = peers.delete(pid) || gone
    if (gone) changed()
  }

  const dropPort = (port) => {
    if (!ports.delete(port)) return
    let gone = false
    for (const [pid, p] of peers) if (p.port === port) gone = peers.delete(pid) || gone
    if (gone) changed()
  }

  const link = {
    id,
    role,
    start() {
      if (timer) return link
      if (typeof BC === 'function') {
        try {
          channel = new BC(CHANNEL)
          const port = { kind: 'channel', post: (env) => (channel.postMessage(env), true) }
          channel.onmessage = (e) => receive(e.data, port)
          ports.add(port)
        } catch (e) {
          console.warn('[phone-wall] BroadcastChannel unavailable:', e)
        }
      }
      timer = setInterval(() => { hello(); sweep() }, HELLO_MS)
      hello()
      return link
    },
    /** A PresentationConnection (or anything with send/state/addEventListener): another port. */
    attach(conn) {
      const port = {
        kind: 'presentation',
        conn,
        post: (env) => {
          if (conn.state !== 'connected') return false
          try { conn.send(JSON.stringify(env)); return true } catch { return false }
        },
      }
      conn.addEventListener('message', (e) => {
        try { receive(JSON.parse(e.data), port) } catch { /* not ours */ }
      })
      const close = () => dropPort(port)
      conn.addEventListener('close', close)
      conn.addEventListener('terminate', close)
      ports.add(port)
      if (conn.state === 'connected') port.post(envelope({ info: info() }))
      else conn.addEventListener('connect', () => port.post(envelope({ info: info() })))
      return port
    },
    /** Send one room-style message ({type, data, ...envelope}) to every live peer. */
    send(msg) {
      if (!peers.size) return false
      return post(envelope({ msg }))
    },
    /** Re-announce now (info changed). */
    hello,
    get linked() { return peers.size > 0 },
    isPeer: (pid) => peers.has(pid),
    get peers() { return [...peers].map(([pid, p]) => ({ id: pid, info: p.info, via: p.port.kind })) },
    stop() {
      if (!timer) return
      post(envelope({ bye: true }))
      clearInterval(timer)
      timer = null
      channel?.close()
      channel = null
      ports.clear()
      if (peers.size) { peers.clear(); changed() }
    },
  }
  return link
}

/**
 * A message sent over both the link and the room carries `pwid`: the sender's link id, a dot, a
 * count. The link copy is the one to act on. Only a page in this browser can post to the link,
 * while any room peer sees every pwid sent there and can send any message with any pwid, so a pwid
 * heard on the room must never stop a link copy (a peer could pre-send the pad's next ids and
 * swallow his PANIC). The link side always acts; the room side drops a message whose pwid names a
 * peer on the link, since that copy comes over the link. A room message with no pwid, or one naming
 * no linked peer, passes as before.
 */
export const fromLinkedPeer = (link, msg) => {
  const id = msg?.pwid
  if (typeof id !== 'string') return false
  return link.isPeer(id.slice(0, id.lastIndexOf('.')))
}
