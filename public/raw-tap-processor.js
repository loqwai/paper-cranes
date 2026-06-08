// raw-tap-processor.js
// Taps the raw time-domain audio signal (NO windowing) and ships fixed-size
// frames to the main thread for wavelet analysis. Parallel to window-processor.js,
// which applies a Hanning window for FFT — wavelets want the raw signal.
//
// A DWT needs a power-of-two length. The worklet's render quantum is 128 samples,
// so we accumulate quanta into a FRAME_SIZE ring and emit a full frame whenever it fills.

const FRAME_SIZE = 1024 // 2^10 — ~21ms at 48kHz. Enough depth for ~6-7 octave bands.

class RawTapProcessor extends AudioWorkletProcessor {
    constructor() {
        super()
        this.buffer = new Float32Array(FRAME_SIZE)
        this.writePos = 0
    }

    process(inputs, outputs) {
        const input = inputs[0]
        if (!input || input.length === 0) return true

        const channel = input[0] // mono — first channel only
        const output = outputs[0]?.[0]

        for (let i = 0; i < channel.length; i++) {
            this.buffer[this.writePos++] = channel[i]
            // Pass audio through untouched so downstream .connect(destination) still plays.
            if (output) output[i] = channel[i]

            if (this.writePos >= FRAME_SIZE) {
                // Emit a copy — the buffer keeps filling for the next frame.
                this.port.postMessage(this.buffer.slice(0))
                this.writePos = 0
            }
        }

        return true
    }
}

registerProcessor('raw-tap-processor', RawTapProcessor)
