// show — the live-show browser. A dedicated Chrome in kiosk mode that Claude drives over CDP.
//
// Why not the claude-in-chrome extension: it paints an orange glow on the window edges, a
// "Claude is debugging this browser" infobar, and a synthetic cursor in the middle of the wall.
// Why not a Playwright/Puppeteer launch: they pass --enable-automation, which adds the
// "controlled by automated test software" bar. Here Chrome is spawned by hand with neither, and
// every command attaches over the debugging port. CDP evaluate/screenshot never touch the pointer.
//
//   node scripts/vj/show.js launch <url> [--display N]   start (or re-point) the show window
//   node scripts/vj/show.js goto <url>                    navigate the show page
//   node scripts/vj/show.js eval '<js fn or expr>' [json-args-array]   prints the JSON result
//   node scripts/vj/show.js shot <file.png>               capture the page (not the screen)
//   node scripts/vj/show.js status                        is it up, and what is it showing
//   node scripts/vj/show.js displays                      list displays (index for --display)
//   node scripts/vj/show.js stop                          close the show browser
//
// Env: SHOW_CDP_PORT, SHOW_CHROME, SHOW_PROFILE, SHOW_CHROME_FLAGS (extra Chrome flags).
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright'

const CDP_PORT = parseInt(process.env.SHOW_CDP_PORT || '9333')
const CDP_URL = `http://127.0.0.1:${CDP_PORT}`

// Displays come back as { name, left, top, width, height } in OS screen coordinates (top-left
// origin of the primary screen), primary first.
const PLATFORMS = {
  darwin: {
    chrome: () => '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    profile: join(homedir(), 'Library', 'Application Support', 'paper-cranes-show'),
    displays: () => {
      const js = 'ObjC.import("AppKit");const s=$.NSScreen.screens;const o=[];for(let i=0;i<s.count;i++){const c=s.objectAtIndex(i),f=c.frame;o.push({name:ObjC.unwrap(c.localizedName),x:f.origin.x,y:f.origin.y,w:f.size.width,h:f.size.height})};JSON.stringify(o)'
      const screens = JSON.parse(execFileSync('osascript', ['-l', 'JavaScript', '-e', js]).toString())
      const mainH = screens[0].h
      // NSScreen is bottom-left origin.
      return screens.map(s => ({ name: s.name, left: s.x, top: mainH - (s.y + s.h), width: s.w, height: s.h }))
    },
    keepAwake: pid => spawn('caffeinate', ['-dimsu', '-w', String(pid)], { detached: true, stdio: 'ignore' }).unref(),
  },
  win32: {
    chrome: () => join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    profile: join(process.env.LOCALAPPDATA || homedir(), 'paper-cranes-show'),
    displays: () => {
      const ps = 'Add-Type -AssemblyName System.Windows.Forms; @([System.Windows.Forms.Screen]::AllScreens | Sort-Object { -not $_.Primary }, { $_.Bounds.X } | % { @{ name = $_.DeviceName; left = $_.Bounds.X; top = $_.Bounds.Y; width = $_.Bounds.Width; height = $_.Bounds.Height } }) | ConvertTo-Json -Compress'
      return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', ps]).toString())
    },
    // SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED) lasts as long as this PowerShell lives.
    keepAwake: pid => spawn('powershell.exe', ['-NoProfile', '-Command',
      `Add-Type -Name P -Namespace W -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'; [W.P]::SetThreadExecutionState(0x80000003) | Out-Null; Wait-Process -Id ${pid}`,
    ], { detached: true, stdio: 'ignore', windowsHide: true }).unref(),
    // With mixed display scaling, --window-position lands on the wrong screen (measured: a 150%
    // primary + 100% secondary put the window on the primary), so the window is moved in Chrome's
    // own screen coordinates after launch.
    placeByChrome: true,
  },
  linux: {
    chrome: () => {
      const dirs = (process.env.PATH || '').split(':')
      for (const name of ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']) {
        const found = dirs.map(d => join(d, name)).find(f => existsSync(f))
        if (found) return found
      }
      throw new Error('no Chrome or Chromium on PATH; set SHOW_CHROME=/path/to/chrome')
    },
    profile: join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'paper-cranes-show'),
    // " 0: +*DP-1 2560/597x1440/336+0+0  DP-1": the * marks the primary.
    displays: () => {
      const out = execFileSync('xrandr', ['--listmonitors']).toString()
      return [...out.matchAll(/^\s*\d+:\s+\+?(\*?)(\S+)\s+(\d+)\/\d+x(\d+)\/\d+\+(-?\d+)\+(-?\d+)/gm)]
        .map(([, star, name, width, height, left, top]) => ({ primary: star === '*', name, left: +left, top: +top, width: +width, height: +height }))
        .sort((a, b) => (b.primary - a.primary) || (a.left - b.left))
        .map(({ primary, ...display }) => display)
    },
    // Blocks idle and sleep through logind for as long as Chrome lives; without logind it just exits.
    keepAwake: pid => spawn('systemd-inhibit', ['--what=idle:sleep', '--who=paper-cranes-show', '--why=live show', 'tail', `--pid=${pid}`, '-f', '/dev/null'], { detached: true, stdio: 'ignore' })
      .on('error', () => {}).unref(),
    // Scaled and multi-monitor layouts differ between X11, XWayland and Chrome, so place in Chrome's coordinates.
    placeByChrome: true,
  },
}

