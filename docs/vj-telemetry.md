# VJ Telemetry (`?vj=1`) — the page as a sensor

The auto-VJ loop (`/vibej`) needs to know what the display actually looks like. Screenshots are
the ground truth, but they are not always available: a display tab opened by a previous session
lives outside the current Chrome tab group and **cannot be scripted or screenshotted at all**.

`?vj=1` closes that gap by making the page volunteer its own numbers. The page installs a runtime
at boot (`src/vj/runtime.js`) and POSTs signals to `/__vj-signal`, which the dev server appends to
`.claude/vj-signals.jsonl` (gitignored). A `Monitor` on that file wakes the loop within seconds.

```
http://localhost:6969/?shader=<path>&vj=1
```

## What the runtime installs

| Piece | Purpose |
|---|---|
| Cursor hygiene | `*{cursor:none}` — a pointer sitting in a projected visual is the giveaway that nobody is driving. Also hides `#remote-status-indicator`. |
| `window.__vjValidate(src)` | Compiles GLSL against a real WebGL2 context. The loop gates every shader save on this. |
| `window.__vjMeter` | The aesthetic meter (see `scripts/vj/aesthetic-meter.js`) — luminance, clip, flicker, motion, hue drift, gate. Samples at 10 Hz. |
| `window.__vjJank` | Frame-time probe: median / p95 / worst, and counts over 32 ms and 100 ms. |

A **page reload wipes all of it**, which used to fail silently. The boot beacon exists so a reload
can never again go unnoticed.

## Signals

Each line in `.claude/vj-signals.jsonl` is one JSON object with a server-stamped `t`.

- **`boot`** — every page load. Carries `url` (truncated to 600 chars) and a parsed **`flags`**
  object of all non-`knob_` query params. The `flags` field exists because a shader carrying 30
  knobs in its URL pushes the interesting parameters (`wavelet`, `audio`, `noaudio`, `controller`)
  past any truncation limit — the raw href hid them twice.
- **`pulse`** — every 20 s. The meter `summary`, `residR`, the `jank` summary, and the knob vector
  *when it changed*.
- **Health alerts** — a 5 s watchdog with a 30 s per-type cooldown: `clip`, `flicker` (> 0.7),
  `too-dark` (`lumMin` < 0.06 at a clean gate), `shiver` (> 0.45), and `gate-drop` / `gate-clean`
  marking track boundaries.
- **`knobtrack`** — **opt-in, see below.**

### `?vjtrack=1` — gesture logging (off by default)

Adds a 10 Hz record of every knob move together with the full audio-feature vector at that
instant (~184 channels, including wavelet and controller outputs). This is what lets the loop work
out *which audio feature a fader is imitating*.

It is **off unless you ask for it**, because it is analysis instrumentation, not show
instrumentation: 10 Hz × ~184 channels is roughly a 17 KB `JSON.stringify` plus a `fetch` every
two seconds, on the render thread. Do not leave it on during a performance.

```
?shader=<path>&vj=1&vjtrack=1      # analysing a gesture
?shader=<path>&vj=1                # performing
```

The signal log rotates on dev-server start (previous run kept as `.jsonl.prev`). Without this it
is an unbounded `appendFileSync`; one session drove it to 7.3 MB, and the GET endpoint only ever
serves the last 50 lines anyway.

## Tools (`scripts/vj/`)

> `scripts/vj/aesthetic-meter.js` is **fetched by URL** at runtime (`/scripts/vj/…`). Moving it
> breaks the meter, and the failure is swallowed into an `error` signal rather than thrown.

- **`remote-send.js`** — push `update-params` to the display from a shell. The display joins the
  dev-server WebSocket when it has no `?room`, and `remote-ws-plugin` rebroadcasts. This is the
  lever on a display tab that cannot be scripted. `null` releases a param *and* deletes it from
  the display's URL.
  ```bash
  node scripts/vj/remote-send.js '{"knob_141":0.62}'    # set
  node scripts/vj/remote-send.js '{"noaudio":null}'     # release + strip from URL
  ```
- **`watch-release.js`** — emits one line the moment a fader is released (movement, then 2.5 s of
  stillness). Run under a `Monitor` to wake the loop at exactly the right instant.
- **`knob-correlate.js`** — segments the log into gestures and correlates each knob against every
  feature. `--back=N` inspects an earlier gesture.

### Reading a correlation honestly

`knob-correlate.js` carries three guards. Each was added because its absence produced a confident
wrong answer:

1. **Correlate inside ONE gesture.** Across idle time every feature reads r≈0.3 mush. A gesture is
   a run of movement ended by 2.5 s of stillness — the same threshold `watch-release.js` uses, or
   the analyzer slices up the very gesture the detector just reported.
2. **Effective sample size.** Hand and audio are both heavily autocorrelated, so the nominal `n`
   wildly overstates the evidence — a 7 s fader sweep reads r=0.9 on about **3** independent
   points. A Bartlett adjustment (`n_eff = n·(1−r₁ₐr₁ᵦ)/(1+r₁ₐr₁ᵦ)`) plus `t > 3` is what separates
   a real finding from a smooth-ramp coincidence. Only rows marked `SIG` mean anything.
3. **Detrending.** A fader swept steadily for a minute correlates ≈0.6 with *every* monotonic
   accumulator in the engine (`spinPhase`, `huePhase`, `paletteShift`, `mutation`…) purely because
   both rise with time. The tell is many unrelated channels tying at one r. Levels are linearly
   detrended before correlating; `n_eff` does **not** catch this.

History aggregates (`Mean`/`Median`/`Min`/`Max`/`StandardDeviation`/`Slope`/`Intercept`/
`RSquared`) are excluded outright — they drift smoothly, so they spuriously match any sweep, and
they are poor wiring targets regardless.

Also note the FFT `beat` flag is unreliable on a quiet mic feed: it has been observed reporting
1.90 s (32 BPM) while every spectral feature independently autocorrelated at 0.5 s (120 BPM).
Trust feature periodicity over `beat`, or enable `?wavelet=true` for `wavelet_bassHit`.

## Performance

The display's remote path is deliberately kept free of per-message work, because it is the
knob→uniform hot path on a surface someone plays in time with music:

- Params are applied **synchronously on arrival**. Do not "optimise" this into a
  `requestAnimationFrame` batch — that costs up to a full frame (~16 ms) of added lag whenever the
  renderer's rAF is queued first, and the per-message cost was never that loop.
- The URL mirror is **debounced (750 ms, flushed on `pagehide`)**. It exists only so a refresh
  preserves state, so it need not be synchronous with the knob stream. Previously it parsed and
  re-serialised a ~700-char URL and called `history.replaceState` on every message.
- There is **no per-message DOM work.** A "Remote" flash used to run on every message; it was
  removed, not throttled.
