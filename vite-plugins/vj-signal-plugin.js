// vj-signal-plugin — dev-only endpoint that lets the DISPLAY PAGE wake the /vibej loop.
// The ?vj=1 runtime (src/vj/runtime.js) POSTs health alerts + boot beacons here; each becomes a
// JSONL line in .claude/vj-signals.jsonl, which the vibej session watches with a Monitor —
// so Claude is woken by the page itself within seconds of a reload or a health breach,
// instead of discovering it a beat later. (vibej v2 design, 2026-08-19.)
import { appendFileSync, mkdirSync, readFileSync, existsSync, renameSync } from 'fs'
import { resolve } from 'path'

export const vjSignalPlugin = () => ({
  name: 'vj-signal',
  apply: 'serve',
  configureServer(server) {
    const file = resolve(server.config.root, '.claude/vj-signals.jsonl')
    // Rotate on dev-server boot. This is a bare appendFileSync with no bound: one session drove it
    // to 7.3 MB / 447 lines (avg 17 KB, max 92 KB per line). The GET endpoint only ever serves the
    // last 50 lines, and an agent reading the whole file blows its own context — so each dev
    // session starts clean and the previous run is kept as one .prev for post-mortem.
    try { if (existsSync(file)) renameSync(file, file + '.prev') } catch {}
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
