const calculateEnergy = (inputs) => {
    const calculateChannelEnergy = (input) =>
        input
            .flat() // Flatten all channels into a single array
            .reduce((acc, sample) => acc + Math.pow(Math.abs(sample), 2), 0) // Sum the squares of the absolute sample values

    const energy = inputs.reduce((totalEnergy, input) => totalEnergy + calculateChannelEnergy(input), 0)
}

class Energy extends AudioWorkletProcessor {
    constructor() {
        super()
    }
    process(inputs, outputs) {
        const energy = calculateEnergy(inputs)
        this.port.postMessage({ value: energy })
        // Output the energy to the first element of the output buffer
        if (outputs[0] && outputs[0][0]) {
            outputs[0][0].fill(this.energy)
        }
        return true
    }
}

registerProcessor('Audio-Energy', Energy)
