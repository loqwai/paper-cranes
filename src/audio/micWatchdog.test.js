import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { watchMic } from './micWatchdog.js'

// A mic the OS can take away: stop() ends the track the way Android does on a call or lock.
const makeStream = () => {
    const track = Object.assign(new EventTarget(), { readyState: 'live', muted: false })
    track.stop = vi.fn(() => {
        if (track.readyState === 'ended') return
        track.readyState = 'ended'
        track.dispatchEvent(new Event('ended'))
    })
    return { track, getAudioTracks: () => [track], getTracks: () => [track] }
}

let frozen
let probes
let connected
let audioContext
let inputGain
let getStream

const flush = () => vi.advanceTimersByTimeAsync(0)

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] })
    frozen = false
    probes = 0
    connected = new Set()
    globalThis.AnalyserNode = class {
        constructor() { this.fftSize = 32; probes++ }
        getFloatTimeDomainData(samples) { samples.fill(frozen ? 0 : Math.random()) }
    }
    const makeSource = (stream) => ({
        mediaStream: stream,
        connect() { connected.add(this) },
        disconnect() { connected.delete(this) },
    })
    audioContext = Object.assign(new EventTarget(), {
        state: 'running',
        resume: vi.fn(async () => { audioContext.state = 'running' }),
        createMediaStreamSource: makeSource,
    })
    inputGain = { connect: vi.fn() }
    getStream = vi.fn(async () => makeStream())
    globalThis.document = { hidden: false }
    globalThis.window = Object.assign(new EventTarget(), { cranes: {} })
    const first = makeSource(makeStream())
    first.connect()
    window.cranes.audioSource = first
    watchMic({ audioContext, inputGain, getStream })
})

afterEach(() => {
    vi.useRealTimers()
})

const currentTrack = () => window.cranes.audioSource.mediaStream.getAudioTracks()[0]

describe('watchMic', () => {
    it('resumes a context the OS suspended, without touching the mic', async () => {
        audioContext.state = 'suspended'
        audioContext.dispatchEvent(new Event('statechange'))
        await flush()
        expect(audioContext.resume).toHaveBeenCalledTimes(1)
        expect(getStream).not.toHaveBeenCalled()
    })

    it('resumes an interrupted context when the page becomes visible again', async () => {
        document.hidden = true
        audioContext.state = 'interrupted'
        await vi.advanceTimersByTimeAsync(5000)
        expect(audioContext.resume).not.toHaveBeenCalled()
        document.hidden = false
        window.dispatchEvent(new Event('visibilitychange'))
        await flush()
        expect(audioContext.resume).toHaveBeenCalledTimes(1)
    })

    it('replaces an ended mic track in front of inputGain and stops the old one', async () => {
        const old = window.cranes.audioSource
        old.mediaStream.track.stop()
        await flush()
        expect(getStream).toHaveBeenCalledTimes(1)
        expect(window.cranes.audioSource).not.toBe(old)
        expect([...connected]).toEqual([window.cranes.audioSource])
        expect(inputGain.connect).toHaveBeenCalledWith(window.cranes.audioSource)
    })

    it('re-acquires a frozen input while visible, never while hidden', async () => {
        frozen = true
        document.hidden = true
        await vi.advanceTimersByTimeAsync(10000)
        expect(getStream).not.toHaveBeenCalled()
        document.hidden = false
        await vi.advanceTimersByTimeAsync(3000)
        expect(getStream).toHaveBeenCalledTimes(1)
    })

    it('backs off on true silence: 60 s of frozen input costs at most 6 re-acquires', async () => {
        frozen = true
        await vi.advanceTimersByTimeAsync(60000)
        expect(getStream.mock.calls.length).toBeGreaterThanOrEqual(1)
        expect(getStream.mock.calls.length).toBeLessThanOrEqual(6)
        expect(connected.size).toBe(1)
    })

    it('20 recoveries leave one mic source, one probe and no live old tracks', async () => {
        const tracks = []
        for (let i = 0; i < 20; i++) {
            tracks.push(currentTrack())
            currentTrack().stop()
            await vi.advanceTimersByTimeAsync(3000)
        }
        expect(getStream).toHaveBeenCalledTimes(20)
        expect(connected.size).toBe(1)
        expect(probes).toBe(1)
        expect(tracks.every(t => t.readyState === 'ended')).toBe(true)
        expect(currentTrack().readyState).toBe('live')
    })
})
