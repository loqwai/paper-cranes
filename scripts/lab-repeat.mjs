// n-repeat luminance/coverage with a STATED SPREAD, for /lab (agent: kiku, port 6981).
//
// Adopts lab/split's protocol so numbers are comparable across teammates: headed Chromium (real
// GPU), viewport 1000x800, settle = frameCount>30 then a fixed 3000ms.
// ADDS two things lab/split does not have:
//   * seed pinning. index.js seeds seed..seed4 with Math.random() into localStorage; seed3/seed4
//     drive lattice twist+swirl, so an unpinned run re-rolls the picture every load. `--noseed`
//     runs the same arm unpinned so the seed contribution to the spread can be measured.
//   * FULL-RESOLUTION metrics. Downsampling averages thin bright lines into the dark ground and
//     can flip the SIGN of a brightness comparison (verified: 160x160 says the bead arm is
//     brighter; full res says it loses 45% of its lit coverage).
//
//   node scripts/lab-repeat.mjs <n> <label>=<query-suffix> ...
import { chromium } from 'playwright'

const PORT = 6981
const BASE = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/kiku&controller=lattice-nav&wavelet=true&noaudio=true&fullscreen=true&navZoom=0.218&image=images/beads/mon-kiku.png&knob_1=0.429&knob_134=0.507&knob_144=0.3&onlyLevel=-1&flatLevels=0`
const VIEW = { width: 1000, height: 800 }
const SEEDS = [0.3141592, 0.6535897, 0.9323846, 0.2643383]

const [nRaw, ...pairs] = process.argv.slice(2)
const N = +nRaw || 3
const browser = await chromium.launch({ headless: false })

const stat = a => {
    const m = a.reduce((s, v) => s + v, 0) / a.length
    const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length)
    const mn = Math.min(...a), mx = Math.max(...a)
    return { mean: +m.toFixed(2), sd: +sd.toFixed(2), min: +mn.toFixed(2), max: +mx.toFixed(2),
             spreadPct: +(100 * (mx - mn) / m).toFixed(1) }
}

const out = []
for (const pair of pairs) {
    const i = pair.indexOf('=')
    const label = pair.slice(0, i)
    let q = pair.slice(i + 1)
    const pinned = !q.includes('--noseed')
    q = q.replace('--noseed', '')

    const runs = []
    for (let k = 0; k < N; k++) {
        const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 })
        if (pinned) await ctx.addInitScript(([key, s]) => localStorage.setItem(key, JSON.stringify(s)), ['paperCranes.seeds', SEEDS])
        const page = await ctx.newPage()
        await page.goto(`${BASE}&${q}`, { waitUntil: 'load', timeout: 45000 })
        const port = await page.evaluate(() => location.port)
        if (port !== String(PORT)) throw new Error(`PORT GUARD FAILED: ${port}`)
        await page.waitForFunction(() => window.cranes && window.cranes.frameCount > 30, null, { timeout: 30000 })
        await page.waitForTimeout(3000)
        runs.push(await page.evaluate(() => {
            // measure the canvas at FULL resolution - no downsample
            const c = document.querySelector('canvas')
            const o = Object.assign(document.createElement('canvas'), { width: c.width, height: c.height })
            const x = o.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0)
            const d = x.getImageData(0, 0, o.width, o.height).data
            let s = 0, lit = 0, n = 0
            for (let i = 0; i < d.length; i += 4) {
                const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
                s += l; if (l > 20) lit++; n++
            }
            return { mean: +(s / n).toFixed(2), litPct: +(100 * lit / n).toFixed(2), seeds: window.cranes.seeds.map(v => +v.toFixed(4)) }
        }))
        await ctx.close()
    }
    const r = { label, n: N, seedsPinned: pinned, seedsSeen: [...new Set(runs.map(x => x.seeds.join(',')))].length,
                meanLum: stat(runs.map(x => x.mean)), litPct: stat(runs.map(x => x.litPct)) }
    out.push(r)
    console.log(JSON.stringify(r))
}
console.log('\n' + JSON.stringify(out, null, 1))
await browser.close()
