# Video input as the backbuffer

`?video=<label substring>` opens a camera or UVC capture card and feeds each frame in as the
shader's previous frame. `getLastFrameColor(uv)`, `prevFrame`, `initialFrame` and `iChannel0` all
return the live video, so feedback shaders run their effects on it.

```
/jam.html?shader=melted-satin/1&video=OBS
/jam.html?shader=melted-satin/1&video=USB%20Video&video_mix=0.7
/jam.html?shader=melted-satin/1&video=default
```

- `video=<substring>` picks the first `videoinput` whose label contains it (case-insensitive).
  No match is a thrown error listing the available labels, never a different device.
- `video=default` takes the OS default camera.
- `video_mix=<0..1>` (default `1`): `1` replaces the previous frame with video; lower values
  mix the video over the real previous frame so feedback trails survive. `initialFrame` and
  `iChannel0` stay pure video.
- `window.cranes.videoInputLabel` holds the opened track's label.
- The video is cover-fit to the canvas aspect: cropped, never stretched.

## How it works

`src/video/videoSource.js` asks for camera permission (labels are blank until granted), picks the
device, and plays it into a hidden muted `<video>`. `src/video/videoBackbuffer.js` uploads a new
texture only when `requestVideoFrameCallback` reports a fresh frame, and runs one cover-fit
blit pass per render (two when `video_mix < 1`). Without `?video`, none of this code runs.

## Downsides

- At `video_mix=1` there are no trails: the shader's own last frame is discarded every frame.
- A 1080p texture upload per new video frame, plus one or two full-screen passes per render.
- Capture cards and virtual cameras add their own latency on top of the render loop.
- Needs the camera permission. `scripts/vj/show.js` grants it to the show browser.
