import { chromium } from 'playwright'
const tests = JSON.parse(process.argv[2])   // [[knob, lo, hi], ...]
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333')
const page = browser.contexts()[0].pages()[0]
const wait = ms => new Promise(r => setTimeout(r, ms))
const out = {}
for (const [k, lo, hi] of tests) {
  const key = `knob_${k}`
  const orig = await page.evaluate(key => window.cranes.manualFeatures[key], key)
  try {
    for (const [tag, v] of [['lo', lo], ['hi', hi]]) {
      await page.evaluate(([key, v]) => { window.cranes.manualFeatures[key] = v }, [key, v])
      await wait(350)
      await page.screenshot({ path: `.claude/vj-shots/kv-K${k}-${tag}.png` })
    }
  } finally {
    await page.evaluate(([key, orig]) => { if (orig === undefined) delete window.cranes.manualFeatures[key]; else window.cranes.manualFeatures[key] = orig }, [key, orig])
  }
  out[k] = orig
  await wait(600)
}
console.log(JSON.stringify(out))
await browser.close()
