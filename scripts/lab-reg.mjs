import { chromium } from 'playwright'; import { writeFileSync } from 'fs'
const P=6993, O='D:/Projects/pc-lab-nfold/journals/lab/shots/'
const b=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
const pg=await b.newPage({viewport:{width:600,height:600},deviceScaleFactor:1})
await pg.addInitScript(()=>localStorage.setItem('paperCranes.seeds',JSON.stringify([0.11,0.22,0.33,0.44])))
for(const [n,sh] of [['reg-a.png','2'],['reg-b.png','2'],['reg-c.png','nfold']]){
  await pg.goto(`http://localhost:${P}/?shader=redaphid/wip/lattice-bead/${sh}&wavelet=true&noaudio=true&fullscreen=true&navZoom=0.35&knob_1=0.429&knob_161=1&image=images/beads/mon-kiku.png&time=12`,{waitUntil:'domcontentloaded'})
  if(!(await pg.evaluate(()=>location.href)).includes(':'+P)) throw new Error('PORT')
  await pg.waitForFunction(()=>window.cranes&&window.cranes.frameCount>30,null,{timeout:60000})
  await pg.waitForTimeout(700)
  writeFileSync(O+n,Buffer.from((await pg.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'))).split(',')[1],'base64'))
}
await b.close(); console.log('captured')
