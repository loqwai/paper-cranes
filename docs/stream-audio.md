# Live Stream Audio (`audio=<url>`)

Play **and** visualize a live audio stream by passing its URL as the `audio`
param. Built for browsers with no usable microphone — a parked Tesla, a kiosk,
a TV — where you want to pipe your computer's audio to the device and see it
react.

```
https://visuals.beadfamous.com/?shader=plasma&audio=https://your-stream.example.com/stream
```

A one-tap "Tap to start" overlay appears (browsers block autoplay until a
gesture). Tap it: the stream plays through the device's speakers and the shader
reacts to it. Because the device both plays and analyzes the *same buffered
audio*, sound and visuals stay in sync locally no matter the network latency.

## How it detects a stream

`?audio=` is overloaded: `none` disables audio, `tab` captures a browser tab,
and anything matching `http(s)://…` is treated as a stream URL. Detection is a
simple regex in `setupAudio()` (`index.js`); the stream path lives in
`src/audio/streamAudioSource.js`.

Unlike `audio_file=` (which does `fetch` + `decodeAudioData` and needs a finite
file), a stream uses an `<audio>` element + `createMediaElementSource`, so it
works on an endless feed.

## Two requirements for the visuals to react

Playback works without these, but the analyser will read silence and nothing
will animate:

1. **HTTPS.** The visualizer page is served over HTTPS, so the stream URL must
   be HTTPS too — a plain `http://` stream is blocked as mixed content.
2. **CORS.** The stream must send `Access-Control-Allow-Origin` (e.g. `*`). We
   set `crossOrigin="anonymous"` on the element; without the matching response
   header Web Audio refuses to read the samples. Icecast can add this via
   `<http-headers>`; a bare `ffmpeg -listen` HTTP server cannot, which is why
   the recommended setup below uses Icecast.

If the URL itself contains query params (`?mount=…&x=…`), URL-encode it before
putting it in the `audio=` value so the `&` doesn't split the outer URL.

## Streaming your desktop audio (Windows → parked Tesla)

End-to-end recipe for "hear + see my PC's audio in the car over LTE":

```
system audio → [Stereo Mix / VB-Cable] → ffmpeg (MP3) → Icecast (serve + CORS) → cloudflared (public HTTPS)
```

1. **Loopback device** — enable *Stereo Mix* in Windows Sound settings, or
   install the free **VB-Audio Cable** and make it the default playback device.
2. **Icecast2** — run it locally; set a source password and, on the mount, add
   `Access-Control-Allow-Origin: *` (Icecast `<http-headers>`).
3. **ffmpeg** — capture the loopback device, encode MP3, push to Icecast:
   ```
   ffmpeg -f dshow -i audio="Stereo Mix (Realtek Audio)" \
     -c:a libmp3lame -b:a 128k -content_type audio/mpeg \
     -f mp3 icecast://source:PASSWORD@localhost:8000/stream
   ```
4. **cloudflared** — expose Icecast as public HTTPS (no port-forwarding), so the
   car can reach it on LTE:
   ```
   cloudflared tunnel --url http://localhost:8000
   ```
   Use the printed `https://xxxx.trycloudflare.com/stream` as the `audio=` value.

In the car (in Park):
`https://visuals.beadfamous.com/?shader=plasma&audio=https://xxxx.trycloudflare.com/stream`

**On your LAN** (charging at home, or testing) you can skip Icecast/cloudflared
and let ffmpeg serve directly — but only if the page is same-origin with the
stream, since a LAN `http://` stream is otherwise blocked by mixed content and
lacks CORS headers.

## Tesla browser notes

- Visuals only render in **Park** (the browser suspends while driving).
- The browser is dated Chromium — test `?shader=plasma` for framerate first and
  prefer light shaders (frequency-band ones) over heavy raymarching/fractals.
- Autoplay needs the one tap; the overlay handles that and also requests
  fullscreen on the same gesture.

## Key files

- `src/audio/streamAudioSource.js` — `<audio>` + `createMediaElementSource`
  wiring, start overlay, reconnect-on-drop
- `index.js` — URL detection in `setupAudio()`, dynamic import when `?audio=` is
  a URL
