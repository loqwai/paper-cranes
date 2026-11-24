# Board mirror: the wall, live, on a draw board

`mirror.html` shows a relay room's wall on another page, such as a draw board, a second screen or a
phone in the crowd. It sends no video. The wall sends the numbers it drew its last frame with, and the
mirror draws the same shader from them, at a lower resolution.

```
wall (?remote=display&room=R)                relay room R (Durable Object)           mirror.html?view=V
  draws a frame with uniforms U    ──────►   mirror-frame: registered display only  ──────►  draws the same shader with U
  20 Hz while status.viewers > 0             → viewer sockets only                            at scale 0.5, at most 30 fps
                                             viewer's own frames: dropped
```

## Use it

1. Get the room's view id. Anyone who has the room name can ask for it:

   ```
   curl https://relay.beadfamous.com/view-key/<room>
   {"view":"<64 hex digits>"}
   ```

2. Open or embed the mirror:

   ```
   https://visuals.beadfamous.com/mirror.html?view=<view id>
   ```

   | param | default | what it does |
   |---|---|---|
   | `view` | required | the room's view id |
   | `relay` | `relay.beadfamous.com` | another relay host, such as `127.0.0.1:7171` for `wrangler dev` |
   | `scale` | `0.5` | the largest share of the page's CSS size the mirror draws at (0.1 to 1) |
   | `fps` | `30` | the most frames a second it draws (1 to 60) |

3. On a draw board, draw a rectangle and set its link to the mirror URL. Every tab that has the rectangle
   on screen plays the mirror over it. An agent's `read` lists one rectangle, and its `screenshot` draws
   the rectangle and its label. See redaphid/draw, `frontend/src/board/liveEmbed.ts`.

The wall needs no setting. It is any page with `?remote=display&room=<room>`, and it sends the feed
only while at least one mirror watches.

## What the mirror can and cannot do

A mirror only watches.

- The relay drops every frame a viewer sends: knobs, a display hello, a forged feed, and `vj-signal`.
- A viewer never registers as a display, so `list_displays`, `inspect` and the display secret never see it.
- A viewer hears only `status` and the feed. It never hears the room's `update-params` or `audio-features`.
- The relay takes the feed (`mirror-state`, `mirror-frame`) only from a registered display. In a room with a
  display secret, that is a display that proved the secret.
- The view id is the room's Durable Object id, a keyed one-way hash of the room name. You cannot get the
  room name back from it. So a mirror link on a board that many people read does not let them steer the wall.
- The mirror never reads or needs `display_secret`. A board drops a link's hash before it loads the frame.
- `status.connectedClients` leaves viewers out, because editors show it as "N displays". `status.viewers`
  counts them.

## The feed

| message | when | data |
|---|---|---|
| `mirror-state` | the feed starts, a viewer joins, or the wall's shader changes | `{ code, shader, fullscreen }`: the shader source the wall draws |
| `mirror-frame` | 20 times a second | `{ t, f, sent }`: wall time, the uniforms, and `Date.now()` on the wall |

`f` holds only the uniforms that the shader source names (`src/remote/mirrorFeed.js`). The values are
the wall's final values for that frame: audio features, knobs, controller outputs and seeds, after
precedence. The mirror does not need a microphone, the controller or the seeds. Numbers are rounded to
4 decimal places, and strings are left out.

The mirror carries the wall's clock forward between frames, for at most 1 second. After 3 seconds with
no frame, it stops drawing and says "the wall went quiet".

Not mirrored: `image=` textures (the mirror uses the placeholder image) and frame feedback history. A
feedback shader builds its own history from the same inputs, so it looks alike but not pixel for pixel.

## Cost on a weak phone

- The mirror draws at `scale` (0.5) of its CSS size, at most `fps` (30) times a second.
- It never holds a wake lock.
- It stops drawing while its page is hidden, or while its canvas is out of the top-level viewport.
  IntersectionObserver's implicit root is the top-level viewport even inside an iframe.
- On a board, the iframe exists only while its rectangle is on screen and at least 120 CSS px wide. At
  most 2 play at once.

## Measured

`node scripts/vj/mirror-bench.js --profile phone|desktop` measures each approach. The board is a
stand-in page: a grid panned every frame, a 480x270 picture, and a button tapped 20 times. The wall runs
`clit-set/2` with every audio feature moving, in its own browser.