const platform = PLATFORMS[process.platform]
if (!platform) throw new Error(`show.js supports ${Object.keys(PLATFORMS).join(', ')}, not ${process.platform}`)
const PROFILE = process.env.SHOW_PROFILE || platform.profile

const CHROME_FLAGS = [
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--kiosk',
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-crash-restore-bubble',
  '--noerrdialogs',
  '--disable-notifications',
  '--disable-features=Translate,MediaRouter,GlobalMediaControls,PrivacySandboxSettings4',
  '--autoplay-policy=no-user-gesture-required',
  // A projected window is often "occluded" by nothing the OS can see; never let Chrome throttle it.
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
]

// Mic + MIDI granted over CDP rather than --use-fake-ui-for-media-stream, so no prompt ever draws.
const PERMISSIONS = ['microphone', 'midi', 'midi-sysex']

const cdpUp = async () => {
  try {
    const res = await fetch(`${CDP_URL}/json/version`)
    return res.ok
  } catch {
    return false
  }
}

const listDisplays = () => platform.displays().map((d, index) => ({ index, ...d }))

// Default to the last display: with a projector attached that is the projector, alone it is the laptop.
const pickDisplay = (displays, requested) => {
  const index = requested ?? displays.length - 1
  const display = displays[index]
  if (!display) throw new Error(`no display ${index}; have ${JSON.stringify(displays)}`)
  return display
}

const connect = async () => {
  if (!(await cdpUp())) throw new Error(`show browser not running on ${CDP_URL} — run: node scripts/vj/show.js launch <url>`)
  const browser = await chromium.connectOverCDP(CDP_URL)
  const context = browser.contexts()[0]
  const pages = context.pages()
  if (pages.length !== 1) throw new Error(`show browser must have exactly one page, has ${pages.length}: ${pages.map(p => p.url()).join(', ')}`)
  return { browser, context, page: pages[0] }
}

const withPage = async (fn) => {
  const { browser, context, page } = await connect()
  try {
    return await fn(page, context)
  } finally {
    await browser.close()
  }
}

const grant = (context, url) => context.grantPermissions(PERMISSIONS, { origin: new URL(url).origin })

// --kiosk alone is not reliable on macOS (measured: the window came up framed, toolbar showing),
// so the window state is asserted over CDP on every launch/goto.
const ensureFullscreen = async (page) => {
  const cdp = await page.context().newCDPSession(page)
  const { windowId, bounds } = await cdp.send('Browser.getWindowForTarget')
  if (bounds.windowState !== 'fullscreen') await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'fullscreen' } })
  await cdp.detach()
}

// Screens are matched by left-to-right rank: scaling changes coordinates and the OS and Chrome
// disagree on which screen is primary (WSLg flags none), but both keep the horizontal order.
const leftToRight = (a, b) => (a.left - b.left) || (a.top - b.top)

const moveToDisplay = async (page, context, rank) => {
  const session = await context.browser().newBrowserCDPSession()
  // grantPermissions replaces the origin's whole grant set, so the show permissions ride along or the mic is revoked.
  await session.send('Browser.grantPermissions', { origin: new URL(page.url()).origin, permissions: ['audioCapture', 'midi', 'midiSysex', 'windowManagement'] })
  const screens = await page.evaluate(async () => (await getScreenDetails()).screens
    .map(s => ({ name: s.label, left: s.left, top: s.top, width: s.width, height: s.height })))
  const target = screens.sort(leftToRight)[rank]
  if (!target) throw new Error(`Chrome sees no screen at rank ${rank}; has ${JSON.stringify(screens)}`)
  const cdp = await context.newCDPSession(page)
  const { windowId } = await cdp.send('Browser.getWindowForTarget')
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } })
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { left: target.left, top: target.top, width: target.width, height: target.height } })
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'fullscreen' } })
  await cdp.detach()
  await session.detach()
  return target.name
}

