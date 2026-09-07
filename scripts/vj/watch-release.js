// watch-release — emit ONE line the moment the user lets go of a fader.
// Tails .claude/vj-signals.jsonl for knobtrack batches; a gesture is "released" when movement
// stops for RELEASE_MS. This is what wakes the vibej loop at exactly the right instant: the user
// rides a knob to the beat, lets go, and the loop wires the feature they were imitating.
import { statSync, openSync, readSync, existsSync } from 'fs'

const FILE = '.claude/vj-signals.jsonl'
const RELEASE_MS = 2500, MIN_SAMPLES = 15
let pos = existsSync(FILE) ? statSync(FILE).size : 0
let buf = '', open = null

const readNew = () => {
  if (!existsSync(FILE)) return
  const size = statSync(FILE).size
  if (size < pos) pos = 0
  if (size === pos) return
  const fd = openSync(FILE, 'r')
  const b = Buffer.alloc(size - pos)
  readSync(fd, b, 0, b.length, pos)
  pos = size
  buf += b.toString('utf8')
  const lines = buf.split('\n')
  buf = lines.pop()
  for (const line of lines) {
    let d; try { d = JSON.parse(line) } catch { continue }
    if (d.type !== 'knobtrack' || !d.moves?.length) continue
    const knobs = new Set(d.moves.flatMap(m => Object.keys(m.k)))
    if (!open) open = { n: 0, knobs: new Set(), t0: Date.now() }
    open.n += d.moves.length
    for (const k of knobs) open.knobs.add(k)
    open.last = Date.now()
  }
}

setInterval(() => {
  readNew()
  if (open && Date.now() - open.last > RELEASE_MS) {
    if (open.n >= MIN_SAMPLES) {
      console.log(`RELEASE samples=${open.n} dur=${((open.last - open.t0) / 1000).toFixed(1)}s knobs=${[...open.knobs].join(',')}`)
    }
    open = null
  }
}, 300)
