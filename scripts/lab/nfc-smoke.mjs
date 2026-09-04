// Headless smoke test for nfc-writer.html: loads a bead, opens the inline preview, switches the
// shader dropdown, and checks the embedded frame renders a canvas. Writes a screenshot to the scratchpad.
import { chromium } from 'playwright'
const out = process.argv[2] || 'nfc-writer.png'
const br = await chromium.launch()
const p = await br.newPage({ viewport: { width: 420, height: 1100 } })
const errs = []
p.on('pageerror', e => errs.push(e.message))
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto('http://localhost:6969/nfc-writer.html?bead=tomoe', { waitUntil: 'load' })
await p.waitForTimeout(800)
await p.click('#preview')
await p.selectOption('#shader', 'spiral')
await p.waitForTimeout(3500)
const frame = p.frames().find(f => f !== p.mainFrame())
const inner = frame ? await frame.evaluate(() => { const c = document.querySelector('canvas'); return c ? `${c.width}x${c.height}` : 'no canvas' }).catch(e => 'eval failed: ' + e.message) : 'no frame'
const t = await p.evaluate(() => ({
  name: document.getElementById('name').textContent,
  tag: document.getElementById('url').textContent,
  bytes: document.getElementById('bytes').textContent,
  open: document.getElementById('open').href,
  previewSrc: document.getElementById('pvf').src.slice(0, 120),
  previewShown: !document.getElementById('pv').hidden,
  tiles: document.querySelectorAll('.tile').length,
}))
await p.screenshot({ path: out })
console.log(JSON.stringify({ t, innerCanvas: inner, errs }))
await br.close()
