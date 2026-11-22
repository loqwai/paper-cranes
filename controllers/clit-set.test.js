import { describe, it, expect } from 'vitest'
import { fresh, step, place, nav, WAYPOINTS, ZOOM_MAX, LEG_SECS } from './clit-set.js'

const run = (S, f, secs, dt = 1 / 60) => {
  let out
  for (let t = 0; t < secs; t += dt) out = step(S, f, dt)
  return out
}

const HOME = WAYPOINTS[0]
const loud = { energy: 0.3, energyNormalized: 0.9, energyZScore: 0.8, bassZScore: 0.9, spectralCentroidZScore: 1.2 }
const quiet = { energy: 0, energyNormalized: 0.1 }

describe('clit-set controller navigation', () => {
  it('opens at home with every knob at 0', () => {
    const out = step(fresh(), {}, 1 / 60)
    expect(out.cs_cx).toBeCloseTo(HOME.cx)
    expect(out.cs_cy).toBeCloseTo(HOME.cy)
    expect(out.cs_lz).toBeCloseTo(0)
    expect(out.cs_navA).toBeCloseTo(HOME.A)
    expect(out.cs_navB).toBeCloseTo(HOME.B)
  })

  it('audio never moves the camera or the fractal shape', () => {
    const a = run(fresh(), loud, 8)
    const b = run(fresh(), quiet, 8)
    for (const k of ['cs_cx', 'cs_cy', 'cs_lz', 'cs_rot', 'cs_navA', 'cs_navB', 'cs_curl']) expect(a[k]).toBeCloseTo(b[k], 6)
    expect(a.cs_breath).toBeGreaterThan(b.cs_breath)
  })

  it('autopilot leaves home and comes back after one full loop', () => {
    const S = fresh()
    const mid = run(S, quiet, LEG_SECS * 2.2, 0.05)
    expect(Math.abs(mid.cs_cx - HOME.cx) + Math.abs(mid.cs_cy - HOME.cy) + Math.abs(mid.cs_navA - HOME.A)).toBeGreaterThan(0.1)
    const back = run(S, quiet, LEG_SECS * (WAYPOINTS.length - 2.2) + 10, 0.05)
    expect(back.cs_cx).toBeCloseTo(HOME.cx, 2)
    expect(back.cs_navA).toBeCloseTo(HOME.A, 2)
  })

  it('a knob twist glides instead of snapping', () => {
    const S = fresh()
    run(S, quiet, 1)
    const first = step(S, { ...quiet, knob_1: 1 }, 1 / 60)
    expect(first.cs_cy).toBeLessThan(0.05)
    const settled = run(S, { ...quiet, knob_1: 1 }, 8)
    expect(settled.cs_cy).toBeCloseTo(0.6, 2)
  })

  it('manual X blends in over the first 8% of the dial', () => {
    const k = Array(16).fill(0)
    expect(nav([0.04, ...k.slice(1)], 0).cy).toBeCloseTo(nav(k, 0).cy - 0.6 * 0.5, 2)
    expect(nav([0.54, ...k.slice(1)], 0).cy).toBeCloseTo(0, 6)
  })

  it('zoom never passes the cap where the lace turns to speckle', () => {
    const k = Array(16).fill(0)
    k[3] = 1
    for (let u = 0; u < WAYPOINTS.length; u += 0.25) expect(nav(k, u).lz).toBeLessThanOrEqual(ZOOM_MAX)
  })

  it('voyage0 starts the journey at a waypoint and wraps', () => {
    const out = step(fresh(), { voyage0: 2 + WAYPOINTS.length * 3 }, 1 / 60)
    expect(out.cs_cx).toBeCloseTo(WAYPOINTS[2].cx)
    expect(out.cs_navA).toBeCloseTo(WAYPOINTS[2].A)
  })

  it('every place along the loop is finite', () => {
    for (let u = -1; u < WAYPOINTS.length + 1; u += 0.1) for (const v of Object.values(place(u))) expect(Number.isFinite(v)).toBe(true)
  })
})
