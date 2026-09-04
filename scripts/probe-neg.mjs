import { chromium } from 'playwright'
const B = `http://localhost:6994/?shader=redaphid/wip/lattice-bead/negative&controller=lattice-nav`
 + '&noaudio=true&fullscreen=true&knob_161=1&knob_144=0.02&time=8&quietGate=1&energySpring=0.55'
 + '&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=1&theme=1&paletteShift=0.45&image=images/beads/mon-kikyo.png'
const p = await (await chromium.launch()).newPage({viewport:{width:400,height:400}})
for (const q of ['&negative=0','&negative=1','&negative=1&knob_181=1']) {
  await p.goto(B+q,{waitUntil:'domcontentloaded'}); await p.waitForSelector('canvas'); await p.waitForTimeout(2200)
  const r = await p.evaluate(()=>{const c=document.querySelector('canvas');const g=document.createElement('canvas');
    g.width=100;g.height=100;const x=g.getContext('2d');x.drawImage(c,0,0,100,100);
    const d=x.getImageData(0,0,100,100).data;let s=0,blk=0;
    for(let i=0;i<d.length;i+=4){const l=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];s+=l;if(l<20)blk++}
    return {lum:+(s/(d.length/4)).toFixed(2), black:+(100*blk/(d.length/4)).toFixed(1)}})
  console.log(q.padEnd(28), JSON.stringify(r))
}
process.exit(0)
