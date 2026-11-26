#!/usr/bin/env node
// list-page: drive /list.html on a phone (390x844) the way a performer does: search, queue a
// shader with +, open the Set sheet, GO, and check the perform overlay plays it. Evidence:
// <proof>/list-page/. Works on dev, preview, a Pages preview or production (--base).
//   .agents/skills/verify-paper-cranes/bin/list-page.mjs [--query plasma] [--base URL] [--video]
import { join } from 'node:path'
import { baseUrl, proofDir, startBrowser, newPage, until, writeJson, writeLog, PHONE } from './lib.mjs'

const argv = process.argv.slice(2)
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d }
const video = argv.includes('--video')
const query = opt('query', 'plasma')
const base = baseUrl(opt('base'))
const dir = proofDir('list-page')
const checks = []
const check = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail })

const browser = await startBrowser({ headful: video || argv.includes('--headful') })
try {
  const { page, log, close } = await newPage(browser, { viewport: PHONE, videoDir: video ? dir : null, name: 'list' })
  await page.goto(`${base}/list.html`)
  const total = await until(() => page.locator('.shader-list a[href*="shader="]').count(), { what: 'shader rows' })
  check('list fills with shaders', total > 100, `${total} rows`)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  check('no horizontal scroll at 390 wide', scrollWidth <= PHONE.width, `scrollWidth ${scrollWidth}`)
  await page.screenshot({ path: join(dir, '1-list.png') })

  await page.locator('.find-input').fill(query)
  const status = await until(async () => {
    const t = await page.locator('.status-text').textContent()
    return /match/.test(t) ? t.trim() : null
  }, { what: 'the search status' })
  const firstName = (await page.locator('.row-name').first().textContent()).trim()
  check('search filters the list', /match/.test(status) && firstName.toLowerCase().includes(query.toLowerCase()), `${status}; first row "${firstName}"`)
  await page.screenshot({ path: join(dir, '2-search.png') })

  await page.locator('button[title="Add to set"]').first().click()
  await page.locator('.bar-btn', { hasText: 'Set' }).click()
  const setRow = (await page.locator('.set-row .nm').first().textContent()).trim()
  check('+ queues the shader in the setlist', setRow === firstName, `set row "${setRow}"`)
  await page.screenshot({ path: join(dir, '3-setlist.png') })

  await page.locator('button.big-action', { hasText: 'Go' }).click()
  const src = await until(() => page.locator('.perform iframe').getAttribute('src'), { what: 'the perform overlay iframe' })
  const frame = page.frameLocator('.perform iframe')
  await frame.locator('#visualizer').waitFor({ timeout: 20_000 })
  const frames = await until(async () => {
    const f = page.frames().find((fr) => fr !== page.mainFrame())
    const n = f ? await f.evaluate(() => window.cranes?.frameCount ?? 0).catch(() => 0) : 0
    return n > 10 ? n : null
  }, { what: 'the performed shader to render' })
  check('GO plays the shader in the perform overlay', src.includes('shader='), `iframe src ${src}; ${frames} frames drawn`)
  await page.screenshot({ path: join(dir, '4-perform.png') })
  check('no uncaught page errors', log.pageErrors.length === 0, log.pageErrors)
  writeLog(dir, 'console.txt', log.console)
  await close()
} finally { await browser.close() }

const pass = checks.every((c) => c.ok)
writeJson(dir, 'summary.json', { feature: 'list-page', base, query, checks, pass })
for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.name}: ${JSON.stringify(c.detail)}`)
console.log(`${pass ? 'PASS' : 'FAIL'}  evidence: ${dir}`)
if (!pass) process.exitCode = 1
