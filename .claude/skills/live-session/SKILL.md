---
name: live-session
description: Launch a live creative session — open Chrome with the shader editor + audio source, connect Claude-in-Chrome, and get ready to jam. Use `/live-session` to start, optionally pass a shader path or SoundCloud/Spotify URL.
allowed-tools: Bash Read Write Edit Grep Glob Agent mcp__claude-in-chrome__tabs_context_mcp mcp__claude-in-chrome__tabs_create_mcp mcp__claude-in-chrome__navigate mcp__claude-in-chrome__javascript_tool mcp__claude-in-chrome__read_page mcp__claude-in-chrome__read_console_messages
---

# Live Session — Creative Audio-Visual Jam with Claude

Launch everything needed for a live shader + music session where Claude edits visuals in real-time while the user vibes to music.

## Context

Arguments (optional shader path, audio URL, or mode):
!`echo "$ARGUMENTS"`

Dev server status:
!`curl -s -o /dev/null -w "%{http_code}" http://localhost:6969/ 2>/dev/null || echo "not running"`

Modified shaders in worktree (fallback target):
!`git diff --name-only HEAD | grep '\.frag$' | head -3 2>/dev/null; git status --short | grep '\.frag' | head -3 2>/dev/null`

## What This Skill Does

Gets Claude and the user into a **live creative session** as fast as possible. The goal is **fun** — music playing, visuals reacting, Claude making edits that hot-reload in real-time, user tweaking knobs and vibing.

## Steps

### 1. Ensure the dev server is running

Check if `localhost:6969` responds. If not, start it:
```fish
cd /Users/redaphid/Projects/paper-cranes && npm run dev &
```
Wait for it to be ready (poll with curl, max 10 seconds).

### 2. Determine the shader

From `$ARGUMENTS`, or fall back to:
1. The most recently modified `.frag` in the worktree
2. `redaphid/wip/dubstep-daddy-fur-coat/dubstep-daddy-fur-coat-reactive` (the default jam shader)

### 3. Open Chrome and connect

**Important lessons learned:**
- Chrome may not be running. Check first with `pgrep -x "Google Chrome"`. If not running, `open -a "Google Chrome"` and wait a beat.
- After launching Chrome or reconnecting MCP, call `tabs_context_mcp` with `createIfEmpty: true` to get **fresh** tab IDs. Old tab IDs from previous sessions are stale and will silently fail.
- Do NOT trust tab data from before the MCP reconnection.

Steps:
1. Ensure Chrome is running (launch if needed)
2. Call `tabs_context_mcp` with `createIfEmpty: true`
3. Create a new tab and navigate to the editor:
   ```
   http://localhost:6969/edit.html?shader=<shader-path>&audio=tab
   ```
4. Create another tab for the audio source:
   - If a SoundCloud/Spotify URL was provided in `$ARGUMENTS`, navigate there
   - Otherwise open `https://soundcloud.com` (good default — no login required to browse)

### 4. Verify the connection works

Run a quick JavaScript check on the editor tab to confirm Claude can actually control the browser:
```javascript
document.title
```
If this fails or returns unexpected results, tell the user the connection isn't working and suggest they run `/mcp` to reconnect claude-in-chrome.

### 5. Tell the user we're ready

Keep it short and excited. Something like:
> Editor's up with [shader name], [audio source] is ready. Play some music and share the tab audio — let's jam!

Remind them to:
- Share tab audio from the music tab to the editor (Chrome tab audio capture)
- The `?audio=tab` param is already in the URL so it'll prompt automatically

### 6. Enter jam mode

Now the fun begins. Claude should:
- **Be proactive with edits** — don't ask permission for every change, just edit the .frag file and let HMR reload it
- **Read audio state** when useful via `window.cranes.controllerFeatures` or `window.cranes.flattenFeatures()`
- **Respond to vibes** — if the user says "more intense" or "that's sick", act on it immediately
- **Revert fast** if something breaks — the user shouldn't have to wait while you debug
- **Use knobs** for rapid exploration: `window.cranes.manualFeatures.knob_1 = 0.5`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Chrome not launching | `open -a "Google Chrome"` and retry |
| Stale tab IDs | Call `tabs_context_mcp` again — never reuse IDs across sessions |
| JavaScript execution fails | User should run `/mcp` in Claude Code to reconnect |
| No audio in shader | User needs to click "Share Tab Audio" in Chrome's tab capture dialog |
| Dev server not running | `npm run dev` in the project root |
| HMR not pushing changes | Check that the file is saved — edits via the Edit tool save automatically |
