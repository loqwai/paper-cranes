import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
const OUT = 'D:/projects/paper-cranes/tmp/eclipse-shots'
const SHADER = process.argv[2] || 'claude/wip/eclipse/1'
const TAG = process.argv[3] || 'v1'

// quiet room / totality: gate near 0, everything still
const quiet = { quietGate: 0.04, energySpring: 0.05, waveletBassSpring: 0.05, waveletBand2Spring: 0.04,
    waveletBand4Spring: 0.04, waveletBand5Spring: 0.06, waveletCentroidSpring: 0.3, melodyFlow: 0.2,
    spectralCrestSmooth: 0.1, spectralRoughnessSmooth: 0.1, waveletBassZScore: 0, wavelet_bassHit: 0, wubDepth: 0 }
// normal loud groove
const loud = { quietGate: 1, energySpring: 0.55, waveletBassSpring: 0.55, waveletBand2Spring: 0.5,
    waveletBand4Spring: 0.45, waveletBand5Spring: 0.5, waveletCentroidSpring: 0.5, melodyFlow: 0.6,
    spectralCrestSmooth: 0.45, spectralRoughnessSmooth: 0.4, waveletBassZScore: 0.1, wavelet_bassHit: 0, wubDepth: 0.2 }
// THE DROP: everything blazing + a hard transient
const drop = { quietGate: 1, energySpring: 0.92, waveletBassSpring: 0.95, waveletBand2Spring: 0.85,
    waveletBand4Spring: 0.8, waveletBand5Spring: 0.9, waveletCentroidSpring: 0.75, melodyFlow: 0.85,
    spectralCrestSmooth: 0.8, spectralRoughnessSmooth: 0.6, waveletBassZScore: 1.0, wavelet_bassHit: 1.0, wubDepth: 0.6 }

await mkdir(OUT, { recursive: true })
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] })
const ctx = await b.newContext({ viewport: { width: 780, height: 1400 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log('[err]', m.text()) })
page.on('pageerror', e => console.log('[pageerror]', e.message))

const base = `http://localhost:6969/?shader=${SHADER}&noaudio=true&fullscreen=true&controller=wavelet-ease&wavelet=true&seed=0.35&seed2=0.7&seed3=0.42&seed4=0.61`
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 20000 })
await page.waitForTimeout(2500)

for (const [label, f] of [['quiet', quiet], ['loud', loud], ['drop', drop]]) {
    await page.evaluate(x => Object.assign(window.cranes.manualFeatures, x), f)
    await page.waitForTimeout(1600)
    await page.screenshot({ path: `${OUT}/${TAG}-${label}.png` })
    console.log('OK', TAG + '-' + label)
}
// landscape drop too (it will be shown on a laptop/projector as well)
const ctx2 = await b.newContext({ viewport: { width: 1280, height: 720 } })
const p2 = await ctx2.newPage()
await p2.goto(base, { waitUntil: 'domcontentloaded', timeout: 20000 })
await p2.waitForTimeout(2500)
await p2.evaluate(x => Object.assign(window.cranes.manualFeatures, x), drop)
await p2.waitForTimeout(1600)
await p2.screenshot({ path: `${OUT}/${TAG}-drop-wide.png` })
console.log('OK', TAG + '-drop-wide')
await b.close()
