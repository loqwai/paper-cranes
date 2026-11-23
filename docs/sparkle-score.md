# Sparkle score: measuring one-frame flicker

`scripts/sparkle-score.mjs` measures the static, sparkle or shimmer in a shader's output and draws where it
happens. Use it to check whether a change reduces flicker, and to tell flicker from motion.

## What it measures

A pixel sparkles when it jumps one way and straight back. For frames `f[t-1]`, `f[t]`, `f[t+1]`:

```
d1 = f[t] - f[t-1]      d2 = f[t+1] - f[t]
flip = d1 * d2 < 0 ? min(|d1|, |d2|) : 0      (max over R, G, B, in 0..255)
```

Smooth motion changes a pixel in one direction, so it scores about 0. A thread narrower than a pixel that
pops in for one frame scores the size of the pop.

| Output | Meaning |
|---|---|
| `flipMean` | mean flip per pixel per frame, 0..255. The headline number. |
| `sparkleFrac` | share of pixel-frames with a flip over 24 (about 10% of full scale) |
| `motion` | mean \|f[t] - f[t-1]\|. Context: sparkle only matters relative to how much moves. |
| `meanLuma` | mean luminance of the middle frame. A "fix" that only darkens also lowers sparkle. |
| `saturation`, `greyFrac` | mean (max-min)/max over lit pixels, and the share under 0.25. A fix that averages colours greys them. |
| `heat.png` | the per-pixel mean flip painted over the middle frame (black, red, yellow, white) |
| `heat-only.png`, `mid.png` | the heat map alone, and the middle frame |

## Render mode (deterministic)

Headless Chromium on the dev server, with the frame clock replaced by a stepped one. Every run of the same
command gives the same frames.

```bash
node scripts/sparkle-score.mjs --shader claude/wip/clit-vibej/1 --controller clit-set \
  --trace synth --frames 90 --out /tmp/sparkle/before
```

- `--trace synth` is a 128 BPM kick, hat and swell. `--trace silence` feeds no audio. `--trace file.json` replays
  an array of feature objects, one per frame at 60 fps.
- `--warmup 60 --warmdt 0.25` runs 15 s of controller time before scoring, so clocks and envelopes have moved.
- `--params "voyage0=3.8&knob_16=0.4"` adds query params. `--state '{"time":7200}'` seeds the clit-set
  controller's state, for example to start its clocks two hours in.
- `--ss 4` renders 4x4 samples per output pixel and box-averages them. This is the aliasing-free reference: if
  `--ss 4` scores far lower, the sparkle is aliasing.
- `--bench 30` times 30 more frames. Headless uses SwiftShader (CPU), so treat the time as relative and noisy.
- `--keep` writes every scored frame as a PNG.

Hot reload is blocked in the harness page, so editing a `.frag` during a run does not change the run.

### Record a live feature trace

On a page with live audio, sample the features the controller reads, then send them to the dev server:

```js
const KEYS = ['energy', 'energyNormalized', 'energyZScore', 'bass', 'bassZScore', 'trebleZScore' /* ... */]
const trace = []
const t0 = performance.now()
await new Promise(done => {
  const tick = () => {
    const f = window.cranes.flattenFeatures()
    trace.push(Object.fromEntries(KEYS.filter(k => Number.isFinite(f[k])).map(k => [k, f[k]])))
    performance.now() - t0 < 25000 ? requestAnimationFrame(tick) : done()
  }
  requestAnimationFrame(tick)
})
await fetch('/__vj-signal', { method: 'POST', body: JSON.stringify({ type: 'sparkle-trace', fps: trace.length / 25, trace }) })
```

The trace lands in `.claude/vj-signals.jsonl`. Resample it to 60 fps before passing it to `--trace`.

## Video mode

Score any recording. ffmpeg decodes it.

```bash
node scripts/sparkle-score.mjs --video show.mp4 --out /tmp/sparkle/show --crop 408:816:0:0 --start 5 --duration 10
```

Compression smooths and adds its own noise, so compare videos encoded the same way.

## Example: the clit lace (2026-11-22)

Diagnosis on `shaders/claude/wip/lace-lab/1` (clit-vibej/1 with `lab_*` switches), synth trace:

| Run | flipMean | sparkleFrac |
|---|---|---|
| point sampled | 9.04 | 12.1% |
| 16 samples per pixel (`--ss 4`) | 4.05 | 4.4% |
| rendered at 1/4 resolution (`--size 102x204`) | 9.02 | 12.0% |
| controller clocks two hours in (`--state`) | 7.59 | 10.1% |
| no coil / no undulate / no bass on the threshold / no treble light | 8.95 to 9.06 | 11.9% to 12.2% |
| wave phase frozen | 10.03 | 13.3% |

More samples per pixel remove the sparkle; lower resolution does not; float precision and the audio terms do
not cause it. That is aliasing of a chaotic function: the orbit traps are noise at every scale.
