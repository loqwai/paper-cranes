// H1 support: (a) raw motif radial profile + boundary crossings, (b) the EFFECTIVE crossing count
// along a cell-space ray once abs(p) mirroring and REPEAT wrap are applied.
import { chromium } from 'playwright'
import { readFile } from 'fs/promises'
const file = process.argv[2] || 'public/images/beads/mon-kiku.png'
const R = +(process.argv[3] || 0.6)          // gHexR
const b = await chromium.launch({ headless: true }); const p = await b.newPage()
const src = 'data:image/png;base64,' + (await readFile(file)).toString('base64')
console.log(JSON.stringify(await p.evaluate(async ({src, R}) => {
  const img = new Image(); img.src = src; await img.decode()
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  const g = c.getContext('2d'); g.drawImage(img, 0, 0)
  const px = g.getImageData(0,0,c.width,c.height).data
  const N = c.width, C = N/2
  const A = (x,y) => px[(((y|0)*N)+(x|0))*4+3]
  const G = (x,y) => px[(((y|0)*N)+(x|0))*4+1]

  // (a) RAW MOTIF: radius of the silhouette edge per angle, + crossings of alpha along the ray
  let rmin = 1e9, rmax = -1e9, rawCross = []
  const prof = []
  for (let k = 0; k < 720; k++) {
    const th = k/720*Math.PI*2, dx = Math.cos(th), dy = Math.sin(th)
    let cross = 0, prev = A(C, C) > 127, edge = 0
    for (let r = 1; r < C-2; r++) {
      const cur = A(C + dx*r, C + dy*r) > 127
      if (cur !== prev) { cross++; if (cross === 1) edge = r; prev = cur }
    }
    rawCross.push(cross); prof.push(edge)
    rmin = Math.min(rmin, edge); rmax = Math.max(rmax, edge)
  }
  const lobeDepth = +(1 - rmin/rmax).toFixed(3)
  const hist = {}; rawCross.forEach(v => hist[v] = (hist[v]||0)+1)

  // count lobes: peaks in the radius profile
  let peaks = 0
  for (let i = 0; i < 720; i++) {
    const a = prof[(i+719)%720], m = prof[i], z = prof[(i+1)%720]
    if (m > a && m >= z && m > rmin + (rmax-rmin)*0.5) peaks++
  }

  // (b) EFFECTIVE: cell-space ray. uv = |p| in [0,1.414]; q = uv/R; tc = q*.5+.5; REPEAT wrap.
  // Count sign changes of the decoded SDF (boundary = G/255 - 0.5 crossing 0) along the ray.
  const decode = (tx, ty) => {
    const w = v => { v = v % 1; return v < 0 ? v + 1 : v }
    return G(w(tx)*(N-1), w(ty)*(N-1))/255 - 0.5
  }
  const effCross = [], tcMax = []
  for (let k = 0; k < 360; k++) {
    const th = k/360*(Math.PI/2), dx = Math.cos(th), dy = Math.sin(th)  // folded quadrant only
    let cross = 0, prev = null, mx = 0
    for (let s = 0; s <= 1.4142; s += 0.002) {
      const ux = Math.abs(dx*s), uy = Math.abs(dy*s)
      const tx = ux/R*0.5 + 0.5, ty = uy/R*0.5 + 0.5
      mx = Math.max(mx, tx, ty)
      const d = decode(tx, ty) > 0
      if (prev !== null && d !== prev) cross++
      prev = d
    }
    effCross.push(cross); tcMax.push(mx)
  }
  const avg = a => +(a.reduce((s,v)=>s+v,0)/a.length).toFixed(2)
  return {
    motif: { size: N, rawCrossingsHistogram: hist, lobes: peaks/1, rmin, rmax, lobeDepth },
    sampling: { texCoordMax: +Math.max(...tcMax).toFixed(3), wrapsTexture: Math.max(...tcMax) > 1 },
    effective: { avgBoundaryCrossingsPerRay: avg(effCross), max: Math.max(...effCross), min: Math.min(...effCross) },
  }
}, {src, R}), null, 1))
await b.close()
