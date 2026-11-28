// cue: wait for the music to give a cue, print ONE line, exit. Run it as a background Monitor.
// It reads the live controller's own musical timers (black-sun's bs_buildT, bs_lowT, bs_calmT and
// bs_dropEnv), the same ones the story engine moves acts on, so a cue here is a moment the story would
// also call musical. Reads go through the VJ MCP's get_state, once a second (no model in the loop).
//   node setlists/sun-set/cue.mjs <build|drop|breakdown> [--max 180]
import { connectVj } from '../../scripts/vj/mcp-client.js'

const CUES = {
  build: s => s.bs_buildT > 8,
  drop: s => s.bs_dropEnv > 0.5,
  breakdown: s => s.bs_lowT > 10 || s.bs_calmT > 15,
}

const [cue] = process.argv.slice(2)
const i = process.argv.indexOf('--max')
const max = i === -1 ? 180 : +process.argv[i + 1]
if (!CUES[cue]) {
  console.error(`usage: cue.mjs ${Object.keys(CUES).join('|')} [--max seconds]`)
  process.exit(2)
}

const start = Date.now()
const elapsed = () => Math.round((Date.now() - start) / 1000)
let vj = null
let fails = 0
let line = `CUE TIMEOUT ${cue} after ${max} s`
while (elapsed() < max) {
  try {
    vj ??= await connectVj({ name: 'sun-set-cue' })
    const { controller = {} } = await vj.call('get_state', { features: 'none' })
    if (!('bs_buildT' in controller)) throw new Error('no bs_buildT: black-sun is not loaded, or predates the cue outputs')
    fails = 0
    if (CUES[cue](controller)) {
      line = `CUE ${cue} after ${elapsed()} s`
      break
    }
  } catch (e) {
    if (++fails >= 10) {
      line = `CUE ERROR ${cue}: 10 failed polls in a row (${e.message.split('\n')[0]})`
      break
    }
    await vj?.close().catch(() => {})
    vj = null
  }
  await new Promise(r => setTimeout(r, 1000))
}
await vj?.close().catch(() => {})
console.log(line)
process.exit(line.startsWith('CUE ERROR') ? 1 : 0)
