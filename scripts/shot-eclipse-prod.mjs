import { chromium } from 'playwright'
const OUT='D:/projects/paper-cranes/tmp/eclipse-shots'
const drop={quietGate:1,energySpring:0.9,waveletBassSpring:0.92,waveletBand2Spring:0.8,waveletBand4Spring:0.75,
 waveletBand5Spring:0.85,waveletCentroidSpring:0.7,melodyFlow:0.55,spectralCrestSmooth:0.75,
 spectralRoughnessSmooth:0.55,waveletBassZScore:0.9,wavelet_bassHit:0.9,wubDepth:0.5}
const b=await chromium.launch({headless:true,args:['--use-gl=angle','--enable-unsafe-swiftshader']})
const ctx=await b.newContext({viewport:{width:780,height:1400}})
const page=await ctx.newPage()
page.on('pageerror',e=>console.log('[pageerror]',e.message))
const URL='https://visuals.beadfamous.com/?shader=claude/wip/eclipse/1&controller=wavelet-ease&wavelet=true&fullscreen=true&noaudio=true'
await page.goto(URL,{waitUntil:'domcontentloaded',timeout:30000})
await page.waitForTimeout(4000)
await page.screenshot({path:`${OUT}/prod-quiet.png`})
console.log('OK prod-quiet')
await page.evaluate(f=>Object.assign(window.cranes.manualFeatures,f),drop)
await page.waitForTimeout(2000)
await page.screenshot({path:`${OUT}/prod-drop.png`})
console.log('OK prod-drop')
await b.close()
