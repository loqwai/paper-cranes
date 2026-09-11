import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
const OUT='D:/Projects/paper-cranes/tmp/eye-shots'
const base='http://localhost:6969/?shader=redaphid/wip/terra/1&noaudio=true&fullscreen=true&seed=0.3&seed2=0.7&seed3=0.4&seed4=0.6'
const ST=[['terra-home',{}],['terra-far',{navX:8.0,navY:5.0}],['terra-zoomout',{navZoom:0.12}]]
await mkdir(OUT,{recursive:true})
const b=await chromium.launch({headless:true})
const ctx=await b.newContext({viewport:{width:720,height:1280}})
const page=await ctx.newPage()
page.on('console',m=>{if(m.type()==='error')console.log('[err]',m.text())})
for(const [n,f] of ST){
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:15000}); await page.waitForTimeout(1800)
  await page.evaluate(ff=>Object.assign(window.cranes.manualFeatures,ff),f); await page.waitForTimeout(900)
  await page.screenshot({path:`${OUT}/${n}.png`}); console.log('OK',n)
}
await b.close()
