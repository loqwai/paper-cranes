import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import { join } from 'path'

const SHADERS = [
  'chromadepth-apollonian', 'chromadepth-burning-ship', 'chromadepth-coral',
  'chromadepth-geodesic', 'chromadepth-hyperbolic', 'chromadepth-interference',
  'chromadepth-kaleidoscope', 'chromadepth-kali', 'chromadepth-lyapunov',
  'chromadepth-mandelbrot', 'chromadepth-mandelbulb', 'chromadepth-menger',
  'chromadepth-nebula', 'chromadepth-phoenix', 'chromadepth-plasma',
  'chromadepth-reaction-diffusion', 'chromadepth-sierpinski', 'chromadepth-spirograph',
  'chromadepth-tesseract', 'chromadepth-voronoi'
]

const DEVICES = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone14pro', width: 393, height: 852 },
  { name: 'iphone14pro-land', width: 852, height: 393 },
  { name: 'pixel7', width: 412, height: 915 },
  { name: 'desktop-1080', width: 1920, height: 1080 },
  { name: 'ultrawide', width: 2560, height: 1080 },
]

const BASE_URL = 'http://localhost:6969'
const OUTPUT_DIR = join(import.meta.dirname, '..', 'tmp', 'screenshots-after')
const SETTLE_TIME = 2500

async function screenshotShader(browser, shader) {
  const results = []
  for (const device of DEVICES) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    const url = `${BASE_URL}/?shader=claude/${shader}&noaudio=true&fullscreen=true`
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 })
      await page.waitForTimeout(SETTLE_TIME)
      const path = join(OUTPUT_DIR, `${shader}-${device.name}.png`)
      await page.screenshot({ path })
      results.push(`${shader}-${device.name}: OK`)
    } catch (e) {
      results.push(`${shader}-${device.name}: ERROR - ${e.message}`)
    }
    await context.close()
  }
  return results
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  console.log(`Screenshotting ${SHADERS.length} shaders x ${DEVICES.length} devices = ${SHADERS.length * DEVICES.length} screenshots`)

  // Run all 20 shaders in parallel
  const allResults = await Promise.all(
    SHADERS.map(shader => screenshotShader(browser, shader))
  )

  await browser.close()

  const flat = allResults.flat()
  const errors = flat.filter(r => r.includes('ERROR'))
  console.log(`\nDone! ${flat.length} screenshots taken.`)
  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`)
    errors.forEach(e => console.log(`  ${e}`))
  }
}

main().catch(e => { console.error(e); process.exit(1) })
