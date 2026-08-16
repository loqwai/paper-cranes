// SIDE-BY-SIDE CONTACT SHEET, with the images actually loaded.
//
// The first version of this built the grid with <img src="file:///..."> inside a setContent()
// document. The browser blocks file:// subresources from such a page, so it rendered a tidy grid
// of EMPTY BOXES and looked perfectly fine at a glance. Inline the bytes as base64 data URIs
// instead — then the sheet cannot silently lie about what it is showing.
//
//   node scripts/compare-shots.mjs <out.png> <label>=<file.png> [<label>=<file.png> ...]

import { chromium } from 'playwright'
import { readFile } from 'fs/promises'

const [out, ...pairs] = process.argv.slice(2)
if (!out || !pairs.length) {
    console.error('usage: node scripts/compare-shots.mjs <out.png> <label>=<png> ...')
    process.exit(1)
}

const tiles = []
for (const pair of pairs) {
    const i = pair.indexOf('=')
    const label = pair.slice(0, i), file = pair.slice(i + 1)
    tiles.push([label, 'data:image/png;base64,' + (await readFile(file)).toString('base64')])
}

const cols = Math.min(tiles.length, 3)
const b = await chromium.launch({ headless: true })
const p = await b.newPage({ viewport: { width: 430 * cols, height: 820 } })
await p.setContent(`<body style="margin:0;background:#0b0b0f;display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:6px">
${tiles.map(([l, d]) => `<div style="position:relative"><img src="${d}" style="width:100%;display:block">
<span style="position:absolute;top:6px;left:8px;color:#fff;font:bold 22px monospace;text-shadow:0 0 8px #000,0 0 5px #000">${l}</span></div>`).join('')}
</body>`)
// fail loudly rather than screenshotting blank boxes
const ok = await p.evaluate(() => [...document.images].every(i => i.complete && i.naturalWidth > 0))
if (!ok) { console.error('ERROR: some tiles failed to decode'); process.exit(1) }
await p.waitForTimeout(400)
await p.screenshot({ path: out, fullPage: true })
console.log('wrote', out, `(${tiles.length} tiles, all decoded)`)
await b.close()
