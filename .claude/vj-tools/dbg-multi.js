async (flags) => {
  const mf = window.cranes.manualFeatures, c = window.cranes.controllerFeatures
  const holds = { dbg_ht: c.bs_time, dbg_hg: c.bs_galPh, dbg_hb: c.bs_billow, dbg_hc: c.bs_chaos, dbg_hx: c.bs_cX, dbg_hy: c.bs_cY, dbg_hu: c.bs_budPh, dbg_hf: c.bs_fluxPh }
  Object.assign(mf, holds)
  for (const f of flags) mf[f] = 1
  await new Promise(r => setTimeout(r, 13000))
  const s = window.__vjMeter.shiver(12)
  for (const f of flags) delete mf[f]
  for (const k of Object.keys(holds)) delete mf[k]
  return { flags: flags.join(','), score: s.shiverScore, dir: s.zoomDirectionality, abs: s.zoomAbs, breath: s.breathOsc, edgeOsc: s.edgeOsc, radialOsc: s.radialOsc, motion: s.motion }
}
