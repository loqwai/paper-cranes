// Contact sheet + SMALL-SCALE legibility. Downscale is for JUDGING SHAPE ONLY;
// every brightness number in the report came from the full-res live canvas.
import { chromium } from 'playwright'
import { readFile, writeFile } from 'fs/promises'
const D = 'D:/Projects/pc-lab-bright/journals/lab/shots/'
const arms = ['base', 'stage', 'hot'], mons = ['hakkaku', 'kikko', 'ume']
const src = {}
for (const a of arms) for (const m of mons)
    src[`${a}-${m}`] = 'data:image/png;base64,' + (await readFile(`${D}${a}-${m}.png`)).toString('base64')
const b = await chromium.launch({ headless: true })
const p = await b.newPage({ viewport: { width: 1400, height: 1200 } })
const r = await p.evaluate(async ({ src, arms, mons }) => {
    const load = async s => { const i = new Image(); i.src = s; await i.decode(); return i }
    const C = 300, S = 135                       // 135/900 = 15% -> the "across a dark room" scale
    const sheet = document.createElement('canvas')
    sheet.width = C * 3 + 40; sheet.height = (C + S + 46) * 3 + 30
    const g = sheet.getContext('2d')
    g.fillStyle = '#000'; g.fillRect(0, 0, sheet.width, sheet.height)
    g.font = '15px monospace'; g.textBaseline = 'top'
    const stats = []
    for (let ai = 0; ai < arms.length; ai++) {
        for (let mi = 0; mi < mons.length; mi++) {
            const img = await load(src[`${arms[ai]}-${mons[mi]}`])
            const y0 = ai * (C + S + 46) + 24, x0 = mi * (C + 10) + 10
            g.fillStyle = '#8f8'; g.fillText(`${arms[ai]} / ${mons[mi]}`, x0, y0 - 20)
            g.drawImage(img, x0, y0, C, C)                       // full frame, downscaled for viewing
            // small-scale panel: 15% then nearest-upscaled so the eye sees what survives
            const t = document.createElement('canvas'); t.width = S; t.height = S
            const tg = t.getContext('2d', { willReadFrequently: true })
            tg.imageSmoothingEnabled = true; tg.drawImage(img, 0, 0, S, S)
            g.imageSmoothingEnabled = false
            g.drawImage(t, x0, y0 + C + 6, S * 1.6, S * 1.6)
            g.imageSmoothingEnabled = true
            const px = tg.getImageData(0, 0, S, S).data
            let s = 0, s2 = 0, n = 0, br = 0, dk = 0
            for (let i = 0; i < px.length; i += 4) {
                const l = 0.2126*px[i] + 0.7152*px[i+1] + 0.0722*px[i+2]
                s += l; s2 += l*l; n++; if (l > 50) br++; if (l < 8) dk++
            }
            const mean = s/n, sd = Math.sqrt(s2/n - mean*mean)
            stats.push({ arm: arms[ai], mon: mons[mi], scale: '15%',
                mean: +mean.toFixed(2), sd: +sd.toFixed(2),
                brightPct: +(100*br/n).toFixed(2), darkPct: +(100*dk/n).toFixed(2) })
        }
    }
    return { png: sheet.toDataURL('image/png'), stats }
}, { src, arms, mons })
await writeFile(D + 'contact-sheet.png', Buffer.from(r.png.split(',')[1], 'base64'))
console.table(r.stats)
await b.close()
