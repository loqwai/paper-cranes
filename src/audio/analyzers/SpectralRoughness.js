import { makeCalculateStats } from '../../utils/calculateStats'

const calculateStats = makeCalculateStats()

let lastFFtSize = 0
let maxSpread = 0

function mu(i, amplitudeSpect) {
    let numerator = 0
    let denominator = 0

    for (let k = 0; k < amplitudeSpect.length; k++) {
        numerator += Math.pow(k, i) * Math.abs(amplitudeSpect[k])
        denominator += amplitudeSpect[k]
    }

    if (denominator === 0) return 0 // Prevent division by zero
    return numerator / denominator
}

function calculateSpectralRoughness(fftData) {
    let roughness = 0

    for (let i = 1; i < fftData.length; i++) {
        // Calculate the difference in amplitude between adjacent frequency bins
        let diff = Math.abs(fftData[i] - fftData[i - 1])
        roughness += diff
    }

    return roughness
}

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message

        // Process FFT data for roughness
        let computedRoughness = calculateSpectralRoughness(fftData)
        self.postMessage({ type: 'computedValue', value: computedRoughness, stats: calculateStats(computedRoughness) })
    }
    if (e.type === 'config') {
        historySize = e.config.historySize
    }
})
