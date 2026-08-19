// vj-signal-plugin — dev-only endpoint that lets the DISPLAY PAGE wake the /vibej loop.
// The ?vj=1 runtime (src/vj/runtime.js) POSTs health alerts + boot beacons here; each becomes a
// JSONL line in .claude/vj-signals.jsonl, which the vibej session watches with a Monitor —
// so Claude is woken by the page itself within seconds of a reload or a health breach,
// instead of discovering it a beat later. (vibej v2 design, 2026-08-19.)
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

export const vjSignalPlugin = () => ({
  name: 'vj-signal',
  apply: 'serve',
  configureServer(server) {
    const file = resolve(server.config.root, '.claude/vj-signals.jsonl')
    server.middlewares.use('/__vj-signal', (req, res) => {
      if (req.method === 'POST') {
        let body = ''
        req.on('data', c => { body += c })
        req.on('end', () => {
          try {
            const sig = JSON.parse(body || '{}')
            sig.t = new Date().toISOString()
            mkdirSync(resolve(server.config.root, '.claude'), { recursive: true })
            appendFileSync(file, JSON.stringify(sig) + '\n')
            res.statusCode = 204; res.end()
          } catch (e) { res.statusCode = 400; res.end(String(e)) }
        })
        return
      }
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json')
        const lines = existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').slice(-50) : []
        res.end('[' + lines.join(',') + ']')
        return
      }
      res.statusCode = 405; res.end()
    })
  },
})
