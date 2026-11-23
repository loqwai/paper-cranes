#!/usr/bin/env node
// Load a show page in headless Chromium and check it is ready for a wall:
//   the shader renders (frames advance, the picture is not black), the controller chain runs,
//   MIDI started, a knob move reaches the URL, nothing but the canvas is visible, and the
//   console stayed clean.
//
//   node scripts/show-repo/verify.js <url> [--shot <png>] [--expect-shader <path>] [--real-midi]
//
// Exits 1 when any check fails. Prints one JSON report. A fake mic feeds the real audio pipeline.
// MIDI: by default a fake input ("verify-midi") replaces navigator.requestMIDIAccess and sends one CC,
// so the whole path runs (src/midi.js -> MidiMapper auto-assign -> knob -> URL) on machines with no
// MIDI backend (WSL, CI). --real-midi uses the browser's own Web MIDI instead.
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

// Generous on purpose: these bound a wait for progress, they are not how long a check takes.
const BOOT_TIMEOUT_MS = 90000
const PROGRESS_TIMEOUT_MS = 20000
const SCREENSHOT_TIMEOUT_MS = 60000

// Runs in the page before any script: a MIDIAccess with one input the test can play.
const installFakeMidi = () => {
    class FakeInput extends EventTarget {
        constructor() { super(); this.name = 'verify-midi'; this.type = 'input'; this.state = 'connected' }
        open() { return Promise.resolve(this) }
    }
    const input = new FakeInput()
    const access = Object.assign(new EventTarget(), { inputs: new Map([['verify-midi', input]]), outputs: new Map(), sysexEnabled: false })
    navigator.requestMIDIAccess = () => Promise.resolve(access)
    window.__verifyMidiCC = (cc, value, channel = 1) => {
        const event = new Event('midimessage')
        event.data = new Uint8Array([0xb0 + channel - 1, cc, value])
        input.dispatchEvent(event)
    }
}

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

export const verifyShow = async (url, { shot, expectShader, realMidi = false, settleMs = 4000 } = {}) => {
    const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS })
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    await context.grantPermissions(['midi', 'microphone'], { origin: new URL(url).origin })
    if (!realMidi) await context.addInitScript(installFakeMidi)
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`))

    try {
        await page.goto(url, { waitUntil: 'load', timeout: BOOT_TIMEOUT_MS })
        await page.waitForFunction(() => window.cranes?.frameCount > 30, null, { timeout: BOOT_TIMEOUT_MS })
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

        // Each wait below is for progress, not a fixed window: on a loaded machine (CI, or a box
        // running a fleet of agents) SwiftShader can drop to a few frames a second, and a good show
        // must not fail verify for being slow.
        const advanced = (fn, arg) => page.waitForFunction(fn, arg, { timeout: PROGRESS_TIMEOUT_MS }).then(() => true, () => false)

        // One CC through the real MIDI handler: an unmapped CC auto-assigns to the next free knob,
        // value 64 reads as an absolute encoder (64/127), and paramsManager mirrors it into the URL
        // (debounced).
        let knobInUrl = null
        if (!realMidi) {
            await page.evaluate(() => window.__verifyMidiCC(7, 64))
            await advanced(() => {
                const knob = window.cranes.midiMapper.mapCCToKnob('verify-midi', 7, 1)
                return knob && new URLSearchParams(window.location.search).has(knob)
            })
            knobInUrl = await page.evaluate(() => {
                const mapped = window.cranes.midiMapper.mapCCToKnob('verify-midi', 7, 1)
                return mapped && { knob: mapped, url: new URLSearchParams(window.location.search).get(mapped) }
            })
        }
        const rendering = await advanced((before) => window.cranes.frameCount > before, state.frameCount)
        const framesLater = await page.evaluate(() => window.cranes.frameCount)

        const png = await page.screenshot({ path: shot, timeout: SCREENSHOT_TIMEOUT_MS })
        const bright = await brightFraction(browser, png)
        const shader = new URLSearchParams(state.search).get('shader')

        const checks = {
            rendering,
            notBlack: bright > 0.05,
            shader: expectShader ? shader === expectShader : Boolean(shader),
            controller: state.controllerKeys > 0,
            midi: state.midiStarted && state.midiMapper,
            midiCcReachesUrl: realMidi || Math.abs(parseFloat(knobInUrl?.url) - 64 / 127) < 0.001,
            noUi: state.visibleUi.length === 0,
            cleanConsole: consoleErrors.length === 0,
        }
        return {
            ok: Object.values(checks).every(Boolean),
            url,
            checks,
            shader,
            addressBar: state.search,
            frames: framesLater,
            brightFraction: Number(bright.toFixed(3)),
            controllerKeys: state.controllerKeys,
            midiSource: realMidi ? 'browser Web MIDI' : 'fake input verify-midi',
            midiCc: knobInUrl,
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
    const report = await verifyShow(url, { shot: opt('--shot'), expectShader: opt('--expect-shader'), realMidi: args.includes('--real-midi') })
    console.log(JSON.stringify(report, null, 2))
    process.exit(report.ok ? 0 : 1)
}
