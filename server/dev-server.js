#!/usr/bin/env node

import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { context } from 'esbuild'
import fs from 'fs'
import path from 'path'
import { ensureDistDirectory, createBuildOptions } from '../esbuild.common.js'

const PORT = parseInt(process.env.PORT) || 6969
const DIST_DIR = 'dist'

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.frag': 'text/plain',
  '.map': 'application/json',
}

// Store connected clients for status reporting
const clients = new Set()

// Serve static files from dist/
const serveStatic = (req, res) => {
  let urlPath = req.url.split('?')[0] // Remove query params
  if (urlPath === '/') urlPath = '/index.html'

  const filePath = path.join(DIST_DIR, urlPath)
  const ext = path.extname(filePath).toLowerCase()

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try with .html extension for clean URLs
      const htmlPath = filePath + '.html'
      fs.stat(htmlPath, (htmlErr, htmlStats) => {
        if (htmlErr || !htmlStats.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('Not Found')
          return
        }
        serveFile(htmlPath, '.html', res)
      })
      return
    }
    serveFile(filePath, ext, res)
  })
}

const serveFile = (filePath, ext, res) => {
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Internal Server Error')
      return
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(data)
  })
}

// Create HTTP server
const server = http.createServer(serveStatic)

// Create WebSocket server on same port (handles upgrade)
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress
  clients.add(ws)
  console.log(`[WS] Client connected from ${clientIp} (${clients.size} total)`)

  // Send connection count to all clients
  broadcastStatus()

  ws.on('message', (msg) => {
    try {
      const message = JSON.parse(msg.toString())
      console.log(`[WS] Received: ${message.type}`, message.data ? JSON.stringify(message.data).slice(0, 100) : '')

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
    broadcastStatus()
  })

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message)
    clients.delete(ws)
  })
})

// Broadcast connection status to all clients
const broadcastStatus = () => {
  const status = JSON.stringify({
    type: 'status',
    data: { connectedClients: clients.size }
  })

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(status)
    }
  })
}

// Start esbuild watch mode
const startEsbuild = async () => {
  await ensureDistDirectory()
  const getConfigs = createBuildOptions(true)
  const { copyOptions, bundleOptions } = await getConfigs()

  const ctxCopy = await context(copyOptions)
  const ctxBundle = await context(bundleOptions)

  await ctxCopy.watch()
  await ctxBundle.watch()

  console.log('[esbuild] Watching for changes...')

  // Rebuild shaders.json periodically to catch new files
  setInterval(async () => {
    try {
      await ctxCopy.rebuild()
    } catch (e) {
      // Ignore rebuild errors
    }
  }, 5000)
}

// Main startup
const main = async () => {
  await startEsbuild()

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
[Paper Cranes Dev Server]
  HTTP + WebSocket: http://localhost:${PORT}
  Network:          http://0.0.0.0:${PORT}

  Display (PC):     http://localhost:${PORT}?remote=display
  Remote (Phone):   http://<pc-ip>:${PORT}/list.html?remote=control
`)
  })
}

main().catch(console.error)
