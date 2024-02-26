import { makeCalculateStats } from '../../utils/calculateStats'

let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message
        let computed = calculateSpectralCentroid(fftData) // Process FFT data
        computed *= 1.5
        if (computed === null) return
        self.postMessage({ type: 'computedValue', value: computed, stats: calculateStats(computed) })
    }
    if (e.type === 'config') {
        calculateStats = makeCalculateStats(e.config.historySize)
    }
})

function mu(i, amplitudeSpect) {
    let numerator = 0
    let denominator = 0

    for (let k = 0; k < amplitudeSpect.length; k++) {
        numerator += Math.pow(k, i) * Math.abs(amplitudeSpect[k])
        denominator += amplitudeSpect[k]
    }

    if (denominator === 0) return null // Prevent division by zero
    return numerator / denominator
}

function calculateSpectralCentroid(ampSpectrum) {
    const centroid = mu(1, ampSpectrum)
    if (centroid === null) return null

    // Maximum centroid occurs when all energy is at the highest frequency bin
    const maxCentroid = mu(
        1,
        ampSpectrum.map((val, index) => (index === ampSpectrum.length - 1 ? 1 : 0)),
    )
    return centroid / maxCentroid // Normalize the centroid
}
