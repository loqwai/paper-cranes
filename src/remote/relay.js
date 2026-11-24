// Where a remote page's socket goes, and whether the VJ MCP may question it (docs/vj-mcp.md).
//
// The worker is deployed from workers/remote-relay. It ALSO answers on
// paper-cranes-remote.loqwai.workers.dev, but do not point clients there: a
// wildcard Cloudflare Access app guards that subdomain (and *.hypnodroid.com)
// and 302s the websocket upgrade to a login page. beadfamous.com carries no
// such app, which is the only reason this host is the default.
import { mergeUrlParams } from '../params/url.js'
export const DEFAULT_RELAY_HOST = 'relay.beadfamous.com'

// A relay on this machine (`wrangler dev` in workers/remote-relay) speaks plain ws.
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1)(:\d+)?$/

const relayHostOf = (params) => params.get('relay') || DEFAULT_RELAY_HOST

/** The socket URL for a page at `loc` ({search, hash, protocol, host}): the relay for a room, else the dev server. */
export const wsUrlFor = (loc) => {
  const params = mergeUrlParams(loc)
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

// Where the page's socket goes is fixed when the page loads (WebSocketClient takes its URL once).
// A room peer can send update-params, so these keys are never taken from it: not into the
// page's params, and not into the URL mirror that a refresh would read back.
const PINNED = ['relay', 'room']

/** `data` without the keys that choose where the socket goes. */
export const withoutPinned = (data) => Object.fromEntries(Object.entries(data).filter(([key]) => !PINNED.includes(key)))
