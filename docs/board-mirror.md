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

MEASURED_TABLE

## Approaches not taken

- **WebRTC video** (`canvas.captureStream()` to a peer connection): it costs the wall an encoder per
  viewer, or an SFU. It needs signalling through the relay and TURN for phones behind carrier NAT. It
  is also many times the bandwidth.
- **Snapshots** (a JPEG of the wall every second): this is cheap and safe on any phone, but it
  shows 1 frame a second. Written to a board as an image, each snapshot is a board write. It uses the
  board's image budget, and every agent that reads the board sees it change. Keep it as a fallback that
  the wall serves at a URL, not as board writes.
