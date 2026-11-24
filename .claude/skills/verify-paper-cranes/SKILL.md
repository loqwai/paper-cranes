---
name: verify-paper-cranes
description: Drive the real Paper Cranes app (the shader display, list, editor, vjpad/midi/jam pages, remote /ws, the VJ MCP at /mcp, the relay, production and Pages previews) the way a user does, and capture proof - screenshots, sampled canvas pixels, console logs, and a headful video for anything visual. Use to verify a change works in the browser, before claiming a feature done, for a PR's proof, or when something "looks off" on a deployed page.
---

# Verify Paper Cranes

Launch an instance of your own, check it is the build you mean, drive one feature from
[`features/`](features/README.md), keep the evidence, tear down what you started.

```bash
B=.claude/skills/verify-paper-cranes/bin/pc-verify.mjs     # run from the repo root
$B launch                 # dev server on a free port in 7140-7149
$B doctor                 # read-only: ours? which build? WebGL2? rendering?
$B render --video         # feature 1: plasma at rest vs injected audio features, plus headful video
$B cleanup                # stops only what launch started; the proof folder stays
```

## Rules that are not negotiable

- **Ports 6969, 6977, 6978 and 6991 belong to Aaron's dev server and the live show.** Never bind,
  drive or kill them. `pc-verify` refuses them and picks a free port in **7140-7149**. Anything
  that defaults to 6969 (`scripts/vj/mcp-call.js`, `npm run dev`, the docs' example URLs) must be
  pointed at your port explicitly.
- **Never kill by name or pattern** (`pkill vite`, `killall node`). Kill the process group you
  started; `pc-verify cleanup` does exactly that.
- **Never use claude-in-chrome** (Aaron's own browser) or **`scripts/vj/show.js`** (the show
  browser on CDP port 9333). Use Playwright.
- **One driver per instance.** Two agents on one dev server stomp each other's displays and
  `/__save-shader` writes. Each run launches its own; run state is keyed per checkout, so two
  worktrees verify side by side.

## Launch

| Target | How | Has `/ws`, `/mcp`, `/__save-shader` |
|---|---|---|
| Dev (default) | `$B launch` runs `npx vite --port <free> --strictPort --host 127.0.0.1` (via `node_modules/.bin/vite`) | yes |
| Prod-like | `$B launch --mode preview` runs `npm run build`, then `vite preview --port <free> --strictPort` | no |
| Production | nothing to launch; pass `--base https://visuals.beadfamous.com` | no |
| Branch preview | `--base https://<branch>.paper-cranes-visuals.pages.dev` | no |

- Needs `npm ci` once (about 10 s). `launch` refuses without `node_modules`.
- **Ready** means the port answers `GET /` with the page that holds `<canvas id="visualizer">`.
  `launch` waits for that (up to 90 s) and prints `ready: http://127.0.0.1:<port>` and the proof
  folder. If the server dies, it prints the log tail.
- `--port N` pins a port (still refused if forbidden). `launch` refuses while a run is live.
- `vite preview` is not Cloudflare Pages: Pages 308s `/x.html` to `/x` and answers a missing path
  with `index.html` (200). For Pages behaviour use the smoke suite's server (below) or a real
  preview URL.

## Doctor

`$B doctor` (or `$B doctor --base <url>` for a deployed site). Read-only. Run it first, and again
whenever anything looks off. Exit 1 on any failure.

- **Ours:** process alive; the listener on the port is in the process group `launch` started; its
  working directory is this checkout; the port is not a forbidden one.
- **Which build:** dev serves the working tree, so doctor reports `HEAD` versus the sha at launch,
  and files changed since launch. Preview and deployed sites: the bundle is not content-hashed
  (`assets/main.js`), and no sha marker is embedded, so doctor prints the sha256 of the served
  `/assets/main.js` and compares it with a local `dist/assets/main.js`. To check that production
  is main at a given sha: `git checkout <sha> && npm run build`, then `$B doctor --base
  https://visuals.beadfamous.com` and look for `MATCH`.
- **Renders:** opens `/?shader=plasma&noaudio=true&time=5` in Chromium, requires a WebGL2 context
  (prints the renderer, normally SwiftShader) and `window.cranes.frameCount` advancing.

## Drive

Playwright, from Node, through `bin/lib.mjs` (import it by absolute path from any script).

**Which browser.** Measured 2026-11-24 on this WSL box:

| Need | Use | Why |
|---|---|---|
| Pixels, shaders, UI | Playwright Chromium, `--use-angle=swiftshader --enable-unsafe-swiftshader` (lib's default) | WebGL2 on any box, headless or headful |
| Real audio analysis (`audio_file=`, mic) | Playwright **Firefox** (`--browser firefox`) | In bundled Chromium, headless **and** headful, `audioWorklet.addModule('/window-processor.js')` never resolves, so the page stays on no-audio and every feature is empty. Firefox gives 171 feature keys with energy moving. |
| Headful video | Chromium with `DISPLAY` set (WSLg gives `:0`; elsewhere `xvfb-run -a <cmd>`) | Aaron's rule, below |

The failure is silent: `window.cranes.audio` stays the no-audio stub (`{getFeatures}` only), the
canvas still renders, and nothing is logged. Check `Object.keys(window.cranes.measuredAudioFeatures).length > 0`
before trusting any audio assertion.

Two audio paths are known to work:

- **Local:** Playwright Firefox against your own instance (`$B open ... --browser firefox`).
- **Deployed:** the soul Playwright lanes (`mcp__soul__browser-lanes__lane_acquire`, then
  `mcp__soul__playwright-laneN__*`, then `lane_release`). The coordinator's production audio
  proofs ran on lane 1 with a CORS-OK file URL, for example
  `audio_file=https://cdn.jsdelivr.net/gh/Tonejs/audio@master/drum-samples/breakbeat.mp3`, because
  the repo ships no audio. The lanes were not checked against a `127.0.0.1` dev server.

`e2e/audio-file.test.js` uses `channel: 'chrome'` (system Google Chrome), which is not installed
on this box.

**Deterministic inputs** (all URL params; see CLAUDE.md "Query Parameters"):

- `noaudio=true`: no mic prompt, no audio. Pair with `time=<s>` to hold `iTime`, so a frame is
  repeatable. Controller phases still advance in real time.
- Audio features: inject them as the page's own manual channel, the one MIDI and knobs write
  (`src/midi.js` `updateFeature`): `page.evaluate(f => Object.assign(window.cranes.manualFeatures, f), {...})`.
  Precedence, lowest first: measured audio, wavelet, controller, URL params, `manualFeatures`,
  remote `messageParams` (`index.js` `getCranesState`).
- Knobs: `?knob_1=0.5` in the URL, or inject `knob_N` the same way.
- Real audio: `audio_file=/test-audio/<file>&audio_time=<s>` in Firefox. Put files in
  `public/test-audio/` (gitignored), named `verify-*` so cleanup removes them.
- Compile errors: the page sets `window.cranes.error = {lineNumber, message}` and logs
  `Error information:`; `lib.shaderError(page)` reads it. Before driving a changed shader, run
  `node scripts/validate-shader.js <path>`.
- **A non-black, changing canvas is the proof, not "no errors".** `lib.canvasShot` screenshots
  `#visualizer` and decodes it: lit fraction, distinct colours, mean RGB. `lib.pngDiff` compares
  two frames.
- Assertions that held up in tonight's production checks: with real audio, `onsetKick > 0` and
  some `onsetKickTrigger > 0` on a kick track, `bassNormalized <= 1`, and `beat` never true while
  the input is muted; the distinct-colour count separates a real frame from a blur (about 46,000
  versus 246); `shaders.json` entries carry distinct `modified` dates.
- Serving a test file with `page.route`: match on the pathname
  (`ctx.route(u => u.pathname === '/verify-audio/kick.wav', ...)`). A glob such as `'**/kick.wav'`
  also matches the page URL when its query string ends in that name, and swallows the page.

**Helpers** (all print `PASS`/`FAIL` per check and the evidence folder; exit 1 on failure):

| Command | Drives |
|---|---|
| `$B render [--shader S] [--features JSON] [--params QS] [--video]` | a shader at held `time=5`: rest frame, inject features, injected frame, diff; with `--video` a headful 8 s sweep rest to loud and back, twice. Default features suit `plasma`; pass `--features` for other shaders. |
| `$B open <path\|url> [--viewport 390x844] [--canvas] [--eval JS] [--wait MS] [--headful] [--video] [--browser firefox] [--name N] [--feature F]` | any page: screenshot, pixel stats (`--canvas`), the value of a JS expression, console log |
| `bin/editor-sync.mjs [--video]` | edit.html save reaching a display and disk (dev only) |
| `bin/list-page.mjs [--query Q] [--base URL] [--video]` | list.html on a phone: search, `+` to the set, GO, perform overlay |
| `MCP_URL=http://127.0.0.1:<port>/mcp node scripts/vj/mcp-call.js <tool> '<json>'` | the VJ MCP (dev) |

**Committed suites** to run instead of rewriting them:

- `npx vitest run --config vitest.e2e.config.js e2e/vj-mcp.test.js` (VJ MCP), `e2e/vj-mcp-relay.test.js`
  (relay broker, local wrangler), `e2e/audio-file.test.js` (needs system Chrome and a gitignored
  track). Each starts its own Vite on port 0 (a random free port), never 6969.
- **Smoke suite (coming):** branch `e2e/smoke-suite` (commit `1b061ad9`, not yet on origin) adds
  `npm run test:smoke` (builds and serves `dist/` the way Pages answers), `npm run test:smoke:prod`
  (production plus the live relay), `E2E_BASE_URL=<site>` for any deploy, `E2E_VIDEO_DIR=<dir>` for
  per-page video, and helpers in `e2e/smoke-env.js`. Its local server defaults to port 7129: set
  `E2E_PORT` to a free 714x port. Until it lands, `e2e/helpers.js` holds only feature-sample math
  (`swing`, `mean`, `stddev`, `maxConsecutiveDiff`).

## Evidence

Everything lands in **`$PC_PROOF_DIR`** (default **`~/paper-cranes-proof/`**), as
`<run-id>/<feature>/`, where run-id is `<UTC time>-<short sha>`. It is outside the checkout, so
neither `cleanup` nor removing the worktree touches it. `cleanup` copies the server log into it.

Proof standards:

- **Visual behaviour gets a headful video** (Playwright with `headless: false`, `recordVideo`).
  Aaron, 2026-09-22 (mindmeld session 59132, vault `kb/rules/rule-record-proof-video-headful.md`):
  skipping required video is "reward hacking". Do not fall back to headless video. Stills do not
  replace video of behaviour over time. If the recording cannot be made, say exactly which step
  failed, and publish nothing that implies it exists.
- Capture the action and the resulting state: a rest frame **and** a frame after the input, with
  their pixel stats and the diff, not only the final screen.
- Exercise the real user path: URL params, clicks on the real buttons, the editor's `#save`, a
  socket peer sending what the vjpad sends. Feature injection uses the page's own manual-feature
  channel; it proves the shader's audio mapping, not that audio flows. To prove audio flows, play
  `audio_file=` in Firefox and read `window.cranes.measuredAudioFeatures`.
- Verify side effects as well as pixels: the `.frag` on disk after a save, `readBack` from
  `set_params`, a room peer's received messages, `git status` after the run.
- Keep the console log and page errors with the screenshots (`console*.txt`, `summary.json`).
- A deployed check names the URL and the doctor fingerprint of the bundle it ran against.

## Cleanup

`$B cleanup`, after every run, including failed ones:

- SIGTERM to the process group `launch` started (SIGKILL after 8 s), then reports the port free.
- Restores `shader-dates.json` if the dev server rewrote it since launch; lists any other file
  that changed, and leaves it alone.
- Removes `shaders/claude/wip/verify-scratch/` and `public/test-audio/verify-*`.
- Deletes the scratch run state (`$XDG_RUNTIME_DIR` or `/tmp`, `pc-verify/<checkout-hash>.json`).
- Prints the kept proof folder and its file count. Check it is still there.

## Gotchas

- `scripts/vj/mcp-call.js` defaults to `localhost:6969` (Aaron's server). Always set `MCP_URL`.
  It writes screenshots to `$TMPDIR/vj-mcp-shot-*.jpg`; copy them into the proof folder.
- Plasma has no `@fullscreen`, so its canvas is a centred square, not the full viewport.
- The first second of a page video is black while the shader loads. That is page load, not a fault.
- A build (preview, Pages, production) strips `?shader=` from `edit.html` and reloads once; wait
  for the second load before reading the editor.
- Headful SwiftShader draws about 13 fps; judge motion by frames advancing, not by smoothness.

## Maintenance

The map in [`features/`](features/README.md) is the source of truth for what to verify. Keep it
honest with `/maintain-verification-skill` when pages, params or selectors change.
