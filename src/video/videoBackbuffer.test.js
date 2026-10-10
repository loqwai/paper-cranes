import { describe, it, expect } from 'vitest'
import { watchVideoFrames } from './videoBackbuffer.js'

const fakeVideo = () => {
    const pending = []
    return {
        requestVideoFrameCallback: (cb) => pending.push(cb),
        decode: () => pending.splice(0).forEach(cb => cb()),
        pending,
    }
}

describe('watchVideoFrames', () => {
    it('is fresh once at the start', () => {
        const frames = watchVideoFrames(fakeVideo())
        expect(frames.take()).toBe(true)
        expect(frames.take()).toBe(false)
    })

    it('is fresh exactly once per decoded frame', () => {
        const video = fakeVideo()
        const frames = watchVideoFrames(video)
        frames.take()
        video.decode()
        expect(frames.take()).toBe(true)
        expect(frames.take()).toBe(false)
        video.decode()
        video.decode()
        expect(frames.take()).toBe(true)
        expect(frames.take()).toBe(false)
    })

    it('keeps a single callback armed', () => {
        const video = fakeVideo()
        watchVideoFrames(video)
        video.decode()
        video.decode()
        expect(video.pending).toHaveLength(1)
    })

    it('is always fresh without requestVideoFrameCallback', () => {
        const frames = watchVideoFrames({})
        expect([frames.take(), frames.take()]).toEqual([true, true])
    })
})
