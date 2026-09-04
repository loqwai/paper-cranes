// DETERMINISTIC test of the arrival. Live correlation may simply be blind to a spatially
// LOCAL travelling event, so freeze it instead: timeSinceOnset and onsetStrength are features,
// and URL params override features every frame, so the arrival can be posed at chosen phases
// with iTime pinned. If the crest resolves at all, it must be visible across this row.
import { chromium } from 'playwright'
const PORT = process.env.PORT || 6994
const SH = process.env.SHADER_N || 'arrival'
const B = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/${SH}&controller=lattice-nav`
 + '&noaudio=true&fullscreen=true&knob_161=1&knob_144=0.02&time=8&quietGate=1&energySpring=0.55'
 + '&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029&evoPhase=5.5&flowPhase=0.4&morphPhase=0.3'
 + '&warpGrow=2&navX=0&navY=0&sectionMode=1&sectionMix=1&spectralEntropy=0.8&spectralSpread=0.26'
 + '&waveletBassSpring=0.6&waveletBand1Spring=0.5&waveletBand2Spring=0.5&waveletBand3Spring=0.45'
 + '&waveletBand4Spring=0.45&waveletBand5Spring=0.5&waveletCentroidSpring=0.5&trebLive=0.5'
 + '&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=0.25&negative=0.8&theme=1&paletteShift=0.45'
 + '&image=images/beads/mon-hakkaku.png&onsetStrength=0.85'
const PH = [0.0, 0.03, 0.08, 0.15, 0.25, 0.40, 0.70]
const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport:{width:520,height:520} })
  const tiles = []
  for (const t of PH) {
    process.stdout.write(`t=${t} `)
    await p.goto(`${B}&timeSinceOnset=${t}`, {waitUntil:'domcontentloaded'})
    await p.waitForSelector('canvas'); await p.waitForTimeout(2100)
    const st = await p.evaluate(()=>{const c=document.querySelector('canvas');
      const g=document.createElement('canvas');g.width=90;g.height=90;const x=g.getContext('2d');
      x.drawImage(c,0,0,90,90);const d=x.getImageData(0,0,90,90).data;let s=0,s2=0,n=0;
      for(let i=0;i<d.length;i+=4){const l=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];s+=l;s2+=l*l;n++}
      const m=s/n;return {lum:+m.toFixed(1), con:+Math.sqrt(Math.max(s2/n-m*m,0)).toFixed(1)}})
    tiles.push({ label:`tSinceOnset ${t}s   lum ${st.lum}  contrast ${st.con}`,
                 b64:(await p.screenshot({type:'jpeg',quality:88})).toString('base64'), st })
  }
  const out = await br.newPage({ viewport:{width:1500,height:560} })
  await out.setContent(`<style>body{margin:0;background:#0b0b0f;font:13px -apple-system,sans-serif;color:#e8e8f0}
   h1{font-size:19px;margin:14px 16px 2px}.sub{margin:0 16px 12px;color:#8b8ba0;font-size:12px}
   .g{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;padding:0 12px 16px}
   img{width:100%;display:block;border-radius:4px;background:#000}
   figure{margin:0}figcaption{margin-top:4px;font-size:10px;color:#b9b9cc}</style>
   <h1>The arrival, posed</h1><div class="sub">${SH}.frag · iTime pinned · onsetStrength 0.85 · the crest should resolve then leave</div>
   <div class="g">${tiles.map(t=>`<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`)
  await out.screenshot({ path:'journals/lab/shots/arrival-phase.png', fullPage:true })
  await br.close()
  console.log('\n' + JSON.stringify(tiles.map((t,i)=>({t:PH[i], ...t.st}))))
}
run().catch(e=>{console.error(e);process.exit(1)})
