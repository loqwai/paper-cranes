# FULLSCREEN — getting the jam page onto the projector under the Playwright MCP

Written 2026-09-06 after this cost a live set ~40 minutes. Everything below was measured that
night on a 1440×900 display. Ranked by what actually works. Read "The 60-second version" first;
read the rest at home.

## The 60-second version

1. Confirm the config exists and is exactly this — `cat ~/mcp/playwright-mcp.config.json`:
   ```json
   {
     "browser": {
       "launchOptions": {
         "headless": false,
         "args": ["--start-fullscreen"],
         "ignoreDefaultArgs": ["--enable-automation"]
       },
       "contextOptions": { "viewport": null }
     }
   }
   ```
   and that the launcher passes it — `cat ~/mcp/run_playwright.sh` must contain
   `--config /Users/redaphid/mcp/playwright-mcp.config.json`.
2. In Claude Code: `/mcp` → `playwright` → **Reconnect**. Not a session restart. The config is
   read only at browser launch, so nothing changes until you reconnect.
3. The browser is now fresh (no tabs). `browser_navigate` to the jam URL (the current one is in
   `shaders/redaphid/lattice-interactive/HANDOFF.md` §8). Chromium opens already fullscreen on
   the display the MCP launched it on.
4. Run the **Verify** snippet below. `fillsScreen: true` or you are not done.
5. If the window is on the wrong display: the operator drags it to the projector (Escape first,
   drag, then ⌃⌘F), or set the projector as the primary display in System Settings → Displays
   and reconnect again.

**Mid-set, when a reconnect is unaffordable** (it drops every tab and all shader state):
`browser_evaluate` `() => [screen.width, screen.height]`, then `browser_resize` to exactly those,
then the operator presses **⌃⌘F** (Control-Command-F, macOS native fullscreen) on the Chromium
window. Then Verify.

## Verify

Run this with `browser_evaluate` on the jam tab (select the tab first — the MCP is tab-stateful):

```js
() => {
  const chromeHeight = window.outerHeight - window.innerHeight
  const fillsScreen = window.innerWidth === screen.width
    && window.innerHeight === screen.height
    && chromeHeight === 0
  return {
    innerW: window.innerWidth, innerH: window.innerHeight,
    outerW: window.outerWidth, outerH: window.outerHeight,
    screenW: screen.width, screenH: screen.height,
    chromeHeight, fillsScreen,
  }
}
```

Known-good output, measured 2026-09-06 after reconnect + navigate:

```
innerW 1440 innerH 900 outerW 1440 outerH 900 screenW 1440 screenH 900 chromeHeight 0 fillsScreen true
```

**Trust only `fillsScreen`.** Never `document.fullscreenElement`, never `fullscreenchange`, never
"the cursor hid". In that verified-good state `document.fullscreenElement` was **null**; earlier
the same night it was `HTML` while `innerHeight` was 812 on a 900 px screen. Under Playwright the
API flag and the real window are unrelated (see "Why"). Three "fullscreen fired" reports that
night were false for exactly this reason.

## Two mechanisms called "fullscreen"

They share a word and nothing else. Only the second one puts pixels on the projector.

**1. The CSS class `.fullscreen` on the canvas** — canvas is 100vw × 100vh *inside whatever window
it has*. It does not touch the window.
- `jam.css:36-39` — `canvas.fullscreen { height: 100vh; width: 100vw }`
- `src/Visualizer.js:150-157` — adds the class when `visualizerConfig.fullscreen` is true
- `index.js:371` — `fullscreen: params.get('fullscreen') === 'true' || shaderFullscreen`, so
  `&fullscreen=true` in the URL and the shader's `// @fullscreen: true` metadata are equivalent
- `src/shaderLoader.js:14,24` — detects `@fullscreen: true` and toggles the class
- `src/remote/RemoteDisplay.js:69-75, 88-94` — `remote=display` messages toggle the same class.
  `index.js:352-355` merely imports RemoteDisplay when `?remote=display`. **`remote=display` has
  nothing to do with window fullscreen**; do not chase it.

**2. Window fullscreen** — the OS window covers the display.
- `index.js:315-338` — `addListenersForFullscreen`: on the first user gesture, calls
  `document.documentElement.requestFullscreen()` (`index.js:328`); guarded by
  `document.fullscreenElement` (`index.js:324`); wired at `index.js:363` unless the URL contains
  `edit` or `embed=true`
