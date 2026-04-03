export const createAudioFileSource = ({ params }) => {
  const audioFile = params.get('audio_file')
  if (!audioFile) return null
  const startTime = parseFloat(params.get('audioTime') ?? '0')
  const historySize = parseInt(params.get('history_size') ?? '500')
  const fftSize = parseInt(params.get('fft_size') ?? '4096')
  const smoothing = parseFloat(params.get('smoothing') ?? '0.85')

  return {
    src: audioFile,
    startTime,
    loop: true,
    historySize,
    fftSize,
    smoothing,
  }
}

export const initAudioFromFile = async ({ config, audioContext }) => {
  const resp = await fetch(config.src)
  const arrayBuffer = await resp.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const startSource = (offset = config.startTime) => {
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.loop = config.loop
    source.loopStart = 0
    source.loopEnd = audioBuffer.duration
    source.start(0, offset)
    return source
  }

  // Resume context (may need user gesture — don't block on it)
  audioContext.resume()

  const sourceNode = startSource()
  return { sourceNode, audioBuffer, startSource }
}
