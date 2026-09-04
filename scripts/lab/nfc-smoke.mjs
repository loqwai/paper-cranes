import { chromium } from 'playwright'
const out = 'C:/Users/HYPNOD~1/AppData/Local/Temp/claude/D--Projects-pc-lab-sub2/ff0d2913-98d5-4f34-9d63-20d7e9e1e714/scratchpad/nfc-writer.png'
const br = await chromium.launch()
const p = await br.newPage({ viewport: { width: 420, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push(e.message))
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto('http://localhost:6969/nfc-writer.html?bead=tomoe', { waitUntil: 'load' })
await p.waitForTimeout(1200)
const t = await p.evaluate(() => ({
  name: document.getElementById('name').textContent,
  bytes: document.getElementById('bytes').textContent,
  tiles: document.querySelectorAll('.tile').length,
  url: document.getElementById('url').textContent,
  notice: document.getElementById('notice').classList.contains('show'),
}))
await p.screenshot({ path: out })
console.log(JSON.stringify({ t, errs }))
await br.close()
