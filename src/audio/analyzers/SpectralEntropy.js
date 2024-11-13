import { makeCalculateStats, spectralEntropy } from 'hypnosound'

const WINDOW_SIZE = 5
let previousValues = []
let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        const { fft } = e.data // Extract FFT data from message
        const value = spectralEntropy(fft) // Compute spectral kurtosis
        previousValues.push(value)
        if (previousValues.length > WINDOW_SIZE) {
            previousValues.shift()
        }
        self.postMessage({ type: 'computedValue', value, stats: calculateStats(value) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
    }
})
