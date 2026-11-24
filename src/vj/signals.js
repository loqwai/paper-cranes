// Where a ?vj=1 page's signals go (runtime.js: boot beacon, health alerts, pulses, confirm-learn).
//   dev server       POST /__vj-signal: a JSONL line for the vibej Monitor, and a hub event for the
//                    dev VJ MCP's wait_for_event (vite-plugins/vj-signal-plugin.js)
//   a relay room     a `vj-signal` message down the display's own socket, which the room turns into
//                    a hub event for the relay MCP's wait_for_event (workers/remote-relay/src/room.js)
// A production page has no /__vj-signal (the static host answers 405), so without a room socket
// its signals reached no one. Only a socket to a broker we run carries them (relay.js), the same
// rule as the inspector. Signals sent before that socket opens wait in a short queue.
import { inspectorAllowedOn } from '../remote/relay.js'

const QUEUE_MAX = 20
const FLUSH_MS = 1000
const ROOM_SOCKET = /\/ws\/[^/]+$/

/**
 * getClient  () => the page's WebSocketClient (window.cranes.remoteClient), or undefined
 * dev        a dev build: also POST to /__vj-signal
 * search     the page's location.search
 */
export const createSignalPoster = ({ getClient, dev, search, fetchImpl = (...a) => fetch(...a), setTimer = setTimeout }) => {
  const queue = []
  let timer = null

  // The room socket, when this page has one to a relay we run; undefined when it never will.
  const roomClient = () => {
    const c = getClient()
    if (!c?.url || !ROOM_SOCKET.test(new URL(c.url).pathname)) return undefined
    return inspectorAllowedOn(c.url, { dev }) ? c : undefined
  }

  const flush = () => {
    timer = null
    const c = roomClient()
    while (queue.length && c?.isConnected) {
      if (!c.send('vj-signal', queue[0])) break
      queue.shift()
    }
    if (queue.length && !timer) timer = setTimer(flush, FLUSH_MS)
  }

  const viaRoom = (sig) => {
    queue.push(sig)
    if (queue.length > QUEUE_MAX) queue.splice(0, queue.length - QUEUE_MAX)
    flush()
  }

  return (sig) => {
    if (dev) fetchImpl('/__vj-signal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sig) }).catch(() => {})
    // The remote client may not exist yet at boot (RemoteDisplay can start after the runtime), so
    // a ?remote=display&room= page queues until it does.
    if (roomClient() || (!getClient() && willJoinRoom(search))) viaRoom(sig)
  }
}

const willJoinRoom = (search) => {
  const p = new URLSearchParams(search ?? '')
  return p.get('remote') === 'display' && p.has('room')
}
