import { WebSocketServer, WebSocket } from 'ws'
import { HUB_TYPES } from './vj-mcp/hub-core.js'

// Message types between one display and the VJ MCP hub (vite-plugins/vj-mcp/hub-core.js). They are
// point-to-point: never broadcast, and `inspect` (or a welcome/rekey) from a client is dropped,
// because only the hub may address a display (docs/vj-mcp.md). The relay Worker does the same.
const HUB_ONLY = HUB_TYPES

// May this socket register as a display? Only a page this dev server served: its Origin's host
// equals the Host it connected to (the tunnel too, where both are the tunnel hostname). Any other
// web page open in the browser can reach /ws, but must not pose as a display and feed an agent
// text of its choosing. Ordinary /ws traffic (update-params, audio-features) is unaffected.
const sameOrigin = (req) => {
  try {
    const origin = new URL(req.headers.origin).host
    return [req.headers.host, req.headers['x-forwarded-host']].includes(origin)
  } catch {
    return false
  }
}

export function remoteWsPlugin({ hub } = {}) {
  const clients = new Set()

  const broadcastStatus = (wss) => {
    const status = JSON.stringify({
      type: 'status',
      data: { connectedClients: clients.size },
    })
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(status)
      }
    })
  }

  return {
    name: 'vite-plugin-remote-ws',

    configureServer(server) {
      // Create WebSocket server attached to Vite's HTTP server
      const wss = new WebSocketServer({ noServer: true })

      // Handle WebSocket upgrade requests
      server.httpServer.on('upgrade', (request, socket, head) => {
        // Skip Vite's own HMR WebSocket (path /)
        if (request.url === '/' || request.url?.startsWith('/?')) {
          return
        }

        // Handle our remote control WebSocket
        if (request.url === '/ws' || request.url === '/remote') {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request)
          })
        }
      })

      wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress
        const mayDisplay = sameOrigin(req)
        clients.add(ws)
        console.log(`[WS] Client connected from ${clientIp} (${clients.size} total)`)

        broadcastStatus(wss)

        ws.on('message', (msg) => {
          try {
            const message = JSON.parse(msg.toString())
            if (HUB_ONLY.has(message.type)) {
              if (message.type === 'display-hello') {
                if (mayDisplay) hub?.onHello(ws, message.data)
                else console.warn(`[WS] display-hello refused: Origin ${req.headers.origin ?? '(none)'} is not this server`)
              }
              if (message.type === 'inspect-reply') hub?.onReply(ws, message.data)
              return
            }
            if (message.type !== 'audio-features') console.log(
              `[WS] Received: ${message.type}`,
              message.data ? JSON.stringify(message.data).slice(0, 100) : ''
            )

            // Broadcast to all other clients
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(msg.toString())
              }
            })
          } catch (e) {
            console.error('[WS] Invalid message:', e.message)
          }
        })

        ws.on('close', () => {
          clients.delete(ws)
          hub?.onClose(ws)
          console.log(`[WS] Client disconnected (${clients.size} remaining)`)
          broadcastStatus(wss)
        })

        ws.on('error', (err) => {
          console.error('[WS] Error:', err.message)
          clients.delete(ws)
          hub?.onClose(ws)
        })
      })

      console.log(`[WS] Remote control WebSocket available at /ws`)
    },
  }
}
