/**  */
self.addEventListener('message', async ({ data: e }) => {
  try {
    switch (e.data.type) {
      case 'config': return configure(e.data)
      case 'fftData': return processFftData(e.data)
      default: throw new Error(`Unknown message type: ${e.data.type}`)
    }
  } catch (error) {
    self.postMessage({ error: error.message })
  }
})

const setupAnalyzer = async () => {
  const {analyzerName, historySize} = self
  if(!analyzerName) throw new Error('Analyzer name is required')
  if(!historySize) throw new Error('History size is required')

  const hypnosound = await import('hypnosound')
  const analyzer = hypnosound[analyzerName]
  if (!analyzer) throw new Error(`Analyzer ${analyzerName} not found`)

  const makeCalculateStats = hypnosound.makeCalculateStats
  self.calculateStats = makeCalculateStats(historySize)
  self.analyzer = analyzer
}

const configure = async ({historySize, analyzerName}) => {
  self.analyzerName = analyzerName ?? self.analyzerName
  self.historySize = historySize ?? self.historySize
  await setupAnalyzer()
}

const processFftData = async ({fft, id}) => {
  if(!self.analyzer) throw new Error('Analyzer not initialized')

    const value = self.analyzer(fft, self.previousSignal)
  self.previousSignal = fft

  self.postMessage({
    id,
    type: 'computedValue',
    value,
    stats: self.calculateStats(value)
  })
}

