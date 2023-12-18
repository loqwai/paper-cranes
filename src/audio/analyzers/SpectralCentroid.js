class SpectralCentroidProcessor extends AudioWorkletProcessor {
    constructor() {
        super()
        this.port.addEventListener('message', (event) => {
            this.port.postMessage({ wrapped: event.data })
            this.calculateSpectralCentroid(event.data.fftData)
        })
        this.port.start()
    }

    process(inputs, outputs) {
        return true
        if (inputs.length === 0) return true
        const input = inputs[0][0]
        const output = outputs ? outputs[0][0] : []

        const spectralCentroid = this.calculateSpectralCentroid(input)
        output[0] = spectralCentroid
        this.port.postMessage({ value: spectralCentroid })

        return true
    }

    mu(i, amplitudeSpect) {
        let numerator = 0
        let denominator = 0

        for (let k = 0; k < amplitudeSpect.length; k++) {
            numerator += Math.pow(k, i) * Math.abs(amplitudeSpect[k])
            denominator += amplitudeSpect[k]
        }

        if (denominator === 0) return 0 // Prevent division by zero
        return numerator / denominator
    }

    calculateSpectralCentroid(ampSpectrum) {
        return this.mu(1, ampSpectrum)
    }
}

registerProcessor('spectralCentroid', SpectralCentroidProcessor)
