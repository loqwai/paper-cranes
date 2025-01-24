class WindowProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [] // Add any parameters you might need, like window type
    }

    constructor(options) {
        super();
        this.debugMode = options?.processorOptions?.debugMode;
        console.log('Window processor created with options:', options);
        this.processCount = 0
        this.lastLogTime = 0
        this.port.onmessage = (e) => {
            // Handle any messages if needed
        }
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        if (!input || !input[0]) {
            if (this.debugMode) {
                this.port.postMessage({
                    type: 'error',
                    data: { message: 'No input received' }
                });
            }
            return true;
        }

        const inputChannel = input[0];
        const outputChannel = output[0];

        // Apply window function and check for actual data
        let maxValue = -Infinity;
        for (let i = 0; i < inputChannel.length; i++) {
            const windowCoeff = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (inputChannel.length - 1)));
            outputChannel[i] = inputChannel[i] * windowCoeff;
            maxValue = Math.max(maxValue, Math.abs(inputChannel[i]));
        }

        if (maxValue > 0 && this.debugMode) {
            this.port.postMessage({
                type: 'debug',
                data: {
                    maxValue,
                    sampleCount: inputChannel.length,
                    timestamp: currentTime
                }
            });
        }

        return true;
    }
}

registerProcessor('window-processor', WindowProcessor)
