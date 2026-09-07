// MEASURE THE OCCLUDER — how big is the black circle, really?
//
// The dead-pixel fraction in motion-check.mjs uses an ABSOLUTE threshold (luma < 12) over the
// whole frame. That silently misses a disc that has been lifted just above the threshold: a
// silhouette sitting at luma 20 still reads as a black hole on a phone in a dark room, but
// scores as "not dead". This measures the SILHOUETTE ITSELF instead.
//
// Method: find the centroid of dark pixels in the central region, then cast rays outward from it
// and record the radius at which each ray first exits the dark blob. The median over rays is the
// silhouette radius, reported as a fraction of frame width and height.
//
//   node scripts/measure-disc.mjs <png> [<png> ...]

import { chromium } from 'playwright'
import { readFile } from 'fs/promises'
import { basename } from 'path'

const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node scripts/measure-disc.mjs <png>...'); process.exit(1) }

const b = await chromium.launch({ headless: true })
const page = await b.newPage()
await page.goto('about:blank')

const measure = async (buf) => page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
    const W = img.width, H = img.height
    const c = new OffscreenCanvas(W, H), g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const px = g.getImageData(0, 0, W, H).data
    const lum = (x, y) => { const k = ((y | 0) * W + (x | 0)) * 4; return 0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2] }

    // area fractions at several thresholds — shows how threshold-sensitive the "dead" number is
    const frac = (t) => { let n = 0; for (let k = 0; k < px.length; k += 4) if (0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2] < t) n++; return n / (W * H) }

    // LARGEST CONNECTED DARK BLOB (flood fill). A centroid-of-dark-pixels approach breaks the
    // moment the SKY is also dark — in a quiet passage the centroid lands on an average of
    // scattered background and measures nothing. The occluder is by definition one solid
    // connected region, so find the biggest one and measure that.
    const DARK = 45
    const mask = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) mask[y * W + x] = lum(x, y) < DARK ? 1 : 0
    const seen = new Uint8Array(W * H)
    let best = null
    const stack = new Int32Array(W * H)
    for (let y0 = 0; y0 < H; y0++) for (let x0 = 0; x0 < W; x0++) {
        const s0 = y0 * W + x0
        if (!mask[s0] || seen[s0]) continue
        let sp = 0, n = 0, sx = 0, sy = 0, minX = W, maxX = -1, minY = H, maxY = -1
        stack[sp++] = s0; seen[s0] = 1
        while (sp > 0) {
            const s = stack[--sp], x = s % W, y = (s / W) | 0
            n++; sx += x; sy += y
            if (x < minX) minX = x; if (x > maxX) maxX = x
            if (y < minY) minY = y; if (y > maxY) maxY = y
            if (x > 0 && mask[s - 1] && !seen[s - 1]) { seen[s - 1] = 1; stack[sp++] = s - 1 }
            if (x < W - 1 && mask[s + 1] && !seen[s + 1]) { seen[s + 1] = 1; stack[sp++] = s + 1 }
            if (y > 0 && mask[s - W] && !seen[s - W]) { seen[s - W] = 1; stack[sp++] = s - W }
            if (y < H - 1 && mask[s + W] && !seen[s + W]) { seen[s + W] = 1; stack[sp++] = s + W }
        }
        if (!best || n > best.n) best = { n, cx: sx / n, cy: sy / n, minX, maxX, minY, maxY }
    }
    if (!best) return { found: false, W, H, frac12: +frac(12).toFixed(3), frac25: +frac(25).toFixed(3), frac45: +frac(45).toFixed(3) }
    // equivalent-circle diameter from the blob's AREA (robust to a ragged corona-lit edge)
    const dEq = 2 * Math.sqrt(best.n / Math.PI)
    return {
        found: true, W, H,
        centroid: [+(best.cx / W).toFixed(3), +(best.cy / H).toFixed(3)],
        discDiamPctWidth: +((dEq / W) * 100).toFixed(1),
        discDiamPctHeight: +((dEq / H) * 100).toFixed(1),
        discAreaPctFrame: +((best.n / (W * H)) * 100).toFixed(1),
        bboxPctWidth: +(((best.maxX - best.minX) / W) * 100).toFixed(1),
        bboxPctHeight: +(((best.maxY - best.minY) / H) * 100).toFixed(1),
        frac12: +frac(12).toFixed(3), frac25: +frac(25).toFixed(3), frac45: +frac(45).toFixed(3),
    }
}, buf.toString('base64'))

for (const f of files) {
    const r = await measure(await readFile(f))
    console.log(basename(f).padEnd(26), JSON.stringify(r))
}
await b.close()
