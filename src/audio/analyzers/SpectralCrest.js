import { makeCalculateStats } from '../../utils/calculateStats'

let calculateStats = makeCalculateStats()

self.addEventListener('message', ({ data: e }) => {
    if (e.type === 'fftData') {
        let fftData = e.data.fft // Extract FFT data from message
        let computed = calculateSpectralCrest(fftData) // Compute spectral kurtosis
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

function calculateSpectralCrest(fftData) {
    // Find the maximum amplitude in the spectrum
    const maxAmplitude = Math.max(...fftData)

    // Calculate the sum of all amplitudes
    const sumAmplitudes = fftData.reduce((sum, amplitude) => sum + amplitude, 0)

    // Calculate the Spectral Crest
    const spectralCrest = sumAmplitudes !== 0 ? maxAmplitude / sumAmplitudes : 0

    return spectralCrest
}
