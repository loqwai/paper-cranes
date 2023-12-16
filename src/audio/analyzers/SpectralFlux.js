let previousSignal = null

function calculateSpectralFlux (currentSignal) {
    if (!previousSignal) {
        previousSignal = currentSignal
        return 0 // Or handle the first frame differently
    }

    let sf = 0
    for (let i = 0; i < currentSignal.length; i++) {
        const diff = Math.abs(currentSignal[i]) - Math.abs(previousSignal[i])
        sf += (diff + Math.abs(diff)) / 2
    }

    // Update the previous signal for the next call
    previousSignal = currentSignal

    return sf
}

onmessage = function (event) {
    const spectralFlux = calculateSpectralFlux(event.data)
    postMessage(spectralFlux)
}
