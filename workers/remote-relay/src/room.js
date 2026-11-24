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
import { createHubCore, HUB_TYPES } from '../../../vite-plugins/vj-mcp/hub-core.js'
import { ToolError } from '../../../vite-plugins/vj-mcp/errors.js'

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
// An attachment holds at most 2 KiB, so a hello is trimmed to what list_displays shows.
const pack = (d) => ({
  id: d.id,
  key: cap(d.key, 64),
  connectedAt: d.connectedAt,
  lastSeenAt: d.lastSeenAt,
  info: {
    href: cap(d.info?.href, 600),
    path: cap(d.info?.path, 200),
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
const VJ_SIGNAL = 'vj-signal'
const MAX_SIGNAL_CHARS = 64 * 1024
const takeSignal = ({ hub, ws, message, data }) => {
  const att = readAtt(ws)
  if (!att.mayDisplay || message.length > MAX_SIGNAL_CHARS) return 'drop'
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'drop'
  hub.pushEvent(VJ_SIGNAL, { display: att.display?.id ?? null, signal: typeof data.type === 'string' ? data.type : null, data })
  return 'hub'
}

/**
 * Route one inbound frame. Returns what happened, for tests and logs:
 *   'relay'  sent verbatim to every other socket
 *   'hub'    consumed by the hub (a display's hello or reply)
 *   'drop'   not relayed: binary, not JSON, or a hub-only type from a client
 */
export const routeMessage = async ({ ctx, hub, ws, message }) => {
  if (typeof message !== 'string') return 'drop'
  let msg
  try {
    msg = JSON.parse(message)
  } catch {
    return 'drop'
  }
  const type = msg && typeof msg === 'object' ? msg.type : undefined
  if (HUB_TYPES.has(type)) {
    if (type === 'display-hello' && readAtt(ws).mayDisplay) {
      await hub.onHello(ws, msg.data)
      return 'hub'
    }
    if (type === 'inspect-reply') {
      hub.onReply(ws, msg.data)
      return 'hub'
    }
    return 'drop'
  }
  if (type === VJ_SIGNAL) return takeSignal({ hub, ws, message, data: msg.data })
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