- `index.js:311-313` — hides the cursor on `fullscreenchange`
- This path works in the operator's own Chrome. **Under Playwright it does not resize the
  window** — see Dead end 1. Under Playwright, window fullscreen comes only from Chromium's
  `--start-fullscreen` launch arg or the operator's ⌃⌘F, and the page only *fills* that window
  when `viewport: null`.

## Dead ends (recognise each in five seconds)

**DEAD END 1 — the in-page Fullscreen API under Playwright.**
Symptom: `document.fullscreenElement` is `HTML`, `fullscreenchange` fired, cursor hidden, and the
projector still shows a letterboxed page with a strip of desktop. Measured: `innerHeight 812`,
`screen.height 900`, `fullscreenElement: HTML`. The renderer believes it is fullscreen; the OS
window never moved. Any check built on `fullscreenElement` is worthless here.

**DEAD END 2 — passing `--headed` to `@playwright/mcp`.**
Symptom: the playwright MCP shows `CONNECTION_CLOSED` in Claude Code the instant it starts.
Cause: the server exits with `error: unknown option '--headed' (Did you mean --headless?)`.
Headed is the **default**; `--headless` is the opt-out; there is no `--headed`. This killed the
MCP for ~15 minutes. Headedness is configured in the JSON (`"headless": false`), not by flag.

**DEAD END 3 — `--kiosk` instead of `--start-fullscreen`.**
Symptom: operator cannot Escape out of the window mid-show to reach anything else. Kiosk traps
you; start-fullscreen lets you leave and come back with ⌃⌘F.

**DEAD END 4 — `--start-fullscreen` without `viewport: null`.**
Symptom: the Chromium window is genuinely fullscreen (no title bar, no tabs) but the page is a
fixed-size rectangle with dead margins. Playwright still emulates its default viewport inside the
big window. `viewport: null` is the load-bearing setting.

**DEAD END 5 — editing the config and expecting it to apply.**
Symptom: nothing changes. The config is read at browser launch. Reconnect the MCP
(`/mcp` → playwright → reconnect). A full Claude Code restart is not needed; a reconnect is.

**DEAD END 6 — editing `index.js` mid-set to "fix" fullscreen.**
Symptom: the page hard-reloads, fullscreen drops, every accumulator/nav/dial resets. The fix in
commit `b88d572` (listeners moved from the canvas to `window` in capture phase, because
`controllers/lattice-controls.js:86` registers a window-capture `mousedown` that
`stopPropagation()`s on dial hits, and `keydown` had been on the non-focusable canvas) is real
but only matters in the operator's own Chrome, not under Playwright. Never touch `index.js`
during a set.

## Why

Playwright drives the page through CDP and, unless told otherwise, applies
`Emulation.setDeviceMetricsOverride` with a fixed default viewport. That override sits between
the page and the window: `innerWidth`/`innerHeight` report the emulated size regardless of what
the real window does, and the Fullscreen API toggles renderer state (`fullscreenElement`,
`fullscreenchange`, `:fullscreen`) without any guarantee the OS window follows. So you get a page
that swears it is fullscreen inside a window that isn't, or a fullscreen window with a
letterboxed page inside it. `contextOptions.viewport: null` removes the override so the page
tracks the real window; `--start-fullscreen` makes the real window cover the display;
`ignoreDefaultArgs: ["--enable-automation"]` removes the "Chrome is being controlled by automated
test software" infobar that would otherwise eat the top of the show.

## If it still isn't fullscreen

- **(a) Which display is the window on?** Chromium opens on the display where the MCP launched
  it, which is normally the laptop. Either drag the window to the projector (Escape → drag →
  ⌃⌘F) or set the projector as the primary display before reconnecting. `screen.width/height`
  in Verify tells you which display the page thinks it is on.
- **(b) Did you reconnect the MCP after editing the config?** `/mcp` → playwright → reconnect,
  then `browser_navigate` again. Editing alone does nothing.
- **(c) Is `viewport` really `null`?** JSON `null`, not the string `"null"`, not `{}` and not
  omitted. `python3 -c 'import json;print(json.load(open("/Users/redaphid/mcp/playwright-mcp.config.json"))["browser"]["contextOptions"]["viewport"] is None)'`
  must print `True`.
- **(d) Does the launcher pass `--config`?** `grep -- --config ~/mcp/run_playwright.sh` must hit,
  and the path must be absolute and correct. If Claude Code's MCP entry points at a bare
  `npx @playwright/mcp` instead of `~/mcp/run_playwright.sh`, the config is never read.
