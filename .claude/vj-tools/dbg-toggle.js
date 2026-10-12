async (flag) => {
  const mf = window.cranes.manualFeatures, c = window.cranes.controllerFeatures
  const holds = { dbg_ht: c.bs_time, dbg_hg: c.bs_galPh, dbg_hb: c.bs_billow, dbg_hc: c.bs_chaos, dbg_hx: c.bs_cX, dbg_hy: c.bs_cY, dbg_hu: c.bs_budPh, dbg_hf: c.bs_fluxPh }
  Object.assign(mf, holds)
  if (flag) mf[flag] = 1
  await new Promise(r => setTimeout(r, 13000))
  const s = window.__vjMeter.shiver(12)
  if (flag) delete mf[flag]
  for (const k of Object.keys(holds)) delete mf[k]
  return { flag, score: s.shiverScore, dir: s.zoomDirectionality, abs: s.zoomAbs, breath: s.breathOsc, motion: s.motion }
}
