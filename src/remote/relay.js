// Where a remote page's socket goes, and whether the VJ MCP may question it (docs/vj-mcp.md).
//
// The worker is deployed from workers/remote-relay. It ALSO answers on
// paper-cranes-remote.loqwai.workers.dev, but do not point clients there: a
// wildcard Cloudflare Access app guards that subdomain (and *.hypnodroid.com)
// and 302s the websocket upgrade to a login page. beadfamous.com carries no
// such app, which is the only reason this host is the default.
export const DEFAULT_RELAY_HOST = 'relay.beadfamous.com'

// A relay on this machine (`wrangler dev` in workers/remote-relay) speaks plain ws.
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1)(:\d+)?$/

const relayHostOf = (params) => params.get('relay') || DEFAULT_RELAY_HOST

/** The socket URL for a page at `loc` ({search, protocol, host}): the relay for a room, else the dev server. */
export const wsUrlFor = (loc) => {
  const params = new URLSearchParams(loc.search)
  const room = params.get('room')
  if (room) {
    const relayHost = relayHostOf(params)
    const scheme = LOOPBACK_HOST.test(relayHost) ? 'ws' : 'wss'
    return `${scheme}://${relayHost}/ws/${encodeURIComponent(room)}`
  }
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${loc.host}/ws`
}

/**
 * May a page answer the VJ MCP's `inspect` on the socket at `socketUrl`? Only when that socket's
 * broker is one we run: the dev server's own /ws (a dev build), or a room on relay.beadfamous.com
 * or on a loopback relay. `?relay=` still relays through any host, but a relay we do not run could
 * welcome the display and read its canvas, audio features, knobs and console, so there the page
 * never answers. Judged on the parsed socket URL, so `relay.beadfamous.com@evil.example` is
 * evil.example. RemoteDisplay asks this of the socket actually connected, on every connect.
 */
export const inspectorAllowedOn = (socketUrl, { dev }) => {
  let url
  try { url = new URL(socketUrl) } catch { return false }
  if (url.pathname === '/ws') return Boolean(dev)
  if (!/^\/ws\/[^/]+$/.test(url.pathname)) return false
  return url.host === DEFAULT_RELAY_HOST || LOOPBACK_HOST.test(url.host)
}

/** The same question for a page at `loc`, before it has a socket. */
export const inspectorAllowed = (loc, { dev }) => inspectorAllowedOn(wsUrlFor(loc), { dev })

// A room peer can send update-params, so these keys are never taken from it: not into the
// page's params, and not into the URL mirror that a refresh would read back (setting or, with
// null, deleting them). They are all read once at boot:
// - where the socket goes (WebSocketClient takes its URL once): relay, room;
// - the room's display secret (below), which only the page's own link may carry: display_secret;
// - what code or media the page loads: controller (a full http URL is imported as JavaScript, so a
//   peer setting it ran its script on the display's next reload), image, audio_file;
// - what the page is and what it captures or sends: remote, vj, vjtrack, midi, embed, noaudio,
//   audio, audio_send, audio_device, audio_time.
// Knobs, numeric uniforms, shader and shaderCode stay settable: they are what a controller is for.
const PINNED = new Set([
  'relay', 'room', 'display_secret',
  'controller', 'image', 'audio_file',
  'remote', 'vj', 'vjtrack', 'midi', 'embed', 'noaudio',
  'audio', 'audio_send', 'audio_device', 'audio_time',
])

/** `data` without the keys a peer may not set: where the socket goes and what boot loads. */
export const withoutPinned = (data) => Object.fromEntries(Object.entries(data).filter(([key]) => !PINNED.has(key)))

// A room's display secret (docs/vj-mcp.md, "Display secret"): the VJ MCP's display_secret tool
// hands out a display link with `#display_secret=ds_…` in its hash. A browser never sends the hash
// to a server, so the secret stays out of the site's request logs. The page reads it once, at load
// (RemoteDisplay), sends it only in its display-hello to a relay room we run, and never reports it:
// every href the page tells the agent goes through withoutSecret first.
export const SECRET_PARAM = 'display_secret'

/** The display secret in the page's link (`loc.hash`, or the query as a fallback), or null. */
export const displaySecretFrom = (loc) => {
  const fromHash = new URLSearchParams(String(loc?.hash ?? '').replace(/^#/, '')).get(SECRET_PARAM)
  return fromHash || new URLSearchParams(loc?.search ?? '').get(SECRET_PARAM) || null
}

/** `href` with any display secret cut out of its hash and query. */
// Judged on the decoded keys, as displaySecretFrom reads them: `#display%5Fsecret=` is the secret
// too, and a raw-text check would report it.
export const withoutSecret = (href) => {
  const s = String(href ?? '')
  try {
    const url = new URL(s)
    const hash = new URLSearchParams(url.hash.slice(1))
    if (!url.searchParams.has(SECRET_PARAM) && !hash.has(SECRET_PARAM)) return s
    url.searchParams.delete(SECRET_PARAM)
    hash.delete(SECRET_PARAM)
    url.hash = hash.toString()
    return url.toString()
  } catch {
    return s.replace(/display(_|%5f)secret=[^&#]*&?/gi, '')
  }
}

/** The secret to put in a hello on the socket at `socketUrl`: only to a relay room we run. */
export const secretFor = (socketUrl, secret) => {
  if (!secret || !inspectorAllowedOn(socketUrl, { dev: false })) return undefined
  return secret
}
