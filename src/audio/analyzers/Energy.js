// simple-processor.js
class Energy extends AudioWorkletProcessor {
  constructor() {
      super();
  }
  process(inputs, outputs) {
    let energy = 0;
    // for all inputs
    for (let input of inputs) {
      // for all channels
      for (let channel of input) {
        // for all samples
        for (let sample of channel) {
          energy += Math.pow(Math.abs(sample), 2);
        }
      }
    }
    this.energy = energy;
    this.port.postMessage(this.energy);
    return true;
  }
}

registerProcessor('Audio-Energy', Energy);
