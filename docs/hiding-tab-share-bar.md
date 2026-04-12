# Hiding the "Sharing X to this tab" bar (for screen scraping)

When you use `?audio=tab`, Chrome shows a persistent infobar at the top of the visualizer tab:

> Sharing `open.spotify.com` to this tab — **Stop sharing**

It stays visible even in fullscreen, and there is no documented web API to suppress it. If you are screen-scraping the visualizer to drive LEDs, the bar eats the top ~60px of your capture region.

## The fix: `--disable-infobars`

Launch Chrome with the `--disable-infobars` switch. It's a process-wide flag (originally for Chrome for Testing / headless) that disables the entire infobar system, including the tab-sharing bar.

### macOS (Fish)

```fish
# Quit Chrome fully first (Cmd+Q — not just closing windows)
open -na "Google Chrome" --args --disable-infobars --user-data-dir=/tmp/chrome-visualizer
```

The `--user-data-dir` flag is important: it isolates the switch to a separate profile so your daily-driver Chrome still gets translate prompts, password saves, and update nags.

### Linux

```bash
google-chrome --disable-infobars --user-data-dir=/tmp/chrome-visualizer
```

### Windows

```
chrome.exe --disable-infobars --user-data-dir=C:\temp\chrome-visualizer
```

## Why this works (and why nothing else does)

The tab-sharing infobar is created unconditionally in `chrome/browser/ui/views/tab_sharing/tab_sharing_ui_views.cc`. There is no `BASE_FEATURE` gating it — the only related feature flags (`kTabCaptureInfobarLinks`, `kTabSharingBarOmitHttpAndHttps`, `kTabSharingBarOmitCryptographic`) only tweak the icon and URL formatting *inside* the bar.

The only exit path is the comment at the `Create()` call site:

```cpp
// Avoid creating entries with null infobar pointer. This happens when Chrome
// for Testing or Chrome Headless Mode are running with infobars disabled
// using --disable-infobars switch.
```

So `--disable-infobars` is the supported way. Things that do **not** work:

- **Fullscreen API** (`element.requestFullscreen()`) — Chrome keeps the capture indicator on top.
- **`--disable-features=TabCaptureInfobar`** and similar guesses — not a real feature name.
- **CSS / page JS** — the bar is browser chrome, not part of the page.
- **Capture Handle / Conditional Focus / Captured Surface Control APIs** — none of them expose a "hide indicator" option.

## Caveats

- `--disable-infobars` kills *all* infobars in that profile, not just the tab-sharing one. Use `--user-data-dir` to keep it scoped to a throwaway visualizer profile.
- The switch is undocumented in Chrome's stable user-facing flag list. It has been present since Chrome 80+ and is used by Chrome for Testing and Puppeteer, so it's unlikely to vanish — but it isn't a stability guarantee.
- No effect on Firefox or Safari. Those browsers don't currently expose tab audio via `getDisplayMedia` anyway, so this is Chrome/Edge-only territory.
