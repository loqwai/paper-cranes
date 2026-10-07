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
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const CDP_PORT = parseInt(process.env.SHOW_CDP_PORT || '9333')
const CDP_URL = `http://127.0.0.1:${CDP_PORT}`
const CHROME = process.env.SHOW_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROFILE = join(homedir(), 'Library', 'Application Support', 'paper-cranes-show')

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
  // A projected window is often "occluded" by nothing macOS can see; never let Chrome throttle it.
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

const listDisplays = () => {
  const js = 'ObjC.import("AppKit");const s=$.NSScreen.screens;const o=[];for(let i=0;i<s.count;i++){const c=s.objectAtIndex(i),f=c.frame;o.push({name:ObjC.unwrap(c.localizedName),x:f.origin.x,y:f.origin.y,w:f.size.width,h:f.size.height})};JSON.stringify(o)'
  const screens = JSON.parse(execFileSync('osascript', ['-l', 'JavaScript', '-e', js]).toString())
  const mainH = screens[0].h
  // NSScreen is bottom-left origin; Chrome's --window-position is top-left origin of the main screen.
  return screens.map((s, index) => ({ index, name: s.name, left: s.x, top: mainH - (s.y + s.h), width: s.w, height: s.h }))
}

// Default to the last display: with a projector attached that is the projector, alone it is the laptop.
const pickDisplay = (requested) => {
  const displays = listDisplays()
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

const goto = (url) => withPage(async (page, context) => {
  await grant(context, url)
  await page.goto(url)
  await ensureFullscreen(page)
  return page.url()
})

const launch = async (url, displayIndex) => {
  if (!url) throw new Error('launch needs a url')
  if (await cdpUp()) return { reused: true, url: await goto(url) }

  const display = pickDisplay(displayIndex)
  mkdirSync(PROFILE, { recursive: true })
  const chrome = spawn(CHROME, [
    ...CHROME_FLAGS,
    `--window-position=${display.left},${display.top}`,
    `--window-size=${display.width},${display.height}`,
    'about:blank',
  ], { detached: true, stdio: 'ignore' })
  chrome.unref()
  // Keep the display awake for as long as the show browser lives.
  spawn('caffeinate', ['-dimsu', '-w', String(chrome.pid)], { detached: true, stdio: 'ignore' }).unref()

  const deadline = Date.now() + 15000
  while (!(await cdpUp())) {
    if (Date.now() > deadline) throw new Error(`Chrome did not open ${CDP_URL} within 15s (pid ${chrome.pid})`)
    await new Promise(r => setTimeout(r, 200))
  }
  return { reused: false, pid: chrome.pid, display: display.name, url: await goto(url) }
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
