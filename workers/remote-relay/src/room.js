// The room Durable Object's broker logic, kept apart from the DO class so tests can drive it with
// plain objects (workers/remote-relay/src/room.test.js) instead of a Workers runtime.
//
// One room = one Durable Object = every socket that joined /ws/<room>. Three jobs:
//   relay      any other JSON message goes verbatim to every OTHER socket, as it always has
//   broker     display-hello and inspect-reply go to the hub, never to peers; inspect,
//              display-welcome and display-rekey from a client are dropped, so no peer can
//              question a display or pose as the hub
//   registry   which sockets are displays, kept in each socket's attachment so it survives
//              hibernation (the object is evicted between messages; its sockets are not)
//   lock       a room with a display secret (secret.js) registers a display, and takes its
//              ?vj=1 signals, only once its hello carries that secret; a room without one is open
import { createHubCore, HUB_TYPES } from '../../../vite-plugins/vj-mcp/hub-core.js'
import { ToolError } from '../../../vite-plugins/vj-mcp/errors.js'
import { REFUSED, redactSecret } from './secret.js'

const OPEN = 1

// The room name from a path segment, or null when it is empty or not valid percent-encoding
// (`/mcp/%E0`), which the Worker answers with 400 instead of letting decodeURIComponent throw a 500.
export const decodeRoom = (part) => {
  try {
    const room = decodeURIComponent(part ?? '')
    return room || null
  } catch {
    return null
  }
}

