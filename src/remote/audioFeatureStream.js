import { WebSocketClient } from './WebSocketClient.js'

const MESSAGE_TYPE = 'audio-features'

// ?audio=remote on the display: no mic, features arrive from a machine running ?audio_send=true.
export const setupRemoteAudio = () => {
  let latest = {}
  const client = new WebSocketClient(({ type, data }) => {
    if (type === MESSAGE_TYPE) latest = data
  })
  client.connect()
  return { getFeatures: () => latest }
}

// ?audio_send=true on the machine with the mic: wraps its audio source and broadcasts every frame.
export const withAudioFeatureSender = (audio) => {
  const client = new WebSocketClient()
  client.connect()
  return {
    ...audio,
    getFeatures: () => {
      const features = audio.getFeatures()
      if (client.isConnected) client.send(MESSAGE_TYPE, features)
      return features
    },
  }
}
