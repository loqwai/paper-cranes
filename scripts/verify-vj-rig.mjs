/**
 * verify-vj-rig.mjs — prove the phone controller actually moves pixels on the display.
 *
 * Opens TWO real browser contexts against the same dev server:
 *   1. the display  (index.html?remote=display) — desktop viewport
 *   2. the phone    (vj.html)                   — 390x844, touch enabled
 * then drags faders on the phone with real pointer events and screenshots the
 * display before/after. A WebSocket that connects but does not change the image
 * is the failure we are hunting, so we assert on PIXELS, not on socket state.
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'fs/promises'

const PORT = process.env.PORT || 6969
const OUT = 'D:/Projects/paper-cranes/tmp/vj-verify'
const SHADER = 'redaphid/chromadepth-lattice/6'
const SEEDS = 'seed=0.3&seed2=0.7&seed3=0.4&seed4=0.6'
const DISPLAY_URL =
    `http://localhost:${PORT}/?shader=${SHADER}&noaudio=true&fullscreen=true` +
    `&controller=lattice-nav&wavelet=true&remote=display&${SEEDS}&knob_1=0.21`
const PHONE_URL = `http://localhost:${PORT}/vj.html`

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

/* Decode + diff the PNGs inside a scratch browser page rather than pulling a
   PNG library into the project's dependencies just for a verification script. */
const scratch = await (await browser.newContext()).newPage()
const diff = async (a, b) =>
    scratch.evaluate(async ([a64, b64]) => {
        const load = async (b64) => {
            const bin = atob(b64)
            const arr = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
            const bmp = await createImageBitmap(new Blob([arr], { type: 'image/png' }))
            const c = new OffscreenCanvas(bmp.width, bmp.height)
            const ctx = c.getContext('2d')
            ctx.drawImage(bmp, 0, 0)
            return ctx.getImageData(0, 0, bmp.width, bmp.height)
        }
        const ia = await load(a64)
        const ib = await load(b64)
        if (ia.width !== ib.width || ia.height !== ib.height) return 999
        let sum = 0
        let n = 0
        // sample every 16th pixel — plenty for a "did the image change" verdict
        for (let i = 0; i < ia.data.length; i += 64) {
            sum += Math.abs(ia.data[i] - ib.data[i])
            sum += Math.abs(ia.data[i + 1] - ib.data[i + 1])
            sum += Math.abs(ia.data[i + 2] - ib.data[i + 2])
            n += 3
        }
        return sum / n
    }, [a.toString('base64'), b.toString('base64')])

