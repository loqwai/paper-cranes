function mu (i, amplitudeSpect) {
    let numerator = 0
    let denominator = 0

    for (let k = 0; k < amplitudeSpect.length; k++) {
        numerator += Math.pow(k, i) * Math.abs(amplitudeSpect[k])
        denominator += amplitudeSpect[k]
    }

    if (denominator === 0) return 0 // Prevent division by zero
    return numerator / denominator
}

function calculateSpectralSpread (fftData, sampleRate, fftSize) {
    const meanFrequency = mu(1, fftData, sampleRate, fftSize)
    const secondMoment = mu(2, fftData, sampleRate, fftSize)

    return Math.sqrt(secondMoment - Math.pow(meanFrequency, 2))
}

onmessage = function (event) {
    const spectralSpread = calculateSpectralSpread(event.data)
    postMessage(spectralSpread)
}
