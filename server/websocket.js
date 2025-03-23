import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 6970 })

wss.on('connection', (ws) => {
  console.log('Client connected')

  ws.on('message', (msg) => {
    console.log('Received from client:', msg.toString())
    // ✅ FIX: Broadcast to all other clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(JSON.parse(msg.toString())))
      }
    })
  })

  ws.on('close', () => {
    console.log('Client disconnected')
  })
})
