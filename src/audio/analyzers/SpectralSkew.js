import { makeCalculateStats, spectralSkew } from 'hypnosound'

let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        const { fft } = e.data // Extract FFT data from message
        const value = spectralSkew(fft) // Compute spectral skewness
        self.postMessage({id: e.id, type: 'computedValue', value, stats: calculateStats(value) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
    }
})
