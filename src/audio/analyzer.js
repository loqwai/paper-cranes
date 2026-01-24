/**  */
self.addEventListener('message', async ({ data: e }) => {
  try {
    switch (e.type) {
      case 'config': return configure(e)
      case 'fftData': return processFftData(e)
      default: throw new Error(`Unknown message type: ${e.type}`)
    }
  } catch (error) {
    console.error('Error in analyzer', error)
    self.postMessage({ error: error.message })
  }
})

async function setupAnalyzer() {

  const {analyzerName, historySize} = self
  if(!analyzerName) throw new Error('Analyzer name is required')
  if(!historySize) throw new Error('History size is required')

  const {default: analyzer} = await import(/* @vite-ignore */ `https://esm.sh/hypnosound@1.9.0/src/audio/${analyzerName}.js`)

  if (!analyzer) throw new Error(`Analyzer ${analyzerName} not found`)

  const { makeCalculateStats } = await import('https://esm.sh/hypnosound@1.9.0/src/utils/calculateStats.js')

  self.calculateStats = makeCalculateStats(historySize)
  self.analyzer = analyzer
}

async function configure(e) {
  self.analyzerName = e.data.analyzerName ?? self.analyzerName
  self.historySize = e.data.historySize ?? self.historySize
  await setupAnalyzer()
}

function processFftData(e) {
  if(!self.analyzer) return

  const value = self.analyzer(e.data.fft, self.previousSignal)
  self.previousSignal = e.data.fft

  self.postMessage({
    id: e.id,
    type: 'computedValue',
    value,
    stats: self.calculateStats(value)
  })
}

