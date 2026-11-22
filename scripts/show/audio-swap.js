#!/usr/bin/env node
// Swap the show wall's audio input between the live mic and BlackHole.
//   node scripts/show/audio-swap.js mic|blackhole|toggle [--gain N]     (or: npm run audio -- mic --gain 6)
// In place (no reload) when the page exposes window.cranes.audioSource; otherwise it reloads the
// show page with ?audio_device= and ?audio_gain= swapped, which resets feature history but keeps the kiosk window.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SHOW = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'vj', 'show.js')
// The mic hears the room from the show Mac (often a car trunk), far quieter than a line feed.
const INPUTS = {
    mic: { label: 'MacBook Pro Microphone', param: 'MacBook', gain: 8 },
    blackhole: { label: 'BlackHole', param: 'BlackHole', gain: 1 },
}
const USAGE = 'usage: audio-swap.js mic|blackhole|toggle [--gain N]'

const usage = () => {
    console.error(USAGE)
    process.exit(2)
}

const parseArgs = argv => {
    const [mode, ...rest] = argv
    if (!['mic', 'blackhole', 'toggle'].includes(mode)) return usage()
    if (rest.length === 0) return { mode, gain: null }
    if (rest.length !== 2 || rest[0] !== '--gain') return usage()
    const gain = Number(rest[1])
    if (!(gain > 0)) return usage()
    return { mode, gain }
}

const show = (...args) => JSON.parse(execFileSync('node', [SHOW, ...args], { encoding: 'utf8' }).trim().split('\n').pop())
const evalPage = (fn, args = []) => show('eval', fn, JSON.stringify(args))

const which = label => Object.keys(INPUTS).find(k => label?.includes(INPUTS[k].label))

const currentLabel = () => evalPage('() => window.cranes.audioInputLabel ?? null')

const setGain = gain => evalPage(`(gain) => {
    window.cranes.inputGain.gain.value = gain
    const u = new URL(location.href); u.searchParams.set("audio_gain", String(gain)); history.replaceState({}, "", u)
    return gain
}`, [gain])

const swapInPlace = target => evalPage(`async (labelPart, param) => {
    const src = window.cranes.audioSource
    if (!src) return { inPlace: false }
    const devices = await navigator.mediaDevices.enumerateDevices()
    const device = devices.find(d => d.kind === "audioinput" && d.label.includes(labelPart))
    if (!device) return { error: "no input matching " + labelPart + "; inputs: " + devices.filter(d => d.kind === "audioinput").map(d => d.label).join(", ") }
    const oldStream = src.mediaStream
    const constraints = { ...oldStream.getAudioTracks()[0].getConstraints(), deviceId: { exact: device.deviceId } }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints })
    const next = window.cranes.audioContext.createMediaStreamSource(stream)
    next.connect(window.cranes.inputGain)
    src.disconnect()
    oldStream.getTracks().forEach(t => t.stop())
    window.cranes.audioSource = next
    window.cranes.audioInputLabel = stream.getAudioTracks()[0].label
    const u = new URL(location.href); u.searchParams.set("audio_device", param); history.replaceState({}, "", u)
    return { inPlace: true }
}`, [target.label, target.param])

const swapByReload = (target, gain) => {
    const { url } = show('status')
    const u = new URL(url)
    u.searchParams.set('audio_device', target.param)
    u.searchParams.set('audio_gain', String(gain))
    show('goto', u.toString())
}

const verify = (waitForBootMs) => evalPage(`async (bootMs) => {
    const t0 = performance.now()
    while (!window.cranes?.audioInputLabel || !window.cranes?.flattenFeatures) {
        if (performance.now() - t0 > bootMs) return { label: null, energy: 0 }
        await new Promise(r => setTimeout(r, 100))
    }
    const t1 = performance.now()
    let f = window.cranes.flattenFeatures()
    while (!(f.energy > 0) && performance.now() - t1 < 3000) {
        await new Promise(r => setTimeout(r, 100))
        f = window.cranes.flattenFeatures()
    }
    return { label: window.cranes.audioInputLabel, energy: f.energy, cs_presence: f.cs_presence ?? null, gain: window.cranes.inputGain?.gain.value ?? null }
}`, [waitForBootMs])

const fail = message => {
    console.error(message)
    process.exit(1)
}

const report = (prefix, status) => console.log(`${prefix} ${status.label} gain=${status.gain} energy=${status.energy} cs_presence=${status.cs_presence}`)

const main = () => {
    const { mode, gain: gainArg } = parseArgs(process.argv.slice(2))
    const label = currentLabel()
    const now = which(label)
    if (mode === 'toggle' && !now) return fail(`toggle: live input "${label}" is neither mic nor blackhole; run mic or blackhole explicitly`)
    const wanted = mode === 'toggle' ? (now === 'mic' ? 'blackhole' : 'mic') : mode
    const target = INPUTS[wanted]
    const gain = gainArg ?? target.gain
    if (now === wanted) {
        setGain(gain)
        const status = verify(0)
        report(`already on ${wanted}:`, status)
        if (!(status.energy > 0)) return fail(`no signal on ${status.label}`)
        return
    }
    const result = swapInPlace(target)
    if (result.error) return fail(result.error)
    if (result.inPlace) setGain(gain)
    if (!result.inPlace) {
        console.log('page has no window.cranes.audioSource (older build): reloading the show page')
        swapByReload(target, gain)
    }
    const status = verify(result.inPlace ? 0 : 15000)
    report(result.inPlace ? 'swapped in place ->' : 'reloaded ->', status)
    if (!status.label?.includes(target.label)) return fail(`live input is ${status.label}, wanted ${target.label}`)
    if (!(status.energy > 0)) return fail(`no signal on ${status.label} within 3 s`)
}

main()
