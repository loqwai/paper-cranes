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
| `refMAE`, `refMAEBlur` | with `--ref`: mean \|this - reference\| per pixel channel (0..255), and the same after a 3x3 blur of both |
| `refMotion` | with `--ref`: the reference run's `motion` |
| `gate` | with `--before`: the pass/fail checks below |
| `heat.png` | the per-pixel mean flip painted over the middle frame (black, red, yellow, white) |
| `heat-only.png`, `mid.png` | the heat map alone, and the middle frame |

## Read flipMean with motion and refMAE

**Any temporal filter lowers `flipMean`.** Blending in last frame's output, slowing a clock or smearing
lowers every frame-to-frame change, real motion included, so `flipMean` alone cannot tell anti-aliasing from
blur. A fake fix that blends 90% of last frame everywhere scores better than a real one.

So score a fix against an aliasing-free reference of the same shader, trace and size:

```bash
S="--controller clit-set --trace synth --frames 90 --keep"
node scripts/sparkle-score.mjs --shader my/shader-before $S --ss 4 --out /tmp/sp/ref       # the reference
node scripts/sparkle-score.mjs --shader my/shader-before $S --ref /tmp/sp/ref --out /tmp/sp/before
node scripts/sparkle-score.mjs --shader my/shader $S --ref /tmp/sp/ref --before /tmp/sp/before --out /tmp/sp/fix
```

The last run prints a `gate`. It passes when all of these hold:

| Check | Why |
|---|---|
| `refMAEDown`: `refMAE` lower than before | Aliasing is the part of the picture the reference lacks. Blur and frame blending move away from it. |
| `flipDown`: `flipMean` lower than before | Less flicker. |
| `motionNotCrushed`: `motion` at least 85% of `refMotion` | Sparkle inflates `motion` too, so a real fix lowers it toward the reference. Going well below the reference means real motion was smoothed away. |

Then look at a frame strip through a camera lurch (`--keep` frames, cropped and tiled) for seams, ghost lines
and smears. The numbers do not see those.

The reference is not a perfect target. `--ss 4` renders a 4x bigger viewport, so anything a shader builds from
`dFdx`/`fwidth` (rims, coherence gates) is 4x weaker per sample there. `refMAE` has a floor above 0 for such
shaders; compare runs against each other, not against 0.

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
- `--keep` writes every scored frame as a PNG. A run used as `--ref` needs it.
- `--ref <dir>` and `--before <dir>`: see above.
- `--gpu` asks for the host GPU and fails if Chrome falls back to SwiftShader.
- A flag given twice: the last one wins, except `--controller`, which repeats.

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

### First fix, rejected: frame blending

The first fix (PR #199 at `202edecd`) blended 90% of last frame's output wherever a derivative-based footprint
said the lace was unresolved. It scored well on `flipMean` alone (clit-vibej/2: 10.57 to 3.18) and failed
review:

- **The mask flagged every clean thread.** The footprint was `|dV/dC| * pixel / trap`. Across a thread's core
  the trap passes through 0, so the footprint ran to infinity at every clean filament: dark seams down thread
  cores, and a doubled red ghost line behind moving threads.
- **It was blur.** `motion` fell 16.5 to 9.1, below the reference's 13.6, and `refMAE` rose 6.87 to 11.20:
  further from the aliasing-free picture than doing nothing.

### The fix: spatial supersampling where the lace value is unresolved

`unres` = how much the lace value (coverage, braid, lightness) changes across the pixel's 2x2 quad
(`fwidth`). A clean thread's core is lace on both sides, so it stays out; the chaotic lace lights up. There,
the pixel runs the orbit `LACE_AA_SAMPLES` more times at points inside its own footprint (`C` moved by
`dFdx(C)`, `dFdy(C)`) and averages the lace's coverage, light and colour. No frame history, so nothing trails.
Supersampling every pixel instead of the masked ones scores within 1% of the masked version (9.06 against 9.15).

Synth trace, 90 frames, 408 x 816, SwiftShader. `ref` is the unfixed shader at `--ss 4`:

| Shader | flipMean before / fix / ref | motion before / fix / ref | refMAE before / fix | gate |
|---|---|---|---|---|
| clit-vibej/2 | 10.57 / 9.15 / 7.39 | 16.50 / 15.19 / 13.58 | 6.87 / 5.50 | pass |
| clit-vibej/1 | 9.05 / 6.86 / 4.05 | 14.05 / 11.93 / 9.36 | 8.12 / 6.33 | pass |
| clit-set/2 | 8.05 / 5.99 / 2.77 | 12.56 / 10.36 / 7.35 | 8.38 / 6.54 | pass |
| clit-set/1 | 0.82 / 0.69 / 0.29 | 1.70 / 1.41 / 0.75 | 2.99 / 2.27 | pass |
| clit-vibej/2, first fix (frame blending) | 10.57 / 3.18 / 7.39 | 16.50 / 9.12 / 13.58 | 6.87 / 11.20 | fail |

The fix closes 40% to 55% of the gap to the 16-sample reference. More samples close more, at a cost
(clit-vibej/2, masked, SwiftShader ms per frame, median of 3 interleaved runs):

| Extra samples | flipMean | refMAE | ms/frame |
|---|---|---|---|
| 0 (before) | 10.57 | 6.87 | 106 |
| 1 | 9.74 | 6.12 | 157 |
| 2 (shipped) | 9.15 | 5.50 | 190 |
| 3 | 8.84 | 5.26 | 217 |
| 7 | 8.52 | 5.00 | not measured |

The other shaders, 2 extra samples: clit-vibej/1 112 to 198 ms (+76%), clit-set/2 75 to 135 (+79%), clit-set/1
66 to 102 (+54%). For comparison the rejected frame-blending fix cost +38% on clit-vibej/2 (106 to 146).

The untaken branch alone costs about 20% on SwiftShader (removing it as dead code gives back the full
speed), so even a quiet frame pays something.

The fix is described in `shaders/claude/wip/clit-vibej/clit-vibej.md` (LACE AA).
