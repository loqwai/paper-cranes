import { makeCalculateStats, spectralEntropy } from 'hypnosound'

let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fft = e.data.fft // Extract FFT data from message
        const value = spectralEntropy(fft) // Compute spectral kurtosis
        self.postMessage({ type: 'computedValue', value, stats: calculateStats(value) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
    }
})
