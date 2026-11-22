#!/usr/bin/env node
// Swap the show wall's audio input between the live mic and BlackHole.
//   node scripts/show/audio-swap.js mic|blackhole|toggle     (or: npm run audio -- mic)
// In place (no reload) when the page exposes window.cranes.audioSource; otherwise it reloads the
// show page with ?audio_device= swapped, which resets feature history but keeps the kiosk window.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SHOW = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'vj', 'show.js')
const INPUTS = {
    mic: { label: 'MacBook Pro Microphone', param: 'MacBook' },
    blackhole: { label: 'BlackHole', param: 'BlackHole' },
}

const show = (...args) => JSON.parse(execFileSync('node', [SHOW, ...args], { encoding: 'utf8' }).trim().split('\n').pop())
const evalPage = (fn, args = []) => show('eval', fn, JSON.stringify(args))

const which = label => Object.keys(INPUTS).find(k => label?.includes(INPUTS[k].label))

const currentLabel = () => evalPage('() => window.cranes.audioInputLabel ?? null')

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

const swapByReload = target => {
    const { url } = show('status')
    const u = new URL(url)
    u.searchParams.set('audio_device', target.param)
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
    return { label: window.cranes.audioInputLabel, energy: f.energy, cs_presence: f.cs_presence ?? null }
}`, [waitForBootMs])

const main = () => {
    const arg = process.argv[2]
    if (!['mic', 'blackhole', 'toggle'].includes(arg)) throw new Error('usage: audio-swap.js mic|blackhole|toggle')
    const now = which(currentLabel())
    const wanted = arg === 'toggle' ? (now === 'mic' ? 'blackhole' : 'mic') : arg
    if (now === wanted) {
        const status = verify(0)
        console.log(`already on ${wanted}: ${status.label} energy=${status.energy} cs_presence=${status.cs_presence}`)
        if (!(status.energy > 0)) process.exit(1)
        return
    }
    const target = INPUTS[wanted]
    const result = swapInPlace(target)
    if (result.error) throw new Error(result.error)
    if (!result.inPlace) {
        console.log('page has no window.cranes.audioSource (older build): reloading the show page')
        swapByReload(target)
    }
    const status = verify(result.inPlace ? 0 : 15000)
    console.log(`${result.inPlace ? 'swapped in place' : 'reloaded'} -> ${status.label} energy=${status.energy} cs_presence=${status.cs_presence}`)
    if (!status.label?.includes(target.label)) throw new Error(`live input is ${status.label}, wanted ${target.label}`)
    if (!(status.energy > 0)) throw new Error(`no signal on ${status.label} within 3 s`)
}

main()
