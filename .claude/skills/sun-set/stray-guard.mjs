// stray-guard: the show Chrome is the only Chrome, so any link opened anywhere (an MCP OAuth page, a PR
// link, a doc) lands on the wall, and show.js refuses to run while the browser has two pages.
// Close every page that isn't the jam page, then bring the wall back to the front.
//   node .claude/skills/sun-set/stray-guard.mjs          sweep every 2 s, one line per event (run as a Monitor)
//   node .claude/skills/sun-set/stray-guard.mjs --once   one sweep
const CDP = `http://127.0.0.1:${process.env.SHOW_CDP_PORT || '9333'}`

let last = ''
const say = line => {
  if (line !== last) console.log(line)
  last = line
}

const sweep = async () => {
  const pages = (await fetch(`${CDP}/json/list`).then(r => r.json())).filter(t => t.type === 'page')
  const walls = pages.filter(p => p.url.includes('/jam.html'))
  if (walls.length !== 1) return say(`WALL ${walls.length ? 'AMBIGUOUS' : 'MISSING'}, closed nothing: ${pages.map(p => p.url).join(' , ') || 'no pages'}`)
  const strays = pages.filter(p => p.id !== walls[0].id)
  for (const p of strays) {
    await fetch(`${CDP}/json/close/${p.id}`)
    console.log(`CLOSED ${p.url}`)
  }
  if (strays.length) await fetch(`${CDP}/json/activate/${walls[0].id}`)
  last = ''
}

const guarded = () => sweep().catch(e => say(`CDP DOWN: ${e.message}`))

if (process.argv.includes('--once')) {
  await guarded()
  process.exit(0)
}
setInterval(guarded, 2000)