// ── display ──────────────────────────────────────────────────────────────
const dctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
const display = await dctx.newPage()
const dlog = []
display.on('console', (m) => dlog.push(`[display:${m.type()}] ${m.text()}`))
await display.goto(DISPLAY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
await display.waitForTimeout(4000)

// ── phone ────────────────────────────────────────────────────────────────
const pctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
})
const phone = await pctx.newPage()
const plog = []
phone.on('console', (m) => plog.push(`[phone:${m.type()}] ${m.text()}`))
phone.on('pageerror', (e) => plog.push(`[phone:PAGEERROR] ${e.message}`))
await phone.goto(PHONE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
await phone.waitForTimeout(2500)

await phone.screenshot({ path: `${OUT}/phone-controller.png` })
const statusText = await phone.locator('#status').textContent()
console.log('PHONE STATUS BAR:', JSON.stringify(statusText))

/** drag a named fader by `frac` of its width (relative dragging) */
const dragFader = async (label, frac) => {
    const fader = phone.locator('.fader', { has: phone.locator(`.flabel:text-is("${label}")`) }).first()
    const box = await fader.boundingBox()
    if (!box) throw new Error(`fader ${label} not found`)
    const y = box.y + box.height / 2
    const startX = box.x + box.width * 0.5
    const endX = startX + box.width * frac
    await phone.mouse.move(startX, y)
    await phone.mouse.down()
    for (let i = 1; i <= 12; i++) {
        await phone.mouse.move(startX + ((endX - startX) * i) / 12, y)
        await phone.waitForTimeout(16)
    }
    await phone.mouse.up()
    await phone.waitForTimeout(500)
}

const readDisplayParams = () =>
    display.evaluate(() => JSON.parse(JSON.stringify(window.cranes?.messageParams ?? {})))

const results = []
const shot = async (name) => {
    const buf = await display.screenshot({ path: `${OUT}/${name}.png` })
    return buf
}

const before = await shot('display-00-baseline')

// ── test each look fader in turn ─────────────────────────────────────────
const TESTS = [
    ['ZOOM', -0.35, 'navZoom'],
    ['COLOUR', 0.4, 'paletteShift'],
    ['WARP', 0.6, 'warpGrow'],
    ['PAN X', 0.3, 'navX'],
]

let prev = before
let i = 1
for (const [label, frac, key] of TESTS) {
    await dragFader(label, frac)
    const params = await readDisplayParams()
    const buf = await shot(`display-${String(i).padStart(2, '0')}-${key}`)
    const d = await diff(prev, buf)
    results.push({ fader: label, uniform: key, valueOnDisplay: params[key], pixelDiff: +d.toFixed(2) })
    prev = buf
    i++
}

// ── music channels: TAKE OVER then push GLOW/BASS ────────────────────────
await phone.locator('#manual-toggle').click()
await phone.waitForTimeout(400)
await dragFader('GLOW', 0.45)
await dragFader('BASS', 0.45)
const paramsAudio = await readDisplayParams()
const bufAudio = await shot(`display-${String(i).padStart(2, '0')}-audio-takeover`)
results.push({
    fader: 'TAKE OVER + GLOW/BASS',
    uniform: 'quietGate/energySpring/waveletBassSpring',
    valueOnDisplay: `${paramsAudio.quietGate}/${paramsAudio.energySpring?.toFixed?.(2)}/${paramsAudio.waveletBassSpring?.toFixed?.(2)}`,
    pixelDiff: +(await diff(prev, bufAudio)).toFixed(2),
})
prev = bufAudio
i++

// ── RELEASE should DELETE the keys, handing uniforms back ────────────────
await phone.locator('#release').click()
await phone.waitForTimeout(800)
const afterRelease = await readDisplayParams()
results.push({
    fader: 'RELEASE',
    uniform: 'keys remaining in messageParams',
    valueOnDisplay: JSON.stringify(afterRelease),
    pixelDiff: +(await diff(prev, await shot(`display-${String(i).padStart(2, '0')}-released`))).toFixed(2),
})
i++

// ── shader switching ─────────────────────────────────────────────────────
await phone.locator('.sbtn', { hasText: 'HORIZONS' }).click()
await phone.waitForTimeout(3500)
const bufHzn = await shot(`display-${String(i).padStart(2, '0')}-shader-horizons`)
const shaderNow = await display.evaluate(() => window.location.search)
results.push({ fader: 'SHADER → HORIZONS', uniform: 'display url', valueOnDisplay: shaderNow, pixelDiff: '—' })

await phone.locator('.sbtn', { hasText: 'MUTATE' }).click()
await phone.waitForTimeout(3500)
await shot('display-08-shader-vj-scratch')
const shaderNow2 = await display.evaluate(() => new URLSearchParams(location.search).get('shader'))
const compiled = await display.evaluate(() => (window.cranes?.shader || '').length)
results.push({ fader: 'SHADER → VJ (scratch)', uniform: 'shader param / code len', valueOnDisplay: `${shaderNow2} / ${compiled} chars`, pixelDiff: '—' })

await phone.screenshot({ path: `${OUT}/phone-controller-active.png`, fullPage: true })

console.log('\n=== RESULTS ===')
console.table(results)
console.log('\n=== phone console (last 15) ===')
console.log(plog.slice(-15).join('\n'))
console.log('\n=== display console (remote lines) ===')
console.log(dlog.filter((l) => /Remote|WS|error/i.test(l)).slice(-15).join('\n'))

await writeFile(`${OUT}/results.json`, JSON.stringify({ results, plog, dlog }, null, 2))
await browser.close()
