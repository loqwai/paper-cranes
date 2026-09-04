// ONE page load, several captures with iTime recorded -> honest motion evidence.
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
const PORT = 6991, OUT = 'D:/Projects/pc-lab-hero/journals/lab/shots/'
const image = process.argv[2] || 'images/beads/mon-ume.png'
const tag   = process.argv[3] || 'm'
const extra = process.argv[4] || ''
const b = await chromium.launch({ headless:true, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await b.newPage({ viewport:{width:900,height:900}, deviceScaleFactor:1 })
await page.addInitScript(() => localStorage.setItem('paperCranes.seeds', JSON.stringify([0.11,0.22,0.33,0.44])))
page.on('pageerror', e => console.error('PAGEERROR', String(e).slice(0,200)))
const K = '&knob_141=0.5&knob_142=0.5&knob_143=0.5&knob_144=0.3&knob_145=0.5&knob_146=0.5&knob_147=0.5&knob_148=0.5&knob_149=0.5&knob_150=0.5'
        + '&knob_151=0.5&knob_152=0.5&knob_153=0.5&knob_154=0.5&knob_155=0.5&knob_156=0.5&knob_157=0.5&knob_158=0.5&knob_159=0.5&knob_160=0.5'
const url = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/hero&wavelet=true&noaudio=true&fullscreen=true&navZoom=0.218&image=${image}&knob_1=0.429&knob_134=0.507${K}${extra}`
await page.goto(url, { waitUntil:'domcontentloaded' })
if (!(await page.evaluate(()=>location.href)).includes(`:${PORT}`)) throw new Error('PORT GUARD')
await page.waitForFunction(()=>window.cranes && window.cranes.frameCount>5,null,{timeout:60000})
for (let i=0;i<6;i++){
  const info = await page.evaluate(()=>{ const c=document.querySelector('canvas')
    return { t: (window.cranes.lastFeatures?.time ?? 0), f: window.cranes.frameCount, data: c.toDataURL('image/png') } })
  writeFileSync(`${OUT}${tag}-${i}.png`, Buffer.from(info.data.split(',')[1],'base64'))
  console.log(`${tag}-${i}  frames=${info.f}`)
  await page.waitForTimeout(2500)
}
await b.close()
