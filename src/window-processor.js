class WindowProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [] // Add any parameters you might need, like window type
    }

    constructor() {
        super()
    }

    process(inputs, outputs, parameters) {
        if (!inputs?.length || !inputs[0]?.length) {
            return true
        }
        const input = inputs[0]
        const output = outputs[0]

        // Guard against missing input
        if (!input || !input.length || !input[0] || !input[0].length) {
            return true
        }

        const windowLength = input[0].length
        // Guard against invalid window length
        if (windowLength <= 1) {
            // Copy input to output without windowing
            for (let channel = 0; channel < input.length; channel++) {
                //if we don't have an output in the channel, then we don't need to process it
                if (!output[channel]) {
                    continue
                }
                output[channel].set(input[channel])
            }
            return true
        }

        for (let channel = 0; channel < input.length; channel++) {
            const inputChannel = input[channel]
            const outputChannel = output[channel]
            for (let i = 0; i < windowLength; i++) {
                // Apply a Hanning window
                const windowCoeff = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowLength - 1)))
                outputChannel[i] = inputChannel[i] * windowCoeff
            }
        }

        return true // Keep processor alive
    }
}

registerProcessor('window-processor', WindowProcessor)
