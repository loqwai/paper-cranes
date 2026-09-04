// Generate a deterministic test track for reactivity measurement: 24 s, 16 kHz mono 16-bit WAV.
// 128 BPM. Bars 1-8 quiet groove (kick + hats), bars 9-12 build (rising noise, no kick), bar 13+ DROP
// (loud kicks + sub bass). Used by scripts/lab/react-stat.mjs via ?audio_file=test-audio/beat.wav
//   node scripts/lab/make-test-beat.mjs  -> public/test-audio/beat.wav
import { mkdirSync, writeFileSync } from 'node:fs'
const SR = +(process.env.SR || 16000), SECS = 24, BPM = 128, beat = 60 / BPM
const OUT = process.env.OUT || 'public/test-audio/beat.wav'
const n = SR * SECS, out = new Float32Array(n)
let seed = 1337
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5 }
for (let i = 0; i < n; i++) {
  const t = i / SR, b = Math.floor(t / beat), bar = Math.floor(b / 4), tb = t - b * beat
  const groove = bar < 8, build = bar >= 8 && bar < 12, drop = bar >= 12
  let s = 0
  if (groove || drop) {                                   // kick: 55 Hz pitch-drop sine, 180 ms decay
    const env = Math.exp(-tb * 18), pitch = 55 + 90 * Math.exp(-tb * 40)
    s += Math.sin(2 * Math.PI * pitch * tb) * env * (drop ? 0.95 : 0.6)
  }
  if (tb > beat * 0.5 && tb < beat * 0.5 + 0.05) s += rnd() * 0.25 * (drop ? 1.4 : 1.0)   // hat on the offbeat
  if (build) { const p = (t - 8 * 4 * beat) / (4 * 4 * beat); s += rnd() * 0.05 * (0.2 + p * 1.2) + Math.sin(2 * Math.PI * (110 + 220 * p) * t) * 0.08 * p }
  if (drop) s += Math.sin(2 * Math.PI * 41.2 * t) * 0.35 * (0.6 + 0.4 * Math.sin(2 * Math.PI * t / (2 * beat)))   // sub
  out[i] = Math.max(-1, Math.min(1, s * 0.9))
}
const buf = Buffer.alloc(44 + n * 2)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24)
buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(out[i] * 32767), 44 + i * 2)
mkdirSync(OUT.replace(/[\/][^\/]*$/, ''), { recursive: true })
writeFileSync(OUT, buf)
console.log(`wrote ${OUT} (${(buf.length / 1024).toFixed(0)} KB, ${SECS}s @ ${SR} Hz)`)
