// watch-dials — emit ONE line each time the user lets go of a dial on the show page.
// Polls knob_1..16 over show.js eval (CDP), so it needs no page instrumentation: `vjtrack=1`
// (watch-release.js's source) serialises ~17KB every 2s on the render thread and is banned at
// shows. A release is a knob vector that changed and then held still for SETTLE_MS.
// Usage: node scripts/vj/watch-dials.js   (run from the repo root, as a Monitor)
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const SHOW = join(dirname(fileURLToPath(import.meta.url)), 'show.js')
const FN = '() => { const f = window.cranes.flattenFeatures(); const o = {}; for (let n = 1; n <= 16; n++) o[n] = +(f["knob_" + n] ?? 0).toFixed(2); return o }'
const POLL_MS = 600, SETTLE_MS = 2500

const read = () => JSON.parse(execFileSync('node', [SHOW, 'eval', FN], { encoding: 'utf8', timeout: 5000 }))

let settled = read()
let live = settled
let lastChange = 0

setInterval(() => {
  const now = read()
  if (JSON.stringify(now) !== JSON.stringify(live)) {
    live = now
    lastChange = Date.now()
  }
  if (!lastChange || Date.now() - lastChange < SETTLE_MS) return
  const moved = Object.keys(live).filter(k => live[k] !== settled[k]).map(k => `K${k} ${settled[k]}→${live[k]}`)
  lastChange = 0
  settled = live
  if (moved.length) console.log(`RELEASE ${moved.join(' ')} | all=${JSON.stringify(live)}`)
}, POLL_MS)
