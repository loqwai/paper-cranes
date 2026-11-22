import { WebSocketServer, WebSocket } from 'ws'
import { readInspectToken } from '../scripts/remote/token.js'

// Loopback only. cloudflared (the Access-protected hostname) and this machine's own tabs and CLI
// connect from loopback; anything else reached a dev server bound to 0.0.0.0 over the LAN and
// must not learn the token that authorises eval on the display. See docs/remote-inspect.md.
const isLoopback = (addr = '') => addr === '::1' || addr.startsWith('127.') || addr.startsWith('::ffff:127.')

const QUIET = new Set(['audio-features', 'inspect', 'inspect-reply', 'inspect-hello', 'midi-event'])

export function remoteWsPlugin() {
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
      // Per-session token for the remote-inspect channel (src/remote/inspectClient.js).
      server.middlewares.use('/__remote-inspect/token', (req, res) => {
        if (!isLoopback(req.socket.remoteAddress)) {
          res.statusCode = 403
          return res.end('loopback only')
        }
        res.setHeader('Content-Type', 'text/plain')
        res.setHeader('Cache-Control', 'no-store')
        res.end(readInspectToken())
      })

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
        clients.add(ws)
        console.log(`[WS] Client connected from ${clientIp} (${clients.size} total)`)

        broadcastStatus(wss)

        ws.on('message', (msg) => {
          try {
            const message = JSON.parse(msg.toString())
            if (!QUIET.has(message.type)) console.log(
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
          console.log(`[WS] Client disconnected (${clients.size} remaining)`)
          broadcastStatus(wss)
        })

        ws.on('error', (err) => {
          console.error('[WS] Error:', err.message)
          clients.delete(ws)
        })
      })

      console.log(`[WS] Remote control WebSocket available at /ws`)
    },
  }
}
