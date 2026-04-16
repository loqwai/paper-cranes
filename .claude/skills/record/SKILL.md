---
name: record
description: "Record a music video from the current shader. Captures canvas video via MediaRecorder, restarts the Spotify/music track, and auto-stops when done. Usage: `/record [duration-seconds]`"
allowed-tools: Bash Read Write Edit Grep Glob Agent mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__tabs_create_mcp mcp__claude-in-chrome__navigate mcp__claude-in-chrome__javascript_tool mcp__claude-in-chrome__read_page mcp__claude-in-chrome__computer
---

# Record — Capture a Music Video from the Shader

Record the WebGL canvas as a WebM video file using the browser's MediaRecorder API. Optionally restarts the music track so the video starts from the beginning.

## Context

Arguments (optional duration in seconds, default 30):
!`echo "$ARGUMENTS"`

## Steps

### 1. Find the active tabs

Call `tabs_context_mcp` to find:
- The shader tab (jam page or editor — look for `jam.html` or `edit.html` in the URL)
- The music tab (Spotify, SoundCloud, YouTube — look for these domains)

If no shader tab is found, tell the user to open one first (suggest `/jam`).

### 2. Parse duration

If `$ARGUMENTS` contains a number, use it as duration in seconds. Default: 30.
If `$ARGUMENTS` contains "full", read the track duration from the music tab if possible.

### 3. Determine the output filename

Read the shader name and music tab title to generate a filename:
```
the-coat-3--rain-apashe.webm
```

### 4. Restart the music track

On the music tab, click the Previous button twice to restart from the beginning:
- Find the "Previous" button via `read_page` (interactive filter)
- Click it twice with `computer` tool

Wait 0.5s for the track to restart.

### 5. Start recording

On the shader tab, inject the recording script:
```javascript
(() => {
  const canvas = document.getElementById('visualizer')
  const stream = canvas.captureStream(30) // 30fps from canvas
  
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 8000000
  })
  
  const chunks = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '<FILENAME>'
    a.click()
    URL.revokeObjectURL(url)
    window.flashToast?.('Video saved!')
    window._recordingDone = true
  }
  
  window._recorder = recorder
  window._recordingDone = false
  recorder.start(100)
  
  setTimeout(() => {
    if (recorder.state === 'recording') recorder.stop()
  }, <DURATION_MS>)
  
  window.flashToast?.('Recording... (' + <DURATION_S> + 's)')
  return 'recording'
})()
```

Replace `<FILENAME>`, `<DURATION_MS>`, and `<DURATION_S>` with actual values.

### 6. Wait for completion

The recording auto-stops after the duration. Check periodically:
```javascript
window._recordingDone
```

### 7. Report

Tell the user:
> Recorded [duration]s of [shader name] with [music]. Check your downloads for `<filename>`.

### Limitations

- **Video only** — the canvas `captureStream()` API captures video but not the tab audio. The audio would need to be muxed separately. Mention this to the user.
- **WebM format** — browsers record as WebM. If the user needs MP4, suggest: `ffmpeg -i input.webm -c:v libx264 output.mp4`
- **30fps** — canvas capture is locked to 30fps. The shader may render at 60fps but the recording won't capture every frame.

### Future: Audio Muxing

If the user wants audio in the video, the approach would be:
1. Record the canvas video as above
2. Record the tab audio separately via `audioContext.createMediaStreamDestination()`
3. Combine both streams into one MediaRecorder
4. Or use ffmpeg to mux the video with a separate audio file