Measured 2026-11-24 on WSL2 with headless Chromium. WSL has no GPU in headless mode, so every page,
the wall's included, draws on SwiftShader (a software GPU on the CPU). **phone** is Pixel 7 emulation
with the CPU throttled 4x, and with site isolation off, as on Android, where a cross-site iframe shares
the board's renderer. **desktop** is 1280x800. CPU is the sum over each browser's process tree (100% is
one core). Each core here also draws the wall and the other pages, so read CPU as a relative figure only.

| profile | picture | board fps | board p95 | janky frames | tap to next frame p95 | picture fps | KB/s per viewer | behind the wall (p50) |
|---|---|---|---|---|---|---|---|---|
| phone | none | 59.5 | 16.8 ms | 0.2% | 100 ms | | | |
| phone | **(a) mirror** | 58.7 | 16.7 ms | 0.3% | 57 ms | **30.1** | **5.1** | **7 ms** |
| phone | (b) WebRTC 480x270 | 59.6 | 16.7 ms | 0.2% | 52 ms | 15.5 | 139 | 49 ms |
| phone | (c) JPEG every 1 s | 48.5 | 16.7 ms | 0.8% | 1277 ms | 1.1 | 17 | 500 ms |
| desktop | none | 60 | 16.7 ms | 0% | 16 ms | | | |
| desktop | **(a) mirror** | 30.6 | 66.6 ms | 24.3% | 43 ms | 24.1 | 6.8 | 10 ms |
| desktop | (b) WebRTC 480x270 | 60 | 16.7 ms | 0% | 20 ms | 12.6 | 145 | 76 ms |
| desktop | (c) JPEG every 1 s | 60 | 16.7 ms | 0% | 16 ms | 1 | 16 | 500 ms |

With the weak-phone settings `&fps=15&scale=0.35`, the software GPU keeps up:

| profile | picture | board fps | board p95 | janky frames | tap to next frame p95 | picture fps | KB/s per viewer | behind the wall (p50) |
|---|---|---|---|---|---|---|---|---|
| phone | (a) mirror, `fps=15&scale=0.35` | 59.1 | 16.7 ms | 0.3% | 54 ms | 15.1 | 6.7 | 9 ms |
| desktop | (a) mirror, `fps=15&scale=0.35` | **60** | 16.7 ms | **0%** | 14 ms | 15.2 | 7.0 | 6 ms |

Rerun with `node scripts/vj/mirror-bench.js --profile phone|desktop [--only mirror] [--mirror-query '&fps=15&scale=0.35']`.
`--serve 300` keeps only the wall up and prints a mirror link for a browser on another machine.

On a real GPU (an RTX 4090 through ANGLE/D3D11, a headless Chrome on the Windows host), a page that
pans a grid around a 480x270 mirror iframe holds **144 fps, p95 7.1 ms, 0% janky frames**. That is the
same as with no iframe, at the default settings and at `scale=1&fps=60`. The mirror drew 45 fps at
1258x802 against a feed of 20 frames a second, 18.6 KB/s at that size with 15 uniforms, and was 1 ms behind.
A raw viewer socket counts **20 frames a second, 736 bytes each (about 14.4 KB/s)** for `clit-set/2`.

**Winner: (a) the mirror.** It shows full frame rate at about a tenth of WebRTC's bandwidth and is
the closest to the wall. It needs no encoder on the wall and no TURN, and it adds nothing to the
board's own writes or tokens. Its one cost is GPU: the mirror draws the shader itself. On a
software GPU, that halves the board's frame rate on the desktop profile. On a real GPU it costs
nothing measurable. A weak phone should lower `fps` and `scale`. A real phone has not been measured.

The phone profile's board did not slow down because the phone's emulated screen is small, so the
board stand-in has less to draw. That shows the board stand-in, not a real phone's GPU.

## Approaches not taken

- **WebRTC video** (`canvas.captureStream()` to a peer connection): it costs the wall an encoder per
  viewer, or an SFU. It needs signalling through the relay and TURN for phones behind carrier NAT. It
  is also many times the bandwidth.
- **Snapshots** (a JPEG of the wall every second): this is cheap and safe on any phone, but it
  shows 1 frame a second. Written to a board as an image, each snapshot is a board write. It uses the
  board's image budget, and every agent that reads the board sees it change. Keep it as a fallback that
  the wall serves at a URL, not as board writes.
