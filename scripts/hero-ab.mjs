import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
const PORT=6991, OUT='D:/Projects/pc-lab-hero/journals/lab/shots/'
const jobs=JSON.parse(process.argv[2])
const b=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']})
const page=await b.newPage({viewport:{width:900,height:900},deviceScaleFactor:1})
await page.addInitScript(()=>localStorage.setItem('paperCranes.seeds',JSON.stringify([0.11,0.22,0.33,0.44])))
page.on('pageerror',e=>console.error('PAGEERROR',String(e).slice(0,200)))
for(const j of jobs){
  await page.goto(`http://localhost:${PORT}/${j.q}`,{waitUntil:'domcontentloaded'})
  if(!(await page.evaluate(()=>location.href)).includes(`:${PORT}`)) throw new Error('PORT GUARD')
  await page.waitForFunction(f=>window.cranes&&window.cranes.frameCount>f,60,{timeout:120000}).catch(()=>console.error('stall',j.name))
  const i=await page.evaluate(()=>{const c=document.querySelector('canvas');return{w:c.width,h:c.height,f:window.cranes.frameCount,data:c.toDataURL('image/png')}})
  writeFileSync(OUT+j.name,Buffer.from(i.data.split(',')[1],'base64'))
  console.log(`${j.name} ${i.w}x${i.h} f=${i.f}`)
}
await b.close()
