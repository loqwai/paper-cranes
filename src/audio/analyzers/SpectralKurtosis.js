importScripts('../../../utils/calculateStats.js') // I have to put it here because I'm using webpack

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message
        let computed = calculateSpectralKurtosis(fftData) // Compute spectral kurtosis
        if (computed === null) return
        self.postMessage({ type: 'computedValue', value: computed, stats: calculateStats(computed) })
    }
    if (e.type === 'config') {
        historySize = e.config.historySize
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

function calculateSpectralKurtosis(fftData) {
    const mean = mu(1, fftData)
    const secondMoment = mu(2, fftData)
    const variance = secondMoment - Math.pow(mean, 2)

    let fourthMoment = 0
    for (let i = 0; i < fftData.length; i++) {
        fourthMoment += Math.pow(fftData[i] - mean, 4)
    }
    fourthMoment /= fftData.length

    // Normalize the fourth moment with variance squared
    const kurtosis = variance ? fourthMoment / Math.pow(variance, 2) - 3 : 0
    return kurtosis
}
