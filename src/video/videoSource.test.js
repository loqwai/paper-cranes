import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseVideoMix, openVideoInput } from './videoSource.js'

describe('parseVideoMix', () => {
    it('defaults to 1 when missing', () => expect(parseVideoMix(null)).toBe(1))
    it('defaults to 1 when undefined', () => expect(parseVideoMix(undefined)).toBe(1))
    it('defaults to 1 when empty', () => expect(parseVideoMix('')).toBe(1))
    it('reads a value inside 0..1', () => expect(parseVideoMix('0.5')).toBe(0.5))
    it('accepts 0', () => expect(parseVideoMix('0')).toBe(0))
    it('accepts 1', () => expect(parseVideoMix('1')).toBe(1))
    it('throws above 1', () => expect(() => parseVideoMix('1.5')).toThrow(/video_mix "1.5"/))
    it('throws below 0', () => expect(() => parseVideoMix('-0.1')).toThrow(/video_mix/))
    it('throws on non-numeric', () => expect(() => parseVideoMix('lots')).toThrow(/video_mix "lots"/))
})

const fakeTrack = (label) => ({ label, stop: vi.fn(), addEventListener: vi.fn() })
const fakeStream = (label) => {
    const track = fakeTrack(label)
    return { getTracks: () => [track], getVideoTracks: () => [track] }
}
const camera = (label, deviceId) => ({ kind: 'videoinput', label, deviceId })
const mic = { kind: 'audioinput', label: 'Thunderwrench Mic', deviceId: 'mic' }

// Devices start with blank labels when `locked`, and gain them once any getUserMedia call succeeds.
const stubDevices = (devices, { locked = false } = {}) => {
    let granted = !locked
    const getUserMedia = vi.fn(async () => {
        granted = true
        return fakeStream('Rusty Conquistador Cam')
    })
    const enumerateDevices = vi.fn(async () => devices.map(d => ({ ...d, label: granted ? d.label : '' })))
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia, enumerateDevices } })
    return { getUserMedia, enumerateDevices }
}

describe('openVideoInput', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { cranes: {} })
        vi.stubGlobal('document', { createElement: () => ({ play: async () => {} }) })
    })
    afterEach(() => vi.unstubAllGlobals())

    const devices = [camera('FaceTime HD Camera', 'facetime'), camera('OBS Virtual Camera', 'obs'), mic]

    it('throws on an empty name', async () => {
        stubDevices(devices)
        await expect(openVideoInput('')).rejects.toThrow('video param is empty; use video=default or a label substring')
    })

    it('throws listing every camera label when nothing matches', async () => {
        const { getUserMedia } = stubDevices(devices)
        await expect(openVideoInput('Lair Cam')).rejects.toThrow('video "Lair Cam" not found; inputs: FaceTime HD Camera, OBS Virtual Camera')
        expect(getUserMedia).not.toHaveBeenCalled()
    })

    it('requests the exact device of a case-insensitive label match', async () => {
        const { getUserMedia } = stubDevices(devices)
        await openVideoInput('obs')
        expect(getUserMedia).toHaveBeenCalledTimes(1)
        expect(getUserMedia.mock.calls[0][0].video.deviceId).toEqual({ exact: 'obs' })
    })

    it('skips the permission probe when labels are already visible', async () => {
        const { getUserMedia } = stubDevices(devices)
        await openVideoInput('OBS')
        expect(getUserMedia.mock.calls.map(([c]) => c.video.deviceId)).toEqual([{ exact: 'obs' }])
    })

    it('probes for permission only when every label is blank, then matches', async () => {
        const { getUserMedia } = stubDevices(devices, { locked: true })
        await openVideoInput('OBS')
        expect(getUserMedia.mock.calls.map(([c]) => c.video)).toEqual([true, expect.objectContaining({ deviceId: { exact: 'obs' } })])
    })

    it('opens the OS default for default, without looking devices up', async () => {
        const { getUserMedia, enumerateDevices } = stubDevices(devices)
        await openVideoInput('default')
        expect(enumerateDevices).not.toHaveBeenCalled()
        expect(getUserMedia.mock.calls[0][0].video.deviceId).toBeUndefined()
    })

    it('records the opened track label', async () => {
        stubDevices(devices)
        await openVideoInput('default')
        expect(window.cranes.videoInputLabel).toBe('Rusty Conquistador Cam')
    })
})
