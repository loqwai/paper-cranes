class FftAnalyzer extends AudioWorkletProcessor {
    constructor() {
        super()
        this.port.addEventListener('message', (event) => {
            this.fftData = event.data.fftData
            // this.port.postMessage({ type: 'debug', fftData: this.fftData })
        })
        this.port.start()
    }

    /**
     * @param {Float32Array[]} inputs
     * @param {Float32Array[][]} outputs
     * @returns {boolean}
     */
    process(inputs, outputs) {
        // this.port.postMessage({ type: 'debug', fftData: this.fftData })
        if (!this.fftData) return true
        if (!outputs[0]) return true
        this.port.postMessage({ type: 'debug', outputs })
        for (const output of outputs) {
            for (const channel of output) {
                for (let i = 0; i < channel.length; i++) {
                    channel[i] = this.fftData[i]
                }
            }
        }

        return true
    }
}

registerProcessor('fft', FftAnalyzer)
