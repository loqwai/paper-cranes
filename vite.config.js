import { defineConfig } from 'vite'
import { resolve } from 'path'
import { execSync } from 'child_process'
import { shaderPlugin } from './vite-plugins/shader-plugin.js'
import { remoteWsPlugin } from './vite-plugins/remote-ws-plugin.js'

const flashLog = []
const flashLogPlugin = () => ({
  name: 'flash-log',
  configureServer(server) {
    server.middlewares.use('/flash-log', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
      if (req.method === 'DELETE') {
        flashLog.length = 0
        res.writeHead(204); res.end(); return
      }
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => body += chunk)
        req.on('end', () => {
          try { const entry = JSON.parse(body); flashLog.push(entry); console.log('[flash]', JSON.stringify(entry)) } catch {}
          res.writeHead(204); res.end()
        })
        return
      }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(flashLog, null, 2))
    })
  },
})

const branchToPort = (branch) => {
  if (branch === 'main') return 6969
  let hash = 0
  for (const ch of branch) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return 1024 + (Math.abs(hash) % 64511) // 1024–65534
}

const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()

export default defineConfig({
  server: {
    port: parseInt(process.env.PORT) || branchToPort(gitBranch),
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        edit: resolve(import.meta.dirname, 'edit.html'),
        list: resolve(import.meta.dirname, 'list.html'),
        analyze: resolve(import.meta.dirname, 'analyze.html'),
        playlist: resolve(import.meta.dirname, 'playlist.html'),
      },
    },
  },
  resolve: {
    alias: {
      'hypnosound': 'https://esm.sh/hypnosound@1.10.2',
      'twgl-base.js': 'https://esm.sh/twgl-base.js@5.5.3',
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: (id) => id.startsWith('https://'),
    },
  },
  plugins: [shaderPlugin(), remoteWsPlugin(), flashLogPlugin()],
})
