export const createAudioFileSource = ({ params }) => {
  const audioFile = params.get('audio_file')
  if (!audioFile) return null
  const startTime = parseFloat(params.get('audio_time') ?? '0')
  const historySize = parseInt(params.get('history_size') ?? '500')
  const fftSize = parseInt(params.get('fft_size') ?? '4096')
  const smoothing = parseFloat(params.get('smoothing') ?? '0.15')

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
  if (!resp.ok) throw new Error(`Failed to fetch audio: ${resp.status} ${resp.statusText}`)
  const arrayBuffer = await resp.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const startSource = (offset = config.startTime) => {
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.loop = config.loop
    source.loopStart = 0
    source.loopEnd = audioBuffer.duration
    // start() throws on a negative or non-finite offset, which used to leave the
    // page with no audio at all (?audio_time=-5, =abc, or empty). Start at 0.
    source.start(0, Number.isFinite(offset) && offset > 0 ? offset : 0)
    return source
  }

  // Resume context (may need user gesture — don't block on it)
  audioContext.resume()

  const sourceNode = startSource()
  return { sourceNode, audioBuffer, startSource }
}
