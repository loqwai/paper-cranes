import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
const OUT='D:/Projects/paper-cranes/tmp/eye-shots'
const loud={quietGate:1,energySpring:0.6,waveletBassSpring:0.85,melodyFlow:0.7,waveletBand5Spring:0.6,spectralCrestSmooth:0.5}
// each: shader id, then states [label, manualFeatures]
const SH=['chromadepth-lattice/2','chromadepth-lattice/3','chromadepth-lattice/4','chromadepth-lattice/5','chromadepth-lattice/6']
await mkdir(OUT,{recursive:true})
const b=await chromium.launch({headless:true})
const ctx=await b.newContext({viewport:{width:720,height:1280}})
const page=await ctx.newPage()
page.on('console',m=>{if(m.type()==='error')console.log('[err]',m.text())})
for(const s of SH){
  const tag='lat-'+s.split('/')[1]
  const base=`http://localhost:6969/?shader=redaphid/${s}&noaudio=true&fullscreen=true&controller=lattice-nav&wavelet=true&seed=0.3&seed2=0.7&seed3=0.4&seed4=0.6&knob_1=0.21`
  // home (quiet)
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:15000}); await page.waitForTimeout(2000)
  await page.screenshot({path:`${OUT}/${tag}-home.png`}); console.log('OK',tag+'-home')
  // loud
  await page.evaluate(f=>Object.assign(window.cranes.manualFeatures,f),loud); await page.waitForTimeout(900)
  await page.screenshot({path:`${OUT}/${tag}-loud.png`}); console.log('OK',tag+'-loud')
  // zoomed out
  await page.evaluate(()=>Object.assign(window.cranes.manualFeatures,{navZoom:0.1})); await page.waitForTimeout(900)
  await page.screenshot({path:`${OUT}/${tag}-zoom.png`}); console.log('OK',tag+'-zoom')
}
await b.close()
