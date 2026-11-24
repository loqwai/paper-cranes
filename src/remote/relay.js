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
 * May this page load the inspector (answer the VJ MCP's `inspect`)? Only when its broker is one we
 * run: the dev server's /ws (a dev build with no room), or a room on relay.beadfamous.com or on a
 * loopback relay. `?relay=` still relays through any host, but a relay we do not run could
 * welcome the display and read its canvas, audio features, knobs and console, so there the page
 * never answers. Exact host match: `relay.beadfamous.com@evil.example` is evil.example.
 */
export const inspectorAllowed = (loc, { dev }) => {
  const params = new URLSearchParams(loc.search)
  if (!params.get('room')) return Boolean(dev)
  const host = relayHostOf(params)
  return host === DEFAULT_RELAY_HOST || LOOPBACK_HOST.test(host)
}
