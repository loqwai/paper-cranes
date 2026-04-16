---
name: jam
description: "Launch a jam session — open the jam page with shader + controller + Spotify/SoundCloud, share tab audio, and get ready to tweak. Usage: `/jam [shader-path] [music-url]`"
allowed-tools: Bash Read Write Edit Grep Glob Agent mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__tabs_create_mcp mcp__claude-in-chrome__navigate mcp__claude-in-chrome__javascript_tool mcp__claude-in-chrome__read_page mcp__claude-in-chrome__read_console_messages mcp__claude-in-chrome__computer
---

# Jam — Launch a Jam Page Session

Open the jam page (`/jam.html`) with a shader, optional controller, and music source. The jam page is lighter than the editor — fullscreen shader + knob drawer + spacebar snapshots. No Monaco editor.

## Context

Arguments (optional shader path, controller, or music URL):
!`echo "$ARGUMENTS"`

Dev server status:
!`curl -s -o /dev/null -w "%{http_code}" http://localhost:6969/ 2>/dev/null || echo "not running"`

Modified shaders in worktree:
!`git diff --name-only HEAD | grep '\.frag$' | head -3 2>/dev/null; git status --short | grep '\.frag' | head -3 2>/dev/null`

Available controllers:
!`ls controllers/*.js 2>/dev/null | sed 's|controllers/||;s|\.js||'`

## Steps

### 1. Ensure the dev server is running

Check if `localhost:6969` responds. If not:
```fish
npm run dev &
```
Wait for it (poll with curl, max 10 seconds).

### 2. Determine the shader

Parse `$ARGUMENTS` for a shader path. Fall back to:
1. Most recently modified `.frag` in the worktree
2. `redaphid/wip/the-coat-fur-coat/the-coat-3` (the latest jam shader)

### 3. Determine the controller

Check if the shader has a matching controller in `controllers/`. Convention: shader `the-coat-3.frag` → controller `the-coat.js`.

If a controller exists, add `&controller=<name>` to the URL.

### 4. Determine the music source

Parse `$ARGUMENTS` for a URL (Spotify, SoundCloud, YouTube). If none provided, default to `https://open.spotify.com`.

### 5. Open Chrome and connect

1. Ensure Chrome is running (`pgrep -x "Google Chrome"` or `open -a "Google Chrome"`)
2. Call `tabs_context_mcp` with `createIfEmpty: true`
3. Create a tab for the music source and navigate there
4. Create a tab for the jam page:
   ```
   http://localhost:6969/jam.html?shader=<path>&audio=tab&controller=<name>
   ```

### 6. Verify the connection

Run on the jam page tab:
```javascript
JSON.stringify({ cranes: !!window.cranes, shader: !!window.cranes?.shader })
```

### 7. Tell the user we're ready

Short and excited:
> Jam page up with [shader]. [Music source] is ready. Play a track, share tab audio, and hit spacebar to snapshot. Let's go!

Remind them:
- Share tab audio when prompted (the `?audio=tab` param triggers the picker)
- **Spacebar** = snapshot preset to queue
- **Backspace** = undo last snapshot
- **Cmd+Shift+D** = toggle knob drawer
- Shader and controller edits hot-swap without reload

### 8. Enter jam mode

Claude should:
- **Edit the shader directly** — `.frag` file edits hot-swap via HMR
- **Edit the controller** — `.js` edits in `controllers/` also hot-swap
- **Read audio state** via `window.cranes.flattenFeatures()` on the jam tab
- **Read knob state** via `window.cranes.manualFeatures`
- **Be responsive** — "more zoom", "eyes too bright", "love the coat" → act immediately
- **Use `/preset process`** to batch-process snapshot queue when asked
- **Use `/fork`** to save the current state as a new shader iteration

### Differences from `/live-session`

| | `/live-session` | `/jam` |
|---|---|---|
| Page | `edit.html` (Monaco editor) | `jam.html` (knob drawer only) |
| Code editing | In-browser Monaco | Claude edits .frag on disk, HMR hot-swaps |
| Snapshots | No | Spacebar → snapshot queue |
| Controller | Not loaded by default | Auto-detected from shader name |
| Purpose | Collaborative coding | Tweaking knobs + capturing presets |
