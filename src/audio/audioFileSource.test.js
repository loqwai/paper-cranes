import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAudioFileSource, initAudioFromFile } from './audioFileSource.js'

describe('createAudioFileSource', () => {
  describe('with no audio_file param', () => {
    let result

    beforeEach(() => {
      const params = new URLSearchParams('')
      result = createAudioFileSource({ params })
    })

    it('returns null', () => {
      expect(result).toBeNull()
    })
  })

  describe('with audio_file param', () => {
    let result

    beforeEach(() => {
      const params = new URLSearchParams('?audio_file=test-audio/song.mp3')
      result = createAudioFileSource({ params })
    })

    it('returns the audio file path as src', () => {
      expect(result.src).toBe('test-audio/song.mp3')
    })

    it('defaults startTime to 0', () => {
      expect(result.startTime).toBe(0)
    })

    it('sets loop to true', () => {
      expect(result.loop).toBe(true)
    })

    it('defaults historySize to 500', () => {
      expect(result.historySize).toBe(500)
    })

    it('defaults fftSize to 4096', () => {
      expect(result.fftSize).toBe(4096)
    })

    it('defaults smoothing to 0.85', () => {
      expect(result.smoothing).toBe(0.85)
    })
  })

  describe('with a different audioFile path', () => {
    let result

    beforeEach(() => {
      const params = new URLSearchParams('?audio_file=test-audio/other.mp3')
      result = createAudioFileSource({ params })
    })

    it('uses the actual path, not a hardcode', () => {
      expect(result.src).toBe('test-audio/other.mp3')
    })
  })

  describe('with audio_time param', () => {
    let result

    beforeEach(() => {
      const params = new URLSearchParams('?audio_file=test-audio/song.mp3&audio_time=27.5')
      result = createAudioFileSource({ params })
    })

    it('parses audio_time as startTime', () => {
      expect(result.startTime).toBe(27.5)
    })
  })

  describe('with overridden audio processor params', () => {
    let result

    beforeEach(() => {
      const params = new URLSearchParams('?audio_file=test-audio/song.mp3&history_size=1000&fft_size=8192&smoothing=0.5')
      result = createAudioFileSource({ params })
    })

    it('overrides historySize', () => {
      expect(result.historySize).toBe(1000)
    })

    it('overrides fftSize', () => {
      expect(result.fftSize).toBe(8192)
    })

    it('overrides smoothing', () => {
      expect(result.smoothing).toBe(0.5)
    })
  })
})

const makeMockAudioBuffer = () => ({
  duration: 466.78,
  sampleRate: 48000,
  numberOfChannels: 2,
})

const makeMockSourceNode = () => ({
  buffer: null,
  loop: false,
  loopStart: 0,
  loopEnd: 0,
  start: vi.fn(),
  connect: vi.fn(),
})

const makeMockAudioContext = (sourceNode) => ({
  resume: vi.fn(() => Promise.resolve()),
  decodeAudioData: vi.fn(() => Promise.resolve(makeMockAudioBuffer())),
  createBufferSource: vi.fn(() => sourceNode ?? makeMockSourceNode()),
})

describe('initAudioFromFile', () => {
  describe('when loading audio from a file', () => {
    let sourceNode
    let audioContext
    let result

    beforeEach(async () => {
      sourceNode = makeMockSourceNode()
      audioContext = makeMockAudioContext(sourceNode)
      globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }))

      result = await initAudioFromFile({
        config: { src: 'test-audio/song.mp3', startTime: 27.5, loop: true },
        audioContext,
      })
    })

    it('resumes the audio context', () => {
      expect(audioContext.resume).toHaveBeenCalled()
    })

    it('fetches the audio file', () => {
      expect(globalThis.fetch).toHaveBeenCalledWith('test-audio/song.mp3')
    })

    it('decodes the fetched data', () => {
      expect(audioContext.decodeAudioData).toHaveBeenCalled()
    })

    it('creates a buffer source', () => {
      expect(audioContext.createBufferSource).toHaveBeenCalled()
    })

    it('sets loop on the source node', () => {
      expect(sourceNode.loop).toBe(true)
    })

    it('starts playback at the configured offset', () => {
      expect(sourceNode.start).toHaveBeenCalledWith(0, 27.5)
    })

    it('returns the source node', () => {
      expect(result.sourceNode).toBe(sourceNode)
    })

    it('returns the decoded audio buffer', () => {
      expect(result.audioBuffer.duration).toBe(466.78)
    })

    it('returns a startSource function for re-seeking', () => {
      expect(typeof result.startSource).toBe('function')
    })
  })

  describe('when fetch returns a non-ok response', () => {
    let audioContext

    beforeEach(() => {
      audioContext = makeMockAudioContext()
      globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' }))
    })

    it('throws with the status', async () => {
      await expect(initAudioFromFile({
        config: { src: 'test-audio/nope.mp3', startTime: 0, loop: true },
        audioContext,
      })).rejects.toThrow('Failed to fetch audio: 404 Not Found')
    })
  })
})