const goto = (url) => withPage(async (page, context) => {
  await grant(context, url)
  await page.goto(url)
  await ensureFullscreen(page)
  return page.url()
})

// CDP permission grants die with the DevTools session that made them, and every show.js command
// disconnects, so a page that asks for the mic after that meets an invisible kiosk prompt and
// waits forever. Stored content-setting exceptions in the profile survive.
const allowInProfile = (origin) => {
  const file = join(PROFILE, 'Default', 'Preferences')
  mkdirSync(dirname(file), { recursive: true })
  const prefs = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
  const exceptions = ((prefs.profile ??= {}).content_settings ??= {}).exceptions ??= {}
  for (const setting of ['media_stream_mic', 'midi', 'midi_sysex']) (exceptions[setting] ??= {})[`${origin},*`] = { setting: 1 }
  writeFileSync(file, JSON.stringify(prefs))
}

const launch = async (url, displayIndex) => {
  if (!url) throw new Error('launch needs a url')
  if (await cdpUp()) return { reused: true, url: await goto(url) }

  const displays = listDisplays()
  const display = pickDisplay(displays, displayIndex)
  allowInProfile(new URL(url).origin)
  const chrome = spawn(process.env.SHOW_CHROME || platform.chrome(), [
    ...CHROME_FLAGS,
    // Extra flags for GPU quirks, e.g. SHOW_CHROME_FLAGS='--ignore-gpu-blocklist --use-angle=gl' on Linux.
    ...(process.env.SHOW_CHROME_FLAGS || '').split(' ').filter(Boolean),
    `--window-position=${display.left},${display.top}`,
    `--window-size=${display.width},${display.height}`,
    'about:blank',
  ], { detached: true, stdio: 'ignore' })
  chrome.unref()
  platform.keepAwake(chrome.pid)

  const deadline = Date.now() + 15000
  while (!(await cdpUp())) {
    if (Date.now() > deadline) throw new Error(`Chrome did not open ${CDP_URL} within 15s (pid ${chrome.pid})`)
    await new Promise(r => setTimeout(r, 200))
  }
  // After a crash or kill, Chrome restores the old tabs next to about:blank; every later command
  // refuses a show browser with more than one page.
  const browser = await chromium.connectOverCDP(CDP_URL)
  for (const extra of browser.contexts()[0].pages().slice(1)) await extra.close()
  await browser.close()
  const shown = await goto(url)
  const placed = platform.placeByChrome ? await withPage((page, context) => moveToDisplay(page, context, [...displays].sort(leftToRight).indexOf(display))) : display.name
  return { reused: false, pid: chrome.pid, display: placed, url: shown }
}

// The expression is evaluated in the page; if it yields a function, it is called with the args.
const evaluate = (src, args) => withPage(page => page.evaluate(async ([source, argv]) => {
  const value = (0, eval)(`(${source})`)
  return typeof value === 'function' ? await value(...argv) : await value
}, [src, args]))

const shot = (file) => withPage(async page => {
  await page.screenshot({ path: file })
  return file
})

const status = async () => {
  if (!(await cdpUp())) return { up: false }
  return withPage(async page => ({ up: true, url: page.url(), title: await page.title() }))
}

// Raw CDP, not withPage: a show browser whose window was closed has zero pages, and Playwright's
// connectOverCDP refuses it outright — exactly the stale state stop exists to clear.
const stop = async () => {
  if (!(await cdpUp())) return 'not running'
  const { webSocketDebuggerUrl } = await fetch(`${CDP_URL}/json/version`).then(r => r.json())
  const ws = new WebSocket(webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }))
  const deadline = Date.now() + 10000
  while (await cdpUp()) {
    if (Date.now() > deadline) throw new Error(`show browser still answering on ${CDP_URL} 10s after Browser.close`)
    await new Promise(r => setTimeout(r, 200))
  }
  return 'closed'
}

const commands = {
  launch: (url, ...rest) => {
    const i = rest.indexOf('--display')
    return launch(url, i === -1 ? undefined : parseInt(rest[i + 1]))
  },
  goto: url => goto(url),
  eval: (src, args) => evaluate(src, args ? JSON.parse(args) : []),
  shot: file => shot(file),
  status: () => status(),
  displays: () => listDisplays(),
  stop: () => stop(),
}

const [command, ...rest] = process.argv.slice(2)
if (!commands[command]) {
  console.error(`usage: show.js ${Object.keys(commands).join('|')} ...`)
  process.exit(2)
}
const result = await commands[command](...rest)
console.log(JSON.stringify(result))
