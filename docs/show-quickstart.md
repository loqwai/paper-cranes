# Show quickstart: clit-set on a projector in five minutes

Written 2026-11-22 for the trunk show. Read this first if you have no memory of earlier sessions.
Deeper docs: `.claude/skills/show/SKILL.md`, `docs/show-playbook.md`, `shaders/clit-set/clit-set.md`.

## 1. Open one link

```
https://2cb.pw/clit-now
```

The coordinator repoints this short link to the best build. On 2026-11-22 it 301s to the techno
build on prod (below). Then:

1. **Tap the canvas once.** The first touch, click or key press starts audio and goes fullscreen.
2. Allow the microphone when the browser asks.
3. **Do not tap 9 times quickly.** Nine taps within 2 s opens the app-install prompt.

## 2. Direct URLs (all carry the same required params)

| Use | URL |
|---|---|
| Prod (techno build, PR #181) | `https://visuals.beadfamous.com/?shader=clit-set/2&controller=clit-set&wavelet=true&fft_size=2048&smoothing=0.3` |
| Same build, branch preview | `https://clit-set-polish.paper-cranes-visuals.pages.dev/?shader=clit-set/2&controller=clit-set&wavelet=true&fft_size=2048&smoothing=0.3` |
| Remote-controllable | `https://cranes-local.hypnodroid.com/?shader=clit-set/2&controller=clit-set&wavelet=true&midi=true` |

The remote-controllable URL needs Cloudflare Access login, the dev server on this machine (soul)
on port 6977, and the soul cloudflared container. Start commands: vault note
`kb/reference/paper-cranes-live-tunnel.md`. Agents then drive it with
`PORT=6977 node scripts/remote/cranes-remote.js status` (see `docs/remote-inspect.md`).

## 3. Required params and why

| Param | Why |
|---|---|
| `shader=clit-set/2` | The show visual. |
| `controller=clit-set` | **Required.** Without it there is no voyage, no kick punch and no presence gate: the picture sits nearly still. |
| `wavelet=true` | **Required.** Kick detection (`wavelet_bassHit`) comes from the wavelet features. Without it the visual barely reacts. |
| `fft_size=2048&smoothing=0.3` | The tuning the build was measured with. |
| `vj=1` (optional) | Installs the meters (`window.__vjMeter`: flicker, clip, motion). Agents use it; the audience sees no difference. |
| `audio_device=<label>` (optional) | Picks an input by name, for example `audio_device=BlackHole` for a line feed on the show Mac. Without it the OS default input is used, and **on the show Mac the OS default input is BlackHole**, so the live mic always needs `audio_device=MacBook`. |
| `audio_gain=<x>` (optional) | Scales the input. A laptop mic hearing the room is 10 to 30 times quieter than a line feed. On the show Mac the live mic needs `audio_device=MacBook&audio_gain=4` (measured with the Mac in a car trunk, far from the speakers); BlackHole runs at gain 1. |
| `midi=true` (optional) | Uses a MIDI controller (the Twister). Chrome asks for MIDI permission once. |

**`index.html` vs `jam.html`:** `/?…` (index.html) is the plain fullscreen visual: use it on a
projector or a phone. `/jam.html?…` adds the knob drawer and spacebar snapshots for a laptop
operator; `/show` launches jam.html.

## 4. `/show` on the show Mac (a fresh agent)

1. Use a checkout of `main`: `git fetch origin && git checkout main && git pull --ff-only`. Run
   `npm install` if `node_modules` is missing, then `npm run dev`.
2. Read `.claude/skills/show/SKILL.md`, then run `/show` with no args.
3. With no args it launches
   `http://localhost:<port>/jam.html?shader=clit-set/2&controller=clit-set&wavelet=true&vj=1&remote=display`
   on the last display. That already carries `controller` and `wavelet=true`.
4. On a line feed, run `/show audio=BlackHole` (or the device label). On a mic, add `gain=<x>` only
   if the step-3 check shows `cs_presence` low while music plays.
5. Main carries the techno build, so `/show` with no args needs nothing extra. Without an agent,
   open the prod URL above in a fullscreen browser on the projector.

## 5. Knob map (16 Twister dials, all at 0 = autopilot)

| Row | Dial 1 | Dial 2 | Dial 3 | Dial 4 |
|---|---|---|---|---|
| 1 navigate | k1 X | k2 Y | k3 VOYAGE | k4 ZOOM |
| 2 shape | k5 TURN | k6 POWER | k7 BODY | k8 CURL |
| 3 colour | k9 HUE | k10 NEBULA | k11 TRAILS | k12 REACT (audio size x1 to x2.5) |
| 4 light | k13 GLASSES | k14 EMBER | k15 SPOT | k16 LACE |

- Every dial at 0 is the autopilot: a slow voyage through six waypoints that comes home every
  10 minutes. A reload (all dials read 0) still looks right.
- k1, k2, k3 blend in over the first 8% of the dial. Zoom stops at 3x.
- Audio never moves the camera. It drives light, lace, rim, stars, the ember and the kick punch.

## 6. Fallbacks and panic

1. **Picture wrong or frozen, on a phone or browser with no agent:** reload the link, then tap once.
2. **Other known-good fork:** `https://visuals.beadfamous.com/?shader=clit-set/1&controller=clit-set&wavelet=true&fft_size=2048&smoothing=0.3`.
3. **Last resort:** `https://visuals.beadfamous.com/?shader=clit/2` (the original fractal, no controller).
4. **With an agent on the show Mac:** `/show panic clit-set/2` hot-swaps to the known-good fork with no
   reload.
5. **With an agent on cranes-local:** `PORT=6977 node scripts/remote/cranes-remote.js shader clit-set/2`
   (hot swap, no reload), then `… status` and check `audio.running` is `true`.

## 7. Known gap

`2cb.pw/clit-new/2` to `/201` (the NFC bead variants) point at prod `clit-set/3`, `/4` and `/5`. Prod
does not serve those frags until PR #180 is merged and deployed, so those links do not render yet.
`clit-now` and `clit-new/1` are unaffected.

## 8. Don'ts

- **Never edit `index.js` or `src/*.js` in `/home/hypnodroid/Projects/paper-cranes-live`** while
  Aaron's phone is on cranes-local, and never restart its Vite server. Either reloads his phone,
  which drops fullscreen and can stop audio. Work in another worktree.
- **Geometry never oscillates.** Camera and shape move one way only (one-way spin, forward voyage).
  Audio changes rates and light, never direction. Back-and-forth sway reads as shiver on the wall.
- Never weaken Cloudflare Access or bind the live dev server to `0.0.0.0`.
- Never put a test or diagnostic shader on the wall.

## Swap the input: live mic ↔ BlackHole

```
npm run audio -- mic             # MacBook Pro Microphone at gain 4
npm run audio -- mic --gain 6    # same, different gain
npm run audio -- blackhole       # BlackHole 2ch (line feed from this Mac) at gain 1
npm run audio -- toggle          # whichever one is not live now
```

`scripts/show/audio-swap.js` drives the show browser over CDP (`scripts/vj/show.js`). On a page
that exposes `window.cranes.audioSource` (index.js after this change) it swaps the device in
place: no reload, feature history and voyage clocks survive. On an older page it reloads the show
page with `audio_device=` swapped, which resets feature history but keeps the kiosk window. Either
way it prints the live input label and exits 1 unless energy rises above 0.005 within 3 s, so a near-silent bus (nothing routed to BlackHole) fails loudly with the measured energy. Asking for the
input that is already live only re-applies the gain and prints the status. `mic` defaults to
`audio_gain=4` and `blackhole` to 1; `--gain N` overrides either, applied live and written into the
page URL so a reload keeps it. `toggle` exits 1 if the live input is neither, rather than guessing.
A bad argument prints the usage line and exits 2. The OS default input on the show Mac is
BlackHole, so a page with no `audio_device` listens to BlackHole, not the mic: the live mic URL is
`…&audio_device=MacBook&audio_gain=4`.
