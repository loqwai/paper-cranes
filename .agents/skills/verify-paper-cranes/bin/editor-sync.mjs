#!/usr/bin/env node
// editor-sync: prove that saving in edit.html (remote=control) reaches a display page and disk.
// Dev server only (pc-verify launch). Writes a scratch shader under shaders/claude/wip/verify-scratch/,
// which pc-verify cleanup removes. Evidence: <proof>/editor-sync/.
//   .claude/skills/verify-paper-cranes/bin/editor-sync.mjs [--headful] [--video]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO, baseUrl, proofDir, startBrowser, newPage, until, framesAdvance, canvasShot, writeJson, writeLog, DESKTOP } from './lib.mjs'

const flags = new Set(process.argv.slice(2))
const video = flags.has('--video')
const SHADER = 'claude/wip/verify-scratch/1'
const FILE = join(REPO, 'shaders', `${SHADER}.frag`)
const solid = (r, g, b) => `void mainImage(out vec4 fragColor, in vec2 fragCoord) {\n  fragColor = vec4(${r}.0, ${g}.0, ${b}.0, 1.0);\n}\n`

const base = baseUrl()
const dir = proofDir('editor-sync')
mkdirSync(join(REPO, 'shaders/claude/wip/verify-scratch'), { recursive: true })
writeFileSync(FILE, solid(0, 0, 1))

const browser = await startBrowser({ headful: flags.has('--headful') || video })
const checks = []
const check = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail })
try {
  const display = await newPage(browser, { viewport: { width: 480, height: 360 }, videoDir: video ? dir : null, name: 'display' })
  await display.page.goto(`${base}/?shader=${SHADER}&remote=display&noaudio=true`)
  await framesAdvance(display.page, 5)
  const before = await canvasShot(display.page, join(dir, 'display-before.png'))
  check('display starts blue', before.meanRgb[2] > 200 && before.meanRgb[0] < 40, before.meanRgb)

  const editor = await newPage(browser, { viewport: DESKTOP, videoDir: video ? dir : null, name: 'editor' })
  await editor.page.goto(`${base}/edit.html?shader=${SHADER}&remote=control&noaudio=true`)
  await until(() => editor.page.evaluate(() => (window.monaco?.editor?.getModels?.()[0]?.getValue() || '').includes('fragColor')), { what: 'the editor to load the shader' })
  const red = solid(1, 0, 0)
  await editor.page.evaluate((code) => window.monaco.editor.getModels()[0].setValue(code), red)
  await editor.page.locator('#save').click()
  await editor.page.screenshot({ path: join(dir, 'editor-after-save.png') })

  await until(() => display.page.evaluate((code) => window.cranes.shader === code, red), { what: 'the display to receive the saved code' })
  await framesAdvance(display.page, 5)
  const after = await canvasShot(display.page, join(dir, 'display-after.png'))
  check('display turns red after save', after.meanRgb[0] > 200 && after.meanRgb[2] < 40, after.meanRgb)
  const disk = await until(() => (readFileSync(FILE, 'utf8') === red ? 'written' : null), { timeout: 10_000, what: 'the .frag on disk to change' }).catch(() => null)
  check('save wrote the .frag on disk', disk, FILE)
  check('no uncaught page errors', !display.log.pageErrors.length && !editor.log.pageErrors.length, [...display.log.pageErrors, ...editor.log.pageErrors])
  writeLog(dir, 'console-display.txt', display.log.console)
  writeLog(dir, 'console-editor.txt', editor.log.console)
  await editor.close()
  await display.close()
} finally { await browser.close() }

const pass = checks.every((c) => c.ok)
writeJson(dir, 'summary.json', { feature: 'editor-remote-sync', shader: SHADER, checks, pass })
for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.name}: ${JSON.stringify(c.detail)}`)
console.log(`${pass ? 'PASS' : 'FAIL'}  evidence: ${dir}`)
if (!pass) process.exitCode = 1
