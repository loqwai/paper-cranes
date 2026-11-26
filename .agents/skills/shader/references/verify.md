# The verification gate, with numbers

Prove the shader on your own instance, the way `/verify-paper-cranes` does it. Report numbers, PNG
paths and the commands you ran. A claim with no count, ratio or file in it is not verification.

```bash
B=.agents/skills/verify-paper-cranes/bin/pc-verify.mjs   # from the repo root; .claude/skills/... is the same file
S=claude/wip/<name>/1
node scripts/validate-shader.js shaders/$S.frag          # 1. compiles through the real wrapper
node $B launch                                           # 2. own dev server on 7140-7149
node .agents/skills/shader/bin/shader-check.mjs --shader $S [--controller X] [--params "wavelet=true"]
```

Never bind, drive or kill ports 6969, 6977, 6978 or 6991 (Aaron's server and the live show), and
never use ComfyUI on 8189. `scripts/sparkle-score.mjs` and `scripts/vj/mcp-call.js` default to
6969: always pass your own port.

## shader-check

`bin/shader-check.mjs` renders on a virtual clock (stepped frames, seeded randomness), so two
scenarios differ only in their input. It writes a PNG per scenario and `summary.json` to
`~/paper-cranes-proof/<run>/shader-check-<shader>/`. A run takes 2-4 minutes on SwiftShader.

| Check | Rule it encodes | Threshold |
|---|---|---|
| `silence@T look` | resting picture at 3 s, 37 s, 400 s, no audio, knobs 0 | FAIL if `lit` < 0.2 or `lum` < 0.03 |
| `knob_N=1 look`, `all knobs=1 look` | no knob value breaks the look | same look checks |
| `clip` | white-out | WARN > 0.03 |
| `grey` | "It's gray" | WARN > 0.15 (share of pixels with OKLab C < 0.03, 0.3 < L < 0.8) |
| `hotPink` | no hot magenta | WARN > 0.15 of vivid pixels with OKLab hue 300°-15° |
| `hueConc` | "multiple colors, not just one shade" | WARN > 0.85 |
| `dark` | a dark floor (not washed out) | WARN < 0.03 (share with Rec.709 L < 0.08) |
| `colours` | banding or a flat fill | WARN < 300 distinct 15-bit colours |
| audio moves the picture | his freeze-time test: clock held, only audio differs | WARN if quiet to loud diff < 2 (mean abs, 0-255) |
| a kick shows | the hit is visible on its frame | WARN if loud to kick diff < 1 |
| no brightness pump | "global brightness shift" | WARN if loud/quiet mean luminance > 1.30 |
| quiet not brighter than loud | "very bright when it is quiet" | WARN if quiet > loud × 1.1 |
| kick is local | no strobe on the beat | WARN if kick/loud luminance > 1.25 |
| alive in silence | "almost still except for time" | WARN if 1 s of frames differ by < 0.5 |

Calibration (2026-11-26, 390x844, SwiftShader):

| Shader | Result |
|---|---|
| `claude/wip/clit-vibej/2` + `controller=clit-set&wavelet=true` (the 11-22 show) | every check PASS. silence lum 0.265, grey 0.024, hotPink 0.001; quiet to loud diff 47.7; loud/quiet lum 1.05; kick/loud 1.21; silent motion 32.1 |
| `plasma` (2014 Ether port, before these rules) | WARN on every still: hotPink 0.34-0.84, clip 0.05-0.08, hueConc up to 0.93 |

What it does not catch:

- **Shiver and phase jumps.** A phase that jumps with audio still "moves with the music". Run
  sparkle-score below, and watch the video.
- **Real frame rate.** SwiftShader draws a few fps. Judge cost by the mobile limits in SKILL.md, and
  on a phone when you can (`?vj=1` reports frame time).
- **Minutes-scale drift.** Accumulators that creep, palettes that rotate too fast, luminance that
  shifts as complexity grows. A long run with `?vj=1` and the aesthetic meter catches these
  (`window.__vjMeter.summary(60)`: `flicker` under ~0.7, `hueDriftPerMin` under ~0.03).
- **Controller clocks past a few seconds.** Each scenario jumps the clock once, and controllers clamp
  dt (0.25 s), so their clocks only reach a few seconds.
- **ChromaDepth**: `hotPink` and `hueConc` are tuned for OKLCH palettes; a red-heavy depth map can
  trip them. Look at the PNG.

## Flicker and sparkle

```bash
node scripts/sparkle-score.mjs --shader $S --base http://127.0.0.1:<port> --trace synth --frames 90 --out <dir>
```

It has no `--help`: any run without `--base`, `--help` included, loads a page from 6969. Read its
usage in the header comment of `scripts/sparkle-score.mjs` instead.

Report `flipMean` (one-frame flips, 0-255) next to `motion` and `meanLuma`, and look at `heat.png`.
A fix that only blurs or darkens also lowers `flipMean`; to judge a fix, use `--ss 4 --keep` for an
aliasing-free reference, then `--ref` and `--before` ([docs/sparkle-score.md](../../../../docs/sparkle-score.md)).
Add `--controller X` for a controller shader.

## Real audio

Playwright's bundled Chromium never loads the AudioWorklet, so `audio_file=` gives no features
there. Use Firefox. The repo ships no audio: copy a file into `public/test-audio/` with a `verify-`
prefix (gitignored; `pc-verify cleanup` removes it). The main checkout has `test-audio/beat.mp3`.

```bash
cp /home/hypnodroid/Projects/paper-cranes/test-audio/beat.mp3 public/test-audio/verify-beat.mp3
node $B open "/?shader=$S&audio_file=/test-audio/verify-beat.mp3" --browser firefox --canvas --wait 8000 \
  --name real-audio --eval "(() => { const f = window.cranes.measuredAudioFeatures; return { keys: Object.keys(f).length, energy: f.energy, onsetKick: f.onsetKick } })()"
```

Measured 2026-11-26 on clit-vibej/2: 193 feature keys, energy 0.018, onsetKick 0.34. A key count of
0 means the audio path never started; then nothing about audio is proven.

## Motion on video

Aaron's rule: visual behaviour over time gets a headful video. Skipping it is "reward hacking"
(vault `kb/rules/rule-record-proof-video-headful.md`).

```bash
DISPLAY=:0 node $B render --shader $S --video --features '{"bassNormalized":1,"onsetKick":1,"midsNormalized":0.8,"energy":0.05}'
```

It writes `render-sweep.webm` and a 6-frame `sweep-strip.png`. Look at the strip.

## Knobs he played

After a live session with `?vj=1&vjtrack=1`, `node scripts/vj/knob-correlate.js` says which audio
feature a fader gesture tracked. A dial he rides like a fader is a mapping to wire.

## Finish

- `npm test`: the unit suite, plus every shader outside `wip/` compiling.
- `node $B cleanup`: stops your server, restores `shader-dates.json` if the dev server rewrote it,
  removes `public/test-audio/verify-*`.
- Write the numbers into `<name>.md` under the iteration that produced them, and into the PR body
  with the preview link.
