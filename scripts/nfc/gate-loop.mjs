// Nudge-and-regate loop for the clit-set NFC variants.
//
//   node scripts/nfc/gate-loop.mjs <outDir> [port=6969] [rounds=4]
//
// Starts from <outDir>/gate.json (a full render-gate run). Each round: give every failing tag one more
// retry (clit-set-variants.mjs --nudge-from), regenerate, re-gate only those tags into <outDir>/round-N,
// and merge their results (and thumbnails) back into <outDir>/gate.json. Stops when all pass or the
// rounds run out. Rebuild the contact sheet afterwards with render-gate on the full list if needed.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const [outDir, port = '6969', rounds = '4'] = process.argv.slice(2)
const ROOT = resolve(import.meta.dirname, '../..')
const gatePath = `${outDir}/gate.json`
const run = (script, args) => execFileSync('node', [`${ROOT}/scripts/nfc/${script}`, ...args],
  { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], env: process.env })

for (let round = 1; round <= Number(rounds); round++) {
  const gate = JSON.parse(readFileSync(gatePath, 'utf8'))
  const failed = gate.filter(r => !r.pass).map(r => r.n)
  console.log(`round ${round}: ${failed.length} failing`)
  if (!failed.length) break
  console.log(run('clit-set-variants.mjs', ['--nudge-from', gatePath]).trim())
  const dir = `${outDir}/round-${round}`
  run('render-gate.mjs', [`${ROOT}/shaders/clit-set/nfc-variants.json`, dir, port, failed.join(',')])
  const redo = new Map(JSON.parse(readFileSync(`${dir}/gate.json`, 'utf8')).map(r => [r.n, r]))
  for (const n of redo.keys()) copyFileSync(`${dir}/${n}.png`, `${outDir}/${n}.png`)
  writeFileSync(gatePath, JSON.stringify(gate.map(r => redo.get(r.n) ?? r), null, 1))
}
const final = JSON.parse(readFileSync(gatePath, 'utf8'))
console.log(`FINAL ${final.filter(r => r.pass).length}/${final.length} pass; failing: ${final.filter(r => !r.pass).map(r => `${r.n}(${r.why})`).join(' ')}`)
