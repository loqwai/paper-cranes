# Testing

Three layers, cheapest first.

| Command | What it runs | Needs |
|---|---|---|
| `npm test` | Unit tests (`vitest.config.js`): pure functions, plugins, workers | nothing |
| `npm run test:smoke` | Builds, serves `dist/` like Cloudflare Pages, and drives every page in headless Chromium (`e2e/smoke.test.js`; `e2e/relay.test.js` too when `E2E_RELAY=1`) | Playwright's Chromium |
| `npm run test:smoke:prod` | The same smoke suite against https://visuals.beadfamous.com (or `E2E_BASE_URL` if set), plus the live-relay checks (`e2e/relay.test.js`) | network |
| `npm run test:e2e` | Every `e2e/*.test.js`, including the dev-server suites (`vj-mcp`, `vj-mcp-relay`, `audio-file`) | see each file's header; the smoke suite skips without `dist/`, `audio-file` without its gitignored track ([audio-file-playback.md](audio-file-playback.md)), each saying why |

## Smoke suite

`e2e/smoke.test.js` checks what a person sees, on a real build:

- `?shader=plasma&noaudio=true&time=5` paints a lit, colourful canvas (pixels sampled from a
  screenshot of `#visualizer`, not a "canvas exists" check) with no uncaught errors.
- A missing shader shows the default shader and the note `shader not found: <name>`.
- `/list.html` at 390x844 fills with shaders, has no horizontal scroll, and survives
  `cranes-list-*` localStorage values of `null`, `{}` and `5`.
- `/edit.html?shader=plasma` holds GLSL in its Monaco model (a build strips `?shader=` and reloads
  once; the test waits for that load), and a missing shader opens on the default GLSL, never on
  `index.html`.
- The service worker activates and controls the page, and the page does not reload by itself
  (4 navigations for 1 load + 3 reloads, then none in the next 8 s).
- `?vj=1` installs `__vjMeter`, `__vjValidate` and `__vjJank`, with no 4xx/5xx on the meter or
  `/__vj-signal`.
- `/vjpad.html` draws pads; `/midi.html` settles its MIDI status (headless has no MIDI permission).

`e2e/relay.test.js` runs only with `E2E_RELAY=1`. A display joins a random `?room=` on
`wss://relay.beadfamous.com` and a raw WebSocket peer joins the same room:

- The peer's `update-params` with `knob_7: 0.42` and `controller: 'evil'` applies the knob and
  drops `controller` from `window.cranes.messageParams` and from the mirrored URL.
- The relay counts the display in (`status` with `connectedClients: 2`), and `vj-signal` frames the
  display sends are not relayed to the peer.

### Where it points

| Variable | Default | Meaning |
|---|---|---|
| `E2E_BASE_URL` | unset: serve `./dist` | A deployed site, e.g. `https://visuals.beadfamous.com` or `https://<branch>.paper-cranes-visuals.pages.dev` |
| `E2E_PORT` | `7129` | Port for the local `dist/` server |
| `E2E_RELAY` | unset | `1` runs `e2e/relay.test.js` |
| `E2E_RELAY_URL` | `wss://relay.beadfamous.com` | Relay to join |
| `E2E_VIDEO_DIR` | unset | Record each page as `<test>.webm` plus a final `<test>.png` there |

Against a Pages preview:

```bash
E2E_BASE_URL=https://my-branch.paper-cranes-visuals.pages.dev npx vitest run --config vitest.e2e.config.js e2e/smoke.test.js
```

The local server answers like Cloudflare Pages on purpose: `/x.html` gets a 308 to `/x`, and a
path with no file answers 200 with `index.html`. That second rule is how a missing `.frag` used
to load a web page as shader source, so the suite keeps it.

### Writing a check

- Wait on a condition (`until`, `untilRendered`, `locator.waitFor`), never a fixed sleep.
- Pin time with `time=` and turn the mic off with `noaudio=true` so the frame is deterministic.
- Assert what the user would see: pixels, the note text, the editor's content, the URL.
- Helpers live in `e2e/smoke-env.js`.

### Known errors and traps

- Pre-existing, not asserted away silently: a missing shader's page throws `Unexpected token '<' ...
  is not valid JSON` from `/manifests/<name>.json` (the missing-shader check allows exactly that one
  error and names it); `/edit.html` and `/vjpad.html` log a failed `/ws` handshake on a static host
  (console errors, which the suite does not assert on those pages).
- Plain headless Chromium (including the local one on Aaron's WSL box) never starts `audio_file`
  playback and logs nothing: `window.cranes.audio` stays the no-audio stub. The smoke suite has no
  audio checks for that reason. Audio-file checks need a real Chrome (`e2e/audio-file.test.js`
  launches `channel: 'chrome'`) or a headed browser lane (on soul: `playwright-lane1`, taken with
  `browser-lanes` `lane_acquire` and given back with `lane_release`), and a CORS-enabled audio URL
  such as `https://cdn.jsdelivr.net/gh/Tonejs/audio@master/drum-samples/breakbeat.mp3`.
  Playwright's bundled Firefox does play it headless (checked 2026-11-24 with
  `firefoxUserPrefs: { 'media.autoplay.default': 0 }`: `measuredAudioFeatures.bass`/`energy` move
  every second), so `firefox.launch()` is the cheapest local route to an audio check.
- A return visitor's first load after a deploy can run the previous build from the service-worker
  cache before the worker updates and reloads. Against a deploy, check what actually loaded (the
  served script, `window.cranes.shader`) rather than assuming the new build is on screen. The
  smoke suite avoids this with a fresh browser context per page.
- `page.route('**/name.wav')` also matches the page URL when its query string ends in that name,
  so the page itself gets served audio. Match on `new URL(req.url()).pathname` instead.

The suite runs WebGL in SwiftShader (`--use-angle=swiftshader`), so it needs no GPU.
