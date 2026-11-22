// sweep — meter several variants of a visual side by side, in one tab, at once.
// Each URL loads in its own visible iframe (hidden tabs stop rAF; visible iframes keep rendering), and
// after `secs` every iframe's __vjMeter is read. URLs need ?vj=1. Example: every voyage leg, no audio:
//
//   await import('/scripts/vj/sweep.js')
//   await window.__vjSweep([0.15, 1.15, 2.15, 3.15, 4.15, 5.15].map(v =>
//     `/jam.html?shader=clit-set/2&controller=clit-set&vj=1&noaudio=true&voyage0=${v}`), 34)
//
// Returns one row per URL: shiver(30) and summary(30) essentials. Audio files need a user gesture per
// iframe, so use this for no-audio sweeps; use probe.js for an audio A/B.

const sleep = ms => new Promise(r => setTimeout(r, ms))

window.__vjSweep = async (urls, secs = 34, { w = 480, h = 270 } = {}) => {
  document.querySelectorAll('iframe[data-vj-sweep]').forEach(f => f.remove())
  const frames = urls.map(src => {
    const f = Object.assign(document.createElement('iframe'), { src, width: w, height: h })
    f.dataset.vjSweep = '1'
    f.style.cssText = 'border:0;margin:2px;display:inline-block'
    document.body.append(f)
    return f
  })
  await sleep(secs * 1000)
  return frames.map((f, i) => {
    const M = f.contentWindow?.__vjMeter
    if (!M) return { url: urls[i], err: 'no meter' }
    const s = M.summary(30), sh = M.shiver(30)
    return {
      url: urls[i], shiver: sh.shiverScore, breathOsc: sh.breathOsc, zoomAbs: sh.zoomAbs, dir: sh.zoomDirectionality,
      motion: s.motion, flicker: s.flicker, clip: s.clip, lum: s.lum,
    }
  })
}
