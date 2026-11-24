// Smoke suite: every page a person opens loads and does its job, in headless Chromium against a
// real build. Local by default (`npm run test:smoke` builds and serves dist on :7129); point it at
// a deploy with E2E_BASE_URL. See docs/testing.md.
//
// No sleeps: every wait is on a condition (the canvas lit, a note shown, a model filled). The one
// fixed window is the reload-loop check, which has to watch for navigations that should not come.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startSmoke, hasTarget, until, untilRendered, PHONE } from './smoke-env.js'

const MISSING = 'does-not-exist-xyz'
let env
if (!hasTarget()) console.warn('[e2e] smoke suite skipped: no dist/ (run `npm run build`) and no E2E_BASE_URL')

describe.skipIf(!hasTarget())('smoke', () => {
  beforeAll(async () => { env = await startSmoke() })
  afterAll(async () => { await env?.close() })

  it('plasma renders a lit, colourful frame with no uncaught errors', async () => {
    const { page, pageErrors, close } = await env.newPage({ name: 'plasma' })
    await page.goto(`${env.base}/?shader=plasma&noaudio=true&time=5`)
    const stats = await untilRendered(page, { minLit: 0.5, minColours: 200 })
    const shader = await page.evaluate(() => window.cranes?.shader || '')
    await close()
    expect(stats.litFraction).toBeGreaterThan(0.5)
    expect(stats.colours).toBeGreaterThan(200)
    expect(shader).toMatch(/mainImage|void\s+main/)
    expect(pageErrors).toEqual([])
  })

  it('a missing shader shows the default shader plus a note naming it', async () => {
    const { page, close } = await env.newPage({ viewport: PHONE, name: 'missing-shader' })
    await page.goto(`${env.base}/?shader=${MISSING}&noaudio=true&time=5`)
    const note = page.getByRole('status').filter({ hasText: 'shader not found' })
    await note.waitFor({ timeout: 20_000 })
    const noteText = await note.textContent()
    const stats = await untilRendered(page)
    const shader = await page.evaluate(() => window.cranes?.shader || '')
    await close()
    expect(noteText).toBe(`shader not found: ${MISSING}`)
    expect(stats.litFraction).toBeGreaterThan(0.2)
    expect(shader).not.toMatch(/<!doctype html|<html/i)
  })

  it('the list page fills with shaders on a phone', async () => {
    const { page, pageErrors, close } = await env.newPage({ viewport: PHONE, name: 'list-phone' })
    await page.goto(`${env.base}/list.html`)
    const counter = await until(async () => {
      const text = await page.evaluate(() => document.body.innerText)
      return text.match(/(\d+) of (\d+)/)
    }, { what: 'the "N of M" counter' })
    const links = await page.locator('a[href*="shader="]').count()
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    await close()
    expect(Number(counter[2])).toBeGreaterThan(100)
    expect(links).toBeGreaterThan(100)
    expect(scrollWidth).toBeLessThanOrEqual(PHONE.width)
    expect(pageErrors).toEqual([])
  })

  for (const value of ['null', '{}', '5']) {
    it(`the list page survives localStorage values of ${value}`, async () => {
      const keys = ['params', 'prefs', 'recents', 'scroll', 'set', 'stars', 'usertags']
      const init = `for (const k of ${JSON.stringify(keys)}) localStorage.setItem('cranes-list-' + k, ${JSON.stringify(value)})`
      const { page, pageErrors, close } = await env.newPage({ viewport: PHONE, init })
      await page.goto(`${env.base}/list.html`)
      await until(() => page.evaluate(() => /\d+ of \d+/.test(document.body.innerText)), { what: 'the list counter' })
      const links = await page.locator('a[href*="shader="]').count()
      await close()
      expect(links).toBeGreaterThan(100)
      expect(pageErrors).toEqual([])
    })
  }

  it('the editor loads the shader source as GLSL', async () => {
    const { page, close } = await env.newPage({ name: 'editor' })
    // A build (not the dev server) stores the fetched source, strips ?shader= and reloads once:
    // wait for that second load before reading the editor.
    await page.goto(`${env.base}/edit.html?shader=plasma&noaudio=true`)
    await page.waitForEvent('load')
    expect(new URL(page.url()).searchParams.has('shader')).toBe(false)
    const code = await until(() => page.evaluate(() => window.monaco?.editor?.getModels?.()[0]?.getValue() || ''),
      { what: 'the Monaco model to fill' })
    await close()
    expect(code).toMatch(/mainImage|void\s+main/)
    expect(code).not.toMatch(/<!doctype html|<html/i)
  })

  it('the editor opens a missing shader on the default GLSL, not a web page', async () => {
    const { page, close } = await env.newPage({ name: 'editor-missing' })
    await page.goto(`${env.base}/edit.html?shader=${MISSING}&noaudio=true`)
    const code = await until(() => page.evaluate(() => window.monaco?.editor?.getModels?.()[0]?.getValue() || ''),
      { what: 'the Monaco model to fill' })
    await close()
    expect(code).toMatch(/mainImage|void\s+main/)
    expect(code).not.toMatch(/<!doctype html|<html/i)
  })

  it('the service worker takes control without a reload loop', async () => {
    const { page, close } = await env.newPage()
    let navigations = 0
    page.on('framenavigated', f => { if (f === page.mainFrame()) navigations++ })
    await page.goto(`${env.base}/?shader=plasma&noaudio=true&time=5`)
    const scope = await page.evaluate(() => navigator.serviceWorker.ready.then(r => r.active?.scriptURL))
    for (let i = 0; i < 3; i++) await page.reload()
    const controller = await until(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL),
      { what: 'the service worker to control the page' })
    const settled = navigations
    // A loop shows up as navigations nobody asked for; give it 8s to appear.
    const extra = await page.waitForEvent('framenavigated', { timeout: 8_000 }).then(() => 1, () => 0)
    await close()
    expect(scope).toMatch(/service-worker\.js$/)
    expect(controller).toMatch(/service-worker\.js$/)
    expect(settled).toBe(4)
    expect(extra).toBe(0)
  })

  it('?vj=1 installs the runtime and the bundled aesthetic meter', async () => {
    const { page, responses, close } = await env.newPage()
    await page.goto(`${env.base}/?shader=plasma&noaudio=true&time=5&vj=1`)
    const runtime = await until(() => page.evaluate(() => (window.__vjMeter?.timer && typeof window.__vjValidate === 'function' && window.__vjJank)
      ? { meter: true, validate: true, jank: true } : null), { what: 'the vj runtime' })
    await close()
    expect(runtime).toEqual({ meter: true, validate: true, jank: true })
    const vjRequests = responses.filter(r => /aesthetic-meter|__vj-signal/.test(r.url))
    expect(vjRequests.filter(r => r.status >= 400)).toEqual([])
  })

  it('the vjpad page draws its pads', async () => {
    const { page, pageErrors, close } = await env.newPage({ viewport: PHONE, name: 'vjpad' })
    await page.goto(`${env.base}/vjpad.html`)
    await page.locator('.pad').first().waitFor({ timeout: 20_000 })
    const pads = await page.locator('.pad').count()
    await close()
    expect(pads).toBeGreaterThan(0)
    expect(pageErrors).toEqual([])
  })

  it('the midi page loads and reports MIDI access', async () => {
    const { page, pageErrors, close } = await env.newPage({ name: 'midi' })
    await page.goto(`${env.base}/midi.html`)
    // Headless Chromium has no MIDI permission, so the page must say so rather than hang.
    const status = await until(async () => {
      const t = await page.locator('#status').textContent()
      return t && !/Requesting MIDI access/.test(t) ? t : null
    }, { what: 'the MIDI status to settle' })
    await close()
    expect(status.length).toBeGreaterThan(0)
    expect(pageErrors).toEqual([])
  })
})
