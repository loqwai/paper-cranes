import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 6970, host: '0.0.0.0' })

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    // ✅ FIX: Broadcast to all other clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(JSON.parse(msg.toString())))
      }
    })
  })

  ws.on('close', () => {
    // Client disconnected
  })
})
