// raw-tap-processor.js
// Taps the raw time-domain audio signal (NO windowing) and ships fixed-size, OVERLAPPING
// frames to the main thread for wavelet analysis. Parallel to window-processor.js, which
// applies a Hanning window for FFT — wavelets want the raw signal.
//
// A DWT needs a power-of-two length, so each emitted frame is FRAME_SIZE samples. But we
// emit a fresh (overlapping) frame every HOP samples — a sliding window — so analysis
// updates every ~HOP/sampleRate seconds (~3ms) instead of once per full frame (~21ms).
// This is what gives the low latency, and it matches the offline harness exactly (same
// FRAME/HOP), so live behavior equals what the harness measured.

const FRAME_SIZE = 1024 // 2^10 — ~21ms at 48kHz. Enough depth for ~6-7 octave bands.
const HOP = 128         // emit a new overlapping frame every HOP samples (= render quantum)

class RawTapProcessor extends AudioWorkletProcessor {
    constructor() {
        super()
        this.buffer = new Float32Array(FRAME_SIZE) // ring of the most recent FRAME_SIZE samples
        this.writePos = 0       // next write index into the ring
        this.sinceEmit = 0      // samples accumulated since the last frame emit
        this.primed = false     // true once the ring has been filled at least once
    }

    // Emit the most recent FRAME_SIZE samples in chronological order (unwrap the ring).
    emitFrame() {
        const frame = new Float32Array(FRAME_SIZE)
        const start = this.writePos // oldest sample sits at writePos after a full wrap
        for (let k = 0; k < FRAME_SIZE; k++) {
            frame[k] = this.buffer[(start + k) % FRAME_SIZE]
        }
        this.port.postMessage(frame)
    }

    process(inputs, outputs) {
        const input = inputs[0]
        if (!input || input.length === 0) return true

        const channel = input[0] // mono — first channel only
        const output = outputs[0]?.[0]

        for (let i = 0; i < channel.length; i++) {
            this.buffer[this.writePos] = channel[i]
            this.writePos = (this.writePos + 1) % FRAME_SIZE
            if (this.writePos === 0) this.primed = true // completed a full wrap at least once
            // Pass audio through untouched so downstream .connect(destination) still plays.
            if (output) output[i] = channel[i]

            // Emit an overlapping frame every HOP samples, once the ring is primed.
            if (++this.sinceEmit >= HOP) {
                this.sinceEmit = 0
                if (this.primed) this.emitFrame()
            }
        }

        return true
    }
}

registerProcessor('raw-tap-processor', RawTapProcessor)
