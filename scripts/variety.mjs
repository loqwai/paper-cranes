// Theme x hue-position grid. Proves the four lattice-family palettes are actually
// distinct, not relabelled: reports channel means, saturation and clipping per theme.
import { chromium } from 'playwright'
const P = process.env.PORT || 6994
const BASE = `http://localhost:${P}/?shader=redaphid/wip/lattice-bead/2&controller=lattice-nav`
  + `&noaudio=true&fullscreen=true&knob_161=1&navZoom=0.62&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029`
  + `&time=8&evoPhase=5.5&evoWarp=0.5&evoPlasma=0.5&flowPhase=0.4&morphPhase=0.3&warpGrow=2&navX=0&navY=0`
  + `&quietGate=1&energySpring=0.55&waveletBassSpring=0.6&waveletBand1Spring=0.5&waveletBand2Spring=0.5`
  + `&waveletBand3Spring=0.45&waveletBand4Spring=0.45&waveletBand5Spring=0.5&waveletCentroidSpring=0.5`
  + `&melodyFlow=0.5&wubDepth=0.3&sectionMode=1&sectionMix=1&bassNoteFlow=0.4&spectralCrestSmooth=0.5`
  + `&spectralRoughnessSmooth=0.35&pitchClassMedian=0.5&spectralEntropyMedian=0.8&spectralKurtosisMedian=0.5`
  + `&spectralSkewMedian=0.5&spectralSpreadMedian=0.26&knob_168=0.9&knob_169=0.28&image=images/beads/mon-kikyo.png`
const THEMES = [[0,'0 vj9 · moody'],[1,'1 luminous · chromadepth6 / interactive3'],[2,'2 midtone · chromadepth3'],[3,'3 contrast · bead H10']]
const SHIFTS = [0.0, 0.4, 0.9, 1.4]

const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 460, height: 460 } })
const stats = () => pg.evaluate(() => {
  const c=document.querySelector('canvas'), s=document.createElement('canvas')
  s.width=c.width; s.height=c.height; const x=s.getContext('2d'); x.drawImage(c,0,0)
  const d=x.getImageData(0,0,s.width,s.height).data
  let n=0,R=0,G=0,B=0,sat=0,clip=0
  for(let j=0;j<d.length;j+=4){ const r=d[j],g=d[j+1],bl=d[j+2]; n++;R+=r;G+=g;B+=bl
    const mx=Math.max(r,g,bl),mn=Math.min(r,g,bl),l=(mx+mn)/2
    sat += mx===mn?0:(l<128?(mx-mn)/(mx+mn):(mx-mn)/(510-mx-mn)); if(mx>=255||mn<=0)clip++ }
  return {R:+(R/n).toFixed(1),G:+(G/n).toFixed(1),B:+(B/n).toFixed(1),sat:+(sat/n).toFixed(3),clip:+(100*clip/n).toFixed(2)}
})
const tiles=[]
for (const [t,tl] of THEMES) {
  for (const ps of SHIFTS) {
    await pg.goto(`${BASE}&theme=${t}&paletteShift=${ps}`, {waitUntil:'domcontentloaded'})
    await pg.waitForSelector('canvas'); await pg.waitForTimeout(2300)
    const b64=(await pg.screenshot({type:'jpeg',quality:88})).toString('base64')
    const st = ps===SHIFTS[0] ? await stats() : null
    if (st) console.log(`theme ${t} ${tl.padEnd(42)} R${String(st.R).padStart(5)} G${String(st.G).padStart(5)} B${String(st.B).padStart(5)}  sat ${st.sat}  clip ${st.clip}%`)
    tiles.push({label:`${tl}\npaletteShift=${ps}`, b64})
  }
}
const out = await b.newPage({viewport:{width:1500,height:1000}})
await out.setContent(`<style>body{margin:0;background:#0b0b0f;font:13px -apple-system,Segoe UI,sans-serif;color:#e8e8f0}
h1{font-size:19px;margin:16px 18px 4px}.sub{margin:0 18px 14px;color:#8b8ba0;font-size:12px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;padding:0 14px 18px}figure{margin:0}
img{width:100%;display:block;border-radius:5px;background:#000}
figcaption{margin-top:4px;font-size:10.5px;color:#b9b9cc;white-space:pre-line;line-height:1.3}</style>
<h1>Palette themes from the lattice family &times; hue position</h1>
<div class="sub">lattice-bead/2.frag &middot; mon-kikyo &middot; each ROW is one theme, each COLUMN a paletteShift</div>
<div class="g">${tiles.map(t=>`<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`)
await out.screenshot({path:'journals/lab/shots/themes.png', fullPage:true})
await b.close(); console.log('wrote journals/lab/shots/themes.png')
