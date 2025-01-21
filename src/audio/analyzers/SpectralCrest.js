import { makeCalculateStats, spectralCrest } from 'hypnosound'

let state = {
    calculateStats: makeCalculateStats()
}

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        const { fft } = e.data // Extract FFT data from message
        const value = spectralCrest(fft) // Compute spectral kurtosis
        self.postMessage({id: e.id, type: 'computedValue', value, stats: state.calculateStats(value) })
    }
    if (e.type === 'config') {
        state.calculateStats = makeCalculateStats(e.historySize)
    }
})
