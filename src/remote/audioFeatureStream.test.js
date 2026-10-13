import { beforeEach, describe, expect, it, vi } from 'vitest'

const sockets = vi.hoisted(() => [])

vi.mock('./WebSocketClient.js', () => ({
  WebSocketClient: class {
    isConnected = true
    sent = []
    constructor(onMessage) {
      this.onMessage = onMessage
      sockets.push(this)
    }
    connect() {}
    send(type, data) {
      this.sent.push({ type, data })
    }
  },
}))

const { setupRemoteAudio, withAudioFeatureSender } = await import('./audioFeatureStream.js')

beforeEach(() => {
  sockets.length = 0
})

describe('setupRemoteAudio', () => {
  it('starts with no features', () => {
    expect(setupRemoteAudio().getFeatures()).toEqual({})
  })

  it('serves the latest audio-features message unchanged', () => {
    const audio = setupRemoteAudio()
    const features = { bass: 0.4, energyZScore: -0.2 }
    sockets[0].onMessage({ type: 'audio-features', data: features })
    expect(audio.getFeatures()).toBe(features)
  })

  it('ignores other message types', () => {
    const audio = setupRemoteAudio()
    sockets[0].onMessage({ type: 'update-params', data: { knob_1: 1 } })
    expect(audio.getFeatures()).toEqual({})
  })

  it.each([null, undefined, 'bass', 7, [1, 2]])('rejects payload %j and keeps the last good features', (bad) => {
    const audio = setupRemoteAudio()
    const good = { bass: 0.1 }
    sockets[0].onMessage({ type: 'audio-features', data: good })
    expect(() => sockets[0].onMessage({ type: 'audio-features', data: bad })).toThrow(TypeError)
    expect(audio.getFeatures()).toBe(good)
  })
})

describe('withAudioFeatureSender', () => {
  it('broadcasts each frame and returns the features untouched', () => {
    const features = { bass: 0.9 }
    const audio = withAudioFeatureSender({ getFeatures: () => features, extra: 'kept' })
    expect(audio.getFeatures()).toBe(features)
    expect(audio.extra).toBe('kept')
    expect(sockets[0].sent).toEqual([{ type: 'audio-features', data: features }])
  })

  it('does not send while disconnected', () => {
    const audio = withAudioFeatureSender({ getFeatures: () => ({ bass: 1 }) })
    sockets[0].isConnected = false
    audio.getFeatures()
    expect(sockets[0].sent).toEqual([])
  })
})
