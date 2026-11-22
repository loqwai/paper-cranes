import { describe, it, expect } from 'vitest'
import { fresh, step, place, nav, drift, loopDelta, WAYPOINTS, ZOOM_MAX, LEG_SECS, PAN_SPAN, DRIFT } from './clit-set.js'

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

  it('audio never moves the camera or the fractal shape, it only changes the clock rates', () => {
    const SA = fresh(), SB = fresh()
    const a = run(SA, loud, 8)
    const b = run(SB, quiet, 8)
    for (const k of ['cs_navA', 'cs_navB', 'cs_curl']) expect(a[k]).toBeCloseTo(b[k], 6)
    // loud music runs the drift clock faster, never backwards
    expect(a.cs_drift).toBeGreaterThan(b.cs_drift)
    expect(b.cs_drift).toBeGreaterThan(0)
    // and the camera sits on the clock-driven path either way (nav takes no audio)
    const k0 = Array(16).fill(0)
    for (const [S, o] of [[SA, a], [SB, b]]) {
      const t = nav(k0, S.voyage, S.drift)
      expect(Math.abs(o.cs_cx - t.cx) + Math.abs(o.cs_cy - t.cy) + Math.abs(o.cs_lz - t.lz) + Math.abs(o.cs_rot - t.rot)).toBeLessThan(0.1)   // the 1.8 s glide lags the target a little
    }
    expect(a.cs_breath).toBeGreaterThan(b.cs_breath)
  })

  it('at k=0 the camera visibly moves every second for a whole loop (never parked)', () => {
    const S = fresh()
    let prev = run(S, quiet, 2)
    for (let s = 0; s < LEG_SECS * WAYPOINTS.length + 20; s++) {
      const out = run(S, quiet, 1, 1 / 30)
      const moved = Math.abs(out.cs_cx - prev.cs_cx) + Math.abs(out.cs_cy - prev.cs_cy) + Math.abs(out.cs_lz - prev.cs_lz) + Math.abs(out.cs_rot - prev.cs_rot)
      expect(moved).toBeGreaterThan(0.004)
      prev = out
    }
  })

  it('the voyage index stays in 0..WAYPOINTS.length and cs_jump never stands in for it', () => {
    const S = fresh()
    for (let s = 0; s < LEG_SECS * WAYPOINTS.length * 2.5; s += 5) {
      const out = run(S, s % 40 < 20 ? loud : quiet, 5, 0.05)
      expect(out.cs_voyage).toBeGreaterThanOrEqual(0)
      expect(out.cs_voyage).toBeLessThan(WAYPOINTS.length)
    }
    for (const u of [-0.001, 0, 5.999, 6, 6.001, 11.5, -7.2]) for (const v of Object.values(place(u))) expect(Number.isFinite(v)).toBe(true)
  })

  it('autopilot leaves home and comes back after one full loop', () => {
    const S = fresh()
    const mid = run(S, quiet, LEG_SECS * 2.2, 0.05)
    expect(Math.abs(mid.cs_cx - HOME.cx) + Math.abs(mid.cs_cy - HOME.cy) + Math.abs(mid.cs_navA - HOME.A)).toBeGreaterThan(0.1)
    const back = run(S, quiet, LEG_SECS * (WAYPOINTS.length - 2.2) + 10, 0.05)
    expect(S.voyage).toBeLessThan(0.2)
    expect(Math.abs(back.cs_cx - HOME.cx)).toBeLessThanOrEqual(DRIFT.pan + 0.01)
    expect(back.cs_navA).toBeCloseTo(HOME.A, 1)
  })

  it('a knob twist glides instead of snapping', () => {
    const S = fresh()
    run(S, quiet, 1)
    const first = step(S, { ...quiet, knob_1: 1 }, 1 / 60)
    expect(first.cs_cy).toBeLessThan(0.05)
    const settled = run(S, { ...quiet, knob_1: 1 }, 8)
    expect(settled.cs_cy - place(S.voyage).cy - drift(S.drift).cy).toBeCloseTo(PAN_SPAN, 1)
  })

  it('a small X or Y nudge from 0 moves the camera a small distance from wherever the voyage is', () => {
    const k = Array(16).fill(0)
    for (let u = 0; u < WAYPOINTS.length; u += 0.37) {
      const auto = nav(k, u)
      for (const i of [0, 1]) {
        for (const d of [0.01, 0.04, 0.08, 0.1]) {
          const kn = [...k]
          kn[i] = d
          const moved = nav(kn, u)
          const dist = Math.hypot(moved.cx - auto.cx, moved.cy - auto.cy)
          expect(dist).toBeLessThanOrEqual(0.1 * PAN_SPAN + 1e-9)
          expect(dist).toBeGreaterThan(0)
        }
      }
    }
  })

  it('the settled camera follows a slow X nudge smoothly, with no jump at the bottom of the dial', () => {
    const S = fresh()
    run(S, quiet, 1)
    const start = step(S, quiet, 1 / 60).cs_cy - drift(S.drift).cy
    let prev = start + drift(S.drift).cy
    for (let i = 1; i <= 60; i++) {
      const out = step(S, { ...quiet, knob_1: 0.1 * i / 60 }, 1 / 60)
      expect(Math.abs(out.cs_cy - prev)).toBeLessThan(0.01)
      prev = out.cs_cy
    }
    expect(Math.abs(run(S, { ...quiet, knob_1: 0.1 }, 8).cs_cy - drift(S.drift).cy - start)).toBeLessThan(0.1)
  })

  it('VOYAGE blends along the shorter way round the loop', () => {
    const n = WAYPOINTS.length
    expect(loopDelta(5.9, 0.1, n)).toBeCloseTo(0.2, 9)
    expect(loopDelta(0.1, 5.9, n)).toBeCloseTo(-0.2, 9)
    expect(loopDelta(1, 2.5, n)).toBeCloseTo(1.5, 9)
    // Autopilot at 5.9 (gliding into home), VOYAGE parked mid-blend toward home (scrub 0):
    // the blend stays between 5.9 and 6 ≡ home, never sweeping back through waypoints 4, 3, 2, 1.
    const k = Array(16).fill(0)
    const auto = nav(k, 5.9)
    const home = nav(k, 0)
    for (const k3 of [0.01, 0.02, 0.04, 0.06, 0.08]) {
      k[2] = k3
      const p = nav(k, 5.9)
      for (const key of ['cx', 'cy', 'A', 'B']) {
        expect(p[key]).toBeGreaterThanOrEqual(Math.min(auto[key], home[key]) - 1e-9)
        expect(p[key]).toBeLessThanOrEqual(Math.max(auto[key], home[key]) + 1e-9)
      }
    }
  })

  it('VOYAGE past 8% scrubs the loop by hand, 0.08 = home', () => {
    const k = Array(16).fill(0)
    k[2] = 0.08
    expect(nav(k, 3.3).cx).toBeCloseTo(WAYPOINTS[0].cx, 6)
    expect(nav(k, 3.3).A).toBeCloseTo(WAYPOINTS[0].A, 6)
  })

  it('crest and kurtosis reach the shader eased, not raw', () => {
    const S = fresh()
    run(S, quiet, 1)
    const live = { energy: 0.3, energyNormalized: 0.5 }
    run(S, live, 2)
    const a = step(S, { ...live, spectralCrestNormalized: 1, spectralKurtosisZScore: 1 }, 1 / 60)
    expect(a.cs_pearl).toBeLessThan(0.2)
    expect(a.cs_focus).toBeLessThan(0.05)
    const b = run(S, { ...live, spectralCrestNormalized: 1, spectralKurtosisZScore: 1 }, 4)
    expect(b.cs_pearl).toBeGreaterThan(0.8)
    expect(b.cs_focus).toBeGreaterThan(0.8)
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
