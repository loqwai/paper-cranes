// The dev server's display hub: hub-core.js over the /ws broker's Node `ws` sockets.
//
// A Display is one browser socket on /ws that said `display-hello` (a `?remote=display` page;
// src/remote/inspect.js). The broker (remote-ws-plugin) hands the hub every socket event; the
// MCP tools (server.js via tools.js) read and drive displays only through the hub. Nothing here is
// persisted: a dev-server restart drops it, and every display re-announces itself on reconnect.
// The public relay runs the same core in a Durable Object (workers/remote-relay).
import { WebSocket } from 'ws'
import { randomUUID } from 'node:crypto'
import { createHubCore } from './hub-core.js'

export { ToolError } from './errors.js'

export const createHub = () => {
  const bySocket = new Map() // ws -> Display
  const registry = {
    all: () => [...bySocket.values()],
    bySock: (ws) => bySocket.get(ws),
    add: (d) => bySocket.set(d.sock, d),
    remove: (d) => { if (bySocket.get(d.sock) === d) bySocket.delete(d.sock) },
    touch: () => {},
  }
  const io = {
    send: (ws, text) => ws.send(text),
    isOpen: (ws) => ws.readyState === WebSocket.OPEN,
    drop: (ws) => ws.terminate(),
  }
  // Is this socket really alive? A phone that drops off wifi can leave a socket the server still
  // thinks is OPEN; a ping it cannot answer tells the two cases apart.
  const alive = (d, ms = 1500) =>
    new Promise((resolveP) => {
      const ws = d.sock
      if (ws.readyState !== WebSocket.OPEN) return resolveP(false)
      const onPong = () => { clearTimeout(timer); resolveP(true) }
      const timer = setTimeout(() => { ws.off('pong', onPong); resolveP(false) }, ms)
      ws.once('pong', onPong)
      try { ws.ping() } catch { clearTimeout(timer); ws.off('pong', onPong); resolveP(false) }
    })
  return createHubCore({
    io, registry, alive, uuid: randomUUID,
    noneHint: 'Open a page with ?remote=display on this dev server (e.g. /jam.html?shader=<path>&remote=display), then retry; list_displays shows what is connected.',
  })
}
