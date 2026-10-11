import { chromium } from 'playwright'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333')
const page = browser.contexts()[0].pages()[0]
const cdp = await page.context().newCDPSession(page)
const { windowId, bounds } = await cdp.send('Browser.getWindowForTarget')
const before = bounds.windowState
if (before !== 'fullscreen') await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'fullscreen' } })
console.log(JSON.stringify({ before, pages: browser.contexts()[0].pages().length }))
await browser.close()
