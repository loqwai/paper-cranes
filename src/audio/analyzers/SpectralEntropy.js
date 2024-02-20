import { makeCalculateStats } from '../../utils/calculateStats'

let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message
        let computed = calculateSpectralEntropy(fftData) // Compute spectral kurtosis
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

function toPowerSpectrum(fftData) {
    return fftData.map((amplitude) => Math.pow(amplitude, 2))
}

function calculateSpectralEntropy(fftData) {
    const powerSpectrum = toPowerSpectrum(fftData)

    // Normalize the power spectrum to create a probability distribution
    const totalPower = powerSpectrum.reduce((sum, val) => sum + val, 0)
    const probabilityDistribution = powerSpectrum.map((val) => val / totalPower)

    // Calculate the entropy
    const entropy = probabilityDistribution.reduce((sum, prob) => {
        return prob > 0 ? sum - prob * Math.log(prob) : sum
    }, 0)

    return entropy / Math.log(probabilityDistribution.length)
}
