// The whole lattice-bead family in one frame, at the recognition recipe, so the variants can be
// compared rather than described. Also serves as a GL COMPILE CHECK: validate-shader.js is
// static and cannot catch a type or forward-reference error, but a black canvas here can.
import { chromium } from 'playwright'
const PORT = process.env.PORT || 6994
const P = '&controller=lattice-nav&noaudio=true&fullscreen=true&knob_161=1&knob_144=0.02&time=8'
 + '&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029&evoPhase=5.5&flowPhase=0.4&morphPhase=0.3'
 + '&warpGrow=2&navX=0&navY=0&quietGate=1&energySpring=0.55&sectionMode=1&sectionMix=1'
 + '&waveletBassSpring=0.6&waveletBand1Spring=0.5&waveletBand2Spring=0.5&waveletBand3Spring=0.45'
 + '&waveletBand4Spring=0.45&waveletBand5Spring=0.5&waveletCentroidSpring=0.5&melodyFlow=0.5'
 + '&wubDepth=0.3&bassNoteFlow=0.4&spectralCrestSmooth=0.5&spectralRoughnessSmooth=0.35'
 + '&pitchClassMedian=0.5&spectralEntropyMedian=0.8&spectralKurtosisMedian=0.5'
 + '&spectralSkewMedian=0.5&spectralSpreadMedian=0.26&bass=0.4&mids=0.4&treble=0.4&energy=0.4'
 + '&spectralFlux=0.3&spectralEntropy=0.8&spectralSpread=0.26&pitchClass=0.5&onsetStrength=0.85'
 + '&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=1&image=images/beads/mon-hakkaku.png'
const V = [
  ['4',        'theme=0&paletteShift=1.35',                    '4.frag — the legible bead'],
  ['negative', 'theme=1&paletteShift=0.45&negative=1',         'negative — black let into the interior'],
  ['arrival',  'theme=1&paletteShift=0.45&negative=0.8&timeSinceOnset=0.15', 'arrival — crest at peak resolve'],
  ['arrival',  'theme=1&paletteShift=0.45&negative=0.8&timeSinceOnset=0.70', 'arrival — at rest'],
  ['5',        'theme=0&paletteShift=1.35&timeSinceOnset=0.15','5 — rhythm ripple (agent)'],
  ['6',        'theme=4&paletteShift=1.05',                    '6 — timbral colour (agent)'],
  ['7',        'theme=0&paletteShift=1.35&cdmode=0&cdpop=0.5', '7 — ChromaDepth SHELF (agent)'],
  ['7',        'theme=0&paletteShift=1.35&cdmode=1&cdpop=0.5', '7 — ChromaDepth DOME (agent)'],
]
const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport:{width:540,height:540} })
  const errs = []
  p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,120)) })
  const tiles = []
  for (const [sh,q,label] of V) {
    process.stdout.write(`${sh} `)
    await p.goto(`http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/${sh}${P}&${q}`,{waitUntil:'domcontentloaded'})
    await p.waitForSelector('canvas'); await p.waitForTimeout(2300)
    const lum = await p.evaluate(()=>{const c=document.querySelector('canvas');
      const g=document.createElement('canvas');g.width=64;g.height=64;const x=g.getContext('2d');
      x.drawImage(c,0,0,64,64);const d=x.getImageData(0,0,64,64).data;let s=0;
      for(let i=0;i<d.length;i+=4)s+=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];return +(s/(d.length/4)).toFixed(1)})
    tiles.push({label:`${label}   lum ${lum}`, b64:(await p.screenshot({type:'jpeg',quality:85})).toString('base64'), lum})
  }
  const out = await br.newPage({ viewport:{width:1500,height:900} })
  await out.setContent(`<style>body{margin:0;background:#0b0b0f;font:13px -apple-system,sans-serif;color:#e8e8f0}
   h1{font-size:19px;margin:16px 18px 3px}.sub{margin:0 18px 13px;color:#8b8ba0;font-size:12px}
   .g{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:0 14px 18px}
   figure{margin:0}img{width:100%;display:block;border-radius:5px;background:#000}
   figcaption{margin-top:5px;font-size:11px;color:#b9b9cc}</style>
   <h1>The lattice-bead family</h1><div class="sub">all at the recognition recipe · mon-hakkaku · iTime pinned · a black tile means a GL compile failure</div>
   <div class="g">${tiles.map(t=>`<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`)
  await out.screenshot({path:'journals/lab/shots/family.png', fullPage:true})
  await br.close()
  console.log('\nlum per tile:', tiles.map(t=>t.lum).join(', '))
  console.log('console errors:', errs.length ? errs.slice(0,4) : 'none')
}
run().catch(e=>{console.error(e);process.exit(1)})
