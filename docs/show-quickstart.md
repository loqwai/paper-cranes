# Show quickstart: clit-set on a projector in five minutes

Written 2026-11-22 for the trunk show. Read this first if you have no memory of earlier sessions.
Deeper docs: `.claude/skills/show/SKILL.md`, `docs/show-playbook.md`, `shaders/clit-set/clit-set.md`.

## 1. Open one link

```
https://2cb.pw/clit-now
```

The coordinator repoints this short link to the best build. On 2026-11-22 it 301s to the techno
build on the `clit-set-polish` preview (below). Then:

1. **Tap the canvas once.** The first touch, click or key press starts audio and goes fullscreen.
2. Allow the microphone when the browser asks.
3. **Do not tap 9 times quickly.** Nine taps within 2 s opens the app-install prompt.

## 2. Direct URLs (all carry the same required params)

| Use | URL |
|---|---|
| Techno build (preview) | `https://clit-set-polish.paper-cranes-visuals.pages.dev/?shader=clit-set/2&controller=clit-set&wavelet=true&fft_size=2048&smoothing=0.3` |
| Prod | `https://visuals.beadfamous.com/?shader=clit-set/2&controller=clit-set&wavelet=true&fft_size=2048&smoothing=0.3` (carries the techno build once PR #181 is merged and deployed; before that it is the older build) |
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
| `audio_device=<label>` (optional) | Picks an input by name, for example `audio_device=BlackHole` for a line feed on the show Mac. Without it the OS default input is used. |
| `audio_gain=<x>` (optional) | Scales the input. A phone or laptop mic hearing the room is 10 to 30 times quieter than a line feed; the techno build is tuned for mic level, so start without it and add `audio_gain=3` only if the picture looks dim and still while music plays. |
| `midi=true` (optional) | Uses a MIDI controller (the Twister). Chrome asks for MIDI permission once. |

**`index.html` vs `jam.html`:** `/?…` (index.html) is the plain fullscreen visual: use it on a
projector or a phone. `/jam.html?…` adds the knob drawer and spacebar snapshots for a laptop
operator; `/show` launches jam.html.

## 4. `/show` on the show Mac (a fresh agent)

1. Use a checkout of `main` (or the branch the coordinator names). Run `npm install` if
   `node_modules` is missing, then `npm run dev`.
2. Read `.claude/skills/show/SKILL.md`, then run `/show` with no args.
3. With no args it launches
   `http://localhost:<port>/jam.html?shader=clit-set/2&controller=clit-set&wavelet=true&vj=1&remote=display`
   on the last display. That already carries `controller` and `wavelet=true`.
4. On a line feed, run `/show audio=BlackHole` (or the device label). On a mic, add `gain=<x>` only
   if the step-3 check shows `cs_presence` low while music plays.
5. Until #181 is merged, `main` has the older build. For the techno build, run
   `git fetch origin && git checkout clit-set-polish` first, or skip `/show` and open the
   techno preview URL above in a fullscreen browser on the projector.

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
2. **Older known-good build:** `https://visuals.beadfamous.com/?shader=clit-set/2&controller=clit-set&wavelet=true&fft_size=2048&smoothing=0.3`.
3. **Last resort:** `https://visuals.beadfamous.com/?shader=clit/2` (the original fractal, no controller).
4. **With an agent on the show Mac:** `/show panic clit-set/2` hot-swaps to the known-good fork with no
   reload.
5. **With an agent on cranes-local:** `PORT=6977 node scripts/remote/cranes-remote.js shader clit-set/2`
   (hot swap, no reload), then `… status` and check `audio.running` is `true`.

## 7. Don'ts

- **Never edit `index.js` or `src/*.js` in `/home/hypnodroid/Projects/paper-cranes-live`** while
  Aaron's phone is on cranes-local, and never restart its Vite server. Either reloads his phone,
  which drops fullscreen and can stop audio. Work in another worktree.
- **Geometry never oscillates.** Camera and shape move one way only (one-way spin, forward voyage).
  Audio changes rates and light, never direction. Back-and-forth sway reads as shiver on the wall.
- Never weaken Cloudflare Access or bind the live dev server to `0.0.0.0`.
- Never put a test or diagnostic shader on the wall.
