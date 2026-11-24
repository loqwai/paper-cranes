# Shader render with audio injection

A display page compiles the shader named in `?shader=`, paints a lit, colourful canvas, and
changes what it paints when audio features, knobs or real audio change.

## Sub-features

- `render-paint`: the shader compiles and the canvas is lit, with many colours.
- `render-inject`: features injected into `window.cranes.manualFeatures` change the frame at a held
  `time=`.
- `render-motion`: over time, swept features visibly move the picture (headful video).
- `render-knob`: `?knob_N=` or an injected `knob_N` changes a shader that reads it.
- `render-audio`: a real file (`audio_file=`) produces measured features that move.
- `render-compile-error`: a broken shader reports `window.cranes.error` and keeps drawing the last
  good one.

## How to get to it (user POV)

- Open `/?shader=<path>` (plus `&noaudio=true` to skip the mic prompt).
- Turn knobs on a MIDI controller, the vjpad, or `?knob_N=` in the URL.
- Play music into the mic, a tab (`?audio=tab`), or a file (`?audio_file=<url>`).

## Driving it with Playwright

Preconditions:

- `$B launch` and `$B doctor` pass, or `--base` names a deployed site.
- For a changed shader, `node scripts/validate-shader.js shaders/<path>.frag` passes.

- **Paint, inject and A/B.** Run `$B render` (plasma) or
  `$B render --shader <path> --features '{"bassZScore":1,"energyZScore":1}'`. It opens
  `/?shader=<path>&noaudio=true&time=5`, screenshots `#visualizer` as `rest.png`, injects the
  features, screenshots `injected.png`, and requires both frames lit (lit share > 0.2, > 50
  colours), a mean per-channel difference > 8 of 255, no `window.cranes.error`, and no page errors.
- **Motion (headful video).** Add `--video`. A headful Chromium with a live clock sweeps the
  features from 0 to the target and back, twice in 8 s, and records `render-sweep.webm`, plus
  `sweep-strip.png` (6 frames) and `sweep-timeline.json` (the injected value per 100 ms). Requires
  a video of 6 s or more and more than 60 frames drawn during the sweep.
- **Knob.** `$B open "?shader=<path>&noaudio=true&time=5&knob_1=0" --canvas --name k0` and again
  with `knob_1=1` as `k1`; compare `k0-canvas.png` and `k1-canvas.png` (`canvas.meanRgb` in each
  `.json`).
- **Real audio (Firefox).** Make a file:
  `ffmpeg -f lavfi -i "aevalsrc=0.8*sin(2*PI*60*t)*(0.5+0.5*sin(2*PI*1*t)):s=44100:d=20" public/test-audio/verify-pulse.mp3`,
  then `$B open "?shader=plasma&audio_file=/test-audio/verify-pulse.mp3&smoothing=0.15" --browser firefox --canvas --eval "new Promise(r=>{const e=[];const t=setInterval(()=>{e.push(window.cranes.measuredAudioFeatures.energy);if(e.length>=10){clearInterval(t);r({energy:e,keys:Object.keys(window.cranes.measuredAudioFeatures).length})}},300)})"`.
  Expect `keys` > 0 (171 on 2026-11-24) and `energy` values that change.
- **Compile error.** Write a broken copy under `shaders/claude/wip/verify-scratch/1.frag`, open
  it with `--eval "window.cranes.error"`; expect `{lineNumber, message}` and a console line
  `Error information:`.
- **Proof.** `~/paper-cranes-proof/<run>/render-<shader>/`: `rest.png`, `injected.png`,
  `render-sweep.webm`, `sweep-strip.png`, `summary.json`, `console-*.txt`.

## Gotchas

- In Playwright's bundled Chromium, `audio_file=` and the mic never start (the AudioWorklet module
  never loads), silently. Use Firefox locally, or a soul Playwright lane with a CORS-OK URL for a
  deployed site. Injection proves the mapping; only real audio proves audio flows.
- `time=` holds `iTime`, but controllers (`?controller=`) still advance in real time.
- The default `render` features suit plasma (`spectralCentroid` drives its hue). Another shader
  needs `--features` naming what it reads; grep its `#define`s.
- `manualFeatures` outranks URL params and measured audio but not remote `messageParams`; a
  display in a room can have its injected values overridden by a peer.
- `audio_file` defaults to `smoothing=0.85` (less smoothing than the mic's 0.15).
