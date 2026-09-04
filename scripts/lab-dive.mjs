import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
const PORT=6993, OUT='D:/Projects/pc-lab-nfold/journals/lab/shots/'
const b=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
const page=await b.newPage({viewport:{width:600,height:600},deviceScaleFactor:1})
await page.addInitScript(()=>localStorage.setItem('paperCranes.seeds',JSON.stringify([0.11,0.22,0.33,0.44])))
page.on('pageerror',e=>console.error('PAGEERROR',String(e).slice(0,200)))
for (const [tag,site] of [['leg','0'],['h13','1']]) {
  const url=`http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/nfold&wavelet=true&noaudio=true&fullscreen=true&navZoom=0.35&knob_1=0.429&knob_144=0.02&knob_161=1&image=images/beads/mon-kiku.png&knob_167=${site}`
  await page.goto(url,{waitUntil:'domcontentloaded'})
  if(!(await page.evaluate(()=>location.href)).includes(':'+PORT)) throw new Error('PORT GUARD')
  await page.waitForFunction(()=>window.cranes&&window.cranes.frameCount>30,null,{timeout:60000})
  for(let k=0;k<15;k++){
    const d=await page.evaluate(()=>({t:performance.now()/1000,png:document.querySelector('canvas').toDataURL('image/png')}))
    writeFileSync(OUT+`dv-${tag}-${String(k).padStart(2,'0')}.png`,Buffer.from(d.png.split(',')[1],'base64'))
    await page.waitForTimeout(5000)
  }
  console.log('done',tag)
}
await b.close()