// Pages allowed to register as displays: the site and its show repos, Pages previews, the
// Access-protected tunnel hosts, and a laptop's own localhost (the only origin with a mic).
// Every display still needs the room name; this only stops a page elsewhere posing as one.
const DISPLAY_ORIGIN = /^(https:\/\/([a-z0-9-]+\.)*(beadfamous\.com|paper-cranes-visuals\.pages\.dev|hypnodroid\.com)|https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/i
export const displayOriginAllowed = (origin) => Boolean(origin) && DISPLAY_ORIGIN.test(origin)

const cap = (s, n) => (typeof s === 'string' ? s.slice(0, n) : s)
// An attachment holds at most 16 KiB; a hello is trimmed to what list_displays shows (about 3 KiB at
// most, counting two bytes per UTF-16 unit).
const pack = (d) => ({
  id: d.id,
  key: cap(d.key, 64),
  connectedAt: d.connectedAt,
  lastSeenAt: d.lastSeenAt,
  info: {
    href: cap(redactSecret(d.info?.href), 600),
    path: cap(redactSecret(d.info?.path), 200),
    shader: cap(d.info?.shader, 200),
    ua: cap(d.info?.ua, 300),
    canvas: d.info?.canvas && { w: Number(d.info.canvas.w) || 0, h: Number(d.info.canvas.h) || 0 },
    audio: d.info?.audio && { state: cap(String(d.info.audio.state ?? ''), 20), energy: typeof d.info.audio.energy === 'number' ? d.info.audio.energy : null },
  },
})

const readAtt = (ws) => { try { return ws.deserializeAttachment() ?? {} } catch { return {} } }
const writeAtt = (ws, att) => { try { ws.serializeAttachment(att) } catch { /* closed socket */ } }

export const attachmentRegistry = (ctx) => {
  const toDisplay = (ws) => {
    const d = readAtt(ws).display
    return d ? { ...d, sock: ws } : undefined
  }
  const add = (d) => writeAtt(d.sock, { ...readAtt(d.sock), display: pack(d) })
  return {
    all: () => ctx.getWebSockets().map(toDisplay).filter(Boolean),
    bySock: toDisplay,
    add,
    touch: add,
    remove: (d) => {
      const att = readAtt(d.sock)
      if (att.display?.id !== d.id) return
      delete att.display
      writeAtt(d.sock, att)
    },
  }
}

export const createRoomHub = (ctx, { uuid = () => crypto.randomUUID() } = {}) =>
  createHubCore({
    registry: attachmentRegistry(ctx),
    io: {
      send: (ws, text) => ws.send(text),
      isOpen: (ws) => ws.readyState === undefined || ws.readyState === OPEN,
      drop: (ws) => { try { ws.close(1000, 'replaced by a newer socket for this display') } catch { /* gone */ } },
    },
    uuid,
    // A clock, not a counter: the event ring is forgotten when the object hibernates, but a seq an
    // agent holds for wait_for_event must still be in the past afterwards.
    nextSeq: (last) => Math.max(last + 1, Date.now()),
    noneHint: 'Open a page with ?remote=display&room=<this room> (e.g. https://visuals.beadfamous.com/?shader=<path>&remote=display&room=<room>), then retry; list_displays shows what is connected.',
  })

// A ?vj=1 page's health alerts, boot beacon and pulses (src/vj/runtime.js). The dev server takes
// them on POST /__vj-signal; a page on a room sends them down its own socket instead, and they
// become `vj-signal` events for wait_for_event, in the same shape the dev hub pushes. Only from a
// socket whose page may be a display (the boot beacon can beat the hello, so no welcome is
// needed), never relayed to peers, and bounded: the event ring keeps 500 of them in memory.
//
// In a room with a display secret, a signal counts only from a socket whose hello carried the
// current secret. The boot beacon usually beats the hello (the inspector loads after the socket
// opens), so a few early signals wait for it, in memory, and are dropped if the hello is refused.
const VJ_SIGNAL = 'vj-signal'
const MAX_SIGNAL_CHARS = 64 * 1024
const HELD_MAX = 5
const HELD_MAX_CHARS = 16 * 1024
const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
const pushSignal = (hub, ws, data) =>
  hub.pushEvent(VJ_SIGNAL, { display: readAtt(ws).display?.id ?? null, signal: typeof data.type === 'string' ? data.type : null, data })

const takeSignal = async ({ hub, lock, held, ws, message }) => {
  const att = readAtt(ws)
  if (!att.mayDisplay || message.length > MAX_SIGNAL_CHARS) return 'drop'
  // The boot beacon carries the page's URL; a page that still has its secret there must not
  // hand it to the agent.
  let data
  try { data = JSON.parse(redactSecret(message)).data } catch { return 'drop' }
  if (!isObject(data)) return 'drop'
  const locked = await lock.current()
  if (locked && att.gen !== locked.gen) {
    const queue = held.get(ws) ?? []
    if (queue.length >= HELD_MAX || message.length > HELD_MAX_CHARS) return 'drop'
    held.set(ws, [...queue, data])
    return 'held'
  }
  pushSignal(hub, ws, data)
  return 'hub'
}

// A refused display hears why (never the secret), and leaves the registry if it was in it. It
// stays an ordinary room peer: knobs from a phone still reach it, only the MCP no longer sees it.
const refuse = ({ hub, held, ws, reason }) => {
  const att = readAtt(ws)
  if ('gen' in att) {
    delete att.gen
    writeAtt(ws, att)
  }
  held.delete(ws)
  hub.onClose(ws)
  try { ws.send(JSON.stringify({ type: 'display-refused', data: { reason } })) } catch { /* gone */ }
}

const takeHello = async ({ hub, lock, held, ws, data }) => {
  const { displaySecret, ...info } = isObject(data) ? data : {}
  const verdict = await lock.check(displaySecret)
  if (!verdict.ok) {
    refuse({ hub, held, ws, reason: verdict.reason })
    return 'refused'
  }
  writeAtt(ws, { ...readAtt(ws), gen: verdict.gen })
  await hub.onHello(ws, { ...info, href: redactSecret(info.href), path: redactSecret(info.path) })
  // The secret may have been rotated while this hello waited on the hub.
  if (((await lock.current())?.gen ?? null) !== verdict.gen) {
    refuse({ hub, held, ws, reason: REFUSED.rotated })
    return 'refused'
  }
  for (const early of held.get(ws) ?? []) pushSignal(hub, ws, early)
  held.delete(ws)
  return 'hub'
}

// A room with no secret: every hello and signal passes, as before display secrets existed.
const OPEN_LOCK = { current: async () => null, check: async () => ({ ok: true, gen: null }) }

/**
 * Route one inbound frame. Returns what happened, for tests and logs:
 *   'relay'    sent verbatim to every other socket
 *   'hub'      consumed by the hub (a display's hello or reply, a vj-signal)
 *   'refused'  a display-hello without this room's display secret; the page is told why
 *   'held'     a vj-signal from a socket that has not proven the secret yet
 *   'drop'     not relayed: binary, not JSON, or a hub-only type from a client
 * lock  the room's display lock (secret.js); left out, the room is open
 * held  WeakMap socket -> signals waiting for that socket's hello
 */
export const routeMessage = async ({ ctx, hub, ws, message, lock = OPEN_LOCK, held = new WeakMap() }) => {
  if (typeof message !== 'string') return 'drop'
  let msg
  try {
    msg = JSON.parse(message)
  } catch {
    return 'drop'
  }
  const type = msg && typeof msg === 'object' ? msg.type : undefined
  if (HUB_TYPES.has(type)) {
    if (type === 'display-hello' && readAtt(ws).mayDisplay) return takeHello({ hub, lock, held, ws, data: msg.data })
    if (type === 'inspect-reply') {
      hub.onReply(ws, msg.data)
      return 'hub'
    }
    return 'drop'
  }
  if (type === VJ_SIGNAL) return takeSignal({ hub, lock, held, ws, message })
  // Relay the ORIGINAL text, so a payload is never reserialized and subtly changed in transit.
  for (const peer of ctx.getWebSockets()) {
    if (peer === ws) continue
    try {
      peer.send(message)
    } catch {
      // Ignore; the close handler reaps it.
    }
  }
  return 'relay'
}

// Shaders as the display would load them: from the one site every connected display was served
// by, else SITE_ORIGIN. Only sites a display may come from are fetched.
const SITE = /^https:\/\/([a-z0-9-]+\.)*(beadfamous\.com|paper-cranes-visuals\.pages\.dev)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i
const originOf = (href) => { try { return new URL(href).origin } catch { return null } }

export const siteShaders = ({ hub, env, fetchImpl = fetch }) => {
  const site = () => {
    const seen = [...new Set(hub.list().map((d) => originOf(d.href)).filter((o) => o && SITE.test(o)))]
    return seen.length === 1 ? seen[0] : env.SITE_ORIGIN || 'https://visuals.beadfamous.com'
  }
  const get = async (path) => {
    const url = `${site()}${path}`
    const res = await fetchImpl(url)
    const body = await res.text()
    // Static hosts answer a missing file with their HTML shell and a 200; that is not a shader.
    if (!res.ok || /^\s*<(!doctype|html)/i.test(body)) throw new ToolError(`${url}: not found (${res.status})`)
    return body
  }
  return {
    index: async () => JSON.parse(await get('/shaders.json')),
    read: async (name) => {
      const code = await get(`/shaders/${name.split('/').map(encodeURIComponent).join('/')}.frag`)
      return { name, relative: `${site()}/shaders/${name}.frag`, code }
    },
  }
}

export const RELAY_VENUE = {
  displays: 'pages in this relay room: opened with ?remote=display&room=<room>',
  where: 'Every display is a page opened with ?remote=display&room=<this room>. There is no disk here: write_shader applies code live and never saves it.',
  noneHint: 'none connected; open a page with ?remote=display&room=<room> (e.g. https://visuals.beadfamous.com/?shader=<path>&remote=display&room=<room>)',
}

// The page that shows the visuals, for a display link.
export const DEFAULT_SITE = 'https://visuals.beadfamous.com'
const DEFAULT_RELAY_HOST = 'relay.beadfamous.com'

/**
 * The link that opens a display in `room`, holding `secret` in its hash: a browser never sends
 * the hash to a server, so the secret stays out of the site's request logs. `relay=` is added
 * only for a relay other than relay.beadfamous.com (a `wrangler dev` relay on localhost).
 */
export const displayLink = ({ site = DEFAULT_SITE, room, relayHost, shader, secret }) => {
  const url = new URL('/', site)
  if (shader) url.searchParams.set('shader', shader)
  url.searchParams.set('remote', 'display')
  url.searchParams.set('room', room)
  if (relayHost && relayHost !== DEFAULT_RELAY_HOST) url.searchParams.set('relay', relayHost)
  url.hash = new URLSearchParams({ display_secret: secret }).toString()
  return url.toString()
}

/**
 * The display_secret MCP tool's backend for one room (vite-plugins/vj-mcp/server.js).
 * rotate drops every registered display that did not prove the new secret: it hears
 * display-refused and leaves list_displays, but stays in the room as a plain peer.
 */
export const roomSecretControl = ({ ctx, hub, lock, held = new WeakMap(), room, relayHost, site }) => ({
  status: async () => {
    const rec = await lock.current()
    return { locked: Boolean(rec), since: rec?.setAt ?? null }
  },
  rotate: async ({ shader } = {}) => {
    const showing = hub.list()
    const { secret, gen, setAt } = await lock.rotate()
    const dropped = []
    for (const d of attachmentRegistry(ctx).all()) {
      if (readAtt(d.sock).gen === gen) continue
      dropped.push(d.id)
      refuse({ hub, held, ws: d.sock, reason: REFUSED.rotated })
    }
    const shown = shader ?? (showing.length === 1 ? showing[0].shader : null)
    return { locked: true, since: setAt, link: displayLink({ site, room, relayHost, shader: shown, secret }), dropped }
  },
  clear: async () => {
    await lock.clear()
    return { locked: false, since: null }
  },
})
