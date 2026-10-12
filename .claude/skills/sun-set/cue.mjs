// cue: wait for the music to give a cue, print ONE line, exit. Run it as a background Monitor.
// It reads the live controller's own musical states (window.__blackSunState), the same ones the story
// engine moves acts on, so a cue here is a moment the story would also call musical.
//   node .claude/skills/sun-set/cue.mjs <build|drop|breakdown> [--max 180]
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SHOW = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scripts', 'vj', 'show.js')
const FN = '() => { const s = window.__blackSunState ?? {}; return { buildT: s.buildT, dropEnv: s.dropEnv, lowT: s.lowT, calmT: s.calmT } }'
const CUES = {
  build: s => s.buildT > 8,
  drop: s => s.dropEnv > 0.5,
  breakdown: s => s.lowT > 10 || s.calmT > 15,
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
let fails = 0
while (elapsed() < max) {
  try {
    const s = JSON.parse(execFileSync('node', [SHOW, 'eval', FN], { encoding: 'utf8', timeout: 5000 }).trim().split('\n').pop())
    fails = 0
    if (CUES[cue](s)) {
      console.log(`CUE ${cue} after ${elapsed()} s`)
      process.exit(0)
    }
  } catch {
    fails++
    if (fails >= 10) {
      console.log(`CUE ERROR ${cue}: 10 failed polls in a row (is the wall up?)`)
      process.exit(1)
    }
  }
  await new Promise(r => setTimeout(r, 1000))
}
console.log(`CUE TIMEOUT ${cue} after ${max} s`)
