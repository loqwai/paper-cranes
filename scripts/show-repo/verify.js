#!/usr/bin/env node
// Load a show page in headless Chromium and check it is ready for a wall:
//   the shader renders (frames advance, the picture is not black), the controller chain runs,
//   MIDI started, a knob move reaches the URL, nothing but the canvas is visible, and the
//   console stayed clean.
//
//   node scripts/show-repo/verify.js <url> [--shot <png>] [--expect-shader <path>]
//
// Exits 1 when any check fails. Prints one JSON report. Fake mic + granted MIDI permission, so the
// audio pipeline and MIDI really start; no MIDI device is needed (no inputs is still "started").
import { chromium } from 'playwright'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

const LAUNCH_ARGS = [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
]

// Fraction of sampled screenshot pixels brighter than near-black, measured in the page itself.
const brightFraction = async (browser, png) => {
    const page = await browser.newPage()
    const value = await page.evaluate(async (b64) => {
        const img = new Image()
        img.src = `data:image/png;base64,${b64}`
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const { data } = ctx.getImageData(0, 0, c.width, c.height)
        let lit = 0
        let n = 0
        for (let i = 0; i < data.length; i += 4 * 97) {
            n++
            if (data[i] + data[i + 1] + data[i + 2] > 30) lit++
        }
        return lit / n
    }, png.toString('base64'))
    await page.close()
    return value
}

export const verifyShow = async (url, { shot, expectShader, settleMs = 4000 } = {}) => {
    const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS })
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    await context.grantPermissions(['midi', 'microphone'], { origin: new URL(url).origin })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

    try {
        await page.goto(url, { waitUntil: 'load' })
        await page.waitForFunction(() => window.cranes?.frameCount > 30, null, { timeout: 30000 })
        await page.waitForFunction(() => window.cranes?.midiAccess, null, { timeout: 10000 }).catch(() => {})
        await page.waitForTimeout(settleMs)

        const state = await page.evaluate(() => {
            const visible = [...document.body.querySelectorAll('*')]
                .filter((el) => !['CANVAS', 'SCRIPT', 'STYLE', 'LINK', 'TEMPLATE'].includes(el.tagName))
                .filter((el) => {
                    const r = el.getBoundingClientRect()
                    const s = getComputedStyle(el)
                    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0'
                })
                .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`)
            return {
                search: window.location.search,
                frameCount: window.cranes.frameCount,
                midiStarted: Boolean(window.cranes.midiAccess),
                midiMapper: typeof window.cranes.midiMapper?.mapCCToKnob === 'function',
                controllerKeys: Object.keys(window.cranes.controllerFeatures ?? {}).length,
                audioInput: window.cranes.audioInputLabel ?? null,
                visibleUi: visible,
                title: document.title,
            }
        })

        // A knob move from MIDI goes cranes.updateFeature -> paramsManager -> URL (debounced).
        await page.evaluate(() => window.cranes.updateFeature('knob_3', 0.5))
        await page.waitForTimeout(1500)
        const knobInUrl = await page.evaluate(() => new URLSearchParams(window.location.search).get('knob_3'))
        const framesLater = await page.evaluate(() => window.cranes.frameCount)

        const png = await page.screenshot({ path: shot })
        const bright = await brightFraction(browser, png)
        const shader = new URLSearchParams(state.search).get('shader')

        const checks = {
            rendering: framesLater > state.frameCount,
            notBlack: bright > 0.05,
            shader: expectShader ? shader === expectShader : Boolean(shader),
            controller: state.controllerKeys > 0,
            midi: state.midiStarted && state.midiMapper,
            knobReachesUrl: knobInUrl === '0.5',
            noUi: state.visibleUi.length === 0,
            cleanConsole: consoleErrors.length === 0,
        }
        return {
            ok: Object.values(checks).every(Boolean),
            url,
            checks,
            shader,
            frames: framesLater,
            brightFraction: Number(bright.toFixed(3)),
            controllerKeys: state.controllerKeys,
            audioInput: state.audioInput,
            visibleUi: state.visibleUi,
            consoleErrorCount: consoleErrors.length,
            consoleErrors,
            title: state.title,
            screenshot: shot ?? null,
        }
    } finally {
        await browser.close()
    }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isMain) {
    const args = process.argv.slice(2)
    const url = args.find((a) => !a.startsWith('--'))
    const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
    if (!url) {
        console.error('usage: verify.js <url> [--shot <png>] [--expect-shader <path>]')
        process.exit(2)
    }
    const report = await verifyShow(url, { shot: opt('--shot'), expectShader: opt('--expect-shader') })
    console.log(JSON.stringify(report, null, 2))
    process.exit(report.ok ? 0 : 1)
}
