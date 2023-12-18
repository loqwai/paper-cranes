const calculateEnergy = (input) => {
    return input.reduce((acc, sample) => acc + Math.pow(Math.abs(sample), 2), 0) // Sum the squares of the absolute sample values
}
class Energy extends AudioWorkletProcessor {
    constructor() {
        super()
    }
    process(inputs, outputs) {
        if (inputs.length === 0) return true
        const input = inputs[0][0]
        const output = outputs ? outputs[0][0] : []
        return this._process(input, output)
    }
    _process(input, outputs) {
        const energy = calculateEnergy(input)
        this.port.postMessage({ value: energy, input, outputs })
        outputs[0] = energy
        return true
    }
}

registerProcessor('energy', Energy)
