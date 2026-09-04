// /lab deterministic canvas capture.
//
// Why not the Chrome extension: its synthetic cursor is drawn in an isolated world and lands
// mid-frame, which is fatal for the before/after comparison this whole skill exists to produce.
// Headless Playwright has no cursor, gives exact viewport control, and lets me choose the path.
//
// The determinism trap this fixes: index.js seeds seed..seed4 with Math.random() and persists
// them in localStorage. A fresh browser context therefore gets NEW seeds every run, and seed3/
// seed4 drive lattice twist + swirl — so baseline and variant would differ for reasons that have
// nothing to do with the edit. addInitScript pins them BEFORE any page script runs.
//
//   node scripts/lab-shot.mjs <out.png> "<url>" [width] [height]

import { chromium } from 'playwright'

const [out, url, w = '900', h = '900'] = process.argv.slice(2)
if (!out || !url) {
    console.error('usage: node scripts/lab-shot.mjs <out.png> "<url>" [w] [h]')
    process.exit(1)
}

const SEEDS = [0.3141592, 0.6535897, 0.9323846, 0.2643383] // fixed, shared by every shot

const b = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
await ctx.addInitScript(([k, s]) => {
    localStorage.setItem(k, JSON.stringify(s))
}, ['paperCranes.seeds', SEEDS])

const page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

await page.goto(url, { waitUntil: 'load', timeout: 45000 })

// PORT GUARD: never trust a frame without confirming it came from my own server.
const href = await page.evaluate(() => location.href)
if (!href.includes(':6981')) { console.error('PORT GUARD FAILED:', href); process.exit(1) }

await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(3500) // let the shader compile + settle; time= holds iTime constant

const stats = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return { err: 'no canvas' }
    // Read the real pixels back so a black/blank frame cannot be reported as a success.
    const o = document.createElement('canvas')
    o.width = 160; o.height = 160
    o.getContext('2d').drawImage(c, 0, 0, 160, 160)
    const d = o.getContext('2d').getImageData(0, 0, 160, 160).data
    let sum = 0, mn = 255, mx = 0, n = 0
    for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
        sum += l; mn = Math.min(mn, l); mx = Math.max(mx, l); n++
    }
    return { w: c.width, h: c.height, meanLum: +(sum / n).toFixed(2), min: +mn.toFixed(1), max: +mx.toFixed(1) }
})

const el = await page.$('canvas')
await el.screenshot({ path: out })
console.log(JSON.stringify({ out, href, ...stats, errors: errors.slice(0, 4) }))
await b.close()
