import { WebSocketServer, WebSocket } from 'ws'

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
            console.log(
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
