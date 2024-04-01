import { makeCalculateStats, spectralRolloff } from 'hypnosound'

let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        const { fft } = e.data // Extract FFT data from message
        const value = spectralRolloff(fft) // Compute spectral rolloff
        self.postMessage({ type: 'computedValue', value, stats: calculateStats(value) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
    }
})

// Calculate Spectral Rolloff
function calculateSpectralRolloff(fftData, threshold = 0.85) {
    let totalEnergy = fftData.reduce((acc, val) => acc + val, 0)
    let energyThreshold = totalEnergy * threshold
    let cumulativeEnergy = 0

    for (let i = 0; i < fftData.length; i++) {
        cumulativeEnergy += fftData[i]
        if (cumulativeEnergy >= energyThreshold) {
            return i / fftData.length // Normalized rolloff frequency
        }
    }

    return 0 // In case the threshold is not met
}
