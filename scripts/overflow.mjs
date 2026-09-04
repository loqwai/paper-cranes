// How far past 1.0 does col go BEFORE the GLOW LIFT clamp? The shader emits col*0.25,
// so a channel reading v maps back to col = v/255*4.
import { chromium } from 'playwright'
const P = process.env.PORT || 6994
const url = (s, extra='') => `http://localhost:${P}/?shader=redaphid/wip/lattice-bead/${s}&controller=lattice-nav`
  + `&noaudio=true&fullscreen=true&image=images/beads/mon-kikyo.png&knob_161=1&navZoom=0.62`
  + `&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029&time=8&evoPhase=5.5&evoWarp=0.5&evoPlasma=0.5`
  + `&flowPhase=0.4&morphPhase=0.3&paletteShift=1.7&warpGrow=2&navX=0&navY=0&quietGate=1`
  + `&energySpring=0.55&waveletBassSpring=0.6&waveletBand1Spring=0.5&waveletBand2Spring=0.5`
  + `&waveletBand3Spring=0.45&waveletBand4Spring=0.45&waveletBand5Spring=0.5&waveletCentroidSpring=0.5`
  + `&melodyFlow=0.5&wubDepth=0.3&sectionMode=1&sectionMix=1&bassNoteFlow=0.4&spectralCrestSmooth=0.5`
  + `&spectralRoughnessSmooth=0.35&pitchClassMedian=0.5&spectralEntropyMedian=0.8&spectralKurtosisMedian=0.5`
  + `&spectralSkewMedian=0.5&spectralSpreadMedian=0.26&knob_168=0.9&knob_169=0.28` + extra
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 512, height: 512 } })
const probe = async (shader, extra) => {
  await pg.goto(url(shader, extra), { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('canvas'); await pg.waitForTimeout(2200)
  return await pg.evaluate(() => {
  const c = document.querySelector('canvas')
  const s = document.createElement('canvas'); s.width=c.width; s.height=c.height
  const x = s.getContext('2d'); x.drawImage(c,0,0)
  const d = x.getImageData(0,0,s.width,s.height).data
  const st=[0,1,2].map(()=>({over1:0,over2:0,sum:0,max:0}))
  let n=0, anyOver=0, rbOverGnot=0
  for(let j=0;j<d.length;j+=4){
    n++
    const v=[d[j]/255*4, d[j+1]/255*4, d[j+2]/255*4]
    let any=false
    v.forEach((val,k)=>{ st[k].sum+=val; if(val>st[k].max)st[k].max=val; if(val>1){st[k].over1++;any=true} if(val>2)st[k].over2++ })
    if(any)anyOver++
    if(v[0]>1 && v[2]>1 && v[1]<=1) rbOverGnot++
  }
  const P=x2=>+(100*x2/n).toFixed(2)
  return { anyChannelOver1:P(anyOver), R_and_B_over_but_not_G:P(rbOverGnot),
    perChannel:['R','G','B'].map((nm,k)=>({ch:nm, mean:+(st[k].sum/n).toFixed(3), max:+st[k].max.toFixed(2), pctOver1:P(st[k].over1), pctOver2:P(st[k].over2)})) }
  })
}
for (const [sh, extra, label] of [
  ['lattice-bead/2'.replace('lattice-bead/',''), '', 'lattice-bead/2 (current)'],
  ['2', '&knob_168=0', 'lattice-bead/2, SEED OFF (palette only)'],
  ['../lattice-vj/dbg9-preclamp', '&knob_168=0', 'lattice-vj/9 (reference)'],
]) {
  const r = await probe(sh === '2' ? 'dbg-preclamp' : sh, extra)
  console.log('== ' + label)
  console.log('   anyOver1 ' + r.anyChannelOver1 + '%   R&B over but not G: ' + r.R_and_B_over_but_not_G + '%')
  r.perChannel.forEach(c => console.log(`   ${c.ch}  mean ${String(c.mean).padEnd(6)} max ${String(c.max).padEnd(5)} over1 ${c.pctOver1}%`))
}
await b.close()
