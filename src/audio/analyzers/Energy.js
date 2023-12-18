const calculateEnergy = (input) => {
    return input.reduce((acc, sample) => acc + Math.pow(Math.abs(sample), 2), 0) // Sum the squares of the absolute sample values
}
class Energy extends AudioWorkletProcessor {
    constructor() {
        super()
    }
    process([[input]], outputs) {
        const energy = calculateEnergy(input)
        this.port.postMessage({ value: energy, time: performance.now() })
        // Output the energy to the first element of the output buffer
        if (outputs[0] && outputs[0][0]) {
            outputs[0][0][0] = energy
            outputs[0][0][1] = performance.now()
        }
        return true
    }
}

registerProcessor('Audio-Energy', Energy)
